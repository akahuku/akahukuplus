import assert from 'node:assert/strict';

import {
	createQueryCompiler,
	getLegalizedStringForSearch
} from '../chrome/lib/utils-reply-search.js';

describe('compile', () => {
	it('empty query', () => {
		const source = ' 　 ';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.notEqual(result.message, undefined);
	});

	it('simple literal', () => {
		const source = 'abc def ghi';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.equal(result.message, undefined);
		assert.deepStrictEqual(result.instructions, [
			{opcode: 'literal', operand: 'abc'},
			{opcode: 'literal', operand: 'def'},
			{opcode: 'literal', operand: 'ghi'},
			{opcode: 'conjunction', operand: 3},
		]);
	});

	it('quoted literal', () => {
		const source = '"abc def" "ghi jkl"';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.equal(result.message, undefined);
		assert.deepStrictEqual(result.instructions, [
			{opcode: 'literal', operand: 'abc def'},
			{opcode: 'literal', operand: 'ghi jkl'},
			{opcode: 'conjunction', operand: 2},
		]);
	});

	it('quoted excluded literal', () => {
		const source = '-"abc def" "ghi jkl"';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.equal(result.message, undefined);
		assert.deepStrictEqual(result.instructions, [
			{opcode: 'literal-exclude', operand: 'abc def'},
			{opcode: 'literal', operand: 'ghi jkl'},
			{opcode: 'conjunction', operand: 2},
		]);
	});

	it('excluded literal', () => {
		const source = '-abc def ghi';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.equal(result.message, undefined);
		assert.deepStrictEqual(result.instructions, [
			{opcode: 'literal-exclude', operand: 'abc'},
			{opcode: 'literal', operand: 'def'},
			{opcode: 'literal', operand: 'ghi'},
			{opcode: 'conjunction', operand: 3},
		]);
	});

	it('treat as an error when only excluded literals', () => {
		const source = '-abc -def';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.notEqual(result.message, undefined);
	});

	it('treat as an error when only excluded literals (nested)', () => {
		const source = 'ghi (-abc -def)';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.notEqual(result.message, undefined);
	});

	it('disjunction', () => {
		const source = 'abc | def | ghi';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.equal(result.message, undefined);
		assert.deepStrictEqual(result.instructions, [
			{opcode: 'literal', operand: 'abc'},
			{opcode: 'literal', operand: 'def'},
			{opcode: 'literal', operand: 'ghi'},
			{opcode: 'disjunction', operand: 3},
		]);
	});

	it('incomplete disjunction at head', () => {
		const source = '| abc';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.notEqual(result.message, undefined);
	});

	it('incomplete disjunction at bottom', () => {
		const source = 'abc |';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.notEqual(result.message, undefined);
	});

	it('parentheses 1', () => {
		const source = '(abc def) ghi';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.equal(result.message, undefined);
		assert.deepStrictEqual(result.instructions, [
			{opcode: 'literal', operand: 'abc'},
			{opcode: 'literal', operand: 'def'},
			{opcode: 'conjunction', operand: 2},
			{opcode: 'literal', operand: 'ghi'},
			{opcode: 'conjunction', operand: 2},
		]);
	});

	it('parentheses 2', () => {
		const source = 'abc (def ghi)';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.equal(result.message, undefined);
		assert.deepStrictEqual(result.instructions, [
			{opcode: 'literal', operand: 'abc'},
			{opcode: 'literal', operand: 'def'},
			{opcode: 'literal', operand: 'ghi'},
			{opcode: 'conjunction', operand: 2},
			{opcode: 'conjunction', operand: 2},
		]);
	});

	it('unbalanced parentheses', () => {
		const source = ') abc def ghi';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.notEqual(result.message, undefined);
	});

	it('excluded parentheses (not supported)', () => {
		const source = 'abc -(def ghi)';
		const compiler = createQueryCompiler();
		const result = compiler.compile(source);

		assert.equal(result.error, undefined);
		assert.equal(result.message, undefined);
		assert.deepStrictEqual(result.instructions, [
			{opcode: 'literal', operand: 'abc'},
			{opcode: 'literal', operand: 'def'},
			{opcode: 'literal', operand: 'ghi'},
			{opcode: 'conjunction', operand: 2},
			{opcode: 'conjunction', operand: 2},
		]);
	});
});

describe('tester', () => {
	it('match', () => {
		const source = '(abc | def) ghi';
		const compiler = createQueryCompiler();
		const vm = compiler.compile(source);

		assert.ok(vm.test('ghi abc'));
		assert.ok(vm.test('def ghi'));
		assert.ok(vm.test('abc ghi'));
	});

	it('not match', () => {
		const source = 'abc ( def | ghi )';
		const compiler = createQueryCompiler();
		const vm = compiler.compile(source);

		assert.ok(!vm.test('foo bar baz'));
		assert.ok(!vm.test('bar baz'));
		assert.ok(!vm.test('baz'));
	});
});

describe('getLegalizedStringForSearch', () => {
	it('alphabet', () => {
		const source = 'AbcÀÊÏÐ A\u0300E\u0302I\u0308';
		const result = getLegalizedStringForSearch(source);
		assert.equal(result, 'abcaeið aei');
	});

	it('full width characters', () => {
		const source = '（ａｂｃ　ＡＢＣ）';
		const result = getLegalizedStringForSearch(source);
		assert.equal(result, '(abc abc)');
	});

	it('zero width spaces', () => {
		const source = 'abc\u200bdef';
		const result = getLegalizedStringForSearch(source);
		assert.equal(result, 'abcdef');
	});

	it('half width kana', () => {
		const source = 'ｱｲｳｴｵ ｶﾞｷﾞｸﾞｹﾞｺﾞ ﾅﾞﾆﾞﾇﾞﾈﾞﾉﾞ';
		const result = getLegalizedStringForSearch(source);
		assert.equal(result, 'アイウエオ ガギグゲゴ ナ\u3099ニ\u3099ヌ\u3099ネ\u3099ノ\u3099');
	});
});
