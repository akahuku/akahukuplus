/**
 * extension wrapper
 *
 * @author akahuku@gmail.com
 */

(function () {
	'use strict';

	var instance;
	var conditions = [];

	function noimpl () {console.error('not implemented')}

	function Kosian (global, options) {
		if (this instanceof Kosian) {
			this.appName = 'wow!';
			this.cryptKeyPath = '';
			this.openBaseURLPattern = null;
			this.utils = require('./kosian/Utils').Utils;
			this.storage = require('./kosian/StorageWrapper').StorageWrapper(global);
			this.tabWatcher = require('./kosian/TabWatcher').TabWatcher(global, this.emit);
			this.resourceLoader = require('./kosian/ResourceLoader').ResourceLoader(global, {
				transportGetter: this.createTransport,
				emitter: this.emit
			});
			this.fileSystem = require('./kosian/FileSystem').FileSystem(this, options.fstab);

			this.setOptions(options);
			return this;
		}

		if (instance) {
			return instance;
		}

		if (!global) {
			throw new Error('global object not passed.');
		}

		conditions.some(function (condition) {
			var result = condition(global, options);
			if (result) {
				instance = result;
				return true;
			}
		});

		if (!instance) {
			instance = null;
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
			arg = arg + '';
			this.appName = arg;
		}},

		setCryptKeyPath: {value: function (arg) {
			arg = arg + '';
			this.cryptKeyPath = arg;
		}},

		setOpenBaseUrlPattern: {value: function (pattern) {
			if (!(pattern instanceof RegExp)) return;
			this.openBaseURLPattern = pattern;
		}},

		setWriteDelaySecs: {value: function (secs) {
			secs = Number(secs);
			if (isNaN(secs) || secs < 0) return;
			require('./kosian/FileSystemImpl').FileSystemImpl.setWriteDelaySecs(secs);
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
			if (args.length < 1) return;
			var fn = args.shift();
			if (typeof fn != 'function') return;
			try {
				fn.apply(null, args);
			}
			catch (e) {
				console.error(
					'background: an error occured inside callback:\n\t' + [
						'message: ' + e.message,
						'   line: ' + (e.line || e.lineNumber || '?'),
						'  stack: ' + (e.stack || '?')
					].join('\n\t'));
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
					console.log('request error: ' + st + ': ' + re);
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

		receive: {value: noimpl},
		openTabWithUrl: {value: noimpl},
		openTabWithFile: {value: noimpl},
		closeTab: {value: noimpl},
		focusTab: {value: noimpl},
		getTabTitle: {value: noimpl},
		createTransport: {value: noimpl},
		createFormData: {value: noimpl},
		createBlob: {value: noimpl},
		sendRequest: {value: noimpl}
	});

	Kosian.register = function (condition) {
		conditions.unshift(condition);
	};

	exports.Kosian = Kosian;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
