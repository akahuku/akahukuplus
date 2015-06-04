/**
 * clipboard manager
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2012-2015 akahuku, akahuku@gmail.com
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

	//
	function Clipboard () {}
	Clipboard.prototype = {
		set: function (data) {},
		get: function () {return ''}
	};

	//
	function ExecCommandClipboard () {}
	ExecCommandClipboard.prototype = Object.create(Clipboard.prototype, {
		set: {value: function (data) {
			var buffer = document.getElementById('clipboard-buffer');
			data || (data = '');
			try {
				if (buffer && data != '') {
					buffer.value = data;
					buffer.focus();
					buffer.select();
					document.execCommand('cut');
				}
			}
			catch (e) {
			}
		}},
		get: {value: function () {
			var buffer = document.getElementById('clipboard-buffer');
			var data = '';
			try {
				if (buffer) {
					buffer.value = '';
					buffer.focus();
					document.execCommand('paste');
					data = buffer.value;
				}
			}
			catch (e) {
				data = '';
			}
			return data;
		}}
	});
	ExecCommandClipboard.prototype.constructor = Clipboard;

	//
	function JetpackClipboard () {
		this.cb = require('sdk/clipboard');
	}
	JetpackClipboard.prototype = Object.create(Clipboard.prototype, {
		set: {value: function (data) {
			this.cb.set(data, 'text');
		}},
		get: {value: function () {
			return this.cb.get('text');
		}}
	});
	JetpackClipboard.prototype.constructor = Clipboard;

	//
	function create (window) {
		if (window.chrome) {
			return new ExecCommandClipboard;
		}
		else if (window.opera) {
			return new ExecCommandClipboard;
		}
		else if (require('sdk/self')) {
			return new JetpackClipboard;
		}
		else {
			return new Clipboard;
		}
	}

	exports.Clipboard = create;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
