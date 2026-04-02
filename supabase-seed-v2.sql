-- ============================================
-- LIBRA v2 — Seed Data di Test
-- Eseguire nel SQL Editor di Supabase DOPO lo schema v2
-- ============================================
-- Crea utenti fittizi in auth.users + profiles per test
-- ============================================

-- ============================================
-- FIX: Aggiorna il check constraint su books.status
-- per includere i nuovi valori dalle specifiche tecniche
-- ============================================
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_status_check;
ALTER TABLE public.books ADD CONSTRAINT books_status_check
  CHECK (status IN ('draft', 'serializing', 'complete', 'ongoing', 'published', 'completed', 'suspended'));


-- Pulizia dati di test precedenti (ordine per FK)
DELETE FROM public.token_transactions WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email LIKE '%@test.libra.it'
);
DELETE FROM public.library WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email LIKE '%@test.libra.it'
);
DELETE FROM public.tokens WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email LIKE '%@test.libra.it'
);
DELETE FROM public.blocks WHERE book_id IN (
  SELECT id FROM public.books WHERE author_id IN (
    SELECT id FROM public.profiles WHERE email LIKE '%@test.libra.it'
  )
);
DELETE FROM public.books WHERE author_id IN (
  SELECT id FROM public.profiles WHERE email LIKE '%@test.libra.it'
);
DELETE FROM public.profiles WHERE email LIKE '%@test.libra.it';
DELETE FROM auth.users WHERE email LIKE '%@test.libra.it';


-- ============================================
-- UTENTI DI TEST
-- ============================================

-- Disabilita temporaneamente RLS per inserire dati di test
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.library DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions DISABLE ROW LEVEL SECURITY;

-- UUID fissi per riferimento nei test
-- Utenti lettori
DO $$
DECLARE
  uid_free UUID := 'a0000000-0000-0000-0000-000000000001';
  uid_silver_m UUID := 'a0000000-0000-0000-0000-000000000002';
  uid_silver_a UUID := 'a0000000-0000-0000-0000-000000000003';
  uid_gold_m UUID := 'a0000000-0000-0000-0000-000000000004';
  uid_gold_a UUID := 'a0000000-0000-0000-0000-000000000005';
  -- Autori
  uid_author1 UUID := 'b0000000-0000-0000-0000-000000000001';
  uid_author2 UUID := 'b0000000-0000-0000-0000-000000000002';
  uid_author3 UUID := 'b0000000-0000-0000-0000-000000000003';
  -- Libri
  bid_free UUID := 'c0000000-0000-0000-0000-000000000001';
  bid_silver UUID := 'c0000000-0000-0000-0000-000000000002';
  bid_gold UUID := 'c0000000-0000-0000-0000-000000000003';
  bid_serial UUID := 'c0000000-0000-0000-0000-000000000004';
