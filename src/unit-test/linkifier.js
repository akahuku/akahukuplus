import {JSDOM} from 'jsdom';
import {linkify} from '../chrome/lib/linkifier.js';

const genericTests = [
	// - #0: initial html
	// - #1: expected html after linkify
	// - #2: attributes
	// - #3: description
	[
		'なんでわたしを家に誘うの？',
		'なんでわたしを家に誘うの？',
		null,
		'plain text'
	],

	[
		'ああ…そういうことか…',
		'ああ<leader>…</leader>そういうことか<leader>…</leader>',
		null,
		'dot leader'
	],

	[
		'Green Apple🍏 Red Apple🍎',
		'Green Apple<emoji>🍏</emoji> Red Apple<emoji>🍎</emoji>',
		[
			{ 'codepoints': '1f34f' },
			{ 'codepoints': '1f34e' }
		],
		'emoji'
	],

	/*
	// futalog
	[
		'img00000',
		'img00000',
		null,
		'futalog - plain'
	],
	[
		'img00000.mht',
		'<a>img00000.mht</a>',
		{
			'class': 'link-futalog',
			'data-title': 'ふたログ',
			'href': 'http://www.nijibox2.com/futalog/src/img00000.mht',
		},
		'futalog - file name'
	],
	[
		'www.nijibox2.com/futalog/src/img00000.mht',
		'<a>www.nijibox2.com/futalog/src/img00000.mht</a>',
		{
			'class': 'link-futalog',
			'data-title': 'ふたログ',
			'href': 'http://www.nijibox2.com/futalog/src/img00000.mht',
		},
		'futalog - URL without scheme'
	],
	[
		'http://www.nijibox2.com/futalog/src/img00000.mht',
		'<a>http://www.nijibox2.com/futalog/src/img00000.mht</a>',
		{
			'class': 'link-futalog',
			'data-title': 'ふたログ',
			'href': 'http://www.nijibox2.com/futalog/src/img00000.mht',
		},
		'futalog - URL (http)'
	],
	[
		'https://www.nijibox2.com/futalog/src/img00000.mht',
		'<a>https://www.nijibox2.com/futalog/src/img00000.mht</a>',
		{
			'class': 'link-futalog',
			'data-title': 'ふたログ',
			'href': 'http://www.nijibox2.com/futalog/src/img00000.mht',
		},
		'futalog - URL (https)'
	],
	*/

	// futaba inside link
	[
		'img.2chan.net/b/src/00000.jpg',
		'<a>img.2chan.net/b/src/00000.jpg</a>',
		{
			'class': 'link-futaba lightbox',
			'data-thumbnail': 'https://img.2chan.net/b/thumb/00000s.jpg',
			'href': 'https://img.2chan.net/b/src/00000.jpg'
		},
		'futaba inside link - URL without scheme'
	],
	[
		'http://img.2chan.net/b/src/00000.jpg',
		'<a>http://img.2chan.net/b/src/00000.jpg</a>',
		{
			'class': 'link-futaba lightbox',
			'data-thumbnail': 'http://img.2chan.net/b/thumb/00000s.jpg',
			'href': 'http://img.2chan.net/b/src/00000.jpg'
		},
		'futaba inside link - URL (http)'
	],
	[
		'https://img.2chan.net/b/src/00000.jpg',
		'<a>https://img.2chan.net/b/src/00000.jpg</a>',
		{
			'class': 'link-futaba lightbox',
			'data-thumbnail': 'https://img.2chan.net/b/thumb/00000s.jpg',
			'href': 'https://img.2chan.net/b/src/00000.jpg'
		},
		'futaba inside link - URL (https)'
	],

	// youtube
	[
		'youtube.com/watch?v=foobarbaz&foo=bar&baz=bax',
		'<a>youtube.com/watch?v=foobarbaz&foo=bar&baz=bax</a>',
		{
			'class': 'link-youtube',
			'data-title': 'YouTube',
			'href': 'https://youtube.com/watch?v=foobarbaz&foo=bar&baz=bax'
		},
		'youtube - without scheme'
	],
	[
		'http://youtube.com/watch?v=foobarbaz&foo=bar&baz=bax',
		'<a>http://youtube.com/watch?v=foobarbaz&foo=bar&baz=bax</a>',
		{
			'class': 'link-youtube',
			'data-title': 'YouTube',
			'href': 'https://youtube.com/watch?v=foobarbaz&foo=bar&baz=bax'
		},
		'youtube - http scheme'
	],
	[
		'https://youtube.com/watch?v=foobarbaz&foo=bar&baz=bax',
		'<a>https://youtube.com/watch?v=foobarbaz&foo=bar&baz=bax</a>',
		{
			'class': 'link-youtube',
			'data-title': 'YouTube',
			'href': 'https://youtube.com/watch?v=foobarbaz&foo=bar&baz=bax'
		},
		'youtube - https scheme'
	],

	// niconico
	[
		'nicovideo.jp/watch/sm00000?foo=bar&baz=bax',
		'<a>nicovideo.jp/watch/sm00000?foo=bar&baz=bax</a>',
		{
			'class': 'link-nico2',
			'data-title': 'ニコニコ動画',
			'href': 'https://nicovideo.jp/watch/sm00000?foo=bar&baz=bax'
		},
		'niconico - without scheme'
	],
	[
		'http://nicovideo.jp/watch/sm00000?foo=bar&baz=bax',
		'<a>http://nicovideo.jp/watch/sm00000?foo=bar&baz=bax</a>',
		{
			'class': 'link-nico2',
			'data-title': 'ニコニコ動画',
			'href': 'https://nicovideo.jp/watch/sm00000?foo=bar&baz=bax'
		},
		'niconico - http scheme'
	],
	[
		'https://nicovideo.jp/watch/sm00000?foo=bar&baz=bax',
		'<a>https://nicovideo.jp/watch/sm00000?foo=bar&baz=bax</a>',
		{
			'class': 'link-nico2',
			'data-title': 'ニコニコ動画',
			'href': 'https://nicovideo.jp/watch/sm00000?foo=bar&baz=bax'
		},
		'niconico - https scheme'
	],
	[
		'nico.ms/sm00000?foo=bar&baz=bax',
		'<a>nico.ms/sm00000?foo=bar&baz=bax</a>',
		{
			'class': 'link-nico2',
			'data-title': 'ニコニコ動画',
			'href': 'https://nico.ms/sm00000?foo=bar&baz=bax'
		},
		'niconico short url - without scheme'
	],
	[
		'http://nico.ms/sm00000?foo=bar&baz=bax',
		'<a>http://nico.ms/sm00000?foo=bar&baz=bax</a>',
		{
			'class': 'link-nico2',
			'data-title': 'ニコニコ動画',
			'href': 'https://nico.ms/sm00000?foo=bar&baz=bax'
		},
		'niconico short url - http scheme'
	],
	[
		'https://nico.ms/sm00000?foo=bar&baz=bax',
		'<a>https://nico.ms/sm00000?foo=bar&baz=bax</a>',
		{
			'class': 'link-nico2',
			'data-title': 'ニコニコ動画',
			'href': 'https://nico.ms/sm00000?foo=bar&baz=bax'
		},
		'niconico short url - https scheme'
	],

	// twitter
	[
		'twitter.com/foo/status/00000?foo=bar&baz=bax',
		'<a>twitter.com/foo/status/00000?foo=bar&baz=bax</a>',
		{
			'class': 'link-twitter',
			'data-title': 'Twitter',
			'href': 'https://twitter.com/foo/status/00000?foo=bar&baz=bax'
		},
		'twitter - without scheme'
	],
	[
		'http://twitter.com/foo/status/00000?foo=bar&baz=bax',
		'<a>http://twitter.com/foo/status/00000?foo=bar&baz=bax</a>',
		{
			'class': 'link-twitter',
			'data-title': 'Twitter',
			'href': 'https://twitter.com/foo/status/00000?foo=bar&baz=bax'
		},
		'twitter - http scheme'
	],
	[
		'https://twitter.com/foo/status/00000?foo=bar&baz=bax',
		'<a>https://twitter.com/foo/status/00000?foo=bar&baz=bax</a>',
		{
			'class': 'link-twitter',
			'data-title': 'Twitter',
			'href': 'https://twitter.com/foo/status/00000?foo=bar&baz=bax'
		},
		'twitter - https scheme'
	],

	// generic external link
	[
		'http://www.google.com/',
		'<a>http://www.google.com/</a>',
		{
			'class': 'link-external',
			'href': 'http://www.google.com/'
		},
		'generic link'
	],
	[
		'http://www.google.com:81/',
		'<a>http://www.google.com:81/</a>',
		{
			'class': 'link-external',
			'href': 'http://www.google.com:81/'
		},
		'generic link with a port'
	],
	[
		'ttp://www.google.com/',
		'<a>ttp://www.google.com/</a>',
		{
			'class': 'link-external',
			'href': 'http://www.google.com/'
		},
		'generic link (incomplete scheme)'
	],
	[
		'www.google.com/',
		'<a>www.google.com/</a>',
		{
			'class': 'link-external',
			'href': 'http://www.google.com/'
		},
		'generic link (www)'
	],
	[
		'www2.google.com/',
		'www2.google.com/',
		null,
		'generic link (not a link #1)'
	],
	[
		'www.google.com',
		'www.google.com',
		null,
		'generic link (not a link #2)'
	],
];

