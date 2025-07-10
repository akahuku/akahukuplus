/**
 * miscellaneous utility functions
 *
 *
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

/*
 * helper vars/functions for chrome extension
 */

export const {chromeWrap, IS_WEB_EXTENSION} = (() => {
	let chromeWrap = null;
	let isWebExtension = false;

	if (typeof browser !== 'undefined') {
		chromeWrap = browser;
		isWebExtension = true;
	}
	else if (typeof chrome !== 'undefined') {
		chromeWrap = chrome;
	}

	if (typeof chromeWrap?.management?.getSelf === 'function') {
		chromeWrap.management.getSelf().then(ei => {
			Object.defineProperty(chromeWrap, 'IS_DEVELOP', {
				value: ei.installType === 'development'
			});
		});
	}

	return {
		chromeWrap,
		IS_WEB_EXTENSION: isWebExtension
	};
})();

/*
 * i18n functions (relies on Chrome extension)
 */

export const {LOCALE, _} = (() => {
	let LOCALE, _;
	try {
		if (chromeWrap) {
			LOCALE = chromeWrap.i18n.getMessage('locale_code');
		}
		else if (typeof process !== 'undefined') {
			// TBD
			LOCALE = 'C';
		}
		else {
			throw new Error('This context is not a browser extension.');
		}

		if (LOCALE === '') {
			throw new Error('The current locale cannot be identified because the “locale_code” message is not registered.');
		}
	}
	catch {
		return {LOCALE: null, _: a => a};
	}

	switch (LOCALE) {
	case 'en':
		_ = (id, ...args) => {
			const result = chromeWrap.i18n.getMessage(id, args);
			return result.replace(/\b(\d+)(\s*)([a-z]{2,})/g, ($0, n, space, word) => {
				if (n - 0 !== 1) {
					if (/[hos]$/.test(word)) {
						word += 'es';
					}
					else if (/[^aeiou]y$/.test(word)) {
						word = word.substr(0, word.length - 1) + 'ies';
					}
					else {
						word += 's';
					}
				}
				return n + space + word;
			});
		};
		break;

	case 'ja':
		_ = (id, ...args) => {
			return chromeWrap.i18n.getMessage(id, args);
		};
		break;

	default:
		_ = a => a;
		break;
	}

	return {LOCALE, _};
})();

/*
 * log functions (relies on Chrome extension)
 */

let enableLogFunction = false;
let enableExternalLog = false;
let logName;
let logCount = 0;
let logSetup = (async () => {
	const manifest = chromeWrap?.runtime?.getManifest?.() ?? {};
	const IS_DEVELOP = typeof chromeWrap?.management?.getSelf === 'function' ?
		(await chromeWrap.management.getSelf()).installType === 'development' :
		false;

	// enable logging on developer mode
	enableLogFunction = IS_DEVELOP;

	// enable external logging on debug manifest
	enableExternalLog = IS_DEVELOP
		&& ('version_name' in manifest)
		&& /(?:develop|debug)/.test(manifest.version_name)
})();

function logCore (...args) {
	if (!enableLogFunction) return;

	const now = new Date;
	const header = `[${++logCount}] ${now.toLocaleTimeString()}.${('' + now.getMilliseconds()).padStart(3, '0')}`;
	const s = header + '\t' + args.map(a => {
		if (a instanceof Error) {
			a = `${a.message}\n${a.stack}`;
		}
		return a;
	}).join(' ');

	// ###DEBUG CODE START###
	if (enableExternalLog) {
		try {
			fetch('http://dev.appsweets.net/extension-beacon/index.php', {
				method: 'POST',
				mode: 'cors',
				body: new URLSearchParams({
					message: s,
					name: logName ?? ''
				})
			}).catch(err => {
				console.log(err.stack);
			});
		}
		catch {
			console.log(s);
		}
	}
	// ###DEBUG CODE END###
	console.log(s);
}

