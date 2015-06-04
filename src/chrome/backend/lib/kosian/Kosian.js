/**
 * extension wrapper
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2012-2015 akahuku, akahuku@gmail.com
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

	var instance;
	var bearer = null;

	function noimpl () {
		console.error('not implemented');
	}

	function Kosian (global, options) {
		if (this instanceof Kosian) {
			return this;
		}

		if (instance) {
			return instance;
		}

		if (bearer) {
			if (!global) {
				throw new Error('global object not passed.');
			}

			try {
				instance = bearer(global, options);
				instance.appName = 'wow!';
				instance.logMode = false;
				instance.cryptKeyPath = '';
				instance.openBaseURLPattern = null;
				instance.utils = require('kosian/Utils').Utils;
				instance.storage = require('kosian/StorageWrapper').StorageWrapper(global);
				instance.tabWatcher = require('kosian/TabWatcher').TabWatcher(global, instance.emit);
				instance.resourceLoader = require('kosian/ResourceLoader').ResourceLoader(global, {
					transportGetter: instance.createTransport,
					emitter: instance.emit
				});
				instance.fileSystem = require('kosian/FileSystem').FileSystem(instance, options.fstab);
				instance.clipboard = require('kosian/Clipboard').Clipboard(global);
				instance.sound = require('kosian/Sound').Sound();

				instance.setOptions(options);
			}
			catch (e) {
				console.error(e.message);
				instance = null;
			}
		}

		if (!instance) {
			throw new Error('Unknown platform. stop.');
		}

		return instance;
	}

	Kosian.prototype = Object.create(Object.prototype, {
		kind: {value: 'base-class'},
		isDev: {value: false},
		version: {value: '0.0.0'},
		id: {value:'-'},
		messageCatalogPath: {value: null},

		toString: {value: function () {
			return '[object Kosian<' + this.kind + '>]';
		}},

		setAppName: {value: function (arg) {
			var result = this.appName;
			arg = arg + '';
			this.appName = arg;
			return result;
		}},

		setLogMode: {value: function (arg) {
			var result = this.logMode;
			this.logMode = !!arg;
			return result;
		}},

		setCryptKeyPath: {value: function (arg) {
			var result = this.cryptKeyPath;
			arg = arg + '';
			this.cryptKeyPath = arg;
			return result;
		}},

		setOpenBaseUrlPattern: {value: function (pattern) {
			var result = this.openBaseURLPattern;
			/*
			 * In a very strange thing,
			 * Firefox 36+ assumes that pattern is NOT RegExp instance.
			 */
			//if (!(pattern instanceof RegExp)) return;
			if (!pattern || typeof pattern.source != 'string') return;
			this.openBaseURLPattern = new RegExp(pattern.source);
			return result;
		}},

		setWriteDelaySecs: {value: function (secs) {
			secs = Number(secs);
			if (isNaN(secs) || secs < 0) return;
			require('kosian/FileSystemImpl').FileSystemImpl.setWriteDelaySecs(secs);
		}},

		getBaseUrl: {value: function (selfUrl) {
			if (!this.openBaseURLPattern) return;
			var re = this.openBaseURLPattern.exec(selfUrl);
			if (re) {
				return re[0];
			}
		}},

		setOptions: {value: function (options) {
			if (!options) return;

			if ('appName' in options) {
				this.setAppName(options.appName);
			}
			if ('lodMode' in options) {
				this.setLogMode(options.logMode);
			}
			if ('openBaseUrlPattern' in options) {
				this.setOpenBaseUrlPattern(options.openBaseUrlPattern);
			}
			if ('cryptKeyPath' in options) {
				this.setCryptKeyPath(options.cryptKeyPath);
			}
			if ('writeDelaySecs' in options) {
				this.setWriteDelaySecs(options.writeDelaySecs);
			}
		}},

		resource: {value: function (path, callback, opts) {
			this.resourceLoader.get(path, callback.bind(opts && opts.bind || this), opts);
		}},

		emit: {value: function () {
			var args = Array.prototype.slice.call(arguments);
			if (args.length < 1) return undefined;
			var fn = args.shift();
			if (typeof fn != 'function') return undefined;
			try {
				return fn.apply(null, args);
			}
			catch (e) {
				console.error(
					'kosian: an error occured inside callback:\n\t' + [
						'message: ' + e.message,
						'   line: ' + (e.line || e.lineNumber || '?'),
						'  stack: ' + (e.stack || '?')
					].join('\n\t'));
				return undefined;
			}
		}},

		messageCatalog: {get: (function () {
			var mc;
			return function () {
				if (mc != undefined) {
					return mc;
				}

				var path = this.messageCatalogPath;
				if (typeof path != 'string') {
					return mc = null;
				}

				this.resource(path, function (text) {
					mc = this.utils.parseJson(text);
					for (var i in mc) {
						delete mc[i].description;
					}
				}, {noCache:true, sync:true});

				if (mc == undefined) {
					return mc = null;
				}

				return mc;
			};
		})()},

		request: {value: function (url, opts, success, failure) {
			opts || (opts = {});

			var self = this;
			var xhr = this.createTransport();
			var headers = {};
			var content;

			function getResponse () {
				var response;

				if ('responseType' in opts) {
					if (opts.responseType == '' || /^text$/i.test(opts.responseType)) {
						try {
							response = xhr.responseText;
						}
						catch (e) {
							response = '';
						}
					}
					else if (/^json$/i.test(opts.responseType)) {
						try {
							response = self.utils.parseJson(xhr.responseText);
						}
						catch (e) {
							response = {};
						}
					}
					else {
						try {
							response = xhr.response;
						}
						catch (e) {
							response = null;
						}
					}
				}
				else {
					try {
						response = xhr.responseText;
					}
					catch (e) {
						response = '';
					}
				}

				return response;
			}

			function getStatus () {
				try {
					return opts.debugStatus || xhr.status;
				}
				catch (e) {
					return 0;
				}
			}

			headers['X-JavaScript-User-Agent'] = this.appName + '/' + this.version;
			xhr.open(opts.method || 'GET', this.utils.getFullUrl(url, opts.query || {}));

			xhr.onreadystatechange = function () {
				if (xhr.readyState != 4) return;
				try {
					var status = getStatus();
					if (status >= 200 && status < 300 || status == 304) {
						success && success.call(opts.bind || self, getResponse(), status, xhr);
					}
					else {
						xhr && xhr.onerror && xhr.onerror();
					}
				}
				catch (ex) {
					self.isDev && console.error(ex.toString());
				}
				finally {
					if (xhr) {
						xhr.onreadystatechange = xhr.onerror = null;
					}
					self = xhr = success = failure = opts = null;
				}
			};

			xhr.onerror = function () {
				if (self.isDev) {
					var st, re
					try {st = xhr.status} catch (e) {st = 'Unknown status'}
					try {re = xhr.responseText} catch (e) {re = 'Unknown response'}
				}

				try {
					failure && failure.call(opts.bind || self, getResponse(), getStatus(), xhr);
				}
				catch (ex) {
					self.isDev && console.error(ex.toString());
				}
				finally {
					if (xhr) {
						xhr.onreadystatechange = xhr.onerror = null;
					}
					self = xhr = success = failure = opts = null;
				}
			};

			// authorization header
			if ('tokenType' in opts && 'accessToken' in opts) {
				var tokenType = opts.tokenType;
				var accessToken = opts.accessToken;
				if (/^bearer$/.test(tokenType)) {
					tokenType = 'Bearer';
				}
				headers['Authorization'] = tokenType + ' ' + accessToken;
			}

			// other headers
			if ('headers' in opts) {
				for (var i in opts.headers) {
					headers[i] = opts.headers[i];
				}
			}

			// fix response type
			if ('responseType' in opts) {
				var responseType = opts.responseType;

				if (/^json$/i.test(responseType)) {
					responseType = '';
				}

				xhr.responseType = responseType;
			}

			// fix content
			content = opts.content || null;
			if (this.utils.objectType(content) == 'Object') {
				content = (function (content) {
					var contentUrlEncoded = [];
					var contentMultipart = self.createFormData();
					var onlyPrimitive = true;

					for (var i in content) {
						switch (this.utils.objectType(content[i])) {
						case 'String':
						case 'Number':
							contentMultipart.append(i, content[i]);
							contentUrlEncoded.push(
								encodeURIComponent(i) + '=' + encodeURIComponent(content[i]));
							break;
						default:
							contentMultipart.append(i, content[i]);
							onlyPrimitive = false;
							break;
						}
					}

					if (onlyPrimitive) {
						headers['Content-Type'] = 'application/x-www-form-urlencoded';
						return contentUrlEncoded.join('&');
					}
					else {
						return contentMultipart;
					}
				}).call(this, content);
			}

			// send all headers
			for (var i in headers) {
				xhr.setRequestHeader(i, headers[i]);
			}

			// invoke beforesend callback
			if ('beforesend' in opts) {
				try {opts.beforesend(xhr)} catch (e) {
					this.isDev && console.error(e.toString());
				}
			}

			// finally, do send
			try {
				xhr.send(content);
			}
			catch (e) {
				this.isDev && console.error(e.toString());
				xhr && xhr.onerror && xhr.onerror();
			}
		}},

		log: {value: function () {
			var method = 'log';
			var force = false;
			var args = Array.prototype.slice.call(arguments).join(' ');

			if (/^!/.test(args)) {
				force = true;
				args = args.substring(1);
			}

			if (/^INFO:/.test(args)) {
				method = 'info';
			}
			else if (/^ERROR:/.test(args)) {
				method = 'error';
			}

			if (this.logMode || force) {
				console[method](this.appName + ' backend: ' + args);
			}
		}},

		receive: {value: noimpl},
		openTabWithUrl: {value: noimpl},
		openTabWithFile: {value: noimpl},
		isTabExist: {value: noimpl},
		closeTab: {value: noimpl},
		focusTab: {value: noimpl},
		nextTab: {value: noimpl},
		prevTab: {value: noimpl},
		getTabTitle: {value: noimpl},
		broadcastToAllTabs: {value: noimpl},
		createTransport: {value: noimpl},
		createFormData: {value: noimpl},
		createBlob: {value: noimpl},
		postMessage: {value: noimpl},
		broadcast: {value: noimpl},
		dumpInternalIds: {value: noimpl}
	});

	Kosian.register = function (abearer) {
		bearer = abearer;
	};

	exports.Kosian = Kosian;

	if (require('sdk/self')) {
		require('kosian/FirefoxImpl');
	}
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
