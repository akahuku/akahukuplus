'use strict';
/**
 * trampoline script
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

const queries = (() => {
	const result = {};
	window.location.search
	.replace(/^\?/, '')
	.split('&').forEach(s => {
		s = s.split('=');
		s[0] = decodeURIComponent(s[0]);
		s[1] = s.length >= 2 ? decodeURIComponent(s[1]) : null;
		result[s[0]] = s[1];
	});
	return result;
})();

switch (queries.mode) {
case 'cat':
	window.location.replace(
		window.location.href.replace(/\.php(\?.*)$/, '.htm#mode=cat'));
	break;
}

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
