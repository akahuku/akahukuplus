/**
 * utility functions for reply seach for akahukuplus
 *
 *
 * Copyright 2022-2025 akahuku, akahuku@gmail.com
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

import {_} from './utils.js';

export function createQueryCompiler () {
	const lex = /-?"[^"]*"|-?\(|\)|\||[^\s|)]+/g;
	const instructions = [];
	let query;
	let lastIndex;
	let reachedToEof;

	function next () {
		if (reachedToEof) return null;
		lastIndex = lex.lastIndex;
		let re = lex.exec(query);
		if (re) return re[0];
		reachedToEof = true;
		return null;
	}

	function unget () {
		if (lastIndex < 0) {
			throw new Error('double unget');
		}
		lex.lastIndex = lastIndex;
		lastIndex = -1;
	}

	function or (v) {
		let conjunctionCount = 0;
		let limit = 0x10000;
		while (--limit >= 0) {
			const a = and(v);
			if (!a && conjunctionCount) {
				throw _('there_is_no_word_after_pipe');
			}
			conjunctionCount++;

			v = next();
			if (v === null) {
				break;
			}
			else if (v !== '|') {
				unget();
				break;
			}
			else {
				v = next();
			}
		}

		if (limit <= 0) {
			throw _('too_many_pipe');
		}

		if (conjunctionCount > 1) {
			instructions.push({
				opcode: 'disjunction',
				operand: conjunctionCount
			});
		}

		return !!conjunctionCount;
	}

	function and (v) {
		let wordCount = 0;
		let excludedWordCount = 0;
		let limit = 0x10000;
		while (--limit >= 0) {
			const result = word(v);
			if (result) {
				if (result.excluded) {
					excludedWordCount++;
				}
				else {
					wordCount++;
				}
			}

			v = next();
			if (v === null) {
				break;
			}
			else if (v === '|' || v === ')') {
				unget();
				break;
			}
		}

		if (limit <= 0) {
			throw _('too_many_words');
		}

		if (excludedWordCount > 0 && wordCount === 0) {
			throw _('enter_least_one_word');
		}

		if (excludedWordCount + wordCount > 1) {
			instructions.push({
				opcode: 'conjunction',
				operand: excludedWordCount + wordCount
			});
		}

		return !!(excludedWordCount + wordCount);
	}

	function word (v) {
		if (v === '|') {
			throw _('enter_word_before_pipe');
		}
		else if (v === ')') {
			throw _('enter_word_before_paren');
		}
		else if (v === '(' || v === '-(') {
			or(next());
			v = next();
			if (v !== ')') {
				throw _('parentheses_are_unbalanced');
			}
			return {excluded: false};
		}
		else if (v !== null) {
			let excluded = false;

			if (v.charAt(0) === '-') {
				excluded = true;
				v = v.substring(1);
			}

			if (v.charAt(0) === '"' && v.substr(-1) === '"') {
				v = getLegalizedStringForSearch(v.substring(1, v.length - 1));
			}
			else {
				v = getLegalizedStringForSearch(v);
			}

			if (v === '') {
				return '';
			}

			instructions.push({
				opcode: excluded ? 'literal-exclude' : 'literal',
				operand: v
			});

			return {excluded};
		}
	}

	function compile (q) {
		instructions.length = 0;
		query = q.replace(/^\s+|\s+$/g, '');
		let result;
		if (query.charAt(0) === '/' && query.substr(-1) === '/') {
			try {
				query = query.substring(1, query.length - 1);
				query = query.replace(/(?<!\\)\^/g, '(?:^|\\t)');
				query = query.replace(/(?<!\\)\$/g, '(?:$|\\t)');
				const regex = new RegExp(query, 'i');
				result = {
					test: target => regex.test(target)
				};
			}
			catch {
				result = {
					test: () => false,
					message: _('invalid_regular_expression')
				};
			}
		}
		else {
			lex.lastIndex = lastIndex = 0;
			reachedToEof = false;

			try {
				//console.log(`query: "${query}"`);
				or(next());

				if (instructions.length === 0) {
					throw _('type_something');
				}

				/*
				console.log('[');
				for (const inst of instructions) {
					const operand = typeof inst.operand === 'string' ?
						`'${inst.operand}'` :
						inst.operand;
					console.log(`  ${inst.opcode} ${operand}`);
				}
				console.log(']');
				*/

				result = {
					test: createTester(instructions),
					instructions
				};
			}
			catch (e) {
				if (typeof e === 'string') {
					//console.log(`message: ${e}`);
					result = {
						test: () => false,
						message: e
					};
				}
				else {
					console.error(`exception: ${e.message}`);
					result = {
						test: () => false,
						error: e
					};
				}
			}
		}
		return result;
	}

	function createTester (instructions) {
		const opcodeMap = {
			'literal': 1,
			'literal-exclude': 2,
			'conjunction': 3,
			'disjunction': 4
		};
		instructions = instructions.map(inst => {
			return [opcodeMap[inst.opcode], inst.operand];
		});
		return line => {
			const stack = [];
			for (const [opcode, operand] of instructions) {
				switch (opcode) {
				case 1:
					stack.push(line.includes(operand) ? 1 : 0);
					break;

				case 2:
					stack.push(line.includes(operand) ? 0 : 1);
					break;

				case 3:
					{
						const popped = stack.splice(-operand);
						stack.push(popped.reduce((value, current) => value + current) === popped.length);
					}
					break;
				case 4:
					{
						const popped = stack.splice(-operand);
						stack.push(popped.some(value => !!value));
					}
					break;
				}
			}
			return !!stack[0];
		};
	}

	return {compile};
}

