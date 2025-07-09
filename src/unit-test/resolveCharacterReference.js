import assert from 'node:assert/strict';
import 'jsdom-global/register.js';
import {resolveCharacterReference} from '../chrome/lib/utils-apext.js';

describe('resolveCharacterReference', () => {
	it('should convert numeric char-ref into itself', () => {
		const source = 'i like &#x1F363;!';
		const result = resolveCharacterReference(source);
		assert.equal(result, 'i like 🍣!');
	});

	it('should convert entity char-ref into itself', () => {
		const source = 'call &phone; 999-9999-9999';
		const result = resolveCharacterReference(source);
		assert.equal(result, 'call ☎ 999-9999-9999');
	});
});

