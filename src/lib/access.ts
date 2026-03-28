import { SupabaseClient } from '@supabase/supabase-js'
import { PlanType } from './tokens'

// ============================================
// SISTEMA ACCESSO CONTENUTI — Sezioni 2 e 6 Specifiche
// ============================================

export type AccessResult =
  | 'GRANTED_FREE'        // 1° blocco o libro free rilasciato
  | 'GRANTED_PLAN'        // Accesso tramite piano Silver/Gold
  | 'GRANTED_OWNED'       // Libro acquistato con token
  | 'REQUIRES_TOKEN'      // Serve acquistare con token
  | 'REQUIRES_PLAN'       // Serve un piano superiore
  | 'LOCKED_NOT_RELEASED' // Blocco non ancora rilasciato
  | 'PLAN_BOOK_LIMIT'     // Silver ha raggiunto il cap 3 libri/mese

export interface AccessCheckResult {
  access: AccessResult
  canRead: boolean
  message: string
  // Info aggiuntive
  requiredPlan?: string
  tokenCost?: number
  monthlyBooksUsed?: number
  monthlyBooksLimit?: number
}

// ============================================
// CHECK ACCESSO A UN BLOCCO
// Logica completa da Sezione 6
// ============================================
export async function canAccessBlock(
  supabase: SupabaseClient,
  userId: string | null,
  bookId: string,
  blockNumber: number
): Promise<AccessCheckResult> {

  // Fetch blocco e libro
  const { data: block, error: blockErr } = await supabase
    .from('blocks')
    .select('id, block_number, is_first_block, release_at, silver_release_at, gold_release_at, is_released')
    .eq('book_id', bookId)
    .eq('block_number', blockNumber)
    .single()

  if (blockErr || !block) {
    return { access: 'LOCKED_NOT_RELEASED', canRead: false, message: 'Blocco non trovato' }
  }

  const { data: book, error: bookErr } = await supabase
    .from('books')
    .select('id, tier, status, price_per_block, author_id')
    .eq('id', bookId)
    .single()

  if (bookErr || !book) {
    return { access: 'LOCKED_NOT_RELEASED', canRead: false, message: 'Libro non trovato' }
  }

  // REGOLA 1: Il 1° blocco è SEMPRE gratuito per tutti
  if (block.is_first_block || blockNumber === 1) {
    return { access: 'GRANTED_FREE', canRead: true, message: 'Primo blocco gratuito' }
  }

  // Se utente non autenticato, può leggere solo il primo blocco
  if (!userId) {
    return {
      access: 'REQUIRES_TOKEN',
      canRead: false,
      message: 'Accedi per leggere questo contenuto',
      tokenCost: book.price_per_block || 0,
    }
  }

  const now = new Date()

  // REGOLA 2: Controlla se il blocco è stato rilasciato
  if (block.release_at && new Date(block.release_at) > now) {
    // Blocco non ancora rilasciato pubblicamente
    // Ma Gold/Silver potrebbero avere accesso anticipato
    if (block.gold_release_at && new Date(block.gold_release_at) <= now) {
      // Gold release disponibile — controlla sotto
    } else if (block.silver_release_at && new Date(block.silver_release_at) <= now) {
      // Silver release disponibile — controlla sotto
    } else {
      return { access: 'LOCKED_NOT_RELEASED', canRead: false, message: 'Questo blocco non è ancora disponibile' }
    }
  }

  // Fetch profilo utente via RPC (bypassa PostgREST schema cache)
  const { data: profileData } = await (supabase.rpc as any)('get_user_plan', { user_id_param: userId })
  const profile = Array.isArray(profileData) ? profileData[0] : profileData

  const userPlan = (profile?.plan || 'free') as PlanType
  const monthlyBooksUsed = profile?.monthly_books_used || 0
  const monthlyBooksResetAt = profile?.monthly_books_reset_at
  const planExpiresAt = profile?.plan_expires_at

  // Controlla se il piano è scaduto
  const planExpired = planExpiresAt && new Date(planExpiresAt) < now
  const effectivePlan = planExpired ? 'free' : userPlan

  // REGOLA 3: Controlla se l'utente possiede già il libro (OWNED)
  const { data: libraryEntry } = await supabase
    .from('library' as any)
    .select('ownership_type')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .single()

  if (libraryEntry?.ownership_type === 'OWNED') {
    return { access: 'GRANTED_OWNED', canRead: true, message: 'Libro acquistato' }
  }

  // REGOLA 4: Accesso tramite piano (PLAN)
  if (libraryEntry?.ownership_type === 'PLAN') {
    // Controlla che il piano non sia scaduto
    if (planExpired) {
      return {
        access: 'REQUIRES_PLAN',
        canRead: false,
        message: 'Il tuo abbonamento è scaduto. Riabbonati per continuare a leggere.',
        requiredPlan: userPlan,
      }
    }
    return { access: 'GRANTED_PLAN', canRead: true, message: 'Accesso tramite abbonamento' }
  }

  // REGOLA 5: Libro FREE tier — accessibile a tutti dopo rilascio
  if (book.tier === 'free' && block.is_released) {
    return { access: 'GRANTED_FREE', canRead: true, message: 'Contenuto gratuito' }
  }

  // REGOLA 6: Accesso anticipato Gold
  const isGold = effectivePlan === 'gold_monthly' || effectivePlan === 'gold_annual'
  const isSilver = effectivePlan === 'silver_monthly' || effectivePlan === 'silver_annual'

  if (isGold) {
    // Gold accede a TUTTO (free, silver, gold) dopo gold_release_at
    const goldReleaseOk = !block.gold_release_at || new Date(block.gold_release_at) <= now
    const releaseOk = !block.release_at || new Date(block.release_at) <= now

    if (goldReleaseOk || releaseOk) {
      return { access: 'GRANTED_PLAN', canRead: true, message: 'Accesso Gold' }
    }
  }

  if (isSilver) {
    // Silver accede a libri free e silver dopo silver_release_at
    if (book.tier === 'gold') {
      return {
        access: 'REQUIRES_TOKEN',
        canRead: false,
        message: 'I libri Gold richiedono un acquisto con token o un piano Gold',
        tokenCost: book.price_per_block || 0,
      }
    }

    const silverReleaseOk = !block.silver_release_at || new Date(block.silver_release_at) <= now
    const releaseOk = !block.release_at || new Date(block.release_at) <= now

    if (silverReleaseOk || releaseOk) {
      return { access: 'GRANTED_PLAN', canRead: true, message: 'Accesso Silver' }
    }
  }

  // REGOLA 7: Se non ha accesso tramite piano, serve token
  return {
    access: 'REQUIRES_TOKEN',
    canRead: false,
    message: 'Acquista questo contenuto con i token',
    tokenCost: book.price_per_block || 0,
  }
}

