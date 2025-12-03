/**
 * akahukuplus: Take your futaba life higher.
 *
 *
 * Copyright 2012-2025 akahuku, akahuku@gmail.com
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
	chromeWrap,
	log,
	load,
	debounce,
	getErrorDescription,
	openOffscreenDocument,
	offscreenCloseAlarm
} from './lib/utils.js';
import {SjisUtils} from './lib/utils-sjis.js';
import {getMetadataFrom} from './lib/mmmf.js';
import {FetchTweets} from './backend/module/FetchTweets.js';
import * as coin from './lib/coin.js';

log.config({name: 'akahukuplus'});

const RELOAD_FLAG_KEY = 'reload_all_tabs';

let browserInfo;

const registerInitializer = debounce(async () => {
	const data = await chromeWrap.storage.local.get(RELOAD_FLAG_KEY);
	if (data[RELOAD_FLAG_KEY] === true) {
		await Promise.all([
			chromeWrap.storage.local.remove(RELOAD_FLAG_KEY),
			reloadAllFutabaTabs()
		]);
	}

	coin.startRefreshAlarm()
});

function isFutabaImageBoardUrl (url) {
	// reject up/up2 uploader
	if (/^https?:\/\/dec\.2chan\.net\/up2?\//.test(url)) return false;

	// reject bin directory
	if (/^https?:\/\/[^.]+\.2chan\.net\/bin\//.test(url)) return false;

	// test generic futaba image board url
	if (/^https?:\/\/[^.]+\.2chan\.net\/[^/]+\/(?:futaba|\d+|res\/\d+)\.htm/.test(url)) return true;

	// maybe other url
	return false;
}

function getAllFutabaTabs () {
	return chromeWrap.tabs.query({}).then(tabs => {
		return tabs.filter(tab => /^https?:\/\/[^.]+\.2chan\.net\//.test(tab.url));
	});
}

/*
function getAllFutabaImageBoardTabs () {
	return chromeWrap.tabs.query({}).then(tabs => {
		return tabs.filter(tab => isFutabaImageBoardUrl(tab.url));
	});
}
*/

const activeTabList = (() => {
	let activeTabs;
	let p = Promise.resolve();

	const saveActiveTabs = debounce(() => {
		if (activeTabs) {
			chromeWrap.storage.local.set({activeTabs: [...activeTabs]});
		}
	}, 1000);

	function syncActiveTabsArray (activeTabsArray) {
		/*
		 * activeTabs in storage = [
		 *   [<tabId>, {url: ..., createdAt: ..., lastAccessedAt: ...}],
		 *   [<tabId>, {url: ..., createdAt: ..., lastAccessedAt: ...}],
		 *       :
		 * ]
		 */
		return Promise.all(
			activeTabsArray.map(tabsArrayItem => {
				return chromeWrap.tabs.get(tabsArrayItem[0]).then(
					tab => {
						if (isFutabaImageBoardUrl(tab.url)) {
							tabsArrayItem.url = tab.url;
							return tabsArrayItem;
						}
						else {
							return null;
						}
					},
					() => {
						return null;
					}
				);
			})
		).then(tabsArrayItems => tabsArrayItems.filter(item => !!item));
	}

	async function ensureActiveTabs () {
		if (!activeTabs) {
			activeTabs = new Map(
				await syncActiveTabsArray(
					(await chromeWrap.storage.local.get({activeTabs: []})).activeTabs
				)
			);
		}
		return activeTabs;
	}

	function memo (tabId, url) {
		if (isFutabaImageBoardUrl(url)) {
			return p = p.then(ensureActiveTabs).then(() => {
				if (activeTabs.has(tabId)) {
					activeTabs.get(tabId).lastAccessedAt = Date.now();
				}
				else {
					activeTabs.set(tabId, {
						url,
						createdAt: Date.now(),
						lastAccessedAt: Date.now()
					});
				}
				saveActiveTabs();
				return activeTabs;
			});
		}
		else {
			return p = p.then(ensureActiveTabs);
		}
	}

	function forget (tabId) {
		return p = p.then(ensureActiveTabs).then(() => {
			if (activeTabs.has(tabId)) {
				activeTabs.delete(tabId);
				saveActiveTabs();
			}
			return activeTabs;
		});
	}

	function getList () {
		if (activeTabs) {
			return syncActiveTabsArray([...activeTabs]).then(activeTabsArray => {
				return activeTabs = new Map(activeTabsArray);
			});
		}
		else {
			return ensureActiveTabs();
		}
	}

	return {memo, forget, getList};
})();

