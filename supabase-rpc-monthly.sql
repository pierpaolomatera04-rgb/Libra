-- Funzione RPC per incrementare atomicamente monthly_books_used
CREATE OR REPLACE FUNCTION public.increment_monthly_books(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET monthly_books_used = COALESCE(monthly_books_used, 0) + 1
  WHERE id = user_id_param
  RETURNING monthly_books_used INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ricarica schema PostgREST
NOTIFY pgrst, 'reload schema';
