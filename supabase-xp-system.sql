-- ============================================
-- SISTEMA XP 50 LIVELLI — award_xp RPC
-- ============================================
-- Funzione che aggiunge XP, calcola il livello,
-- e se c'è level-up distribuisce token bonus.
-- Restituisce: xp_added, old_level, new_level, new_total_xp, token_reward, special_reward
-- ============================================

-- Helper: calcola livello da XP totali (stessa formula del client)
CREATE OR REPLACE FUNCTION calc_xp_level(p_total_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_level INTEGER := 1;
  i INTEGER;
BEGIN
  FOR i IN REVERSE 50..2 LOOP
    IF p_total_xp >= FLOOR(20 * POWER(i, 1.6))::INTEGER THEN
      v_level := i;
      EXIT;
    END IF;
  END LOOP;
  RETURN v_level;
END;
$$;

-- Funzione principale: assegna XP e gestisce level-up
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'activity'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_xp INTEGER;
  v_new_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_token_reward INTEGER := 0;
  v_special_reward TEXT := NULL;
  v_level_check INTEGER;
BEGIN
  -- Leggi XP attuali
  SELECT COALESCE(total_xp, 0) INTO v_old_xp
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Utente non trovato');
  END IF;

  v_new_xp := v_old_xp + p_amount;
  v_old_level := calc_xp_level(v_old_xp);
  v_new_level := calc_xp_level(v_new_xp);

  -- Aggiorna XP nel profilo
  UPDATE profiles
  SET total_xp = v_new_xp
  WHERE id = p_user_id;

  -- Se c'è level-up, controlla premi per ogni livello attraversato
  IF v_new_level > v_old_level THEN
    FOR v_level_check IN (v_old_level + 1)..v_new_level LOOP
      CASE v_level_check
        WHEN 5 THEN
          v_token_reward := v_token_reward + 5;
        WHEN 10 THEN
          v_token_reward := v_token_reward + 10;
        WHEN 20 THEN
          v_special_reward := 'Firma Animata Speciale sbloccata';
        WHEN 30 THEN
          v_token_reward := v_token_reward + 50;
        WHEN 40 THEN
          v_token_reward := v_token_reward + 20;
        WHEN 50 THEN
          v_token_reward := v_token_reward + 100;
          v_special_reward := COALESCE(v_special_reward || ' + ', '') || 'Nome Oro sbloccato';
        ELSE
          NULL;
      END CASE;
    END LOOP;

    -- Accredita token bonus se ci sono premi
    IF v_token_reward > 0 THEN
      UPDATE profiles
      SET bonus_tokens = COALESCE(bonus_tokens, 0) + v_token_reward
      WHERE id = p_user_id;

      -- Registra transazione token
      INSERT INTO transactions (user_id, type, amount, description)
      VALUES (
        p_user_id,
        'signup_bonus',
        v_token_reward,
        'Premio livello ' || v_new_level::TEXT || ': +' || v_token_reward::TEXT || ' token bonus'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'xp_added', p_amount,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'new_total_xp', v_new_xp,
    'level_up', v_new_level > v_old_level,
    'token_reward', v_token_reward,
    'special_reward', v_special_reward
  );
END;
$$;
