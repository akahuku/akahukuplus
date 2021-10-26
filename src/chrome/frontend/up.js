'use strict';

/*
 * akahukuplus
 *
 * @author akahuku@gmail.com
 */

Promise.all([
	import(chrome.runtime.getURL('lib/up.js')),
	new Promise(resolve => {
		if (/^(?:complete|interactive)$/.test(document.readyState)) {
			resolve();
		}
		else {
			document.addEventListener('DOMContentLoaded', resolve, {once: true});
		}
	})
]).then(p => {
	p[0].run();
});
