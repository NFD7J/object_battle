import { PV_MAX } from "@/lib/fight-engine";

/* ===========================================================================
   CHORÉGRAPHIE DU COMBAT

   Le serveur ne renvoie que l'état final : qui gagne, et avec combien de PV.
   Ce module invente le chemin qui y mène — une suite d'échanges où un camp
   fond sur l'autre et lui prend des points de vie.

   Rien n'est décidé ici : la somme des dégâts d'un camp vaut exactement ce que
   le serveur a calculé, et le dernier coup tombe toujours sur le perdant. La
   mise en scène ne peut donc pas contredire le résultat, ni le pari qui vient
   d'être payé.
   =========================================================================== */

export type Camp = "A" | "B";

/** Un échange : qui frappe, et l'état des deux jauges une fois le coup encaissé. */
export type Coup = {
  /** Camp qui porte le coup. « double » : l'échange final d'un match nul. */
  attaquant: Camp | "double";
  pvA: number;
  pvB: number;
  /** Vrai quand le coup n'enlève aucun PV : il est joué comme une parade. */
  pare: boolean;
};

/**
 * Nombre d'échanges d'un combat.
 *
 * Impair, pour que les camps alternent en finissant sur le vainqueur : celui-ci
 * frappe quatre fois, le perdant trois.
 */
export const NB_ECHANGES = 7;

/** Garde levée : le temps de voir les deux combattants avant le premier coup. */
export const DUREE_ENTREE = 700;

/** Durée de l'assaut : bond vers l'adversaire, impact, retour en garde. */
export const DUREE_ASSAUT = 620;

/**
 * Instant de l'impact dans l'assaut.
 *
 * Correspond au palier 35 % de `@keyframes assaut-*` (app/globals.css), moment
 * où la carte touche l'adversaire. C'est là que la jauge doit commencer à
 * descendre, pas au départ du bond.
 */
export const DUREE_IMPACT = Math.round(DUREE_ASSAUT * 0.35);

/** Descente de la jauge après un coup encaissé. */
export const DUREE_DRAIN = 480;

/** Temps mort entre deux échanges, le temps de reprendre sa garde. */
export const DUREE_REPRISE = 320;

export const DUREE_ECHANGE = DUREE_ASSAUT + DUREE_REPRISE;

/** Silence après le coup de grâce, avant que le verdict ne s'affiche. */
export const DUREE_FINALE = 1_400;

/** Durée totale de la passe d'armes, du premier pas au verdict. */
export function dureeDuCombat(coups: Coup[]): number {
  return DUREE_ENTREE + coups.length * DUREE_ECHANGE + DUREE_FINALE;
}

/* ---------------------------------------------------------------------------
   Le mouvement des cartes

   Décrit ici, en images clés JavaScript, et non en @keyframes CSS. Deux
   raisons, apprises à la dure :

   1. La durée d'un geste doit être celle de la chorégraphie. Écrite des deux
      côtés, elle finit par diverger, et le coup part à côté de la descente de
      la jauge.
   2. globals.css neutralise toutes les animations CSS sous
      « prefers-reduced-motion », avec !important. La passe d'armes n'est pas
      un ornement : c'est le contenu de l'écran, au même titre que la descente
      des jauges. Elle doit se jouer — plus discrètement, pas jamais.
   --------------------------------------------------------------------------- */

/** Ce qu'une carte joue pendant un échange. */
export type Geste = "assaut" | "encaisse" | "parade";

/** Déplacement en pixels, dans le repère de l'écran. */
export type Vecteur = { x: number; y: number };

/** Ampleur du mouvement quand le système demande à en voir moins. */
export const AMPLEUR_REDUITE = 0.3;

/**
 * De combien la carte mord dans son adversaire, en pixels.
 *
 * S'arrêter pile au contact donnerait deux cartes qui se frôlent. Il faut
 * qu'elle entre dedans pour que le coup ait l'air porté.
 */
const MORSURE = 30;

/** Recul du défenseur au moment de l'impact, en pixels. */
const RECUL = 26;

function transformation(x: number, y: number, rotation: number, echelle: number): string {
  return `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${echelle})`;
}

