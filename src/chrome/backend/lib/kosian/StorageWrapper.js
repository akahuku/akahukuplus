/**
 * json based storage wrapper
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */

(function () {
	'use strict';

	/*
	 * base class
	 */

	function StorageWrapper () {}

	StorageWrapper.prototype = Object.create(Object.prototype, {
		getItem: {value: function (key) {}},
		setItem: {value: function (key, value) {}},
		clear: {value: function () {}},
		toExternal: {value: function (value) {
			if (typeof value == 'string') {
				if (value.charAt(0) == '{' && value.substr(-1) == '}'
				||  value.charAt(0) == '[' && value.substr(-1) == ']') {
					try {value = JSON.parse(value)} catch (e) {}
				}
			}
			else if (value === null) {
				value = undefined;
			}
			return value;
		}},
		toInternal: {value: function (value) {
			switch (/^\[object\s+(.+)\]$/.exec(Object.prototype.toString.call(value))[1]) {
			case 'Object':
				/*FALLTHRU*/
			case 'Array':
				value = JSON.stringify(value);
				break;
			case 'Function':
				return;
			}
			return value;
		}}
	});

	/*
	 * localstorage wrapper
	 */

	function WebStorageWrapper () {
		StorageWrapper.apply(this, arguments);
	}

	WebStorageWrapper.prototype = Object.create(StorageWrapper.prototype, {
		getItem: {value: function (key) {
			return StorageWrapper.prototype.toExternal(localStorage.getItem(key));
		}},
		setItem: {value: function (key, value) {
			if (value === undefined) {
				localStorage.removeItem(key);
			}
			else {
				localStorage.setItem(key, StorageWrapper.prototype.toInternal(value));
			}
		}},
		clear: {value: function () {
			localStorage.clear();
		}}
	});
	WebStorageWrapper.prototype.constructor = StorageWrapper;

	/*
	 * simplestorage wrapper
	 */

	function JetpackStorageWrapper (ss) {
		StorageWrapper.apply(this, arguments);
		this.ss = ss;
	}

	JetpackStorageWrapper.prototype = Object.create(StorageWrapper.prototype, {
		getItem: {value: function (key) {
			return StorageWrapper.prototype.toExternal(this.ss.storage[key]);
		}},
		setItem: {value: function (key, value) {
			if (value === undefined) {
				delete this.ss.storage[key];
			}
			else {
				this.ss.storage[key] = StorageWrapper.prototype.toInternal(value);
			}
		}},
		clear: {value: function () {
			Object.keys(this.ss.storage).forEach(function (key) {
				delete this.ss.storage[key];
			}, this);
		}}
	});
	JetpackStorageWrapper.prototype.constructor = StorageWrapper;

	/*
	 * exports
	 */

	function create (window) {
		var ss;

		if (window.localStorage) {
			return new WebStorageWrapper;
		}
		else if ((ss = require('sdk/simple-storage'))) {
			return new JetpackStorageWrapper(ss);
		}
		else {
			return new StorageWrapper;
		}
	}

	exports.StorageWrapper = create;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
