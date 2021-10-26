/**
 * external resource fetcher
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

import {Kosian} from './kosian/Kosian.js';
import {load} from '../../lib/utils.js';

const CACHE_TTL_MSECS = 1000 * 60 * 10;

function FetchExternalResource () {
	const ext = Kosian();

	let urlCache = {};
	let sweepTimer;

	function get (url) {
		if (url in urlCache) {
			registerSweep();
			return urlCache[url].objectURL;
		}
		else {
			return null;
		}
	}

	function store (url, blob) {
		urlCache[url] = {
			created: Date.now(),
			objectURL: URL.createObjectURL(blob)
		};

		registerSweep();

		return urlCache[url].objectURL;
	}

	function registerSweep () {
		if (sweepTimer) {
			clearTimeout(sweepTimer);
		}

		sweepTimer = setTimeout(sweep, CACHE_TTL_MSECS * 2);
	}

	function sweep () {
		console.log(`FetchExternalResource: sweep start at ${(new Date).toLocaleString()}`);
		sweepTimer = null;
		let sweeped = 0;
		Object.keys(urlCache).forEach(url => {
			URL.revokeObjectURL(urlCache[url].objectURL);
			delete urlCache[url];
			sweeped++;
		});
		console.log(`FetchExternalResource: sweep end, sweeped ${sweeped} entries`);
	}

	function fetchFrom (url) {
		const options = {referrerPolicy: 'unsafe-url'};

		/*
		 * 2021/09
		 * Cross-domain fetch from the background seems to be a bit broken.
		 * When using the GET method, neither the origin header nor the referer
		 * header is set correctly.
		 * For this reason, we dare to use the PUT method explicitly.
		 */

		if (/^https:\/\/appsweets\.net\//.test(url)) {
			options.method = 'PUT';
		}

		return load(url, options, 'blob').then(result => {
			if (result.error) {
				console.error(`FetchExternalResource: fetch failed, ${result.error}`);
				return null;
			}
			else {
				return result.content;
			}
		});
	}

	/*
	 * public methods
	 */

	async function run (url) {
		const cached = get(url);
		if (cached) {
			return cached;
		}

		const blob = await fetchFrom(url);
		if (!blob) {
			return null;
		}

		return store(url, blob);
	}

	/*
	 * constructor
	 */

	if (!(this instanceof FetchExternalResource)) {
		return new FetchExternalResource();
	}
	else {
		return {run};
	}
}

export {FetchExternalResource};

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :

