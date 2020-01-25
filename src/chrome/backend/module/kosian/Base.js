/**
 * extension wrapper
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

import * as utils from './utils.js';
import {StorageWrapper} from './StorageWrapper.js';
import {ResourceLoader} from './ResourceLoader.js';
import {Sound} from './Sound.js';

let instance;
let bearer;

function noimpl () {
	console.error('not implemented');
}

export function Kosian (global, options) {
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
			instance.openBaseURLPattern = null;
			instance.utils = utils;
			instance.storage = StorageWrapper(global);
			instance.resourceLoader = ResourceLoader(global, {
				transportGetter: instance.createTransport,
				emitter: instance.emit
			});
			instance.sound = Sound();

			instance.setOptions(options);
		}
		catch (e) {
			console.error(e.stack);
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
		const result = this.appName;
		arg = arg + '';
		this.appName = arg;
		return result;
	}},

	setLogMode: {value: function (arg) {
		const result = this.logMode;
		this.logMode = !!arg;
		return result;
	}},

	setOpenBaseUrlPattern: {value: function (pattern) {
		const result = this.openBaseURLPattern;
		/*
		 * In a very strange thing,
		 * Firefox 36+ assumes that pattern is NOT RegExp instance.
		 */
		//if (!(pattern instanceof RegExp)) return;
		if (!pattern || typeof pattern.source != 'string') return;
		this.openBaseURLPattern = new RegExp(pattern.source);
		return result;
	}},

	/*
	setWriteDelaySecs: {value: function (secs) {
		secs = Number(secs);
		if (isNaN(secs) || secs < 0) return;
		require('./FileSystemImpl').FileSystemImpl.setWriteDelaySecs(secs);
	}},
	*/

	getBaseUrl: {value: function (selfUrl) {
		if (!this.openBaseURLPattern) return;
		const re = this.openBaseURLPattern.exec(selfUrl);
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
	}},

	resource: {value: function (path, callback, opts) {
		this.resourceLoader.get(path, callback.bind(opts && opts.bind || this), opts);
	}},

	emit: {value: function (...args) {
		if (args.length < 1) return undefined;
		const fn = args.shift();
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
		let mc;
		return function () {
			if (mc != undefined) {
				return mc;
			}

			const path = this.messageCatalogPath;
			if (typeof path != 'string') {
				return mc = null;
			}

			this.resource(path, text => {
				mc = this.utils.parseJson(text);
				for (let i in mc) {
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

		let self = this;
		let xhr = new XMLHttpRequest();
		let headers = {};
		let content;

		/*
		 * helper functions
		 */

		function getResponse () {
			let response;

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

		/*
		 * start
		 */

		headers['X-JavaScript-User-Agent'] = this.appName + '/' + this.version;
		xhr.open(opts.method || 'GET', utils.getFullUrl(url, opts.query || {}));

		xhr.onreadystatechange = function () {
			if (xhr.readyState != 4) return;
			try {
				let status = getStatus();
				if (status >= 200 && status < 300 || status == 304) {
					success && success.call(opts.bind || self, getResponse(), status, xhr);
				}
				else {
					xhr && xhr.onerror && xhr.onerror();
				}
			}
			catch (ex) {
				self.isDev && console.error(ex.stack);
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
				let st, re
				try {st = xhr.status} catch (e) {st = 'Unknown status'}
				try {re = xhr.responseText} catch (e) {re = 'Unknown response'}
			}

			try {
				failure && failure.call(opts.bind || self, getResponse(), getStatus(), xhr);
			}
			catch (ex) {
				self.isDev && console.error(ex.stack);
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
			let tokenType = opts.tokenType;
			let accessToken = opts.accessToken;
			if (/^bearer$/.test(tokenType)) {
				tokenType = 'Bearer';
			}
			headers['Authorization'] = tokenType + ' ' + accessToken;
		}

		// other headers
		if ('headers' in opts) {
			for (let i in opts.headers) {
				headers[i] = opts.headers[i];
			}
		}

		// fix response type
		if ('responseType' in opts) {
			let responseType = opts.responseType;

			if (/^json$/i.test(responseType)) {
				responseType = '';
			}

			xhr.responseType = responseType;
		}

		// fix content
		content = opts.content || null;
		if (utils.objectType(content) == 'Object') {
			content = (content => {
				let contentUrlEncoded = [];
				let contentMultipart = new FormData();
				let onlyPrimitive = true;

				for (let i in content) {
					switch (utils.objectType(content[i])) {
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
			})(content);
		}

		// send all headers
		for (let i in headers) {
			xhr.setRequestHeader(i, headers[i]);
		}

		// invoke beforesend callback
		if ('beforesend' in opts) {
			try {opts.beforesend(xhr)} catch (e) {
				this.isDev && console.error(e.stack);
			}
		}

		// finally, do send
		try {
			xhr.send(content);
		}
		catch (e) {
			this.isDev && console.error(e.stack);
			xhr && xhr.onerror && xhr.onerror();
		}
	}},

	log: {value: function (...args) {
		let method = 'log';
		let force = false;
		args = args.join(' ');

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
	broadcast: {value: noimpl}
});

Kosian.register = function (abearer) {
	bearer = abearer;
};

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
