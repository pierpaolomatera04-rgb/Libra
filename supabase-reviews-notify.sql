-- =====================================================
-- Notifica all'autore quando viene lasciata una recensione
-- =====================================================

-- Allarga i tipi consentiti
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow','like','save','comment','unlock','tip','mention','badge','review'));

-- Trigger function
CREATE OR REPLACE FUNCTION reviews_notify_author()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id UUID;
  v_book_title TEXT;
  v_actor_name TEXT;
  v_excerpt TEXT;
BEGIN
  -- Solo INSERT o UPDATE che cambia stelle/testo
  IF TG_OP = 'UPDATE'
     AND OLD.stars IS NOT DISTINCT FROM NEW.stars
     AND OLD.text  IS NOT DISTINCT FROM NEW.text THEN
    RETURN NEW;
  END IF;

  SELECT b.author_id, b.title INTO v_author_id, v_book_title
  FROM books b WHERE b.id = NEW.book_id;

  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.author_pseudonym, p.name, 'Un lettore')
    INTO v_actor_name
    FROM profiles p WHERE p.id = NEW.user_id;

  v_excerpt := CASE
    WHEN NEW.text IS NOT NULL AND length(NEW.text) > 0
      THEN ': ' || LEFT(NEW.text, 200)
    ELSE ''
  END;

  INSERT INTO notifications (user_id, actor_id, type, title, message, data)
  VALUES (
    v_author_id,
    NEW.user_id,
    'review',
    CASE WHEN TG_OP = 'INSERT' THEN 'Nuova recensione' ELSE 'Recensione aggiornata' END,
    COALESCE(v_actor_name, 'Un lettore') ||
      ' ha lasciato ' || NEW.stars || (CASE WHEN NEW.stars = 1 THEN ' stella' ELSE ' stelle' END) ||
      ' a "' || v_book_title || '"' || v_excerpt,
    jsonb_build_object(
      'actor_name', v_actor_name,
      'book_id', NEW.book_id,
      'book_title', v_book_title,
      'stars', NEW.stars,
      'text', NEW.text
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_notify_author ON reviews;
CREATE TRIGGER trg_reviews_notify_author
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION reviews_notify_author();
