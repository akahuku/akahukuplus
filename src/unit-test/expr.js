import assert from 'node:assert/strict';
import {expr} from '../chrome/lib/expr.js';

describe('expr', () => {
	it('should return multiple result set', () => {
		const e = expr('abc1 2def(3+4)ghi');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 2);
		assert.deepEqual(e.result[0], {
			first: 3,
			last: 6,
			input: '1 2',
			error: 'Extra token: 2'
		});
		assert.deepEqual(e.result[1], {
			first: 9,
			last: 14,
			input: '(3+4)',
			value: 7
		});
	});

	it('should return empty set with empty string', () => {
		const e = expr('');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 0);
	});

	it('should throw error with invalid expression', () => {
		const e = expr('foobar');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 0);
	});

	it('should throw error with an expression which has extra token', () => {
		const e = expr('(1)2');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('error' in e.result[0]);
		assert.match(e.result[0].error, /^Extra token:/);
	});
	
	it('should throw error with unbalance paren', () => {
		const e = expr('(1');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('error' in e.result[0]);
		assert.match(e.result[0].error, /^Missing "\)"\./);
	});

	it('should throw error with incomplete plus sign', () => {
		const e = expr('+');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('error' in e.result[0]);
		assert.match(e.result[0].error, /^Missing a number\./);
	});

	/*
	it('should throw error with incomplete exponential float', () => {
		const e = expr('1.0e');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('error' in e.result[0]);
		assert.match(e.result[0].error, /^Invalid token:/);
	});

	it('should throw error with incomplete hex expression', () => {
		const e = expr('0x');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('error' in e.result[0]);
		assert.match(e.result[0].error, /^Invalid token:/);
	});
	*/

	it('should recognize + as plus sign', () => {
		const e = expr('+1');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 1);
	});

	it('should recognize + as plus sign, even if separated', () => {
		const e = expr('+ 1');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 1);
	});

	it('should parse an integer', () => {
		const e = expr('1234');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 1234);
	});

	it('should parse a float', () => {
		const e = expr('0.001');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 0.001);
	});

	it('should parse a natural number omitted float', () => {
		const e = expr('.002');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 0.002);
	});

	it('should parse a decimal omitted float', () => {
		const e = expr('2.');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 2);
	});

	[
		'1e1', '1e+1', '1e-1',
		'1.1e1', '1.1e+1', '1.1e-1',
		'.1e1', '.1e+1', '.1e-1'
	].forEach((n) => {
		it(`should parse an exponential float (${n})`, () => {
			const e = expr(n);
			assert.equal(typeof e, 'object');
			assert.equal(e.result.length, 1);
			assert.ok('value' in e.result[0]);
			assert.equal(e.result[0].value, parseFloat(n));
		});
	});

	it('should parse hex number', () => {
		const e = expr('0x1f');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 0x1f);
	});

	it('should parse octal number', () => {
		const e = expr('0777');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 511);
	});

	it('should parse binaly number', () => {
		const e = expr('0b1111_1111');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 255);
	});

	it('should compute multiply expression', () => {
		const e = expr('2 * 3');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 6);
	});

	it('should compute divide expression', () => {
		const e = expr('2 / 3');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.match(e.result[0].value.toString(), /0\.6+/);
	});

	it('should compute modulo expression', () => {
		const e = expr('5 % 2');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 1);
	});

	it('should compute add expression', () => {
		const e = expr('1 + -1');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 0);
	});

	it('should compute subtract expression', () => {
		const e = expr('1 - -1');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 2);
	});

	it('should compute complex expression', () => {
		const e = expr('2 + 3 * 6');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 20);
	});

	it('should compute expression containing parenthesis', () => {
		const e = expr('(2 + 3) * 6');
		assert.equal(typeof e, 'object');
		assert.equal(e.result.length, 1);
		assert.ok('value' in e.result[0]);
		assert.equal(e.result[0].value, 30);
	});
});
