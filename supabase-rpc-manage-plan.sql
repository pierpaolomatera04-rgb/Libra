-- Espande get_user_plan per gestire anche simulazione cancellazione/ripristino
-- Usa la STESSA funzione già cachata da PostgREST, con parametro opzionale
-- mode: 'read' (default), 'expire' (simula cancellazione), 'restore' (ripristina)

-- PRIMA: droppa la vecchia versione con 1 parametro
DROP FUNCTION IF EXISTS public.get_user_plan(UUID);

-- POI: ricrea con 2 parametri (il secondo opzionale)
CREATE OR REPLACE FUNCTION public.get_user_plan(
  user_id_param UUID,
  mode_param TEXT DEFAULT 'read'
)
RETURNS TABLE(plan TEXT, plan_expires_at TIMESTAMPTZ, monthly_books_used INTEGER, monthly_books_reset_at TIMESTAMPTZ)
AS $$
BEGIN
  -- Se mode = 'expire', simula cancellazione abbonamento
  IF mode_param = 'expire' THEN
    UPDATE public.profiles
    SET plan_expires_at = NOW() - INTERVAL '1 day'
    WHERE id = user_id_param;
  END IF;

  -- Se mode = 'restore', ripristina piano attivo
  IF mode_param = 'restore' THEN
    UPDATE public.profiles
    SET plan_expires_at = NOW() + INTERVAL '365 days'
    WHERE id = user_id_param;
  END IF;

  -- Ritorna sempre i dati aggiornati
  RETURN QUERY
  SELECT
    p.plan::TEXT,
    p.plan_expires_at,
    p.monthly_books_used,
    p.monthly_books_reset_at
  FROM public.profiles p
  WHERE p.id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
