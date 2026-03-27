import { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// SISTEMA TOKEN — Sezione 3 Specifiche Tecniche
// ============================================

export type TokenType = 'WELCOME_TOKEN' | 'MONTHLY_TOKEN' | 'PURCHASED_TOKEN' | 'ANNUAL_BONUS_TOKEN'

export type PlanType = 'free' | 'silver_monthly' | 'silver_annual' | 'gold_monthly' | 'gold_annual'

// ============================================
// CALCOLO SCONTO PER PIANO
// Silver: -15%, Gold: -30%
// ============================================
export function getDiscountForPlan(plan: PlanType): number {
  switch (plan) {
    case 'silver_monthly':
    case 'silver_annual':
      return 0.15
    case 'gold_monthly':
    case 'gold_annual':
      return 0.30
    default:
      return 0
  }
}

export function applyDiscount(basePrice: number, plan: PlanType): number {
  const discount = getDiscountForPlan(plan)
  // Arrotonda per eccesso come da specifiche: Math.ceil(prezzo_base * (1 - sconto))
  return Math.ceil(basePrice * (1 - discount))
}

// ============================================
// SALDO TOKEN per utente
// Raggruppa per tipo, esclude scaduti e spesi
// ============================================
export async function getTokenBalance(supabase: SupabaseClient, userId: string) {
  const { data: tokens, error } = await supabase
    .from('tokens')
    .select('id, amount, type, expires_at, spent')
    .eq('user_id', userId)
    .eq('spent', false)

  if (error) throw new Error(`Errore fetch token: ${error.message}`)

  const now = new Date()

  // Filtra token scaduti
  const validTokens = (tokens || []).filter(t => {
    if (!t.expires_at) return true // Non scade
    return new Date(t.expires_at) > now
  })

  // Raggruppa per tipo
  const balance = {
    WELCOME_TOKEN: 0,
    MONTHLY_TOKEN: 0,
    PURCHASED_TOKEN: 0,
    ANNUAL_BONUS_TOKEN: 0,
    total: 0,
    // Token spendibili (esclude WELCOME_TOKEN che hanno uso speciale)
    spendable: 0,
  }

  for (const t of validTokens) {
    balance[t.type as TokenType] += t.amount
    balance.total += t.amount
    if (t.type !== 'WELCOME_TOKEN') {
      balance.spendable += t.amount
    }
  }

  return balance
}

// ============================================
// SPENDI TOKEN — Logica core
// Ordine: MONTHLY (scadono) → ANNUAL_BONUS → PURCHASED
// WELCOME_TOKEN: solo su libri free tier, solo visibilità
// ============================================

interface SpendResult {
  success: boolean
  error?: string
  tokensSpent: { type: TokenType; amount: number }[]
  totalSpent: number
  authorPayout: number
  platformPayout: number
}

export async function spendTokens(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  amountToSpend: number,
  bookTier: string,
  userPlan: PlanType
): Promise<SpendResult> {
  // Applica sconto piano
  const discountedAmount = applyDiscount(amountToSpend, userPlan)

  // Fetch token disponibili non scaduti e non spesi
  const { data: allTokens, error: fetchErr } = await supabase
    .from('tokens')
    .select('id, amount, type, expires_at')
    .eq('user_id', userId)
    .eq('spent', false)
    .order('expires_at', { ascending: true, nullsFirst: false })

  if (fetchErr) return { success: false, error: fetchErr.message, tokensSpent: [], totalSpent: 0, authorPayout: 0, platformPayout: 0 }

  const now = new Date()

  // Filtra scaduti
  const validTokens = (allTokens || []).filter(t => {
    if (!t.expires_at) return true
    return new Date(t.expires_at) > now
  })

  // Separa per tipo (esclude WELCOME da spesa normale)
  const monthlyTokens = validTokens
    .filter(t => t.type === 'MONTHLY_TOKEN')
    .sort((a, b) => {
      // Ordina per scadenza più vicina prima
      if (!a.expires_at) return 1
      if (!b.expires_at) return -1
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
    })

  const annualTokens = validTokens.filter(t => t.type === 'ANNUAL_BONUS_TOKEN')
  const purchasedTokens = validTokens.filter(t => t.type === 'PURCHASED_TOKEN')

  // Ordine di spesa: MONTHLY → ANNUAL_BONUS → PURCHASED
  const orderedTokens = [...monthlyTokens, ...annualTokens, ...purchasedTokens]

  // Calcola se ci sono abbastanza token
  const totalAvailable = orderedTokens.reduce((sum, t) => sum + t.amount, 0)
  if (totalAvailable < discountedAmount) {
    return {
      success: false,
      error: `Token insufficienti. Servono ${discountedAmount} token (prezzo scontato), hai ${totalAvailable} token spendibili.`,
      tokensSpent: [],
      totalSpent: 0,
      authorPayout: 0,
      platformPayout: 0,
    }
  }

  // Spendi token nell'ordine corretto
  let remaining = discountedAmount
  const tokensSpent: { type: TokenType; amount: number }[] = []
  const tokenIdsToMarkSpent: string[] = []

  for (const token of orderedTokens) {
    if (remaining <= 0) break

    if (token.amount <= remaining) {
      // Usa tutto il token
      remaining -= token.amount
      tokensSpent.push({ type: token.type as TokenType, amount: token.amount })
      tokenIdsToMarkSpent.push(token.id)
    } else {
      // Usa parte del token — aggiorna l'amount rimanente
      tokensSpent.push({ type: token.type as TokenType, amount: remaining })

      // Aggiorna il token: riduci l'amount
      const { error: updateErr } = await supabase
        .from('tokens')
        .update({ amount: token.amount - remaining })
        .eq('id', token.id)

      if (updateErr) return { success: false, error: `Errore aggiornamento token: ${updateErr.message}`, tokensSpent: [], totalSpent: 0, authorPayout: 0, platformPayout: 0 }

      remaining = 0
    }
  }

  // Marca i token completamente usati come spesi
  if (tokenIdsToMarkSpent.length > 0) {
    const { error: spentErr } = await supabase
      .from('tokens')
      .update({ spent: true })
      .in('id', tokenIdsToMarkSpent)

    if (spentErr) return { success: false, error: `Errore marcatura token spesi: ${spentErr.message}`, tokensSpent: [], totalSpent: 0, authorPayout: 0, platformPayout: 0 }
  }

  // Calcola payout — 70% autore, 30% piattaforma
  // Valore in euro: 1 token = €0.10
  const euroValue = discountedAmount * 0.10
  const authorPayout = Math.round(euroValue * 0.70 * 100) / 100
  const platformPayout = Math.round(euroValue * 0.30 * 100) / 100

  // Registra transazione per ogni tipo di token usato
  for (const spent of tokensSpent) {
    const spentEuro = spent.amount * 0.10
    const { error: txErr } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        book_id: bookId,
        token_type: spent.type,
        tokens_spent: spent.amount,
        author_payout: Math.round(spentEuro * 0.70 * 100) / 100,
        platform_payout: Math.round(spentEuro * 0.30 * 100) / 100,
      })

    if (txErr) console.error('Errore inserimento transazione:', txErr.message)
  }

  return {
    success: true,
    tokensSpent,
    totalSpent: discountedAmount,
    authorPayout,
    platformPayout,
  }
}

