'use strict';
/**
 * akahukuplus
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

if (document.querySelector('meta[name="generator"][content="akahukuplus"]')) {
	throw new Error('multiple execution of content script.');
}

/*
 * consts
 */
const chromeWrap = typeof browser !== 'undefined' ? browser : chrome;

const APP_NAME = 'akahukuplus';
const IS_GECKO = chromeWrap.runtime.getURL('').startsWith('moz-');
const FUTABA_CHARSET = 'Shift_JIS';
const NOTFOUND_TITLE_PATTERN = /404\s+file\s+not\s+found/i;
const UNAVAILABLE_TITLE_PATTERN = /503\s+service\s+temporarily\s+unavailable/i;
const POST_DT_PATTERN = /(\d+)\/(\d+)\/(\d+)\([^)]+\)(\d+):(\d+):(\d+)/;
const WAIT_AFTER_RELOAD = 500;
const WAIT_AFTER_POST = 500;
const LEAD_REPLIES_COUNT = 50;
const REST_REPLIES_PROCESS_COUNT = 50;
const REST_REPLIES_PROCESS_INTERVAL = 100;
const POSTFORM_DEACTIVATE_DELAY = 500;
const RELOAD_LOCK_RELEASE_DELAY = 1000 * 3;
const RELOAD_AUTO_SCROLL_CONSUME = 300;
const NETWORK_ACCESS_MIN_INTERVAL = 1000 * 3;
//const NETWORK_DEFAULT_TIMEOUT_MSEC = 1000 * 10;
const QUOTE_POPUP_DELAY_MSEC = 1000 * 0.25;
const QUOTE_POPUP_HIGHLIGHT_MSEC = 1000 * 2;
const QUOTE_POPUP_HIGHLIGHT_TOP_MARGIN = 64;
const QUOTE_POPUP_POS_OFFSET = 8;
const CATALOG_ANCHOR_PADDING = 5 * 2;
const CATALOG_ANCHOR_MARGIN = 2;
const CATALOG_THUMB_WIDTH = 50;
const CATALOG_THUMB_HEIGHT = 50;
const CATALOG_LONG_CLASS_THRESHOLD = 100;
const CATALOG_EXPIRE_WARN_RATIO = 0.95;
const CATALOG_TEXT_MAX_LENGTH = 100;
const CATALOG_COOKIE_LIFE_DAYS = 100;
const CATALOG_POPUP_DELAY = 500;
const CATALOG_POPUP_TEXT_WIDTH = 150;
const CATALOG_POPUP_THUMBNAIL_ZOOM_FACTOR = 3;
const FALLBACK_LAST_MODIFIED = 'Fri, 01 Jan 2010 00:00:00 GMT';
const HEADER_MARGIN_BOTTOM = 16;
const INLINE_VIDEO_MAX_WIDTH = '720px';
const INLINE_VIDEO_MAX_HEIGHT = '75vh';
const QUICK_MODERATE_REASON_CODE = '110';
const EXTRACT_UNIT = 10;
const SODANE_NULL_MARK = '＋';
const LINKIFY_MAX = 10;
const OUTER_IFRAME_ORIGIN = 'https://akahukuplus.appsweets.net';

const DEBUG_ALWAYS_LOAD_XSL = false;		// default: false
const DEBUG_DUMP_INTERNAL_XML = false;		// default: false
const DEBUG_IGNORE_LAST_MODIFIED = false;	// default: false

/*
 * <<<1 globals
 */

// object instances, created on demand
let timingLogger = stub('timingLogger', () => timingLogger = createTimingLogger());
let storage = stub('storage', () => storage = createPersistentStorage());
let backend = stub('backend', () => backend = createExtensionBackend());
let resources = stub('resources', () => resources = createResourceManager());
let postStats = stub('postStats', () => postStats = createPostStats());
let urlStorage = stub('urlStorage', () => urlStorage = createUrlStorage());
let xmlGenerator = stub('xmlGenerator', () => xmlGenerator = createXMLGenerator());
let passiveTracker = stub('passiveTracker', () => passiveTracker = createPassiveTracker());
let activeTracker = stub('activeTracker', () => activeTracker = createActiveTracker());
let clickDispatcher = stub('clickDispatcher', () => clickDispatcher = createClickDispatcher());
let keyManager = stub('keyManager', () => keyManager = createKeyManager());
let favicon = stub('favicon', () => favicon = createFavicon());
let scrollManager = stub('scrollManager', () => scrollManager = createScrollManager(10));
let selectionMenu = stub('selectionMenu', () => selectionMenu = createSelectionMenu());
let catalogPopup = stub('catalogPopup', () => catalogPopup = createCatalogPopup($qs('#catalog')));
let quotePopup = stub('quotePopup', () => quotePopup = createQuotePopup());
let titleIndicator = stub('titleIndicator', () => titleIndicator = createTitleIndicator());
let resourceSaver = stub('resourceSaver', () => resourceSaver = createResourceSaver());
let postingEvaluator = stub('postingEvaluator', () => postingEvaluator = createPostingEvaluator());
let historyStateWrapper = stub('historyStateWrapper', () => historyStateWrapper = createHistoryStateWrapper());

// variables with initial values
let bootVars = {bodyHTML: ''};
let version = '0.0.1';
let devMode = false;
let debugMode = false;
let coinCharge = false;
const siteInfo = {
	server: '', board: '', resno: 0, date: null,
	summaryIndex: 0,	// only summary mode
	latestNumber: 0,	// only summary mode
	logSize: 10000,
	maxAttachSize: 0,
	maxReplies: -1,
	minThreadLifeTime: 0,
	lastModified: 0,
	subHash: {},
	nameHash: {},
	notice: '',
	idDisplay: false,
	canUpload: false
};
const cursorPos = {
	x: 0,
	y: 0,
	pagex: 0,
	pagey: 0,
	moved: false
};
const reloadStatus = {
	state: null,
	lastReloaded: Date.now(),
	lastReloadType: '',
	lastReceivedText: '',
	lastRepliesCount: 0,
	lastStatus: 0,
	expireDate: null,
	afterReloadCallbacks: [],
	size: function (key) {return getReadableSize(this[key])}
};
const pageModes = [];
const appStates = ['command'];
const globalPromises = {};
const checkedPostNumbers = [];
const substs = {leader: 'asis'};
const metadataCache = {};

// variables to be initialized at appropriate time
let xsltProcessor;
let viewportRect;
let sounds;

/*
 * <<<1 bootstrap functions
 */

let styleInitializer = (() => {
	const STYLE_ID = 'akahuku_initial_style';

	function start () {
		let s = document.getElementById(STYLE_ID);

		if (!s) {
			try {
				s = document.documentElement.appendChild(document.createElement('style'));
			}
			catch {
				s = null;
			}
		}

		if (s) {
			s.type = 'text/css';
			s.id = 'akahuku_initial_style';
			s.appendChild(document.createTextNode('body {visibility:hidden}'));
		}
	}

	function done () {
		const s = document.getElementById(STYLE_ID);

		if (s) {
			s.parentNode.removeChild(s);
		}
	}

	start();

	return {done};
})();

let scriptWatcher = (() => {
	function handleBeforeScriptExecute (e) {
		e.preventDefault();
	}

	const result = new MutationObserver(ms => {
		ms.forEach(m => {
			m.addedNodes.forEach(node => {
				if (node.nodeType !== 1 || node.nodeName !== 'SCRIPT') return;

				// more generic method
				node.type = 'text/plain';

				// Gecko specific
				node.addEventListener(
					'beforescriptexecute', handleBeforeScriptExecute, {once: true});
			});
		});
	});

	result.observe(document.documentElement, {
		childList: true,
		subtree: true
	});

	return result;
})();

// html extension to DOMParser: @see https://gist.github.com/kethinov/4760460
(DOMParser => {
	const DOMParser_proto = DOMParser.prototype,
		real_parseFromString = DOMParser_proto.parseFromString;

	// Firefox/Opera/IE throw errors on unsupported types
	try {
		// WebKit returns null on unsupported types
		if ((new DOMParser).parseFromString('', 'text/html')) {
			// text/html parsing is natively supported
			return;
		}
	}
	catch {
		//
	}

	DOMParser_proto.parseFromString = function(markup, type) {
		if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
			const doc = document.implementation.createHTMLDocument('');
			if (/<!doctype/i.test(markup)) {
				doc.documentElement.innerHTML = markup;
			}
			else {
				doc.body.innerHTML = markup;
			}
			return doc;
		}
		else {
			return real_parseFromString.apply(this, arguments);
		}
	};
})(window.DOMParser);

function stub (label, creator) {
	return new Proxy({}, {
		get: (obj, prop) => {
			//console.log(`stub: ${label}.${prop} proxy getter invoked`);
			return creator()[prop];
		}
	});
}

function transformWholeDocument (xsl) {
	timingLogger.startTag('transformWholeDocument');

	const generateResult = xmlGenerator.run(
		bootVars.bodyHTML,
		pageModes[0].mode === 'reply' ? LEAD_REPLIES_COUNT : null);

	try {
		timingLogger.startTag('parsing xsl');
		xsl = (new window.DOMParser()).parseFromString(xsl, "text/xml");
		timingLogger.endTag();
	}
	catch (e) {
		log(`${APP_NAME}: transformWholeDocument: ${e.stack}`);
		throw new Error(_('failed_to_parse_xsl_file', APP_NAME));
	}

	/*
	 * note: Chrome seems to be planning to remove XSLT support (!),
	 *       so we may eventually have to use a polyfill.
	 *
	 *       Announce:
	 *         https://developer.chrome.com/docs/web-platform/deprecating-xslt
	 *
	 *       Bug tracker:
	 *         https://issues.chromium.org/issues/435623334
	 *
	 *       polyfill extension:
	 *         https://chromewebstore.google.com/detail/xslt-polyfill/hlahhpnhgficldhfioiafojgdhcppklm
	 */
	xsltProcessor = new XSLTProcessor;
	try {
		timingLogger.startTag('constructing xsl');
		xsltProcessor.importStylesheet(xsl);
		timingLogger.endTag();
	}
	catch (e) {
		log(`${APP_NAME}: transformWholeDocument: ${e.stack}`);
		throw new Error(_('failed_to_import_xsl_file', APP_NAME));
	}

	// transform xsl into html
	timingLogger.startTag('applying xsl');
	document.body.innerHTML = '';
	xsltProcessor.setParameter(null, 'app_name', APP_NAME);
	xsltProcessor.setParameter(null, 'dev_mode', devMode ? '1' : '0');
	xsltProcessor.setParameter(null, 'page_mode', pageModes[0].mode);
	xsltProcessor.setParameter(null, 'render_mode', 'full');
	xsltProcessor.setParameter(null, 'platform', IS_GECKO ? 'moz' : 'chrome');
	xsltProcessor.setParameter(null, 'coin_charge', coinCharge ? '1' : '0');
	xsltProcessor.setParameter(null, 'sort_order', storage.runtime.catalog.sortOrder);

	let fragment = xsltProcessor.transformToFragment(generateResult.xml, document);
	if (!fragment) {
		throw new Error(_('failed_to_transform_xml_document', APP_NAME));
	}

	const head = $qs('head', fragment);
	const body = $qs('body', fragment);

	/*
	 * transform result has head or body:
	 *
	 *  #fragment
	 *    head
	 *      meta
	 *      meta
	 *       :
	 *    body
	 *      header
	 */

	if (head || body) {
		if (head) {
			removeChild($qsa('head > :not(base)'));
			document.head.appendChild(fixFragment(fragment, 'head'));
		}
		if (body) {
			document.body.appendChild(fixFragment(fragment, 'body'));
		}
	}

	/*
	 * transform result has not head and body:
	 *
	 *  #fragment
	 *    meta
	 *    meta
	 *     :
	 *    header
	 */

	else {
		removeChild($qsa('head > :not(base)'));
		document.body.appendChild(fragment);
	}

	// register a handler for image loading errors before applying transformed fragment
	document.addEventListener('ImageLoadError', e => {
		if (e.target instanceof HTMLImageElement) {
			const altsrc = chromeWrap.runtime.getURL('images/load-error.png');
			if (e.target.src !== altsrc) {
				e.target.src = altsrc;
			}
		}
	});

	// expand all markups of all ads
	extractDisableOutputEscapingTags(document.documentElement);

	timingLogger.endTag();

	timingLogger.startTag('some tweaks');
	// some tweaks: ensure html tag language
	document.documentElement.setAttribute('lang', 'ja');

	// some tweaks: remove obsolete attributes on body element
	['bgcolor', 'text', 'link', 'vlink', 'alink'].forEach(p => {
		document.body.removeAttribute(p);
	});

	// some tweaks: move some elements to its proper position
	for (const node of $qsa('meta,title,link,style'.replace(/^|,/g, '$&body '))) {
		removeChild(node);
		document.head.appendChild(node);
	}

	// some tweaks: ensure title element exists
	if (document.head.getElementsByTagName('title').length === 0) {
		const title = document.head.appendChild(document.createElement('title'));
		title.dataset.binding = 'xpath:/futaba/meta/title';
	}
	timingLogger.endTag();

	// expand all bindings
	timingLogger.startTag('applying bindings');
	applyDataBindings(generateResult.xml);
	timingLogger.endTag();

	// initialize passive tracker
	passiveTracker.update(reloadStatus.expireDate);

	if (DEBUG_DUMP_INTERNAL_XML) {
		dumpDebugText(serializeXML(generateResult.xml));
	}

	fragment = xsl = null;
	//bootVars = null;

	$('content').classList.remove('init');

	timingLogger.startTag('install');
	install(pageModes[0].mode);
	timingLogger.forceEndTag();
	timingLogger.locked = true;

	processRemainingReplies(null, generateResult.remainingRepliesContext);
}

function install () {
	/*
	 * last modified date
	 */

	try {
		siteInfo.lastModified = new Date(document.lastModified).toUTCString();
	}
	catch {
		siteInfo.lastModified = 0;
	}

	/*
	 * catch all exceptions for debugging
	 */

	window.addEventListener('error', (message, source, lineno, colno, error) => {
		try {
			if (message instanceof ErrorEvent) {
				source = message.filename;
				lineno = message.lineno;
				colno = message.colno;
				error = message.error;

				message = message.message;
			}

			log(`Exception on window: ${message}@${source}:${lineno}${error ? '\n' + error.stack : ''}`);
		}
		catch {
			//
		}
	});

	window.addEventListener('unhandledrejection', e => {
		try {
			log(`Unhandled promise rejection on window: ${e.reason}`);
		}
		catch {
			//
		}
	});

	/*
	 * message handler for PostMessage
	 */

	window.addEventListener('message', e => {
		switch (e.origin) {
		case 'https://akahukuplus.appsweets.net':
			{
				switch (e.data.command) {
				case 'report-size':
					{
						const iframe = $(e.data.iframeId);
						if (iframe) {
							if (e.data.height) {
								iframe.style.height = `${e.data.height}px`;
							}

							if (e.data.iframeTag) {
								if (iframe.dataset.initTimerId) {
									clearTimeout(iframe.dataset.initTimerId - 0);
								}

								iframe.dataset.initTimerId = setTimeout((id, iframeTag) => {
									const iframe = $(id);
									if (!iframe) return;

									delete iframe.dataset.initTimerId;

									iframeTag = iframeTag.replace(
										/id=[^\s>]+/,
										'class="twitter-inner-frame"');
									iframe.insertAdjacentHTML('afterend', iframeTag);
								}, 1000, e.data.iframeId, e.data.iframeTag);
							}
						}
					}
					break;
				}
			}
			break;
		}
	});

	/*
	 * message handler for backend
	 */

	backend.setMessageListener((data, sender, response) => {
		backend.log(`got ${data.type} message: ${JSON.stringify(data)}`);

		switch (data.type) {
		case 'query-filesystem-permission':
			try {
				resourceSaver.savers(data.id)
					.then(saver => {
						return saver.fileSystem.queryRootDirectoryPermission(true);
					})
					.then(result => {
						if (!result) {
							log(`got permission but result is unavailable`);
						}
						else if (result.error) {
							log(`got permission but error occured: ${result.error}`);
						}
						else {
							log(`got permission: ${result.permission}`);
						}
						return result;
					})
					.then(result => {
						response(result);
					});
				return true;
			}
			catch {
				response();
			}
			break;

		case 'get-filesystem-permission':
			try {
				commands.openFileAccessAuthDialog(data.id)
					.then(result => {
						if (!result) {
							log(`got root directory but result is unavailable`);
						}
						else if (result.error) {
							log(`got root directory but error occured: ${result.error}`);
						}
						else {
							log([
								`got root directory`,
								`handle: ${Object.prototype.toString.call(result.handle)}`,
								`from: "${result.from}"`
							].join(', '));
						}
						return result;
					})
					.then(result => {
						/*
						 * conditions of result variable
						 *
						 * user granted: {
						 *   handle: [object FileSystemDirectoryHandle],
						 *   from: '...'
						 * }
						 *
						 * user refused: {
						 *   handle: null,
						 *   from: '...',
						 *   error: '...'
						 * }
						 *
						 * error occured: {
						 *   error: '...'
						 * }
						 */
						if ('handle' in result) {
							response({
								granted: result.handle instanceof FileSystemDirectoryHandle
							});
						}
						else {
							response({
								error: result.error ?? 'unknown error'
							});
						}
					});
				return true;
			}
			catch {
				response();
			}
			break;

		default:
			response();
			break;
		}
	});

	/*
	 * register click handlers
	 */

	clickDispatcher.ensure;
	clickDispatcher
		.add('#void', () => {})

		.add('#delete-post',       commands.openEvaluateDialog)
		.add('#config',            commands.openConfigDialog)
		.add('#help',              commands.openHelpDialog)
		.add('#draw',              commands.openDrawDialog)
		.add('#toggle-panel',      commands.togglePanelVisibility)
		.add('#reload',            commands.reload)
		.add('#sage',              commands.toggleSage)
		.add('#search-start',      commands.search)
		.add('#clear-upfile',      commands.clearUpfile)
		.add('#toggle-catalog',    commands.toggleCatalogVisibility)
		.add('#autotrack',         commands.registerAutotrack)
		.add('#autosave',          commands.registerAutosave)
		.add('#action-to',         commands.showActionMenu)
		.add('#prev-summary',      commands.summaryBack)
		.add('#next-summary',      commands.summaryNext)
		.add('#clear-credentials', commands.clearCredentials)
		.add('#coin',              commands.showCoinMenu)

		.add('#search-item', (e, t) => {
			const number = t.dataset.number;
			if (!number) return;
			let wrapper = $qs([
				`article .topic-wrap[data-number="${number}"]`,
				`article .reply-wrap > [data-number="${number}"]`
			].join(','));
			if (!wrapper) return;

			const rect = wrapper.getBoundingClientRect();
			if (rect.top < 0 || rect.bottom >= viewportRect.height) {
				window.scrollTo(
					0,
					Math.floor(
						docScrollTop() +
						rect.top +
						(rect.height / 2) -
						(viewportRect.height / 2)));
			}
			wrapper.classList.add('hilight');
			setTimeout(() => {
				wrapper.classList.remove('hilight');
				wrapper = null;
			}, 1000);
		})
		.add('#select', (e, t) => {
			for (const node of $qsa('[data-number]', t.closest('li'))) {
				const number = node.dataset.number;
				const checkbox = $qs([
					`article .topic-wrap[data-number="${number}"] input[type="checkbox"]`,
					`article .reply-wrap > [data-number="${number}"] input[type="checkbox"]`
				].join(','));
				if (checkbox) {
					checkbox.checked = true;
				}
			}
			updateCheckedPostIndicator();
		})
		.add('#save-catalog-settings', () => {
			commands.updateCatalogSettings({
				x: $('catalog-horz-number').value,
				y: $('catalog-vert-number').value,
				text: $('catalog-with-text').checked ? storage.config.catalog_text_max_length.value : 0
			});
			alert('はい。');
		})
		.add('#leader', (e, t) => {
			if (t.closest('q')) return;

			const data = {
				'asis': null,
				'-1': '',
				'excite': '！',
				'love': '♥',
				'fate': '──',
				'custom': storage.config.custom_subst_leader.value,
				'-2': '',
				'3dots': '…',
			};
			
			modules('menu').then(menu => menu.createContextMenu().assign({
				key: 'leader',
				items: Object.keys(data).map(key => {
					return key.startsWith('-') ?
						{key: '-'} :
						{
							key,
							label: _(`replace_leader_${key}`),
							checked: substs.leader === key
						};
				})
			}).open(t, 'leader')).then(item => {
				if (!item) return;
				commands.setSubst('leader', item.key, data[item.key]);
			});
		})

		.add('.del', (e, t) => {
			commands.quickModerate(e, t);
		})
		.add('.postno', (e, t) => {
			const wrap = getWrapElement(t);
			if (!wrap) return;
			let comment = $qs('.comment', wrap);
			if (!comment) return;

			comment = commentToString(comment);

			if ($qs('.reply-image', wrap) && /^ｷﾀ━+\(ﾟ∀ﾟ\)━+\s*!+$/.test(comment)) {
				comment = $qs('.postno', wrap).textContent;
			}

			selectionMenu.dispatch('quote', comment);
		})
		.add('.save-image', (e, t) => {
			commands.saveAssetViaMenu(t);
		})
		.add('.image-metadata', (e, t) => {
			commands.showMetadataMenu(e, t);
		})
		.add('.panel-tab', (e, t) => {
			showPanel(() => {
				activatePanelTab(t);
			});
		})
		.add('.switch-to', (e, t) => {
			historyStateWrapper.pushState(t.href);
		})
		.add('.lightbox', (e, t) => {
			function autoSaveAsset () {
				if (!storage.config.auto_save_image.value) return;
				const saveLink = $qs(`.save-image[href="${t.href}"]`);
				if (!saveLink) return;
				return commands.saveAsset(saveLink);
			}

			if (!storage.config.lightbox_enabled.value) {
				autoSaveAsset();
				return clickDispatcher.PASS_THROUGH;
			}

			if (/\.(?:jpe?g|gif|png|webp)$/i.test(t.href)) {
				displayLightbox(t).then(autoSaveAsset);
			}
			else if (/\.(?:webm|mp4)$/i.test(t.href)) {
				displayInlineVideo(t, autoSaveAsset);
			}
			else if (/\.(?:mp3|ogg)$/i.test(t.href)) {
				displayInlineAudio(t, autoSaveAsset);
			}
		})
		.add('.catalog-order', (e, t) => {
			let newActive;

			for (const node of $qsa('#catalog .catalog-options a')) {
				if (node === t) {
					node.classList.add('active');
					newActive = node;
				}
				else {
					node.classList.remove('active');
				}
			}

			if (!newActive) {
				newActive = $qs('#catalog .catalog-options a');
				newActive.classList.add('active');
			}

			const order = newActive.href.match(/\w+$/)[0];
			const contentId = `catalog-threads-wrap-${order}`;
			for (const node of $qsa('#catalog .catalog-threads-wrap > div')) {
				if (node.id === contentId) {
					node.classList.remove('hide');
				}
				else {
					node.classList.add('hide');
				}
			}

			storage.runtime.catalog.sortOrder = order;
			storage.saveRuntime();
			commands.reload();
		})
		.add('.sodane', (e, t) => {
			commands.sodane(e, t);
		})
		.add('.sodane-null', (e, t) => {
			commands.sodane(e, t);
		})

		// generic handlers for elements without known class
		.add('a', (e, t) => {
			const re1 = /(.*)#[^#]*$/.exec(t.href);
			const re2 = /(.*)(#[^#]*)?$/.exec(location.href);
			if (t.target !== '_blank') return clickDispatcher.PASS_THROUGH;
			if (re1 && re2 && re1[1] === re2[1]) return clickDispatcher.PASS_THROUGH;

			backend.send('open', {
				url: t.href,
				selfUrl: location.href
			});
		})

		.add('input-checkbox', (e, t) => {
			const postNumber = getPostNumber(t);
			if (!postNumber) return;

			for (let i = 0; i < checkedPostNumbers.length; i++) {
				if (checkedPostNumbers[i] === postNumber) {
					checkedPostNumbers.splice(i--, 1);
				}
			}

			if (t.checked) {
				checkedPostNumbers.push(postNumber);
				while (checkedPostNumbers.length > 2) {
					checkedPostNumbers.shift();
				}
			}

			updateCheckedPostIndicator();
		});

	/*
	 * instantiate keyboard shortcut manager
	 * and register shortcut handlers
	 */

	keyManager.ensure;
	keyManager
		.addStroke('command', 'r', commands.reload)
		.addStroke('command', [' ', '<S-space>'], commands.scrollPage, true)
		.addStroke('command', 'z', commands.summaryBack)
		.addStroke('command', '.', commands.summaryNext)
		.addStroke('command', '?', commands.openHelpDialog)
		.addStroke('command', 'c', commands.toggleCatalogVisibility)
		.addStroke('command', 'p', commands.togglePanelVisibility)
		.addStroke('command', 's', commands.activateStatisticsTab)
		.addStroke('command', '/', commands.activateSearchTab)
		.addStroke('command', 'n', commands.activateNoticeTab)

		.addStroke('command', 'i', commands.activatePostForm)
		.addStroke('command', '\u001b', commands.deactivatePostForm)

		.addStroke('command.edit', '\u001b', commands.deactivateEditor)			// <esc>
		.addStroke('command.edit', '\u000d', commands.newLine)						// <enter>
		.addStroke('command.edit', ['\u0013', '<A-S>'], commands.toggleSage)		// ^S, <Alt+S>
		.addStroke('command.edit', '<A-D>', commands.voice)							// <Alt+D>
		.addStroke('command.edit', '<A-S>', commands.semiVoice)						// <Alt+S>
		.addStroke('command.edit', '<S-enter>', commands.post)						// <Shift+Enter>
	;

	/*
	 * another debug handlers
	 */

	if (devMode) {
		clickDispatcher
			.add('#reload-ext',        commands.reloadExtension)
			.add('#notice-test',       commands.noticeTest)
			.add('#reload-full',       () => {
				return commands[pageModes[0].mode === 'reply' ? 'reloadReplies' : 'reload']();
			})
			.add('#reload-delta',      () => {
				return commands[pageModes[0].mode === 'reply' ? 'reloadRepliesViaAPI' : 'reload']();
			})
			.add('#dump-stats',        commands.dumpStats)
			.add('#dump-reload-data',  commands.dumpReloadData)
			.add('#empty-replies',     commands.emptyReplies)
			.add('#traverse',          commands.traverseTest)
			.add('#dump-credentials',  commands.dumpCredentials)
			.add('#open-auth-dialog',  commands.getCredential)
			.add('#proxy-audio-test',  commands.proxyAudioTest)
			.add('#notification-test', commands.notificationTest)
			.add('#tokenize-test',     commands.tokenizeTest)
			.add('#toggle-timing-log', commands.toggleLogging);
	}

	/*
	 * favicon maintainer
	 */

	favicon.update();

	/*
	 * window resize handler
	 */

	(() => {
		function updateViewportRectGeometry () {
			const vp = document.body.appendChild(document.createElement('div'));
			try {
				vp.id = 'viewport-rect';
				viewportRect = vp.getBoundingClientRect();
			}
			finally {
				removeChild(vp);
			}
		}

		function updateMaxSizeOfDialogs (style) {
			style.appendChild(document.createTextNode([
				`.dialog-wrap .dialog-content {`,
				`  max-width:${Math.floor(viewportRect.width * 0.8)}px;`,
				`  max-height:${Math.floor(viewportRect.height * 0.8)}px;`,
				`  min-width:${Math.floor(viewportRect.width * 0.25)}px;`,
				'}'
			].join('\n')));
		}

		function updateHeaderHeight (style) {
			const headerHeight = $('header').offsetHeight + HEADER_MARGIN_BOTTOM;
			$('content').style.marginTop =
			$('catalog').style.marginTop =
			$('content-loading-indicator').style.marginTop =
			$('ad-aside-wrap').style.top =
			$('panel-aside-wrap').style.top = headerHeight + 'px';
			style.appendChild(document.createTextNode([
				`#content > article > .image > div {`,
				`  top:${headerHeight}px`,
				'}'
			].join('\n')));
		}

		function handler () {
			const style = $('dynstyle-comment-maxwidth');
			if (!style) return;
			empty(style);

			updateViewportRectGeometry(style);
			updateMaxSizeOfDialogs(style);
			updateHeaderHeight(style);
			//readjustReplyWidth();
		}

		setupWindowResizeEvent(100, handler);
	})();

	/*
	 * history handler
	 */

	historyStateWrapper.setHandler(() => {
		/*
		console.log([
			`  previous page mode: ${pageModes[0].mode}`,
			`current page address: ${location.href}`
		].join('\n'));
		*/

		const isCatalog = location.hash === '#mode=cat';

		if (pageModes[0].mode === 'catalog' && !isCatalog
		||  pageModes[0].mode !== 'catalog' && isCatalog) {
			commands.toggleCatalogVisibility();
		}

		if (pageModes[0].mode === 'summary') {
			const re = /(\d+)\.htm$/.exec(location.pathname);
			siteInfo.summaryIndex = re ? re[1] : 0;
			commands.reload();
		}
		else if (pageModes[0].mode === 'catalog' && pageModes[1].mode === 'summary') {
			const re = /(\d+)\.htm$/.exec(location.pathname);
			const summaryIndex = siteInfo.summaryIndex = re ? re[1] : 0;

			// title sync
			const titleElement = $qs('#header h1 a span:last-child');
			let title = titleElement
				.textContent
				.replace(/\s*\[(?:ページ|page)\s*\d+\]/, '');
	
			if (summaryIndex) {
				title += ` [${$('page')} ${summaryIndex}]`;
			}
			$t(titleElement, title);

			// page navigator sync
			const navElement = $qs('#postform-wrap .nav-links');
			const pageCount = Math.min(11, navElement.childElementCount);
			empty(navElement);
			for (let i = 0; i < pageCount; i++) {
				if (i === summaryIndex) {
					const span = navElement.appendChild(document.createElement('span'));
					span.className = 'current';
					$t(span, i);
				}
				else {
					const a = navElement.appendChild(document.createElement('a'));
					a.className = 'switch-to';
					a.href = `${location.protocol}//${location.host}/${siteInfo.board}/${i === 0 ? 'futaba' : i}.htm`;
					$t(a, i);
				}
			}
		}
	});

	/*
	 * quote popup
	 */

	quotePopup.ensure;

	/*
	 * selection menu handler
	 */

	selectionMenu.ensure;

	/*
	 * mouse cursor tracker
	 */

	window.addEventListener('mousemove', e => {
		cursorPos.x = e.clientX;
		cursorPos.y = e.clientY;
		cursorPos.pagex = e.pageX;
		cursorPos.pagey = e.pageY;
		cursorPos.moved = true;
	});

	/*
	 * restore cookie value
	 */

	$t('name', getCookie('namec'));
	$t('pwd', getCookie('pwdc'));

	/*
	 * post form
	 */

	// submit listener
	$('postform') && $('postform').addEventListener('submit', e => {
		e.preventDefault();
		commands.post();
	});

	// allow tegaki link, if baseform element exists
	(drawButtonWrap => {
		if (!drawButtonWrap) return;

		if (document.getElementsByName('baseform').length === 0) {
			// baseform not exists. disable tegaki link
			drawButtonWrap.classList.add('hide');

			// additionally in reply mode, disable upload feature
			if (pageModes[0].mode === 'reply') {
				const upfile = $('upfile');
				const textonly = $('textonly');
				upfile.disabled = textonly.disabled = true;
			}
		}
		else {
			// allow tegaki link
			drawButtonWrap.classList.remove('hide');
		}

	})($qs('.draw-button-wrap'));

	// assign a behavior to each form fields
	setupPostFormItemEvent([
		{id:'com',              bytes:1000, lines:15},
		{id:'name',  head:'📛', bytes:100},
		{id:'email', head:'📧', bytes:100},
		{id:'sub',   head:'🌹', bytes:100}
	]);

	// handle post form visibility
	(() => {
		let frameOutTimer;
		$('postform-wrap').addEventListener('mouseenter', () => {
			if (frameOutTimer) {
				clearTimeout(frameOutTimer);
				frameOutTimer = null;
			}
			commands.activatePostForm('postform-wrap#mouseenter');
		});
		$('postform-wrap').addEventListener('mouseleave', () => {
			if (frameOutTimer) return;

			frameOutTimer = setTimeout(() => {
				frameOutTimer = null;
				let p = document.elementFromPoint(cursorPos.x, cursorPos.y);
				while (p && p.id !== 'postform-wrap') {
					p = p.parentNode;
				}
				if (p) return;
				const thumb = $('post-image-thumbnail-wrap');
				if (thumb && thumb.dataset.available === '2') {
					thumb.dataset.available = '1';
					return;
				}
				commands.deactivatePostForm();
			}, POSTFORM_DEACTIVATE_DELAY);
		});
	})();

	/*
	 * parallax banner handling
	 */

	setupParallax('#ad-aside-wrap');

	/*
	 * inline video viewer
	 */

	setupVideoViewer();

	/*
	 * mouse wheel handler
	 */

	setupWheelReload();

	/*
	 * sounds
	 */

	sounds = {
		identified: createSound('identified'),
		detectNewMark: createSound('new-mark'),
		imageSaved: createSound('image-saved'),
		trackerWorked: createSound('tracker-worked')
	};

	/*
	 * panel
	 */

	// submit button on search panel
	$('search-form').addEventListener('submit', () => {
		commands.search();
	});

	// pseudo mousehoverin/mousehoverout events for search item
	// on reply search panel and statistics panel
	setupSearchResultPopup();

	/*
	 * register custom event handler
	 */

	setupCustomEventHandler();

	/*
	 * uucount/uuacount, based on base4.js
	 */

	{
		// uuacount: unique user in short time period?
		const p = [getImageFrom(`/bin/uuacount.php?${Math.floor(Math.random() * 1000)}`)];

		// We found that this code was removed from base4ajax.js on Jan.22
		/*
		const uuc = getCookie('uuc');
		if (uuc !== '1') {
			// uucount: unique user per hour?
			p.push(getImageFrom(`//dec.2chan.net/bin/uucount.php?${Math.random()}`));
			document.cookie = 'uuc=1; max-age=3600; path=/;';
		}
		*/

		Promise.all(p);
	}

	/*
	 * switch according to mode of pseudo-query
	 */

	let queries = (() => {
		const result = {};
		location.hash
		.replace(/^#/, '')
		.split('&').forEach(s => {
			s = s.split('=');
			s[0] = decodeURIComponent(s[0]);
			s[1] = s.length >= 2 ? decodeURIComponent(s[1]) : null;
			result[s[0]] = s[1];
		});
		return result;
	})();

	switch (queries.mode) {
	case 'cat':
		setTimeout(() => {
			commands.toggleCatalogVisibility();
		}, 0);
		break;
	}

	/*
	 * finish
	 */

	$('content').classList.add('transition-enabled');
}

/*
 * <<<1 applyDataBindings: apply a data in xml to an element, with its data binding definition
 */

function applyDataBindings (xml) {
	for (const node of $qsa('*[data-binding]')) {
		const binding = node.dataset.binding;
		let re;

		// xpath:<path/to/xml/element>
		// xpath[<page-mode>]:<path/to/xml/element>
		if ((re = /^xpath(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] === 'string' && re[1] !== pageModes[0].mode) continue;
			try {
				const result = xml.evaluate(re[2], xml, null,
					window.XPathResult.FIRST_ORDERED_NODE_TYPE, null);
				if (!result || !result.singleNodeValue) continue;
				$t(node,
					result.singleNodeValue.value
					|| result.singleNodeValue.textContent);
			}
			catch (e) {
				log(
					`${APP_NAME}: applyDataBindings: failed to apply the data "${re[2]}"` +
					`\n${e.stack}`);
			}
		}

		// xpath-class:<path/to/xml/element>
		// xpath-class[<page-mode>]:<path/to/xml/element>
		else if ((re = /^xpath-class(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] === 'string' && re[1] !== pageModes[0].mode) continue;
			try {
				const result = xml.evaluate(re[2], xml, null,
					window.XPathResult.STRING_TYPE, null);
				if (!result || !result.stringValue) continue;
				node.className = result.stringValue;
			}
			catch (e) {
				log(
					`${APP_NAME}: applyDataBindings: failed to apply the data "${re[2]}" to class` +
					`\n${e.stack}`);
			}
		}

		// template:<template-name>
		// template[<page-mode>]:<template-name>
		else if ((re = /^template(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] === 'string' && re[1] !== pageModes[0].mode) continue;
			try {
				xsltProcessor.setParameter(null, 'render_mode', re[2]);
				const f = fixFragment(xsltProcessor.transformToFragment(xml, document));
				if (f.textContent.replace(/^\s+|\s+$/g, '') === '' && !$qs('[data-doe]', f)) continue;
				empty(node);
				extractDisableOutputEscapingTags(node, f);
			}
			catch (e) {
				log(
					`${APP_NAME}: applyDataBindings: failed to apply the template "${re[2]}"` +
					`\n${e.stack}`);
			}
		}

		// coin:<key>
		// coin[<page-mode>]:<key>
		else if ((re = /^coin(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] === 'string' && re[1] !== pageModes[0].mode) continue;
			try {
				let key = re[2], paren = false, toAttr = false, numberOnly = false;

				if (key.startsWith('@')) {
					key = key.substring(1);
					toAttr = true;
				}
				if (key.startsWith('#')) {
					key = key.substring(1);
					numberOnly = true;
				}
				if (/^\([^)]+\)$/.test(key)) {
					key = key.substring(1, key.length - 1);
					paren = true;
				}

				let cost = getCoinCost(key);
				if (typeof cost !== 'number') continue;

				if (!numberOnly) {
					cost = `🪙${cost}`;
				}
				if (paren) {
					cost = `(${cost})`;
				}
				if (toAttr) {
					node.dataset.coin = cost;
				}
				else {
					node.textContent = cost;
				}

				if (key === 'total') {
					const image = node.previousSibling;
					if (image && image.classList.contains('coin-image')) {
						if (coinCharge) {
							image.classList.remove('gray');
						}
						else {
							image.classList.add('gray');
						}
					}
				}
			}
			catch (e) {
				log(
					`${APP_NAME}: applyDataBindings: failed to apply the coin target "${re[2]}"` +
					`\n${e.stack}`);
			}
		}
	}
}

/*
 * <<<1 classes / class constructors
 */

class TegakiFile extends File {}
class PseudoReplyFile extends File {}

function createExtensionBackend () {
	let connection;
	let tabId;
	let extensionId;
	let browserInfo;
	let requestNumber = 0;
	let onMessageHandlers = [];

	function ChromeConnection () {
		function connect (type = 'init') {
			chromeWrap.runtime.onMessage.addListener(handleMessage);
			return sendMessage(type, {
				url: location.href
			});
		}

		function disconnect () {
			onMessageHandlers.length = 0;
			chromeWrap.runtime.onMessage.removeListener(handleMessage);
		}

		function sendMessage (type, data = {}) {
			const requestNumber = getNewRequestNumber();
			return chromeWrap.runtime.sendMessage({
				type: type || 'unknown-command',
				tabId, requestNumber, data
			});
		}

		function getExtensionId () {
			// extension id can be retrieved by chrome.runtime.id in chrome,
			// but Firefox's WebExtensions distinguishes extension id from
			// runtime UUID.
			const url = chromeWrap.runtime.getURL('README.md');
			let re = /^[^:]+:\/\/([^/]+)/.exec(url);
			return re[1];
		}

		return {
			connect, disconnect, sendMessage,
			get extensionId () {
				return getExtensionId();
			}
		};
	}

	function handleMessage (req, sender, response) {
		let result = false;
		for (const handler of onMessageHandlers) {
			result = !!handler(req, sender, response) || result;
		}
		return result;
	}

	function getNewRequestNumber () {
		return requestNumber = (requestNumber + 1) & 0xffff;
	}

	async function connect () {
		if (connection) {
			throw new Error('extension connection is already established.');
		}

		connection = new ChromeConnection;
		extensionId = connection.extensionId;

		for (let retryRest = 5, wait = 1000; retryRest > 0; retryRest--, wait += 1000) {
			try {
				const response = await connection.connect();
				tabId = response.tabId;
				browserInfo = response.browserInfo;
				return response;
			}
			catch (err) {
				log(`${APP_NAME}: connect: failed to connect to background service worker: ${err.stack}`);
			}
			await new Promise(resolve => setTimeout(resolve, wait));
		}

		return null;
	}

	async function send (type, data = {}) {
		try {
			return await connection.sendMessage(type, data);
		}
		catch (err) {
			log(`${APP_NAME}: send: failed to send a message to background service worker: ${err.stack}\nsending data: ${JSON.stringify(data)}`);
			throw err;
		}
	}

	function setMessageListener (listener) {
		onMessageHandlers = [listener];
	}

	function getUniqueId () {
		return APP_NAME
			+ '_' + Date.now()
			+ '_' + Math.floor(Math.random() * 0x10000);
	}

	function log (message) {
		try {
			devMode && send('log', {message});
		}
		catch {
			//
		}
	}

	return {
		connect, send, setMessageListener, getUniqueId, log,
		get extensionId () {
			return extensionId;
		},
		get browserInfo () {
			return browserInfo;
		}
	};
}

function createResourceManager () {
	const ENABLE_NIGHT_MODE = false;

	const transformers = [
		function updateI18nMarks (s) {
			s = s.replace(/__MSG_@@extension_id__/g, backend.extensionId);
			return s;
		},
		function chromeToMoz (s) {
			if (IS_GECKO) {
				s = s.replace(/<style[^>]*>[\s\S]*?<\/style[^>]*>/gi, s1 => {
					return s1.replace(/chrome-extension:/g, 'moz-extension:');
				});
			}
			return s;
		},
		function toNightMode (s) {
			if (ENABLE_NIGHT_MODE) {
				const map = {
					ffe: '4d3d33',
					800: 'e5cdcc',
					ea8: 'a05734',
					f0e0d6: '614a3d',
					faf4e6: '5a4539'
				};
				s = s.replace(/<style[^>]*>[\s\S]*?<\/style[^>]*>/gi, s1 => {
					return s1.replace(/#((?:ffe|800|ea8)[0-9a-f]?|(?:f0e0d6|faf4e6)(?:[0-9a-f]{2})?)\b/gi, (s2, s3) => {
						// 4 digits
						if (s3.length === 4) {
							const alpha = s3.substr(-1);
							s3 = s3.substring(0, s3.length - 1);
							const result = map[s3.toLowerCase()];
							if (result.length === 3) {
								return `#${result}${alpha}`;
							}
							else {
								return `#${result}${alpha}${alpha}`;
							}
						}

						// 8 digits
						else if (s3.length === 8) {
							const alpha = s3.substr(-2);
							s3 = s3.substring(0, s3.length - 2);
							const result = map[s3.toLowerCase()];
							return `#${result}${alpha}`;
						}

						// others
						return `#${map[s3.toLowerCase()]}`;
					});
				});
			}
			return s;
		}
	];

	function setSlot (path, data, expires = 1000 * 60 * 60) {
		window.localStorage.setItem(
			getResKey(path),
			JSON.stringify({
				expires: Date.now() + expires,
				data
			}));
	}

	function getResKey (path) {
		return `resource:${path}`;
	}

	function get (path, opts = {}) { /*returns promise*/
		const resKey = getResKey(path);

		let slot = window.localStorage.getItem(resKey);
		if (slot !== null) {
			slot = JSON.parse(slot);
			if (Date.now() < slot.expires) {
				return Promise.resolve(slot.data);
			}
			window.localStorage.removeItem(resKey);
		}

		const type = opts.type ?? 'text';
		const expires = opts.expires ?? 1000 * 60 * 60;
		return load(chromeWrap.runtime.getURL(path), {}, type).then(result => {
			if (result.error) {
				return null;
			}
			else {
				let content = result.content;

				if (type === 'text') {
					content = transformers.reduce(
						(prev, current) => current(prev),
						content);
				}

				setSlot(path, content, expires);
				return content;
			}
		});
	}

	function remove (path) {
		window.localStorage.removeItem(getResKey(path));
	}

	function clearCache () {
		for (let i = 0; i < window.localStorage.length; i++) {
			const key = window.localStorage.key(i);
			if (/^resource:/.test(key)) {
				window.localStorage.removeItem(key);
				i--;
			}
		}
	}

	return {get, remove, clearCache};
}

function createXMLGenerator () {
	/*
	 * utility functions
	 */

	function stripTags (s) {
		const result = [];
		const pattern = /<[^>]+>|[^<]+/g;
		let re;
		while ((re = pattern.exec(s))) {
			if (re[0].charAt(0) !== '<') {
				result.push(re[0]);
			}
		}
		return result.join('');
	}

	function stripTagsForNotice (s) {
		const result = [];
		const pattern = /<[^>]+>|[^<]+/g;
		let re;
		while ((re = pattern.exec(s))) {
			if (re[0].charAt(0) === '<') {
				let re2;
				if ((re2 = /<a\b.*href="([^"]*)"/.exec(re[0]))) {
					result.push(`<a href="${re2[1]}">`);
				}
				else if ((re2 = /<\/a\b/.exec(re[0]))) {
					result.push(`</a>`);
				}
			}
			else {
				result.push(re[0]);
			}
		}
		return result.join('');
	}

	function textFactory (xml, nodeOnly) {
		if (nodeOnly) {
			return s => xml.createTextNode('' + s);
		}
		else {
			const refmap = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"'};
			return s => {
				s = ('' + s).replace(/&(?:amp|lt|gt|quot);/g, $0 => refmap[$0]);
				return xml.createTextNode(s);
			};
		}
	}

	function element (node, s) {
		return node.appendChild(node.ownerDocument.createElement(s));
	}

	function setDefaultSubjectAndName (xml, text, metaNode, subHash, nameHash) {
		element(metaNode, 'sub_default')
			.appendChild(text((Object.keys(subHash).sort((a, b) => subHash[b] - subHash[a])[0] || '').replace(/^\s+|\s+$/g, '')));
		element(metaNode, 'name_default')
			.appendChild(text((Object.keys(nameHash).sort((a, b) => nameHash[b] - nameHash[a])[0] || '').replace(/^\s+|\s+$/g, '')));
	}

	function pushComment (node, text, s) {
		const stack = [node];
		const regex = /<[^>]+>|[^<]+/g;
		const links = [];

		let re;
		while ((re = regex.exec(s))) {
			re = re[0];
			if (re.charAt(0) === '<') {
				if (re.charAt(1) === '/') {
					stack.shift();
					stack.length === 0 && stack.push(node);
				}
				else {
					if (re === '<br>') {
						stack[0].appendChild(text('\n'));
						stack[0].appendChild(element(stack[0], 'br'));
					}
					else if (re === '<font color="#789922">') {
						stack.unshift(element(stack[0], 'q'));
					}
					else if (re === '<font color="#ff0000">') {
						stack.unshift(element(stack[0], 'mark'));
					}
				}
			}
			else {
				stack[0].appendChild(text(re));
				const subLinks = linkify(stack[0]);
				if (subLinks.length) {
					links.push(...subLinks);
				}
			}
		}

		if (links.length) {
			const linkSet = new Set;
			for (const link of $qsa('a', node)) {
				const href = link.getAttribute('href');
				if (linkSet.has(href)) {
					link.className = 'link-overflow';
				}
				else {
					linkSet.add(href);
				}
			}

			if (links.length > LINKIFY_MAX) {
				for (const link of $qsa('a', node)) {
					link.className = 'link-overflow';
				}
			}
		}
	}

	function getExpirationDate (s, fromDate) {
		let Y, M, D, h, m, expireDate;

		if (!(fromDate instanceof Date)) {
			fromDate = new Date;
		}

		if (s instanceof Date) {
			expireDate = s;
			Y = expireDate.getFullYear();
			M = expireDate.getMonth();
			D = expireDate.getDate();
			h = expireDate.getHours();
			m = expireDate.getMinutes();
		}
		else {
			//
			if (s.match(/(\d{4})年/)) {
				Y = RegExp.$1 - 0;
			}
			else if (s.match(/(\d{2})年/)) {
				Y = 2000 + (RegExp.$1 - 0);
			}
			if (s.match(/(\d+)月/)) {
				M = RegExp.$1 - 1;
			}
			if (s.match(/(\d+)日/)) {
				D = RegExp.$1 - 0;
			}
			if (s.match(/(\d+):(\d+)/)) {
				h = RegExp.$1 - 0;
				m = RegExp.$2 - 0;
			}

			// 23:00 -> 01:00頃消えます: treat as next day
			/*if (h !== undefined && h < fromDate.getHours() && D === undefined) {
				D = fromDate.getDate() + 1;
			}*/
			// 31日 -> 1日頃消えます: treat as next month
			if (D !== undefined && D < fromDate.getDate() && M === undefined) {
				M = fromDate.getMonth() + 1;
			}
			// 12月 -> 1月頃消えます: treat as next year
			if (M !== undefined && M < fromDate.getMonth() && Y === undefined) {
				Y = fromDate.getFullYear() + 1;
			}

			//
			expireDate = new Date(
				Y === undefined ? fromDate.getFullYear() : Y,
				M === undefined ? fromDate.getMonth() : M,
				D === undefined ? fromDate.getDate() : D,
				h === undefined ? fromDate.getHours() : h,
				m === undefined ? fromDate.getMinutes() : m
			);
		}

		let expireDateString;
		let remains = expireDate.getTime() - fromDate.getTime();
		if (remains < 0) {
			expireDateString = '?';
		}
		else {
			let remainsString = [];
			[
				[1000 * 60 * 60 * 24, 'day',  true],
				[1000 * 60 * 60,      'hour', h !== undefined && m !== undefined],
				[1000 * 60,           'min',  h !== undefined && m !== undefined]
			].forEach(([unit, msgid, enable]) => {
				if (!enable) return;
				if (remains < unit) return;

				//remainsString.push(Math.floor(remains / unit[0]) + unit[1]);
				remainsString.push(
					chromeWrap.i18n.getMessage(
						msgid,
						[Math.floor(remains / unit)]
					)
				);
				remains %= unit;
			});

			if (remainsString.length === 0) {
				expireDateString = _('expire_soon');
			}
			else {
				if (/日/.test(remainsString[0]) && remainsString.length > 1) {
					remainsString[0] += 'と';
				}

				//expireDateString = `あと${remainsString.join('')}くらい`;
				expireDateString = _('expire', remainsString.join(_('expire_joiner')));
			}
		}

		return {
			base: fromDate,
			at: expireDate,
			string: expireDateString
		};
	}

	function parseMaxAttachSize (number, unit) {
		switch (unit) {
		case 'KB':
			unit = 1024;
			break;
		case 'MB':
			unit = 1024 * 1024;
			break;
		default:
			unit = 1;
		}

		return (number - 0) * unit;
	}

	function parseMinThreadLifeTime (number, unit) {
		switch (unit) {
		case '分':
			unit = 60;
			break;
		case '時間':
			unit = 3600;
			break;
		default:
			unit = 1;
		}

		return (number - 0) * unit * 1000;
	}

	const formatDateTime = LOCALE === 'ja' ?
		(d, re) => re[0] :
		((df, tf, wf) => {
			return (d) => {
				// note: this format may be a bit unnatural for an English
				//       date format, but it follows 4chan.
				return `${df.format(d)}(${wf.format(d)})${tf.format(d)}`;
			};
		})(
			new Intl.DateTimeFormat(undefined, {year: '2-digit', month: '2-digit', day: '2-digit'}),
			new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}),
			new Intl.DateTimeFormat(undefined, {weekday: 'short'})
		);

	/*
	 * main functions
	 */

	function run (content = '', maxReplies = 0x7fffffff, isAfterPost = false) {
		timingLogger.startTag('createXMLGenerator#run');

		const url = location.href;
		const isReplyMode = pageModes[0].mode === 'reply';
		const remainingRepliesContext = [];
		const xml = createFutabaXML(isReplyMode ? 'reply' : 'summary');
		const text = textFactory(xml);
		const enclosureNode = xml.documentElement;
		const metaNode = $qs('meta', enclosureNode);
		let baseUrl = url;

		let re;
		if (typeof maxReplies !== 'number') {
			maxReplies = 0x7fffffff;
		}

		// strip all control characters and newline characters:
		// LF(U+000A), VT(U+000B), FF(U+000C), CR(U+000D),
		// NEL(U+0085), LS(U+2028) and PS(U+2029)
		content = content.replace(/[\u0000-\u001f\u0085\u2028\u2029]/g, ' ');

		// strip bidi control character references
		content = content.replace(/[\u200e-\u200f\u202a-\u202e]/g, '');

		// base url
		re = /<base[^>]+href="([^"]+)"/i.exec(content);
		if (re) {
			baseUrl = resolveRelativePath(re[1], `${location.protocol}//${location.host}/`);
			element(metaNode, 'base').appendChild(text(re[1]));
		}

		// link to home
		if (content.match(/<a[^>]+href="([^"]+)"[^>]*>ホーム<\/a>/i)) {
			element(metaNode, 'home').appendChild(text(resolveRelativePath(RegExp.$1, baseUrl)));
		}
		if (content.match(/<a[^>]+href="([^"]+)"[^>]*>掲示板に戻る<\/a>/i)) {
			element(metaNode, 'board_top').appendChild(text(resolveRelativePath(RegExp.$1, baseUrl)));
		}

		// page title
		(() => {
			/*
			 * summary page:  "二次元裏＠ふたば"
			 * reply page #1: "これ実際どのぐらいヤ - 二次元裏＠ふたば"
			 * reply page #2: "二次元裏＠ふたば"
			 */
			const re = /([^<>]+\s+-\s+)?([^<>]+)(＠ふたば)/.exec(content);
			if (!re) return;

			let [, titleFragment, boardName, siteName] = re;
			let dash = '';

			// update title
			if (titleFragment) {
				titleFragment = titleFragment.replace(/\s+-\s+$/, '');
				dash = ' ─ ';
			}
			else {
				titleFragment = '';
			}
			// update board name
			boardName = boardName.replace(/二次元裏$/, `虹裏${siteInfo.server}`);
			// update site title
			if (!isReplyMode && siteInfo.summaryIndex) {
				siteName += ` [${_('page')} ${siteInfo.summaryIndex}]`;
			}

			let titleNode = element(metaNode, 'title');
			if (titleFragment) {
				const span1 = element(titleNode, 'span');
				span1.appendChild(text(titleFragment));
				linkify(span1, {linkify: false, emojify: true});

				const span2 = element(titleNode, 'span');
				span2.appendChild(text(`${dash}${boardName}${siteName}`));
			}
			else {
				titleNode.appendChild(text(`${boardName}${siteName}`));
			}
		})();

		// page notice
		(() => {
			let notices = /<table[^>]+class="ftbl"[^>]*>(.*?)<\/form>/i.exec(content);
			if (!notices) return;
			notices = notices[1];

			const noticeMarkups = [];
			const noticesNode = element(metaNode, 'notices');
			const noticeRegex = /<li[^>]*>(.*?)<\/li>/g;
			let notice;
			while ((notice = noticeRegex.exec(notices))) {
				notice = notice[1];

				// viewers
				if (notice.match(/現在([^人]+)/)) {
					element(metaNode, 'viewers').appendChild(text(RegExp.$1));
				}

				// log cycle
				if (notice.match(/この板の保存数は(\d+)/)) {
					element(metaNode, 'logsize').appendChild(text(RegExp.$1));
					siteInfo.logSize = RegExp.$1 - 0;
				}

				// max size of attachment file
				if (notice.match(/(\d+)\s*(KB|MB)/)) {
					siteInfo.maxAttachSize = parseMaxAttachSize(RegExp.$1, RegExp.$2);
					element(metaNode, 'maxattachsize').appendChild(text(siteInfo.maxAttachSize));
				}

				// max number of replies
				if (notice.match(/スレッド最大\s*(\d+)\s*レス/)) {
					siteInfo.maxReplies = RegExp.$1 - 0;
					element(metaNode, 'maxReplies').appendChild(text(siteInfo.maxReplies));
				}

				// min life time of thread
				if (notice.match(/最低(\d+)\s*(時間|分)保持/)) {
					siteInfo.minThreadLifeTime = parseMinThreadLifeTime(RegExp.$1, RegExp.$2);
					element(metaNode, 'minthreadlifetime').appendChild(text(siteInfo.minThreadLifeTime));
				}

				notice = stripTagsForNotice(notice);
				element(noticesNode, 'notice').appendChild(text(notice));
				noticeMarkups.push(
					notice
						.replace(/&nbsp;/g, ' ')
						.replace(/>([^<]+)</g, ($0, content) => {
							return '>' + content.replace(/\s+/g, ' ') + '<';
						})
				);
			}

			siteInfo.noticeNew = noticeMarkups
				.join('\n')
				.replace(/現在[^人]+人/g, '現在__akahukuplus_viewers_count__人');
		})();

		// page navigator
		(() => {
			const navs = /<table[^>]+class="psen"[^>]*>(.*)<\/table>/i.exec(content);
			if (!navs) return;
			const buffer = [];

			const navRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
			let nav;
			while ((nav = navRegex.exec(navs[1]))) {
				buffer.push([nav[2] - 0, resolveRelativePath(nav[1], baseUrl)]);
			}

			if (url.match(/(\d+)\.htm(?:[?#].*)?$/)) {
				buffer.push([RegExp.$1 - 0, url, true]);
			}
			else {
				buffer.push([0, url, true]);
			}

			buffer.sort((a, b) => a[0] - b[0]);
			const navsNode = element(metaNode, 'navs');
			for (let i = 0, goal = Math.min(11, buffer.length); i < goal; i++) {
				const navNode = element(navsNode, 'nav');

				navNode.appendChild(text(buffer[i][0]));
				navNode.setAttribute('href', buffer[i][1]);

				if (buffer[i][2]) {
					navNode.setAttribute('current', 'true');

					let linkNode;

					linkNode = element(metaNode, 'link');
					linkNode.setAttribute('rel', 'prev');
					linkNode.appendChild(text(
						buffer[(i - 1 + buffer.length) % buffer.length][1]));

					linkNode = element(metaNode, 'link');
					linkNode.setAttribute('rel', 'next');
					linkNode.appendChild(text(
						buffer[(i + 1 + buffer.length) % buffer.length][1]));
				}
			}
		})();

		// post form metadata
		(() => {
			const postformRegex = /(<form[^>]+enctype="multipart\/form-data"[^>]*>)(.+?)<\/form>/ig;
			let postform;
			while ((postform = postformRegex.exec(content))) {
				if (!/<input[^>]+value="regist"/.test(postform[2])) continue;

				const pfNode = element(metaNode, 'postform');

				// postform attributes
				{
					const attribRegex = /(action|method|enctype)="([^"]*)"/ig;
					let attrib;
					while ((attrib = attribRegex.exec(postform[1]))) {
						pfNode.setAttribute(attrib[1], attrib[2]);
					}
				}

				// input elements
				const inputRegex = /<input[^>]+>/gi;
				let input;
				while ((input = inputRegex.exec(postform[2]))) {
					const inputNode = element(pfNode, 'input');
					const attribRegex = /(type|name|value)="([^"]*)"/ig;
					let attrib;
					while ((attrib = attribRegex.exec(input[0]))) {
						inputNode.setAttribute(attrib[1], attrib[2]);

						if (attrib[1].toLowerCase() === 'type'
						&& attrib[2].toLowerCase() === 'file') {
							siteInfo.canUpload = true;
						}
					}
				}

				break;
			}

		})();

		// ads
		(() => {
			const adsNode = element(metaNode, 'ads');
			const adsHash = {};

			// pick up unique ad iframe list
			const adsRegex = /<iframe([^>]+)>.*?<\/iframe>/gi;
			let ads;
			while ((ads = adsRegex.exec(content))) {
				let width, height, src, re;

				re = /width="(\d+)/i.exec(ads[1]);
				if (re) {
					width = re[1] - 0;
				}

				re = /height="(\d+)/i.exec(ads[1]);
				if (re) {
					height = re[1] - 0;
				}

				re = /src="([^"]+)/i.exec(ads[1]);
				if (re) {
					src = re[1];
				}

				if (!isNaN(width) && !isNaN(height) && src) {
					adsHash[`${width}_${height}_${src}`] = 1;
				}
			}

			// shuffle
			const adsArray = Object.keys(adsHash);
			for (let i = adsArray.length - 1; i > 0; i--) {
				const index = Math.floor(Math.random() * (i + 1));
				const tmp = adsArray[i];
				adsArray[i] = adsArray[index];
				adsArray[index] = tmp;
			}

			// store into xml
			const bannersNode = element(adsNode, 'banners');
			for (let i of adsArray) {
				const parts = i.split('_');
				const width = parts.shift() - 0;
				const height = parts.shift() - 0;
				const src = parts.join('_');
				const adNode = element(bannersNode, 'ad');
				let className = 'unknown';

				if (width === 336) {
					className = 'standard';
				}
				else if (width === 300) {
					className = 'mini';
				}
				else if (width === 728) {
					className = 'large';
				}
				else if (width === 160 && height === 600) {
					className = 'skyscraper';
				}

				i = i.replace(/\bsrc=/, 'src="about:blank" data-src=');

				adNode.setAttribute('class', `size-${className}`);
				adNode.setAttribute('width', width);
				adNode.setAttribute('height', height);
				adNode.setAttribute('src', src);
			}
		})();

		// configurations
		(() => {
			const configNode = element(metaNode, 'configurations');
			const cs = getCatalogSettings();
			let paramNode;

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'catalog.x');
			paramNode.setAttribute('value', cs[0]);

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'catalog.y');
			paramNode.setAttribute('value', cs[1]);

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'catalog.text');
			paramNode.setAttribute('value', cs[2] !== 0 ? '1' : '0');

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'storage')
			paramNode.setAttribute('value', storage.config.storage.value)

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'banner_enabled')
			paramNode.setAttribute('value', storage.config.banner_enabled.value ? '1' : '0')

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'strip_exif')
			paramNode.setAttribute('value', storage.config.strip_exif.value ? '1' : '0')
		})();

		/*
		 * split content into threads
		 */

		const threadRegex = /(<div\s+class="thre"[^>]*>\s*)(?:画像ファイル名：.+?(<a[^>]+><img[^>]+><\/a>))?(?:<input[^>]+value="?delete"?[^>]*>|<span\s+id="delcheck\d+"[^>]*>).*?<hr>/g;
		let threadIndex = 0;

		postStats.start();

		for (let matches; (matches = threadRegex.exec(content)); threadIndex++) {
			const match = matches[0];
			let topic = /^(.+?)<blockquote[^>]*>(.*?)<\/blockquote>(.*)/i.exec(match);
			if (!topic) continue;

			let topicInfo = topic[1];
			let topicInfoText = topicInfo.replace(/<\/?[\w\-:]+(\s+[\w\-:]+\s*=\s*"[^"]*")*\s*>/g, '');
			let threadRest = topic[3];
			topic = topic[2];

			re = /^(.*?)(<table\s+.*)/i.exec(threadRest);
			if (re) {
				topicInfo += ' ' + re[1];
				threadRest = re[2];
			}
			else {
				topicInfo += ' ' + threadRest;
				threadRest = '';
			}

			let htmlref;
			if (isReplyMode) {
				htmlref = /\b(res\/(\d+)\.htm|futaba\.php\?res=(\d+))/.exec(location.href);
			}
			else {
				htmlref = /<a href="(res\/(\d+)\.htm|futaba\.php\?res=(\d+))[^>]*>/i.exec(topicInfo);
			}
			if (!htmlref) continue;

			/*
			 * thread meta informations
			 */

			const threadNode = element(enclosureNode, 'thread');
			threadNode.setAttribute('url', resolveRelativePath(htmlref[1], baseUrl));

			let threadExpireDate;

			/*
			 * topic informations
			 */

			const topicNode = element(threadNode, 'topic');

			// expiration date
			const expires = /<(?:small|span)[^>]*>([^<]+?)頃消えます<\/(?:small|span)>/i.exec(topicInfo);
			const expireWarn = /<font[^>]+><b>このスレは古いので、/i.test(topicInfo);
			const maxReached = /<span\s+class="maxres"[^>]*>[^<]+</i.test(topicInfo);
			if (expires || expireWarn || maxReached) {
				const expiresNode = element(topicNode, 'expires');
				let expireDate;
				if (expires) {
					expireDate = getExpirationDate(expires[1]);
					expiresNode.appendChild(text(expires[1]));
					expiresNode.setAttribute('remains', expireDate.string);
				}
				if (expireDate) {
					threadExpireDate = expireDate.at.getTime();
					reloadStatus.expireDate = expireDate.at;
				}
				else {
					threadExpireDate = Date.now() + 1000 * 60 * 60 * 24;
				}
				if (expireWarn) {
					expiresNode.setAttribute('warned', 'true');
				}
				if (maxReached) {
					expiresNode.setAttribute('maxreached', 'true');
				}
			}

			// number
			let threadNumber = 0;
			if (typeof htmlref[2] === 'string' && htmlref[2] !== '') {
				threadNumber = htmlref[2] - 0;
			}
			else if (typeof htmlref[3] === 'string' && htmlref[3] !== '') {
				threadNumber = htmlref[3] - 0;
			}
			if (threadNumber) {
				const threadNumberNode = element(topicNode, 'number');
				threadNumberNode.appendChild(text(threadNumber));
				re = /^(\d*?)((\d)\3+)$/.exec(threadNumber);
				if (re) {
					threadNumberNode.setAttribute('lead', re[1]);
					threadNumberNode.setAttribute('trail', re[2]);
				}
				if (threadIndex === 0) {
					siteInfo.latestNumber = threadNumber;
				}
			}

			// posted date
			re = POST_DT_PATTERN.exec(topicInfo);
			if (re) {
				const postedDate = new Date(
					2000 + (re[1] - 0),
					re[2] - 1,
					re[3] - 0,
					re[4] - 0,
					re[5] - 0,
					re[6] - 0,
					0
				);
				const postDateNode = element(topicNode, 'post_date');
				postDateNode.appendChild(text(formatDateTime(postedDate, re)));
				postDateNode.setAttribute('value', postedDate.getTime());
				postDateNode.setAttribute('orig', re[0]);
				if (pageModes[0].mode === 'reply' && !siteInfo.date) {
					siteInfo.date = postedDate;
				}
			}

			// subject
			re = /<span\s+class="[^"]*csb[^"]*"[^>]*>(.+?)<\/span>/i.exec(topicInfo);
			if (re) {
				re[1] = re[1].replace(/^\s+|\s+$/g, '');
				element(topicNode, 'sub').appendChild(text(re[1]));
				siteInfo.subHash[re[1]] = (siteInfo.subHash[re[1]] || 0) + 1;
			}

			// name
			re = /<span\s+class="[^"]*cnm[^"]*"[^>]*>(.+?)<\/span>/i.exec(topicInfo);
			if (re) {
				re[1] = re[1]
					.replace(/<[^>]*>/g, '')
					.replace(/^\s+|\s+$/g, '');
				element(topicNode, 'name').appendChild(text(re[1]));
				siteInfo.nameHash[re[1]] = (siteInfo.nameHash[re[1]] || 0) + 1;
			}

			// mail address
			re = /<a[^>]+href="mailto:([^"]*)"/i.exec(topicInfo);
			if (re) {
				const emailNode = element(topicNode, 'email');
				emailNode.appendChild(text(stripTags(re[1])));
				linkify(emailNode);
				if (isReplyMode && /ID表示/i.test(re[1])) {
					siteInfo.idDisplay = true;
				}
			}

			// そうだね (that's right)
			re = /<a[^>]+class="sod"[^>]*>([^<]+)<\/a>/i.exec(topicInfo);
			if (re) {
				/*
				 * +          => sodane-null
				 * そうだねx0 => sodane-null
				 * そうだねxn => sodane
				 */
				const sodaneNode = element(topicNode, 'sodane');
				if (/x\s*([1-9][0-9]*)/.test(re[1])) {
					sodaneNode.appendChild(text(RegExp.$1));
					sodaneNode.setAttribute('class', 'sodane');
					postStats.notifySodane(threadNumber, RegExp.$1);
				}
				else {
					sodaneNode.appendChild(text(SODANE_NULL_MARK));
					sodaneNode.setAttribute('class', 'sodane-null');
					postStats.notifySodane(threadNumber, 0);
				}
			}

			// ID
			if (/<span\s+class="cnw"[^>]*>(.+?)<\/span>/.test(topicInfo)
			&& (re = /ID:(\S+)/.exec(RegExp.$1))) {
				const idNode = element(topicNode, 'user_id');
				idNode.appendChild(text(stripTags(re[1])));
				postStats.notifyId(threadNumber, re[1]);
			}

			// IP
			re = /IP:([a-zA-Z0-9_*:.\-()]+)/.exec(topicInfoText);
			if (re) {
				const ipNode = element(topicNode, 'ip');
				ipNode.appendChild(text(re[1]));
			}

			// src & thumbnail url
			const imagehref = /<br><a[^>]+href="([^"]+)"[^>]*>(<img[^>]+>)<\/a>/i.exec(topicInfo);
			if (imagehref) {
				const imageNode = element(topicNode, 'image');
				const srcUrl = resolveRelativePath(imagehref[1], baseUrl);
				imageNode.appendChild(text(srcUrl));
				imageNode.setAttribute('base_name', imagehref[1].match(/[^/]+$/)[0]);

				// animated
				re = /<small[^>]*>アニメGIF\.<\/small[^>]*>|<!--AnimationGIF-->/i.exec(topicInfo);
				if (re) {
					imageNode.setAttribute('animated', 'true');
				}

				// bytes
				re = /\balt="?(\d+)\s*B/i.exec(imagehref[2]);
				if (re) {
					imageNode.setAttribute('bytes', re[1]);
					imageNode.setAttribute('size', getReadableSize(re[1]));
				}

				// thumbnail
				let thumbUrl = '', thumbWidth = false, thumbHeight = false;
				re = /\b(?:data-)?src=([^\s>]+)/i.exec(imagehref[2]);
				if (re) {
					thumbUrl = re[1].replace(/^["']|["']$/g, '');
					thumbUrl = resolveRelativePath(thumbUrl, baseUrl);
				}
				re = /\bwidth="?(\d+)"?/i.exec(imagehref[2]);
				if (re) {
					thumbWidth = re[1];
				}
				re = /\bheight="?(\d+)"?/i.exec(imagehref[2]);
				if (re) {
					thumbHeight = re[1];
				}
				if (thumbUrl !== '' && thumbWidth !== false && thumbHeight !== false) {
					const thumbNode = element(topicNode, 'thumb');
					const thumbnailSize = getThumbnailSize(thumbWidth, thumbHeight, 250, 250);
					thumbNode.appendChild(text(thumbUrl));
					thumbNode.setAttribute('width', thumbnailSize.width);
					thumbNode.setAttribute('height', thumbnailSize.height);
				}
			}

			// communist sign :-)
			re = /(\[|dice\d+d\d+(?:[-+]\d+)?=)?<font\s+color="#ff0000">(.+?)<\/font>\]?/i.exec(topic);
			if (re && (!re[1] || re[1].substr(-1) !== '=')) {
				const markNode = element(topicNode, 'mark');
				re[0].charAt(0) === '['
					&& re[0].substr(-1) === ']'
					&& markNode.setAttribute('bracket', 'true');
				markNode.appendChild(text(stripTags(re[2])));
			}

			// comment
			pushComment(element(topicNode, 'comment'), text, topic);

			// memory some topic infomations
			urlStorage.memo(item => {
				item.expire = threadExpireDate;
				if (isAfterPost) {
					item.count--;
					item.post++;
				}
			});

			/*
			 * replies
			 */

			let hiddenRepliesCount = 0;
			re = /font color="#707070">レス(\d+)件省略。/i.exec(topicInfo);
			if (re) {
				hiddenRepliesCount = re[1] - 0;
			}

			const result = fetchReplies(
				threadRest,
				/<table[^>]*>.*?(?:<input[^>]*>|<span\s+id="delcheck\d+"[^>]*>).*?<\/td>/g,
				hiddenRepliesCount, maxReplies, -1, threadNode,
				siteInfo.subHash, siteInfo.nameHash, baseUrl);

			const lastIndex = result.regex.lastIndex;
			if (!result.lastReached && result.regex.exec(threadRest)) {
				result.regex.lastIndex = lastIndex;
				remainingRepliesContext.push({
					index: threadIndex,
					repliesCount: result.repliesCount,
					regex: result.regex,
					content: threadRest
				});
			}

			/*
			 * misc
			 */

			// if summary mode, store lastest number
			if (pageModes[0].mode === 'summary' && threadIndex === 0) {
				if (result.repliesNode.childElementCount) {
					siteInfo.latestNumber = $qs('number', result.repliesNode.lastElementChild).textContent - 0;
				}
			}

			result.repliesNode.setAttribute('total', result.repliesCount);
			result.repliesNode.setAttribute('hidden', hiddenRepliesCount);
		}

		setDefaultSubjectAndName(xml, text, metaNode, siteInfo.subHash, siteInfo.nameHash);

		timingLogger.endTag();

		if (devMode && ($qs('[data-href="#toggle-dump-xml"]') || {}).checked) {
			console.log(serializeXML(xml));
		}

		return {xml, remainingRepliesContext};
	}

	function fetchReplies (s, regex, hiddenRepliesCount, maxReplies, lowBoundNumber, threadNode, subHash, nameHash, baseUrl) {
		const text = textFactory(threadNode.ownerDocument);
		const repliesNode = element(threadNode, 'replies');
		const goal = hiddenRepliesCount + maxReplies;

		let repliesCount = hiddenRepliesCount;
		let offset = hiddenRepliesCount + 1;
		let reply;

		for (;repliesCount < goal && (reply = regex.exec(s)); offset++, repliesCount++) {
			let re = /^(.*)<blockquote[^>]*>(.*)<\/blockquote>/i.exec(reply[0]);
			if (!re) continue;

			const info = re[1];
			const infoText = info.replace(/<\/?[\w\-:]+(\s+[\w\-:]+\s*=\s*"[^"]*")*[^>]*>/g, '');
			const comment = re[2];
			const replyNode = element(repliesNode, 'reply');
			let number;

			// number
			re = /No\.(\d+)/i.exec(infoText);
			if (re) {
				number = re[1];
				const numberNode = element(replyNode, 'number');
				numberNode.appendChild(text(re[1]));
				re = /^(\d*?)((\d)\3+)$/.exec(number);
				if (re) {
					numberNode.setAttribute('lead', re[1]);
					numberNode.setAttribute('trail', re[2]);
				}
			}

			// deletion flag
			re = /<table[^>]*class="deleted"[^>]*>/i.exec(info);
			if (re) {
				element(replyNode, 'deleted');
			}

			// ID
			if (/<span\s+class="cnw"[^>]*>(.+?)<\/span>/.test(info)
			&& (re = /ID:(\S+)/.exec(RegExp.$1))) {
				const idNode = element(replyNode, 'user_id');
				idNode.appendChild(text(stripTags(re[1])));
				postStats.notifyId(number, re[1]);
			}

			// IP
			re = /IP:([a-zA-Z0-9_*:.\-()]+)/.exec(infoText);
			if (re) {
				const ipNode = element(replyNode, 'ip');
				ipNode.appendChild(text(re[1]));
			}

			// mark
			re = /(\[|dice\d+d\d+(?:[-+]\d+)?=)?<font\s+color="#ff0000">(.+?)<\/font>\]?/i.exec(comment);
			if (re && (!re[1] || re[1].substr(-1) !== '=')) {
				if (!$qs('deleted', replyNode)) {
					element(replyNode, 'deleted');
				}

				const markNode = element(replyNode, 'mark');
				if (re[0].charAt(0) === '[' && re[0].substr(-1) === ']') {
					markNode.setAttribute('bracket', 'true');
				}
				re[2] = stripTags(re[2]);
				markNode.appendChild(text(re[2]));
				postStats.notifyMark(number, re[2]);
			}

			// そうだね (that's right)
			re = /<a[^>]+class="sod"[^>]*>([^<]+)<\/a>/i.exec(info);
			if (re) {
				const sodaneNode = element(replyNode, 'sodane');
				if (/x\s*([1-9][0-9]*)/.test(re[1])) {
					const sodaneValue = RegExp.$1;
					sodaneNode.appendChild(text(sodaneValue));
					sodaneNode.setAttribute('class', 'sodane');
					postStats.notifySodane(number, sodaneValue);
				}
				else {
					sodaneNode.appendChild(text(SODANE_NULL_MARK));
					sodaneNode.setAttribute('class', 'sodane-null');
					postStats.notifySodane(number, 0);
				}
			}

			// offset
			re = /<span[^>]+class="rsc"[^>]*>([^<]+)<\/span>/i.exec(info);
			if (re) {
				element(replyNode, 'offset').appendChild(text(RegExp.$1));
			}
			else {
				element(replyNode, 'offset').appendChild(text(offset));
			}

			// skip, if we can
			if (number <= lowBoundNumber) {
				continue;
			}

			// posted date
			re = POST_DT_PATTERN.exec(info);
			if (re) {
				const postedDate = new Date(
					2000 + (re[1] - 0),
					re[2] - 1,
					re[3] - 0,
					re[4] - 0,
					re[5] - 0,
					re[6] - 0,
					0
				);
				const postDateNode = element(replyNode, 'post_date');
				postDateNode.appendChild(text(formatDateTime(postedDate, re)));
				postDateNode.setAttribute('value', postedDate.getTime());
				postDateNode.setAttribute('orig', re[0]);
			}

			// subject
			re = /<span\s+class="[^"]*csb[^"]*"[^>]*>(.+?)<\/span>/i.exec(info);
			if (re) {
				re[1] = re[1].replace(/^\s+|\s+$/g, '');
				element(replyNode, 'sub').appendChild(text(re[1]));
				subHash[re[1]] = (subHash[re[1]] || 0) + 1;
			}

			// name
			re = /<span\s+class="[^"]*cnm[^"]*"[^>]*>(.+?)<\/span>/i.exec(info);
			if (re) {
				re[1] = re[1]
					.replace(/<[^>]*>/g, '')
					.replace(/^\s+|\s+$/g, '');
				element(replyNode, 'name').appendChild(text(re[1]));
				nameHash[re[1]] = (nameHash[re[1]] || 0) + 1;
			}

			// mail address
			re = /<a[^>]+href="mailto:([^"]*)"/i.exec(info);
			if (re) {
				const emailNode = element(replyNode, 'email');
				emailNode.appendChild(text(stripTags(re[1])));
				linkify(emailNode);
			}

			// src & thumbnail url
			const imagehref = /<br><a[^>]+href="([^"]+)"[^>]*>(<img[^>]+>)<\/a>/i.exec(info);
			if (imagehref) {
				const imageNode = element(replyNode, 'image');
				const srcUrl = resolveRelativePath(imagehref[1], baseUrl);
				imageNode.appendChild(text(srcUrl));
				imageNode.setAttribute('base_name', imagehref[1].match(/[^/]+$/)[0]);

				// animated
				re = /<small[^>]*>アニメGIF\.<\/small[^>]*>|<!--AnimationGIF-->/i.exec(info);
				if (re) {
					imageNode.setAttribute('animated', 'true');
				}

				// bytes
				re = /\balt="?(\d+)\s*B/i.exec(imagehref[2]);
				if (re) {
					imageNode.setAttribute('bytes', re[1]);
					imageNode.setAttribute('size', getReadableSize(re[1]));
				}

				// thumbnail
				let thumbUrl = '', thumbWidth = false, thumbHeight = false;
				re = /\b(?:data-)?src=([^\s>]+)/i.exec(imagehref[2]);
				if (re) {
					thumbUrl = re[1].replace(/^["']|["']$/g, '');
					thumbUrl = resolveRelativePath(thumbUrl, baseUrl);
				}
				re = /\bwidth="?(\d+)"?/i.exec(imagehref[2]);
				if (re) {
					thumbWidth = re[1];
				}
				re = /\bheight="?(\d+)"?/i.exec(imagehref[2]);
				if (re) {
					thumbHeight = re[1];
				}
				if (thumbUrl !== '' && thumbWidth !== false && thumbHeight !== false) {
					const thumbNode = element(replyNode, 'thumb');
					const thumbnailSize = getThumbnailSize(thumbWidth, thumbHeight, 250, 250);
					thumbNode.appendChild(text(thumbUrl));
					thumbNode.setAttribute('width', thumbnailSize.width);
					thumbNode.setAttribute('height', thumbnailSize.height);
				}
			}

			// comment
			/*
			if (siteInfo.resno === 1262674814) {
				const topicComment = threadNode.querySelector('topic comment').textContent;
				if (offset === 2) {
					pushComment(element(replyNode, 'comment'), text,
						`<font color="#789922">&gt;${topicComment}</font><br>` +
						`test comment #1`);
				}
				else if (offset === 4) {
					pushComment(element(replyNode, 'comment'), text,
						`<font color="#789922">&gt;${topicComment}</font><br>` +
						`test comment #2`);
				}
				else {
					pushComment(element(replyNode, 'comment'), text, comment);
				}
			}
			else {
				pushComment(element(replyNode, 'comment'), text, comment);
			}
			*/
			pushComment(element(replyNode, 'comment'), text, comment);
		}

		return {
			lastReached: repliesCount < goal && !reply,
			repliesNode, repliesCount, regex
		}
	}

	function runFromJson (content, hiddenRepliesCount, isAfterPost) {
		timingLogger.startTag('createXMLGenerator#runFromJson');

		const url = location.href;
		const baseUrl = url;
		const xml = createFutabaXML('reply');
		const text = textFactory(xml);
		const enclosureNode = xml.documentElement;
		const metaNode = $qs('meta', enclosureNode);

		/*
		 * thread meta informations
		 */

		const threadNode = element(enclosureNode, 'thread');
		threadNode.setAttribute('url', baseUrl);

		/*
		 * topic informations
		 */

		const topicNode = element(threadNode, 'topic');
		const expiresNode = element(topicNode, 'expires');
		const expireDate = getExpirationDate(new Date(content.dielong));
		expiresNode.appendChild(text(content.die));
		expiresNode.setAttribute('remains', expireDate.string);
		urlStorage.memo(item => {
			item.expire = expireDate.at.getTime();
			if (isAfterPost) {
				item.count--;
				item.post++;
			}
		});
		reloadStatus.expireDate = expireDate.at;

		if (content.maxres && content.maxres !== '') {
			expiresNode.setAttribute('maxreached', 'true');
		}

		/*
		 * replies
		 */

		postStats.start();

		const repliesNode = element(threadNode, 'replies');
		let offset = hiddenRepliesCount || 0;
		for (const replyNumber in content.res) {
			const reply = content.res[replyNumber];

			offset++;
			const replyNode = element(repliesNode, 'reply');

			// number
			{
				const numberNode = element(replyNode, 'number');
				numberNode.appendChild(text(replyNumber));

				let re = /^(\d*?)((\d)\3+)$/.exec(replyNumber);
				if (re) {
					numberNode.setAttribute('lead', re[1]);
					numberNode.setAttribute('trail', re[2]);
				}
			}

			// deletion flag, mark
			{
				let re;
				if (reply.host) {
					re = [
						`[<font color="#ff0000">${reply.host}</font>]`,
						`[<font color="#ff0000">${reply.host}</font>]`,
						reply.host
					];
				}
				else {
					re = /(\[|dice\d+d\d+=)?<font\s+color="#ff0000">(.+?)<\/font>\]?/i.exec(reply.com);
				}
				if (re && (!re[1] || re[1].substr(-1) !== '=')) {
					if (!$qs('deleted', replyNode)) {
						element(replyNode, 'deleted');
					}

					const markNode = element(replyNode, 'mark');
					if (re[0].charAt(0) === '[' && re[0].substr(-1) === ']') {
						markNode.setAttribute('bracket', 'true');
					}
					re[2] = stripTags(re[2]);
					markNode.appendChild(text(re[2]));
					postStats.notifyMark(replyNumber, re[2]);
				}
			}

			// ID
			if (reply.id !== '') {
				const id = reply.id.replace(/^id:\s*/i, '');
				if (/^ip:\s*/i.test(id)) {
					const ipNode = element(replyNode, 'ip');
					ipNode.appendChild(text(id.replace(/^ip:\s*/i, '')));
				}
				else {
					const idNode = element(replyNode, 'user_id');
					idNode.appendChild(text(id));
					postStats.notifyId(replyNumber, id);
				}
			}

			// sodane
			if (content.dispsod - 0) {
				const sodaneNode = element(replyNode, 'sodane');
				if (replyNumber in content.sd) {
					sodaneNode.appendChild(text(content.sd[replyNumber]));
					sodaneNode.setAttribute('class', 'sodane');
				}
				else {
					sodaneNode.appendChild(text(SODANE_NULL_MARK));
					sodaneNode.setAttribute('class', 'sodane-null');
				}
			}

			// offset
			element(replyNode, 'offset').appendChild(text(reply.rsc));

			// posted date
			{
				const postedDate = new Date(reply.tim - 0);
				const postedDateText = reply.now.replace(/<[^>]*>/g, '');
				const postDateNode = element(replyNode, 'post_date');
				postDateNode.appendChild(text(formatDateTime(postedDate, [postedDateText])));
				postDateNode.setAttribute('value', postedDate.getTime());
				postDateNode.setAttribute('orig', postedDateText);
			}

			// subject and name
			if (content.dispname - 0) {
				if (reply.sub !== '') {
					element(replyNode, 'sub').appendChild(text(reply.sub));
					siteInfo.subHash[reply.sub] = (siteInfo.subHash[reply.sub] || 0) + 1;
				}

				if (reply.name !== '') {
					element(replyNode, 'name').appendChild(text(reply.name));
					siteInfo.nameHash[reply.name] = (siteInfo.nameHash[reply.name] || 0) + 1;
				}
			}

			// mail address
			if (reply.email !== '') {
				const emailNode = element(replyNode, 'email');
				emailNode.appendChild(text(stripTags(reply.email)));
				linkify(emailNode);
			}

			// src & thumbnail url
			if (reply.ext !== '') {
				const imageNode = element(replyNode, 'image');
				const srcUrl = resolveRelativePath(reply.src, baseUrl);
				imageNode.appendChild(text(srcUrl));
				imageNode.setAttribute('base_name', reply.src.match(/[^/]+$/)[0]);

				// animated
				if (/<!--AnimationGIF-->/i.test(reply.now)) {
					imageNode.setAttribute('animated', 'true');
				}

				// bytes
				{
					imageNode.setAttribute('bytes', reply.fsize);
					imageNode.setAttribute('size', getReadableSize(reply.fsize));
				}

				// thumbnail
				if (reply.thumb !== '') {
					let thumbUrl = resolveRelativePath(reply.thumb, baseUrl);

					const thumbNode = element(replyNode, 'thumb');
					const thumbnailSize = getThumbnailSize(reply.w, reply.h, 250, 250);
					thumbNode.appendChild(text(thumbUrl));
					thumbNode.setAttribute('width', thumbnailSize.width);
					thumbNode.setAttribute('height', thumbnailSize.height);
				}
			}

			pushComment(element(replyNode, 'comment'), text, reply.com);
		}

		/*
		 * sodane
		 */

		if (content.dispsod - 0) {
			for (const n in content.sd) {
				postStats.notifySodane(n, content.sd[n]);
			}
		}

		repliesNode.setAttribute('total', offset);
		repliesNode.setAttribute('hidden', hiddenRepliesCount);
		setDefaultSubjectAndName(xml, text, metaNode, siteInfo.subHash, siteInfo.nameHash);

		if (devMode && ($qs('[data-href="#toggle-dump-xml"]') || {}).checked) {
			console.log(serializeXML(xml));
		}

		return {delta: offset - hiddenRepliesCount, xml};
	}

	function remainingReplies (context, maxReplies, lowBoundNumber, callback1, callback2) {
		timingLogger.startTag('createXMLGenerator#remainingReplies');

		const url = location.href;

		function main () {
			timingLogger.startTag('creating fragment of replies');
			const xml = createFutabaXML('reply');
			const text = textFactory(xml);
			const result = fetchReplies(
				context[0].content,
				context[0].regex,
				context[0].repliesCount,
				maxReplies,
				lowBoundNumber,
				element(xml.documentElement, 'thread'),
				siteInfo.subHash, siteInfo.nameHash, url);

			result.repliesNode.setAttribute('total', result.repliesCount);
			result.repliesNode.setAttribute('hidden', context[0].repliesCount);
			setDefaultSubjectAndName(xml, text, $qs('meta', xml.documentElement), siteInfo.subHash, siteInfo.nameHash);
			timingLogger.endTag();

			timingLogger.startTag('intermediate call back');
			callback1(xml, context[0].index, result.repliesCount, context[0].repliesCount);
			timingLogger.endTag();

			const lastIndex = context[0].regex.lastIndex;
			if (!result.lastReached && context[0].regex.exec(context[0].content)) {
				context[0].regex.lastIndex = lastIndex;
				context[0].repliesCount = result.repliesCount;
			}
			else {
				context.shift();
			}

			if (context.length) {
				setTimeout(main, REST_REPLIES_PROCESS_INTERVAL);
			}
			else {
				timingLogger.startTag('final call back');
				callback2();
				timingLogger.endTag();

				timingLogger.endTag();
			}
		}

		if (context.length) {
			main();
		}
		else {
			timingLogger.startTag('final calling back');
			callback2();
			timingLogger.endTag();

			timingLogger.endTag();
		}
	}

	return {run, remainingReplies, runFromJson};
}

function createPersistentStorage () {
	/*
	 * NOTE: the 'desc' property will be treated as HTML fragment.
	 */
	const data = {
		wheel_reload_unit_size: {
			type: 'int',
			value: 120
		},
		wheel_reload_threshold_override: {
			type: 'int',
			value: 3,
			min: 1
		},
		catalog_popup_enabled: {
			type: 'bool',
			value: true
		},
		catalog_text_max_length: {
			type: 'int',
			value: CATALOG_TEXT_MAX_LENGTH,
			min: 0
		},
		catalog_thumbnail_scale: {
			type: 'float',
			value: 1.0,
			min: 1.0, max: 2.0
		},
		storage: {
			type: 'list',
			value: 'fsa',
			list: {
				'fsa': 0,
				'dropbox': 1,
				'googledrive': 2,
				'onedrive': 3,
				'local': 4
			}
		},
		save_thread_name_template: {
			type: 'string',
			value: '$SERVER/$BOARD/$THREAD.$EXT'
		},
		save_image_kokoni_name_template: {
			type: 'string',
			value: '$SERVER-$BOARD-$SERIAL.$EXT',
		},
		save_image_name_template: {
			type: 'string',
			value: '$SERVER/$BOARD/$SERIAL.$EXT'
		},
		save_image_text_max_length: {
			type: 'int',
			value: 50,
			min: 10, max: 100
		},
		auto_save_image: {
			type: 'bool',
			value: false,
		},
		save_image_bell_volume: {
			type: 'int',
			value: 50,
			min: 0, max: 100
		},
		lightbox_enabled: {
			type: 'bool',
			value: true,
		},
		lightbox_zoom_mode: {
			type: 'list',
			value: 'whole',
			list: {
				'whole': 0,
				'actual-size': 1,
				'fit-to-width': 2,
				'fit-to-height': 3,
				'last': 4
			}
		},
		banner_enabled: {
			type: 'bool',
			value: true,
		},
		hook_space_key: {
			type: 'bool',
			value: true,
		},
		full_reload_interval: {
			type: 'int',
			value: 2,
			min: 0, max: 60
		},
		full_reload_after_post: {
			type: 'bool',
			value: false,
		},
		tegaki_max_width: {
			type: 'int',
			value: 400,
			min: 1,max: 1000
		},
		tegaki_max_height: {
			type: 'int',
			value: 400,
			min: 1,max: 1000
		},
		autotrack_expect_replies: {
			type: 'int',
			value: 5,
			min: 1,max: 10
		},
		autotrack_sampling_replies: {
			type: 'int',
			value: 10,
			min: 3,max: 30
		},
		osaka_conversion: {
			type: 'bool',
			value: true
		},
		strip_exif: {
			type: 'bool',
			value: true
		},
		custom_subst_leader: {
			type: 'string',
			value: ''
		}
	};
	let runtime = {
		del: {
			lastReason: ''
		},
		lightbox: {
			zoomMode: 'whole'
		},
		catalog: {
			sortOrder: 'default'
		},
		media: {
			volume: 0.2
		},
		kokoni: {
			lru: [],
			treeCache: null
		},
		coin: {
			amount: 0
		}
	};
	let onChanged;
	let saveRuntimeTimer;

	function validate (name, value) {
		if (!(name in data)) return;

		switch (data[name].type) {
		case 'int':
			value = parseInt(value, 10);
			if (isNaN(value)) return;
			if ('min' in data[name] && value < data[name].min) return;
			if ('max' in data[name] && value > data[name].max) return;
			break;
		case 'float':
			value = parseFloat(value);
			if (isNaN(value)) return;
			if ('min' in data[name] && value < data[name].min) return;
			if ('max' in data[name] && value > data[name].max) return;
			break;
		case 'bool':
			if (value === '0' || value === false) value = false;
			else if (value === '1' || value === true) value = true;
			else return;
			break;
		case 'string':
			value = '' + value;
			break;
		case 'list':
			{
				const keys = Object.keys(data[name].list);
				if (keys.indexOf(value) < 0) {
					value = keys[0];
				}
			}
			break;
		default:
			return;
		}

		return value;
	}

	function handleChanged (changes, areaName) {
		if (onChanged) {
			onChanged(changes, areaName);
		}
	}

	function saveConfig () {
		const config = {};

		for (let i in data) {
			if (data[i].value !== data[i].defaultValue) {
				config[i] = data[i].value;
			}
		}

		setSynced({config});
	}

	function assignConfig (storage) {
		if (!storage) return;

		for (let i in storage) {
			if (!(i in data)) continue;
			const value = validate(i, storage[i]);
			if (value !== undefined) {
				data[i].value = value;
			}
		}
	}

	function resetConfig () {
		for (let i in data) {
			data[i].value = data[i].defaultValue;
		}
	}

	function getAllConfig () {
		const result = {};
		for (let i in data) {
			result[i] = data[i].value;
		}
		return result;
	}

	function getAllConfigDefault () {
		const result = {};
		for (let i in data) {
			result[i] = data[i].defaultValue;
		}
		return result;
	}

	function saveRuntime () {
		if (saveRuntimeTimer) {
			clearTimeout(saveRuntimeTimer);
		}
		saveRuntimeTimer = setTimeout(() => {
			saveRuntimeTimer = undefined;
			setLocal({runtime});
		}, 1000);
	}

	function assignRuntime (storage) {
		runtime = storage;
	}

	function setSynced (items) {
		return new Promise(resolve => {
			chromeWrap.storage.onChanged.removeListener(handleChanged);
			chromeWrap.storage.sync.set(items).catch(err => {
				log(`${APP_NAME}: storage#setSynced: ${err.message}`);
			})
			.finally(() => {
				chromeWrap.storage.onChanged.addListener(handleChanged);
				resolve();
			});
		});
	}

	function setLocal (items) {
		return new Promise(resolve => {
			chromeWrap.storage.onChanged.removeListener(handleChanged);
			chromeWrap.storage.local.set(items).catch(err => {
				log(`${APP_NAME}: storage#setLocal: ${err.message}`);
			})
			.finally(() => {
				chromeWrap.storage.onChanged.addListener(handleChanged);
				resolve();
			});
		});
	}

	function assignChangedHandler (f) {
		if (typeof f === 'function') {
			onChanged = f;
		}
	}

	async function loadConfigNames () {
		const names = parseExtendJson(
			await resources.get(`_locales/${LOCALE}/configNames.json`, {expires: 1000 * 60}),
			{defaultValue: null});
		if (names) {
			for (let i in data) {
				if (i in names) {
					if ('name' in names[i]) {
						data[i].name = names[i].name;
					}
					if ('desc' in names[i]) {
						data[i].desc = names[i].desc;
					}
					if ('list' in names[i]) {
						data[i].list = names[i].list;
					}
				}
			}
		}
	}

	function init () {
		for (let i in data) {
			data[i].defaultValue = data[i].value;
		}

		chromeWrap.storage.onChanged.addListener(handleChanged);
	}

	init();
	return {
		saveConfig, assignConfig, resetConfig, getAllConfig, getAllConfigDefault,
		saveRuntime, assignRuntime,
		setSynced, setLocal, assignChangedHandler, loadConfigNames,
		get config () {return data},
		get runtime () {return runtime}
	};
}

function createTimingLogger () {
	const stack = [];
	const logs = [];
	let last = false;
	let locked = false;
	function timeOffset (now) {
		if (last === false) {
			return now;
		}
		else {
			return ('            +' + (now - last)).substr(-13);
		}
	}
	return {
		startTag: function (message, appendix) {
			if (locked) return;
			const now = Date.now();
			const item = {time: now, message};
			logs.push(
				'[start]\t' +
				timeOffset(now) + '\t' +
				'                    '.substring(0, stack.length * 2) +
				item.message +
				(appendix ? ': ' + appendix : ''));
			stack.push(item);
			last = now;
		},
		endTag: function (message) {
			if (locked) return;
			const item = stack.pop();
			if (!item) return;
			const now = Date.now();
			logs.push(
				`[done]\t` +
				`${timeOffset(now)}\t` +
				'                    '.substring(0, stack.length * 2) +
				item.message +
				(message ? (' ' + message) : '') +
				` (${(now - item.time).toFixed(4)} msecs)`);
			if (stack.length === 0) {
				devMode && console.log(`*** timing dump ***\n${this.dump()}\n\n${getVersion()}`);
				this.reset();
			}
			last = now;
			return true;
		},
		reset: function () {
			stack.length = logs.length = 0;
			last = false;
			return this;
		},
		forceEndTag: function () {
			while (this.endTag());
		},
		dump: function () {
			if (locked) return;
			return logs.join('\n');
		},
		get locked () {
			return locked;
		},
		set locked (v) {
			locked = !!v;
		}
	};
}

function createClickDispatcher () {
	const PASS_THROUGH = 'passthrough';
	const TARGET_ELEMENTS = 'a button input-checkbox input-radio'.split(/\s+/);
	const keys = {};

	function handler (e) {
		for (let t = e.target; t instanceof Element; t = t.parentNode) {
			const elementType = (t.nodeName === 'INPUT' ? `${t.nodeName}-${t.type}` : t.nodeName).toLowerCase();

			if (TARGET_ELEMENTS.includes(elementType) || 'href' in t.dataset) {
				const fragment = t.getAttribute('href') ?? t.dataset.href;

				if (/^#.+$/.test(fragment) && fragment in keys) {
					return invoke(fragment, e, t);
				}

				for (const pattern in keys) {
					if (pattern.charAt(0) === '.' && t.classList.contains(pattern.substring(1))) {
						return invoke(pattern, e, t);
					}
				}

				if (elementType in keys) {
					return invoke(elementType, e, t);
				}

				break;
			}
		}
	}

	function invoke (fragment, e, t) {
		let result;
		try {
			result = keys[fragment](e, t);
		}
		catch (err) {
			log(`${APP_NAME}: exception in clickDispatcher: ${err.stack}`);
			result = undefined;
		}

		if (e.target.closest('a') && result !== PASS_THROUGH) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	function add (key, handler) {
		keys[key] = handler;
		return this;
	}

	function remove (key) {
		delete keys[key];
		return this;
	}

	document.body.addEventListener('click', handler);

	return {add, remove, PASS_THROUGH};
}

function createKeyManager () {
	const PASS_THROUGH = 'passthrough';
	const ASIS_KEY_MAP = {
		'Backspace': '\u0008',
		'Tab': '\u0009',
		'Enter': '\u000d',
		'Escape': '\u001b',
		'Delete': '\u007f'
	};
	const CONTROL_KEY_MAP = {
		'@': '\u0000', a: '\u0001', b: '\u0002', c: '\u0003', d: '\u0004', e: '\u0005', f: '\u0006', g: '\u0007',
		h: '\u0008', i: '\u0009', j: '\u000a', k: '\u000b', l: '\u000c', m: '\u000d', n: '\u000e', o: '\u000f',
		p: '\u0010', q: '\u0011', r: '\u0012', s: '\u0013', t: '\u0014', u: '\u0015', v: '\u0016', w: '\u0017',
		x: '\u0018', y: '\u0019', z: '\u001a', '[': '\u001b', '\\': '\u001c', ']': '\u001d', '^': '\u001e', '_': '\u001f'
	};
	const STROKE_TRANSLATE_MAP = {
		' ': 'space'
	};

	const strokes = {};
	const handlers = [];

	function keydown (e) {
		if (/^(?:Control|Shift|Alt|Meta)$/.test(e.key)) return;

		const stroke = getKeyStroke(e);
		const focusedNodeName = getDetailedNodeName(e.target);
		const mode = appStates[0] + (isTextInputElement(focusedNodeName) ? '.edit' : '');

		debugMode && backend.log([
			`*** keydown ***`,
			`     target: "${e.target.nodeName}"`,
			`       code: "${e.code}"`,
			`        key: "${e.key}"`,
			`isComposing: ${e.isComposing}`,
			`  modifiers: ${getModifiers(e).join(',')}`,
			` focus node: "${focusedNodeName}"`,
			`       mode: "${mode}"`,
			`     stroke: "${stroke}"`
		].join('\n'));

		/*
		 * a quick fix for an issue that Chrome failing to control input methods
		 */
		if (e.target.nodeName === 'BODY' && stroke === 'Process') {
			setBottomStatus('detect input method bug!');
			commands.activatePostForm();
			return;
		}

		if (e.isComposing) {
			if (e.ctrlKey && e.key === 'h') {
				e.preventDefault();
			}
			return;
		}

		if ((stroke === '\u000d' || stroke === '\u001b' || stroke === 'Enter' || stroke === 'Escape')
		&& isSpecialInputElement(focusedNodeName)) {
			return;
		}

		if (!(mode in strokes) || !(stroke in strokes[mode])) {
			return;
		}

		const needStart = handlers.length === 0;
		handlers.push([strokes[mode][stroke].handler, e]);
		needStart && consumeHandlers();
	}

	async function consumeHandlers () {
		while (handlers.length) {
			const [handler, e] = handlers.shift();
			let result;
			try {
				result = handler(e);
			}
			catch (err) {
				log(`${APP_NAME}: exception in keyManager: ${err.message}\n${err.stack}`);
				result = undefined;
			}
			if (result instanceof Promise) {
				e.preventDefault();
				try {
					result = await result;
				}
				catch (err) {
					log(`${APP_NAME}: exception in keyManager: ${err.message}\n${err.stack}`);
				}
			}
			else if (result !== PASS_THROUGH) {
				e.preventDefault();
			}
		}
	}

	function getModifiers (e, components = []) {
		e.shiftKey && components.push('S');
		e.ctrlKey  && components.push('C');
		e.altKey   && components.push('A');
		return components;
	}

	function getKeyStroke (e) {
		const modifierBits = (e.shiftKey ? 0x80 : 0) |
							(e.ctrlKey   ? 0x40 : 0) |
							(e.altKey    ? 0x20 : 0);
		let key = e.key;
		let result;

		switch (modifierBits) {
		case 0:
			result = ASIS_KEY_MAP[key] || key;
			break;

		case 0x40:
			// turn control character strokes with ctrl key into themselves
			result = CONTROL_KEY_MAP[key];
			break;

		case 0x80:
			// use visible characters as they are (except space)
			if (key.length === 1 && key !== ' ') {
				result = key;
				break;
			}
		}

		if (!result) {
			const components = getModifiers(e);
			components.push(STROKE_TRANSLATE_MAP[key] || key);
			result = `<${components.join('-')}>`.toLowerCase();
		}

		return result;
	}

	function getDetailedNodeName (target) {
		const el = target || document.activeElement;
		let focusedNodeName = el.nodeName.toLowerCase();
		if (focusedNodeName === 'input') {
			focusedNodeName += `.${el.type.toLowerCase()}`;
		}
		else if (el.isContentEditable) {
			focusedNodeName += '.contentEditable';
		}
		return focusedNodeName;
	}

	function isSpecialInputElement (name) {
		return /^(?:input\.(?:submit|reset|checkbox|radio|file)|button)$/.test(name);
	}

	function isTextInputElement (name) {
		return /^(?:textarea|input\.(?:text|password)|[^.]+\.contentEditable)$/.test(name);
	}

	function addStroke (mode, stroke, handler) {
		if (typeof handler !== 'function') {
			return;
		}
		if (!(mode in strokes)) {
			strokes[mode] = {};
		}
		if (!(stroke instanceof Array)) {
			stroke = [stroke];
		}
		stroke.forEach(s => {
			strokes[mode][s.toLowerCase()] = {handler};
		});
		return this;
	}

	function removeStroke (mode, stroke) {
		if (mode in strokes) {
			if (stroke === undefined) {
				delete strokes[mode];
			}
			else {
				if (!(stroke instanceof Array)) {
					stroke = [stroke];
				}
				stroke.forEach(s => {
					delete strokes[mode][s.toLowerCase()];
				});
				if (Object.keys(strokes[mode]).length === 0) {
					delete strokes[mode];
				}
			}
		}
		return this;
	}

	document.addEventListener('keydown', keydown, true);

	return {addStroke, removeStroke, PASS_THROUGH};
}

function createSound (name, volume = 50) {
	let player;
	return {
		async play (forceBackgroundPlay) {
			if (volume <= 0) return;
			if (document.hidden || forceBackgroundPlay) {
				await backend.send('play', {name, volume});
			}
			else {
				if (!player) {
					player = new Audio(
						await resources.get(`audio/${name}.mp3`, {type: 'data'})
					);
				}
				if (!player.ended) {
					player.pause();
				}
				await new Promise(resolve => {
					player.volume = volume / 100;
					player.currentTime = 0;
					player.onended = player.onerror = () => {
						player.onended = player.onerror = null;
						resolve();
					};
					player.play().catch(() => {
						// Browser's autoplay policy may deny playback
					});
				});
			}
		},
		get name () {
			return name;
		},
		get volume () {
			return volume;
		},
		set volume (v) {
			v = parseInt(v, 10);
			if (!isNaN(v) && v >= 0 && v <= 100) {
				volume = v;
			}
		}
	}
}

function createPostStats () {
	const KEY_MAP = {
		'管理人': 'admin',
		'なー': 'nar',
		'スレッドを立てた人によって削除されました': 'passive',
		'書き込みをした人によって削除されました': 'active',
		'削除依頼によって隔離されました': 'isolated'
	};

	const data = createData();
	let newData;
	let repliesCount;
	let lastStats;

	function createData () {
		return {
			marks: {
				admin: {},
				nar: {},
				passive: {},
				active: {},
				isolated: {}
			},
			otherMarks: {},
			ids: {},
			sodanes: {}
		};
	}

	function notifyMark (number, content) {
		const key = KEY_MAP[content];
		if (key) {
			if (!(number in data.marks[key])) {
				newData.marks[key][number] = 1;
			}
			data.marks[key][number] = 1;
		}
		else {
			if (!(content in data.otherMarks)) {
				data.otherMarks[content] = {};
				newData.otherMarks[content] = {};
			}
			if (!(number in data.otherMarks[content])) {
				newData.otherMarks[content] = newData.otherMarks[content] || {};
				newData.otherMarks[content][number] = 1;
			}
			data.otherMarks[content][number] = 1;
		}
	}

	function notifyId (number, id) {
		if (!(id in data.ids)) {
			data.ids[id] = {};
			newData.ids[id] = {};
		}
		if (!(number in data.ids[id])) {
			newData.ids[id] = newData.ids[id] || {};
			newData.ids[id][number] = 1;
		}
		data.ids[id][number] = 1;
	}

	function notifySodane (number, value) {
		value = value - 0;
		if (isNaN(value)) return;

		if (number in data.sodanes) {
			if (data.sodanes[number] !== value) {
				newData.sodanes[number] = [data.sodanes[number], value];
			}
			if (value) {
				data.sodanes[number] = value;
			}
			else {
				delete data.sodanes[number];
			}
		}
		else {
			if (value) {
				newData.sodanes[number] = [0, value];
				data.sodanes[number] = value;
			}
		}
	}

	function start () {
		newData = createData();
		repliesCount = getRepliesCount();
	}

	function done (dropDelta) {
		const extMarks = new Set;
		const newMarks = new Set;
		const extIds = new Set;
		const newIds = new Set;
		const currentRepliesCount = getRepliesCount();

		function getMarkData () {
			const result = new Map;

			for (let type in data.marks) {
				const item = [];
				for (let number in data.marks[type]) {
					const isNew = number in newData.marks[type];
					if (isNew) {
						newMarks.add(number);
					}
					extMarks.add(number);
					item.push({isNew, number});
				}
				result.set(type, item);
			}

			return result;
		}

		function getOtherMarkData () {
			const result = new Map;

			for (let host in data.otherMarks) {
				const item = [];
				for (let number in data.otherMarks[host]) {
					const isNew = newData.otherMarks[host] && number in newData.otherMarks[host];
					if (isNew) {
						newMarks.add(number);
					}
					extMarks.add(number);
					item.push({isNew, number});
				}
				result.set(host, item);
			}

			return result;
		}

		function getIdData () {
			const result = new Map;

			for (let id in data.ids) {
				const item = [];
				let newIdCount = 0;
				for (let number in data.ids[id]) {
					const isNew = id in newData.ids && number in newData.ids[id];
					isNew && newIdCount++;
					extIds.add(id);
					item.push({isNew, number});
				}

				if (item.length && item.length === newIdCount) {
					newIds.add(id);
				}

				result.set(id, item);
			}

			return result;
		}

		function getSodaneDelta () {
			const result = [];

			for (const number in newData.sodanes) {
				const [oldValue, value] = newData.sodanes[number];
				result.push({number, value, oldValue});
			}

			return result;
		}

		return lastStats = {
			idDisplay: siteInfo.idDisplay,

			markData: getMarkData(),
			otherMarkData: getOtherMarkData(),
			idData: getIdData(),

			count: {
				total: currentRepliesCount,
				mark: extMarks.size,
				id: extIds.size
			},

			delta: {
				total: dropDelta ? 0 : currentRepliesCount - repliesCount,
				mark: dropDelta ? 0 : newMarks.size,
				id: dropDelta ? 0 : newIds.size,
				sodane: dropDelta ? [] : getSodaneDelta()
			}
		};
	}

	function updatePanelView (stats) {
		if (pageModes[0].mode !== 'reply') return;

		function setListItemVisibility (node, value) {
			while (node && node.nodeName !== 'LI') {
				node = node.parentNode;
			}
			if (node) {
				if (value) {
					node.classList.remove('hide');
				}
				else {
					node.classList.add('hide');
				}
				return node;
			}
		}

		function outputSubHeader (container, label, count) {
			const p = container.appendChild(document.createElement('p'));
			p.classList.add('sub-header');
			p.textContent = label;

			const pp = p.appendChild(document.createElement('span'));
			pp.dataset.href = '#select';
			pp.appendChild(document.createTextNode(`(${_('stat_count', count)})`));
		}

		function outputArray (container, a) {
			for (let i = 0; i < a.length; i++) {
				container.appendChild(document.createTextNode(' '));
				const anchor = container.appendChild(document.createElement('a'));
				anchor.href = '#search-item';
				anchor.textContent = `No.${a[i].number}`;
				anchor.dataset.number = a[i].number;
				a[i].isNew && anchor.classList.add('new');
			}
		}

		if (!stats) {
			stats = lastStats;
		}

		const {markData, otherMarkData, idData} = stats;
		let container;

		// known marks
		for (let [type, item] of markData) {
			container = $(`stat-${type}`);
			if (container) {
				empty(container);
				if (item.length) {
					const li = setListItemVisibility(container, true);
					if (li) {
						const header = $qs('p span', li);
						if (header) {
							header.textContent = `(${item.length})`;
						}
					}
					outputArray(container, item);
				}
				else {
					setListItemVisibility(container, false);
				}
			}
		}

		// other marks
		container = $('stat-other');
		if (container) {
			empty(container);
			if (otherMarkData.size) {
				setListItemVisibility(container, true);
				for (let [host, item] of otherMarkData) {
					outputSubHeader(container, host, item.length);
					outputArray(container, item);
				}
			}
			else {
				setListItemVisibility(container, false);
			}
		}

		// ids
		container = $('stat-id');
		if (container) {
			empty(container);
			if (idData.size) {
				$t('stat-id-header', `(${idData.size} ID)`);
				for (let [id, item] of idData) {
					const li = container.appendChild(document.createElement('li'));
					outputSubHeader(li, id, item.length);
					const div = li.appendChild(document.createElement('div'));
					outputArray(div, item);
				}
			}
			else {
				$t('stat-id-header', '');
			}
		}
	}

	function updatePostformView (stats) {
		let marked = false;
		let identified = false;

		if (!stats) {
			stats = lastStats;
		}

		for (let i in stats.count) {
			const current = stats.count[i];
			let diff;

			if (!stats.delta || (diff = stats.delta[i]) === undefined || diff === 0) {
				$t(`replies-${i}`, current);
				$t(`pf-replies-${i}`, current);
				continue;
			}

			const s = `${current}(${diff > 0 ? '+' : ''}${diff})`;
			$t(`replies-${i}`, s);
			$t(`pf-replies-${i}`, s);

			if (i === 'mark') {
				marked = true;
			}
			else if (i === 'id') {
				identified = true;
			}
		}

		if (identified) {
			if (siteInfo.server === 'may' && siteInfo.board === 'id') {
				identified = false;
			}
			else if (siteInfo.idDisplay) {
				identified = false;
			}
		}

		if (marked) {
			sounds.detectNewMark.play();
		}

		if (identified) {
			sounds.identified.play();
		}

		return marked || identified;
	}

	function resetPostformView () {
		[
			'replies-total', 'replies-mark', 'replies-id',
			'pf-replies-total', 'pf-replies-mark', 'pf-replies-id'
		].forEach(id => {
			const e = $(id);
			if (!e) return;
			$t(e, e.textContent.replace(/\([-+]?\d+\)$/, ''));
		});
	}

	function dump (stats) {
		function mapToObject (map) {
			const result = {};
			for (const [key, value] of map) {
				result[key] = value;
			}
			return result;
		}

		if (!stats) {
			stats = lastStats;
		}

		const result = ['*** internal data ***'];
		result.push(JSON.stringify(data, null, '    '));
		result.push('*** snapshot stats ***');
		result.push(JSON.stringify(stats, (key, value) => {
			if (value instanceof Set) {
				return Array.from(value);
			}
			if (value instanceof Map) {
				return mapToObject(value);
			}
			return value;
		}, '    '));

		return result.join('\n');
	}

	return {
		start, done, notifyMark, notifyId, notifySodane, dump,
		updatePanelView, updatePostformView, resetPostformView,
		get lastStats () {return lastStats}
	};
}

function createUrlStorage () {
	function loadSlot () {
		try {
			return chromeWrap.storage.sync.get({openedThreads: []}).then(
				result => {
					const now = Date.now();
					return result.openedThreads.filter(item => item.expire > now);
				},
				err => {
					log(`${APP_NAME}: loadSlot: ${err.message}`);
					return [];
				}
			);
		}
		catch (err) {
			log(`${APP_NAME}: loadSlot: ${err.stack}`);
			throw new Error(chromeWrap.i18n.getMessage('cannot_connect_to_backend_reload'));
		}
	}

	function saveSlot (slot) {
		try {
			storage.setSynced({
				openedThreads: slot
			});

		}
		catch (err) {
			log(`${APP_NAME}: saveSlot: ${err.stack}`);
			throw new Error(chromeWrap.i18n.getMessage('cannot_connect_to_backend_reload'));
		}

		/*
		 * cookie cathists, catviews structure is
		 *
		 * histories      := historyEntries "/" hiddenEntries
		 * historyEntries := ( entry ( "-" entry)* )?
		 * hiddenEntries  := ( entry ( "-" entry)* )?
		 * entry          := [0-9]+
		 */

		const catviews = slot.reduce((result, item) => {
			const [server, board, number] = item.key.split('-');
			if (server === siteInfo.server && board === siteInfo.board) {
				result.push(number);
			}
			return result;
		}, []).join('-');
		setBoardCookie('catviews', `${catviews}/`, 100);
	}

	function indexOf (slot, key) {
		let result = -1;
		slot.some((item, i) => {
			if (item.key === key) {
				result = i;
				return true;
			}
		});
		return result;
	}

	function getKey () {
		return siteInfo.resno ?
			`${siteInfo.server}-${siteInfo.board}-${siteInfo.resno}` :
			null;
	}

	function memo (callback) {
		const key = getKey();
		if (!key) return;

		loadSlot().then(slot => {
			const index = indexOf(slot, key);
			let item;

			if (index >= 0) {
				item = slot[index];
				item.count++;
			}
			else {
				item = {expire: null, key, count: 1, post: 0};
				slot.push(item);
			}

			if (typeof callback === 'function') {
				try {
					callback(item);
				}
				catch {
					//
				}
			}

			saveSlot(slot);
		});
	}

	function getAll () { /*returns promise*/
		return loadSlot().then(slot => {
			const result = {};
			slot.forEach(item => {
				const key = item.key.split('-');
				if (siteInfo.server === key[0] && siteInfo.board === key[1]) {
					result[key[2]] = item;
				}
			});

			/*
			 * result is key(threadNumber) - value (object) object like: {
			 *   '0000000001': { ... },
			 *   '0000000002': { ... },
			 *        :
			 *        :
			 * }
			 */
			return result;
		});
	}

	return {memo, getAll};
}

function createCatalogPopup (container) {
	const popups = [];
	let timer;

	function _log () {
		//log(s);
	}

	function mover (e) {
		if (!storage.config.catalog_popup_enabled.value) return;
		if (!cursorPos.moved) return;
		_log('mover: ' + (e.target.outerHTML || '<#document>').match(/<[^>]*>/)[0]);

		let target;
		if (e.target.nodeName === 'IMG' || e.target.classList.contains('text')) {
			target = e.target;
			while (target && target.nodeName !== 'A') {
				target = target.parentNode;
			}
		}
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		if (!target) {
			_log('mover: target not found');
			closeAll();
			return;
		}

		closeAll(target);
		timer = setTimeout(target => {
			timer = null;
			for (let p = document.elementFromPoint(cursorPos.x, cursorPos.y); p; p = p.parentNode) {
				if (p === target) {
					_log('mover phase 2: target found');
					prepare(target);
					break;
				}
			}
		}, CATALOG_POPUP_DELAY, target);
	}

	function indexOf (target) {
		let result = -1;
		popups.some((item, i) => {
			if (item.target === target) {
				result = i;
				return true;
			}
		});
		return result;
	}

	function getRect (elm) {
		const rect = elm.getBoundingClientRect();
		const sl = docScrollLeft();
		const st = docScrollTop();
		return {
			left:   sl + rect.left,
			top:    st + rect.top,
			right:  sl + rect.right,
			bottom: st + rect.bottom,
			width:  rect.width,
			height: rect.height
		};
	}

	function setGeometory (elm, rect) {
		elm.style.left = rect.left + 'px';
		elm.style.top = rect.top + 'px';
		elm.style.width = rect.width + 'px';
		elm.style.height = rect.height + 'px';
	}

	function clip (rect) {
		const sl = viewportRect.left + docScrollLeft();
		const st = viewportRect.top + docScrollTop();
		const sr = sl + viewportRect.width;
		const sb = st + viewportRect.height;
		const right = rect.left + rect.width;
		const bottom = rect.top + rect.height;
		if ('left' in rect && rect.left < sl) rect.left = sl;
		if ('left' in rect && right > sr) rect.left = sr - rect.width;
		if ('top' in rect && rect.top < st) rect.top = st;
		if ('top' in rect && bottom > sb) rect.top = sb - rect.height;
	}

	function prepare (target) {
		let index = indexOf(target);
		_log('prepare: index: ' + index +
			', target: ' + ($qs('.text', target) || {textContent:''}).textContent);
		if (index >= 0) {
			_log('prepare: popup for the target already exists. exit.');
			return;
		}

		let thumbnail, text, shrinkedRect;

		const targetThumbnail = $qs('img', target);
		if (targetThumbnail && targetThumbnail.naturalWidth && targetThumbnail.naturalHeight) {
			thumbnail = document.body.appendChild(document.createElement('img'));
			thumbnail.src = targetThumbnail.src.replace('/cat/', '/thumb/');
			thumbnail.className = 'catalog-popup hide';
			thumbnail.dataset.url = target.href;
			thumbnail.addEventListener('click', (e) => {
				backend.send('open', {
					url: e.target.dataset.url,
					selfUrl: location.href
				});
			});
			shrinkedRect = getRect(targetThumbnail);
		}

		const targetText = $qs('.text', target);
		const targetCount = $qs('.info span:first-child', target);
		if (targetText || targetCount) {
			text = document.body.appendChild(document.createElement('div'));
			text.className = 'catalog-popup hide';
			if (targetText) {
				text.appendChild(document.createTextNode(targetText.dataset.text));
			}
			if (targetCount) {
				text.appendChild(document.createElement('span')).textContent = targetCount.textContent;
			}
		}

		const item = {
			state: 'initialize',
			target,
			thumbnail,
			shrinkedRect,
			text
		};
		popups.push(item);
		index = popups.length - 1;

		if (thumbnail && (!thumbnail.naturalWidth || !thumbnail.naturalHeight)) {
			let handleLoad = (e) => {
				e.target.removeEventListener('load', handleLoad);
				e.target.removeEventListener('error', handleFail);
				handleLoad = handleFail = null;
				open(target);
			};
			let handleFail = (e) => {
				e.target.removeEventListener('load', handleLoad);
				e.target.removeEventListener('error', handleFail);
				handleLoad = handleFail = null;
				open(target);
			};
			thumbnail.addEventListener('load', handleLoad);
			thumbnail.addEventListener('error', handleFail);
		}
		else {
			open(index);
		}
		_log('exit prepare');
	}

	function open (target) {
		const index = typeof target === 'number' ? target : indexOf(target);
		if (index < 0 || target >= popups.length) {
			_log(`open: index ${index} is invalid. exit.`);
			return;
		}

		const item = popups[index];
		_log(`open: ${item.text.textContent}`);
		if (item.thumbnail) {
			if (!item.zoomedRect) {
				item.zoomedRect = {
					width: item.shrinkedRect.width * CATALOG_POPUP_THUMBNAIL_ZOOM_FACTOR,
					height: item.shrinkedRect.height * CATALOG_POPUP_THUMBNAIL_ZOOM_FACTOR
				};
				item.zoomedRect.left = Math.floor(
					item.shrinkedRect.left +
					(item.shrinkedRect.width / 2) -
					(item.zoomedRect.width / 2));
				item.zoomedRect.top = item.shrinkedRect.top +
					item.shrinkedRect.height -
					item.zoomedRect.height;
				clip(item.zoomedRect);
			}
			setGeometory(item.thumbnail, item.shrinkedRect);
			item.thumbnail.classList.remove('hide');
			setTimeout(() => {
				item.thumbnail.classList.add('run');
				setGeometory(item.thumbnail, item.zoomedRect);
			}, 0);
		}
		if (item.text) {
			let rect = getRect(item.target);
			rect = {
				left: Math.floor(rect.left + (rect.width / 2) - (CATALOG_POPUP_TEXT_WIDTH / 2)),
				top: (item.shrinkedRect ? item.shrinkedRect.bottom : rect.bottom) + 8,
				width: CATALOG_POPUP_TEXT_WIDTH
			};
			clip(rect);
			item.text.style.left = rect.left + 'px';
			item.text.style.top = rect.top + 'px';
			item.text.style.width = rect.width + 'px';
			item.text.classList.remove('hide');
			setTimeout(() => {
				item.text.classList.add('run');
			}, 0);
		}
		item.state = 'running';
		_log('exit open');
	}

	function close (target) {
		const index = typeof target === 'number' ? target : indexOf(target);
		if (index < 0 || index >= popups.length) {
			_log(`close: index ${index} is invalid. exit.`);
			return;
		}

		let item = popups[index];
		if (item.state === 'closing') return;

		const handleTransitionend = e => {
			if (e && e.target) {
				removeChild(e.target);
			}
			if (item && --item.closingCount <= 0 && item.state === 'closing') {
				for (let i = 0; i < popups.length; i++) {
					if (popups[i] === item) {
						item = null;
						popups.splice(i, 1);
						break;
					}
				}
			}
		};
		_log(`close: ${item.text.textContent}`);

		let count = 0;
		if (item.thumbnail) {
			transitionend(item.thumbnail, handleTransitionend);
			setGeometory(item.thumbnail, item.shrinkedRect);
			item.thumbnail.classList.remove('run');
			count++;
		}
		if (item.text) {
			transitionend(item.text, handleTransitionend);
			item.text.classList.remove('run');
			count++;
		}
		if (count <= 0) {
			popups.splice(index, 1);
		}
		else {
			item.state = 'closing';
			item.closingCount = count;
		}
		_log('exit close');
	}

	function closeAll (except) {
		_log(`closeAll: closing ${popups.length} popup(s)`);
		const elms = [...$qsa('body > .catalog-popup')];
		for (let i = 0; i < popups.length; i++) {
			['thumbnail', 'text'].forEach(p => {
				const index = elms.indexOf(popups[i][p]);
				index >= 0 && elms.splice(index, 1);
			});
			if (popups[i].target === except) continue;
			close(i);
		}
		removeChild(elms);
	}

	function deleteAll () {
		removeChild($qsa('body > .catalog-popup'));
		popups.length = 0;
		cursorPos.moved = false;
	}

	function init () {
		container = $(container);
		if (!container) return;

		container.addEventListener('mouseover', mover);
	}

	init();
	return {closeAll, deleteAll};
}

function createQuotePopup () {
	const POOL_ID = 'quote-popup-pool';
	const ORIGIN_ID_ATTR = 'quoteOriginId';

	let cache = new Map;

	function init () {
		if (pageModes[0].mode !== 'reply') return;

		document.body.addEventListener(
			'mousemove',
			debounce(popup, QUOTE_POPUP_DELAY_MSEC));
		clickDispatcher.add('#jumpto-quote-origin', (e, t) => {
			jumpto($(t.dataset[ORIGIN_ID_ATTR]));
		})
	}

	function getPostArrayForSearch (sentinelNo) {
		const PRIOR_REPLIES = 100;

		// get reply wrap element for sentinelNo
		const replyWrap = getWrapElement($qs(`article .reply-wrap > [data-number="${sentinelNo}"]`));
		if (!replyWrap) {
			return null;
		}

		// find index of sentinel reply element
		const index = Array.prototype.indexOf.call($qs('article .replies').children, replyWrap);
		if (index < 0) {
			return null;
		}

		// build an array of posts...
		const nodes = [...$qsa('article .topic-wrap .comment')];
		const subNodes = [...$qsa(`article .reply-wrap:nth-child(-n+${index}) .comment`)];

		// in most cases, the 'quotee' post should be near the post from 'quoter'
		// post.  with that in mind, we turn over the array in PRIOR_REPLIES(100)
		// post units for performance.
		while (subNodes.length) {
			nodes.push.apply(nodes, subNodes.splice(-PRIOR_REPLIES));
		}

		return nodes;
	}

	function regalizeQuoteText (s) {
		return s
			.replace(/^\s*>\s*/, '')
			.replace(/\n\s*>\s*/g, '\n')
			.normalize('NFD');
	}

	function getQuoteTextForSearch (quoteLine, quoteComment, isSingleLine) {
		let result;
		if (isSingleLine) {
			result = quoteLine.textContent;
		}
		else {
			const r = document.createRange();
			r.selectNodeContents(quoteComment);
			for (let node = quoteLine; node; node = node.previousElementSibling) {
				if (node.nodeName === 'BR'
				&& node.nextElementSibling
				&& node.nextElementSibling.nodeName !== 'Q') {
					break;
				}
				if (node.nodeName === 'Q') {
					r.setStartBefore(node);
				}
			}
			for (let node = quoteLine; node; node = node.nextElementSibling) {
				if (node.nodeName === 'BR'
				&& node.nextElementSibling
				&& node.nextElementSibling.nodeName !== 'Q') {
					break;
				}
				if (node.nodeName === 'Q') {
					r.setEndAfter(node);
				}
			}
			result = r.toString();
		}
		return regalizeQuoteText(result);
	}

	function getDeterministicQuoteOrigin (quote, sentinelComment, sentinelWrap, sentinelNo) {
		// post number (>No.xxxxxxxx)
		if (/^>+\s*(?:no\.)?(\d+)\s*(?:\n|$)/i.test(quote.textContent)) {
			const quotedNo = RegExp.$1 - 0;
			if (quotedNo >= sentinelNo) {
				return null;
			}

			let origin = $qs([
				`article .topic-wrap[data-number="${quotedNo}"]`,
				`article .reply-wrap > [data-number="${quotedNo}"]`
			].join(','));
			if (!origin) {
				return null;
			}
			if (!origin.classList.contains('topic-wrap')) {
				origin = origin.parentNode;
			}

			let index = $qs('.no', origin);
			index = index ? index.textContent - 0 : 0;

			return {index, element: origin};
		}

		// attached file name (>xxxxxxxxxxx.xxx)
		if (/^>+\s*(\w*\d+\.\w+)/i.test(quote.textContent)) {
			const quotedFileName = RegExp.$1;
			let origin = $qs(`article a[href$="${quotedFileName}"]`);
			if (!origin) {
				return null;
			}

			let index;
			if (origin.closest('.reply-wrap')) {
				origin = getWrapElement(origin);
				index = $qs('.no', origin).textContent - 0;

				if ($qs('[data-number]', origin) === sentinelWrap) {
					return null;
				}
			}
			else {
				origin = $qs('article .topic-wrap');
				index = 0;
			}

			return {index, element: origin, quotedFileName};
		}

		return null;
	}

	function getQuoteOrigin (quote, sentinelComment, sentinelWrap, sentinelNo) {
		/*
		 * markup                          variables
		 * ============================    ========================
		 * <article>
		 *   <div.replies>
		 *     <div.reply-wrap>
		 *       <div data-number="...">   sentinelWrap, sentinelNo
		 *         <div.comment>           sentinelComment
		 *           <q>...</q>            quote
		 *         </div.comment>
		 *       </div>
		 *     </div.reply-wrap>
		 *   </div.replies>
		 * </article>
		 */

		// build sentinel text (quote block), return if cache exist
		const sentinelTexts = [getQuoteTextForSearch(quote, sentinelComment, false)];
		if (cache.has(sentinelTexts[0])) {
			const cached = cache.get(sentinelTexts[0]);
			debugMode && backend.log([
				'*** cache found from multiple quote ***',
				`cached no: ${cached.no}`,
				`sentinel no: ${sentinelNo}`
			].join('\n'));
			if (!cached || cached.no !== sentinelNo) {
				return cached;
			}
		}

		// ...and single quote line
		sentinelTexts.push(getQuoteTextForSearch(quote, sentinelComment, true));
		if (cache.has(sentinelTexts[1])) {
			const cached = cache.get(sentinelTexts[1]);
			debugMode && backend.log([
				'*** cache found from single quote ***',
				`cached no: ${cached.no}`,
				`sentinel no: ${sentinelNo}`
			].join('\n'));
			if (!cached || cached.no !== sentinelNo) {
				return cached;
			}
		}

		// get array of posts
		const nodes = getPostArrayForSearch(sentinelNo);
		if (!nodes) {
			return null;
		}

		// search for completely identical substring
		const MINIMUM_SIMILARITY = .5;
		let sentinelText;
		let result = null;
		for (let isSingle = 0; !result && isSingle < 2; isSingle++) {
			sentinelText = sentinelTexts[isSingle];

			for (let i = 0; i < nodes.length; i++) {
				if (nodes[i] === sentinelComment) continue;

				const nodeText = $qs('a', nodes[i]) ?
					regalizeQuoteText(commentToString(nodes[i])) :
					regalizeQuoteText(nodes[i].textContent);

				if (nodeText.includes(sentinelText)) {
					const element = getWrapElement(nodes[i]);
					const no = getPostNumber(element);
					result = {no, element};

					debugMode && backend.log([
						`*** exact${i ? ' single' : ''} match ***`,
						`no: ${no}`,
						`element: "${element.outerHTML.replace(/\n/g, '\\n')}"`,
						`sentinelComment: "${sentinelComment.outerHTML.replace(/\n/g, '\\n')}"`,
					].join('\n'));
					break;
				}
			}
		}

		// search using string similarity
		for (let isSingle = 0; !result && isSingle < 2; isSingle++) {
			sentinelText = sentinelTexts[isSingle];

			for (let i = 0, lastSimilarity = -1; i < nodes.length; i++) {
				if (nodes[i] === sentinelComment) continue;

				const nodeText = $qs('a', nodes[i]) ?
					regalizeQuoteText(commentToString(nodes[i])) :
					regalizeQuoteText(nodes[i].textContent);
				const similarity = getStringSimilarity(
					nodeText, sentinelText,
					{normalize: true, prefixLength: 2});

				if (similarity >= MINIMUM_SIMILARITY && similarity >= lastSimilarity) {
					const element = getWrapElement(nodes[i]);
					const no = getPostNumber(element);
					result = {no, element};
					lastSimilarity = similarity;

					debugMode && backend.log([
						`*** similar${i ? ' single' : ''} match ***`,
						`similarity: ${similarity}`,
						`no: ${no}`,
						`nodes[i]: "${element.outerHTML.replace(/\n/g, '\\n')}"`,
						`sentinelComment: "${sentinelComment.outerHTML.replace(/\n/g, '\\n')}"`,
					].join('\n'));
				}
			}
		}

		debugMode && backend.log([
			`*** setting quote cache ***`,
			`no: ${result ? result.no : null}`,
			`element: "${result ? result.element.outerHTML.replace(/\n/g, '\\n') : null}"`,
		].join('\n'));
		cache.set(sentinelText, result);

		return result;
	}

	function removePopup (sentinelComment) {
		const pool = $(POOL_ID);
		while (pool && pool.childNodes.length > 0) {
			const ch = pool.lastChild;

			if (Array.prototype.indexOf.call($qsa('.comment', ch), sentinelComment) >= 0) {
				break;
			}

			removeChild(ch);
		}
	}

	function createPopup (quoteOrigin, poolId) {
		const no = quoteOrigin.element.dataset.number ||
			$qs('[data-number]', quoteOrigin.element).dataset.number;
		quoteOrigin.element.id = `_${no}`;

		// create new popup
		const div = ($(poolId) || $(POOL_ID)).appendChild(document.createElement('div'));
		div.className = 'quote-popup';
		div.appendChild(quoteOrigin.element.cloneNode(true));

		// some tweaks for contents
		{
			const noElm = $qs('.no', div);
			if (noElm) {
				const a = document.createElement('a');
				noElm.parentNode.replaceChild(a, noElm);
				a.className = 'jumpto-quote-anchor';
				a.href = '#jumpto-quote-origin';
				a.textContent = noElm.textContent;
				a.dataset[ORIGIN_ID_ATTR] = quoteOrigin.element.id;
			}
		}

		removeChild($qsa('input[type="checkbox"], iframe, video, audio', div));

		for (const node of $qsa('img.hide', div)) {
			node.classList.remove('hide');
		}

		if (quoteOrigin.quotedFileName) {
			for (const node of $qsa('a img', div)) {
				const anchor = node.parentNode;
				if (anchor.href.endsWith(quoteOrigin.quotedFileName)) continue;

				if (anchor.nextElementSibling?.nodeName === 'BR') {
					removeChild(anchor.nextElementSibling);
				}

				removeChild(anchor);
			}
		}

		// positioning
		div.style.visibility = 'hidden';
		div.style.left = div.style.top = '0';
		const w = div.offsetWidth;
		const h = div.offsetHeight;
		const sl = docScrollLeft();
		const st = docScrollTop();
		const cw = viewportRect.width;
		const ch = viewportRect.height;
		const l = Math.max(0, Math.min(cursorPos.pagex + QUOTE_POPUP_POS_OFFSET, sl + cw - w));
		const t = Math.max(0, Math.min(cursorPos.pagey + QUOTE_POPUP_POS_OFFSET, st + ch - h));
		div.style.left = `${l}px`;
		div.style.top = `${t}px`;
		div.style.visibility = '';

		return div;
	}

	function popup () {
		const element = document.elementFromPoint(cursorPos.x, cursorPos.y);
		const q = element?.closest('q');
		const comment = element?.closest('.comment');
		const wrap = element?.closest(':not(.topic-wrap)[data-number]');

		if (q && comment && wrap && /\S/.test(q.textContent)) {
			const no = getPostNumber(wrap);
			const quoteOrigin = getDeterministicQuoteOrigin(q, comment, wrap, no)
				|| getQuoteOrigin(q, comment, wrap, no);
			if (quoteOrigin) {
				removePopup(wrap.closest('.quote-popup') ? comment : null);
				createPopup(quoteOrigin);
				return;
			}
		}

		if (element) {
			const quotePopupContainer = element.closest('.quote-popup');
			if (quotePopupContainer) {
				removePopup($qs('.comment', quotePopupContainer));
				return;
			}
		}

		removePopup();
	}

	function jumpto (target) {
		target = $(target);
		if (!target) return;
		if (!target.classList.contains('topic-wrap')
		&& !target.classList.contains('reply-wrap')) return;

		target.classList.add('highlight');
		const st = docScrollTop();
		const y = Math.max(0, target.getBoundingClientRect().top + st - QUOTE_POPUP_HIGHLIGHT_TOP_MARGIN);
		y < st && window.scrollTo(0, y);
		removePopup();

		setTimeout(() => {
			target.classList.remove('highlight');
		}, QUOTE_POPUP_HIGHLIGHT_MSEC);
	}

	init();
	return {jumpto, createPopup};
}

function createSelectionMenu () {
	let enabled = true;
	let text;

	function init () {
		window.addEventListener('mouseup', e => {
			setTimeout(mup, 0, e);
		});

		clickDispatcher.add('.selmenu', (e, t) => {
			try {
				dispatch(t.href.match(/#ss-(.+)/)[1], text);
			}
			finally {
				window.getSelection().collapseToStart();
				text = undefined;
			}
		});
	}

	function mup () {
		if (!enabled) return;

		let element = document.elementFromPoint(cursorPos.x, cursorPos.y);
		while (element) {
			if (element.isContentEditable) return;
			element = element.parentNode;
		}

		const menu = $('selection-menu');
		if (!menu) return;

		let s = '';

		const sel = window.getSelection();
		if (sel.rangeCount) {
			s = rangeToString(sel.getRangeAt(0))
				.replace(/(?:\r\n|\r|\n)/g, '\n')
				.replace(/\n{2,}/g, '\n')
				.replace(/\n+$/, '') || '';
		}

		if (s !== '') {
			text = s;
			show(menu);
		}
		else {
			hide(menu);
		}
	}

	function show (menu) {
		menu.classList.remove('hide');
		menu.style.visibility = 'hidden';
		menu.style.left = menu.style.top = '0';

		const w = menu.offsetWidth;
		const h = menu.offsetHeight;
		const sl = docScrollLeft();
		const st = docScrollTop();
		const cw = viewportRect.width;
		const ch = viewportRect.height;
		const l = Math.max(0, Math.min(cursorPos.pagex, sl + cw - w));
		const t = Math.max(0, Math.min(cursorPos.pagey, st + ch - h));
		menu.style.left = `${l}px`;
		menu.style.top = `${t}px`;
		menu.style.visibility = '';
	}

	function hide (menu) {
		menu.classList.add('hide');
	}

	function dispatch (key, text) {
		switch (key) {
		case 'quote':
		case 'pull':
			{
				const com = $('com');
				const isQuote = /^quote\b/.test(key);
				if ($('postform-wrap').classList.contains('hover')) {
					com.focus();
					quote(com, text, isQuote);
				}
				else {
					commands.activatePostForm(`quote popup (${key})`).then(() => {
						quote(com, text, isQuote);
					});
				}
			}
			break;
		case 'join':
			{
				const com = $('com');
				const sel = window.getSelection();
				if (com && sel && sel.rangeCount) {
					const r1 = sel.getRangeAt(0);

					let start = r1.startContainer;
					for (; start; start = start.parentNode) {
						if (start.nodeType === 1) break;
					}

					let end = r1.endContainer;
					for (; end; end = end.parentNode) {
						if (end.nodeType === 1) break;
					}

					if (start && end) {
						const r2 = document.createRange();
						r2.setStartBefore(start);
						r2.setEndAfter(end);

						const result = [...$qsa('.comment', r2.cloneContents())]
							.map(getTextForJoin)
							.join('');

						commands.activatePostForm(`quote popup (${key})`).then(() => {
							quote(com, result, false);
						});
					}
					else {
						setBottomStatus(_('invalid_selection'));
					}
				}
			}
			break;

		case 'copy':
		case 'copy-with-quote':
			{
				const quoted = key === 'copy' ? text : getQuoted(text);

				if ('clipboard' in navigator) {
					navigator.clipboard.writeText(quoted);
				}
			}
			break;

		case 'google':
			open('https://www.google.com/search?hl=ja&q=$TEXT$');
			break;
		case 'google-image':
			open('https://www.google.com/search?tbm=isch&hl=ja&q=$TEXT$');
			break;
		case 'amazon':
			open('https://www.amazon.co.jp/exec/obidos/external-search?mode=blended&field-keywords=$TEXT$');
			break;
		case 'wikipedia':
			open('https://ja.wikipedia.org/wiki/%E7%89%B9%E5%88%A5:Search?search=$TEXT$&go=%E8%A1%A8%E7%A4%BA');
			break;
		case 'youtube':
			open('https://www.youtube.com/results?search_query=$TEXT$&search=Search');
			break;
		case 'twitter':
			open('https://twitter.com/search?src=typd&q=$TEXT$');
			break;
		}
	}

	function open (url) {
		url = url.replace('$TEXT$', encodeURIComponent(text).replace(/%20/g, '+'));
		backend.send('open',
			{
				url,
				selfUrl: location.href
			});
	}

	function getQuoted (s) {
		return s.split('\n')
			.map(line => `>${line}`)
			.join('\n');
	}

	function toPrintable (s) {
		return s.replace(
			/[\x00-\x1f]/g,
			$0 => {
				if ($0 === '\n') {
					return '\\n';
				}
				if ($0 === '\t') {
					return '\\t';
				}
				return '^' + String.fromCodePoint(64 + $0.codePointAt(0));
			}
		);
	}

	function quote (target, text, addPrefix) {
		target = $(target);
		if (!target) return;

		const s = (addPrefix ? getQuoted(text) : text).replace(/^\s+|\s+$/g, '');
		if (s === '') return;

		if ('value' in target) {
			target.setSelectionRange(target.value.length, target.value.length);
			execCommand('insertText', `\n${s}\n`);
		}
		else {
			console.log(toPrintable(target.innerHTML));
			const isSpecialCase = /^\s*$/.test(target.textContent)
				|| IS_GECKO && /\n$/.test(target.textContent)
				|| !IS_GECKO && /<div><br><\/div>$/.test(target.innerHTML);

			execCommand('selectAll', null);
			document.getSelection().getRangeAt(0).collapse(false);
			execCommand('insertText', (isSpecialCase ? '' : '\n') + `${s}\n`);
		}
	}

	init();
	return {
		dispatch,
		get enabled () {return enabled},
		set enabled (v) {enabled = !!enabled}
	};
}

function createFavicon () {
	const FAVICON_ID = 'dyn-favicon';
	let isLoading = false;

	function createLinkNode () {
		const link = document.head.appendChild(document.createElement('link'));
		link.setAttribute('rel', 'icon');
		link.setAttribute('id', FAVICON_ID);
		link.setAttribute('type', 'image/png');
		return link;
	}

	function overwriteFavicon (image, favicon) {
		image = $(image);
		if (!image) return;
		if (image.naturalWidth === 0 || image.naturalHeight === 0) return;

		favicon = $(favicon);
		if (!favicon) return;

		const w = 16;
		const h = 16;
		const factor = 3;
		const canvas = document.createElement('canvas');
		canvas.width = w * factor;
		canvas.height = h * factor;
		const c = canvas.getContext('2d');
		c.fillStyle = '#000000';
		c.fillRect(0, 0, canvas.width, canvas.height);
		const clipSize = Math.min(image.width, image.height);
		c.drawImage(image,
			image.width / 2 - clipSize / 2,
			image.height / 2 - clipSize / 2,
			clipSize, clipSize, 0, 0, canvas.width, canvas.height);

		const ps = c.getImageData(0, 0, w * factor, h * factor);
		let pd;
		if (window.unsafeWindow && window.unsafeWindow.ImageData) {
			pd = new window.unsafeWindow.ImageData(w, h);
		}
		else if (c.createImageData) {
			pd = c.createImageData(w, h);
		}
		else if (window.ImageData) {
			pd = new window.ImageData(w, h);
		}

		if (pd) {
			const factorPower = Math.pow(factor, 2);
			for (let i = 0; i < h; i++) {
				for (let j = 0; j < w; j++) {
					const avg = [0, 0, 0, 0];

					for (let k = 0; k < factor; k++) {
						for (let l = 0; l < factor; l++) {
							avg[0] += ps.data[((i * factor + k) * w * factor + (j * factor + l)) * 4 + 0];
							avg[1] += ps.data[((i * factor + k) * w * factor + (j * factor + l)) * 4 + 1];
							avg[2] += ps.data[((i * factor + k) * w * factor + (j * factor + l)) * 4 + 2];
							avg[3] += ps.data[((i * factor + k) * w * factor + (j * factor + l)) * 4 + 3];
						}
					}

					for (let k = 0; k < 4; k++) {
						avg[k] = Math.floor(avg[k] / factorPower);
						avg[k] += (255 - avg[k]) / 8;
						pd.data[(i * w + j) * 4 + k] = Math.min(255, avg[k]);
					}
				}
			}

			canvas.width = w;
			canvas.height = h;
			canvas.getContext('2d').putImageData(pd, 0, 0);
			favicon.href = canvas.toDataURL('image/png');
		}
	}

	function update () {
		if (isLoading) return;

		const link = $(FAVICON_ID);
		if (link) return;

		switch (pageModes[0].mode) {
		case 'summary':
		case 'catalog':
			isLoading = true;
			resources.get(
				`/images/board/${siteInfo.server}-${siteInfo.board}.png`,
				{type: 'data'}
			).then(data => {
				if (data) {
					createLinkNode().href = data.replace(
						/^data:[^,]+/, 'data:image/png;base64');
				}
				isLoading = false;
			});
			break;

		case 'reply':
			{
				let thumb = $qs('article:nth-of-type(1) img');
				if (!thumb) break;

				let re = /^[^:]+:\/\/([^/]+)/.exec(thumb.src);
				if (!re) break;

				// thumbnail exists in the same domain as the document?
				if (re[1] === location.host) {
					// yes: use thumbnail directly
					if (thumb.naturalWidth && thumb.naturalHeight) {
						overwriteFavicon(thumb, createLinkNode());
					}
					else {
						isLoading = true;
						thumb.onload = () => {
							overwriteFavicon(thumb, createLinkNode());
							isLoading = false;
							thumb = thumb.onload = null;
						};
					}
				}

				// no: transform thumbnail url
				else {
					isLoading = true;
					getImageFrom(thumb.src).then(img => {
						if (img) {
							overwriteFavicon(img, createLinkNode());
						}
						isLoading = false;
					});
				}
			}
			break;
		}
	}

	function init () {
	}

	init();
	return {update};
}

function createHistoryStateWrapper () {
	let popstateHandler;
	return {
		setHandler: handler => {
			popstateHandler = handler;
			window.addEventListener('popstate', popstateHandler);
		},
		pushState: url => {
			window.history.pushState(null, '', url);
			popstateHandler();
		},
		updateHash: hash => {
			if (hash !== '') {
				hash = '#' + hash.replace(/^#/, '');
			}
			const url = `${location.protocol}//${location.host}${location.pathname}${hash}${location.search}`;

			if (url !== location.href) {
				backend.send('notify-hashchange');
				window.history.replaceState(null, '', url);
			}
		}
	};
}

function createScrollManager (frequencyMsecs) {
	const listeners = [];
	let lastScrollTop = 0;
	let timer;

	function handleScroll () {
		lastScrollTop = docScrollTop();

		if (timer) return;

		timer = setTimeout(() => {
			timer = null;
			listeners.forEach(listener => {
				try {
					listener();
				}
				catch {
					//
				}
			});
		}, frequencyMsecs);
	}

	function addEventListener (listener) {
		const index = listeners.indexOf(listener);
		if (index < 0) {
			listeners.push(listener);
		}
	}

	function removeEventListener (listener) {
		const index = listeners.indexOf(listener);
		if (index >= 0) {
			listener.splice(index, 1);
		}
	}

	window.addEventListener('scroll', handleScroll);

	return {
		addEventListener, removeEventListener,
		get lastScrollTop () {return lastScrollTop}
	};
}

function createActiveTracker () {
	const DEFAULT_MEDIAN = 1000 * 6;
	const MEDIAN_MAX = 1000 * 60;
	const TIMER1_FREQ_MIN = Math.max(1000 * 5, NETWORK_ACCESS_MIN_INTERVAL);
	const TIMER1_FREQ_MAX = 1000 * 60 * 5;
	const TIMER2_FREQ = 1000 * 3;

	let currentState;
	let timer2;
	let baseTime;
	let waitSeconds;
	let lastMedian;
	let lastReferencedReplyNumber;

	function l (s) {
		const now = new Date;
		const time = `${now.toLocaleTimeString()}.${now.getMilliseconds()}`;
		devMode && console.log(`${time}: ${s}`);
		for (const node of $qsa('a[href="#autotrack"]')) {
			node.title = `${time}: ${s}`;
		}
	}

	function getTimeSpanText (span) {
		if (isNaN(span)) {
			return '(N/A)';
		}

		const text = [];
		if (span >= 3600) {
			//text.push(`${Math.floor(span / 3600)}${_('hour')}`);
			text.push(_('hour_short', Math.floor(span / 3600)));
			span %= 3600;
		}
		if (span >= 60) {
			//text.push(`${Math.floor(span / 60)}${_('minute')}`);
			text.push(_('min_short', Math.floor(span / 60)));
			span %= 60;
		}
		//text.push(`${span}${_('second')}`);
		text.push(_('sec_short', span));

		return text.join('');
	}

	function updateNormalLink () {
		for (const node of $qsa('a[href="#autotrack"]')) {
			$t(node, _('autotrack'));
			node.title = '';
		}
		for (const node of $qsa('.track-indicator')) {
			node.style.transitionProperty = '';
			node.style.transitionDuration = '.25s';
			node.style.width = '0px';
		}
	}

	function updateTrackingLink (restSeconds, ratio) {
		restSeconds = Math.max(0, restSeconds);
		const text = getTimeSpanText(Math.floor(restSeconds));
		const width = Math.floor($('reload-anchor').offsetWidth * Math.max(0, ratio));
		for (const node of $qsa('.track-indicator')) {
			node.style.transitionProperty = 'none';
			node.style.transitionDuration = '0s';
			node.style.width = `${width}px`;
			node.title = /^0\b/.test(text) ? _('will_reload_soon') : _('will_reload_in', text);
		}
	}

	function afterReload () {
		if (currentState !== 'reloading') {
			return;
		}

		const isValidStatus = /^[23]..$/.test(reloadStatus.lastStatus);
		const isMaxresReached =
			!!$qs('.expire-maxreached:not(.hide)')
			|| siteInfo.maxReplies >= 0 && $qsa('.replies .reply-wrap').length >= siteInfo.maxReplies;

		if (isValidStatus && !isMaxresReached) {
			setCurrentState();
			start();
		}
		else {
			stopTimer2();
			setCurrentState();
			l([
				`activeTracker:`,
				`timer cleared.`,
				`reason: unusual http status (${reloadStatus.lastStatus})`
			].join(' '));
		}
	}

	function startTimer2 () {
		if (timer2) {
			return;
		}

		l('activeTracker#startTimer2');
		timer2 = setInterval(() => {
			if (currentState !== 'running') {
				return;
			}

			const elapsedSeconds = (Date.now() - baseTime) / 1000;
			const restSeconds = waitSeconds - elapsedSeconds;
			updateTrackingLink(restSeconds, restSeconds / waitSeconds);
			if ($qs('.track-indicator').offsetWidth > 0) {
				return;
			}

			setCurrentState('reloading');
			if (pageModes[0].mode === 'reply') {
				log(`active tracker: calling reload()`);
				commands.reload({
					isAutotrack: true,
					scrollBehavior: 'always',
					ignoreWaiting: true
				});
			}
			else if (pageModes.length >= 2 && pageModes[1].mode === 'reply') {
				setCurrentState();
				start();
			}
			else {
				stopTimer2();
				setCurrentState();
				l([
					`activeTracker:`,
					`timer cleared.`,
					`reason: not a reply mode (${pageModes[0].mode})`
				].join(' '));
			}
		}, TIMER2_FREQ);
	}

	function stopTimer2 () {
		l('activeTracker#stopTimer2');
		if (timer2) {
			clearInterval(timer2);
			timer2 = undefined;
		}
		updateNormalLink();
	}

	function computeTrackFrequency () {
		const logs = [];
		let median = 0;
		let referencedReplyNumber = 0;

		const postTimes = [...$qsa(`.replies .reply-wrap:nth-last-child(-n+${storage.config.autotrack_sampling_replies.value + 1})`)].map(node => {
			referencedReplyNumber = $qs('[data-number]', node).dataset.number - 0;
			return new Date($qs('.postdate', node).dataset.value - 0);
		});

		const intervals = [];
		for (let i = 0; i < postTimes.length - 1; i++) {
			intervals.push(Math.max(1, postTimes[i + 1].getTime() - postTimes[i].getTime()));
		}

		if (intervals.length === 0 && !lastMedian) {
			median = DEFAULT_MEDIAN;
			logs.push(`frequency median set to default ${median}.`);
		}
		else if (referencedReplyNumber === lastReferencedReplyNumber) {
			median = lastMedian * 1.25;
			median = Math.floor(median / 1000) * 1000;
			median = Math.min(median, MEDIAN_MAX);
			logs.push(`number of replies has not changed. use the previous median value: ${lastMedian} -> ${median}`);
		}
		else {
			intervals.sort((a, b) => a - b);
			const medianIndex = Math.floor(intervals.length / 2);
			const tempMedian = (intervals.length % 2) ?
				intervals[medianIndex] :
				(intervals[medianIndex - 1] + intervals[medianIndex]) / 2;

			if (isNaN(lastMedian)) {
				median = tempMedian;
			}
			else if (isNaN(tempMedian)) {
				median = lastMedian * 1.25;
			}
			else {
				median = (lastMedian + tempMedian) / 2;
			}

			if (isNaN(median)) {
				median = DEFAULT_MEDIAN;
			}

			median = Math.floor(median / 1000) * 1000;
			median = Math.min(median, MEDIAN_MAX);

			logs.push(
				`  postTimes: ${postTimes.map(a => a.toLocaleTimeString()).join(', ')}`,
				`  intervals: ${intervals.map(a => `${getTimeSpanText(a / 1000)}`).join(', ')}`,
				`medianIndex: ${medianIndex}`,
				` multiplier: ${storage.config.autotrack_expect_replies.value}`,
				`   sampling: ${storage.config.autotrack_sampling_replies.value}`,
				` lastMedian: ${lastMedian} - ${getTimeSpanText(lastMedian / 1000)}`,
				` tempMedian: ${tempMedian} - ${getTimeSpanText(tempMedian / 1000)}`,
				`     median: ${median} - ${getTimeSpanText(median / 1000)}`
			);
		}

		let result = median * storage.config.autotrack_expect_replies.value;
		result = Math.min(result, TIMER1_FREQ_MAX);
		result = Math.max(result, TIMER1_FREQ_MIN);
		lastMedian = median;
		lastReferencedReplyNumber = referencedReplyNumber;

		logs.push(
			`----`,
			`result wait msecs: ${result} - ${getTimeSpanText(result / 1000)}`
		);
		l(logs.join('\n'));

		return result;
	}

	function setCurrentState (state) {
		currentState = state;
	}

	function start () {
		if (currentState) return;

		setCurrentState('preparing');

		for (const node of $qsa('a[href="#autotrack"]')) {
			$t(node, _('autotrack_enabled'));
		}

		const indicator = $qs('.track-indicator');
		indicator.style.transitionProperty = '';
		indicator.style.transitionDuration = '.25s';
		indicator.style.width = `${$('reload-anchor').offsetWidth}px`;
		transitionendp(indicator, 1000 * 0.25).then(() => {
			setCurrentState('running');
			const restMsecs = computeTrackFrequency();
			baseTime = Date.now();
			waitSeconds = restMsecs / 1000;
			startTimer2();
		})
	}

	function stop () {
		if (!currentState) return;

		currentState = undefined;
		lastMedian = lastReferencedReplyNumber = 0;
		stopTimer2();
	}

	function reset () {
		if (currentState !== 'running') return;

		l('activeTracker#reset');
		setCurrentState();
		start();
	}

	registerAfterReloadCallback(afterReload);

	return {
		start, stop, reset,
		get running () {return !!currentState}
	};
}

function createPassiveTracker () {
	const THRESHOLD_INTERVAL_MSECS = 1000 * 30;

	let expireDate;
	let timerID;

	function afterReload () {
		if (timerID) {
			try {
				clearTimeout(timerID);
			}
			catch {
				//
			}
			timerID = undefined;
		}

		if (pageModes[0].mode !== 'reply' || activeTracker.running) {
			return;
		}

		const isValidStatus = /^[23]..$/.test(reloadStatus.lastStatus);
		const isMaxresReached =
			!!$qs('.expire-maxreached:not(.hide)')
			|| siteInfo.maxReplies >= 0 && $qsa('.replies .reply-wrap').length >= siteInfo.maxReplies;

		if (isValidStatus && !isMaxresReached) {
			update(reloadStatus.expireDate);
		}
	}

	function timer () {
		timerID = undefined;

		if (pageModes[0].mode !== 'reply' || activeTracker.running) {
			update(expireDate);
		}
		else {
			log(`passive tracker: calling reload()`);
			commands.reload({
				isAutotrack: true,
				scrollBehavior: 'none',
				ignoreWaiting: true
			});
		}
	}

	function update (ed) {
		if (!(ed instanceof Date)) return;
		if (pageModes[pageModes.length - 1].mode !== 'reply') return;

		expireDate = ed;

		if (timerID) return;

		const interval = Math.max(
			THRESHOLD_INTERVAL_MSECS,
			Math.floor((expireDate.getTime() - Date.now()) / 2));

		log(`passive tracker: set next update after ${interval} msecs`);
		timerID = setTimeout(timer, interval);
	}

	registerAfterReloadCallback(afterReload);

	return {update};
}

function createTitleIndicator () {
	const BLINK_MAX = 1000 * 30;

	let timer;
	let originalTitle;
	let blinkStartAt;
	let blinkCount;

	function handleVisibilityChange () {
		if (!document.hidden) {
			stopBlink();
		}
	}

	function handleTimer () {
		if (Date.now() - blinkStartAt > BLINK_MAX) {
			stopBlink();
			return;
		}

		document.title = blinkCount++ % 2 === 0 ? originalTitle : _('thread_updated');
	}

	function startBlink () {
		if (timer) return;
		if (!document.hidden) return;

		originalTitle = document.title;
		blinkStartAt = Date.now();
		blinkCount = 0;
		timer = setInterval(handleTimer, 1000);
		sounds.trackerWorked.play();
	}

	function stopBlink () {
		if (!timer) return;

		clearInterval(timer);
		timer = undefined;
		document.title = originalTitle;
	}

	document.addEventListener('visibilitychange', handleVisibilityChange);

	return {startBlink, stopBlink};
}

function createPostingEvaluator () {
	const evalItems = [];
	const lastPostedAt = {};
	let moderated = 0;
	let deleted = 0;
	let liked = 0;

	function getLogHeader (now = new Date) {
		const hours = ('' + now.getHours()).padStart(2, '0');
		const minutes = ('' + now.getMinutes()).padStart(2, '0');
		const seconds = ('' + now.getSeconds()).padStart(2, '0');
		const ms = ('' + now.getMilliseconds()).padEnd(3, '0');
		return `[${hours}:${minutes}:${seconds}.${ms}]`;
	}

	function ensureArray (a) {
		return Array.isArray(a) ? a : [a];
	}

	function updatePostNumber (reason, postNumber, responseText) {
		let title;

		switch (reason) {
		case 'moderate':
			title = `del (${responseText})`;
			for (const node of $qsa(`[data-number="${postNumber}"] .del`)) {
				node.classList.add('posted');
				node.title = title;
			}
			break;

		case 'delete':
			//title = `deletion requested (${responseText})`;
			break;

		case 'sodane':
			{
				const newSodaneValue = parseInt(responseText, 10) || 0;
				postStats.notifySodane(postNumber, newSodaneValue);

				for (const node of $qsa([
					`[data-number="${postNumber}"] .sodane`,
					`[data-number="${postNumber}"] .sodane-null`
				].join(','))) {
					setSodaneState(node, newSodaneValue);
				}
				postStats.done();
				modifyPage();
			}
			break;
		}
	}

	function clearPostNumber (postNumber) {
		for (const node of $qsa(`article [data-number="${postNumber}"] input[type="checkbox"]:checked`)) {
			node.checked = false;
		}
	}

	function updateLastPostTime (reason, postNumber, responseText) {
		const now = new Date;
		const lead = lastPostedAt[reason] ?
			`(+${Math.floor((now.getTime() - lastPostedAt[reason].getTime()) / 1000)}s): ` :
			'';

		lastPostedAt[reason] = now;
		log(`${getLogHeader(now)} ${lead}${reason} for ${postNumber}. response: "${responseText}"`);
	}

	async function evaluateLoop () {
		function getWait (reason) {
			switch (reason) {
			case 'moderate': return 1000 * 5;
			case 'delete':   return 1000 * 1;
			case 'sodane':   return 1000 * 1;
			default:         return 1000;
			}
		}

		function wait (reason) {
			const minTime = getWait(reason);
			const elapsedTime = Date.now() - (lastPostedAt[reason]?.getTime() ?? 0);
			if (elapsedTime < minTime) {
				const waitMsecs = minTime - elapsedTime;
				return delay(waitMsecs).then(() => waitMsecs);
			}
			return Promise.resolve(0);
		}

		function printResult () {
			backend.log([
				`evaluation finished.`,
				`${moderated} moderated,`,
				`${deleted} deleted,`,
				`${liked} liked`
			].join(' '));

			const body = [];
			if (moderated) {
				body.push(_('moderated_result', moderated));
			}
			if (deleted) {
				body.push(_('deleted_result', deleted));
			}
			if (liked) {
				body.push(_('liked_result', liked));
			}
			if (body.length) {
				backend.send('notification', {
					title: _('evaluation_title'),
					body: body.join('\n')
				});
			}
		}

		while (evalItems.length) {
			try {
				const {target, items} = evalItems.shift();
				evalItems.unshift(null);

				const quantity = items.length;
				const {id, coinCharge} = quantity > 1 ?
					await backend.send('coin', {command: 'info'}) :
					{id: null, coinCharge: false};
				const needTransaction = quantity > 1 && coinCharge;

				if (quantity > 1) {
					if (!coinCharge) {
						throw new Error(_('error_coin_charge_multiple_evaluation'));
					}
					if (!id) {
						throw new Error(_('error_valid_id_multiple_evaluation'));
					}

					$('eval-stat').classList.remove('hide');
					$t($qs('#eval-stat span:nth-child(2)'), quantity);
				}

				if (needTransaction) {
					const {status} = await fetch(
						'https://appsweets.net/coin/begintrans',
						{
							method: 'POST',
							body: new URLSearchParams({app: APP_NAME, id, target, quantity})
						}).then(response => response.json());

					if (status.startsWith('error:')) {
						if (status === 'error: Not enough coins') {
							throw new Error(_('error_insufficient_coins'));
						}
						throw new Error(status);
					}
				}

				moderated = deleted = liked = 0;

				try {
					while (items.length) {
						$t($qs('#eval-stat span:nth-child(1)'), moderated + deleted + liked + 1);
						await wait(target).then(() => Promise.all([
							needTransaction ? backend.send('coin', {
								command: 'evaluate', app: APP_NAME, target
							}) : Promise.resolve(),
							items.shift()()
						]));
					}
				}
				finally {
					if (needTransaction) {
						backend.send('coin', {
							command: 'commit', app: APP_NAME, target
						});
					}
				}

				reloadStatus.lastReloaded = Date.now() - storage.config.full_reload_interval.value * 1000 * 60;
				printResult();
			}
			catch (err) {
				alert(`${_('failed_to_evaluate_posts')}\n${err.message}`);
				console.error(err);
			}
			finally {
				$('eval-stat').classList.add('hide');
				evalItems.shift();
			}
		}
	}

	function startEvaluate (target, newItems) {
		const needStartLoop = evalItems.length === 0;

		updateCheckedPostIndicator();

		evalItems.push(Object.freeze({
			target,
			items: newItems
		}));

		needStartLoop && evaluateLoop();
	}

	function moderate (postNumbers, reason, isQuick = false) {
		startEvaluate('moderate', ensureArray(postNumbers).map(pn => {
			clearPostNumber(pn);
			return async () => {
				for (const node of $qsa(`[data-number="${pn}"] .del`)) {
					node.classList.add('posted');
				}
				const result = await load(
					`${location.protocol}//${location.host}/del.php`,
					{
						method: 'POST',
						body: new URLSearchParams({
							mode: 'post',
							b: siteInfo.board,
							d: pn,
							reason,
							responsemode: 'ajax'
						})
					},
					`text;charset=${FUTABA_CHARSET}`
				);
				const text = result.error || result.content;

				!isQuick && moderated++;
				updatePostNumber('moderate', pn, text);
				updateLastPostTime('moderate', pn, text);
			};
		}));
	}

	function delete_ (postNumbers, deleteKey, imageOnly = false, isQuick = false) {
		startEvaluate('delete', ensureArray(postNumbers).map(pn => {
			clearPostNumber(pn);
			return async () => {
				const result = await load(
					`${location.protocol}//${location.host}/${siteInfo.board}/futaba.php`,
					{
						method: 'POST',
						body: new URLSearchParams({
							mode: 'usrdel',
							[pn]: 'delete',
							pwd: deleteKey,
							onlyimgdel: imageOnly ? 'on' : '',
							responsemode: 'ajax'
						})
					},
					`text;charset=${FUTABA_CHARSET}`
				);
				const text = result.error || result.content;

				!isQuick && deleted++;
				updatePostNumber('delete', pn, text);
				updateLastPostTime('delete', pn, text);
			};
		}));
	}

	function sodane (postNumbers, isQuick = false) {
		startEvaluate('sodane', ensureArray(postNumbers).map(pn => {
			clearPostNumber(pn);
			return async () => {
				clearPostNumber(pn);
				const result = await load(
					`${location.protocol}//${location.host}/sd.php?${siteInfo.board}.${pn}`,
					{}, 'text'
				);
				//const result = {content: '1000'};

				if (!result.error) {
					!isQuick && liked++;
					updatePostNumber('sodane', pn, result.content);
				}

				updateLastPostTime('sodane', pn, result.error || result.content);
			};
		}));
	}

	return {
		moderate, delete: delete_, sodane
	};
}

function createResourceSaver () {
	const ASSET_FILE_SYSTEM_NAME = 'asset';
	const THREAD_FILE_SYSTEM_NAME = 'thread';
	const savers = {};

	let resourceSaverModule;
	let fileSystemAccessModule;

	function getLocalPath (url, targetNode, template) {

		function getImageAttributes () {
			let dateAvailable = true;
			let re;

			/*
			 * image on image board of futaba server:
			 *
			 * https: *img.2chan.net/b/src/999999999.jpg
			 *         ^^^           ^     ^^^^^^^^^
			 *          1            2         3
			 */
			re = /^https?:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^/]+)\/src\/(\d+)\.([^.]+)/.exec(url);

			/*
			 * image on up/up2 of futaba server:
			 *
			 * https: *dec.2chan.net/up2/src/fu999999.jpg
			 *         ^^^           ^^^     ^^^^^^^^
			 *          1             2          3
			 */
			if (!re) {
				re = /^https?:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^/]+)\/src\/(\w+\d+)\.([^.]+)/.exec(url);
				if (re) {
					dateAvailable = false;
				}
			}

			if (re) {
				return {
					serverKey: re[1],
					boardKey: re[2],
					serial: re[3],
					extension: re[4],
					// pick up current date for images which has
					// unknown creation timestamp:
					date: dateAvailable ? new Date(re[3] - 0) : new Date
				}
			}
		}

		function sanitize (s, isComponent = false) {
			// translate newlines to space
			s = s.replace(/[\r\n\p{Zl}\p{Zp}]/ug, ' ');

			// strip control characters
			s = s.replace(/\p{C}/ug, '');

			// substitute reserved characters on Windows platform
			// @see https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions
			const trmap = {
				'<': '＜',
				'>': '＞',
				':': '꞉',	// U+A789 MODIFIER LETTER COLON
				'"': '”',
				// '/': '／',
				// '\\': '＼',
				'|': '｜',
				'?': '？',
				'*': '＊'
			};
			s = s.replace(/[<>:"|?*]/g, $0 => trmap[$0]);

			// translate multiple space like characters to space, '     ' -> ' '
			s = s.replace(/\s+/g, ' ');

			// substitute reserved device names on Windows platform
			s = s.replace(/\/(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])\b/ig, $0 => `_${$0.substring(1)}`);

			if (isComponent) {
				const trmap = {
					'/': '⁄',	// U+2044 FRACTION SLASH
					'\\': '∖'	// U+2216 SET MINUS
				};
				s = s.replace(/[/\\]/g, $0 => trmap[$0]);
			}
			else {
				// change backslash into slash, \ -> /
				s = s.replace(/\\/g, '/');

				// fold multiple slashes, ////// -> /
				s = s.replace(/\/{2,}/g, '/');

				// fold multiple dots, ...... -> .
				s = s.replace(/\.{2,}/g, '.');

				// Windows does not allow a path ending with period.
				s = s.replace(/\.$/, '');
			}

			return s;
		}

		function getThreadAttributes () {
			const result = {
				serverKey: siteInfo.server,
				boardKey: siteInfo.board,
				serial: siteInfo.resno,
				extension: 'html',
				date: siteInfo.date,
				firstCommentText: null,
				replyCommentText: null
			};

			// retrieve thread number and first comment text
			result.firstCommentText = (p => {
				if (!p) return '';

				let firstCommentText = '';
				let defaultCommentText = '';

				for (const node of $qsa('.topic-wrap', p)) {
					result.serial = node.dataset.number - 0;
				}

				for (const node of $qsa('.topic-wrap .postdate', p)) {
					result.date = new Date(node.dataset.value - 0);
				}

				[...$qsa('.comment', p)].some(node => {
					const comment = commentToString(node);
					if (/^ｷﾀ━+\(ﾟ∀ﾟ\)━+\s*!+$/.test(comment)) {
						defaultCommentText = comment;
						return false;
					}
					else {
						firstCommentText = comment;
						return true;
					}
				});

				firstCommentText = firstCommentText.split('\n');
				// if all comments are quoted line...
				if (firstCommentText.filter(line => /^\s*>/.test(line)).length === firstCommentText.length) {
					// reduce 1 quote level
					firstCommentText = firstCommentText
						.map(line => line.replace(/^\s*>/, ''));
				}

				firstCommentText = firstCommentText.filter(line => {
					// reject quote
					if (/^\s*>/.test(line)) return false;

					// reject filename
					if (/^\s*[a-z]*\d+\.[^.]+\s*$/.test(line)) return false;

					return true;
				}).join('\n');

				if (firstCommentText === '') {
					firstCommentText = defaultCommentText;
				}
				if (firstCommentText === '') {
					firstCommentText = 'ｷﾀ━━━(ﾟ∀ﾟ)━━━!!';
				}

				// sanitize
				firstCommentText = sanitize(firstCommentText, true);

				// trim surrounding spaces
				firstCommentText = firstCommentText.replace(/^\s*|\s*$/g, '');

				// limit length
				firstCommentText = substringWithStrictUnicode(
					firstCommentText,
					storage.config.save_image_text_max_length.value,
					storage.config.save_image_text_max_length.min
				);

				return firstCommentText;
			})(targetNode && targetNode.closest('article') || $qs('article'));

			// retrieve relative reply comment text
			result.replyCommentText = (p => {
				if (!p) return null;

				let replyCommentText = null;

				for (const node of $qsa('.comment', p)) {
					replyCommentText = commentToString(node);
				}

				if (!replyCommentText) return null;

				replyCommentText = replyCommentText.split('\n').filter(line => {
					// reject quote
					if (/^\s*>/.test(line)) return false;

					// reject filename
					if (/^\s*[a-z]*\d+\.[^.]+\s*$/.test(line)) return false;

					return true;
				}).join('\n');

				// sanitize
				replyCommentText = sanitize(replyCommentText, true);

				// trim surrounding spaces
				replyCommentText = replyCommentText.replace(/^\s*|\s*$/g, '');

				// limit length
				replyCommentText = substringWithStrictUnicode(
					replyCommentText,
					storage.config.save_image_text_max_length.value,
					storage.config.save_image_text_max_length.min
				);

				return replyCommentText === '' ? null : replyCommentText;
			})(targetNode && targetNode.closest('.reply-wrap'));

			return result;
		}

		const imageAttributes = getImageAttributes();
		const threadAttributes = getThreadAttributes();

		let f = template.replace(/\$([A-Z]+)\b/g, ($0, $1) => {
			switch ($1) {
			case 'SERVER':
				return siteInfo.server;
			case 'BOARD':
				return siteInfo.board;
			case 'THREAD':
				return threadAttributes.serial;
			case 'YEAR':
				return imageAttributes ?
					imageAttributes.date.getFullYear() :
					threadAttributes.date.getFullYear();
			case 'MONTH':
				return imageAttributes ?
					('00' + (imageAttributes.date.getMonth() + 1)).substr(-2) :
					('00' + (threadAttributes.date.getMonth() + 1)).substr(-2);
			case 'DAY':
				return imageAttributes ?
					('00' + (imageAttributes.date.getDate())).substr(-2) :
					('00' + (threadAttributes.date.getDate())).substr(-2);
			case 'SERIAL':
				return imageAttributes ? imageAttributes.serial : $0;
			case 'EXT':
				return imageAttributes ? imageAttributes.extension : threadAttributes.extension;
			default:
				return $0;
			}
		});

		f = sanitize(f);
		f = f.replace(/\$TEXT\b/, threadAttributes.firstCommentText);
		f = f.replace(/\$TEXT2\b/, threadAttributes.replyCommentText || threadAttributes.firstCommentText);
		f = f.replace(/^\s*|\s*$/g, '');

		return f;
	}

	async function ensureFileSystemAccessModule () {
		return fileSystemAccessModule ?? await modules('file-system-access').then(m => {
			return fileSystemAccessModule = m;
		});
	}

	async function ensureResourceSaverModule () {
		return resourceSaverModule ?? await modules('resource-saver').then(m => {
			m.setAssetURLTranslator(url => {
				return backend.send('fetch', {url}).then(result => result.dataURL);
			});
			m.setLocale(LOCALE);
			return resourceSaverModule = m;
		});
	}

	async function ensureSaver (id, coreCreatorName, wrapperCreator) {
		return savers[id] ?? await Promise.all([
			ensureFileSystemAccessModule(),
			ensureResourceSaverModule()
		]).then(([fsaModule, saverModule]) => {
			return savers[id] = wrapperCreator(
				saverModule[coreCreatorName](fsaModule.createFileSystemAccess(id, {
					logger: log
				})));
		});
	}

	function ensureFileSystemEnabled (saver, label) {
		if (location.protocol !== 'https:') {
			alert(`${label}:\n${_('not_https')}`);
			return false;
		}

		if (!saver.fileSystem.enabled) {
			alert(`${label}:\n${_('not_have_fsa')}`);
			return false;
		}

		if (storage.config.storage.value !== 'fsa') {
			alert([
				`${label}:`,
				_('no_longer_supported', storage.config.storage.value),
				_('force_local_storage')
			].join('\n'));
			return false;
		}

		return true;
	}

	async function ensureGranted (saver) {
		const id = saver.fileSystem.id;
		const permissionOnThisPage = await saver.fileSystem.queryRootDirectoryPermission(true);
		if (permissionOnThisPage.error) {
			return {error: permissionOnThisPage.error};
		}

		if (permissionOnThisPage.permission === 'granted') {
			return {granted: true};
		}

		dimmer(_('trying_to_get_fs'));
		try {
			const permissionOnSummary = await backend.send(
				'filesystem',
				{
					server: siteInfo.server,
					board: siteInfo.board,
					id
				});
			log(`ensureGranted: got auth message: ${JSON.stringify(permissionOnSummary)}`);

			if (permissionOnSummary.error) {
				return {error: permissionOnSummary.error};
			}
			else if (permissionOnSummary.foundSummary) {
				return {granted: permissionOnSummary.granted};
			}
		}
		finally {
			dimmer();
		}

		const authResultOnThisPage = await commands.openFileAccessAuthDialog(id);
		if (authResultOnThisPage.error) {
			return {error: authResultOnThisPage.error};
		}

		if ('handle' in authResultOnThisPage) {
			return {
				granted: authResultOnThisPage.handle instanceof FileSystemDirectoryHandle,
			};
		}

		return {error: 'unknown error in ensureGranted()'};
	}

	/*
	 * resource saver wrappers
	 */

	function createAssetSaverWrap (assetSaver) {
		const LABEL_SAVE = _('saving_image');
		const LABEL_DIRECTORY = _('loading_folder_tree');

		let busy = false;

		async function save (anchor, options = {}) {
			if (busy) return;
			if (anchor.dataset.imageSaved) return;
			if (!ensureFileSystemEnabled(assetSaver, LABEL_SAVE)) return;

			const url = anchor.href;
			let localPath = _getLocalPath(url, anchor, options.template);
			if (!localPath) {
				alert(`${LABEL_SAVE}:\n${_('invalid_file_name')}`);
				return;
			}

			if (typeof options.pathOverride === 'string' && options.pathOverride !== '') {
				localPath = [options.pathOverride, localPath.split('/').pop()].join('/');
			}

			busy = true;
			let originalText = anchor.textContent;
			$t(anchor, _('now_saving_image'));
			try {
				let result;

				result = await ensureGranted(assetSaver);
				if (result.error) {
					throw new Error(result.error);
				}
				else if (!result.granted) {
					alert(_('canceled'));
					return;
				}

				result = await assetSaver.save(url, localPath);
				if (result.error) {
					throw new Error(result.error);
				}

				originalText = _('saved');

				if (result.created) {
					sounds.imageSaved.volume = storage.config.save_image_bell_volume.value;
					sounds.imageSaved.play();
				}

				for (const node of $qsa(`.save-image[href="${url}"]`)) {
					$t(node, _('saving_completed'));
					node.setAttribute('title', _('saved_to', result.localPath));
					node.dataset.imageSaved = '1';
				}
			}
			catch (err) {
				log(`exception at assetSaver#save: ${Object.prototype.toString.call(err)}\n${err.stack}`);
				for (const node of $qsa(`.save-image[href="${url}"]`)) {
					$t(node, _('saving_failed'));
				}
				alert(`${LABEL_SAVE}:\n${_('saving_failed_by')}\n${err.message}`);
			}
			finally {
				await delay(1000);
				$t(anchor, originalText);
				busy = false;
			}
		}

		function getDirectoryTree () {
			return storage.runtime.kokoni.treeCache ?
				Promise.resolve(storage.runtime.kokoni.treeCache) :
				updateDirectoryTree();
		}

		async function updateDirectoryTree () {
			if (busy) return;
			if (!ensureFileSystemEnabled(assetSaver, LABEL_DIRECTORY)) return;

			busy = true;
			storage.runtime.kokoni.treeCache = null;
			try {
				let result;

				result = await ensureGranted(assetSaver);
				if (result.error) {
					throw new Error(result.error);
				}
				else if (!result.granted) {
					alert(_('canceled'));
					return;
				}

				result = await assetSaver.getDirectoryTree();
				if (result.error) {
					throw new Error(result.error);
				}

				storage.runtime.kokoni.treeCache = result.tree;
				storage.saveRuntime();
				setBottomStatus(_('updated_folder_tree'));

				return result.tree;
			}
			catch (err) {
				log(`exception at assetSaver#updateDirectoryTree: ${Object.prototype.toString.call(err)}\n${err.stack}`);
				setBottomStatus(_('update_folder_tree_failed'));
				alert(`${LABEL_DIRECTORY}:\n${_('update_folder_tree_failed')}\n${err.message}`);
			}
			finally {
				busy = false;
			}
		}

		function updateLRUList (currentItem) {
			const ACCESS_TIME_TTL = 1000 * 60 * 60;
			const TIME_RANGE_TO_FLOAT = 1000 * 60 * 5;
			const FLOAT_THRESHOLD = 3;
			const LRU_ITEM_MAX = 10;

			if (!('label' in currentItem) || currentItem.label === '') {
				return;
			}

			const list = storage.runtime.kokoni.lru;
			let found = false;
			for (let i = 0; i < list.length; i++) {
				const item = list[i];

				item.accessed = item.accessed.filter(time => {
					return Date.now() - ACCESS_TIME_TTL < time;
				});

				if (item.path === currentItem.path) {
					item.accessed.push(Date.now());

					const n = item.accessed.filter(time => {
						return Date.now() - TIME_RANGE_TO_FLOAT < time;
					}).length;

					if (n >= FLOAT_THRESHOLD && i > 0) {
						list.splice(i, 1);
						list.unshift(item);
					}

					found = true;
					break;
				}
			}

			if (!found) {
				list.unshift({
					label: currentItem.path,
					path: currentItem.path,
					accessed: [Date.now()]
				});

				while (list.length > LRU_ITEM_MAX) {
					list.pop();
				}
			}

			storage.runtime.kokoni.lru = list;
			storage.saveRuntime();
		}

		function clearLRUList () {
			storage.runtime.kokoni.lru.length = 0;
			storage.saveRuntime();
			setBottomStatus(_('save_hist_cleared'));
		}

		function _getLocalPath (url, anchor, template) {
			if (!template) {
				template = storage.config.save_image_name_template.value;
			}
			return getLocalPath(url, anchor, template);
		}

		return {
			save, getDirectoryTree, updateDirectoryTree,
			updateLRUList, clearLRUList,
			get label () {return LABEL_SAVE},
			get busy () {return busy},
			get fileSystem () {return assetSaver.fileSystem}
		};
	}

	function createThreadSaverWrap (threadSaver) {
		const LABEL = _('saving_thread');

		let busy = false;

		async function start () {
			if (busy) return;
			if (threadSaver.running) return;
			if (pageModes[0].mode !== 'reply') return;
			if (reloadStatus.lastStatus === 404) return;
			if (!ensureFileSystemEnabled(threadSaver, LABEL)) return;

			const localPath = _getLocalPath(location.href);
			if (!localPath) {
				alert(`${LABEL}:\n${_('invalid_file_name')}`);
				return;
			}

			busy = true;
			updateAnchor(_('now_saving_thread'));
			try {
				let result;

				result = await ensureGranted(threadSaver);
				if (result.error) {
					throw new Error(result.error);
				}
				else if (!result.granted) {
					stop();
					alert(_('canceled'));
					return;
				}

				result = await threadSaver.start(bootVars.bodyHTML, localPath)
				if (result.error) {
					throw new Error(result.error);
				}

				afterSave(result);
			}
			catch (err) {
				log(`exception at threadSaver#save: ${Object.prototype.toString.call(err)}\n${err.stack}`);
				stop();
				alert(`${LABEL}:\n${_('saving_failed_by')}\n${err.message}`);
			}
			finally {
				busy = false;
			}
		}

		async function push (stats) {
			if (busy) return;
			if (!threadSaver.running) return;
			if (pageModes[0].mode !== 'reply') return;

			busy = true;
			updateAnchor(_('now_adding_new_posts'));
			try {
				let result = await threadSaver.push(stats);
				if (result.error) {
					throw new Error(result.error);
				}

				afterSave(result);
			}
			catch (err) {
				log(`exception at threadSaver#push: ${err.stack}`);
				stop();
				alert(`${LABEL}:\n${_('add_new_posts_failed')}\n${err.message}`);
			}
			finally {
				busy = false;
			}
		}

		function stop () {
			if (pageModes[0].mode !== 'reply') return;

			threadSaver.stop();
		}

		function afterSave (result) {
			updateAnchor(_('autosaving_enabled'), node => {
				node.setAttribute(
					'title',
					_('autosaving_stat', result.localPath, result.lastOffset));
			});
		}

		function updateAnchor (text, callback) {
			for (const node of $qsa('a[href="#autosave"]')) {
				$t(node, text);
				callback && callback(node);
			}
		}

		function _getLocalPath (url, anchor) {
			return getLocalPath(
				url, anchor,
				storage.config.save_thread_name_template.value);
		}

		return {
			start, push, stop,
			get label () {return LABEL},
			get busy () {return busy},
			get running () {return threadSaver.running},
			get fileSystem () {return threadSaver.fileSystem}
		}
	}

	registerAfterReloadCallback(() => {
		if (savers[THREAD_FILE_SYSTEM_NAME]?.running) {
			if (reloadStatus.lastStatus === 404) {
				savers[THREAD_FILE_SYSTEM_NAME].stop();
			}
		}
	});

	return {
		asset: () => {
			return ensureSaver(
				ASSET_FILE_SYSTEM_NAME,
				'createAssetSaver',
				createAssetSaverWrap);
		},
		thread: () => {
			return ensureSaver(
				THREAD_FILE_SYSTEM_NAME,
				'createThreadSaver',
				createThreadSaverWrap);
		},
		savers: function (...ids) {
			if (ids.length === 0) {
				ids = [ASSET_FILE_SYSTEM_NAME, THREAD_FILE_SYSTEM_NAME];
			}

			return Promise.all(
				ids.map(id => {
					switch (id) {
					case ASSET_FILE_SYSTEM_NAME:
						return this.asset();
					case THREAD_FILE_SYSTEM_NAME:
						return this.thread();
					default:
						return Promise.resolve(null);
					}
				}, this))
			.then(p => p.length === 1 ? p[0] : p);
		},
		rawSavers: id => {
			return savers[id];
		}
	};
}

function createFutabaXML (mode) {
	const xml = document.implementation.createDocument(null, 'futaba', null);
	const meta = xml.documentElement.appendChild(xml.createElement('meta'));
	meta.appendChild(xml.createElement('mode'))
		.appendChild(xml.createTextNode(mode));
	meta.appendChild(xml.createElement('url'))
		.appendChild(xml.createTextNode(location.href));
	meta.appendChild(xml.createElement('version'))
		.appendChild(xml.createTextNode(version));
	meta.appendChild(xml.createElement('extension_id'))
		.appendChild(xml.createTextNode(backend.extensionId));
	return xml;
}

/*
 * <<<1 page set-up functions
 */

function setupParallax (selector) {
	let marginTop = undefined;

	function init () {
		const node = $qs(selector);
		if (!node) return;
		marginTop = node.getBoundingClientRect().top;
		scrollManager.addEventListener(handleScroll);
		handleScroll();
		setTimeout(() => {
			for (const iframe of $qsa('iframe[data-src]')) {
				iframe.src = iframe.dataset.src;
				delete iframe.dataset.src;
			}
		}, 1000 * 1);
	}

	function handleScroll () {
		const node = $qs(selector);
		if (!node) return;

		const rect = node.getBoundingClientRect();
		if (rect.height > viewportRect.height) {
			const stickyRange = rect.height - viewportRect.height + marginTop + 16;
			const scrollRange = document.documentElement.scrollHeight - viewportRect.height;
			const scrollTop = docScrollTop();
			const value = marginTop - Math.floor(scrollTop / scrollRange * stickyRange);
			node.style.top = value + 'px';
		}
		else {
			node.style.top = '';
		}
	}

	init();
}

function setupVideoViewer () {
	let timer;

	function init () {
		scrollManager.addEventListener(handleScroll);
		doit();
	}

	function handleScroll () {
		if (timer) return;
		timer = setTimeout(() => {
			timer = null;
			doit();
		}, 1000);
	}

	function doit () {
		const st = docScrollTop();
		const vt = st - viewportRect.height;
		const vb = st + viewportRect.height * 2;
		for (const node of $qsa('.inline-video')) {
			const rect = node.getBoundingClientRect();
			if (rect.bottom + st < vt
			||  rect.top + st > vb) {
				// invisible
				if (node.childNodes.length) {
					setBottomStatus(`${_('video_freed')}: ${node.parentNode.getElementsByTagName('a')[0].href}`);
					empty(node);
				}
			}
			else {
				// visible
				const markup = node.dataset.markup;
				if (markup && node.childNodes.length === 0) {
					setBottomStatus(`${_('video_loading')}: ${node.parentNode.getElementsByTagName('a')[0].href}`);
					node.insertAdjacentHTML('beforeend', markup);
				}
			}
		}
	}

	init();
}

function setupMouseHoverEvent (element, nodeName, hoverCallback, leaveCallback) {
	let lastHoverElement = null;

	function findTarget (e) {
		while (e) {
			if (e.nodeName.toLowerCase() === nodeName) return e;
			e = e.parentNode;
		}
		return null;
	}

	function mover (e) {
		const fromElement = findTarget(e.relatedTarget);
		const toElement = findTarget(e.target);
		let needInvokeHoverEvent = false;
		let needInvokeLeaveEvent = false;

		if (fromElement !== toElement) {
			// causes leave event?
			if (fromElement) {
				if (lastHoverElement !== null) {
					needInvokeLeaveEvent = true;
				}
			}

			// causes hover event?
			if (toElement) {
				if (lastHoverElement !== toElement) {
					needInvokeHoverEvent = true;
				}
			}

			// causes leave event?
			else {
				if (lastHoverElement !== null) {
					needInvokeLeaveEvent = true;
				}
			}
		}

		if (needInvokeLeaveEvent) {
			leaveCallback({target: lastHoverElement});
			lastHoverElement = null;
		}
		if (needInvokeHoverEvent) {
			hoverCallback({target: toElement});
			lastHoverElement = toElement;
		}
	}

	function mout (e) {
		const toElement = findTarget(e.relatedTarget);
		if (!toElement && lastHoverElement) {
			leaveCallback({target: lastHoverElement});
			lastHoverElement = null;
		}
	}

	element = $(element);
	if (!element) return;
	nodeName = nodeName.toLowerCase();
	hoverCallback && element.addEventListener('mouseover', mover);
	leaveCallback && element.addEventListener('mouseout', mout);
}

function setupWindowResizeEvent (frequencyMsecs, handler) {
	let timer;

	function handleResize (e) {
		if (timer) {
			clearTimeout(timer);
		}

		timer = setTimeout(e => {
			timer = null;
			try {
				handler.call(window, e);
			}
			catch (ex) {
				log(`${APP_NAME}: exception in resize handler: ${ex.stack}`);
			}
		}, frequencyMsecs, e);
	}

	window.addEventListener('resize', handleResize);
	window.addEventListener('load', handleResize, {once: true});
	handler.call(window);
}

function setupPostFormItemEvent (items) {
	const timers = {};
	const debugLines = [];
	const cache = {};

	function updateInfoCore (result, item) {
		const el = $(item.id);
		if (!el) return result;

		const cacheEntry = cache[item.id] && cache[item.id].html === el.innerHTML ?
			cache[item.id] : null;
		const contents = cacheEntry ?
			cacheEntry.contents :
			getContentsFromEditable(el).value;

		const lines = contents.replace(/[\r\n\s]+$/, '').split(/\r?\n/);
		const bytes = lines.join('\r\n').replace(/[^\u0001-\u007f\uff61-\uff9f]/g, '__').length;
		const linesOvered = item.lines ? lines.length > item.lines : false;
		const bytesOvered = item.bytes ? bytes > item.bytes : false;

		const span = $('comment-info-details').appendChild(document.createElement('span'));
		if (linesOvered || bytesOvered) {
			span.classList.add('warn');
			result = true;
		}
		$t(span, [
			item.head  ? `${item.head} ` : '',
			item.lines ? `${lines.length}/${item.lines} ${_('form_lines')}` : '',
			item.lines ? ' (' : '',
			item.bytes ? `${bytes}/${item.bytes}` : '',
			item.lines ? ')' : ''
		].join(''));

		cache[item.id] = {
			html: el.innerHTML,
			contents
		};

		return result;
	}

	function adjustTextAreaHeight (e) {
		// do nothing during composing
		if (e.type === 'input' && e.isComposing) {
			return;
		}

		const com = e.target;
		if (com.innerHTML !== '' && /^\n*$/.test(com.innerText)) {
			empty(com);
		}

		const contents = getContentsFromEditable(com);

		debugLines.push(contents.debugInfo);
		while (debugLines.length > 10) {
			debugLines.shift();
		}

		if (devMode && $qs('[data-href="#toggle-comment-log"]').checked) {
			debugLines.forEach(line => {
				console.log(line);
			});
			debugLines.length = 0;
		}

		cache[com.id] = {
			html: com.innerHTML,
			contents: contents.value
		};

		$('com2').value = contents.value;
		com.style.height = '';
		com.style.height = Math.min(com.scrollHeight, Math.floor(viewportRect.height * 0.8)) + 'px';
	}

	function updateInfo () {
		empty('comment-info-details');

		const summary = $('comment-info-summary');
		if (items.reduce(updateInfoCore, false)) {
			summary.classList.add('blink');
		}
		else {
			summary.classList.remove('blink');
		}
	}

	function register (tag, fn, e) {
		if (timers[tag]) {
			clearTimeout(timers[tag]);
			delete timers[tag];
		}
		if (typeof fn === 'function') {
			timers[tag] = setTimeout(e => {
				delete timers[tag];
				fn(e);
			}, 50, e);
		}
	}

	function isFileElementReady () {
		if (!siteInfo.canUpload) return false;

		const upfile = $('upfile');
		if (!upfile) return false;
		if (upfile.disabled) return false;
		if (upfile.dataset.pasting) return false;

		return true;
	}

	function isTegakiElementReady () {
		const baseform = document.getElementsByName('baseform')[0];
		if (!baseform) return false;
		return true;
	}

	function findAcceptableFile (files) {
		const availableTypes = /^(?:image\/(?:jpe?g|png|gif|webp)|video\/(?:webm|mp4|x-m4v))/;
		return Array.prototype.reduce.call(files, (file, f) => {
			if (file) return file;
			if (availableTypes.test(f.type)) return f;
			return null;
		}, null);
	}

	/*
	function dumpElement (head, elm, ...rest) {
		const logs = [];
		for (; elm; elm = elm.parentNode) {
			switch (elm.nodeType) {
			case 1: // ELEMENT_NODE
				{
					let result = elm.tagName;
					if (elm.id !== '') {
						result += `#${elm.id}`;
					}
					if (elm.className !== '') {
						result += '.' + elm.className.replace(/\s+/g, '.');
					}
					logs.push(result);
				}
				break;
			case 3: // TEXT_NODE
				logs.push(`"${elm.nodeValue}"`);
				break;
			case 9: // DOCUMENT_NODE
				logs.push('#document');
				break;
			default:
				logs.push(elm.nodeName);
				break;
			}
		}
		log(`${head}: ${logs.join(' → ')}: ${rest.join(' ')}`);
	}
	*/

	function pasteText (e, text) {
		execCommand('insertText', text);
	}

	async function encodeJpeg (canvas, maxSize) {
		for (let quality = 0.9; quality > 0; quality -= 0.1) {
			const result = await getBlobFrom(canvas, 'image/jpeg', quality);
			if (result.size <= maxSize) {
				return {
					blob: result,
					quality: `${Math.floor(quality * 100)}%, ${getReadableSize(result.size)}`
				};
			}
		}
		return {error: _('jpeg_encode_too_large')};
	}

	async function pasteFile (e, file) {
		if (!file) return null;

		const canUpload = isFileElementReady();
		const canTegaki = isTegakiElementReady();
		if (!canUpload && !canTegaki) return null;

		const upfile = $('upfile');

		switch (e.type) {
		case 'paste':
			upfile.dataset.pasting = '1';
			setBottomStatus(_('pasting_image'), true);
			break;

		default: // change, drop, ...
			setBottomStatus(_('generating_thumbnail'), true);
			break;
		}

		let bottomMessage = '';
		try {
			// pseudo reply image: set image to upfile
			if (!canUpload && canTegaki) {
				// only image can post as reply
				if (!file.type.startsWith('image/')) {
					bottomMessage = _('non_image_cannot_be_attached');
					return null;
				}

				// coin is required
				if (!coinCharge) {
					bottomMessage = _('error_coin_charge_paste_image');
					return null;
				}

				// draw an image from the file
				const img = await getImageFrom(file);
				if (!img) {
					bottomMessage = _('cannot_load_image');
					return null;
				}

				const canvas = $qs('#draw-wrap .draw-canvas');
				const size = getThumbnailSize(
					img.naturalWidth, img.naturalHeight,
					storage.config.tegaki_max_width.value,
					storage.config.tegaki_max_height.value);
				canvas.width = size.width;
				canvas.height = size.height;

				const c = canvas.getContext('2d');
				//c.fillStyle = '#000000';
				//c.fillRect(0, 0, canvas.width, canvas.height);
				c.clearRect(0, 0, canvas.width, canvas.height);
				c.drawImage(
					img,
					0, 0, img.naturalWidth, img.naturalHeight,
					0, 0, canvas.width, canvas.height);

				// create thumbnail
				await setPostThumbnail(
					canvas,
					file instanceof TegakiFile ? _('hand_drawing') : _('pseudo_reply_image'));

				// resize the canvas if it is larger than the specified tegaki size
				if (img.naturalWidth > storage.config.tegaki_max_width.value
				|| img.naturalHeight > storage.config.tegaki_max_height.value) {
					// return resized canvas as PseudoReplyFile instance
					return new PseudoReplyFile(
						[await getBlobFrom(canvas)],
						file.name, {type: file.type, lastModified: file.lastModified});
				}

				// no resizing required. return the file as PseudoReplyFile instance
				else {
					return new PseudoReplyFile(
						[file],
						file.name, {type: file.type, lastModified: file.lastModified});
				}
			}

			// too large file size: re-encode to jpeg, and re-asign upfile
			else if (siteInfo.maxAttachSize && file.size > siteInfo.maxAttachSize) {
				// we can not handle videos that are too large
				if (!file.type.startsWith('image/')) {
					bottomMessage = _('file_too_large');
					return null;
				}

				// draw an image from the file
				const img = await getImageFrom(file);
				if (!img) {
					bottomMessage = _('cannot_load_image');
					return null;
				}

				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;

				const c = canvas.getContext('2d');
				c.fillStyle = '#000000';
				c.fillRect(0, 0, canvas.width, canvas.height);
				c.drawImage(img, 0, 0);

				// encode as jpeg
				const encoded = await encodeJpeg(canvas, siteInfo.maxAttachSize);
				if (encoded.error) {
					bottomMessage = encoded.error;
					return null;
				}

				// create thumbnail
				await setPostThumbnail(canvas, _('re_encoded_jpeg', encoded.quality));

				// return re-encoded image as file
				return new File(
					[encoded.blob], 're-encoded-image.jpg', {
						type: 'image/jpeg'
					});
			}

			// normal upload
			else {
				await setPostThumbnail(file);
				return file;
			}
		}
		finally {
			setBottomStatus(bottomMessage);
			delete upfile.dataset.pasting;
		}
	}

	function setPastedFile (data) {
		if (data) {
			const dataTransfer = new DataTransfer;
			dataTransfer.items.add(data);
			$('upfile').files = dataTransfer.files;
			resetForm('textonly', 'baseform');
		}
		else {
			resetForm('upfile');
		}
	}

	/*
	 * drag and drop handlers
	 */

	function handleDragOver (e) {
		if (!e.dataTransfer || !e.dataTransfer.items) return;
		if (!findAcceptableFile(e.dataTransfer.items)) return;

		e.preventDefault();
		//dumpElement('    dragover', e.target);

		register('dnd', () => {
			if (!$('postform-wrap').classList.contains('hover')) {
				commands.activatePostForm('postform-wrap#dragover');
			}
			if ($('postform-drop-indicator').classList.contains('hide')) {
				$('postform-drop-indicator').classList.remove('hide');
			}
		});
	}

	function handleDragEnter (e) {
		e.preventDefault();
		//dumpElement('    dragenter', e.target);
	}

	function handleDragLeave (e) {
		//dumpElement('    dragleave', e.target, `target:${Object.prototype.toString.call(e.target)}, relatedTarget:${Object.prototype.toString.call(e.relatedTarget)}`);

		if (!e.relatedTarget) {
			register('dnd', () => {
				if ($('postform-wrap').classList.contains('hover')) {
					commands.deactivatePostForm().then(() => {
						$('postform-drop-indicator').classList.add('hide');
					});
				}
			});
		}
	}

	function handleDrop (e) {
		e.preventDefault();
		register('dnd');
		//dumpElement('    drop');
		$('postform-drop-indicator').classList.add('hide');
		handleTextAreaPaste(e);
		$('com').focus();
	}

	/*
	 * misc handlers
	 */

	function handleTextAreaPaste (e) {
		const dataTransfer = e.clipboardData || e.dataTransfer;
		if (!dataTransfer) return;

		let data;
		if (dataTransfer.files
		&& dataTransfer.files.length
		&& (data = findAcceptableFile(dataTransfer.files))) {
			e.preventDefault();
			pasteFile(e, data).then(setPastedFile);
		}
		else if ((data = dataTransfer.getData('text/plain')) !== '') {
			e.preventDefault();
			pasteText(e, data.replace(/\t/g, ' '));
		}
	}

	function handleUpfileChange (e) {
		e.preventDefault();
		pasteFile(e, e.target.files[0]).then(setPastedFile);
	}

	function registerTextAreaHeightAdjuster (e) {
		register('textarea', adjustTextAreaHeight, e);
	}

	function registerUpdateInfo (e) {
		register('input', updateInfo, e);
	}

	/*
	 * init
	 */

	items.forEach(item => {
		const el = $(item.id);
		if (!el) return;

		if (el.nodeName === 'TEXTAREA' || el.isContentEditable) {
			el.addEventListener('input', registerTextAreaHeightAdjuster);
			el.addEventListener('compositionend', adjustTextAreaHeight);
			el.addEventListener('paste', handleTextAreaPaste);
		}
		else {
			el.addEventListener('paste', registerUpdateInfo);
		}

		el.addEventListener('input', registerUpdateInfo);
	});

	document.addEventListener('dragover', handleDragOver);
	document.addEventListener('dragenter', handleDragEnter, true);
	document.addEventListener('dragleave', handleDragLeave, true);
	document.addEventListener('drop', handleDrop);

	for (const node of $qsa('#com')) {
		updateInfo();
	}

	for (const upfile of $qsa('#upfile')) {
		upfile.addEventListener('change', handleUpfileChange);
	}
}

function setupWheelReload () {
	let accum = 0;
	let lastWheeled = 0;

	function preventDefault (e) {
		/*
		 * From Chrome 73, document level wheel event will be treated as passive:
		 * https://www.chromestatus.com/features/6662647093133312
		 */
		try {
			e.preventDefault();
		}
		catch {
			//
		}
	}

	function handler (e) {
		if (e.target.classList.contains('dialog-content-wrap')) {
			preventDefault(e);
			return;
		}

		if (e.target.closest('#panel-aside-wrap')) {
			e.stopPropagation();
			return;
		}

		const now = Date.now();
		const st = docScrollTop();
		const sh = document.documentElement.scrollHeight;

		let wheelDelta = e.deltaY;

		if (wheelDelta < 0 || st < sh - viewportRect.height) {
			lastWheeled = now;
			accum = 0;
			setWheelStatus();
			return;
		}

		const factor = storage.config.wheel_reload_threshold_override.value;
		const threshold = storage.config.wheel_reload_unit_size.value * factor;

		if (wheelDelta === 0) {
			wheelDelta = threshold;
		}

		if (now - lastWheeled >= 500) {
			lastWheeled = now;
			accum = 0;
			setWheelStatus();
		}

		accum += Math.abs(wheelDelta);

		if (accum < threshold) {
			const reloadPower = Math.min(Math.floor(accum / threshold * 100), 99);
			setWheelStatus(_('reload_power', reloadPower));
			return;
		}

		lastWheeled = now;
		accum = 0;
		preventDefault(e);
		setWheelStatus();
		commands.reload();
	}

	window.addEventListener('wheel', handler, {passive: false});
}

function setupCustomEventHandler () {
	const wheelHideIntervalMsecs = 1000 * 3;
	const navHideIntervalMsecs = 1000 * 2;

	let wheelStatusHideTimer;
	let navStatusHideTimer;
	let shrinkChars;

	document.addEventListener(`${APP_NAME}.wheelStatus`, e => {
		if ($qs('#dialog-wrap:not(.hide)')) return;

		const ws = $('wheel-status');
		if (!ws) return;

		const s = e.detail.message;
		if (!s || s === '') {
			ws.classList.add('hide');
		}
		else {
			ws.classList.remove('hide');
			$t($qs('.wheel-status-text', ws), s);
			if (wheelStatusHideTimer) {
				clearTimeout(wheelStatusHideTimer);
				wheelStatusHideTimer = null;
			}
			wheelStatusHideTimer = setTimeout(() => {
				wheelStatusHideTimer = null;
				ws.classList.add('hide');
			}, wheelHideIntervalMsecs);
		}
	});

	document.addEventListener(`${APP_NAME}.bottomStatus`, e => {
		if ($qs('#dialog-wrap:not(.hide)')) return;

		const nav = $('nav-normal');
		const ns = $('nav-status');
		if (!nav || !ns) return;

		const s = e.detail.message || '';
		let persistent = !!e.detail.persistent;
		let interval = navHideIntervalMsecs;

		if (navStatusHideTimer) {
			clearTimeout(navStatusHideTimer);
			navStatusHideTimer = null;
		}

		if (s === '') {
			shrinkChars = Array.from($qs('.wheel-status-text', ns).textContent);
			persistent = false;
			interval = 0;
		}
		else {
			shrinkChars = Array.from(s);
		}

		nav.classList.add('hide');
		ns.classList.remove('hide');
		$t($qs('.wheel-status-text', ns), shrinkChars.join(''));

		if (!persistent) {
			navStatusHideTimer = setTimeout(() => {
				navStatusHideTimer = null;

				window.requestAnimationFrame(function handleShrink () {
					if (!ns.classList.contains('hide') && shrinkChars && shrinkChars.length) {
						shrinkChars.pop();
						$t($qs('.wheel-status-text', ns), shrinkChars.join(''));
						window.requestAnimationFrame(handleShrink);
					}
					else {
						nav.classList.remove('hide');
						ns.classList.add('hide');
						shrinkChars = null;
					}
				});
			}, interval);
		}
	});
}

function setupSearchResultPopup () {
	let timer;

	function hover (e) {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		timer = setTimeout(target => {
			timer = null;

			let element = document.elementFromPoint(cursorPos.x, cursorPos.y);
			while (element) {
				if (element.nodeName === 'A') break;
				element = element.parentNode;
			}

			if (element === target) {
				const panelRect = $('panel-aside-wrap').getBoundingClientRect();
				const targetRect = target.getBoundingClientRect();
				const originNumber = target.dataset.number;
				const originElement = getWrapElement($qs(`#_${originNumber}, [data-number="${originNumber}"]`));
				const popup = quotePopup.createPopup({element: originElement}, 'quote-popup-pool2');
				popup.querySelector('.comment').style = '';
				popup.style.left = (panelRect.left - 8 - popup.offsetWidth) + 'px';
				popup.style.top = Math.min(targetRect.top, viewportRect.height - popup.offsetHeight - 8) + 'px';
				popup.id = 'search-popup';
			}
		}, QUOTE_POPUP_DELAY_MSEC, e.target);
	}

	function leave () {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		removeChild('search-popup');
	}

	if (siteInfo.resno) {
		setupMouseHoverEvent('search-result', 'a', hover, leave);
		setupMouseHoverEvent('panel-content-mark', 'a', hover, leave);
	}
}

/*
 * <<<1 modal dialog functions
 */

function modalDialog (opts = {}) {
	let dialogWrap;
	let contentWrap;
	let content;
	let dimmer;
	let state = 'initializing';
	let isPending = false;
	let scrollTop = docScrollTop();

	function getRemoteController (type) {
		return {
			get type () {return type},
			get content () {return content},
			get isPending () {return isPending},
			set isPending (v) {isPending = !!v},
			initTitle, initButtons, enableButtons, disableButtonsWithout, initFromXML,
			close: () => {
				isPending = false;
				leave();
			},
			createDocument: () => {
				return document.implementation.createDocument(null, 'dialog', null);
			}
		};
	}

	function init () {
		dialogWrap = $('dialog-wrap');
		if (!dialogWrap) return;

		appStates.unshift('dialog');

		contentWrap = $qs('.dialog-content-wrap', dialogWrap);
		content = $qs('.dialog-content', dialogWrap);
		dimmer = $qs('.dimmer', dialogWrap);
		if (!contentWrap || !content || !dimmer) return;
		if (!dialogWrap.classList.contains('hide')) return;

		dialogWrap.classList.remove('hide');
		empty(content);
		empty(dimmer);
		initTitle(opts.title);
		initButtons(opts.buttons);

		const initResult = invokeEvent('init');
		if (initResult instanceof Promise) {
			initResult.then(() => {
				startTransition();
			});
		}
		else {
			startTransition();
		}
	}

	function initTitle (opt) {
		const title = $qs('.dialog-content-title', dialogWrap);
		if (!title) return;
		title.textContent = opt !== undefined ? opt : 'dialog';
	}

	function initButtons (opt) {
		const footer = $qs('.dialog-content-footer', dialogWrap);
		if (!footer) return;

		const buttons = [];

		while (footer.childNodes.length) {
			if (footer.firstChild.nodeName === 'A') {
				buttons.push(footer.firstChild);
				footer.firstChild.classList.remove('disabled');
			}
			removeChild(footer.firstChild);
		}

		(opt || '').split(/\s*,\s*/).forEach(opt => {
			buttons.forEach((button, i) => {
				if (!button) return;
				if (button.getAttribute('href') !== `#${opt}-dialog`) return;
				button.classList.remove('hide');
				footer.appendChild(button);
				buttons[i] = null;
			});
		});

		buttons.forEach(button => {
			if (!button) return;
			button.classList.add('hide');
			footer.appendChild(button);
		});
	}

	async function initFromXML (xml, xslName, bypassCache = false) {
		if (state !== 'initializing') return;
		if (isPending) return;

		isPending = true;

		let xsl;
		if (bypassCache) {
			xsl = (await load(chromeWrap.runtime.getURL(`_locales/${LOCALE}/${xslName}.xsl`), {}, 'text')).content;
		}
		else {
			xsl = await resources.get(
				`/_locales/${LOCALE}/${xslName}.xsl`,
				{expires: DEBUG_ALWAYS_LOAD_XSL ? 1 : 1000 * 60 * 60}
			);
		}

		try {
			if (!xsl) {
				log(`${APP_NAME}: xsl loading failed`);
				return;
			}

			const p = new window.XSLTProcessor;
			let f;

			try {
				xsl = (new window.DOMParser()).parseFromString(xsl, 'text/xml');
			}
			catch (e) {
				log(`${APP_NAME}: xsl parsing failed: ${e.stack}`);
				return;
			}

			try {
				p.importStylesheet(xsl);
			}
			catch (e) {
				log(`${APP_NAME}: importStylesheet failed: ${e.stack}`);
				return;
			}

			try {
				f = fixFragment(p.transformToFragment(xml, document));
			}
			catch (e) {
				log(`${APP_NAME}: transformToFragment failed: ${e.stack}`);
				return;
			}

			extractDisableOutputEscapingTags(content, f);
		}
		finally {
			isPending = false;
		}
	}

	function startTransition () {
		if (isPending) return;
		if (state !== 'initializing') return;

		clickDispatcher
			.add('#apply-dialog', handleApply)
			.add('#ok-dialog', handleOk)
			.add('#cancel-dialog', handleCancel);

		keyManager
			.addStroke('dialog', '\u001b', handleCancel)
			.addStroke('dialog', '\u000d', handleOk)
			.addStroke('dialog.edit', ['\u000d', '<S-enter>'], (e, t) => {
				if (t.nodeName !== 'TEXTAREA'
				|| !t.classList.contains('config-item')) {
					return keyManager.PASS_THROUGH;
				}
			});

		contentWrap.addEventListener('mousedown', handleMouseCancel);
		contentWrap.addEventListener('mousemove', handleMouseCancel);
		contentWrap.addEventListener('mouseup', handleMouseCancel);

		invokeEvent('open');
		state = 'running';

		setTimeout(() => {
			window.scrollTo(0, scrollTop);
			contentWrap.classList.add('run');
			dimmer.classList.add('run');
		}, 0);
	}

	function enableButtons () {
		for (const node of $qsa('.dialog-content-footer a', dialogWrap)) {
			node.classList.remove('disabled');
		}
	}

	function disableButtonsWithout (exceptId) {
		for (const node of $qsa('.dialog-content-footer a', dialogWrap)) {
			if (exceptId && node.href.indexOf(`#${exceptId}-dialog`) < 0) {
				node.classList.add('disabled');
			}
		}
	}

	function isDisabled (node) {
		let result = false;
		for (; node; node = node.parentNode) {
			if (node.nodeName === 'A') {
				break;
			}
		}
		if (node) {
			result = node.classList.contains('disabled');
		}
		return result;
	}

	function invokeEvent (eventName) {
		const handlerName = `on${eventName}`;
		if (!(handlerName in opts)) return;

		const handler = opts[handlerName];
		if (typeof handler !== 'function') return;

		try {
			return handler(getRemoteController(eventName));
		}
		catch (err) {
			log(`exception in ${eventName} event of modal dialog: ${err.stack}`);
		}
	}

	function handleApply (e) {
		if (state !== 'running') return;
		if (isDisabled(e.target)) return;
		disableButtonsWithout('apply');
		invokeEvent('apply');
	}

	function handleOk (e) {
		if (state !== 'running') return;
		if (isDisabled(e.target)) return;
		disableButtonsWithout('ok');

		let canLeave = true;
		if (opts.onok) {
			if (invokeEvent('ok') === false) {
				canLeave = false;
			}
		}
		if (canLeave) {
			leave();
		}
		else {
			enableButtons();
		}
	}

	function handleCancel (e) {
		if (state !== 'running') return;
		if (isDisabled(e.target)) return;
		disableButtonsWithout('cancel');

		let canLeave = true;
		if (opts.oncancel) {
			if (invokeEvent('cancel') === false) {
				canLeave = false;
			}
		}
		if (canLeave) {
			leave();
		}
		else {
			enableButtons();
		}
	}

	function handleMouseCancel (e) {
		if (e.target === e.currentTarget) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	function leave () {
		if (state !== 'running') return;
		if (isPending) return;

		clickDispatcher
			.remove('#apply-dialog')
			.remove('#ok-dialog')
			.remove('#cancel-dialog');

		keyManager.removeStroke('dialog');

		contentWrap.removeEventListener('mousedown', handleMouseCancel);
		contentWrap.removeEventListener('mousemove', handleMouseCancel);
		contentWrap.removeEventListener('mouseup', handleMouseCancel);

		transitionend(contentWrap, () => {
			opts.onclose && opts.onclose(content);
			dialogWrap.classList.add('hide');
			dialogWrap = contentWrap = content = dimmer = null;
			appStates.shift();
		});

		setTimeout(() => {
			contentWrap.classList.remove('run');
			dimmer.classList.remove('run');
		}, 0);
	}

	init();
}

async function dimmer (text) {
	const dialogWrap = $('dialog-wrap');
	if (!dialogWrap) return;

	const dimmer = $qs('.dimmer', dialogWrap);
	if (!dimmer) return;

	if (text) {
		dimmer.appendChild(document.createTextNode(text));
		if (dialogWrap.classList.contains('hide')) {
			appStates.unshift('dimmer');
			dialogWrap.classList.remove('hide');
			await delay(0);
			dimmer.classList.add('run')
			await transitionendp(dimmer);
		}
	}
	else {
		empty(dimmer);
		await delay(0);
		dimmer.classList.remove('run');
		await transitionendp(dimmer);
		dialogWrap.classList.add('hide');
		appStates.shift();
	}
}

/*
 * <<<1 application independent utility functions
 */

// from utils.js
let LOCALE, _, delay, $, $qs, $qsa,
	removeChild, empty, load, getReadableSize, debounce;

// from utils-apext.js
let $t, fixFragment, serializeXML, getCookie, setCookie,
	getDOMFromString, docScrollTop, docScrollLeft,
	transitionend, transitionendp, getBlobFrom, getImageFrom,
	getContentsFromEditable, resolveCharacterReference,
	新字体の漢字を舊字體に変換, osaka, reverseText, mergeDeep, substringWithStrictUnicode,
	invokeMousewheelEvent, voice, resolveRelativePath,
	parseExtendJson, getStringSimilarity;

// from linkifier.js
let linkify;

/*
 * <<<1 application depending misc functions
 */

function log (...args) {
	devMode && console.log(...args);
}

function modules (...args) {
	if (args.length === 1) {
		return import(chromeWrap.runtime.getURL(`lib/${args[0]}.js`));
	}
	else {
		return Promise.all(args.map(name => modules(name)));
	}
}

function extractDisableOutputEscapingTags (container, extraFragment) {
	container = $(container);
	if (!container) return;
	if (extraFragment) container.appendChild(extraFragment);
	for (const node of $qsa('[data-doe]', container)) {
		const doe = node.dataset.doe;
		delete node.dataset.doe;
		node.insertAdjacentHTML('beforeend', doe);
	}
	return container;
}

function setBoardCookie (key, value, lifeDays) {
	setCookie(key, value, lifeDays, `/${siteInfo.board}`);
}

function getCatalogSettings () {
	let data = getCookie('cxyl');
	if (data === undefined) {
		data = [
			15,		// number of columns
			5,		// number of lines
			0,		// length of text
			0,		// text position code
			0		// thumbnail size code
		];
	}
	else {
		data = data.split('x').map(a => a - 0);
	}
	return data;
}

function setBottomStatus (s, persistent) {
	const ev = new CustomEvent(`${APP_NAME}.bottomStatus`, {
		bubbles: true,
		cancelable: true,
		detail: {
			message: s || '',
			persistent: !!persistent
		}
	});
	document.dispatchEvent(ev);
}

function setWheelStatus (s) {
	const ev = new CustomEvent(`${APP_NAME}.wheelStatus`, {
		bubbles: true,
		cancelable: true,
		detail: {
			message: s || ''
		}
	});
	document.dispatchEvent(ev);
}

function getWrapElement (element) {
	return element ? element.closest('.topic-wrap, .reply-wrap') : null;
}

function getPostNumber (element) {
	let result;

	for (; element instanceof HTMLElement; element = element.parentNode) {
		if ('number' in element.dataset) {
			result = element.dataset.number - 0;
		}
		if (element.classList.contains('topic-wrap')
		|| element.classList.contains('reply-wrap')) {
			return result ?? $qs('[data-number]', element).dataset.number - 0;
		}
	}

	return null;
}

function getTextForCatalog (text, maxLength) {
	let score = 0;
	let result = '';
	for (let ch of text) {
		// assign 0.5 point for half width kana
		const s = /[\uff61-\uffdc\uffe8-\uffee]/.test(ch) ? .5 : 1;

		if (score >= maxLength || score + s > maxLength) break;
		result += ch;
		score += s;
	}
	return result;
}

function getTextForJoin (commentNode) {
	return Array.from(commentNode.childNodes)
		.filter(child => child.nodeType === 3)
		.map(child => child.nodeValue.replace(/\n+$/, ''))
		.join('');
}

function sanitizeComment (commentNode) {
	const result = commentNode.cloneNode(true);

	const strippedItems = [
		'video',
		'audio',
		'iframe',
		'.inline-save-image-wrap',
		'.up-media-container',
		'.mark'
	];
	removeChild($qsa(strippedItems.join(','), result));

	return result;
}

function commentToString (container) {
	container = sanitizeComment(container);

	const iterator = document.createNodeIterator(
		container, window.NodeFilter.SHOW_ELEMENT | window.NodeFilter.SHOW_TEXT);
	const result = [];
	let currentNode;
	while ((currentNode = iterator.nextNode())) {
		switch (currentNode.nodeType) {
		case 1:
			if (currentNode.nodeName === 'IMG') {
				result.push(currentNode.getAttribute('alt') || '');
			}
			break;

		case 3:
			result.push(currentNode.nodeValue);
			break;
		}
	}

	return result.join('').replace(/^\s+|\s+$/g, '');
}

function rangeToString (range) {
	const container = document.createElement('div');
	container.appendChild(range.cloneContents());
	return commentToString(container);
}

function displayLightbox (anchor) {
	async function loadMetadata (anchor) {
		if (anchor.href in metadataCache) return;

		let metadata;

		if (!IS_GECKO) {
			const blob = await load(anchor.href, {}, 'blob');
			if (blob.content) {
				metadata = await modules('mmmf')
					.then(mmmf => mmmf.getMetadataFrom(blob.content));
			}
		}
		if (!metadata) {
			metadata = await backend.send('get-metadata', {url: anchor.href});
		}

		metadataCache[anchor.href] = metadata;

		const content = [
			metadata.texts.length +
			metadata.positivePrompts.length +
			metadata.negativePrompts.length +
			metadata.structuredData.length +
			metadata.gpsInfo.length
		];
		if (metadata.exifTags.length || metadata.xmp.length) {
			content.push('+');
		}

		if (content.length > 1 || content[0]) {
			const saveImageAnchor = $qs(
				`.save-image[href="${anchor.href}"]`,
				anchor.parentNode);
			let metadataAnchor = $qs(
				`.image-metadata[href="${anchor.href}"]`,
				anchor.parentNode);

			if (saveImageAnchor) {
				if (!metadataAnchor) {
					metadataAnchor = saveImageAnchor.parentNode.insertBefore(
						document.createElement('a'),
						saveImageAnchor.nextSibling);
				}

				metadataAnchor.className = 'image-metadata';
				metadataAnchor.href = anchor.href;
				metadataAnchor.textContent = _('metadata', content.join(''))
			}
		}
	}

	return modules('lightbox').then(module => {
		return new Promise(resolve => {
			module.lightbox({
				clickDispatcher, keyManager, storage,
				onenter: () => {
					appStates.unshift('lightbox');
					selectionMenu.enabled = false;
					loadMetadata(anchor);
				},
				onleave: () => {
					selectionMenu.enabled = true;
					appStates.shift();
					resolve();
				},
				onsearch: imageSource => {
					const lang = window.navigator.browserLanguage
						|| window.navigator.language
						|| window.navigator.userLanguage;
					const url = `https://lens.google.com/uploadbyurl?` + (new URLSearchParams([
						['hl', lang.toLowerCase()],
						['url', imageSource]
					])).toString();
					backend.send('open', {
						url,
						selfUrl: location.href
					});
				},
				oncopy: canvas => {
					getBlobFrom(canvas).then(blob => {
						navigator.clipboard.write([
							new ClipboardItem({
								[blob.type]: blob
							})
						]);
						sounds.imageSaved.volume = storage.config.save_image_bell_volume.value;
						sounds.imageSaved.play();
					});
				},
				get viewportRect () {
					return viewportRect;
				}
			}).start(anchor);
		});
	});
}

function displayInlineVideo (anchor, onended) {
	function createMedia () {
		const media = document.createElement('video');
		const props = {
			autoplay: true,
			controls: true,
			loop: false,
			muted: false,
			src: anchor.href,
			volume: storage.runtime.media.volume
		};

		for (let i in props) {
			media[i] = props[i];
		}
		media.style.maxWidth = INLINE_VIDEO_MAX_WIDTH;
		media.style.maxHeight = INLINE_VIDEO_MAX_HEIGHT;
		media.style.width = '100%';
		media.addEventListener('volumechange', e => {
			storage.runtime.media.volume = e.target.volume;
			storage.saveRuntime();
		});
		media.addEventListener('ended', e => {
			if (typeof onended === 'function') {
				onended(e);
			}
		}, {once: true});

		return media;
	}

	let parent;

	// up video
	if ((parent = anchor.closest('.link-up, .link-futaba'))) {
		let thumbContainer = anchor;

		if (!$qs('img', anchor)) {
			thumbContainer = thumbContainer.nextSibling;
			while (thumbContainer) {
				if (thumbContainer.nodeName === 'A' && thumbContainer.href === anchor.href) {
					break;
				}
				thumbContainer = thumbContainer.nextSibling;
			}
		}

		if (thumbContainer) {
			if (thumbContainer.previousSibling.nodeName === 'VIDEO') {
				removeChild(thumbContainer.previousSibling);
				thumbContainer.classList.remove('hide');
			}
			else {
				thumbContainer.classList.add('hide');
				thumbContainer.parentNode.insertBefore(createMedia(), thumbContainer);
			}
		}
		else {
			const quote = anchor.closest('q');
			if (!quote) return;
			if (quote.nextSibling && quote.nextSibling.nodeName === 'VIDEO') {
				removeChild(quote.nextSibling);
			}
			else {
				quote.parentNode.insertBefore(createMedia(), quote.nextSibling);
			}
		}
	}

	// topic video
	else if ((parent = anchor.closest('a'))) {
		const thumbContainer = $qs('img', parent);
		if (parent.previousSibling && parent.previousSibling.nodeName === 'VIDEO') {
			removeChild(parent.previousSibling);
			thumbContainer.classList.remove('hide');
		}
		else {
			thumbContainer.classList.add('hide');
			parent.parentNode.insertBefore(createMedia(), parent);
		}
	}
}

function displayInlineAudio (anchor, onended) {
	function createMedia () {
		const media = document.createElement('audio');
		const props = {
			autoplay: true,
			controls: true,
			loop: false,
			muted: false,
			src: anchor.href,
			volume: storage.runtime.media.volume
		};

		for (let i in props) {
			media[i] = props[i];
		}
		media.addEventListener('volumechange', e => {
			storage.runtime.media.volume = e.target.volume;
			storage.saveRuntime();
		});
		media.addEventListener('ended', e => {
			if (typeof onended === 'function') {
				onended(e);
			}
		}, {once: true});

		return media;
	}

	// up audio
	if (anchor.closest('.link-up')) {
		const neighbor = anchor.nextElementSibling;

		if (neighbor && neighbor.classList.contains('up-media-container')) {
			removeChild(neighbor);
		}
		else {
			const mediaContainer = document.createElement('div');
			anchor.parentNode.insertBefore(mediaContainer, neighbor);
			mediaContainer.className = 'up-media-container';
			mediaContainer.appendChild(createMedia());
		}
	}
}

function execCommand (commandName, arg = null) {
	return document.execCommand(commandName, false, arg);
}

function getVersion () {
	let re, appVersion, browserSpec, machine = [];

	appVersion = `${APP_NAME}/${version}`;
	if (devMode) {
		appVersion += ' [develop mode]'
	}

	// browser info
	const ua = navigator.userAgent;
	if (IS_GECKO && (re = /\bfirefox\/(\d+(?:\.\d+)*)/i.exec(ua))) {
		browserSpec = `Firefox/${re[1]}`;
	}
	else if ((re = /\bvivaldi\/(\d+(?:\.\d+)*)/i.exec(ua))) {
		browserSpec = `Vivaldi/${re[1]}`;
	}
	else if ((re = /\bopr\/(\d+(?:\.\d+)*)/i.exec(ua))) {
		browserSpec = `Opera/${re[1]}`;
	}
	else if (typeof opr === 'object') {
		browserSpec = 'Opera';
	}
	else if ((re = /\bchromium\/(\d+(?:\.\d+)*)/i.exec(ua))) {
		browserSpec = `Chromium/${re[1]}`;
	}
	else if ((re = /\bchrome\/(\d+(?:\.\d+)*)/i.exec(ua))) {
		browserSpec = `Chrome/${re[1]}`;
	}
	if (!browserSpec) {
		if (backend.browserInfo.name && backend.browserInfo.version) {
			browserSpec = `${backend.browserInfo.name}/${backend.browserInfo.version}`;
		}
		else if (backend.browserInfo.name) {
			browserSpec = backend.browserInfo.name;
		}
		else {
			browserSpec = 'Unknown browser';
		}
	}

	// machine spec
	if ('platform' in backend.browserInfo) {
		machine.push(backend.browserInfo.platform);
	}
	else if ('platform' in navigator) {
		machine.push(navigator.platform);
	}

	if ('deviceMemory' in navigator) {
		machine.push(`${navigator.deviceMemory}GB`);
	}

	if ('hardwareConcurrency' in navigator) {
		machine.push(`${navigator.hardwareConcurrency}CPUs`);
	}

	return `${appVersion} on ${browserSpec} (${machine.join(', ')})`;
}

function dumpDebugText (text) {
	if (!devMode) return;

	const ID = 'akahukuplus-debug-dump-container';
	let node = $(ID);

	if (text !== undefined) {
		if (!node) {
			node = document.body.appendChild(document.createElement('pre'));
			node.id = ID;
			node.style.fontFamily = 'Consolas,monospace';
			node.style.whiteSpace = 'pre-wrap';
			node.style.wordBreak = 'break-all';
		}
		empty(node);
		node.appendChild(document.createTextNode(text));
	}
	else {
		removeChild(node);
	}
}

function updateCheckedPostIndicator () {
	const count = getCheckedArticles().length;
	const indicator = $('checked-posts');
	if (count) {
		indicator.classList.remove('hide');
		$qs('span', indicator).textContent = count;
	}
	else {
		indicator.classList.add('hide');
	}
}

function registerAfterReloadCallback (fn) {
	const index = reloadStatus.afterReloadCallbacks.indexOf(fn);
	if (index < 0) {
		reloadStatus.afterReloadCallbacks.push(fn);
	}
}

function executeAfterReloadCallbacks () {
	for (const fn of reloadStatus.afterReloadCallbacks) {
		try {
			fn();
		}
		catch (err) {
			log(`exception while executing after reload callbacks: ${err.stack}`);
		}
	}
}

function getCheckedArticles () {
	return $qsa('article input[type="checkbox"]:checked');
}

function getCoinCost (key, active) {
	const COIN_COSTS = {
		sodane:             {base: 100, unit: 2},
		delete:             {base: 120, unit: 3},
		moderate:           {base: 150, unit: 6},
		pseudo_reply_image: {base: 100},
		image_randomize:    {base: 100}
	};
	if (key === 'total') {
		return storage.runtime.coin.amount;
	}
	if (!Object.hasOwn(COIN_COSTS, key)) {
		return null;
	}
	if (active && Object.hasOwn(COIN_COSTS[key], 'unit')) {
		const quantity = getCheckedArticles().length;
		if (quantity === 1) {
			return 0;
		}
		else {
			return Math.floor(COIN_COSTS[key].base + COIN_COSTS[key].unit * quantity);
		}
	}
	else {
		return COIN_COSTS[key].base;
	}
}

function setSodaneState (node, sodaneValue) {
	if (typeof sodaneValue === 'string' && /^\d+$/.test(sodaneValue)) {
		sodaneValue = parseInt(sodaneValue, 10);
	}
	if (typeof sodaneValue !== 'number') {
		return;
	}
	if (!node.firstChild || node.firstChild.nodeType !== 3) {
		node.insertNode(document.createTextNode('-'), node.firstChild);
	}
	if (sodaneValue) {
		node.firstChild.nodeValue = sodaneValue;
		node.classList.remove('sodane-null');
		node.classList.add('sodane');
	}
	else {
		node.firstChild.nodeValue = SODANE_NULL_MARK;
		node.classList.add('sodane-null');
		node.classList.remove('sodane');
	}
}

/*
 * <<<1 functions for posting
 */

function updateUpfileVisibility () {
	const upfileLabel = $('js-upfile-wrap');
	const nocoinSpan = $('js-upfile-wrap-nocoin');
	if (upfileLabel && nocoinSpan) {
		if (coinCharge) {
			upfileLabel.classList.remove('hide');
			nocoinSpan.classList.add('hide');
		}
		else {
			upfileLabel.classList.add('hide');
			nocoinSpan.classList.remove('hide');
		}
	}
}

function populateTextFormItems (form, callback, populateAll) {
	const inputNodes = $qsa([
		'input[type="hidden"]',
		'input[type="text"]',
		'input[type="number"]',
		'input[type="password"]',
		`input[type="checkbox"]${populateAll ? '' : ':checked'}`,
		'input[type="radio"]:checked',
		'textarea',
		'select'
	].join(','), form);

	for (const node of inputNodes) {
		if (node.name === '') continue;
		if (node.disabled) continue;
		callback(node);
	}
}

function populateFileFormItems (form, callback) {
	const inputNodes = $qsa([
		'input[type="file"]'
	].join(','), form);

	for (const node of inputNodes) {
		if (node.name === '') continue;
		if (node.disabled) continue;
		if (node.files.length === 0) continue;
		callback(node);
	}
}

async function postBase (form) {
	async function updatePostingHiddenParams () {
		/*
		 * *** hidden form items ***
		 *
		 *   js: 'on' / 'off'
		 * scsz: screen-width x screen-height x color-depth
		 * ptua: (assigned by HTML)
		 * pthb: copy of localStorage.futabapt
		 * pthc: return value of caco() -- defined in cachemt7.php
		 * pthd: empty string (flash error output)
		 * hash: (assigned by HTML)
		 * chrenc: '文字'
		 */

		// update js
		$t(document.getElementsByName('js')[0], 'on');

		// update scsz
		$t(document.getElementsByName('scsz')[0],
			[
				window.screen.width,
				window.screen.height,
				window.screen.colorDepth
			].join('x'));

		// update pthc
		// - this content should be retrieved from the disk cache
		// - content example:
		//   function caco(){return "1662584227529";}
		const cacheVersion = /"(\d+)"/.test(
			(await load(
				`${location.protocol}//${location.host}/bin/cachemt7.php`, {}, 'text'
			)).content) ? RegExp.$1 : '';
		$t(document.getElementsByName('pthc')[0], cacheVersion);

		// update pthb
		const futabapt = window.localStorage.getItem('futabapt');
		if (futabapt !== null && futabapt !== '') {
			$t(document.getElementsByName('pthb')[0], futabapt);
		}
		else if (cacheVersion !== null && cacheVersion !== '') {
			window.localStorage.setItem('futabapt', cacheVersion);
		}
	}

	function getIconvPayload (form) {
		const payload = {};
		const needTraditionalConversion = /!(?:trad|[旧舊]字[体體])!/.test($('email').value);
		const needReverse = /!rtl!/.test($('email').value);
		const needOsakaConversion = storage.config.osaka_conversion.value || /!osaka!/.test($('email').value);

		populateTextFormItems(form, node => {
			let content = node.value;

			if (needTraditionalConversion) {
				content = 新字体の漢字を舊字體に変換(content);
				if (node.id === 'email') {
					content = content.replace(/!(?:trad|[旧舊]字[体體])!\s*/g, '');
				}
			}
			if (needReverse) {
				if (node.id === 'email') {
					content = content.replace(/!rtl!\s*/g, '');
				}
				if (node.id === 'com2' || node.id === 'email') {
					content = content
						.split(/\r?\n/)
						.map(line => /^>/.test(line) ? line : reverseText(line))
						.join('\n');
				}
			}
			if (needOsakaConversion) {
				content = content
					.split(/\r?\n/)
					.map(line => /^>/.test(line) ? line : osaka(line))
					.join('\n');
				if (node.id === 'email') {
					content = content.replace(/!osaka!\s*/g, '');
				}
			}

			payload[node.name] = content;
		});

		// process command tags !TAG! in comment
		if ('com' in payload) {
			const commands = new Map;
			let com = payload['com'].replace(/\r\n/g, '\n');
			try {
				for (let re; (re = /^\s*!([^!]+)!([^\n]*)\n/.exec(com)); ) {
					commands.set(
						re[1].replace(/[旧舊]字[体體]/, 'trad'),
						re[2]
					);
					com = com.substring(re[0].length);
				}

				if (/!version!\s*$/.test(com)) {
					commands.set('version', getVersion());
					com = com.replace(/!version!\s*$/, '');
				}

				for (const [key, value] of commands) {
					switch (key) {
					case 'sage':
						payload['email'] = 'sage ' + payload['email'].replace(/\s*\bsage\b\s*/g, '');
						break;

					case 'email':
					case 'sub':
					case 'name':
						if (value !== '') {
							payload[key] = value;
						}
						break;

					case 'trad':
						com = 新字体の漢字を舊字體に変換(com);
						break;

					case 'osaka':
						com = com
							.split(/\r?\n/)
							.map(line => /^>/.test(line) ? line : osaka(line))
							.join('\n');
						break;

					case 'rtl':
						com = com
							.split(/\r?\n/)
							.map(line => /^>/.test(line) ? line : reverseText(line))
							.join('\n');
						break;

					case 'version':
						com += value;
						break;
					}
				}
			}
			finally {
				payload['com'] = com;
			}
		}

		return backend.send('iconv', payload);
	}

	function getFilePayload (form) {
		const payload = {};

		populateFileFormItems(form, node => {
			payload[node.name] = node.files[0];
		});

		return payload;
	}

	async function getMultipartFormData (textItems, fileItems) {
		/*
		 * final adjustment:
		 *   - strip exif from 'upfile'
		 *   - randomize 'upfile' with 100 coins
		 *   - convert PseudoReplyFile 'upfile' into baseform with 100 coins
		 */

		const stripMetadata = $('post-image-unexif').checked;
		const imageRandomize = $('post-image-randomize').checked;
		const pseudoReplyImage = fileItems['upfile'] instanceof PseudoReplyFile;
		const {id, coinCharge} = (imageRandomize || pseudoReplyImage) ?
			await backend.send('coin', {command: 'info'}) :
			{id: null, coinCharge: false};

		if (fileItems['upfile']
		&& fileItems['upfile'].type.startsWith('image/')
		&& (imageRandomize || stripMetadata)) {
			if (imageRandomize) {
				if (!coinCharge) {
					throw new Error(_('error_coin_charge_image_randomize'));
				}
				if (!id) {
					throw new Error(_('error_valid_id_image_randomize'));
				}
			}

			const blob = await modules('mmmf').then(mmmf => mmmf.tweakMetadataOf(
				fileItems['upfile'],
				{
					randomize: imageRandomize,
					stripExif: stripMetadata,
					stripXmp: stripMetadata,
					returnChunks: true
				}
			));
			if (!blob) {
				throw new Error(_('failed_to_tweak_image'));
			}

			fileItems['upfile'] = new File(blob, fileItems['upfile'].name, {
				type: fileItems['upfile'].type,
				lastModified: fileItems['upfile'].lastModified
			});
		}
		if (fileItems['upfile']
		&& fileItems['upfile'].type.startsWith('image/')
		&& pseudoReplyImage) {
			if (!coinCharge) {
				throw new Error(_('error_coin_charge_paste_image'));
			}
			if (!id) {
				throw new Error(_('error_valid_id_pseudo_reply_image'));
			}
			textItems['baseform'] = await new Promise((resolve, reject) => {
				let r = new FileReader;
				r.onload = () => {
					const result = Array
						.from(r.result.replace(/^[^,]+,/, ''))
						.map(ch => ch.codePointAt(0));
					r = r.onload = r.onerror = null;
					resolve(result);
				};
				r.onerror = e => {
					r = r.onload = r.onerror = null;
					reject(e);
				};
				r.readAsDataURL(fileItems['upfile']);
			});
			delete fileItems['upfile'];
		}

		/*
		 * make multipart form data
		 */

		const data = [];
		const boundary = '----------' +
			Math.floor(Math.random() * 0x80000000).toString(36) + '-' +
			Math.floor(Math.random() * 0x80000000).toString(36) + '-' +
			Math.floor(Math.random() * 0x80000000).toString(36);

		for (const key in textItems) {
			const item = new Uint8Array(textItems[key]);
			data.push(
				`--${boundary}\r\n` +
				`Content-Disposition: form-data; name="${key}"\r\n` +
				'\r\n',
				item,
				'\r\n'
			);
		}

		for (const key in fileItems) {
			const item = fileItems[key];
			const fileName = item.name.replace(/"/g, '`');
			const contentType = item.type;
			data.push(
				`--${boundary}\r\n` +
				`Content-Disposition: form-data; name="${key}"; filename="${fileName}"\r\n` +
				`Content-Type: ${contentType}\r\n` +
				'\r\n',
				item,
				'\r\n'
			);
		}

		data.push(`--${boundary}--\r\n`);

		return {
			contentType: `multipart/form-data;boundary=${boundary}`,
			data: new Blob(data),
			transactionKey: (imageRandomize || pseudoReplyImage) ?
				(
					`${imageRandomize ? 'image_randomize' : ''},` +
					`${pseudoReplyImage ? 'pseudo_reply_image' : ''},`
				) : null,
			id
		};
	}

	function getUrlEncodedFormData (items) {
		const data = [];
		let delimiter = '';

		for (const key in items) {
			data.push(
				delimiter, key, '=',
				items[key].map(code => {
					if (code === 32) return '+';
					const ch = String.fromCharCode(code);
					return /[a-z0-9-_.!~*'()]/i.test(ch) ?
						ch : '%' + ('0' + code.toString(16).toUpperCase()).substr(-2);
				}).join('')
			);

			if (delimiter === '') {
				delimiter = '&';
			}
		}

		return {
			contentType: 'application/x-www-form-urlencoded',
			data: data.join(''),
			transactionKey: null,
			id: null
		};
	}

	await updatePostingHiddenParams();

	const textPayload = await getIconvPayload(form);
	if (!textPayload) {
		throw new Error('Failed to call the iconv message');
	}
	if (textPayload.error) {
		throw new Error('Failed to convert a charset');
	}

	const {contentType, data, transactionKey, id} = form.enctype === 'multipart/form-data' ?
		await getMultipartFormData(textPayload, getFilePayload(form)) :
		getUrlEncodedFormData(textPayload);

	if (transactionKey) {
		const {status} = await fetch(
			'https://appsweets.net/coin/begintrans',
			{
				method: 'POST',
				body: new URLSearchParams({app: APP_NAME, id, target: transactionKey})
			}).then(response => response.json());

		if (status.startsWith('error:')) {
			if (status === 'error: Not enough coins') {
				throw new Error(_('error_insufficient_coins'));
			}
			throw new Error(status);
		}
	}

	try {
		const result = await load(form.action, {
			method: 'POST',
			headers: {
				'Content-Type': contentType,
				'X-Requested-With': `${APP_NAME}/${version}`
			},
			body: data,
			//timeout: NETWORK_DEFAULT_TIMEOUT_MSEC,
			//signal: getAbortSignal()
		}, `text;charset=${FUTABA_CHARSET}`);

		if (result.error) {
			throw new Error(result.error);
		}
		else {
			return result.content;
		}
	}
	finally {
		if (transactionKey) {
			backend.send('coin', {
				command: 'commit', app: APP_NAME, target: transactionKey
			});
		}
	}
}

function resetForm (...args) {
	const form = document.createElement('form');
	const elements = [];

	for (const arg of args) {
		const org = $(arg) || $qs(`#postform [name="${arg}"]`);
		if (org) {
			if (org.isContentEditable) {
				empty(org);
			}
			else if (/^(?:text|hidden)$/i.test(org.type)) {
				org.value = '';
			}
			else {
				const clone = org.cloneNode(false);
				elements.push({org, clone});
				org.parentNode.replaceChild(clone, org);
				form.appendChild(org);
			}
		}
	}

	if (elements.length) {
		form.reset();
		for (let i = 0; i < elements.length; i++) {
			elements[i].clone.parentNode.replaceChild(elements[i].org, elements[i].clone);
			elements[i] = null;
		}
	}
}

/*
function parseModerateResponse (response) {
	let re;

	re = /<font[^>]*><b>(.*?)(?:<br\s*\/?>)+.*<a[^>]*>戻る<\/a>/i.exec(response);
	if (re) {
		return {
			error: re[1]
				.replace(/<br\b[^>]*>/ig, '\n')
				.replace(/<[^>]+>/g, ' ')
				.replace(/[\s\t\n]+/g, ' ')
		};
	}

	re = /<body[^>]*>登録しました/i.exec(response);
	if (re) {
		return {
			registered: true
		};
	}

	re = /<body[^>]*>(.*)$/i.exec(response);
	if (re) {
		re = re[1].replace(/<\/body>.*$/i, '');
	}
	else {
		re = response.replace(/<!DOCTYPE[^>]+>\r?\n?/i, '');
	}

	return {error: re || _('invalid_moderation_response')};
}
*/

function parsePostResponse (response, baseUrl) {
	let re;

	re = /<font[^>]*><b>(.*?)(?:<br\s*\/?>)+<a[^>]*>リロード<\/a>/i.exec(response);
	if (re) {
		return {
			error: re[1]
				.replace(/<br\b[^>]*>/ig, '\n')
				.replace(/<[^>]+>/g, ' ')
				.replace(/[\s\t\n]+/g, ' ')
		};
	}

	let refreshURL = '';
	re = /<meta\s+([^>]+)>/i.exec(response);
	if (re && /http-equiv="refresh"/i.test(re[1])) {
		re = /content="\d+;url=([^"]+)"/i.exec(re[1]);
		if (re) {
			refreshURL = resolveRelativePath(re[1], baseUrl);
		}
	}
	if (refreshURL !== '') {
		return {redirect: refreshURL};
	}

	re = /<body[^>]*>(.*)$/i.exec(response);
	if (re) {
		re = re[1].replace(/<\/body>.*$/i, '');
	}
	else {
		re = response.replace(/<!DOCTYPE[^>]+>\r?\n?/i, '');
	}

	return {error: re || _('invalid_post_response')};
}

/*
 * <<<1 functions for reloading
 */

async function reloadBase (opts = {}) {
	/*
	function detectionTest (doc) {
		// for mark detection test
		$qsa('blockquote:nth-child(-n+4)', doc).forEach((node, i) => {
			switch (i) {
			case 0:
				// marked
				node.insertAdjacentHTML(
					'afterbegin',
					'<font color="#ff0000">marked post</font><br>');
				break;
			case 1:
				// marked with bracked
				node.insertAdjacentHTML(
					'afterbegin',
					'[<font color="#ff0000">marked post</font>]<br>');
				break;
			case 2:
				// deleted with mark
				node.insertAdjacentHTML(
					'afterbegin',
					'<font color="#ff0000">marked post</font><br>');
				let n = node;
				for (; n && n.nodeName !== 'TABLE'; n = n.parentNode);
				n && n.classList.add('deleted');
				break;
			case 3:
				// deleted with mark
				node.insertAdjacentHTML(
					'afterbegin',
					'[<font color="#ff0000">marked post</font>]<br>');
				let n = node;
				for (; n && n.nodeName !== 'TABLE'; n = n.parentNode);
				n && n.classList.add('deleted');
				break;
			}
		});
		// for expiration warning test
		$qsa('small + blockquote', doc).forEach(node => {
			node.insertAdjacentHTML(
				'afterend',
				'<font color="#f00000"><b>このスレは古いので、もうすぐ消えます。</b></font><br>'
			);
		});
	}
	*/

	const now = Date.now();
	let doc, method, result;

	timingLogger.startTag('reloadBase');
	try {
		if (DEBUG_IGNORE_LAST_MODIFIED) {
			siteInfo.lastModified = 0;
		}

		reloadStatus.lastReloadType = 'full';
		method = (opts.method || 'get').toUpperCase();

		const options = {
			method,
			headers: {
				'If-Modified-Since': siteInfo.lastModified || FALLBACK_LAST_MODIFIED,
				'X-Requested-With': `${APP_NAME}/${version}`
			},
			//timeout: NETWORK_DEFAULT_TIMEOUT_MSEC,
			//signal: getAbortSignal()
		};

		result = await load(location.href, options, `text;charset=${FUTABA_CHARSET}`);
	}
	finally {
		timingLogger.endTag();
	}

	if (result.status === 304 || result.status === 404) {
		return {doc: null, now, status: result.status};
	}

	if (!('content' in result)) {
		throw new Error(`${_('network_error')}\n(${result.status} ${result.error})`);
	}

	if ('last-modified' in result.headers) {
		siteInfo.lastModified = result.headers['last-modified'];
	}

	if (devMode) {
		reloadStatus.lastReceivedText = result.content;
	}

	if (method !== 'HEAD' && result.status === 200) {
		timingLogger.startTag('parsing html');
		try {
			doc = result.content;
			doc = doc.replace(
				/>([^<]+)</g,
				($0, content) => {
					content = resolveCharacterReference(content)
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;');
					return `>${content}<`;
				});
			doc = doc.replace(
				/(<a\s+href="mailto:)([^"]+)("[^>]*>)/gi,
				($0, head, content, bottom) => {
					content = resolveCharacterReference(content)
						.replace(/&/g, '&amp;')
						.replace(/"/g, '&quot;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;');
					return `${head}${content}${bottom}`;
				});

			doc = getDOMFromString(doc);
			if (!doc) {
				throw new Error(_('failed_to_build_dom'));
			}
		}
		finally {
			timingLogger.endTag();
		}
	}

	//doc && detectionTest();

	return {doc, now, status: result.status};
}

async function reloadBaseViaAPI () {
	const now = Date.now();
	let doc, result;

	timingLogger.startTag('reloadBaseViaAPI');
	try {
		reloadStatus.lastReloadType = 'delta';

		const url = `${location.protocol}//${location.host}/${siteInfo.board}/futaba.php`
		const query = new URLSearchParams({
			mode: 'json',
			res: siteInfo.resno,
			start: getLastReplyNumber() + 1
		});
		const options = {
			headers: {
				//'If-Modified-Since': FALLBACK_LAST_MODIFIED,
				'X-Requested-With': `${APP_NAME}/${version}`
			},
			//timeout: NETWORK_DEFAULT_TIMEOUT_MSEC,
			//signal: getAbortSignal()
		};

		result = await load(`${url}?${query}`, options, 'text');
	}
	finally {
		timingLogger.endTag();
	}

	if (!('content' in result)) {
		throw new Error(`${_('network_error')}\n(${result.status} ${result.error})`);
	}

	if (devMode) {
		reloadStatus.lastReceivedText = result.content;
	}

	timingLogger.startTag('parsing json');
	try {
		doc = result.content;
		doc = JSON.parse(doc, (key, value) => {
			if (typeof value !== 'string') return value;

			const value2 = value.replace(
				/(^|>)([^<]+)($|<)/g,
				($0, head, content, bottom) => {
					content = resolveCharacterReference(content)
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;');
					return `${head}${content}${bottom}`;
				}
			);

			return value2;
		});
	}
	catch {
		doc = undefined;
	}
	finally {
		timingLogger.endTag();
	}

	if (!doc) {
		throw new Error(_('failed_to_parse_json'));
	}

	return {doc, now, status: result.status};
}

async function reloadCatalogBase (query) {
	const now = Date.now();
	let doc, result;

	timingLogger.startTag('reloadCatalogBase');
	try {
		const url = `${location.protocol}//${location.host}/${siteInfo.board}/futaba.php?mode=cat${query}`
		const options = {
			headers: {
				'X-Requested-With': `${APP_NAME}/${version}`
			},
			//timeout: NETWORK_DEFAULT_TIMEOUT_MSEC,
			//signal: getAbortSignal()
		};
		result = await load(url, options, `text;charset=${FUTABA_CHARSET}`);

		if (result.error) {
			throw new Error(`${_('network_error')}\n(${result.error})`);
		}
	}
	finally {
		timingLogger.endTag();
	}

	timingLogger.startTag('parsing html');
	try {
		doc = result.content;

		const re = /<script[^>]+>var\s+ret\s*=JSON\.parse\('([^<]+)'\)/.exec(doc);
		if (re) {
			re[1] = re[1]
				.replace(/\\u([0-9a-f]{4})/ig, ($0, $1) => String.fromCharCode(parseInt($1, 16)))
				.replace(/\\([^"\\/bfnrt])/g, '$1')
				.replace(/\\","cr":/g, '","cr":');	// **REALLY REALLY BAD**

			let data;
			try {
				data = JSON.parse(re[1]);
			}
			catch (err) {
				log(`${APP_NAME}: reloadCatalogBase: ${err.message}\n${err.stack}`);
				if (/in JSON at position (\d+)/.test(err.message)) {
					log(`error string: "${re[1].substr(Math.max(RegExp.$1 - 8, 0), 16)}"`);
				}
				data = {res: []};
			}

			const buffer = [];
			for (let i = 0; i < data.res.length; i++) {
				const item = data.res[i];
				const com = item.com.replace(/\\\//g, '/');

				if ('src' in item) {
					const src = item.src.replace(/\\\//g, '/');
					buffer.push(`<td><a href='res/${item.no}.htm' target='_blank'><img src='${src}' border=0 width=${item.w} height=${item.h} alt=""></a><br><small>${com}</small><br><font size=2>${item.cr}</font></td>\n`);
				}
				else {
					buffer.push(`<td><a href='res/${item.no}.htm' target='_blank'><small>${com}</small></a><br><font size=2>${item.cr}</font></td>`);
				}

				if (i > 0 && (i % 15) === 14) {
					buffer.push(`</tr>\n<tr>`);
				}
			}
			buffer.unshift(`<table border=1 align=center id='cattable'><tr>`);
			buffer.push(`</tr>\n</table>`);
			doc = doc.replace(/(<div\s+id=["']?cattable["']?[^>]*>)(<\/div>)/, buffer.join(''));
		}

		doc = getDOMFromString(doc);
		if (!doc) {
			throw new Error(_('failed_to_build_dom'));
		}
	}
	finally {
		timingLogger.endTag();
	}

	return {doc, now, status: result.status};
}

function modifyPage () {
	const PROMISE_KEY = 'modify';
	globalPromises[PROMISE_KEY] = (globalPromises[PROMISE_KEY] || Promise.resolve())
		.then(() => Promise.all([
			adjustReplyWidth(),
			extractTweets(),
			extractNico2(),
			completeDefectiveLinks()
		]))
		.then(() => {
			if (resourceSaver.rawSavers('thread')?.running) {
				return resourceSaver
					.thread()
					.then(saver => saver.push(postStats.lastStats));
			}
		});
}

async function adjustReplyWidth () {
	let nodes;
	while ((nodes = $qsa('.reply-wrap .reply-image:not(.width-adjusted)')).length) {
		const maxTextWidth = Math.floor($qs('.text').offsetWidth * 0.9);

		for (let i = 0; i < nodes.length && i < EXTRACT_UNIT; i++) {
			const replyImage = nodes[i];
			const replyWrap = replyImage.closest('.reply-wrap');
			const heading = $qs('.image_true', replyWrap);
			const comment = $qs('.comment', replyWrap);
			const replyImageWidth = replyImage.offsetWidth;

			replyImage.classList.add('hide');
			heading.classList.add('hide');
			const normalWidth = comment.offsetWidth;
			replyImage.classList.remove('hide');
			heading.classList.remove('hide');

			const minWidth = Math.min(normalWidth + replyImageWidth + 8, maxTextWidth);
			comment.style.minWidth = `${minWidth}px`;
			replyImage.classList.add('width-adjusted');
		}

		await delay(Math.floor(Math.random() * 1000 + 1000));
	}
}

async function extractTweets () {
	let tweets;
	while ((tweets = $qsa('.link-twitter')).length) {
		for (let i = 0; i < tweets.length && i < EXTRACT_UNIT; i++) {
			tweets[i].classList.remove('link-twitter');

			const id = tweets[i].dataset.tweetId;
			if (!id) continue;

			const [userId, tweetId] = id.split('/');
			const data = await backend.send('get-tweet', {
				url: `https://x.com/${userId}/status/${tweetId}`,
				id: tweetId
			});
			if (!data) continue;

			/*
			 * data = {
			 *   author_name: "[[USER NAME]]"
			 *   author_url: "https://twitter.com/[[ACTUAL USER ID]]"
			 *   cache_age: "3153600000"
			 *   height: null
			 *   html: "<blockquote class=\"twitter-tweet\" data-lang=\"ja\"><p lang=\"ja\" dir=\"ltr\">[[CONTENT]]</p>&mdash; [[USER NAME]] (@[[USER_ID]]) <a href=\"[[URL]]\">2024年7月15日</a></blockquote>\n<script async src=\"https://platform.twitter.com/widgets.js\" charset=\"utf-8\"></script>\n\n"
			 *   provider_name: "Twitter"
			 *   provider_url: "https://twitter.com"
			 *   type: "rich"
			 *   url: "https://twitter.com/[[ACTUAL USER ID]]/status/[[ACTUAL TWEET ID]]"
			 *   version: "1.0"
			 *   width: 550
			 * }
			 */
			const actualURL = /^https?:\/\/[^/]+\/([^/]+)\/status\/([^/?#]+)/.exec(data.url);
			if (!actualURL) {
				tweets[i].title = `[UNKNOWN URL FORMAT: "${data.url}"]`;
				continue;
			}
			if (actualURL[1] !== userId) {
				tweets[i].title = `[MALFORMED USER ID: "${userId}"]`;
				continue;
			}
			if (actualURL[2] !== tweetId) {
				tweets[i].title = `[MALFORMED TWEET ID: "${tweetId}"]`;
				continue;
			}

			const iframeId = backend.getUniqueId();
			const iframeSource = OUTER_IFRAME_ORIGIN + '/twitter-frame.html';
			const iframe = tweets[i].parentNode.insertBefore(
				document.createElement('iframe'),
				tweets[i].nextSibling);
			iframe.className = 'twitter-frame';
			iframe.id = iframeId;
			iframe.src = iframeSource;

			await Promise.race([
				new Promise(resolve => {
					iframe.onload = e => {
						e.target.src === iframeSource && resolve();
					};
				}),
				delay(1000 * 3)
			]);

			iframe.contentWindow.postMessage({
				command: 'init-tweet',
				iframeId,
				applyScript: true,
				tweetData: data
			}, OUTER_IFRAME_ORIGIN);
		}

		await delay(Math.floor(Math.random() * 1000 + 1000));
	}
}

async function extractNico2 () {
	const KEY_NAME = 'data-nico2-key';
	let files;
	while ((files = $qsa(`.inline-video.nico2[${KEY_NAME}]`)).length) {
		for (let i = 0; i < files.length && i < EXTRACT_UNIT; i++) {
			const key = files[i].getAttribute(KEY_NAME);
			const iframeId = backend.getUniqueId();
			const iframeSource = `https://embed.nicovideo.jp/watch/${key}?persistence=1&oldScript=1&referer=&from=0&allowProgrammaticFullScreen=0`;
			const iframe = files[i].parentNode.insertBefore(
				document.createElement('iframe'),
				files[i].nextSibling);
			iframe.className = 'nico2-frame';
			iframe.id = iframeId;
			iframe.width = '640';
			iframe.height = '360';
			iframe.frameBorder = '0';
			iframe.src = iframeSource;
			iframe.style.maxWidth = '100%';

			files[i].removeAttribute(KEY_NAME);
			removeChild(files[i]);
		}

		await delay(Math.floor(Math.random() * 1000 + 1000));
	}
}

async function completeDefectiveLinks () {
	async function completeUpLink (node) {
		const [base] = /^fu?\d+/.exec(node.dataset.basename);
		const board = /^fu/.test(base) ? 'up2' : 'up';
		try {
			const result = await load(
				`https://appsweets.net/thumbnail/${board}/${base}s.js`);
			if (result.error) {
				throw new Error(_('invalid_thumbnail_data'));
			}

			const data = result.content;

			// prevent from infinite loop
			if (!/^fu?\d+\..+$/.test(data.name)) {
				throw new Error(_('invalid_completion_data', data.name));
			}

			// set up internal partial XML
			const xml = createFutabaXML(pageModes[0].mode);
			const comment = xml.documentElement.appendChild(xml.createElement('comment'));
			const parent = node.closest('q') ?
				comment.appendChild(xml.createElement('q')) :
				comment;
			parent.appendChild(xml.createTextNode(data.name));
			linkify(parent);
			xsltProcessor.setParameter(null, 'render_mode', 'comment');

			// XSL transform
			const fragment = fixFragment(xsltProcessor.transformToFragment(xml, document));

			// apply transform result
			if (parent === comment) {
				/*
				 * fragment:
				 *
				 * #fragment
				 *   <a class="link-up">...</a>
				 *   <small> - [保存する]</small>
				 *   <br>
				 *   <a class="link-up"><img src="#"></a>
				 */

				// we can add the fragment itself
				node.parentNode.insertBefore(fragment, node);
			}
			else {
				/*
				 * fragment:
				 *
				 * #fragment
				 *   <q>
				 *     <a class="link-up">...</a>
				 *   </q>
				 */

				// we have to pick the anchor up
				node.parentNode.insertBefore($qs('a', fragment), node);
			}
			removeChild(node);
		}
		catch (err) {
			log(`${APP_NAME}: completeUpLink : ${err.stack}`);
			const span = node.appendChild(document.createElement('span'));
			span.className = 'link-completion-notice';
			span.textContent = _('completion_failed');
			span.title = err.message;
		}
		finally {
			node = null;
		}
	}

	let files;
	while ((files = $qsa('.link-up.incomplete')).length) {
		for (let i = 0; i < files.length && i < EXTRACT_UNIT; i++) {
			const id = files[i].dataset.basename;
			if (/^fu?\d+/.test(id)) {
				await completeUpLink(files[i]);
			}
			files[i].classList.remove('incomplete');
		}

		await delay(Math.floor(Math.random() * 1000 + 1000));
	}
}

function detectNoticeModification (notice, noticeNew) {
	return modules('difflib').then(module => {
		const list = $qs('#panel-content-notice ul');
		if (!list) return;

		const {difflib} = module;
		const opcodes = new difflib.SequenceMatcher(
			difflib.stringAsLines(notice),
			difflib.stringAsLines(noticeNew)).get_opcodes();
		const baseLines = notice
			.replace(/__akahukuplus_viewers_count__/g, $('viewers').textContent)
			.split('\n');
		const newLines = noticeNew
			.replace(/__akahukuplus_viewers_count__/g, $('viewers').textContent)
			.split('\n');
		const add = (rows, index1, index2, lines, className) => {
			let markup = undefined;
			if (typeof index1 === 'number' && index1 >= 0 && index1 < lines.length) {
				markup = lines[index1];
			}
			else if (typeof index2 === 'number' && index2 >= 0 && index2 < lines.length) {
				markup = lines[index2];
			}
			if (markup !== undefined) {
				rows.push({className, markup});
			}
		};
		const rows = [];

		for (let idx = 0; idx < opcodes.length; idx++) {
			let [change, baseStart, baseEnd, newStart, newEnd] = opcodes[idx];

			const rowCount = Math.max(baseEnd - baseStart, newEnd - newStart);
			const topRows = [];
			const botRows = [];

			for (let i = 0; i < rowCount; i++) {
				switch (change) {
				case 'insert':
					add(rows, null, newStart++, newLines, change);
					break;

				case 'replace':
					if (baseStart < baseEnd) {
						add(topRows, baseStart++, null, baseLines, 'delete');
					}
					if (newStart < newEnd) {
						add(botRows, null, newStart++, newLines, 'insert');
					}
					break;

				case 'delete':
					add(rows, baseStart++, null, baseLines, change);
					break;

				default:
					// equal
					add(rows, baseStart++, newStart++, baseLines, change);
					break;
				}
			}

			if (change === 'replace') {
				rows.push.apply(rows, topRows);
				rows.push.apply(rows, botRows);
			}
		}

		empty(list);
		rows.forEach(row => {
			const li = list.appendChild(document.createElement('li'));
			li.className = row.className;
			li.innerHTML = row.markup;
			if (row.className !== 'equal') {
				console.log(`${row.className}: "${row.markup}"`);
			}
		});
	});
}

/*
 * <<<1 functions for reload feature in reply mode
 */

function setReloaderStatus (content, persistent) {
	const fetchStatus = $('fetch-status');
	const fetchStatusText = $('fetch-status-text');
	if (!fetchStatus || !fetchStatusText) return;

	if (content !== undefined) {
		fetchStatus.classList.remove('hide');
		$t(fetchStatusText, content);
		if (persistent) {
			reloadStatus.state = null;
		}
		else {
			setTimeout(setReloaderStatus, RELOAD_LOCK_RELEASE_DELAY);
		}
	}
	else {
		$t(fetchStatusText, '');
		fetchStatus.classList.add('hide');
		reloadStatus.state = null;
	}
}

// called from reloadReplies()
function updateTopic (xml, container) {

	function updateMarkedTopic () {
		let result = false;
		const marks = $qsa('topic > mark', xml);
		for (let i = 0, goal = marks.length; i < goal; i++) {
			const number = $qs('number', marks[i].parentNode).textContent;

			const node = $qs(`.topic-wrap[data-number="${number}"]`, container);
			if (!node || $qs('.mark', node)) continue;

			const comment = $qs('.comment', node);
			if (!comment) continue;

			const isBracket = marks[i].getAttribute('bracket') === 'true';
			comment.insertBefore(document.createElement('br'), comment.firstChild);
			isBracket && comment.insertBefore(document.createTextNode(']'), comment.firstChild);
			const m = comment.insertBefore(document.createElement('span'), comment.firstChild);
			m.className = 'mark';
			m.textContent = marks[i].textContent;
			isBracket && comment.insertBefore(document.createTextNode('['), comment.firstChild);

			result = true;
		}
		return result;
	}

	function updateIdentifiedTopic () {
		let result = false;
		const ids = $qsa('topic > user_id', xml);
		for (let i = 0, goal = ids.length; i < goal; i++) {
			const number = $qs('number', ids[i].parentNode).textContent;

			const node = $qs(`.topic-wrap[data-number="${number}"]`, container);
			if (!node || $qs('.user-id', node)) continue;

			const postno = $qs('.postno', node);
			if (!postno) continue;

			const id = postno.parentNode.insertBefore((document.createElement('span')), postno);
			id.className = 'user-id';
			id.textContent = `ID:${ids[i].textContent}`;
			id.dataset.id = ids[i].textContent;
			postno.parentNode.insertBefore(document.createElement('span'), postno);

			const sep = postno.parentNode.insertBefore(document.createElement('span'), postno);
			sep.className = 'sep';
			sep.textContent = '|';

			result = true;
		}
		return result;
	}

	updateMarkedTopic();
	updateIdentifiedTopic();
}

// called from processRemainingReplies()
function updateReplies (xml, container) {

	function updateReplyAssets (selector, handler) {
		timingLogger.startTag(`updateReplyAssets(${selector})`);
		const assets = $qsa(selector, xml);
		const replies = container.children;
		const hiddenReplies = container.getAttribute('hidden') - 0;
		let result = 0;
		for (const asset of assets) {
			// retrieve offset
			const offset = $qs('offset', asset.parentNode).textContent - hiddenReplies - 1;
			if (offset < 0 || offset >= container.childElementCount) {
				continue;
			}

			// retrieve current reply
			const number = $qs('number', asset.parentNode).textContent;
			const node = $qs(`[data-number="${number}"]`, replies[offset]);
			if (!node) {
				log([
					`internal number unmatch:`,
					`number: ${number}`,
					`actual number: ${$qs('[data-number]').dataset.number}`
				].join('\n'));
				continue;
			}

			const processed = handler(asset, node);
			processed && result++;
		}
		timingLogger.endTag(`/ ${result} items`);
		return result;
	}

	function updateMarkedReplies () {
		return updateReplyAssets('reply > mark', (asset, node) => {
			/*
			 * asset examples:
			 *
			 *  - <mark>書き込みをした人によって削除されました</mark>
			 *  - <mark bracket="true">なー</mark>
			 *
			 * reply node:
			 *
			 *  - <reply>
			 *      <number>1362745234</number>
			 *      <deleted/>
			 *      <mark>書き込みをした人によって削除されました</mark>
			 *      <sodane class="sodane-null">＋</sodane>
			 *      <offset>29</offset>
			 *    </reply>
			 */

			// treat as deletion other than remote host mark
			if (asset.textContent.match(/\./g)?.length ?? 0 < 2) {
				node.classList.add('deleted');
			}

			// retrieve current comment
			const comment = $qs('.comment', node);
			if (!comment) {
				log([
					`comment not found:`,
					`${node.outerHTML}`
				].join('\n'));
				return;
			}

			// find an existing mark with the same content
			let found = false;
			for (const mark of $qsa('.mark', comment)) {
				if (mark.textContent === asset.textContent) {
					found = true;
					break;
				}
			}
			if (found) return;

			// insert mark
			const isBracket = asset.getAttribute('bracket') === 'true';
			comment.insertBefore(document.createElement('br'), comment.firstChild);
			isBracket && comment.insertBefore(document.createTextNode(']'), comment.firstChild);
			const m = comment.insertBefore(document.createElement('span'), comment.firstChild);
			m.className = 'mark';
			m.textContent = asset.textContent;
			isBracket && comment.insertBefore(document.createTextNode('['), comment.firstChild);

			return true;
		});
	}

	function updateIdentifiedReplies () {
		// In ID表示 mode, ID is displayed in all comments,
		// So we must not do anything.
		if (siteInfo.idDisplay) {
			return 0;
		}

		return updateReplyAssets('reply > user_id', (asset, node) => {
			// Do nothing if already user id exists
			if ($qs('.user-id', node)) return;

			// insert id
			const div = node.appendChild(document.createElement('div'));
			div.appendChild(document.createTextNode('──'));
			const span = div.appendChild(document.createElement('span'));
			div.className = span.className = 'user-id';
			span.textContent = 'ID:' + asset.textContent;
			span.dataset.id = asset.textContent;
			div.appendChild(document.createElement('span'));

			return true;
		});
	}

	updateMarkedReplies();
	updateIdentifiedReplies();
}

// called from processRemainingReplies(), reloadRepliesViaAPI()
function updateSodanePosts (stat) {
	timingLogger.startTag(`updateSodanePosts`);
	for (const {number, value} of stat.delta.sodane) {
		const sodaneNode = $(`sodane_${number}`) || $qs([
			`article .topic-wrap[data-number="${number}"] .sodane`,
			`article .topic-wrap[data-number="${number}"] .sodane-null`,
			`article .reply-wrap > [data-number="${number}"] .sodane`,
			`article .reply-wrap > [data-number="${number}"] .sodane-null`
		].join(','));
		if (!sodaneNode) {
			continue;
		}

		if (!sodaneNode.id) {
			sodaneNode.id = `sodane_${number}`;
		}

		const re = /^\d+$/.exec(sodaneNode.textContent);

		if (re && re[0] - 0 === value) {
			continue;
		}

		setSodaneState(sodaneNode, value);
	}
	timingLogger.endTag();
}

// called from processRemainingReplies(), reloadRepliesViaAPI()
function updateIdFrequency (stat) {
	function replaceComment (node, originalContent) {
		empty(node);
		node.appendChild(document.createTextNode('['));
		const span = node.appendChild(document.createElement('span'));
		span.className = 'mark';
		node.appendChild(document.createTextNode(']'));
		$t(span, _('not_worth_showing'));
		node.title = originalContent;

		removeReplyImageWrap(node.parentNode);
	}

	function removeReplyImageWrap (replyNode) {
		removeChild($qs('.reply-image', replyNode));
	}

	function removeReplyImage (replyNode) {
		for (const node of $qsa('.reply-image img, .reply-image img+br', replyNode)) {
			removeChild(node);
		}
	}

	timingLogger.startTag(`updateIdFrequency`);
	for (const [id, idData] of stat.idData) {
		const selector = [
			`article .topic-wrap span.user-id[data-id="${id}"]`,
			`article .reply-wrap span.user-id[data-id="${id}"]`
		].join(',');

		// Single ID must not be counted
		if (idData.length === 1) {
			for (const node of $qsa(selector)) {
				removeReplyImage(getWrapElement(node));
			}
			continue;
		}

		// Important optimization: If the total number of IDs has not changed,
		// It is not necessary to update entire posts with current ID
		const re = /\d+\/(\d+)/.exec($qs(selector).nextSibling.textContent);
		if (re && re[1] - 0 === idData.length) continue;

		// Count up all posts with the same ID...
		const posts = [...$qsa(selector)].map(idNode => {
			const wrapNode = getWrapElement(idNode);
			const commentNode = $qs('.comment', wrapNode);
			const comment = commentNode.title || commentToString(commentNode);
			const offset = $qs('.no', wrapNode)?.textContent ?? '0';
			const notWorthMagic = comment.match(/\p{M}/gu)?.length >= 10;
			return {idNode, commentNode, comment, offset, notWorthMagic};
		});
		for (let i = 0, index = 1, goal = posts.length; i < goal; i++, index++) {
			$t(posts[i].idNode.nextSibling, `(${index}/${idData.length})`);
			if (siteInfo.idDisplay) continue;
			if (posts[i].idNode.dataset.sis) continue;

			removeReplyImage(posts[i].commentNode.parentNode);

			let foundSimilarReply = false;
			//const logLines = [];
			for (let j = 0; j < i; j++) {
				const similarity = posts[i].notWorthMagic ? 1 : getStringSimilarity(
					posts[j].comment, posts[i].comment,
					{normalize: true, prefixLength: 2});

				//logLines.push(`${posts[j].offset}:${similarity.toFixed(2)}`);

				if (similarity >= .9) {
					foundSimilarReply = true;
					break;
				}
			}

			if (foundSimilarReply) {
				replaceComment(posts[i].commentNode, posts[i].comment);
				posts[i].idNode.dataset.sis = '9';
			}
			else {
				posts[i].idNode.dataset.sis = '1';
			}

			//posts[i].idNode.title = 'sis status: ' + logLines.join(', ');
		}

		const selector2 = [
			`article .topic-wrap span.user-id[data-id="${id}"][data-sis="9"]`,
			`article .reply-wrap span.user-id[data-id="${id}"][data-sis="9"]`
		].join(',');
		if (posts.length - 1 === $qsa(selector2).length) {
			replaceComment(posts[0].commentNode, posts[0].comment);
		}
	}
	timingLogger.endTag();
}

function getReplyContainer (index) {
	index || (index = 0);
	return $qs(`article:nth-of-type(${index + 1}) .replies`);
}

function getRepliesCount (index) {
	index || (index = 0);
	return $qsa(`article:nth-of-type(${index + 1}) .reply-wrap`).length;
}

function getRule (container) {
	container || (container = getReplyContainer());
	if (!container) return;
	return $qs('.rule', container);
}

function getLastReplyNumber (index) {
	index || (index = 0);
	return ($qs([
		`article:nth-of-type(${index + 1})`,
		'.reply-wrap:last-child',
		'[data-number]'
	].join(' ')) || $qs([
		`article:nth-of-type(${index + 1})`,
		'.topic-wrap'
	].join(' '))).dataset.number - 0;
}

function createRule (container) {
	let rule = getRule(container);
	if (!rule) {
		rule = container.appendChild(document.createElement('div'));
		rule.className = 'rule';
	}
	return rule;
}

function removeRule (container) {
	container || (container = getReplyContainer());
	if (!container) return;
	const rule = $qs('.rule', container);
	if (!rule) return;
	removeChild(rule);
}

function stripTextNodes (container) {
	/*
	 * In the replies container, the index of node may be used as
	 * an offset of reply. Therefore, we have to remove unnecessary
	 * text nodes.
	 */
	container || (container = getReplyContainer());
	if (!container) return;

	const result = document.evaluate(
		'./text()', container, null,
		window.XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
		null);
	if (!result) return;

	for (let i = 0, goal = result.snapshotLength; i < goal; i++) {
		removeChild(result.snapshotItem(i));
	}
}

function processRemainingReplies (opts, context, lowBoundNumber, callback) {
	function needLog () {
		return devMode && ($qs('[data-href="#toggle-dump-reload"]') || {}).checked;
	}

	let maxReplies;

	opts || (opts = {});

	// 'read more' function in reply mode, process whole new replies
	if (typeof lowBoundNumber === 'number') {
		maxReplies = 0x7fffffff;
	}
	// other: process per chunk
	else {
		lowBoundNumber = -1;
		maxReplies = REST_REPLIES_PROCESS_COUNT;
	}

	if (needLog()) {
		const context2 = JSON.parse(JSON.stringify(context));
		context2.forEach(con => {
			con.content = con.content.substring(0, 100) + '...' + con.content.substr(-100);
		});
		log([
			'processRemainingReplies',
			`  opts: ${JSON.stringify(opts, null, '\t')}`,
			`  context: ${JSON.stringify(context2, null, '\t')}`,
			`  lowBoundNumber: ${lowBoundNumber}`,
			`  maxReplies: ${maxReplies}`
		].join('\n'));
	}

	timingLogger.reset().startTag(`proccessing remaining replies`, `lowBoundNumber:${lowBoundNumber}`);
	xmlGenerator.remainingReplies(
		context, maxReplies, lowBoundNumber,
		(xml, index, count, count2) => {
			/*
			 * xml: partial xml document
			 * index: thread index
			 * count: total number of replies (existing + new replies)
			 * count2: total number of 'hidden' replies
			 */
			if (needLog()) {
				log([
					'xmlGenerator.remainingReplies callback #1',
					`  index: ${index}`,
					`  count: ${count}`,
					`  count2: ${count2}`
				].join('\n'));
			}
			if (devMode && ($qs('[data-href="#toggle-dump-xml"]') || {}).checked) {
				console.log(serializeXML(xml));
			}

			const container = getReplyContainer(index);
			if (!container) return;

			if (lowBoundNumber < 0) {
				postStats.updatePostformView({
					count: {
						total: count,
						mark: 0,
						id: 0
					},
					delta: null
				});
				xsltProcessor.setParameter(null, 'render_mode', 'replies');
			}
			else {
				updateReplies(xml, container);
				xsltProcessor.setParameter(null, 'low_bound_number', lowBoundNumber);
				xsltProcessor.setParameter(null, 'render_mode', 'replies_diff');
			}

			try {
				const f = fixFragment(xsltProcessor.transformToFragment(xml, document));
				if ($qs('.reply-wrap', f)) {
					if (lowBoundNumber >= 0) {
						createRule(container);
					}

					extractDisableOutputEscapingTags(container, f);
					stripTextNodes(container);
				}
			}
			catch (e) {
				log(`${APP_NAME}: processRemainingReplies: exception(1), ${e.stack}`);
			}
		},
		() => {
			if (needLog()) {
				log([
					'xmlGenerator.remainingReplies callback #2'
				].join('\n'));
			}

			timingLogger.startTag('statistics update');

			// reload on reply mode
			if (pageModes[0].mode === 'reply' && lowBoundNumber >= 0) {
				const stats = postStats.done();

				if (stats.delta.total || stats.delta.mark || stats.delta.id) {
					if ($qs('#panel-aside-wrap.run #panel-content-mark:not(.hide)')) {
						postStats.updatePanelView();
					}
					titleIndicator.startBlink();
					postStats.updatePostformView();
					callback && callback(stats);
					scrollToNewReplies(opts.scrollBehavior, () => {
						updateSodanePosts(stats);
						updateIdFrequency(stats);
						modifyPage();
					});
				}
				else {
					callback && callback(stats);
				}
			}

			// first load on summary or reply mode
			else {
				const stats = postStats.done(true);

				if ($qs('#panel-aside-wrap.run #panel-content-mark:not(.hide)')) {
					postStats.updatePanelView();
				}

				postStats.updatePostformView();
				callback && callback(stats);
				updateSodanePosts(stats);
				updateIdFrequency(stats);
				modifyPage();
			}

			timingLogger.endTag();
			timingLogger.forceEndTag();
		}
	);
}

function scrollToNewReplies (behavior, callback = () => {}) {
	/*
	 * possible behavior:
	 *
	 * 'none' - no scrolling
	 * 'auto' - scroll when current scroll position is close to the
	 *          bottom of view
	 * 'always' - always scroll
	 */

	if (behavior === 'none') {
		callback();
		return;
	}

	const rule = getRule();
	if (!rule) {
		callback();
		return;
	}

	const scrollTop = docScrollTop();
	const distance = rule.nextSibling.getBoundingClientRect().top - Math.floor(viewportRect.height / 2);
	if (distance <= 0) {
		callback();
		return;
	}

	const scrollRatio = scrollTop / (document.documentElement.scrollHeight - viewportRect.height);
	if (behavior === 'auto') {
		if (scrollRatio < 0.8) {
			callback();
			return;
		}
	}

	if (document.hidden) {
		window.scrollTo(0, scrollTop + distance);
		callback();
		return;
	}

	let startTime = null;
	window.requestAnimationFrame(function handleScroll (time) {
		if (!startTime) {
			startTime = time;
		}
		const elapsed = time - startTime;
		if (elapsed < RELOAD_AUTO_SCROLL_CONSUME) {
			window.scrollTo(
				0,
				Math.floor(scrollTop + distance * (elapsed / RELOAD_AUTO_SCROLL_CONSUME)));
			window.requestAnimationFrame(handleScroll);
		}
		else {
			window.scrollTo(0, scrollTop + distance);
			callback();
		}
	});
}

async function runMomocan () {
	if (typeof Akahuku.momocan === 'undefined') {
		return;
	}

	await new Promise(resolve => {
		let momocan = Akahuku.momocan.create({
			onmarkup: markup => {
				const imagePath = chromeWrap.runtime.getURL('images/momo/');
				return markup
					.replace(/\/\/dev\.appsweets\.net\/momo\//g, imagePath)
					.replace(/\/@version@/g, '');
			},
			onok: async canvas => {
				const clipboardData = new DataTransfer;
				clipboardData.items.add(new TegakiFile(
					[await getBlobFrom(canvas)], 'tegaki.png', {
						type: 'image/png'
					}));
				const ev = new ClipboardEvent('paste', {clipboardData});
				$('com').dispatchEvent(ev);
			},
			oncancel: () => {
			},
			onclose: () => {
				momocan = null;
				resolve();
			}
		});

		momocan.start();
	});
}

async function getDelReasons (postNumber = '') {
	const query = new URLSearchParams({
		b: siteInfo.board,
		d: postNumber
	});
	const url = `${location.protocol}//${location.host}/del.php?${query}`;
	const loaded = await load(url, {}, `text;charset=${FUTABA_CHARSET}`);
	if (loaded.error) {
		throw new Error(loaded.error);
	}

	const result = {};
	const dom = new DOMParser().parseFromString(loaded.content, 'text/html');

	$qsa('form table td', dom).forEach((td, index) => {
		const category = td.textContent.match(/^([^\n]+)\n/)?.[1] ?? `delの理由(${index + 1})`;
		result[category] = [];

		for (const input of $qsa('input[name="reason"]', td)) {
			result[category].push({
				value: input.getAttribute('value'),
				text: input.nextSibling.nodeValue
			});
		}
	});

	return result;
}

/*
 * <<<1 functions which handles a thumbnail for posting image
 */

function getThumbnailSize (width, height, maxWidth, maxHeight) {
	if (width > maxWidth || height > maxHeight) {
		const ratio = Math.min(maxWidth / width, maxHeight / height);
		return {
			width: Math.floor(width * ratio + 0.5),
			height: Math.floor(height * ratio + 0.5)
		};
	}
	else {
		return {width, height};
	}
}

async function setPostThumbnailVisibility (visible) {
	const thumb = $('post-image-thumbnail-wrap');
	if (!thumb) return;
	if (!thumb.dataset.available) {
		thumb.classList.add('hide');
		return;
	}

	thumb.classList.remove('hide');
	await delay(0);

	// show
	if (visible) {
		thumb.classList.add('run');
		await transitionendp(thumb, 400);
	}

	// hide
	else {
		thumb.classList.remove('run');
		await transitionendp(thumb, 400);
		thumb.classList.add('hide');
	}
}

async function doDisplayThumbnail (thumbWrap, thumb, media) {
	if (!media) {
		return;
	}

	if (media instanceof HTMLVideoElement) {
		await new Promise(resolve => {
			/*
			function f1 (ev) {
				log(`event: ${ev.type}`);
			}
			[
				'abort', 'canplay', 'canplaythrough', 'durationchange', 'emptied', 'encrypted',
				'ended', 'error', 'interruptbegin', 'interruptend', 'loadeddata', 'loadedmetadata',
				'loadstart', 'pause', 'play', 'playing', 'progress', 'ratechange', 'seeked',
				'seeking', 'stalled', 'suspend', 'volumechange', 'waiting', 'timeupdate'
			].forEach(en => {
				media.addEventListener(en, f1);
			});
			*/

			media.addEventListener('timeupdate', () => {
				if (media.dataset.resolved !== '1') {
					media.dataset.resolved = '1';
					media.pause();
					resolve();
				}
			}, {once: true});

			setTimeout(() => {
				if (media.dataset.resolved !== '1') {
					media.dataset.resolved = '1';
					media.pause();
					resolve();
				}
			}, 1000);

			media.muted = true;
			media.play();
		});
	}

	const postformRect = $('postform').getBoundingClientRect();
	thumbWrap.style.width = `${postformRect.left}px`;

	// 24 = right margin (thumbWrap): 8px
	//    + left and right border width (thumbOuter): 8px + 8px
	const containerWidth = Math.min(Math.floor(postformRect.left - 24), 250);
	const containerHeight = Math.min(Math.floor(viewportRect.width / 4 * 0.8), 250);
	const naturalWidth = media.naturalWidth || media.videoWidth || media.width;
	const naturalHeight = media.naturalHeight || media.videoHeight || media.height;
	const size = getThumbnailSize(
		naturalWidth, naturalHeight,
		containerWidth, containerHeight);

	const canvas = document.createElement('canvas');
	canvas.width = size.width;
	canvas.height = size.height;

	const c = canvas.getContext('2d');
	c.fillStyle = '#f0e0d6';
	c.fillRect(0, 0, canvas.width, canvas.height);
	c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
	c.drawImage(
		media,
		0, 0, naturalWidth, naturalHeight,
		0, 0, canvas.width, canvas.height);

	thumbWrap.classList.add('hide');
	thumb.classList.remove('run');
	thumbWrap.dataset.available = '2';
	thumb.width = canvas.width;
	thumb.height = canvas.height;
	thumb.src = canvas.toDataURL();

	await commands.activatePostForm('doDisplayThumbnail')
}

async function setPostThumbnail (target, caption = '(on demand content)') {
	const thumbWrap = $('post-image-thumbnail-wrap');
	const thumb = $('post-image-thumbnail');

	if (!thumbWrap || !thumb) return;

	/*
	 * initialize posting options
	 */

	const postImageUnexif = $('post-image-unexif');
	postImageUnexif.checked = storage.config.strip_exif.value;

	const postImageRandomize = $('post-image-randomize');
	if (coinCharge) {
		postImageRandomize.parentNode.classList.remove('hide');
		postImageRandomize.checked = false;
	}
	else {
		postImageRandomize.parentNode.classList.add('hide');
		postImageRandomize.checked = false;
	}

	/*
	 * do nothing if target not available
	 */

	if (!target || 'type' in target && !/^(?:image\/(?:jpeg|png|webp|gif))|video\/(?:webm|mp4)$/.test(target.type)) {
		delete thumbWrap.dataset.available;
		await setPostThumbnailVisibility(false);
		return;
	}

	/*
	 * determine media
	 */

	let media;
	if (target instanceof HTMLCanvasElement) {
		const blob = await new Promise(resolve => {target.toBlob(resolve)});
		caption += `, ${getReadableSize(blob.size)}`;
		media = target;
	}
	else if (target instanceof HTMLImageElement
	|| target instanceof HTMLVideoElement) {
		media = target;
	}
	else {
		caption = `${target.type}, ${getReadableSize(target.size)}`;
		media = await getImageFrom(target);
	}
	$t($qs('#post-image-thumbnail-info > div:nth-child(1)'), caption);

	await doDisplayThumbnail(thumbWrap, thumb, media);
}

/*
 * <<<1 common panel tab handling functions
 */

function showPanel (callback) {
	const panel = $('panel-aside-wrap');

	// hide ad container
	$('ad-aside-wrap').classList.add('hide');

	// if catalog mode, ensure right margin
	if (pageModes[0].mode === 'catalog') {
		for (const div of $qsa('#catalog .catalog-threads-wrap > div')) {
			div.style.marginRight = '24%';
		}
	}

	if (panel.classList.contains('run')) {
		callback && callback(panel);
	}
	else {
		// show panel container
		setTimeout(() => {panel.classList.add('run')}, 0);
		callback && transitionend(panel, () => {
			callback(panel);
		});
	}
}

function hidePanel (callback) {
	const panel = $('panel-aside-wrap');

	if (panel.classList.contains('run')) {
		setTimeout(() => {panel.classList.remove('run')}, 0);
		transitionend(panel, e => {
			// if catalog mode, restore right margin
			if (pageModes[0].mode === 'catalog') {
				for (const div of $qsa('#catalog .catalog-threads-wrap > div')) {
					div.style.marginRight = '';
				}
			}
			// summary/reply mode: show ad container
			else {
				$('ad-aside-wrap').classList.remove('hide');
			}

			callback && callback(e.target);
		});
	}
	else {
		callback && callback(panel);
	}
}

function activatePanelTab (tab) {
	const tabId = /#(.+)/.exec(new URL(tab.href).hash)?.[1];
	if (!tabId) return;

	for (const node of $qsa('.panel-tab-wrap .panel-tab', 'panel-aside-wrap')) {
		node.classList.remove('active');
		if (node.getAttribute('href') === `#${tabId}`) {
			node.classList.add('active');
		}
	}

	for (const node of $qsa('.panel-content-wrap', 'panel-aside-wrap')) {
		node.classList.add('hide');
		if (node.id === `panel-content-${tabId}`) {
			node.classList.remove('hide');
		}
	}
}

/*
 * <<<1 search panel tab handling functions
 */

function searchBase (opts) {
	return modules('utils-reply-search').then(module => {
		const query = $('search-text').value;
		if (/^[\s\u3000]*$/.test(query)) {
			return;
		}

		const tester = module.createQueryCompiler().compile(query);
		if (tester.message) {
			$t('search-result-count', tester.message);
			return;
		}

		const result = $('search-result');
		let matched = 0;
		$('search-guide').classList.add('hide');
		empty(result);

		const nodes = [...$qsa(opts.targetNodesSelector)];
		if (opts.sort) {
			nodes.sort(opts.sort);
		}

		for (const node of nodes) {
			let text = [];
			for (const subNode of $qsa(opts.targetElementSelector, node)) {
				let t = opts.getTextContent(subNode);
				t = t.replace(/^\s+|\s+$/g, '');
				text.push(t);

				/*
				const markLength = t.match(/\p{M}/gu)?.length;
				if (markLength) {
					const restLength = t.replace(/\p{M}/gu, '');
					const ratio = restLength / markLength;
					console.log([
						'*** found marks ***',
						`   content: "${t}"`,
						`markLength: ${markLength}`,
						`restLength: ${restLength}`,
						`     ratio: ${ratio}`
					].join('\n'));
				}
				*/
			}
			if (tester.test(text.join('\t'))) {
				const anchor = result.appendChild(document.createElement('a'));
				const postNumber = opts.getPostNumber(node);
				anchor.href = '#search-item';
				anchor.dataset.number = postNumber;
				opts.fillItem(anchor, node);
				matched++;
			}
		}

		$t('search-result-count', _('search_result_count', matched));
	});
}

/*
 * <<<1 application commands
 */

const commands = {

	/*
	 * general functionalities
	 */

	activatePostForm (reason) { /*returns promise*/
		log(`post form activated by ${reason}`);
		catalogPopup.deleteAll();
		updateUpfileVisibility();
		const postformWrap = $('postform-wrap');
		postformWrap.classList.add('hover');
		$('com').focus();

		return setPostThumbnailVisibility(true);
	},
	deactivatePostForm () { /*returns promise*/
		document.body.focus();
		const postformWrap = $('postform-wrap');
		postformWrap.classList.remove('hover');

		return setPostThumbnailVisibility(false);
	},
	deactivateEditor () {
		return commands.deactivatePostForm();
		//console.log(e.target.outerHTML);
		//return keyManager.PASS_THROUGH;
	},
	scrollPage (e) {
		const sh = document.documentElement.scrollHeight;
		if (!e.shiftKey && scrollManager.lastScrollTop >= sh - viewportRect.height) {
			invokeMousewheelEvent();
		}
		else if (storage.config.hook_space_key.value) {
			window.scrollBy(
				0, Math.floor(viewportRect.height / 2) * (e.shiftKey ? -1 : 1));
		}
		else {
			return keyManager.PASS_THROUGH;
		}
	},
	clearUpfile () { /*returns promise*/
		resetForm('upfile', 'baseform');
		return setPostThumbnail();
	},
	summaryBack () {
		const current = $qs('.nav .nav-links .current');
		if (!current || !current.previousSibling) return;
		historyStateWrapper.pushState(current.previousSibling.href);
	},
	summaryNext () {
		const current = $qs('.nav .nav-links .current');
		if (!current || !current.nextSibling) return;
		historyStateWrapper.pushState(current.nextSibling.href);
	},
	async clearCredentials (e, t) {
		const content = t.textContent;
		t.disabled = true;
		try {
			$t(t, '処理中...');
			const savers = await resourceSaver.savers();
			await Promise.all(
				savers.map(saver => {
					return saver.fileSystem.forgetRootDirectory();
				}));
			$t(t, '完了');
			await delay(1000);
		}
		finally {
			$t(t, content);
			t.disabled = false;
		}
	},

	/*
	 * reload/post
	 */

	reload (...args) { /*returns promise*/
		switch (pageModes[0].mode) {
		case 'summary':
			return commands.reloadSummary.apply(commands, args);
		case 'reply':
			{
				const now = Date.now();

				if (reloadStatus.state === 'loading') {
					log(`reload: aborting reload...`);
					return Promise.resolve();
				}
				else if (reloadStatus.state === 'waiting') {
					if (!args[0]?.ignoreWaiting) {
						log(`reload: we are still in the waiting time.`);
						return Promise.resolve();
					}
				}

				let reloader;
				if (now - reloadStatus.lastReloaded < storage.config.full_reload_interval.value * 1000 * 60) {
					reloader = commands.reloadRepliesViaAPI;
				}
				else {
					reloadStatus.lastReloaded = now;
					reloader = commands.reloadReplies;
				}

				reloadStatus.state = 'loading';
				return reloader.apply(commands, args);
			}
		case 'catalog':
			return commands.reloadCatalog.apply(commands, args);
		default:
			throw new Error(`Unknown page mode: ${pageModes[0].mode}`);
		}
	},
	async reloadSummary () {
		if (pageModes[0].mode !== 'summary') {
			return;
		}

		let content = $('content');
		let indicator = $('content-loading-indicator');
		let footer = $('footer');

		$t(indicator, _('loading_hold_on'));
		content.style.height = content.offsetHeight + 'px';
		content.classList.add('init');
		indicator.classList.remove('hide');
		indicator.classList.remove('error');
		footer.classList.add('hide');

		try {
			const [, {doc, now, status}] = await Promise.all([
				transitionendp(content, 400),
				reloadBase()
			]);
			let fragment;

			reloadStatus.lastStatus = status;

			switch (status) {
			case 304:
				window.scrollTo(0, 0);
				await delay(WAIT_AFTER_RELOAD);
				footer.classList.remove('hide');
				content.classList.remove('init');
				content = indicator = null;
				timingLogger.endTag();
				return;
			}

			if (!doc) {
				throw new Error(_('strange_content', status));
			}

			timingLogger.startTag('generate internal xml');
			try {
				timingLogger.startTag('generate');
				const xml = xmlGenerator.run(doc.documentElement.innerHTML).xml;
				timingLogger.endTag();

				timingLogger.startTag('applying data bindings');
				applyDataBindings(xml);
				timingLogger.endTag();

				timingLogger.startTag('transforming');
				xsltProcessor.setParameter(null, 'render_mode', 'threads');
				fragment = fixFragment(xsltProcessor.transformToFragment(xml, document));
				timingLogger.endTag();
			}
			finally {
				timingLogger.endTag();
			}

			timingLogger.startTag(`waiting (max ${WAIT_AFTER_RELOAD} msecs)`);
			await delay(Math.max(0, WAIT_AFTER_RELOAD - (Date.now() - now)));
			timingLogger.endTag();

			timingLogger.startTag('appending the contents');
			empty(content);
			window.scrollTo(0, 0);
			content.style.height = '';
			extractDisableOutputEscapingTags(content, fragment);
			fragment = null;
			timingLogger.endTag();

			timingLogger.startTag('transition');
			content.classList.remove('init');
			await transitionendp(content, 400);
			timingLogger.endTag();

			footer.classList.remove('hide');
			modifyPage();

			storage.setLocal({
				viewers: {
					total: $('viewers').textContent - 0,
					server: siteInfo.server,
					board: siteInfo.board
				}
			});
		}
		catch (err) {
			let message;
			if (err.name === 'AbortError') {
				message = _('aborted');
			}
			else {
				message = _('failed_to_load_summary_page');
				console.error(err.message);
			}
			footer.classList.remove('hide');
			indicator.classList.add('error');
			$t(indicator, message);

			log(`${APP_NAME}: reloadSummary failed: ${err.stack}`);
		}
		finally {
			timingLogger.forceEndTag();
		}
	},
	async reloadReplies (opts = {}) {
		if (pageModes[0].mode !== 'reply') {
			log(`reloadReplies: not reply mode`);
			return;
		}

		timingLogger.reset().startTag('reloading replies');
		setBottomStatus(_('loading'), true);
		removeRule();
		postStats.resetPostformView();
		reloadStatus.lastRepliesCount = getRepliesCount();
		titleIndicator.stopBlink();
		dumpDebugText();

		let canInvokeReloadCallbacks = true;
		try {
			const {doc, status} = await reloadBase();
			let result;

			reloadStatus.lastStatus = status;
			reloadStatus.state = 'waiting';

			switch (status) {
			case 404:
				setReloaderStatus();
				setBottomStatus(_('full_reload_complete_404'));

				$t('expires-remains', '-');
				$t('pf-expires-remains', '-');
				$t('reload-anchor', _('load_complete_404_anchor'));

				log(`reloadReplies: got status ${status}.`);
				return;
			case 304:
				setReloaderStatus(_('no_further_posts'));
				setBottomStatus(_('full_reload_complete_304'));

				log(`reloadReplies: got status ${status}.`);
				return;
			case /^5[0-9]{2}$/.test(status) && status:
				setReloaderStatus(_('server_error'));
				setBottomStatus(_('full_reload_complete_5xx', status));

				log(`reloadReplies: got status ${status}.`);
				return;
			}

			if (!doc) {
				throw new Error(_('strange_content', status));
			}

			// process topic block

			setBottomStatus(_('processing'), true);

			timingLogger.startTag('generate internal xml for topic block');
			try {
				timingLogger.startTag('generate');
				// note: pass 0 as maxReplies to skip extraction of replies
				result = xmlGenerator.run(doc.documentElement.innerHTML, 0, !!opts.isAfterPost);
				timingLogger.endTag();

				timingLogger.startTag('applying data bindings');
				applyDataBindings(result.xml);
				timingLogger.endTag();

				timingLogger.startTag('update topic mark,id,sodane');
				updateTopic(result.xml, document);
				timingLogger.endTag();
			}
			finally {
				timingLogger.endTag();
			}

			// process replies block

			storage.setLocal({
				viewers: {
					total: $qs('meta viewers', result.xml).textContent - 0,
					server: siteInfo.server,
					board: siteInfo.board
				}
			});

			// process remaining replies
			canInvokeReloadCallbacks = false;
			processRemainingReplies(
				opts,
				result.remainingRepliesContext,
				getLastReplyNumber(),
				newStat => {
					const message = newStat.delta.total ?
						_('new_posts', newStat.delta.total) :
						_('no_new_posts');
					setReloaderStatus(message);

					const bottomMessage = _('full_reload_complete');
					setBottomStatus(bottomMessage);

					executeAfterReloadCallbacks();
				}
			);
		}
		catch (err) {
			let message;
			if (err.name === 'AbortError') {
				message = _('aborted');
				setReloaderStatus(message);
				setBottomStatus(message);
			}
			else {
				message = _('failed_to_load_further_posts');
				console.error(err.message);
				setReloaderStatus(message, true);
				setBottomStatus(message);
			}

			log(`${APP_NAME}: reloadReplies failed: ${err.stack}`);
		}
		finally {
			timingLogger.forceEndTag();

			if ('noticeNew' in siteInfo) {
				if (siteInfo.notice === siteInfo.noticeNew) {
					delete siteInfo.noticeNew;
				}
				else {
					if (siteInfo.notice !== '') {
						detectNoticeModification(siteInfo.notice, siteInfo.noticeNew).then(() => {
							commands.activateNoticeTab();
							alert(_('notice_updated'));
						});
					}

					const result = await chromeWrap.storage.sync.get({notices:{}});
					result.notices[`${siteInfo.server}/${siteInfo.board}`] = siteInfo.noticeNew;
					storage.setSynced(result);

					siteInfo.notice = siteInfo.noticeNew;
					delete siteInfo.noticeNew;
				}
			}

			if (canInvokeReloadCallbacks) {
				executeAfterReloadCallbacks();
			}
		}
	},
	async reloadRepliesViaAPI (opts = {}) {
		if (pageModes[0].mode !== 'reply') {
			log(`reloadRepliesViaAPI: not reply mode`);
			return;
		}

		timingLogger.reset().startTag('reloading replies via API');
		setBottomStatus(_('loading'), true);
		removeRule();
		postStats.resetPostformView();
		reloadStatus.lastRepliesCount = getRepliesCount();
		titleIndicator.stopBlink();
		dumpDebugText();

		try {
			const headResult = opts.skipHead ?
				{doc: null, now: Date.now(), status: 200} :
				await reloadBase({method: 'head'});

			reloadStatus.lastStatus = headResult.status;
			reloadStatus.state = 'waiting';

			switch (headResult.status) {
			case 404:
				setReloaderStatus();
				setBottomStatus(_('diff_load_complete_404'));

				$t('expires-remains', '-');
				$t('pf-expires-remains', '-');
				$t('reload-anchor', _('load_complete_404_anchor'));

				log(`reloadRepliesViaAPI: got status ${headResult.status}.`);
				return;
			case 304:
				setReloaderStatus(_('no_further_posts'));
				setBottomStatus(_('diff_reload_complete_304'));

				log(`reloadRepliesViaAPI: got status ${headResult.status}.`);
				return;
			case /^5[0-9]{2}$/.test(headResult.status) && headResult.status:
				setReloaderStatus(_('server_error'));
				setBottomStatus(_('diff_reload_complete_5xx', headResult.status));

				log(`reloadRepliesViaAPI: got status ${headResult.status}.`);
				return;
			}

			const {doc} = await reloadBaseViaAPI();
			const result = xmlGenerator.runFromJson(
				doc,
				$qs('article .replies').childElementCount,
				!!opts.isAfterPost);

			xsltProcessor.setParameter(null, 'render_mode', 'replies');
			const container = getReplyContainer();
			const fragment = fixFragment(xsltProcessor.transformToFragment(result.xml, document));

			if ($qs('.reply-wrap', fragment)) {
				createRule(container);
				extractDisableOutputEscapingTags(container, fragment);
				stripTextNodes(container);

				const newStat = postStats.done();
				if ($qs('#panel-aside-wrap.run #panel-content-mark:not(.hide)')) {
					postStats.updatePanelView(newStat);
				}
				titleIndicator.startBlink();
				postStats.updatePostformView(newStat);

				const message = _('new_posts', newStat.delta.total)
				setReloaderStatus(message);

				const bottomMessage = _('diff_reload_complete');
				setBottomStatus(bottomMessage);

				scrollToNewReplies(opts.scrollBehavior, () => {
					updateSodanePosts(newStat);
					updateIdFrequency(newStat);
					modifyPage();
					timingLogger.forceEndTag();
				});
			}
			else {
				const message = _('no_new_posts');
				setReloaderStatus(message);

				const bottomMessage = _('diff_reload_complete');
				setBottomStatus(bottomMessage);

				timingLogger.forceEndTag();
			}
		}
		catch (err) {
			let message;
			if (err.name === 'AbortError') {
				message = _('aborted');
				setReloaderStatus(message);
				setBottomStatus(message);
			}
			else {
				message = _('failed_to_load_further_posts');
				console.error(err.message);
				setReloaderStatus(message, true);
				setBottomStatus(message);
			}

			log(`${APP_NAME}: reloadRepliesViaAPI failed: ${err.stack}`);
		}
		finally {
			timingLogger.forceEndTag();
			executeAfterReloadCallbacks();
		}
	},
	async reloadCatalog () {
		if (pageModes[0].mode !== 'catalog') {
			return;
		}

		const sortMap = {
			'#catalog-order-default': {n:0, key:'default'},
			'#catalog-order-new': {n:1, key:'new'},
			'#catalog-order-old': {n:2, key:'old'},
			'#catalog-order-most': {n:3, key:'most'},
			'#catalog-order-less': {n:4, key:'less'},
			'#catalog-order-trend': {n:5, key:'trend'},
			//'#catalog-order-view': {n:7, key:'view'},
			'#catalog-order-sodane': {n:8, key:'sodane'},
			'#catalog-order-hist': {n:7, key:'hist'}
		};

		const p = $qs('#catalog .catalog-options a.active');
		const sortType = sortMap[p ? p.getAttribute('href') : '#catalog-order-default'];
		const wrap = $(`catalog-threads-wrap-${sortType.key}`);

		if (wrap.classList.contains('run')) {
			return;
		}

		// update catalog settings
		if (!wrap.firstChild) {
			const currentCs = getCatalogSettings();
			$('catalog-horz-number').value = currentCs[0];
			$('catalog-vert-number').value = currentCs[1];
			$('catalog-with-text').checked = currentCs[2] > 0;
		}

		commands.updateCatalogSettings({
			x: $('catalog-horz-number').value,
			y: $('catalog-vert-number').value,
			text: $('catalog-with-text').checked ? storage.config.catalog_text_max_length.value : 0
		});

		setBottomStatus(_('loading'), true);
		catalogPopup.deleteAll();
		wrap.classList.add('run');

		try {
			const [, {doc, now}, summaryReloadResult, openedThreads] = await Promise.all([
				transitionendp(wrap, 300),
				reloadCatalogBase(sortType ? `&sort=${sortType.n}` : ''),
				reloadBase(),
				urlStorage.getAll()
			]);

			const attributeConverter1 = {
				'href': (anchor, name, value) => {
					anchor.setAttribute(name, `/${siteInfo.board}/${value}`);
				},
				'target': (anchor, name, value) => {
					anchor.setAttribute(name, value);
				}
			};

			const attributeConverter2 = {
				'data-src': (img, pad, name, value) => {
					img.src = storage.config.catalog_thumbnail_scale.value >= 1.5 ?
						value.replace('/cat/', '/thumb/') : value;
				},
				'width': (img, pad, name, value) => {
					value = Math.floor((value - 0) * storage.config.catalog_thumbnail_scale.value);
					img.style.width = value + 'px';
				},
				'height': (img, pad, name, value) => {
					value = Math.floor((value - 0) * storage.config.catalog_thumbnail_scale.value);
					img.style.height = value + 'px';
				},
				'alt': (img, pad, name, value) => {
					img.setAttribute('alt', value);
				}
			};

			const cellImageWidth = Math.floor(CATALOG_THUMB_WIDTH * storage.config.catalog_thumbnail_scale.value);
			const cellImageHeight = Math.floor(CATALOG_THUMB_HEIGHT * storage.config.catalog_thumbnail_scale.value);
			const anchorWidth = cellImageWidth + CATALOG_ANCHOR_PADDING;
			const currentCs = getCatalogSettings();
			const newIndicator = wrap.childNodes.length ? 'new' : '';
			const newClass = wrap.childNodes.length ? 'new' : '';

			let insertee = wrap.firstChild;

			wrap.style.maxWidth = `${((anchorWidth + CATALOG_ANCHOR_MARGIN) * currentCs[0])}px`;

			/*
			 * in history sort, bring posted threads to the top
			 */

			if (sortType.n === 7) {
				let first = $qs('table[align="center"] td a', doc);
				if (first) {
					first = first.parentNode;

					for (let node of $qsa('table[align="center"] td a', doc)) {
						const href = /res\/(\d+)\.htm/.exec(node.getAttribute('href'));
						if (!href) continue;
						const number = href[1] - 0;
						if (!(number in openedThreads)) continue;
						if (openedThreads[number].post <= 0) continue;

						node = node.parentNode;
						if (node === first) {
							first = node.nextSibling;
						}
						else {
							removeChild(node);
							first.parentNode.insertBefore(node, first);
						}
					}
				}
			}

			/*
			 * traverse all anchors in new catalog
			 */

			for (const node of $qsa('table[align="center"] td a', doc)) {
				let threadNumber = /(\d+)\.htm/.exec(node.getAttribute('href'));
				if (!threadNumber) continue;

				let repliesCount = 0, from, to;

				threadNumber = threadNumber[1] - 0;

				// number of replies
				from = $qs('font', node.parentNode);
				if (from) {
					repliesCount = from.textContent;
				}

				// find anchor already exists
				let anchor = $(`c-${sortType.key}-${threadNumber}`);
				if (anchor) {
					// found. reuse it
					if (anchor === insertee) {
						insertee = insertee.nextSibling;
					}
					anchor.parentNode.insertBefore(anchor, insertee);

					// update reply number and class name
					const info = $qs('.info', anchor);
					let oldRepliesCount = info.firstChild.textContent;
					info.firstChild.textContent = repliesCount;
					if (!isNaN(repliesCount - 0)
					&&  !isNaN(oldRepliesCount - 0)
					&&  repliesCount !== oldRepliesCount) {
						repliesCount -= 0;
						oldRepliesCount -= 0;
						anchor.className = repliesCount > CATALOG_LONG_CLASS_THRESHOLD ? 'long' : '';
						info.lastChild.textContent =
							(repliesCount > oldRepliesCount ? '+' : '') +
							(repliesCount - oldRepliesCount);
					}
					else {
						anchor.className = '';
						info.lastChild.textContent = '';
					}

					continue;
				}

				// not found. create new one
				anchor = wrap.insertBefore(document.createElement('a'), insertee);
				anchor.id = `c-${sortType.key}-${threadNumber}`;
				anchor.dataset.number = `${threadNumber},0`;
				anchor.style.width = anchorWidth + 'px';
				anchor.className = newClass;

				// image
				const imageWrap = anchor.appendChild(document.createElement('div'));
				imageWrap.className = 'image';
				imageWrap.style.height = cellImageHeight + 'px';

				// attribute conversion #1
				for (let atr in attributeConverter1) {
					const value = node.getAttribute(atr);
					if (value === null) continue;
					attributeConverter1[atr](anchor, atr, value);
				}

				from = $qs('img', node);
				if (from) {
					to = imageWrap.appendChild(document.createElement('img'));

					// attribute conversion #2
					for (let atr in attributeConverter2) {
						const value = from.getAttribute(atr);
						if (value === null) continue;
						attributeConverter2[atr](to, imageWrap, atr, value);
					}

					const imageNumber = /(\d+)s\.jpg/.exec(to.src)[1];
					anchor.dataset.number = `${threadNumber},${imageNumber}`;
				}

				// text
				from = $qs('small', node.parentNode);
				if (from) {
					to = anchor.appendChild(document.createElement('div'));
					to.className = 'text';
					to.textContent = getTextForCatalog(
						from.textContent.replace(/\u2501.*\u2501\s*!+/, '\u2501!!'), 4);
					to.dataset.text = from.textContent;
					if (/^>/.test(from.textContent)) {
						to.classList.add('quote');
					}
				}

				to = anchor.appendChild(document.createElement('div'));
				to.className = 'info';
				to.appendChild(document.createElement('span')).textContent = repliesCount;
				to.appendChild(document.createElement('span')).textContent = newIndicator;
			}

			// find latest post number
			if (summaryReloadResult.status >= 200 && summaryReloadResult.status <= 299) {
				const firstThread = $qs('div.thre', summaryReloadResult.doc);
				const comments = $qsa('input[type="checkbox"][value="delete"],span[id^="delcheck"]', firstThread);
				if (comments.length) {
					const last = comments[comments.length - 1];
					if (/^delcheck(\d+)/.test(last.id)) {
						siteInfo.latestNumber = RegExp.$1 - 0;
					}
					else if (last.name) {
						siteInfo.latestNumber = last.name - 0;
					}
				}
			}

			switch (sortType.n) {
			// default, old
			case 0: case 2:
				{
					const deleteLimit = siteInfo.latestNumber - siteInfo.logSize;

					// process all remaining anchors which have not changed and find dead thread
					while (insertee) {
						let [threadNumber, imageNumber] = insertee.dataset.number.split(',');
						threadNumber -= 0;
						imageNumber -= 0;

						let isDead = false;
						if (siteInfo.minThreadLifeTime === 0) {
							if (threadNumber < deleteLimit) {
								isDead = true;
							}
						}
						else {
							if (imageNumber === 0) {
								if (threadNumber < deleteLimit) {
									isDead = true;	// TODO: text-only thread may be considered to be dead even
													// though it is alive
								}
							}
							else {
								// treat imageNumber as the birth time of thread
								const age = now - imageNumber;
								if (threadNumber < deleteLimit && age > siteInfo.minThreadLifeTime) {
									isDead = true;
								}
							}
						}

						if (isDead) {
							const tmp = insertee.nextSibling;
							removeChild(insertee);
							insertee = tmp;
						}
						else {
							insertee.className = '';
							$qs('.info', insertee).lastChild.textContent = '';
							insertee = insertee.nextSibling;
						}
					}

					// pick up and mark old threads
					const warnLimit = Math.floor(siteInfo.latestNumber - siteInfo.logSize * CATALOG_EXPIRE_WARN_RATIO);
					for (let node = wrap.firstChild; node; node = node.nextSibling) {
						let [threadNumber, imageNumber] = node.dataset.number.split(',');

						if (threadNumber in openedThreads) {
							node.classList.add('soft-visited');
						}

						threadNumber -= 0;
						imageNumber -= 0;

						const isAdult = imageNumber > 0 && now - imageNumber >= siteInfo.minThreadLifeTime;

						if (threadNumber < warnLimit
						&& (siteInfo.minThreadLifeTime === 0 || imageNumber === 0 || isAdult)) {
							node.classList.add('warned');
						}
					}
				}
				break;

			// new, most, less, trend, sodane, hist
			default:
				{
					while (insertee) {
						const tmp = insertee.nextSibling;
						removeChild(insertee);
						insertee = tmp;
					}

					for (let node = wrap.firstChild; node; node = node.nextSibling) {
						let [threadNumber] = node.dataset.number.split(',');
						threadNumber -= 0;

						if (threadNumber in openedThreads) {
							if (sortType.n === 7) {
								if (openedThreads[threadNumber].post <= 0) {
									node.classList.add('soft-link');
									node.classList.remove('soft-visited');
								}
								else {
									node.classList.add('soft-visited');
								}
							}
							else {
								node.classList.add('soft-visited');
							}
						}
					}
				}
				break;
			}

			const activePanel = $qs('#panel-aside-wrap:not(.hide) .panel-tab.active');
			if (activePanel && /#search/.test(activePanel.href)) {
				commands.searchCatalog();
			}

			wrap.classList.remove('run');
			setBottomStatus(_('catalog_load_complete'));
			window.scrollTo(0, 0);
		}
		catch (err) {
			let message;
			if (err.name === 'AbortError') {
				message = _('aborted');
			}
			else {
				message = _('failed_to_load_catalog');
				console.error(err.message);
			}
			wrap.classList.remove('run');
			setBottomStatus(message);

			log(`${APP_NAME}: reloadCatalog failed: ${err.stack}`);
		}
	},
	async post () {
		if ($qs('fieldset', 'postform').disabled) {
			return;
		}

		setBottomStatus(_('posting'));
		$qs('fieldset', 'postform').disabled = true;

		try {
			let response = await postBase($('postform'));
			if (!response) {
				throw new Error(_('invalid_post_response', 'empty response'));
			}

			response = response.replace(/\r\n|\r|\n/g, '\t');
			if (/warning/i.test(response)) {
				log(
					`${APP_NAME}: ` +
					`warning in response: ${response.replace(/.{1,72}/g, '$&\n')}`);
			}

			const baseUrl = `${location.protocol}//${location.host}/${siteInfo.board}/`;
			const result = parsePostResponse(response, baseUrl);

			if (result.error) {
				throw new Error(_('invalid_post_response', result.error));
			}

			if (result.redirect) {
				await delay(WAIT_AFTER_POST);
				commands.deactivatePostForm();
				setPostThumbnail();
				resetForm('com', 'com2', 'upfile', 'textonly', 'baseform');
				setBottomStatus(_('posting_completed'));

				switch (pageModes[0].mode) {
				case 'summary':
				case 'catalog':
					if (result.redirect !== '') {
						backend.send('open', {
							url: result.redirect,
							selfUrl: location.href
						});
					}
					break;
				case 'reply':
					if (storage.config.full_reload_after_post.value) {
						reloadStatus.lastReloaded = Date.now() - storage.config.full_reload_interval.value * 1000 * 60;
					}
					reloadStatus.state = null;
					await commands.reload({
						skipHead: true,
						isAfterPost: true
					});
					activeTracker.reset();
					break;
				}
			}
		}
		catch (err) {
			let message;
			if (err.name === 'AbortError') {
				message = _('aborted');
			}
			else {
				message = _('failed_to_post');
			}
			setBottomStatus(message);
			alert(`${message}\n${err.message}`);

			log(`${APP_NAME}: post failed: ${err.stack}`);
		}
		finally {
			$qs('fieldset', 'postform').disabled = false;
		}
	},
	sodane (e, anchor) {
		if (!anchor) return;

		const postNumber = getPostNumber(anchor);
		if (!postNumber) return;

		postingEvaluator.sodane(postNumber, true);
	},
	quickModerate (e, anchor) {
		if (!anchor) return;
		if (anchor.classList.contains('posted')) return;

		const postNumber = getPostNumber(anchor);
		if (!postNumber) return;

		anchor.classList.add('posted');
		postingEvaluator.moderate(postNumber, QUICK_MODERATE_REASON_CODE, true);
	},

	/*
	 * dialogs
	 */

	async openEvaluateDialog (isModerate) {
		const reasons = await getDelReasons();
		const postNumbers = Array.prototype.map.call(getCheckedArticles(), getPostNumber);

		return await new Promise(resolve => {
			modalDialog({
				title: _('dialog_evaluation'),
				buttons: 'ok, cancel',
				oninit: dialog => {
					const xml = dialog.createDocument();
					const countNode = xml.documentElement.appendChild(xml.createElement('count'));
					countNode.textContent = postNumbers.length;
					return dialog.initFromXML(xml, 'delete-dialog');
				},
				onopen: dialog => {
					if (postNumbers.length === 0) return;

					// reasons
					const select = $qs('select.reason', dialog.content);
					let selectedOption, quickModerateOption;
					for (const category in reasons) {
						const group = select.appendChild(document.createElement('optgroup'));
						group.label = category;

						for (const {value, text} of reasons[category]) {
							const option = group.appendChild(document.createElement('option'));
							option.value = value;
							option.textContent = text;

							if (value === QUICK_MODERATE_REASON_CODE) {
								quickModerateOption = option;
							}

							if (value === storage.runtime.del.lastReason) {
								option.selected = true;
								selectedOption = option;
							}
						}
					}
					if (quickModerateOption && !selectedOption) {
						quickModerateOption.selected = true;
					}

					// focus delete key
					const deleteKey = $qs('.delete-key', dialog.content);
					deleteKey.value = getCookie('pwdc');

					if (isModerate) {
						$qs('input[name="evalmode"][value="moderate"]').checked = true;
					}
					else {
						$qs('input[name="evalmode"][value="delete"]').checked = true;
						deleteKey.focus();
					}
				},
				onok: dialog => {
					if (postNumbers.length === 0) return;

					switch ($qs('[name="evalmode"]:checked', dialog.content).value) {
					case 'delete':
						{
							const deleteKey = $qs('.delete-key', dialog.content).value;
							const imageOnly = $qs('.delete-only-image', dialog.content).checked;
							postingEvaluator.delete(postNumbers, deleteKey, imageOnly);
						}
						break;

					case 'moderate':
						{
							const reason = $qs('select.reason', dialog.content).value;
							storage.runtime.del.lastReason = reason;
							storage.saveRuntime();
							postingEvaluator.moderate(postNumbers, reason);
						}
						break;
					}
				},
				onclose: () => {
					resolve();
				}
			});
		});

	},
	openConfigDialog () {
		modalDialog({
			title: _('dialog_config'),
			buttons: 'ok, cancel',
			oninit: async dialog => {
				const xml = dialog.createDocument();
				const itemsNode = xml.documentElement.appendChild(xml.createElement('items'));
				itemsNode.setAttribute('prefix', 'config-item.');

				await storage.loadConfigNames();

				const config = storage.config;
				for (let i in config) {
					const item = itemsNode.appendChild(xml.createElement('item'));
					item.setAttribute('internal', i);
					item.setAttribute('name', config[i].name);
					item.setAttribute('value', config[i].value);
					item.setAttribute('type', config[i].type);
					'desc' in config[i] && item.setAttribute('desc', config[i].desc);
					'min' in config[i] && item.setAttribute('min', config[i].min);
					'max' in config[i] && item.setAttribute('max', config[i].max);

					if ('list' in config[i]) {
						for (let j in config[i].list) {
							const li = item.appendChild(xml.createElement('li'));
							li.textContent = config[i].list[j];
							li.setAttribute('value', j);
							j === config[i].value && li.setAttribute('selected', 'true');
						}
					}
				}

				await dialog.initFromXML(xml, 'config-dialog');

				// special element for mouse wheel unit
				const wheelUnit = $qs('input[name="config-item.wheel_reload_unit_size"]');
				if (wheelUnit) {
					const span = wheelUnit.parentNode.insertBefore(
						document.createElement('span'), wheelUnit.nextSibling);
					span.id = 'wheel-indicator';
					wheelUnit.addEventListener('wheel', e => {
						$('wheel-indicator').textContent = _('dialog_move_delta', e.deltaY);
						e.preventDefault();
					});
				}
			},
			onok: dialog => {
				const storageData = {};
				populateTextFormItems(dialog.content, item => {
					const name = item.name.replace(/^config-item\./, '');
					let value = item.value;

					if (item.nodeName === 'INPUT') {
						switch (item.type) {
						case 'checkbox':
							value = item.checked;
							break;
						}
					}

					storageData[name] = value;
				}, true);
				storage.assignConfig(storageData);
				storage.saveConfig();
				applyDataBindings(xmlGenerator.run().xml);
			}
		});
	},
	openHelpDialog () {
		modalDialog({
			title: _('dialog_keyboard_shortcuts'),
			buttons: 'ok',
			oninit: dialog => {
				const xml = dialog.createDocument();
				return dialog.initFromXML(xml, 'help-dialog');
			}
		});
	},
	async openFileAccessAuthDialog (id) {
		const saver = await resourceSaver.savers(id);
		if (!saver) return;

		return await new Promise(resolve => {
			let authResult;

			modalDialog({
				title: saver.label,
				buttons: '',
				oninit: dialog => {
					const xml = dialog.createDocument();
					return dialog.initFromXML(xml, 'auth-dialog').then(() => {
						$qs('.start-auth span').textContent = saver.label;

						$qs('.start-auth', dialog.content).addEventListener('click', async e => {
							e.preventDefault();
							authResult = await saver.fileSystem.getRootDirectory(true);
							dialog.close();
						}, {once: true});

						$qs('.cancel-auth', dialog.content).addEventListener('click', e=> {
							e.preventDefault();
							dialog.close();
						}, {once: true});
					});
				},
				onclose: () => {
					resolve(authResult ?? {
						error: 'canceled',
						handle: null,
						from: 'dialog'
					});
				}
			});
		});
	},
	openCoinChargeDialog (startCharging) {
		return new Promise(resolve => {
			let loading = false;

			modalDialog({
				title: _('dialog_coin_autocharge'),
				buttons: '',
				oninit: dialog => {
					const xml = dialog.createDocument();
					return dialog.initFromXML(xml, 'coin-dialog').then(() => {
						const enableCharge = $qs('div.enable-charge', dialog.content);
						const disableCharge = $qs('div.disable-charge', dialog.content);
						if (startCharging) {
							enableCharge.classList.remove('hide');
							disableCharge.classList.add('hide');
						}
						else {
							enableCharge.classList.add('hide');
							disableCharge.classList.remove('hide');
						}

						$qs('.enable-charge', dialog.content).addEventListener('click', e => {
							e.preventDefault();

							loading = true;
							backend.send('coin', {
								command: 'set-autocharge-state',
								value: true
							}).then(result => {
								if (result && 'status' in result) {
									if (result.status.startsWith('error:')) {
										alert(`${result.status.replace(/^error:\s*/, '')}`);
									}
									else if (result.status === 'new ID registered') {
										alert(_('coin_registered'));
									}
									else if (result.status === 'ID is waiting for approval') {
										alert(_('coin_await_approval'));
									}
									else if (result.status === 'valid ID') {
										alert(_('coin_valid_id'));
									}
									else {
										alert(_('coin_invalid_status'));
									}
								}
								else {
									alert(_('coin_invalid_response'));
								}
							})
							.finally(() => {
								loading = false;
								dialog.close();
							});
						}, {once: true});

						$qs('.disable-charge', dialog.content).addEventListener('click', e=> {
							e.preventDefault();

							loading = true;
							backend.send('coin', {
								command: 'set-autocharge-state',
								value: false
							}).then(result => {
								if (result && 'status' in result) {
									if (result.status.startsWith('error:')) {
										alert(`${result.status.replace(/^error:\s*/, '')}`);
									}
									else {
										alert(_('coin_autocharge_disabled'));
									}
								}
								else {
									alert(_('coin_invalid_response'));
								}
							})
							.finally(() => {
								loading = false;
								dialog.close();
							});
						}, {once: true});
					});
				},
				onclose: () => {
					if (loading) return false;
					resolve();
				}
			});
		});
	},
	openMetadataDialog (metadata, activeKey) {
		return new Promise(resolve => {
			modalDialog({
				title: _('dialog_title_metadata'),
				buttons: 'ok',
				oninit: async dialog => {
					await dialog.initFromXML(dialog.createDocument(), 'metadata-dialog');

					const tabs = [];
					if (metadata.texts.length) {
						tabs.push({
							title: _('metadata_tab_text'),
							data: {
								textual_fragments: metadata.texts
							},
							active: activeKey.startsWith('text_') || activeKey === 'view-all'
						});
					}
					if (metadata.positivePrompts.length || metadata.negativePrompts.length) {
						const data = {};
						if (metadata.positivePrompts.length) {
							data.prompts = metadata.positivePrompts;
						}
						if (metadata.negativePrompts.length) {
							data.negativePrompts = metadata.negativePrompts;
						}
						tabs.push({
							title: _('metadata_tab_prompts'),
							data,
							active: activeKey === 'pp' || activeKey === 'np'
						});
					}
					if (metadata.structuredData.length) {
						tabs.push({
							title: _('metadata_tab_structured_data'),
							data: {
								structured_data: metadata.structuredData
							},
							active: activeKey === 'sd'
						});
					}
					if (metadata.gpsInfo.length) {
						tabs.push({
							title: _('metadata_tab_gps'),
							data: {
								gps_informations: metadata.gpsInfo
							},
							active: activeKey.startsWith('gps_')
						});
					}
					if (metadata.exifTags.length) {
						tabs.push({
							title: _('metadata_tab_exif'),
							data: {
								exif: metadata.exifTags
							},
							active: activeKey === 'exif'
						});
					}
					if (metadata.xmp.length) {
						tabs.push({
							title: _('metadata_tab_xmp'),
							data: {
								extensible_metadata_platform: metadata.xmp
							},
							active: activeKey === 'xmp'
						});
					}

					const iframeSource = OUTER_IFRAME_ORIGIN + '/json-viewer.html';
					const iframe = dialog.content.appendChild(document.createElement('iframe'));
					iframe.allow = 'clipboard-write';
					iframe.src = iframeSource;

					await Promise.race([
						new Promise(resolve => {
							iframe.onload = e => {
								e.target.src === iframeSource && resolve();
							};
						}),
						delay(1000 * 3)
					]);

					iframe.contentWindow.postMessage({
						command: 'init-json',
						jsonData: tabs
					}, OUTER_IFRAME_ORIGIN);
				},
				onclose: () => {
					resolve();
				}
			});
		});
	},
	openDrawDialog () {
		modules('momocan').then(() => {
			if ($('momocan-container')) {
				return runMomocan();
			}
			else {
				const style = chromeWrap.runtime.getURL('styles/momocan.css');
				return Akahuku.momocan.loadStyle(style).then(runMomocan);
			}
		});
	},

	/*
	 * form functionalities
	 */

	toggleSage () {
		const email = $('email');
		if (!email) return;
		email.value = /\bsage\b/.test(email.value) ?
			email.value.replace(/\s*\bsage\b\s*/g, '') :
			`sage ${email.value}`;
		email.setSelectionRange(email.value.length, email.value.length);
	},
	voice () {
		const s = window.getSelection().toString();
		if (s === '') return;
		execCommand('insertText', voice(s));
	},
	semiVoice () {
		const s = window.getSelection().toString();
		if (s === '') return;
		execCommand('insertText', voice(s, true));
	},
	newLine (e) {
		if (e.target.nodeName === 'INPUT') {
			return keyManager.PASS_THROUGH;
		}
		else {
			document.execCommand('insertLineBreak', false);
		}
	},
	/*
	cursorBeginningOfLine (e) {return execEditorCommand('cursorBeginningOfLine', e)},
	cursorEndOfLine (e) {return execEditorCommand('cursorEndOfLine', e)},
	cursorNextLine (e) {return execEditorCommand('cursorNextLine', e)},
	cursorPreviousLine (e) {return execEditorCommand('cursorPreviousLine', e)},
	cursorBackwardWord (e) {return execEditorCommand('cursorBackwardWord', e)},
	cursorForwardWord (e) {return execEditorCommand('cursorForwardWord', e)},
	cursorBackwardChar (e) {return execEditorCommand('cursorBackwardChar', e)},
	cursorForwardChar (e) {return execEditorCommand('cursorForwardChar', e)},
	cursorDeleteBackwardBlock (e) {return execEditorCommand('cursorDeleteBackwardBlock', e)},
	cursorDeleteBackwardWord (e) {return execEditorCommand('cursorDeleteBackwardWord', e)},
	cursorDeleteBackwardChar (e) {return execEditorCommand('cursorDeleteBackwardChar', e)},
	cursorDeleteForwardBlock (e) {return execEditorCommand('cursorDeleteForwardBlock', e)},
	cursorDeleteForwardChar (e) {return execEditorCommand('cursorDeleteForwardChar', e)},
	yank (e) {return execEditorCommand('yank', e)},
	copy (e) {return execEditorCommand('copy', e)},
	expr (e) {return execEditorCommand('expr', e)},
	selectAll (e) {return execEditorCommand('selectAll', e)},
	toggleSelectMode (e) {return execEditorCommand('toggleSelectMode', e)},
	*/

	/*
	 * catalog
	 */

	toggleCatalogVisibility () {
		const threads = $('content');
		const catalog = $('catalog');
		const ad = $('ad-aside-wrap');
		const panel = $('panel-aside-wrap');

		let scrollTop = 0;

		// activate catalog
		if (pageModes.length === 1) {
			pageModes.unshift({mode: 'catalog', scrollTop: docScrollTop()});
			threads.classList.add('hide');
			catalog.classList.remove('hide');
			ad.classList.add('hide');
			$t(
				$qs('#header a[href="#toggle-catalog"] span'),
				siteInfo.resno ? _('thread') : _('summary'));

			if (panel.classList.contains('run')) {
				for (const div of $qsa('#catalog .catalog-threads-wrap > div')) {
					div.style.marginRight = '24%';
				}
			}

			const active = $qs(
				'#catalog .catalog-threads-wrap > div:not([class*="hide"])');
			if (active && active.childNodes.length === 0) {
				commands.reloadCatalog();
			}

			historyStateWrapper.updateHash('mode=cat');
		}

		// deactivate catalog
		else {
			scrollTop = pageModes.shift().scrollTop;
			threads.classList.remove('hide');
			catalog.classList.add('hide');
			ad.classList.remove('hide');
			$t($qs('#header a[href="#toggle-catalog"] span'), _('catalog'));
			catalogPopup.deleteAll();
			historyStateWrapper.updateHash('');
		}

		setTimeout(() => {
			window.scrollTo(0, scrollTop);
		}, 0);
	},
	updateCatalogSettings (settings) {
		const cs = getCatalogSettings();
		if ('x' in settings) {
			const tmp = parseInt(settings.x, 10);
			if (!isNaN(tmp) && tmp >= 1 && tmp <= 20) {
				cs[0] = tmp;
			}
		}
		if ('y' in settings) {
			const tmp = parseInt(settings.y, 10);
			if (!isNaN(tmp) && tmp >= 1 && tmp <= 100) {
				cs[1] = tmp;
			}
		}
		if ('text' in settings) {
			const tmp = parseInt(settings.text, 10);
			if (!isNaN(tmp) && tmp >= 0 && tmp <= 1000) {
				cs[2] = tmp;
			}
		}
		cs[4] = 0;
		setBoardCookie('cxyl', cs.join('x'), CATALOG_COOKIE_LIFE_DAYS);
	},

	/*
	 * thread auto tracking
	 */

	registerAutotrack () {
		if (reloadStatus.lastStatus === 404) {
			return;
		}
		if (activeTracker.running) {
			activeTracker.stop();
		}
		else {
			activeTracker.start();
		}
	},

	/*
	 * thread auto saving
	 */

	registerAutosave () { /*returns promise*/
		return resourceSaver.thread().then(saver => {
			if (saver.running) {
				return saver.stop();
			}
			else {
				return saver.start();
			}
		});
	},
	async showActionMenu (e, t) {
		const quantity = getCheckedArticles().length;
		const coinMenuEnabled = quantity === 1 || coinCharge;
		const contextMenu = await modules('menu').then(menu => menu.createContextMenu());
		const item = await contextMenu.assign({
			key: 'action-to',
			items: [
				{key: 'quote', label: _('menu_quote')},
				{key: 'pull', label: _('menu_copy_to_comment')},
				{key: 'join', label: _('menu_daikuuji')},
				{key: '-'},
				{key: 'copy', label: _('menu_copy')},
				{key: 'copy-with-quote', label: _('menu_copy_with_quote')},
				{key: '-'},
				{
					key: 'sodane',
					label: _('menu_sodane'),
					cost: coinMenuEnabled ? getCoinCost('sodane', true) : null,
					disabled: !coinMenuEnabled
				},
				{
					key: 'delete',
					label: _('menu_delete'),
					cost: coinMenuEnabled ? getCoinCost('delete', true) : null,
					disabled: !coinMenuEnabled
				},
				{
					key: 'moderate',
					label: _('menu_moderate'),
					cost: coinMenuEnabled ? getCoinCost('moderate', true) : null,
					disabled: !coinMenuEnabled
				},
				{key: '-'},
				{key: 'select-between', label: _('menu_select_between')},
				{key: 'unselect-all', label: _('menu_clear_selection')}
			]
		})
		.open(t, 'action-to');

		if (!item) return;

		function clear () {
			getCheckedArticles().forEach(node => {
				node.checked = false;
			});
			updateCheckedPostIndicator();
		}

		function doForCheckedPosts (fn) {
			try {
				const nodes = getCheckedArticles();
				if (typeof fn === 'function') {
					const lines = [];
					nodes.forEach(node => {
						const result = fn(node);
						if (result !== undefined) {
							lines.push(result);
						}
					});
					return lines;
				}
				else {
					return nodes;
				}
			}
			finally {
				clear();
			}
		}

		switch (item.key) {
		case 'quote':
		case 'pull':
		case 'copy':
		case 'copy-with-quote':
			{
				const lines = doForCheckedPosts(node => {
					const comment = $qs('.comment', getWrapElement(node));
					if (comment) {
						return commentToString(comment);
					}
				});
				if (lines.length) {
					selectionMenu.dispatch(item.key, lines.join('\n'));
				}
			}
			break;
		case 'join':
			{
				const lines = doForCheckedPosts(node => {
					const comment = $qs('.comment', getWrapElement(node));
					if (comment) {
						return getTextForJoin(comment);
					}
				});
				if (lines.length) {
					selectionMenu.dispatch('pull', lines.join(''));
				}
			}
			break;
		case 'sodane':
			postingEvaluator.sodane(doForCheckedPosts(getPostNumber));
			break;
		case 'delete':
			await commands.openEvaluateDialog();
			break;
		case 'moderate':
			await commands.openEvaluateDialog(true);
			break;

		case 'select-between':
			{
				if (checkedPostNumbers.length < 2) {
					alert(_('menu_select_between_desc'));
					break;
				}

				const replies = $qs('article .replies');
				const [first, last] = checkedPostNumbers
					.slice(-2)
					.sort((a, b) => a - b)
					.map(number => {
						return Array.prototype.indexOf.call(
							replies.children,
							getWrapElement($qs(`article .reply-wrap > [data-number="${number}"]`))
						);
					});
				for (let i = Math.max(0, first); i <= last; i++) {
					const checkbox = $qs('input[type="checkbox"]', replies.children[i]);
					if (checkbox) {
						checkbox.checked = true;
					}
				}
				checkedPostNumbers.length = 0;
				updateCheckedPostIndicator();
			}
			break;

		case 'unselect-all':
			clear();
			break;
		}
	},

	/*
	 * asset saving
	 */

	async saveAssetViaMenu (anchor) {
		async function createContextMenuItems () {
			const items = [];

			// LRU items
			if (storage.runtime.kokoni.lru.length) {
				storage.runtime.kokoni.lru.forEach((lruItem, index) => {
					items.push({
						key: `lru-${index}`,
						label: lruItem.label,
						path: lruItem.path
					});
				});
				items.push({key: '-'});
			}

			// directory tree
			items.push(
				{
					key: 'kokoni',
					label: _('menu_save_to'),
					items: await assetSaver.getDirectoryTree()
				}
			);

			// misc items
			items.push(
				{key: '-'},
				{key: 'save-asset', label: _('menu_save_to_default_path')},
				{key: 'refresh', label: _('menu_update_folder_tree')},
				{key: 'reset-hist', label: _('menu_clear_histories')}
			);

			return items;
		}

		const assetSaver = await resourceSaver.asset();
		if (assetSaver.busy) return;

		const contextMenu = await modules('menu').then(menu => menu.createContextMenu());
		const {permission} = await assetSaver.fileSystem.queryRootDirectoryPermission(true)

		if (permission !== 'granted') {
			// display context menu
			const CONTEXT_MENU_KEY = 'grant-context';
			let item;

			anchor.classList.add('active');
			try {
				item = await contextMenu.assign({
					key: CONTEXT_MENU_KEY,
					items: [{key: 'request-grant', label: _('menu_request_grant')}]
				})
				.open(anchor, CONTEXT_MENU_KEY);
			}
			finally {
				anchor.classList.remove('active');
			}
			if (!item) return;

			// execute the job for menu item
			const tree = await assetSaver.updateDirectoryTree();
			if (!tree) return;
		}

		// display context menu
		const CONTEXT_MENU_KEY = 'save-asset-context';
		let item;

		anchor.classList.add('active');
		try {
			item = await contextMenu.assign({
				key: CONTEXT_MENU_KEY,
				items: await createContextMenuItems()
			})
			.open(anchor, CONTEXT_MENU_KEY);
		}
		finally {
			anchor.classList.remove('active');
		}
		if (!item) return;

		// execute the job for each item
		const key = item.fullKey.substring(CONTEXT_MENU_KEY.length + 1);
		switch (key) {
		case 'save-asset':
			// save to the location specified by template
			await assetSaver.save(anchor, {
				template: storage.config.save_image_name_template.value
			});
			break;

		case 'refresh':
			// refresh directory tree
			await assetSaver.updateDirectoryTree();
			break;

		case 'reset-hist':
			// clear LRU items
			assetSaver.clearLRUList();
			break;

		case /^lru-/.test(key) && key:
		case /^kokoni,/.test(key) && key:
			// save to the location used in the past
			// save to the arbitrary location
			await assetSaver.save(anchor, {
				template: storage.config.save_image_kokoni_name_template.value,
				pathOverride: item.path
			});
			assetSaver.updateLRUList(item);
			break;
		}
	},

	async saveAsset (anchor) {
		const assetSaver = await resourceSaver.asset();
		if (assetSaver.busy) return;

		const {permission} = await assetSaver.fileSystem.queryRootDirectoryPermission(true)
		if (permission !== 'granted') {
			const tree = await assetSaver.updateDirectoryTree();
			if (!tree) return;
		}

		await assetSaver.save(anchor, {
			template: storage.config.save_image_name_template.value
		});
	},

	/*
	 * panel commons
	 */

	togglePanelVisibility () {
		if ($('panel-aside-wrap').classList.contains('run')) {
			commands.hidePanel();
		}
		else {
			commands.showPanel();
		}
	},
	hidePanel () {
		hidePanel();
	},
	showPanel () {
		if ($qs('#panel-aside-wrap #panel-content-notice:not(.hide)')) {
			commands.activateNoticeTab();
		}
		else if ($qs('#panel-aside-wrap #panel-content-search:not(.hide)')) {
			commands.activateStatisticsTab();
		}
		else {
			commands.activateStatisticsTab();
		}
	},
	activateStatisticsTab () {
		if (!$qs('#panel-aside-wrap.run #panel-content-mark:not(.hide)') && postStats.lastStats) {
			postStats.updatePanelView(postStats.lastStats);
		}
		activatePanelTab($qs('.panel-tab[href="#mark"]'));
		showPanel();
	},
	activateSearchTab () {
		const searchTab = $qs('.panel-tab[href="#search"]');
		const searchTarget = pageModes[0].mode === 'catalog' ?
			_('thread_short') :
			_('reply_short');

		activatePanelTab(searchTab);
		$t($qs('span.long', searchTab), _('active_search_tab_title', searchTarget));
		showPanel(() => {
			$('search-text').focus();
		});
	},
	activateNoticeTab () {
		activatePanelTab($qs('.panel-tab[href="#notice"]'));
		showPanel();
	},

	/*
	 * panel (search)
	 */

	search () {
		if (pageModes[0].mode === 'catalog') {
			commands.searchCatalog();
		}
		else {
			commands.searchComment();
		}
	},
	searchComment () {
		searchBase({
			targetNodesSelector: 'article .topic-wrap, article .reply-wrap',
			targetElementSelector: '.sub, .name, .postdate, span.user-id, .email, .comment',
			getTextContent: node => {
				const content = node.childElementCount === 0 ? node.textContent : commentToString(node);
				const extra = node.title && node.title !== '' ? ` ${node.title}` : '';
				return content + extra;
				//return (content + extra).replace(/\p{M}/gu, '');
			},
			getPostNumber: node => {
				return node.dataset.number
					|| $qs('[data-number]', node).dataset.number;
			},
			fillItem: (anchor, target) => {
				anchor.textContent = commentToString($qs('.comment', target));
			}
		});
	},
	searchCatalog () {
		let currentMode = $qs('#catalog .catalog-options a.active');
		if (!currentMode) return;

		let re = currentMode = /#catalog-order-(\w+)/.exec(currentMode.href);
		if (!re) return;

		currentMode = re[1];

		searchBase({
			targetNodesSelector: `#catalog-threads-wrap-${currentMode} a`,
			targetElementSelector: '.text, .info :first-child',
			sort: (a, b) => {
				if (a.classList.contains('new')) {
					return -1;
				}
				if (b.classList.contains('new')) {
					return 1;
				}
				return 0;
			},
			getTextContent: node => {
				return node.dataset.text || node.textContent;
			},
			getPostNumber: node => {
				return node.dataset.number;
			},
			fillItem: (anchor, target) => {
				anchor.href = target.href;
				anchor.target = target.target;
				if (target.classList.contains('new')) {
					anchor.classList.add('new');
				}

				const img = $qs('img', target);
				if (img) {
					anchor.appendChild(img.cloneNode(false));
				}

				const text = $qs('[data-text]', target);
				if (text) {
					anchor.appendChild(document.createTextNode(text.dataset.text));
				}

				const sentinel = anchor.appendChild(document.createElement('div'));
				sentinel.className = 'sentinel';

				const info = $qsa('.info span', target);
				if (info) {
					const content = target.classList.contains('new') ?
						_('catsearch_item_new', info[0].textContent) :
						_('catsearch_item', info[0].textContent, info[1].textContent);
					$t(sentinel, content);
				}
				else {
					$t(sentinel, '--');
				}
			}
		});
	},

	/*
	 * coin manipulation
	 */

	async showCoinMenu (e, t) {
		const contextMenu = await modules('menu').then(menu => menu.createContextMenu());
		const item = await contextMenu.assign({
			key: 'action-to',
			items: [
				{
					key: 'autocharge-state',
					label: _('menu_autocharge_state')
				},
				{
					key: 'purchase-coins',
					label: _('menu_purchase_coins')
				}
			]
		})
		.open(t, 'action-to');

		if (!item) return;

		switch (item.key) {
		case 'autocharge-state':
			await commands.openCoinChargeDialog(!coinCharge);
			break;

		case 'purchase-coins':
			alert('それはまだ。');
			break;
		}
	},

	/*
	 * image metadata manipulation
	 */

	async showMetadataMenu (e, t) {
		if (!(t.href in metadataCache)) return;

		const metadata = metadataCache[t.href];
		const texts = [], gpsInfo = [], others = [];

		// texts
		for (let i = 0, goal = Math.min(10, metadata.texts.length); i < goal; i++) {
			const item = metadata.texts[i];
			const name = 'name' in item ? item.name : null;
			const value = ((Array.isArray(item.value) ? item.value.join(' ') : item.value) ?? '').trim();
			const truncated = substringWithStrictUnicode(value, 32);
			const label = `${truncated || _('metadata_empty_text')}` + (truncated !== value ? '...' : '');
			texts.push({
				key: `text_${i}`,
				label: name ? `${name}: ${label}` : label,
				_text: name ? `${name}: ${item.value}` : item.value
			});

			if (texts.length === 1) {
				texts[0].title = _('metadata_text_tooltip');
			}
		}
		if (texts.length !== metadata.texts.length) {
			texts.push({
				key: 'more_texts',
				label: _('metadata_text_more', metadata.texts.length - texts.length),
				disabled: true
			});
		}

		// gps informations
		if (metadata.gpsInfo.length) {
			for (let i = 0, goal = Math.min(3, metadata.gpsInfo.length); i < goal; i++) {
				const item = metadata.gpsInfo[i];
				gpsInfo.push({
					key: `gps_${i}`,
					label: _('metadata_menu_gps', item.value[1], item.value[2]),
					_position: item.value[1].replace(/,\s+/g, ',')
				});

				if (gpsInfo.length === 0) {
					gpsInfo[0].title = _('metadata_gps_tooltip');
				}
			}
		}

		// other stuff
		if (metadata.positivePrompts.length
		|| metadata.negativePrompts.length
		|| metadata.structuredData.length
		|| metadata.exifTags.length
		|| metadata.xmp.length) {
			metadata.positivePrompts.length && others.push({
				key: 'pp',
				label: _('metadata_menu_positive_prompts', metadata.positivePrompts.length)
			});
			metadata.negativePrompts.length && others.push({
				key: 'np',
				label: _('metadata_menu_negative_prompts', metadata.negativePrompts.length)
			});
			metadata.structuredData.length && others.push({
				key: 'sd',
				label: _('metadata_menu_structured_data', metadata.structuredData.length)
			});

			if (metadata.exifTags.length) {
				const tagCount = metadata.exifTags.reduce((total, exif) => {
					return total + Object.keys(exif.value).length;
				}, 0);
				others.push({
					key: 'exif',
					label: _('metadata_menu_exif', metadata.exifTags.length, tagCount)
				});
			}
			if (metadata.xmp.length) {
				const tagCount = metadata.xmp.reduce((total, xmp) => {
					return total + Object.keys(xmp.value).length;
				}, 0);
				others.push({
					key: 'xmp',
					label: _('metadata_menu_xmp', metadata.xmp.length, tagCount)
				});
			}
		}

		(texts.length || gpsInfo.length) && others.length && others.unshift({key: '-'});
		texts.length && gpsInfo.length && gpsInfo.unshift({key: '-'});

		const item = await modules('menu')
			.then(menu => menu.createContextMenu()
				.assign({
					key: 'metadata',
					items: texts.concat(gpsInfo, others, [
						{key: '-'},
						{
							key: 'view-all',
							label: _('metadata_menu_view_all')
						}
					])
				})
				.open(t, 'metadata')
			);
		
		if (!item) return;

		if (/^text_(\d+)/.test(item.key)) {
			const text = Array.isArray(item._text) ? item._text.join('\n') : item._text;
			selectionMenu.dispatch('quote', text.replace(/\r\n|\r/g, '\n'));
		}
		else if (/^gps_(\d+)/.test(item.key)) {
			backend.send('open', {
				url: `https://www.google.com/maps/place/${item._position}`,
				selfUrl: location.href
			});
		}
		else {
			// Textual fragments / Prompts / Structured Data / GPS Informations / EXIF / XMP
			await commands.openMetadataDialog(metadata, item.key);
		}
	},

	/*
	 * text replace
	 */

	setSubst (name, key, content) {
		const s = $(`dynstyle-subst-${name}`);
		empty(s);
		if (key !== 'asis') {
			s.appendChild(document.createTextNode(`\
.comment .${name} {
position: relative;
visibility: hidden;
font-size: 1px;
}
.comment .${name}:after {
visibility: visible;
font-size: initial;
}
.comment .${name}.length1:after {content: "${content}";}
.comment .${name}.length2:after {content: "${content.repeat(2)}";}
.comment .${name}.length3:after {content: "${content.repeat(3)}";}
.comment .${name}.length4:after {content: "${content.repeat(4)}";}
`));
		}
		substs.leader = key;
	},

	/*
	 * debug commands
	 */

	reloadExtension () {
		if (!devMode) return;
		resources.clearCache();
		backend.send('reload');
	},
	noticeTest () {
		if (!devMode) return;

		let lines = siteInfo.notice.split('\n');

		// delete
		lines.splice(2, 2);

		// replace
		lines = lines.map(t => t.replace(/(最大)(\d+)(レス)/g, ($0, $1, $2, $3) => $1 + (parseInt($2, 10) * 2) + $3));

		// add
		lines.push(`Appended line #1: ${Math.random()}`);
		lines.push(`Appended line #2: ${Math.random()}`);

		siteInfo.notice = lines.join('\n');
		setBottomStatus('notice modified for debug');
	},
	dumpStats () {
		if (!devMode) return;
		dumpDebugText(postStats.dump());
	},
	dumpReloadData () {
		if (!devMode) return;
		const data = Object.assign({}, reloadStatus);
		delete data.lastReceivedText;
		dumpDebugText(JSON.stringify(data, null, '    ') + '\n\n' + reloadStatus.lastReceivedText);
	},
	emptyReplies () {
		if (!devMode) return;
		empty($qs('.replies'));
	},
	traverseTest () {
		if (!devMode) return;
		resourceSaver.asset().then(saver => {
			return saver.updateDirectoryTree();
		})
		.then(tree => {
			console.dir(tree);
		});
	},
	async dumpCredentials (e, t) {
		if (!devMode) return;
		const content = t.textContent;
		t.disabled = true;
		try {
			$t(t, '処理中...');
			const savers = await resourceSaver.savers();
			const status = await Promise.all(
				savers.map(saver => {
					return saver.fileSystem.getStatus();
				}));

			log(`*** dumpCredentials ***`);
			log(JSON.stringify(status));

			$t(t, '完了');
			await delay(1000);
		}
		catch {
			//
		}
		finally {
			$t(t, content);
			t.disabled = false;
		}
	},
	getCredential () {
		if (!devMode) return;
		commands.openFileAccessAuthDialog('asset').then(result => {
			if (!result) {
				log(`got root directory but result is unavailable`);
			}
			else if (result.error) {
				log(`got root directory but error occured: ${result.error}`);
			}
			else {
				log([
					`got root directory`,
					`handle: ${Object.prototype.toString.call(result.handle)}`,
					`from: "${result.from}"`
				].join(', '));
			}
		});
	},
	proxyAudioTest () {
		if (!devMode) return;
		log(`starting proxy audio test. waiting 3 seconds...`);
		delay(1000 * 3).then(() => sounds.imageSaved.play(true));
	},
	notificationTest () {
		if (!devMode) return;
		backend.send('notification', {
			title: 'test title',
			body: `test message from ${APP_NAME}`
		});
	},
	tokenizeTest () {
		if (!devMode) return;
		backend.send('tokenize', {
			text: 'さっきまで「」だったロールパンが辺り一面に転がる',
			useProxy: true
		}).then(tokens => {
			console.dir(tokens);
		});
	},
	toggleLogging (e, t) {
		if (!devMode) return;
		timingLogger.locked = !t.value;
	}
};

/*
 * <<<1 bootstrap
 */

timingLogger.startTag(`booting ${APP_NAME}`);

timingLogger.startTag('waiting import of utility functions');
modules('utils', 'utils-apext', 'linkifier').then(([utils, utilsApext, linkifier]) => {
	timingLogger.endTag();

	({LOCALE, _, delay, $, $qs, $qsa,
	removeChild, empty, load, getReadableSize, debounce} = utils);

	({$t, fixFragment, serializeXML, getCookie, setCookie,
	getDOMFromString, docScrollTop, docScrollLeft,
	transitionend, transitionendp, getBlobFrom, getImageFrom,
	getContentsFromEditable, resolveCharacterReference,
	新字体の漢字を舊字體に変換, osaka, reverseText, mergeDeep, substringWithStrictUnicode,
	invokeMousewheelEvent, voice, resolveRelativePath,
	parseExtendJson, getStringSimilarity} = utilsApext);

	({linkify} = linkifier);

	if (location.href.match(/^[^:]+:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^/]+)\/res\/(\d+)\.htm/)) {
		siteInfo.server = RegExp.$1;
		siteInfo.board = RegExp.$2;
		siteInfo.resno = RegExp.$3 - 0;
		pageModes.unshift({mode: 'reply', scrollTop: 0});
	}
	else if (location.href.match(/^[^:]+:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^/]+)\/(?:([^.]+)\.htm)?/)) {
		siteInfo.server = RegExp.$1;
		siteInfo.board = RegExp.$2;
		siteInfo.summaryIndex = RegExp.$3 - 0 || 0;
		pageModes.unshift({mode: 'summary', scrollTop: 0});
	}

	timingLogger.startTag('waiting multiple promise completion');
	return Promise.all([
		// settings loader promise
		new Promise(resolve => {
			const defaultStorage = {
				version: '0.0.1',
				migrated: false,
				notices: {},
				coinCharge: false,
				config: storage.getAllConfigDefault()
			};
			chromeWrap.storage.sync.get(defaultStorage).then(result => {
				/*
				 * if a default key-value set is specified, the result must be merged.
				 * but firefox does not do. (2020-01)
				 */
				resolve(IS_GECKO ? mergeDeep(defaultStorage, result) : result);
			});
		}),

		// runtime loader promise
		new Promise(resolve => {
			const defaultStorage = {
				runtime: storage.runtime
			};
			chromeWrap.storage.local.get(defaultStorage).then(result => {
				resolve(IS_GECKO ? mergeDeep(defaultStorage, result) : result);
			});
		}),

		// backend connector promise
		backend.connect(),

		// DOM construction watcher promise
		new Promise(resolve => {
			function next () {
				scriptWatcher.disconnect();
				scriptWatcher = undefined;

				styleInitializer.done();
				styleInitializer = undefined;

				if (NOTFOUND_TITLE_PATTERN.test(document.title)
				||  UNAVAILABLE_TITLE_PATTERN.test(document.title)
				||  $('cf-wrapper')) {
					resolve(false);
				}
				else {
					let html = [];
					if (document.doctype instanceof Node) {
						html.push(new XMLSerializer().serializeToString(document.doctype));
					}
					html.push(document.documentElement.outerHTML);
					html = html.join('\n');
					document.body.innerHTML = _('rebuilding_page', APP_NAME);
					setTimeout(html => {
						bootVars.bodyHTML = html
							.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
							.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
							.replace(/>([^<]+)</g, ($0, content) => {
								content = resolveCharacterReference(content)
									.replace(/</g, '&lt;')
									.replace(/>/g, '&gt;');
								return `>${content}<`;
							});

						resolve(true);
					}, 0, html);
				}
			}

			if (document.readyState === 'complete'
			|| document.readyState === 'interactive') {
				next();
			}
			else {
				document.addEventListener('DOMContentLoaded', next, {once: true});
			}
		}),

		// fundamental xsl file loader promise
		resources.get(
			`/_locales/${LOCALE}/fundamental.xsl`,
			{expires: DEBUG_ALWAYS_LOAD_XSL ? 1 : 1000 * 60 * 10}),
	]);
}).then(([syncedStorageData, localStorageData, backendConnection, runnable, xsl]) => {
	timingLogger.endTag();

	if (!runnable) {
		timingLogger.forceEndTag();
		return;
	}

	if (!backendConnection) {
		throw new Error(_('cannot_connect_to_backend_stop', APP_NAME));
	}

	if (xsl === null) {
		throw new Error(_('failed_to_retrieve_xsl_file', APP_NAME));
	}

	/*
	 * apply informations from backendConnection
	 */

	version = backendConnection.version;
	devMode = backendConnection.devMode;
	debugMode = backendConnection.debugMode;

	if (version !== syncedStorageData.version) {
		// TODO: storage format upgrade goes here

		storage.setSynced({version});
	}

	if (version !== window.localStorage.getItem(`${APP_NAME}_version`)) {
		resources.clearCache();
		window.localStorage.setItem(`${APP_NAME}_version`, version);
	}

	/*
	 * apply information from storages
	 */

	coinCharge = syncedStorageData.coinCharge;
	siteInfo.notice = syncedStorageData.notices[`${siteInfo.server}/${siteInfo.board}`] || '';

	storage.assignChangedHandler((changes, areaName) => {
		switch (areaName) {
		case 'sync':
			if ('notices' in changes) {
				siteInfo.notice = changes.notices.newValue[`${siteInfo.server}/${siteInfo.board}`] || '';
			}
			if ('coinCharge' in changes) {
				coinCharge = changes.coinCharge.newValue;
				applyDataBindings(xmlGenerator.run().xml);
			}
			if ('config' in changes) {
				const data = Object.assign(
					storage.getAllConfigDefault(),
					changes.config.newValue);
				storage.assignConfig(data);
				applyDataBindings(xmlGenerator.run().xml);
			}
			break;

		case 'local':
			if ('runtime' in changes) {
				const data = Object.assign(
					storage.runtime,
					changes.runtime.newValue);
				storage.assignRuntime(data);
				applyDataBindings(xmlGenerator.run().xml);
			}
			if ('viewers' in changes) {
				const data = changes.viewers.newValue;
				if (data.server === siteInfo.server && data.board === siteInfo.board) {
					$t('viewers', data.total);
				}
			}
			if ('enableDebug' in changes) {
				debugMode = changes.enableDebug.newValue;
				setBottomStatus(`debug mode set to ${debugMode}`);
			}
			break;
		}
	});
	storage.assignConfig(syncedStorageData.config);
	storage.assignRuntime(localStorageData.runtime);

	// note: it is necessary for booting of momocan
	Object.defineProperty(window.Akahuku, 'storage', {get: () => storage});

	// notify backend that initilizing has done
	return backend.send('initialized').then(() => transformWholeDocument(xsl));
})
.catch(err => {
	timingLogger.forceEndTag();
	console.dir(err);

	if (scriptWatcher) {
		scriptWatcher.disconnect();
		scriptWatcher = undefined;
	}

	if (styleInitializer) {
		styleInitializer.done();
		styleInitializer = undefined;
	}

	document.body.innerHTML = `${APP_NAME}: ${err.message}`;
	$t(document.body.appendChild(document.createElement('pre')), err.stack);
});

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
