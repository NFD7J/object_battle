"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CombatantPortrait, OverallBadge } from "@/components/object-card";
import { DUREE_PV, HealthBar, mouvementReduit } from "@/components/health-bar";
import { StatList } from "@/components/stat-bar";
import { Panel, Tag, btn, btnLabel } from "@/components/ui";
import { PV_MAX, deltaParis, formatCote, gainPotentiel } from "@/lib/fight-engine";
import type { Cotes, Issue, ResultatCombat } from "@/lib/fight-engine";
import { useGame } from "@/lib/game-store";
import type { Object, Fight, Player } from "@/lib/types";

type Slot = "A" | "B";
type BetChoice = Issue;
/**
 * « combat » est la passe d'armes : les portraits s'entrechoquent et les
 * jauges se vident. Le résultat est déjà connu à ce moment-là — il vient du
 * serveur — mais rien ne l'annonce encore à l'écran.
 */
type Phase = "selection" | "combat" | "resultat";

const MISES = [10, 25, 50, 100];

/**
 * Temps d'affichage du combat : la descente des jauges, plus un souffle avant
 * l'annonce.
 *
 * Durée unique, identique pour tout le monde. « prefers-reduced-motion » ne la
 * raccourcit pas : le combat est le contenu de cet écran, pas une transition
 * qu'on pourrait sauter. Ce que le réglage désactive, ce sont les effets
 * décoratifs, et globals.css s'en charge déjà.
 */
function dureeDuCombat(): number {
  return DUREE_PV + 1_000;
}

/** Promesse résolue après `ms` millisecondes. */
function attendre(ms: number): Promise<void> {
  return new Promise((resoudre) => setTimeout(resoudre, ms));
}

/** Étapes du fil d'Ariane. Un visiteur ne parie pas : il en a une de moins. */
const ETAPES_JOUEUR = ["Combattant 1", "Combattant 2", "Pari", "Combat"];
const ETAPES_VISITEUR = ["Combattant 1", "Combattant 2", "Combat"];

type ReponseCotes = {
  cotes?: Cotes;
};

type ReponseCombat = {
  combat?: Fight;
  joueur?: Player | null;
  error?: { message?: string };
};

function resultatDepuisCombat(combat: Fight, fighterA: Object): ResultatCombat {
  const vainqueur: Issue =
    combat.winnerId === null ? "nul" : combat.winnerId === fighterA.id ? "A" : "B";
  return { vainqueur, pvA: combat.pvA, pvB: combat.pvB };
}

/* ==========================================================================
   Écran « Combattre » — sélection, pari, résultat.

   Tous les combats sont calculés et enregistrés par le serveur, connecté ou
   non : l'historique est commun. Seul le pari distingue les deux publics —
   il demande un compte et des points à engager.
   ========================================================================== */