const siokaraTestAsset = {
	uploaders: [
		{
			name: '塩辛瓶 1ml',
			ename: 'siokara 1ml',
			server: 'www.nijibox6.com',
			directory: '001',
			prefix: 'sa'
		},
		{
			name: '塩辛瓶 3ml',
			ename: 'siokara 3ml',
			server: 'www.nijibox2.com',
			directory: '003',
			prefix: 'sp'
		},
		{
			name: '塩辛瓶 小瓶',
			ename: 'siokara kobin',
			server: 'www.nijibox5.com',
			directory: 'kobin',
			prefix: 'ss'
		},
		{
			name: '塩辛瓶 塩粒',
			ename: 'siokara tubu',
			server: 'www.nijibox5.com',
			directory: 'tubu',
			prefix: 'su'
		},
		{
			name: '塩辛瓶 中瓶',
			ename: 'siokara middle',
			server: 'www.nijibox6.com',
			directory: 'mid',
			prefix: 'sq'
		}
	],
	tests: [
		[
			'sa000001',
			'<a>sa000001</a>',
			{
				'class': 'link-siokara incomplete',
				'data-title': '#name#',
				'data-basename': 'sa000001',
				'href': 'http://#server#/futabafiles/#directory#/index.html'
			},
			'#ename# - extension omitted link'
		],
		[
			'sa000001.jpg',
			'<a>sa000001.jpg</a>',
			{
				'class': 'link-siokara incomplete-thumbnail lightbox',
				'data-title': '#name#',
				'data-basename': 'sa000001.jpg',
				'href':'http://#server#/futabafiles/#directory#/src/sa000001.jpg',
				'data-thumbnail': 'http://#server#/futabafiles/#directory#/misc/sa000001.thumb.jpg'
			},
			'#ename# - file name with thumbnail'
		],
		[
			'sa000001.zip',
			'<a>sa000001.zip</a>',
			{
				'class': 'link-siokara',
				'data-title': '#name#',
				'data-basename': 'sa000001.zip',
				'href':'http://#server#/futabafiles/#directory#/src/sa000001.zip',
				'data-thumbnail': null
			},
			'#ename# - file name without thumbnail'
		],
		[
			'#server#/futabafiles/#directory#/src/sa000001.jpg',
			'<a>#server#/futabafiles/#directory#/src/sa000001.jpg</a>',
			{
				'class': 'link-siokara incomplete-thumbnail lightbox',
				'data-title': '#name#',
				'data-basename': 'sa000001.jpg',
				'href':'http://#server#/futabafiles/#directory#/src/sa000001.jpg',
				'data-thumbnail': 'http://#server#/futabafiles/#directory#/misc/sa000001.thumb.jpg'
			},
			'#ename# - URL without scheme'
		],
		[
			'http://#server#/futabafiles/#directory#/src/sa000001.jpg',
			'<a>http://#server#/futabafiles/#directory#/src/sa000001.jpg</a>',
			{
				'class': 'link-siokara incomplete-thumbnail lightbox',
				'data-title': '#name#',
				'data-basename': 'sa000001.jpg',
				'href':'http://#server#/futabafiles/#directory#/src/sa000001.jpg',
				'data-thumbnail': 'http://#server#/futabafiles/#directory#/misc/sa000001.thumb.jpg'
			},
			'#ename# - URL with http scheme'
		],
		[
			'https://#server#/futabafiles/#directory#/src/sa000001.jpg',
			'<a>https://#server#/futabafiles/#directory#/src/sa000001.jpg</a>',
			{
				'class': 'link-siokara incomplete-thumbnail lightbox',
				'data-title': '#name#',
				'data-basename': 'sa000001.jpg',
				'href':'http://#server#/futabafiles/#directory#/src/sa000001.jpg',
				'data-thumbnail': 'http://#server#/futabafiles/#directory#/misc/sa000001.thumb.jpg'
			},
			'#ename# - URL with https scheme'
		],
	]
};

