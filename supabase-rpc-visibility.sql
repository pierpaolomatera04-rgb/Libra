-- Funzione RPC per incrementare atomicamente visibility_score
CREATE OR REPLACE FUNCTION public.increment_visibility_score(book_id_param UUID, amount_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.books
  SET visibility_score = COALESCE(visibility_score, 0) + amount_param
  WHERE id = book_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