export function FightArena({ combatants }: { combatants: Object[] }) {
  const router = useRouter();
  const { points, connecte, appliquerCombatServeur } = useGame();

  const [fighterA, setFighterA] = useState<Object | null>(combatants[0] ?? null);
  const [fighterB, setFighterB] = useState<Object | null>(null);
  const [activeSlot, setActiveSlot] = useState<Slot>("B");
  const [bet, setBet] = useState<BetChoice | null>(null);
  const [mise, setMise] = useState<string>("25");
  const [recherche, setRecherche] = useState("");
  const [phase, setPhase] = useState<Phase>("selection");
  const [resultat, setResultat] = useState<ResultatCombat | null>(null);
  /** Pari tel qu'il a été engagé, figé au lancement du combat. */
  const [pariJoue, setPariJoue] = useState<PariEngage | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Le bouton « Lancer le combat » est en bas de page, l'arène tout en haut :
  // sans ce repère, le combat se jouerait hors de l'écran du joueur.
  const arene = useRef<HTMLElement>(null);

  // Les cotes sont mémorisées avec la paire à laquelle elles appartiennent.
  const [cotesRecues, setCotesRecues] = useState<{
    idA: number;
    idB: number;
    cotes: Cotes;
  } | null>(null);

  // On dépend des identifiants, pas des objets : router.refresh() renouvelle
  // les objets reçus en props sans que la paire ait changé, ce qui relancerait
  // la requête pour rien.
  const idA = fighterA?.id ?? null;
  const idB = fighterB?.id ?? null;

  // Les cotes reçues ne valent que pour la paire qui les a demandées : dès que
  // la sélection change, elles cessent d'être affichées sans qu'on ait à les
  // effacer. Les boutons de pari se désactivent seuls tant que c'est null.
  const cotes =
    cotesRecues && cotesRecues.idA === idA && cotesRecues.idB === idB
      ? cotesRecues.cotes
      : null;

  /*
   * Les cotes viennent du serveur, qui les obtient en simulant 500 combats à
   * la première rencontre de la paire puis les garde en base. Les recalculer
   * ici annoncerait un gain que le serveur ne paierait pas — c'est la même
   * ligne de la table qui sert à l'affichage et au paiement du pari.
   */
  useEffect(() => {
    if (idA === null || idB === null) return;

    const controleur = new AbortController();

    fetch(`/api/cotes?a=${idA}&b=${idB}`, { signal: controleur.signal })
      .then((reponse) => (reponse.ok ? reponse.json() : Promise.reject(new Error())))
      .then((donnees: ReponseCotes) => {
        if (donnees.cotes) setCotesRecues({ idA, idB, cotes: donnees.cotes });
      })
      .catch(() => {
        // Sélection changée entre-temps (requête annulée) ou serveur muet :
        // on laisse « — » à l'écran plutôt qu'une cote fausse.
      });

    return () => controleur.abort();
  }, [idA, idB]);

  /*
   * La mise est saisie librement, donc gardée en texte : un champ vide ou en
   * cours de frappe n'est pas un nombre. Le `onChange` n'y laisse entrer que
   * des chiffres, ce qui réduit les saisies invalides à deux cas — zéro, et
   * plus de points qu'on n'en a.
   *
   * On ne corrige jamais ce que le joueur a tapé : une mise hors bornes reste
   * affichée telle quelle, avec son message d'erreur, et le combat ne part
   * pas. Remplacer sa saisie par un montant abordable engagerait des points
   * qu'il n'a pas voulu miser.
   */
  const miseSaisie = mise === "" ? null : Number(mise);

  const miseValide =
    miseSaisie !== null && miseSaisie > 0 && miseSaisie <= points ? miseSaisie : null;

  const erreurMise =
    miseSaisie === null || miseValide !== null
      ? null
      : miseSaisie > points
        ? `Mise trop élevée : il vous reste ${points.toLocaleString("fr-FR")} points.`
        : "La mise doit être d'au moins 1 point.";

  // Un visiteur n'a que deux combattants à choisir ; un joueur doit en plus
  // avoir posé un pari et une mise qu'il peut couvrir.
  const pretAuCombat =
    fighterA !== null &&
    fighterB !== null &&
    !enCours &&
    (!connecte || (bet !== null && miseValide !== null));

  const etapes = connecte ? ETAPES_JOUEUR : ETAPES_VISITEUR;
  const etapeCourante = !fighterA ? 0 : !fighterB ? 1 : connecte && !bet ? 2 : etapes.length - 1;

  async function lancerLeCombat() {
    if (!pretAuCombat || !fighterA || !fighterB) return;

    setErreur(null);
    setEnCours(true);

    // Remonter AVANT la requête : le défilement se termine pendant que le
    // serveur résout le combat, et les jauges sont à l'écran quand elles
    // commencent à descendre.
    arene.current?.scrollIntoView({
      behavior: mouvementReduit() ? "auto" : "smooth",
      block: "start",
    });

    // Le pari est figé ici, avant que le combat ne modifie le solde. Le relire
    // après coup donnerait une mise incohérente : miseValide se compare aux
    // points restants, qui viennent justement de changer.
    const pari =
      connecte && bet !== null && cotes !== null && miseValide !== null
        ? { bet, mise: miseValide, cote: cotes[bet], soldeAvant: points }
        : null;

    setPariJoue(pari);

    try {
      const reponse = await fetch("/api/combats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          object1Id: fighterA.id,
          object2Id: fighterB.id,
          // Un visiteur n'envoie aucune mise : le serveur enregistre quand
          // même le combat, qui rejoint l'historique commun.
          ...(pari
            ? {
                betOn: bet === "nul" ? "nul" : bet === "A" ? fighterA.id : fighterB.id,
                amount: pari.mise,
              }
            : {}),
        }),
      });

      const donnees: ReponseCombat = await reponse.json();

      if (!reponse.ok || !donnees.combat) {
        throw new Error(donnees.error?.message ?? "Le combat n'a pas pu être lancé.");
      }

      // Le combat se joue d'abord à l'écran : les jauges partent de PV_MAX et
      // descendent vers les PV renvoyés par le serveur.
      setResultat(resultatDepuisCombat(donnees.combat, fighterA));
      setPhase("combat");

      await attendre(dureeDuCombat());

      // Le solde n'est mis à jour qu'une fois la passe d'armes finie : appliqué
      // plus tôt, le compteur de points de l'en-tête annoncerait le gain ou la
      // perte avant que les jauges aient fini de descendre.
      appliquerCombatServeur(donnees.combat, donnees.joueur ?? null);
      setPhase("resultat");
      router.refresh();
    } catch (probleme) {
      setErreur(
        probleme instanceof Error ? probleme.message : "Une erreur est survenue, réessayez.",
      );
    } finally {
      setEnCours(false);
    }
  }

  function choisir(combatant: Object) {
    if (activeSlot === "A") {
      setFighterA(combatant);
      if (!fighterB) setActiveSlot("B");
    } else {
      setFighterB(combatant);
      if (!fighterA) setActiveSlot("A");
    }
    setBet(null);
  }

  function tirageAuSort() {
    const melange = [...combatants].sort(() => Math.random() - 0.5);
    setFighterA(melange[0]);
    setFighterB(melange[1]);
    setBet(null);
  }

  function reinitialiser() {
    setPhase("selection");
    setResultat(null);
    setPariJoue(null);
    setBet(null);
    setFighterB(null);
    setActiveSlot("B");
  }

  const listeFiltree = combatants.filter((combatant) =>
    combatant.name.toLowerCase().includes(recherche.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* ---------------------------------------------------------------- */}
      {/* Fil des étapes                                                    */}
      {/* ---------------------------------------------------------------- */}
      <ol
        className={`mb-10 grid grid-cols-2 gap-2 ${
          connecte ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        {etapes.map((etape, index) => {
          const faite = index < etapeCourante;
          const active = index === etapeCourante;
          return (
            <li
              key={etape}
              aria-current={active ? "step" : undefined}
              className={`tag-slant flex items-center gap-2 px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase ${
                active
                  ? "bg-linear-to-r from-arcade-violet to-arcade-blue text-white"
                  : faite
                    ? "bg-panel-soft text-victory"
                    : "bg-panel text-white/40"
              }`}
            >
              <span aria-hidden="true" className="font-bold">
                {faite ? "✓" : `0${index + 1}`}
              </span>
              {etape}
            </li>
          );
        })}
      </ol>

      {/* ---------------------------------------------------------------- */}
      {/* Arène : les deux emplacements face à face                         */}
      {/* ---------------------------------------------------------------- */}
      {/* scroll-mt dégage la hauteur de l'en-tête, qui est collant. */}
      <section ref={arene} aria-labelledby="titre-arene" className="relative scroll-mt-24">
        <h2 id="titre-arene" className="sr-only">
          Arène de combat
        </h2>

        <div className="relative grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <FighterSlot
            slot="A"
            combatant={fighterA}
            active={activeSlot === "A" && phase === "selection"}
            attacking={phase === "combat"}
            pv={resultat ? resultat.pvA : PV_MAX}
            pvAnimes={phase !== "selection"}
            onSelect={() => setActiveSlot("A")}
            onClear={() => setFighterA(null)}
            disabled={phase !== "selection"}
          />

          <div className="flex items-center justify-center py-2 md:px-2">
            <p
              aria-hidden="true"
              className={`skew-title font-display text-5xl text-arcade-orange md:text-6xl ${
                phase !== "selection" ? "animate-glow" : ""
              }`}
            >
              VS
            </p>
          </div>

          <FighterSlot
            slot="B"
            combatant={fighterB}
            active={activeSlot === "B" && phase === "selection"}
            attacking={phase === "combat"}
            pv={resultat ? resultat.pvB : PV_MAX}
            pvAnimes={phase !== "selection"}
            onSelect={() => setActiveSlot("B")}
            onClear={() => setFighterB(null)}
            disabled={phase !== "selection"}
            mirrored
          />
        </div>
      </section>

      {phase === "selection" ? (
        <>
          {/* -------------------------------------------------------------- */}
          {/* Sélection du roster                                             */}
          {/* -------------------------------------------------------------- */}
          <section aria-labelledby="titre-roster" className="mt-12">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="titre-roster" className="text-2xl sm:text-3xl">
                  Choisir un combattant
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  L&apos;objet sélectionné ira dans l&apos;emplacement{" "}
                  <strong className="text-arcade-cyan">{activeSlot}</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label
                    htmlFor="recherche-objet"
                    className="sr-only"
                  >
                    Rechercher un objet
                  </label>
                  <input
                    id="recherche-objet"
                    type="search"
                    value={recherche}
                    onChange={(event) => setRecherche(event.target.value)}
                    placeholder="Rechercher…"
                    className="w-44 border border-edge bg-panel px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-arcade-violet focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={tirageAuSort}
                  className={`${btn.base} ${btn.ghost} !px-4 !py-2.5 text-base`}
                >
                  <span className={btnLabel}>
                    <span aria-hidden="true">🎲</span> Tirage au sort
                  </span>
                </button>
              </div>
            </div>

            {/* Bascule d'emplacement, pour choisir où atterrit la sélection */}
            <div className="mb-5 flex gap-2" role="group" aria-label="Emplacement à remplir">
              {(["A", "B"] as Slot[]).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setActiveSlot(slot)}
                  aria-pressed={activeSlot === slot}
                  className={`tag-slant px-4 py-2 font-mono text-xs tracking-[0.14em] uppercase ${
                    activeSlot === slot
                      ? "bg-arcade-violet font-bold text-white"
                      : "bg-panel text-white/60 hover:bg-panel-soft"
                  }`}
                >
                  Emplacement {slot}
                </button>
              ))}
            </div>

            {listeFiltree.length === 0 ? (
              <Panel innerClassName="p-8 text-center">
                <p className="text-white/60">
                  Aucun objet ne correspond à « {recherche} ».
                </p>
              </Panel>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {listeFiltree.map((combatant) => {
                  const dejaEnLice =
                    combatant.id === fighterA?.id || combatant.id === fighterB?.id;
                  return (
                    <li key={combatant.id}>
                      <button
                        type="button"
                        onClick={() => choisir(combatant)}
                        aria-pressed={dejaEnLice}
                        className={`cut-corner-sm group w-full border bg-panel p-3 text-left transition-colors ${
                          dejaEnLice
                            ? "border-arcade-cyan bg-panel-soft"
                            : "border-edge hover:border-arcade-violet hover:bg-panel-soft"
                        }`}
                      >
                        <CombatantPortrait
                          combatant={combatant}
                          className="h-24 w-full"
                          sizes="(min-width: 1024px) 200px, 40vw"
                        />
                        <span className="mt-3 flex items-center justify-between gap-2">
                          <span className="truncate font-display text-lg text-white">
                            {combatant.name}
                          </span>
                        </span>
                        <span className="mt-1 block font-mono text-[10px] tracking-widest text-white/40 uppercase">
                          {dejaEnLice ? "Sur le ring" : "Sélectionner"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Pari                                                            */}
          {/* -------------------------------------------------------------- */}
          <section aria-labelledby="titre-pari" className="mt-12">
            <h2 id="titre-pari" className="text-2xl sm:text-3xl">
              Placer son pari
            </h2>

            {!connecte ? (
              // Seule chose interdite au visiteur. Le combat, lui, reste
              // accessible juste en dessous et rejoindra l'historique.
              <Panel className="mt-5" innerClassName="p-6 text-center sm:p-8">
                <p className="font-mono text-xs tracking-[0.16em] text-arcade-cyan uppercase">
                  Réservé aux joueurs inscrits
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
                  Créez un compte pour recevoir des points, miser sur une issue et
                  grimper au classement. Sans compte, le combat reste ouvert : il
                  sera enregistré dans l&apos;historique, simplement sans mise.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/inscription" className={`${btn.base} ${btn.primary}`}>
                    <span className={btnLabel}>Créer un compte</span>
                  </Link>
                  <Link href="/connexion" className={`${btn.base} ${btn.ghost}`}>
                    <span className={btnLabel}>Se connecter</span>
                  </Link>
                </div>
              </Panel>
            ) : (
              <>
                <p className="mt-1 text-sm text-white/60">
                  Vous disposez de{" "}
                  <strong className="font-mono text-arcade-gold" suppressHydrationWarning>
                    {points.toLocaleString("fr-FR")}
                  </strong>{" "}
                  points.
                </p>

              <Panel className="mt-5" innerClassName="p-5 sm:p-6">
                <fieldset>
                  <legend className="font-mono text-xs tracking-[0.16em] text-arcade-cyan uppercase">
                    Sur qui misez-vous ?
                  </legend>
                  <p className="mt-1 text-sm text-white/60">
                    La cote dépend du niveau des deux objets : miser sur
                    l&apos;outsider rapporte plus gros.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {([
                      { choix: "A" as BetChoice, label: fighterA?.name ?? "Combattant A", couleur: "border-arcade-violet" },
                      { choix: "nul" as BetChoice, label: "Match nul", couleur: "border-draw" },
                      { choix: "B" as BetChoice, label: fighterB?.name ?? "Combattant B", couleur: "border-arcade-blue" },
                    ]).map((option) => {
                      const indisponible = !cotes;
                      const choisi = bet === option.choix;
                      const cote = cotes?.[option.choix];
                      return (
                        <button
                          key={option.choix}
                          type="button"
                          disabled={indisponible}
                          onClick={() => setBet(option.choix)}
                          aria-pressed={choisi}
                          className={`cut-corner-sm border-2 px-4 py-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            choisi
                              ? `${option.couleur} bg-panel-soft`
                              : "border-edge bg-panel hover:border-white/40"
                          }`}
                        >
                          <span className="block font-display text-xl text-white">
                            {option.label}
                          </span>
                          <span className="mt-2 block font-mono text-2xl leading-none font-bold text-arcade-gold tabular-nums">
                            {cote ? formatCote(cote) : "—"}
                            <span className="sr-only"> de cote</span>
                          </span>
                          <span className="mt-2 block font-mono text-[10px] tracking-widest uppercase">
                            {choisi ? (
                              <span className="text-arcade-cyan">✓ Pari retenu</span>
                            ) : (
                              <span className="text-white/40">Choisir</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
  
                <fieldset className="mt-7 border-t border-edge pt-6">
                  <legend className="font-mono text-xs tracking-[0.16em] text-arcade-cyan uppercase">
                    Montant de la mise
                  </legend>
                  {/* Raccourcis : ils ne font que remplir le champ ci-dessous. */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {MISES.map((montant) => {
                      const tropCher = montant > points;
                      return (
                        <button
                          key={montant}
                          type="button"
                          disabled={tropCher}
                          onClick={() => setMise(String(montant))}
                          aria-pressed={miseValide === montant}
                          className={`tag-slant px-5 py-2.5 font-mono text-sm font-bold tabular-nums disabled:cursor-not-allowed disabled:opacity-35 ${
                            miseValide === montant && !tropCher
                              ? "bg-arcade-gold text-void"
                              : "bg-panel-soft text-white/70 hover:text-white"
                          }`}
                        >
                          {montant} pts
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="mise-personnalisee"
                      className="mb-2 block font-mono text-xs tracking-[0.14em] text-white/50 uppercase"
                    >
                      Mise personnalisée
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="mise-personnalisee"
                        name="mise"
                        type="text"
                        // Pavé numérique sur mobile, sans les ergonomies pénibles de
                        // type="number" (molette, flèches, virgule acceptée).
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={9}
                        value={mise}
                        // Seuls les chiffres entrent : impossible de composer
                        // « 12.5 » ou « -30 », que le serveur refuserait de toute
                        // façon.
                        onChange={(event) =>
                          setMise(event.target.value.replace(/[^0-9]/g, ""))
                        }
                        placeholder="Ex. 250"
                        aria-describedby="aide-mise"
                        aria-invalid={erreurMise !== null}
                        className={`w-40 border bg-panel-soft px-4 py-3 font-mono text-lg text-white tabular-nums placeholder:text-white/25 focus:outline-none ${
                          erreurMise
                            ? "border-defeat"
                            : "border-edge focus:border-arcade-violet"
                        }`}
                      />
                      <span className="font-mono text-sm text-white/50">points</span>
                    </div>
                    <p
                      id="aide-mise"
                      aria-live="polite"
                      className={`mt-2 font-mono text-[11px] ${
                        erreurMise ? "text-defeat" : "text-white/40"
                      }`}
                    >
                      {erreurMise ??
                        `De 1 à ${points.toLocaleString("fr-FR")} points, au choix.`}
                    </p>
                  </div>
                </fieldset>
              </Panel>
              </>
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Lancement                                                       */}
          {/* -------------------------------------------------------------- */}
          <div className="mt-10 text-center">
            <button
              type="button"
              disabled={!pretAuCombat}
              onClick={() => void lancerLeCombat()}
              className={`${btn.base} ${btn.primary} !px-12 !py-5 text-2xl disabled:cursor-not-allowed disabled:from-edge disabled:to-edge disabled:text-white/40 disabled:shadow-none`}
            >
              <span className={btnLabel}>{enCours ? "Combat en cours…" : "Lancer le combat"}</span>
            </button>
            {erreur ? (
              <p className="mt-3 font-mono text-sm text-defeat" role="alert">
                {erreur}
              </p>
            ) : null}
            <p className="mt-3 font-mono text-xs text-white/45" aria-live="polite">
              {!connecte
                ? pretAuCombat
                  ? "Combat amical : le résultat rejoindra l'historique, sans mise."
                  : "Sélectionnez deux objets pour lancer le combat."
                : points < 1
                  ? "Plus assez de points pour miser. Les prochains paris devront attendre."
                  : erreurMise
                    ? erreurMise
                    : pretAuCombat && cotes && bet && miseValide !== null
                      ? `Mise de ${miseValide} points engagée à la cote ${formatCote(cotes[bet])}. L'issue est tirée au sort.`
                      : "Sélectionnez deux objets, placez votre pari et indiquez une mise."}
            </p>
          </div>
        </>
      ) : phase === "combat" ? (
        /* -------------------------------------------------------------- */
        /* Passe d'armes : ni roster ni verdict, seules les jauges parlent  */
        /* -------------------------------------------------------------- */
        <section className="mt-12 text-center" aria-live="polite">
          <p className="skew-title animate-glow font-display text-4xl text-arcade-orange sm:text-5xl">
            Combat en cours…
          </p>
          <p className="mt-3 font-mono text-xs tracking-[0.12em] text-white/50 uppercase">
            Les coups pleuvent, les jauges tombent.
          </p>
        </section>
      ) : (
        <FightResult
          fighterA={fighterA!}
          fighterB={fighterB!}
          resultat={resultat!}
          pari={pariJoue}
          onRejouer={reinitialiser}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Emplacement de combattant
   -------------------------------------------------------------------------- */

function FighterSlot({
  slot,
  combatant,
  active,
  attacking,
  pv,
  pvAnimes,
  mirrored = false,
  disabled = false,
  onSelect,
  onClear,
}: {
  slot: Slot;
  combatant: Object | null;
  active: boolean;
  attacking: boolean;
  pv: number;
  pvAnimes: boolean;
  mirrored?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onClear: () => void;
}) {
  const accent = slot === "A" ? "text-arcade-violet" : "text-arcade-blue";

  if (!combatant) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={`cut-corner flex min-h-64 w-full flex-col items-center justify-center gap-3 border-2 border-dashed p-6 transition-colors ${
          active
            ? "border-arcade-violet bg-panel-soft"
            : "border-edge bg-panel hover:border-white/40"
        }`}
      >
        <span aria-hidden="true" className="font-display text-6xl text-white/15">
          ?
        </span>
        <span className="font-display text-xl text-white">Emplacement {slot}</span>
        <span className="font-mono text-[11px] tracking-widest text-arcade-cyan uppercase">
          Cliquez pour choisir
        </span>
      </button>
    );
  }

  return (
    <Panel
      tone={active ? "violet" : "default"}
      innerClassName="flex h-full flex-col p-5"
    >
      <div
        className={`flex items-center justify-between gap-2 ${mirrored ? "flex-row-reverse" : ""}`}
      >
        <Tag className={`bg-panel-soft ${accent}`}>Combattant {slot}</Tag>
      </div>

      <div
        className={`mt-4 ${attacking ? (slot === "A" ? "animate-clash-left" : "animate-clash-right") : ""}`}
      >
        <CombatantPortrait
          combatant={combatant}
          className="cut-corner-sm mx-auto h-40 w-40"
          sizes="160px"
        />
      </div>

      <h3
        className={`mt-4 font-display text-3xl leading-none text-white ${mirrored ? "text-right" : ""}`}
      >
        {combatant.name}
      </h3>

      <div className="mt-4">
        <HealthBar pv={pv} mirrored={mirrored} anime={pvAnimes} />
      </div>

      <div className="mt-5 border-t border-edge pt-5">
        <StatList
          stats={combatant.stats}
          tone={slot === "A" ? "violet" : "cyan"}
          mirrored={mirrored}
        />
      </div>

      {!disabled ? (
        <div className={`mt-5 flex gap-2 ${mirrored ? "justify-end" : ""}`}>
          <button
            type="button"
            onClick={onSelect}
            className="font-mono text-[11px] tracking-[0.14em] text-arcade-cyan uppercase underline-offset-4 hover:underline"
          >
            Changer
          </button>
          <span aria-hidden="true" className="text-white/25">
            |
          </span>
          <button
            type="button"
            onClick={onClear}
            className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase underline-offset-4 hover:text-defeat hover:underline"
          >
            Retirer
          </button>
        </div>
      ) : null}
    </Panel>
  );
}

