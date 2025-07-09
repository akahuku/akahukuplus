/**
 * image saving module for akahukuplus
 *
 *
 * Copyright 2022-2025 akahuku, akahuku@gmail.com
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

import {_, $qs, $qsa, empty, load} from './utils.js';

let assetURLTranslator;
let locale;

function loadAsset (url, options = {}, type) {
	const u = new URL(url);

	if (u.protocol === location.protocol && u.host === location.host) {
		return load(url, options, type);
	}
	else if (typeof assetURLTranslator === 'function') {
		return assetURLTranslator(url).then(objectURL => load(objectURL, options, type));
	}

	return Promise.reject(`loadAsset: same origin error: ${url}`);
}

export function getAssetURLTranslator () {
	return assetURLTranslator;
}

export function setAssetURLTranslator (value) {
	assetURLTranslator = value;
}

export function setLocale (l) {
	locale = l;
}

export function createAssetSaver (fileSystem) {
	async function save (url, localPath) {
		try {
			/*
			const buffer = [];
			for (let ch = 0; ch < localPath.length; ch++) {
				buffer.push(`${localPath.charAt(ch)}: ${localPath.charCodeAt(ch)}/0x${localPath.charCodeAt(ch).toString(16)}`);
			}
			console.log(localPath);
			console.log(buffer.join('\n'));
			*/

			const lsResult = await fileSystem.listFiles(localPath, {forReadWrite: true});
			/*if (lsResult.error) {
				return lsResult;
			}*/
			if (!lsResult.error && lsResult.files && lsResult.files.length) {
				return {localPath, created: false};
			}

			const image = await loadAsset(url, {}, 'blob');
			if (image.error) {
				return image;
			}

			const writeOptions = {create: true};
			const writeResult = await fileSystem.writeTo(localPath, image.content, writeOptions);
			if (writeResult.error) {
				return writeResult;
			}

			return {localPath, created: true};
		}
		catch (err) {
			return {error: err.message};
		}
	}

	async function getDirectoryTree (path = '') {
		try {
			const ls = await fileSystem.listFiles(path, {
				skipFile: true,
				directoryGenerator: (dir, path) => {
					const key = dir.name.replace(/,/g, '-');
					return {
						key: key,
						label: dir.name,
						name: dir.name,
						path: `${path}/${dir.name}`.replace(/^\//, '')
					};
				}
			});

			if (ls.error) {
				return ls;
			}

			const tree = [];

			if (ls.files) {
				tree.push({
					key: 'save-to',
					label: ls.baseName ? _('save_to_arg', ls.baseName) : _('save_to_here'),
					name: ls.baseName || '',
					path: ls.path.replace(/^\//, '')
				});

				if (ls.files.length) {
					tree.push({key: '-'});

					for (const dir of ls.files) {
						const ls2 = await getDirectoryTree(`${path}/${dir.name}`);
						if (ls2.dirLength) {
							dir.items = ls2.tree;
						}

						tree.push(dir);
					}
				}
			}

			return {
				tree,
				dirLength: ls.files ? ls.files.length : 0
			};
		}
		catch (err) {
			return {error: err.message};
		}
	}

	return {
		save, getDirectoryTree,
		get fileSystem () {return fileSystem}
	};
}

export function createThreadSaver (fileSystem) {
	const COMMENT_TRANSFORMER = `_locales/${locale}/saver-comments.xsl`;
	const DELIMITER = 'replies goes here';
	const ASSET_FOLD_MAX = 120;
	const LENGTH_BLOCK_WIDTH = 8;

	let assetExtensions = 'jpg,jpeg,png,gif,webp,webm,mp4,mov';
	let xsltProcessor;

	let running = false;
	let localPath;

	/*
	 * private functions
	 */

	function isAssetUrl (url) {
		// assets inside futaba
		if (/^https?:\/\/([^.]+)\.2chan\.net(?::\d+)?\//.test(url)) {
			return true;
		}

		// assets inside siokara
		if (/^https?:\/\/[^.]+\.(nijibox\d+)\.com(?::\d+)?\//.test(url)) {
			return true;
		}

		// assets inside appsweets.net
		if (/^https?:\/\/appsweets.net\//.test(url)) {
			return true;
		}

		return false;
	}

	function getIdFromUrl (url) {
		/*
		 * futaba's html has HTML4 doctype, so following rules apply to ID:
		 *
		 *   http://www.w3.org/TR/html4/types.html#type-id
		 *   >ID and NAME tokens must begin with a letter ([A-Za-z]) and may be
		 *   >followed by any number of letters, digits ([0-9]), hyphens ("-"),
		 *   >underscores ("_"), colons (":"), and periods (".").
		 */
		const transformed = url.replace(/[^A-Za-z0-9\-_:.]/g, '-');
		return `embed:${transformed}`;
	}

	function getAssetInitializer () {
		function f () {
			document.addEventListener('DOMContentLoaded',()=>{
				'use strict';
				const $=s=>document.getElementById(s),
					$qs=(s,d)=>(d||document).querySelector(s),
					$qsa=(s,d)=>(d||document).querySelectorAll(s),
					urls={},
					getUrl=key=>{
						const sourceNode=$(key);
						return !sourceNode?
							Promise.resolve():
							fetch(sourceNode.content.textContent)
								.then(r=>r.blob())
								.then(b=>urls[key]=URL.createObjectURL(b));
					},
					startDownload=e=>{
						e.preventDefault();
						const key=e.target.closest('a').dataset.src;
						getUrl(key).then(url=>{
							if(!url)return;
							const a=document.createElement('a');
							a.download=/[^-]+$/.exec(key)[0];
							a.href=url;
							a.click();
							URL.revokeObjectURL(url);
							delete urls[key];
						});
					};
				{
					const posts={},r=document.createRange();
					$qsa('.updated-posts').forEach(node=>{
						$qsa('.topic',node.content).forEach(node=>{
							posts.topic=node;
						});
						$qsa('.replies table',node.content).forEach(node=>{
							posts[$qs('.cno',node).textContent]=node;
						});
					});
					if(posts.topic){
						const top=$qs('[id^="delcheck"]'),bottom=$qs('blockquote');
						if(top&&bottom){
							r.selectNodeContents(posts.topic);
							const f=r.cloneContents();
							r.setStartBefore(top);
							r.setEndAfter(bottom);
							r.deleteContents();
							r.insertNode(f);
							delete posts.topic;
						}
					}
					for(const n in posts) {
						const reply=$(n.replace(/No\./,'delcheck'));
						if(!reply)continue;
						const table = reply.closest('table');
						if(!table)continue;
						r.selectNodeContents(table);
						r.deleteContents();
						r.insertNode(document.importNode(posts[n],true));
					}
				}
				{
					const sodane={};
					$qsa('.sodane-delta').forEach(node=>{
						for(let a=node.content.textContent.split(','),i=0,p=0;i<a.length;){
							const n=parseInt(a[i++],36)+p, v=parseInt(a[i++],36);
							sodane[n]=v;
							p=n;
						}
					});
					for(const n in sodane) {
						const r=(document.evaluate(`//*[@class="cno" and text()="No.${n}"]`,document,null,9,null)||{}).singleNodeValue,
							s=r?$qs('.sod', r.closest('table,.thre')):null;
						if(s)s.textContent=`そうだねx${sodane[n]}`;
					}
				}
				Array.from($qsa('[data-src^="embed:"]')).reduce((p,node)=>{
					switch(node.nodeName){
					case 'A':
						node.addEventListener('click',startDownload);
						break;
					case 'STYLE':
						node.appendChild(document.createTextNode(atob($(node.dataset.src).content.textContent.replace(/^[^,]+,/,''))));
						break;
					default:
						p=p.then(()=>{
							const key=node.dataset.src;
							return (key in urls?Promise.resolve(urls[key]):getUrl(key)).then(url=>{
								if(!url)return;
								else if('src' in node)node.src=url;
								else if('href' in node)node.href=url;
							});
						});
						break;
					}
					return p;
				},Promise.resolve());
			},{once:true});
		}

		return f.toString()
			.replace(/\n\s*/g, '')
			.replace(/;\}/g, '}')
			.replace(/^[^{]+\{/, '')
			.replace(/\}\s*$/, '');
	}

	function ensureXSLTProcessor () {
		if (xsltProcessor) {
			return Promise.resolve(xsltProcessor);
		}

		return load(chrome.runtime.getURL(COMMENT_TRANSFORMER), {}, 'text')
			.then(result => {
				const xsl = (new DOMParser).parseFromString(result.content, 'text/xml');
				xsltProcessor = new XSLTProcessor;
				xsltProcessor.importStylesheet(xsl);
				return xsltProcessor;
			});
	}

	function createIntermediateDocument (topicWrap, firstReply, lastReply) {
		const doctype = document.implementation.createDocumentType(
			'html',
			'-//W3C//DTD XHTML 1.0 Strict//EN',
			'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd');
		const doc = document.implementation.createDocument(
			'http://www.w3.org/1999/xhtml', 'html', doctype);
		doc.documentElement.innerHTML = '<head></head><body></body>';

		const r = document.createRange();

		// topic
		if (topicWrap) {
			r.selectNode(topicWrap);
			doc.body.appendChild(r.cloneContents());
		}

		// replies
		if (firstReply && lastReply) {
			r.setStartBefore(firstReply);
			r.setEndAfter(lastReply);
			doc.body.appendChild(r.cloneContents());
		}

		return doc;
	}

	function createMetadataCommentElement (doc, lastReply, assetSet) {
		return doc.createComment(JSON.stringify({
			lastReply: {
				offset: lastReply ? lastReply.querySelector('.no').textContent - 0 : 0,
				number: lastReply ? lastReply.querySelector('[data-number]').dataset.number - 0 : 0
			},
			assetSet: Array.from(assetSet)
		}))
	}

	function createLengthBlockCommentString (footerBlob) {
		const size36 = ('00000000' + footerBlob.size.toString(36)).substr(-LENGTH_BLOCK_WIDTH);
		return `<!--${size36}-->`;
	}

	async function translateStylesheets (doc, assetSet) {
		const sentinel = doc.body.firstChild;

		for (const node of Array.from($qsa('link[href][rel="stylesheet"]', doc))) {
			const url = node.href;
			if (!isAssetUrl(url)) continue;

			node.parentNode.removeChild(node);

			if (assetSet.has(node.href)) continue;

			assetSet.add(url);

			// append style element to bottom of head
			const id = getIdFromUrl(url);
			const styleElement = doc.head.appendChild(doc.createElement('style'));
			styleElement.setAttribute('data-src', id);

			// load content of style
			const styleContent = await loadAsset(
				node.href, {}, `data;fold=${ASSET_FOLD_MAX}`);
			if (!styleContent.error) {
				// prepend base64-encoded content of stylesheet to top of body
				const template = doc.body.insertBefore(doc.createElement('template'), sentinel);
				template.setAttribute('id', id);
				template.content.appendChild(doc.createTextNode('\n'));
				template.content.appendChild(doc.createTextNode(styleContent.content));
				doc.body.insertBefore(doc.createTextNode('\n'), sentinel);
			}
		}
	}

	async function translateAssets (container, assetSet) {
		const doc = container.ownerDocument;
		const assetSelector = assetExtensions
			.split(/\s*,\s*/)
			.map(a => `img[src$=".${a}" i], a[href$=".${a}" i]`)
			.join(',');

		for (const node of Array.from($qsa(assetSelector, container))) {
			const url = node['src' in node ? 'src' : 'href'];
			if (!isAssetUrl(url)) continue;

			const id = getIdFromUrl(url);
			node.setAttribute('data-src', id);
			if ('src' in node) {
				node.removeAttribute('src');
			}
			else {
				const basename = /[^/]*$/.exec((new URL(url)).pathname)[0];
				node.setAttribute('href', `#${basename}`);
			}

			if (assetSet.has(url)) continue;

			assetSet.add(url);

			// load content of asset
			const assetContent = await loadAsset(
				url, {}, `data;fold=${ASSET_FOLD_MAX}`);
			if (!assetContent.error) {
				// append base64-encoded content of asset to bottom of container
				const template = container.appendChild(doc.createElement('template'));
				template.setAttribute('id', id);
				template.content.appendChild(doc.createTextNode('\n'));
				template.content.appendChild(doc.createTextNode(assetContent.content));
				container.appendChild(doc.createTextNode('\n'));
			}
		}
	}

	/*
	 * functions for start()
	 */

	async function createInitialContent (content) {
		const assetSet = new Set;

		/*
		 * manipulate text #1
		 */

		content = content.replace(/\r/g, '');
		content = content.replace(/(<![^>]+>)\n?/, '$1\n');
		content = content.replace(/<!--[\s\S]*?-->/g, '');
		content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
		content = content.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/g, '');
		content = content.replace(/(<[\S]+\s+[^>]*?)(data-[^=]+="[^"]*")/g, '$1');
		content = content.replace(/(<[\S]+\s+[^>]*?)(onclick="[^"]*")/gi, '$1');
		content = content.replace(
			'</head>',
			'<script>' + getAssetInitializer() + '</script></head>');

		while (/<div[^>]*>[\s\n]*<\/div>/.test(content)) {
			content = content.replace(/<div[^>]*>[\s\n]*<\/div>/g, '');
		}

		/*
		 * manipulate DOM
		 */

		content = (new DOMParser).parseFromString(content, 'text/html');

		// retrieve thread division and ensure the document is reply mode
		const threadDiv = (threads => {
			if (threads.length > 1) {
				throw new Error('Seems to be more than one thread division');
			}
			return threads[0];
		})($qsa('.thre', content));

		// remove post form
		for (const node of Array.from($qsa('table.ftbl', content))) {
			node.parentNode.removeChild(node);
		}

		// canonicalize all links, sources, actions
		for (const attr of ['href', 'src', 'action']) {
			for (const node of Array.from($qsa(`[${attr}]`, content))) {
				node.setAttribute(attr, node[attr]);
			}
		}

		// update all meta elements which has content-type attribute
		for (const node of Array.from($qsa('meta[http-equiv="content-type" i]', content))) {
			node.setAttribute('content', 'text/html; charset=UTF-8');
		}

		// remove all replies generated from the original thread source
		// (This is a bit hacky: if there are other unrelated elements in
		// the replies, delete them too.)
		const replies = $qsa('.thre td.rtd', content);
		if (replies.length) {
			const r = content.createRange();
			r.setStartBefore(replies[0].closest('table'));
			r.setEndAfter(replies[replies.length - 1].closest('table'));
			r.deleteContents();
		}

		// transform topic comment and all reply comments on akahukuplus content
		// to a format similar to the html returned by futaba
		const firstReply = document.querySelector('.replies .reply-wrap:first-child');
		const lastReply = document.querySelector('.replies .reply-wrap:last-child');
		const transformedComments = xsltProcessor.transformToDocument(
			createIntermediateDocument(
				document.querySelector('.topic-wrap'), firstReply, lastReply));
		if (transformedComments) {
			const r = transformedComments.createRange();

			// replace topic comment with transformed one
			const firstComment = content.querySelector('blockquote');
			empty(firstComment);
			r.selectNodeContents(transformedComments.querySelector('.topic blockquote'));
			firstComment.appendChild(r.cloneContents());

			// append all transformed replies
			r.selectNodeContents(transformedComments.querySelector('.replies'));
			threadDiv.appendChild(r.cloneContents());
		}

		// translate all links that points stylesheet into embeded templates
		await translateStylesheets(content, assetSet);

		// translate all assets into embeded templates
		await translateAssets(threadDiv, assetSet);

		// mark reply place by comment
		threadDiv.appendChild(content.createComment(DELIMITER));

		// store metadata as comment
		threadDiv.appendChild(createMetadataCommentElement(content, lastReply, assetSet));

		/*
		 * manipulate text #2
		 */

		content = [
			new XMLSerializer().serializeToString(content.doctype),
			content.documentElement.outerHTML
				.replace(/(<table[\s\S]+?<\/table>)\n*/g, ($0, $1) => $1.replace(/\n/g, '') + '\n')
				.replace(/\n{2,}/g, '\n')
				.replace(/^\s+|\s+$/g, '')
		].join('\n').split(`<!--${DELIMITER}-->`);
		return [
			...content,
			lastReply ? lastReply.querySelector('.no').textContent - 0 : 0,
			lastReply ? lastReply.querySelector('[data-number]').dataset.number - 0 : 0
		];
	}

	/*
	 * functions for push()
	 */

	async function readHTMLData () {
		const fileHandleResult = await fileSystem.getFileHandle(localPath, true);
		if (fileHandleResult.error) {
			throw new Error(`readHTMLData: ${fileHandleResult.error}`);
		}
		const file = await fileHandleResult.fileHandle.getFile();
		const fileSize = file.size;

		// read <!--[size]--> block
		const lengthBlockSize = '<!---->'.length + LENGTH_BLOCK_WIDTH;
		const lengthBlock = await (await file.slice(-lengthBlockSize)).text();
		if (!/<!--([0-9a-z]+)-->/i.test(lengthBlock)) {
			throw new Error(`readHTMLData: invalid length block: "${lengthBlock}"`);
		}
		const footerSize = parseInt(RegExp.$1, 36);

		// read footer block
		const footerBlock = await (await file.slice(-(footerSize + lengthBlockSize), -lengthBlockSize)).text();
		if (!/^<!--(\{.+?\})-->([\s\S]+)/.test(footerBlock)) {
			throw new Error(`readHTMLData: invalid footer block: "${footerBlock.substring(0, 256)}"...`);
		}
		const metadata = JSON.parse(RegExp.$1);
		const footer = RegExp.$2;

		return {
			fileHandle: fileHandleResult.fileHandle,
			metadata, fileSize, lengthBlockSize, footerSize, footer
		};
	}

	async function translateUpdatedPosts (container, assetSet, firstNumber, stats) {
		const doc = container.ownerDocument;
		let result = 0;

		if (stats.delta.mark || (stats.delta.id && !stats.idDisplay)) {
			const updatedPosts = new Map;
			if (stats.delta.mark) {
				for (const [key, marks] of stats.markData) {
					for (const {isNew, number} of marks) {
						if (!isNew) continue;
						if (firstNumber >= 0 && number >= firstNumber) continue;
						if (updatedPosts.has(number)) {
							updatedPosts.get(number).push(`known mark (${key})`);
						}
						else {
							updatedPosts.set(number, [`known mark (${key})`]);
						}
					}
				}
				for (const [host, marks] of stats.otherMarkData) {
					for (const {isNew, number} of marks) {
						if (!isNew) continue;
						if (firstNumber >= 0 && number >= firstNumber) continue;
						if (updatedPosts.has(number)) {
							updatedPosts.get(number).push(`host mark (${host})`);
						}
						else {
							updatedPosts.set(number, [`host mark (${host})`]);
						}
					}
				}
			}
			if (stats.delta.id && !stats.idDisplay) {
				for (const [id, ids] of stats.idData) {
					for (const {isNew, number} of ids) {
						if (!isNew) continue;
						if (firstNumber >= 0 && number >= firstNumber) continue;
						if (updatedPosts.has(number)) {
							updatedPosts.get(number).push(`id (${id})`);
						}
						else {
							updatedPosts.set(number, [`id (${id})`]);
						}
					}
				}
			}
			if (updatedPosts.size) {
				let transformed = createIntermediateDocument();
				for (const [number] of updatedPosts) {
					let node;
					if ((node = $qs(`article .topic-wrap[data-number="${number}"]`))) {
						transformed.body.appendChild(
							transformed.importNode(node, true));
					}
					else if ((node = $qs(`article .reply-wrap > [data-number="${number}"]`))) {
						transformed.body.appendChild(
							transformed.importNode(node.closest('.reply-wrap'), true));
					}
				}
				transformed = xsltProcessor.transformToDocument(transformed);
				if (transformed) {
					/*
					 * transformed mark up structure:
					 *
					 * <html>
					 *   <body>
					 *     <div class="topic">
					 *       <span id="delcheck99999999"></span>
					 *             :
					 *       <blockquote>...</blockquote>
					 *     </div>
					 *     <div class="replies">
					 *       <table>...</table>
					 *             :
					 *       <table>...</table>
					 *     </div>
					 *   </body>
					 * </html>
					 */
					await translateAssets(transformed.body, assetSet);

					const template = container.appendChild(doc.createElement('template'));
					template.setAttribute('class', 'updated-posts');

					const updatedTopic = transformed.querySelector('.topic');
					if (updatedTopic && updatedTopic.childElementCount) {
						template.content.appendChild(doc.importNode(updatedTopic, true));
					}

					const updatedReplies = transformed.querySelector('.replies');
					if (updatedReplies && updatedReplies.childElementCount) {
						template.content.appendChild(doc.importNode(updatedReplies, true));
					}

					container.appendChild(doc.createTextNode('\n'));
					result++;
				}
			}
		}

		/*
		 * append sodane
		 */

		if (stats.delta.sodane.length) {
			const data = [];
			const log = ['found sodane:'];
			let previousNumber = 0;
			for (const {number, value, oldValue} of stats.delta.sodane) {
				if (firstNumber >= 0 && number >= firstNumber) continue;
				data.push((number - previousNumber).toString(36));
				data.push(value.toString(36));
				previousNumber = number;
				log.push(`No.${number}: そうだね×${value} (+${value - oldValue})`);
			}
			if (data.length) {
				const template = container.appendChild(doc.createElement('template'));
				template.setAttribute('class', 'sodane-delta');
				template.content.textContent = data.join(',');
				container.appendChild(doc.createTextNode('\n'));
				result++;
			}
		}

		return result;
	}

	async function createNewRepliesContent (htmlData, stats) {
		const assetSet = new Set(htmlData.metadata.assetSet);
		const firstReply = (document.evaluate(
			`//*[@class="replies"]//*[@class="no" and text()="${htmlData.metadata.lastReply.offset + 1}"]/ancestor::*[@class="reply-wrap"]`,
			document, null,
			window.XPathResult.FIRST_ORDERED_NODE_TYPE,
			null) || {}).singleNodeValue;
		const lastReply = document.querySelector('.replies .reply-wrap:last-child');
		const firstNumber = firstReply ?
			firstReply.querySelector('[data-number]').dataset.number - 0 : -1;
		const transformedComments = xsltProcessor.transformToDocument(
			createIntermediateDocument(null, firstReply, lastReply));
		if (!transformedComments) {
			throw new Error('createNewRepliesContent: failed to transform new comments');
		}

		const replies = transformedComments.querySelector('.replies');
		await translateAssets(replies, assetSet);
		await translateUpdatedPosts(replies, assetSet, firstNumber, stats);

		/*
		 * last
		 */

		replies.appendChild(transformedComments.createComment(DELIMITER));
		replies.appendChild(createMetadataCommentElement(transformedComments, lastReply, assetSet));

		const result = replies.innerHTML
			.replace(/(<table[\s\S]+?<\/table>)\n*/g, ($0, $1) => $1.replace(/\n/g, '') + '\n')
			.replace(/\n{2,}/g, '\n')
			.replace(/^\s+|\s+$/g, '')
			.split(`<!--${DELIMITER}-->`);
		return [
			...result,
			lastReply ? lastReply.querySelector('.no').textContent - 0 : 0,
			lastReply ? lastReply.querySelector('[data-number]').dataset.number - 0 : 0
		];
	}

	/*
	 * public functions
	 */

	async function start (content, aLocalPath) {
		try {
			const [root] = await Promise.all([
				// Show permission dialog for file access early on if necessary
				// for a responsive UI.
				fileSystem.getRootDirectory(true),

				ensureXSLTProcessor()
			]);

			if (root.error) {
				return root;
			}

			/*
			 * html1:
			 *   <!doctype html public...>
			 *     :
			 *     :
			 *   (last reply markup)
			 *
			 * html2:
			 *   <!--(metadata json)-->
			 *   (footer)
			 *   <!--(footer length)-->
			 */
			const [html1, html2, lastOffset] = await createInitialContent(content);

			const html2Blob = new Blob(
				[html2],
				{type: 'text/html'});
			const html2Size = createLengthBlockCommentString(html2Blob);

			const result = await fileSystem.writeTo(
				aLocalPath,
				new Blob([html1, html2Blob, html2Size], {type: 'text/html'}),
				{create: true});
			if (result.error) {
				throw new Error(result.error);
			}

			localPath = aLocalPath;
			running = true;

			return {localPath, lastOffset};
		}
		catch (err) {
			console.dir(err);
			return {
				error: err.message,
				stack: err.stack
			};
		}
	}

	async function push (stats) {
		try {
			await ensureXSLTProcessor();

			/*
			 * html1:
			 *   (top of the new reply markups)
			 *     :
			 *     :
			 *   (last of the new reply markups)
			 *
			 * html2:
			 *   <!--(metadata json)-->
			 *   (footer)
			 *   <!--(footer length)-->
			 */
			const htmlData = await readHTMLData();
			const [html1, html2, lastOffset] = await createNewRepliesContent(htmlData, stats);

			const html2Blob = new Blob(
				[html2, htmlData.footer],
				{type: 'text/html'});
			const html2Size = createLengthBlockCommentString(html2Blob);

			const writable = await htmlData.fileHandle.createWritable({keepExistingData: true});
			try {
				await writable.write({
					type: 'write',
					// The blob supports negative positions,
					// but the FileSystemWritableFileStream does not
					position: htmlData.fileSize - htmlData.footerSize - htmlData.lengthBlockSize,
					data: new Blob([html1, html2Blob, html2Size], {type: 'text/html'})
				});
			}
			finally {
				await writable.close();
			}

			return {localPath, lastOffset};
		}
		catch (err) {
			console.dir(err);
			return {
				error: err.message,
				stack: err.stack
			};
		}
	}

	function stop () {
		running = false;
		xsltProcessor = localPath = undefined;
	}

	return {
		push, start, stop,
		get running () {return running},
		get fileSystem () {return fileSystem}
	};
}
