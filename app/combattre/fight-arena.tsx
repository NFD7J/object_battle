"use client";

import Link from "next/link";
import { useState } from "react";

import { CombatantPortrait, OverallBadge } from "@/components/combatant-card";
import { StatList } from "@/components/stat-bar";
import { Panel, Tag, btn, btnLabel } from "@/components/ui";
import { combatants, currentPlayer } from "@/lib/mock-data";
import type { Combatant } from "@/lib/types";

type Slot = "A" | "B";
type BetChoice = Slot | "nul";
type Phase = "selection" | "resultat";

const MISES = [10, 25, 50, 100];

const ETAPES = [
  "Combattant 1",
  "Combattant 2",
  "Pari",
  "Combat",
];

/* ==========================================================================
   Écran « Combattre » — sélection, pari, résultat.

   ⚠️ Aucune règle de jeu n'est implémentée ici : le score, le vainqueur et le
   gain affichés dans la phase « résultat » sont des valeurs de démonstration.
   Le moteur de combat (§9) et l'enregistrement en base (§10) les remplaceront.
   ========================================================================== */

export function FightArena() {
  const [fighterA, setFighterA] = useState<Combatant | null>(combatants[0]);
  const [fighterB, setFighterB] = useState<Combatant | null>(null);
  const [activeSlot, setActiveSlot] = useState<Slot>("B");
  const [bet, setBet] = useState<BetChoice | null>(null);
  const [mise, setMise] = useState<number>(25);
  const [recherche, setRecherche] = useState("");
  const [phase, setPhase] = useState<Phase>("selection");

  const pretAuCombat = fighterA !== null && fighterB !== null && bet !== null;

  const etapeCourante = !fighterA ? 0 : !fighterB ? 1 : !bet ? 2 : 3;

  function choisir(combatant: Combatant) {
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
      <ol className="mb-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ETAPES.map((etape, index) => {
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
      <section aria-labelledby="titre-arene" className="relative">
        <h2 id="titre-arene" className="sr-only">
          Arène de combat
        </h2>

        <div className="relative grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <FighterSlot
            slot="A"
            combatant={fighterA}
            active={activeSlot === "A" && phase === "selection"}
            attacking={phase === "resultat"}
            onSelect={() => setActiveSlot("A")}
            onClear={() => setFighterA(null)}
            disabled={phase === "resultat"}
          />

          <div className="flex items-center justify-center py-2 md:px-2">
            <p
              aria-hidden="true"
              className={`skew-title font-display text-5xl text-arcade-orange md:text-6xl ${
                phase === "resultat" ? "animate-glow" : ""
              }`}
            >
              VS
            </p>
          </div>

          <FighterSlot
            slot="B"
            combatant={fighterB}
            active={activeSlot === "B" && phase === "selection"}
            attacking={phase === "resultat"}
            onSelect={() => setActiveSlot("B")}
            onClear={() => setFighterB(null)}
            disabled={phase === "resultat"}
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
                          <span className="font-mono text-sm font-bold text-arcade-gold tabular-nums">
                            {combatant.overall}
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
            <p className="mt-1 text-sm text-white/60">
              Vous disposez de{" "}
              <strong className="font-mono text-arcade-gold">
                {currentPlayer.points.toLocaleString("fr-FR")}
              </strong>{" "}
              points.
            </p>

            <Panel className="mt-5" innerClassName="p-5 sm:p-6">
              <fieldset>
                <legend className="font-mono text-xs tracking-[0.16em] text-arcade-cyan uppercase">
                  Sur qui misez-vous ?
                </legend>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {([
                    { choix: "A" as BetChoice, label: fighterA?.name ?? "Combattant A", couleur: "border-arcade-violet" },
                    { choix: "nul" as BetChoice, label: "Match nul", couleur: "border-draw" },
                    { choix: "B" as BetChoice, label: fighterB?.name ?? "Combattant B", couleur: "border-arcade-blue" },
                  ]).map((option) => {
                    const indisponible =
                      (option.choix === "A" && !fighterA) ||
                      (option.choix === "B" && !fighterB);
                    const choisi = bet === option.choix;
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
                        <span className="mt-1 block font-mono text-[10px] tracking-widest uppercase">
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
                <div className="mt-4 flex flex-wrap gap-2">
                  {MISES.map((montant) => (
                    <button
                      key={montant}
                      type="button"
                      onClick={() => setMise(montant)}
                      aria-pressed={mise === montant}
                      className={`tag-slant px-5 py-2.5 font-mono text-sm font-bold tabular-nums ${
                        mise === montant
                          ? "bg-arcade-gold text-void"
                          : "bg-panel-soft text-white/70 hover:text-white"
                      }`}
                    >
                      {montant} pts
                    </button>
                  ))}
                </div>
              </fieldset>
            </Panel>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Lancement                                                       */}
          {/* -------------------------------------------------------------- */}
          <div className="mt-10 text-center">
            <button
              type="button"
              disabled={!pretAuCombat}
              onClick={() => setPhase("resultat")}
              className={`${btn.base} ${btn.primary} !px-12 !py-5 text-2xl disabled:cursor-not-allowed disabled:from-edge disabled:to-edge disabled:text-white/40 disabled:shadow-none`}
            >
              <span className={btnLabel}>Lancer le combat</span>
            </button>
            <p className="mt-3 font-mono text-xs text-white/45" aria-live="polite">
              {pretAuCombat
                ? `Mise de ${mise} points engagée.`
                : "Sélectionnez deux objets et placez votre pari pour lancer le combat."}
            </p>
          </div>
        </>
      ) : (
        <FightResult
          fighterA={fighterA!}
          fighterB={fighterB!}
          bet={bet!}
          mise={mise}
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
  mirrored = false,
  disabled = false,
  onSelect,
  onClear,
}: {
  slot: Slot;
  combatant: Combatant | null;
  active: boolean;
  attacking: boolean;
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
        <OverallBadge value={combatant.overall} />
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

      <div className="mt-5">
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

function FightResult({
  fighterA,
  fighterB,
  bet,
  mise,
  onRejouer,
}: {
  fighterA: Combatant;
  fighterB: Combatant;
  bet: BetChoice;
  mise: number;
  onRejouer: () => void;
}) {
  // PLACEHOLDER — remplacer par le moteur de combat (§9).
  // On se contente de comparer les scores globaux stockés pour pouvoir
  // afficher la mise en page du résultat ; il n'y a ici ni formule ni aléatoire.
  const scoreA = fighterA.overall;
  const scoreB = fighterB.overall;
  const vainqueur: BetChoice = scoreA === scoreB ? "nul" : scoreA > scoreB ? "A" : "B";
  const pariGagnant = bet === vainqueur;
  const delta = pariGagnant ? mise * 2 : -mise;

  const nomVainqueur =
    vainqueur === "nul" ? null : vainqueur === "A" ? fighterA.name : fighterB.name;

  return (
    <section aria-labelledby="titre-resultat" className="mt-12">
      <h2 id="titre-resultat" className="sr-only">
        Résultat du combat
      </h2>

      {/* Bandeau du vainqueur */}
      <Panel tone={pariGagnant ? "victory" : "defeat"} innerClassName="relative overflow-hidden">
        <div aria-hidden="true" className="arena-grid absolute inset-0 opacity-40" />
        <div className="relative px-6 py-8 text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-white/60 uppercase">
            {vainqueur === "nul" ? "Égalité parfaite" : "K.O."}
          </p>
          <p
            className={`skew-title mt-3 font-display text-4xl leading-none sm:text-6xl ${
              vainqueur === "nul" ? "text-draw" : "text-victory"
            }`}
          >
            {nomVainqueur ? `${nomVainqueur} gagne !` : "Match nul !"}
          </p>

          <p className="mt-6 flex items-center justify-center gap-4 font-display text-4xl sm:text-5xl">
            <span
              className={
                vainqueur === "A" ? "text-victory" : vainqueur === "B" ? "text-defeat" : "text-draw"
              }
            >
              {scoreA}
            </span>
            <span aria-hidden="true" className="text-2xl text-white/30">
              —
            </span>
            <span
              className={
                vainqueur === "B" ? "text-victory" : vainqueur === "A" ? "text-defeat" : "text-draw"
              }
            >
              {scoreB}
            </span>
          </p>
          <p className="sr-only">
            Score de {fighterA.name} : {scoreA}. Score de {fighterB.name} : {scoreB}.
          </p>

          {/* Gain ou perte : icône + mot + montant, jamais la couleur seule */}
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
