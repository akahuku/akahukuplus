/**
 * akahukuplus: Take your futaba life higher.
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

/* <<<1 module imports */
import {Kosian} from './kosian/Kosian.js';
import {SjisUtils} from './SjisUtils.js';
import {FetchTweets} from './FetchTweets.js';
import {CompleteUpfiles} from './CompleteUpfiles.js';
import {SaveImage} from './SaveImage.js';



/* <<<1 consts */
const RELOAD_FLAG_KEY = 'reload_all_tabs';



/* <<<1 variables */
const ext = Kosian(window, {
	appName: 'akahukuplus',
	openBaseUrlPattern: /^https?:\/\/[^.]+\.2chan\.net(?::\d+)?\/[^\/]+\//
});
const sjisUtils = SjisUtils;
const fetchTweets = FetchTweets();
const completeUpfiles = CompleteUpfiles();
const saveImage = SaveImage('LICENSE');
const initializingTabIds = {};



/* <<<1 functions */
function delay (msecs) {
	return new Promise(resolve => {
		setTimeout(resolve, msecs);
	});
}

function getAllFutabaTabs () {
	return new Promise(resolve => {
		chrome.tabs.query({}, tabs => {
			let futabaTabs = tabs.filter(tab => /^https?:\/\/[^.]+\.2chan\.net\//.test(tab.url));
			resolve(futabaTabs);
		});
	});
}

function optimizeAssetLoading () {
	const cancelParam = {cancel: true};
	const throughParam = {cancel: false};
	const regexFutabaContentInclude = /^https?:\/\/[^.]+\.2chan\.net(?::\d+)?\/[^\/]+\/(?:(?:futaba|\d+)|res\/\d+)\.html?/;
	const regexFutabaContentExclude = /^https?:\/\/(?:dec)\.2chan\.net(?::\d+)?\/(?:up2?\/)/;
	const regexFutabaAsset = /^https?:\/\/[^.]+\.2chan\.net(?::\d+)?\//;

	chrome.webRequest.onBeforeRequest.addListener(
		details => {
			switch (details.type) {
			case 'main_frame':
			case 'sub_frame':
				if (regexFutabaContentInclude.test(details.url)
				&& !regexFutabaContentExclude.test(details.url)) {
					initializingTabIds[details.tabId] = true;
					return throughParam;
				}
				break;

			case 'image':
				break;
			}

			if (details.url.startsWith('chrome-extension://')) {
				return throughParam;
			}

			// Currently moz-extension: scheme does not seem to be
			// affected by WebRequest, but it is no problem writing
			// this code. (2018-10)
			if (details.url.startsWith('moz-extension://')) {
				return throughParam;
			}

			if (details.tabId in initializingTabIds) {
				//console.log('cancel: ' + details.type + ' ' + details.url);
				return cancelParam;
			}
			else {
				//console.log('through: ' + details.type + ' ' + details.url);
				return throughParam;
			}
		},
		{urls: ['<all_urls>']},
		['blocking']
	);
}

function reloadAllFutabaTabs () {
	let needReload = localStorage.getItem(RELOAD_FLAG_KEY);

	if (needReload) {
		localStorage.removeItem(RELOAD_FLAG_KEY);
	}

	if (needReload && ext.isDev) {

		function getCurrentTab () {
			return new Promise(resolve => {
				chrome.tabs.query(
					{active: true, currentWindow: true},
					tabs => resolve(tabs[0].id)
				);
			});
		}

		function activateTab (id) {
			return new Promise(resolve => {
				chrome.tabs.update(id, {active: true}, () => resolve());
			});
		}

		function reloadTab (id) {
			return new Promise(resolve => {
				console.log(`reloading tab id ${id}...`);
				function handleTabUpdated (tabId, changeInfo, tab) {
					if (tabId != id) return;
					if (changeInfo.status != 'complete') return;

					console.log(`...reloaded tab id ${id}...`);
					chrome.tabs.onUpdated.removeListener(handleTabUpdated);
					resolve();
				}
				chrome.tabs.onUpdated.addListener(handleTabUpdated);
				chrome.tabs.reload(id);
			});
		}

		function ensureReload (id) {
			return activateTab(id).then(() => reloadTab(id));
		}

		function ensureReloadTabs (tabs) {
			return tabs.reduce((seq, tab) => {
				return seq.then(() => ensureReload(tab.id));
			}, Promise.resolve());
		}

		let currentTabId;
		getCurrentTab()
		.then(id => {currentTabId = id})
		.then(() => getAllFutabaTabs())
		.then(tabs => ensureReloadTabs(tabs))
		.then(() => activateTab(currentTabId));
	}
}



/** <<<2 request handlers */
const handlers = {
	'init': (command, data, sender, res) => {
		res({
			extensionId: ext.id,
			tabId: sender,
			version: ext.version,
			devMode: ext.isDev
		});
	},

	'initialized': (command, data, sender, res) => {
		delete initializingTabIds[sender.replace(/_\d+$/, '')];
		//console.log(`tab ${sender} unlocked`);
	},

	'iconv': (command, data, sender, res) => {
		res(sjisUtils.toSjis(data));
	},

	'open': (command, data, sender, res) => {
		return ext.openTabWithUrl(data.url, data.selfUrl);
	},

	'get-tweet': (command, data, sender, res) => {
		return fetchTweets.run(data.id, res);
	},

	'complete': (command, data, sender, res) => {
		return completeUpfiles.run(data.id, res);
	},

	'load-siokara-thumbnail': (command, data, sender, res) => {
		return completeUpfiles.loadSiokaraThumbnail(data.url, res);
	},

	'save-image': (command, data, sender, res) => {
		return saveImage.run(
			data.url, data.path, data.mimeType,
			data.anchorId, sender);
	},

	'get-resource': (command, data, sender, res) => {
		function handleGetResource (path, asDataURL, callback) {
			let html5FileEnabled = global.Blob && global.FileReader;
			let opts = {noCache: true};
			if (asDataURL) {
				if (html5FileEnabled) {
					opts.responseType = 'blob';
				}
				else {
					opts.mimeType = 'text/plain;charset=x-user-defined';
				}
			}
			ext.resource(
				path, data => {
					if (asDataURL) {
						if (html5FileEnabled && data instanceof global.Blob) {
							let fr = new FileReader;
							fr.onload = () => {
								callback(fr.result);
								fr.onload = null;
								fr = data = null;
							};
							fr.readAsDataURL(data);
						}
						else if (typeof data == 'string') {
							let tmp = [];
							for (let i = 0, goal = data.length; i < goal; i++) {
								tmp[i] = data.charCodeAt(i) & 0xff;
							}
							data = 'data:application/octet-stream;base64,' +
								btoa(String.fromCharCode.apply(String, tmp));
							callback(data);
						}
						else {
							callback(null);
						}
					}
					else {
						callback(data);
					}
				}, opts
			);
		}
		handleGetResource(
			data.path, !!data.asDataURL, data => {
				res({data: data});
			}
		);
		return true;
	},

	'play-sound': (command, data, sender, res) => {
		ext.sound.play(data.key, {volume: data.volume});
	},

	'notify-viewers': (command, data, sender, res) => {
		const payload = {
			type: 'notify-viewers',
				data: data.viewers,
				siteInfo: data.siteInfo
		};
		getAllFutabaTabs().then(tabs => {
			tabs.forEach(tab => {
				chrome.tabs.sendMessage(tab.id, payload);
			});
		});
	},

	'reload': (command, data, sender, res) => {
		if (!ext.isDev) return;
		localStorage.setItem(RELOAD_FLAG_KEY, '1');
		chrome.runtime.reload();
	},

	'clear-credentials': (command, data, sender, res) => {
		saveImage.clearCredentials(data.schemes).then(res);
		return true;
	},
};



/* <<<1 bootstrap */
ext.receive((command, data, sender, respond) => {
	function res (arg) {
		if (!respond) return;
		try {
			respond(arg);
		}
		catch (err) {}
		respond = null;
	}

	let lateResponse = false;
	try {
		if (command.type in handlers) {
			const result = handlers[command.type](command, data, sender, res);
			if (result != undefined) {
				lateResponse = result;
			}
		}
	}
	finally {
		!lateResponse && res();
		return lateResponse;
	}
});

optimizeAssetLoading();
reloadAllFutabaTabs();

console.info(`${ext.appName}/${ext.version} started.`);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
