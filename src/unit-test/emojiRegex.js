import assert from 'node:assert/strict';

import {emojiRegex} from '../chrome/lib/utils-apext.js';

describe('emojiRegex', () => {
	it('emojiRegex', () => {
		const head = 'この文字は';
		const tail = '絵文字です';
		const tests = [
			'\u{1fae0}',					// 🫠
			'\u{00a9}\u{fe0f}',				// ©️
			'\u{1f1ef}\u{1f1f5}',			// 🇯🇵
			'\u{0031}\u{fe0f}\u{20e3}',		// 1️⃣
			'\u{1f44f}\u{1f3fd}',			// 👏🏽
			'\u{1f468}\u{200d}\u{1f468}\u{200d}\u{1f466}',	// 👨‍👨‍👦
			'\u{1f426}\u{200d}\u{1f525}'	// 🐦‍🔥
		];

		for (const test of tests) {
			const re = emojiRegex.exec(head + test + tail);
			assert.equal(re.index, head.length, `index of "${test}"`);
			assert.equal(re[0].length, test.length, `length of "${test}"`);
		}
	});
});