const assetLoadingController = (() => {
	const activeTabIds = new Map;
	let enabled = true;

	async function getSessionRulesCount (tabId) {
		const rules = await chromeWrap.declarativeNetRequest.getSessionRules();
		return rules.filter(rule => {
			return rule.condition.tabIds.includes(tabId);
		}).length;
	}

	async function doStartBlock (tabId) {
		if (!enabled) {
			return false;
		}

		const currentRulesCount = await getSessionRulesCount(tabId);
		await chromeWrap.declarativeNetRequest.updateSessionRules({
			removeRuleIds: [tabId],
			addRules: [
				{
					id: tabId,
					priority: 1,
					action: {type: 'block'},
					condition: {
						regexFilter: '^https?://[^.]+\\.2chan\\.net/',
						tabIds: [tabId]
					}
				}
			]
		});
		const latestRulesCount = await getSessionRulesCount(tabId);

		if (latestRulesCount > currentRulesCount) {
			return true;
		}
		else {
			return false;
		}
	}

	async function doEndBlock (tabId) {
		const currentRulesCount = await getSessionRulesCount(tabId);
		await chromeWrap.declarativeNetRequest.updateSessionRules({
			removeRuleIds: [tabId]
		});
		const latestRulesCount = await getSessionRulesCount(tabId);

		if (latestRulesCount < currentRulesCount) {
			return true;
		}
		else {
			return false;
		}
	}

	function startBlock (tabId) {
		if (!activeTabIds.has(tabId)) {
			const p = Promise.resolve().then(() => doStartBlock(tabId));
			activeTabIds.set(tabId, p);
			return true;
		}
		else {
			return false;
		}
	}

	function endBlock (tabId) {
		if (activeTabIds.has(tabId)) {
			const p = activeTabIds.get(tabId).then(() => doEndBlock(tabId));
			activeTabIds.set(tabId, p);
			return true;
		}
		else {
			return false;
		}
	}

	function register (tabId) {
		if (!activeTabIds.has(tabId)) {
			const p = Promise.resolve();
			activeTabIds.set(tabId, p);
			return true;
		}
		else {
			return false;
		}
	}

	function forget (tabId) {
		if (activeTabIds.has(tabId)) {
			const p = activeTabIds.get(tabId)
				.then(() => doEndBlock(tabId))
				.then(() => {
					activeTabIds.delete(tabId);
				});
			activeTabIds.set(tabId, p);
			return true;
		}
		else {
			return false;
		}
	}

	return {
		startBlock, endBlock, register, forget,
		get enabled () {return enabled},
		set enabled (value) {enabled = !!value}
	};
})();

async function reloadAllFutabaTabs () {
	function getCurrentTab () {
		return chromeWrap.tabs
			.query({active: true, currentWindow: true})
			.then(tabs => tabs[0].id);
	}

	function activateTab (id) {
		return chromeWrap.tabs.update(id, {active: true});
	}

	function reloadTab (id) {
		return new Promise(resolve => {
			function handleTabUpdated (tabId, changeInfo) {
				if (tabId !== id) return;
				if (changeInfo.status !== 'complete') return;

				chromeWrap.tabs.onUpdated.removeListener(handleTabUpdated);
				resolve();
			}
			chromeWrap.tabs.onUpdated.addListener(handleTabUpdated);
			chromeWrap.tabs.reload(id);
		});
	}

	function activateAndReloadTab (id) {
		return activateTab(id).then(() => reloadTab(id));
	}

	const [currentTabId, futabaTabs] = await Promise.all([
		getCurrentTab(),
		getAllFutabaTabs()
	]);

	try {
		log('*** reloadAllFutabaTabs ***');
		await futabaTabs.reduce((seq, tab) => {
			return seq.then(() => activateAndReloadTab(tab.id));
		}, Promise.resolve());
	}
	finally {
		await activateTab(currentTabId);
		log('reloadAllFutabaTabs: done');
	}
}

/*
function playSound (data) {
	//
}
*/

