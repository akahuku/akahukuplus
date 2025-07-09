import assert from 'node:assert/strict';

	function stripTags (s) {
		const result = [];
		const pattern = /<[^>]+>|[^<]+/g;
		let re;
		while ((re = pattern.exec(s))) {
			if (re[0].charAt(0) != '<') {
				result.push(re[0]);
			}
		}
		return result.join('');
	}

	function legalizeTags (s) {
		const result = [];
		const pattern = /<[^>]+>|[^<]+/g;
		let re;
		while ((re = pattern.exec(s))) {
			if (re[0].charAt(0) == '<') {
				let re2;
				if ((re2 = /<a\b.*href="([^"]*)"/.exec(re[0]))) {
					result.push(`<a href="${re2[1]}">`);
				}
				else if ((re2 = /<\/a\b/.exec(re[0]))) {
					result.push(`</a>`);
				}
			}
			else {
				result.push(re[0]);
			}
		}
		return result.join('');
	}

describe('stripTags', () => {
	it('simple', () => {
		let s = 'BAR<a href="foo">bar</a >BAZ';
		let result = stripTags(s);
		assert.equal(result, 'BARbarBAZ');
	});

	it('nested', () => {
		let s = 'BAR<a href="foo"><div class="a"><div class="b">bar</div></div></a>BAZ';
		let result = stripTags(s);
		assert.equal(result, 'BARbarBAZ');
	});

	it('single', () => {
		let s = 'BAR<a href="foo">bar\n<br>baz</a>BAZ';
		let result = stripTags(s);
		assert.equal(result, 'BARbar\nbazBAZ');
	});
});

describe('legalizeTags', () => {
	it('simple', () => {
		let s = 'BAR<a href="foo">bar</a>BAZ';
		let result = legalizeTags(s);
		assert.equal(result, 'BAR<a href="foo">bar</a>BAZ');
	});

	it('nested', () => {
		let s = 'BAR<a href="foo" style="color:red"><div class="a"><div class="b">bar</div></div></a>BAZ';
		let result = legalizeTags(s);
		assert.equal(result, 'BAR<a href="foo">bar</a>BAZ');
	});

	it('single', () => {
		let s = 'BAR<a href="foo">bar\n<br>baz</a>BAZ';
		let result = legalizeTags(s);
		assert.equal(result, 'BAR<a href="foo">bar\nbaz</a>BAZ');
	});
});