/* --------------------------------------------------------------------------
   Écran de résultat
   -------------------------------------------------------------------------- */

/** Pari réellement engagé sur le combat qui vient de se jouer. */
type PariEngage = {
  bet: BetChoice;
  mise: number;
  cote: number;
  soldeAvant: number;
};

function FightResult({
  fighterA,
  fighterB,
  resultat,
  pari,
  onRejouer,
}: {
  fighterA: Object;
  fighterB: Object;
  resultat: ResultatCombat;
  /** `null` quand le combat a été lancé sans mise, par un visiteur notamment. */
  pari: PariEngage | null;
  onRejouer: () => void;
}) {
  // Le vainqueur a été désigné par le serveur ; les PV restants sont affichés
  // par les barres de vie de l'arène, juste au-dessus.
  const { vainqueur } = resultat;
  const pariGagnant = pari !== null && pari.bet === vainqueur;
  const delta = pari ? deltaParis(pari.mise, pari.cote, pariGagnant) : 0;
  const soldeApres = pari ? Math.max(0, pari.soldeAvant + delta) : 0;

  const nomVainqueur =
    vainqueur === "nul" ? null : vainqueur === "A" ? fighterA.name : fighterB.name;

  return (
    <section aria-labelledby="titre-resultat" className="mt-12">
      <h2 id="titre-resultat" className="sr-only">
        Résultat du combat
      </h2>

      {/* Bandeau du vainqueur */}
      <Panel
        tone={pari ? (pariGagnant ? "victory" : "defeat") : "violet"}
        innerClassName="relative overflow-hidden"
      >
        <div aria-hidden="true" className="arena-grid absolute inset-0 opacity-40" />
        <div className="relative px-6 py-8 text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-white/60 uppercase">
            {vainqueur === "nul" ? "Double K.O." : "K.O."}
          </p>
          <p
            className={`skew-title mt-3 font-display text-4xl leading-none sm:text-6xl ${
              vainqueur === "nul" ? "text-draw" : "text-victory"
            }`}
          >
            {nomVainqueur ? `${nomVainqueur} gagne !` : "Match nul !"}
          </p>

          {/* Gain ou perte : icône + mot + montant, jamais la couleur seule */}
          {pari ? (
            <>
              <p
                className="mt-7 inline-flex -skew-x-6 items-center gap-3 border-2 px-5 py-3"
                style={{
                  borderColor: pariGagnant ? "var(--color-victory)" : "var(--color-defeat)",
                }}
              >
                <span aria-hidden="true" className="skew-x-6 text-lg">
                  {pariGagnant ? "▲" : "▼"}
                </span>
                <span className="skew-x-6 font-mono text-xs tracking-[0.16em] uppercase">
                  {pariGagnant ? "Pari gagné" : "Pari perdu"}
                </span>
                <span
                  className={`skew-x-6 font-display text-2xl leading-none tabular-nums ${
                    pariGagnant ? "text-victory" : "text-defeat"
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta} pts
                </span>
              </p>
              <p className="mt-3 font-mono text-xs text-white/50">
                Mise de {pari.mise} pts à la cote {formatCote(pari.cote)}.
              </p>
              <p
                className="mt-2 font-mono text-sm text-white/70 tabular-nums"
                aria-live="polite"
              >
                Solde : {pari.soldeAvant.toLocaleString("fr-FR")} →{" "}
                <strong className={pariGagnant ? "text-victory" : "text-defeat"}>
                  {soldeApres.toLocaleString("fr-FR")} pts
                </strong>
              </p>
            </>
          ) : (
            // Combat d'un visiteur : pas de mise, mais le combat est bien
            // enregistré et figure dès maintenant dans l'historique.
            <p className="mx-auto mt-7 max-w-md text-sm text-white/60">
              Combat enregistré dans l&apos;historique. Créez un compte pour miser
              des points sur vos pronostics et entrer au classement.
            </p>
          )}
        </div>
      </Panel>

      {/* Rappel des caractéristiques face à face */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          { combatant: fighterA, camp: "A" as const },
          { combatant: fighterB, camp: "B" as const },
        ].map(({ combatant, camp }) => (
          <Panel key={camp} innerClassName="p-5">
            <div className="flex items-center gap-4">
              <CombatantPortrait
                combatant={combatant}
                className="cut-corner-sm h-20 w-20 shrink-0"
                sizes="80px"
              />
              <div>
                <h3 className="font-display text-2xl leading-none text-white">
                  {combatant.name}
                </h3>
                <p className="mt-1.5 font-mono text-xs text-white/50">
                  Score global {combatant.overall}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <StatList
                stats={combatant.stats}
                tone={camp === "A" ? "violet" : "cyan"}
              />
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <button type="button" onClick={onRejouer} className={`${btn.base} ${btn.primary}`}>
          <span className={btnLabel}>Nouveau combat</span>
        </button>
        <Link href="/historique" className={`${btn.base} ${btn.ghost}`}>
          <span className={btnLabel}>Voir l&apos;historique</span>
        </Link>
      </div>
    </section>
  );
}
