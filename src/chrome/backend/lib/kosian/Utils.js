/**
 * utilities
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

(function (global) {
	'use strict';

	/*
	 * timer wrapper
	 */

	var timers = require('sdk/timers');
	if (!timers) {
		timers = {
			setInterval: function () {return global.setInterval.apply(global, arguments)},
			setTimeout: function () {return global.setTimeout.apply(global, arguments)},
			clearInterval: function () {return global.clearInterval.apply(global, arguments)},
			clearTimeout: function () {return global.clearTimeout.apply(global, arguments)}
		};
	}

	/*
	 * base64 wrapper
	 */

	var base64 = require('sdk/base64');
	if (!base64) {
		base64 = {
			decode: function () {return global.atob.apply(global, arguments)},
			encode: function () {return global.btoa.apply(global, arguments)}
		};
	}

	/*
	 * JSON utils
	 */

	function parseJson (s, def) {
		if (typeof s != 'string') {
			return arguments.length >= 2 ? def : {};
		}

		var result;
		try {
			result = JSON.parse(s);
		}
		catch (e) {
			result = arguments.length >= 2 ? def : {};
		}

		return result;
	}

	/*
	 * XMLHttpRequest factory
	 */

	function createXHR () {
		if (typeof window == 'object' && window.XMLHttpRequest) {
			return new window.XMLHttpRequest;
		}

		/*
		 * XMLHttpRequest which SDK provides is very very limited.
		 * There is no responseType/response properties. So we use native xhr.
		 */
		var chrome = require('chrome');
		if (chrome) {
			var Cc = chrome.Cc, Ci = chrome.Ci;
			var xhr = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
				.createInstance(Ci.nsIXMLHttpRequest);
			xhr.mozBackgroundRequest = true;
			return xhr;
		}

		return null;
	}

	/*
	 * url manipulation
	 */

	function encodeUrl (s) {
		if (!s) return '';
		return encodeURIComponent(s)
			.replace(/[!'()]/g, escape)
			.replace(/\*/g, "%2A");
	}

	function decodeUrl (s) {
		return decodeURIComponent(s);
	}

	function queryToObject (url) {
		var index = url.indexOf('?');
		if (index < 0) {
			return {};
		}
		var result = {};
		url.substring(index + 1).split('&').forEach(function (s) {
			var index = s.indexOf('=');
			var key, value;
			if (index < 0) {
				key = s;
				value = '';
			}
			else {
				key = s.substring(0, index);
				value = s.substring(index + 1);
			}
			key = encodeUrl(key);
			value = decodeUrl(value);
			result[key] = value;
		});
		return result;
	}

	function objectToQuery (q) {
		var result = [];
		for (var i in q) {
			if (q[i] == undefined) continue;
			result.push(encodeUrl(i) + '=' + encodeUrl(q[i]));
		}
		return result.join('&');
	}

	function getFullUrl (url, q) {
		var query = objectToQuery(q);
		var result = query == '' ? url : (url + (url.indexOf('?') >= 0 ? '&' : '?') + query);
		return result;
	}

	function getCanonicalPath (path) {
		path = path.replace(/\\\//g, '_');
		path = path.replace(/\\(.)/g, '$1');
		path = path.replace(/\\/g, '');
		return path.split('/').map(encodeUrl).join('/');
	}

	function splitPath (path) {
		var re, regex = /(?:\\.|[^\/])*(?:\/|$)/g, result = [], foundLast = false;
		while (!foundLast && (re = regex.exec(path))) {
			foundLast = re[0].substr(-1) != '/';
			var tmp = foundLast ? re[0] : re[0].substr(0, re[0].length - 1);
			tmp = tmp.replace(/\\(.)/g, '$1');
			tmp != '' && result.push(tmp);
		}
		return result;
	}

	function joinPath (fragments, last) {
		if (last) {
			fragments = Array.prototype.slice.call(fragments);
			fragments.push(last);
		}
		return '/' + fragments.map(function (f) {return f.replace(/\//g, '\\/')}).join('/');
	}

	/*
	 * size utils
	 */

	function readableSize (s, precision) {
		var suffixes = 'GMK';
		var factor = 1<<10<<10<<10;
		var index = 0;
		precision || (precision = 2);
		while (factor > 1) {
			if (s >= factor) {
				return (s / factor).toFixed(precision) + ' ' + suffixes.charAt(index) + 'iB';
			}
			factor >>= 10;
			index++;
		}
		return s + ' Bytes';
	}

	/*
	 * date utils
	 */

	function dateFromW3CDTF (s) {
		/*
		 * index    mean
		 * -----    ----
		 * 1        year
		 * 2        month
		 * 3        day
		 * 4        hour
		 * 5        minute
		 * 6        second (optional)
		 * 7        millisecond (optional)
		 * 8        Z or timezone-description
		 * 9        timezone-offset-hour
		 * 10       timezone-offset-minute
		 */
		var re = /(\d{4})(?:-(\d{2})(?:-(\d{2})[ T](\d{2}):(\d{2}):(?:(\d{2})(\.\d+)?)?(Z|([+\-]\d{2}):?(\d{2})))?)?/.exec(s);
		if (!re) {
			return null;
		}

		var result = new Date('1900/1/1');
		re[7] != undefined && result.setMilliseconds(parseInt(re[7], 10) * 1000);
		re[6] != undefined && result.setSeconds(parseInt(re[6], 10));
		re[5] != undefined && result.setMinutes(parseInt(re[5], 10));
		re[4] != undefined && result.setHours(parseInt(re[4], 10));
		re[3] != undefined && result.setDate(parseInt(re[3], 10));
		re[2] != undefined && result.setMonth(parseInt(re[2], 10) - 1);
		re[1] != undefined && result.setYear(parseInt(re[1], 10));

		if (re[8] != undefined) {
			var offset = 0;

			if (re[8] !== 'Z') {
				offset = parseInt(re[9], 10);
				offset = 60 * offset + ((offset < 0) ? -1 : 1) * parseInt(re[10], 10);
			}

			result.setMinutes(result.getMinutes() - offset - result.getTimezoneOffset());
		}

		return result;
	}

	/*
	 * export
	 */

	exports.Utils = {
		baseUrl: function (s) {return s.replace(/\?.*/, '')},

		parseJson: parseJson,

		countOf: function (o) {return Object.keys(o).length},
		objectType: function (o) {return /^\[object\s+(.+)\]$/.exec(Object.prototype.toString.call(o))[1]},

		setInterval: timers.setInterval,
		setTimeout: timers.setTimeout,
		clearInterval: timers.clearInterval,
		clearTimeout: timers.clearTimeout,

		atob: base64.decode,
		btoa: base64.encode,

		createXHR: createXHR,

		_: function () {return Array.prototype.slice.call(arguments)},

		encodeUrl: encodeUrl,
		decodeUrl: decodeUrl,
		queryToObject: queryToObject,
		objectToQuery: objectToQuery,
		getFullUrl: getFullUrl,
		getCanonicalPath: getCanonicalPath,
		splitPath: splitPath,
		joinPath: joinPath,

		readableSize: readableSize,

		dateFromW3CDTF: dateFromW3CDTF
	};
})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
