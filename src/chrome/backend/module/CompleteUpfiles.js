/**
 * upped-file info completer
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
import {SimpleCache} from './SimpleCache.js';

const TTL_MSECS = 1000 * 60 * 60;

const cache = {
	completeFiles: SimpleCache(TTL_MSECS),
	siokaraThumbs: SimpleCache(TTL_MSECS)
};

function completeSiokaraLink (id, baseUrl, callback) {
	cache.completeFiles.purge();

	if (!/^s[apsuq]\d+$/.test(id)) {
		callback(null);
		return;
	}

	if (cache.completeFiles.exists(id)) {
		callback(cache.completeFiles.get(id));
		return;
	}
	
	this.ext.request(
		`${baseUrl}jsonp/_/${id}/complete/${id}`, {},
		(response, status) => {
			let data = null;
			try {
				data = this.ext.utils.parseJson(response.replace(/^_\(|\);$/g, ''));
				data.base = data.url.match(/[^\/]+$/)[0];
				data.thumbnail = `${baseUrl}misc/${id}.thumb.jpg`;
			}
			catch (e) {
				data = null;
			}

			if (data) {
				this.loadSiokaraThumbnail(
					data.thumbnail, thumb => {
						data.thumbnail = thumb;
						callback(cache.completeFiles.set(id, TTL_MSECS, data));
					});
			}
			else {
				callback(cache.completeFiles.set(id, TTL_MSECS, null));
			}
		},
		() => {
			callback(cache.completeFiles.set(id, TTL_MSECS, null));
		}
	);
}

/*
function completeUpLink (id, baseUrl, callback) {
	cache.completeFiles.purge();

	if (!/^fu?\d+$/.test(id)) {
		callback(null);
		return;
	}

	if (cache.completeFiles.exists(id)) {
		callback(cache.completeFiles.get(id));
		return;
	}

	this.ext.request(
		baseUrl + 'up.htm', {},
		function (response, status) {
			var re, regex = /\[<a[^>]+href="([^"]+)"[^>]*>(fu?\d+)(\.[^.]+)<\/a>\]/g;
			var data = null;
			while ((re = regex.exec(response))) {
				if (re[2] == id) {
					data = {
						url: re[1],
						base: re[2] + re[3]
					};
					break;
				}
			}
			callback(cache.completeFiles.set(id, TTL_MSECS, data));
		},
		function () {
			callback(cache.completeFiles.set(id, TTL_MSECS, null));
		}
	);
}
*/

const map = {
	sa: {base: 'http://www.nijibox6.com/futabafiles/001/',   method: completeSiokaraLink},
	sp: {base: 'http://www.nijibox2.com/futabafiles/003/',   method: completeSiokaraLink},
	ss: {base: 'http://www.nijibox5.com/futabafiles/kobin/', method: completeSiokaraLink},
	su: {base: 'http://www.nijibox5.com/futabafiles/tubu/',  method: completeSiokaraLink},
	sq: {base: 'http://www.nijibox6.com/futabafiles/mid/',   method: completeSiokaraLink},

	/*
	f:  {base: 'http://dec.2chan.net/up/',  method: completeUpLink},
	fu: {base: 'http://dec.2chan.net/up2/', method: completeUpLink}
	*/
};

function CompleteUpfiles () {
	if (!(this instanceof CompleteUpfiles)) {
		return new CompleteUpfiles;
	}
	this.ext = Kosian();
}

CompleteUpfiles.prototype.run = function run (id, callback) {
	const re = /^(s[apsuq]|fu|f)\d+$/.exec(id);
	if (!re) {
		callback(null);
		return;
	}

	map[re[1]].method.call(this, id, map[re[1]].base, callback);

	return true;
};

CompleteUpfiles.prototype.loadSiokaraThumbnail = function loadSiokaraThumbnail (url, callback) {
	cache.siokaraThumbs.purge();

	if (cache.siokaraThumbs.exists(url)) {
		callback(cache.siokaraThumbs.get(url));
		return;
	}
	
	this.ext.request(
		url, {responseType: 'blob'},
		(response, status) => {
			let r = new FileReader;
			r.onload = () => {
				callback(cache.siokaraThumbs.set(url, TTL_MSECS, r.result));
				r = null;
			};
			r.onerror = () => {
				callback(cache.siokaraThumbs.set(url, TTL_MSECS, null));
			};
			r.readAsDataURL(response);
		},
		() => {
			callback(cache.siokaraThumbs.set(url, TTL_MSECS, null));
		}
	);

	return true;
};

export {CompleteUpfiles};

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
