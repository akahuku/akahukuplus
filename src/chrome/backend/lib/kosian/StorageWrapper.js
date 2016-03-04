/**
 * json based storage wrapper
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2012-2016 akahuku, akahuku@gmail.com
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

(function () {
	'use strict';

	/*
	 * base class
	 */

	function StorageWrapper () {}

	StorageWrapper.prototype = Object.create(Object.prototype, {
		getItem: {value: function (key) {}},
		setItem: {value: function (key, value) {}},
		keys: {value: function () {}},
		exists: {value: function (key) {}},
		clear: {value: function () {}},
		toExternal: {value: function (value) {
			if (typeof value == 'string') {
				var tmp;
				try {
					tmp = JSON.parse(value);
				}
				catch (e) {
					tmp = value;
				}
				value = tmp;
			}
			else if (value === null) {
				value = undefined;
			}
			return value;
		}},
		toInternal: {value: function (value) {
			return JSON.stringify(value);
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
				value = StorageWrapper.prototype.toInternal(value);
				var current = localStorage.getItem(key);
				if (current === null || value != current) {
					localStorage.setItem(key, value);
				}
			}
		}},
		keys: {value: function () {
			return Object.keys(localStorage);
		}},
		exists: {value: function (key) {
			return key in localStorage;
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
				value = StorageWrapper.prototype.toInternal(value);
				var current = this.ss.storage[key];
				if (current === undefined || value != current) {
					this.ss.storage[key] = value;
				}
			}
		}},
		keys: {value: function () {
			return Object.keys(this.ss.storage);
		}},
		exists: {value: function (key) {
			return key in this.ss.storage;
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
