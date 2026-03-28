import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { canAccessBlock, addBookToLibrary, checkAndResetMonthlyCounter } from '@/lib/access'

// GET /api/access/test — Test automatici accesso contenuti
export async function GET() {
  const results: { test: string; status: 'PASS' | 'FAIL'; details?: any }[] = []

  try {
    const supabase = createAdminClient() as any

    // UUID dai seed data
    const UID_FREE = 'a0000000-0000-0000-0000-000000000001'
    const UID_SILVER_M = 'a0000000-0000-0000-0000-000000000002'
    const UID_SILVER_A = 'a0000000-0000-0000-0000-000000000003'
    const UID_GOLD_M = 'a0000000-0000-0000-0000-000000000004'
    const UID_GOLD_A = 'a0000000-0000-0000-0000-000000000005'
    const BID_FREE = 'c0000000-0000-0000-0000-000000000001'
    const BID_SILVER = 'c0000000-0000-0000-0000-000000000002'
    const BID_GOLD = 'c0000000-0000-0000-0000-000000000003'
    const BID_SERIAL = 'c0000000-0000-0000-0000-000000000004'

    // =====================
    // TEST 1: Primo blocco SEMPRE gratuito — libro FREE
    // =====================
    try {
      const result = await canAccessBlock(supabase, UID_FREE, BID_FREE, 1)
      const pass = result.access === 'GRANTED_FREE' && result.canRead === true
      results.push({
        test: '1. Primo blocco gratuito (libro FREE)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '1. Primo blocco FREE', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 2: Primo blocco SEMPRE gratuito — libro GOLD
    // =====================
    try {
      const result = await canAccessBlock(supabase, UID_FREE, BID_GOLD, 1)
      const pass = result.access === 'GRANTED_FREE' && result.canRead === true
      results.push({
        test: '2. Primo blocco gratuito (libro GOLD, utente FREE)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '2. Primo blocco GOLD', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 3: Primo blocco gratuito anche senza login
    // =====================
    try {
      const result = await canAccessBlock(supabase, null, BID_SILVER, 1)
      const pass = result.access === 'GRANTED_FREE' && result.canRead === true
      results.push({
        test: '3. Primo blocco gratuito (utente non autenticato)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '3. Primo blocco no auth', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 4: Utente FREE — blocco 2 libro FREE = gratuito
    // =====================
    try {
      const result = await canAccessBlock(supabase, UID_FREE, BID_FREE, 2)
      const pass = result.access === 'GRANTED_FREE' && result.canRead === true
      results.push({
        test: '4. Utente FREE legge blocco 2 libro FREE (gratuito)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '4. FREE blocco 2 free', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 5: Utente FREE — blocco 2 libro SILVER = richiede token
    // =====================
    try {
      const result = await canAccessBlock(supabase, UID_FREE, BID_SILVER, 2)
      const pass = result.access === 'REQUIRES_TOKEN' && result.canRead === false
      results.push({
        test: '5. Utente FREE non legge blocco 2 libro SILVER (richiede token)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '5. FREE blocco 2 silver', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 6: Utente SILVER — blocco 2 libro SILVER = accesso piano
    // =====================
    try {
      const result = await canAccessBlock(supabase, UID_SILVER_M, BID_SILVER, 2)
      const pass = result.access === 'GRANTED_PLAN' && result.canRead === true
      results.push({
        test: '6. Utente SILVER legge blocco 2 libro SILVER (piano)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '6. SILVER blocco 2 silver', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 7: Utente SILVER (annuale, senza gold in libreria) — blocco 2 libro GOLD = richiede token
    // NB: Silver mensile ha gold OWNED nel seed, usiamo silver annuale
    // =====================
    try {
      // Cleanup: rimuovi eventuali library entries per garantire test pulito
      await supabase.from('library').delete().eq('user_id', UID_SILVER_A).eq('book_id', BID_GOLD)

      const result = await canAccessBlock(supabase, UID_SILVER_A, BID_GOLD, 2)
      const pass = result.access === 'REQUIRES_TOKEN' && result.canRead === false
      results.push({
        test: '7. Utente SILVER non legge blocco 2 libro GOLD (richiede token)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '7. SILVER blocco 2 gold', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 8: Utente GOLD — blocco 2 libro GOLD = accesso piano o OWNED
    // =====================
    try {
      // Cleanup library per test puro plan-based
      await supabase.from('library').delete().eq('user_id', UID_GOLD_M).eq('book_id', BID_GOLD)

      const result = await canAccessBlock(supabase, UID_GOLD_M, BID_GOLD, 2)
      // Accetta sia GRANTED_PLAN che GRANTED_OWNED (entrambi validi)
      const pass = (result.access === 'GRANTED_PLAN' || result.access === 'GRANTED_OWNED') && result.canRead === true
      results.push({
        test: '8. Utente GOLD legge blocco 2 libro GOLD (piano)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '8. GOLD blocco 2 gold', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 9: Utente GOLD — accede anche a libro SILVER
    // =====================
    try {
      // Cleanup library
      await supabase.from('library').delete().eq('user_id', UID_GOLD_A).eq('book_id', BID_SILVER)

      // Debug: leggi profilo via RPC per verificare piano
      const { data: debugRpc } = await (supabase as any).rpc('get_user_plan', { user_id_param: UID_GOLD_A })
      const debugProfile = Array.isArray(debugRpc) ? debugRpc[0] : debugRpc

      const result = await canAccessBlock(supabase, UID_GOLD_A, BID_SILVER, 5)
      const pass = result.access === 'GRANTED_PLAN' && result.canRead === true
      results.push({
        test: '9. Utente GOLD accede a libro SILVER (piano superiore)',
        status: pass ? 'PASS' : 'FAIL',
        details: {
          ...result,
          debugPlan: (debugProfile as any)?.plan,
          debugPlanExpires: (debugProfile as any)?.plan_expires_at,
        },
      })
    } catch (err: any) {
      results.push({ test: '9. GOLD su silver', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 10: Libro acquistato (OWNED) — accesso garantito
    // =====================
    try {
      // Aggiungi libro alla libreria come OWNED
      await supabase.from('library').delete().eq('user_id', UID_FREE).eq('book_id', BID_GOLD)
      await (supabase.from('library') as any).insert({
        user_id: UID_FREE,
        book_id: BID_GOLD,
        ownership_type: 'OWNED',
        pages_read: 0,
      })

      const result = await canAccessBlock(supabase, UID_FREE, BID_GOLD, 5)
      const pass = result.access === 'GRANTED_OWNED' && result.canRead === true

      // Cleanup
      await supabase.from('library').delete().eq('user_id', UID_FREE).eq('book_id', BID_GOLD)

      results.push({
        test: '10. Libro OWNED: utente FREE accede a blocco 5 GOLD (acquistato)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '10. OWNED access', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 11: Cap 3 libri Silver — addBookToLibrary
    // =====================
    try {
      const futureReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      // Cleanup libreria per test
      await supabase.from('library').delete().eq('user_id', UID_SILVER_A).eq('book_id', BID_SILVER)
      await supabase.from('library').delete().eq('user_id', UID_SILVER_A).eq('book_id', BID_FREE)
      await supabase.from('library').delete().eq('user_id', UID_SILVER_A).eq('book_id', BID_GOLD)

      // Simula 3 libri via RPC — con debug
      const { data: setData, error: setErr } = await (supabase as any).rpc('set_monthly_books', { user_id_param: UID_SILVER_A, books_used_param: 3, reset_at_param: futureReset })

      // Verifica cosa ha letto
      const { data: checkData } = await (supabase as any).rpc('get_user_plan', { user_id_param: UID_SILVER_A })
      const checkProfile = Array.isArray(checkData) ? checkData[0] : checkData

      // Il 4° libro PLAN deve essere rifiutato
      const result = await addBookToLibrary(supabase, UID_SILVER_A, BID_SILVER, 'PLAN')
      const pass = !result.success && (result.error?.includes('3') || result.error?.includes('limite'))

      // Cleanup
      await (supabase as any).rpc('set_monthly_books', { user_id_param: UID_SILVER_A, books_used_param: 0, reset_at_param: futureReset })

      results.push({
        test: '11. Cap 3 libri Silver: 4° libro PLAN rifiutato',
        status: pass ? 'PASS' : 'FAIL',
        details: {
          result,
          rpcSetErr: setErr?.message || null,
          monthlyAfterSet: checkProfile?.monthly_books_used,
          planAfterSet: checkProfile?.plan,
        },
      })
    } catch (err: any) {
      results.push({ test: '11. Cap Silver', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 12: Serializzazioni NON contano verso il cap Silver
    // =====================
    try {
      const futureReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      // Setta contatore a 3 via RPC
      await (supabase as any).rpc('set_monthly_books', { user_id_param: UID_SILVER_A, books_used_param: 3, reset_at_param: futureReset })

      // Cleanup
      await supabase.from('library').delete().eq('user_id', UID_SILVER_A).eq('book_id', BID_SERIAL)

      // Serializzazione deve passare anche con cap raggiunto
      const result = await addBookToLibrary(supabase, UID_SILVER_A, BID_SERIAL, 'PLAN')
      const pass = result.success

      // Cleanup
      await supabase.from('library').delete().eq('user_id', UID_SILVER_A).eq('book_id', BID_SERIAL)
      await (supabase as any).rpc('set_monthly_books', { user_id_param: UID_SILVER_A, books_used_param: 0, reset_at_param: futureReset })

      results.push({
        test: '12. Serializzazioni bypassano cap Silver (PLAN ok anche con 3/3)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '12. Serializzazione cap', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 13: Acquisto OWNED non ha cap
    // =====================
    try {
      const futureReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      // Setta contatore a 3 via RPC
      await (supabase as any).rpc('set_monthly_books', { user_id_param: UID_SILVER_A, books_used_param: 3, reset_at_param: futureReset })

      // Cleanup
      await supabase.from('library').delete().eq('user_id', UID_SILVER_A).eq('book_id', BID_GOLD)

      // OWNED non è limitato dal cap
      const result = await addBookToLibrary(supabase, UID_SILVER_A, BID_GOLD, 'OWNED')
      const pass = result.success

      // Cleanup
      await supabase.from('library').delete().eq('user_id', UID_SILVER_A).eq('book_id', BID_GOLD)
      await (supabase as any).rpc('set_monthly_books', { user_id_param: UID_SILVER_A, books_used_param: 0, reset_at_param: futureReset })

      results.push({
        test: '13. Acquisto OWNED: nessun cap (Silver con 3/3 può comprare)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '13. OWNED no cap', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 14: Gold non ha cap libri
    // =====================
    try {
      // Cleanup
      await supabase.from('library').delete().eq('user_id', UID_GOLD_M).eq('book_id', BID_SILVER)

      const result = await addBookToLibrary(supabase, UID_GOLD_M, BID_SILVER, 'PLAN')
      const pass = result.success

      // Cleanup
      await supabase.from('library').delete().eq('user_id', UID_GOLD_M).eq('book_id', BID_SILVER)

      results.push({
        test: '14. Gold non ha cap libri mensile (PLAN ok)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '14. Gold no cap', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 15: Reset contatore mensile
    // =====================
    try {
      const pastReset = new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 ora fa

      // Setta reset_at nel passato via RPC
      await (supabase as any).rpc('set_monthly_books', { user_id_param: UID_SILVER_M, books_used_param: 3, reset_at_param: pastReset })

      const wasReset = await checkAndResetMonthlyCounter(supabase, UID_SILVER_M)

      // Verifica che sia stato resettato via RPC
      const { data: profileData } = await (supabase as any).rpc('get_user_plan', { user_id_param: UID_SILVER_M })
      const profile = Array.isArray(profileData) ? profileData[0] : profileData

      const pass = wasReset && profile?.monthly_books_used === 0

      // Ripristina valori originali
      const futureReset = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      await (supabase as any).rpc('set_monthly_books', { user_id_param: UID_SILVER_M, books_used_param: 1, reset_at_param: futureReset })

      results.push({
        test: '15. Reset contatore mensile (3 → 0 quando scaduto)',
        status: pass ? 'PASS' : 'FAIL',
        details: { wasReset, monthlyBooksUsed: profile?.monthly_books_used },
      })
    } catch (err: any) {
      results.push({ test: '15. Reset mensile', status: 'FAIL', details: err.message })
    }

    // =====================
    // RIEPILOGO
    // =====================
    const passed = results.filter(r => r.status === 'PASS').length
    const failed = results.filter(r => r.status === 'FAIL').length

    return NextResponse.json({
      summary: `${passed} PASS, ${failed} FAIL su ${results.length} test`,
      allPassed: failed === 0,
      results,
    }, { status: failed > 0 ? 500 : 200 })

  } catch (err: any) {
    return NextResponse.json({
      summary: 'Errore critico nei test',
      error: err.message,
      results,
    }, { status: 500 })
  }
}
