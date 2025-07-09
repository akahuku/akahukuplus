import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {parseExtendJson} from '../chrome/lib/utils-apext.js';

describe('parseExtendJson', () => {
	it('other than string', () => {
		const result = parseExtendJson(255);
		assert.deepEqual(result, 255);
	});

	it('invalid string value', () => {
		assert.throws(() => {
			const result = parseExtendJson('foo\nbar');
			console.dir(result);
		});
	});

	it('simple string', () => {
		const result = parseExtendJson('"foo"');
		assert.deepEqual(result, 'foo');
	});

	it('string including newline', () => {
		const result = parseExtendJson('"foo\nbar"');
		assert.deepEqual(result, 'foo\nbar');
	});

	it('string including newline escape', () => {
		const result = parseExtendJson('"foo\\nbar"');
		assert.deepEqual(result, 'foo\nbar');
	});

	it('string including code point escape', () => {
		const result = parseExtendJson('"foo\\u00a0bar"');
		assert.deepEqual(result, 'foo\u00a0bar');
	});

	it('string including double quote escape', () => {
		const result = parseExtendJson('"foo\\"bar"');
		assert.deepEqual(result, 'foo\"bar');
	});

	it('integer number', () => {
		const result = parseExtendJson('255');
		assert.deepEqual(result, 255);
	});

	it('float number', () => {
		const result = parseExtendJson('1.1');
		assert.deepEqual(result, 1.1);
	});

	it('integer omitted float number', () => {
		assert.throws(() => {
			const result = parseExtendJson('.1');
		});
	});

	it('other primitives', () => {
		assert.deepEqual(parseExtendJson('true'), true, 'true');
		assert.deepEqual(parseExtendJson('false'), false, 'false');
		assert.deepEqual(parseExtendJson('null'), null, 'null');
	});

	it('empty array', () => {
		const result = parseExtendJson('[  ]');
		assert.deepEqual(result, []);
	});

	it('simple array', () => {
		const result = parseExtendJson(`
// array
[
	0,
	1,
	2
]`);
		assert.deepEqual(result, [0, 1, 2]);
	});

	it('complex array', () => {
		const result = parseExtendJson(`
/* array */
[
	0,
	1,
	[
		"foo",
		"bar"
	]
]`);
		assert.deepEqual(result, [0, 1, ['foo', 'bar']]);
	});

	it('empty object', () => {
		const result = parseExtendJson('{  }');
		assert.deepEqual(result, {});
	});

	it('simple object', () => {
		const result = parseExtendJson(`
// object
{
	"foo": 0,
	"bar": 1,
	"baz": 2
}`);
		assert.deepEqual(result, {foo: 0, bar: 1, baz: 2});
	});
	
	it('complex object', () => {
		const result = parseExtendJson(`
/* object */
{
	"foo": 0,
	"bar": 1,
	"baz": {
		"FOO": "foo",
		"BAR": "bar"
	}
}`);
		assert.deepEqual(result, {
			foo: 0,
			bar: 1,
			baz: {
				FOO: 'foo',
				BAR: 'bar'
			}
		});
	});

	it('configNames.json', async () => {
		const content = await fs.readFile('src/chrome/_locales/ja/configNames.json', 'utf8');
		const result = parseExtendJson(content);
		assert.equal(
			result.wheel_reload_unit_size.name,
			'ホイールの1目盛りの単位移動量');
	});
});
