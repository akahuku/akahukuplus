import assert from 'node:assert/strict';

function testfunc (...args) {
	const [paramA, paramB] = args;
	args = undefined;

	paramA *= 2;

	return {paramA, paramB};
}

describe('param override', () => {
	it('#1', () => {
		assert.throws(() => {
			const {paramA, paramB} = testfunc(100, 200);
		});
	});
});

