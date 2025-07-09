#!/usr/bin/env node

import fs from 'node:fs/promises';
import {default as nodePath} from 'node:path';
import * as url from 'node:url';
import * as util from 'node:util';

import {parseExtendJson} from '../src/chrome/lib/utils-apext.js';

const dirname = nodePath.dirname(url.fileURLToPath(import.meta.url));

function printHelp () {
	const name = nodePath.basename(process.argv[1]);
	console.log(`\
${name} -- convert extend json to normal json
usage: ${name} [options] path/to/source.json
options:
  -i
  --in-place  directly update the file given as an argument
`);
	process.exit(1);
}

function parseArgs () {
	try {
		const args = util.parseArgs({
			options: {
				'help':    {type: 'boolean', short: 'h'},
				'verbose': {type: 'boolean', short: 'v'},
				'?':       {type: 'boolean'},
				'in-place': {type: 'boolean', short: 'i'}
			},
			strict: true,
			allowPositionals: true
		});

		if (args.values.help || args.values['?']) {
			printHelp();
		}
		if (args.positionals.length === 0) {
			console.error('missing a path to source json file.');
			printHelp();
		}
		return {
			source: args.positionals[0],
			inPlace: args.values['in-place'] ?? args.values.i,
			verbose: !!args.values.verbose
		};
	}
	catch (err) {
		console.error(err.message);
		printHelp();
	}
}

const args = parseArgs();

try {
	let content = parseExtendJson(await fs.readFile(args.source, 'utf8'));
	content = JSON.stringify(content, null, '    ');

	if (args.inPlace) {
		await fs.writeFile(args.source, content, 'utf8');
		console.log(`processed: ${args.source}`);
	}
	else {
		console.log(content);
	}
}
catch (err) {
	if (args.verbose) {
		console.error(err.stack);
	}
	else {
		console.error(err.message);
	}
	process.exit(1);
}
