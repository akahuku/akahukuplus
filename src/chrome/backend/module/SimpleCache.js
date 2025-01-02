/**
 * simple cache
 */

/**
 * Copyright 2012-2024 akahuku, akahuku@gmail.com
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

import * as idbkeyval from '../../lib/idb-keyval.js';

export function TimeLimitedCache (name, ttl) {
	const dbKey = `cache-${name}`;
	let cache;

	async function ensureCache () {
		if (!cache) {
			cache = await idbkeyval.get(dbKey) ?? new Map;
		}
		return cache;
	}

	function exists (key) {
		return ensureCache().then(cache => cache.has(key));
	}

	function get (key, defaultValue) {
		return ensureCache().then(cache => cache.get(key)?.data ?? defaultValue);
	}

	function set (key, value) {
		return ensureCache().then(cache => {
			cache.set(key, {
				expires: Date.now() + ttl,
				data: value
			});
			return idbkeyval.set(dbKey, cache);
		});
	}

	function purge () {
		return ensureCache().then(cache => {
			for (const [key, value] of cache) {
				if (Date.now() >= value.expires) {
					cache.delete(key);
				}
			}
			return idbkeyval.set(dbKey, cache);
		});
	}

	return {exists, get, set, purge};
}

export function SimpleCache (ttl) {
	if (!(this instanceof SimpleCache)) {
		return new SimpleCache(ttl);
	}
	this.cache = {};
	this.ttlMsecs = ttl || 1000 * 60 * 60;
}

SimpleCache.prototype.exists = function (key) {
	return key in this.cache;
};

SimpleCache.prototype.get = function (key) {
	return this.cache[key].data;
};

SimpleCache.prototype.set = function (key, ttl, item) {
	this.cache[key] = {
		expires: Date.now() + ttl,
		data: item
	};
	return item;
};

SimpleCache.prototype.purge = function () {
	Object.keys(this.cache).forEach(i => {
		if (Date.now() >= this.cache[i].expires) {
			delete this.cache[i];
		}
	});
};

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
