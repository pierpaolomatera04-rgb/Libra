-- ============================================
-- LIBRA - Notifiche per Autori
-- Eseguire nel SQL Editor di Supabase
-- ============================================

CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,  -- destinatario (autore)
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,          -- chi ha fatto l'azione
  type TEXT NOT NULL CHECK (type IN ('follow', 'like', 'save', 'comment', 'unlock', 'tip')),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',   -- dati extra: book_id, book_title, block_number, amount, etc.
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Chiunque autenticato puo' creare notifiche (l'attore crea notifica per il destinatario)
CREATE POLICY "Utenti creano notifiche" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Solo il destinatario puo' leggere le proprie notifiche
CREATE POLICY "Utente vede proprie notifiche" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Solo il destinatario puo' aggiornare (mark as read)
CREATE POLICY "Utente aggiorna proprie notifiche" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Solo il destinatario puo' eliminare
CREATE POLICY "Utente elimina proprie notifiche" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- Abilita Realtime per la tabella
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
