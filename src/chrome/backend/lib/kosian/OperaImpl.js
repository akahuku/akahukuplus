/**
 * opera (presto) extension wrapper
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2012-2016 akahuku, akahuku@gmail.com
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

	var NOTIFY_TIMER_INTERVAL = 1000 * 1;
	var COLLECT_TIMER_INTERVAL = 1000 * 60 * 3;

	var base = require('./Kosian').Kosian;

	function receive (callback) {
		this.receiver = callback;
	}

	function openTabWithUrl (url, selfUrl, callback) {
		var selfHost = this.getBaseUrl(selfUrl);
		var tabs = opera.extension.tabs.getAll();
		var state = 0;
		var existsTab;
		var rightTab;
		for (var i = 0, goal = tabs.length;
			 i < goal && !existsTab && !rightTab;
			 i++) {
			if (tabs[i].url == url) {
				existsTab = tabs[i];
			}
			else if (typeof tabs[i].url == 'string') {
				switch (state) {
				case 0:
					if (tabs[i].url == selfUrl) {
						state = 1;
					}
					break;
				case 1:
					if (tabs[i].url.indexOf(selfHost) != 0) {
						rightTab = tabs[i];
					}
					break;
				}
			}
		}
		if (existsTab) {
			existsTab.focus();
			this.emit(callback, existsTab.id, url);
		}
		else {
			var tab = opera.extension.tabs.create({url:url, focused:true}, rightTab);
			this.emit(callback, tab.id, url);
		}
	}

	function openTabWithFile (file, callback) {
		var url = location.protocol + '//' + location.hostname + '/' + file;
		var tab = opera.extension.tabs.create({
			url:url, focused:true
		});
		this.emit(callback, tab.id, tab.url);
	}

	function isTabExist (id) {
		if (id in this.ports) return true;
		return opera.extension.tabs.getAll().some(function (tab) {
			if (id instanceof MessagePort && tab.port == id
			||  typeof id == 'number' && tab.id == id) {
				return true;
			}
		});
	}

	function closeTab (id) {
		opera.extension.tabs.getAll().some(function (tab) {
			if (id instanceof MessagePort && tab.port == id
			||  typeof id == 'number' && tab.id == id) {
				tab.close();
				return true;
			}
		});
	}

	function focusTab (id) {
		opera.extension.tabs.getAll().some(function (tab) {
			if (id instanceof MessagePort && tab.port == id
			||  typeof id == 'number' && tab.id == id) {
				tab.focus();
				return true;
			}
		});
	}

	function getTabTitle (id, callback) {
		opera.extension.tabs.getAll().some(function (tab) {
			if (id instanceof MessagePort && tab.port == id
			||  typeof id == 'number' && tab.id == id) {
				this.emit(callback, tab.title);
				return true;
			}
		}, this) || this.emit(callback, null);
	}

	function broadcastToAllTabs (message, exceptId) {
		opera.extension.tabs.getAll().forEach(function (tab) {
			if (exceptId instanceof MessagePort && tab.port == exceptId
			||  typeof exceptId == 'number' && tab.exceptId == exceptId) {
				return;
			}

			doPostMessage(tab.port, message);
		}, this);
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

		if (id instanceof MessagePort) {
			doPostMessage(id, message);
		}
		else if (typeof id == 'string' && id in this.ports) {
			doPostMessage(this.ports[id].port, message);
		}
		else {
			opera.extension.tabs.getAll().some(function (tab) {
				var found = false;
				if (typeof id == 'number') {
					found = tab.id == id;
				}
				else {
					found = tab.selected;
				}
				if (found) {
					doPostMessage(tab.port, message);
				}
				return found;
			}, this);
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

	function getMessageCatalogPath () {
		var result;
		this.resource('locales/locales.json', function (locales) {
			var fallbackLocaleIndex = -1;
			var currentLocale = (navigator.browserLanguage
				|| navigator.language
				|| navigator.userLanguage).toLowerCase().replace(/_/g, '-');

			locales = this.utils.parseJson(locales).map(function (locale, i) {
				locale = locale.toLowerCase().replace(/_/g, '-');
				if (locale == 'en-us') {
					fallbackLocaleIndex = i;
				}
				return locale;
			});

			var index = locales.indexOf(currentLocale);
			if (index < 0) {
				currentLocale = currentLocale.replace(/-.+$/, '');
				locales.some(function (locale, i) {
					locale = locale.replace(/-.+$/, '');
					if (locale == currentLocale) {
						index = i;
						return true;
					}
					return false;
				});
			}
			if (index < 0) {
				index = fallbackLocaleIndex;
			}
			if (index < 0) {
				result = false;
			}
			else {
				result = 'locales/' + locales[index] + '/messages.json';
			}
		}, {noCache:true, sync:true});
		return result;
	}

	function OperaImpl () {
		var that = this;
		var notifyTimer;
		var collectTimer;
		var ports = {};

		function notifyTabId () {
			notifyTimer && clearTimeout(notifyTimer);

			notifyTimer = setTimeout(function () {
				notifyTimer = null;
				opera.extension.tabs.getAll().forEach(function (tab) {
					try {
						tab.postMessage({
							type: 'opera-notify-tab-id',
							tabId: tab.id
						});
					}
					catch (e) {}
				});
			}, NOTIFY_TIMER_INTERVAL);

			if (!collectTimer) {
				collectTimer = setInterval(function () {collectPorts()}, COLLECT_TIMER_INTERVAL);
			}
		}

		function collectPorts () {
			var ids = Object.keys(ports);

			if (ids.length == 0) {
				collectTimer && clearInterval(collectTimer);
				collectTimer = null;
				return;
			}

			ids.forEach(function (id) {
				if (!doPostMessage(ports[id].port, {type: 'ping'})) {
					delete ports[id];
				}
			});
		}

		function handleMessage (e) {
			if (!e || !e.data || !that.receiver) return;

			var req = e.data;
			var data = req.data;
			var tabId = -1;

			that.logMode && that.log('got a message:', JSON.stringify(req).substring(0, 200));

			delete req.data;

			if (tabId == -1 && 'tabId' in req) {
				tabId = req.tabId;
			}
			if (tabId == -1 && 'internalId' in req) {
				tabId = req.internalId;
			}

			if (e.ports && e.ports.length) {
				if (/^init\b/.test(req.type) && 'internalId' in req) {
					ports[req.internalId] = {
						port: e.ports[0],
						url: data.url
					};
					e.ports[0].onmessage = handleMessage;
				}
				that.receiver(
					req, data, tabId,
					function (data) {doPostMessage(e.ports[0], data)}
				);
			}
			else {
				that.receiver(
					req, data, tabId,
					function () {}
				);
			}
		}

		base.apply(this, arguments);
		widget.preferences['widget-id'] = location.hostname;
		opera.extension.onconnect = notifyTabId;
		opera.extension.onmessage = handleMessage;
		collectTimer = setInterval(collectPorts, COLLECT_TIMER_INTERVAL);
		Object.defineProperty(this, 'ports', {value: ports});
	}

	OperaImpl.prototype = Object.create(base.prototype, {
		kind: {value: 'Opera'},
		isDev: {value: widget.version == '0.0.1'},
		version: {value: widget.version},
		id: {value: location.hostname},
		messageCatalogPath: {get: getMessageCatalogPath},

		receive: {value: receive},
		openTabWithUrl: {value: openTabWithUrl},
		openTabWithFile: {value: openTabWithFile},
		isTabExist: {value: isTabExist},
		closeTab: {value: closeTab},
		focusTab: {value: focusTab},
		getTabTitle: {value: getTabTitle},
		broadcastToAllTabs: {value: broadcastToAllTabs},
		createTransport: {value: createTransport},
		createFormData: {value: createFormData},
		createBlob: {value: createBlob},
		postMessage: {value: postMessage},
		broadcast: {value: broadcast},
		dumpInternalIds: {value: dumpInternalIds}
	});
	OperaImpl.prototype.constructor = base;

	base.register(function (global, options) {
		return new OperaImpl(global, options);
	});
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
