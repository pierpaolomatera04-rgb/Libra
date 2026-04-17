import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/cron/trending — Ricalcola trending velocity score
// Chiamato ogni ora da Vercel Cron o manualmente
export async function GET(request: NextRequest) {
  try {
    // Verifica il token segreto (Vercel Cron invia CRON_SECRET)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Esegui la funzione SQL di calcolo
    const { error } = await supabase.rpc('calculate_velocity_trending')

    if (error) {
      console.error('Errore calcolo trending:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Registra snapshot giornaliero e calcola delta % a 7 giorni
    const { error: histErr } = await supabase.rpc('update_trending_history')
    if (histErr) {
      console.error('Errore update_trending_history:', histErr)
      // Non bloccante: il trending principale e' gia' stato calcolato
    }

    // Leggi i top 20 dalla cache per conferma
    const { data: topBooks, error: fetchErr } = await supabase
      .from('trending_cache')
      .select('book_id, score, retention_rate, retention_bonus_applied, computed_at')
      .order('score', { ascending: false })
      .limit(20)

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      computed_at: new Date().toISOString(),
      top_count: topBooks?.length || 0,
      top_books: topBooks,
    })
  } catch (err: any) {
    console.error('Errore cron trending:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
