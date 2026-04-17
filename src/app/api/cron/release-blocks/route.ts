import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/cron/release-blocks — Pubblica blocchi con scheduled_date passata
// Chiamato ogni giorno a mezzanotte da Vercel Cron
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const supabase: any = createAdminClient()
    const now = new Date().toISOString()

    // Trova blocchi con scheduled_date passata ma non ancora rilasciati
    const { data: blocksToRelease, error: fetchError } = await supabase
      .from('blocks')
      .select('id, book_id, block_number, scheduled_date')
      .eq('is_released', false)
      .not('scheduled_date', 'is', null)
      .lte('scheduled_date', now)

    if (fetchError) {
      console.error('Errore fetch blocchi da rilasciare:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!blocksToRelease || blocksToRelease.length === 0) {
      return NextResponse.json({ released: 0, message: 'Nessun blocco da rilasciare' })
    }

    const blockIds = blocksToRelease.map((b: any) => b.id)

    // Aggiorna is_released e released_at
    const { error: updateError } = await supabase
      .from('blocks')
      .update({ is_released: true, released_at: now })
      .in('id', blockIds)

    if (updateError) {
      console.error('Errore aggiornamento blocchi:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Controlla se tutti i blocchi di un libro sono rilasciati → status 'completed'
    const bookIds = Array.from(new Set(blocksToRelease.map((b: any) => b.book_id)))

    for (const bookId of bookIds) {
      const { count } = await supabase
        .from('blocks')
        .select('id', { count: 'exact', head: true })
        .eq('book_id', bookId)
        .eq('is_released', true)

      const { count: totalCount } = await supabase
        .from('blocks')
        .select('id', { count: 'exact', head: true })
        .eq('book_id', bookId)

      if (count === totalCount) {
        await supabase
          .from('books')
          .update({ status: 'completed' })
          .eq('id', bookId)
          .in('status', ['ongoing', 'published'])
      }
    }

    // Crea notifiche per i lettori che seguono i libri
    for (const block of blocksToRelease) {
      const { data: libraryUsers } = await supabase
        .from('user_library')
        .select('user_id')
        .eq('book_id', block.book_id)

      if (libraryUsers && libraryUsers.length > 0) {
        const { data: bookData } = await supabase
          .from('books')
          .select('title, author_id')
          .eq('id', block.book_id)
          .single()

        if (bookData) {
          const notifications = libraryUsers
            .filter((u: any) => u.user_id !== bookData.author_id)
            .map((u: any) => ({
              user_id: u.user_id,
              type: 'new_block',
              title: 'Nuovo blocco disponibile',
              message: `Il blocco ${block.block_number} di "${bookData.title}" è ora disponibile!`,
              link: `/reader/${block.book_id}/${block.block_number}`,
            }))

          if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications)
          }
        }
      }
    }

    return NextResponse.json({
      released: blocksToRelease.length,
      blocks: blocksToRelease.map((b: any) => ({ id: b.id, book_id: b.book_id, block_number: b.block_number })),
    })
  } catch (err: any) {
    console.error('Errore cron release-blocks:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
