CREATE TABLE IF NOT EXISTS tokens (
  token_id     INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  image_url    TEXT NOT NULL,
  character    TEXT, clan TEXT, ninjutsu TEXT, weapon_back TEXT, weapon_front TEXT,
  cosplay      TEXT, acc_body TEXT, acc_head TEXT, acc_face TEXT,
  mokuton INTEGER, katon INTEGER, doton INTEGER, kinton INTEGER, suiton INTEGER,
  updated_at   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_character    ON tokens(character);
CREATE INDEX IF NOT EXISTS idx_clan         ON tokens(clan);
CREATE INDEX IF NOT EXISTS idx_ninjutsu     ON tokens(ninjutsu);
CREATE INDEX IF NOT EXISTS idx_weapon_back  ON tokens(weapon_back);
CREATE INDEX IF NOT EXISTS idx_weapon_front ON tokens(weapon_front);
CREATE INDEX IF NOT EXISTS idx_cosplay      ON tokens(cosplay);
CREATE INDEX IF NOT EXISTS idx_acc_body     ON tokens(acc_body);
CREATE INDEX IF NOT EXISTS idx_acc_head     ON tokens(acc_head);
CREATE INDEX IF NOT EXISTS idx_acc_face     ON tokens(acc_face);
