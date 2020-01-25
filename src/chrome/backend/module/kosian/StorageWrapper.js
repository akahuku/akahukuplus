/**
 * json based storage wrapper
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

/*
 * base class
 */

function Base () {}

Base.prototype = Object.create(Object.prototype, {
	getItem: {value: function (key) {}},
	setItem: {value: function (key, value) {}},
	keys: {value: function () {}},
	exists: {value: function (key) {}},
	clear: {value: function () {}},
	toExternal: {value: function (value) {
		if (typeof value == 'string') {
			let tmp;
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
	Base.apply(this, arguments);
}

WebStorageWrapper.prototype = Object.create(Base.prototype, {
	getItem: {value: function (key) {
		return Base.prototype.toExternal(localStorage.getItem(key));
	}},
	setItem: {value: function (key, value) {
		if (value === undefined) {
			localStorage.removeItem(key);
		}
		else {
			value = Base.prototype.toInternal(value);
			const current = localStorage.getItem(key);
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
WebStorageWrapper.prototype.constructor = Base;

/*
 * exports
 */

export function StorageWrapper (window) {
	if (window.localStorage) {
		return new WebStorageWrapper;
	}
	else {
		return new Base;
	}
}

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