export function log (...args) {
	if (logSetup) {
		console.log('log: waiting log setup...');
		logSetup.then(() => {
			console.log('log: after log setup');
			logSetup = undefined;
			logCore(...args);
		});
	}
	else {
		logCore(...args);
	}
}

log.config = con => {
	if ('enabled' in con) {
		enableLogFunction = !!con.enabled;
	}
	if ('enableExternalLog' in con) {
		enableExternalLog = !!con.enableExternalLog;
	}
	if ('name' in con) {
		logName = con.name;
	}
};

/*
 * offscreen utilities (relies on Chrome extension)
 *
 * note: currently we are using the “chrome” object directly,
 *       as the off-screen functionality is specific to manifest v3.
 */

export const {offscreenUrl, offscreenCloseAlarm} = ((c, b) => {
	if (!c || b) {
		return {
			offscreenUrl: '',
			offscreenCloseAlarm: ''
		};
	}
	else {
		return {
			offscreenUrl: chrome.runtime.getURL('asset/offscreen.html'),
			offscreenCloseAlarm: `offscreen-close-alarm-${chrome.runtime.id}`
		};
	}
})(typeof chrome !== 'undefined' ? chrome : null,
	typeof browser !== 'undefined' ? browser : null);

let offscreenDocumentCreating;

async function hasOffscreenDocument () {
	if (typeof chrome.runtime.getContexts == 'function') {
		const contexts = await chrome.runtime.getContexts({
			contextTypes: ['OFFSCREEN_DOCUMENT'],
			documentUrls: [offscreenUrl]
		});
		return contexts.length > 0;
	}
	else {
		for (const client of await clients.matchAll()) {
			if (client.url === offscreenUrl) {
				return true;
			}
		}
		return false;
	}
}

async function setupOffscreenDocument () {
	if (offscreenUrl == '') {
		throw new Error('this runtime is not a chrome extension');
	}

	const existingContexts = await hasOffscreenDocument();

	if (existingContexts) {
		return offscreenUrl;
	}

	// create offscreen document
	if (offscreenDocumentCreating) {
		await offscreenDocumentCreating;
	}
	else {
		offscreenDocumentCreating = chrome.offscreen.createDocument({
			url: offscreenUrl,
			reasons: [
				chrome.offscreen.Reason.AUDIO_PLAYBACK,
				chrome.offscreen.Reason.BLOBS
			],
			justification: 'reason for needing the document',
		});
		await offscreenDocumentCreating;
		offscreenDocumentCreating = null;
	}
	return offscreenUrl;
}

async function registerOffscreenDocumentCloser () {
	await chrome.alarms.clear(offscreenCloseAlarm);
	await chrome.alarms.create(offscreenCloseAlarm, {
		delayInMinutes: 1
	});
}

export async function openOffscreenDocument (command, params) {
	await setupOffscreenDocument();

	const existingContexts = await hasOffscreenDocument();
	let result;
	if (existingContexts) {
		result = await new Promise(resolve => {
			chrome.runtime.sendMessage({
				target: 'offscreen',
				log: {
					enabled: enableLogFunction,
					enableExternalLog: enableExternalLog,
					name: logName
				},
				command,
				params
			}, response => {
				if (chrome.runtime.lastError) {
					console.error(chrome.runtime.lastError);
				}
				resolve(response);
			});
		});
		await registerOffscreenDocumentCloser();
	}
	return result;
}

/*
 * tts function (relies on Chrome extension)
 */

