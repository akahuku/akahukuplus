#!/usr/bin/env node

import fs from 'node:fs';
import {default as nodePath} from 'node:path';
import * as url from 'node:url';

import {to_sjis_main} from '../src/chrome/backend/module/EncodeTableSjis.js';
import Encoding from 'encoding-japanese';

const dirname = nodePath.dirname(url.fileURLToPath(import.meta.url));

const KNOWN_MAP = new Map([
	[0xa2, [0x81,0x91]],	/* ¢ */
	[0xa3, [0x81,0x92]],	/* £ */
	[0xa5, [0x5c]],			/* ¥ */
	[0xa7, [0x81,0x98]],	/* § */
	[0xa8, [0x81,0x4e]],	/* ¨ */
	[0xac, [0x81,0xca]],	/* ¬ */
	[0xb0, [0x81,0x8b]],	/* ° */
	[0xb1, [0x81,0x7d]],	/* ± */
	[0xb4, [0x81,0x4c]],	/* ´ */
	[0xb6, [0x81,0xf7]],	/* ¶ */
	[0xd7, [0x81,0x7e]],	/* × */
	[0xf7, [0x81,0x80]],	/* ÷ */
	[0x203e, [0x7e]],		/* ‾ */
	[0x301c, [0x81, 0x60]],	/* 〜 */
]);

function printHeader () {
	process.stdout.write(`\
/**
 * shift_jis encoding table
 */

/**
 * Copyright 2012-2024 akahuku, akahuku@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

`);
}

function printFooter () {
	process.stdout.write(`\

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :`);
}

function printTable () {
	const te = new TextEncoder();
	const codes = [];
	let code = ' '.repeat(8);
	let count = 0;

	for (let i = 0; i < 0x10000; i++) {
		const from = String.fromCodePoint(i);
		const to = KNOWN_MAP.get(i) ?? Encoding.convert(te.encode(from), {
			to: 'sjis',
			fallback: 'ignore',
			type: 'array'
		});

		if (to.length === 0) continue;
		if (to[0] > 0xea
		 || to[0] === 0xea && to[1] >= 0xa5) continue;

		const comment = i >= 128 ? `/*${from}*/` : ``;
		const bytes = '[' + to.map(a => '0x' + a.toString(16)).join(',') + ']';
		code += `"${i.toString(16)}":${comment}${bytes}, `;

		if (code.length > 80) {
			codes.push(code);
			code = ' '.repeat(8);
		}

		count++;
	}

	if (/^\S+$/.test(code)) {
		codes.push(code);
	}

	codes[codes.length - 1] = codes[codes.length - 1].replace(/,\s*$/, '');

	console.log(`export const to_sjis_main = {`);
	codes.forEach(code => {
		console.log(code
			.replace(/^\s+/, '\t')
			.replace(/\s+$/, ''));
	});
	console.log(`\
};
// total ${count} code points

export const to_sjis_sub = {
};`);

	return count;
}

function test () {
	const te = new TextEncoder();
	let total = 0;
	for (let i = 0x0; i < 0xffff; i++) {
		const from = String.fromCodePoint(i);
		const sjis = KNOWN_MAP.get(i) ?? Encoding.convert(
			te.encode(from),
			{
				to: 'sjis',
				fallback: 'ignore',
				type: 'array'
			});

		if (sjis.length === 0) {
			if (i.toString(16) in to_sjis_main) {
				const sjis2 = to_sjis_main[i.toString(16)];

				console.log('*** EncodeTableSjis.js has data, but Encoding has not ***');
				process.stdout.write('U+' + i.toString(16) + ' (' + String.fromCodePoint(i) + '): ');
				console.log(' sjis2: ' + sjis2.map(a => '0x' + a.toString(16)).join(', '));
			}
			continue;
		}

		if (sjis[0] > 0xea
		 || sjis[0] === 0xea && sjis[1] >= 0xa5) continue;

		total++;

		if (i.toString(16) in to_sjis_main) {
			let message;

			const sjis2 = to_sjis_main[i.toString(16)];
			if (sjis.length !== sjis2.length) {
				message = '*** length unmatch ***';
			}
			else {
				for (let j = 0; j < sjis.length; j++) {
					if (sjis[j] !== sjis2[j]) {
						message = '*** different convertion ***';
						break;
					}
				}
			}

			if (message) {
				process.stdout.write('U+' + i.toString(16) + ': ');
				console.log(' sjis: ' + sjis.map(a => '0x' + a.toString(16)).join(', '));
				console.log('sjis2: ' + sjis2.map(a => '0x' + a.toString(16)).join(', '));
				console.log(message);
			}
		}
		else {
			/*
			process.stdout.write('U+' + i.toString(16) + ' (' + String.fromCodePoint(i) + '): ');
			console.log(' sjis: ' + sjis.map(a => '0x' + a.toString(16)).join(', '));
			*/
		}
	}

	console.log(`total: ${total} code points`);
}

//test();

printHeader();
printTable();
printFooter();
