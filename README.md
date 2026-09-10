# Object Battle

Un site de combats entre objets du quotidien. Vous mettez un marteau face à une
poêle, vous pariez des points sur celui que vous croyez le plus fort — ou sur le
match nul — et le moteur tranche. Chaque affrontement part dans un historique
public, et vos gains vous font monter au classement.

L'idée tient en une phrase : donner quatre caractéristiques à des objets banals,
puis les faire se battre pour de faux avec de vrais enjeux.

---

## Le principe

1. **Choisir deux combattants** parmi le catalogue.
2. **Miser** (facultatif, réservé aux comptes) sur l'objet A, l'objet B ou le
   match nul. La cote de chaque issue est affichée avant de valider.
3. **Lancer le combat.** Le serveur calcule le résultat, l'écran le rejoue :
   les portraits s'entrechoquent, les jauges de PV se vident, le vainqueur est
   annoncé.
4. **Encaisser.** Pari réussi : la mise multipliée par la cote. Pari raté : la
   mise est perdue.

Tout le monde peut lancer un combat, connecté ou non, et **tous les combats
sont enregistrés** : l'historique est le même pour tout le monde. La seule
chose qu'un visiteur ne peut pas faire, c'est parier — il n'a pas de solde à
engager. Ses combats apparaissent dans l'historique signés « Invité ».

## Les caractéristiques

Chaque objet porte quatre notes de 0 à 100 :

| Caractéristique | Ce qu'elle représente |
| --- | --- |
| **Puissance** | Force physique de l'objet |
| **Résistance** | Capacité à encaisser les dégâts |
| **Rapidité** | Vitesse de déplacement et d'action |
| **Intelligence** | Lucidité pendant le combat |

## Le moteur de combat

Chaque objet reçoit un score, calculé isolément — il ne sait pas qui est en
face. Le plus haut score l'emporte.

```
score =   puissance    × 1,20
        + résistance   × 1,10
        + rapidité     × 1,05
        + intelligence × 1,15
        + aléatoire    × 1,50      (aléatoire : 0 à 100, tiré à chaque combat)
```

L'aléatoire pèse plus lourd que n'importe quelle caractéristique. C'est
délibéré : un objet médiocre sur le papier doit pouvoir créer la surprise,
sinon l'affiche est jouée d'avance et le pari n'a aucun intérêt. Le score
plafonne à 600.

**Match nul :** si les deux scores se tiennent à moins de 5 points, personne ne
gagne. C'est un double K.O., les deux jauges tombent à zéro.

**Les points de vie** ne sont pas stockés : ils sont déduits des deux scores.
Le perdant tombe toujours à 0 — un combat se joue jusqu'au K.O. Ce qui varie,
c'est l'état du vainqueur, proportionnel à l'écart entre les scores : large
victoire, jauge presque pleine ; victoire d'un cheveu, vainqueur à l'agonie.
Rejouer un combat de l'historique redonne donc exactement les jauges vues dans
l'arène.

Le calcul tourne **uniquement sur le serveur**. Si le navigateur pouvait
envoyer les scores, n'importe qui gagnerait tous ses paris en modifiant la
requête.

## Les cotes

Plutôt que d'estimer la force d'un objet par une formule, le site fait
simplement **combattre la paire 500 fois à blanc** et compte les résultats. La
fréquence observée devient la probabilité de chaque issue, convertie en cote :

```
cote = 1 / probabilité / 1,08          (1,08 = marge de la maison)
```

bornée entre **1,15** et **25**. Le plancher garantit qu'un pari sur le grand
favori rapporte quelque chose ; le plafond évite qu'une issue jamais sortie sur
500 tirages — donc de probabilité nulle — donne une cote infinie.

L'intérêt de la méthode : les cotes suivent le moteur automatiquement. Changez
une pondération ou la fenêtre du match nul, les cotes se réajustent sans
qu'aucune formule parallèle ne soit à retoucher.

Ces 500 simulations sont trop coûteuses pour être refaites à chaque affichage :
le résultat est enregistré en base à la première rencontre d'une paire. Et
c'est **cette même ligne** qui sert à afficher la cote et à payer le pari — le
joueur est donc toujours payé à la cote qu'on lui a montrée.

## Les points et le classement

Un compte neuf démarre à **1 000 points**. Le solde ne descend jamais sous
zéro : une mise perdue ne peut pas creuser de dette.

Le classement ne se base pas sur le solde courant mais sur le **record**, le
meilleur solde jamais atteint. Une place acquise ne se reperd donc pas en
misant, et un joueur qui se ruine garde la trace de son heure de gloire. Le
tableau se trie aussi par nombre de victoires ou par taux de réussite.

## Les pages

| Page | Ce qu'on y fait |
| --- | --- |
| `/` | Accueil : le pitch, les objets en vedette, les derniers combats |
| `/combattre` | L'arène : choix des deux objets, pari, combat animé |
| `/objets` | Le catalogue complet des combattants |
| `/objets/[slug]` | Fiche d'un objet : ses stats, son bilan, ses derniers combats |
| `/objets/nouveau` | Créer un objet : nom, description, image, quatre stats |
| `/classement` | Le tableau des joueurs, triable |
| `/historique` | Tous les combats disputés, filtrables par issue de pari |
| `/profil` | Vos chiffres, vos objets favoris, vos derniers combats |
| `/connexion`, `/inscription` | Le compte |
| `/a-propos` | Les règles et les coulisses, côté site |

