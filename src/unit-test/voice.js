import assert from 'node:assert/strict';
import {voice} from '../chrome/lib/utils-apext.js';

describe('voice', () => {
	it('should convert katakana/higarana to voiced one', () => {
		const source = '修行でもしてんのが';
		const result = voice(source);
		assert.equal(result, '修行でも゙じでん゙の゙が');
	});
});

describe('semi voice', () => {
	it('should convert katakana/higarana to semi voiced one', () => {
		const source = 'ククの妹でもありマス';
		const result = voice(source, true);
		assert.equal(result, 'ク゚ク゚の゚妹でも゚あ゚り゚マ゚ス゚');
	});
});
