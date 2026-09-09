-- ===========================================================================
-- OBJECT BATTLE — Jeu de données de départ
--
-- Reprend les objets, joueurs et combats affichés aujourd'hui par les
-- maquettes, pour pouvoir tester les fonctions de lib/queries.ts sur une base
-- réelle. À exécuter APRÈS db/schema.sql :
--   psql "$DATABASE_URL" -f db/seed.sql
--
-- Le script est rejouable : ON CONFLICT DO NOTHING évite les doublons.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Objets
-- ---------------------------------------------------------------------------
INSERT INTO objects (slug, name, description, image, power, resistance, speed, intelligence, nb_wins, nb_losses)
VALUES
  ('marteau', 'Marteau',
   'Ne discute pas, ne négocie pas. Frappe d''abord, frappe encore, puis rentre à la boîte à outils.',
   '/objets/marteau.svg', 90, 75, 50, 70, 24, 6),

  ('poele', 'Poêle',
   'Chauffe vite, encaisse tout, et sort toujours du placard au pire moment pour l''adversaire.',
   '/objets/poele.svg', 78, 88, 42, 55, 19, 9),

  ('chaise', 'Chaise',
   'Quatre pieds, zéro pitié. Spécialiste incontestée du combat de saloon.',
   '/objets/chaise.svg', 72, 66, 38, 44, 12, 15),

  ('bouteille', 'Bouteille',
   'Fragile mais rusée. Elle mise tout sur la vitesse et sur l''effet de surprise.',
   '/objets/bouteille.svg', 35, 60, 70, 90, 14, 13),

  ('parapluie', 'Parapluie',
   'Bouclier le jour, épée la nuit. Le seul combattant qui gère aussi la météo.',
   '/objets/parapluie.svg', 52, 71, 64, 68, 17, 11),

  ('clavier', 'Clavier',
   '104 touches, 104 façons de vous contredire. Redoutable en combat verbal.',
   '/objets/clavier.svg', 40, 45, 82, 95, 21, 8),

  ('cafetiere', 'Cafetière',
   'Lente au réveil, ingérable après le premier passage. Endurance quasi illimitée.',
   '/objets/cafetiere.svg', 66, 79, 30, 74, 15, 12),

  ('grille-pain', 'Grille-pain',
   'Attaque à distance avec projectiles brûlants. Imprévisible, comme sa minuterie.',
   '/objets/grille-pain.svg', 58, 52, 76, 33, 9, 18)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Joueurs
--
-- ATTENTION : le password_hash ci-dessous est un marqueur, pas un hash valide.
-- Les vrais comptes doivent être créés via createPlayer(), avec un hash bcrypt
-- ou argon2 calculé par l'application. Aucun mot de passe en clair en base.
-- ---------------------------------------------------------------------------
INSERT INTO users (username, password_hash, avatar_color, points, max_points, nb_victoires, nb_combats)
VALUES
  ('Noe',      'A_REMPLACER_PAR_UN_HASH', '#a855f7', 1870, 2140, 87, 121),
  ('Mathias',  'A_REMPLACER_PAR_UN_HASH', '#5b83ff', 1642, 1980, 82, 130),
  ('David',    'A_REMPLACER_PAR_UN_HASH', '#ff8a1f', 1408, 1512, 76, 140),
  ('Beatrice', 'A_REMPLACER_PAR_UN_HASH', '#22d3ee', 1195, 1310, 64,  99),
  ('Yanis',    'A_REMPLACER_PAR_UN_HASH', '#34d399', 1042, 1180, 58, 112),
  ('Lina',     'A_REMPLACER_PAR_UN_HASH', '#ffc53d',  930, 1024, 51,  88),
  ('Karim',    'A_REMPLACER_PAR_UN_HASH', '#ff5069',  814,  902, 47, 105),
  ('Sofia',    'A_REMPLACER_PAR_UN_HASH', '#c084fc',  702,  860, 39,  94)
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Combats
--
-- Les identifiants sont résolus par slug / pseudo : le script reste valable
-- quel que soit l'ordre d'insertion des tables précédentes.
-- ---------------------------------------------------------------------------
INSERT INTO fights (user_id, object_1_id, object_2_id, winner_id, score_1, score_2, bet_on_id, bet_amount, bet_delta, created_at)
SELECT
  (SELECT id FROM users   WHERE username = v.pseudo),
  (SELECT id FROM objects WHERE slug     = v.objet_1),
  (SELECT id FROM objects WHERE slug     = v.objet_2),
  (SELECT id FROM objects WHERE slug     = v.vainqueur),
  v.score_1, v.score_2,
  (SELECT id FROM objects WHERE slug     = v.pari_sur),
  v.mise, v.gain, v.date_combat
FROM (VALUES
  ('Noe', 'marteau',   'bouteille',   'marteau',   87, 54, 'marteau',    25,  50, TIMESTAMPTZ '2026-09-08 20:14'),
  ('Noe', 'chaise',    'poele',       'poele',     68, 72, 'chaise',     20, -20, TIMESTAMPTZ '2026-09-08 19:02'),
  ('Noe', 'clavier',   'cafetiere',    NULL,       70, 70,  NULL,        15,  45, TIMESTAMPTZ '2026-09-07 18:41'),
  ('Noe', 'parapluie', 'grille-pain', 'parapluie', 81, 49, 'grille-pain', 30, -30, TIMESTAMPTZ '2026-09-07 17:26'),
  ('Noe', 'poele',     'clavier',     'clavier',   61, 79, 'clavier',    40,  80, TIMESTAMPTZ '2026-09-06 21:10')
) AS v (pseudo, objet_1, objet_2, vainqueur, score_1, score_2, pari_sur, mise, gain, date_combat);
