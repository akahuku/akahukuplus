'use strict';

/*
 * akahukuplus
 *
 * @author akahuku@gmail.com
 */

document.addEventListener('DOMContentLoaded', function handler (e) {
	document.removeEventListener(e.type, handler);
	
	const THUMB_MAX_WIDTH = 125;
	const ENABLE_BURST_LOAD = false;
	const LAST_UPLOADED_ID_KEY = 'lastUpLoadedId';
	const THUMB_LOAD_WAIT_MSECS = 100;

	function load (board, base) {
		const url = `${location.protocol}//appsweets.net/thumbnail/${board}/${base}s.js`;
		const options = {
			referrer: location.href,
			referrerPolicy: 'unsafe-url'
		};
		return fetch(url, options)
		.then(response => response.json())
		.then(data => {
			if (!data || data.error) return;

			const node = document.querySelector(`td a[data-base="${data.base}"]`);
			if (!node) return;
			delete node.dataset.base;

			const titles = [];

			// mime
			if (data.mime) {
				titles.push(data.mime);
			}

			// file size
			if (data.size) {
				if (data.size < 1000) {
					titles.push(`${data.size}Bytes`);
				}
				else {
					titles.push(`${Math.floor(data.size / 1000)}KB`);
				}
			}

			// thumbnail
			if (data.content != '') {
				const parent = node.closest('td');
				node.parentNode.removeChild(node);

				const nodeText = node.textContent;
				node.textContent = '';

				const r = document.createRange();
				r.selectNodeContents(parent);
				r.deleteContents();

				const div = parent.appendChild(document.createElement('div'));
				div.className = 'akahukuplus-thumbnail';
				div.appendChild(node);

				const div2 = div.appendChild(document.createElement('div'));
				div2.className = 'akahukuplus-thumbnail-caption';
				div2.appendChild(document.createTextNode(nodeText));

				const img = node.appendChild(document.createElement('img'));
				img.src = data.content;
			}

			// original dimension
			if (data.dimensions && data.dimensions.original) {
				const width = data.dimensions.original.width || 0;
				const height = data.dimensions.original.height || 0;
				if (width || height) {
					titles.push(`${width}×${height}`);
				}
			}

			node.title = titles.join(', ');
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

	function loadThumbnailsAtOnce (board, query) {
		return Promise.all(Array.from(table.querySelectorAll(query)).map(node => {
			const re = /src\/([a-z]+[0-9]+)/.exec(node.href);
			node.dataset.base = re[1];
			const now = new Date;
			console.log(`${now.toLocaleString()}.${now.getMilliseconds()}: loading ${board}/${re[1]}...`);
			return load(board, re[1]);
		}));
	}

	async function loadThumbnailsOneByOne (board, query) {
		let lastLoaded;
		for (const node of Array.from(table.querySelectorAll(query))) {
			const re = /src\/([a-z]+[0-9]+)/.exec(node.href);
			node.dataset.base = re[1];

			const now = new Date;
			const delta = lastLoaded == undefined ?
				'' :
				` (+${now.getTime() - lastLoaded} msecs)`;
			console.log(`${now.toLocaleString()}.${now.getMilliseconds()}${delta}: loading ${board}/${re[1]}...`);
			lastLoaded = now.getTime();

			await load(board, re[1]);
			await new Promise(resolve => setTimeout(resolve, THUMB_LOAD_WAIT_MSECS));
		}
	}

	function getUUIDv4 () {
		return typeof crypto != 'undefined' && 'randomUUID' in crypto ?
			crypto.randomUUID() :
			'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
				.replace(/x/g, x => Math.floor(Math.random() * 16).toString(16))
				.replace(/y/g, y => (Math.floor(Math.random() * 4) + 8).toString(16))
	}

	// get file list table
	const table = document.querySelector(`a[href^="src/f"]`).closest('table');
	if (!table) return;

	// add style element
	const style = document.head.appendChild(document.createElement('style'));
	style.id = 'akahukuplus-extra-style';
	style.type = 'text/css';
	style.appendChild(document.createTextNode(`
.files tr:first-child:hover {
	background-color:transparent;
}
.akahukuplus-thumbnail {
	text-align:center;
	line-height:1;
}
.akahukuplus-thumbnail a:hover {
	background-color:transparent;
}
.akahukuplus-thumbnail img {
	margin:12px 0 3px 0;
	max-width:${THUMB_MAX_WIDTH}px;
	box-shadow:0 1px 3px 1px rgba(0,0,0,.3);
}
.akahukuplus-thumbnail a:hover img {
	outline:1px solid rgba(0,0,0,.3);
}
.akahukuplus-thumbnail-caption {
	margin:0 0 8px 0;
	text-align:center;
}
.akahukuplus-last-uploaded-item {
	display:inline-block;
	margin:4px 0 0 0;
	padding:4px;
	background-color:#eeaa88;
	color:#800;
	font-weight:bold;
	border-radius:3px;
}
.akahukuplus-signature {
	margin:1em 0 0 0;
	text-align:right;
	font-size:small;
	font-style:italic;
}
	`));

	// add thumbnails
	const board = location.pathname.split('/')[1];
	const query = `td a[href^="src/f"]`;
	if (ENABLE_BURST_LOAD) {
		loadThumbnailsAtOnce(board, query);
	}
	else {
		loadThumbnailsOneByOne(board, query);
	}

	// override submit action
	document.querySelectorAll('form[action="up.php"]').forEach(node => {
		node.addEventListener('submit', e => {
			const com = e.target.querySelector('input[name="com"]');
			if (!com) return;
			const uuid = getUUIDv4();
			com.value = /^\s*$/.test(com.value) ? uuid : `${uuid} ${com.value}`;
			sessionStorage.setItem(LAST_UPLOADED_ID_KEY, uuid);
		});
	});

	// mark last uploaded item
	if (LAST_UPLOADED_ID_KEY in sessionStorage) {
		const uuid = sessionStorage.getItem(LAST_UPLOADED_ID_KEY);
		sessionStorage.removeItem(LAST_UPLOADED_ID_KEY);

		const snapshot = document.evaluate(
			`//*[starts-with(.,"${uuid}")]`,
			document, null,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
		if (snapshot.snapshotLength) {
			// find nearest container
			const container = snapshot.snapshotItem(0).closest('td');

			// copy the file name to clipboard
			const fileName = /[^\/]+$/.exec(container.closest('tr').querySelector(query).href)[0];
			navigator.clipboard.writeText(fileName);

			// show indicator
			const indicatorContainer = container.appendChild(document.createElement('div'));
			const indicator = indicatorContainer.appendChild(document.createElement('div'));
			indicator.className = 'akahukuplus-last-uploaded-item';
			//indicator.textContent = `This is the file you just uploaded. The file name "${fileName}" is already copied to the clipboard.`;
			indicator.textContent = `今アップロードしたファイルです。ファイル名 "${fileName}" はクリップボードにコピーされています。`;
		}
	}

	// add signature
	table.parentNode.insertBefore((() => {
		const div = document.createElement('div');
		div.className = 'akahukuplus-signature';
		//div.textContent = '(Thumbnails are added by akahukuplus)';
		div.textContent = '(サムネイルは赤福プラスによって付加されました)';
		return div;
	})(), table.nextSibling);
});