const REPOS: Keyframe = {
  transform: transformation(0, 0, 0, 1),
  filter: "brightness(1)",
};

/**
 * Déplacement qui amène une carte au contact de son adversaire.
 *
 * Mesuré sur les portraits réels plutôt que codé en dur : l'écart entre les
 * deux dépend de la largeur de la fenêtre, et la mise en page les empile
 * verticalement sur petit écran. On suit donc l'axe qui les sépare vraiment.
 */
export function vecteurDeContact(depuis: Element, vers: Element): Vecteur {
  const a = depuis.getBoundingClientRect();
  const b = vers.getBoundingClientRect();

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Distance entre les deux bords, une fois les deux demi-largeurs ôtées.
    const ecart = Math.max(0, Math.abs(dx) - (a.width + b.width) / 2);
    return { x: Math.sign(dx) * (ecart + MORSURE), y: 0 };
  }

  const ecart = Math.max(0, Math.abs(dy) - (a.height + b.height) / 2);
  return { x: 0, y: Math.sign(dy) * (ecart + MORSURE) };
}

/**
 * Images clés d'un geste, pour l'API Web Animations.
 *
 * @param vers    déplacement menant à l'adversaire, tel que mesuré par
 *                `vecteurDeContact`. Pour le défenseur, il pointe vers celui
 *                qui le frappe : le recul se joue à l'opposé.
 * @param ampleur multiplicateur du déplacement, 1 en temps normal
 */
export function keyframesDuGeste(
  geste: Geste,
  vers: Vecteur,
  ampleur = 1,
): Keyframe[] {
  const norme = Math.hypot(vers.x, vers.y) || 1;
  // Vecteur unitaire : donne le sens du coup sans sa longueur.
  const ux = vers.x / norme;
  const uy = vers.y / norme;
  const inclinaison = 7 * ux * ampleur;

  if (geste === "assaut") {
    const x = vers.x * ampleur;
    const y = vers.y * ampleur;

    return [
      { ...REPOS, offset: 0 },
      // Élan : la carte s'arme légèrement en arrière avant de partir.
      {
        transform: transformation(-ux * 14 * ampleur, -uy * 14 * ampleur, -inclinaison * 0.3, 0.98),
        filter: "brightness(1)",
        offset: 0.14,
      },
      // Contact.
      {
        transform: transformation(x, y, inclinaison, 1 + 0.1 * ampleur),
        filter: "brightness(1.2)",
        offset: 0.35,
      },
      // Le coup passé, la carte reste un instant sur l'adversaire.
      {
        transform: transformation(x * 0.86, y * 0.86, inclinaison * 0.6, 1 + 0.05 * ampleur),
        filter: "brightness(1)",
        offset: 0.5,
      },
      { ...REPOS, offset: 1 },
    ];
  }

  if (geste === "encaisse") {
    // Rien ne bouge avant 30 % : c'est le temps que l'autre met à arriver.
    const recul = RECUL * ampleur;

    return [
      { ...REPOS, offset: 0 },
      { ...REPOS, offset: 0.3 },
      {
        transform: transformation(-ux * recul, -uy * recul, -inclinaison * 0.8, 1),
        filter: "brightness(2.8) saturate(0.4)",
        offset: 0.38,
      },
      {
        transform: transformation(ux * recul * 0.5, uy * recul * 0.5, inclinaison * 0.4, 1),
        filter: "brightness(1.4)",
        offset: 0.54,
      },
      {
        transform: transformation(-ux * recul * 0.25, -uy * recul * 0.25, -inclinaison * 0.2, 1),
        filter: "brightness(1)",
        offset: 0.72,
      },
      { ...REPOS, offset: 1 },
    ];
  }

  // Parade : la carte tient bon, un éclat froid et rien de plus.
  return [
    { ...REPOS, offset: 0 },
    { ...REPOS, offset: 0.3 },
    {
      transform: transformation(-ux * 6 * ampleur, -uy * 6 * ampleur, 0, 1 - 0.04 * ampleur),
      filter: "brightness(1.8) hue-rotate(-25deg)",
      offset: 0.4,
    },
    { ...REPOS, offset: 1 },
  ];
}

