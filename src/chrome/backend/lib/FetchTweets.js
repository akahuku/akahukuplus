/**
 * tweet fetcher
 *
 * @author akahuku@gmail.com
 */

(function (global) {
	'use strict';

	var FETCH_URL = 'https://api.twitter.com/1/statuses/oembed.json?id=';
	var TWEET_TTL_MSECS = 1000 * 60 * 60;

	var tweetCache = require('./SimpleCache').SimpleCache(TWEET_TTL_MSECS);

	function FetchTweets () {
		if (!(this instanceof FetchTweets)) {
			return new FetchTweets;
		}
		this.ext = require('./kosian/Kosian').Kosian();
	}

	FetchTweets.prototype.run = function run (id, callback) {
		tweetCache.purge();

		if (!/^\d+$/.test(id)) {
			callback(null);
			return;
		}

		if (tweetCache.exists(id)) {
			callback(tweetCache.get(id));
			return;
		}

		var xhr = this.ext.createTransport();
		xhr.open('GET', FETCH_URL + id);
		xhr.onload = function () {
			tweetCache.set(id, TWEET_TTL_MSECS, JSON.parse(xhr.responseText));
			callback(tweetCache.get(id));
			xhr = xhr.onload = xhr.onerror = null;
		};
		xhr.onerror = function () {
			tweetCache.set(id, TWEET_TTL_MSECS, null);
			callback(tweetCache.get(id));
			xhr = xhr.onload = xhr.onerror = null;
		};
		xhr.send();
	}

	exports.FetchTweets = FetchTweets;

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
