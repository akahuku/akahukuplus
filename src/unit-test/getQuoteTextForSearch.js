import assert from 'node:assert/strict';
import 'jsdom-global/register.js';
//import {JSDOM} from 'jsdom';

import {getStringSimilarity} from '../chrome/lib/utils-apext.js';

function getQuoteTextForSearch (quoteLine, quoteComment, isSingleLine) {
	let result;
	if (isSingleLine) {
		result = quoteLine.textContent;
	}
	else {
		const r = document.createRange();
		r.selectNodeContents(quoteComment);
		for (let node = quoteLine; node; node = node.previousElementSibling) {
			if (node.nodeName === 'BR'
			 && node.nextElementSibling
			 && node.nextElementSibling.nodeName !== 'Q') {
				break;
			}
			if (node.nodeName === 'Q') {
				r.setStartBefore(node);
			}
		}
		for (let node = quoteLine; node; node = node.nextElementSibling) {
			if (node.nodeName === 'BR'
			 && node.nextElementSibling
			 && node.nextElementSibling.nodeName !== 'Q') {
				break;
			}
			if (node.nodeName === 'Q') {
				r.setEndAfter(node);
			}
		}
		result = r.toString();
	}
	return result.replace(/^\s*>\s*/, '').replace(/\n\s*>\s*/g, '\n');
}

/*
 * Jaro-Winkler implementation
 * @see https://github.com/jordanthomas/jaro-winkler
 */

function extend(a, b) {
	for (var property in b) {
		if (b.hasOwnProperty(property)) {
			a[property] = b[property];
		}
	}

	return a;
}
function distance(s1, s2, options) {
	var m = 0;
	var defaults = { caseSensitive: true };
	var settings = extend(defaults, options);
	var i;
	var j;

	// Exit early if either are empty.
	if (s1.length === 0 || s2.length === 0) {
		return 0;
	}

	// Convert to upper if case-sensitive is false.
	if (!settings.caseSensitive) {
		s1 = s1.toUpperCase();
		s2 = s2.toUpperCase();
	}

	// Exit early if they're an exact match.
	if (s1 === s2) {
		return 1;
	}

	var range = (Math.floor(Math.max(s1.length, s2.length) / 2)) - 1;
	var s1Matches = new Array(s1.length);
	var s2Matches = new Array(s2.length);

	for (i = 0; i < s1.length; i++) {
		var low  = (i >= range) ? i - range : 0;
		var high = (i + range <= (s2.length - 1)) ? (i + range) : (s2.length - 1);

		for (j = low; j <= high; j++) {
			if (s1Matches[i] !== true && s2Matches[j] !== true && s1[i] === s2[j]) {
				++m;
				s1Matches[i] = s2Matches[j] = true;
				break;
			}
		}
	}

	// Exit early if no matches were found.
	if (m === 0) {
		return 0;
	}

	// Count the transpositions.
	var k = 0;
	var numTrans = 0;

	for (i = 0; i < s1.length; i++) {
		if (s1Matches[i] === true) {
			for (j = k; j < s2.length; j++) {
				if (s2Matches[j] === true) {
					k = j + 1;
					break;
				}
			}

			if (s1[i] !== s2[j]) {
				++numTrans;
			}
		}
	}

	var weight = (m / s1.length + m / s2.length + (m - (numTrans / 2)) / m) / 3;
	var l = 0;
	var p = 0.1;

	if (weight > 0.7) {
		while (s1[l] === s2[l] && l < 4) {
			++l;
		}

		weight = weight + l * p * (1 - weight);
	}

	return weight;
}

