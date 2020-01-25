/**
 * resource loader
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

function ResourceLoaderCore (transportGetter, locationGetter, emitter) {
	const data = {};
	emitter || (emitter = (callback, data) => {callback(data)});

	this.path = function (path) {
		return locationGetter(path);
	};

	this.get = function (resourcePath, callback, opts) {
		function handleLoad () {
			const res = isText ? xhr.responseText : xhr.response;
			if (!opts.noCache) {
				data[resourcePath] = res;
			}
			emitter(callback, res);
			xhr.removeEventListener('load', handleLoad, false);
			xhr.removeEventListener('error', handleError, false);
			xhr = null;
		}

		function handleError () {
			const res = data[resourcePath] = false;
			emitter(callback, res);
			xhr.removeEventListener('load', handleLoad, false);
			xhr.removeEventListener('error', handleError, false);
			xhr = null;
		}

		callback || (callback = () => {});
		opts || (opts = {});

		if (!transportGetter || !locationGetter || !callback) {
			emitter(callback, '');
			return;
		}
		if (resourcePath in data) {
			emitter(callback, data[resourcePath]);
			return;
		}

		const sync = 'sync' in opts && opts.sync;
		const responseType = opts.responseType || 'text';
		let isText = false;

		let xhr = transportGetter();
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

export function ResourceLoader (options) {
	let transportGetter;
	let locationGetter;
	let emitter;

	options || (options = {});
	if (options.transportGetter) {
		transportGetter = options.transportGetter;
	}
	else {
		transportGetter = () => {
			return new XMLHttpRequest();
		};
	}

	if (options.locationGetter) {
		locationGetter = options.locationGetter;
	}
	else {
		locationGetter = resourcePath => {
			return window.location.protocol +
				'//' +
				window.location.host +
				('/' + resourcePath).replace(/\/+/g, '/');
		};
	}

	if (options.emitter) {
		emitter = options.emitter;
	}

	return new ResourceLoaderCore(transportGetter, locationGetter, emitter);
}
