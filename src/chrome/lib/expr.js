/**
 * expr.js
 *
 *
 * Copyright 2024-2025 akahuku, akahuku@gmail.com
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

export function expr (source) {
	const result = [];
	const tokens = [];
	const regex = /\s*([()+\-*/%]|0x[0-9a-f]+|0b[01_]+|0[0-7]+|(?:0|[1-9][0-9]*)\.[0-9]*(?:e[+-]?[0-9]+)*|\.[0-9]+(?:e[+-]?[0-9]+)*|(?:0|[1-9][0-9]*)(?:e[+-]?[0-9]+)*)/gi;

	let i = 0;

	function add () {
		let r = mul();
		let limit = 0x10000;
loop:	while (--limit >= 0) {
			switch (tokens[i++]) {
			case '+': r += mul(); break;
			case '-': r -= mul(); break;
			default: --i; break loop;
			}
		}
		if (limit <= 0) {
			throw new SyntaxError('The number of operands in the additive expression has exceeded the limit.');
		}
		return r;
	}
	function mul () {
		let r = fact();
		let limit = 0x10000;
loop:	while (--limit >= 0) {
			switch (tokens[i++]) {
			case '*': r *= fact(); break;
			case '/': r /= fact(); break;
			case '%': r %= fact(); break;
			default: --i; break loop;
			}
		}
		if (limit <= 0) {
			throw new SyntaxError('The number of operands in the multiply expression has exceeded the limit.');
		}
		return r;
	}
	function fact () {
		let r = tokens[i++];
		if (r === '(') {
			r = add();
			if (tokens[i++] !== ')') {
				throw new SyntaxError('Missing ")".');
			}
		}
		else {
			let sign = '';
			if (/^0x/.test(r)) {
				r = parseInt(r.substring(2), 16);
			}
			else if (/^0[0-7]+/.test(r)) {
				r = parseInt(r, 8);
			}
			else if (/^0b/.test(r)) {
				r = parseInt(r.substring(2).replace(/_/g, ''), 2);
			}
			else {
				if (r === '+' || r === '-') {
					sign = r;
					r = tokens[i++];
				}
				r = parseFloat(sign + r, 10);
			}
			if (isNaN(r)) {
				throw new SyntaxError('Missing a number.');
			}
		}
		return r;
	}

	function evalTokens (first, last) {
		if (tokens.length === 0) return;

		i = 0;
		try {
			let value = add();
			if (i < tokens.length) {
				result.push({
					first, last,
					input: source.substring(first, last),
					error: `Extra token: ${tokens[i].charAt(0)}`
				});
			}
			else {
				result.push({
					first, last,
					input: source.substring(first, last),
					value
				});
			}
		}
		catch (err) {
			result.push({
				first, last,
				input: source.substring(first, last),
				error: err.message
			});
		}
	}

	let firstMatchedIndex = -1, lastMatchedIndex = -1;

	for (let re; (re = regex.exec(source)); ) {
		if (lastMatchedIndex === -1) {
			firstMatchedIndex = re.index;
			tokens.push(re[1]);
		}
		else if (re.index === lastMatchedIndex) {
			tokens.push(re[1]);
		}
		else {
			evalTokens(firstMatchedIndex, lastMatchedIndex);
			tokens.length = 0;
			firstMatchedIndex = re.index;
			tokens.push(re[1]);
		}

		lastMatchedIndex = re.index + re[0].length;
	}

	evalTokens(firstMatchedIndex, lastMatchedIndex);

	return {result};
}
