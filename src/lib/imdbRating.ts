/**
 * Formula IMDb di rating ponderato (Bayesian average).
 *
 *   Score = (v / (v + m)) * R + (m / (v + m)) * C
 *
 * - v: numero di voti del libro (total_reviews)
 * - m: soglia minima fissa (default 5) — tira il punteggio verso C
 *      finché il libro non ha abbastanza voti
 * - R: rating proprio del libro (es. media 70% recensioni + 30% blocchi)
 * - C: media globale di tutti i libri della piattaforma
 *
 * Comportamento:
 * - 0 voti  → score = C (posizione neutrale)
 * - pochi voti estremi → score tirato verso C, non domina
 * - molti voti coerenti → score tende a R, sale meritatamente
 */
export function imdbScore(R: number, v: number, C: number, m = 5): number {
  const denom = v + m
  if (denom <= 0) return C
  return (v / denom) * R + (m / denom) * C
}

/**
 * Calcola C (media globale ponderata) leggendo `average_rating` e
 * `total_reviews` da tutti i libri con almeno 1 voto.
 *
 * Soluzione efficiente: non scarica tutte le reviews, ma usa i dati
 * già aggregati a livello libro:
 *   C = Σ(avg_rating * total_reviews) / Σ(total_reviews)
 *
 * Per scenari con molti libri, conviene cachare il risultato.
 *
 * @param fallback Valore di default se la piattaforma non ha ancora voti
 */
export async function fetchGlobalAverageRating(
  supabase: any,
  fallback = 3.5
): Promise<number> {
  const { data } = await supabase
    .from('books')
    .select('average_rating, total_reviews')
    .gt('total_reviews', 0)
  let sum = 0
  let votes = 0
  for (const b of (data as any[]) || []) {
    const r = Number(b.average_rating) || 0
    const n = Number(b.total_reviews) || 0
    sum += r * n
    votes += n
  }
  return votes > 0 ? sum / votes : fallback
}
