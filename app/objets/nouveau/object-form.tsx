"use client";

import { useState } from "react";

import { Panel, Tag, btn, btnLabel } from "@/components/ui";
import { StatList } from "@/components/stat-bar";
import type { Stats } from "@/lib/types";
import { STAT_HINTS, STAT_KEYS, STAT_LABELS } from "@/lib/types";

const STATS_PAR_DEFAUT: Stats = {
  puissance: 50,
  resistance: 50,
  rapidite: 50,
  intelligence: 50,
};

/* ==========================================================================
   Formulaire de création d'objet (§4.3).

   ⚠️ Rien n'est envoyé ni enregistré pour l'instant : l'upload vers Vercel
   Blob (§7), la validation serveur (§16) et l'insertion en base (§10) seront
   ajoutés ensuite. Le formulaire ne gère ici que l'aperçu à l'écran.
   ========================================================================== */

export function ObjectForm() {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [stats, setStats] = useState<Stats>(STATS_PAR_DEFAUT);
  const [apercuImage, setApercuImage] = useState<string | null>(null);
  const [nomFichier, setNomFichier] = useState<string | null>(null);

  function changerStat(cle: keyof Stats, valeur: number) {
    setStats((precedent) => ({ ...precedent, [cle]: valeur }));
  }

  function changerImage(fichier: File | undefined) {
    if (apercuImage) URL.revokeObjectURL(apercuImage);

    if (!fichier) {
      setApercuImage(null);
      setNomFichier(null);
      return;
    }

    setApercuImage(URL.createObjectURL(fichier));
    setNomFichier(fichier.name);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      {/* ------------------------------------------------------------------ */}
      {/* Formulaire                                                          */}
      {/* ------------------------------------------------------------------ */}
      <form
        // TODO : brancher sur POST /api/objets une fois l'API REST en place.
        onSubmit={(event) => event.preventDefault()}
        className="grid gap-6"
      >
        <Panel innerClassName="grid gap-5 p-6">
          <h2 className="text-2xl text-white">Identité</h2>

          <div>
            <label
              htmlFor="nom"
              className="mb-2 block font-mono text-xs tracking-[0.14em] text-arcade-cyan uppercase"
            >
              Nom de l&apos;objet <span className="text-defeat">*</span>
            </label>
            <input
              id="nom"
              name="nom"
              type="text"
              required
              maxLength={40}
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              placeholder="Marteau, poêle, parapluie…"
              className="w-full border border-edge bg-panel-soft px-4 py-3 text-white placeholder:text-white/30 focus:border-arcade-violet focus:outline-none"
            />
            <p className="mt-1.5 font-mono text-[11px] text-white/40">
              {nom.length} / 40 caractères
            </p>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block font-mono text-xs tracking-[0.14em] text-arcade-cyan uppercase"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={160}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Une phrase pour présenter le combattant…"
              className="w-full resize-y border border-edge bg-panel-soft px-4 py-3 text-white placeholder:text-white/30 focus:border-arcade-violet focus:outline-none"
            />
          </div>
        </Panel>

        <Panel innerClassName="grid gap-5 p-6">
          <div>
            <h2 className="text-2xl text-white">Image</h2>
            <p className="mt-1 text-sm text-white/60">
              Chaque objet doit avoir sa propre image (§7). Formats acceptés :
              PNG, JPG ou WEBP.
            </p>
          </div>

          <div>
            <label
              htmlFor="image"
              className="mb-2 block font-mono text-xs tracking-[0.14em] text-arcade-cyan uppercase"
            >
              Fichier <span className="text-defeat">*</span>
            </label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => changerImage(event.target.files?.[0])}
              className="w-full border border-dashed border-edge bg-panel-soft px-4 py-6 text-sm text-white/70 file:mr-4 file:-skew-x-6 file:border-0 file:bg-arcade-violet file:px-4 file:py-2 file:font-mono file:text-xs file:tracking-widest file:text-white file:uppercase hover:border-arcade-violet"
            />
            {nomFichier ? (
              <p className="mt-2 font-mono text-[11px] text-victory">
                <span aria-hidden="true">✓</span> {nomFichier}
              </p>
            ) : null}
          </div>
        </Panel>

        <Panel innerClassName="grid gap-5 p-6">
          <div>
            <h2 className="text-2xl text-white">Caractéristiques</h2>
            <p className="mt-1 text-sm text-white/60">
              Quatre curseurs, de 0 à 100 (§8).
            </p>
          </div>

          <div className="grid gap-6">
            {STAT_KEYS.map((cle) => (
              <div key={cle}>
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    htmlFor={`stat-${cle}`}
                    className="font-display text-lg tracking-wide text-white"
                  >
                    {STAT_LABELS[cle]}
                  </label>
                  <output
                    htmlFor={`stat-${cle}`}
                    className="font-mono text-lg font-bold text-arcade-gold tabular-nums"
                  >
                    {stats[cle]}
                  </output>
                </div>
                <input
                  id={`stat-${cle}`}
                  name={cle}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={stats[cle]}
                  onChange={(event) => changerStat(cle, Number(event.target.value))}
                  className="mt-2 w-full accent-arcade-violet"
                />
                <p className="mt-1 text-xs text-white/45">{STAT_HINTS[cle]}</p>
              </div>
            ))}
          </div>
        </Panel>

        <div>
          <button type="submit" className={`${btn.base} ${btn.primary} w-full sm:w-auto`}>
            <span className={btnLabel}>Créer l&apos;objet</span>
          </button>
          <p className="mt-3 font-mono text-xs text-white/45">
            L&apos;envoi du formulaire, l&apos;upload de l&apos;image et
            l&apos;enregistrement en base seront branchés à l&apos;étape suivante.
          </p>
        </div>
      </form>

      {/* ------------------------------------------------------------------ */}
      {/* Aperçu en direct                                                    */}
      {/* ------------------------------------------------------------------ */}
      <aside className="lg:sticky lg:top-24">
        <h2 className="mb-4 text-2xl text-white">Aperçu</h2>

        <Panel tone="violet" innerClassName="flex flex-col">
          <div className="arena-grid relative h-56 w-full overflow-hidden bg-linear-to-b from-panel-soft to-void">
            {apercuImage ? (
              // Aperçu local d'un fichier choisi par l'utilisateur (URL blob) :
              // next/image ne sait pas optimiser ce cas, on garde une balise img.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={apercuImage}
                alt=""
                className="absolute inset-0 h-full w-full object-contain p-6"
              />
            ) : (
              <p className="absolute inset-0 grid place-items-center font-display text-6xl text-white/15">
                ?
              </p>
            )}
          </div>

          <div className="border-t border-edge p-5">
            <Tag className="bg-panel-soft text-arcade-cyan">Nouveau combattant</Tag>
            <h3 className="mt-3 font-display text-3xl leading-none text-white">
              {nom.trim() || "Sans nom"}
            </h3>
            <p className="mt-2 min-h-10 text-sm leading-relaxed text-white/60">
              {description.trim() || "Aucune description pour le moment."}
            </p>
            <div className="mt-5">
              <StatList stats={stats} />
            </div>
          </div>
        </Panel>
      </aside>
    </div>
  );
}