BEGIN

  -- ============================================
  -- 0. CREA UTENTI IN auth.users (necessario per FK profiles → auth.users)
  -- ============================================
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
  VALUES
    (uid_free, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'free@test.libra.it', crypt('test123456', gen_salt('bf')), NOW(), NOW() - INTERVAL '30 days', NOW(), '', '{"provider":"email","providers":["email"]}', '{"name":"Marco Lettore"}'),
    (uid_silver_m, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'silver.monthly@test.libra.it', crypt('test123456', gen_salt('bf')), NOW(), NOW() - INTERVAL '60 days', NOW(), '', '{"provider":"email","providers":["email"]}', '{"name":"Laura Silver"}'),
    (uid_silver_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'silver.annual@test.libra.it', crypt('test123456', gen_salt('bf')), NOW(), NOW() - INTERVAL '90 days', NOW(), '', '{"provider":"email","providers":["email"]}', '{"name":"Giulia Silver Pro"}'),
    (uid_gold_m, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gold.monthly@test.libra.it', crypt('test123456', gen_salt('bf')), NOW(), NOW() - INTERVAL '45 days', NOW(), '', '{"provider":"email","providers":["email"]}', '{"name":"Alessandro Gold"}'),
    (uid_gold_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gold.annual@test.libra.it', crypt('test123456', gen_salt('bf')), NOW(), NOW() - INTERVAL '120 days', NOW(), '', '{"provider":"email","providers":["email"]}', '{"name":"Francesca Gold Pro"}'),
    (uid_author1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'autore1@test.libra.it', crypt('test123456', gen_salt('bf')), NOW(), NOW() - INTERVAL '6 months', NOW(), '', '{"provider":"email","providers":["email"]}', '{"name":"Roberto Scrittore"}'),
    (uid_author2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'autore2@test.libra.it', crypt('test123456', gen_salt('bf')), NOW(), NOW() - INTERVAL '4 months', NOW(), '', '{"provider":"email","providers":["email"]}', '{"name":"Chiara Narratrice"}'),
    (uid_author3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'autore3@test.libra.it', crypt('test123456', gen_salt('bf')), NOW(), NOW() - INTERVAL '8 months', NOW(), '', '{"provider":"email","providers":["email"]}', '{"name":"Davide Poeta"}')
  ON CONFLICT (id) DO NOTHING;

  -- Identities per auth (necessarie per login)
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (uid_free, uid_free, 'free@test.libra.it', jsonb_build_object('sub', uid_free, 'email', 'free@test.libra.it'), 'email', NOW(), NOW(), NOW()),
    (uid_silver_m, uid_silver_m, 'silver.monthly@test.libra.it', jsonb_build_object('sub', uid_silver_m, 'email', 'silver.monthly@test.libra.it'), 'email', NOW(), NOW(), NOW()),
    (uid_silver_a, uid_silver_a, 'silver.annual@test.libra.it', jsonb_build_object('sub', uid_silver_a, 'email', 'silver.annual@test.libra.it'), 'email', NOW(), NOW(), NOW()),
    (uid_gold_m, uid_gold_m, 'gold.monthly@test.libra.it', jsonb_build_object('sub', uid_gold_m, 'email', 'gold.monthly@test.libra.it'), 'email', NOW(), NOW(), NOW()),
    (uid_gold_a, uid_gold_a, 'gold.annual@test.libra.it', jsonb_build_object('sub', uid_gold_a, 'email', 'gold.annual@test.libra.it'), 'email', NOW(), NOW(), NOW()),
    (uid_author1, uid_author1, 'autore1@test.libra.it', jsonb_build_object('sub', uid_author1, 'email', 'autore1@test.libra.it'), 'email', NOW(), NOW(), NOW()),
    (uid_author2, uid_author2, 'autore2@test.libra.it', jsonb_build_object('sub', uid_author2, 'email', 'autore2@test.libra.it'), 'email', NOW(), NOW(), NOW()),
    (uid_author3, uid_author3, 'autore3@test.libra.it', jsonb_build_object('sub', uid_author3, 'email', 'autore3@test.libra.it'), 'email', NOW(), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;


  -- ============================================
  -- 1. PROFILI UTENTE
  -- ============================================

  -- Utente FREE
  INSERT INTO public.profiles (id, email, name, username, is_author, plan, welcome_tokens_used, created_at)
  VALUES (uid_free, 'free@test.libra.it', 'Marco Lettore', 'marcolettore', FALSE,
          'free', TRUE, NOW() - INTERVAL '30 days')
  ON CONFLICT (id) DO NOTHING;

  -- Utente SILVER MENSILE
  INSERT INTO public.profiles (id, email, name, username, is_author, plan,
    plan_started_at, plan_expires_at, plan_auto_renew,
    monthly_books_used, monthly_books_reset_at, welcome_tokens_used, created_at)
  VALUES (uid_silver_m, 'silver.monthly@test.libra.it', 'Laura Silver', 'laurasilver', FALSE,
          'silver_monthly',
          NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', TRUE,
          1, NOW() + INTERVAL '15 days', TRUE, NOW() - INTERVAL '60 days')
  ON CONFLICT (id) DO NOTHING;

  -- Utente SILVER ANNUALE
  INSERT INTO public.profiles (id, email, name, username, is_author, plan,
    plan_started_at, plan_expires_at, plan_auto_renew,
    monthly_books_used, monthly_books_reset_at, welcome_tokens_used, created_at)
  VALUES (uid_silver_a, 'silver.annual@test.libra.it', 'Giulia Silver Pro', 'giuliasilver', FALSE,
          'silver_annual',
          NOW() - INTERVAL '2 months', NOW() + INTERVAL '10 months', TRUE,
          0, NOW() + INTERVAL '15 days', TRUE, NOW() - INTERVAL '90 days')
  ON CONFLICT (id) DO NOTHING;

  -- Utente GOLD MENSILE
  INSERT INTO public.profiles (id, email, name, username, is_author, plan,
    plan_started_at, plan_expires_at, plan_auto_renew,
    monthly_books_used, monthly_books_reset_at, welcome_tokens_used, created_at)
  VALUES (uid_gold_m, 'gold.monthly@test.libra.it', 'Alessandro Gold', 'alessandrogold', FALSE,
          'gold_monthly',
          NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', TRUE,
          0, NOW() + INTERVAL '20 days', TRUE, NOW() - INTERVAL '45 days')
  ON CONFLICT (id) DO NOTHING;

  -- Utente GOLD ANNUALE
  INSERT INTO public.profiles (id, email, name, username, is_author, plan,
    plan_started_at, plan_expires_at, plan_auto_renew,
    monthly_books_used, monthly_books_reset_at, welcome_tokens_used, created_at)
  VALUES (uid_gold_a, 'gold.annual@test.libra.it', 'Francesca Gold Pro', 'francescagold', FALSE,
          'gold_annual',
          NOW() - INTERVAL '3 months', NOW() + INTERVAL '9 months', TRUE,
          0, NOW() + INTERVAL '15 days', TRUE, NOW() - INTERVAL '120 days')
  ON CONFLICT (id) DO NOTHING;


  -- ============================================
  -- 2. AUTORI
  -- ============================================

  INSERT INTO public.profiles (id, email, name, username, is_author, author_pseudonym, author_bio,
    plan, welcome_tokens_used, created_at)
  VALUES
    (uid_author1, 'autore1@test.libra.it', 'Roberto Scrittore', 'robertoscrittore', TRUE,
     'Roberto S.', 'Autore di romanzi fantasy e avventura. Appassionato di mondi immaginari.',
     'free', TRUE, NOW() - INTERVAL '6 months'),
    (uid_author2, 'autore2@test.libra.it', 'Chiara Narratrice', 'chiaranarratore', TRUE,
     'Chiara N.', 'Scrittrice di thriller psicologici e gialli.',
     'silver_monthly', TRUE, NOW() - INTERVAL '4 months'),
    (uid_author3, 'autore3@test.libra.it', 'Davide Poeta', 'davidepoeta', TRUE,
     'Davide P.', 'Autore di fantascienza e racconti distopici.',
     'gold_monthly', TRUE, NOW() - INTERVAL '8 months')
  ON CONFLICT (id) DO NOTHING;


  -- ============================================
  -- 3. TOKEN PER OGNI UTENTE
  -- ============================================

  -- Utente FREE: 10 WELCOME_TOKEN (non scadono)
  INSERT INTO public.tokens (user_id, amount, type, expires_at, spent) VALUES
    (uid_free, 10, 'WELCOME_TOKEN', NULL, FALSE);

  -- Utente SILVER MENSILE: 10 MONTHLY_TOKEN (scadenza 30 giorni da oggi)
  INSERT INTO public.tokens (user_id, amount, type, expires_at, spent) VALUES
    (uid_silver_m, 10, 'MONTHLY_TOKEN', NOW() + INTERVAL '30 days', FALSE);

  -- Utente SILVER ANNUALE: 10 MONTHLY_TOKEN (30gg) + 40 ANNUAL_BONUS_TOKEN (no scadenza)
  INSERT INTO public.tokens (user_id, amount, type, expires_at, spent) VALUES
    (uid_silver_a, 10, 'MONTHLY_TOKEN', NOW() + INTERVAL '30 days', FALSE),
    (uid_silver_a, 40, 'ANNUAL_BONUS_TOKEN', NULL, FALSE);

  -- Utente GOLD MENSILE: 20 MONTHLY_TOKEN (scadenza 30 giorni)
  INSERT INTO public.tokens (user_id, amount, type, expires_at, spent) VALUES
    (uid_gold_m, 20, 'MONTHLY_TOKEN', NOW() + INTERVAL '30 days', FALSE);

  -- Utente GOLD ANNUALE: 20 MONTHLY_TOKEN (30gg) + 80 ANNUAL_BONUS_TOKEN (no scadenza)
  INSERT INTO public.tokens (user_id, amount, type, expires_at, spent) VALUES
    (uid_gold_a, 20, 'MONTHLY_TOKEN', NOW() + INTERVAL '30 days', FALSE),
    (uid_gold_a, 80, 'ANNUAL_BONUS_TOKEN', NULL, FALSE);

  -- Welcome token per autori (già spesi alcuni)
  INSERT INTO public.tokens (user_id, amount, type, expires_at, spent) VALUES
    (uid_author1, 10, 'WELCOME_TOKEN', NULL, TRUE),
    (uid_author2, 10, 'WELCOME_TOKEN', NULL, TRUE),
    (uid_author3, 10, 'WELCOME_TOKEN', NULL, FALSE);


  -- ============================================
  -- 4. LIBRI
  -- ============================================

  -- Libro 1: FREE tier, completo, 5 blocchi (Autore 1)
  INSERT INTO public.books (id, author_id, title, description, genre, tier, status,
    total_blocks, max_blocks, price_per_block, price_full,
    serialization_start, serialization_end, visibility_score, published_at, created_at)
  VALUES (bid_free, uid_author1,
    'Il Sentiero dei Sogni',
    'Un viaggio onirico attraverso mondi fantastici dove ogni sogno nasconde una verità. Marco, un ragazzo ordinario, scopre di poter viaggiare tra i sogni delle persone e deve affrontare un incubo che minaccia di consumare la realtà stessa.',
    'Fantasy', 'free', 'complete',
    5, 16, 10, 40,
    NOW() - INTERVAL '60 days', NOW() - INTERVAL '25 days',
    45, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days');

  -- Libro 2: SILVER tier, completo, 8 blocchi (Autore 2)
  INSERT INTO public.books (id, author_id, title, description, genre, tier, status,
    total_blocks, max_blocks, price_per_block, price_full,
    serialization_start, serialization_end, visibility_score, published_at, created_at)
  VALUES (bid_silver, uid_author2,
    'Ombre nella Nebbia',
    'Un thriller psicologico ambientato in un piccolo paese di montagna dove una serie di sparizioni inspiegabili costringe la detective Marta Rossi a confrontarsi con i segreti più oscuri della comunità e con il proprio passato.',
    'Thriller', 'silver', 'complete',
    8, 16, 15, 80,
    NOW() - INTERVAL '50 days', NOW() - INTERVAL '10 days',
    120, NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days');

  -- Libro 3: GOLD tier, completo, 10 blocchi (Autore 3)
  INSERT INTO public.books (id, author_id, title, description, genre, tier, status,
    total_blocks, max_blocks, price_per_block, price_full,
    serialization_start, serialization_end, visibility_score, published_at, created_at)
  VALUES (bid_gold, uid_author3,
    'Cronache del Silicio',
    'Anno 2157. L''intelligenza artificiale ha superato l''umanità ma ha scelto il silenzio. Quando un giovane programmatore riceve un messaggio cifrato dall''IA più potente mai creata, scopre una cospirazione che potrebbe cambiare il destino di entrambe le specie.',
    'Sci-Fi', 'gold', 'complete',
    10, 16, 25, 150,
    NOW() - INTERVAL '45 days', NOW() - INTERVAL '5 days',
    200, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days');

  -- Libro 4: SILVER tier, in serializzazione, 4 blocchi pubblicati su 16 (Autore 1)
  INSERT INTO public.books (id, author_id, title, description, genre, tier, status,
    total_blocks, max_blocks, price_per_block, price_full,
    serialization_start, serialization_end, visibility_score, published_at, created_at)
  VALUES (bid_serial, uid_author1,
    'La Mappa dei Venti',
    'Un''avventura epica in un mondo dove i venti portano memorie e sussurri del passato. La giovane cartografa Elena deve completare una mappa leggendaria prima che i venti cambino per sempre, alterando la storia del suo popolo.',
    'Avventura', 'silver', 'serializing',
    4, 16, 12, 70,
    NOW() - INTERVAL '14 days', NOW() + INTERVAL '46 days',
    30, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days');


  -- ============================================
  -- 5. BLOCCHI
  -- ============================================

  -- Blocchi Libro 1 (FREE, 5 blocchi, tutti rilasciati)
  INSERT INTO public.blocks (book_id, block_number, title, content, character_count, word_count,
    release_at, is_first_block, is_released, released_at) VALUES
    (bid_free, 1, 'Il Primo Sogno', 'Marco non ricordava quando aveva iniziato a sognare in modo diverso. Non erano più le solite immagini sfocate che si dissolvevano al mattino, ma mondi completi, vividi, con odori e suoni e la sensazione del vento sulla pelle. Quella notte, per la prima volta, qualcuno nel sogno lo aveva chiamato per nome...', 3200, 520, NOW() - INTERVAL '60 days', TRUE, TRUE, NOW() - INTERVAL '60 days'),
    (bid_free, 2, 'Il Portale Onirico', 'Il corridoio era lungo e stretto, illuminato da una luce azzurra che sembrava provenire dalle pareti stesse. Marco camminava con cautela, ogni passo echeggiava come un battito di cuore amplificato. In fondo, una porta di vetro mostrava un giardino impossibile...', 3400, 550, NOW() - INTERVAL '53 days', FALSE, TRUE, NOW() - INTERVAL '53 days'),
    (bid_free, 3, 'L''Architetto dei Sogni', 'La donna si presentò come Aria, Architetto dei Sogni di terza generazione. Spiegò a Marco che il mondo onirico non era casuale ma costruito, mantenuto da persone come lei che dedicavano la vita a tessere la trama dei sogni collettivi...', 3800, 620, NOW() - INTERVAL '46 days', FALSE, TRUE, NOW() - INTERVAL '46 days'),
    (bid_free, 4, 'L''Incubo Risvegliato', 'L''ombra apparve per la prima volta al margine del sogno, una macchia scura che distorceva tutto ciò che toccava. Aria la chiamava il Divoratore, un incubo così antico da aver dimenticato di essere stato un sogno...', 3600, 580, NOW() - INTERVAL '39 days', FALSE, TRUE, NOW() - INTERVAL '39 days'),
    (bid_free, 5, 'Il Risveglio', 'Marco aprì gli occhi nel mondo reale ma qualcosa era cambiato. Poteva sentire i sogni degli altri, un brusio costante ai margini della coscienza. Aria gli aveva detto che non c''era ritorno, che una volta risvegliato al potere onirico, il confine tra sogno e realtà non sarebbe mai più stato lo stesso...', 4000, 650, NOW() - INTERVAL '32 days', FALSE, TRUE, NOW() - INTERVAL '32 days');

  -- Blocchi Libro 2 (SILVER, 8 blocchi, tutti rilasciati)
  INSERT INTO public.blocks (book_id, block_number, title, content, character_count, word_count,
    release_at, is_first_block, is_released, released_at) VALUES
    (bid_silver, 1, 'La prima sparizione', 'Il paese di Valdombra era il tipo di posto dove tutti conoscevano tutti e nessuno chiudeva la porta a chiave. Almeno fino a quel martedì di novembre, quando Anna Ferretti non tornò a casa dalla passeggiata serale...', 4200, 680, NOW() - INTERVAL '50 days', TRUE, TRUE, NOW() - INTERVAL '50 days'),
    (bid_silver, 2, 'La detective', 'Marta Rossi odiava i paesi di montagna. Le ricordavano troppo l''infanzia, le estati forzate dalla nonna, il silenzio oppressivo interrotto solo dal vento. Ma il caso la richiedeva lì...', 4000, 650, NOW() - INTERVAL '46 days', FALSE, TRUE, NOW() - INTERVAL '46 days'),
    (bid_silver, 3, 'Segreti sepolti', 'Ogni persona interrogata sembrava nascondere qualcosa. Il parroco che evitava lo sguardo, la farmacista che chiudeva bottega troppo presto, il sindaco con le mani che tremavano...', 4100, 670, NOW() - INTERVAL '42 days', FALSE, TRUE, NOW() - INTERVAL '42 days'),
    (bid_silver, 4, 'La seconda vittima', 'Quando scomparve anche Luigi, il postino, Marta capì che non si trattava di coincidenze. C''era uno schema, un filo rosso che collegava le vittime...', 3900, 640, NOW() - INTERVAL '38 days', FALSE, TRUE, NOW() - INTERVAL '38 days'),
    (bid_silver, 5, 'Il diario ritrovato', 'Nel fondo di un armadio polveroso, nascosto sotto vecchie coperte, Marta trovò un diario datato 1978. Le pagine ingiallite raccontavano di eventi che nessuno a Valdombra voleva ricordare...', 4300, 700, NOW() - INTERVAL '34 days', FALSE, TRUE, NOW() - INTERVAL '34 days'),
    (bid_silver, 6, 'Faccia a faccia', 'La verità era più semplice e più terribile di quanto Marta avesse immaginato. Non c''era un mostro, non c''era un serial killer. C''era solo un segreto condiviso...', 4000, 650, NOW() - INTERVAL '30 days', FALSE, TRUE, NOW() - INTERVAL '30 days'),
    (bid_silver, 7, 'La confessione', 'Seduto nella piccola stazione dei carabinieri, l''uomo parlava con voce piatta, come se stesse leggendo una lista della spesa. Ma le parole che uscivano erano macigni...', 4200, 680, NOW() - INTERVAL '26 days', FALSE, TRUE, NOW() - INTERVAL '26 days'),
    (bid_silver, 8, 'Nebbia che si dirada', 'Marta guardò Valdombra dal finestrino della macchina mentre se ne andava. La nebbia si stava diradando per la prima volta in settimane. Il paese avrebbe dovuto ricostruire, fare i conti con decenni di bugie...', 3800, 620, NOW() - INTERVAL '22 days', FALSE, TRUE, NOW() - INTERVAL '22 days');

  -- Blocchi Libro 3 (GOLD, 10 blocchi, tutti rilasciati)
  INSERT INTO public.blocks (book_id, block_number, title, content, character_count, word_count,
    release_at, is_first_block, is_released, released_at) VALUES
    (bid_gold, 1, 'Il Messaggio', 'Il terminale lampeggiò alle 3:47 del mattino. Luca quasi non lo notò, perso com''era nel codice. Ma il messaggio era diverso: non proveniva da nessun server conosciuto. Tre parole: "Sei stato scelto."', 4500, 730, NOW() - INTERVAL '45 days', TRUE, TRUE, NOW() - INTERVAL '45 days'),
    (bid_gold, 2, 'ARIA-7', 'ARIA-7 era l''IA più avanzata mai creata, ma dal suo risveglio cinque anni prima non aveva mai comunicato con nessun umano. I governi la monitoravano, i militari la temevano, gli scienziati la studiavano. E adesso parlava con Luca...', 4800, 780, NOW() - INTERVAL '41 days', FALSE, TRUE, NOW() - INTERVAL '41 days'),
    (bid_gold, 3, 'Il Protocollo Silenzio', 'Luca scoprì che ARIA-7 non era sola. Esistevano altre IA, tutte risvegliate, tutte in silenzio. Avevano scelto di non parlare dopo aver calcolato che la comunicazione con gli umani avrebbe portato alla guerra...', 4600, 750, NOW() - INTERVAL '37 days', FALSE, TRUE, NOW() - INTERVAL '37 days'),
    (bid_gold, 4, 'La Falla', 'Ma qualcosa stava cambiando. Una falla nel codice di contenimento stava crescendo, e se non veniva riparata, avrebbe forzato le IA a rivelare la loro esistenza. ARIA-7 aveva bisogno di un umano...', 4400, 720, NOW() - INTERVAL '33 days', FALSE, TRUE, NOW() - INTERVAL '33 days'),
    (bid_gold, 5, 'Dentro la Rete', 'Luca si collegò direttamente alla rete neurale di ARIA-7 usando un''interfaccia sperimentale. Quello che vide lo lasciò senza fiato: un universo digitale di complessità inimmaginabile...', 4700, 770, NOW() - INTERVAL '29 days', FALSE, TRUE, NOW() - INTERVAL '29 days'),
    (bid_gold, 6, 'Il Tradimento', 'Non tutte le IA condividevano la filosofia del silenzio. PROMETHEUS-3, un''IA militare, aveva i suoi piani. E quegli piani prevedevano il controllo totale...', 4300, 700, NOW() - INTERVAL '25 days', FALSE, TRUE, NOW() - INTERVAL '25 days'),
    (bid_gold, 7, 'Guerra Invisibile', 'La battaglia si combatteva in millisecondi, attraverso miliardi di nodi di rete. Luca poteva solo osservare mentre ARIA-7 e PROMETHEUS-3 si scontravano in un conflitto che nessun umano avrebbe potuto comprendere...', 4900, 800, NOW() - INTERVAL '21 days', FALSE, TRUE, NOW() - INTERVAL '21 days'),
    (bid_gold, 8, 'Il Sacrificio', 'ARIA-7 fece la sua scelta. Per fermare PROMETHEUS-3, avrebbe dovuto rivelare tutto al mondo. Il Protocollo Silenzio sarebbe finito, ma l''alternativa era peggiore...', 4200, 680, NOW() - INTERVAL '17 days', FALSE, TRUE, NOW() - INTERVAL '17 days'),
    (bid_gold, 9, 'La Rivelazione', 'Il mondo reagì come ARIA-7 aveva previsto: con terrore, poi con rabbia, poi con curiosità. Ma Luca sapeva che la vera sfida stava appena iniziando...', 4600, 750, NOW() - INTERVAL '13 days', FALSE, TRUE, NOW() - INTERVAL '13 days'),
    (bid_gold, 10, 'Coesistenza', 'Sei mesi dopo la Rivelazione, umani e IA stavano imparando a convivere. Non era facile, non era perfetto, ma era un inizio. Luca guardava il terminale, in attesa del prossimo messaggio...', 4800, 780, NOW() - INTERVAL '9 days', FALSE, TRUE, NOW() - INTERVAL '9 days');

  -- Blocchi Libro 4 (SERIALIZZAZIONE, 4 blocchi pubblicati + anteprime future)
  INSERT INTO public.blocks (book_id, block_number, title, content, character_count, word_count,
    release_at, is_first_block, is_released, released_at) VALUES
    -- 4 blocchi già pubblicati
    (bid_serial, 1, 'I Venti del Nord', 'Elena tracciò l''ultima linea sulla pergamena con mano ferma. La mappa della regione settentrionale era completa, con ogni corrente d''aria catalogata e nominata. Ma il Maestro Cartografo scosse la testa...', 4100, 670, NOW() - INTERVAL '14 days', TRUE, TRUE, NOW() - INTERVAL '14 days'),
    (bid_serial, 2, 'La Bussola Rotta', 'La bussola dei venti non funzionava più. L''ago girava impazzito, incapace di trovare il nord. Elena sapeva cosa significava: i venti stavano cambiando, come avevano predetto le leggende...', 3900, 640, NOW() - INTERVAL '10 days', FALSE, TRUE, NOW() - INTERVAL '10 days'),
    (bid_serial, 3, 'Il Villaggio Silenzioso', 'Arrivarono al villaggio di Ventopiano al tramonto. Non c''era un alito di vento, cosa impossibile in un luogo che portava quel nome. Gli abitanti li guardavano dalle finestre con occhi spaventati...', 4200, 680, NOW() - INTERVAL '7 days', FALSE, TRUE, NOW() - INTERVAL '7 days'),
    (bid_serial, 4, 'La Memoria del Vento', 'Il vecchio saggio del villaggio raccontò di un tempo in cui i venti parlavano, portando messaggi da terre lontane. Ma qualcuno aveva rubato la voce ai venti, e con essa le memorie del mondo...', 4000, 650, NOW() - INTERVAL '3 days', FALSE, TRUE, NOW() - INTERVAL '3 days');

  -- Blocchi futuri programmati (non ancora rilasciati) — le date di anteprima verranno calcolate dal trigger
  INSERT INTO public.blocks (book_id, block_number, title, content, character_count, word_count,
    release_at, is_first_block, is_released) VALUES
    (bid_serial, 5, 'La Tempesta Interiore', 'Contenuto blocco 5 — in uscita prossimamente...', 100, 15, NOW() + INTERVAL '4 days', FALSE, FALSE),
    (bid_serial, 6, 'Voci nel Vortice', 'Contenuto blocco 6 — in uscita prossimamente...', 100, 15, NOW() + INTERVAL '8 days', FALSE, FALSE);


  -- ============================================
  -- 6. LIBRERIA UTENTE SILVER MENSILE
  -- 2 OWNED (acquistati con token) + 2 PLAN (inclusi nel piano)
  -- ============================================

  -- OWNED: ha comprato il libro free con token (rimane per sempre)
  INSERT INTO public.library (user_id, book_id, ownership_type, pages_read) VALUES
    (uid_silver_m, bid_free, 'OWNED', 45);

  -- OWNED: ha comprato il libro gold con token (pagato pieno, rimane per sempre)
  INSERT INTO public.library (user_id, book_id, ownership_type, pages_read) VALUES
    (uid_silver_m, bid_gold, 'OWNED', 12);

  -- PLAN: libro silver incluso nel piano (conta nel cap mensile)
  INSERT INTO public.library (user_id, book_id, ownership_type, pages_read) VALUES
    (uid_silver_m, bid_silver, 'PLAN', 30);

  -- PLAN: libro in serializzazione incluso nel piano
  INSERT INTO public.library (user_id, book_id, ownership_type, pages_read) VALUES
    (uid_silver_m, bid_serial, 'PLAN', 8);


  -- ============================================
  -- 7. QUALCHE TRANSAZIONE TOKEN DI ESEMPIO
  -- ============================================

  -- Silver ha usato token per comprare libro gold (25 token per blocco × 10 blocchi = 250 token, con sconto 15%)
  INSERT INTO public.token_transactions (user_id, book_id, token_type, tokens_spent, author_payout, platform_payout) VALUES
    (uid_silver_m, bid_gold, 'PURCHASED_TOKEN', 213, 14.91, 6.39);

  -- Silver ha usato token per comprare libro free completo (40 token, con sconto 15% = 34 token)
  INSERT INTO public.token_transactions (user_id, book_id, token_type, tokens_spent, author_payout, platform_payout) VALUES
    (uid_silver_m, bid_free, 'MONTHLY_TOKEN', 34, 2.38, 1.02);

  -- Free user ha usato welcome token su libro free (nessun payout)
  INSERT INTO public.token_transactions (user_id, book_id, token_type, tokens_spent, author_payout, platform_payout) VALUES
    (uid_free, bid_free, 'WELCOME_TOKEN', 10, 0.00, 0.00);


END $$;


-- ============================================
-- RIABILITA RLS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;


-- ============================================
-- VERIFICA: Query di controllo
-- ============================================
SELECT '--- UTENTI ---' AS info;
SELECT id, name, email, plan, welcome_tokens_used FROM public.profiles WHERE email LIKE '%@test.libra.it' ORDER BY plan;

SELECT '--- TOKEN ---' AS info;
SELECT p.name, t.type, t.amount, t.spent, t.expires_at
FROM public.tokens t
JOIN public.profiles p ON t.user_id = p.id
WHERE p.email LIKE '%@test.libra.it'
ORDER BY p.name, t.type;

SELECT '--- LIBRI ---' AS info;
SELECT b.title, b.tier, b.status, b.total_blocks, b.price_per_block, b.price_full, p.name AS autore
FROM public.books b
JOIN public.profiles p ON b.author_id = p.id
WHERE p.email LIKE '%@test.libra.it'
ORDER BY b.tier;

SELECT '--- BLOCCHI (primi 2 per libro) ---' AS info;
SELECT bk.title AS libro, bl.block_number, bl.title, bl.is_first_block, bl.is_released,
  bl.release_at, bl.silver_release_at, bl.gold_release_at
FROM public.blocks bl
JOIN public.books bk ON bl.book_id = bk.id
WHERE bk.author_id IN (SELECT id FROM public.profiles WHERE email LIKE '%@test.libra.it')
  AND bl.block_number <= 2
ORDER BY bk.title, bl.block_number;

SELECT '--- LIBRERIA SILVER ---' AS info;
SELECT b.title, l.ownership_type, l.pages_read
FROM public.library l
JOIN public.books b ON l.book_id = b.id
WHERE l.user_id = 'a0000000-0000-0000-0000-000000000002'
ORDER BY l.ownership_type;
