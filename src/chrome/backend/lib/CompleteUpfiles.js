/**
 * upped-file info completer
 *
 * @author akahuku@gmail.com
 */

(function (global) {
	'use strict';

	var TTL_MSECS = 1000 * 60 * 60;

	var cache = require('./SimpleCache').SimpleCache(TTL_MSECS);

	function completeSiokaraLink (id, baseUrl, callback) {
		cache.purge();

		if (!/^s[apsuq]\d+$/.test(id)) {
			callback(null);
			return;
		}

		if (cache.exists(id)) {
			callback(cache.get(id));
			return;
		}
		
		this.ext.request(
			baseUrl + 'jsonp/_/' + id + '/complete/' + id,
			function (data, status) {
				try {
					data = JSON.parse(data.replace(/^_\(|\);$/g, ''));
					data.base = data.url.match(/[^\/]+$/)[0];
					data.thumbnail = baseUrl + 'misc/' + id + '.thumb.jpg';
				}
				catch (e) {
					data = null;
				}
				callback(cache.set(id, TTL_MSECS, data));
			},
			function () {
				cache.set(id, TTL_MSECS, null);
				callback(cache.get(id));
			}
		);
	}

	function completeUpLink (id, baseUrl, callback) {
		cache.purge();

		if (!/^fu?\d+$/.test(id)) {
			callback(null);
			return;
		}

		if (cache.exists(id)) {
			callback(cache.get(id));
			return;
		}

		var xhr = this.ext.createTransport();
		xhr.open('GET', baseUrl + 'up.htm');
		xhr.onload = function () {
			var re, regex = /\[<a[^>]+href="([^"]+)"[^>]*>(fu?\d+)(\.[^.]+)<\/a>\]/g;
			var data = null;
			while ((re = regex.exec(xhr.responseText))) {
				if (re[2] == id) {
					data = {
						url: re[1],
						base: re[2] + re[3]
					};
					break;
				}
			}
			callback(cache.set(id, TTL_MSECS, data));
			xhr = xhr.onload = xhr.onerror = null;
		};
		xhr.onerror = function () {
			cache.set(id, TTL_MSECS, null);
			callback(cache.get(id));
			xhr = xhr.onload = xhr.onerror = null;
		};
		xhr.send();
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
console.log('CompleteUpfile: got id ' + id);
		var re = /^(s[apsuq]|fu|f)\d+$/.exec(id);

		if (!re || !re[1]) {
			callback(null);
			return;
		}

		map[re[1]].method.call(this, id, map[re[1]].base, callback);

		return true;
	};

	exports.CompleteUpfiles = CompleteUpfiles;

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
