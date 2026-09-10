-- ===========================================================================
-- OBJECT BATTLE — Schéma PostgreSQL (Neon)
--
-- À exécuter une fois sur la base, par exemple depuis la console SQL de Neon :
--   psql "$DATABASE_URL" -f db/schema.sql
--
-- Écarts assumés par rapport au §10 du cahier des charges :
--   * Les colonnes de stats suivent les 4 caractéristiques du §8
--     (puissance, résistance, rapidité, intelligence). Le §10 listait
--     « damage » et « endurance » sans « intelligence », ce qui ne
--     correspondait ni aux exemples de combat ni à l'interface.
--   * La table « users » stocke un password_hash, jamais un mot de passe en
--     clair (§16).
--   * La table « fights » porte les colonnes du pari (§4.2), absentes du §10
--     alors que le pari fait partie des fonctionnalités demandées.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Objets (les combattants)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS objects (
  id           SERIAL PRIMARY KEY,
  slug         TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  description  TEXT        NOT NULL DEFAULT '',
  image        TEXT        NOT NULL,

  -- Les 4 caractéristiques, contraintes entre 0 et 100 côté base (§8).
  -- La validation applicative ne remplace pas ces garde-fous : la base reste
  -- la dernière ligne de défense si une requête passe par un autre chemin.
  power         INTEGER   NOT NULL CHECK (power        BETWEEN 0 AND 100),
  resistance    INTEGER   NOT NULL CHECK (resistance   BETWEEN 0 AND 100),
  speed         INTEGER   NOT NULL CHECK (speed        BETWEEN 0 AND 100),
  intelligence  INTEGER   NOT NULL CHECK (intelligence BETWEEN 0 AND 100),

  nb_wins      INTEGER     NOT NULL DEFAULT 0 CHECK (nb_wins   >= 0),
  nb_losses    INTEGER     NOT NULL DEFAULT 0 CHECK (nb_losses >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Joueurs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  username       TEXT        NOT NULL UNIQUE,
  password_hash  TEXT        NOT NULL,
  avatar_color   TEXT        NOT NULL DEFAULT '#a855f7',
  points         INTEGER     NOT NULL DEFAULT 1000 CHECK (points >= 0),
  max_points     INTEGER     NOT NULL DEFAULT 1000,
  nb_victoires   INTEGER     NOT NULL DEFAULT 0 CHECK (nb_victoires >= 0),
  nb_combats     INTEGER     NOT NULL DEFAULT 0 CHECK (nb_combats   >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Combats
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fights (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER     REFERENCES users(id)   ON DELETE SET NULL,
  object_1_id  INTEGER     NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  object_2_id  INTEGER     NOT NULL REFERENCES objects(id) ON DELETE CASCADE,

  -- NULL = match nul.
  winner_id    INTEGER     REFERENCES objects(id) ON DELETE SET NULL,
  score_1      INTEGER     NOT NULL,
  score_2      INTEGER     NOT NULL,

  -- Pari du joueur. bet_on_id NULL = pari sur le match nul.
  bet_on_id    INTEGER     REFERENCES objects(id) ON DELETE SET NULL,
  bet_amount   INTEGER     NOT NULL DEFAULT 0 CHECK (bet_amount >= 0),
  bet_delta    INTEGER     NOT NULL DEFAULT 0,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un objet ne peut pas se battre contre lui-même.
  CONSTRAINT combattants_differents CHECK (object_1_id <> object_2_id)
);

-- Cote appliquée au pari, figée au moment où il est placé.
--
-- Ajoutée après coup : ADD COLUMN IF NOT EXISTS permet de rejouer ce fichier
-- sur une base déjà en service sans repartir de zéro.
--
-- Sans cette colonne, l'historique devait deviner la cote en divisant le gain
-- par la mise — impossible pour un pari perdu, où le gain vaut toujours
-- « moins la mise ». La figer ici garde aussi l'historique juste le jour où
-- les cotes d'une paire sont resimulées.
ALTER TABLE fights
  ADD COLUMN IF NOT EXISTS bet_cote NUMERIC(6, 2) NOT NULL DEFAULT 0
    CHECK (bet_cote >= 0);

-- ---------------------------------------------------------------------------
-- Cotes d'une paire d'objets (§4.2)
--
-- Une ligne par paire, remplie à la première rencontre : les trois cotes
-- sortent de 500 combats simulés (voir simulerCotes dans lib/combat.ts), un
-- calcul trop coûteux pour être refait à chaque affichage.
--
-- Une paire est NON ORIENTÉE : « marteau contre poêle » et « poêle contre
-- marteau », c'est le même affrontement, et le moteur note chaque objet sans
-- savoir qui est en face. La contrainte object_a_id < object_b_id impose donc
-- un ordre unique de stockage — sans elle, la même paire pourrait exister deux
-- fois avec des cotes différentes selon qui a été sélectionné en premier.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pair_odds (
  object_a_id     INTEGER      NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  object_b_id     INTEGER      NOT NULL REFERENCES objects(id) ON DELETE CASCADE,

  -- Multiplicateurs de mise, tels qu'affichés au joueur.
  cote_a          NUMERIC(6, 2) NOT NULL CHECK (cote_a   > 0),
  cote_b          NUMERIC(6, 2) NOT NULL CHECK (cote_b   > 0),
  cote_nul        NUMERIC(6, 2) NOT NULL CHECK (cote_nul > 0),

  -- Comptages bruts : ils permettent de relire les cotes affichées et de
  -- vérifier sur combien de simulations elles reposent.
  nb_simulations  INTEGER      NOT NULL CHECK (nb_simulations > 0),
  nb_victoires_a  INTEGER      NOT NULL CHECK (nb_victoires_a >= 0),
  nb_victoires_b  INTEGER      NOT NULL CHECK (nb_victoires_b >= 0),
  nb_nuls         INTEGER      NOT NULL CHECK (nb_nuls        >= 0),

  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

  PRIMARY KEY (object_a_id, object_b_id),
  CONSTRAINT paire_ordonnee CHECK (object_a_id < object_b_id),
  CONSTRAINT total_simulations CHECK (
    nb_victoires_a + nb_victoires_b + nb_nuls = nb_simulations
  )
);

-- ---------------------------------------------------------------------------
-- Index : les tris et filtres réellement utilisés par les pages
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS fights_created_at_idx  ON fights (created_at DESC);
CREATE INDEX IF NOT EXISTS fights_user_idx        ON fights (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fights_object_1_idx    ON fights (object_1_id);
CREATE INDEX IF NOT EXISTS fights_object_2_idx    ON fights (object_2_id);
CREATE INDEX IF NOT EXISTS users_points_idx       ON users  (points DESC);