export const getLegalizedStringForSearch = (() => {
	const map = {
		// full width letter but except: ＼
		'　':' ',
		'！':'!', '＂':'"', '＃':'#', '＄':'$', '％':'%', '＆':'&',
		'＇':"'", '（':'(', '）':')', '＊':'*', '＋':'+', '，':',',
		'－':'-', '．':'.', '／':'/', '０':'0', '１':'1', '２':'2',
		'３':'3', '４':'4', '５':'5', '６':'6', '７':'7', '８':'8',
		'９':'9', '：':':', '；':';', '＜':'<', '＝':'=', '＞':'>',
		'？':'?', '＠':'@', 'Ａ':'a', 'Ｂ':'b', 'Ｃ':'c', 'Ｄ':'d',
		'Ｅ':'e', 'Ｆ':'f', 'Ｇ':'g', 'Ｈ':'h', 'Ｉ':'i', 'Ｊ':'j',
		'Ｋ':'k', 'Ｌ':'l', 'Ｍ':'m', 'Ｎ':'n', 'Ｏ':'o', 'Ｐ':'p',
		'Ｑ':'q', 'Ｒ':'r', 'Ｓ':'s', 'Ｔ':'t', 'Ｕ':'u', 'Ｖ':'v',
		'Ｗ':'w', 'Ｘ':'x', 'Ｙ':'u', 'Ｚ':'z', '［':'[', '］':']',
		'＾':'^', '＿':'_', '｀':'`', 'ａ':'a', 'ｂ':'b', 'ｃ':'c',
		'ｄ':'d', 'ｅ':'e', 'ｆ':'f', 'ｇ':'g', 'ｈ':'h', 'ｉ':'i',
		'ｊ':'j', 'ｋ':'k', 'ｌ':'l', 'ｍ':'m', 'ｎ':'n', 'ｏ':'o',
		'ｐ':'p', 'ｑ':'q', 'ｒ':'r', 'ｓ':'s', 'ｔ':'t', 'ｕ':'u',
		'ｖ':'v', 'ｗ':'w', 'ｘ':'x', 'ｙ':'y', 'ｚ':'z', '｛':'{',
		'｜':'|', '｝':'}', '～':'~',

		// half width kana
		'ｱ':'ア',  'ｲ':'イ',  'ｳ':'ウ',  'ｴ':'エ',  'ｵ':'オ',
								'ｳﾞ':'ヴ',
		'ｧ':'ァ',  'ｨ':'ィ',  'ｩ':'ゥ',  'ｪ':'ェ',  'ｫ':'ォ',
		'ｶ':'カ',  'ｷ':'キ',  'ｸ':'ク',  'ｹ':'ケ',  'ｺ':'コ',
		'ｶﾞ':'ガ', 'ｷﾞ':'ギ', 'ｸﾞ':'グ', 'ｹﾞ':'ゲ', 'ｺﾞ':'ゴ',
		'ｻ':'サ',  'ｼ':'シ',  'ｽ':'ス',  'ｾ':'セ',  'ｿ':'ソ',
		'ｻﾞ':'ザ', 'ｼﾞ':'ジ', 'ｽﾞ':'ズ', 'ｾﾞ':'ゼ', 'ｿﾞ':'ゾ',
		'ﾀ':'タ',  'ﾁ':'チ',  'ﾂ':'ツ',  'ﾃ':'テ',  'ﾄ':'ト',
		'ﾀﾞ':'ダ', 'ﾁﾞ':'ヂ', 'ﾂﾞ':'ヅ', 'ﾃﾞ':'デ', 'ﾄﾞ':'ド',
		'ｯ':'ッ',
		'ﾅ':'ナ',  'ﾆ':'ニ',  'ﾇ':'ヌ',  'ﾈ':'ネ',  'ﾉ':'ノ',
		'ﾊ':'ハ',  'ﾋ':'ヒ',  'ﾌ':'フ',  'ﾍ':'ヘ',  'ﾎ':'ホ',
		'ﾊﾞ':'バ', 'ﾋﾞ':'ビ', 'ﾌﾞ':'ブ', 'ﾍﾞ':'ベ', 'ﾎﾞ':'ボ',
		'ﾊﾟ':'パ', 'ﾋﾟ':'ピ', 'ﾌﾟ':'プ', 'ﾍﾟ':'ペ', 'ﾎﾟ':'ポ',
		'ﾏ':'マ',  'ﾐ':'ミ',  'ﾑ':'ム',  'ﾒ':'メ',  'ﾓ':'モ',
		'ﾔ':'ヤ',  'ﾕ':'ユ',  'ﾖ':'ヨ',
		'ｬ':'ャ',  'ｭ':'ュ',  'ｮ':'ョ',
		'ﾗ':'ラ',  'ﾘ':'リ',  'ﾙ':'ル',  'ﾚ':'レ',  'ﾛ':'ロ',
		'ﾜ':'ワ',  'ｦ':'ヲ',  'ﾝ':'ン',
		'ﾜﾞ':'ヷ',  'ｦﾞ':'ヺ',

		// half width letter
		'｡':'。',  '､':'、',  '｢':'「',  '｣':'」',  '･':'・', 'ｰ':'ー',
		'ﾞ':'゛',  'ﾟ':'゜'
	};

	/*
	 * @see https://ja.wikipedia.org/wiki/Unicodeにおけるラテン文字
	 */
	const latinDecomposePatterns = /[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F\u0250-\u02AF\u02B0-\u02FF\u1D00-\u1D7F\u1D80-\u1DBF\u1E00-\u1EFF\u2070-\u209F\u2100-\u214F\u2150-\u218F\u2C60-\u2C7F\uA720-\uA7FF\uAB30-\uAB6F\uFB00-\uFB4F\uFF00-\uFFEF]/g;

	const zeroWidthPatterns = /[\u034F\u200B\u200C\u200D\u200E\u200F\u2028\u2029\u202A\u202B\u202C\u202D\u202E\u2061\u2062\u2063\uFEFF]/g;

	const translatePatterns = new RegExp([
		'[\u3000\uff01-\uff3b\uff3d-\uff5e]',	// full width letter but except: ＼
		'[\uff66-\uff9d][ﾞﾟ]?',					// half width kana
		'[｡､｢｣･ｰﾞﾟ]'							// half width letter
	].join('|'), 'g');

	return s => {
		// ensure string
		s = ('' + s);

		// compose
		s = s.normalize('NFC');

		// strip diacritical marks from latin scripts
		s = s.replace(
			latinDecomposePatterns,
			$0 => $0.normalize('NFD').charAt(0).toLowerCase());

		// strip zero width spaces
		s = s.replace(
			zeroWidthPatterns, '');

		// other translates
		s = s.replace(translatePatterns, $0 => {
			// apply translate if mapped
			if ($0 in map) {
				return map[$0];
			}
			// kana + voiced mark
			if ($0.substr(-1) === 'ﾞ') {
				return map[$0[0]] + '\u3099';
			}
			// kana + semi voiced mark
			if ($0.substr(-1) === 'ﾟ') {
				return map[$0[0]] + '\u309a';
			}
			// MUST NOT REACHED
			return $0;
		});

		return s;
	};
})();
