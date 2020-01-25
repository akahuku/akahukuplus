/**
 * simple cache
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

function SimpleCache (ttl) {
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

export {SimpleCache};

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
