import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {resolveRelativePath} from '../chrome/lib/utils-apext.js';

describe('resolveRelativePath (without base url)', () => {
	before(() => {
		const dom = new JSDOM('<html><head></head><body></body></html>', {
			url: 'https://img.2chan.net/b/futaba.htm?foo#bar'
		});
		global.window = dom.window;
	});

	after(() => {
		delete global.window;
	});

	it('full path', () => {
		const source = 'https://may.2chan.net/b/1.htm';
		const result = resolveRelativePath(source);
		assert.equal(result, 'https://may.2chan.net/b/1.htm');
	});

	it('schema ommited path', () => {
		const source = '//may.2chan.net/b/1.htm';
		const result = resolveRelativePath(source);
		assert.equal(result, 'https://may.2chan.net/b/1.htm');
	});

	it('absolute path', () => {
		const source = '/bin/uu.php';
		const result = resolveRelativePath(source);
		assert.equal(result, 'https://img.2chan.net/bin/uu.php');
	});

	it('relative path', () => {
		const source = '../robot.txt?foo';
		const result = resolveRelativePath(source);
		assert.equal(result, 'https://img.2chan.net/robot.txt?foo');
	});
});

describe('resolveRelativePath (with base URL as string)', () => {
	before(() => {
		const dom = new JSDOM('<html><head></head><body></body></html>', {
			url: 'https://img.2chan.net/b/futaba.htm?foo#bar'
		});
		global.window = dom.window;
	});

	after(() => {
		delete global.window;
	});

	it('full path', () => {
		const source = 'https://may.2chan.net/b/1.htm';
		const result = resolveRelativePath(source, 'http://dat.2chan.net/b/');
		assert.equal(result, 'https://may.2chan.net/b/1.htm');
	});

	it('schema ommited path', () => {
		const source = '//may.2chan.net/b/1.htm';
		const result = resolveRelativePath(source, 'http://dat.2chan.net/b/');
		assert.equal(result, 'http://may.2chan.net/b/1.htm');
	});

	it('absolute path', () => {
		const source = '/bin/uu.php';
		const result = resolveRelativePath(source, 'http://dat.2chan.net/b/');
		assert.equal(result, 'http://dat.2chan.net/bin/uu.php');
	});

	it('relative path', () => {
		const source = '../robot.txt?foo';
		const result = resolveRelativePath(source, 'http://dat.2chan.net/b/');
		assert.equal(result, 'http://dat.2chan.net/robot.txt?foo');
	});
});

describe('resolveRelativePath (with base URL as Document)', () => {
	let doc;

	before(() => {
		const dom = new JSDOM('<html><head></head><body></body></html>', {
			url: 'https://may.2chan.net/b/futaba.htm?foo#bar'
		});
		global.window = dom.window;

		doc = new dom.window.DOMParser().parseFromString('<html><head><base href="http://img.2chan.net/b/"></head><body></body></html>', 'text/html');
	});

	after(() => {
		delete global.window;
	});

	it('full path', () => {
		const source = 'https://may.2chan.net/b/1.htm';
		const result = resolveRelativePath(source, doc);
		assert.equal(result, 'https://may.2chan.net/b/1.htm');
	});

	it('schema ommited path', () => {
		const source = '//may.2chan.net/b/1.htm';
		const result = resolveRelativePath(source, doc);
		assert.equal(result, 'http://may.2chan.net/b/1.htm');
	});

	it('absolute path', () => {
		const source = '/bin/uu.php';
		const result = resolveRelativePath(source, doc);
		assert.equal(result, 'http://img.2chan.net/bin/uu.php');
	});

	it('relative path', () => {
		const source = '../robot.txt?foo';
		const result = resolveRelativePath(source, doc);
		assert.equal(result, 'http://img.2chan.net/robot.txt?foo');
	});
});

describe('resolveRelativePath (with base URL in an object)', () => {
	let doc;

	before(() => {
		const dom = new JSDOM('<html><head></head><body></body></html>', {
			url: 'https://img.2chan.net/b/futaba.htm?foo#bar'
		});
		global.window = dom.window;

		doc = {
			baseURI: 'http://img.2chan.net/b/futaba.htm'
		};
	});

	after(() => {
		delete global.window;
		doc = undefined;
	});

	it('full path', () => {
		const source = 'https://may.2chan.net/b/1.htm';
		const result = resolveRelativePath(source, doc);
		assert.equal(result, 'https://may.2chan.net/b/1.htm');
	});

	it('schema ommited path', () => {
		const source = '//may.2chan.net/b/1.htm';
		const result = resolveRelativePath(source, doc);
		assert.equal(result, 'http://may.2chan.net/b/1.htm');
	});

	it('absolute path', () => {
		const source = '/bin/uu.php';
		const result = resolveRelativePath(source, doc);
		assert.equal(result, 'http://img.2chan.net/bin/uu.php');
	});

	it('relative path', () => {
		const source = '../robot.txt?foo';
		const result = resolveRelativePath(source, doc);
		assert.equal(result, 'http://img.2chan.net/robot.txt?foo');
	});
});
