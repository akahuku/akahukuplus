/*
 * offscreen
 */

/**
 * Copyright 2024-2025 akahuku, akahuku@gmail.com
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

import {
	log as ulog, delay, load,
	getErrorDescription
} from '../lib/utils.js';

/* <<< speech functions */

const TIMEOUT_SENTINEL_MSECS = 1000 * 60;

// @see https://cloud.voicetext.jp/webapi
const VOICETEXT_API_KEY = 'navc23v916pc75p';
const VOICETEXT_API_ENDPOINT = 'https://api.voicetext.jp';
const VOICETEXT_API_TTS = '/v1/tts';
const VOICETEXT_SPEAKER = 'hikari';
const VOICETEXT_FORMAT = 'mp3';
const VOICETEXT_PITCH = 100;
const VOICETEXT_SPEED = 100;

let speechPromise = Promise.resolve();

async function voiceText (params) {
	const opts = {};
	if ('voice' in params) opts.speaker = params['voice'];
	if ('volume' in params) opts.volume = params['volume'];
	if ('pitch' in params) opts.pitch = Math.floor(params['pitch'] * 100);
	if ('rate' in params) opts.speed = Math.floor(params['rate'] * 100);
	if ('format' in params) opts.format = params['format'];
	if ('text' in params) opts.text = params['text'];

	const audioData = await load(VOICETEXT_API_ENDPOINT + VOICETEXT_API_TTS, {
		method: 'POST',
		headers: {
			'authorization': `Basic ${btoa(VOICETEXT_API_KEY + ':')}`
		},
		body: new URLSearchParams({
			text: opts.text,
			speaker: opts.speaker || VOICETEXT_SPEAKER,
			format: opts.format || VOICETEXT_FORMAT,
			pitch: opts.pitch || VOICETEXT_PITCH,
			speed: opts.speed || VOICETEXT_SPEED
		})
	}, 'blob');

	if (audioData.error) {
		log(`offscreen.js: audio loading error: ${audioData.error}`);
		return;
	}

	await new Promise(resolve => {
		let objectURL = URL.createObjectURL(audioData.content);
		let audio = new Audio(objectURL);
		let playend = e => {
			log('voicetext playend handler');
			document.removeEventListener('speechStop', interceptor);
			if (audio) {
				audio.removeEventListener('ended', playend);
				audio.removeEventListener('error', playend);
			}
			URL.revokeObjectURL(objectURL);
			objectURL = audio = playend = interceptor = null;
			resolve();
		};
		let interceptor = () => {
			log('voicetext interceptor handler');
			if (audio) {
				audio.pause();
			}
			playend();
		};

		document.addEventListener('speechStop', interceptor);
		audio.addEventListener('ended', playend);
		audio.addEventListener('error', playend);
		audio.volume = opts.volume;
		log(`offscreen.js: starting voicetext...`);
		audio.play();
	});
}

async function webSpeech (params) {
	const opts = {};
	if ('volume' in params) opts.volume = params['volume'];
	if ('pitch' in params) opts.pitch = params['pitch'];
	if ('rate' in params) opts.rate = params['rate'];
	if ('lang' in params) opts.voice = params['lang'];
	if ('text' in params) opts.text = params['text'];

	let voices;
	voices = speechSynthesis.getVoices();
	if (voices.length == 0) {
		await delay(100);
		voices = speechSynthesis.getVoices();
	}

	if (!opts.lang) {
		opts.lang = 'ja-JP';
	}

	voices = voices.filter(voice => voice.lang == opts.lang);

	if (voices.length) {
		await new Promise(resolve => {
			let utterance = new SpeechSynthesisUtterance(opts.text);
			let playend = e => {
				log('webspeech playend handler');
				document.removeEventListener('speechStop', interceptor);
				if (utterance) {
					utterance.onend = utterance.onerror = utterance.onpause = null;
				}
				playend = interceptor = utterance = null;
				resolve();
			};
			let interceptor = () => {
				log('webspeech interceptor handler');
				speechSynthesis.cancel();
				playend();
			};

			document.addEventListener('speechStop', interceptor);
			utterance.voice = voices[0];
			utterance.volume = opts.volume
			utterance.pitch = opts.pitch;
			utterance.rate =  opts.rate;
			utterance.onend = utterance.onerror = utterance.onpause = playend;
			log(`offscreen.js: starting webspeech...`);
			speechSynthesis.speak(utterance);
		});
	}
}

