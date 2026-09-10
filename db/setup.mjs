/**
 * Applique les fichiers SQL du dossier db/ sur la base Neon.
 *
 * Utilisation (voir les scripts de package.json) :
 *   npm run db:setup     schema puis seed
 *   npm run db:schema    schema seul
 *   npm run db:seed      seed seul
 *   npm run db:setup -- --force   passe outre le garde-fou ci-dessous
 *
 * On utilise Client (WebSocket) et non neon() (HTTP) : seul le premier sait
 * exécuter un fichier contenant plusieurs instructions séparées par des « ; ».
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@neondatabase/serverless";

const dossier = dirname(fileURLToPath(import.meta.url));

const NOS_TABLES = ["objects", "users", "fights", "pair_odds"];

const args = process.argv.slice(2);
const force = args.includes("--force");
const schemaSeul = args.includes("--schema");
const seedSeul = args.includes("--seed");

const fichiers = seedSeul
  ? ["seed.sql"]
  : schemaSeul
    ? ["schema.sql"]
    : ["schema.sql", "seed.sql"];

if (!process.env.DATABASE_URL) {
  console.error(
    "\n✗ DATABASE_URL est absent.\n" +
      "  Copiez .env.example vers .env.local et renseignez la chaîne Neon.\n",
  );
  process.exit(1);
}

const client = new Client(process.env.DATABASE_URL);

try {
  await client.connect();

  // Sur quelle base sommes-nous réellement ?
  const { rows: infos } = await client.query(
    "SELECT current_database() AS base, current_user AS utilisateur",
  );
  console.log(`\nBase : ${infos[0].base} (utilisateur ${infos[0].utilisateur})`);

  const { rows: tables } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  const presentes = tables.map((t) => t.table_name);
  const etrangeres = presentes.filter((t) => !NOS_TABLES.includes(t));
  const notres = presentes.filter((t) => NOS_TABLES.includes(t));

  // Garde-fou : la base contient des tables inconnues et aucune des nôtres.
  // C'est le symptôme d'un DATABASE_URL pointant sur un autre projet — on
  // refuse plutôt que d'y créer des tables au milieu de données existantes.
  if (etrangeres.length > 0 && notres.length === 0 && !force) {
    console.error(
      `\n✗ Cette base contient déjà d'autres tables : ${etrangeres.join(", ")}\n` +
        "  et aucune table d'Object Battle. DATABASE_URL pointe probablement\n" +
        "  sur un autre projet.\n\n" +
        "  Vérifiez la chaîne de connexion, ou relancez avec --force si vous\n" +
        "  êtes certain de vouloir écrire ici :\n" +
        "    npm run db:setup -- --force\n",
    );
    process.exit(1);
  }

  for (const fichier of fichiers) {
    const sql = readFileSync(join(dossier, fichier), "utf8");
    process.stdout.write(`→ ${fichier}… `);
    await client.query(sql);
    console.log("ok");
  }

  // Petit récapitulatif, pour voir tout de suite si la base est peuplée.
  const { rows: comptes } = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM objects) AS objets,
      (SELECT COUNT(*) FROM users)   AS joueurs,
      (SELECT COUNT(*) FROM fights)  AS combats
  `);

  const { objets, joueurs, combats } = comptes[0];
  console.log(
    `\n✓ Terminé — ${objets} objets, ${joueurs} joueurs, ${combats} combats.\n`,
  );
} catch (erreur) {
  console.error(`\n✗ Échec : ${erreur.message}\n`);
  process.exitCode = 1;
} finally {
  await client.end();
}
