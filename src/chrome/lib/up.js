/*
 * up/up2 extender for akahukuplus
 *
 * @author akahuku@gmail.com
 */

import {$, $qs, $qsa, empty, delay, load} from './utils.js';

/*
 * constants
 */

const THUMB_MAX_WIDTH = 125;
const ENABLE_BURST_LOAD = false;
const LAST_UPLOADED_ID_KEY = 'lastUpLoadedId';
const LAST_UPLOADED_FILES_KEY = 'lastUpLoadedFiles';
const THUMB_LOAD_WAIT_MSECS = 100;
// icon from https://icons8.com/
const LOADING_IMAGE_SOURCE = chrome.runtime.getURL('images/loading.png');
// icon from https://icon-icons.com/
const GENERIC_FILE_IMAGE_SOURCE = chrome.runtime.getURL('images/generic-file.png');

/*
 * variables
 */

let itemCount = 30;
let board = location.pathname.split('/')[1];

/*
 * functions
 */

function getReadableKSize (size) {
	if (size < 1000) {
		return `${size}Bytes`;
	}
	else {
		return `${Math.floor(size / 1000)}KB`;
	}
}

function getUUIDv4 () {
	return typeof crypto != 'undefined' && 'randomUUID' in crypto ?
		crypto.randomUUID() :
		'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
			.replace(/x/g, x => Math.floor(Math.random() * 16).toString(16))
			.replace(/y/g, y => (Math.floor(Math.random() * 4) + 8).toString(16))
}

function displayHUD (message) {
	let hud = $('akahukuplus-hud');
	if (!hud) {
		hud = document.body.appendChild(document.createElement('div'));
		hud.id = 'akahukuplus-hud';
	}

	hud.textContent = message;

	setTimeout(() => {
		const hud = $('akahukuplus-hud');
		if (hud) {
			hud.parentNode.removeChild(hud);
		}
	}, 1000 * 5);
}

function writeTextToClipboard (text) {
	try {
		navigator.clipboard.writeText(text);
	}
	catch (err) {
	}
}

function fillItem (container, isDetail, data) {
	const titles = [];

	// thumbnail
	const imageContainer = container.appendChild(document.createElement('a'));
	const img = imageContainer.appendChild(document.createElement('img'));
	imageContainer.className = 'image-container';
	imageContainer.href = `src/${data.name}`;
	imageContainer.target = '_blank';
	img.src = data.content || GENERIC_FILE_IMAGE_SOURCE;
	if (data.dimensions) {
		if (data.dimensions.thumbnail.width > data.dimensions.thumbnail.height) {
			container.classList.add('landscape');
		}
		else {
			container.classList.add('portrait');
		}
	}

	// meta info container...
	const meta = container.appendChild(document.createElement('div'));

	// name
	const name = meta.appendChild(document.createElement('div'));
	const nameAnchor = name.appendChild(document.createElement('a'));
	name.className = 'name';
	nameAnchor.textContent = data.name;
	nameAnchor.href = `src/${data.name}`;
	nameAnchor.target = '_blank';

	if (isDetail) {
		// restore original data
		if (container.dataset.original) {
			const original = JSON.parse(container.dataset.original);
			delete container.dataset.original;

			if (original.comment && !data.comment) {
				data.comment = original.comment;
			}
			if (original.size && !data.size) {
				data.size = original.size;
			}
			if (original.createdAtString && !data.createdAt) {
				data.createdAtString = data.createdAtString;
			}
		}

		// mime type
		if (data.mime) {
			titles.push(data.mime);
		}

		// file size
		if (data.size) {
			titles.push(getReadableKSize(data.size));
		}

		// misc infos
		if (data.size || data.createdAt || data.createdAtString) {
			const items = [];
			const pad2 = n => ('00' + n).substr(-2);
			const size = meta.appendChild(document.createElement('div'));
			size.className = 'size';

			if (data.size) {
				items.push(getReadableKSize(data.size));
			}
			if (data.createdAt) {
				const c = new Date(data.createdAt * 1000);
				const w = new Intl.DateTimeFormat('ja', {weekday: 'short'}).format(c)
				items.push(`${pad2(c.getMonth() + 1)}/${pad2(c.getDate())}(${w})${pad2(c.getHours())}:${pad2(c.getMinutes())}`);
			}
			if (data.createdAtString) {
				items.push(data.createdAtString);
			}

			size.textContent = items.join(', ');
		}

		if (data.comment) {
			const comment = meta.appendChild(document.createElement('div'));
			comment.className = 'comment';
			comment.textContent = data.comment;
		}

		// original dimension
		if (data.dimensions && data.dimensions.original) {
			const width = data.dimensions.original.width || 0;
			const height = data.dimensions.original.height || 0;
			if (width || height) {
				titles.push(`${width}×${height}`);
			}
		}

		// buttons
		const buttons = container.appendChild(document.createElement('div'));
		buttons.className = 'buttons';
		const copyAnchor = buttons.appendChild(document.createElement('a'));
		copyAnchor.className = 'copy';
		copyAnchor.textContent = 'コピー';
		copyAnchor.href = '#copy';
		copyAnchor.title = 'ファイル名をクリップボードにコピーします';
		copyAnchor.dataset.args = JSON.stringify({name: data.name});
		const deleteAnchor = buttons.appendChild(document.createElement('a'));
		deleteAnchor.className = 'copy';
		deleteAnchor.textContent = '削除';
		deleteAnchor.href = `up.php?del=${data.base.replace(/^[a-z]+/i, '')}`;
		deleteAnchor.target = '_blank';
		deleteAnchor.title = 'このファイルに対して削除を要請します';
	}

	container.title = titles.join(', ');
	if (data.comment) {
		container.title += '\n' + data.comment;
	}
}

