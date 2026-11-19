// main.ts — package the Leonida Trophy Atlas for the make.fun gta6-trophy-guide-01 grader.
// The guide itself lives in app/ and screenshots/; we mirror both into the destination
// folder, then hand that folder to the vendored buildDossier so it emits dossier.json with
// the exact byte caps the scorer expects. Locally, MAKEFUN_OUTPUT_DIR substitutes /output.
//   MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Stage the static assets. buildDossier applies the caps: 993 files / 48 MiB for app/,
// four screenshots at 256 KiB each, and 160 KiB of text in the dossier.
mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Emit the dossier with the kit's own builder — never reimplement its rules here.
const dossierFile = join(outDir, 'dossier.json');
writeFileSync(
  dossierFile,
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

console.log(`wrote ${dossierFile} (${statSync(dossierFile).size} bytes)`);