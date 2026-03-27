import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTokenBalance } from '@/lib/tokens'

// GET /api/tokens/balance — Restituisce il saldo token dell'utente
export async function GET() {
  try {
    const supabase = createServerSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const balance = await getTokenBalance(supabase, user.id)

    return NextResponse.json({ balance })
  } catch (err: any) {
    console.error('Errore GET /api/tokens/balance:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