const upTestAsset = {
	uploaders: [
		{
			name: 'あぷ',
			ename: 'up',
			server: 'dec.2chan.net',
			directory: 'up',
			prefix: 'f'
		},
		{
			name: 'あぷ小',
			ename: 'up2',
			server: 'dec.2chan.net',
			directory: 'up2',
			prefix: 'fu'
		},
	],
	tests: [
		[
			'f00001',
			'<a>f00001</a>',
			{
				'class': 'link-up incomplete',
				'data-title': '#name#',
				'href': 'https://dec.2chan.net/#directory#/up.htm',
				'data-thumbnail': null
			},
			'#ename# - extension omitted link'
		],
		[
			'f00001.jpg',
			'<a>f00001.jpg</a>',
			{
				'class': 'link-up lightbox',
				'data-title': '#name#',
				'data-basename': 'f00001.jpg',
				'href':'https://dec.2chan.net/#directory#/src/f00001.jpg',
				'data-thumbnail': 'https://appsweets.net/thumbnail/#directory#/f00001s.png'
			},
			'#ename# - file name with thumbnail'
		],
		[
			'f00001.zip',
			'<a>f00001.zip</a>',
			{
				'class': 'link-up',
				'data-title': '#name#',
				'data-basename': 'f00001.zip',
				'href':'https://dec.2chan.net/#directory#/src/f00001.zip',
				'data-thumbnail': null
			},
			'#ename# - file name without thumbnail'
		],
		[
			'dec.2chan.net/#directory#/src/f00001.jpg',
			'<a>dec.2chan.net/#directory#/src/f00001.jpg</a>',
			{
				'class': 'link-up lightbox',
				'data-title': '#name#',
				'data-basename': 'f00001.jpg',
				'href':'https://dec.2chan.net/#directory#/src/f00001.jpg',
				'data-thumbnail': 'https://appsweets.net/thumbnail/#directory#/f00001s.png'
			},
			'#ename# - URL without scheme'
		],
		[
			'http://dec.2chan.net/#directory#/src/f00001.jpg',
			'<a>http://dec.2chan.net/#directory#/src/f00001.jpg</a>',
			{
				'class': 'link-up lightbox',
				'data-title': '#name#',
				'data-basename': 'f00001.jpg',
				'href':'http://dec.2chan.net/#directory#/src/f00001.jpg',
				'data-thumbnail': 'https://appsweets.net/thumbnail/#directory#/f00001s.png'
			},
			'#ename# - URL with http scheme'
		],
		[
			'https://dec.2chan.net/#directory#/src/f00001.jpg',
			'<a>https://dec.2chan.net/#directory#/src/f00001.jpg</a>',
			{
				'class': 'link-up lightbox',
				'data-title': '#name#',
				'data-basename': 'f00001.jpg',
				'href':'https://dec.2chan.net/#directory#/src/f00001.jpg',
				'data-thumbnail': 'https://appsweets.net/thumbnail/#directory#/f00001s.png'
			},
			'#ename# - URL with https scheme'
		],
	]
};

