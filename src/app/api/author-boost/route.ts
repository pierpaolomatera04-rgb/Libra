import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// ============================================
// POST /api/author-boost
// Crea un boost promozionale dell'autore sul proprio libro.
// Body: { bookId: string, tokens: number (min 10, multipli di 10) }
// ============================================
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { bookId, tokens, days } = await request.json()

    if (!bookId || typeof tokens !== 'number' || tokens < 10) {
      return NextResponse.json(
        { error: 'bookId e tokens (min 10) obbligatori' },
        { status: 400 },
      )
    }

    if (typeof days !== 'number' || days < 1 || days > 30) {
      return NextResponse.json(
        { error: 'days deve essere un intero tra 1 e 30' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase.rpc('create_author_boost', {
      p_book_id: bookId,
      p_tokens: tokens,
      p_days: days,
    })

    if (error) {
      console.error('Errore RPC create_author_boost:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || 'Boost non riuscito', details: data },
        { status: 400 },
      )
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Errore POST /api/author-boost:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// GET /api/author-boost?bookId=...
// Ritorna lo storico boost dell'autore per un libro (o tutti se bookId assente).
// Include total_reads attuale per calcolare il delta dal reads_at_start.
// ============================================
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)

    let query = supabase
      .from('author_boosts')
      .select(`
        id,
        book_id,
        tokens_spent,
        tokens_from_bonus,
        tokens_from_purchased,
        duration_days,
        multiplier,
        reads_at_start,
        started_at,
        expires_at,
        created_at,
        books:book_id ( id, title, cover_image_url, total_reads )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (bookId) query = query.eq('book_id', bookId)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const now = Date.now()
    const boosts = (data || []).map((b: any) => {
      const totalReads = b.books?.total_reads ?? 0
      const isActive = new Date(b.expires_at).getTime() > now
      return {
        ...b,
        is_active: isActive,
        reads_delta: Math.max(0, totalReads - (b.reads_at_start || 0)),
        book_title: b.books?.title ?? null,
        book_cover: b.books?.cover_image_url ?? null,
        book_total_reads: totalReads,
      }
    })

    return NextResponse.json({ boosts })
  } catch (err: any) {
    console.error('Errore GET /api/author-boost:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
