/**
 * sound manager
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

import {Kosian} from './Kosian.js';

export function Sound () {
	if (!(this instanceof Sound)) {
		return new Sound();
	}
	this.ext = Kosian();
	this.pool = {};
}

Sound.prototype = {
	createAudio: function () {
		return new Audio;
	},
	load: function (key, callback) {
		const a = {
			enabled: false,
			audio: this.createAudio()
		};
		let prefix = '';
		let suffix = '';

		this.pool[key] = a;

		if (a.audio.canPlayType('audio/ogg')) {
			prefix = 'data:audio/ogg;base64,';
			suffix = '.ogg';
		}
		else if (a.audio.canPlayType('audio/mpeg')) {
			prefix = 'data:audio/mpeg;base64,';
			suffix = '.mp3';
		}

		if (suffix == '') {
			callback();
			return;
		}

		this.ext.resource(
			'sounds/' + key + suffix + '.txt',
			function (data) {
				function loaded () {
					a.audio.removeEventListener('load', loaded, false);
					a.audio.removeEventListener('loadeddata', loaded, false);
					a.audio.removeEventListener('error', error, false);
					a.enabled = true;
					callback();
				}

				function error () {
					a.audio.removeEventListener('load', loaded, false);
					a.audio.removeEventListener('loadeddata', loaded, false);
					a.audio.removeEventListener('error', error, false);
					a.enabled = false;
					a.audio = null;
					callback();
				}

				if (data) {
					a.audio.addEventListener('load', loaded, false);
					a.audio.addEventListener('loadeddata', loaded, false);
					a.audio.addEventListener('error', error, false);
					a.audio.src = prefix + data;
				}
				else {
					error();
				}
			}, {noCache:true}
		);
	},
	doPlay: function (key, opts) {
		if (!(key in this.pool)) {
			return this.load(key, () => {
				this.play(key, opts);
			});
		}

		let a = this.pool[key];
		if (!a.audio || !a.enabled) return;
		if (typeof opts.volume != 'number') return;
		if (isNaN(opts.volume)) return;

		const vol = Math.max(0, Math.min(opts.volume, 100));
		if (vol == 0) return;

		try {
			a = a.audio;
			!a.ended && a.pause();
			a.loop = false;
			a.volume = vol / 100;
			a.currentTime = 0;
			a.play();
		}
		catch (e) {
			console.error(e.stack);
		}
	},
	play: function () {
		this.doPlay.apply(this, arguments);
	}
};

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