function loadThumbnail (base) {
	const url = `${location.protocol}//appsweets.net/thumbnail/${board}/${base}s.js`;
	const options = {
		referrer: location.href,
		referrerPolicy: 'unsafe-url'
	};
	return load(url, options, 'json').then(data => {
		if (!data || data.error || !data.content || data.content.error) return;

		const container = $qs(`.akahukuplus-upped-file[data-base="${data.content.base}"]`);
		if (!container) return;

		const mainContent = $qs('.content:not(.float)', container);
		empty(mainContent);
		fillItem(mainContent, false, data.content);
		return delay(10).then(() => data);
	})
	.then(data => {
		if (!data || data.error || !data.content || data.content.error) return;

		const container = $qs(`.akahukuplus-upped-file[data-base="${data.content.base}"]`);
		if (!container) return;

		const mainContent = $qs('.content:not(.float)', container);
		const floatContent = $qs('.content.float', container);
		empty(floatContent);
		/*
		console.log([
			`offsetWidth: ${mainContent.offsetWidth}`,
			`clientRect: ${mainContent.getBoundingClientRect().width}`
		].join(', '));
		*/
		floatContent.style.width = `${mainContent.getBoundingClientRect().width}px`;
		fillItem(floatContent, true, data.content);;
	})
	.catch(err => {
		const messages = [];
		'stack' in err && messages.push(`stack: ${err.stack}`);
		'message' in err && messages.push(`message: ${err.message}`);
		'fileName' in err && messages.push(`fileName: ${err.fileName}`);
		'lineNumber' in err && messages.push(`lineNumber: ${err.lineNumber}`);
		console.error(messages.join('\n'));
	});
}

