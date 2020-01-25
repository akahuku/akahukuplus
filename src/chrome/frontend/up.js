'use strict';

/*
 * akahukuplus
 *
 * @author akahuku@gmail.com
 */

document.addEventListener('DOMContentLoaded', function handler (e) {
	document.removeEventListener(e.type, handler);
	
	const THUMB_MAX_WIDTH = 125;

	function load (board, base) {
		return fetch(`//appsweets.net/thumbnail/${board}/${base}s.js`)
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
			console.error(err.stack);
		});
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
	Promise.all(Array.from(table.querySelectorAll(query)).map(node => {
		const re = /src\/([a-z]+[0-9]+)/.exec(node.href);
		node.dataset.base = re[1];
		return load(board, re[1]);
	}));

	// add signature
	table.parentNode.insertBefore((() => {
		const div = document.createElement('div');
		div.className = 'akahukuplus-signature';
		div.textContent = '(thumbnails are added by akahukuplus)';
		return div;
	})(), table.nextSibling);
});
