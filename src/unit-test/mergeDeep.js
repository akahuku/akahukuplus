import assert from 'node:assert/strict';
import {mergeDeep} from '../chrome/lib/utils-apext.js';

describe('mergeDeep', () => {
	it('merge into empty object', () => {
		const source = {
			a: 100,
			b: [1, 2, 3],
			c: {
				A: 1000,
				B: [10, 2, 30],
				C: null
			}
		};
		const result = mergeDeep({}, source);
		assert.deepStrictEqual(result, {
			a: 100,
			b: [1, 2, 3],
			c: {
				A: 1000,
				B: [10, 2, 30],
				C: null
			}
		});
		assert.notStrictEqual(result, source);
	});

	it('append elements to array', () => {
		const source = {
			a: [1, 2, 3]
		};
		const result = mergeDeep({
			a: [100, 200, 300],
			b: 'b'
		}, source);
		assert.deepStrictEqual(result, {
			a: [100, 200, 300, 1, 2, 3],
			b: 'b'
		});
	});
});
