-- ============================================
-- SISTEMA GENERI A DUE LIVELLI
-- Aggiunge macro_category alla tabella books
-- ============================================

-- 1. Aggiungi colonna macro_category
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS macro_category text DEFAULT NULL;

-- 2. Indice per filtri performanti
CREATE INDEX IF NOT EXISTS idx_books_macro_category ON public.books(macro_category);
CREATE INDEX IF NOT EXISTS idx_books_genre ON public.books(genre);

-- 3. Migra i generi esistenti alle macro-aree corrette
UPDATE public.books SET macro_category = 'narrativa' WHERE genre IN ('Romanzo', 'Giallo', 'Storico', 'Avventura', 'Gialli & Noir', 'Thriller & Suspense', 'Romance', 'Narrativa Storica', 'Narrativa Contemporanea');
UPDATE public.books SET macro_category = 'mondi_immaginari' WHERE genre IN ('Fantasy', 'Sci-Fi', 'Horror');
UPDATE public.books SET macro_category = 'realta_conoscenza' WHERE genre IN ('Biografia', 'Biografie & Memorie', 'Attualita & Politica', 'Storia', 'Scienza & Natura');
UPDATE public.books SET macro_category = 'pratico_lifestyle' WHERE genre IN ('Self-help', 'Crescita Personale', 'Economia & Business', 'Cucina', 'Hobby & Tempo Libero');
UPDATE public.books SET macro_category = 'illustrazioni_comics' WHERE genre IN ('Poesia', 'Manga', 'Fumetti', 'Poesia Illustrata');

-- Mappa anche i vecchi valori genere ai nuovi sotto-generi dove possibile
UPDATE public.books SET genre = 'Gialli & Noir' WHERE genre = 'Giallo';
UPDATE public.books SET genre = 'Narrativa Contemporanea' WHERE genre = 'Romanzo';
UPDATE public.books SET genre = 'Narrativa Storica' WHERE genre = 'Storico';
UPDATE public.books SET genre = 'Thriller & Suspense' WHERE genre = 'Thriller';
UPDATE public.books SET genre = 'Biografie & Memorie' WHERE genre = 'Biografia';
UPDATE public.books SET genre = 'Crescita Personale' WHERE genre = 'Self-help';
UPDATE public.books SET genre = 'Poesia Illustrata' WHERE genre = 'Poesia';
UPDATE public.books SET genre = 'Narrativa Contemporanea' WHERE genre = 'Avventura';
