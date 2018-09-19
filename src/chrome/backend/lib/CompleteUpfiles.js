/**
 * upped-file info completer
 *
 * @author akahuku@gmail.com
 */

(function (global) {
	'use strict';

	var TTL_MSECS = 1000 * 60 * 60;

	var cache = {
		completeFiles: require('./SimpleCache').SimpleCache(TTL_MSECS),
		siokaraThumbs: require('./SimpleCache').SimpleCache(TTL_MSECS)
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
		
		var self = this;
		self.ext.request(
			baseUrl + 'jsonp/_/' + id + '/complete/' + id, {},
			function (response, status) {
				var data = null;
				try {
					data = JSON.parse(response.replace(/^_\(|\);$/g, ''));
					data.base = data.url.match(/[^\/]+$/)[0];
					data.thumbnail = baseUrl + 'misc/' + id + '.thumb.jpg';
				}
				catch (e) {
					data = null;
				}

				if (data) {
					self.loadSiokaraThumbnail(
						data.thumbnail, function (thumb) {
							data.thumbnail = thumb;
							callback(cache.completeFiles.set(id, TTL_MSECS, data));
						});
				}
				else {
					callback(cache.completeFiles.set(id, TTL_MSECS, null));
				}
			},
			function () {
				callback(cache.completeFiles.set(id, TTL_MSECS, null));
			}
		);
	}

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

	var map = {
		sa: {base: 'http://www.nijibox6.com/futabafiles/001/',   method: completeSiokaraLink},
		sp: {base: 'http://www.nijibox2.com/futabafiles/003/',   method: completeSiokaraLink},
		ss: {base: 'http://www.nijibox5.com/futabafiles/kobin/', method: completeSiokaraLink},
		su: {base: 'http://www.nijibox5.com/futabafiles/tubu/',  method: completeSiokaraLink},
		sq: {base: 'http://www.nijibox6.com/futabafiles/mid/',   method: completeSiokaraLink},

		f:  {base: 'http://dec.2chan.net/up/',  method: completeUpLink},
		fu: {base: 'http://dec.2chan.net/up2/', method: completeUpLink}
	};

	function CompleteUpfiles () {
		if (!(this instanceof CompleteUpfiles)) {
			return new CompleteUpfiles;
		}
		this.ext = require('./kosian/Kosian').Kosian();
	}

	CompleteUpfiles.prototype.run = function run (id, callback) {
		var re = /^(s[apsuq]|fu|f)\d+$/.exec(id);
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
			function (response, status) {
				var r = new FileReader;
				r.onload = function () {
					callback(cache.siokaraThumbs.set(url, TTL_MSECS, r.result));
					r = null;
				};
				r.onerror = function () {
					callback(cache.siokaraThumbs.set(url, TTL_MSECS, null));
				};
				r.readAsDataURL(response);
			},
			function () {
				callback(cache.siokaraThumbs.set(url, TTL_MSECS, null));
			}
		);

		return true;
	};

	exports.CompleteUpfiles = CompleteUpfiles;

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
