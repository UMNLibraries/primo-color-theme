import * as sass from 'node-sass';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import fetch from 'node-fetch';
import { pipeline } from 'node:stream/promises';
import { Transform, Readable } from 'node:stream';
import path from 'node:path';
import { createReadStream, createWriteStream, readFileSync } from 'node:fs';
import zlib from 'node:zlib';
import tar from 'tar-fs';
import { promisify } from 'node:util';
import { argv } from 'node:process';
import tempate from 'lodash.template';
import template from 'lodash.template';

//if (!argv[2]) throw new Error('missing filename argument');
//const colorsFile = argv[2];
//const customColors = await readFile(colorsFile).then(JSON.parse);

const tmpdir = await mkdtemp(path.join(os.tmpdir(), 'primo-scss-'));
const css = await downloadScss()
  .then(loadColors)
  .then(updateTheme)
  .then(renderCss);
await pipeline(
  Readable.from(css.split("\n")),
  colorHookFilter(),
  process.stdout,
)
await rm(tmpdir, { recursive: true });

async function downloadScss() {
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
}

async function loadColors() {
  const defaultColors = await readFile(path.join(tmpdir, 'styles', 'colors.json'))
    .then(JSON.parse);
  const customColors = JSON.parse(readFileSync(process.stdin.fd, 'utf8'));
  return ({
    ...defaultColors,
    ...customColors,
  });
}

async function updateTheme(colors) {
  const templateFile = path.join(tmpdir, 'styles', 'partials', '_variables.tmpl.scss');
  const variablesFile = path.join(tmpdir, 'styles', 'partials', '_variables.scss');
  async function* applyTemplate(source) {
    for await (const chunk of source) {
      yield template(chunk)(colors);
    }
  }
  await pipeline(
    createReadStream(templateFile, { encoding: 'utf8' }),
    applyTemplate,
    createWriteStream(variablesFile, { encoding: 'utf8' }),
  );
}

async function renderCss() {
  const render = promisify(sass.render);
  const result = await render({
    file: path.join(tmpdir, 'styles', 'main.scss'),
  });
  return result.css.toString('utf8');
}

function colorHookFilter() {
  let colorHook = false; 
  const isHooKStart = chunk => chunk.includes('/* primary color hook */');
  const isHookEnd = chunk => chunk.includes('/* primary color hook end*/');
  return new Transform({
    transform(chunk, _, next) {
      if (colorHook ||= isHooKStart(chunk)) {
        this.push(chunk + "\n");
        colorHook = !isHookEnd(chunk);
      }
      next();
    }
  })
}

// TODO:
// apply browser-specific stuff (might be better to do this in webpack)