function startSpeech (params, callback) {
	switch (params.type) {
	case 'webspeech':
		speechPromise = speechPromise.then(() => Promise.race([
			delay(TIMEOUT_SENTINEL_MSECS),
			webSpeech(params)]));
		break;
	case 'voicetext':
		speechPromise = speechPromise.then(() => Promise.race([
			delay(TIMEOUT_SENTINEL_MSECS),
			voiceText(params)]));
		break;
	default:
		log(`startSpeech: unknown voice type: "${params.type}"`);
		break;
	}

	speechPromise = speechPromise.catch(err => {
		log(`offscreen.js: speech exception: ${err.stack}`);
	})
	.finally(callback);
}
// >>>

/* <<< audio functions */

function playAudio (params) {
	return new Promise(resolve => {
		let audio = new Audio;

		if (audio.canPlayType('audio/mpeg') !== '') {
			audio.src = chrome.runtime.getURL(`/audio/${params.key}.mp3`);
		}
		else if (audio.canPlayType('audio/ogg') !== '') {
			audio.src = chrome.runtime.getURL(`/audio/${params.key}.ogg`);
		}
		else {
			resolve();
			return;
		}

		let playend = e => {
			document.removeEventListener('audioStop', interceptor);
			if (audio) {
				audio.removeEventListener('ended', playend);
				audio.removeEventListener('error', playend);
			}
			audio = playend = interceptor = null;
			resolve();
		};
		let interceptor = () => {
			log('audio interceptor handler');
			if (audio) {
				audio.pause();
			}
			playend();
		};

		document.addEventListener('audioStop', interceptor);
		audio.addEventListener('ended', playend);
		audio.addEventListener('error', playend);
		audio.volume = params.volume || 1.0;
		audio.play();
	});
}

// >>>

/*
 * misc functions
 */

function log (message) {
	if (ulog) {
		ulog(message);
	}
	logLines.push(message);
}

const logLines = [];

/*
 * note: the available properties of chrome.runtime on offscreen document of chrome 116 are:
 *
 *    0: "id"
 *    1: "onMessageExternal"
 *    2: "onMessage"
 *    3: "onConnectExternal"
 *    4: "onConnect"
 *    5: "connect"
 *    6: "getURL"
 *    7: "sendMessage"
 *    8: "ContextType"
 *    9: "OnInstalledReason"
 *   10: "OnRestartRequiredReason"
 *   11: "PlatformArch"
 *   12: "PlatformNaclArch"
 *   13: "PlatformOs"
 *   14: "RequestUpdateCheckStatus"
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.target !== 'offscreen') {
		return;
	}

	try {
		if (message.log) {
			ulog.config(message.log);
		}

		logLines.length = 0;
		//log(`offscreen.js: got a message: ${JSON.stringify(message)}`);

		switch (message.command) {
		case 'speech':
			startSpeech(message.params, () => {
				log(`offscreen.js: speech end`);
				sendResponse({
					state: 'speech-end',
					logLines
				});
			});
			return true;

		case 'speech-stop':
			document.dispatchEvent(new CustomEvent('speechStop'));
			sendResponse({
				state: 'speech-stop',
				logLines
			});
			break;

		case 'audio':
		case 'play-audio':
			playAudio(message.params).then(() => {
				sendResponse({
					state: 'audio played',
					logLines
				});
			});
			return true;

		case 'audio-stop':
		case 'stop-audio':
			document.dispatchEvent(new CustomEvent('audioStop'));
			sendResponse({
				state: 'audio stopped',
				logLines
			});
			break;

		default:
			throw new Error(`unknown command type: "${message.type}"`);
		}
	}
	catch (err) {
		sendResponse({
			error: err.message,
			logLines
		});
	}
});

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
