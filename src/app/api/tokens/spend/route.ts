import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { spendTokens, spendWelcomeTokens, applyDiscount, PlanType } from '@/lib/tokens'

// POST /api/tokens/spend — Spendi token per acquistare un libro/blocco
// Body: { bookId, amount, useWelcomeTokens? }
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const { bookId, amount, useWelcomeTokens } = body

    if (!bookId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'bookId e amount sono obbligatori' }, { status: 400 })
    }

    // Fetch libro per tier
    const { data: book, error: bookErr } = await supabase
      .from('books')
      .select('id, tier, author_id, visibility_score')
      .eq('id', bookId)
      .single()

    if (bookErr || !book) {
      return NextResponse.json({ error: 'Libro non trovato' }, { status: 404 })
    }

    // Fetch piano utente
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })
    }

    const userPlan = (profile.plan || 'free') as PlanType

    // Se l'utente vuole usare WELCOME_TOKEN (solo su libri free)
    if (useWelcomeTokens) {
      const result = await spendWelcomeTokens(supabase, user.id, bookId, amount)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({
        success: true,
        type: 'welcome',
        tokensSpent: amount,
        discountedPrice: amount,
        authorPayout: 0,
        platformPayout: 0,
        message: 'Welcome token spesi. Nessun payout autore, visibilità incrementata.',
      })
    }

    // Spesa token normale (MONTHLY → ANNUAL_BONUS → PURCHASED)
    const result = await spendTokens(supabase, user.id, bookId, amount, book.tier, userPlan)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      type: 'standard',
      basePrice: amount,
      discountedPrice: applyDiscount(amount, userPlan),
      discountPercent: userPlan.includes('gold') ? 30 : userPlan.includes('silver') ? 15 : 0,
      tokensSpent: result.tokensSpent,
      totalSpent: result.totalSpent,
      authorPayout: result.authorPayout,
      platformPayout: result.platformPayout,
    })
  } catch (err: any) {
    console.error('Errore POST /api/tokens/spend:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
