import assert from 'node:assert/strict';

function markup2text (html) {
	html = html.replace(/<br[^>\/]*\/?>(<\/div[^>]*>)/gi, '$1');
	html = html.replace(/^<div[^>]*>/, '');
	html = html.replace(/<\/div[^>]*>/gi, '');
	html = html.replace(/<div[^>]*>/gi, '\n');
	html = html.replace(/<[^>]*>/gi, '');
	return html;
}

describe('markup2text', () => {
	const tests = [
		{
			html: 'なかなか髪がまとまらなくて<div><br></div>',
			text: 'なかなか髪がまとまらなくて\n'
		},
		{
			html: 'なかなか髪がまとまらなくて<div>a</div>',
			text: 'なかなか髪がまとまらなくて\na'
		},
		{
			html: 'なかなか髪がまとまらなくて<div>a</div><div><br></div>',
			text: 'なかなか髪がまとまらなくて\na\n'
		},
		{
			html: 'なかなか髪がまとまらなくて<div>なかなか髪がまとまらなくて<div>a</div><div>b</div></div>',
			text: 'なかなか髪がまとまらなくて\nなかなか髪がまとまらなくて\na\nb'
		},
		{
			html: '<div>なかなか髪がまとまらなくて</div><div><br></div>',
			text: 'なかなか髪がまとまらなくて\n'
		},
		{
			html: '<div>なかなか髪がまとまらなくて</div><div>a<br></div>',
			text: 'なかなか髪がまとまらなくて\na'
		},
		{
			html: '<div>なかなか髪がまとまらなくて</div><div>a</div><div><br></div>',
			text: 'なかなか髪がまとまらなくて\na\n'
		},
		{
			html: '<div>なかなか髪がまとまらなくて</div><div>なかなか髪がまとまらなくて</div><div>a</div><div>b<br></div>',
			text: 'なかなか髪がまとまらなくて\nなかなか髪がまとまらなくて\na\nb'
		}
	];

	tests.forEach((test, index) => {
		it(`#test ${index+1}`, () => {
			const result = markup2text(test.html);
			assert.equal(result, test.text);
		});
	});
});
