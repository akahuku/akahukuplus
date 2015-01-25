/**
 * resource loader
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

(function (global) {
	'use strict';

	var u = require('kosian/Utils').Utils;
	var self_ = require('sdk/self');

	function ResourceLoader (transportGetter, locationGetter, emitter) {
		var data = {};
		emitter || (emitter = function (callback, data) {callback(data)});

		this.path = function (path) {
			return locationGetter(path);
		};

		this.get = function (resourcePath, callback, opts) {
			function handleLoad () {
				var res = isText ? xhr.responseText : xhr.response;
				if (!opts.noCache) {
					data[resourcePath] = res;
				}
				emitter(callback, res);
				xhr.removeEventListener('load', handleLoad, false);
				xhr.removeEventListener('error', handleError, false);
				xhr = null;
			}

			function handleLoadFirefox (res) {
				if (!opts.noCache) {
					data[resourcePath] = res;
				}
				emitter(callback, res);
			}

			function handleError () {
				var res = data[resourcePath] = false;
				emitter(callback, res);
				xhr.removeEventListener('load', handleLoad, false);
				xhr.removeEventListener('error', handleError, false);
				xhr = null;
			}

			callback || (callback = function () {});
			opts || (opts = {});

			if (!transportGetter || !locationGetter || !callback) {
				emitter(callback, '');
				return;
			}
			if (resourcePath in data) {
				emitter(callback, data[resourcePath]);
				return;
			}

			var sync = 'sync' in opts && opts.sync;
			var isText = false;
			var responseType = opts.responseType || 'text';

			// special shortcut on firefox, if text is requested synchronously
			if (self_ && responseType == 'text' && sync) {
				handleLoadFirefox(self_.data.load(resourcePath));
				return;
			}

			var xhr = transportGetter();
			xhr.open('GET', locationGetter(resourcePath), !sync);
			if (responseType != 'text') {
				xhr.responseType = responseType;
				isText = false;
			}
			else {
				//xhr.responseType = 'text';
				xhr.overrideMimeType(opts.mimeType || 'text/plain;charset=UTF-8');
				isText = true;
			}
			xhr.addEventListener('load', handleLoad, false);
			xhr.addEventListener('error', handleError, false);

			try {
				xhr.send(null);
			}
			catch (e) {
				handleError();
			}
		};
	}

	function create (window, options) {
		var transportGetter;
		var locationGetter;
		var emitter;

		options || (options = {});
		if (options.transportGetter) {
			transportGetter = options.transportGetter;
		}
		else {
			if (window.XMLHttpRequest) {
				transportGetter = function () {
					return new window.XMLHttpRequest;
				};
			}
			else if (self_) {
				transportGetter = function () {
					return u.createXHR();
				};
			}
		}

		if (options.locationGetter) {
			locationGetter = options.locationGetter;
		}
		else {
			if (window.location) {
				locationGetter = function (resourcePath) {
					return window.location.protocol +
						'//' +
						window.location.host +
						('/' + resourcePath).replace(/\/+/g, '/');
				};
			}
			else if (self_) {
				locationGetter = function (resourcePath) {
					return self_.data.url(
						resourcePath
							.replace(/\/+/g, '/')
							.replace(/^\//, ''));
				};
			}
		}

		if (options.emitter) {
			emitter = options.emitter;
		}

		return new ResourceLoader(transportGetter, locationGetter, emitter);
	}

	exports.ResourceLoader = create;
})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
