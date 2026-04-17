import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabase } from '@/lib/supabase-server'
import { canAccessBlock } from '@/lib/access'

// GET /api/access/check?bookId=xxx&block=2
// Controlla se l'utente corrente (da cookie di sessione) può accedere a un blocco.
// L'userId NON viene più preso dalla querystring: la verifica è autoritativa e si
// basa esclusivamente sulla sessione autenticata. Questo previene bypass via URL.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')
    const blockNum = parseInt(searchParams.get('block') || '1')

    if (!bookId) {
      return NextResponse.json({ error: 'bookId è obbligatorio' }, { status: 400 })
    }

    // Leggi l'utente autenticato dai cookie di sessione
    const serverSupabase = createServerSupabase()
    const { data: { user } } = await serverSupabase.auth.getUser()

    // Guest Block: se il richiedente non è autenticato e sta chiedendo un blocco
    // diverso dal primo, rispondiamo 401. Il primo blocco resta pubblico (preview).
    if (!user && blockNum > 1) {
      return NextResponse.json(
        {
          access: 'REQUIRES_TOKEN',
          canRead: false,
          message: 'Accedi per leggere questo contenuto',
          requiresAuth: true,
        },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
      )
    }

    // Usa il client admin (bypassa RLS) per leggere blocchi, libri e piano
    const adminSupabase = createAdminClient()
    const result = await canAccessBlock(adminSupabase, user?.id ?? null, bookId, blockNum)

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