/** Geste complet, images et minutage, prêt pour `element.animate()`. */
export function gesteAnime(
  geste: Geste,
  vers: Vecteur,
  ampleur = 1,
): { images: Keyframe[]; options: KeyframeAnimationOptions } {
  return {
    images: keyframesDuGeste(geste, vers, ampleur),
    options: {
      duration: DUREE_ASSAUT,
      // L'assaut part vite et s'écrase à l'arrivée ; le reste s'amortit.
      easing: geste === "assaut" ? "cubic-bezier(0.5, 0, 0.3, 1)" : "ease-out",
      fill: "none",
    },
  };
}

/**
 * Répartit `total` points de dégâts sur `nbCoups` coups, en valeurs cumulées.
 *
 * L'exposant fait monter la puissance des coups au fil de l'échange : on
 * s'étudie, puis on frappe pour de bon. Le dernier élément vaut exactement
 * `total`, ce qui garantit que la jauge s'arrête sur la valeur du serveur.
 *
 * Quand les dégâts sont faibles, les premiers cumuls se rejoignent après
 * arrondi : le coup n'enlève rien, et l'arène le joue comme une parade.
 */
function cumulDegats(total: number, nbCoups: number): number[] {
  return Array.from({ length: nbCoups }, (_, index) =>
    index === nbCoups - 1 ? total : Math.round(total * ((index + 1) / nbCoups) ** 1.6),
  );
}

/** Déroule la séquence d'attaquants en échanges, jauges à l'appui. */
function assembler(
  attaquants: (Camp | "double")[],
  pvFinalA: number,
  pvFinalB: number,
): Coup[] {
  // Un camp encaisse quand l'autre attaque — et tous les deux sur un « double ».
  const cumulA = cumulDegats(
    PV_MAX - pvFinalA,
    attaquants.filter((attaquant) => attaquant !== "A").length,
  );
  const cumulB = cumulDegats(
    PV_MAX - pvFinalB,
    attaquants.filter((attaquant) => attaquant !== "B").length,
  );

  let coupsSurA = 0;
  let coupsSurB = 0;
  let pvA = PV_MAX;
  let pvB = PV_MAX;

  return attaquants.map((attaquant) => {
    const avantA = pvA;
    const avantB = pvB;

    if (attaquant !== "A") pvA = PV_MAX - cumulA[coupsSurA++];
    if (attaquant !== "B") pvB = PV_MAX - cumulB[coupsSurB++];

    return { attaquant, pvA, pvB, pare: pvA === avantA && pvB === avantB };
  });
}

/**
 * Écrit le combat qui mène aux PV renvoyés par le serveur.
 *
 * @param pvFinalA PV du combattant A à l'arrivée (0 s'il est K.O.)
 * @param pvFinalB PV du combattant B à l'arrivée
 */
export function construireCombat(pvFinalA: number, pvFinalB: number): Coup[] {
  // Double K.O. : personne ne porte le coup de grâce, les deux le portent.
  if (pvFinalA === 0 && pvFinalB === 0) {
    const alternance = Array.from(
      { length: NB_ECHANGES - 1 },
      (_, index): Camp => (index % 2 === 0 ? "A" : "B"),
    );

    return assembler([...alternance, "double"], pvFinalA, pvFinalB);
  }

  // Le vainqueur est celui qui reste debout : pvDepuisScores met toujours le
  // perdant à zéro et laisse au moins 1 PV à l'autre.
  const vainqueur: Camp = pvFinalA > 0 ? "A" : "B";
  const perdant: Camp = vainqueur === "A" ? "B" : "A";

  // Séquence construite à l'envers depuis le coup de grâce : le vainqueur
  // frappe en dernier, et les camps alternent en remontant le temps.
  const attaquants = Array.from({ length: NB_ECHANGES }, (_, index): Camp =>
    (NB_ECHANGES - 1 - index) % 2 === 0 ? vainqueur : perdant,
  );

  return assembler(attaquants, pvFinalA, pvFinalB);
}