export function Speech () {
	const con = {
		voice: 'tts',
		volume: 0.5,
		pitch: 1.0,
		rate: 1.0,
		voiceTextApiKey: null,
		fallback: false
	};

	/*
	async function openPopup (params) {
		await chromeWrap.storage.local.set({
			speechParams: params
		});

		const url = chromeWrap.runtime.getURL('asset/speech.html');
		const popup = await chromeWrap.windows.create({
			type: 'popup',
			focused: false,
			top: 1, left: 1,
			height: 1, width: 1,
			url
		});
		const tabId = popup.tabs[0].id;

		await Promise.all([
			chromeWrap.storage.local.set({
				speechTab: tabId
			}),
			new Promise(resolve => {
				chromeWrap.tabs.onRemoved.addListener(function onRemoved (tabId) {
					if (tabId == tabId) {
						chromeWrap.tabs.onRemoved.removeListener(onRemoved);
						resolve();
					}
				})
			})
		]);
	}
	*/

	function startTTS (text) {
		return new Promise(resolve => {
			chromeWrap.tts.speak(
				text,
				{
					lang: 'ja-JP',
					volume: con.volume,
					pitch: con.pitch,
					rate: con.rate,
					onEvent: e => {
						switch (e.type) {
						case 'end':
						case 'interrupted':
						case 'cancelled':
						case 'error':
							resolve();
							break;
						}
					},
				}
			);
		});
	}

	function startWebSpeech (text) {
		return openOffscreenDocument('speech', {
			type: 'webspeech',
			volume: con.volume,
			pitch: con.pitch,
			rate: con.rate,
			lang: 'ja-JP',
			text
		});
	}

	function startVoiceText (text, voice) {
		return openOffscreenDocument('speech', {
			type: 'voicetext',
			voice: voice,
			volume: con.volume,
			pitch: con.pitch,
			rate: con.rate,
			text
		});
	}

	function config (newconfig) {
		for (const p in con) {
			if (p in newconfig) {
				con[p] = newconfig[p];
			}
		}
		return this;
	}

	function start (text) {
		let p;

		switch (con.voice) {
		case 'voicetext/hikari':
		case 'voicetext/show':
			p = startVoiceText(text, con.voice.split('/')[1]);
			break;
		case 'webspeech':
			p = startWebSpeech(text);
			break;
		case 'tts':
			return startTTS(text);
		default:
			return Promise.reject(new Error('unknown voice type'));
		}

		if (con.fallback) {
			p = p.catch(() => {
				return startTTS(text);
			});
		}

		return p;
	}

	function stop () {
		let p;

		switch (con.voice) {
		case 'voicetext/hikari':
		case 'voicetext/show':
		case 'webspeech':
			p = openOffscreenDocument('speech-stop', {});
			break;
		case 'tts':
			chromeWrap.tts.stop();
			p = Promise.resolve();
			break;
		default:
			return Promise.reject(new Error('unknown voice type'));
		}

		return p;
	}

	return {config, start, stop};
}

/*
 * audio functions (relies on Chrome extension)
 */

export function audioPlay (key) {
	return openOffscreenDocument('audio-play', {key});
}

/*
 * misc functions
 */

export function dcl () {
	return new Promise(resolve => {
		if (document.readyState === 'complete' || document.readyState === 'interactive') {
			resolve();
		}
		else {
			document.addEventListener('DOMContentLoaded', resolve, {once: true});
		}
	});
}

export function delay (wait) {
	return new Promise(resolve => {
		setTimeout(resolve, wait);
	});
}

export function $ (id) {
	return typeof id === 'string' ? document.getElementById(id) : id;
}

export function $qs (selector, node) {
	return ($(node) || document).querySelector(selector);
}

export function $qsa (selector, node) {
	return ($(node) || document).querySelectorAll(selector);
}

export function empty (node) {
	node = $(node);
	if (!node) return;
	const r = document.createRange();
	r.selectNodeContents(node);
	r.deleteContents();
}

export function updateI18n () {
	document.querySelectorAll('[data-i18n]').forEach(node => {
		const key = node.dataset.i18n;
		const localized = chromeWrap.i18n.getMessage(key);
		if (typeof localized == 'string' && localized != '') {
			node.textContent = localized;
		}
	});
}

export function getErrorDescription (err) {
	let result = '';

	if ('message' in err) {
		result += err.message;
	}

	if ('fileName' in err) {
		result += ' at ' + err.fileName;
		if ('lineNumber' in err) {
			result += ':' + err.lineNumber;
		}
	}

	if ('stack' in err) {
		if (result !== '') {
			result += '\n';
		}
		result += err.stack;
	}

	return result;
}

