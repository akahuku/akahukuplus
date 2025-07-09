import assert from 'node:assert/strict';

import {regalizePath, resolveRelativePath} from '../chrome/lib/file-system-access.js';

describe('regalizePath', () => {
	it('converts Windows style path delimiter', () => {
		const source = '\\foo\\bar\\baz.txt';
		const result = regalizePath(source);
		assert.equal(result, 'foo/bar/baz.txt');
	});

	it('should combine a sequence of slashes', () => {
		const source = '///foo//bar////baz.txt';
		const result = regalizePath(source);
		assert.equal(result, 'foo/bar/baz.txt');
	});
});

describe('resolveRelativePath', () => {
	it('strips a dot', () => {
		const source = 'foo/./bar/./baz.txt';
		const result = resolveRelativePath(regalizePath(source).split('/'));
		assert.equal(result.join('/'), 'foo/bar/baz.txt');
	});

	it('resolve a dotdot', () => {
		const source = 'a/../b/';
		const result = resolveRelativePath(regalizePath(source).split('/'));
		assert.equal(result.join('/'), 'b/');
	});

	it('resolve multiple dotdot', () => {
		const source = 'a/b/c/../../../d';
		const result = resolveRelativePath(regalizePath(source).split('/'));
		assert.equal(result.join('/'), 'd');
	});

	it('report an error for unbalanced dotdot', () => {
		const source = '../b/';
		const result = resolveRelativePath(regalizePath(source).split('/'));
		assert.strictEqual(result, null);
	});
});

