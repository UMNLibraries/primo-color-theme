import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import template from 'lodash.template';
import fetch from 'node-fetch';
import sass from 'node-sass';
import tar from 'tar-fs';

export async function generateCss(primoServer, customColorsFile) {
  const tmpdir = await mkdtemp(path.join(os.tmpdir(), 'primo-scss-'));
  const downloadScss = async () => {
    const response =
      await fetch(`https://${primoServer}/discovery/lib/scsss.tar.gz`);
    if (!response.ok) 
      throw new Error(`bad response from ${primoServer}: ${response.statusText}`);
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
  const loadColors = async () => {
    const defaultColorsFile = path.join(tmpdir, 'styles', 'colors.json');
    const defaultColors = await readFile(defaultColorsFile).then(JSON.parse);
    const customColors = await readFile(customColorsFile).then(JSON.parse);
    return ({
      ...defaultColors,
      ...customColors,
    });
  }
  const updateTheme = async (colors) => {
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
  const renderCss = async () => {
    const render = promisify(sass.render);
    const result = await render({
      file: path.join(tmpdir, 'styles', 'main.scss'),
    });
    return result.css.toString('utf8');
  }

  return downloadScss()
    .then(loadColors)
    .then(updateTheme)
    .then(renderCss)
    .finally(() => rm(tmpdir, { recursive: true }))
}