// levenshtein function from base4esc.js
function levenshtein(s1, s2) {//Levenshtein distance
	// http://kevin.vanzonneveld.net
	// +            original by: Carlos R. L. Rodrigues (http://www.jsfromhell.com)
	// +            bugfixed by: Onno Marsman
	// +             revised by: Andrea Giammarchi (http://webreflection.blogspot.com)
	// + reimplemented by: Brett Zamir (http://brett-zamir.me)
	// + reimplemented by: Alexander M Beedie
	// *                example 1: levenshtein('Kevin van Zonneveld', 'Kevin van Sommeveld');
	// *                returns 1: 3
	if (s1 == s2) {
		return 0;
	}
	var s1_len = s1.length;
	var s2_len = s2.length;
	if (s1_len === 0) {
		return s2_len;
	}
	if (s2_len === 0) {
		return s1_len;
	}  // BEGIN STATIC
	var split = false;
	try {
		split = !('0') [0];
	} catch (e) {
		split = true; // Earlier IE may not support access by string index
	}  // END STATIC
	if (split) {
		s1 = s1.split('');
		s2 = s2.split('');
	}
	var v0 = new Array(s1_len + 1);
	var v1 = new Array(s1_len + 1);
	var s1_idx = 0,
	s2_idx = 0,
	cost = 0;
	for (s1_idx = 0; s1_idx < s1_len + 1; s1_idx++) {
		v0[s1_idx] = s1_idx;
	}
	var char_s1 = '',
	char_s2 = '';
	for (s2_idx = 1; s2_idx <= s2_len; s2_idx++) {
		v1[0] = s2_idx;
		char_s2 = s2[s2_idx - 1];
		for (s1_idx = 0; s1_idx < s1_len; s1_idx++) {
			char_s1 = s1[s1_idx];
			cost = (char_s1 == char_s2) ? 0 : 1;
			var m_min = v0[s1_idx + 1] + 1;
			var b = v1[s1_idx] + 1;
			var c = v0[s1_idx] + cost;
			if (b < m_min) {
				m_min = b;
			}
			if (c < m_min) {
				m_min = c;
			}
			v1[s1_idx + 1] = m_min;
		}
		var v_tmp = v0;
		v0 = v1;
		v1 = v_tmp;
	}
	return v0[s1_len];
}

// futakuro aimai function
function futakuro_aimai (segments, posts, L) {
	const m = [];
	for (let j = 0; j < segments.length; j++) {
		m.push(new RegExp("[^;]" + segments[j].replace(/\W/g, "\\$&")));
	}
	let r = 0;
	let res_text;
	for (let e = posts.length - 1; 0 <= e; e--) {
		const g = L ?
			posts[e].replace(/<font color="#789922"[\S\s]*?<\/font>/img, "")
				.replace(/([^<>]*)(<[^>]+>)([^<>]*)/g, "$1$3")
				.replace(/&nbsp;/g, "") :
			posts[e].replace(/<span class=s3[\S\s]*?<\/span>/img, "")
				.replace(/([^<>]*)(<[^>]+>)([^<>]*)/g, "$1$3")
				.replace(/&nbsp;/g, "");
		let v = 0;
		for (let j = 0; j < m.length; j++) {
			if (1 < segments[j].length && g.match(m[j], "im")) {
				v += segments[j].length;
			}
		}
		if (v > r) {
			res_text = posts[e];
			r = v;
		}
	}
	return r;
}

/*
 * tests
 */

