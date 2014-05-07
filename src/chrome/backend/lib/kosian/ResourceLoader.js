/**
 * resource loader
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */

(function (global) {
	'use strict';

	var u = require('./kosian/Utils').Utils;
	var self_ = require('sdk/self');

	function ResourceLoader (transportGetter, locationGetter, emitter) {
		var data = {};
		emitter || (emitter = function (callback, data) {callback(data)});

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

			var xhr = transportGetter();
			var sync = 'sync' in opts && opts.sync;
			var isText;
			xhr.open('GET', locationGetter(resourcePath), !sync);
			if (opts.responseType && opts.responseType != 'text') {
				xhr.responseType = opts.responseType;
				isText = false;
			}
			else {
				xhr.responseType = 'text';
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
					return window.location.protocol + '//' + window.location.host + '/' + resourcePath;
				};
			}
			else if (self_) {
				locationGetter = function (resourcePath) {
					return self_.data.url(resourcePath);
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