function createUppedItems (nodes) {
	function createUppedItem (node) {
		const [, base, ext] = /src\/([a-z]+[0-9]+)(\..+)/.exec(node.href);
		const container = $('akahukuplus-upped-files').appendChild(document.createElement('div'));
		container.className = 'akahukuplus-upped-file';
		container.dataset.base = base;
		container.dataset.ext = ext;

		const mainContent = container.appendChild(document.createElement('div'));
		mainContent.className = 'content';

		const floatContent = container.appendChild(document.createElement('div'));
		floatContent.className = 'content float';

		if (node instanceof Element) {
			const row = node.closest('tr');
			const original = {
				comment: $qs('.fco', row).textContent.replace(/^\s+|\s+$/g, ''),
				size: $qs('.fsz', row).textContent * 1000,
				createdAtString: $qs('.fnw',row).textContent
			};
			floatContent.dataset.original = JSON.stringify(original);
		}

		fillItem(mainContent, false, {
			name: base + ext,
			base: base,
			ext: ext,
			content: LOADING_IMAGE_SOURCE
		});

		return base;
	}

	function printLog (base) {
		const now = new Date;
		const s = now.toLocaleString();
		const m = now.getMilliseconds();

		if (base === undefined) {
			const mode = isBurstMode ? 'burst' : 'step by step';
			console.log(
				`${s}.${m} starting createUppedItems (${mode} mode)...`);
		}
		else {
			const delta = `(+${now.getTime() - lastLoaded} msecs)`;
			console.log(`${s}.${m} ${delta}: loading ${board}/${base}...`);
		}

		lastLoaded = now.getTime();
	}

	const isBurstMode = ENABLE_BURST_LOAD
		|| new URLSearchParams(location.search).get('thumb') === 'burst';
	let lastLoaded;

	printLog();

	if (isBurstMode) {
		return Promise.all(nodes.map(node => {
			const base = createUppedItem(node);
			printLog(base);
			return loadThumbnail(base);
		}));
	}
	else {
		return nodes.reduce((p, node) => {
			const base = createUppedItem(node);
			return p
			.then(() => printLog(base))
			.then(() => loadThumbnail(base))
			.then(() => delay(Math.max(THUMB_LOAD_WAIT_MSECS - (Date.now() - lastLoaded), 0)));
		}, Promise.resolve());
	}
}

/*
 *
 */

function addStyle () {
	const style = document.head.appendChild(document.createElement('style'));
	style.id = 'akahukuplus-extra-style';
	style.type = 'text/css';
	style.appendChild(document.createTextNode(`
#akahukuplus-upped-files {
	display:flex;
	flex-direction:row;
	flex-wrap:wrap;
	justify-content:center;
	align-items:stretch;
	align-content:stretch;
}
#akahukuplus-upped-files > .akahukuplus-upped-file {
	position:relative;
}
#akahukuplus-upped-files .content {
	margin:0 8px 8px 0;
	padding:0;
	background-color:#fff;
	color:#800000;
	box-shadow:1px 1px 2px 0 rgba(0,0,0,.3);
	border-radius:2px;
	line-height:1;
	text-align:center;
	overflow-x:hidden;
}
#akahukuplus-upped-files .content.float {
	position:absolute;
	left:0;
	top:0;
	margin:0;
	visibility:hidden;
	z-index:65536;
}
#akahukuplus-upped-files > .akahukuplus-upped-file:hover .content:not(.float) {
	box-shadow:none;
}
#akahukuplus-upped-files > .akahukuplus-upped-file:hover .content.float {
	visibility:visible;
}
#akahukuplus-upped-files .content a {
	background-color:transparent;
	color:#46a;
	text-decoration:none;
}
#akahukuplus-upped-files .content a:hover {
	color:#d44;
	text-decoration:none;
}
#akahukuplus-upped-files .content .image-container {
	display:flex;
	flex-direction:row;
	flex-wrap:nowrap;
	justify-content:center;
	align-items:center;
	margin:0;
	background-color:#f0e0d6;
	height:125px;
}
#akahukuplus-upped-files .content .image-container img {
	margin:0;
	max-height:125px;
}
#akahukuplus-upped-files .content .image-container:hover img {
	filter:brightness(1.125);
}
#akahukuplus-upped-files .content .name {
	margin:2px 4px 4px 4px;
	text-align:center;
	font-size:small;
	white-space:nowrap;
}
#akahukuplus-upped-files .content .size {
	margin:0 4px 4px 4px;
	text-align:center;
	font-size:x-small;
}
#akahukuplus-upped-files .content .comment {
	margin:0 4px 4px 4px;
	max-width:250px;
	text-align:left;
	font-size:x-small;
	overflow-wrap:anywhere;
	color:#789922;
}
#akahukuplus-upped-files .content .buttons {
	position:absolute;
	right:4px;
	top:4px;
	display:flex;
	flex-direction:column;
}
#akahukuplus-upped-files .content .copy {
	margin:0 0 4px 0;
	padding:2px;
	border-radius:2px;
	background-color:rgba(0,0,0,.75);
	color:#fff;
	text-decoration:none;
	font-size:small;
	cursor:pointer;
}
#akahukuplus-upped-files .content .copy:hover {
	background-color:#fff;
	color:#555;
}
#akahukuplus-upped-files > .akahukuplus-last-upped-item {
	margin:0 12px 0 0;
}
#akahukuplus-upped-files > .akahukuplus-last-upped-item > div {
	position:relative;
	margin:12px 0 0 0;
	padding:12px;
	background-color:#ea8;
	color:#800000;
	border-radius:8px;
	font-size:small;
	white-space:pre-line;
}
#akahukuplus-upped-files > .akahukuplus-last-upped-item > div:before {
	content:"";
	position:absolute;
	top:50%;
	left:-20px;
	margin-top:-10px;
	border:10px solid transparent;
	border-right:10px solid #ea8;
}
#akahukuplus-hud {
	position:fixed;
	top:16px;
	left:50%;
	transform:translateX(-50%);
	padding:8px;
	background-color:rgba(0,0,0,.5);
	color:#fff;
	border-radius:5px;
	font-size:medium;
	font-weight:bold;
	text-align:center;
}
.akahukuplus-more-button {
	margin:16px 0 0 0;
	text-align:center;
}
.akahukuplus-more-button a {
	margin:0;
	padding:8px 64px 8px 64px;
	background-color:#789922;
	color:#fff;
	border-radius:8px;
	font-size:medium;
	font-weight:bold;
	text-decoration:none;
}
.akahukuplus-more-button a:hover {
	background-color:#d44;
}
.akahukuplus-signature {
margin:1em 0 0 0;
text-align:right;
font-size:small;
font-style:italic;
}
	`));
}

