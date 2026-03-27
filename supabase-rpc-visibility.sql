-- Funzione RPC per incrementare atomicamente visibility_score
-- Restituisce il nuovo valore per verifica
DROP FUNCTION IF EXISTS public.increment_visibility_score(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.increment_visibility_score(book_id_param UUID, amount_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_score INTEGER;
BEGIN
  UPDATE public.books
  SET visibility_score = COALESCE(visibility_score, 0) + amount_param
  WHERE id = book_id_param
  RETURNING visibility_score INTO new_score;

  RETURN new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notifica PostgREST di ricaricare lo schema
NOTIFY pgrst, 'reload schema';