const youtubeTestAsset = {
	// source: https://stackoverflow.com/questions/19377262/regex-for-youtube-url
	URLs: [
		'https://www.youtube.com/watch?v=DFYRQ_zQ-gk&feature=featured',
		'https://www.youtube.com/watch?v=DFYRQ_zQ-gk',
		'http://www.youtube.com/watch?v=DFYRQ_zQ-gk',
		//'//www.youtube.com/watch?v=DFYRQ_zQ-gk',
		'www.youtube.com/watch?v=DFYRQ_zQ-gk',
		'https://youtube.com/watch?v=DFYRQ_zQ-gk',
		'http://youtube.com/watch?v=DFYRQ_zQ-gk',
		//'//youtube.com/watch?v=DFYRQ_zQ-gk',
		'youtube.com/watch?v=DFYRQ_zQ-gk',

		'https://m.youtube.com/watch?v=DFYRQ_zQ-gk',
		'http://m.youtube.com/watch?v=DFYRQ_zQ-gk',
		//'//m.youtube.com/watch?v=DFYRQ_zQ-gk',
		'm.youtube.com/watch?v=DFYRQ_zQ-gk',

		'https://www.youtube.com/v/DFYRQ_zQ-gk?fs=1&hl=en_US',
		'http://www.youtube.com/v/DFYRQ_zQ-gk?fs=1&hl=en_US',
		//'//www.youtube.com/v/DFYRQ_zQ-gk?fs=1&hl=en_US',
		'www.youtube.com/v/DFYRQ_zQ-gk?fs=1&hl=en_US',
		'youtube.com/v/DFYRQ_zQ-gk?fs=1&hl=en_US',

		'https://www.youtube.com/embed/DFYRQ_zQ-gk?autoplay=1',
		'https://www.youtube.com/embed/DFYRQ_zQ-gk',
		'http://www.youtube.com/embed/DFYRQ_zQ-gk',
		//'//www.youtube.com/embed/DFYRQ_zQ-gk',
		'www.youtube.com/embed/DFYRQ_zQ-gk',
		'https://youtube.com/embed/DFYRQ_zQ-gk',
		'http://youtube.com/embed/DFYRQ_zQ-gk',
		//'//youtube.com/embed/DFYRQ_zQ-gk',
		'youtube.com/embed/DFYRQ_zQ-gk',

		'https://youtu.be/DFYRQ_zQ-gk?t=120',
		'https://youtu.be/DFYRQ_zQ-gk',
		'http://youtu.be/DFYRQ_zQ-gk',
		//'//youtu.be/DFYRQ_zQ-gk',
		'youtu.be/DFYRQ_zQ-gk',

		'https://www.youtube.com/HamdiKickProduction?v=DFYRQ_zQ-gk'
	],
	testTemplate: [
		'#url#',
		'<a>#url#</a>',
		{
			'class': 'link-youtube',
			'data-title': 'YouTube',
			'data-youtube-key': '#video-id#',
		},
		'youtube (#url#)'
	]
};

