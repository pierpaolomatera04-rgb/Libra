-- RPC per simulare cancellazione abbonamento (per test)
-- Setta plan_expires_at nel passato
CREATE OR REPLACE FUNCTION public.simulate_cancel_plan(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET plan_expires_at = NOW() - INTERVAL '1 day'
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC per ripristinare piano attivo (per test)
-- Setta plan_expires_at nel futuro
CREATE OR REPLACE FUNCTION public.restore_plan(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET plan_expires_at = NOW() + INTERVAL '365 days'
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ricarica schema PostgREST
NOTIFY pgrst, 'reload schema';
