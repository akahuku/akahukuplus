/**
 * akahukuplus: Take your futaba life higher.
 *
 * @author akahuku@gmail.com
 */

(function (global) {
	'use strict';

	/* <<<1 consts */
	const RELOAD_FLAG_KEY = 'reload_all_tabs';

	/* <<<1 variables */
	const ext = require('./kosian/Kosian').Kosian(global, {
		appName: 'akahukuplus',
		openBaseUrlPattern: /^https?:\/\/[^.]+\.2chan\.net(?::\d+)?\/[^\/]+\//,
		cryptKeyPath: 'LICENSE',
		writeDelaySecs: 1,
		fstab: {
			dropbox: {
				isDefault: true,
				enabled: true
			},
			gdrive: {
				enabled: true
			},
			onedrive: {
				enabled: true
			}
		}
	});

	const sjisUtils = require('./SjisUtils').SjisUtils;
	const fetchTweets = require('./FetchTweets').FetchTweets();
	const completeUpfiles = require('./CompleteUpfiles').CompleteUpfiles();
	const saveImage = require('./SaveImage').SaveImage();
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
		let cancelParam = {cancel: true};
		let throughParam = {cancel: false};
		let regexFutabaContent = /^https?:\/\/[^.]+\.2chan\.net(:\d+)?\/[^\/]+\/(?:(?:futaba|\d+)|res\/\d+)\.html?/;
		let regexFutabaAsset = /^https?:\/\/[^.]+\.2chan\.net(:\d+)?\//;
		let isGecko = typeof InstallTrigger == 'object';

		chrome.webRequest.onBeforeRequest.addListener(
			function (details) {
				switch (details.type) {
				case 'main_frame':
				case 'sub_frame':
					if (regexFutabaContent.test(details.url)) {
						initializingTabIds[details.tabId] = true;
						return throughParam;
					}
					break;

				case 'image':
					// image blocking is still unstable on firefox (2018-10)
					if (isGecko && regexFutabaAsset.test(details.url)) {
						return throughParam;
					}
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
						if (changeInfo.status == 'complete') {
							console.log(`...reloaded tab id ${id}...`);
							chrome.tabs.onUpdated.removeListener(handleTabUpdated);
							resolve();
						}
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
	function handleGetResource (path, asDataURL, callback) {
		let html5FileEnabled = global.Blob && global.FileReader;
		let opts = {noCache:true};
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
							ext.utils.btoa(String.fromCharCode.apply(String, tmp));
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
		return true;
	}

	function handleNotifyViewers (payload) {
		getAllFutabaTabs().then(tabs => {
			tabs.forEach(tab => {
				chrome.tabs.sendMessage(tab.id, payload);
			});
		});
	}

	function handleReloadExtension () {
		if (!ext.isDev) return;
		localStorage.setItem(RELOAD_FLAG_KEY, '1');
		chrome.runtime.reload();
	}

	/** <<<2 request handler entry */
	ext.receive((command, data, sender, respond) => {

		function res (arg) {
			if (respond) {
				try {
					respond(arg);
				}
				catch (e) {}
				respond = null;
			}
		}

		let lateResponse = false;
		try {
			switch (command.type) {
			case 'init':
				res({
					extensionId: ext.id,
					tabId: sender,
					version: ext.version,
					devMode: ext.isDev
				});
				break;
			case 'initialized':
				delete initializingTabIds[sender.replace(/_\d+$/, '')];
				//console.log(`tab ${sender} unlocked`);
				break;
			case 'iconv':
				res(sjisUtils.toSjis(data));
				break;
			case 'open':
				lateResponse = ext.openTabWithUrl(data.url, data.selfUrl);
				break;
			case 'get-tweet':
				lateResponse = fetchTweets.run(data.id, res);
				break;
			case 'complete':
				lateResponse = completeUpfiles.run(data.id, res);
				break;
			case 'load-siokara-thumbnail':
				lateResponse = completeUpfiles.loadSiokaraThumbnail(data.url, res);
				break;
			case 'save-image':
				lateResponse = saveImage.run(
					data.url, data.path, data.mimeType,
					data.anchorId, sender);
				break;
			case 'get-resource':
				lateResponse = handleGetResource(
					data.path, !!data.asDataURL, function (data) {
						res({data:data});
					}
				);
				break;
			case 'set-clipboard':
				if ('data' in data) {
					ext.clipboard.set(data.data);
				}
				break;
			case 'play-sound':
				ext.sound.play(data.key, {volume: data.volume});
				break;
			case 'notify-viewers':
				handleNotifyViewers({
					type: 'notify-viewers',
					data: data.viewers,
					siteInfo: data.siteInfo
				});
				break;
			case 'reload':
				lateResponse = handleReloadExtension();
				break;
			}
		}
		finally {
			!lateResponse && res();
			return lateResponse;
		}
	});

	optimizeAssetLoading();
	reloadAllFutabaTabs();

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