function hideFirstPageLinks () {
	const pageLinks = $qsa('.pagelink');

	if (pageLinks.length >= 2) {
		if ((pageLinks[0].previousElementSibling || {}).nodeName == 'HR'
		&&  (pageLinks[0].nextElementSibling || {}).nodeName == 'HR') {
			pageLinks[0].nextElementSibling.parentNode.removeChild(pageLinks[0].nextElementSibling);

		}
		pageLinks[0].parentNode.removeChild(pageLinks[0]);
	}
}

function rebuildFileList (table) {
	const content = table.parentNode.insertBefore(document.createElement('div'), table);
	content.id = 'akahukuplus-upped-files';

	createUppedItems(Array.from($qsa(`td a[href^="src/f"]`, table))).then(() => {
		table.parentNode.removeChild(table);
	});
}

function extendDragAndDropBehavior () {
	document.addEventListener('dragover', e => {
		e.preventDefault();
	});
	document.addEventListener('drop', e => {
		e.preventDefault();
		try {
			const dataTransfer = e.clipboardData || e.dataTransfer;
			if (!dataTransfer) return;

			const up = $qs('form[action="up.php"] input[type="file"]');
			if (!up) return;

			up.files = dataTransfer.files;
		}
		catch (err) {
			console.error(err);
		}
	});
}

function extendSubmitAction () {
	$qsa('form[action="up.php"]').forEach(node => {
		node.addEventListener('submit', e => {
			const com = e.target.querySelector('input[name="com"]');
			if (!com) return;
			const uuid = getUUIDv4();
			let value = com.value;
			value = value.replace(/(?:(?:^|\s+)[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12})+$/i, '');
			value = `${value} ${uuid}`;
			value = value.replace(/^\s+/, '');
			com.value = value;
			sessionStorage.setItem(LAST_UPLOADED_ID_KEY, uuid);
		});
	});
}