## Le modèle de données

Quatre tables PostgreSQL :

- **`objects`** — les combattants. Slug, nom, description, image, les quatre
  stats (contraintes entre 0 et 100 côté base), et le bilan victoires/défaites.
- **`users`** — les joueurs. Pseudo unique, hash du mot de passe, couleur
  d'avatar, solde, record, palmarès.
- **`fights`** — les combats. Les deux objets, le vainqueur (`NULL` = match
  nul), les deux scores, et les colonnes du pari (objet visé, mise, cote figée,
  gain). `user_id` est `NULL` pour un combat de visiteur.
- **`pair_odds`** — les cotes simulées d'une paire, avec le décompte des 500
  combats qui les ont produites. Une seule ligne par paire, quel que soit
  l'ordre des deux objets.

Enregistrer un combat touche trois tables — la ligne du combat, le bilan des
deux objets, le solde du joueur — et part donc **dans une seule transaction**.
Sans cela, une coupure au milieu laisserait des points crédités pour un combat
qui n'existe pas.

## L'API HTTP

Le site consomme sa propre API REST, ouverte aux mêmes conditions que
l'interface.

| Route | Effet |
| --- | --- |
| `GET /api/objets` | Le catalogue |
| `POST /api/objets` | Créer un objet |
| `GET /api/objets/[slug]` | Une fiche, avec ses derniers combats |
| `POST /api/upload` | Envoie une image sur Cloudinary et renvoie son URL |
| `GET /api/cotes?a=1&b=4` | Les trois cotes d'une paire |
| `GET /api/combats` | L'historique (`?limit=`, `?objet=`) |
| `POST /api/combats` | Lancer un combat et l'enregistrer |
| `GET /api/combats/[id]` | Le détail d'un combat |
| `GET /api/classement` | Le classement (`?tri=max_points\|victoires\|ratio`) |
| `POST /api/auth/inscription` | Créer un compte et ouvrir la session |
| `POST /api/auth/connexion` | Ouvrir une session |
| `POST /api/auth/deconnexion` | Fermer la session |
| `GET /api/auth/moi` | Le joueur connecté, ou `null` |

La déconnexion est en `POST` et non en `GET` : elle modifie l'état, et un `GET`
pourrait être déclenché par un simple `<img src>` posé sur un autre site.

## Ce qui protège le site

- **Les mots de passe** sont hachés en bcrypt (coût 12) et ne quittent jamais
  la fonction qui les reçoit. Une connexion sur un pseudo inexistant compare
  quand même le mot de passe à un hash leurre, pour que le temps de réponse ne
  révèle pas quels comptes existent.
- **La session** est un JWT signé (HS256, 7 jours) déposé dans un cookie
  `httpOnly` : le JavaScript de la page ne peut pas y accéder, et modifier le
  numéro de joueur invalide la signature.
- **L'identité vient toujours de la session**, jamais du corps d'une requête.
  Sans cette règle, il suffirait de changer un identifiant dans un JSON pour
  créditer le compte de son choix.
- **Le SQL** part en requêtes paramétrées, systématiquement. Les rares
  fragments injectés en dur (l'ordre de tri du classement) sont choisis dans
  une table écrite en dur : aucune chaîne venant du navigateur n'atteint la
  requête.
- **La validation** est concentrée dans la couche d'accès aux données, qui
  reçoit les champs en `unknown`. Un même contrôle s'applique donc quelle que
  soit la provenance de l'appel — formulaire ou requête `curl`.
- **Le hash du mot de passe** ne sort de la base que par une seule fonction,
  appelée uniquement par le flux d'authentification.

## Comment c'est construit

| Brique | Choix |
| --- | --- |
| Interface | Next.js (App Router), React, Tailwind CSS |
| Serveur | Routes API Next.js, modules `server-only` |
| Base de données | PostgreSQL sur Neon |
| Images | Cloudinary |
| Sessions | `jose` (JWT) dans un cookie httpOnly |
| Hébergement | Vercel |

L'essentiel des pages est rendu côté serveur. Un unique store client tient le
joueur, le classement, le catalogue et l'historique, pour que le résultat d'un
combat s'affiche sans attendre un rechargement — mais les données du serveur
reprennent toujours la main dès qu'elles arrivent.

Le style vient d'une seule direction : borne d'arcade. Panneaux biseautés,
étiquettes en parallélogramme, titres penchés, scanlines. Les effets décoratifs
se coupent sous `prefers-reduced-motion` ; l'animation du combat, elle, reste —
c'est le contenu de l'écran, pas une transition.

## Mettre en route une copie

```bash
npm install
cp .env.example .env.local     # DATABASE_URL, CLOUDINARY_URL, SESSION_SECRET
npm run db:setup               # schéma + jeu d'objets de départ
npm run dev
```

`SESSION_SECRET` se génère avec :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

En production, ces trois variables se déclarent dans l'environnement de
l'hébergeur — jamais dans un fichier versionné.