export async function load (url, options = {}, type) {
	const result = {};
	let fetchActual, response;

	if (typeof content !== 'undefined' && typeof content.fetch === 'function') {
		fetchActual = content.fetch;
	}
	else if (typeof fetch === 'function') {
		fetchActual = fetch;
	}
	else {
		result.error = `fetch() is unavailable on this platform`;
		return result;
	}

	try {
		response = await fetchActual(url, options);
	}
	catch (err) {
		// network error (network down, dns lookup failed...)
		result.error = 'network error: ' + getErrorDescription(err);
		return result;
	}

	if ('headers' in response) {
		const headers = {};
		for (let h of response.headers) {
			headers[h[0].toLowerCase()] = h[1];
		}
		result.headers = headers;

		if (typeof response.headers.getSetCookie == 'function') {
			result.cookies = response.headers.getSetCookie();
		}
	}

	if ('status' in response) {
		result.status = response.status;
	}

	if ('statusText' in response) {
		result.statusText = response.statusText;
	}

	if (!response.ok) {
		// server error (server down, not found, not modified...)
		result.error = `server error: ${response.statusText} (${response.status})`;
		return result;
	}

	try {
		let content;
		switch (type) {
		case 'text':
			content = await response.text();
			break;

		case 'blob':
			content = await response.blob();
			break;

		case 'arraybuffer':
			content = await response.arrayBuffer();
			break;

		case /^text\s*;\s*charset\s*=\s*(.+)$/i.test(type) && type:
			{
				const encoding = RegExp.$1;
				const blob = await response.blob();
				content = await new Promise((resolve, reject) => {
					const reader = new FileReader;
					reader.onload = () => {resolve(reader.result)};
					reader.onerror = () => {reject(reader.error.message)};
					reader.readAsText(blob, encoding);
				});
			}
			break;

		case /^data(?:\s*;\s*fold\s*=\s*(\d+))?/.test(type) && type:
			{
				const fold = RegExp.$1 ? RegExp.$1 - 0 : 0;
				const blob = await response.blob();
				content = await new Promise((resolve, reject) => {
					const reader = new FileReader;
					reader.onload = () => {
						resolve(fold === 0 ?
							reader.result :
							reader.result.replace(new RegExp(`.{${fold}}`, 'g'), '$&\n')
						);
					};
					reader.onerror = () => {reject(reader.error.message)};
					reader.readAsDataURL(blob);
				});
			}
			break;

		default:
			content = await response.json();
			break;
		}

		result.content = content;
		return result;
	}
	catch (err) {
		// response error (invalid json...)
		result.error = 'response error: ' + getErrorDescription(err);
		return result;
	}
}

export function getReadableSize (size) {
	const s = typeof size == 'string' ? size - 0 : size;
	if (typeof s != 'number' || isNaN(s) || !isFinite(s) || s < 0) return size;

	const UNIT = 1024;
	const index = Math.log(size) / Math.log(UNIT) | 0;
	if (index == 0) {
		return s == 1 ? `${s}Byte` : `${s}Bytes`;
	}

	return (s / Math.pow(UNIT, index)).toFixed(20).replace(/(\...).*/, '$1') +
		' KMGTPEZY'.charAt(index) +
		'iB';
}

export function debounce (fn, interval = 100) {
	let timerId;
	return (...args) => {
		timerId && clearTimeout(timerId);
		timerId = setTimeout(() => {
			timerId = undefined;
			fn.apply(null, args);
		}, interval);
	}
}

export function throttle (fn, limit) {
	let waiting = false;
	return (...args) => {
		if (!waiting) {
			fn.apply(null, args);
			waiting = true;
			setTimeout(() => {
				waiting = false;
			}, limit);
		}
	}
}

export function createFormData (data) {
	const result = new URLSearchParams;

	for (const name in data) {
		result.append(name, data[name]);
	}

	return result;
}

export function parseJson (s) {
	try {
		return JSON.parse(s);
	}
	catch {
		return undefined;
	}
}

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