async function getFileSystemAccessPermissionFromSummaryPage (data, sender) {
	function getSummaryPage () {
		return chromeWrap.tabs.query({
			url: `https://${data.server}.2chan.net/${data.board}/*.htm`
		});
	}

	function queryPermission (tabId, fileSystemId) {
		return chromeWrap.tabs.sendMessage(tabId, {
			type: 'query-filesystem-permission',
			id: fileSystemId
		});
	}

	function getPermission (tabId, fileSystemId) {
		return chromeWrap.tabs.sendMessage(tabId, {
			type: 'get-filesystem-permission',
			id: fileSystemId
		});
	}

	log(`enter getFileSystemAccessPermissionFromSummaryPage`);

	const REPORT_ERROR = false;
	const result = {
		foundSummary: false,
		granted: false
	};

	try {
		// get summary page
		const tabs = await getSummaryPage();
		if (tabs.length === 0) {
			log(`fs: summary pages not found`);
			return;
		}
		result.foundSummary = true;

		// query the file system access permission on summary page
		const queried = await queryPermission(tabs[0].id, data.id);
		log(`fs: summary page returns the permission for queryPermission: '${JSON.stringify(queried)}'`);
		if (REPORT_ERROR && queried.error) {
			throw new Error(queried.error);
		}
		if (queried.permission === 'unavailable') {
			return;
		}
		if (queried.permission === 'granted') {
			result.granted = true;
			return;
		}

		// activate the summary page
		await chromeWrap.windows.update(tabs[0].windowId, {focused: true});
		await chromeWrap.tabs.update(tabs[0].id, {active: true});

		// send message to the summary page
		const requestedPermission = await getPermission(tabs[0].id, data.id);
		log(`fs: summary page returns the granted result for getPermission: '${JSON.stringify(requestedPermission)}'`);
		if (REPORT_ERROR && requestedPermission.error) {
			throw new Error(requestedPermission.error);
		}
		result.granted = !!requestedPermission.granted;
	}
	catch (err) {
		log(`fs: exception occured: ${getErrorDescription(err)}`);
		result.granted = false;
		result.error = err.message;
	}
	finally {
		// re-activate the sender page
		await chromeWrap.windows.update(sender.tab.windowId, {focused: true});
		await chromeWrap.tabs.update(sender.tab.id, {active: true});
	}
	return result;
}

async function getBrowserInfo () {
	if (browserInfo) {
		return browserInfo;
	}

	const [bi, pi, currentWindow] = await Promise.all([
		'getBrowserInfo' in chromeWrap.runtime ?
			chromeWrap.runtime.getBrowserInfo() :
			Promise.resolve({
				name: null,
				vendor: null,
				version: null,
				buildID: null
			}),
		chromeWrap.runtime.getPlatformInfo(),
		chromeWrap.windows.getCurrent()
	]);

	if ('vivExtData' in currentWindow) {
		bi.name = 'Vivaldi';
	}

	const os = {
		'mac': 'MacOS',
		'ios': 'iOS/iPadOS',
		'win': 'Windows',
		'android': 'Android',
		'cros': 'ChromeOS',
		'linux': 'Linux',
		'openbsd': 'OpenBSD',
		'fuchsia': 'Fuchsia'
	}[pi.os] ?? 'Unknown OS';
	const arch = {
		'arm': 'Arm',
		'arm64': 'Arm64',
		'x86-32': 'x86',
		'x86-64': 'x64',
		'mips': 'MIPS',
		'mips64': 'MIPS64'
	}[pi.arch] ?? 'Unknown architecture';
	bi.platform = `${os} ${arch}`;

	return browserInfo = bi;
}

function getBaseUrl (url) {
	const pattern = /^https?:\/\/[^.]+\.2chan\.net\/[^/]+\//;
	const re = pattern.exec(url);
	return re ? re[0] : undefined;
}

