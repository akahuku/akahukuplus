/**
 * commonjs partial emulation
 *
 * @author akahuku@gmail.com
 */

(function (global) {
	'use strict';

	var CORE_LIBS = [
		'kosian/Utils.js',
		'kosian/SHA1.js',
		'kosian/Blowfish.js',
		'kosian/ResourceLoader.js',
		'kosian/FileSystemImpl.js',
		'kosian/FileSystem.js',
		'kosian/StorageWrapper.js',
		'kosian/TabWatcher.js',
		'kosian/Kosian.js',
		'kosian/OperaImpl.js'
	];

	var modules = {};
	var pathCache = {};
	var isCoreLoaded = false;

	function loadScripts () {
		var args = Array.prototype.slice.call(arguments);

		if (!isCoreLoaded) {
			Array.prototype.unshift.apply(args, CORE_LIBS);
			isCoreLoaded = true;
		}

		var loader = function (onload) {
			var top = args.shift();

			if (typeof top == 'function') {
				try {
					top();
				}
				catch (e) {
				}
				onload();
			}
			else {
				var s = document.createElement('script');
				s.src = 'lib/' + top;
				s.onload = onload;
				document.head.appendChild(s);
				modules[s.src] = global.exports = {};
			}
		};
		loader(function onload (e) {
			if (e) {
				e.target.onload = null;
				e.target.parentNode.removeChild(e.target);
			}
			if (args.length) {
				loader(onload);
			}
			else {
				/*var a = ['*** all scripts has been loaded ***'];
				for (var i in modules) {
					a.push('module path: ' + i);
					for (var j in modules[i]) {
						a.push('\t' + j);
					}
				}
				console.log(a.join('\n'));*/
			}
		});
	}

	function require (path) {
		if (path in pathCache) {
			return modules[pathCache[path]];
		}

		var anchor = document.createElement('a');
		anchor.href = 'lib/' + path + '.js';

		var canonical = anchor.href;
		pathCache[path] = canonical;

		return modules[canonical];
	}

	global.loadScripts = loadScripts;
	global.require = require;
})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
