#!/usr/bin/env -S node --preserve-symlinks

import * as util from 'node:util';
import fs from 'node:fs';
import readline from 'node:readline';
import {default as nodePath} from 'node:path';
import {minify} from 'terser';

function printHelp () {
	const name = nodePath.basename(process.argv[1]);
	console.log(`\
${name} -- minify a js source code with terser, and strip debug code blocks
usage: ${name} [options] path/to/sourcecode...
  -c <path>
  --config <path>    path to configuration file for terser
  -o
  --stdout           output the result to stdout, instead of in-place editing
  -v
  --verbose          turn verbose mode on
`);
	process.exit(1);
}

function parseArgs () {
	const args = util.parseArgs({
		options: {
			'help':    {type: 'boolean', short: 'h'},
			'?':       {type: 'boolean'},
			'verbose': {type: 'boolean', short: 'v'},
			'config':  {type: 'string', short: 'c'},
			'stdout':  {type: 'boolean', short: 'o'}
		},
		strict: true,
		allowPositionals: true
	});

	if (args.values.help || args.values['?']) {
		printHelp();
	}

	return {
		config: args.values.config ?? args.values.c ?? null,
		stdout: args.values.stdout ?? args.values.o ?? false,
		positionals: args.positionals
	};
}

async function stripDebugCode (path) {
	const buffer = [];

	const stream = fs.createReadStream(path);
	try {
		const rl = readline.createInterface({
			input: stream,
			crlfDelay: Infinity,
		});
		let isInDebugCode = false;

		for await (const line of rl) {
			if (/###DEBUG\s+CODE\s+END###/.test(line)) {
				if (isInDebugCode) {
					isInDebugCode = false;
					continue;
				}
				else {
					throw new Error('invalid debug code structure (END)');
				}
			}
			else if (/###DEBUG\s+CODE\s+START###/.test(line)) {
				if (isInDebugCode) {
					throw new Error('invalid debug code structure (START)');
				}
				else {
					isInDebugCode = true;
					continue;
				}
			}

			if (!isInDebugCode) {
				buffer.push(line);
			}
		}
	}
	finally {
		stream.close();
	}

	return buffer.join('\n');
}

async function minifyAndWrite (path) {
	const code = await stripDebugCode(path);
	const result = await minify(code, args.terserConfig);
	if (args.stdout) {
		console.log(result.code);
	}
	else {
		await fs.promises.writeFile(path, result.code, 'utf8');
		console.log(`processed: ${path}`);
	}
};

const args = parseArgs();

try {
	if (args.positionals.length === 0) {
		console.error('no file path specified.');
		printHelp();
	}

	args.terserConfig = args.config ?
		JSON.parse(await fs.promises.readFile(args.config, 'utf8')) :
		null;

	await Promise.all(args.positionals.map(path => minifyAndWrite(path)));
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