const dom = new JSDOM('<html><head></head><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;

function registerTest (test) {
	let [init, expectedHTML, expectedAttrs, desc] = test;
	it(desc, () => {
		const node = document.body.appendChild(document.createElement('div'));
		try {
			node.textContent = init;
			linkify(node);

			const actualHTML = node.innerHTML
				.replace(/<([^\s>]+)[^>]*>/g, '<$1>')
				.replace(/&amp;/g, '&');
			if (actualHTML !== expectedHTML) {
				throw new Error([
					`Test failed: markup unmatch.`,
					`  expected: "${expectedHTML}"`,
					`    actual: "${actualHTML}"`
				].join('\n'));
			}

			if ((Array.isArray(expectedAttrs) || typeof expectedAttrs === 'object')
			 && expectedAttrs !== null) {
				const elements = Array.from(node.querySelectorAll('*'));
				if (!Array.isArray(expectedAttrs)) {
					expectedAttrs = [expectedAttrs];
				}
				if (expectedAttrs.length !== elements.length) {
					throw new Error('Test failed: unbalanced number of inserted elements.');
				}
				for (let i = 0; i < elements.length; i++) {
					const expectedAttrObj = expectedAttrs[i];
					const el = elements[i];

					for (let [key, expectedAttr] of Object.entries(expectedAttrObj)) {
						const actualAttr = el.getAttribute(key);
						if (actualAttr !== expectedAttr) {
							throw new Error([
								`Test failed: attribute unmatch.`,
								`  expected: "${expectedAttr}"`,
								`    actual: "${actualAttr}"`
							].join('\n'));
						}
					}
				}

				/*


				const anchor = node.getElementsByTagName('a')[0];
				if (!anchor) {
					throw new Error('Test failed: anchor not found.');
				}
				for (let [key, expectedAttr] of Object.entries(expectedAttrs)) {
					const actualAttr = anchor.getAttribute(key);
					if (actualAttr != expectedAttr) {
						throw new Error([
							`Test failed: attribute unmatch.`,
							`  expected: "${expectedAttr}"`,
							`    actual: "${actualAttr}"`
						].join('\n'));
					}
				}
				*/
			}
		}
		finally {
			node.parentNode.removeChild(node);
		}
	});
}

function registerTestAsset (asset, replace) {
	asset.uploaders.forEach(uploader => {
		asset.tests.forEach(atest => {
			const test = JSON.parse(JSON.stringify(atest));
			for (let i = 0; i < test.length; i++) {
				if (typeof test[i] == 'string') {
					test[i] = replace(test[i], uploader);
				}
			}
			for (let i in test[2]) {
				if (typeof test[2][i] == 'string') {
					test[2][i] = replace(test[2][i], uploader);
				}
			}
			registerTest(test);
		});
	});
}

describe('generic tests', () => {
	genericTests.forEach(registerTest);
});

/*
describe('siokara bin', () => {
	registerTestAsset(siokaraTestAsset, (text, uploader) => {
		return text
			.replace(/\bs[a-z](\d+)/g, `${uploader.prefix}$1`)
			.replace(/#server#/g, uploader.server)
			.replace(/#directory#/g, uploader.directory)
			.replace(/#ename#/g, uploader.ename)
			.replace(/#name#/g, uploader.name)
	});
});
*/

describe('up/up2', () => {
	registerTestAsset(upTestAsset, (text, uploader) => {
		return text
			.replace(/\bf(\d+)/g, `${uploader.prefix}$1`)
			.replace(/#server#/g, uploader.server)
			.replace(/#directory#/g, uploader.directory)
			.replace(/#ename#/g, uploader.ename)
			.replace(/#name#/g, uploader.name)
	});
});

describe('youtube', () => {
	youtubeTestAsset.URLs.forEach(url => {
		const videoId = 'DFYRQ_zQ-gk';
		const test = JSON.parse(JSON.stringify(youtubeTestAsset.testTemplate));
		test[0] = test[0].replace(/#url#/g, url);
		test[1] = test[1].replace(/#url#/g, url);
		test[2]['data-youtube-key'] = test[2]['data-youtube-key'].replace(/#video-id#/g, videoId);
		test[3] = test[3].replace(/#url#/g, url);
		registerTest(test);
	});
});