// ============================================
// SPENDI WELCOME TOKEN — Solo su libri free tier
// NON genera pagamento, solo visibilità
// ============================================
export async function spendWelcomeTokens(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {

  // Verifica che il libro sia tier 'free'
  const { data: book, error: bookErr } = await supabase
    .from('books')
    .select('id, tier, visibility_score')
    .eq('id', bookId)
    .single()

  if (bookErr || !book) return { success: false, error: 'Libro non trovato' }
  if (book.tier !== 'free') return { success: false, error: 'I Welcome Token sono utilizzabili solo su libri con tier free' }

  // Fetch welcome token disponibili
  const { data: welcomeTokens, error: fetchErr } = await supabase
    .from('tokens')
    .select('id, amount')
    .eq('user_id', userId)
    .eq('type', 'WELCOME_TOKEN')
    .eq('spent', false)

  if (fetchErr) return { success: false, error: fetchErr.message }

  const totalWelcome = (welcomeTokens || []).reduce((sum, t) => sum + t.amount, 0)
  if (totalWelcome < amount) {
    return { success: false, error: `Welcome token insufficienti. Hai ${totalWelcome}, servono ${amount}.` }
  }

  // Spendi welcome token
  let remaining = amount
  const idsToMarkSpent: string[] = []

  for (const token of (welcomeTokens || [])) {
    if (remaining <= 0) break

    if (token.amount <= remaining) {
      remaining -= token.amount
      idsToMarkSpent.push(token.id)
    } else {
      await supabase
        .from('tokens')
        .update({ amount: token.amount - remaining })
        .eq('id', token.id)
      remaining = 0
    }
  }

  if (idsToMarkSpent.length > 0) {
    await supabase
      .from('tokens')
      .update({ spent: true })
      .in('id', idsToMarkSpent)
  }

  // Incrementa visibility_score del libro — NON genera payout
  // Usa RPC atomico per evitare problemi con schema cache di PostgREST
  const { error: visErr } = await (supabase.rpc as any)('increment_visibility_score', {
    book_id_param: bookId,
    amount_param: amount,
  })

  if (visErr) console.error('Errore incremento visibility_score:', visErr)

  // Registra transazione con payout = 0
  await supabase
    .from('token_transactions')
    .insert({
      user_id: userId,
      book_id: bookId,
      token_type: 'WELCOME_TOKEN',
      tokens_spent: amount,
      author_payout: 0,
      platform_payout: 0,
    })

  return { success: true }
}

// ============================================
// ACCREDITA TOKEN — Per abbonamenti e acquisti
// ============================================
export async function creditTokens(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  type: TokenType,
  expiresInDays?: number
): Promise<{ success: boolean; error?: string; tokenId?: string }> {

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { data, error } = await supabase
    .from('tokens')
    .insert({
      user_id: userId,
      amount,
      type,
      expires_at: expiresAt,
      spent: false,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, tokenId: data.id }
}

// ============================================
// ACCREDITA WELCOME TOKEN (10, una tantum)
// ============================================
export async function creditWelcomeTokens(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {

  // Controlla che non siano già stati assegnati
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('welcome_tokens_used')
    .eq('id', userId)
    .single()

  if (profileErr) return { success: false, error: profileErr.message }
  if (profile?.welcome_tokens_used) return { success: false, error: 'Welcome token già assegnati' }

  // Accredita 10 welcome token (non scadono)
  const result = await creditTokens(supabase, userId, 10, 'WELCOME_TOKEN')
  if (!result.success) return result

  // Marca come usati SUBITO (anti double-crediting)
  await supabase
    .from('profiles')
    .update({ welcome_tokens_used: true })
    .eq('id', userId)

  return { success: true }
}

// ============================================
// ACCREDITA TOKEN MENSILI (per rinnovo abbonamento)
// Silver: 10/mese, Gold: 20/mese — scadono dopo 30 giorni
// ============================================
export async function creditMonthlyTokens(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanType
): Promise<{ success: boolean; error?: string }> {

  let amount = 0
  if (plan === 'silver_monthly' || plan === 'silver_annual') amount = 10
  else if (plan === 'gold_monthly' || plan === 'gold_annual') amount = 20
  else return { success: false, error: 'Piano free non riceve token mensili' }

  return await creditTokens(supabase, userId, amount, 'MONTHLY_TOKEN', 30)
}

// ============================================
// ACCREDITA BONUS ANNUALE (una tantum all'attivazione)
// Silver annuale: 40 token, Gold annuale: 80 token — non scadono
// ============================================
export async function creditAnnualBonusTokens(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanType
): Promise<{ success: boolean; error?: string }> {

  let amount = 0
  if (plan === 'silver_annual') amount = 40
  else if (plan === 'gold_annual') amount = 80
  else return { success: false, error: 'Bonus annuale solo per piani annuali' }

  return await creditTokens(supabase, userId, amount, 'ANNUAL_BONUS_TOKEN')
}
