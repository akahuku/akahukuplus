/**
 * URL auto linkifier
 *
 *
 * Copyright 2012-2025 akahuku, akahuku@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {_} from './utils.js';
import {emojiRegex} from './utils-apext.js';

// link target class
class LinkTarget {
	constructor (pattern, handler, options = {}) {
		this.pattern = pattern;
		this.handler = handler;
		this.className = options.className || 'link-external';
		this.preferredScheme = options.preferredScheme || undefined;
		this.overrideScheme = options.overrideScheme || undefined;
		this.title = options.title || undefined;
		this.anchorElement = options.anchorElement || 'a';
	}

	setupAnchor (re, anchor) {
		const params = re
			.slice(this.offset, this.offset + this.backrefLength)
			.map(a => a === undefined ? '' : a);
		const anchorProxy = anchor instanceof HTMLAnchorElement ?
			{
				setAttribute: (key, value) => {
					if (key !== 'className' && key !== 'class' && key !== 'href') {
						anchor.setAttribute(`data-${key}`, value);
					}
					else {
						anchor.setAttribute(key, value);
					}
				}
			} : anchor;

		if (this.className !== undefined) {
			anchorProxy.setAttribute('class', this.className);
		}

		if (this.title !== undefined) {
			anchorProxy.setAttribute('title', this.title);
		}

		let href = this.handler(params, anchorProxy);
		if (this.overrideScheme !== undefined) {
			href = this.overrideScheme + '//' + href.replace(/^(?:[^:]+:)?\/\//, '');
		}
		else {
			href = this.completeScheme(href);
		}

		// reject suspicious URLs
		if (/:\/\/pollmill\.com\//.test(href)) {
			anchor.textContent = _('suspicious_url');
		}

		anchorProxy.setAttribute('href', href);
	}

	completeScheme (url) {
		const defaultScheme = this.preferredScheme || 'http:';

		// * (http) is default scheme
		//
		// www.example.net   -> (http)://www.example.net
		// //www.example.net -> (http)://www.example.net
		const re = /^([^:]+):/.exec(url);
		if (!re) {
			return defaultScheme + '//' + url.replace(/^\/+/, '');
		}

		// ://www.example.net  -> (http)://www.example.net
		// p://www.example.net -> http://www.example.net
		// s://www.example.net -> https://www.example.net
		let scheme = defaultScheme;
		if (/^h?t?t?p?s$/.test(re[1])) {
			scheme = 'https:';
		}
		else if (/^h?t?t?p$/.test(re[1])) {
			scheme = 'http:';
		}

		return scheme + url.replace(/^[^:]+:/, '');
	}

	upHandler (re, anchor, baseUrl) {
		const [, scheme, fileId, extension] = re;

		if (extension) {
			anchor.setAttribute('basename', fileId + extension);

			// if extension is supported by lightbox, add attribute
			if (/\.(?:jpe?g|gif|png|webp|webm|mp4|mp3|ogg)$/.test(extension)) {
				anchor.setAttribute(
					'class',
					`${this.className} lightbox`);
			}

			// if extension is supported by thumbnail service, add attribute
			if (/\.(?:jpe?g|gif|png|webp|webm|mp4)$/.test(extension)) {
				const boardName = /\/(up2?)\/$/.exec(baseUrl)[1];
				anchor.setAttribute(
					'thumbnail',
					`https://appsweets.net/thumbnail/${boardName}/${fileId}s.png`);
			}

			return `${scheme}${baseUrl}src/${fileId}${extension}`;
		}
		else {
			anchor.setAttribute('basename', fileId);
			anchor.setAttribute('class', `${this.className} incomplete`);
			return `${scheme}${baseUrl}up.htm`;
		}
	}
}

// utility functions

function decodePercentEncode (text) {
	try {
		return text.replace(/(?:%[0-9a-f][0-9a-f])+/gi, decodeURIComponent);
	}
	catch {
		return text;
	}
}

function reduceURL (url) {
	const LIMIT = 100;
	const seps = ['/', '&'];

	if (url.length <= LIMIT) {
		return url;
	}

	let re = /^((?:[^:]+:\/\/)?[^/]+\/)([^?]*)?(\?.*)?/.exec(url);
	let result = re[1];
	const components = [(re[2] || '').split(seps[0]), (re[3] || '').split(seps[1])];

	components.forEach((cs, i) => {
		if (i === 1 && components[0].length) return;

		while (cs.length && result.length < LIMIT) {
			result += cs[0];
			if (cs.length > 1) {
				result += seps[i];
			}
			cs.shift();
		}

		if (result.length >= LIMIT) {
			const lastIndex = result.lastIndexOf(seps[i]);
			if (lastIndex >= 0) {
				cs.push(result.substring(lastIndex + 1));
				result = result.substring(0, lastIndex + 1);
			}
		}
	});

	if (components[0].length || components[1].length) {
		result += _('snip');
	}

	return result;
}

function findLinkTarget (re) {
	let linkTarget;
	linkTargets.some(a => {
		if (re[a.offset] !== undefined && re[a.offset] !== '') {
			linkTarget = a;
			return true;
		}
	});
	return linkTarget;
}

function grabTheRightIcon (s, sep = '-') {
	return [...(s.includes('\u200d') ? s : s.replace(/\ufe0f/g, ''))]
		.map(ch => ch.codePointAt(0).toString(16))
		.join(sep);
}

// constants

const linkTargets = [
	new LinkTarget(
		'(h?t?t?p?s?://)?(?:dec\\.2chan\\.net/up2/src/)?(fu\\d{4,10})(\\.\\w+)?',
		function (re, anchor) {
			return this.upHandler(re, anchor, 'dec.2chan.net/up2/');
		},
		{
			className: 'link-up',
			title: 'あぷ小',
			preferredScheme: 'https:'
		}
	),
	new LinkTarget(
		'(h?t?t?p?s?://)?(?:dec\\.2chan\\.net/up/src/)?(f\\d{4,10})(\\.\\w+)?',
		function (re, anchor) {
			return this.upHandler(re, anchor, 'dec.2chan.net/up/');
		},
		{
			className: 'link-up',
			title: 'あぷ',
			preferredScheme: 'https:'
		}
	),
	new LinkTarget(
		'(h?t?t?p?s?://)?[^.]+\\.2chan\\.net/[^/]+/src/\\d+\\.(?:jpe?g|gif|png|webp|webm|mp4)',
		function (re, anchor) {
			anchor.setAttribute(
				'thumbnail',
				this.completeScheme(re[0]
					.replace('/src/', '/thumb/')
					.replace(/\.[^.]+$/, 's.jpg')));
			return re[0];
		},
		{
			className: 'link-futaba lightbox',
			preferredScheme: 'https:'
		}
	),
	new LinkTarget(
		'(?:h?t?t?p?s?://)?(' + [
			'(?:(?:www|m)\\.)?youtube\\.com/[^/]+\\?(?:.*?v=([\\w\\-]+))',
			'(?:(?:www|m)\\.)?youtube\\.com/(?:v|embed)/([\\w\\-]+)',
			'youtu\\.be/([\\w\\-]+)'
		].join('|') + ')(?:[?&]\\S+(?:=\\S*)?)*',
		function (re, anchor) {
			anchor.setAttribute('youtube-key', re[2] || re[3] || re[4]);
			return re[0];
		},
		{
			className: 'link-youtube',
			title: 'YouTube',
			overrideScheme: 'https:'
		}
	),
	new LinkTarget(
		'(?:h?t?t?p?s?://)?(' + [
			'(?:[^.]+\\.)?nicovideo\\.jp/watch/([a-z]{2}\\d+)',
			'nico\\.ms/([a-z]{2}\\d+)'
		].join('|') + ')(?:[?&]\\S+(?:=\\S*)?)*',
		function (re, anchor) {
			anchor.setAttribute('nico2-key', re[2] || re[3]);
			return re[0];
		},
		{
			className: 'link-nico2',
			title: 'ニコニコ動画',
			overrideScheme: 'https:'
		}
	),
	new LinkTarget(
		'(?:h?t?t?p?s?://)?(?:mobile\\.)?(?:twitter|x)\\.com/([^/]+)/status/(\\d+)(?:[?&/]\\S*)*',
		function (re, anchor) {
			anchor.setAttribute('tweet-id', `${re[1]}/${re[2]}`);
			return re[0];
		},
		{
			className: 'link-twitter',
			title: 'Twitter',
			overrideScheme: 'https:'
		}
	),
	new LinkTarget(
		'(?:[^:\\s]+://|www\\.)(?:[^.]+\\.)+[^.]+(?::\\d+)?/\\S*',
		function (re) {
			return re[0];
		},
		{
			className: 'link-external'
		}
	)
];

const linkTargetRegex = new RegExp(
	'\\b(?:(' + linkTargets
	.map((a, i) => {
		const re = (a.pattern.replace(/\(\?/g, '')).match(/\(/g);
		linkTargets[i].backrefLength = (re ? re.length : 0) + 1;
		linkTargets[i].offset = i > 0 ?
			linkTargets[i - 1].offset + linkTargets[i - 1].backrefLength :
			1;
		return a.pattern;
	})
	.join(')|(') + '))'
);

const leaderRegex = /[…‥]+|[・･]{2,}|(?:\.\.\.)+/;

// public functions

export function linkify (node, opts = {linkify: true, emojify: true}) {
	const r = node.ownerDocument.createRange();
	let re;
	while (node.lastChild && node.lastChild.nodeType === 3) {
		if (opts.linkify && (re = linkTargetRegex.exec(node.lastChild.nodeValue))) {
			const linkTarget = findLinkTarget(re);
			if (!linkTarget) break;

			const anchor = node.ownerDocument.createElement(linkTarget.anchorElement);
			r.setStart(node.lastChild, re.index);
			r.setEnd(node.lastChild, re.index + re[0].length);
			r.surroundContents(anchor);

			anchor.textContent = decodePercentEncode(anchor.textContent);
			anchor.textContent = reduceURL(anchor.textContent);
			linkTarget.setupAnchor(re, anchor);
		}

		else if (opts.emojify && (re = emojiRegex.exec(node.lastChild.nodeValue))) {
			const emoji = node.ownerDocument.createElement('emoji');

			r.setStart(node.lastChild, re.index);
			r.setEnd(node.lastChild, re.index + re[0].length);
			r.surroundContents(emoji);

			emoji.setAttribute('codepoints', grabTheRightIcon(re[0]));
		}

		else if ((re = leaderRegex.exec(node.lastChild.nodeValue))) {
			const leader = node.ownerDocument.createElement('leader');

			r.setStart(node.lastChild, re.index);
			r.setEnd(node.lastChild, re.index + re[0].length);
			r.surroundContents(leader);

			const lengthCalculator = re[0]
				.replace(/[・･]{3}/g, '…')
				.replace(/\.{3}/g, '…');
			leader.setAttribute('length', Math.min(lengthCalculator.length, 4));
		}

		else {
			node.lastChild.nodeValue = node.lastChild.nodeValue.replace(
				/[a-zA-Z0-9\u3040-\u30ff\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]{20}/g,
				'$&\u200b');
			break;
		}
	}
}
