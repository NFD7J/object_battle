-- ===========================================================================
-- OBJECT BATTLE — Jeu de données de départ
--
-- Roster de départ : les 8 objets des maquettes, sans scores ni combats
-- fictifs. Les victoires / défaites se remplissent au fil des vrais combats.
-- À exécuter APRÈS db/schema.sql :
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
   '/objets/marteau.svg', 90, 75, 50, 70, 0, 0),

  ('poele', 'Poêle',
   'Chauffe vite, encaisse tout, et sort toujours du placard au pire moment pour l''adversaire.',
   '/objets/poele.svg', 78, 88, 42, 55, 0, 0),

  ('chaise', 'Chaise',
   'Quatre pieds, zéro pitié. Spécialiste incontestée du combat de saloon.',
   '/objets/chaise.svg', 72, 66, 38, 44, 0, 0),

  ('bouteille', 'Bouteille',
   'Fragile mais rusée. Elle mise tout sur la vitesse et sur l''effet de surprise.',
   '/objets/bouteille.svg', 35, 60, 70, 90, 0, 0),

  ('parapluie', 'Parapluie',
   'Bouclier le jour, épée la nuit. Le seul combattant qui gère aussi la météo.',
   '/objets/parapluie.svg', 52, 71, 64, 68, 0, 0),

  ('clavier', 'Clavier',
   '104 touches, 104 façons de vous contredire. Redoutable en combat verbal.',
   '/objets/clavier.svg', 40, 45, 82, 95, 0, 0),

  ('cafetiere', 'Cafetière',
   'Lente au réveil, ingérable après le premier passage. Endurance quasi illimitée.',
   '/objets/cafetiere.svg', 66, 79, 30, 74, 0, 0),

  ('grille-pain', 'Grille-pain',
   'Attaque à distance avec projectiles brûlants. Imprévisible, comme sa minuterie.',
   '/objets/grille-pain.svg', 58, 52, 76, 33, 0, 0)
ON CONFLICT (slug) DO NOTHING;

-- Les premiers seeds avaient des victoires / combats d'exemple. On les retire
-- (combats sans joueur) et on recalcule les bilans à partir des vrais combats.
DELETE FROM fights WHERE user_id IS NULL;

UPDATE objects o SET
  nb_wins = (SELECT COUNT(*) FROM fights f WHERE f.winner_id = o.id),
  nb_losses = (
    SELECT COUNT(*) FROM fights f
    WHERE (f.object_1_id = o.id OR f.object_2_id = o.id)
      AND f.winner_id IS NOT NULL
      AND f.winner_id <> o.id
  );
