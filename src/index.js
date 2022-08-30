import * as sass from 'node-sass';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import fetch from 'node-fetch';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { createReadStream, createWriteStream, readFileSync } from 'node:fs';
import zlib from 'node:zlib';
import tar from 'tar-fs';
import { argv } from 'node:process';
import tempate from 'lodash.template';
import template from 'lodash.template';


/*
const render = promisify(sass.render);
const result = await render({
  file: './www/styles/main.scss',
});
await writeFile('result.css', result.css);
*/

//if (!argv[2]) throw new Error('missing filename argument');
//const colorsFile = argv[2];
//const customColors = await readFile(colorsFile).then(JSON.parse);


const tmpdir = await mkdtemp(path.join(os.tmpdir(), 'primo-scss-'));
const defaultColorsFile = path.join(tmpdir, 'styles', 'colors.json');

const customColors = JSON.parse(readFileSync(process.stdin.fd, 'utf8'));


const scssFile = 'scsss.tar.gz'; // no, that's not a typo
const response = await fetch(`https://umn-psb.primo.exlibrisgroup.com/discovery/lib/${scssFile}`);
if (!response.ok) throw new Error(`bad response: ${response.statusText}`);

await pipeline(
  response.body,
  zlib.createGunzip(),
  tar.extract(tmpdir, {
    map: header => {
      header.name = header.name.replace('src/main/webapp', '');
      return header;
    }
  }),
);


const defaultColors = await readFile(path.join(tmpdir, 'styles', 'colors.json'))
  .then(JSON.parse);

const mergedColors = ({
  ...defaultColors,
  ...customColors,
});

async function* applyTemplate(source) {
  for await (const chunk of source) {
    yield template(chunk)(mergedColors);
  }
}

const templateFile = path.join(tmpdir, 'styles', 'partials', '_variables.tmpl.scss');
await pipeline(
  createReadStream(templateFile, { encoding: 'utf8' }),
  applyTemplate,
  process.stdout,
);

// TODO:
// write variables file
// generate css
// apply browser-specific stuff
// write output
// delete tmpdir

await rm(tmpdir, { recursive: true });

