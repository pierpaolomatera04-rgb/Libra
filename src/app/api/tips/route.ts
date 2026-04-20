import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// POST /api/tips — Invia mancia a un autore
// Body: { authorId, amount }
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { authorId, amount } = await request.json()

    if (!authorId || !amount || amount < 5) {
      return NextResponse.json({ error: 'authorId e amount (min 5 token) obbligatori' }, { status: 400 })
    }

    if (authorId === user.id) {
      return NextResponse.json({ error: 'Non puoi inviare una mancia a te stesso' }, { status: 400 })
    }

    // Fetch token utilizzabili per mance (escludi WELCOME e REWARD).
    // I REWARD_TOKEN sono bonus da XP e NON possono pagare l'autore.
    const { data: allTokens, error: fetchErr } = await supabase
      .from('tokens')
      .select('id, amount, type, expires_at')
      .eq('user_id', user.id)
      .eq('spent', false)
      .in('type', ['MONTHLY_TOKEN', 'ANNUAL_BONUS_TOKEN', 'PURCHASED_TOKEN'])
      .order('expires_at', { ascending: true, nullsFirst: false })

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    const now = new Date()
    const validTokens = (allTokens || []).filter(t => {
      if (!t.expires_at) return true
      return new Date(t.expires_at) > now
    })

    // Ordine: MONTHLY → ANNUAL_BONUS → PURCHASED
    const monthlyTokens = validTokens
      .filter(t => t.type === 'MONTHLY_TOKEN')
      .sort((a, b) => {
        if (!a.expires_at) return 1
        if (!b.expires_at) return -1
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
      })
    const annualTokens = validTokens.filter(t => t.type === 'ANNUAL_BONUS_TOKEN')
    const purchasedTokens = validTokens.filter(t => t.type === 'PURCHASED_TOKEN')
    const orderedTokens = [...monthlyTokens, ...annualTokens, ...purchasedTokens]

    const totalAvailable = orderedTokens.reduce((sum, t) => sum + t.amount, 0)
    if (totalAvailable < amount) {
      return NextResponse.json({
        error: `Token insufficienti. Hai ${totalAvailable} token spendibili, servono ${amount}.`
      }, { status: 400 })
    }

    // Spendi token
    let remaining = amount
    const tokenIdsToMarkSpent: string[] = []
    const tokensSpent: { type: string; amount: number }[] = []

    for (const token of orderedTokens) {
      if (remaining <= 0) break
      if (token.amount <= remaining) {
        remaining -= token.amount
        tokensSpent.push({ type: token.type, amount: token.amount })
        tokenIdsToMarkSpent.push(token.id)
      } else {
        tokensSpent.push({ type: token.type, amount: remaining })
        await supabase
          .from('tokens')
          .update({ amount: token.amount - remaining })
          .eq('id', token.id)
        remaining = 0
      }
    }

    if (tokenIdsToMarkSpent.length > 0) {
      await supabase
        .from('tokens')
        .update({ spent: true })
        .in('id', tokenIdsToMarkSpent)
    }

    // Calcola payout: 90% autore, 10% piattaforma (mance)
    const euroValue = amount * 0.10
    const authorPayout = Math.round(euroValue * 0.90 * 100) / 100
    const platformPayout = Math.round(euroValue * 0.10 * 100) / 100

    // Registra transazioni token
    for (const spent of tokensSpent) {
      const spentEuro = spent.amount * 0.10
      await supabase
        .from('token_transactions')
        .insert({
          user_id: user.id,
          book_id: null,
          token_type: spent.type,
          tokens_spent: spent.amount,
          author_payout: Math.round(spentEuro * 0.90 * 100) / 100,
          platform_payout: Math.round(spentEuro * 0.10 * 100) / 100,
        })
    }

    // Registra donazione
    await supabase.from('donations').insert({
      donor_id: user.id,
      author_id: authorId,
      amount,
    })

    // Notifica all'autore
    const { data: donorProfile } = await supabase
      .from('profiles')
      .select('name, author_pseudonym')
      .eq('id', user.id)
      .single()

    const actorName = donorProfile?.author_pseudonym || donorProfile?.name || 'Un lettore'
    await supabase.from('notifications').insert({
      user_id: authorId,
      actor_id: user.id,
      type: 'tip',
      title: 'Mancia ricevuta!',
      message: `${actorName} ti ha inviato una mancia di ${amount} token (\u20AC${authorPayout.toFixed(2)})`,
      data: { actor_name: actorName, amount, author_payout: authorPayout },
    })

    // Award XP al donatore — +20 XP flat per ogni mancia (min 5 token già validato).
    // Il cap eventuale e' gestito lato DB dalla RPC award_xp.
    const xpAmount = 20
    const { data: xpResult } = await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_amount: xpAmount,
      p_reason: 'tip',
    })

    return NextResponse.json({
      success: true,
      amount,
      authorPayout,
      platformPayout,
      xpAwarded: xpAmount,
      xpResult: xpResult || null,
    })
  } catch (err: any) {
    console.error('Errore POST /api/tips:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