// ============================================
// AGGIUNGI LIBRO IN LIBRERIA
// Gestisce il cap 3 libri/mese per Silver
// ============================================
export async function addBookToLibrary(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  ownershipType: 'OWNED' | 'PLAN'
): Promise<{ success: boolean; error?: string }> {

  // Controlla se già in libreria
  const { data: existing } = await supabase
    .from('library' as any)
    .select('id, ownership_type')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .single()

  if (existing) {
    // Se già OWNED, non fare nulla
    if (existing.ownership_type === 'OWNED') {
      return { success: true }
    }
    // Se era PLAN e ora acquista (OWNED), aggiorna
    if (ownershipType === 'OWNED' && existing.ownership_type === 'PLAN') {
      await supabase
        .from('library' as any)
        .update({ ownership_type: 'OWNED' } as any)
        .eq('user_id', userId)
        .eq('book_id', bookId)
      return { success: true }
    }
    // Già PLAN e richiede PLAN — già in libreria
    return { success: true }
  }

  // Se ownership_type è PLAN, controlla il cap mensile Silver
  if (ownershipType === 'PLAN') {
    // Fetch piano via RPC (bypassa PostgREST schema cache)
    const { data: profileData } = await (supabase.rpc as any)('get_user_plan', { user_id_param: userId })
    const profile = Array.isArray(profileData) ? profileData[0] : profileData

    const userPlan = profile?.plan || 'free'
    const isSilver = userPlan === 'silver_monthly' || userPlan === 'silver_annual'

    if (isSilver) {
      // Controlla e resetta il contatore se necessario
      await checkAndResetMonthlyCounter(supabase, userId)

      // Ri-fetch dopo eventuale reset
      const { data: updatedData } = await (supabase.rpc as any)('get_user_plan', { user_id_param: userId })
      const updatedProfile = Array.isArray(updatedData) ? updatedData[0] : updatedData

      const currentUsed = updatedProfile?.monthly_books_used || 0

      // Controlla se il libro è una serializzazione in corso
      const { data: book } = await supabase
        .from('books')
        .select('status')
        .eq('id', bookId)
        .single()

      const isSerializing = book?.status === 'serializing'

      // Le serializzazioni NON contano verso il cap di 3 libri
      if (!isSerializing && currentUsed >= 3) {
        return {
          success: false,
          error: `Hai raggiunto il limite di 3 libri al mese con il piano Silver. Hai usato ${currentUsed}/3. Passa a Gold per libri illimitati.`,
        }
      }

      // Incrementa il contatore solo se NON è una serializzazione
      if (!isSerializing) {
        await (supabase.rpc as any)('increment_monthly_books', { user_id_param: userId })
      }
    }
  }

  // Inserisci in libreria
  const { error: insertErr } = await supabase
    .from('library' as any)
    .insert({
      user_id: userId,
      book_id: bookId,
      ownership_type: ownershipType,
      pages_read: 0,
    })

  if (insertErr) {
    return { success: false, error: `Errore aggiunta libreria: ${insertErr.message}` }
  }

  return { success: true }
}

// ============================================
// CONTROLLA E RESETTA CONTATORE MENSILE
// Se monthly_books_reset_at è passato, resetta
// ============================================
export async function checkAndResetMonthlyCounter(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  // Fetch via RPC (bypassa PostgREST schema cache)
  const { data: profileData } = await (supabase.rpc as any)('get_user_plan', { user_id_param: userId })
  const profile = Array.isArray(profileData) ? profileData[0] : profileData

  const resetAt = profile?.monthly_books_reset_at
  if (!resetAt) return false

  const now = new Date()
  if (new Date(resetAt) <= now) {
    // Resetta il contatore e imposta prossimo reset a 30 giorni
    const nextReset = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('profiles')
      .update({
        monthly_books_used: 0,
        monthly_books_reset_at: nextReset,
      } as any)
      .eq('id', userId)
    return true // Reset effettuato
  }

  return false // Non necessario
}
