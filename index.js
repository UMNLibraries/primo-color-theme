#!/usr/bin/env node
import { pipeline } from 'node:stream/promises';
import { Transform, Readable } from 'node:stream';
import yargs from 'yargs';
import { generateCss } from './primo-style.js';

const argv = yargs(process.argv.slice(2))
  .option('server', {
    alias: 's',
    describe: 'Primo VE server (e.g. panda.primo.exlibrisgroup.com)'
  })
  .option('file', {
    alias: 'f',
    describe: 'Custom colors JSON file'
  })
  .demandOption(['server', 'file'])
  .argv;

const colorHookFilter = () => {
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

const css = await generateCss(argv.server, argv.file);
await pipeline(
  Readable.from(css.split("\n")),
  colorHookFilter(),
  process.stdout,
)