async function openTabWithUrl (url, selfUrl) {
	const selfHost = getBaseUrl(selfUrl);
	const tabs = await chromeWrap.tabs.query({
		windowId: chromeWrap.windows.WINDOW_ID_CURRENT
	});

	// First, find the tab already exists
	let existsTabId = -1;
	tabs.some(tab => {
		if (tab.url === url) {
			existsTabId = tab.id;
			return true;
		}
	});

	// Activate the existing tab and exit
	if (existsTabId >= 0) {
		chromeWrap.tabs.update(existsTabId, {active:true});
		return {created: false, tabId: existsTabId, url};
	}

	// Second, find the rightmost tab in the same domain as active tab
	let state = 0;
	let rightTabIndex = -1;
	let selfTabId = -1;
	tabs.some(tab => {
		if (typeof tab.url === 'string') {
			switch (state) {
			case 0:
				if (tab.url === selfUrl) {
					state = 1;
					selfTabId = tab.id;
				}
				break;
			case 1:
				if (tab.url.indexOf(selfHost) !== 0) {
					rightTabIndex = tab.index;
					return true;
				}
				break;
			}
		}
	});

	// Create new tab with some options
	const p = {url};
	if (rightTabIndex >= 0) {
		p.index = rightTabIndex;
	}
	if (selfTabId >= 0) {
		p.openerTabId = selfTabId;
	}
	const newTab = await chromeWrap.tabs.create(p);
	return {created: true, tabId: newTab.id, url};
}

/*
 * fetch handlers
 */

/*
const overrideMap = {
};

addEventListener('fetch', e => {
	log(`background: fetch event fired. request: ${e.request.url}`);
	const pathname = new URL(e.request.url).pathname;
	if (pathname in overrideMap) {
		let response = overrideMap[pathname](e);
		if (response) {
			log(`background: returning dynamic response as ${e.request.url}`);
			e.respondWith(response);
		}
	}
});
*/

/*
 * tab handlers
 */

/*
chromeWrap.tabs.onCreated.addListener(tab => {
	log(`tabs.onCreated: tab #${tab.id}, "${tab.url}"`);
});
*/

chromeWrap.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if ('status' in changeInfo && isFutabaImageBoardUrl(tab.url)) {
		switch (changeInfo.status) {
		case 'loading':
			log(`tabs.unUpdated: status: ${changeInfo.status}, tab: #${tabId}, url: ${tab.url}`);
			assetLoadingController.startBlock(tabId);
			break;
		case 'complete':
			log(`tabs.unUpdated: status: ${changeInfo.status}, tab: #${tabId}, url: ${tab.url}`);
			assetLoadingController.forget(tabId);
			break;
		}
	}
});

/*
chromeWrap.tabs.onRemoved.addListener((tabId, removeInfo) => {
	log(`tabs.onRemoved: tab #${tabId}`);
	//assetLoadingController.forget(tabId);
});
*/

/*
 * misc handlers
 */

chromeWrap.runtime.onInstalled.addListener(details => {
	log(`runtime.onInstalled: reason: ${details.reason}`);
	registerInitializer();
});

chromeWrap.runtime.onStartup.addListener(() => {
	log(`runtime.onStartup`);
	registerInitializer();
});

chromeWrap.alarms.onAlarm.addListener(alarm => {
	log(`alarms.onAlarm: ${alarm.name}`);
	switch (alarm.name) {
	case offscreenCloseAlarm:
		try {
			chromeWrap.offscreen.closeDocument();
		}
		catch {
			//
		}
		break;
	}
});

/*
chromeWrap.declarativeNetRequest.onRuleMatchedDebug.addListener(info => {
	log(`blocked: ${info.request.url}`);
});
*/

/*
 * message handers
 */

