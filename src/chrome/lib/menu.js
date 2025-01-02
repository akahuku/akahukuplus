/*
 * pop up menu for akahukuplus
 */

/**
 * Copyright 2022-2024 akahuku, akahuku@gmail.com
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

import {$qs, $qsa} from './utils.js';
import {getBoundingClientRect} from './utils-apext.js';

const SUB_MENU_OPEN_WAIT_MSECS = 200;
const SUB_MENU_LEFTTOP_MARGIN = 4;
const AUTO_SCROLL_WAIT_MSECS = 100;
const AUTO_SCROLL_DELTA = 8;
const SCREEN_MARGIN = 8;
const UP_ARROW_IMAGE = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE2LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjI5Mi4zNjJweCIgaGVpZ2h0PSIyOTIuMzYxcHgiIHZpZXdCb3g9IjAgMCAyOTIuMzYyIDI5Mi4zNjEiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDI5Mi4zNjIgMjkyLjM2MTsiDQoJIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPHBhdGggZD0iTTI4Ni45MzUsMTk3LjI4N0wxNTkuMDI4LDY5LjM4MWMtMy42MTMtMy42MTctNy44OTUtNS40MjQtMTIuODQ3LTUuNDI0cy05LjIzMywxLjgwNy0xMi44NSw1LjQyNEw1LjQyNCwxOTcuMjg3DQoJCUMxLjgwNywyMDAuOTA0LDAsMjA1LjE4NiwwLDIxMC4xMzRzMS44MDcsOS4yMzMsNS40MjQsMTIuODQ3YzMuNjIxLDMuNjE3LDcuOTAyLDUuNDI1LDEyLjg1LDUuNDI1aDI1NS44MTMNCgkJYzQuOTQ5LDAsOS4yMzMtMS44MDgsMTIuODQ4LTUuNDI1YzMuNjEzLTMuNjEzLDUuNDI3LTcuODk4LDUuNDI3LTEyLjg0N1MyOTAuNTQ4LDIwMC45MDQsMjg2LjkzNSwxOTcuMjg3eiIvPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPC9zdmc+DQo=';
const RIGHT_ARROW_IMAGE = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE2LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9Ijk2LjE1NXB4IiBoZWlnaHQ9Ijk2LjE1NXB4IiB2aWV3Qm94PSIwIDAgOTYuMTU1IDk2LjE1NSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgOTYuMTU1IDk2LjE1NTsiDQoJIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPHBhdGggZD0iTTIwLjk3Miw5NS41OTRsNTcuNjA1LTQ1Ljk1MWMwLjk1MS0wLjc2LDAuOTUxLTIuMzY3LDAtMy4xMjdMMjAuOTY4LDAuNTZjLTAuNjg5LTAuNTQ3LTEuNzE2LTAuNzA5LTIuNjEtMC40MTQNCgkJYy0wLjE4NiwwLjA2MS0wLjMzLDAuMTI5LTAuNDM2LDAuMTg2Yy0wLjY1LDAuMzUtMS4wNTYsMS4wMjUtMS4wNTYsMS43NjR2OTEuOTY3YzAsMC43MzYsMC40MDUsMS40MTQsMS4wNTYsMS43NjINCgkJYzAuMTA5LDAuMDYsMC4yNTMsMC4xMjcsMC40MjYsMC4xODVDMTkuMjUxLDk2LjMwNSwyMC4yODEsOTYuMTQ0LDIwLjk3Miw5NS41OTR6Ii8+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8L3N2Zz4NCg==';
const CHECKMARK_IMAGE = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE2LjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPg0KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjYxMi4wMDVweCIgaGVpZ2h0PSI2MTIuMDA1cHgiIHZpZXdCb3g9IjAgMCA2MTIuMDA1IDYxMi4wMDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDYxMi4wMDUgNjEyLjAwNTsiDQoJIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc+DQoJPGcgaWQ9InRpY2siPg0KCQk8Zz4NCgkJCTxwYXRoIGQ9Ik01OTUuNjAxLDgxLjU1M2MtMjEuODkyLTIxLjg5MS01Ny4zNjItMjEuODkxLTc5LjI1MywwTDE4My4wMyw0MTQuODdsLTg4LjYyOS03Ni4xMzMNCgkJCQljLTIxLjU5Mi0yMS41OTMtNTYuNTk2LTIxLjU5My03OC4yMDcsMGMtMjEuNTkyLDIxLjU5Mi0yMS41OTIsNTYuNjE0LDAsNzguMjA2bDEzMi40MTIsMTEzLjczMw0KCQkJCWMyMS41OTIsMjEuNTkzLDU2LjU5NiwyMS41OTMsNzguMjA3LDBjMi4xNjctMi4xNjYsMy45NzktNC41NzYsNS43MTYtNi45ODVjMC4zMTctMC4yOTksMC42NzItMC41MDUsMC45OS0wLjgwNGwzNjIuMDgzLTM2Mi4xMDENCgkJCQlDNjE3LjQ3MywxMzguOTE0LDYxNy40NzMsMTAzLjQyNSw1OTUuNjAxLDgxLjU1M3oiLz4NCgkJPC9nPg0KCTwvZz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjxnPg0KPC9nPg0KPGc+DQo8L2c+DQo8Zz4NCjwvZz4NCjwvc3ZnPg0K';

export function createContextMenu (options = {}) {
	let items;
	let itemHash;

	let resolver;
	let popupTarget;
	let panels;
	let expandDirection;
	let subMenuOpenTimer;
	let autoScrollTimer;
	let previousItemKey;
	let lastParentItem;

	/*
	 * event handlers
	 */

	/*
	function handleContainerClick (e) {
		if (panels.length) return;
		e.preventDefault();
		registerSubMenuOpen(null, e.target);
	}
	*/

	function handleBodyClick (e) {
		if (e.target == popupTarget) {
			e.preventDefault();
			e.stopPropagation();
			close();
			return;
		}

		const {panel, anchor} = getAnchorFrom(e.target);
		if (!panel) {
			close();
			return;
		}

		e.preventDefault();

		if (!anchor) {
			return;
		}

		const item = getItem(anchor);

		// single anchor clicked
		if (item && !item.disabled && (!item.items || item.items.length == 0)) {
			let handled = false;

			if (typeof item.onclick == 'function') {
				handled = true;
				try {
					item.onclick(item);
				}
				catch (err) {
					if (options.catchHandlerError) {
						console.error(err.stack);
					}
					else {
						throw err;
					}
				}
			}

			if (typeof options.onclick == 'function') {
				try {
					options.onclick(item, handled);
				}
				catch (err) {
					if (options.catchHandlerError) {
						console.error(err.stack);
					}
					else {
						throw err;
					}
				}
			}

			close(item);
		}
	}

	function handlePointermove (e) {
		let {panel, anchor, key} = getAnchorFrom(e.target);

		if (lastParentItem && lastParentItem.childRect) {
			if (lastParentItem.minAngle == null) {
				lastParentItem.minAngle = Math.atan2(
					lastParentItem.childRect.top - lastParentItem.originY,
					lastParentItem.childRect.left - lastParentItem.originX) * (180 / Math.PI);
			}

			if (lastParentItem.maxAngle == null) {
				lastParentItem.maxAngle = Math.atan2(
					lastParentItem.childRect.bottom - lastParentItem.originY,
					lastParentItem.childRect.left - lastParentItem.originX) * (180 / Math.PI);
			}

			const angle = Math.atan2(
				e.clientY - lastParentItem.originY,
				e.clientX - lastParentItem.originX) * (180 / Math.PI);

			if (panel
			&&  panel.dataset.menuKey == lastParentItem.panelKey
			&&  lastParentItem.minAngle <= angle && angle < lastParentItem.maxAngle) {
				key = previousItemKey;
			}
		}

		if (previousItemKey == key) return;

		/*
		 *
		 */

		// hover on valid anchor
		if (anchor && !anchor.classList.contains('disabled')) {
			const item = getItem(anchor);

			// anchor with chidren
			if (item && item.items) {
				if (!anchor.classList.contains('with-child')) {
					lastParentItem = {
						panelKey: panel.dataset.menuKey,
						originX: e.clientX,
						originY: e.clientY,
						childRect: null,
						minAngle: null,
						maxAngle: null
					};
					registerSubMenuClose(panel);
					registerSubMenuOpen(panel, anchor);
				}
			}

			// single (or invalid) anchor
			else {
				registerSubMenuClose(panel);
				lastParentItem = undefined;
			}
		}

		// not an anchor
		else {
			lastParentItem = undefined;
		}

		previousItemKey = key;
	}

	function handleMouseenter (e) {
		if (autoScrollTimer) {
			clearInterval(autoScrollTimer);
		}

		const scrollPanel = $qs('.menu-body', e.target.closest('.menu-pane'));
		const delta = AUTO_SCROLL_DELTA * (e.target.classList.contains('menu-head') ? -1 : 1);

		autoScrollTimer = setInterval((scrollPanel, delta) => {
			scrollPanel.scrollTop = Math.max(
				0, Math.min(
					scrollPanel.scrollTop + delta,
					scrollPanel.scrollHeight - scrollPanel.clientHeight));
		}, AUTO_SCROLL_WAIT_MSECS, scrollPanel, delta);
	}

	function handleMouseleave () {
		if (autoScrollTimer) {
			clearInterval(autoScrollTimer);
			autoScrollTimer = null;
		}
	}

	/*
	 * internal functions
	 */

	/*
	function style (elm, s) {
		for (let i in s) if (i in elm.style) elm.style[i] = '' + s[i];
		return elm;
	}
	*/

	function cre (elm, name) {
		return elm.appendChild(document.createElement(name));
	}

	function getActulalPosition (elm) {
		for (let e = elm; e != document.documentElement; e = e.parentNode) {
			const p = getComputedStyle(e).position;
			if (p != 'static') {
				return p;
			}
		}
		return 'static';
	}

	function getAnchorFrom (startTarget) {
		let panel = null;
		let anchor = null;
		let key = '';

		panel = startTarget.closest('div.menu-pane');
		if (panel) {
			anchor = startTarget.closest('a');
			if (anchor) {
				key = anchor.hash.replace(/^menu:/, '');
			}
		}

		return {
			panel: panel,
			anchor: anchor,
			key: key
		};
	}

	function createMenu (menu, key, argItems) {
		const head = cre(menu, 'a');
		const body = cre(menu, 'div');
		const tail = cre(menu, 'a');

		menu.dataset.menuKey = key;
		menu.className = 'menu-pane';
		head.className = 'menu-head hide';
		body.className = 'menu-body';
		tail.className = 'menu-tail hide';
		head.addEventListener('mouseenter', handleMouseenter);
		tail.addEventListener('mouseenter', handleMouseenter);
		head.addEventListener('mouseleave', handleMouseleave);
		tail.addEventListener('mouseleave', handleMouseleave);

		const headImage = cre(head, 'img');
		const tailImage = cre(tail, 'img');
		headImage.src = tailImage.src = UP_ARROW_IMAGE;

		let maxWidthLabel = 0;
		let maxWidthExtra = 0;
		let nodes = [];

		if (argItems.length == 0) {
			argItems = [{key: 'na', label: '(N/A)', disabled: true}];
		}

		argItems.forEach(item => {
			if (item.key == '-') {
				const div = cre(body, 'div');
				div.className = 'ruler';
			}
			else {
				const a = cre(body, 'a');
				const checked = cre(a, 'div');
				const label = cre(a, 'div');
				const extra = cre(a, 'div');

				if ('checked' in item && item.checked) {
					const img = cre(checked, 'img');
					img.src = CHECKMARK_IMAGE;
				}

				if ('items' in item && item.items instanceof Array) {
					const img = cre(extra, 'img');
					img.src = RIGHT_ARROW_IMAGE;
				}
				else if ('shortcut' in item) {
					extra.textContent = item.shortcut;
				}
				else if ('cost' in item && typeof item.cost === 'number') {
					const img = cre(extra, 'img');
					img.className = 'raw';
					img.src = chrome.runtime.getURL('images/coin.png');
					extra.appendChild(document.createTextNode(item.cost));
				}

				if ('disabled' in item && item.disabled) {
					a.classList.add('disabled');
				}

				if ('title' in item) {
					a.title = item.title;
				}

				a.href = `#menu:${item.key}`;
				a.dataset.menuFullKey = `${item.fullKey}`;
				label.textContent = 'label' in item && item.label != '' ?
					item.label :
					`(${item.key})`;
				maxWidthLabel = Math.max(maxWidthLabel, label.offsetWidth);
				maxWidthExtra = Math.max(maxWidthExtra, extra.offsetWidth);
				nodes.push([label, extra]);
			}
		});

		nodes.forEach(node => {
			node[0].style.width = `${maxWidthLabel}px`;
			node[1].style.width = `${maxWidthExtra}px`;
		});

		panels.push({
			key: key,
			element: menu
		});

		return menu;
	}

	function removeMenus (sentinel) {
		while (panels.length) {
			if (sentinel && panels[panels.length - 1].element == sentinel) {
				break;
			}

			const {element} = panels.pop();

			$qsa('.menu-head, .menu-tail', element).forEach(node => {
				node.removeEventListener('mouseenter', handleMouseenter);
				node.removeEventListener('mouseleave', handleMouseleave);
			});

			element.parentNode.removeChild(element);
		}

		if (sentinel) {
			$qsa('.emphasis, .with-child', sentinel).forEach(node => {
				node.classList.remove('emphasis');
				node.classList.remove('with-child');
			});
		}

		if (panels.length == 0) {
			document.body.removeEventListener('pointermove', handlePointermove);
			document.body.removeEventListener('click', handleBodyClick, true);
		}
	}

	function registerSubMenuOpen (panel, anchor, key = null) {
		function doOpen (panel, anchor, key) {
			subMenuOpenTimer = undefined;
			removeMenus(panel);

			const item = getItem(key || anchor);
			if (!item) return;
			if (item.disabled) return;
			if ($qs(`[data-menu-key="${item.fullKey}"]`)) return;

			const menu = createMenu(
				document.body.appendChild(
					document.createElement('div')),
				item.fullKey, item.items);
			const anchorRect = getBoundingClientRect(anchor);

			const screenTop = SCREEN_MARGIN;
			const screenLeft = SCREEN_MARGIN;
			const screenBottom = document.documentElement.clientHeight - SCREEN_MARGIN;
			const screenRight = document.documentElement.clientWidth - SCREEN_MARGIN;

			const head = $qs('.menu-head', menu);
			const body = $qs('.menu-body', menu);
			const tail = $qs('.menu-tail', menu);

			// override position style according to the anchor's position
			const position = getActulalPosition(anchor);
			if (position == 'fixed' || position == 'sticky') {
				menu.style.position = 'fixed';
			}

			// root menu
			if (panels.length == 1) {
				menu.classList.add('top-menu');
				menu.style.left = `${anchorRect.left}px`;
				menu.style.top = `${anchorRect.bottom}px`;

				// adjust position
				const menuRect = getBoundingClientRect(menu);
				if (menuRect.bottom >= screenBottom) {
					menu.style.top = `${anchorRect.top - menuRect.height}px`;
				}
				if (menuRect.right >= screenRight) {
					menu.style.left = `${screenRight - menuRect.width}px`;
				}
			}

			// sub menu
			else {
				anchor.classList.add('emphasis');
				anchor.classList.add('with-child');

				let left = expandDirection > 0 ?
					anchorRect.right - SUB_MENU_LEFTTOP_MARGIN :
					anchorRect.left - menu.offsetWidth + SUB_MENU_LEFTTOP_MARGIN;
				let top = anchorRect.top - SUB_MENU_LEFTTOP_MARGIN;
				menu.style.left = `${left}px`;
				menu.style.top = `${top}px`;

				const menuRect = getBoundingClientRect(menu);

				// adjust horizontal position
				if (menuRect.right > screenRight) {
					expandDirection = -1;
					left = anchorRect.left - menu.offsetWidth + SUB_MENU_LEFTTOP_MARGIN;
				}
				else if (menuRect.left < screenLeft) {
					expandDirection = 1;
					left = anchorRect.right - SUB_MENU_LEFTTOP_MARGIN;
				}

				// adjust vertical position
				if (menuRect.bottom > screenBottom) {
					top -= menuRect.bottom - screenBottom;
				}
				if (top < screenTop) {
					head.classList.remove('hide');
					tail.classList.remove('hide');
					top = screenTop;
					body.style.height =
						`${screenBottom - screenTop - head.offsetHeight - tail.offsetHeight}px`;
				}
				
				menu.style.left = `${left}px`;
				menu.style.top = `${top}px`;

				if (lastParentItem) {
					lastParentItem.childRect = menuRect;
				}
			}

			previousItemKey = item.fullKey;
			return menu;
		}

		clearSubMenuTimer();

		if (panels.length == 0) {
			if (doOpen(null, anchor, key)) {
				document.body.addEventListener('pointermove', handlePointermove);
				document.body.addEventListener('click', handleBodyClick, true);
			}
		}
		else {
			subMenuOpenTimer = setTimeout(
				doOpen,
				SUB_MENU_OPEN_WAIT_MSECS,
				panel, anchor, key);
		}
	}

	function registerSubMenuClose (panel) {
		clearSubMenuTimer();
		if (panels.length == 0) return;

		if (panel) {
			$qsa('.emphasis', panel).forEach(node => {
				node.classList.remove('emphasis');
			});
		}
		else {
			panel = panels[0].element;
		}

		subMenuOpenTimer = setTimeout(panel => {
			subMenuOpenTimer = undefined;
			removeMenus(panel);
		}, SUB_MENU_OPEN_WAIT_MSECS, panel);
	}

	function clearSubMenuTimer () {
		if (subMenuOpenTimer) {
			clearTimeout(subMenuOpenTimer);
			subMenuOpenTimer = undefined;
		}
	}

	/*
	 * public functions
	 */

	function assign (argItems) {
		items = argItems;
		rehash();
		return this;
	}

	function open (aTarget, key = null) {
		if (panels && panels.length) {
			close();
			return Promise.resolve(null);
		}
		else {
			return new Promise(resolve => {
				resolver = resolve;
				popupTarget = aTarget;
				panels = [];
				expandDirection = 1;
				registerSubMenuOpen(null, popupTarget, key);
			});
		}
	}

	function close (item) {
		if (panels && panels.length) {
			removeMenus(null);
			popupTarget = null;
			panels = null;
		}
		if (resolver) {
			resolver(item);
			resolver = null;
		}
	}

	function getItem (target) {
		let key = target;
		if (key instanceof HTMLAnchorElement) {
			key = key.dataset.menuFullKey || key.hash;
		}
		key = key.replace(/^#menu:/, '');
		if (!itemHash) return undefined;
		if (!(key in itemHash)) return undefined;
		return itemHash[key];
	}

	function rehash () {
		function traverse (argItems, key) {
			if (!argItems) {
				return;
			}
			if (!(argItems instanceof Array)) {
				argItems = [argItems];
			}
			for (const item of argItems) {
				const currentKey = key ? `${key},${item.key}` : item.key;
				if (key != '-') {
					item.fullKey = currentKey;
					itemHash[currentKey] = item;
				}
				if (item.items) {
					traverse(item.items, currentKey);
				}
			}
		}

		itemHash = {};
		traverse(items);
	}

	function dispose () {
		items = itemHash = popupTarget = panels = null;
	}

	return {
		assign, open, getItem, rehash, dispose,
		get options () {return options},
		get opened () {return panels && panels.length > 0},
	};
}
