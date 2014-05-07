/**
 * opera (presto) extension wrapper
 *
 * @author akahuku@gmail.com
 */

(function () {
	'use strict';

	var base = require('./kosian/Kosian').Kosian;

	function receive (callback) {
		opera.extension.onmessage = function (e) {
			if (!e.data) return;

			var tabId = -1;
			opera.extension.tabs.getAll().some(function (tab) {
				if (tab.port == e.source) {
					tabId = tab.id;
					return true;
				}
			});

			if (e.ports && e.ports.length) {
				callback(e.data.command, e.data.data, tabId, function (data) {
					try {e.ports[0].postMessage(data)} catch (ex) {}
				});
			}
			else {
				callback(e.data.command, e.data.data, tabId, function () {});
			}
		}
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
		var tab = opera.extension.tabs.create({
			url:location.href.replace(/\/[^\/]*$/, '/') + file, focused:true
		});
		this.emit(callback, tab.id, tab.url);
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

	function sendRequest () {
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

		opera.extension.tabs.getAll().some(function (tab) {
			var found = false;
			if (id instanceof MessagePort) {
				found = tab.port == id;
			}
			else if (typeof id == 'number') {
				found = tab.id == id;
			}
			else {
				found = tab.selected;
			}
			if (found) {
				try {
					tab.postMessage(message);
				}
				catch (e) {}
			}
			return found;
		});
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
		base.apply(this, arguments);
		widget.preferences['widget-id'] = location.href.match(/^widget:\/\/([^\/]+)/)[1];
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
		closeTab: {value: closeTab},
		focusTab: {value: focusTab},
		getTabTitle: {value: getTabTitle},
		createTransport: {value: createTransport},
		createFormData: {value: createFormData},
		createBlob: {value: createBlob},
		sendRequest: {value: sendRequest}
	});
	OperaImpl.prototype.constructor = base;

	base.register(function (global, options) {
		if (global.opera) {
			return new OperaImpl(global, options);
		}
	});
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
