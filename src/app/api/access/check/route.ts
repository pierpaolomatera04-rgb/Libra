import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { canAccessBlock } from '@/lib/access'

// GET /api/access/check?bookId=xxx&block=1
// Controlla se l'utente può accedere a un blocco
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')
    const blockNum = parseInt(searchParams.get('block') || '1')
    const userId = searchParams.get('userId') // Per test, in prod usa auth

    if (!bookId) {
      return NextResponse.json({ error: 'bookId è obbligatorio' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const result = await canAccessBlock(supabase, userId, bookId, blockNum)

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
