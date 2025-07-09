/**
 * tweet fetcher
 *
 *
 * Copyright 2012-2025 akahuku, akahuku@gmail.com
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

import {TimeLimitedCache} from './SimpleCache.js';
import {log, load} from '../../lib/utils.js';

const FETCH_URL = 'https://publish.twitter.com/oembed?';
const TWEET_TTL_MSECS = 1000 * 60 * 60;

function FetchTweets () {
	const tweetCache = new TimeLimitedCache('tweet', TWEET_TTL_MSECS);

	async function run (url, id) {
		tweetCache.purge();

		if (!/^\d+$/.test(id)) {
			log(`FetchTweets: invalid id, "${id}"`);
			return null;
		}

		if (await tweetCache.exists(id)) {
			const content = await tweetCache.get(id);
			log(`FetchTweets: found ${id} from cache: ${content?.html}`);
			return content;
		}

		const result = await load(
			`${FETCH_URL}${new URLSearchParams({url, lang: 'ja'})}`);
		const content = result.error ? null : result.content;

		if (result.error) {
			log(`FetchTweets: failed to load for id ${id}, error: ${result.error}`);
		}
		else {
			log(`FetchTweets: loaded the content for id ${id} from X: ${content?.html}`);
		}

		await tweetCache.set(id, content);

		return content;
	}

	return {run};
}

export {FetchTweets};

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
