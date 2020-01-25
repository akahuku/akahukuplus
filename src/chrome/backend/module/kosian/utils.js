/**
 * utilities
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

export function baseUrl (s) {return s.replace(/\?.*/, '')}

/*
 * JSON utils
 */

export function parseJson (s, def) {
	if (typeof s != 'string') {
		return arguments.length >= 2 ? def : {};
	}

	let result;
	try {
		result = JSON.parse(s);
	}
	catch (e) {
		result = arguments.length >= 2 ? def : {};
	}

	return result;
}

export function countOf (o) {
	return Object.keys(o).length;
}

export function objectType (o) {
	return /^\[object\s+(.+)\]$/.exec(Object.prototype.toString.call(o))[1];
}

/*
 * url manipulation
 */

export function encodeUrl (s) {
	if (!s) return '';
	return encodeURIComponent(s)
		.replace(/[!'()]/g, escape)
		.replace(/\*/g, "%2A");
}

export function decodeUrl (s) {
	return decodeURIComponent(s);
}

export function queryToObject (url) {
	const index = url.indexOf('?');
	if (index < 0) {
		return {};
	}

	const result = {};
	url.substring(index + 1).split('&').forEach(s => {
		const index = s.indexOf('=');
		let key, value;
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

export function objectToQuery (q) {
	const result = [];
	for (let i in q) {
		if (q[i] == undefined) continue;
		result.push(encodeUrl(i) + '=' + encodeUrl(q[i]));
	}
	return result.join('&');
}

export function getFullUrl (url, q) {
	const query = objectToQuery(q);
	const result = query == '' ?
		url :
		(url + (url.indexOf('?') >= 0 ? '&' : '?') + query);
	return result;
}

export function getCanonicalPath (path) {
	path = path.replace(/\\\//g, '_');
	path = path.replace(/\\(.)/g, '$1');
	path = path.replace(/\\/g, '');
	return path.split('/').map(encodeUrl).join('/');
}

export function splitPath (path) {
	let re, regex = /(?:\\.|[^\/])*(?:\/|$)/g, result = [], foundLast = false;
	while (!foundLast && (re = regex.exec(path))) {
		foundLast = re[0].substr(-1) != '/';
		let tmp = foundLast ? re[0] : re[0].substr(0, re[0].length - 1);
		tmp = tmp.replace(/\\(.)/g, '$1');
		tmp != '' && result.push(tmp);
	}
	return result;
}

export function joinPath (fragments, last) {
	if (last) {
		fragments = Array.prototype.slice.call(fragments);
		fragments.push(last);
	}
	return '/' + fragments.map(function (f) {return f.replace(/\//g, '\\/')}).join('/');
}

/*
 * size utils
 */

export function readableSize (s, precision) {
	throw new Error('NOT IMPLEMENTED');
}

/*
 * date utils
 */

export function dateFromW3CDTF (s) {
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
	let re = /(\d{4})(?:-(\d{2})(?:-(\d{2})[ T](\d{2}):(\d{2}):(?:(\d{2})(\.\d+)?)?(Z|([+\-]\d{2}):?(\d{2})))?)?/.exec(s);
	if (!re) {
		return null;
	}

	const result = new Date('1900/1/1');
	re[7] != undefined && result.setMilliseconds(parseInt(re[7], 10) * 1000);
	re[6] != undefined && result.setSeconds(parseInt(re[6], 10));
	re[5] != undefined && result.setMinutes(parseInt(re[5], 10));
	re[4] != undefined && result.setHours(parseInt(re[4], 10));
	re[3] != undefined && result.setDate(parseInt(re[3], 10));
	re[2] != undefined && result.setMonth(parseInt(re[2], 10) - 1);
	re[1] != undefined && result.setYear(parseInt(re[1], 10));

	if (re[8] != undefined) {
		let offset = 0;

		if (re[8] !== 'Z') {
			offset = parseInt(re[9], 10);
			offset = 60 * offset + ((offset < 0) ? -1 : 1) * parseInt(re[10], 10);
		}

		result.setMinutes(result.getMinutes() - offset - result.getTimezoneOffset());
	}

	return result;
}

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