function markLastUppedItem () {
	if (!(LAST_UPLOADED_ID_KEY in sessionStorage)) return;

	const uuid = sessionStorage.getItem(LAST_UPLOADED_ID_KEY);
	sessionStorage.removeItem(LAST_UPLOADED_ID_KEY);

	const target = $qs(`[data-original*="${uuid}"]`);
	if (target) {
		// find nearest container
		const container = target.closest('.akahukuplus-upped-file');

		// copy the file name to clipboard
		const fileName = container.dataset.base + container.dataset.ext;
		const fileNames = LAST_UPLOADED_FILES_KEY in sessionStorage ?
			sessionStorage.getItem(LAST_UPLOADED_FILES_KEY) + '\n' + fileName : fileName;
		const fileCount = (fileNames.match(/\n/g) || []).length + 1;
		writeTextToClipboard(fileNames);
		sessionStorage.setItem(LAST_UPLOADED_FILES_KEY, fileNames);

		// show indicator
		const indicatorContainer = container.parentNode.insertBefore(
			document.createElement('div'), container.nextSibling);
		const indicator = indicatorContainer.appendChild(document.createElement('div'));
		indicatorContainer.id = 'akahukuplus-last-upped-item';
		indicatorContainer.className = 'akahukuplus-last-upped-item';

		if (fileCount == 1) {
			indicator.textContent = [
				`今アップロードしたファイルです。`,
				`ファイル名 "${fileName}" はクリップボードにコピーされています。`
			].join('\n');
		}
		else {
			indicator.textContent = [
				`今アップロードしたファイルです。`,
				`"${fileName}" を含む ${fileCount} 個のファイル名はクリップボードにコピーされています。`
			].join('\n');

			// append utility anchor
			indicator.appendChild(document.createElement('br'));
			const anchor = indicator.appendChild(document.createElement('a'));
			anchor.textContent = '(このファイル名だけコピーしなおすにはこのリンクをクリックしてください)';
			anchor.href = '#rebuild-clipboard-file-name';
			anchor.dataset.fileName = fileName;
		}

		setTimeout(() => {
			sessionStorage.removeItem(LAST_UPLOADED_FILES_KEY);
			const indicatorContainer = $('akahukuplus-last-upped-item');
			if (indicatorContainer) {
				indicatorContainer.parentNode.removeChild(indicatorContainer);
			}
		}, 1000 * 60 * 10);
	}
}

function addMoreButton (table) {
	const container = table.parentNode.insertBefore(
		document.createElement('div'), table);
	container.className = 'akahukuplus-more-button';

	const anchor = container.appendChild(document.createElement('a'));
	anchor.href = '#more';
	anchor.textContent = 'もっと'
}

export function run () {
	// get file list table
	const table = $qs('a[href^="src/f"]').closest('table');
	if (!table) return;
	table.style.display = 'none';
	itemCount = Math.max($qsa('tr a[href^="src/f"]', table).length, 30);

	// add style element
	addStyle();

	// hide first page link
	hideFirstPageLinks();

	// rebuild file list
	rebuildFileList(table);

	// support file dropping to viewport
	extendDragAndDropBehavior();

	// override submit action
	extendSubmitAction();

	// mark last uploaded item
	markLastUppedItem();

	// add more button
	addMoreButton(table);

	// listen generic click events
	document.body.addEventListener('click', e => {
		const key = e.target.getAttribute('href') || e.target.getAttribute('id') || e.target.getAttribute('class');
		switch (key) {
		case '#copy':
			{
				e.preventDefault();
				const args = JSON.parse(e.target.dataset.args);
				if (args) {
					writeTextToClipboard(args.name);
					displayHUD(`クリップボードに "${args.name}" がコピーされました`);
				}
			}
			break;

		case '#more':
			{
				e.preventDefault();
				const lastItem = $qs('.akahukuplus-upped-file:last-child');
				if (lastItem) {
					const nodes = [];
					const [, prefix, number] = /^([a-z]+)(\d+)/.exec(lastItem.dataset.base);

					for (let i = number - 1, goal = Math.max(number - itemCount, 1); i > goal; i--) {
						nodes.push({href: `src/${prefix}${i}.xxx`});
					}

					createUppedItems(nodes);
				}
			}
			break;

		case '#rebuild-clipboard-file-name':
			{
				e.preventDefault();
				const fileName = e.target.dataset.fileName;
				writeTextToClipboard(fileName);
				sessionStorage.setItem(LAST_UPLOADED_FILES_KEY, fileName);
				e.target.parentNode.textContent = [
					`今アップロードしたファイルです。`,
					`ファイル名 "${fileName}" はクリップボードにコピーされています。`
				].join('');
			}
			break;
		}
	}, true);

	// last: add signature
	table.parentNode.insertBefore((() => {
		const div = document.createElement('div');
		div.className = 'akahukuplus-signature';
		//div.textContent = '(Thumbnails are added by akahukuplus)';
		div.textContent = '(サムネイルは赤福プラスによって付加されました)';
		return div;
	})(), table.nextSibling);
}
