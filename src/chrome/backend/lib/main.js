/**
 * akahukuplus: Take your futaba life higher.
 *
 * @author akahuku@gmail.com
 */

(function (global) {
	'use strict';

	/* <<<1 variables */
	var ext = require('./kosian/Kosian').Kosian(global, {
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
		},
		contentScripts: getContentScriptsSpec()
	});

	var sjisUtils = require('./SjisUtils').SjisUtils;
	var fetchTweets = require('./FetchTweets').FetchTweets();
	var completeUpfiles = require('./CompleteUpfiles').CompleteUpfiles();
	var saveImage = require('./SaveImage').SaveImage();
	var initializingTabIds = {};

	/* <<<1 functions */
	function getContentScriptsSpec () {
		var self = require('sdk/self');
		if (!self) return null;

		return [
			{
				name: 'akahukuplus',
				matches: [
					/^https?:\/\/[^.]+\.2chan\.net\/[^\/]+\/(?:futaba|(?:res\/)?\d+)\.html?\b.*(#[^#]*)?$/
				],
				exclude_matches: [
					'http://dec.2chan.net/up/*',
					'http://dec.2chan.net/up2/*',
					'https://dec.2chan.net/up/*',
					'https://dec.2chan.net/up2/*'
				],
				js: [
					'frontend/extension_wrapper.js',
					'frontend/qeema.js',
					'frontend/akahukuplus.js'
				],
				run_at: 'start'
			}
		];
	}

	function optimizeAssetLoadingOnChrome () {
		var cancelParam = {cancel: true};
		var throughParam = {cancel: false};
		var regexFutabaContent = /^https?:\/\/[^.]+\.2chan\.net(:\d+)?\/[^\/]+\/(?:(?:futaba|\d+)|res\/\d+)\.html?/;
		var regexFutabaAsset = /^https?:\/\/[^.]+\.2chan\.net(:\d+)?\//;
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
					if (regexFutabaAsset.test(details.url)) {
						return throughParam;
					}
					break;
				}

				if (details.tabId in initializingTabIds) {
					return cancelParam;
				}
				else {
					return throughParam;
				}
			},
			{urls: ['<all_urls>']},
			['blocking']
		);
	}

	/** <<<2 request handlers */
	function handleGetResource (path, asDataURL, callback) {
		var html5FileEnabled = global.Blob && global.FileReader;
		var opts = {noCache:true};
		if (asDataURL) {
			if (html5FileEnabled) {
				opts.responseType = 'blob';
			}
			else {
				opts.mimeType = 'text/plain;charset=x-user-defined';
			}
		}
		ext.resource(
			path, function (data) {
				if (asDataURL) {
					if (html5FileEnabled && data instanceof global.Blob) {
						var fr = new FileReader;
						fr.onload = function () {
							callback(fr.result);
							fr.onload = null;
							fr = data = null;
						};
						fr.readAsDataURL(data);
					}
					else if (typeof data == 'string') {
						var tmp = [];
						for (var i = 0, goal = data.length; i < goal; i++) {
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

	// browser specific code
	if (global.chrome) {
		optimizeAssetLoadingOnChrome();
	}

	/** <<<2 request handler entry */
	ext.receive(function (command, data, sender, respond) {

		function res (arg) {
			if (respond) {
				try {
					respond(arg);
				}
				catch (e) {}
				respond = null;
			}
		}

		try {
			var lateResponse = false;

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
				delete initializingTabIds[sender];
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
			}
		}
		finally {
			!lateResponse && res();
			return lateResponse;
		}
	});

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
