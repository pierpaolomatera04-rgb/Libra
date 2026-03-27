import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  getTokenBalance,
  spendTokens,
  spendWelcomeTokens,
  applyDiscount,
  creditTokens,
  PlanType,
} from '@/lib/tokens'

// GET /api/tokens/test — Esegue test automatici con i seed data
// SOLO PER SVILUPPO — rimuovere in produzione
export async function GET() {
  const results: { test: string; status: 'PASS' | 'FAIL'; details?: any }[] = []

  try {
    const supabase = createAdminClient()

    // UUID dai seed data
    const UID_FREE = 'a0000000-0000-0000-0000-000000000001'
    const UID_SILVER_M = 'a0000000-0000-0000-0000-000000000002'
    const UID_SILVER_A = 'a0000000-0000-0000-0000-000000000003'
    const UID_GOLD_M = 'a0000000-0000-0000-0000-000000000004'
    const UID_GOLD_A = 'a0000000-0000-0000-0000-000000000005'
    const BID_FREE = 'c0000000-0000-0000-0000-000000000001'
    const BID_SILVER = 'c0000000-0000-0000-0000-000000000002'
    const BID_GOLD = 'c0000000-0000-0000-0000-000000000003'

    // =====================
    // TEST 1: Saldo token utente free
    // =====================
    try {
      const balance = await getTokenBalance(supabase, UID_FREE)
      const pass = balance.WELCOME_TOKEN === 10 && balance.spendable === 0
      results.push({
        test: '1. Saldo utente FREE (10 WELCOME, 0 spendibili)',
        status: pass ? 'PASS' : 'FAIL',
        details: balance,
      })
    } catch (err: any) {
      results.push({ test: '1. Saldo utente FREE', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 2: Saldo token Silver mensile
    // =====================
    try {
      const balance = await getTokenBalance(supabase, UID_SILVER_M)
      const pass = balance.MONTHLY_TOKEN === 10 && balance.spendable === 10
      results.push({
        test: '2. Saldo utente SILVER mensile (10 MONTHLY, 10 spendibili)',
        status: pass ? 'PASS' : 'FAIL',
        details: balance,
      })
    } catch (err: any) {
      results.push({ test: '2. Saldo SILVER mensile', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 3: Saldo token Silver annuale
    // =====================
    try {
      const balance = await getTokenBalance(supabase, UID_SILVER_A)
      const pass = balance.MONTHLY_TOKEN === 10 && balance.ANNUAL_BONUS_TOKEN === 40 && balance.spendable === 50
      results.push({
        test: '3. Saldo utente SILVER annuale (10 MONTHLY + 40 ANNUAL = 50 spendibili)',
        status: pass ? 'PASS' : 'FAIL',
        details: balance,
      })
    } catch (err: any) {
      results.push({ test: '3. Saldo SILVER annuale', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 4: Saldo token Gold annuale
    // =====================
    try {
      const balance = await getTokenBalance(supabase, UID_GOLD_A)
      const pass = balance.MONTHLY_TOKEN === 20 && balance.ANNUAL_BONUS_TOKEN === 80 && balance.spendable === 100
      results.push({
        test: '4. Saldo utente GOLD annuale (20 MONTHLY + 80 ANNUAL = 100 spendibili)',
        status: pass ? 'PASS' : 'FAIL',
        details: balance,
      })
    } catch (err: any) {
      results.push({ test: '4. Saldo GOLD annuale', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 5: Sconto Silver (-15%)
    // =====================
    {
      const discounted = applyDiscount(100, 'silver_monthly')
      const pass = discounted === 85  // 100 * 0.85 = 85
      results.push({
        test: '5. Sconto Silver -15% (100 → 85)',
        status: pass ? 'PASS' : 'FAIL',
        details: { base: 100, discounted },
      })
    }

    // =====================
    // TEST 6: Sconto Gold (-30%)
    // =====================
    {
      const discounted = applyDiscount(100, 'gold_monthly')
      const pass = discounted === 70  // 100 * 0.70 = 70
      results.push({
        test: '6. Sconto Gold -30% (100 → 70)',
        status: pass ? 'PASS' : 'FAIL',
        details: { base: 100, discounted },
      })
    }

    // =====================
    // TEST 7: Sconto arrotondamento (50 * 0.85 = 42.5 → ceil = 43)
    // =====================
    {
      const discounted = applyDiscount(50, 'silver_monthly')
      const pass = discounted === 43
      results.push({
        test: '7. Arrotondamento per eccesso (50 Silver → 43)',
        status: pass ? 'PASS' : 'FAIL',
        details: { base: 50, discounted },
      })
    }

    // =====================
    // TEST 8: WELCOME_TOKEN rifiutati su libro non-free
    // =====================
    try {
      const result = await spendWelcomeTokens(supabase, UID_FREE, BID_SILVER, 5)
      const pass = !result.success && result.error?.includes('tier free')
      results.push({
        test: '8. WELCOME_TOKEN rifiutati su libro SILVER tier',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '8. WELCOME su non-free', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 9: WELCOME_TOKEN accettati su libro free + visibilità
    // =====================
    try {
      // Prima leggi il visibility_score attuale
      const { data: bookBefore } = await supabase.from('books').select('visibility_score').eq('id', BID_FREE).single() as any
      const scoreBefore = bookBefore?.visibility_score || 0

      const result = await spendWelcomeTokens(supabase, UID_FREE, BID_FREE, 5)

      const { data: bookAfter } = await supabase.from('books').select('visibility_score').eq('id', BID_FREE).single() as any
      const scoreAfter = bookAfter?.visibility_score || 0

      const pass = result.success && scoreAfter === scoreBefore + 5
      results.push({
        test: '9. WELCOME_TOKEN su libro FREE → visibilità +5',
        status: pass ? 'PASS' : 'FAIL',
        details: { result, scoreBefore, scoreAfter },
      })
    } catch (err: any) {
      results.push({ test: '9. WELCOME su free', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 10: Spesa token con ordine corretto (MONTHLY prima)
    // Prima accredita token di test al Gold mensile
    // =====================
    try {
      // Aggiungi 5 PURCHASED_TOKEN al gold mensile per test
      await creditTokens(supabase, UID_GOLD_M, 5, 'PURCHASED_TOKEN')

      // Bilancio: 20 MONTHLY + 5 PURCHASED = 25 spendibili
      // Spendi 22 token su libro silver (gold sconto 30%: prezzo reale = ceil(22 * 0.70) = 16)
      const result = await spendTokens(supabase, UID_GOLD_M, BID_SILVER, 22, 'silver', 'gold_monthly')

      // Dovrebbe spendere 16 token totali, prima MONTHLY poi PURCHASED
      const monthlySpent = result.tokensSpent.find(t => t.type === 'MONTHLY_TOKEN')
      const purchasedSpent = result.tokensSpent.find(t => t.type === 'PURCHASED_TOKEN')

      const pass = result.success &&
        result.totalSpent === 16 &&
        monthlySpent !== undefined &&
        // MONTHLY dovrebbe essere usato per primo
        result.tokensSpent[0]?.type === 'MONTHLY_TOKEN'

      results.push({
        test: '10. Ordine spesa: MONTHLY prima di PURCHASED (22 base, 16 scontato Gold)',
        status: pass ? 'PASS' : 'FAIL',
        details: {
          totalSpent: result.totalSpent,
          tokensSpent: result.tokensSpent,
          authorPayout: result.authorPayout,
          platformPayout: result.platformPayout,
        },
      })
    } catch (err: any) {
      results.push({ test: '10. Ordine spesa', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 11: Token insufficienti
    // =====================
    try {
      // L'utente free ha solo welcome token, 0 spendibili
      const result = await spendTokens(supabase, UID_FREE, BID_SILVER, 50, 'silver', 'free')
      const pass = !result.success && result.error?.includes('insufficienti')
      results.push({
        test: '11. Errore token insufficienti (utente free, 0 spendibili)',
        status: pass ? 'PASS' : 'FAIL',
        details: result,
      })
    } catch (err: any) {
      results.push({ test: '11. Token insufficienti', status: 'FAIL', details: err.message })
    }

    // =====================
    // TEST 12: Transazione registrata con payout corretto
    // =====================
    try {
      const { data: txs } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', UID_GOLD_M)
        .eq('book_id', BID_SILVER)
        .order('created_at', { ascending: false })
        .limit(5) as any

      const hasPayoutTx = (txs as any[])?.some((tx: any) => tx.author_payout > 0)
      results.push({
        test: '12. Transazioni registrate con payout > 0',
        status: hasPayoutTx ? 'PASS' : 'FAIL',
        details: (txs as any[])?.map((tx: any) => ({
          type: tx.token_type,
          spent: tx.tokens_spent,
          author: tx.author_payout,
          platform: tx.platform_payout,
        })),
      })
    } catch (err: any) {
      results.push({ test: '12. Transazioni', status: 'FAIL', details: err.message })
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
