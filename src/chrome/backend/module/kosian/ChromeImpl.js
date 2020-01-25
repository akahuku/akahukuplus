/**
 * chrome extension wrapper
 */

/**
 * Copyright 2012-2020 akahuku, akahuku@gmail.com
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

import {Kosian} from './Base.js';

function receive (callback) {
	this.receiver = callback;
}

function openTabWithUrl (url, selfUrl, callback) {
	const selfHost = this.getBaseUrl(selfUrl);
	chrome.tabs.query({windowId:chrome.windows.WINDOW_ID_CURRENT}, tabs => {
		// First, find the tab already exists
		let existsTabId = -1;
		tabs.some(tab => {
			if (tab.url == url) {
				existsTabId = tab.id;
				return true;
			}
		});

		// Activate the existing tab and exit
		if (existsTabId >= 0) {
			chrome.tabs.update(existsTabId, {active:true});
			this.emit(callback, existsTabId, url);
			return;
		}

		// Second, find the rightmost tab in the same domain as active tab
		let state = 0;
		let rightTabIndex = -1;
		let selfTabId = -1;
		tabs.some(tab => {
			if (typeof tab.url == 'string') {
				switch (state) {
				case 0:
					if (tab.url == selfUrl) {
						state = 1;
						selfTabId = tab.id;
					}
					break;
				case 1:
					if (tab.url.indexOf(selfHost) != 0) {
						rightTabIndex = tab.index;
						return true;
					}
					break;
				}
			}
		});

		// Create new tab with some options
		const p = {url:url};
		if (rightTabIndex >= 0) {
			p.index = rightTabIndex;
		}
		if (selfTabId >= 0) {
			p.openerTabId = selfTabId;
		}
		chrome.tabs.create(p, tab => {
			this.emit(callback, tab.id, url);
		});
	});
}

function openTabWithFile (file, callback) {
	const url = chrome.runtime.getURL(file);
	chrome.tabs.create({url:url}, tab => {
		this.emit(callback, tab.id, url);
	});
}

function getNativeTabIdFromComplexTabId (id) {
	return (id + '').split('_')[0] - 0;
}

function isTabExist (id) {
	id = getNativeTabIdFromComplexTabId(id);
	return id in this.tabIds;
}

function closeTab (id) {
	id = getNativeTabIdFromComplexTabId(id);
	chrome.tabs.get(id, tab => {
		!chrome.runtime.lastError && tab && chrome.tabs.remove(id);
	});
}

function focusTab (id) {
	id = getNativeTabIdFromComplexTabId(id);
	chrome.tabs.get(id, tab => {
		!chrome.runtime.lastError && tab && chrome.tabs.update(id, {active:true});
	});
}

function nextTab (id) {
	id = getNativeTabIdFromComplexTabId(id);
	chrome.tabs.query({}, tabs => {
		tabs.some((t, i) => {
			if (t.id == id) {
				chrome.tabs.update(tabs[(i + 1) % tabs.length].id, {active: true});
				return true;
			}
		});
	});
}

function prevTab (id) {
	id = getNativeTabIdFromComplexTabId(id);
	chrome.tabs.query({}, tabs => {
		tabs.some((t, i) => {
			if (t.id == id) {
				chrome.tabs.update(tabs[(i + tabs.length - 1) % tabs.length].id, {active: true});
				return true;
			}
		});
	});
}

function getTabTitle (id, callback) {
	id = getNativeTabIdFromComplexTabId(id);
	chrome.tabs.get(id, tab => {
		this.emit(
			callback,
			!chrome.runtime.lastError && tab ? tab.title : null);
	});
}

function broadcastToAllTabs (message, exceptId) {
	exceptId = (exceptId + '').split('_')[0];
	chrome.tabs.query({}, tabs => {
		tabs.forEach(tab => {
			if (exceptId !== undefined && tab.id == exceptId) return;

			doSendMessageToTab(tab.id, message);
		});
	});
}

function doSendMessageToTab (tabId, message, callback) {
	try {
		const pair = (tabId + '').split('_');
		function sent (res) {
			if (chrome.runtime.lastError) {
				if (!/the message port closed before a response was received/i.test(chrome.runtime.lastError.message)) {
					console.error([
						`*** doSendMessageToTab failed ***`,
						`message: ${chrome.runtime.lastError.message}`,
						`  tabId: "${tabId}"`,
						`   pair: ${pair.map(p => `"${p}"`).join(', ')}`
					].join('\n'));
				}
			}
			if (typeof callback == 'function') {
				try {
					callback(res);
				}
				catch (err) {
					console.error(err.stack);
				}
			}
		}
		if (pair.length == 1) {
			chrome.tabs.sendMessage(tabId - 0, message, sent);
		}
		else {
			chrome.tabs.sendMessage(pair[0] - 0, message, {frameId: pair[1] - 0}, sent);
		}
		return true;
	}
	catch (e) {
		return false;
	}
}

function postMessage (/*[id,] message [,callback]*/) {
	let id, message, callback;
	const args = Array.prototype.slice.call(arguments);

	if (args.length && typeof args[args.length - 1] == 'function') {
		callback = args.pop();
	}

	switch (args.length) {
	case 1:
		message = args[0];
		break;
	default:
		id = args[0];
		message = args[1];
		break;
	}

	if (!message) {
		return;
	}

	if (id === undefined) {
		chrome.tabs.query({active: true}, tabs => {
			doSendMessageToTab(tabs[0].id, message, callback);
		});
	}
	else {
		doSendMessageToTab(id, message, callback);
	}
}

function broadcast (message, exceptId) {
	for (let tabId in this.tabIds) {
		doSendMessageToTab(tabId, message);
	}
}

function ChromeImpl () {
	const tabIds = {};

	Kosian.apply(this, arguments);
	chrome.tabs.onCreated.addListener(tab => {
		if (tab.id in tabIds) {
			if ('frameId' in tab && tab.frameId > 0) {
				tabIds[tab.id][tab.frameId] = 1;
			}
		}
		else {
			tabIds[tab.id] = {};
		}
	});
	chrome.tabs.onRemoved.addListener(id => {
		delete tabIds[id];
	});
	chrome.runtime.onMessage.addListener((req, sender, res) => {
		if (!this.receiver) return;

		const data = req.data;
		delete req.data;

		let id;
		if (sender && 'tab' in sender && 'id' in sender.tab) {
			id = sender.tab.id;
			if ('frameId' in sender) {
				id += '_' + sender.frameId;
			}
		}

		return !!this.receiver(req, data, id, res);
	});
	Object.defineProperties(this, {
		tabIds: {value: tabIds}
	});
}

ChromeImpl.prototype = Object.create(Kosian.prototype, {
	kind: {value: 'Chrome'},
	isDev: {value: chrome.runtime.getManifest().version == '0.0.1'},
	version: {value: chrome.runtime.getManifest().version},
	id: {value: location.host},

	receive: {value: receive},
	openTabWithUrl: {value: openTabWithUrl},
	openTabWithFile: {value: openTabWithFile},
	isTabExist: {value: isTabExist},
	closeTab: {value: closeTab},
	focusTab: {value: focusTab},
	nextTab: {value: nextTab},
	prevTab: {value: prevTab},
	getTabTitle: {value: getTabTitle},
	broadcastToAllTabs: {value: broadcastToAllTabs},
	postMessage: {value: postMessage},
	broadcast: {value: broadcast}
});
ChromeImpl.prototype.constructor = Kosian;

if (typeof chrome == 'object') {
	Kosian.register((global, options) => new ChromeImpl(global, options));
}

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
