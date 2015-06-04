/**
 * encoding utilities
 *
 * @author akahuku@gmail.com
 */

(function () {
	'use strict';

	var to_sjis_main;
	var substChar = '?'.charCodeAt(0);

	(function (table) {
		if (!table) return;
		to_sjis_main = table.to_sjis_main;
	})(require('./EncodeTableSjis'));

	function toSjisCore (s) {
		var main = to_sjis_main;
		var push = Array.prototype.push;
		var result = [];

		for (var i = 0, goal = s.length; i < goal; i++) {
			var cp = s.charCodeAt(i);
			var key = cp.toString(16);

			// surrogate pair
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
		toSjis: to_sjis_main ? toSjis : nop
	};

})();

/*
 * tests
 */

(function () {
	function test (expected, pattern) {
		expected = expected.reduce(function (a, b) {return a.concat(b)}, []);
		var actual = require('./SjisUtils').SjisUtils.toSjis(pattern);
		var buffer = ['*** TEST FAILED IN SJISUTILS ***', 'pattern: "' + pattern + '"'];
		var errored = false;
		if (!actual) {
			buffer.push('toSjis returned invalid value');
			console.error(buffer.join('\n'));
			return;
		}

		// EXPECTED    ACTUAL
		// ==========  ==========
		// 000(0x00)   000(0x00)
		buffer.push(
			'EXPECTED    ACTUAL    ',
			'==========  =========='
		);
		for (var i = 0, goal = Math.max(actual.length, expected.length); i < goal; i++) {
			var line = '';
			if (i < expected.length) {
				line += ('   ' + expected[i]).substr(-3);
				line += '(0x' + ('00' + expected[i].toString(16)).substr(-2) + ')';
				if (expected[i] >= 32 && expected[i] <= 127) {
					line += String.fromCharCode(expected[i]);
				}
				else {
					line += ' ';
				}
			}
			else {
				line += '          ';
			}

			line += '  ';

			if (i < actual.length) {
				line += ('   ' + actual[i]).substr(-3);
				line += '(0x' + ('00' + actual[i].toString(16)).substr(-2) + ')';
				if (actual[i] >= 32 && actual[i] <= 127) {
					line += String.fromCharCode(actual[i]);
				}
				else {
					line += ' ';
				}
			}
			else {
				line += '          ';
			}

			if (expected[i] != actual[i]) {
				line += '  *** Unmatched! ***';
				errored = true;
			}

			buffer.push(line);
		}

		errored && console.error(buffer.join('\n'));
	}

	function s (s) {
		return s.split('').map(function (a) {return a.charCodeAt(0)});
	}

	/*
	 * u+ff5e conversion
	 */
	test(
		[0x82,0xb3, 0x82,0xde, 0x82,0xa2, 0x82,0xe6, 0x81,0x60],
		'さむいよ～');

	/*
	 * u+301c conversion
	 *
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
	test(
		[130,177, 130,241, 130,201, 130,191, 130,205, 129,96],
		'こんにちは〜');

	/*
	 * 0x82    130
	 * 0xa9    169
	 *
	 * "&#12442"
	 *
	 * 0x82    130
	 * 0xc1    193
	 *
	 * 0x82    130
	 * 0xa9    169
	 *
	 * 0x82    130
	 * 0xc1    193
	 *
	 * 0x82    130
	 * 0xa9    169
	 */
	test(
		[130,169, s('&#12442;'), 130,193, 130,169, 130,193, 130,169],
		'\u304b\u309aっかっか'); // か゚っかっか

	/*
	 * "&#230;&#768;&#230;"
	 */
	test(
		s('&#230;&#768;&#230;'),
		'\u00e6\u0300\u00e6'); //æ̀æ

	/*
	 * "&#596;&#596;&#768;&#596;&#769;&#596;"
	 */
	test(
		[s('&#596;&#596;&#768;&#596;&#769;&#596;')],
		'\u0254\u0254\u0300\u0254\u0301\u0254'); // ɔɔ̀ɔ́ɔ

	/*
	 * valid surrogate pair and invalid surrogate pair
	 * ===============================================
	 *
	 * expected:
	 *
	 * "&#131083;??"
	 */
	test(
		s('&#131083;??'),
		'\ud840\udc0b\ud840\ud840');

	/*
	 * ascii text
	 */
	test(
		s('ascii text.'),
		'ascii text.');

	/*
	 * out of sjis range
	 * =================
	 *
	 * expected:
	 *
	 * "&#3061;"
	 */
	test(
		s('&#3061;'),
		'\u0bf5'); // ௵

	/*
	 * out of sjis range, Latin-1 Supplement
	 * =====================================
	 *
	 * expected:
	 *
	 * "&#192;&#193;"
	 */
	test(
		s('&#192;&#193;'),
		'\u00c0\u00c1');
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
