// main.ts — hands in the Leonida Trophy Atlas guide (make.fun gta6-trophy-guide-01, Node 22).
// It copies the static guide in app/ and the screenshots in screenshots/ to the output
// directory, then writes dossier.json with the kit's own vendored buildDossier so the
// scorer can rebuild it byte for byte. Outside the grader, MAKEFUN_OUTPUT_DIR stands in
// for /output. Run it with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer caps: app/ at most 993 entries and 48 MiB, screenshots/ at most 4 files of
// 256 KiB each, and the dossier itself at 1.5 MiB. buildDossier enforces them for us.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

// A short confirmation on stdout, handy when running the program by hand outside the grader.
console.log(`dossier.json written: ${statSync(dossierPath).size} bytes`);
