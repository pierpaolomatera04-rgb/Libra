-- Preset colore card autore (null = automatico dal genere prevalente)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_card_color TEXT;
-- valori ammessi: 'terracotta' | 'blu_notte' | 'sage' | 'lavender' | 'grigio_caldo' | NULL
