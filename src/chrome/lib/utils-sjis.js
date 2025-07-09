/**
 * encoding utilities
 *
 *
 * Copyright 2012-2025 akahuku, akahuku@gmail.com
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

import {to_sjis_main} from './sjis.js';

let substChar = '?'.charCodeAt(0);

function toSjisCore (s) {
	const main = to_sjis_main;
	const push = Array.prototype.push;
	const result = [];

	for (let i = 0, goal = s.length; i < goal; i++) {
		let cp = s.charCodeAt(i);
		let key = cp.toString(16);

		// surrogate pair
		if (cp >= 0xd800 && cp <= 0xdb7f) {
			if (i >= goal - 1) {
				result.push(substChar);
				continue;
			}

			const lcp = s.charCodeAt(i + 1);
			if (!(lcp >= 0xdc00 && lcp <= 0xdfff)) {
				result.push(substChar);
				continue;
			}

			cp = ((cp & 0x03c0) + 0x0040) << 10
				| (cp & 0x003f) << 10
				| (lcp & 0x03ff);
			key += ',' + lcp.toString(16);
			i++;
		}

		if (key in main) {
			push.apply(result, main[key]);
		}
		else {
			if (cp < 128) {
				result.push(cp);
			}
			else {
				push.apply(
					result,
					('&#' + cp + ';').split('').map(a => a.charCodeAt(0)));
			}
		}
	}

	return result;
}

function toSjis (s) {
	let result;

	if (typeof s === 'string') {
		result = toSjisCore(s);
	}
	else if (s instanceof Array) {
		result = [];
		for (let i = 0, goal = s.length; i < goal; i++) {
			result[i] = toSjis(s[i]);
		}
	}
	else if (typeof s === 'object') {
		result = {};
		for (let i in s) {
			result[i] = toSjis(s[i]);
		}
	}

	return result;
}

function nop () {
	return substChar;
}

export const SjisUtils = {
	get substChar () {return substChar},
	set substChar (v) {substChar = ('' + v).charCodeAt(0)},
	toSjis: to_sjis_main ? toSjis : nop
};

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