const messageHandlers = {
	log: (data, sender) => {
		const basename = sender.tab.url
			.replace(/[#?].*/, '')
			.match(/\/([^/]*)$/)[1];
		log(`[${basename}] ${data.message}`);
	},
	reload: async () => {
		if (!chromeWrap.IS_DEVELOP) return;
		await chromeWrap.storage.local.set({[RELOAD_FLAG_KEY]: true});
		log(`reloading extension...`);
		chromeWrap.runtime.reload();
	},

	init: async (data, sender, respond) => {
		try {
			const manifest = chromeWrap.runtime.getManifest();
			const [enableDebug, browserInfo] = await Promise.all([
				(async () => {
					const storage = await chromeWrap.storage.local.get({enableDebug: false});
					return storage.enableDebug;
				})(),
				getBrowserInfo()
			]);

			activeTabList.memo(sender.tab.id, sender.tab.url);

			respond({
				extensionId: chromeWrap.runtime.id,
				tabId: sender.tab.id,
				version: manifest.version_name ?? manifest.version,
				devMode: chromeWrap.IS_DEVELOP,
				debugMode: enableDebug,
				browserInfo: browserInfo
			});
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	initialized: (data, sender, respond) => {
		try {
			assetLoadingController.endBlock(sender.tab.id);
			respond(sender.tab.id);
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	iconv: (data, sender, respond) => {
		try {
			respond(SjisUtils.toSjis(data));
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	open: async (data, sender, respond) => {
		try {
			const result = await openTabWithUrl(data.url, data.selfUrl);
			if (result.created && isFutabaImageBoardUrl(data.url)) {
				assetLoadingController.startBlock(result.tabId);
			}
			respond(result.tabId);
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	fetch: async (data, sender, respond) => {
		try {
			const options = {referrerPolicy: 'unsafe-url'};

			/*
			 * 2021/09
			 * Cross-domain fetch from the background seems to be a bit broken.
			 * When using the GET method, neither the origin header nor the referer
			 * header is set correctly.
			 * For this reason, we dare to use the PUT method explicitly.
			 */

			if (/^https?:\/\/appsweets\.net\//.test(data.url)) {
				options.method = 'PUT';
			}

			const result = await load(data.url, options, 'data');
			if (result.error) {
				respond({
					error: result.error,
					status: result.status,
					statusText: result.statusText,
					headers: result.headers
				});
			}
			else {
				respond({
					dataURL: result.content,
					status: result.status,
					statusText: result.statusText,
					headers: result.headers
				});
			}
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	filesystem: async (data, sender, respond) => {
		try {
			respond(await getFileSystemAccessPermissionFromSummaryPage(data, sender));
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	play: async (data, sender, respond) => {
		try {
			respond(await openOffscreenDocument('play-audio', {
				key: data.name,
				volume: data.volume / 100
			}));
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	notification: async (data, sender, respond) => {
		try {
			respond(await self.registration.showNotification(
				data.title,
				{
					lang: 'ja',
					icon: 'images/icon128.png',
					body: data.body,
					tag: 'akahukuplus_notification'
				}
			));
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	'get-tweet': async (data, sender, respond) => {
		try {
			const fetchTweets = new FetchTweets();
			respond(await fetchTweets.run(data.url, data.id));
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	coin: async (data, sender, sendResponse) => {
		try {
			sendResponse(await coin.handleCoinMessage(data));
		}
		catch (err) {
			sendResponse({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	'notify-hashchange': (data, sender, respond) => {
		try {
			respond(assetLoadingController.register(sender.tab.id));
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	},
	'get-metadata': async (data, sender, respond) => {
		try {
			const blob = await load(data.url, {}, 'blob');
			if (blob.error) {
				respond({error: blob.error});
			}
			else {
				respond(await getMetadataFrom(blob.content));
			}
		}
		catch (err) {
			respond({error: getErrorDescription(err)});
			log(getErrorDescription(err));
		}
	}
};

chromeWrap.runtime.onMessage.addListener((message, sender, sendResponse) => {
	function respond (...args) {
		if (!sendResponse) return;
		try {
			sendResponse.apply(null, args);
		}
		catch {
			//
		}
		sendResponse = null;
	}

	//log(`onMessage: got ${message.type}`);

	let lateResponse = false;
	try {
		if (message.type in messageHandlers) {
			const handler = messageHandlers[message.type];
			const directResponse = message.type === 'coin';
			const result = handler(
				message.data,
				sender,
				directResponse ? sendResponse : respond
			);
			if (result instanceof Promise) {
				lateResponse = true;
			}
		}
	}
	catch (err) {
		log(`onMessage: exception:`, getErrorDescription(err));
	}
	finally {
		!lateResponse && respond();
	}
	return lateResponse;
});

chromeWrap.commands.onCommand.addListener(command => {
	switch (command) {
	case 'enable_debug':
		chromeWrap.storage.local.get({enableDebug: false}).then(storage => {
			chromeWrap.storage.local.set({enableDebug: !storage.enableDebug});
		});
		break;
	}
});

coin.onCoinAmountChanged(amount => {
	if (amount > 0) {
		self.registration.showNotification(
			'コインが自動チャージされました',
			{
				lang: 'ja',
				icon: 'images/icon128.png',
				body: `現在 ${amount} 枚のコインを所持しています。うれしい！`,
				tag: 'akahukuplus_notification'
			}
		);
	}
});

log(`This is the service worker based background for akahukuplus on Chrome browser.`);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
