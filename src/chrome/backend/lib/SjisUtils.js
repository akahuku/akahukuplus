/**
 * encoding utilities
 *
 * @author akahuku@gmail.com
 */

(function () {
	'use strict';

	var to_sjis_main;
	var to_sjis_sub;

	var substChar = '?'.charCodeAt(0);

	(function (table) {
		if (!table) return;
		to_sjis_main = table.to_sjis_main;
		to_sjis_sub = table.to_sjis_sub;
	})(require('./EncodeTableSjis'));

	function toSjisCore (s) {
		var main = to_sjis_main;
		var sub = to_sjis_sub;
		var push = Array.prototype.push;
		var result = [];

		for (var i = 0, goal = s.length; i < goal; i++) {
			var cp = s.charCodeAt(i);
			var key = cp.toString(16);

			if (key in sub) {
				var subMatched = false;

				for (var j = 0; j < sub[key].length; j++) {
					var seq = sub[key][j];
					if (i >= goal - seq.length) {
						continue;
					}

					var tmp = [key];

					for (var k = 1; k < seq.length && s.charCodeAt(i + k) == seq[k]; k++) {
						tmp.push(seq[k]);
					}

					if (tmp.length != seq.length) {
						continue;
					}

					tmp = tmp.map(function (n) {return n.toString(16)}).join(',');

					if (tmp in main) {
						subMatched = true;
						push.apply(result, main[tmp]);
						i += seq.length - 1;
						break;
					}
				}

				if (subMatched) {
					continue;
				}
			}

			if (cp >= 0xd800 && cp <= 0xdb7f) {
				if (i >= goal - 1) {
					result.push(substChar);
					continue;
				}

				var lcp = s.charCodeAt(i + 1);
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
						('&#' + cp + ';').split('').map(function (a) {return a.charCodeAt(0)}));
				}
			}
		}

		return result;
	}

	function toSjis (s) {
		var result;

		if (typeof s == 'string') {
			result = toSjisCore(s);
		}
		else if (s instanceof Array) {
			result = [];
			for (var i = 0, goal = s.length; i < goal; i++) {
				result[i] = toSjis(s[i]);
			}
		}
		else if (typeof s == 'object') {
			result = {};
			for (var i in s) {
				result[i] = toSjis(s[i]);
			}
		}

		return result;
	}

	function nop (s) {
		return substChar;
	}

	exports.SjisUtils = {
		get substChar () {return substChar},
		set substChar (v) {substChar = ('' + v).charCodeAt(0)},
		toSjis: to_sjis_main && to_sjis_sub ? toSjis : nop
	};

})();

/*
 * tests
 */

(function () {
	function test (expected, pattern) {
		var actual = require('./SjisUtils').SjisUtils.toSjis(pattern);
		if (!actual || actual.length != expected.length) {
			console.error('*** TEST FAILED ***');
			return;
		}

		var buffer = [];
		var errored = false;
		for (var i = 0; i < actual.length; i++) {
			var ch = actual[i];
			var t = '0x' + ch.toString(16) + '\t' + ch;
			if (ch >= 0x20 && ch < 0x7f) {
				t += '\t"' + String.fromCharCode(ch) + '"';
			}
			buffer.push(t);

			if (actual[i] !== expected[i]) {
				buffer.push('*** TEST FAILED ***');
				errored = true;
				break;
			}
		}

		errored && console.error(buffer.join('\n'));
	}

	/*
	 */
	test([0x82, 0xb3, 0x82, 0xde, 0x82, 0xa2, 0x82, 0xe6, 0x81, 0x60], 'さむいよ～');

	/*
	 * 0x82    130
	 * 0xb1    177
	 * 0x82    130
	 * 0xf1    241
	 * 0x82    130
	 * 0xc9    201
	 * 0x82    130
	 * 0xbf    191
	 * 0x82    130
	 * 0xcd    205
	 * 0x81    129
	 * 0x60     96
	 */
	test([130, 177, 130, 241, 130, 201, 130, 191, 130, 205, 129, 96], 'こんにちは～');

	/*
	 * 0x82    130
	 * 0xf5    245
	 * 0x82    130
	 * 0xc1    193
	 * 0x82    130
	 * 0xa9    169
	 * 0x82    130
	 * 0xc1    193
	 * 0x82    130
	 * 0xa9    169
	 */
	test([130, 245, 130, 193, 130, 169, 130, 193, 130, 169], '\u304b\u309aっかっか');

	/*
	 * 0x86    134
	 * 0x63     99    "c"
	 * 0x85    133
	 * 0x7b    123    "{"
	 */
	test([134, 99, 133, 123], '\u00e6\u0300\u00e6');

	/*
	 * 0x86    134
	 * 0x57     87    "W"
	 * 0x86    134
	 * 0x67    103    "g"
	 * 0x86    134
	 * 0x68    104    "h"
	 * 0x86    134
	 * 0x57     87    "W"
	 */
	test([134, 87, 134, 103, 134, 104, 134, 87], '\u0254\u0254\u0300\u0254\u0301\u0254');

	/*
	 * 0x87    135
	 * 0xa0    160
	 * 0x3f     63    "?"
	 * 0x3f     63    "?"
	 */
	test([135, 160, 63, 63], '\ud840\udc0b\ud840\ud840');

	/*
	 * 0x61     97    "a"
	 * 0x73    115    "s"
	 * 0x63     99    "c"
	 * 0x69    105    "i"
	 * 0x69    105    "i"
	 * 0x20     32    " "
	 * 0x74    116    "t"
	 * 0x65    101    "e"
	 * 0x78    120    "x"
	 * 0x74    116    "t"
	 * 0x2e     46    "."
	 */
	test([97, 115, 99, 105, 105, 32, 116, 101, 120, 116, 46], 'ascii text.');

	/*
	 * 0x26     38    "&"
	 * 0x23     35    "#"
	 * 0x33     51    "3"
	 * 0x30     48    "0"
	 * 0x36     54    "6"
	 * 0x31     49    "1"
	 * 0x3b     59    ";"
	 */
	test([38, 35, 51, 48, 54, 49, 59], '\u0bf5');
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
