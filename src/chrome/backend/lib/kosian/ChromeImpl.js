/**
 * chrome extension wrapper
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2014 akahuku, akahuku@gmail.com
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

(function () {
	'use strict';

	var base = require('kosian/Kosian').Kosian;

	function receive (callback) {
		this.receiver = callback;
	}

	function openTabWithUrl (url, selfUrl, callback) {
		var that = this;
		var selfHost = this.getBaseUrl(selfUrl);
		chrome.tabs.query({}, function (tabs) {
			var state = 0;
			var existsTabId = -1;
			var rightTabIndex = -1;
			tabs.some(function (tab, i) {
				if (tab.url == url) {
					existsTabId = tab.id;
					return true;
				}
				else if (typeof tab.url == 'string') {
					switch (state) {
					case 0:
						if (tab.url == selfUrl) {
							state = 1;
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
			if (existsTabId >= 0) {
				chrome.tabs.update(existsTabId, {active:true});
				that.emit(callback, existsTabId, url);
			}
			else {
				var p = {url:url};
				if (rightTabIndex >= 0) {
					p.index = rightTabIndex;
				}
				chrome.tabs.create(p, function (tab) {
					that.emit(callback, tab.id, url);
				});
			}
		});
	}

	function openTabWithFile (file, callback) {
		var that = this;
		var url = chrome.runtime.getURL(file);
		chrome.tabs.create({url:url}, function (tab) {
			that.emit(callback, tab.id, url);
		});
	}

	function isTabExist (id) {
		return id in this.tabIds || id in this.ports;
	}

	function closeTab (id) {
		chrome.tabs.get(id, function (tab) {
			tab && chrome.tabs.remove(id);
		});
	}

	function focusTab (id) {
		chrome.tabs.get(id, function (tab) {
			tab && chrome.tabs.update(id, {active:true});
		});
	}

	function nextTab (id) {
		chrome.tabs.query({}, function (tabs) {
			tabs.some(function (t, i) {
				if (t.id == id) {
					chrome.tabs.update(tabs[(i + 1) % tabs.length].id, {active: true});
					return true;
				}
			});
		});
	}

	function prevTab (id) {
		chrome.tabs.query({}, function (tabs) {
			tabs.some(function (t, i) {
				if (t.id == id) {
					chrome.tabs.update(tabs[(i + tabs.length - 1) % tabs.length].id, {active: true});
					return true;
				}
			});
		});
	}

	function getTabTitle (id, callback) {
		var that = this;
		chrome.tabs.get(id, function (tab) {
			that.emit(callback, tab ? tab.title : null);
		});
	}

	function broadcastToAllTabs (message, exceptId) {
		chrome.tabs.query({}, function (tabs) {
			tabs.forEach(function (tab) {
				if (exceptId !== undefined && tab.id == exceptId) return;

				doSendRequest(tab.id, message);
			});
		});
	}

	function createTransport () {
		return new XMLHttpRequest;
	}

	function createFormData () {
		switch (arguments.length) {
		case 0:
			return new FormData;
		default:
			return new FormData(arguments[0]);
		}
	}

	function createBlob () {
		switch (arguments.length) {
		case 0:
			return new Blob;
		case 1:
			return new Blob(arguments[0]);
		default:
			return new Blob(arguments[0], arguments[1]);
		}
	}

	function doSendRequest (tabId, message) {
		try {
			chrome.tabs.sendRequest(tabId, message);
			return true;
		}
		catch (e) {
			return false;
		}
	}

	function doPostMessage (port, message) {
		try {
			port.postMessage(message);
			return true;
		}
		catch (e) {
			return false;
		}
	}

	function postMessage (/*[id,] message*/) {
		var id, message;

		switch (arguments.length) {
		case 1:
			message = arguments[0];
			break;
		default:
			id = arguments[0];
			message = arguments[1];
			break;
		}

		if (!message) {
			return;
		}

		if (typeof id == 'string' && id in this.ports) {
			doPostMessage(this.ports[id].port, message);
		}
		else if (id === undefined) {
			chrome.tabs.query({active: true}, function (tabs) {
				doSendRequest(tabs[0].id, message);
			});
		}
		else {
			doSendRequest(id, message);
		}
	}

	function broadcast (message, exceptId) {
		for (var id in this.ports) {
			if (id == exceptId) continue;

			doPostMessage(this.ports[id].port, message);
		}
	}

	function dumpInternalIds () {
		var log = ['*** Internal Ids ***'];
		for (var id in this.ports) {
			log.push('id #' + id + ': ' + this.ports[id].url);
		}
		return log;
	}

	function ChromeImpl () {
		var that = this;
		var tabIds = {};
		var ports = {};

		// tab handlers
		function handleTabCreated (tab) {
			tabIds[tab.id] = 1;
		}

		function handleTabRemoved (id) {
			delete tabIds[id];
		}

		// handlers of a message via long-lived port
		function handleConnect (port) {
			ports[port.name] = {port: port};
			port.onMessage.addListener(handlePortMessage);
			port.onDisconnect.addListener(handleDisconnect);
		}

		function handleDisconnect (port) {
			delete ports[port.name];
		}

		function handlePortMessage (req, port) {
			if (!that.receiver) return;

			var data = req.data;
			delete req.data;

			if (/^init\b/.test(req.type) && port.name in ports) {
				ports[port.name].url = data.url;
			}

			that.receiver(req, data, port.name, function () {});
		}

		// single message handlers
		function handleMessage (req, sender, res) {
			if (!that.receiver) return;

			var data = req.data;
			delete req.data;

			if (/^init\b/.test(req.type)
			&& 'internalId' in req
			&& req.internalId in ports) {
				ports[req.internalId].url = data.url;
			}

			return !!that.receiver(req, data, sender.tab.id, res);
		}

		base.apply(this, arguments);
		chrome.tabs.onCreated.addListener(handleTabCreated);
		chrome.tabs.onRemoved.addListener(handleTabRemoved);
		chrome.runtime.onConnect.addListener(handleConnect);
		chrome.runtime.onMessage.addListener(handleMessage);
		Object.defineProperties(this, {
			ports: {value: ports},
			tabIds: {value: tabIds}
		});
	}

	ChromeImpl.prototype = Object.create(base.prototype, {
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
		createTransport: {value: createTransport},
		createFormData: {value: createFormData},
		createBlob: {value: createBlob},
		postMessage: {value: postMessage},
		broadcast: {value: broadcast},
		dumpInternalIds: {value: dumpInternalIds}
	});
	ChromeImpl.prototype.constructor = base;

	base.register(function (global, options) {
		return new ChromeImpl(global, options);
	});
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
