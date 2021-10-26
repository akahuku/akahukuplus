/**
 * tweet fetcher
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

import {SimpleCache} from './SimpleCache.js';

const FETCH_URL = 'https://publish.twitter.com/oembed?';
const TWEET_TTL_MSECS = 1000 * 60 * 60;

const tweetCache = SimpleCache(TWEET_TTL_MSECS);

function FetchTweets () {
	if (!(this instanceof FetchTweets)) {
		return new FetchTweets;
	}
}

FetchTweets.prototype.run = function run (url, id, callback) {
	tweetCache.purge();

	if (!/^\d+$/.test(id)) {
		callback(null);
		return;
	}

	if (tweetCache.exists(id)) {
		callback(tweetCache.get(id));
		return;
	}

	let xhr = new XMLHttpRequest();
	xhr.open('GET', FETCH_URL + (new URLSearchParams({url: url, lang: 'ja'})).toString());
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

	return true;
}

export {FetchTweets};

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
