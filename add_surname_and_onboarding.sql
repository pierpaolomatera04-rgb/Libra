-- =====================================================================
-- Aggiunge colonna `surname` alla tabella profiles e aggiorna il trigger
-- handle_new_user perche' legga sia name che surname dai metadati.
-- Idempotente: eseguibile piu' volte senza effetti collaterali.
-- =====================================================================

-- 1. Colonna surname (separata da name, NON concatenata)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS surname TEXT;

-- 2. Aggiorna il trigger di creazione profilo per leggere anche surname
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, surname, bonus_tokens, bonus_tokens_expire_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'surname', ''),
    10,
    NOW() + INTERVAL '30 days'
  );

  -- Registra la transazione bonus di benvenuto
  INSERT INTO public.transactions (user_id, type, amount, token_type, description)
  VALUES (NEW.id, 'signup_bonus', 10, 'bonus', 'Token bonus di benvenuto');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Riassicura il trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