describe('getQuoteTextForSearch', () => {
	it('single line quote', () => {
		document.body.innerHTML = `
<div id="comment">
<q id="q1">&gt;広告消せばいいのに…</q>
<br>なら払わせてくれよ…</div>
		`;

		const result = getQuoteTextForSearch(
			document.getElementById('q1'),
			document.getElementById('comment')
		);
		assert.equal(result, '広告消せばいいのに…');
	});

	it('2 lines quote', () => {
		document.body.innerHTML = `
<div id="comment">
<q>&gt;other quote</q>
<br>other text
<br><q id="q1">&gt;お休みの時は部屋で2周目見るタイプのオタク</q>
<br>&#160;<q id="q2">&gt;同部屋の清夏ちゃんは何を思う</q>
<br>リーリヤそれこないだも見てなかった？</div>
		`;

		const result1 = getQuoteTextForSearch(
			document.getElementById('q1'),
			document.getElementById('comment')
		);
		assert.equal(result1, 'お休みの時は部屋で2周目見るタイプのオタク\n同部屋の清夏ちゃんは何を思う');

		const result2 = getQuoteTextForSearch(
			document.getElementById('q2'),
			document.getElementById('comment')
		);
		assert.equal(result2, 'お休みの時は部屋で2周目見るタイプのオタク\n同部屋の清夏ちゃんは何を思う');
	});

	it('nested quote', () => {
		document.body.innerHTML = `
<div id="comment">
<q id="q1">&gt;&gt;そんな…ハマタもゴム人間だったなんて…</q>
<br><q id="q2">&gt;その方が面白いな</q>
<br>絶対にバレてはいけないゴム人間24時
		`;

		const result1 = getQuoteTextForSearch(
			document.getElementById('q1'),
			document.getElementById('comment')
		);
		assert.equal(result1, '>そんな…ハマタもゴム人間だったなんて…\nその方が面白いな');

		const result2 = getQuoteTextForSearch(
			document.getElementById('q2'),
			document.getElementById('comment')
		);
		assert.equal(result2, '>そんな…ハマタもゴム人間だったなんて…\nその方が面白いな');
	});

	it('similarity test', () => {
		const tests = [
			[
				'MARTHA', 'MARHTA'
			],
			[
				'DWAYNE', 'DUANE'
			],
			[
				'DIXON', 'DICKSONX'
			],
			[
				'MARTHA', 'MARTHA'
			],
			[
				'mArThA', 'MaRtHa', {caseSensitive: false}
			],
			[
				'crème brûlée',
				'creme brulee'
			],
			[
				'v23でcjsをimportできるようになったからまだまだ続くんじゃよ',
				'またまた',
			],
			[
				// ぺ: U+307A
				'おぺにすAがあらわれた！',
				// ぺ: U+3078 U+309A
				'おぺにすBがあらわれた！',
			]
		];

		for (const [s1, s2, option = {}] of tests) {
			console.log([
				`string 1: "${s1.replace(/\n/g, '\\n')}"`,
				`string 2: "${s2.replace(/\n/g, '\\n')}"`,
			].join('\n'));

			const result2 = getStringSimilarity(
				s1, s2,
				{...option, normalize: true});
			console.log(`\tJaro-Winkler impl: ${result2}`);

			const result1 = distance(s1, s2, option);
			console.log(`\t  referenced impl: ${result1}`);

			assert.ok(Math.abs(result1 - result2) <= 0.20);
		}
	});

	it('futaba\'s ambiguity search', () => {
		const tests = [
			[
				'わあいあんこ あかりあんこだいすき',
				'わぁいあんこ あかりあんこだいすき',
				1
			],
			[
				'わあいあんこ あかりあんこだいすき',
				'はわいあんこーひー あかりはわいあんこーひーだいすき',
				11
			],
			[
				'わあいあんこ あかりあんこだいすき',
				'わぁいちんこ！あかリちんこだいすこ',
				8
			]
		];

		for (const test of tests) {
			console.log([
				`string 1: "${test[0].replace(/\n/g, '\\n')}"`,
				`string 2: "${test[1].replace(/\n/g, '\\n')}"`,
			].join('\n'));

			const result1 = levenshtein(test[0], test[1]);
			console.log(`\tlevenshtein result: ${result1}`);
			assert.equal(result1, test[2]);
		}
	});

	it('futakuro\'s ambiguity search', () => {
		/*
		 * note: Futakuro's ambiguity search is implemented as a morpheme-by-morpheme match.
		 */
		const result = futakuro_aimai(
			['わあい', 'あんこ', ' ', 'あかり', 'あんこ', 'だい', 'すき'],
			[
				'わぁいちんこ！あかリちんこだいすこ'
			]
		);
		console.log(`futakuro_aimai result: ${result}`);
		assert.equal(result, 0);
	});
});
