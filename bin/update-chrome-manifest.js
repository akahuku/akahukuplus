#!/usr/bin/env node

import fs from 'node:fs/promises';
import {default as nodePath} from 'node:path';
import * as url from 'node:url';
import * as util from 'node:util';

const dirname = nodePath.dirname(url.fileURLToPath(import.meta.url));

function printHelp () {
	const name = nodePath.basename(process.argv[1]);
	console.log(`\
${name} -- update manifest.json for chrome extension / web extension
usage: ${name} [options]
options:
    --indir,-i DIR          required, path to extension source directory
    --outdir,-o DIR         required, path to destination directory
    --ver,-v VERSION        required, version string
    --strip-update-url      strip "update_url" key from manifest
    --strip-applications    strip "applications" key from manifest
    --update-url URL        the url points the file of update manifest
    --update-version-name   update "version-name" key
`);
	process.exit(1);
}

function parseArgs () {
	try {
		const args = util.parseArgs({
			options: {
				'help':    {type: 'boolean', short: 'h'},
				'verbose': {type: 'boolean', short: 'V'},
				'?':       {type: 'boolean'},

				'indir':   {type: 'string', short: 'i'},
				'outdir':  {type: 'string', short: 'o'},
				'ver':     {type: 'string', short: 'v'},
				'update-url': {type: 'string'},

				'strip-update-url': {type: 'boolean'},
				'strip-applications': {type: 'boolean'},
				'update-version-name': {type: 'boolean'}
			},
			strict: true,
		});

		let dir = '',
			outdir = '',
			ver = '',
			update_url = '',
			strip_update_url = false,
			strip_applications = false,
			update_version_name = false;

		if (args.values.help || args.values['?']) {
			printHelp();
		}

		if (args.values.indir) {
			dir = args.values.indir;
		}
		if (args.values.outdir) {
			outdir = args.values.outdir;
		}
		if (args.values.ver) {
			ver = args.values.ver;
		}
		if (args.values['update-url']) {
			update_url = args.values['update-url'];
		}

		if (args.values['strip-update-url']) {
			strip_update_url = true;
		}
		if (args.values['strip-applications']) {
			strip_applications = true;
		}
		if (args.values['update-version-name']) {
			update_version_name = true;
		}

		if (dir === '') {
			console.error('missing base directory.');
			printHelp();
		}
		if (ver === '') {
			console.error('missing version.');
			printHelp();
		}

		return {
			dir, outdir, ver, update_url,
			strip_update_url, strip_applications, update_version_name,
			verbose: !!args.values.verbose
		};
	}
	catch (err) {
		console.error(err.message);
		printHelp();
	}
}

async function loadJson (args) {
	let content;
	try {
		if (args.dir === '-') {
			const chunks = [];
			for await (const chunk of process.stdin) {
				chunks.push(chunk);
			}
			content = Buffer.concat(chunks).toString('utf8');
		}
		else {
			content = await fs.readFile(`${args.dir}/${manifest}`, 'utf8');
		}
		return JSON.parse(content);
	}
	catch (ex) {
		if (args.dir === '-') {
			console.log('cannot read from stdin');
		}
		else {
			console.log(`cannot read ${args.dir}/${manifest}`);
		}
		throw ex;
	}
}

const manifest = 'manifest.json';
const args = parseArgs();

try {
	const content = await loadJson(args);

	content.version = args.ver;

	if (args.update_url) {
		if ('browser_specific_settings' in content) {
			if (!('gecko' in content.browser_specific_settings)) {
				content.browser_specific_settings.gecko = {};
			}
			content.browser_specific_settings.gecko.update_url = args.update_url;
		}
		else {
			content.update_url = args.update_url;
		}
	}
	if (args.update_version_name && 'version_name' in content) {
		content.version_name = args.ver;
	}

	if (args.strip_update_url) {
		delete content.update_url;
	}
	if (args.strip_applications) {
		delete content.applications;
		delete content.browser_specific_settings;
	}

	if (args.outdir != '') {
		await fs.writeFile(
			`${args.outdir}/${manifest}`,
			JSON.stringify(content, null, '\t'),
			'utf8');
	}
	else {
		console.log(JSON.stringify(content, null, '\t'));
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
