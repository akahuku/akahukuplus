// ==UserScript==
// @name          url switcher
// @include       http://*.2chan.net/*/futaba.php
// @include       http://*.2chan.net/*/futaba.php?*
// ==/UserScript==

var queries = (function () {
	var result = {};
	window.location.search
	.replace(/^\?/, '')
	.split('&').forEach(function (s) {
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
