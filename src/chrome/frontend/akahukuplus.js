'use strict';

/*
 * akahukuplus
 *
 * @author akahuku@gmail.com
 */

if (document.querySelector('meta[name="generator"][content="akahukuplus"]')) {
	console.log('akahukuplus: multiple execution of content script.');
	window.location.reload();
}
else {

/*
 * consts
 */

const APP_NAME = 'akahukuplus';
const FUTABA_CHARSET = 'Shift_JIS';
const NOTFOUND_TITLE = /404\s+file\s+not\s+found/i;
const UNAVAILABLE_TITLE = /503 Service Temporarily Unavailable/;
const WAIT_AFTER_RELOAD = 500;
const WAIT_AFTER_POST = 500;
const LEAD_REPLIES_COUNT = 50;
const REST_REPLIES_PROCESS_COUNT = 50;
const REST_REPLIES_PROCESS_INTERVAL = 100;
const POSTFORM_DEACTIVATE_DELAY = 500;
const POSTFORM_LOCK_RELEASE_DELAY = 1000;
const RELOAD_LOCK_RELEASE_DELAY = 1000 * 3;
const RELOAD_AUTO_SCROLL_CONSUME = 300;
const NETWORK_ACCESS_MIN_INTERVAL = 1000 * 3;
const QUOTE_POPUP_DELAY_MSEC = 1000 * 0.5;
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
const IDEOGRAPH_CONVERSION_CONTENT = false;
const IDEOGRAPH_CONVERSION_POST = false;
const IDEOGRAPH_CONVERSION_UI = false;
const FALLBACK_LAST_MODIFIED = 'Fri, 01 Jan 2010 00:00:00 GMT';
const HEADER_MARGIN_BOTTOM = 16;
const FALLBACK_JPEG_QUALITY = 0.8;
const TEGAKI_CANVAS_WIDTH = 344;// original size: 344
const TEGAKI_CANVAS_HEIGHT = 135;// original size: 135
const INLINE_VIDEO_MAX_WIDTH = 720;

const DEBUG_ALWAYS_LOAD_XSL = false;		// default: false
const DEBUG_DUMP_INTERNAL_XML = false;		// default: false
const DEBUG_IGNORE_LAST_MODIFIED = false;	// default: false

const MOVER_EVENT_NAME = 'mouseover';
const MOUT_EVENT_NAME = 'mouseout';
const MMOVE_EVENT_NAME = 'mousemove';

const IHTML = d('joofsIUNM');
const FUN = d('Gvodujpo');
const IAHTML = d('jotfsuBekbdfouIUNM');
const USW = d('votbgfXjoepx');
const CRE = d('dsfbufFmfnfou');
const ONER = d('pofssps');

const MESSAGE_BACKEND_CONNECTION_ERROR = 'バックエンドに接続できません。ページをリロードしてください。';

/*
 * <<<1 globals
 */

let bootVars = {iframeSources:'', bodyHTML:''};

// object instances
let timingLogger;
let storage;
let backend;
let transport;
let resources;
let markStatistics;
let xmlGenerator;
let xsltProcessor;
let clickDispatcher;
let keyManager;
let favicon;
let scrollManager;
let historyStateWrapper;
let selectionMenu;
let sounds;
let catalogPopup;
let urlStorage;
let quotePopup;
let autoTracker;

// others
const siteInfo = {
	server: '', board: '', resno: 0, summaryIndex: 0,
	logSize: 10000,
	maxAttachSize: 0,
	minThreadLifeTime: 0,
	lastModified: 0,
	subHash: {},
	nameHash: {},
	latestNumber: 0,
	notice: '',
	idDisplay: false
};
const cursorPos = {
	x: 0,
	y: 0,
	pagex: 0,
	pagey: 0,
	moved: false
};
const reloadStatus = {
	lastReloaded: Date.now(),
	lastReloadType: '',
	lastReceivedText: '',
	lastRepliesCount: 0,
	lastReceivedBytes: 0,
	lastReceivedCompressedBytes: 0,
	lastStatus: 0,
	totalReceivedBytes: 0,
	totalReceivedCompressedBytes: 0
};
reloadStatus.size = function (key) {
	return getReadableSize(this[key]);
};
const pageModes = [];
const appStates = ['command'];

let version = '0.0.1';
let devMode = false;
let viewportRect;
let overrideUpfile;
let moderatePromise = Promise.resolve();

/*
 * <<<1 bootstrap functions
 */

let scriptWatcher = (function () {
	function handleBeforeScriptExecute (e) {
		e.target.removeEventListener(
			e.type, handleBeforeScriptExecute);
		e.preventDefault();
	}

	let result = new MutationObserver(ms => {
		ms.forEach(m => {
			m.addedNodes.forEach(node => {
				if (node.nodeType != 1 || node.nodeName != 'SCRIPT') return;
				node.type = 'text/plain';
				node.addEventListener(
					'beforescriptexecute', handleBeforeScriptExecute);
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
(function (DOMParser) {
	let DOMParser_proto = DOMParser.prototype,
		real_parseFromString = DOMParser_proto.parseFromString;

	// Firefox/Opera/IE throw errors on unsupported types
	try {
		// WebKit returns null on unsupported types
		if ((new DOMParser).parseFromString('', 'text/html')) {
			// text/html parsing is natively supported
			return;
		}
	} catch (ex) {}

	DOMParser_proto.parseFromString = function(markup, type) {
		if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
			let doc = document.implementation.createHTMLDocument('');
			if (/<!doctype/i.test(markup)) {
				doc.documentElement[IHTML] = markup;
			}
			else {
				doc.body[IHTML] = markup;
			}
			return doc;
		}
		else {
			return real_parseFromString.apply(this, arguments);
		}
	};
}(window.DOMParser));

function d (s) {
	let result = '';
	for (let i = 0, goal = s.length; i < goal; i++) {
		result += String.fromCharCode(s.charCodeAt(i) - 1);
	}
	return result;
}

function initialStyle (isStart) {
	let s = $('akahuku_initial_style');

	if (isStart) {
		if (!s) {
			try {
				s = document.documentElement.appendChild(
					document[CRE]('style'));
			}
			catch (e) {
				s = null;
			}
		}

		if (s) {
			s.type = 'text/css';
			s.id = 'akahuku_initial_style';
			s.appendChild(document.createTextNode('body {visibility:hidden}'));
		}
	}
	else {
		if (s) {
			s.parentNode.removeChild(s);
		}
	}
}

function connectToBackend (callback) {
	let retryRest = 5;
	let wait = 1000;

	function doconnect () {
		backend.connect('init', response => {
			if (response) {
				backend.tabId = response.tabId;
				version = response.version;
				devMode = response.devMode;
				callback(true);
			}
			else {
				if (--retryRest > 0) {
					setTimeout(doconnect, wait);
					wait += 1000;
				}
				else {
					callback(false);
				}
			}
		});
	}

	backend = WasaviExtensionWrapper.create({extensionName: APP_NAME});
	doconnect();
}

function transformWholeDocument (xsl) {
	timingLogger.startTag('transformWholeDocument');

	markStatistics = createMarkStatistics();
	urlStorage = createUrlStorage();
	xmlGenerator = createXMLGenerator();

	let generateResult = xmlGenerator.run(
		bootVars.bodyHTML + bootVars.iframeSources,
		pageModes[0].mode == 'reply' ? LEAD_REPLIES_COUNT : null);

	try {
		timingLogger.startTag('parsing xsl');

		if (IDEOGRAPH_CONVERSION_UI) {
			xsl = 新字体の漢字を舊字體に変換(xsl);
		}

		xsl = (new window.DOMParser()).parseFromString(xsl, "text/xml");
		timingLogger.endTag();
	}
	catch (e) {
		console.error(`${APP_NAME}: transformWholeDocument: ${e.stack}`);
		throw new Error(
			`${APP_NAME}: XSL ファイルの DOM ツリー構築に失敗しました。中止します。`);
	}

	xsltProcessor = new window.XSLTProcessor();
	try {
		timingLogger.startTag('constructing xsl');
		xsltProcessor.importStylesheet(xsl);
		timingLogger.endTag();
	}
	catch (e) {
		console.error(`${APP_NAME}: transformWholeDocument: ${e.stack}`);
		throw new Error(
			`${APP_NAME}: XSL ファイルの評価に失敗しました。中止します。`);
	}

	// transform xsl into html
	timingLogger.startTag('applying xsl');
	document.body[IHTML] = '';
	xsltProcessor.setParameter(null, 'app_name', APP_NAME);
	xsltProcessor.setParameter(null, 'dev_mode', devMode ? '1' : '0');
	xsltProcessor.setParameter(null, 'page_mode', pageModes[0].mode);
	xsltProcessor.setParameter(null, 'render_mode', 'full');
	xsltProcessor.setParameter(null, 'platform', WasaviExtensionWrapper.IS_GECKO ? 'moz' : 'chrome');
	xsltProcessor.setParameter(null, 'sort_order', storage.runtime.catalog.sortOrder);

	let fragment = xsltProcessor.transformToFragment(generateResult.xml, document);
	if (!fragment) {
		throw new Error(
			`${APP_NAME}: XML 文書を変換できませんでした。中止します。`);
	}

	let head = $qs('head', fragment);
	let body = $qs('body', fragment);
	let removeHeadElements = () => {
		$qsa('head > *').forEach(node => {
			if (node.nodeName == 'BASE') return;
			node.parentNode.removeChild(node);
		});
	};
	if (head || body) {
		if (head) {
			removeHeadElements();
			document.head.appendChild(fixFragment(fragment, 'head'));
		}
		if (body) {
			document.body.appendChild(fixFragment(fragment, 'body'));
		}
	}
	else {
		removeHeadElements();
		document.body.appendChild(fragment);
	}
	appendFragment(document.documentElement);
	timingLogger.endTag();

	timingLogger.startTag('some tweaks');
	// some tweaks: remove obsolete attributes on body element
	['bgcolor', 'text', 'link', 'vlink', 'alink'].forEach(p => {
		document.body.removeAttribute(p);
	});

	// some tweaks: move some elements to its proper position
	let headNodes = Array.from($qsa('body style, body link'));
	while (headNodes.length) {
		const node = headNodes.shift();
		node.parentNode.removeChild(node);
		document.head.appendChild(node);
	}

	// some tweaks: ensure title element exists
	if (document.head.getElementsByTagName('title').length == 0) {
		document.head.appendChild(document[CRE]('title')).setAttribute('data-binding', 'xpath:/futaba/meta/title');
	}
	timingLogger.endTag();

	// expand all bindings
	timingLogger.startTag('applying bindings');
	applyDataBindings(generateResult.xml);
	timingLogger.endTag();

	if (DEBUG_DUMP_INTERNAL_XML) {
		dumpDebugText(serializeXML(generateResult.xml));
	}

	fragment = xsl = null;
	bootVars = null;

	$('content').classList.remove('init');

	timingLogger.startTag('install');
	install(pageModes[0].mode);
	timingLogger.forceEndTag();
	timingLogger.locked = true;

	processRemainingReplies(generateResult.remainingRepliesContext);
}

function install (mode) {
	/*
	 * last modified date
	 */

	try {
		siteInfo.lastModified = new Date(document.lastModified).toUTCString();
	}
	catch (e) {
		siteInfo.lastModified = 0;
	}

	/*
	 * message handler from backend
	 */

	backend.setMessageListener(data => {
		switch (data.type) {
		case 'fileio-authorize-response':
		case 'fileio-write-response':
			{
				let anchor = $(data.anchorId);

				let message;
				if (data.error || data.state == 'complete') {
					if (data.error) {
						message = '保存失敗';
					}
					else {
						message = '保存完了';

						if (data.status == 200) {
							anchor.setAttribute('data-image-saved', '1');
							sounds.imageSaved.volume = storage.config.save_image_bell_volume.value;
							sounds.imageSaved.play();
						}
					}

					anchor && setTimeout(anchor => {
						if (/^save-image-anchor-/.test(anchor.id)) {
							anchor.removeAttribute('id');
						}
						$t(anchor, anchor.getAttribute('data-original-text'));
						anchor.removeAttribute('data-original-text');
						anchor = null;
					}, 1000 * 1, anchor);
				}
				else {
					switch (data.state) {
					case 'authorizing':	message = '認可の確認中...'; break;
					case 'buffered':	message = 'バッファ済み...'; break;
					case 'writing':		message = '書き込み中...'; break;
					}
				}
				message && $t(anchor, message);
			}
			break;
		case 'notify-viewers':
			{
				if (data.siteInfo.server == siteInfo.server
				&&  data.siteInfo.board == siteInfo.board
				&&  data.siteInfo.resno != siteInfo.resno) {
					$t('viewers', data.data);
				}
			}
			break;
		default:
			break;
		}
	});

	/*
	 * instantiate click dispachter
	 * and register click handlers
	 */

	clickDispatcher = createClickDispatcher();
	clickDispatcher
		.add('#void', () => {})

		.add('#delete-post',       commands.openDeleteDialog)
		.add('#config',            commands.openConfigDialog)
		.add('#help',              commands.openHelpDialog)
		.add('#draw',              commands.openDrawDialog)
		.add('#toggle-panel',      commands.togglePanelVisibility)
		.add('#reload',            commands.reload)
		.add('#sage',              commands.toggleSage)
		.add('#search-start',      commands.search)
		.add('#clear-upfile',      commands.clearUpfile)
		.add('#toggle-catalog',    commands.toggleCatalogVisibility)
		.add('#track',             commands.registerTrack)
		.add('#reload-ext',        commands.reloadExtension)
		.add('#prev-summary',      commands.summaryBack)
		.add('#next-summary',      commands.summaryNext)
		.add('#clear-credentials', commands.clearCredentials)

		.add('#reload-full',       commands.reloadFull)
		.add('#reload-delta',      commands.reloadDelta)
		.add('#dump-stats',        commands.dumpStats)
		.add('#dump-reload-data',  commands.dumpReloadData)
		.add('#empty-replies',     commands.emptyReplies)
		.add('#notice-test',       commands.noticeTest)
		.add('#toggle-timing-log', commands.toggleLogging)

		.add('#search-item', (e, t) => {
			let number = t.getAttribute('data-number');
			if (!number) return;
			let wrapper = $qs([
				`article .topic-wrap[data-number="${number}"]`,
				`article .reply-wrap > [data-number="${number}"]`
			].join(','));
			if (!wrapper) return;

			let rect = wrapper.getBoundingClientRect();
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
		.add('#save-catalog-settings', (e, t) => {
			commands.updateCatalogSettings({
				x: $('catalog-horz-number').value,
				y: $('catalog-vert-number').value,
				text: $('catalog-with-text').checked ? storage.config.catalog_text_max_length.value : 0
			});
			window.alert('はい。');
		})

		.add('.del', (e, t) => {
			commands.openModerateDialog(e, t);
		})
		.add('.postno', (e, t) => {
			let wrap = getWrapElement(t);
			if (!wrap) return;
			let comment = $qs('.comment', wrap);
			if (!comment) return;

			comment = nodeToString(comment);

			if ($qs('.reply-image', wrap) && /^ｷﾀ━+\(ﾟ∀ﾟ\)━+\s*!+$/.test(comment)) {
				comment = $qs('.postno', wrap).textContent;
			}

			selectionMenu.dispatch('quote', comment);
		})
		.add('.save-image',  (e, t) => {
			commands.saveImage(e, t);
		})
		.add('.panel-tab',   (e, t) => {
			showPanel(panel => {
				activatePanelTab(t);
			});
		})
		.add('.switch-to', (e, t) => {
			historyStateWrapper.pushState(t.href);
		})
		.add('.lightbox',  (e, t) => {
			if (storage.config.auto_save_image.value) {
				setTimeout((e, t) => {
					let saveLink = $qs(`.save-image[href="${t.href}"]`);
					if (!saveLink) return;
					if (saveLink.getAttribute('data-image-saved')) return;

					commands.saveImage(e, saveLink);
				}, 1000 * 1, e, t);
			}
			if (storage.config.lightbox_enabled.value) {
				if (/\.(?:jpg|gif|png|webp)$/.test(t.href)) {
					let ignoreThumbnail =
						t.classList.contains('link-siokara')
						|| t.classList.contains('siokara-thumbnail');

					lightbox(t, ignoreThumbnail);
				}
				else if (/\.(?:webm|mp4)$/.test(t.href)) {
					displayInlineVideo(t);
				}
				else if (/\.(?:mp3|ogg)$/.test(t.href)) {
					displayInlineAudio(t);
				}
			}
			else {
				return clickDispatcher.PASS_THROUGH;
			}
		})
		.add('.catalog-order', (e, t) => {
			let newActive;

			$qsa('#catalog .catalog-options a').forEach(node => {
				if (node == t) {
					node.classList.add('active');
					newActive = node;
				}
				else {
					node.classList.remove('active');
				}
			});

			if (!newActive) {
				newActive = $qs('#catalog .catalog-options a');
				newActive.classList.add('active');
			}

			let order = newActive.href.match(/\w+$/)[0];
			let contentId = `catalog-threads-wrap-${order}`;
			$qsa('#catalog .catalog-threads-wrap > div').forEach(node => {
				if (node.id == contentId) {
					node.classList.remove('hide');
				}
				else {
					node.classList.add('hide');
				}
			});

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
		.add('*noclass*', (e, t) => {
			let re1 = /(.*)#[^#]*$/.exec(t.href);
			let re2 = /(.*)(#[^#]*)?$/.exec(window.location.href);
			if (t.target != '_blank') return;
			if (re1 && re2 && re1[1] == re2[1]) return;

			e.preventDefault();
			e.stopPropagation();
			sendToBackend('open', {
				url: t.href,
				selfUrl: window.location.href
			});
		})

	/*
	 * instantiate keyboard shortcut manager
	 * and register shortcut handlers
	 */

	keyManager = createKeyManager();
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

		.addStroke('command.edit', '\u001b', commands.deactivatePostForm)	// <esc>
		.addStroke('command.edit', ['\u0013', '<A-S>'], commands.toggleSage)			// ^S, <Alt+S>
		.addStroke('command.edit', '<S-enter>', commands.post)				// <Shift+Enter>

		// These shortcuts for text editing are basically emacs-like...
		.addStroke('command.edit', '\u0001', commands.cursorBeginningOfLine)	// ^A
		.addStroke('command.edit', '\u0005', commands.cursorEndOfLine)			// ^E
		.addStroke('command.edit', '\u000a', commands.cursorNextLine)			// ^J: Because Chrome reserves ^N, so this is the plan B.
		.addStroke('command.edit', '\u000b', commands.cursorPreviousLine)		// ^K: ^N can not be used, this is also defined like vi.
		.addStroke('command.edit', '\u0006', commands.cursorForwardChar)		// ^F
		.addStroke('command.edit', '\u0002', commands.cursorBackwardChar)		// ^B
		.addStroke('command.edit', '<A-F>',  commands.cursorForwardWord)		// <Alt+F>
		.addStroke('command.edit', '<A-B>',  commands.cursorBackwardWord)		// <Alt+B>
		.addStroke('command.edit', '\u0008', commands.cursorDeleteBackwardChar)	// ^H
		.addStroke('command.edit', '<A-H>',  commands.cursorDeleteBackwardWord)	// <Alt+H>: Chrome reserves ^W
		.addStroke('command.edit', '\u0015', commands.cursorDeleteBackwardBlock)// ^U

		.updateManifest();

	/*
	 * favicon maintainer
	 */

	favicon = createFavicon();
	favicon.update();

	/*
	 * window resize handler
	 */

	(function () {
		function updateViewportRectGeometry () {
			const vp = document.body.appendChild(document[CRE]('div'));
			try {
				vp.id = 'viewport-rect';
				viewportRect = vp.getBoundingClientRect();
			}
			finally {
				vp.parentNode.removeChild(vp);
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

		function readjustReplyWidth () {
			$qsa('.reply-wrap .reply-image.width-adjusted').forEach(node => {
				node.classList.remove('width-adjusted');
			});
			adjustReplyWidth();
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
	 * window scroll handler
	 */

	scrollManager = createScrollManager(10);

	/*
	 * history handler
	 */

	historyStateWrapper = createHistoryStateWrapper(() => {
		/*
		console.log([
			`  previous page mode: ${pageModes[0].mode}`,
			`current page address: ${location.href}`
		].join('\n'));
		*/

		let isCatalog = window.location.hash == '#mode=cat';

		if (pageModes[0].mode == 'catalog' && !isCatalog
		||  pageModes[0].mode != 'catalog' && isCatalog) {
			commands.toggleCatalogVisibility();
		}

		if (pageModes[0].mode == 'summary') {
			let re = /(\d+)\.htm$/.exec(window.location.pathname);
			siteInfo.summaryIndex = re ? re[1] : 0;
			commands.reload();
		}
		else if (pageModes[0].mode == 'catalog' && pageModes[1].mode == 'summary') {
			let re = /(\d+)\.htm$/.exec(window.location.pathname);
			let summaryIndex = siteInfo.summaryIndex = re ? re[1] : 0;

			// title sync
			let titleElement = $qs('#header h1 a');
			let title = titleElement
				.textContent
				.replace(/\s*\[ページ\s*\d+\]/, '');
			if (summaryIndex) {
				title += ` [ページ ${summaryIndex}]`;
			}
			$t(titleElement, title);

			// page navigator sync
			let navElement = $qs('#postform-wrap .nav-links');
			let pageCount = Math.min(11, navElement.childElementCount);
			empty(navElement);
			for (let i = 0; i < pageCount; i++) {
				if (i == summaryIndex) {
					let span = navElement.appendChild(document[CRE]('span'));
					span.className = 'current';
					$t(span, i);
				}
				else {
					let a = navElement.appendChild(document[CRE]('a'));
					a.className = 'switch-to';
					a.href = `${location.protocol}//${location.host}/${siteInfo.board}/${i == 0 ? 'futaba' : i}.htm`;
					$t(a, i);
				}
			}
		}
	});

	/*
	 * mouse cursor tracker
	 */

	window.addEventListener(MMOVE_EVENT_NAME, e => {
		cursorPos.x = e.clientX;
		cursorPos.y = e.clientY;
		cursorPos.pagex = e.pageX;
		cursorPos.pagey = e.pageY;
		cursorPos.moved = true;
	}, false);

	/*
	 * selection menu handler
	 */

	selectionMenu = createSelectionMenu();

	/*
	 * auto-reloder
	 */

	autoTracker = createAutoTracker();

	/*
	 * restore cookie value
	 */

	$t('name', getCookie('namec'));
	$t('pwd', getCookie('pwdc'));

	/*
	 * init some hidden parameters
	 */

	$t(document.getElementsByName('js')[0],
		'on');
	$t(document.getElementsByName('scsz')[0],
		[
			window.screen.width,
			window.screen.height,
			window.screen.colorDepth
		].join('x'));

	/*
	 * post form
	 */

	// submit listener
	$('postform') && $('postform').addEventListener('submit', e => {
		e.preventDefault();
		commands.post();
	});

	// post mode switcher
	((elms, handler) => {
		for (let i = 0; i < elms.length; i++) {
			elms[i].addEventListener('click', handler, false);
		}
	})(document.getElementsByName('post-switch'), e => {
		const resto = document.getElementsByName('resto')[0];

		switch (e.target.value) {
		case 'reply':
			resto.disabled = false;
			break;

		case 'thread':
			resto.disabled = true;
			break;
		}
	});

	// allow tegaki link, if baseform element exists
	(drawButtonWrap => {
		if (!drawButtonWrap) return;

		if (document.getElementsByName('baseform').length == 0) {
			// baseform not exists. disable tegaki link
			drawButtonWrap.classList.add('hide');

			// additionally in reply mode, disable upload feature
			if (pageModes[0].mode == 'reply') {
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

	// handle behavior of text fields
	setupPostFormItemEvent([
		{id:'com',              bytes:1000, lines:15},
		{id:'name',  head:'名', bytes:100},
		{id:'email', head:'メ', bytes:100},
		{id:'sub',   head:'題', bytes:100}
	]);

	// handle post form visibility
	(() => {
		let frameOutTimer;
		$('postform-wrap').addEventListener('mouseenter', e => {
			if (frameOutTimer) {
				clearTimeout(frameOutTimer);
				frameOutTimer = null;
			}
			commands.activatePostForm();
		});
		$('postform-wrap').addEventListener('mouseleave', e => {
			if (frameOutTimer) return;

			frameOutTimer = setTimeout(() => {
				frameOutTimer = null;
				let p = document.elementFromPoint(cursorPos.x, cursorPos.y);
				while (p && p.id != 'postform-wrap') {
					p = p.parentNode;
				}
				if (p) return;
				let thumb = $('post-image-thumbnail-wrap');
				if (thumb && thumb.getAttribute('data-available') == '2') {
					thumb.setAttribute('data-available', '1');
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
	 * sounds/
	 */

	sounds = {
		identified: createSound('identified'),
		detectNewMark: createSound('new-mark'),
		imageSaved: createSound('image-saved'),
	};

	/*
	 * panel
	 */

	// submit button on search panel
	$('search-form').addEventListener('submit', e => {
		commands.search();
	});

	// pseudo mousehoverin/mousehoverout events for search item
	// on reply search panel and statistics panel
	setupSearchResultPopup();
	
	/*
	 * catalog popup
	 */

	catalogPopup = createCatalogPopup($qs('#catalog'));

	/*
	 * quote popup
	 */

	quotePopup = createQuotePopup();

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
		if (uuc != '1') {
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
		let result = {};
		window.location.hash
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
 * <<<1 applyDataBindings: apply a data in xml to a element, with its data binding definition
 */

function applyDataBindings (xml) {
	for (const node of $qsa('*[data-binding]')) {
		const binding = node.getAttribute('data-binding');
		let re;

		// xpath:<path/to/xml/element>
		// xpath[<page-mode>]:<path/to/xml/element>
		if ((re = /^xpath(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] == 'string' && re[1] != pageModes[0].mode) continue;
			try {
				const result = xml.evaluate(re[2], xml, null,
					window.XPathResult.FIRST_ORDERED_NODE_TYPE, null);
				if (!result || !result.singleNodeValue) continue;
				$t(node,
					result.singleNodeValue.value
					|| result.singleNodeValue.textContent);
			}
			catch (e) {
				console.error(
					`${APP_NAME}: applyDataBindings: failed to apply the data "${re[2]}"` +
					`\n${e.stack}`);
			}
		}

		// xpath-class:<path/to/xml/element>
		// xpath-class[<page-mode>]:<path/to/xml/element>
		else if ((re = /^xpath-class(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] == 'string' && re[1] != pageModes[0].mode) continue;
			try {
				const result = xml.evaluate(re[2], xml, null,
					window.XPathResult.STRING_TYPE, null);
				if (!result || !result.stringValue) continue;
				node.className = result.stringValue;
			}
			catch (e) {
				console.error(
					`${APP_NAME}: applyDataBindings: failed to apply the data "${re[2]}" to class` +
					`\n${e.stack}`);
			}
		}

		// template:<template-name>
		// template[<page-mode>]:<template-name>
		else if ((re = /^template(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] == 'string' && re[1] != pageModes[0].mode) continue;
			try {
				xsltProcessor.setParameter(null, 'render_mode', re[2]);
				const f = fixFragment(xsltProcessor.transformToFragment(xml, document));
				if (f.textContent.replace(/^\s+|\s+$/g, '') == '' && !$qs('[data-doe]', f)) continue;
				empty(node);
				appendFragment(node, f);
			}
			catch (e) {
				console.error(
					`${APP_NAME}: applyDataBindings: failed to apply the template "${re[2]}"` +
					`\n${e.stack}`);
			}
		}
	}
}

/*
 * <<<1 classes / class constructors
 */

function createResourceManager () {
	const ENABLE_NIGHT_MODE = false;

	const transformers = [
		function updateI18nMarks (s) {
			s = s.replace(/__MSG_@@extension_id__/g, getExtensionId());
			return s;
		},
		function chromeToMoz (s) {
			if (WasaviExtensionWrapper.IS_GECKO) {
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
						if (s3.length == 4) {
							let alpha = s3.substr(-1);
							s3 = s3.substring(0, s3.length - 1);
							let result = map[s3.toLowerCase()];
							if (result.length == 3) {
								return `#${result}${alpha}`;
							}
							else {
								return `#${result}${alpha}${alpha}`;
							}
						}

						// 8 digits
						else if (s3.length == 8) {
							let alpha = s3.substr(-2);
							s3 = s3.substring(0, s3.length - 2);
							let result = map[s3.toLowerCase()];
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

	function setSlot (path, expires, data) {
		let slot = {
			expires: Date.now() + (expires === undefined ? 1000 * 60 * 60 : expires),
			data: data
		};
		window.localStorage.setItem(getResKey(path), JSON.stringify(slot));
	}

	function loadWithXHR (path, expires, responseType, callback) {
		let xhr = transport.create();

		xhr.open('GET', chrome.runtime.getURL(path));
		xhr.onload = () => {
			if (responseType == 'dataURL') {
				let fr = new FileReader;
				fr.onload = () => {
					setSlot(path, expires, fr.result);
					callback(fr.result);
				};
				fr.onerror = () => { callback(); };
				fr.onloadend = () => { fr = null; };
				fr.readAsDataURL(xhr.response);
			}
			else {
				let result = xhr.response;
				for (let t of transformers) {
					result = t(result);
				}
				setSlot(path, expires, result);
				callback(result);
			}
		};
		xhr.onerror = () => { callback(null); };
		xhr.onloadend = () => { xhr = null; };

		if (responseType == 'dataURL') {
			xhr.responseType = 'blob';
		}
		else {
			xhr.responseType = responseType;
		}

		xhr.setRequestHeader('X-Requested-With', `${APP_NAME}/${version}`);
		xhr.send();
	}

	function getResKey (key) {
		return `resource:${key}`;
	}

	function get (key, opts) { /*returns promise*/
		opts || (opts = {});
		let resKey = getResKey(key);
		let responseType = opts.responseType || 'text';
		let expires = opts.expires;
		let slot = window.localStorage.getItem(resKey);
		if (slot !== null) {
			slot = JSON.parse(slot);
			if (Date.now() < slot.expires) {
				return Promise.resolve(slot.data);
			}
			window.localStorage.removeItem(resKey);
		}

		return new Promise(resolve => {
			loadWithXHR(key, expires, responseType, resolve);
		});
	}

	function remove (key) {
		window.localStorage.removeItem(getResKey(key));
	}

	function clearCache () {
		for (let i = 0; i < window.localStorage.length; i++) {
			let key = window.localStorage.key(i);
			if (/^resource:/.test(key)) {
				window.localStorage.removeItem(key);
				i--;
			}
		}
	}

	return {
		get: get,
		remove: remove,
		clearCache: clearCache
	};
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
			if (re[0].charAt(0) != '<') {
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
			if (re[0].charAt(0) == '<') {
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
			return function (s) {
				return xml.createTextNode('' + s);
			};
		}
		else {
			const refmap = {
				amp: '&',
				lt: '<',
				gt: '>',
				quot: '"',
				apos: "'"
			};
			return function (s) {
				s = ('' + s)
					// PHP's json_encode handles the following character references,
					// so we need to solve them.
					.replace(/&(amp|lt|gt|quot|apos);/g, ($0, $1) => refmap[$1]);

				// Some UA convert a code point beyond BMP into surrogate pairs.
				// This is an error for the standard, and it should be a single
				// character reference.
				s = resolveCharacterReference(s);

				return xml.createTextNode(s);
			};
		}
	}

	function text (xml, s) {
		return xml.createTextNode(
			('' + s)
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>'));
	}

	function element (node, s) {
		return node.appendChild(node.ownerDocument[CRE](s));
	}

	function setDefaultSubjectAndName (xml, metaNode, subHash, nameHash) {
		element(metaNode, 'sub_default')
			.appendChild(text(xml, (Object.keys(subHash).sort(function (a, b) {
				return subHash[b] - subHash[a];
			})[0] || '').replace(/^\s+|\s+$/g, '')));
		element(metaNode, 'name_default')
			.appendChild(text(xml, (Object.keys(nameHash).sort(function (a, b) {
				return nameHash[b] - nameHash[a];
		})[0] || '').replace(/^\s+|\s+$/g, '')));
	}

	// ported from https://github.com/twitter/twemoji/blob/gh-pages/2/twemoji.js
	const UFE0Fg = /\uFE0F/g
	const U200D = String.fromCharCode(0x200D);
	function grabTheRightIcon (rawText) {
		// if variant is present as \uFE0F
		return toCodePoint(rawText.indexOf(U200D) < 0 ?
			rawText.replace(UFE0Fg, '') :
			rawText
		);
	}
	function toCodePoint (unicodeSurrogates, sep) {
		let
		r = [],
			c = 0,
			p = 0,
			i = 0;
		while (i < unicodeSurrogates.length) {
			c = unicodeSurrogates.charCodeAt(i++);
			if (p) {
				r.push((0x10000 + ((p - 0xD800) << 10) + (c - 0xDC00)).toString(16));
				p = 0;
			} else if (0xD800 <= c && c <= 0xDBFF) {
				p = c;
			} else {
				r.push(c.toString(16));
			}
		}
		return r.join(sep || '-');
	}

	function linkify (node, opts) {
		opts = opts || {linkify: true, emojify: true};
		let emojiRegex = Akahuku.twemoji.regex;
		let r = node.ownerDocument.createRange();
		let re;
		while (node.lastChild.nodeType == 3) {
			if (opts.linkify && (re = linkTargetRegex.exec(node.lastChild.nodeValue))) {
				let index = -1;
				linkTargets.some((a, i) => {
					if (re[a.offset] != undefined && re[a.offset] != '') {
						index = i;
						return true;
					}
				});
				if (index < 0) break;

				let anchor = node.ownerDocument[CRE]('a');
				r.setStart(node.lastChild, re.index);
				r.setEnd(node.lastChild, re.index + re[0].length);
				r.surroundContents(anchor);

				try {
					anchor.textContent = anchor.textContent.replace(
						/(?:%[0-9a-f][0-9a-f])+/gi,
						$0 => decodeURIComponent($0)
					);
				}
				catch (e) {}

				anchor.textContent = reduceURL(anchor.textContent);
				anchor.setAttribute('class', linkTargets[index].className);
				anchor.setAttribute('href', linkTargets[index].getHref(re, anchor));
			}
			else if (opts.emojify && (re = emojiRegex.exec(node.lastChild.nodeValue))) {
				let emoji = node.ownerDocument[CRE]('emoji');

				r.setStart(node.lastChild, re.index);
				r.setEnd(node.lastChild, re.index + re[0].length);
				r.surroundContents(emoji);

				emoji.setAttribute('codepoints', grabTheRightIcon(re[0]));
			}
			else {
				node.lastChild.nodeValue = node.lastChild.nodeValue.replace(
					/[a-zA-Z0-9\u3040-\u30ff\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]{20}/g,
					'$&\u00ad');
				break;
			}
		}
	}

	function reduceURL (url) {
		const LIMIT = 100;

		if (url.length <= LIMIT) {
			return url;
		}

		var re = /^([^:]+:\/\/[^\/]+\/)([^?]*)?(\?.*)?/.exec(url);
		var result = re[1];
		var seps = ['/', '&'];
		var components = [(re[2] || '').split(seps[0]), (re[3] || '').split(seps[1])];

		components.forEach(function (cs, i) {
			if (i == 1 && components[0].length) return;

			while (cs.length && result.length < LIMIT) {
				result += cs[0];
				if (cs.length > 1) {
					result += seps[i];
				}
				cs.shift();
			}

			if (result.length >= LIMIT) {
				var lastIndex = result.lastIndexOf(seps[i]);
				if (lastIndex >= 0) {
					cs.push(result.substring(lastIndex + 1));
					result = result.substring(0, lastIndex + 1);
				}
			}
		});

		if (components[0].length || components[1].length) {
			result += '...(省略)';
		}

		return result;
	}

	function pushComment (node, s) {
		var stack = [node];
		var re, regex = /<[^>]+>|[^<]+/g;
		while ((re = regex.exec(s))) {
			re = re[0];
			if (re.charAt(0) == '<') {
				if (re.charAt(1) == '/') {
					stack.shift();
					stack.length == 0 && stack.push(node);
				}
				else {
					if (re == '<br>') {
						stack[0].appendChild(text(stack[0].ownerDocument, '\n'));
						stack[0].appendChild(element(stack[0], 'br'));
					}
					else if (re == '<font color="#789922">') {
						stack.unshift(element(stack[0], 'q'));
					}
					else if (re == '<font color="#ff0000">') {
						stack.unshift(element(stack[0], 'mark'));
					}
				}
			}
			else {
				/*
				re = re
					.replace(/&#([0-9]+);/g, function ($0, $1) {return String.fromCharCode(parseInt($1, 10))})
					.replace(/&#x([0-9a-f]+);/gi, function ($0, $1) {return String.fromCharCode(parseInt($1, 16))});
				*/
				stack[0].appendChild(text(stack[0].ownerDocument, re));
				linkify(stack[0]);
			}
		}
	}

	function getExpirationDate (s, fromDate) {
		let Y, M, D, h, m;

		if (!(fromDate instanceof Date)) {
			fromDate = new Date;
		}

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
		if (h != undefined && h < fromDate.getHours() && D == undefined) {
			D = fromDate.getDate() + 1;
		}
		// 31日 -> 1日頃消えます: treat as next month
		if (D != undefined && D < fromDate.getDate() && M == undefined) {
			M = fromDate.getMonth() + 1;
		}
		// 12月 -> 1月頃消えます: treat as next year
		if (M != undefined && M < fromDate.getMonth() && Y == undefined) {
			Y = fromDate.getFullYear() + 1;
		}

		//
		if (Y == undefined) Y = fromDate.getFullYear();
		if (M == undefined) M = fromDate.getMonth();
		if (D == undefined) D = fromDate.getDate();
		if (h == undefined) h = fromDate.getHours();
		if (m == undefined) m = fromDate.getMinutes();

		//
		let expireDate = new Date(Y, M, D, h, m);
		urlStorage.memo(window.location.href, expireDate.getTime());

		let remains = expireDate.getTime() - fromDate.getTime();
		if (remains < 0) {
			return '?';
		}

		//
		let remainsString = [];
		[
			[1000 * 60 * 60 * 24, '日',   true],
			[1000 * 60 * 60,      '時間', h != undefined && m != undefined],
			[1000 * 60,           '分',   h != undefined && m != undefined]
		].forEach(unit => {
			if (!unit[2]) return;
			if (remains < unit[0]) return;

			remainsString.push(Math.floor(remains / unit[0]) + unit[1]);
			remains %= unit[0];
		});

		if (remainsString.length == 0) {
			return 'まもなく';
		}
		else {
			if (/日/.test(remainsString[0]) && remainsString.length > 1) {
				remainsString[0] += 'と';
			}

			return `あと${remainsString.join('')}くらい`;
		}
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

	/*
	 * classes
	 */

	function LinkTarget (className, pattern, handler) {
		this.className = className;
		this.pattern = pattern;
		this.handler = handler;
	}
	LinkTarget.prototype.getHref = function (re, anchor) {
		return this.completeScheme(this.handler(
			re.slice(this.offset, this.offset + this.backrefLength)
			  .map(a => a == undefined ? '' : a),
			anchor
		));
	};
	LinkTarget.prototype.completeScheme = function (url) {
		let scheme = /^[^:]+/.exec(url)[0];
		if (/^h?t?t?p?s$/.test(scheme)) {
			scheme = 'https';
		}
		else if (/^h?t?t?p?$/.test(scheme)) {
			scheme = 'http';
		}
		url = url.replace(/^[^:]*:\/\//, `${scheme}://`);
		return url;
	};
	LinkTarget.prototype.siokaraProc = function (re, anchor, baseUrl) {
		if (re[2]) {
			anchor.setAttribute('basename', re[1] + re[2]);
			if (/\.(?:jpg|gif|png|webp|webm|mp4|mp3|ogg)$/.test(re[2])) {
				anchor.setAttribute('class', `${this.className} incomplete-siokara-thumbnail lightbox`);
				anchor.setAttribute('thumbnail', `${baseUrl}misc/${re[1]}.thumb.jpg`);
			}
			return `${baseUrl}src/${re[1]}${re[2]}`;
		}
		else {
			anchor.setAttribute('basename', re[1]);
			anchor.setAttribute('class', `${this.className} incomplete`);
			return `${baseUrl}index.html`;
		}
	};
	LinkTarget.prototype.upProc = function (re, anchor, baseUrl) {
		if (re[2]) {
			// re[0] -> "fu99999.xxx"
			// re[1] -> "fu99999"
			// re[2] -> ".xxx"
			anchor.setAttribute('basename', re[1] + re[2]);
			if (/\.(?:jpg|gif|png|webp|webm|mp4|mp3|ogg)$/.test(re[2])) {
				anchor.setAttribute('class', `${this.className} lightbox`);

			}
			if (/\.(?:jpg|gif|png|webp)$/.test(re[2])) {
				const boardName = /\/(up2?)\/$/.exec(baseUrl)[1];
				anchor.setAttribute(
					'thumbnail',
					`https://appsweets.net/thumbnail/${boardName}/${re[1]}s.png`);
			}
			return `${baseUrl}src/${re[1]}${re[2]}`;
		}
		else {
			anchor.setAttribute('basename', re[1]);
			anchor.setAttribute('class', `${this.className} incomplete`);
			return `${baseUrl}up.htm`;
		}
	};
	const linkTargets = [
		new LinkTarget(
			'link-siokara',
			'\\b((?:h?t?t?p?://)?(?:www\\.nijibox6\\.com/futabafiles/001/src/)?(sa\\d{4,})(\\.\\w+)?)',
			function (re, anchor) {
				anchor.setAttribute('title', '塩辛瓶 1ml');
				return this.siokaraProc(re, anchor, 'http://www.nijibox6.com/futabafiles/001/');
			}
		),
		new LinkTarget(
			'link-siokara',
			'\\b((?:h?t?t?p?://)?(?:www\\.nijibox2\\.com/futabafiles/003/src/)?(sp\\d{4,})(\\.\\w+)?)',
			function (re, anchor) {
				anchor.setAttribute('title', '塩辛瓶 3ml');
				return this.siokaraProc(re, anchor, 'http://www.nijibox2.com/futabafiles/003/');
			}
		),
		new LinkTarget(
			'link-siokara',
			'\\b((?:h?t?t?p?://)?(?:www\\.nijibox5\\.com/futabafiles/kobin/src/)?(ss\\d{4,})(\\.\\w+)?)',
			function (re, anchor) {
				anchor.setAttribute('title', '塩辛瓶 小瓶');
				return this.siokaraProc(re, anchor, 'http://www.nijibox5.com/futabafiles/kobin/');
			}
		),
		new LinkTarget(
			'link-siokara',
			'\\b((?:h?t?t?p?://)?(?:www\\.nijibox5\\.com/futabafiles/tubu/src/)?(su\\d{4,})(\\.\\w+)?)',
			function (re, anchor) {
				anchor.setAttribute('title', '塩辛瓶 塩粒');
				return this.siokaraProc(re, anchor, 'http://www.nijibox5.com/futabafiles/tubu/');
			}
		),
		new LinkTarget(
			'link-siokara',
			'\\b((?:h?t?t?p?://)?(?:www\\.nijibox6\\.com/futabafiles/mid/src/)?(sq\\d{4,})(\\.\\w+)?)',
			function (re, anchor) {
				anchor.setAttribute('title', '塩辛瓶 中瓶');
				return this.siokaraProc(re, anchor, 'http://www.nijibox6.com/futabafiles/mid/');
			}
		),
		new LinkTarget(
			'link-futalog',
			'\\b((?:h?t?t?p?://)?(?:www\\.nijibox2\\.com/futalog/src/)?((?:dec|jun|nov|may|img|dat|cgi|nne|id|jik|nar|oth)\\d{4,})(\\.mht)?)',
			function (re, anchor) {
				anchor.setAttribute('title', 'ふたログ');
				return 'http://www.nijibox2.com/futabalog/src/' +
					   re[1].replace('oth', 'other') + '.mht';
			}
		),
		new LinkTarget(
			'link-up',
			'\\b((?:h?t?t?p?s?://)?(?:dec\\.2chan\\.net/up/src/)?(f\\d{4,})(\\.\\w+)?)',
			function (re, anchor) {
				anchor.setAttribute('title', 'あぷ');
				return this.upProc(re, anchor, 'http://dec.2chan.net/up/');
			}
		),
		new LinkTarget(
			'link-up-small',
			'\\b((?:h?t?t?p?s?://)?(?:dec\\.2chan\\.net/up/src/)?(fu\\d{4,})(\\.\\w+)?)',
			function (re, anchor) {
				anchor.setAttribute('title', 'あぷ小');
				return this.upProc(re, anchor, 'http://dec.2chan.net/up2/');
			}
		),
		new LinkTarget(
			'link-youtube',
			'\\b((?:h?t?t?p?s?://)?(' + [
				'(?:www|m)\\.youtube\\.com/watch\?(?:.*?v=([\\w\\-]+))',
				'www\\.youtube\\.com/(?:v|embed)/([\\w\\-]+)',
				'youtu\\.be/([\\w\\-]+)'
			].join('|') + ')\\S*)',
			function (re, anchor) {
				anchor.setAttribute('youtube-key', re[2] || re[3] || re[4]);
				return `https://${re[1]}`;
			}
		),
		new LinkTarget(
			'link-nico2',
			'\\b((?:h?t?t?p?s?://)?(([^.]+\\.)?nicovideo\\.jp/watch/(sm\\w+)\\S*))',
			function (re, anchor) {
				anchor.setAttribute('nico2-key', re[2]);
				return `https://${re[1]}`;
			}
		),
		new LinkTarget(
			'link-futaba lightbox',
			'\\b((?:h?t?t?p?s?://)?[^.]+\\.2chan\\.net/[^/]+/src/\\d+\\.(?:jpg|gif|png|webp|webm|mp4)\\S*)',
			function (re, anchor) {
				anchor.setAttribute(
					'thumbnail',
					re[0]
						.replace('/src/', '/thumb/')
						.replace(/\.(?:jpg|gif|png|webp|webm|mp4)/, 's.jpg'));
				return re[0];
			}
		),
		new LinkTarget(
			'link-twitter link-external',
			'\\b((?:h?t?t?p?s?://)?twitter\\.com/[^/]+/status/(\\d+)\\S*)',
			function (re, anchor) {
				anchor.setAttribute('tweet-id', re[1]);
				return re[0];
			}
		),
		new LinkTarget(
			'link-external',
			'\\b((\\w+)(://\\S+))',
			function (re, anchor) {
				return re[0];
			}
		)
	];
	const linkTargetRegex = new RegExp(linkTargets.map((a, i) => {
		let re = (a.pattern.replace(/\(\?/g, '')).match(/\(/g);
		linkTargets[i].backrefLength = re ? re.length : 0;
		linkTargets[i].offset = i > 0 ? linkTargets[i - 1].offset + linkTargets[i - 1].backrefLength : 1;
		return a.pattern;
	}).join('|'));

	/*
	 * main functions
	 */

	function run (content, maxReplies) {
		timingLogger.startTag('createXMLGenerator#run');

		const url = window.location.href;
		const xml = document.implementation.createDocument(null, 'futaba', null);
		const text = textFactory(xml);
		const isReplyMode = pageModes[0].mode == 'reply';
		const baseUrl = url;
		const remainingRepliesContext = [];
		const enclosureNode = xml.documentElement;
		const metaNode = element(enclosureNode, 'meta');

		let re;
		if (typeof maxReplies != 'number') {
			maxReplies = 0x7fffffff;
		}

		// create fundamental nodes
		element(metaNode, 'mode')
			.appendChild(text(isReplyMode ? 'reply' : 'summary'));
		element(metaNode, 'url')
			.appendChild(text(url));
		element(metaNode, 'version')
			.appendChild(text(version));
		element(metaNode, 'extension_id')
			.appendChild(text(getExtensionId()));

		// strip all control characters and newline characters:
		// LF(U+000A), VT(U+000B), FF(U+000C), CR(U+000D),
		// NEL(U+0085), LS(U+2028) and PS(U+2029)
		content = content.replace(/[\u0000-\u001f\u0085\u2028\u2029]/g, ' ');

		// strip bidi control character references
		content = content.replace(/[\u200e-\u200f\u202a-\u202e]/g, '');

		// strip script tag and its contents
		content = content.replace(/<script[^>]*>.*?<\/script>/gi, '');

		// strip comments
		//content = content.replace(/<!--.*?-->/g, ' ');

		// experimental feature
		if (IDEOGRAPH_CONVERSION_CONTENT) {
			content = 新字体の漢字を舊字體に変換(content);
		}

		// base url
		re = /<base[^>]+href="([^"]+)"/i.exec(content);
		if (re) {
			baseUrl = resolveRelativePath(re[1], `${window.location.protocol}//${window.location.host}/`);
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
		(function () {
			let re = />([^<>]+)(＠ふたば)/.exec(content);
			if (!re) return;
			let title = re[1].replace(/二次元裏$/, `虹裏${siteInfo.server}`)
				+ re[2];
			if (!isReplyMode && siteInfo.summaryIndex) {
				title += ` [ページ ${siteInfo.summaryIndex}]`;
			}
			let titleNode = element(metaNode, 'title');
			titleNode.appendChild(text(title));
			linkify(titleNode, {linkify: false, emojify: true});
		})();

		// page notice
		(function () {
			let notices = /<table[^>]+class="ftbl"[^>]*>(.*?)<\/form>/i.exec(content);
			if (!notices) return;
			notices = notices[1];

			let noticeMarkups = [];
			let noticesNode = element(metaNode, 'notices');
			let noticeRegex = /<li[^>]*>(.*?)<\/li>/g;
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

				// min life time of thread
				if (notice.match(/最低(\d+)\s*(時間|分)保持/)) {
					siteInfo.minThreadLifeTime = parseMinThreadLifeTime(RegExp.$1, RegExp.$2);
					element(metaNode, 'minthreadlifetime').appendChild(text(siteInfo.minThreadLifeTime));
				}

				notice = stripTagsForNotice(notice);
				element(noticesNode, 'notice').appendChild(text(notice));
				noticeMarkups.push(notice);
			}

			siteInfo.noticeNew = noticeMarkups
				.join('\n')
				.replace(/現在[^人]+人/g, '現在__akahukuplus_viewers_count__人');
		})();

		// page navigator
		(function () {
			let navs = /<table[^>]+class="psen"[^>]*>(.*)<\/table>/i.exec(content);
			if (!navs) return;
			let buffer = [];

			let nav, navRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
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
			let navsNode = element(metaNode, 'navs');
			for (let i = 0, goal = Math.min(11, buffer.length); i < goal; i++) {
				let navNode = element(navsNode, 'nav');

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
		(function () {
			const postformRegex = /(<form[^>]+enctype="multipart\/form-data"[^>]*>)(.+?)<\/form>/ig;
			let postform;
			while ((postform = postformRegex.exec(content))) {
				if (!/<input[^>]+value="regist"/.test(postform[2])) continue;

				let pfNode = element(metaNode, 'postform');

				// postform attributes
				let attribRegex = /(action|method|enctype)="([^"]*)"/ig;
				let attrib;
				while ((attrib = attribRegex.exec(postform[1]))) {
					pfNode.setAttribute(attrib[1], attrib[2]);
				}

				// input elements
				const inputRegex = /<input[^>]+>/gi;
				let input;
				while ((input = inputRegex.exec(postform[2]))) {
					let inputNode = element(pfNode, 'input');
					let attribRegex = /(type|name|value)="([^"]*)"/ig;
					let attrib;
					while ((attrib = attribRegex.exec(input[0]))) {
						inputNode.setAttribute(attrib[1], attrib[2]);
					}
				}

				break;
			}

		})();

		// ads
		(function () {
			let adsNode = element(metaNode, 'ads');
			let adsHash = {};

			// pick up unique ad iframe list
			let adsRegex = /<iframe([^>]+)>.*?<\/iframe>/gi;
			let ads;
			while ((ads = adsRegex.exec(content))) {
				let width, height, src, re;

				re = /width\s*=\s*["']?\s*(\d+)/i.exec(ads[1]);
				if (re) {
					width = re[1] - 0;
				}

				re = /height\s*=\s*["']?\s*(\d+)/i.exec(ads[1]);
				if (re) {
					height = re[1] - 0;
				}

				re = /src\s*=\s*["']?\s*([^"'>\s]+)/i.exec(ads[1]);
				if (re) {
					src = re[1];
				}

				if (!isNaN(width) && !isNaN(height) && src) {
					adsHash[`${width}_${height}_${src}`] = 1;
				}
			}

			// shuffle
			let adsArray = Object.keys(adsHash);
			for (let i = adsArray.length - 1; i > 0; i--) {
				let index = Math.floor(Math.random() * (i + 1));
				let tmp = adsArray[i];
				adsArray[i] = adsArray[index];
				adsArray[index] = tmp;
			}

			// store into xml
			let bannersNode = element(adsNode, 'banners');
			for (let i of adsArray) {
				let parts = i.split('_');
				let width = parts.shift() - 0;
				let height = parts.shift() - 0;
				let src = parts.join('_');
				let adNode = element(bannersNode, 'ad');
				let className = 'unknown';

				if (width == 336) {
					className = 'standard';
				}
				else if (width == 300) {
					className = 'mini';
				}
				else if (width == 728) {
					className = 'large';
				}
				else if (width == 160 && height == 600) {
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
		(function () {
			let configNode = element(metaNode, 'configurations');
			let cs = getCatalogSettings();
			let paramNode;

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'catalog.x');
			paramNode.setAttribute('value', cs[0]);

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'catalog.y');
			paramNode.setAttribute('value', cs[1]);

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'catalog.text');
			paramNode.setAttribute('value', cs[2] != 0 ? '1' : '0');

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'storage')
			paramNode.setAttribute('value', storage.config.storage.value)

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'banner_enabled')
			paramNode.setAttribute('value', storage.config.banner_enabled.value ? '1' : '0')
		})();

		/*
		 * split content into threads
		 */

		const threadRegex = /(<div\s+class="thre"[^>]*>\s*)(?:画像ファイル名：.+?(<a[^>]+><img[^>]+><\/a>))?(?:<input[^>]+value="?delete"?[^>]*>|<span\s+id="delcheck\d+"[^>]*>).*?<hr>/g;
		const postTimeRegex = getPostTimeRegex();
		let threadIndex = 0;

		markStatistics.start();

		for (let matches; (matches = threadRegex.exec(content)); threadIndex++) {
			let match = matches[0];
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
				htmlref = /\b(res\/(\d+)\.htm|futaba\.php\?res=(\d+))/.exec(window.location.href);
			}
			else {
				htmlref = /<a href=['"]?(res\/(\d+)\.htm|futaba\.php\?res=(\d+))[^>]*>/i.exec(topicInfo);
			}
			if (!htmlref) continue;

			/*
			 * thread meta informations
			 */

			let threadNode = element(enclosureNode, 'thread');
			threadNode.setAttribute('url', resolveRelativePath(htmlref[1], baseUrl));

			/*
			 * topic informations
			 */

			let topicNode = element(threadNode, 'topic');

			// expiration date
			let expires = /<(?:small|span)[^>]*>([^<]+?頃消えます)<\/(?:small|span)>/i.exec(topicInfo);
			let expireWarn = /<font[^>]+><b>このスレは古いので、/i.test(topicInfo);
			let maxReached = /<span\s+class=["']?maxres["']?[^>]*>[^<]+<\/span>/i.test(topicInfo);
			if (expires || expireWarn || maxReached) {
				let expiresNode = element(topicNode, 'expires');
				if (expires) {
					expiresNode.appendChild(text(expires[1]));
					expiresNode.setAttribute('remains', getExpirationDate(expires[1]));
				}
				else {
					urlStorage.memo(window.location.href, Date.now() + 1000 * 60 * 60 * 24);
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
			if (typeof htmlref[2] == 'string' && htmlref[2] != '') {
				threadNumber = htmlref[2] - 0;
			}
			else if (typeof htmlref[3] == 'string' && htmlref[3] != '') {
				threadNumber = htmlref[3] - 0;
			}
			if (threadNumber) {
				let threadNumberNode = element(topicNode, 'number');
				threadNumberNode.appendChild(text(threadNumber));
				re = /^(\d*?)((\d)\3+)$/.exec(threadNumber);
				if (re) {
					threadNumberNode.setAttribute('lead', re[1]);
					threadNumberNode.setAttribute('trail', re[2]);
				}
				if (threadIndex == 0) {
					siteInfo.latestNumber = threadNumber;
				}
			}

			// posted date
			re = postTimeRegex.exec(topicInfo);
			if (re) {
				let postedDate = new Date(
					2000 + (re[1] - 0),
					re[2] - 1,
					re[3] - 0,
					re[4] - 0,
					re[5] - 0,
					re[6] - 0,
					0
				);
				let postDateNode = element(topicNode, 'post_date');
				postDateNode.appendChild(text(re[0]));
				postDateNode.setAttribute('value', postedDate.getTime());
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
				let emailNode = element(topicNode, 'email');
				emailNode.appendChild(text(stripTags(re[1])));
				linkify(emailNode);
				if (isReplyMode && /ID表示/i.test(re[1])) {
					siteInfo.idDisplay = true;
				}
			}

			// そうだね (that's right)
			re = /<a[^>]+class=["']?sod["']?[^>]*>([^<]+)<\/a>/i.exec(topicInfo);
			if (re) {
				let sodaneNode = element(topicNode, 'sodane');
				if (/x0$/.test(re[1])) {
					re[1] = '+';
				}
				sodaneNode.appendChild(text(re[1]
					.replace('x', ' × ')
					.replace('+', '＋')
				));
				sodaneNode.setAttribute('class', re[1] == '+' ? 'sodane-null' : 'sodane');
			}

			// ID
			re = /<span\s+class="[^"]*cnw[^"]*"[^>]*>.*?ID:(.+?)<\/span>/i.exec(topicInfo) || /ID:([^ <]+)/.exec(topicInfoText);
			if (re) {
				let idNode = element(topicNode, 'user_id');
				idNode.appendChild(text(stripTags(re[1])));
				markStatistics.notifyId(threadNumber, re[1]);
			}

			// IP
			re = /IP:([a-zA-Z0-9_*:.\-()]+)/.exec(topicInfoText);
			if (re) {
				let ipNode = element(topicNode, 'ip');
				ipNode.appendChild(text(re[1]));
			}

			// src & thumbnail url
			let imagehref = /<br><a[^>]+href="([^"]+)"[^>]*>(<img[^>]+>)<\/a>/i.exec(topicInfo);
			if (imagehref) {
				let imageNode = element(topicNode, 'image');
				let srcUrl = restoreDistributedImageURL(resolveRelativePath(imagehref[1], baseUrl));
				imageNode.appendChild(text(srcUrl));
				imageNode.setAttribute('base_name', imagehref[1].match(/[^\/]+$/)[0]);

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
					thumbUrl = restoreDistributedImageURL(thumbUrl);
				}
				re = /\bwidth="?(\d+)"?/i.exec(imagehref[2]);
				if (re) {
					thumbWidth = re[1];
				}
				re = /\bheight="?(\d+)"?/i.exec(imagehref[2]);
				if (re) {
					thumbHeight = re[1];
				}
				if (thumbUrl != '' && thumbWidth !== false && thumbHeight !== false) {
					let thumbNode = element(topicNode, 'thumb');
					let thumbnailSize = getThumbnailSize(thumbWidth, thumbHeight, 250, 250);
					thumbNode.appendChild(text(thumbUrl));
					thumbNode.setAttribute('width', thumbnailSize.width);
					thumbNode.setAttribute('height', thumbnailSize.height);
				}
			}

			// communist sign :-)
			re = /(\[|dice\d+d\d+(?:[-+]\d+)?=)?<font\s+color="#ff0000">(.+?)<\/font>\]?/i.exec(topic);
			if (re && (!re[1] || re[1].substr(-1) != '=')) {
				let markNode = element(topicNode, 'mark');
				re[0].charAt(0) == '['
					&& re[0].substr(-1) == ']'
					&& markNode.setAttribute('bracket', 'true');
				markNode.appendChild(text(stripTags(re[2])));
			}

			// comment
			pushComment(element(topicNode, 'comment'), topic);

			/*
			 * replies
			 */

			let hiddenRepliesCount = 0;
			re = /font color="#707070">レス(\d+)件省略。/i.exec(topicInfo);
			if (re) {
				hiddenRepliesCount = re[1] - 0;
			}

			let result = fetchReplies(
				threadRest,
				/<table[^>]*>.*?(?:<input[^>]*>|<span\s+id="delcheck\d+"[^>]*>).*?<\/td>/g,
				hiddenRepliesCount, maxReplies, -1, threadNode,
				siteInfo.subHash, siteInfo.nameHash, baseUrl);

			let lastIndex = result.regex.lastIndex;
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
			if (pageModes[0].mode == 'summary' && threadIndex == 0) {
				if (result.repliesNode.childElementCount) {
					siteInfo.latestNumber = $qs('number', result.repliesNode.lastElementChild).textContent - 0;
				}
			}

			result.repliesNode.setAttribute("total", result.repliesCount);
			result.repliesNode.setAttribute("hidden", hiddenRepliesCount);
		}

		setDefaultSubjectAndName(xml, metaNode, siteInfo.subHash, siteInfo.nameHash);

		timingLogger.endTag();
		return {
			xml: xml,
			remainingRepliesContext: remainingRepliesContext
		};
	}

	function fetchReplies (s, regex, hiddenRepliesCount, maxReplies, lowBoundNumber, threadNode, subHash, nameHash, baseUrl) {
		const text = textFactory(threadNode.ownerDocument);
		const repliesNode = element(threadNode, 'replies');
		const goal = hiddenRepliesCount + maxReplies;
		const postTimeRegex = getPostTimeRegex();

		let repliesCount = hiddenRepliesCount;
		let offset = hiddenRepliesCount + 1;
		let reply;

		for (;repliesCount < goal && (reply = regex.exec(s)); offset++, repliesCount++) {
			let re = /^(.*)<blockquote[^>]*>(.*)<\/blockquote>/i.exec(reply[0]);
			if (!re) continue;

			let info = re[1];
			let infoText = info.replace(/<\/?[\w\-:]+(\s+[\w\-:]+\s*=\s*"[^"]*")*[^>]*>/g, '');
			let comment = re[2];
			let replyNode = element(repliesNode, 'reply');
			let number;

			// number
			re = /No\.(\d+)/i.exec(infoText);
			if (re) {
				number = re[1];
				let numberNode = element(replyNode, 'number');
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
			re = /<span\s+class="[^"]*cnw[^"]*"[^>]*>.*?ID:(.+?)<\/span>/i.exec(info) || /ID:([^ "<]+)/.exec(infoText);
			if (re) {
				let idNode = element(replyNode, 'user_id');
				idNode.appendChild(text(stripTags(re[1])));
				markStatistics.notifyId(number, re[1]);
			}

			// IP
			re = /IP:([a-zA-Z0-9_*:.\-()]+)/.exec(infoText);
			if (re) {
				let ipNode = element(replyNode, 'ip');
				ipNode.appendChild(text(re[1]));
			}

			// mark
			re = /(\[|dice\d+d\d+(?:[-+]\d+)?=)?<font\s+color="#ff0000">(.+?)<\/font>\]?/i.exec(comment);
			if (re && (!re[1] || re[1].substr(-1) != '=')) {
				if (!$qs('deleted', replyNode)) {
					element(replyNode, 'deleted');
				}

				let markNode = element(replyNode, 'mark');
				if (re[0].charAt(0) == '[' && re[0].substr(-1) == ']') {
					markNode.setAttribute('bracket', 'true');
				}
				re[2] = stripTags(re[2]);
				markNode.appendChild(text(re[2]));
				markStatistics.notifyMark(number, re[2]);
			}

			// そうだね (that's right)
			re = /<a[^>]+class=["']?sod["']?[^>]*>([^<]+)<\/a>/i.exec(info);
			if (re) {
				let sodaneNode = element(replyNode, 'sodane');
				if (/x0$/.test(re[1])) {
					re[1] = '+';
				}
				sodaneNode.appendChild(text(re[1]
					.replace('x', ' × ')
					.replace('+', '＋')
				));
				sodaneNode.setAttribute('class', re[1] == '+' ? 'sodane-null' : 'sodane');
			}

			// offset
			element(replyNode, 'offset').appendChild(text(offset));

			// skip, if we can
			if (number <= lowBoundNumber) {
				continue;
			}

			// posted date
			re = postTimeRegex.exec(info);
			if (re) {
				let postedDate = new Date(
					2000 + (re[1] - 0),
					re[2] - 1,
					re[3] - 0,
					re[4] - 0,
					re[5] - 0,
					re[6] - 0,
					0
				);
				let postDateNode = element(replyNode, 'post_date');
				postDateNode.appendChild(text(re[0]));
				postDateNode.setAttribute('value', postedDate.getTime());
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
				let emailNode = element(replyNode, 'email');
				emailNode.appendChild(text(stripTags(re[1])));
				linkify(emailNode);
			}

			// src & thumbnail url
			let imagehref = /<br><a[^>]+href="([^"]+)"[^>]*>(<img[^>]+>)<\/a>/i.exec(info);
			if (imagehref) {
				let imageNode = element(replyNode, 'image');
				let srcUrl = restoreDistributedImageURL(resolveRelativePath(imagehref[1], baseUrl));
				imageNode.appendChild(text(srcUrl));
				imageNode.setAttribute('base_name', imagehref[1].match(/[^\/]+$/)[0]);

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
					thumbUrl = restoreDistributedImageURL(thumbUrl);
				}
				re = /\bwidth="?(\d+)"?/i.exec(imagehref[2]);
				if (re) {
					thumbWidth = re[1];
				}
				re = /\bheight="?(\d+)"?/i.exec(imagehref[2]);
				if (re) {
					thumbHeight = re[1];
				}
				if (thumbUrl != '' && thumbWidth !== false && thumbHeight !== false) {
					let thumbNode = element(replyNode, 'thumb');
					let thumbnailSize = getThumbnailSize(thumbWidth, thumbHeight, 250, 250);
					thumbNode.appendChild(text(thumbUrl));
					thumbNode.setAttribute('width', thumbnailSize.width);
					thumbNode.setAttribute('height', thumbnailSize.height);
				}
			}

			// comment
			//if (repliesCount == 0) {
			//	comment += '';
			//}
			pushComment(element(replyNode, 'comment'), comment);
		}

		return {
			lastReached: repliesCount < goal && !reply,
			repliesNode: repliesNode,
			repliesCount: repliesCount,
			regex: regex
		}
	}

	function runFromJson (content, hiddenRepliesCount) {
		timingLogger.startTag('createXMLGenerator#runFromJson');

		const url = window.location.href;
		const xml = document.implementation.createDocument(null, 'futaba', null);
		const text = textFactory(xml, true);
		const baseUrl = url;
		const enclosureNode = xml.documentElement;
		const metaNode = element(enclosureNode, 'meta');

		element(metaNode, 'mode')
			.appendChild(text('reply'));
		element(metaNode, 'url')
			.appendChild(text(url));
		element(metaNode, 'version')
			.appendChild(text(version));
		element(metaNode, 'extension_id')
			.appendChild(text(getExtensionId()));

		/*
		 * thread meta informations
		 */

		let threadNode = element(enclosureNode, 'thread');
		threadNode.setAttribute('url', baseUrl);

		/*
		 * replies
		 */

		markStatistics.start();

		const repliesNode = element(threadNode, 'replies');
		let offset = hiddenRepliesCount || 0;
		for (const replyNumber in content.res) {
			const reply = content.res[replyNumber];

			offset++;
			const replyNode = element(repliesNode, 'reply');

			// number
			{
				let numberNode = element(replyNode, 'number');
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
				if (re && (!re[1] || re[1].substr(-1) != '=')) {
					if (!$qs('deleted', replyNode)) {
						element(replyNode, 'deleted');
					}

					let markNode = element(replyNode, 'mark');
					if (re[0].charAt(0) == '[' && re[0].substr(-1) == ']') {
						markNode.setAttribute('bracket', 'true');
					}
					re[2] = stripTags(re[2]);
					markNode.appendChild(text(re[2]));
					markStatistics.notifyMark(replyNumber, re[2]);
				}
			}

			// ID
			if (reply.id != '') {
				const id = reply.id.replace(/^id:\s*/i, '');
				if (/^ip:\s*/i.test(id)) {
					let ipNode = element(replyNode, 'ip');
					ipNode.appendChild(text(id.replace(/^ip:\s*/i, '')));
				}
				else {
					let idNode = element(replyNode, 'user_id');
					idNode.appendChild(text(id));
					markStatistics.notifyId(replyNumber, id);
				}
			}

			// sodane
			if (content.dispsod - 0) {
				let sodaneNode = element(replyNode, 'sodane');
				if (replyNumber in content.sd) {
					sodaneNode.appendChild(text(`そうだね × ${content.sd[replyNumber]}`));
					sodaneNode.setAttribute('class', 'sodane');
				}
				else {
					sodaneNode.appendChild(text(`＋`));
					sodaneNode.setAttribute('class', 'sodane-null');
				}
			}

			// offset
			element(replyNode, 'offset').appendChild(text(offset));

			// posted date
			{
				let postedDate = new Date(reply.tim - 0);
				let postDateNode = element(replyNode, 'post_date');
				postDateNode.appendChild(text(reply.now.replace(/<[^>]*>/g, '')));
				postDateNode.setAttribute('value', postedDate.getTime());
			}

			// subject and name
			if (content.dispname - 0) {
				if (reply.sub != '') {
					element(replyNode, 'sub').appendChild(text(reply.sub));
					siteInfo.subHash[reply.sub] = (siteInfo.subHash[reply.sub] || 0) + 1;
				}

				if (reply.name != '') {
					element(replyNode, 'name').appendChild(text(reply.name));
					siteInfo.nameHash[reply.name] = (siteInfo.nameHash[reply.name] || 0) + 1;
				}
			}

			// mail address
			if (reply.email != '') {
				let emailNode = element(replyNode, 'email');
				emailNode.appendChild(text(stripTags(reply.email)));
				linkify(emailNode);
			}

			// src & thumbnail url
			if (reply.ext != '') {
				let imageNode = element(replyNode, 'image');
				let srcUrl = restoreDistributedImageURL(resolveRelativePath(reply.src, baseUrl));
				imageNode.appendChild(text(srcUrl));
				imageNode.setAttribute('base_name', reply.src.match(/[^\/]+$/)[0]);

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
				if (reply.thumb != '') {
					let thumbUrl = resolveRelativePath(reply.thumb, baseUrl);
					thumbUrl = restoreDistributedImageURL(thumbUrl);

					let thumbNode = element(replyNode, 'thumb');
					let thumbnailSize = getThumbnailSize(reply.w, reply.h, 250, 250);
					thumbNode.appendChild(text(thumbUrl));
					thumbNode.setAttribute('width', thumbnailSize.width);
					thumbNode.setAttribute('height', thumbnailSize.height);
				}
			}

			pushComment(element(replyNode, 'comment'), reply.com);
		}

		repliesNode.setAttribute("total", offset);
		repliesNode.setAttribute("hidden", hiddenRepliesCount);
		setDefaultSubjectAndName(xml, metaNode, siteInfo.subHash, siteInfo.nameHash);

		return {
			delta: offset - hiddenRepliesCount,
			xml: xml
		};
	}

	function remainingReplies (context, maxReplies, lowBoundNumber, callback1, callback2) {
		timingLogger.startTag('createXMLGenerator#remainingReplies');

		const url = window.location.href;

		function main () {
			timingLogger.startTag('creating fragment of replies');
			let xml = document.implementation.createDocument(null, 'futaba', null);
			let result = fetchReplies(
				context[0].content,
				context[0].regex,
				context[0].repliesCount,
				maxReplies,
				lowBoundNumber,
				element(xml.documentElement, 'thread'),
				siteInfo.subHash, siteInfo.nameHash, url);

			result.repliesNode.setAttribute("total", result.repliesCount);
			result.repliesNode.setAttribute("hidden", context[0].repliesCount);
			setDefaultSubjectAndName(xml, element(xml.documentElement, 'meta'), siteInfo.subHash, siteInfo.nameHash);
			timingLogger.endTag();

			timingLogger.startTag('intermediate call back');
			callback1(xml, context[0].index, result.repliesCount, context[0].repliesCount);
			timingLogger.endTag();

			let lastIndex = context[0].regex.lastIndex;
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

	return {
		run: run,
		remainingReplies: remainingReplies,
		runFromJson: runFromJson
	};
}

function createPersistentStorage () {
	/*
	 * NOTE: the 'desc' property will be treated as HTML fragment.
	 */
	const data = {
		wheel_reload_unit_size: {
			type:'int',
			value:120,
			name:'ホイールの1目盛りの単位移動量',
			desc:`通常は120だった気がするけど, 環境によってはもっと小さい値かもしれません。
右のテキストボックス上でホイールを回すと移動量が表示されるので, それらのうち最小の正の値を入力してください。`,
		},
		wheel_reload_threshold_override: {
			type:'int',
			value:3,
			name:'ホイールリロード発動量',
			desc:'ページ末尾で何回ホイールを回したときリロードを行うかを指定する',
			min:1
		},
		catalog_popup_enabled: {
			type:'bool',
			value:true,
			name:'カタログでサムネをポップアップ'
		},
		catalog_text_max_length: {
			type:'int',
			value:CATALOG_TEXT_MAX_LENGTH,
			name:'カタログで取得する本文の長さ',
			min:0
		},
		catalog_thumbnail_scale: {
			type:'float',
			value:1.0,
			name:'カタログのサムネイルの表示倍率',
			min:1.0, max:2.0
		},
		storage: {
			type:'list',
			value:'dropbox',
			name:'使用するストレージ',
			list:{
				dropbox:'dropbox',
				googledrive:'Google Drive',
				onedrive:'Microsoft OneDrive',
				local:'local'
			},
			desc:`localストレージを使用できるのは現在Chromeのみです。
詳細は <a href="https://akahuku.github.io/akahukuplus/how-to-save-image-with-chrome.html" target="_blank">ドキュメント</a> を参照してください。
<div><button data-href="#clear-credentials">オンラインストレージの認証を解除する</button></div>`
		},
		save_image_name_template: {
			type:'string',
			value:'$SERVER/$BOARD/$SERIAL.$EXT',
			name:'保存するファイル名のテンプレート',
			desc:`以下のマクロを使用できます:
<ul>
	<li>$SERVER (サーバ名)</li>
	<li>$BOARD (板名)</li>
	<li>$THREAD (スレッド番号)</li>
	<li>$YEAR (画像の投稿年)</li>
	<li>$MONTH (画像の投稿月)</li>
	<li>$DAY (画像の投稿日)</li>
	<li>$SERIAL (画像番号)</li>
	<li>$DIST (画像の分散キー)</li>
	<li>$TEXT (スレッド本文)</li>
	<li>$EXT (拡張子)</li>
</ul>`
		},
		auto_save_image: {
			type:'bool',
			value:false,
			name:'画像を開いた際に自動的に保存'
		},
		save_image_bell_volume: {
			type:'int',
			value:50,
			name:'画像保存が成功した際のベルの音量',
			min:0, max:100
		},
		lightbox_enabled: {
			type:'bool',
			value:true,
			name:'画像を lightbox で表示'
		},
		lightbox_zoom_mode: {
			type:'list',
			value:'whole',
			name:'lightbox で表示する際の初期倍率',
			list:{
				'whole':'全体',
				'actual-size':'実寸',
				'fit-to-width':'幅に合わせる',
				'fit-to-height':'高さに合わせる',
				'last':'最後に使用した倍率を使用する'
			}
		},
		banner_enabled: {
			type:'bool',
			value:true,
			name:'バナーを表示'
		},
		hook_space_key: {
			type:'bool',
			value:true,
			name:'スペースキーによるスクロールを制御'
		},
		hook_edit_shortcuts: {
			type:'bool',
			value:true,
			name:'テキスト入力時に Emacs ぽいショートカットを使用'
		},
		full_reload_interval: {
			type:'int',
			value:2,
			name:'フルリロードする間隔(分)',
			min:0, max:60
		},
		full_reload_after_post: {
			type:'bool',
			value:false,
			name:'レス送信後にフルリロード'
		},
		tegaki_max_width: {
			type:'int',
			value:400,
			name:'手書きキャンバスの最大の幅',
			min:1,max:1000
		},
		tegaki_max_height: {
			type:'int',
			value:400,
			name:'手書きキャンバスの最大の高さ',
			min:1,max:1000
		},
		autotrack_expect_replies: {
			type:'int',
			value:5,
			name:'自動追尾時に待機するレス数',
			desc:'このレス数がつくと思われる時間だけ自動追尾を待機します',
			min:1,max:10
		},
		autotrack_sampling_replies: {
			type:'int',
			value:10,
			name:'自動追尾時のサンプルレス数',
			desc:'待機時間を算出するために参照する既存レス群のサンプル数',
			min:3,max:30
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
		}
	};
	let onChanged;

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
			let keys = Object.keys(data[name].list);
			if (keys.indexOf(value) < 0) {
				value = keys[0];
			}
			break;
		default:
			return;
		}

		return value;
	}

	function saveConfig () {
		let config = {};

		for (let i in data) {
			if (data[i].value != data[i].defaultValue) {
				config[i] = data[i].value;
			}
		}

		set({config: config});
	}

	function saveRuntime () {
		set({runtime: runtime});
	}

	function assignConfig (storage) {
		if (!storage) return;

		for (let i in storage) {
			if (!(i in data)) continue;
			let value = validate(i, storage[i]);
			if (value != undefined) {
				data[i].value = value;
			}
		}
	}

	function assignRuntime (storage) {
		runtime = storage;
	}

	function resetConfig () {
		for (let i in data) {
			data[i].value = data[i].defaultValue;
		}
	}

	function getAllConfig () {
		let result = {};
		for (let i in data) {
			result[i] = data[i].value;
		}
		return result;
	}

	function getAllConfigDefault () {
		let result = {};
		for (let i in data) {
			result[i] = data[i].defaultValue;
		}
		return result;
	}

	function set (items) {
		try {
			chrome.storage.onChanged.removeListener(handleChanged);
			chrome.storage.sync.set(items, () => {
				if (chrome.runtime.lastError) {
					console.error(`${APP_NAME}: storage#set: ${chrome.runtime.lastError.message}`);
				}
				chrome.storage.onChanged.addListener(handleChanged);
			});
		}
		catch (err) {
			console.error(`${APP_NAME}: storage#set: ${err.stack}`);
			throw new Error(MESSAGE_BACKEND_CONNECTION_ERROR);
		}
	}

	function handleChanged (changes, areaName) {
		if (!onChanged) return;
		onChanged(changes, areaName);
	}

	function init () {
		for (let i in data) {
			data[i].defaultValue = data[i].value;
		}

		chrome.storage.onChanged.addListener(handleChanged);
	}

	init();
	return {
		saveConfig: saveConfig,
		assignConfig: assignConfig,
		saveRuntime: saveRuntime,
		assignRuntime: assignRuntime,
		resetConfig: resetConfig,
		getAllConfig: getAllConfig,
		getAllConfigDefault: getAllConfigDefault,
		set: set,
		get config () {return data},
		get runtime () {return runtime},
		get onChanged () {return onChanged},
		set onChanged (f) {
			if (typeof f == 'function') {
				onChanged = f;
			}
		}
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
			let now = Date.now();
			let item = {time:now, message: message};
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
			let item = stack.pop();
			if (!item) return;
			let now = Date.now();
			logs.push(
				`[done]\t` +
				`${timeOffset(now)}\t` +
				'                    '.substring(0, stack.length * 2) +
				item.message +
				(message ? (' ' + message) : '') +
				` (${(now - item.time).toFixed(4)} msecs)`);
			if (stack.length == 0) {
				log(`*** timing dump ***\n${this.dump()}`);
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
	const keys = {};

	function handler (e) {
		let t = e.target, fragment;
		while (t) {
			let code = t.nodeName;
			if (code == 'INPUT') {
				code += '-' + t.type;
			}
			if (/^(?:a|button|input-checkbox|input-radio)$/i.test(code)) {
				break;
			}
			if (t.getAttribute && (fragment = t.getAttribute('data-href')) != null) {
				break;
			}
			t = t.parentNode;
		}
		if (!t) {
			return;
		}
		if (fragment == null) {
			fragment = t.getAttribute('href');
			if (fragment == null) {
				fragment = t.getAttribute('data-href');
			}
		}
		if (fragment == null) {
			return;
		}

		if (/^#.+$/.test(fragment)) {
			if (fragment in keys) {
				invoke(fragment, e, t);
				return;
			}
		}

		for (let i in keys) {
			if (i.charAt(0) == '.' && t.classList.contains(i.substring(1))) {
				invoke(i, e, t);
				return;
			}
		}

		if ('*noclass*' in keys) {
			keys['*noclass*'](e, t);
		}
	}

	function invoke (fragment, e, t) {
		let result;
		try {
			result = keys[fragment](e, t);
		}
		catch (e) {
			console.error(`${APP_NAME}: exception in clickDispatcher: ${e.stack}`);
			result = undefined;
		}

		let isAnchor = false;
		for (var elm = e.target; elm; elm = elm.parentNode) {
			if (elm.nodeName == 'A') {
				isAnchor = true;
				break;
			}
		}

		if (isAnchor && result !== PASS_THROUGH) {
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

	document.body.addEventListener('click', handler, false);

	return {
		add:add,
		remove:remove,
		PASS_THROUGH: PASS_THROUGH
	};
}

function createKeyManager () {
	const PASS_THROUGH = 'passthrough';
	const strokes = {};

	function keypress (e) {
		let focusedNodeName = getFocusedNodeName();
		if ((e.code == 13 || e.code == 27) && isSpecialInputElement(focusedNodeName)) {
			return;
		}

		let mode = appStates[0] +
			(isTextInputElement(focusedNodeName) ? '.edit' : '');
		if (!(mode in strokes) || !(e.key in strokes[mode])) {
			return;
		}

		let result;
		try {
			result = strokes[mode][e.key].handler(e, document.activeElement);
		}
		catch (ex) {
			console.error(
				`${APP_NAME}: exception in keyManager: ${e.stack}`);
			result = undefined;
		}
		if (result === PASS_THROUGH) {
			return;
		}
		return false;
	}

	function getFocusedNodeName () {
		const el = document.activeElement;
		let focusedNodeName = el.nodeName.toLowerCase();
		if (focusedNodeName == 'input') {
			focusedNodeName += `.${el.type.toLowerCase()}`;
		}
		else if (el.contentEditable == 'true') {
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

	function addStroke (mode, stroke, handler, isPrior) {
		if (!(mode in strokes)) {
			strokes[mode] = {};
		}
		if (!(stroke instanceof Array)) {
			stroke = [stroke];
		}
		stroke.forEach(s => {
			strokes[mode][s] = {
				handler: handler,
				isPrior: isPrior
			};
		});
		return this;
	}

	function removeStroke (mode, stroke) {
		if (mode in strokes) {
			if (stroke == undefined) {
				delete strokes[mode];
			}
			else {
				if (!(stroke instanceof Array)) {
					stroke = [stroke];
				}
				stroke.forEach(s => {
					delete strokes[mode][s];
				});
				if (Object.keys(strokes[mode]).length == 0) {
					delete strokes[mode];
				}
			}
		}
		return this;
	}

	function updateManifest (mode) {
		if (!mode) {
			mode = appStates[0];
		}
		if (!(mode in strokes)) {
			return;
		}

		let m = [];
		for (let i in strokes[mode]) {
			if (strokes[mode][i].isPrior) {
				m.push(i);
			}
		}

		qeema.setManifest(m);
	}

	qeema.install({handlePasteEvent: false}).addListener(keypress);

	return {
		addStroke:addStroke,
		removeStroke:removeStroke,
		updateManifest:updateManifest,
		PASS_THROUGH: PASS_THROUGH
	};
}

function createSound (name, volume) {
	volume || (volume = 50);
	return {
		play: function play () {
			if (volume <= 0) return;
			sendToBackend('play-sound', {
				key: name,
				volume: volume
			});
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

function createMarkStatistics () {
	let marks, otherMarks, ids;
	let repliesCount, newEntries;
	let lastStatistics;

	const KEY_MAP = {
		'管理人': 'admin',
		'なー': 'nar',
		'スレッドを立てた人によって削除されました': 'passive',
		'書き込みをした人によって削除されました': 'active'
	};

	function notifyMark (number, content) {
		let key = KEY_MAP[content];
		if (key) {
			if (!(number in marks[key])) {
				newEntries[`${key}_${number}`] = 1;
			}
			marks[key][number] = 1;
		}
		else {
			if (!(content in otherMarks)) {
				otherMarks[content] = {};
			}
			if (!(number in otherMarks[content])) {
				newEntries[`other_${number}`] = 1;
			}
			otherMarks[content][number] = 1;
		}
	}

	function notifyId (number, id) {
		if (!(id in ids)) {
			ids[id] = {};
		}
		if (!(number in ids[id])) {
			newEntries[`id_${number}`] = 1;
		}
		ids[id][number] = 1;
	}

	function reset () {
		marks = {
			admin: {},
			nar: {},
			passive: {},
			active: {}
		};
		otherMarks = {};
		ids = {};
		newEntries = {};
	}

	function start () {
		newEntries = {};
		repliesCount = getRepliesCount();
	}

	function getStatistics (dropDelta) {
		let extMarks = {};
		let newMarks = {};
		let extIds = {};
		let newIds = {};
		let currentRepliesCount = getRepliesCount();

		function getMarkData () {
			let result = {};

			for (let i in marks) {
				result[i] = [];
				for (let num in marks[i]) {
					let isNew = `${i}_${num}` in newEntries;
					if (isNew) {
						newMarks[num] = 1;
					}
					extMarks[num] = 1;

					result[i].push({
						isNew: isNew,
						number: num
					});
				}
			}

			return result;
		}

		function getOtherMarkData () {
			let result = {};

			for (let host in otherMarks) {
				result[host] = [];
				for (let num in otherMarks[host]) {
					let isNew = `other_${num}` in newEntries;
					if (isNew) {
						newMarks[num] = 1;
					}
					extMarks[num] = 1;

					result[host].push({
						isNew: isNew,
						number: num
					});
				}
			}

			return result;
		}

		function getIdData () {
			let result = {};

			for (let id in ids) {
				result[id] = [];

				for (let num in ids[id]) {
					let isNew = `id_${num}` in newEntries;
					if (isNew) {
						newIds[id] = 1;
					}
					extIds[id] = 1;

					result[id].push({
						isNew: isNew,
						number: num
					});
				}
			}

			return result;
		}

		return lastStatistics = {
			markData: getMarkData(),
			otherMarkData: getOtherMarkData(),
			idData: getIdData(),

			count: {
				total: currentRepliesCount,
				mark: Object.keys(extMarks).length,
				id: Object.keys(extIds).length
			},

			delta: {
				total: dropDelta ? 0 : currentRepliesCount - repliesCount,
				mark: dropDelta ? 0 : Object.keys(newMarks).length,
				id: dropDelta ? 0 : Object.keys(newIds).length,
			}
		};
	}

	function clearStatistics () {
		lastStatistics = undefined;
	}

	function updatePanelView (statistics) {
		if (pageModes[0].mode != 'reply') return;

		function setListItemVisibility (node, value) {
			while (node && node.nodeName != 'LI') {
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
			let p = container.appendChild(document[CRE]('p'));
			p.classList.add('sub-header');
			p.textContent = label;

			let pp = p.appendChild(document[CRE]('span'));
			pp.appendChild(document.createTextNode(`(${count} 回)`));
		}

		function outputArray (container, a) {
			for (let i = 0; i < a.length; i++) {
				container.appendChild(document.createTextNode(' '));
				let anchor = container.appendChild(document[CRE]('a'));
				anchor.href = '#search-item';
				anchor.textContent = `No.${a[i].number}`;
				anchor.setAttribute('data-number', a[i].number);
				a[i].isNew && anchor.classList.add('new');
			}
		}

		let markData = statistics.markData;
		let otherMarkData = statistics.otherMarkData;
		let idData = statistics.idData;
		let container;

		for (let i in markData) {
			let container = $(`stat-${i}`);
			if (!container) continue;

			empty(container);
			let data = markData[i];
			if (data.length) {
				let li = setListItemVisibility(container, true);
				if (li) {
					let header = $qs('p span', li);
					if (header) {
						header.textContent = ` (${markData[i].length})`;
					}
				}
				outputArray(container, markData[i]);
			}
			else {
				setListItemVisibility(container, false);
			}
		}

		container = $('stat-other');
		if (container) {
			empty(container);
			if (Object.keys(otherMarkData).length) {
				setListItemVisibility(container, true);
				for (let i in otherMarkData) {
					outputSubHeader(container, i, otherMarkData[i].length);
					outputArray(container, otherMarkData[i]);
				}
			}
			else {
				setListItemVisibility(container, false);
			}
		}

		container = $('stat-id');
		if (container) {
			empty(container);
			let idKeys = Object.keys(idData);
			if (idKeys.length) {
				$t('stat-id-header', `(${idKeys.length} ID)`);
				for (let i in idData) {
					let li = container.appendChild(document[CRE]('li'));
					outputSubHeader(li, i, idData[i].length);
					let div = li.appendChild(document[CRE]('div'));
					outputArray(div, idData[i]);
				}
			}
			else {
				$t('stat-id-header', '');
			}
		}
	}

	function updatePostformView (statistics) {
		let marked = false;
		let identified = false;

		for (let i in statistics.count) {
			let current = statistics.count[i];
			let diff;

			if (!statistics.delta || (diff = statistics.delta[i]) == undefined || diff == 0) {
				$t(`replies-${i}`, current);
				$t(`pf-replies-${i}`, current);
				continue;
			}

			let s = `${current}(${diff > 0 ? '+' : ''}${diff})`;
			$t(`replies-${i}`, s);
			$t(`pf-replies-${i}`, s);

			if (i == 'mark') {
				marked = true;
			}
			else if (i == 'id') {
				identified = true;
			}
		}

		if (identified) {
			if (siteInfo.server == 'may' && siteInfo.board == 'id') {
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

	function init () {
		reset();
	}

	init();

	return {
		reset: reset,
		start: start,
		getStatistics: getStatistics,
		clearStatistics: clearStatistics,
		notifyMark: notifyMark,
		notifyId: notifyId,
		updatePanelView: updatePanelView,
		updatePostformView: updatePostformView,
		resetPostformView: resetPostformView,
		get lastStatistics () {return lastStatistics}
	};
}

function createQueryCompiler () {
	const lex = /-?"[^"]*"|\(|\)|-\(|\||[^\s|\u3000|)]+/g;
	let query;
	let lastIndex;
	let reachedToEof;

	function next () {
		if (reachedToEof) return null;
		lastIndex = lex.lastIndex;
		let re = lex.exec(query);
		if (re) return re[0];
		reachedToEof = true;
		return null;
	}

	function unget () {
		if (lastIndex < 0) {
			throw new Error('double unget');
		}
		lex.lastIndex = lastIndex;
		lastIndex = -1;
	}

	function or (v) {
		let result = [];
		while (true) {
			let a = and(v);
			result.push(a);

			v = next();
			if (v == null) {
				break;
			}
			else if (v != '|') {
				unget();
				break;
			}
			else {
				v = next();
			}
		}
		return result.join(' || ');
	}

	function and (v) {
		let result = [];
		while (true) {
			let a = word(v);
			result.push(a);

			v = next();
			if (v == null) {
				break;
			}
			else if (v == '|' || v == ')') {
				unget();
				break;
			}
		}
		return result.join(' && ');
	}

	function word (v) {
		if (v == '(') {
			let a = or(next());
			v = next();
			if (v != ')') {
				throw new Error('括弧がつり合っていません');
			}
			return `(${a})`;
		}
		else if (v == '-(') {
			let a = or(next());
			v = next();
			if (v != ')') {
				throw new Error('括弧がつり合っていません');
			}
			return `!(${a})`;
		}
		else if (v !== null) {
			let op = '>=';
			if (v.charAt(0) == '-') {
				op = '<';
				v = v.substring(1);
			}
			if (v.charAt(0) == '"' && v.substr(-1) == '"') {
				v = getLegalizedStringForSearch(v.substring(1, v.length - 1));
			}
			else {
				v = getLegalizedStringForSearch(v);
			}
			if (v == '') {
				return '';
			}
			return `target.indexOf("${v.replace(/"/g, '\\"')}")${op}0`;
		}
		else {
			return '';
		}
	}

	function compile (q) {
		query = q.replace(/^\s+|\s+$/g, '');
		let result;
		if (query.charAt(0) == '/' && query.substr(-1) == '/') {
			try {
				let regex = new RegExp(query.substring(1, query.length - 1), 'i');
				result = {
					test: target => regex.test(target)
				};
			}
			catch (e) {
				result = {
					test: () => false,
					message: '正規表現に誤りがあります'
				};
			}
		}
		else {
			lex.lastIndex = lastIndex = 0;
			reachedToEof = false;
			let source;

			try {
				source = or(next());
				//log(source);
			}
			catch (e) {
				result = {
					test: () => false,
					message: e.message
				};
			}

			try {
				let f = window[FUN];
				result = {
					test: new f('target', `return ${source}`)
				};
			}
			catch (e) {
				result = {
					test: () => false,
					message: e.message
				};
			}
		}
		return result;
	}

	return {
		compile: compile
	};
}

function createUrlStorage () {
	function loadSlot (callback) {
		try {
			chrome.storage.sync.get({openedThreads:[]}, result => {
				if (chrome.runtime.lastError) {
					console.error(`${APP_NAME}: loadSlot: ${chrome.runtime.lastError.message}`);
					callback([]);
					return;
				}

				const now = Date.now();
				result.openedThreads = result.openedThreads.filter(item => item.expire > now);
				callback(result.openedThreads);
			});
		}
		catch (err) {
			console.error(`${APP_NAME}: loadSlot: ${err.stack}`);
			throw new Error(MESSAGE_BACKEND_CONNECTION_ERROR);
		}
	}

	function saveSlot (slot) {
		try {
			storage.set({
				openedThreads: slot
			});
		}
		catch (err) {
			console.error(`${APP_NAME}: saveSlot: ${err.stack}`);
			throw new Error(MESSAGE_BACKEND_CONNECTION_ERROR);
		}
	}

	function indexOf (slot, key) {
		let result = -1;
		slot.some((item, i) => {
			if (item.key == key) {
				result = i;
				return true;
			}
		});
		return result;
	}

	function getKey (url) {
		return siteInfo.resno ?
			`${siteInfo.server}-${siteInfo.board}-${siteInfo.resno}` :
			null;
	}

	function memo (url, expire) {
		let key = getKey(url);
		if (!key) return;

		loadSlot(slot => {
			let index = indexOf(slot, key);
			if (index >= 0) {
				slot[index].expire = expire;
				slot[index].count++;
			}
			else {
				slot.push({expire: expire, key: key, count: 1});
			}
			saveSlot(slot);
		});
	}

	function getAll () { /*returns promise*/
		return new Promise(resolve => {
			loadSlot(slot => {
				let result = {};
				slot.forEach(item => {
					let key = item.key.split('-');
					if (siteInfo.server == key[0] && siteInfo.board == key[1]) {
						result[key[2]] = item.count;
					}
				});

				/*
				 * result is key(threadNumber) - value (count) object like: {
				 *   '0000000001': 1,
				 *   '0000000002': 1,
				 *        :
				 *        :
				 * }
				 */

				resolve(result);
			});
		});
	}

	return {
		memo: memo,
		getAll: getAll
	};
}

function createCatalogPopup (container) {
	const popups = [];
	let timer;

	function _log (s) {
		//log(s);
	}

	function mover (e) {
		if (!storage.config.catalog_popup_enabled.value) return;
		if (transport.isRunning('reload-catalog-main')) return;
		if (transport.isRunning('reload-catalog-sub')) return;
		if (!cursorPos.moved) return;
		_log('mover: ' + (e.target.outerHTML || '<#document>').match(/<[^>]*>/)[0]);

		let target;
		if (e.target.nodeName == 'IMG' || e.target.classList.contains('text')) {
			target = e.target;
			while (target && target.nodeName != 'A') {
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
				if (p == target) {
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
			if (item.target == target) {
				result = i;
				return true;
			}
		});
		return result;
	}

	function getRect (elm) {
		let rect = elm.getBoundingClientRect();
		let sl = docScrollLeft();
		let st = docScrollTop();
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
		let sl = viewportRect.left + docScrollLeft();
		let st = viewportRect.top + docScrollTop();
		let sr = sl + viewportRect.width;
		let sb = st + viewportRect.height;
		let right = rect.left + rect.width;
		let bottom = rect.top + rect.height;
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

		let targetThumbnail = $qs('img', target);
		if (targetThumbnail && targetThumbnail.naturalWidth && targetThumbnail.naturalHeight) {
			thumbnail = document.body.appendChild(document[CRE]('img'));
			thumbnail.src = targetThumbnail.src.replace('/cat/', '/thumb/');
			thumbnail.className = 'catalog-popup hide';
			thumbnail.setAttribute('data-url', target.href);
			thumbnail.addEventListener('click', (e) => {
				sendToBackend('open', {
					url: e.target.getAttribute('data-url'),
					selfUrl: window.location.href
				});
			}, false);
			shrinkedRect = getRect(targetThumbnail);
		}

		let targetText = $qs('.text', target);
		let targetCount = $qs('.info span:first-child', target);
		if (targetText || targetCount) {
			text = document.body.appendChild(document[CRE]('div'));
			text.className = 'catalog-popup hide';
			if (targetText) {
				text.appendChild(document.createTextNode(targetText.getAttribute('data-text')));
			}
			if (targetCount) {
				text.appendChild(document[CRE]('span')).textContent = targetCount.textContent;
			}
		}

		let item = {
			state: 'initialize',
			target: target,
			thumbnail: thumbnail,
			shrinkedRect: shrinkedRect,
			text: text
		};
		popups.push(item);
		index = popups.length - 1;

		if (thumbnail && (!thumbnail.naturalWidth || !thumbnail.naturalHeight)) {
			let handleLoad = (e) => {
				e.target.removeEventListener('load', handleLoad, false);
				e.target.removeEventListener('error', handleFail, false);
				handleLoad = handleFail = null;
				open(target);
			};
			let handleFail = (e) => {
				e.target.removeEventListener('load', handleLoad, false);
				e.target.removeEventListener('error', handleFail, false);
				handleLoad = handleFail = null;
				open(target);
			};
			thumbnail.addEventListener('load', handleLoad, false);
			thumbnail.addEventListener('error', handleFail, false);
		}
		else {
			open(index);
		}
		_log('exit prepare');
	}

	function open (target) {
		let index = typeof target == 'number' ? target : indexOf(target);
		if (index < 0 || target >= popups.length) {
			_log(`open: index ${index} is invalid. exit.`);
			return;
		}

		let item = popups[index];
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
		let index = typeof target == 'number' ? target : indexOf(target);
		if (index < 0 || index >= popups.length) {
			_log(`close: index ${index} is invalid. exit.`);
			return;
		}

		let item = popups[index];
		if (item.state == 'closing') return;

		let handleTransitionend = function (e) {
			if (e && e.target) {
				let t = e.target;
				t.parentNode && t.parentNode.removeChild(t);
			}
			if (item && --item.closingCount <= 0 && item.state == 'closing') {
				for (let i = 0; i < popups.length; i++) {
					if (popups[i] == item) {
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
		const elms = Array.from($qsa('body > .catalog-popup'));
		for (let i = 0; i < popups.length; i++) {
			['thumbnail', 'text'].forEach(p => {
				const index = elms.indexOf(popups[i][p]);
				index >= 0 && elms.splice(index, 1);
			});
			if (popups[i].target == except) continue;
			close(i);
		}
		elms.forEach(elm => {
			elm.parentNode && elm.parentNode.removeChild(elm);
		});
	}

	function deleteAll () {
		$qsa('body > .catalog-popup').forEach(node => {
			node.parentNode && node.parentNode.removeChild(node);
		});
		popups.length = 0;
		cursorPos.moved = false;
	}

	function init () {
		container = $(container);
		if (!container) return;

		container.addEventListener(MOVER_EVENT_NAME, mover);
	}

	init();
	return {
		closeAll: closeAll,
		deleteAll: deleteAll
	};
}

function createQuotePopup () {
	const POOL_ID = 'quote-popup-pool';
	const ORIGIN_CACHE_ATTR = 'data-quote-origin';
	const ORIGIN_ID_ATTR = 'data-quote-origin-id';

	var timer;
	var lastQuoteElement;

	function init () {
		if (pageModes[0].mode != 'reply') return;

		document.body.addEventListener(MMOVE_EVENT_NAME, mmove, false);
		clickDispatcher.add('#jumpto-quote-origin', function (e, t) {
			jumpto($(t.getAttribute(ORIGIN_ID_ATTR)));
		})
	}

	function mmove (e) {
		!timer && (timer = setTimeout(function () {
			timer = null;
			popup();
		}, QUOTE_POPUP_DELAY_MSEC));
	}

	function getParent (elm, spec) {
		spec = spec.split('.');

		var nodeName = spec[0].toLowerCase();
		var className = spec.length >= 2 ? spec[1] : '';
		var key = (nodeName != '' ? 2 : 0) | (className != '' ? 1 : 0);

		for (; elm; elm = elm.parentNode) {
			if (elm.nodeType != 1) continue;

			switch (key) {
			case 1:	// .className
				if (elm.classList.contains(className)) {
					return elm;
				}
				break;
			case 2:	// nodeName
				if (elm.nodeName.toLowerCase() == nodeName) {
					return elm;
				}
				break;
			case 3:	// nodeName.className
				if (elm.nodeName.toLowerCase() == nodeName
				&& elm.classList.contains(className)) {
					return elm;
				}
				break;
			}
		}

		return null;
	}

	function getQuoteOriginCache (quote) {
		quote = $(quote);
		if (!quote) {
			return null;
		}

		var attr = quote.getAttribute(ORIGIN_CACHE_ATTR);
		var re = /^(_\d+)\|(\d+)$/.exec(attr);
		if (!re) {
			return null;
		}

		return {
			index: re[2] - 0,
			element: $(re[1])
		};
	}

	function setQuoteOriginCache (quote, id, index) {
		quote = $(quote);
		if (!quote) {
			return;
		}

		quote.setAttribute(ORIGIN_CACHE_ATTR, `${id}|${index}`);
	}

	function getQuoteOrigin (quote, sentinelComment, sentinelWrap, singleLine) {
		if (/^[\s\u3000]*$/.test(quote.textContent)) {
			return null;
		}

		// immediately return if cache exists
		const cache = getQuoteOriginCache(quote);
		if (cache) {
			return cache;
		}

		const sentinelNo = getPostNumber(sentinelWrap);

		// lookup quote type...

		// post number (>No.xxxxxxxx)
		{
			let re = /^>+\s*(?:no\.)?(\d+)\s*(?:\n|$)/i.exec(quote.textContent);
			if (re) {
				const quotedNo = re[1] - 0;
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
				if (origin == sentinelWrap) {
					return null;
				}

				let index = $qs('.no', origin);
				if (index) {
					index = index.textContent - 0;
				}
				else {
					index = 0;
				}

				if (!origin.classList.contains('topic-wrap')) {
					origin = origin.parentNode;
				}

				return {
					index: index,
					element: origin
				};
			}
		}

		// attached file name (>xxxxxxxxxxx.xxx)
		{
			let re = /^>+\s*(\d+\.\w+)/i.exec(quote.textContent);
			if (re) {
				let origin = $qs(`article a[href$="${re[1]}"]`);
				if (!origin) {
					return null;
				}
				if (origin == sentinelWrap) {
					return null;
				}

				let index;
				if (origin.parentNode.classList.contains('reply-image')) {
					origin = getWrapElement(origin);
					index = $qs('.no', origin).textContent - 0;
				}
				else {
					origin = $qs('article .topic-wrap');
					index = 0;
				}

				return {
					index: index,
					element: origin
				};
			}
		}

		// quote content
		let quoteTextForSearch;
		{
			let span = document[CRE]('span');
			let quoteText = quote.textContent.replace(/[\s\u3000]*$/, '');

			if (singleLine) {
				quoteTextForSearch = quoteText;
			}
			else {
				sentinelComment[IHTML].split(/<br[^>]*>/i).some(function (t) {
					span[IHTML] = t;
					var result = false;
					var fragment = span.textContent
						.replace(/^\s+/, '')
						.replace(/[\s\u3000]+$/, '');

					if (/^(?:>|&gt;)/.test(fragment)) {
						if (!quoteTextForSearch) {
							quoteTextForSearch = [fragment];
						}
						else {
							quoteTextForSearch.push(fragment);
						}
						if (fragment == quoteText) {
							quoteTextForSearch = quoteTextForSearch.join('\n');
							result = true;
						}
					}
					else {
						quoteTextForSearch = undefined;
					}
					return result;
				});
			}

			quoteTextForSearch = quoteTextForSearch
				.replace(/^(?:>|&gt;)/, '')
				.replace(/\n(?:>|&gt;)/g, '\n');
		}

		const nodes = $qsa([
			'article .topic-wrap .comment',
			'article .reply-wrap .comment'
		].join(','));
		for (let i = 0, goal = nodes.length; i < goal ; i++) {
			let origin = getWrapElement(nodes[i]);
			let originNo = getPostNumber(origin);

			if (originNo >= sentinelNo) {
				break;
			}
			if (nodes[i].textContent.indexOf(quoteTextForSearch) < 0) {
				continue;
			}

			return {
				index: i,
				element: origin
			};
		}

		return null;
	}

	function indexOfNodes (nodes, target) {
		return Array.prototype.indexOf.call(nodes, target);
	}

	function removePopup (sentinelComment) {
		var pool = $(POOL_ID);
		while (pool && pool.childNodes.length > 0) {
			var ch = pool.lastChild;

			if (indexOfNodes($qsa('.comment', ch), sentinelComment) >= 0) {
				break;
			}

			ch.parentNode.removeChild(ch);
		}
	}

	function createPopup (quoteOrigin, poolId) {
		let no = quoteOrigin.element.getAttribute('data-number') ||
			$qs('[data-number]', quoteOrigin.element).getAttribute('data-number');
		quoteOrigin.element.id = `_${no}`;

		// create new popup
		let div = ($(poolId) || $(POOL_ID)).appendChild(document[CRE]('div'));
		div.className = 'quote-popup';
		div.appendChild(quoteOrigin.element.cloneNode(true));

		// some tweaks for contents
		{
			let noElm = $qs('.no', div);
			if (noElm) {
				let a = document[CRE]('a');
				noElm.parentNode.replaceChild(a, noElm);
				a.className = 'jumpto-quote-anchor';
				a.href = '#jumpto-quote-origin';
				a.textContent = noElm.textContent;
				a.setAttribute(ORIGIN_ID_ATTR, quoteOrigin.element.id);
			}
		}

		$qsa('input[type="checkbox"], iframe, video, audio', div).forEach(node => {
			node.parentNode.removeChild(node);
		});
		$qsa('img.hide', div).forEach(node => {
			node.classList.remove('hide');
		});

		// positioning
		div.style.visibility = 'hidden';
		div.style.left = div.style.top = '0';
		let w = div.offsetWidth;
		let h = div.offsetHeight;
		let sl = docScrollLeft();
		let st = docScrollTop();
		let cw = viewportRect.width;
		let ch = viewportRect.height;
		let l = Math.max(0, Math.min(cursorPos.pagex + QUOTE_POPUP_POS_OFFSET, sl + cw - w));
		let t = Math.max(0, Math.min(cursorPos.pagey + QUOTE_POPUP_POS_OFFSET, st + ch - h));
		div.style.left = l + 'px';
		div.style.top = t + 'px';
		div.style.visibility = '';

		return div;
	}

	function popup () {
		var element = document.elementFromPoint(cursorPos.x, cursorPos.y);
		var q = getParent(element, 'q');
		var comment = getParent(element, '.comment');
		var wrap = comment ? comment.parentNode : null;

		if (q && comment && wrap) {
			/*
			if (q == lastQuoteElement) {
				return;
			}

			lastQuoteElement = q;
			 */

			for (var i = 0; i < 2; i++) {
				var quoteOrigin = getQuoteOrigin(q, comment, wrap, i == 1);
				if (!quoteOrigin) {
					continue;
				}

				removePopup(getParent(wrap, '.quote-popup') ? comment : null);
				createPopup(quoteOrigin);
				setQuoteOriginCache(q, quoteOrigin.element.id, quoteOrigin.index);

				return;
			}
		}

		if (element) {
			var quotePopupContainer = getParent(element, '.quote-popup');
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
		var st = docScrollTop();
		var y = Math.max(0, target.getBoundingClientRect().top + st - QUOTE_POPUP_HIGHLIGHT_TOP_MARGIN);
		y < st && window.scrollTo(0, y);
		removePopup();

		setTimeout(function () {
			target.classList.remove('highlight');
		}, QUOTE_POPUP_HIGHLIGHT_MSEC);
	}

	init();
	return {
		jumpto: jumpto,
		createPopup: createPopup
	};
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

	function mup (e) {
		if (!enabled) return;

		let element = document.elementFromPoint(cursorPos.x, cursorPos.y);
		while (element) {
			if (element.contentEditable == 'true') return;
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

		if (s != '') {
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
				if (com) {
					commands.activatePostForm().then(() => {
						quote(com, text, /^quote\b/.test(key));
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
						if (start.nodeType == 1) break;
					}

					let end = r1.endContainer;
					for (; end; end = end.parentNode) {
						if (end.nodeType == 1) break;
					}

					if (start && end) {
						const r2 = document.createRange();
						r2.setStartBefore(start);
						r2.setEndAfter(end);

						const result = Array.from($qsa('.comment', r2.cloneContents()))
							.map(node => Array.from(node.childNodes)
								.filter(cnode => cnode.nodeType == 3)
								.map(cnode => cnode.nodeValue.replace(/\n+$/, ''))
								.join(''))
							.join('');

						commands.activatePostForm().then(() => {
							quote(com, result, false);
						});
					}
					else {
						setBottomStatus('選択範囲が変です。');
					}
				}
			}
			break;

		case 'copy':
		case 'copy-with-quote':
			{
				const quoted = key == 'copy' ? text : getQuoted(text);

				if ('clipboard' in navigator) {
					navigator.clipboard.writeText(quoted);
				}
				else if (WasaviExtensionWrapper.IS_GECKO) {
					setClipboardGecko(quoted);
				}
				else {
					backend.setClipboard(quoted);
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
		sendToBackend('open',
			{
				url: url,
				selfUrl: window.location.href
			});
	}

	function getQuoted (s) {
		return s.split('\n')
			.map(line => `>${line}`)
			.join('\n');
	}

	function quote (target, text, addPrefix) {
		target = $(target);
		if (!target) return;

		let s = addPrefix ? getQuoted(text) : text;
		s = s.replace(/^\s+|\s+$/g, '');
		if (s == '') return;

		if (!/^\s*$/.test(target.textContent)) {
			s = `\n${s}`;
		}

		setCaretToContentLast(target);
		document.execCommand('insertText', false, `${s}\n`);
	}

	function setCaretToContentLast (el) {
		if ('value' in el) {
			el.setSelectionRange(el.value.length, el.value.length);
		}
		else {
			document.execCommand('selectAll', false, null);
			document.getSelection().getRangeAt(0).collapse(false);
		}
	}

	function setClipboardGecko (text) {
		const textarea = document.body.appendChild(document[CRE]('textarea'));
		try {
			Object.assign(textarea.style, {
				position: 'fixed',
				width: '300px',
				height: '300px',
				left: '-400px',
				top: '0px'
			});
			textarea.value = text;
			textarea.focus();
			textarea.select();
			document.execCommand('copy');
		}
		finally {
			textarea.parentNode.removeChild(textarea);
		}
	}

	init();
	return {
		get enabled () {return enabled},
		set enabled (v) {enabled = !!enabled},
		dispatch: dispatch
	};
}

function createFavicon () {
	const FAVICON_ID = 'dyn-favicon';
	let isLoading = false;

	function createLinkNode () {
		let link = document.head.appendChild(document[CRE]('link'));
		link.setAttribute('rel', 'icon');
		link.setAttribute('id', FAVICON_ID);
		link.setAttribute('type', 'image/png');
		return link;
	}

	function overwriteFavicon (image, favicon) {
		image = $(image);
		if (!image) return;
		if (image.naturalWidth == 0 || image.naturalHeight == 0) return;

		favicon = $(favicon);
		if (!favicon) return;

		const w = 16;
		const h = 16;
		const factor = 3;
		let canvas = document[CRE]('canvas');
		canvas.width = w * factor;
		canvas.height = h * factor;
		let c = canvas.getContext('2d');
		c.fillStyle = '#000000';
		c.fillRect(0, 0, canvas.width, canvas.height);
		let clipSize = Math.min(image.width, image.height);
		c.drawImage(image,
			image.width / 2 - clipSize / 2,
			image.height / 2 - clipSize / 2,
			clipSize, clipSize, 0, 0, canvas.width, canvas.height);

		let ps = c.getImageData(0, 0, w * factor, h * factor);
		let pd;
		if (window[USW] && window[USW].ImageData) {
			pd = new window[USW].ImageData(w, h);
		}
		else if (c.createImageData) {
			pd = c.createImageData(w, h);
		}
		else if (window.ImageData) {
			pd = new window.ImageData(w, h);
		}

		if (pd) {
			let factorPower = Math.pow(factor, 2);
			for (let i = 0; i < h; i++) {
				for (let j = 0; j < w; j++) {
					let avg = [0, 0, 0, 0];

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

		c = null;
		canvas = null;
	}

	function update () {
		if (isLoading) return;

		let link = $(FAVICON_ID);
		if (link) return;

		switch (pageModes[0].mode) {
		case 'summary':
		case 'catalog':
			isLoading = true;
			resources.get(
				`/images/board/${siteInfo.server}-${siteInfo.board}.png`,
				{responseType:'dataURL'}
			).then(data => {
				if (data) {
					createLinkNode().href = data.replace(
						/^data:[^,]+/, 'data:image/png;base64');
				}
				isLoading = false;
			});
			break;

		case 'reply':
			let thumb = $qs('article:nth-of-type(1) img');
			if (!thumb) break;

			let re = /^[^:]+:\/\/([^\/]+)/.exec(thumb.src);
			if (!re) break;

			// thumbnail exists in the same domain as the document?
			if (re[1] == window.location.host) {
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
				getImageFrom(restoreDistributedImageURL(thumb.src)).then(img => {
					if (img) {
						overwriteFavicon(img, createLinkNode());
					}
					isLoading = false;
				});
			}
			break;
		}
	}

	function init () {
	}

	init();
	return {
		update: update
	};
}

function createHistoryStateWrapper (popstateHandler) {
	window.addEventListener('popstate', popstateHandler, false);
	return {
		pushState: function (url) {
			window.history.pushState(null, '', url);
			popstateHandler();
		},
		updateHash: function (hash) {
			if (hash != '') {
				hash = '#' + hash.replace(/^#/, '');
			}
			let url = `${location.protocol}//${location.host}${location.pathname}${hash}${location.search}`;
			window.history.replaceState(null, '', url);
		}
	};
}

function createTransport () {
	/*
	 * - postBase (post, delete, moderate)
	 * - reloadBase (reload)
	 * - reloadCatalogBase (reload)
	 */
	const transports = {};
	const lastUsedTime = {};

	function createXMLHttpRequest () {
		try {
			// Firefox's WebExtensions is still incomplete
			return XPCNativeWrapper(new window.wrappedJSObject.XMLHttpRequest);
		}
		catch (ex) {
			return new window.XMLHttpRequest;
		}
	}

	function create (tag) {
		let result = createXMLHttpRequest();

		if (tag) {
			transports[tag] = result;
		}

		return result;
	}

	function release (tag) {
		if (tag in transports) {
			delete transports[tag];
			lastUsedTime[tag] = Date.now();
		}
	}

	function abort (tag) {
		if (tag in transports) {
			try {
				transports[tag].abort();
			}
			catch (e) {
			}

			release(tag);
		}
	}

	function isRapidAccess (tag) {
		let result = false;

		if (tag in lastUsedTime
		&& Date.now() - lastUsedTime[tag] <= NETWORK_ACCESS_MIN_INTERVAL) {
			setBottomStatus('ちょっと待ってね。');
			result = true;
		}

		return result;
	}

	function isRunning (tag) {
		if (tag) {
			return !!transports[tag];
		}
		else {
			return Object.keys(transports).length > 0;
		}
	}

	function getTransport (tag) {
		if (tag in transports) {
			return transports[tag];
		}

		return undefined;
	}

	return {
		create: create,
		release: release,
		abort: abort,
		isRapidAccess: isRapidAccess,
		isRunning: isRunning,
		get: getTransport
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
				catch (e) {
				}
			});
		}, frequencyMsecs);
	}

	function addEventListener (listener) {
		let index = listeners.indexOf(listener);
		if (index < 0) {
			listeners.push(listener);
		}
	}

	function removeEventListener (listener) {
		let index = listeners.indexOf(listener);
		if (index >= 0) {
			listener.splice(index, 1);
		}
	}

	window.addEventListener('scroll', handleScroll);

	return {
		addEventListener: addEventListener,
		removeEventListener: removeEventListener,
		get lastScrollTop () {return lastScrollTop}
	};
}

function createAutoTracker () {
	const TIMER1_FREQ_MIN = Math.max(1000 * 5, NETWORK_ACCESS_MIN_INTERVAL);
	const TIMER1_FREQ_MAX = 1000 * 60 * 5;
	const TIMER2_FREQ = 1000 * 3;
	const DEFAULT_MEDIAN = 15 * 1000;

	let timer1;
	let timer2;
	let baseTime;
	let waitSeconds;
	let lastMedian;
	let lastReferencedReplyNumber;

	function getTimeSpanText (span) {
		const text = [];
		if (span >= 3600) {
			text.push(`${Math.floor(span / 3600)}時間`);
			span %= 3600;
		}
		if (span >= 60) {
			text.push(`${Math.floor(span / 60)}分`);
			span %= 60;
		}
		text.push(`${span}秒`);

		return text.join('');
	}

	function updateNormalLink () {
		$qsa('a[href="#track"]').forEach(node => {
			$t(node, '自動追尾');
		});
		$qsa('.track-indicator').forEach(node => {
			node.style.transitionDuration = '.25s';
			node.style.width = '0px';
		});
	}

	function updateTrackingLink (restSeconds, ratio) {
		const text = getTimeSpanText(restSeconds);
		$qsa('a[href="#track"]').forEach(node => {
			$t(node, `自動追尾中`);
		});
		$qsa('.track-indicator').forEach(node => {
			node.style.transitionDuration = ratio == 1 ? '.25s' : `${TIMER2_FREQ / 1000}s`;
			node.style.width = `${$('reload-anchor').offsetWidth * ratio}px`;
			node.title = `あと ${text} で更新します`;
		});
	}

	function startTimer2 (rest) {
		baseTime = Date.now();
		waitSeconds = rest;
		updateTrackingLink(rest, 1);
		if (!timer2) {
			timer2 = setInterval(function intervalIndicator () {
				const elapsedSeconds = (Date.now() - baseTime) / 1000;
				const restSeconds = Math.floor(waitSeconds - elapsedSeconds);
				if (restSeconds >= 0) {
					updateTrackingLink(restSeconds, restSeconds / waitSeconds);
				}
				else {
					stopTimer2();
				}
			}, TIMER2_FREQ);
		}
	}

	function stopTimer2 () {
		if (timer2) {
			clearInterval(timer2);
			timer2 = undefined;
		}
		updateNormalLink();
	}

	function computeTrackFrequency () {
		const logs = [];
		const outputLog = false;
		let median;
		let referencedReplyNumber;

		const postTimes = Array
		.from($qsa(`.replies .reply-wrap:nth-last-child(-n+${storage.config.autotrack_sampling_replies.value + 1})`))
		.map(node => {
			referencedReplyNumber = $qs('[data-number]', node).dataset.number - 0;
			return new Date($qs('.postdate', node).dataset.value - 0);
		});

		const intervals = [];
		for (let i = 0; i < postTimes.length - 1; i++) {
			intervals.push(postTimes[i + 1].getTime() - postTimes[i].getTime());
		}

		if (intervals.length == 0) {
			median = DEFAULT_MEDIAN;
			logs.push(`frequency median set to default ${median}.`);
		}
		else if (referencedReplyNumber == lastReferencedReplyNumber) {
			median = lastMedian * 2;
			logs.push(`number of replies has not changed. use the previous value: ${median}`);
		}
		else {
			intervals.sort((a, b) => a - b);
			const medianIndex = Math.floor(intervals.length / 2);
			median = (intervals.length % 2) ?
				intervals[medianIndex] :
				(intervals[medianIndex - 1] + intervals[medianIndex]) / 2;
			
			logs.push(
				`  postTimes: ${postTimes.map(a => a.getTime()).join(', ')}`,
				`  intervals: ${intervals.map(a => `${getTimeSpanText(a / 1000)}`).join(', ')}`,
				`medianIndex: ${medianIndex}`,
				`     median: ${median} - ${getTimeSpanText(median / 1000)}`,
				` multiplier: ${storage.config.autotrack_expect_replies.value}`,
				`   sampling: ${storage.config.autotrack_sampling_replies.value}`
			);
		}

		let result = median * storage.config.autotrack_expect_replies.value;
		result = Math.min(result, TIMER1_FREQ_MAX);
		result = Math.max(result, TIMER1_FREQ_MIN);
		lastMedian = median;
		lastReferencedReplyNumber = referencedReplyNumber;
		startTimer2(Math.floor(result / 1000));

		logs.push(
			`result: ${result} - ${getTimeSpanText(result / 1000)}`,
			`result for display: ${Math.floor(result / 1000)}`
		);
		outputLog && console.log(logs.join('\n'));

		return result;
	}

	function start () {
		if (timer1) return;

		timer1 = setTimeout(function autoTrackHandler () {
			stopTimer2();

			if (pageModes[0].mode == 'reply') {
				commands.reload().then(() => {
					if (/^[23]..$/.test(reloadStatus.lastStatus)) {
						timer1 = setTimeout(
							autoTrackHandler,
							computeTrackFrequency());
					}
					else {
						timer1 = undefined;
						console.log(`autoTracker: timer cleared. reason: unusual http status (${reloadStatus.lastStatus})`);
					}
				});
			}
			else if (pageModes.length >= 2 && pageModes[1].mode == 'reply') {
				timer1 = setTimeout(
					autoTrackHandler,
					computeTrackFrequency());
			}
			else {
				timer1 = undefined;
				console.log(`autoTracker: timer cleared. reason: not a reply mode (${pageModes[0].mode})`);
			}
		}, computeTrackFrequency());
	}

	function stop () {
		if (!timer1) return;

		clearTimeout(timer1);
		timer1 = undefined;
		stopTimer2();
	}

	function afterPost () {
		if (!timer1) return;
		stop();
		start();
	}

	return {
		start: start,
		stop: stop,
		afterPost: afterPost,
		get running () {return !!timer1}
	};
}

/*
 * <<<1 page set-up functions
 */

function setupParallax (selector) {
	var marginTop = undefined;

	function init () {
		var node = $qs(selector);
		if (!node) return;
		marginTop = node.getBoundingClientRect().top;
		scrollManager.addEventListener(handleScroll);
		handleScroll();
		setTimeout(function () {
			$qsa('iframe[data-src]').forEach(iframe => {
				iframe.src = iframe.getAttribute('data-src');
				iframe.removeAttribute('data-src');
			});
		}, 1000 * 1);
	}

	function handleScroll () {
		var node = $qs(selector);
		if (!node) return;

		var rect = node.getBoundingClientRect();
		if (rect.height > viewportRect.height) {
			var stickyRange = rect.height - viewportRect.height + marginTop + 16;
			var scrollRange = document.documentElement.scrollHeight - viewportRect.height;
			var scrollTop = docScrollTop();
			var value = marginTop - Math.floor(scrollTop / scrollRange * stickyRange);
			node.style.top = value + 'px';
		}
		else {
			node.style.top = '';
		}
	}

	init();
}

function setupVideoViewer () {
	var timer;

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
		$qsa('.inline-video').forEach(node => {
			const rect = node.getBoundingClientRect();
			if (rect.bottom + st < vt
			||  rect.top + st > vb) {
				// invisible
				if (node.childNodes.length) {
					setBottomStatus(`解放: ${node.parentNode.getElementsByTagName('a')[0].href}`);
					empty(node);
				}
			}
			else {
				// visible
				const markup = node.getAttribute('data-markup');
				if (markup && node.childNodes.length == 0) {
					setBottomStatus(`読み込み中: ${node.parentNode.getElementsByTagName('a')[0].href}`);
					node[IAHTML]('beforeend', markup);
				}
			}
		});
	}

	init();
}

function setupMouseHoverEvent (element, nodeName, hoverCallback, leaveCallback) {
	let lastHoverElement = null;

	function findTarget (e) {
		while (e) {
			if (e.nodeName.toLowerCase() == nodeName) return e;
			e = e.parentNode;
		}
		return null;
	}

	function mover (e) {
		let fromElement = findTarget(e.relatedTarget);
		let toElement = findTarget(e.target);
		let needInvokeHoverEvent = false;
		let needInvokeLeaveEvent = false;

		if (fromElement != toElement) {
			// causes leave event?
			if (fromElement) {
				if (lastHoverElement != null) {
					needInvokeLeaveEvent = true;
				}
			}

			// causes hover event?
			if (toElement) {
				if (lastHoverElement != toElement) {
					needInvokeHoverEvent = true;
				}
			}

			// causes leave event?
			else {
				if (lastHoverElement != null) {
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
		let toElement = findTarget(e.relatedTarget);
		if (!toElement && lastHoverElement) {
			leaveCallback({target: lastHoverElement});
			lastHoverElement = null;
		}
	};

	element = $(element);
	if (!element) return;
	nodeName = nodeName.toLowerCase();
	hoverCallback && element.addEventListener(MOVER_EVENT_NAME, mover);
	leaveCallback && element.addEventListener(MOUT_EVENT_NAME, mout);
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
				console.error(`${APP_NAME}: exception in resize handler: ${ex.stack}`);
			}
		}, frequencyMsecs, e);
	}

	window.addEventListener('resize', handleResize);
	window.addEventListener('load', handleResize);
	handler.call(window);
}

function setupPostFormItemEvent (items) {
	const timers = {};

	function updateInfoCore (result, item) {
		const el = $(item.id);
		if (!el) return result;

		const span = $('comment-info-details').appendChild(document[CRE]('span'));
		const lines = getContentsFromEditable(el).replace(/[\r\n\s]+$/, '').split(/\r?\n/);
		const bytes = lines.join('\r\n').replace(/[^\u0001-\u007f\uff61-\uff9f]/g, '__').length;
		const linesOvered = item.lines ? lines.length > item.lines : false;
		const bytesOvered = item.bytes ? bytes > item.bytes : false;

		if (linesOvered || bytesOvered) {
			span.classList.add('warn');
			result = true;
		}

		$t(span, [
			item.head  ? `${item.head}:` : '',
			item.lines ? `${lines.length}/${item.lines}行` : '',
			item.lines ? ' (' : '',
			item.bytes ? `${bytes}/${item.bytes}` : '',
			item.lines ? ')' : ''
		].join(''));

		return result;
	}

	function adjustTextAreaHeight (e) {
		let com = e.target;
		if (com.innerHTML != '' && /^\n*$/.test(com.innerText)) {
			empty(com);
		}

		$('com2').value = getContentsFromEditable(com);

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
		timers[tag] = setTimeout(e => {
			delete timers[tag];
			fn(e);
		}, 50, e);
	}

	function isFileElementReady () {
		const upfile = $('upfile');
		if (!upfile) return false;
		if (upfile.disabled) return false;
		if (upfile.getAttribute('data-origin') == 'js') return false;
		if (upfile.getAttribute('data-pasting')) return false;
		return true;
	}

	function isTegakiElementReady () {
		const baseform = document.getElementsByName('baseform')[0];
		if (!baseform) return false;
		return true;
	}

	function findAcceptableFile (files) {
		const availableTypes = [
			'image/jpg', 'image/jpeg',
			'image/png',
			'image/gif',
			'image/webp',
			'video/webm',
			'video/mp4'
		];
		return Array.prototype.reduce.call(files, (file, f) => {
			if (file) return file;
			if (availableTypes.indexOf(f.type) >= 0) return f;
			return null;
		}, null);
	}

	function dumpElement (head, elm, ...rest) {
		let logs = [];
		for (; elm; elm = elm.parentNode) {
			switch (elm.nodeType) {
			case 1: // ELEMENT_NODE
				{
					let result = elm.tagName;
					if (elm.id != '') {
						result += `#${elm.id}`;
					}
					if (elm.className != '') {
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
		console.log(`${head}: ${logs.join(' → ')}: ${rest.join(' ')}`);
	}

	function pasteText (e, text) {
		document.execCommand('insertText', false, text);
	}

	async function encodeJpeg (canvas, maxSize) {
		let result;
		let quality = 10;
		for (let quality = 9; quality > 0; quality--) {
			result = await getBlobFrom(canvas, 'image/jpeg', quality / 10);
			if (result.size <= maxSize) {
				break;
			}
		}
		if (result) {
			overrideUpfile.data = result;
		}
		else {
			const message = 'JPEG エンコードしてもファイルが大きすぎます';
			setBottomStatus(message);
			throw new Error(message);
		}
	}

	function pasteFile (e, file) {
		overrideUpfile = undefined;
		if (!file) return;

		const canUpload = isFileElementReady();
		const canTegaki = isTegakiElementReady();
		if (!canUpload && !canTegaki) return;

		const upfile = $('upfile');
		let resetItems = ['textonly'];
		let p;

		switch (e.type) {
		case 'paste':
			upfile.setAttribute('data-pasting', '1');
			setBottomStatus('画像を貼り付けています...', true);
			break;

		default: // change, drop, ...
			setBottomStatus('サムネイルを生成しています...', true);
			break;
		}

		/*
		 * IMPORTANT: WHICH ELEMENTS SHOULD BE RESET?
		 *
		 * from change event, and...
		 *   pseudo reply image: upfile, (overrideUpfile)
		 *      too large image: upfile, baseform
		 *               others: baseform, (overrideUpfile)
		 *
		 * from drop event, and...
		 *   pseudo reply image: upfile, (overrideUpfile)
		 *      too large image: upfile, baseform
		 *               others: upfile, baseform
		 *
		 * from paste event, and...
		 *   pseudo reply image: upfile, (overrideUpfile)
		 *      too large image: upfile, baseform
		 *               others: upfile, baseform
		 */

		// pseudo reply image
		if (!canUpload && canTegaki) {
			// only image can post as reply
			if (!file.type.startsWith('image/')) {
				setBottomStatus('画像以外のファイルは添付できません');
				return;
			}

			p = getImageFrom(file).then(img => {
				if (!img) return;

				let canvas = $qs('#draw-wrap .draw-canvas');
				let size = getThumbnailSize(
					img.naturalWidth, img.naturalHeight,
					storage.config.tegaki_max_width.value,
					storage.config.tegaki_max_height.value);
				canvas.width = size.width;
				canvas.height = size.height;

				let c = canvas.getContext('2d');
				//c.fillStyle = '#000000';
				//c.fillRect(0, 0, canvas.width, canvas.height);
				c.clearRect(0, 0, canvas.width, canvas.height);
				c.drawImage(
					img,
					0, 0, img.naturalWidth, img.naturalHeight,
					0, 0, canvas.width, canvas.height);

				let baseform = document.getElementsByName('baseform')[0];
				baseform.value = canvas.toDataURL().replace(/^[^,]+,/, '');
				$('draw-wrap').setAttribute('data-persists', 'canvas-initialized');

				resetItems.push('upfile');
				overrideUpfile = undefined;

				return setPostThumbnail(canvas, '疑似画像レス');
			});
		}

		// too large file size: re-encode to jpeg
		else if (siteInfo.maxAttachSize && file.size > siteInfo.maxAttachSize) {
			// we can not handle videos that are to large
			if (!file.type.startsWith('image/')) {
				setBottomStatus('ファイルが大きすぎます');
				return;
			}

			p = getImageFrom(file).then(img => {
				if (!img) return;

				let canvas = document[CRE]('canvas');
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;

				let c = canvas.getContext('2d');
				c.fillStyle = '#000000';
				c.fillRect(0, 0, canvas.width, canvas.height);
				c.drawImage(img, 0, 0);

				resetItems.push('upfile', 'baseform');

				return Promise.all([
					setPostThumbnail(canvas, '再エンコードJPEG'),
					encodeJpeg(canvas, siteInfo.maxAttachSize)
				]);
			});
		}

		// normal upload
		else {
			p = setPostThumbnail(file);
			if (e.type == 'change') {
				resetItems.push('baseform');
				overrideUpfile = undefined;
			}
			else {
				resetItems.push('upfile', 'baseform');
			}
		}

		overrideUpfile = {
			name: file.name,
			data: file
		};

		p = p.finally(() => {
			setBottomStatus();
			resetForm.apply(null, resetItems);
			upfile.removeAttribute('data-pasting');
			p = null;
		});
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
				commands.activatePostForm();
			}
			$('postform-drop-indicator').classList.remove('hide');
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
			return pasteFile(e, data);
		}
		else if ((data = dataTransfer.getData('text/plain')) != '') {
			e.preventDefault();
			return pasteText(e, data);
		}
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
		let el = $(item.id);
		if (!el) return;

		if (el.nodeName == 'TEXTAREA' || el.contentEditable == 'true') {
			el.addEventListener('input', registerTextAreaHeightAdjuster);
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

	(com => {
		if (!com) return;
		updateInfo();
	})($('com'));

	(upfile => {
		if (!upfile) return;
		upfile.addEventListener('change', e => {
			pasteFile(e, e.target.files[0]);
		});
	})($('upfile'));
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
		catch (ex) {
			;
		}
	}

	function handler (e) {
		if (transport.isRunning()) {
			preventDefault(e);
			return;
		}

		if (e.target.classList.contains('dialog-content-wrap')) {
			preventDefault(e);
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

		if (wheelDelta == 0) {
			wheelDelta = threshold;
		}

		if (now - lastWheeled >= 500) {
			lastWheeled = now;
			accum = 0;
			setWheelStatus();
		}

		accum += Math.abs(wheelDelta);

		if (accum < threshold) {
			setWheelStatus(`リロードぢから：${Math.min(Math.floor(accum / threshold * 100), 99)}%`);
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

	document.addEventListener(`${APP_NAME}.wheelStatus`, function (e) {
		if ($qs('#dialog-wrap:not(.hide)')) return;

		const ws = $('wheel-status');
		if (!ws) return;

		const s = e.detail.message;
		if (!s || s == '') {
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
	}, false);

	document.addEventListener(`${APP_NAME}.bottomStatus`, function (e) {
		if ($qs('#dialog-wrap:not(.hide)')) return;

		const nav = $('nav-normal');
		const ns = $('nav-status');
		if (!nav || !ns) return;

		let s = e.detail.message || '';
		let persistent = !!e.detail.persistent;
		let interval = navHideIntervalMsecs;

		if (navStatusHideTimer) {
			clearTimeout(navStatusHideTimer);
			navStatusHideTimer = null;
		}

		if (s == '') {
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
	}, false);
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
				if (element.nodeName == 'A') break;
				element = element.parentNode;
			}

			if (element == target) {
				let panelRect = $('panel-aside-wrap').getBoundingClientRect();
				let targetRect = target.getBoundingClientRect();
				let originNumber = target.getAttribute('data-number');
				let originElement = getWrapElement($qs(`#_${originNumber}, [data-number="${originNumber}"]`));
				let popup = quotePopup.createPopup({element: originElement}, 'quote-popup-pool2');
				popup.style.left = (panelRect.left - 8 - popup.offsetWidth) + 'px';
				popup.style.top = Math.min(targetRect.top, viewportRect.height - popup.offsetHeight - 8) + 'px';
				popup.id = 'search-popup';
			}
		}, QUOTE_POPUP_DELAY_MSEC, e.target);
	}

	function leave (e) {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		let popup = $('search-popup');
		if (popup) {
			popup.parentNode.removeChild(popup);
		}
	}

	if (siteInfo.resno) {
		setupMouseHoverEvent('search-result', 'a', hover, leave);
		setupMouseHoverEvent('panel-content-mark', 'a', hover, leave);
	}
}

/*
 * <<<1 lightbox functions
 */

function lightbox (anchor) {
	const RUNNING_EXCLUSION_KEY = 'data-lightbox-status';
	const MARGIN = 32;
	const CLICK_THRESHOLD_DISTANCE = 4;
	const CLICK_THRESHOLD_TIME = 500;
	const WHEEL_SCROLL_UNIT_FACTOR = 0.33;
	const DIMMER_TRANSITION_DURATION_MSECS = 400;
	const IMAGE_TRANSITION_DURATION_MSECS = 300;

	let lightboxWrap;
	let dimmer;
	let imageWrap;
	let loaderWrap;
	let receiver;
	let image;
	let zoomMode;
	let rotation;
	let isInTransition;
	let dragState = {
		x: 0,
		y: 0,
		region: -2,
		imageRect: null
	};

	/*
	 * private functions
	 */

	function isScrollableHorizontally () {
		return image && imageWrap.offsetWidth > viewportRect.width;
	}

	function isScrollableVertically () {
		return image && imageWrap.offsetHeight > viewportRect.height;
	}

	function isScrollable () {
		return isScrollableHorizontally() || isScrollableVertically();
	}

	function isRotated () {
		return rotation == 'left' || rotation == 'right';
	}

	function appendPxSuffix (obj, suffix) {
		let result = {};
		suffix || (suffix = 'px');
		for (let i in obj) {
			if (typeof obj[i] == 'number') {
				result[i] = obj[i] + 'px';
			}
		}
		return result;
	}

	function getRegionId (e) {
		const imageRect = dragState.imageRect;
		const imageWrapRect = image.getBoundingClientRect();

		let result;

		if (imageRect
		&&  e.clientX >= imageRect.left && e.clientX < imageRect.right
		&&  e.clientY >= imageRect.top  && e.clientY < imageRect.bottom) {
			result = 0;
		}
		/*else if (e.clientX >= imageWrapRect.left && e.clientX < imageWrapRect.right
		     &&  e.clientY >= imageWrapRect.top  && e.clientY < imageWrapRect.bottom) {
			result = -1;
		}*/
		else {
			result = -1;
		}
		return result;
	}

	function getDistance (e) {
		return Math.sqrt(
			Math.pow(dragState.x - e.clientX, 2) +
			Math.pow(dragState.y - e.clientY, 2));
	}

	function getImageRect () {
		let vleft, vtop, vwidth, vheight;
		let width = 0, height = 0;
		let zm = zoomMode;

		if (arguments.length >= 1 && typeof arguments[0] == 'object') {
			vleft = arguments[0].left;
			vtop = arguments[0].top;
			vwidth = arguments[0].width;
			vheight = arguments[0].height;
			zm = 'whole';
		}
		else {
			vleft = MARGIN;
			vtop = MARGIN;
			vwidth = viewportRect.width - MARGIN * 2;
			vheight = viewportRect.height - MARGIN * 2;
		}

		const nwidth = isRotated() ? image.naturalHeight : image.naturalWidth;
		const nheight = isRotated() ? image.naturalWidth : image.naturalHeight;

		switch (zm) {
		case 'whole':
			if (nwidth <= vwidth && nheight <= vheight) {
				width = nwidth;
				height = nheight;
			}
			else {
				// portrait image
				if (nwidth < nheight) {
					let ratio = nwidth / nheight;
					width = Math.floor(vheight * ratio);
					height = vheight;
					if (width > vwidth) {
						ratio = nheight / nwidth;
						width = vwidth;
						height = Math.floor(vwidth * ratio);
					}
				}
				// landscape image
				else {
					let ratio = nheight / nwidth;
					width = vwidth;
					height = Math.floor(vwidth * ratio);
					if (height > vheight) {
						ratio = nwidth / nheight;
						width = Math.floor(vheight * ratio);
						height = vheight;
					}
				}
			}
			break;

		case 'actual-size':
			width = nwidth;
			height = nheight;
			break;

		case 'fit-to-width':
			width = vwidth;
			height = Math.floor(width * (nheight / nwidth));
			break;

		case 'fit-to-height':
			height = vheight;
			width = Math.floor(height * (nwidth / nheight));
			break;
		}

		const result = {
			left: vleft + vwidth / 2 - width / 2,
			top: vtop + vheight / 2 - height / 2,
			width: width,
			height: height
		};
		return result;
	}

	function applyGeometory (rect) {
		let result;
		let updated = false;

		// positioning
		const currentRect = imageWrap.getBoundingClientRect();
		if (rect.left != currentRect.left
		||  rect.top != currentRect.top
		||  rect.width != currentRect.width
		||  rect.height != currentRect.height) {
			// styling image wrapper
			Object.assign(imageWrap.style, appendPxSuffix(rect));

			// styling image itself
			if (isRotated()) {
				image.style.width = rect.height + 'px';
				image.style.height = rect.width + 'px';
			}
			else {
				image.style.width = rect.width + 'px';
				image.style.height = rect.height + 'px';
			}
			updated = true;
		}

		// rotation
		const degrees = {
			'normal': 0,
			'left': -90,
			'right': 90,
			'180': 180
		};
		const currentTransform = /rotate\(([-0-9]+)deg\)/.exec(image.style.transform) || ['', 0];
		const currentDegree = parseInt(currentTransform[1], 10);
		let newDegree = degrees[rotation];
		if (newDegree == 180) {
			newDegree *= currentDegree >= 0 ? 1 : -1;
		}
		if (newDegree != currentDegree) {
			image.style.transform = `rotate(${newDegree}deg)`;
			updated = true;
		}

		//
		if (updated) {
			image.style.opacity = 1.0;
			result = transitionendp(image, IMAGE_TRANSITION_DURATION_MSECS);
		}
		else {
			result = Promise.resolve(true);
		}

		isInTransition = true;
		return result.then(() => {
			// show info panel
			$qs('.info', lightboxWrap).style.top = '0';

			// update mode links
			updateModeLinks();

			// update geometory info
			updateGeometoryInfo();

			isInTransition = false;
		});
	}

	function setZoomMode (zm, opts) {
		opts || (opts = {});
		if (!image) return;
		if (zm != 'whole'
		&& zm != 'actual-size'
		&& zm != 'fit-to-width'
		&& zm != 'fit-to-height') return;

		zoomMode = zm;
		storage.runtime.lightbox.zoomMode = zm;
		storage.saveRuntime();

		let rect;
		if (zoomMode == 'actual-size'
		&& opts.event && getRegionId(opts.event) == 0
		&& (image.naturalWidth > viewportRect.width - MARGIN * 2 || image.naturalHeight > viewportRect.height - MARGIN * 2)) {
			const ratio = image.offsetWidth / image.naturalWidth;
			const imageRect = image.getBoundingClientRect();
			const offsetX = (opts.event.clientX - imageRect.left) / ratio;
			const offsetY = (opts.event.clientY - imageRect.top) / ratio;

			rect = getImageRect();
			if (image.naturalWidth > viewportRect.width - MARGIN * 2) {
				rect.left = opts.event.clientX - offsetX;
			}
			if (image.naturalHeight > viewportRect.height - MARGIN * 2) {
				rect.top = opts.event.clientY - offsetY;
			}
		}

		if (!rect) {
			rect = getImageRect();
		}

		applyGeometory(rect);
	}

	function updateModeLinks () {
		$qsa('#lightbox-zoom-modes a').forEach(node => {
			if (node.getAttribute('href') == '#lightbox-' + zoomMode) {
				node.classList.add('selected');
			}
			else {
				node.classList.remove('selected');
			}
		});

		$qsa('#lightbox-rotate-modes a').forEach(node => {
			if (node.getAttribute('href') == '#lightbox-' + rotation) {
				node.classList.add('selected');
			}
			else {
				node.classList.remove('selected');
			}
		});
	}

	function updateGeometoryInfo () {
		if (!image) return;
		if (!image.naturalWidth || !image.naturalHeight) return;

		const size = `${image.naturalWidth}x${image.naturalHeight}`;
		const zoomRatio = `   ${(image.offsetWidth / image.naturalWidth * 100).toFixed(2)}%`.substr(-7); // max: '100.00%'.length == 7

		$t('lightbox-ratio', `${size}, ${zoomRatio}`);
	}

	/*
	 * event handlers
	 */

	function handlePointerDown (e) {
		if (isInTransition) return;
		if (e.target != receiver) return;

		receiver.setPointerCapture(e.pointerId);

		e.preventDefault();

		if (e.target != e.currentTarget || e.buttons != 1) {
			dragState.region = -9;
			return;
		}

		dragState.time = Date.now();
		dragState.x = e.clientX;
		dragState.y = e.clientY;

		if (image) {
			dragState.imageRect = image.getBoundingClientRect();
			dragState.region = getRegionId(e);

			if (imageWrap.classList.contains('dragging')) {
				dragState.x = dragState.y = -1;
				dragState.region = -2;
			}
			else {
				receiver.addEventListener('pointermove', handlePointerMove);
				imageWrap.classList.add('dragging');
			}
		}
		else {
			dragState.imageRect = null;
			dragState.region = -2;
		}
	}

	function handlePointerMove (e) {
		if (isInTransition) return;
		if (dragState.region != 0) return;

		let left, top;
		switch (zoomMode) {
		case 'actual-size':
			//if (isScrollableHorizontally()) {
				left = dragState.imageRect.left + (e.clientX - dragState.x);
			//}
			//if (isScrollableVertically()) {
				top = dragState.imageRect.top + (e.clientY - dragState.y);
			//}
			break;

		case 'fit-to-width':
			if (isScrollableVertically()) {
				top = dragState.imageRect.top + (e.clientY - dragState.y);
			}
			break;

		case 'fit-to-height':
			if (isScrollableHorizontally()) {
				left = dragState.imageRect.left + (e.clientX - dragState.x);
			}
			break;
		}

		if (left != undefined) {
			imageWrap.style.left = left + 'px';
		}

		if (top != undefined) {
			imageWrap.style.top = top + 'px';
		}
	}

	function handlePointerUp (e) {
		if (isInTransition) return;

		image && imageWrap.classList.remove('dragging');
		receiver.releasePointerCapture(e.pointerId);
		receiver.removeEventListener('pointermove', handlePointerMove);

		// clicked?
		if (Date.now() - dragState.time < CLICK_THRESHOLD_TIME
		&&  getDistance(e) < CLICK_THRESHOLD_DISTANCE) {
			switch (dragState.region) {
			case 0: // inside image
				setZoomMode(
					zoomMode == 'whole' ? 'actual-size' : 'whole',
					{event: e});
				break;
			default: // outside image
				leave();
				break;
			}
		}

		// dragged?
		else if (image) {
			const rect = imageWrap.getBoundingClientRect();
			let left = rect.left;
			let top = rect.top;

			if (isScrollableHorizontally()) {
				if (left > MARGIN) {
					left = MARGIN;
				}
				if (left < viewportRect.width - imageWrap.offsetWidth - MARGIN) {
					left = viewportRect.width - imageWrap.offsetWidth - MARGIN;
				}
			}
			else {
				left = viewportRect.width / 2 - imageWrap.offsetWidth / 2;
			}

			if (isScrollableVertically()) {
				if (top > MARGIN) {
					top = MARGIN;
				}
				if (top < viewportRect.height - imageWrap.offsetHeight - MARGIN) {
					top = viewportRect.height - imageWrap.offsetHeight - MARGIN;
				}
			}
			else {
				top = viewportRect.height / 2 - imageWrap.offsetHeight / 2;
			}

			if (left != rect.left || top != rect.top) {
				isInTransition = true;
				imageWrap.style.left = left + 'px';
				imageWrap.style.top = top + 'px';
				transitionendp(image, IMAGE_TRANSITION_DURATION_MSECS).then(() => {
					isInTransition = false;
				});
			}
		}
	}

	function handlePointerWheel (e) {
		if (isInTransition) return;

		e.preventDefault();
		e.stopPropagation();

		if (!image) return;

		let top;
		let imageRect = imageWrap.getBoundingClientRect();
		switch (zoomMode) {
		case 'actual-size':
		case 'fit-to-width':
			if (imageWrap.offsetHeight > viewportRect.height) {
				let sign;
				if (e.deltaY) {
					sign = e.deltaY > 0 ? -1 : 1;
				}
				else {
					sign = e.shiftKey ? 1 : -1;
				}
				top = imageRect.top +
					  Math.floor(viewportRect.height * WHEEL_SCROLL_UNIT_FACTOR) * sign;
			}
			break;
		}

		if (top != undefined) {
			if (top > MARGIN) {
				top = MARGIN;
			}
			if (top < viewportRect.height - imageWrap.offsetHeight - MARGIN) {
				top = viewportRect.height - imageWrap.offsetHeight - MARGIN;
			}
			isInTransition = true;
			imageWrap.style.top = top + 'px';
			transitionendp(image, IMAGE_TRANSITION_DURATION_MSECS).then(() => {
				isInTransition = false;
			});
		}
	}

	function handleZoomModeClick (e, t) {
		if (isInTransition) return;
		if (!image) return;
		setZoomMode(t.getAttribute('href').replace('#lightbox-', ''));
	}

	function handleRotateModeClick (e, t) {
		if (isInTransition) return;
		if (!image) return;
		rotation = t.getAttribute('href').replace('#lightbox-', '');
		setZoomMode('whole');
	}

	function handleZoomModeKey (e) {
		if (isInTransition) return;
		if (!image) return;
		setZoomMode({
			'O': 'whole',
			'A': 'actual-size',
			'W': 'fit-to-width',
			'H': 'fit-to-height'
		}[e.key]);
	}

	function handleRotateModeKey (e) {
		if (isInTransition) return;
		if (!image) return;
		rotation = {
			'n': 'normal',
			'l': 'left',
			'r': 'right',
			'v': '180'
		}[e.key];
		setZoomMode('whole');
	}

	function handleSearch (e) {
		if (isInTransition) return;
		if (!image) return;
		let lang = window.navigator.browserLanguage
			|| window.navigator.language
			|| window.navigator.userLanguage;
		let url = 'http://www.google.com/searchbyimage'
			+ `?sbisrc=${APP_NAME}`
			+ `&hl=${lang.toLowerCase()}`
			+ `&image_url=${encodeURIComponent(image.src)}`;
		sendToBackend('open', {
			url: url,
			selfUrl: window.location.href
		});
	}

	function handleStroke (e) {
		if (isInTransition) return;
		if (!image) return;
		let view = window[USW] || window;
		let ev = new WheelEvent('wheel', {
			bubbles: true, cancelable: true, view: view,
			detail: 0, screenX: 0, screenY: 0, clientX: 0, clientY: 0,
			ctrlKey: e.ctrl, altKey: false, shiftKey: e.shift, metaKey: false,
			button: 0, relatedTarget: null
		});
		receiver.dispatchEvent(ev);
	}

	/*
	 * entry functions
	 */

	function init () {
		if (document.body.getAttribute(RUNNING_EXCLUSION_KEY) != null) return;

		// block recursive execution
		document.body.setAttribute(RUNNING_EXCLUSION_KEY, 'loading');

		// initialize variables
		lightboxWrap = $('lightbox-wrap');
		dimmer = $qs('.dimmer', lightboxWrap);
		imageWrap = $qs('.image-wrap', lightboxWrap);
		loaderWrap = $qs('.loader-wrap', lightboxWrap);
		receiver = $qs('.receiver', lightboxWrap);
		rotation = 'normal';

		// initialize zoom mode
		zoomMode = storage.config.lightbox_zoom_mode.value;
		if (zoomMode == 'last') {
			zoomMode = storage.runtime.lightbox.zoomMode;
		}

		// info
		$t('lightbox-ratio', '読み込み中...');
		let link = $('lightbox-link');
		$t(link, anchor.href.match(/\/([^\/]+)$/)[1]);
		link.href = anchor.href;

		// start
		document.body.style.userSelect = 'none';
		lightboxWrap.classList.remove('hide');
		Promise.all([
			getImageFrom(anchor.href).then(loadedImage => {
				loaderWrap.classList.add('hide');
				image = loadedImage;
				if (image) {
					imageWrap.appendChild(image);

					let thumb = $qs('img', anchor);
					if (thumb) {
						let rect1 = thumb.getBoundingClientRect();
						let rect2 = getImageRect(rect1);
						let rect3 = appendPxSuffix(rect2);
						Object.assign(imageWrap.style, rect3);
						image.style.width = rect3.width;
						image.style.height = rect3.height;
					}
					else {
						let rect1 = anchor.getBoundingClientRect();
						let size = Math.max(rect1.width, rect1.height);
						let rect2 = getImageRect({
							left: rect1.left + rect1.width / 2 - size / 2,
							top: rect1.top + rect1.height / 2 - size / 2,
							width: size,
							height: size
						});
						let rect3 = appendPxSuffix(rect2);
						Object.assign(imageWrap.style, rect3);
						image.style.width = rect3.width;
						image.style.height = rect3.height;
					}

					imageWrap.classList.remove('hide');

					return delay(100).then(() => applyGeometory(getImageRect()));
				}
				else {
					loaderWrap.classList.remove('hide');
					$t($qs('p', loaderWrap), '読み込みに失敗しました。');
				}
			}),
			delay(0)
				.then(() => dimmer.classList.add('run'))
				.then(() => transitionendp(dimmer, DIMMER_TRANSITION_DURATION_MSECS))
				.then(() => {
					appStates.unshift('lightbox');

					receiver.addEventListener('pointerdown', handlePointerDown);
					receiver.addEventListener('pointermove', handlePointerMove);
					receiver.addEventListener('pointerup', handlePointerUp);
					receiver.addEventListener('wheel', handlePointerWheel);

					// debug handler
					if (false) {
						let handler = e => {
							e.preventDefault();
							handleZoomModeClick(e, e.target);
						};
						$qsa('#lightbox-zoom-modes a').forEach(node => {
							node.addEventListener('click', handler);
						});
					}
					if (false) {
						let handler = e => {
							e.preventDefault();
							handleRotateModeClick(e, e.target);
						};
						$qsa('#lightbox-rotate-modes a').forEach(node => {
							node.addEventListener('click', handler);
						});
					}

					clickDispatcher
						.add('#lightbox-whole', handleZoomModeClick)
						.add('#lightbox-actual-size', handleZoomModeClick)
						.add('#lightbox-fit-to-width', handleZoomModeClick)
						.add('#lightbox-fit-to-height', handleZoomModeClick)
						.add('#lightbox-normal', handleRotateModeClick)
						.add('#lightbox-left', handleRotateModeClick)
						.add('#lightbox-right', handleRotateModeClick)
						.add('#lightbox-180', handleRotateModeClick)
						.add('#lightbox-search', handleSearch)
						.add('#lightbox-close', leave);

					keyManager
						.addStroke('lightbox', ['O', 'A', 'W', 'H'], handleZoomModeKey)
						.addStroke('lightbox', ['n', 'l', 'r', 'v'], handleRotateModeKey)
						.addStroke('lightbox', '\u001b', leave)
						.addStroke('lightbox', 's', handleSearch)
						.addStroke('lightbox', [' ', '<S-space>'], handleStroke, true)
						.updateManifest();

					selectionMenu.enabled = false;

					document.body.setAttribute(RUNNING_EXCLUSION_KEY, 'running');
				}),
			delay(1000)
				.then(() => {
					if (!image && loaderWrap.classList.contains('hide')) {
						loaderWrap.classList.remove('hide');
						$t($qs('p', loaderWrap), '読み込み中...');
					}
				})
		]);
	}

	function leave () {
		$qs('.info', lightboxWrap).style.top = '';
		if (image) {
			image.style.opacity = '';
		}
		imageWrap.classList.add('hide');
		loaderWrap.classList.add('hide');
		empty(imageWrap);

		receiver.removeEventListener('pointerdown', handlePointerDown);
		receiver.removeEventListener('pointermove', handlePointerMove);
		receiver.removeEventListener('pointerup', handlePointerUp);
		receiver.removeEventListener('wheel', handlePointerWheel);

		clickDispatcher
			.remove('#lightbox-whole')
			.remove('#lightbox-actual-size')
			.remove('#lightbox-fit-to-width')
			.remove('#lightbox-fit-to-height')
			.remove('#lightbox-normal')
			.remove('#lightbox-left')
			.remove('#lightbox-right')
			.remove('#lightbox-180')
			.remove('#lightbox-search')
			.remove('#lightbox-close');

		keyManager
			.removeStroke('lightbox');

		delay(0)
			.then(() => dimmer.classList.remove('run'))
			.then(() => transitionendp(dimmer, DIMMER_TRANSITION_DURATION_MSECS))
			.then(() => {
				lightboxWrap.classList.add('hide');
				anchor = image = lightboxWrap =
				dimmer = imageWrap = receiver = null;

				selectionMenu.enabled = true;
				appStates.shift();
				keyManager.updateManifest();
				document.body.removeAttribute(RUNNING_EXCLUSION_KEY);
				document.body.style.userSelect = '';
			});
	}

	init();
}

/*
 * <<<1 modal dialog functions
 */

function modalDialog (opts) {
	var dialogWrap;
	var contentWrap;
	var content;
	var dimmer;
	var state = 'initializing';
	var isPending = false;
	var scrollTop = docScrollTop();

	function getRemoteController () {
		return {
			get content () {return content},
			get isPending () {return isPending},
			set isPending (v) {isPending = !!v},
			initTitle: initTitle,
			initButtons: initButtons,
			enableButtons: enableButtons,
			disableButtonsWithout: disableButtonsWithout,
			initFromXML: initFromXML,
			close: leave
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
		initTitle(opts.title);
		initButtons(opts.buttons);
		opts.oninit && opts.oninit(getRemoteController());
		startTransition();
	}

	function initTitle (opt) {
		var title = $qs('.dialog-content-title', dialogWrap);
		if (!title) return;
		title.textContent = opt != undefined ? opt : 'dialog';
	}

	function initButtons (opt) {
		var footer = $qs('.dialog-content-footer', dialogWrap);
		if (!footer) return;

		var buttons = [];

		while (footer.childNodes.length) {
			if (footer.firstChild.nodeName == 'A') {
				buttons.push(footer.firstChild);
				footer.firstChild.classList.remove('disabled');
			}
			footer.removeChild(footer.firstChild);
		}

		(opt || '').split(/\s*,\s*/).forEach(function (opt) {
			buttons.forEach(function (button, i) {
				if (!button) return;
				if (button.getAttribute('href') != `#${opt}-dialog`) return;
				button.classList.remove('hide');
				footer.appendChild(button);
				buttons[i] = null;
			});
		});

		buttons.forEach(function (button) {
			if (!button) return;
			button.classList.add('hide');
			footer.appendChild(button);
		});
	}

	function initFromXML (xml, xslName) {
		if (state != 'initializing') return;
		if (isPending) return;
		resources.get(
			`/xsl/${xslName}.xsl`,
			{expires:DEBUG_ALWAYS_LOAD_XSL ? 1 : 1000 * 60 * 60}
		).then(xsl => {
			var p = new window.XSLTProcessor;

			try {
				var f;

				try {
					if (IDEOGRAPH_CONVERSION_UI) {
						xsl = 新字体の漢字を舊字體に変換(xsl);
					}

					xsl = (new window.DOMParser()).parseFromString(xsl, "text/xml");
				}
				catch (e) {
					console.error(`${APP_NAME}: xsl parsing failed: ${e.stack}`);
					return;
				}

				try {
					p.importStylesheet(xsl);
				}
				catch (e) {
					console.error(`${APP_NAME}: importStylesheet failed: ${e.stack}`);
					return;
				}

				try {
					f = fixFragment(p.transformToFragment(xml, document));
				}
				catch (e) {
					console.error(`${APP_NAME}: transformToFragment failed: ${e.stack}`);
					return;
				}

				appendFragment(content, f);
			}
			finally {
				isPending = false;
				startTransition();
			}
		});
		isPending = true;
	}

	function startTransition () {
		if (isPending) return;
		if (state != 'initializing') return;

		clickDispatcher
			.add('#apply-dialog', handleApply)
			.add('#ok-dialog', handleOk)
			.add('#cancel-dialog', handleCancel);

		keyManager
			.addStroke('dialog', '\u001b', handleCancel)
			.addStroke('dialog', '\u000d', handleOk)
			.addStroke('dialog.edit', ['\u000d', '<S-enter>'], (e, t) => {
				if (t.nodeName != 'TEXTAREA'
				|| !t.classList.contains('config-item')) {
					return keyManager.PASS_THROUGH;
				}
			})
			.updateManifest();

		contentWrap.addEventListener('mousedown', handleMouseCancel, false);
		contentWrap.addEventListener(MMOVE_EVENT_NAME, handleMouseCancel, false);
		contentWrap.addEventListener('mouseup', handleMouseCancel, false);

		opts.onopen && opts.onopen(getRemoteController());
		state = 'running';

		setTimeout(function () {
			window.scrollTo(0, scrollTop);
			contentWrap.classList.add('run');
			dimmer.classList.add('run');
		}, 0);
	}

	function enableButtons () {
		$qsa('.dialog-content-footer a', dialogWrap).forEach(node => {
			node.classList.remove('disabled');
		});
	}

	function disableButtonsWithout (exceptId) {
		$qsa('.dialog-content-footer a', dialogWrap).forEach(node => {
			if (exceptId && node.href.indexOf(`#${exceptId}-dialog`) < 0) {
				node.classList.add('disabled');
			}
		});
	}

	function isDisabled (node) {
		let result = false;
		for (; node; node = node.parentNode) {
			if (node.nodeName == 'A') {
				break;
			}
		}
		if (node) {
			result = node.classList.contains('disabled');
		}
		return result;
	}

	function handleApply (e) {
		if (state != 'running') return;
		if (isDisabled(e.target)) return;
		disableButtonsWithout('apply');
		opts.onapply && opts.onapply(getRemoteController());
	}

	function handleOk (e) {
		if (state != 'running') return;
		if (isDisabled(e.target)) return;
		disableButtonsWithout('ok');

		let canLeave = true;
		if (opts.onok) {
			if (opts.onok(getRemoteController()) === false) {
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
		if (state != 'running') return;
		if (isDisabled(e.target)) return;
		disableButtonsWithout('cancel');

		let canLeave = true;
		if (opts.oncancel) {
			if (opts.oncancel(getRemoteController()) === false) {
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
		if (e.target == e.currentTarget) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	function leave () {
		if (state != 'running') return;
		if (isPending) return;

		clickDispatcher
			.remove('#apply-dialog')
			.remove('#ok-dialog')
			.remove('#cancel-dialog');

		keyManager.removeStroke('dialog');

		contentWrap.removeEventListener('mousedown', handleMouseCancel, false);
		contentWrap.removeEventListener(MMOVE_EVENT_NAME, handleMouseCancel, false);
		contentWrap.removeEventListener('mouseup', handleMouseCancel, false);

		transitionend(contentWrap, function () {
			opts.onclose && opts.onclose(content);
			dialogWrap.classList.add('hide');
			dialogWrap = contentWrap = content = dimmer = null;
			appStates.shift();
			keyManager.updateManifest();
		});

		setTimeout(function () {
			contentWrap.classList.remove('run');
			dimmer.classList.remove('run');
		}, 0);
	}

	opts || (opts = {});
	init();
}

/*
 * <<<1 misc functions
 */

function $ (id) {
	return typeof id == 'string' ? document.getElementById(id) : id;
}

function $t (node, content) {
	node = $(node);
	if (!node) return undefined;
	if (content != undefined) {
		if (node.nodeName == 'INPUT' || node.nodeName == 'TEXTAREA') {
			node.value = content;
		}
		else {
			node.textContent = content;
		}
	}
	return node.textContent;
}

function $qs (selector, node) {
	return ($(node) || document).querySelector(selector);
}

function $qsa (selector, node) {
	return ($(node) || document).querySelectorAll(selector);
}

function sendToBackend () { /*returns promise*/
	if (!backend) return;

	let args = Array.from(arguments);
	let data, callback;

	if (args.length > 1 && typeof args[args.length - 1] == 'function') {
		callback = args.pop();
	}
	if (args.length > 1) {
		data = args.pop();
	}
	else {
		data = {};
	}

	data.type = args[0];
	if (callback) {
		try {
			backend.postMessage(data, callback);
		}
		catch (err) {
			console.error(`${APP_NAME}: sendToBackend: ${err.stack}`);
			throw new Error(MESSAGE_BACKEND_CONNECTION_ERROR);
		}
	}
	else {
		return new Promise(resolve => {
			backend.postMessage(data, resolve);
		}).catch(err => {
			console.error(`${APP_NAME}: sendToBackend: ${err.stack}`);
			throw new Error(MESSAGE_BACKEND_CONNECTION_ERROR);
		});
	}
}

function getExtensionId () {
	// extension id can be retrieved by chrome.runtime.id in chrome,
	// but Firefox's WebExtensions distinguishes extension id from
	// runtime UUID.
	let url = chrome.extension.getURL('README.md');
	let re = /^[^:]+:\/\/([^\/]+)/.exec(url);
	return re[1];
}

function empty (node) {
	node = $(node);
	if (!node) return;
	var r = document.createRange();
	r.selectNodeContents(node);
	r.deleteContents();
}

function fixFragment (f, tagName) {
	var element = $qs(tagName || 'body', f);
	if (!element) return f;
	var r = document.createRange();
	r.selectNodeContents(element);
	return r.cloneContents();
}

function appendFragment (container, f) {
	container = $(container);
	if (!container) return;
	if (f) container.appendChild(f);
	$qsa('[data-doe]', container).forEach(node => {
		const doe = node.getAttribute('data-doe');
		node.removeAttribute('data-doe');
		node[IAHTML]('beforeend', doe);
	});
	return container;
}

function resolveRelativePath (url, baseUrl) {
	// full path
	if (/^(\w+:)?\/\//.test(url)) {
		return url;
	}

	// absolute path
	else if (/^\//.test(url)) {
		return `${window.location.protocol}//${window.location.host}${url}`;
	}

	// relative path
	if (baseUrl == undefined) {
		baseUrl = (document.getElementsByTagName('base')[0] || window.location).href;
	}
	baseUrl = baseUrl.replace(/\/[^\/]*$/, '/');
	return baseUrl + url;
}

function restoreDistributedImageURL (url) {
	// $1: scheme
	// $2: base host
	// $3: original server
	// $4: rest file name
	return url.replace(/^([^:]+:\/\/)[^.]+(\.2chan\.net(?::\d+)?)\/([^\/]+)\/([^\/]+\/(?:cat|thumb|src)\/.*)/, '$1$3.2chan.net/$4');
}

function serializeXML (xml) {
	return (new window.XMLSerializer())
		.serializeToString(xml)
		.replace(/<\/\w+>/g, '$&\n')
		.replace(/></g, '>\n<');
}

function getCookie (key) {
	var result;
	document.cookie.split(';').some(function (a) {
		a = a.split('=', 2);
		if (a[0].replace(/^\s+|\s+$/g, '') == key) {
			result = unescape(a[1]);
			return true;
		}
	});
	return result;
}

function setCookie (key, value, lifeDays, path) {
	var s = [];
	s.push(`${key}=${escape(value)}`);
	if (lifeDays) {
		var d = new Date;
		d.setDate(d.getDate() + lifeDays);
		s.push('expires=' + d.toUTCString());
	}
	if (path) {
		s.push('path=' + path);
	}
	document.cookie = s.join('; ');
}

function setBoardCookie (key, value, lifeDays) {
	setCookie(key, value, lifeDays, `/${siteInfo.board}`);
}

function getCatalogSettings () {
	let data = getCookie('cxyl');
	if (data == undefined) {
		data = [15, 5, 0];
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

function getDOMFromString (s) {
	try {
		return (new window.DOMParser()).parseFromString(
			s.replace(/\r?\n/g, ' ')
			.replace(/<script[^>]*>.*?<\/script>/gi, '')
			.replace(/<img[^>]*>/gi, function ($0) {
				return $0.replace(/\bsrc=/g, 'data-src=')
			})
			, 'text/html');
	}
	catch (e) {
		console.error(`${APP_NAME}: getDOMFromString failed: ${e.stack}`);
	}
}

function getImageMimeType (href) {
	if (/\.jpe?g\b/i.test(href)) {
		return 'image/jpeg';
	}
	if (/\.png\b/i.test(href)) {
		return 'image/png';
	}
	if (/\.gif\b/i.test(href)) {
		return 'image/gif';
	}
	if (/\.webp\b/i.test(href)) {
		return 'image/webp';
	}
	if (/\.webm\b/i.test(href)) {
		return 'video/webm';
	}
	if (/\.mp4\b/i.test(href)) {
		return 'video/mp4';
	}
	return 'application/octet-stream';
}

function getImageName (href, targetNode) {
	let dateAvailable = true;
	let re;
	let imageDate;

	// image on futaba server
	re = /^https?:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^\/]+)\/src\/(\d+)\.([^.]+)/.exec(restoreDistributedImageURL(href));

	// image on siokara server
	if (!re) {
		re = /^https?:\/\/[^.]+\.(nijibox\d+)\.com(?::\d+)?\/futabafiles\/([^\/]+)\/src\/(\w+\d+)\.([^.]+)/.exec(href);
		if (re) {
			dateAvailable = false;
			re[1] = 'siokara';
		}
	}

	if (!re) return;

	/*
	 * re[1]: server key
	 * re[2]: board key
	 * re[3]: image serial number (unix timestamp + 3 digits of msec value)
	 * re[4]: file name extension (excludes a dot)
	 */

	if (dateAvailable) {
		imageDate = new Date(re[3] - 0);
	}
	else {
		// images on siokara server has not created timestamp:
		// so pick up current date
		imageDate = new Date;
	}

	// retrieve thread number and first comment text
	let threadNumber = 0;
	let firstCommentText = '';
	let defaultCommentText = '';
	let p = targetNode;
	while (p) {
		if (p.nodeName == 'ARTICLE') {
			let topicWrap = $qs('.topic-wrap', p);
			if (topicWrap) {
				threadNumber = topicWrap.getAttribute('data-number') - 0 || 0;
			}

			Array.prototype.some.call(
				$qsa('.comment', p),
				node => {
					let node2 = node.cloneNode(true);
					$qsa('div,iframe', node2).forEach(div => {
						div.parentNode.removeChild(div);
					});

					let comment = node2.textContent;
					if (/^ｷﾀ━+\(ﾟ∀ﾟ\)━+\s*!+$/.test(comment)) {
						defaultCommentText = comment;
						return false;
					}
					else {
						firstCommentText = comment;
						return true;
					}
				}
			);

			break;
		}
		else {
			p = p.parentNode;
		}
	}
	if (firstCommentText == '') {
		firstCommentText = defaultCommentText;
	}
	if (firstCommentText == '') {
		firstCommentText = 'ｷﾀ━━━(ﾟ∀ﾟ)━━━!!';
	}
	// substitute control characters
	firstCommentText = firstCommentText.replace(/[\u0000-\u001f]+/g, ' ');
	// strip Unicode BiDi overrides
	firstCommentText = firstCommentText.replace(/[\u202d\u202e]/g, '');
	// substitute reserved characters on some platforms
	// @see: https://docs.microsoft.com/en-us/windows/desktop/fileio/naming-a-file
	const map = {
		'<': '＜',
		'>': '＞',
		':': '：',
		'/': '／',
		'\\': '＼',
		'?': '？',
		'*': '＊'
	};
	firstCommentText = firstCommentText.replace(
		/[<>:\/\\?*]/g, $0 => map[$0]);

	// limit length of firstCommentText
	// (it may have to be configurable?)
	firstCommentText = firstCommentText.substring(0, 50);
	firstCommentText = firstCommentText.replace(/[\ud800-\udbff]$/, '');

	// trim surrounding spaces
	firstCommentText = firstCommentText.replace(/^\s*|\s*$/g, '');



	let f = storage.config.save_image_name_template.value
		.replace(/[\r\n]/g, '')
		.replace(/\$([A-Z]+)/g, ($0, $1) => {
			switch ($1) {
			case 'SERVER':
				return siteInfo.server;
			case 'BOARD':
				return siteInfo.board;
			case 'THREAD':
				return threadNumber;
			case 'YEAR':
				return imageDate.getFullYear();
			case 'MONTH':
				return ('00' + (imageDate.getMonth() + 1)).substr(-2);
			case 'DAY':
				return ('00' + (imageDate.getDate())).substr(-2);
			case 'SERIAL':
				return re[3];
			case 'DIST':
				return re[3].substr(-3);
			case 'EXT':
				return re[4];
			case 'TEXT':
				return firstCommentText;
			default:
				return $0;
			}
		});

	f = '/' + f;
	f = f.replace(/\\/g, '/');
	f = f.replace(/\/\/+/g, '/');

	// check incompatible patterns
	if (/\.\./.test(f)) return;
	if (/\/(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])/i.test(f)) return;

	return f;
}

function getWrapElement (element) {
	for (; element; element = element.parentNode) {
		if (element.classList.contains('topic-wrap')
		|| element.classList.contains('reply-wrap')) {
			return element;
		}
	}

	return null;
}

function getPostNumber (element) {
	let result;

	for (; element; element = element.parentNode) {
		let n = element.getAttribute('data-number');
		if (n) {
			result = n - 0;
		}
		if (element.classList.contains('topic-wrap')
		|| element.classList.contains('reply-wrap')) {
			if (result == undefined) {
				result = $qs('[data-number]', element).getAttribute('data-number') - 0;
			}
			return result;
		}
	}

	return null;
}

function docScrollTop () {
	return Math.max(
		document.documentElement.scrollTop,
		document.body.scrollTop);
}

function docScrollLeft () {
	return Math.max(
		document.documentElement.scrollLeft,
		document.body.scrollLeft);
}

function transitionend (element, callback, backupMsec) {
	element = $(element);
	if (!element) {
		if (callback) {
			callback({
				type: 'transitionend-backup',
				target: null,
			});
		}
		return;
	}

	let backupTimer;
	let handler = function handleTransitionEnd (e) {
		if (backupTimer) {
			clearTimeout(backupTimer);
			backupTimer = null;
		}
		if (element) {
			element.removeEventListener('transitionend', handleTransitionEnd);
		}
		if (callback) {
			callback(e);
		}
		handler = element = callback = e = null;
	};

	element.addEventListener('transitionend', handler);
	backupTimer = setTimeout(handler, backupMsec || 1000, {
		type: 'transitionend-backup',
		target: element,
	});
}

function delay (msecs) { /*returns promise*/
	return new Promise(resolve => setTimeout(resolve, msecs));
}

function transitionendp (element, backupMsec) { /*returns promise*/
	return new Promise(resolve => transitionend(element, resolve, backupMsec));
}

function log () {
	devMode && console.log(
		Array.from(arguments).join(' '));
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

function nodeToString (container) {
	container = container.cloneNode(true);
	$qsa('div.link-siokara', container).forEach(node => {
		node.parentNode.replaceChild(
			document.createTextNode($qs('a', node).textContent),
			node);
	});

	const iterator = document.createNodeIterator(
		container,
		window.NodeFilter.SHOW_ELEMENT | window.NodeFilter.SHOW_TEXT,
		null, false);

	const result = [];
	let currentNode;
	while ((currentNode = iterator.nextNode())) {
		switch (currentNode.nodeType) {
		case 1:
			if (currentNode.nodeName == 'IMG') {
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
	var container = document[CRE]('div');
	container.appendChild(range.cloneContents());
	return nodeToString(container);
}

function getBlobFrom (url, mimeType = 'image/png', quality = 0.9) { /*returns promise*/
	if (url instanceof HTMLCanvasElement) {
		return new Promise(resolve => {
			url.toBlob(blob => {resolve(blob)}, mimeType, quality);
		});
	}
	else {
		// http://stackoverflow.com/a/30666203
		return new Promise(resolve => {
			let xhr = transport.create();

			xhr.open('GET', url);
			// Can't use blob directly because of https://crbug.com/412752
			xhr.responseType = 'arraybuffer';
			xhr.onload = () => {
				let mime = xhr.getResponseHeader('content-type');
				resolve(new window.Blob([xhr.response], {type: mime}));
			};
			xhr.onerror = () => {
				resolve();
			};
			xhr.onloadend = () => {
				xhr = null;
			};

			xhr.setRequestHeader('X-Requested-With', `${APP_NAME}/${version}`);
			xhr.send();
		});
	}
}

function getImageFrom (target) { /*returns promise*/
	return new Promise(resolve => {
		let url;
		let needRevoke = false;
		let tagName = 'img';
		let loadEvent = 'onload';

		if (target instanceof File || target instanceof Blob) {
			url = URL.createObjectURL(target);
			needRevoke = true;
			if (target.type.startsWith('video/')) {
				tagName = 'video';
				loadEvent = 'oncanplay';
			}
		}
		else {
			url = target;
		}

		let media = document[CRE](tagName);
		media[loadEvent] = () => {
			needRevoke && URL.revokeObjectURL(url);
			resolve(media);
			media = null;
		};
		media.onerror = () => {
			needRevoke && URL.revokeObjectURL(url);
			resolve();
			media = null;
		};
		media.src = url;
	});
}

function getPostTimeRegex () {
	return /(\d+)\/(\d+)\/(\d+)\(.\)(\d+):(\d+):(\d+)/;
}

function getReadableSize (size) {
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

function getContentsFromEditable (el) {
	let value;
	if ('value' in el) {
		value = el.value;
	}
	else {
		const div = document[CRE]('div');

		// Insert newlines around block elements.
		// This code may be a little heuristic.
		let html = el.innerHTML;
		html = html.replace(/<br[^>\/]*\/?>(<\/div[^>]*>)/gi, '$1');
		html = html.replace(/^<div[^>]*>/, '');
		html = html.replace(/<\/div[^>]*>/gi, '');
		html = html.replace(/<div[^>]*>/gi, '\n');
		div.innerHTML = html;

		// innerText is important to preserve newline.
		// On the other hand, textContent drops all newlines.
		value = div.innerText;

		// Trim all leading spaces
		value = value.replace(/^\s+/g, '');

		if (devMode && $qs('[data-href="#toggle-comment-log"]').checked) {
			console.log([
				`*** original ***`,
				`"${el.innerHTML}"`,
				`*** modified ***`,
				`"${html}"`,
				`*** result ***`,
				`"${value}"`
			].join('\n'));
		}
	}
	return value;
}

function setContentsToEditable (el, s) {
	if ('value' in el) {
		el.value = s;
	}
	else {
		el.textContent = s;
	}
}

function displayInlineVideo (anchor) {
	if ($qs('video', anchor.parentNode)) return;

	const video = document[CRE]('video');
	const props = {
		autoplay: true,
		controls: true,
		//loop: true,
		muted: false,
		src: anchor.href,
		volume: 0.2
	};

	for (let i in props) {
		video[i] = props[i];
	}
	video.style.maxWidth = `${INLINE_VIDEO_MAX_WIDTH}px`;

	let thumbnail = $qs('img', anchor);
	// video file on siokara
	if (/\/\/www\.nijibox\d+\.com\//.test(anchor.href)) {
		/*
		 * div.link-siokara
		 *   a.lightbox
		 *     #text
		 *   div
		 *     a.lightbox.siokara-thumbnail
		 *       img
		 *   div
		 *     [保存する]
		 */
		thumbnail = $qs('img', anchor.parentNode);
		anchor = thumbnail.parentNode;
		anchor.parentNode.insertBefore(video, anchor);
		thumbnail.classList.add('hide');
		video.style.width = '100%';
	}
	// video file on futaba
	else if (thumbnail) {
		thumbnail.classList.add('hide');
		anchor.parentNode.insertBefore(video, anchor);
		video.style.width = '100%';
	}
	// other
	else {
		const container = anchor.parentNode.insertBefore(
			document[CRE]('div'), anchor.nextSibling);
		container.appendChild(video);
		video.style.width = '100%';
	}
}

function displayInlineAudio (anchor) {
	if ($qs('audio', anchor.parentNode)) return;

	const audio = document[CRE]('audio');
	const props = {
		autoplay: true,
		controls: true,
		muted: false,
		src: anchor.href,
		volume: 0.2
	};

	for (let i in props) {
		audio[i] = props[i];
	}

	const thumbnail = $qs('img', anchor.parentNode);
	anchor = thumbnail.parentNode;
	anchor.parentNode.insertBefore(audio, anchor);
	thumbnail.classList.add('hide');
}

function isHighSurrogate (ch) {
	if (typeof ch == 'string') {
		ch = ch.charCodeAt(0);
	}
	return 0xd800 <= ch && ch <= 0xdbff;
}

function isLowSurrogate (ch) {
	if (typeof ch == 'string') {
		ch = ch.charCodeAt(0);
	}
	return 0xdc00 <= ch && ch <= 0xdfff;
}

function isSurrogate (ch) {
	return isHighSurrogate(ch) || isLowSurrogate(ch);
}

function resolveCharacterReference (s) {
	// resolve character reference
	s = s.replace(/&(?:#(x[0-9a-f]+|[0-9]+)|([0-9a-z]+));?/gi, ($0, $1, $2) => {
		if ($1 != undefined) {
			if ($1.charAt(0).toLowerCase() == 'x') {
				$1 = parseInt($1.substring(1), 16);
			}
			else {
				$1 = parseInt($1, 10);
			}

			try {
				return String.fromCodePoint($1);
			}
			catch (err) {
				return '';
			}
		}
		else if ($2 != undefined) {
			const source = `&${$2};`;
			let converter = $('charref-converter');
			if (converter) {
				converter.innerHTML = source;
				return converter.textContent;
			}

			try {
				converter = document.body.appendChild(document[CRE]('div'));
				converter.innerHTML = source;
				return converter.textContent;
			}
			finally {
				converter.parentNode.removeChild(converter);
			}
		}
	});

	// fold continuous Nonspacing Marks
	// Firefox does not support following regexp!
	//s = s.replace(/(\p{gc=Mn})\1+/ug, '$1');

	return s;
}

function dumpDebugText (text) {
	if (!devMode) return;

	const ID = 'akahukuplus-debug-dump-container';
	let node = $(ID);

	if (text != undefined) {
		if (!node) {
			node = document.body.appendChild(document[CRE]('pre'));
			node.id = ID;
			node.style.fontFamily = 'Consolas,monospace';
			node.style.whiteSpace = 'pre-wrap';
			node.style.wordBreak = 'break-all';
		}
		empty(node);
		node.appendChild(document.createTextNode(text));
	}
	else {
		if (node) {
			node.parentNode.removeChild(node);
		}
	}
}

const 新字体の漢字を舊字體に変換 = (function () {
	const map = {
		亜:'亞',悪:'惡',圧:'壓',囲:'圍',為:'爲',医:'醫',壱:'壹',稲:'稻',飲:'飮',隠:'隱',
		営:'營',栄:'榮',衛:'衞',駅:'驛',悦:'悅',閲:'閱',円:'圓',縁:'緣',艶:'艷',塩:'鹽',
		奥:'奧',応:'應',横:'橫',欧:'歐',殴:'毆',黄:'黃',温:'溫',穏:'穩',仮:'假',価:'價',
		画:'畫',会:'會',回:'囘',壊:'壞',懐:'懷',絵:'繪',概:'槪',拡:'擴',殻:'殼',覚:'覺',
		学:'學',岳:'嶽',楽:'樂',渇:'渴',鎌:'鐮',勧:'勸',巻:'卷',寛:'寬',歓:'歡',缶:'罐',
		観:'觀',間:'閒',関:'關',陥:'陷',巌:'巖',顔:'顏',帰:'歸',気:'氣',亀:'龜',偽:'僞',
		戯:'戲',犠:'犧',却:'卻',糾:'糺',旧:'舊',拠:'據',挙:'擧',虚:'虛',峡:'峽',挟:'挾',
		教:'敎',強:'强',狭:'狹',郷:'鄕',尭:'堯',暁:'曉',区:'區',駆:'驅',勲:'勳',薫:'薰',
		群:'羣',径:'徑',恵:'惠',掲:'揭',携:'攜',渓:'溪',経:'經',継:'繼',茎:'莖',蛍:'螢',
		軽:'輕',鶏:'鷄',芸:'藝',撃:'擊',欠:'缺',倹:'儉',剣:'劍',圏:'圈',検:'檢',権:'權',
		献:'獻',県:'縣',研:'硏',険:'險',顕:'顯',験:'驗',厳:'嚴',呉:'吳',娯:'娛',効:'效',
		広:'廣',恒:'恆',鉱:'鑛',号:'號',国:'國',黒:'黑',歳:'歲',済:'濟',砕:'碎',斎:'齋',
		剤:'劑',冴:'冱',桜:'櫻',冊:'册',雑:'雜',産:'產',参:'參',惨:'慘',桟:'棧',蚕:'蠶',
		賛:'贊',残:'殘',糸:'絲',姉:'姊',歯:'齒',児:'兒',辞:'辭',湿:'濕',実:'實',舎:'舍',
		写:'寫',釈:'釋',寿:'壽',収:'收',従:'從',渋:'澁',獣:'獸',縦:'縱',粛:'肅',処:'處',
		緒:'緖',叙:'敍',尚:'尙',奨:'奬',将:'將',床:'牀',渉:'涉',焼:'燒',称:'稱',証:'證',
		乗:'乘',剰:'剩',壌:'壤',嬢:'孃',条:'條',浄:'淨',状:'狀',畳:'疊',穣:'穰',譲:'讓',
		醸:'釀',嘱:'囑',触:'觸',寝:'寢',慎:'愼',晋:'晉',真:'眞',刃:'刄',尽:'盡',図:'圖',
		粋:'粹',酔:'醉',随:'隨',髄:'髓',数:'數',枢:'樞',瀬:'瀨',清:'淸',青:'靑',声:'聲',
		静:'靜',斉:'齊',税:'稅',跡:'蹟',説:'說',摂:'攝',窃:'竊',絶:'絕',専:'專',戦:'戰',
		浅:'淺',潜:'潛',繊:'纖',践:'踐',銭:'錢',禅:'禪',曽:'曾',双:'瘦',痩:'雙',遅:'遲',
		壮:'壯',捜:'搜',挿:'插',巣:'巢',争:'爭',窓:'窗',総:'總',聡:'聰',荘:'莊',装:'裝',
		騒:'騷',増:'增',臓:'臟',蔵:'藏',即:'卽',属:'屬',続:'續',堕:'墮',体:'體',対:'對',
		帯:'帶',滞:'滯',台:'臺',滝:'瀧',択:'擇',沢:'澤',単:'單',担:'擔',胆:'膽',団:'團',
		弾:'彈',断:'斷',痴:'癡',昼:'晝',虫:'蟲',鋳:'鑄',庁:'廳',徴:'徵',聴:'聽',勅:'敕',
		鎮:'鎭',脱:'脫',逓:'遞',鉄:'鐵',転:'轉',点:'點',伝:'傳',党:'黨',盗:'盜',灯:'燈',
		当:'當',闘:'鬭',徳:'德',独:'獨',読:'讀',届:'屆',縄:'繩',弐:'貳',妊:'姙',粘:'黏',
		悩:'惱',脳:'腦',覇:'霸',廃:'廢',拝:'拜',売:'賣',麦:'麥',発:'發',髪:'髮',抜:'拔',
		晩:'晚',蛮:'蠻',秘:'祕',彦:'彥',姫:'姬',浜:'濱',瓶:'甁',払:'拂',仏:'佛',併:'倂',
		並:'竝',変:'變',辺:'邊',弁:'辨',/*弁:'瓣',弁:'辯',*/舗:'舖',歩:'步',穂:'穗',宝:'寶',
		萌:'萠',褒:'襃',豊:'豐',没:'沒',翻:'飜',槙:'槇',毎:'每',万:'萬',満:'滿',麺:'麵',
		黙:'默',餅:'餠',歴:'歷',恋:'戀',戻:'戾',弥:'彌',薬:'藥',訳:'譯',予:'豫',余:'餘',
		与:'與',誉:'譽',揺:'搖',様:'樣',謡:'謠',遥:'遙',瑶:'瑤',欲:'慾',来:'來',頼:'賴',
		乱:'亂',覧:'覽',略:'畧',竜:'龍',両:'兩',猟:'獵',緑:'綠',隣:'鄰',凛:'凜',塁:'壘',
		涙:'淚',励:'勵',礼:'禮',隷:'隸',霊:'靈',齢:'齡',暦:'曆',錬:'鍊',炉:'爐',労:'勞',
		楼:'樓',郎:'郞',禄:'祿',録:'錄',亘:'亙',湾:'灣',

		逸:'逸',羽:'羽',鋭:'銳',益:'益',謁:'謁',禍:'禍',悔:'悔',海:'海',慨:'慨',喝:'喝',
		褐:'褐',漢:'漢',館:'館',器:'器',既:'既',既:'旣',祈:'祈',響:'響',勤:'勤',謹:'謹',
		契:'契',戸:'戶',穀:'穀',殺:'殺',祉:'祉',視:'視',飼:'飼',煮:'煮',社:'社',者:'者',
		臭:'臭',祝:'祝',暑:'暑',署:'署',諸:'諸',祥:'祥',神:'神',晴:'晴',精:'精',節:'節',
		祖:'祖',僧:'僧',層:'層',憎:'憎',贈:'贈',琢:'琢',嘆:'嘆',着:'著',猪:'猪',懲:'懲',
		塚:'塚',都:'都',闘:'鬭',突:'突',難:'難',梅:'梅',繁:'繁',飯:'飯',卑:'卑',碑:'碑',
		賓:'賓',頻:'頻',敏:'敏',侮:'侮',福:'福',塀:'塀',勉:'勉',墨:'墨',免:'免',祐:'祐',
		欄:'欄',隆:'隆',虜:'虜',旅:'旅',類:'類',廉:'廉',練:'練',廊:'廊',朗:'朗'
	};
	const key = new RegExp('[\
亜悪圧囲為医壱稲飲隠営栄衛駅悦閲円縁艶塩奥応横欧殴黄温穏仮価画会回壊懐絵概拡殻覚\
学岳楽渇鎌勧巻寛歓缶観間関陥巌顔帰気亀偽戯犠却糾旧拠挙虚峡挟教強狭郷尭暁区駆勲薫\
群径恵掲携渓経継茎蛍軽鶏芸撃欠倹剣圏検権献県研険顕験厳呉娯効広恒鉱号国黒歳済砕斎\
剤冴桜冊雑産参惨桟蚕賛残糸姉歯児辞湿実舎写釈寿収従渋獣縦粛処緒叙尚奨将床渉焼称証\
乗剰壌嬢条浄状畳穣譲醸嘱触寝慎晋真刃尽図粋酔随髄数枢瀬清青声静斉税跡説摂窃絶専戦\
浅潜繊践銭禅曽双痩遅壮捜挿巣争窓総聡荘装騒増臓蔵即属続堕体対帯滞台滝択沢単担胆団\
弾断痴昼虫鋳庁徴聴勅鎮脱逓鉄転点伝党盗灯当闘徳独読届縄弐妊粘悩脳覇廃拝売麦発髪抜\
晩蛮秘彦姫浜瓶払仏併並変辺弁弁弁舗歩穂宝萌褒豊没翻槙毎万満麺黙餅歴恋戻弥薬訳予余\
与誉揺様謡遥瑶欲来頼乱覧略竜両猟緑隣凛塁涙励礼隷霊齢暦錬炉労楼郎禄録亘湾\
逸羽鋭益謁禍悔海慨喝褐漢館器既既祈響勤謹契戸穀殺祉視飼煮社者臭祝暑署諸祥神晴精節\
祖僧層憎贈琢嘆着猪懲塚都闘突難梅繁飯卑碑賓頻敏侮福塀勉墨免祐欄隆虜旅類廉練廊朗\
]', 'g');
	return s => ('' + s).replace(key, $0 => map[$0]);
})();

/*
 * <<<1 functions for posting
 */

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

	inputNodes.forEach(node => {
		if (node.name == '') return;
		if (node.disabled) return;
		callback(node);
	});
}

function populateFileFormItems (form, callback) {
	const inputNodes = $qsa([
		'input[type="file"]'
	].join(','), form);

	inputNodes.forEach(node => {
		if (node.name == '') return;
		if (node.disabled) return;
		if (node.files.length == 0) return;
		callback(node);
	});
}

function postBase (type, form) { /*returns promise*/
	function getIconvPayload (form) {
		let payload = {};

		populateTextFormItems(form, node => {
			let content = node.value;

			if (IDEOGRAPH_CONVERSION_POST) {
				content = 新字体の漢字を舊字體に変換(content);
			}

			payload[node.name] = content;
		});

		return payload;
	}

	function getBoundary () {
		return '----------' +
			Math.floor(Math.random() * 0x80000000).toString(36) + '-' +
			Math.floor(Math.random() * 0x80000000).toString(36) + '-' +
			Math.floor(Math.random() * 0x80000000).toString(36);
	}

	function getMultipartFormData (items, boundary) {
		let data = [];

		for (let i in items) {
			let item = new Uint8Array(items[i]);
			data.push(
				`--${boundary}\r\n` +
				`Content-Disposition: form-data; name="${i}"\r\n\r\n`,
				item, '\r\n'
			);
		};

		populateFileFormItems(form, node => {
			data.push(
				`--${boundary}\r\n` +
				`Content-Disposition: form-data` +
				`; name="${node.name}"` +
				`; filename="${node.files[0].name.replace(/"/g, '`')}"\r\n` +
				`Content-Type: ${node.files[0].type}\r\n` +
				'\r\n',
				node.files[0],
				'\r\n'
			);
		});

		if (overrideUpfile) {
			data.push(
				`--${boundary}\r\n` +
				'Content-Disposition: form-data' +
				'; name="upfile"' +
				`; filename="${overrideUpfile.name}"\r\n` +
				`Content-Type: ${overrideUpfile.data.type}\n` +
				'\r\n',
				overrideUpfile.data,
				'\r\n'
			);
		}

		data.push(`--${boundary}--\r\n`);
		data = new window.Blob(data);

		return data;
	}

	function getUrlEncodedFormData (items) {
		let data = [];
		let delimiter = '';

		for (let i in items) {
			data.push(
				delimiter, i, '=',
				items[i].map(code => {
					if (code == 32) return '+';
					let ch = String.fromCharCode(code);
					return /[a-z0-9-_.!~*'()]/i.test(ch) ?
						ch : '%' + ('0' + code.toString(16).toUpperCase()).substr(-2);
				}).join('')
			);

			if (delimiter == '') {
				delimiter = '&';
			}
		}

		return data.join('');
	}

	function multipartPost (data, boundary) {
		return new Promise(resolve => {
			xhr.open('POST', form.action);
			xhr.setRequestHeader('Content-Type', `multipart/form-data;boundary=${boundary}`);
			xhr.overrideMimeType(`text/html;charset=${FUTABA_CHARSET}`);

			xhr.onload = () => {
				resolve(xhr.responseText);
			};

			xhr.onerror = () => {
				resolve();
			};

			xhr.onloadend = () => {
				xhr = form = null;
			};

			xhr.setRequestHeader('X-Requested-With', `${APP_NAME}/${version}`);
			xhr.send(data);
		});
	}

	function urlEncodedPost (data) {
		return new Promise(resolve => {
			xhr.open('POST', form.action);
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xhr.overrideMimeType(`text/html;charset=${FUTABA_CHARSET}`);

			xhr.onload = () => {
				resolve(xhr.responseText);
			};

			xhr.onerror = () => {
				resolve();
			};

			xhr.onloadend = () => {
				xhr = form = null;
			};

			xhr.setRequestHeader('X-Requested-With', `${APP_NAME}/${version}`);
			xhr.send(data);
		});
	}

	let xhr = transport.create(type);
	return sendToBackend('iconv', getIconvPayload(form)).then(response => {
		if (!response) {
			throw new Error('Failed to convert charset.');
		}

		if (form.enctype == 'multipart/form-data') {
			let boundary = getBoundary();
			let data = getMultipartFormData(response, boundary);
			return multipartPost(data, boundary);
		}
		else {
			let data = getUrlEncodedFormData(response);
			return urlEncodedPost(data);
		}
	});
}

function resetForm () {
	let form = document[CRE]('form');
	let elements = [];

	for (let i = 0; i < arguments.length; i++) {
		let org = $(arguments[i]);
		if (!org) continue;
		if (org.contentEditable == 'true') {
			empty(org);
		}
		else {
			let clone = org.cloneNode(false);
			elements.push({org:org, clone:clone});
			org.parentNode.replaceChild(clone, org);
			form.appendChild(org);
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

	return {error: re || 'なんか変です'};
}

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
	if (refreshURL != '') {
		return {redirect: refreshURL};
	}

	re = /<body[^>]*>(.*)$/i.exec(response);
	if (re) {
		re = re[1].replace(/<\/body>.*$/i, '');
	}
	else {
		re = response.replace(/<!DOCTYPE[^>]+>\r?\n?/i, '');
	}

	return {error: re || 'なんか変です'};
}

function registerReleaseFormLock () {
	setTimeout(() => {
		$qs('fieldset', 'postform').disabled = false;
	}, POSTFORM_LOCK_RELEASE_DELAY);
}

/*
 * <<<1 functions for reloading
 */

function reloadBase (type, opts) { /*returns promise*/
	timingLogger.startTag('reloadBase');

	function detectionTest (doc) {
		// for mark detection test
		$qsa('blockquote:nth-child(-n+4)', doc).forEach((node, i) => {
			switch (i) {
			case 0:
				// marked
				node[IAHTML](
					'afterbegin',
					'<font color="#ff0000">marked post</font><br>');
				break;
			case 1:
				// marked with bracked
				node[IAHTML](
					'afterbegin',
					'[<font color="#ff0000">marked post</font>]<br>');
				break;
			case 2:
				// deleted with mark
				node[IAHTML](
					'afterbegin',
					'<font color="#ff0000">marked post</font><br>');
				for (var n = node; n && n.nodeName != 'TABLE'; n = n.parentNode);
				n && n.classList.add('deleted');
				break;
			case 3:
				// deleted with mark
				node[IAHTML](
					'afterbegin',
					'[<font color="#ff0000">marked post</font>]<br>');
				for (var n = node; n && n.nodeName != 'TABLE'; n = n.parentNode);
				n && n.classList.add('deleted');
				break;
			}
		});
		// for expiration warning test
		$qsa('small + blockquote', doc).forEach((node, i) => {
			node[IAHTML](
				'afterend',
				'<font color="#f00000"><b>このスレは古いので、もうすぐ消えます。</b></font><br>'
			);
		});
	}

	opts || (opts = {});
	reloadStatus.lastReloadType = 'full';
	reloadStatus.lastReceivedBytes = reloadStatus.lastReceivedCompressedBytes = 0;

	return new Promise((resolve, reject) => {
		const now = Date.now();
		const method = (opts.method || 'get').toUpperCase();

		let xhr = transport.create(type);
		xhr.open(method, window.location.href);
		xhr.overrideMimeType(`text/html;charset=${FUTABA_CHARSET}`);
		DEBUG_IGNORE_LAST_MODIFIED && (siteInfo.lastModified = 0);
		xhr.setRequestHeader('If-Modified-Since', siteInfo.lastModified || FALLBACK_LAST_MODIFIED);

		xhr.onprogress = function (e) {
			reloadStatus.lastReceivedBytes += e.loaded;
			reloadStatus.lastReceivedCompressedBytes += e.loaded;
		};

		xhr.onload = function (e) {
			timingLogger.endTag();

			const lm = xhr.getResponseHeader('Last-Modified');
			if (lm) {
				siteInfo.lastModified = lm;
			}

			if (devMode) {
				reloadStatus.lastReceivedText = xhr.responseText;
			}

			let headerSize = xhr.getAllResponseHeaders().length;
			if (window.location.protocol == 'https:') {
				headerSize = Math.ceil(headerSize * 0.33);	// this factor is heuristic.
			}
			reloadStatus.lastReceivedBytes += headerSize;
			reloadStatus.lastReceivedCompressedBytes += headerSize;

			let doc;

			if (method == 'HEAD') {
				reloadStatus.totalReceivedBytes += reloadStatus.lastReceivedBytes;
				reloadStatus.totalReceivedCompressedBytes += reloadStatus.lastReceivedCompressedBytes;
			}
			else if (method != 'HEAD' && xhr.status == 200) {
				if (/gzip/.test(xhr.getResponseHeader('Content-Encoding'))) {
					const contentLength = xhr.getResponseHeader('Content-Length');
					if (contentLength) {
						reloadStatus.lastReceivedCompressedBytes = parseInt(contentLength, 10) + headerSize;
					}
				}

				reloadStatus.totalReceivedBytes += reloadStatus.lastReceivedBytes;
				reloadStatus.totalReceivedCompressedBytes += reloadStatus.lastReceivedCompressedBytes;

				/*
				console.log([
					'*** full reload ***',
					`       header size: ${headerSize}`,
					`    content length: ${xhr.getResponseHeader('Content-Length')} (${getReadableSize(xhr.getResponseHeader('Content-Length') - 0)})`,
					` lastReceivedBytes: ${reloadStatus.lastReceivedBytes} (${getReadableSize(reloadStatus.lastReceivedBytes)})`,
					`totalReceivedBytes: ${reloadStatus.totalReceivedBytes} (${getReadableSize(reloadStatus.totalReceivedBytes)})`,
					`----`,
					` lastReceivedCompressedBytes: ${reloadStatus.lastReceivedCompressedBytes} (${getReadableSize(reloadStatus.lastReceivedCompressedBytes)})`,
					`totalReceivedCompressedBytes: ${reloadStatus.totalReceivedCompressedBytes} (${getReadableSize(reloadStatus.totalReceivedCompressedBytes)})`
				].join('\n'));
				*/

				timingLogger.startTag('parsing html');
				doc = xhr.responseText;
				doc = doc.replace(
					/>([^<]+)</g,
					($0, $1) => {
						$1 = resolveCharacterReference($1);
						$1 = $1.replace(/</g, '&lt;')
							.replace(/>/g, '&gt;');
						return `>${$1}<`;
					});
				doc = doc.replace(
					/(<a\s+href="mailto:)([^"]+)("[^>]*>)/gi,
					($0, $1, $2, $3) => {
						$2 = resolveCharacterReference($2);
						$2 = $2.replace(/"/g, '&quot;');
						return `${$1}${$2}${$3}`;
					});
				doc = getDOMFromString(doc);
				timingLogger.endTag();

				if (!doc) {
					reject(new Error('読み込んだ html からの DOM ツリー構築に失敗しました。'));
					return;
				}
			}

			//doc && detectionTest();

			resolve({
				doc: doc,
				now: now,
				status: xhr.status
			});
		};

		xhr.onerror = function (e) {
			timingLogger.endTag();

			reject(new Error(
				'ネットワークエラーにより内容を取得できません。' +
				`\n(${xhr.status})`));
		};

		xhr.onloadend = function () {
			xhr = null;
		};

		xhr.setRequestHeader('X-Requested-With', `${APP_NAME}/${version}`);
		xhr.send();
	});
}

function reloadBaseViaAPI (type, opts) { /*returns promise*/
	timingLogger.startTag('reloadBaseViaAPI');

	opts || (opts = {});
	reloadStatus.lastReloadType = 'delta';
	reloadStatus.lastReceivedBytes = reloadStatus.lastReceivedCompressedBytes = 0;

	return new Promise((resolve, reject) => {
		const now = Date.now();
		const url = [
			`${location.protocol}//${location.host}/${siteInfo.board}/futaba.php`,
			`?mode=json`,
			`&res=${siteInfo.resno}`,
			`&start=${getLastReplyNumber() + 1}`
		].join('');

		let xhr = transport.create(type);
		xhr.open('GET', url);
		xhr.overrideMimeType(`text/html;charset=UTF-8`);
		xhr.setRequestHeader('If-Modified-Since', FALLBACK_LAST_MODIFIED);

		xhr.onprogress = function (e) {
			reloadStatus.lastReceivedBytes += e.loaded;
			reloadStatus.lastReceivedCompressedBytes += e.loaded;
		};

		xhr.onload = function (e) {
			timingLogger.endTag();

			if (devMode) {
				reloadStatus.lastReceivedText = xhr.responseText;
			}

			let headerSize = xhr.getAllResponseHeaders().length;
			if (window.location.protocol == 'https:') {
				headerSize = Math.ceil(headerSize * 0.33);	// this factor is heuristic.
			}
			reloadStatus.lastReceivedBytes += headerSize;
			reloadStatus.lastReceivedCompressedBytes += headerSize;

			let doc;

			if (xhr.status == 200) {
				if (/gzip/.test(xhr.getResponseHeader('Content-Encoding'))) {
					const contentLength = xhr.getResponseHeader('Content-Length');
					if (contentLength) {
						reloadStatus.lastReceivedCompressedBytes = parseInt(contentLength, 10) + headerSize;
					}
					else {
						let factor;
						[
							[  512, 0.95],
							[ 1024, 0.65],
							[ 2048, 0.50],
							[ 4096, 0.40],
							[ 8192, 0.30],
							[16384, 0.20],
							[32768, 0.18],
							[65536, 0.16],
							[0x7fffffff, 0.14]
						].some(set => {
							if (reloadStatus.lastReceivedBytes < set[0]) {
								factor = set[1];
								return true;
							}
						});

						reloadStatus.lastReceivedCompressedBytes = Math.ceil(reloadStatus.lastReceivedBytes * factor) + headerSize;
					}
				}

				reloadStatus.totalReceivedBytes += reloadStatus.lastReceivedBytes;
				reloadStatus.totalReceivedCompressedBytes += reloadStatus.lastReceivedCompressedBytes;

				/*
				console.log([
					'*** delta reload ***',
					`       header size: ${headerSize}`,
					` lastReceivedBytes: ${reloadStatus.lastReceivedBytes} (${getReadableSize(reloadStatus.lastReceivedBytes)})`,
					`totalReceivedBytes: ${reloadStatus.totalReceivedBytes} (${getReadableSize(reloadStatus.totalReceivedBytes)})`,
					`----`,
					` lastReceivedCompressedBytes: ${reloadStatus.lastReceivedCompressedBytes} (${getReadableSize(reloadStatus.lastReceivedCompressedBytes)})`,
					`totalReceivedCompressedBytes: ${reloadStatus.totalReceivedCompressedBytes} (${getReadableSize(reloadStatus.totalReceivedCompressedBytes)})`
				].join('\n'));
				*/

				timingLogger.startTag('parsing json');
				try {
					const refmap = {
						amp: '&',
						lt: '<',
						gt: '>',
						quot: '"',
						apos: "'"
					};

					doc = xhr.responseText;
					doc = JSON.parse(doc, (key, value) => {
						if (typeof value == 'string') {

							// PHP's json_encode handles the following character references,
							// so we need to solve them.
							value = value.replace(/&(amp|quot|apos);/g, ($0, $1) => refmap[$1]);

							// Some UA convert a code point beyond BMP into surrogate pairs.
							// This is an error for the standard, and it should be a single
							// character reference.
							value = resolveCharacterReference(value);

							// experimental feature
							if (IDEOGRAPH_CONVERSION_CONTENT) {
								value = 新字体の漢字を舊字體に変換(value);
							}
						}

						return value;
					});
				}
				catch (e) {
					doc = undefined;
				}
				timingLogger.endTag();

				if (!doc) {
					timingLogger.endTag(); // parsing json
					reject(new Error('読み込んだ JSON の解析に失敗しました。'));
					return;
				}
			}

			resolve({
				doc: doc,
				now: now,
				status: xhr.status
			});
		};

		xhr.onerror = function (e) {
			timingLogger.endTag();

			reject(new Error(
				'ネットワークエラーにより内容を取得できません。' +
				`\n(${xhr.status})`));
		};

		xhr.onloadend = function () {
			xhr = null;
		};

		xhr.setRequestHeader('X-Requested-With', `${APP_NAME}/${version}`);
		xhr.send();
	});
}

function reloadCatalogBase (type, query) { /*returns promise*/
	timingLogger.startTag('reloadCatalogBase');

	return new Promise((resolve, reject) => {
		const now = Date.now();
		const url = `${location.protocol}//${location.host}/${siteInfo.board}/futaba.php?mode=cat${query}`

		let xhr = transport.create(type);
		xhr.open('GET', url);
		xhr.overrideMimeType(`text/html;charset=${FUTABA_CHARSET}`);

		xhr.onload = function (e) {
			timingLogger.endTag();

			timingLogger.startTag('parsing html');
			let doc;
			if (xhr.status == 200) {
				doc = xhr.responseText;

				// experimental feature
				if (IDEOGRAPH_CONVERSION_CONTENT) {
					doc = 新字体の漢字を舊字體に変換(doc);
				}

				const re = /<script[^>]+>var\s+ret\s*=JSON\.parse\('([^<]+)'\)/.exec(doc);
				if (re) {
					re[1] = re[1]
						.replace(/\\u([0-9a-f]{4})/ig, ($0, $1) => String.fromCharCode(parseInt($1, 16)))
						.replace(/\\([^"\\\/bfnrt])/g, '$1')
						.replace(/\\","cr":/g, '","cr":');	// **REALLY REALLY BAD**

					let data;
					try {
						data = JSON.parse(re[1]);
					}
					catch (err) {
						console.error(err.message + '\n' + err.stack);
						if (/in JSON at position (\d+)/.test(err.message)) {
							console.error(`error string: "${re[1].substr(RegExp.$1 - 8, 16)}"`);
						}
						data = {res: []};
					}

					const buffer = [];
					for (let i = 0; i < data.res.length; i++) {
						const item = data.res[i];

						if ('src' in item) {
							buffer.push(`<td><a href='res/${item.no}.htm' target='_blank'><img src='${item.src.replace(/\\\//g, '\/')}' border=0 width=${item.w} height=${item.h} alt=""></a><br><small>${item.com.replace(/\\\//g, '\/')}</small><br><font size=2>${item.cr}</font></td>\n`);
						}
						else {
							buffer.push(`<td><a href='res/${item.no}.htm' target='_blank'><small>${item.com.replace(/\\\//g, '\/')}</small></a><br><font size=2>${item.cr}</font></td>`);
						}

						if (i > 0 && (i % 15) == 14) {
							buffer.push('</tr>\n<tr>');
						}
					}
					buffer.unshift("<table border=1 align=center id='cattable'><tr>");
					buffer.push('</tr>\n</table>');
					doc = doc.replace(/(<div\s+id=["']?cattable["']?[^>]*>)(<\/div>)/, buffer.join(''));
				}

				doc = getDOMFromString(doc);
				if (!doc) {
					timingLogger.endTag(); // parsing html
					reject(new Error('読み込んだ html からの DOM ツリー構築に失敗しました。'));
					return;
				}
			}
			timingLogger.endTag();

			resolve({
				doc: doc,
				now: now,
				status: xhr.status
			});
		};

		xhr.onerror = function (e) {
			timingLogger.endTag();

			reject(new Error(
				'ネットワークエラーにより内容を取得できません。' +
				`\n(${xhr.status})`));
		};

		xhr.onloadend = function () {
			xhr = null;
		};

		xhr.setRequestHeader('X-Requested-With', `${APP_NAME}/${version}`);
		xhr.send();
	});
}

function modifyPage () {
	adjustReplyWidth();
	extractTweets();
	extractSiokaraThumbnails();
	extractNico2();
	extractIncompleteFiles();
}

function extractTweets () {
	const tweets = $qsa('.link-twitter');
	if (tweets.length == 0) return;

	function invokeTweetLoader (html) {
		let scriptSource = '';
		if (!$('twitter-widget-script')) {
			var re = /<script\b[^>]*src="([^"]+)"/.exec(html);
			if (re) {
				scriptSource = re[1];
			}
		}

		const scriptNode = document.head.appendChild(document[CRE]('script'));
		scriptNode.type = 'text/javascript';
		scriptNode.charset = 'UTF-8';
		if (scriptSource != '') {
			scriptNode.id = 'twitter-widget-script';
			scriptNode.src = scriptSource;
		}
		else {
			scriptNode.id = 'tweet-loader-' + Math.floor(Math.random() * 0x80000000);
			scriptNode.src = 'data:text/javascript,' +
				'window.twttr&&window.twttr.widgets.load();' +
				`document.head.removeChild(document.getElementById("${scriptNode.id}"));`;
		}
	}

	function getHandler (node) {
		return function gotTweet (data) {
			if (data) {
				node[IAHTML](
					'afterend',
					data.html.replace(/<script\b[^>]*>.*?<\/script>/i, ''));
				invokeTweetLoader(data.html);
			}
			node = null;
		}
	}

	for (let i = 0; i < tweets.length && i < 10; i++) {
		const id = tweets[i].getAttribute('data-tweet-id');
		id && sendToBackend('get-tweet', {url:tweets[i].href, id:id}, getHandler(tweets[i]));
		tweets[i].classList.remove('link-twitter');
	}

	setTimeout(extractTweets, 991);
}

function extractIncompleteFiles () {
	const files = $qsa('.incomplete');
	if (files.length == 0) return;

	function getHandler (node) {
		return function (data) {
			if (data) {
				if (data.url) {
					empty(node);
					node.href = data.url;
					node.appendChild(document.createTextNode(data.base));
				}

				if (/\.(?:jpg|gif|png|webp|webm|mp4|mp3|ogg)$/.test(data.url)) {
					node.classList.add('lightbox');
				}

				if (node.parentNode.nodeName != 'Q' && data.thumbnail) {
					const div = document[CRE]('div');
					div.className = 'link-siokara';

					const r = document.createRange();
					r.selectNode(node);
					r.surroundContents(div);
					node.classList.remove('link-siokara');

					const thumbDiv = div.appendChild(document[CRE]('div'));
					const thumbAnchor = node.cloneNode();
					thumbAnchor.classList.add('siokara-thumbnail');
					thumbDiv.appendChild(thumbAnchor);
					const img = thumbAnchor.appendChild(document[CRE]('img'));
					img.src = data.thumbnail;

					const saveDiv = div.appendChild(document[CRE]('div'));
					saveDiv.appendChild(document.createTextNode('['));
					const saveAnchor = saveDiv.appendChild(document[CRE]('a'));
					saveAnchor.className = 'js save-image';
					saveAnchor.href = data.url;
					saveAnchor.textContent = '保存する';
					saveDiv.appendChild(document.createTextNode(']'));
				}
			}
			else {
				const span = node.appendChild(document[CRE]('span'));
				span.className = 'link-completion-notice';
				span.textContent = '(補完失敗)';
			}
			node = null;
		}
	}

	for (let i = 0; i < files.length && i < 10; i++) {
		const id = files[i].getAttribute('data-basename');
		id && sendToBackend(
			'complete',
			{url:files[i].href, id:id},
			getHandler(files[i]));
		files[i].classList.remove('incomplete');
	}

	setTimeout(extractIncompleteFiles, 907);
}

function extractSiokaraThumbnails () {
	const files = $qsa(':not(q) > .incomplete-siokara-thumbnail');
	if (files.length == 0) return;

	function getHandler (node) {
		return function (data) {
			if (!data && /\.(webm|mp4|mp3|ogg)$/.test(node.href)) {
				data = chrome.extension.getURL('images/siokara-video.png');
			}
			if (data) {
				const div = document[CRE]('div');
				div.className = 'link-siokara';

				const r = document.createRange();
				r.selectNode(node);
				r.surroundContents(div);
				node.classList.remove('link-siokara');

				const thumbDiv = div.appendChild(document[CRE]('div'));
				const thumbAnchor = node.cloneNode();
				thumbAnchor.classList.add('siokara-thumbnail');
				thumbDiv.appendChild(thumbAnchor);
				const img = thumbAnchor.appendChild(document[CRE]('img'));
				img.src = data;

				const saveDiv = div.appendChild(document[CRE]('div'));
				saveDiv.appendChild(document.createTextNode('['));
				const saveAnchor = saveDiv.appendChild(document[CRE]('a'));
				saveAnchor.className = 'js save-image';
				saveAnchor.href = node.href;
				saveAnchor.textContent = '保存する';
				saveDiv.appendChild(document.createTextNode(']'));
			}
			node = null;
		}
	}

	for (let i = 0; i < files.length && i < 10; i++) {
		const thumbHref = files[i].getAttribute('data-thumbnail-href');
		if (thumbHref) {
			sendToBackend(
				'load-siokara-thumbnail',
				{url: thumbHref},
				getHandler(files[i]));
		}
		files[i].classList.remove('incomplete-siokara-thumbnail');
	}

	setTimeout(extractSiokaraThumbnails, 919);
}

function extractNico2 () {
	const files = $qsa('.inline-video.nico2[data-nico2-key]');
	if (files.length == 0) return;

	for (let i = 0; i < files.length && i < 10; i++) {
		const key = files[i].getAttribute('data-nico2-key');
		const scriptNode = files[i].appendChild(document[CRE]('script'));
		scriptNode.type = 'text/javascript';
		scriptNode.src = `https://embed.nicovideo.jp/watch/${key}/script?w=640&h=360`;
		scriptNode.onload = function () {
			this.parentNode.removeChild(this);
		};
		files[i].removeAttribute('data-nico2-key');
	}

	setTimeout(extractNico2, 911);
}

function adjustReplyWidth () {
	const nodes = $qsa('.reply-wrap .reply-image:not(.width-adjusted)');
	if (nodes.length == 0) return;

	const maxTextWidth = Math.floor($qs('.text').offsetWidth * 0.9);

	for (let i = 0; i < nodes.length && i < 10; i++) {
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

	setTimeout(adjustReplyWidth, 913);
}

function detectNoticeModification (notice, noticeNew) {
	const list = $qs('#panel-content-notice ul');
	if (!list) return;

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
		if (typeof index1 == 'number' && index1 >= 0 && index1 < lines.length) {
			markup = lines[index1];
		}
		else if (typeof index2 == 'number' && index2 >= 0 && index2 < lines.length) {
			markup = lines[index2];
		}
		if (markup != undefined) {
			rows.push({
				className: className,
				markup: markup
			});
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

		if (change == 'replace') {
			rows.push.apply(rows, topRows);
			rows.push.apply(rows, botRows);
		}
	}

	empty(list);
	rows.forEach(row => {
		const li = list.appendChild(document[CRE]('li'));
		li.className = row.className;
		li[IHTML] = row.markup;
		if (row.className != 'equal') {
			console.log(`${row.className}: "${row.markup}"`);
		}
	});
}

/*
 * <<<1 functions for reload feature in reply mode
 */

function setReloaderStatus (content, persistent) {
	const fetchStatus = $('fetch-status');
	if (!fetchStatus) return;

	if (content != undefined) {
		fetchStatus.classList.remove('hide');
		$t(fetchStatus, content);
		if (!persistent) {
			setTimeout(setReloaderStatus, RELOAD_LOCK_RELEASE_DELAY);
		}
	}
	else {
		$t(fetchStatus, '');
		fetchStatus.classList.add('hide');
	}
}

function updateMarkedTopic (xml, container) {
	var result = false;
	var marks = $qsa('topic > mark', xml);
	for (var i = 0, goal = marks.length; i < goal; i++) {
		var number = $qs('number', marks[i].parentNode).textContent;

		var node = $qs(`.topic-wrap[data-number="${number}"]`, container);
		if (!node || $qs('.mark', node)) continue;

		var comment = $qs('.comment', node);
		if (!comment) continue;

		var isBracket = marks[i].getAttribute('bracket') == 'true';
		comment.insertBefore(document[CRE]('br'), comment.firstChild);
		isBracket && comment.insertBefore(document.createTextNode(']'), comment.firstChild);
		var m = comment.insertBefore(document[CRE]('span'), comment.firstChild);
		m.className = 'mark';
		m.textContent = marks[i].textContent;
		isBracket && comment.insertBefore(document.createTextNode('['), comment.firstChild);

		result = true;
	}
	return result;
}

function updateTopicID (xml, container) {
	let result = false;
	const ids = $qsa('topic > user_id', xml);
	for (let i = 0, goal = ids.length; i < goal; i++) {
		const number = $qs('number', ids[i].parentNode).textContent;

		const node = $qs(`.topic-wrap[data-number="${number}"]`, container);
		if (!node || $qs('.user-id', node)) continue;

		const postno = $qs('.postno', node);
		if (!postno) continue;

		const id = postno.parentNode.insertBefore((document[CRE]('span')), postno);
		id.className = 'user-id';
		id.textContent = `ID:${ids[i].textContent}`;
		id.setAttribute('data-id', ids[i].textContent);
		postno.parentNode.insertBefore(document[CRE]('span'), postno);

		const sep = postno.parentNode.insertBefore(document[CRE]('span'), postno);
		sep.className = 'sep';
		sep.textContent = '|';

		result = true;
	}
	return result;
}

function updateTopicSodane (xml, container) {
	var result = false;
	var sodanes = $qsa('topic > sodane.sodane', xml);
	for (var i = 0, goal = sodanes.length; i < goal; i++) {
		var number = $qs('number', sodanes[i].parentNode).textContent;
		var node = $qs(`.topic-wrap[data-number="${number}"]`, container);
		if (!node) continue;

		var sodane = $qs('.sodane, .sodane-null', node);
		if (!sodane) continue;
		if (sodane.textContent == sodanes[i].textContent) continue;

		sodane.classList.remove('sodane-null');
		sodane.classList.add('sodane');
		sodane.textContent = sodanes[i].textContent;

		result = true;
	}
	return result;
}

function updateReplyAssets (xml, container, selector, handler) {
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
			console.error([
				`internal number unmatch:`,
				`number: ${number}`,
				`actual number: ${$qs('[data-number]').getAttribute('data-number')}`
			].join('\n'));
			continue;
		}

		const processed = handler(asset, node);
		processed && result++;
	}
	timingLogger.endTag(`/ ${result} items`);
	return result;
}

function updateMarkedReplies (xml, container) {
	return updateReplyAssets(xml, container, 'reply > mark', (asset, node) => {
		// Do nothing if already deleted-mark flagged
		// TODO: We may have to distinguish remote host display, deletion by commenter,
		// deletion by poster, and なー.
		if (node.classList.contains('deleted')) return;
		node.classList.add('deleted');

		// retrieve current comment
		const comment = $qs('.comment', node);
		if (!comment) {
			console.error([
				`comment not found:`,
				`${node.outerHTML}`
			].join('\n'));
			return;
		}

		// insert mark
		const isBracket = asset.getAttribute('bracket') == 'true';
		comment.insertBefore(document[CRE]('br'), comment.firstChild);
		isBracket && comment.insertBefore(document.createTextNode(']'), comment.firstChild);
		const m = comment.insertBefore(document[CRE]('span'), comment.firstChild);
		m.className = 'mark';
		m.textContent = asset.textContent;
		isBracket && comment.insertBefore(document.createTextNode('['), comment.firstChild);

		return true;
	});
}

function updateReplyIDs (xml, container) {
	// In ID表示 mode, ID is displayed in all comments,
	// So we must not do anything.
	if (siteInfo.idDisplay) {
		return 0;
	}

	return updateReplyAssets(xml, container, 'reply > user_id', (asset, node) => {
		// Do nothing if already user id exists
		if ($qs('.user-id', node)) return;

		// insert id
		const div = node.appendChild(document[CRE]('div'));
		div.appendChild(document.createTextNode('──'));
		const span = div.appendChild(document[CRE]('span'));
		div.className = span.className = 'user-id';
		span.textContent = 'ID:' + asset.textContent;
		span.setAttribute('data-id', asset.textContent);
		div.appendChild(document[CRE]('span'));

		return true;
	});
}

function updateReplySodanes (xml, container) {
	return updateReplyAssets(xml, container, 'reply > sodane.sodane', (asset, node) => {
		// retrieve sodane node
		const sodane = $qs('.sodane, .sodane-null', node);
		if (!sodane) {
			console.error([
				`sodane not found:`,
				`${node.outerHTML}`
			].join('\n'));
			return;
		}

		// Do nothing if number of sodanes is the same
		if (sodane.textContent == asset.textContent) return;

		// insert sodane
		sodane.classList.remove('sodane-null');
		sodane.classList.add('sodane');
		sodane.textContent = asset.textContent;

		return true;
	});
}

function updateIdFrequency (stat) {
	timingLogger.startTag(`updateIdFrequency`);
	for (let id in stat.idData) {
		const idData = stat.idData[id];

		// Single ID must not be counted
		if (idData.length == 1) continue;

		const selector = [
			`article .topic-wrap span.user-id[data-id="${id}"]`,
			`article .reply-wrap span.user-id[data-id="${id}"]`
		].join(',');

		// Important optimization: If the total number of IDs has not changed,
		// It is not necessary to update entire posts with current ID
		const re = /\d+\/(\d+)/.exec($qs(selector).nextSibling.textContent);
		if (re && re[1] - 0 == idData.length) continue;

		// Count up all posts with the same ID...
		const posts = $qsa(selector);
		for (let i = 0, index = 1, goal = posts.length; i < goal; i++, index++) {
			$t(posts[i].nextSibling, `(${index}/${idData.length})`);
		}
	}
	timingLogger.endTag();
}

function updateSodanesViaAPI (data) {
	if (!data) return;

	for (let number in data) {
		const selector = [
			`article .topic-wrap[data-number="${number}"]`,
			`article .reply-wrap > [data-number="${number}"]`
		].join(',');
		const sodaneValue = data[number] - 0;

		for (const node of $qsa(selector)) {
			const sodaneNode = $qs('.sodane, .sodane-null', node);
			if (!sodaneNode) {
				continue;
			}

			const re = /\d+$/.exec(sodaneNode.textContent);
			if (re && re[0] - 0 == sodaneValue) {
				continue;
			}

			if (sodaneValue) {
				$t(sodaneNode, `そうだね × ${sodaneValue}`);
				sodaneNode.classList.remove('sodane-null');
				sodaneNode.classList.add('sodane');
			}
			else {
				$t(sodaneNode, '＋');
				sodaneNode.classList.add('sodane-null');
				sodaneNode.classList.remove('sodane');
			}
		}
	}
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
	].join(' '))).getAttribute('data-number') - 0;
}

function createRule (container) {
	let rule = getRule(container);
	if (!rule) {
		rule = container.appendChild(document[CRE]('div'));
		rule.className = 'rule';
	}
	return rule;
}

function removeRule (container) {
	container || (container = getReplyContainer());
	if (!container) return;
	const rule = $qs('.rule', container);
	if (!rule) return;
	rule.parentNode.removeChild(rule);
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
		const node = result.snapshotItem(i);
		node.parentNode.removeChild(node);
	}
}

function processRemainingReplies (context, lowBoundNumber, callback) {
	let maxReplies;

	// 'read more' function in reply mode, process whole new replies
	if (typeof lowBoundNumber == 'number') {
		maxReplies = 0x7fffffff;
	}
	// other: process per chunk
	else {
		lowBoundNumber = -1;
		maxReplies = REST_REPLIES_PROCESS_COUNT;
	}

	timingLogger.reset().startTag(`proccessing remaining replies`, `lowBoundNumber:${lowBoundNumber}`);
	xmlGenerator.remainingReplies(
		context, maxReplies, lowBoundNumber,
		function (xml, index, count, count2) {
			let worked = false;
			let container = getReplyContainer(index);
			if (!container) return worked;

			if (lowBoundNumber < 0) {
				markStatistics.updatePostformView({
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
				let markUpdated = updateMarkedReplies(xml, container, count2 + 1, count);
				let idUpdated = updateReplyIDs(xml, container, count2 + 1, count);
				let sodaneUpdated = updateReplySodanes(xml, container, count2 + 1, count);
				worked = markUpdated || idUpdated || sodaneUpdated;

				xsltProcessor.setParameter(null, 'low_bound_number', lowBoundNumber);
				xsltProcessor.setParameter(null, 'render_mode', 'replies_diff');
			}

			try {
				let f = fixFragment(xsltProcessor.transformToFragment(xml, document));
				if ($qs('.reply-wrap', f)) {
					if (lowBoundNumber >= 0) {
						createRule(container);
					}

					appendFragment(container, f);
					stripTextNodes(container);

					if (lowBoundNumber < 0) {
						worked = true;
					}
				}
			}
			catch (e) {
				console.error(`${APP_NAME}: processRemainingReplies: exception(1), ${e.stack}`);
			}

			return worked;
		},
		function () {
			let newStat;

			timingLogger.startTag('statistics update');

			// reload on reply mode
			if (pageModes[0].mode == 'reply' && lowBoundNumber >= 0) {
				newStat = markStatistics.getStatistics();

				if (newStat.delta.total || newStat.delta.mark || newStat.delta.id) {
					if ($qs('#panel-aside-wrap.run #panel-content-mark:not(.hide)')) {
						markStatistics.updatePanelView(newStat);
					}
					markStatistics.updatePostformView(newStat);

					callback && callback(newStat);

					scrollToNewReplies(() => {
						updateIdFrequency(newStat);
						modifyPage();
					});
				}
				else {
					callback && callback(newStat);
				}
			}

			// first load on summary or reply mode
			else {
				newStat = markStatistics.getStatistics(true);
				if ($qs('#panel-aside-wrap.run #panel-content-mark:not(.hide)')) {
					markStatistics.updatePanelView(newStat);
				}
				markStatistics.updatePostformView(newStat);
				callback && callback(newStat);
				updateIdFrequency(newStat);
				modifyPage();
			}

			timingLogger.endTag();

			timingLogger.forceEndTag();
		}
	);
}

function scrollToNewReplies (callback) {
	const rule = getRule();
	if (!rule) {
		callback && callback();
		return;
	}

	const scrollTop = docScrollTop();
	const distance = rule.nextSibling.getBoundingClientRect().top - Math.floor(viewportRect.height / 2);
	if (distance <= 0) {
		callback && callback();
		return;
	}

	if (document.hidden) {
		window.scrollTo(0, scrollTop + distance);
		callback && callback();
	}
	else {
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
				callback && callback();
			}
		});
	}
}

/*
 * <<<1 functions which handles a thumbnail for posting image
 */

function setPostThumbnailVisibility (visible) { /*returns promise*/
	const thumb = $('post-image-thumbnail-wrap');
	if (!thumb) return Promise.resolve();
	if (!thumb.getAttribute('data-available')) {
		thumb.classList.add('hide');
		return Promise.resolve();
	}

	thumb.classList.remove('hide');

	return delay(0).then(() => {
		// show
		if (visible) {
			thumb.classList.add('run');
			return transitionendp(thumb, 400);
		}

		// hide
		else {
			thumb.classList.remove('run');
			return transitionendp(thumb, 400).then(() => {
				thumb.classList.add('hide');
			});
		}
	});
}

function getThumbnailSize (width, height, maxWidth, maxHeight) {
	if (width > maxWidth || height > maxHeight) {
		var ratio = Math.min(maxWidth / width, maxHeight / height);
		return {
			width: Math.floor(width * ratio + 0.5),
			height: Math.floor(height * ratio + 0.5)
		};
	}
	else {
		return {
			width: width,
			height: height
		};
	}
}

function doDisplayThumbnail (thumbWrap, thumb, media) { /*returns promise*/
	let p = Promise.resolve();

	if (!media) {
		return p;
	}

	if (media instanceof HTMLVideoElement) {
		p = p.then(() => new Promise(resolve => {
			media.addEventListener('timeupdate', () => {
				media.pause();
				resolve();
			}, {once: true});
			media.muted = true;
			media.play();
		}));
	}

	return p.then(() => {
		const containerWidth = Math.min(Math.floor(viewportRect.width / 4 * 0.8), 250);
		const containerHeight = Math.min(Math.floor(viewportRect.width / 4 * 0.8), 250);
		const naturalWidth = media.naturalWidth || media.videoWidth || media.width;
		const naturalHeight = media.naturalHeight || media.videoHeight || media.height;
		const size = getThumbnailSize(
			naturalWidth, naturalHeight,
			containerWidth, containerHeight);

		const canvas = document[CRE]('canvas');
		canvas.width = size.width;
		canvas.height = size.height;

		const c = canvas.getContext('2d');
		c.fillStyle = '#f0e0d6';
		c.fillRect(0, 0, canvas.width, canvas.height);
		c.drawImage(
			media,
			0, 0, naturalWidth, naturalHeight,
			0, 0, canvas.width, canvas.height);

		thumbWrap.classList.add('hide');
		thumb.classList.remove('run');
		thumbWrap.setAttribute('data-available', '2');
		thumb.width = canvas.width;
		thumb.height = canvas.height;
		thumb.src = canvas.toDataURL();

		commands.activatePostForm()
	});
}

function setPostThumbnail (file, caption) { /*returns promise*/
	let thumbWrap = $('post-image-thumbnail-wrap');
	let thumb = $('post-image-thumbnail');

	if (!thumbWrap || !thumb) return Promise.resolve();

	if (!file || 'type' in file && !/^(?:image\/(?:jpeg|png|webp|gif))|video\/(?:webm|mp4)$/.test(file.type)) {
		thumbWrap.removeAttribute('data-available');
		return setPostThumbnailVisibility(false);
	}

	if (file instanceof HTMLCanvasElement
	||  file instanceof HTMLImageElement
	||  file instanceof HTMLVideoElement) {
		$t('post-image-thumbnail-info', caption || `(on demand content)`);
		return doDisplayThumbnail(thumbWrap, thumb, file);
	}
	else {
		$t('post-image-thumbnail-info', `${file.type}, ${getReadableSize(file.size)}`);
		return getImageFrom(file).then(img => doDisplayThumbnail(thumbWrap, thumb, img));
	}
}

/*
 * <<<1 common panel tab handling functions
 */

function showPanel (callback) {
	let panel = $('panel-aside-wrap');

	// hide ad container
	$('ad-aside-wrap').classList.add('hide');

	// if catalog mode, ensure right margin
	if (pageModes[0].mode == 'catalog') {
		Array.from($qsa('#catalog .catalog-threads-wrap > div'))
			.forEach(div => {div.style.marginRight = '24%';});
	}

	if (panel.classList.contains('run')) {
		callback && callback(panel);
	}
	else {
		// show panel container
		setTimeout(() => {panel.classList.add('run')}, 0);
		callback && transitionend(panel, e => {
			callback(panel);
		});
	}
}

function hidePanel (callback) {
	let panel = $('panel-aside-wrap');

	if (panel.classList.contains('run')) {
		setTimeout(() => {panel.classList.remove('run')}, 0);
		transitionend(panel, e => {
			// if catalog mode, restore right margin
			if (pageModes[0].mode == 'catalog') {
				Array.from($qsa('#catalog .catalog-threads-wrap > div'))
					.forEach(div => {div.style.marginRight = '';});
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
	let tabId = /#(.+)/.exec(tab.href);
	if (!tabId) return;
	tabId = tabId[1];

	$qsa('.panel-tab-wrap .panel-tab', 'panel-aside-wrap').forEach(node => {
		node.classList.remove('active');
		if (node.getAttribute('href') == `#${tabId}`) {
			node.classList.add('active');
		}
	});

	$qsa('.panel-content-wrap', 'panel-aside-wrap').forEach(node => {
		node.classList.add('hide');
		if (node.id == `panel-content-${tabId}`) {
			node.classList.remove('hide');
		}
	});
}

/*
 * <<<1 search panel tab handling functions
 */

function searchBase (opts) {
	let query = $('search-text').value;
	if (/^[\s\u3000]*$/.test(query)) {
		return;
	}

	let tester = createQueryCompiler().compile(query);
	if (tester.message) {
		$t('search-result-count', tester.message);
		return;
	}

	let result = $('search-result');
	let matched = 0;
	$('search-guide').classList.add('hide');
	empty(result);

	let nodes = Array.from($qsa(opts.targetNodesSelector));
	if (opts.sort) {
		nodes.sort(opts.sort);
	}

	nodes.forEach(node => {
		let text = [];
		$qsa(opts.targetElementSelector, node).forEach(subNode => {
			let t = opts.getTextContent(subNode);
			t = t.replace(/^\s+|\s+$/g, '');
			text.push(t);
		});
		text = getLegalizedStringForSearch(text.join('\t'));

		if (tester.test(text)) {
			let anchor = result.appendChild(document[CRE]('a'));
			let postNumber = opts.getPostNumber(node);
			anchor.href = '#search-item';
			anchor.setAttribute('data-number', postNumber);
			opts.fillItem(anchor, node);
			matched++;
		}
	});

	$t('search-result-count', `${matched} 件を抽出`);
}

const getLegalizedStringForSearch = (function () {
	const map = {
		// alphabet
		A:'a', B:'b', C:'c', D:'d', E:'e', F:'f', G:'g', H:'h',
		I:'i', J:'j', K:'k', L:'l', M:'m', N:'n', O:'o', P:'p',
		Q:'q', R:'r', S:'s', T:'t', U:'u', V:'v', W:'w', X:'x',
		Y:'y', Z:'z',

		// full width letter but except: ＼
		'　':' ',
		'！':'!', '＂':'"', '＃':'#', '＄':'$', '％':'%', '＆':'&',
		'＇':"'", '（':'(', '）':')', '＊':'*', '＋':'+', '，':',',
		'－':'-', '．':'.', '／':'/', '０':'0', '１':'1', '２':'2',
		'３':'3', '４':'4', '５':'5', '６':'6', '７':'7', '８':'8',
		'９':'9', '：':':', '；':';', '＜':'<', '＝':'=', '＞':'>',
		'？':'?', '＠':'@', 'Ａ':'a', 'Ｂ':'b', 'Ｃ':'c', 'Ｄ':'d',
		'Ｅ':'e', 'Ｆ':'f', 'Ｇ':'g', 'Ｈ':'h', 'Ｉ':'i', 'Ｊ':'j',
		'Ｋ':'k', 'Ｌ':'l', 'Ｍ':'m', 'Ｎ':'n', 'Ｏ':'o', 'Ｐ':'p',
		'Ｑ':'q', 'Ｒ':'r', 'Ｓ':'s', 'Ｔ':'t', 'Ｕ':'u', 'Ｖ':'v',
		'Ｗ':'w', 'Ｘ':'x', 'Ｙ':'u', 'Ｚ':'z', '［':'[', '］':']',
		'＾':'^', '＿':'_', '｀':'`', 'ａ':'a', 'ｂ':'b', 'ｃ':'c',
		'ｄ':'d', 'ｅ':'e', 'ｆ':'f', 'ｇ':'g', 'ｈ':'h', 'ｉ':'i',
		'ｊ':'j', 'ｋ':'k', 'ｌ':'l', 'ｍ':'m', 'ｎ':'n', 'ｏ':'o',
		'ｐ':'p', 'ｑ':'q', 'ｒ':'r', 'ｓ':'s', 'ｔ':'t', 'ｕ':'u',
		'ｖ':'v', 'ｗ':'w', 'ｘ':'x', 'ｙ':'y', 'ｚ':'z', '｛':'{',
		'｜':'|', '｝':'}', '～':'~',

		// half width kana
		'ｱ':'ア',  'ｲ':'イ',  'ｳ':'ウ',  'ｴ':'エ',  'ｵ':'オ',
		                      'ｳﾞ':'ヴ',
		'ｧ':'ァ',  'ｨ':'ィ',  'ｩ':'ゥ',  'ｪ':'ェ',  'ｫ':'ォ',
		'ｶ':'カ',  'ｷ':'キ',  'ｸ':'ク',  'ｹ':'ケ',  'ｺ':'コ',
		'ｶﾞ':'ガ', 'ｷﾞ':'ギ', 'ｸﾞ':'グ', 'ｹﾞ':'ゲ', 'ｺﾞ':'ゴ',
		'ｻ':'サ',  'ｼ':'シ',  'ｽ':'ス',  'ｾ':'セ',  'ｿ':'ソ',
		'ｻﾞ':'ザ', 'ｼﾞ':'ジ', 'ｽﾞ':'ズ', 'ｾﾞ':'ゼ', 'ｿﾞ':'ゾ',
		'ﾀ':'タ',  'ﾁ':'チ',  'ﾂ':'ツ',  'ﾃ':'テ',  'ﾄ':'ト',
		'ﾀﾞ':'ダ', 'ﾁﾞ':'ヂ', 'ﾂﾞ':'ヅ', 'ﾃﾞ':'デ', 'ﾄﾞ':'ド',
		'ｯ':'ッ',
		'ﾅ':'ナ',  'ﾆ':'ニ',  'ﾇ':'ヌ',  'ﾈ':'ネ',  'ﾉ':'ノ',
		'ﾊ':'ハ',  'ﾋ':'ヒ',  'ﾌ':'フ',  'ﾍ':'ヘ',  'ﾎ':'ホ',
		'ﾊﾞ':'バ', 'ﾋﾞ':'ビ', 'ﾌﾞ':'ブ', 'ﾍﾞ':'ベ', 'ﾎﾞ':'ボ',
		'ﾊﾟ':'パ', 'ﾋﾟ':'ピ', 'ﾌﾟ':'プ', 'ﾍﾟ':'ペ', 'ﾎﾟ':'ポ',
		'ﾏ':'マ',  'ﾐ':'ミ',  'ﾑ':'ム',  'ﾒ':'メ',  'ﾓ':'モ',
		'ﾔ':'ヤ',  'ﾕ':'ユ',  'ﾖ':'ヨ',
		'ｬ':'ャ',  'ｭ':'ュ',  'ｮ':'ョ',
		'ﾗ':'ラ',  'ﾘ':'リ',  'ﾙ':'ル',  'ﾚ':'レ',  'ﾛ':'ロ',
		'ﾜ':'ワ',  'ｦ':'ヲ',  'ﾝ':'ン',
		'ﾜ':'ヷ',  'ｦ':'ヺ',

		// half width letter
		'｡':'。',  '､':'、',  '｢':'「',  '｣':'」',  '･':'・', 'ｰ':'ー',
		'ﾞ':'゛',  'ﾟ':'゜'
	};
	const key = new RegExp([
		'[A-Z]',								// alphabet
		'[\u3000\uff01-\uff3b\uff3d-\uff5e]',	// full width letter but except: ＼
		'[\uff66-\uff9d][ﾞﾟ]?',					// half width kana
		'[｡､｢｣･ｰﾞﾟ]'							// half width letter
	].join('|'), 'g');

	return s => ('' + s).replace(key, $0 => {
		// available mapping
		if ($0 in map) {
			return map[$0];
		}
		// kana + voiced mark
		if ($0.substr(-1) == 'ﾞ') {
			return map[$0[0]] + '\\u3099';
		}
		// kana + semi voiced mark
		if ($0.substr(-1) == 'ﾟ') {
			return map[$0[0]] + '\\u309a';
		}
		// MUST NOT REACHED
		return $0;
	});
})();

/*
 * <<<1 application commands
 */

const commands = {

	/*
	 * general functionalities
	 */

	activatePostForm: function () { /*returns promise*/
		catalogPopup.deleteAll();
		$('com').focus();
		const postformWrap = $('postform-wrap');
		postformWrap.classList.add('hover');

		return Promise.all([
			transitionendp(postformWrap, 400),
			setPostThumbnailVisibility(true)
		]);
	},
	deactivatePostForm: function (callback) { /*returns promise*/
		const postformWrap = $('postform-wrap');
		postformWrap.classList.remove('hover');
		document.activeElement.blur();
		document.body.focus();

		return Promise.all([
			transitionendp(postformWrap, 400),
			setPostThumbnailVisibility(false)
		]);
	},
	scrollPage: function (e) {
		let sh = document.documentElement.scrollHeight;
		if (!e.shift && scrollManager.lastScrollTop >= sh - viewportRect.height) {
			commands.invokeMousewheelEvent();
		}
		else if (storage.config.hook_space_key.value) {
			window.scrollBy(
				0, Math.floor(viewportRect.height / 2) * (e.shift ? -1 : 1));
		}
		else {
			return keyManager.PASS_THROUGH;
		}
	},
	invokeMousewheelEvent: function () {
		let view = window[USW] || window;
		let ev = new WheelEvent('wheel', {
			bubbles: true, cancelable: true, view: view,
			detail: 0, deltaX: 0, deltaY: 0, deltaZ: 0
		});
		document.body.dispatchEvent(ev);
	},
	clearUpfile: function () { /*returns promise*/
		resetForm('upfile', 'baseform');
		overrideUpfile = undefined;
		return setPostThumbnail();
	},
	summaryBack: function () {
		let current = $qs('.nav .nav-links .current');
		if (!current || !current.previousSibling) return;
		if (transport.isRapidAccess('reload-summary')) return;
		historyStateWrapper.pushState(current.previousSibling.href);
	},
	summaryNext: function () {
		let current = $qs('.nav .nav-links .current');
		if (!current || !current.nextSibling) return;
		if (transport.isRapidAccess('reload-summary')) return;
		historyStateWrapper.pushState(current.nextSibling.href);
	},
	clearCredentials: function (e, t) { /*returns promise*/
		const content = t.textContent;
		t.disabled = true;
		$t(t, '処理中...');
		return sendToBackend('clear-credentials', {
			schemes: ['dropbox', 'googledrive', 'onedrive']
		})
			.then(() => delay(1000))
			.then(() => {
				$t(t, content);
				t.disabled = false;
			});
	},

	/*
	 * reload/post
	 */

	reload: function (...args) { /*returns promise*/
		switch (pageModes[0].mode) {
		case 'summary':
			return commands.reloadSummary.apply(commands, args);
		case 'reply':
			{
				const now = Date.now();
				if (now - reloadStatus.lastReloaded < storage.config.full_reload_interval.value * 1000 * 60) {
					return commands.reloadRepliesViaAPI.apply(commands, args);
				}
				else {
					reloadStatus.lastReloaded = now;
					return commands.reloadReplies.apply(commands, args);
				}
			}
		case 'catalog':
			return commands.reloadCatalog.apply(commands, args);
		default:
			throw new Error(`Unknown page mode: ${pageModes[0].mode}`);
		}
	},
	reloadFull: function () {
		if (pageModes[0].mode == 'reply') {
			return commands.reloadReplies();
		}
		else {
			return commands.reload();
		}
	},
	reloadDelta: function () {
		if (pageModes[0].mode == 'reply') {
			return commands.reloadRepliesViaAPI();
		}
		else {
			return commands.reload();
		}
	},
	reloadSummary: function () { /*returns promise*/
		const TRANSPORT_TYPE = 'reload-summary';

		let content = $('content');
		let indicator = $('content-loading-indicator');
		let footer = $('footer');

		if (transport.isRunning(TRANSPORT_TYPE)) {
			transport.abort(TRANSPORT_TYPE);
			indicator.classList.add('error');
			$t(indicator, '中断しました');
			return Promise.resolve();
		}

		if (transport.isRapidAccess(TRANSPORT_TYPE)) {
			return Promise.resolve();
		}

		if (pageModes[0].mode != 'summary') {
			return Promise.resolve();
		}

		$t(indicator, '読み込み中です。ちょっとまってね。');
		content.style.height = content.offsetHeight + 'px';
		content.classList.add('init');
		indicator.classList.remove('hide');
		indicator.classList.remove('error');
		footer.classList.add('hide');

		return Promise.all([
			transitionendp(content, 400),
			reloadBase(TRANSPORT_TYPE)
		]).then(data => {
			const [transitionResult, reloadResult] = data;
			const {doc, now, status} = reloadResult;

			let fragment;
			reloadStatus.lastStatus = status;

			switch (status) {
			case 304:
				window.scrollTo(0, 0);
				return delay(WAIT_AFTER_RELOAD).then(() => {
					footer.classList.remove('hide');
					content.classList.remove('init');
					content = indicator = null;
					timingLogger.endTag();
				});
			}

			if (!doc) {
				throw new Error(`内容が変だよ (${status})`);
			}

			timingLogger.startTag('generate internal xml');
			try {
				timingLogger.startTag('generate');
				let xml = xmlGenerator.run(doc.documentElement[IHTML]).xml;
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
			return delay(Math.max(0, WAIT_AFTER_RELOAD - (Date.now() - now)))
			.then(() => {
				timingLogger.endTag();

				timingLogger.startTag('appending the contents');
				empty(content);
				window.scrollTo(0, 0);
				content.style.height = '';
				appendFragment(content, fragment);
				fragment = null;
				timingLogger.endTag();

				timingLogger.startTag('transition');
				content.classList.remove('init');
				return transitionendp(content, 400);
			})
			.then(() => {
				timingLogger.endTag();

				footer.classList.remove('hide');
				content = indicator = footer = null;
				modifyPage();
				sendToBackend(
					'notify-viewers',
					{
						data: $('viewers').textContent - 0,
						siteInfo: siteInfo
					});

				timingLogger.forceEndTag();
			});
		})
		.catch(err => {
			footer.classList.remove('hide');
			indicator.classList.add('error');
			$t(indicator, err.message);
			console.error(`${APP_NAME}: reloadSummary failed: ${err.stack}`);
		})
		.finally(() => {
			transport.release(TRANSPORT_TYPE);
		});
	},
	reloadReplies: function () {
		const TRANSPORT_TYPE = 'reload-replies';

		if (transport.isRunning(TRANSPORT_TYPE)) {
			transport.abort(TRANSPORT_TYPE);
			setReloaderStatus('中断しました');
			return Promise.resolve();
		}

		if (transport.isRapidAccess(TRANSPORT_TYPE)) {
			return Promise.resolve();
		}

		if (pageModes[0].mode != 'reply') {
			return Promise.resolve();
		}

		timingLogger.reset().startTag('reloading replies');
		setBottomStatus('読み込み中...', true);
		removeRule();
		markStatistics.resetPostformView();
		reloadStatus.lastRepliesCount = getRepliesCount();
		dumpDebugText();

		return reloadBase(TRANSPORT_TYPE)
		.then(reloadResult => {
			const {doc, now, status} = reloadResult;

			let result;
			reloadStatus.lastStatus = status;

			switch (status) {
			case 404:
				setReloaderStatus();
				setBottomStatus('完了: 404 Not Found');
				$t('expires-remains', '-');
				$t('pf-expires-remains', '-');
				$t('reload-anchor', 'Not Found. ファイルがないよ。');
				timingLogger.forceEndTag();
				return;
			case 304:
				setReloaderStatus('更新なし');
				setBottomStatus('完了: フルリロード, 304 Not Modified');
				timingLogger.forceEndTag();
				return;
			case /^5[0-9]{2}$/.test(status) && status:
				setReloaderStatus(`サーバエラー`);
				setBottomStatus(`完了: フルリロード, サーバエラー ${status}`);
				timingLogger.forceEndTag();

				return;
			}

			if (!doc) {
				throw new Error(`内容が変だよ (${status})`);
			}

			// process topic block

			setBottomStatus('処理中...', true);

			timingLogger.startTag('generate internal xml for topic block');
			try {
				timingLogger.startTag('generate');
				result = xmlGenerator.run(doc.documentElement[IHTML], 0);
				timingLogger.endTag();

				timingLogger.startTag('applying data bindings');
				applyDataBindings(result.xml);
				timingLogger.endTag();

				timingLogger.startTag('update topic mark,id,sodane');
				updateMarkedTopic(result.xml, document);
				updateTopicID(result.xml, document);
				updateTopicSodane(result.xml, document);
				timingLogger.endTag();
			}
			finally {
				timingLogger.endTag();
			}

			// process replies block

			sendToBackend(
				'notify-viewers',
				{
					viewers: $qs('meta viewers', result.xml).textContent - 0,
					siteInfo: siteInfo
				});

			timingLogger.forceEndTag();

			// process remaiing replies
			processRemainingReplies(
				result.remainingRepliesContext,
				getLastReplyNumber(),
				newStat => {
					const message = newStat.delta.total ?
						`新着 ${newStat.delta.total} レス` :
						'新着レスなし';
					setReloaderStatus(message);

					const bottomMessage = [
						`完了: ${reloadStatus.size('lastReceivedCompressedBytes')} (フル)`,
						`, 計 ${reloadStatus.size('totalReceivedCompressedBytes')}`
					].join('');
					setBottomStatus(bottomMessage);
					//console.log(bottomMessage);
				}
			);
		})
		.catch(err => {
			setReloaderStatus(err.message, true);
			setBottomStatus(err.message);
			timingLogger.forceEndTag();
			console.error(`${APP_NAME}: reloadReplies failed: ${err.stack}`);
		})
		.finally(() => {
			transport.release(TRANSPORT_TYPE);

			if ('noticeNew' in siteInfo) {
				if (siteInfo.notice == siteInfo.noticeNew) {
					delete siteInfo.noticeNew;
				}
				else {
					if (siteInfo.notice != '') {
						detectNoticeModification(siteInfo.notice, siteInfo.noticeNew);
						commands.activateNoticeTab();
						window.alert('注意書きが更新されたみたいです。');
					}
					chrome.storage.sync.get({notices:{}}, result => {
						if (chrome.runtime.lastError) {
							console.error(`${APP_NAME}: reloadReplies(finally block): ${chrome.runtime.lastError.message}`);
						}
						else {
							result.notices[`${siteInfo.server}/${siteInfo.board}`] = siteInfo.noticeNew;
							storage.set(result);
						}

						siteInfo.notice = siteInfo.noticeNew;
						delete siteInfo.noticeNew;
					});
				}
			}
		});
	},
	reloadRepliesViaAPI: function (skipHead) {
		const TRANSPORT_MAIN_TYPE = 'reload-replies';
		const TRANSPORT_SUB_TYPE = 'reload-replies-api';

		if (transport.isRunning(TRANSPORT_MAIN_TYPE)) {
			transport.abort(TRANSPORT_MAIN_TYPE);
			setReloaderStatus('中断しました');
			return Promise.resolve();
		}

		if (transport.isRapidAccess(TRANSPORT_MAIN_TYPE)) {
			return Promise.resolve();
		}

		if (pageModes[0].mode != 'reply') {
			return Promise.resolve();
		}

		timingLogger.reset().startTag('reloading replies via API');
		setBottomStatus('読み込み中...', true);
		removeRule();
		markStatistics.resetPostformView();
		reloadStatus.lastRepliesCount = getRepliesCount();
		dumpDebugText();

		let p;
		if (skipHead) {
			p = Promise.resolve({
				doc: null,
				now: Date.now(),
				status: 200
			});
		}
		else {
			p = reloadBase(TRANSPORT_MAIN_TYPE, {method: 'head'});
		}

		return p.then(reloadResult => {
			const {doc, now, status} = reloadResult;

			reloadStatus.lastStatus = status;

			switch (status) {
			case 404:
				setReloaderStatus();
				setBottomStatus('完了: 404 Not Found');
				$t('expires-remains', '-');
				$t('pf-expires-remains', '-');
				$t('reload-anchor', 'Not Found. ファイルがないよ。');
				timingLogger.forceEndTag();
				return;
			case 304:
				setReloaderStatus('更新なし');
				setBottomStatus('完了: 差分リロード, 304 Not Modified');
				timingLogger.forceEndTag();
				return;
			case /^5[0-9]{2}$/.test(status) && status:
				setReloaderStatus(`サーバエラー`);
				setBottomStatus(`完了: 差分リロード, サーバエラー ${status}`);
				timingLogger.forceEndTag();
				return;
			}

			return reloadBaseViaAPI('')
			.then(reloadResult => {
				const {doc, now, status} = reloadResult;
				const result = xmlGenerator.runFromJson(doc, $qs('article .replies').childElementCount);

				xsltProcessor.setParameter(null, 'render_mode', 'replies');
				const container = getReplyContainer();
				const fragment = fixFragment(xsltProcessor.transformToFragment(result.xml, document));

				if ($qs('.reply-wrap', fragment)) {
					createRule(container);
					appendFragment(container, fragment);
					stripTextNodes(container);

					const newStat = markStatistics.getStatistics();
					if ($qs('#panel-aside-wrap.run #panel-content-mark:not(.hide)')) {
						markStatistics.updatePanelView(newStat);
					}
					markStatistics.updatePostformView(newStat);

					const message = `新着 ${newStat.delta.total} レス`;
					setReloaderStatus(message);

					const bottomMessage = [
						`完了: ${reloadStatus.size('lastReceivedCompressedBytes')} (差分)`,
						`, 計 ${reloadStatus.size('totalReceivedCompressedBytes')}`
					].join('');
					setBottomStatus(bottomMessage);
					//console.log(bottomMessage);

					scrollToNewReplies(() => {
						updateIdFrequency(newStat);
						updateSodanesViaAPI(doc.sd);
						modifyPage();
						timingLogger.forceEndTag();
					});
				}
				else {
					const message = '新着レスなし';
					setReloaderStatus(message);

					const bottomMessage = [
						`完了: ${reloadStatus.size('lastReceivedCompressedBytes')} (差分)`,
						`, 計 ${reloadStatus.size('totalReceivedCompressedBytes')}`
					].join('');
					setBottomStatus(bottomMessage);
					//console.log(bottomMessage);

					timingLogger.forceEndTag();
				}
			});
		})
		.catch(err => {
			setReloaderStatus(err.message, true);
			setBottomStatus(err.message);
			timingLogger.forceEndTag();
			console.error(`${APP_NAME}: reloadRepliesViaAPI failed: ${err.stack}`);
		})
		.finally(() => {
			transport.release(TRANSPORT_MAIN_TYPE);
			transport.release(TRANSPORT_SUB_TYPE);
		});
	},
	reloadCatalog: function () { /*returns promise*/
		const TRANSPORT_MAIN_TYPE = 'reload-catalog-main';
		const TRANSPORT_SUB_TYPE = 'reload-catalog-sub';

		const sortMap = {
			'#catalog-order-default': {n:0, key:'default'},
			'#catalog-order-new': {n:1, key:'new'},
			'#catalog-order-old': {n:2, key:'old'},
			'#catalog-order-most': {n:3, key:'most'},
			'#catalog-order-less': {n:4, key:'less'},
			'#catalog-order-hist': {n:9, key:'hist'}
		};

		let p = $qs('#catalog .catalog-options a.active');
		let sortType = sortMap[p ? p.getAttribute('href') : '#catalog-order-default'];
		let wrap = $(`catalog-threads-wrap-${sortType.key}`);

		if (transport.isRunning(TRANSPORT_MAIN_TYPE)
		||  transport.isRunning(TRANSPORT_SUB_TYPE)) {
			transport.abort(TRANSPORT_MAIN_TYPE);
			transport.abort(TRANSPORT_SUB_TYPE);
			wrap.classList.remove('run');
			setBottomStatus('中断しました');
			return Promise.resolve();
		}

		if (transport.isRapidAccess(TRANSPORT_MAIN_TYPE)) {
			return Promise.resolve();
		}

		if (pageModes[0].mode != 'catalog') {
			return Promise.resolve();
		}

		// update catalog settings
		if (!wrap.firstChild) {
			let currentCs = getCatalogSettings();
			$('catalog-horz-number').value = currentCs[0];
			$('catalog-vert-number').value = currentCs[1];
			$('catalog-with-text').checked = currentCs[2] > 0;
		}

		commands.updateCatalogSettings({
			x: $('catalog-horz-number').value,
			y: $('catalog-vert-number').value,
			text: $('catalog-with-text').checked ? storage.config.catalog_text_max_length.value : 0
		});

		setBottomStatus('読み込み中...', true);
		catalogPopup.deleteAll();
		wrap.classList.add('run');

		return Promise.all([
			transitionendp(wrap, 300),
			reloadCatalogBase(TRANSPORT_MAIN_TYPE, sortType ? `&sort=${sortType.n}` : ''),
			reloadBase(TRANSPORT_SUB_TYPE),
			urlStorage.getAll()
		]).then(data => {
			const [transitionResult, reloadResult, summaryReloadResult, openedThreads] = data;
			const {doc, now, status} = reloadResult;

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
					img.src = restoreDistributedImageURL(
						storage.config.catalog_thumbnail_scale.value >= 1.5 ?
							value.replace('/cat/', '/thumb/') : value);
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
			const horzActual = $qsa('table[align="center"] tr:first-child td', doc).length;
			const vertActual = $qsa('table[align="center"] tr', doc).length;
			const currentCs = getCatalogSettings();
			const newIndicator = wrap.childNodes.length ? 'new' : '';
			const newClass = wrap.childNodes.length ? 'new' : '';

			let insertee = wrap.firstChild;

			if (horzActual == 0) {
				// invalid width of catalog: it may be that futaba server has stopped
				// and the CDN(CloudFlare) has returnd an error page.
				console.error(`${APP_NAME}: failed to retrieve catalog content: ${doc.title}`);
			}
			else {
				wrap.style.maxWidth = ((anchorWidth + CATALOG_ANCHOR_MARGIN) * horzActual) + 'px';
			}

			/*
			 * traverse all anchors in new catalog
			 */

			$qsa('table[align="center"] td a', doc).forEach(node => {
				let threadNumber = /(\d+)\.htm/.exec(node.getAttribute('href'));
				if (!threadNumber) return;

				let repliesCount = 0, from, to;

				threadNumber = threadNumber[1] - 0;

				// number of replies
				from = $qs('font', node.parentNode);
				if (from) {
					repliesCount = from.textContent - 0;
				}

				// find anchor already exists
				let anchor = $(`c-${sortType.key}-${threadNumber}`);
				if (anchor) {
					// found. reuse it
					if (anchor == insertee) {
						insertee = insertee.nextSibling;
					}
					anchor.parentNode.insertBefore(anchor, insertee);

					// update reply number and class name
					let info = $qs('.info', anchor);
					let oldRepliesCount = info.firstChild.textContent - 0;
					info.firstChild.textContent = repliesCount;
					if (repliesCount != oldRepliesCount) {
						anchor.className = repliesCount > CATALOG_LONG_CLASS_THRESHOLD ? 'long' : '';
						info.lastChild.textContent =
							(repliesCount > oldRepliesCount ? '+' : '') +
							(repliesCount - oldRepliesCount);
					}
					else {
						anchor.className = '';
						info.lastChild.textContent = '';
					}

					return;
				}

				// not found. create new one
				anchor = wrap.insertBefore(document[CRE]('a'), insertee);
				anchor.id = `c-${sortType.key}-${threadNumber}`;
				anchor.setAttribute('data-number', `${threadNumber},0`);
				anchor.style.width = anchorWidth + 'px';
				anchor.className = newClass;

				// image
				let imageWrap = anchor.appendChild(document[CRE]('div'));
				imageWrap.className = 'image';
				imageWrap.style.height = cellImageHeight + 'px';

				// attribute conversion #1
				for (let atr in attributeConverter1) {
					let value = node.getAttribute(atr);
					if (value == null) continue;
					attributeConverter1[atr](anchor, atr, value);
				}

				from = $qs('img', node);
				if (from) {
					to = imageWrap.appendChild(document[CRE]('img'));

					// attribute conversion #2
					for (let atr in attributeConverter2) {
						let value = from.getAttribute(atr);
						if (value == null) continue;
						attributeConverter2[atr](to, imageWrap, atr, value);
					}

					let imageNumber = /(\d+)s\.jpg/.exec(to.src)[1];
					anchor.setAttribute('data-number', `${threadNumber},${imageNumber}`);
				}

				// text
				from = $qs('small', node.parentNode);
				if (from) {
					to = anchor.appendChild(document[CRE]('div'));
					to.className = 'text';
					to.textContent = getTextForCatalog(
						from.textContent.replace(/\u2501.*\u2501\s*!+/, '\u2501!!'), 4);
					to.setAttribute('data-text', from.textContent);
					if (/^>/.test(from.textContent)) {
						to.classList.add('quote');
					}
				}

				to = anchor.appendChild(document[CRE]('div'));
				to.className = 'info';
				to.appendChild(document[CRE]('span')).textContent = repliesCount;
				to.appendChild(document[CRE]('span')).textContent = newIndicator;
			});

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
						let [threadNumber, imageNumber] = insertee.getAttribute('data-number').split(',');
						threadNumber -= 0;
						imageNumber -= 0;

						let isDead = false;
						if (siteInfo.minThreadLifeTime == 0) {
							if (threadNumber < deleteLimit) {
								isDead = true;
							}
						}
						else {
							if (imageNumber == 0) {
								if (threadNumber < deleteLimit) {
									isDead = true;	// TODO: text-only thread may be considered to be dead even
													// though it is alive
								}
							}
							else {
								// treat imageNumber as the birth time of thread
								let age = now - imageNumber;
								if (threadNumber < deleteLimit && age > siteInfo.minThreadLifeTime) {
									isDead = true;
								}
							}
						}

						if (isDead) {
							let tmp = insertee.nextSibling;
							insertee.parentNode.removeChild(insertee);
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
						let [threadNumber, imageNumber] = node.getAttribute('data-number').split(',');

						if (threadNumber in openedThreads) {
							node.classList.add('soft-visited');
						}

						threadNumber -= 0;
						imageNumber -= 0;

						let isAdult = imageNumber > 0 && now - imageNumber >= siteInfo.minThreadLifeTime;

						if (threadNumber < warnLimit
						&& (siteInfo.minThreadLifeTime == 0 || imageNumber == 0 || isAdult)) {
							node.classList.add('warned');
						}
					}
				}
				break;
			// new, most, less, hist
			default:
				{
					while (insertee) {
						let tmp = insertee.nextSibling;
						insertee.parentNode.removeChild(insertee);
						insertee = tmp;
					}

					for (let node = wrap.firstChild; node; node = node.nextSibling) {
						let [threadNumber, imageNumber] = node.getAttribute('data-number').split(',');
						threadNumber -= 0;
						imageNumber -= 0;

						if (threadNumber in openedThreads) {
							node.classList.add('soft-visited');
						}
					}
				}
				break;
			}

			let activePanel = $qs('#panel-aside-wrap:not(.hide) .panel-tab.active');
			if (activePanel && /#search/.test(activePanel.href)) {
				commands.searchCatalog();
			}

			wrap.classList.remove('run');
			setBottomStatus('完了');
			window.scrollTo(0, 0);
		})
		.catch(err => {
			wrap.classList.remove('run');
			setBottomStatus('カタログの読み込みに失敗しました');
			console.error(`${APP_NAME}: reloadCatalog failed: ${err.stack}`);
		})
		.finally(() => {
			transport.release(TRANSPORT_MAIN_TYPE);
			transport.release(TRANSPORT_SUB_TYPE);
		});
	},
	post: function () { /*returns promise*/
		const TRANSPORT_TYPE = 'post';

		if (transport.isRunning(TRANSPORT_TYPE)) {
			transport.abort(TRANSPORT_TYPE);
			setBottomStatus('中断しました');
			registerReleaseFormLock();
			return Promise.resolve();
		}

		if (transport.isRapidAccess(TRANSPORT_TYPE)) {
			return Promise.resolve();
		}

		setBottomStatus('投稿中...');
		$qs('fieldset', 'postform').disabled = true;

		return postBase(TRANSPORT_TYPE, $('postform')).then(response => {
			if (!response) {
				throw new Error('サーバからの応答が変です');
			}

			response = response.replace(/\r\n|\r|\n/g, '\t');
			if (/warning/i.test(response)) {
				console.info(
					`${APP_NAME}: ` +
					`warning in response: ${response.replace(/.{1,72}/g, '$&\n')}`);
			}

			const baseUrl = `${location.protocol}//${location.host}/${siteInfo.board}/`;
			const result = parsePostResponse(response, baseUrl);

			if (result.error) {
				throw new Error(`サーバからの応答が変です (${result.error})`);
			}

			if (result.redirect) {
				return delay(WAIT_AFTER_POST).then(() => {
					commands.deactivatePostForm();
					setPostThumbnail();
					resetForm('com', 'com2', 'upfile', 'textonly', 'baseform');
					overrideUpfile = undefined;
					setBottomStatus('投稿完了');

					let actualPageMode = pageModes[0].mode;
					if (actualPageMode == 'reply' && $('post-switch-thread').checked) {
						actualPageMode = 'summary';
					}

					switch (actualPageMode) {
					case 'summary':
					case 'catalog':
						if (result.redirect != '') {
							sendToBackend('open', {
								url: result.redirect,
								selfUrl: window.location.href
							});
						}
						if ($('post-switch-reply')) {
							$('post-switch-reply').click();
						}
						break;
					case 'reply':
						if (storage.config.full_reload_after_post.value) {
							reloadStatus.lastReloaded = Date.now();
							return commands.reloadReplies().then(() => {
								return autoTracker.afterPost();
							});
						}
						else {
							return commands.reload(true).then(() => {
								return autoTracker.afterPost();
							});
						}
					}
				});
			}
		})
		.catch(err => {
			setBottomStatus('投稿が失敗しました');
			console.error(`${APP_NAME}: post failed: ${err.stack}`);
			window.alert(err.message);
		})
		.finally(() => {
			registerReleaseFormLock();
			transport.release(TRANSPORT_TYPE);
		});
	},
	sodane: function (e, t) {
		if (!t) return;
		if (t.getAttribute('data-busy')) return;

		let postNumber = getPostNumber(t);
		if (!postNumber) return;

		t.setAttribute('data-busy', '1');
		t.setAttribute('data-text', t.textContent);
		t.textContent = '...';

		let url = `${location.protocol}//${location.host}/sd.php?${siteInfo.board}.${postNumber}`
		let xhr = transport.create();
		xhr.open('GET', url);
		xhr.onload = () => {
			setTimeout(newSodaneValue => {
				if (newSodaneValue - 0) {
					$t(t, `そうだね × ${newSodaneValue}`);
					t.classList.remove('sodane-null');
					t.classList.add('sodane');
				}
				else {
					$t(t, '＋');
					t.classList.add('sodane-null');
					t.classList.remove('sodane');
				}

				t.removeAttribute('data-busy');
				t.removeAttribute('data-text');
				t = null;
			}, WAIT_AFTER_POST, parseInt(xhr.responseText, 10) || 0);
		};
		xhr.onerror = () => {
			$t(t, 'なんかエラー');
			setTimeout(() => {
				$t(t, t.getAttribute('data-text'));
				t.removeAttribute('data-busy');
				t.removeAttribute('data-text');
				t = null;
			}, WAIT_AFTER_POST);
		};
		xhr.onloadend = () => {
			xhr = null;
		};
		xhr.setRequestHeader('X-Requested-With', `${APP_NAME}/${version}`);
		xhr.send();
	},
	saveImage: function (e, t) { /*returns promise*/
		if (t.getAttribute('data-original-text')) return;

		let href = t.getAttribute('data-href') || t.href;
		let f = getImageName(href, t);
		if (f == undefined || f == '') return;

		let id = t.id;
		if (!id) {
			do {
				id = 'save-image-anchor-' +
					(Math.floor(Math.random() * 0x10000)).toString(16);
			} while ($(id));

			t.setAttribute('id', id);
		}

		t.setAttribute('data-original-text', t.textContent);
		$t(t, '保存中...');

		return sendToBackend('save-image', {
			url: href,
			path: storage.config.storage.value + ':' + f,
			mimeType: getImageMimeType(href),
			anchorId: id
		});
	},

	/*
	 * dialogs
	 */

	openDeleteDialog: () => {
		modalDialog({
			title: '記事削除',
			buttons: 'ok, cancel',
			oninit: dialog => {
				let xml = document.implementation.createDocument(null, 'dialog', null);
				let checksNode = xml.documentElement.appendChild(xml[CRE]('checks'));
				$qsa('article input[type="checkbox"]:checked').forEach(node => {
					checksNode.appendChild(xml[CRE]('check')).textContent = getPostNumber(node);
				});
				xml.documentElement.appendChild(xml[CRE]('delete-key')).textContent =
					getCookie('pwdc')
				dialog.initFromXML(xml, 'delete-dialog');
			},
			onopen: dialog => {
				let deleteKey = $qs('.delete-key', dialog.content);
				if (deleteKey) {
					deleteKey.focus();
				}
				else {
					dialog.initButtons('cancel');
				}
			},
			onok: dialog => {
				const TRANSPORT_TYPE = 'delete';

				let form = $qs('form', dialog.content);
				let status = $qs('.delete-status', dialog.content);
				if (!form || !status) return;

				if (transport.isRunning(TRANSPORT_TYPE)) {
					transport.abort(TRANSPORT_TYPE);
					$t(status, '中断しました。');
					dialog.isPending = false;
					return false;
				}

				if (transport.isRapidAccess(TRANSPORT_TYPE)) {
					$t(status, 'ちょっと待ってね。');
					dialog.isPending = false;
					return false;
				}

				form.action = `/${siteInfo.board}/futaba.php`;
				$t(status, '削除をリクエストしています...');
				dialog.isPending = true;
				postBase(TRANSPORT_TYPE, form).then(response => {
					response = response.replace(/\r\n|\r|\n/g, '\t');
					let result = parsePostResponse(response);

					if (!result.redirect) {
						throw new Error(result.error || 'なんかエラー？');
					}

					$t(status, 'リクエストに成功しました');

					$qsa('article input[type="checkbox"]:checked').forEach(node => {
						node.checked = false;
					});

					return delay(WAIT_AFTER_POST).then(() => {
						dialog.isPending = false;
						dialog.close();
					});
				})
				.catch(err => {
					console.error(`${APP_NAME}: delete failed: ${err.stack}`);
					$t(status, err.message);
					dialog.enableButtons();
				})
				.finally(() => {
					dialog.isPending = false;
					form = status = dialog = null;
					transport.release(TRANSPORT_TYPE);
				});
			}
		});
	},
	openConfigDialog: () => {
		modalDialog({
			title: '設定',
			buttons: 'ok, cancel',
			oninit: dialog => {
				let xml = document.implementation.createDocument(null, 'dialog', null);
				let itemsNode = xml.documentElement.appendChild(xml[CRE]('items'));
				itemsNode.setAttribute('prefix', 'config-item.');

				let config = storage.config;
				let f = IDEOGRAPH_CONVERSION_UI ?
					新字体の漢字を舊字體に変換 : s => s;
				for (let i in config) {
					let item = itemsNode.appendChild(xml[CRE]('item'));
					item.setAttribute('internal', i);
					item.setAttribute('name', f(config[i].name));
					item.setAttribute('value', config[i].value);
					item.setAttribute('type', config[i].type);
					'desc' in config[i] && item.setAttribute('desc', f(config[i].desc));
					'min' in config[i] && item.setAttribute('min', config[i].min);
					'max' in config[i] && item.setAttribute('max', config[i].max);

					if ('list' in config[i]) {
						for (let j in config[i].list) {
							let li = item.appendChild(xml[CRE]('li'));
							li.textContent = f(config[i].list[j]);
							li.setAttribute('value', j);
							j == config[i].value && li.setAttribute('selected', 'true');
						}
					}
				}
				dialog.initFromXML(xml, 'config-dialog');

				setTimeout(() => {
					// special element for mouse wheel unit
					let wheelUnit = $qs('input[name="config-item.wheel_reload_unit_size"]');
					if (wheelUnit) {
						let span = wheelUnit.parentNode.insertBefore(
							document[CRE]('span'), wheelUnit.nextSibling);
						span.id = 'wheel-indicator';
						wheelUnit.addEventListener('wheel', e => {
							$('wheel-indicator').textContent = `移動量: ${e.deltaY}`;
							e.preventDefault();
						});
					}
				}, 100);
			},
			onok: dialog => {
				let storageData = {};
				populateTextFormItems(dialog.content, item => {
					let name = item.name.replace(/^config-item\./, '');
					let value = item.value;

					if (item.nodeName == 'INPUT') {
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
				applyDataBindings(xmlGenerator.run('').xml);
			}
		});
	},
	openModerateDialog: (e, anchor) => {
		if (!anchor || anchor.getAttribute('data-busy')) return;

		let postNumber = getPostNumber(anchor);
		if (!postNumber) return;

		anchor.setAttribute('data-busy', '1');

		let baseUrl = `${location.protocol}//${location.host}/`;
		let moderatorUrl = `${baseUrl}del.php?b=${siteInfo.board}&d=${getPostNumber(anchor)}`;
		let xhr = transport.create();
		xhr.open('GET', moderatorUrl);
		xhr.overrideMimeType(`text/html;charset=${FUTABA_CHARSET}`);
		xhr.onload = () => {
			anchor.removeAttribute('data-busy');

			if (xhr.status < 200 || xhr.status >= 300) return;

			let doc = getDOMFromString(
				IDEOGRAPH_CONVERSION_UI ?
					新字体の漢字を舊字體に変換(xhr.responseText) :
					xhr.responseText);

			modalDialog({
				title: 'del の申請',
				buttons: 'ok, cancel',
				oninit: dialog => {
					let xml = document.implementation.createDocument(null, 'dialog', null);
					dialog.initFromXML(xml, 'moderate-dialog');
				},
				onopen: dialog => {
					let moderateTarget = $qs('.moderate-target', dialog.content);
					if (moderateTarget) {
						let wrapElement = getWrapElement(anchor);
						if (wrapElement) {
							wrapElement = wrapElement.cloneNode(true);
							// replace anchors to text
							$qsa('a', wrapElement).forEach(node => {
								node.parentNode.replaceChild(
									document.createTextNode(node.textContent),
									node);
							});
							// TODO: strip external contents such as youtube, tweet
							moderateTarget.appendChild(wrapElement);
						}
					}

					let form = $qs('form[method="POST"]', doc);
					let moderateList = $qs('.moderate-form', dialog.content);
					if (form && moderateList) {
						form = form.cloneNode(true);

						form.action = resolveRelativePath(form.getAttribute('action'), baseUrl);
						// strip submit buttons
						$qsa('input[type="submit"]', form).forEach(node => {
							node.parentNode.removeChild(node);
						});

						// strip tab borders
						$qsa('table[border]', form).forEach(node => {
							node.removeAttribute('border');
						});

						// make reason-text clickable
						$qsa('input[type="radio"][name="reason"]', form).forEach(node => {
							let r = node.ownerDocument.createRange();
							let label = node.ownerDocument[CRE]('label');
							r.setStartBefore(node);
							r.setEndAfter(node.nextSibling);
							r.surroundContents(label);
						});

						// select last used reason, if available
						if (storage.runtime.del.lastReason) {
							let node = $qs(`input[type="radio"][value="${storage.runtime.del.lastReason}"`, form);
							if (node) {
								node.checked = true;
							}
						}

						moderateList.appendChild(form);
					}
				},
				onok: dialog => {
					const TRANSPORT_TYPE = 'moderate';
					let form = $qs('form', dialog.content);
					if (!form) return;

					form = form.cloneNode(true);

					$qsa('input[type="radio"]:checked', form).forEach(node => {
						storage.runtime.del.lastReason = node.value;
						storage.saveRuntime();
					});

					const no = $qs('input[name="d"]', form).value;
					moderatePromise = moderatePromise.then(() => {
						return postBase(TRANSPORT_TYPE, form).then(response => {
							response = response.replace(/\r\n|\r|\n/g, '\t');
							const result = parseModerateResponse(response);

							if (!result.registered) {
								throw new Error(result.error || 'なんかエラー？');
							}

							console.log(`${APP_NAME}: moderation for No.${no} completed.`);
						})
						.catch(err => {
							console.error(`${APP_NAME}: moderation for No.${no} failed: ${err.stack}`);
						})
						.finally(() => {
							const target = $qs([
								`article .topic-wrap[data-number="${no}"]`,
								`article .reply-wrap > [data-number="${no}"]`
							].join(','));
							const delLink = $qs('.del', target);
							if (delLink) {
								delLink.classList.add('posted');
								delLink.setAttribute('title', 'del済み');
							}

							form = null;
							transport.release(TRANSPORT_TYPE);
						});
					})
					.then(() => delay(1000 * 10));
				}
			});
		};
		xhr.onerror = () => {
			anchor.removeAttribute('data-busy');
		};
		xhr.onloadend = () => {
			xhr = null;
		};
		xhr.setRequestHeader('X-Requested-With', `${APP_NAME}/${version}`);
		xhr.send();
	},
	openHelpDialog: (e, anchor) => {
		modalDialog({
			title: 'キーボード ショートカット',
			buttons: 'ok',
			oninit: dialog => {
				let xml = document.implementation.createDocument(null, 'dialog', null);
				dialog.initFromXML(xml, 'help-dialog');
			}
		});
	},
	openDrawDialog: (e, anchor) => {
		function runMomocan () {
			let momocan = Akahuku.momocan.create({
				onmarkup: markup => {
					const imagePath = chrome.runtime.getURL('/images/momo/');
					return markup
						.replace(/\/\/dev\.appsweets\.net\/momo\//g, imagePath)
						.replace(/\/@version@/g, '');
				},
				onok: canvas => {
					getBlobFrom(canvas).then(blob => {
						if (pageModes[0].mode == 'summary' || pageModes[0].mode == 'catalog') {
							overrideUpfile = {
								name: 'tegaki.png',
								data: blob
							};
						}
						else {
							const baseform = document.getElementsByName('baseform')[0];
							if (baseform) {
								baseform.value = canvas.toDataURL().replace(/^[^,]+,/, '');
							}
						}
						resetForm('upfile', 'textonly');
						return setPostThumbnail(canvas, '手書き');
					});
				},
				oncancel: () => {
				},
				onclose: () => {
					momocan = null;
				}
			});

			momocan.start();
		}

		if ($('momocan-container')) {
			runMomocan();
		}
		else {
			const style = chrome.runtime.getURL('/styles/momocan.css');
			Akahuku.momocan.loadStyle(style).then(runMomocan);
		}
	},

	/*
	 * form functionalities
	 */

	toggleSage: function () {
		const email = $('email');
		if (!email) return;
		email.value = /\bsage\b/.test(email.value) ?
			email.value.replace(/\s*\bsage\b\s*/g, '') :
			`sage ${email.value}`;
		email.setSelectionRange(email.value.length, email.value.length);
	},
	cursorPreviousLine: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		const alter = e.shift ? 'extend' : 'move';
		document.getSelection().modify(alter, 'backward', 'line');
	},
	cursorNextLine: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		const alter = e.shift ? 'extend' : 'move';
		document.getSelection().modify(alter, 'forward', 'line');
	},
	cursorBackwardWord: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		const alter = e.shift ? 'extend' : 'move';
		document.getSelection().modify(alter, 'backward', 'word');
	},
	cursorForwardWord: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		const alter = e.shift ? 'extend' : 'move';
		document.getSelection().modify(alter, 'forward', 'word');
	},
	cursorBackwardChar: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		if (t.nodeName == 'INPUT' && WasaviExtensionWrapper.IS_GECKO) {
			let st = t.selectionStart;
			if (st >= 1 && !isLowSurrogate(t.value.charAt(st - 1))) st--;
			else if (st >= 2 && isHighSurrogate(t.value.charAt(st - 2)) && isLowSurrogate(t.value.charAt(st - 1))) st -= 2;
			t.selectionStart = st;
			if (!e.shift) t.selectionEnd = st;
		}
		else {
			const alter = e.shift ? 'extend' : 'move';
			document.getSelection().modify(alter, 'backward', 'character');
		}
	},
	cursorForwardChar: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		if (t.nodeName == 'INPUT' && WasaviExtensionWrapper.IS_GECKO) {
			let ed = t.selectionEnd;
			if (ed <= t.value.length - 1 && !isHighSurrogate(t.value.charAt(ed + 1))) ed++;
			else if (ed <= t.value.length - 2 && isHighSurrogate(t.value.charAt(ed + 1)) && isLowSurrogate(t.value.charAt(ed + 2))) ed += 2;
			t.selectionEnd = ed;
			if (!e.shift) t.selectionStart = ed;
		}
		else {
			const alter = e.shift ? 'extend' : 'move';
			document.getSelection().modify(alter, 'forward', 'character');
		}
	},
	cursorDeleteBackwardChar: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		if (t.nodeName == 'INPUT' && WasaviExtensionWrapper.IS_GECKO) {
			commands.cursorBackwardChar({shift: true}, t);
			const st = t.selectionStart;
			const ed = t.selectionEnd;
			const v = t.value;
			t.value = v.substring(0, st) + v.substring(ed);
			t.selectionStart = t.selectionEnd = st;
		}
		else {
			const selection = document.getSelection();
			const range = selection.getRangeAt(0);
			if (range.collapsed) {
				selection.modify('extend', 'backward', 'character');
			}
			document.execCommand('delete', false, null);
		}
	},
	cursorDeleteBackwardWord: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		if (t.nodeName == 'INPUT' && WasaviExtensionWrapper.IS_GECKO) {
			// TBD
		}
		else {
			const selection = document.getSelection();
			const range = selection.getRangeAt(0);
			if (range.collapsed) {
				selection.modify('extend', 'backward', 'word');
			}
			document.execCommand('delete', false, null);
		}
	},
	cursorDeleteBackwardBlock: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		if (t.nodeName == 'INPUT' && WasaviExtensionWrapper.IS_GECKO) {
			const st = t.selectionEnd;
			const v = t.value;
			t.value = v.substring(st);
			t.selectionStart = t.selectionEnd = 0;
		}
		else {
			const selection = document.getSelection();
			const range = selection.getRangeAt(0);
			if (range.collapsed) {
				selection.modify('extend', 'backward', 'lineboundary');
			}
			document.execCommand('delete', false, null);
		}
	},
	cursorBeginningOfLine: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		if (t.nodeName == 'INPUT' && WasaviExtensionWrapper.IS_GECKO) {
			if (t.selectionStart == 0 && t.selectionEnd == t.value.length) {
				t.selectionStart = t.selectionEnd = 0;
			}
			else {
				t.selectionStart = 0;
				t.selectionEnd = t.value.length;
			}
		}
		else {
			let n = qeema.editable.selectionStart(t);
			const selection = document.getSelection();
			const range = selection.getRangeAt(0);
			if (range.toString() == t.textContent) {
				n = t.getAttribute('data-last-pos') - 0;
				t.removeAttribute('data-last-pos');
				qeema.editable.setSelectionRange(t, n, n);
				const alter = e.shift ? 'extend' : 'move';
				selection.modify(alter, 'backward', 'lineboundary');
			}
			else {
				t.setAttribute('data-last-pos', n);
				selection.selectAllChildren(t);
			}
		}
	},
	cursorEndOfLine: function (e, t) {
		if (!storage.config.hook_edit_shortcuts.value) return keyManager.PASS_THROUGH;
		if (t.nodeName == 'INPUT' && WasaviExtensionWrapper.IS_GECKO) {
			t.selectionStart = t.selectionEnd = t.value.length;
		}
		else {
			const alter = e.shift ? 'extend' : 'move';
			document.getSelection().modify(alter, 'forward', 'lineboundary');
		}
	},

	/*
	 * catalog
	 */

	toggleCatalogVisibility: function (e, t) {
		const threads = $('content');
		const catalog = $('catalog');
		const ad = $('ad-aside-wrap');
		const panel = $('panel-aside-wrap');

		let scrollTop = 0;

		// activate catalog
		if (pageModes.length == 1) {
			pageModes.unshift({mode: 'catalog', scrollTop: docScrollTop()});
			threads.classList.add('hide');
			catalog.classList.remove('hide');
			ad.classList.add('hide');
			$t($qs('#header a[href="#toggle-catalog"] span'), siteInfo.resno ? 'スレッド' : 'サマリー');

			if (panel.classList.contains('run')) {
				Array.from($qsa('#catalog .catalog-threads-wrap > div'))
					.forEach(div => {div.style.marginRight = '24%';});
			}

			const active = $qs(
				'#catalog .catalog-threads-wrap > div:not([class*="hide"])');
			if (active && active.childNodes.length == 0) {
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
			$t($qs('#header a[href="#toggle-catalog"] span'), 'カタログ');
			catalogPopup.deleteAll();
			historyStateWrapper.updateHash('');
		}

		setTimeout(() => {
			window.scrollTo(0, scrollTop);
		}, 0);
	},
	updateCatalogSettings: function (settings) {
		let cs = getCatalogSettings();
		if ('x' in settings) {
			let tmp = parseInt(settings.x, 10);
			if (!isNaN(tmp) && tmp >= 1 && tmp <= 20) {
				cs[0] = tmp;
			}
		}
		if ('y' in settings) {
			let tmp = parseInt(settings.y, 10);
			if (!isNaN(tmp) && tmp >= 1 && tmp <= 100) {
				cs[1] = tmp;
			}
		}
		if ('text' in settings) {
			let tmp = parseInt(settings.text, 10);
			if (!isNaN(tmp) && tmp >= 0 && tmp <= 1000) {
				cs[2] = tmp;
			}
		}
		setBoardCookie('cxyl', cs.join('x'), CATALOG_COOKIE_LIFE_DAYS);
	},

	/*
	 * thread tracking
	 */

	registerTrack: function () {
		if (autoTracker.running) {
			autoTracker.stop();
		}
		else {
			autoTracker.start();
		}
	},

	/*
	 * panel commons
	 */

	togglePanelVisibility: function () {
		if ($('panel-aside-wrap').classList.contains('run')) {
			commands.hidePanel();
		}
		else {
			commands.showPanel();
		}
	},
	hidePanel: function () {
		hidePanel();
	},
	showPanel: function () {
		showPanel();
	},
	activateStatisticsTab: function () {
		if (!$qs('#panel-aside-wrap.run #panel-content-mark:not(.hide)') && markStatistics.lastStatistics) {
			markStatistics.updatePanelView(markStatistics.lastStatistics);
		}
		activatePanelTab($qs('.panel-tab[href="#mark"]'));
		showPanel();
	},
	activateSearchTab: function () {
		let searchTab = $qs('.panel-tab[href="#search"]');
		activatePanelTab(searchTab);
		$t($qs('span.long', searchTab),
			(pageModes[0].mode == 'catalog' ? 'スレ' : 'レス') + '検索');
		showPanel(panel => {
			$('search-text').focus();
		});
	},
	activateNoticeTab: function () {
		activatePanelTab($qs('.panel-tab[href="#notice"]'));
		showPanel();
	},

	/*
	 * panel (search)
	 */

	search: function () {
		if (pageModes[0].mode == 'catalog') {
			commands.searchCatalog();
		}
		else {
			commands.searchComment();
		}
	},
	searchComment: function () {
		searchBase({
			targetNodesSelector: 'article .topic-wrap, article .reply-wrap',
			targetElementSelector: '.sub, .name, .postdate, span.user-id, .email, .comment',
			getTextContent: node => {
				return node.textContent;
			},
			getPostNumber: node => {
				return node.getAttribute('data-number')
					|| $qs('[data-number]', node).getAttribute('data-number');
			},
			fillItem: (anchor, target) => {
				anchor.textContent = $qs('.comment', target).textContent;
			}
		});
	},
	searchCatalog: function () {
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
				return node.getAttribute('data-text') || node.textContent;
			},
			getPostNumber: node => {
				return node.getAttribute('data-number');
			},
			fillItem: (anchor, target) => {
				anchor.href = target.href;
				anchor.target = target.target;
				if (target.classList.contains('new')) {
					anchor.classList.add('new');
				}

				let img = $qs('img', target);
				if (img) {
					anchor.appendChild(img.cloneNode(false));
				}

				let text = $qs('[data-text]', target);
				if (text) {
					anchor.appendChild(document.createTextNode(text.getAttribute('data-text')));
				}

				let sentinel = anchor.appendChild(document[CRE]('div'));
				sentinel.className = 'sentinel';

				let info = $qsa('.info span', target);
				if (info) {
					if (target.classList.contains('new')) {
						$t(sentinel, `${info[0].textContent} レス (new)`);
					}
					else {
						$t(sentinel, `${info[0].textContent}${info[1].textContent} レス`);
					}
				}
				else {
					$t(sentinel, '--');
				}
			}
		});
	},

	/*
	 * debug commands
	 */

	reloadExtension: () => {
		if (!devMode) return;
		resources.clearCache();
		sendToBackend('reload');
	},
	toggleLogging: (e, t) => {
		if (!devMode) return;
		timingLogger.locked = !t.value;
	},
	dumpStats: (e, t) => {
		if (!devMode) return;
		dumpDebugText(JSON.stringify(markStatistics.lastStatistics, null, '    '));
	},
	dumpReloadData: (e, t) => {
		if (!devMode) return;
		const data = Object.assign({}, reloadStatus);
		delete data.lastReceivedText;
		dumpDebugText(JSON.stringify(data, null, '    ') + '\n\n' + reloadStatus.lastReceivedText);
	},
	emptyReplies: (e, t) => {
		if (!devMode) return;
		empty($qs('.replies'));
	},
	noticeTest: (e, t) => {
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
	}
};

/*
 * <<<1 bootstrap
 */

timingLogger = createTimingLogger();
timingLogger.startTag(`booting ${APP_NAME}`);

storage = createPersistentStorage();
storage.onChanged = (changes, areaName) => {
	if ('notices' in changes) {
		siteInfo.notice = changes.notices.newValue[`${siteInfo.server}/${siteInfo.board}`] || '';
	}
	if ('config' in changes) {
		const data = Object.assign(
			storage.getAllConfigDefault(),
			changes.config.newValue);
		storage.assignConfig(data);
		applyDataBindings(xmlGenerator.run('').xml);
	}
	if ('runtime' in changes) {
		storage.assignRuntime(changes.runtime.newValue);
	}
};
Object.defineProperty(window.Akahuku, 'storage', {get: function () {return storage}});

transport = createTransport();
resources = createResourceManager();

if (location.href.match(/^[^:]+:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^\/]+)\/res\/(\d+)\.htm/)) {
	siteInfo.server = RegExp.$1;
	siteInfo.board = RegExp.$2;
	siteInfo.resno = RegExp.$3 - 0;
	pageModes.unshift({mode: 'reply', scrollTop: 0});
}
else if (location.href.match(/^[^:]+:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^\/]+)\/(?:([^.]+)\.htm)?/)) {
	siteInfo.server = RegExp.$1;
	siteInfo.board = RegExp.$2;
	siteInfo.summaryIndex = RegExp.$3 - 0 || 0;
	pageModes.unshift({mode: 'summary', scrollTop: 0});
}

initialStyle(true);

timingLogger.startTag('waiting multiple promise completion');
Promise.all([
	// settings loader promise
	new Promise(resolve => {
		chrome.storage.sync.get(
			{
				version: '0.0.1',
				migrated: false,
				notices: {},
				config: storage.getAllConfigDefault(),
				runtime: storage.runtime
			},
			result => {
				if (chrome.runtime.lastError) {
					throw new Error(chrome.runtime.lastError.message);
				}

				resolve(result);
			}
		);
	}),

	// backend connector promise
	new Promise(resolve => {
		connectToBackend(connectStatus => {
			resolve(connectStatus);
		});
	}),

	// DOM construction watcher promise
	new Promise(resolve => {
		function next () {
			scriptWatcher.disconnect();
			scriptWatcher = undefined;
			initialStyle(false);
			if (NOTFOUND_TITLE.test(document.title)
			||  UNAVAILABLE_TITLE.test(document.title)
			||  $('cf-wrapper')) {
				resolve(false);
			}
			else {
				bootVars.bodyHTML = document.documentElement[IHTML];
				document.body[IHTML] =
					`${APP_NAME}: ` +
					`ページを再構成しています。ちょっと待ってね。`;
				resolve(true);
			}
		}

		if (document.readyState == 'complete'
		|| document.readyState == 'interactive') {
			next();
		}
		else {
			document.addEventListener(
				'DOMContentLoaded',
				function handler (e) {
					document.removeEventListener(e.type, handler);
					next();
				}
			);
		}
	}),

	// fundamental xsl file loader promise
	resources.get(
		'/xsl/fundamental.xsl',
		{expires:DEBUG_ALWAYS_LOAD_XSL ? 1 : 1000 * 60 * 10})
]).then(data => {
	let [storageData, backendConnected, runnable, xsl] = data;
	timingLogger.endTag();

	if (!runnable) {
		timingLogger.forceEndTag();
		return;
	}

	if (!backendConnected) {
		throw new Error(
			`${APP_NAME}: ` +
			`バックエンドに接続できません。中止します。`);
	}

	if (xsl === null) {
		throw new Error(
			`${APP_NAME}: ` +
			`内部用の XSL ファイルの取得に失敗しました。中止します。`);
	}

	if (version != storageData.version) {
		// TODO: storage format upgrade goes here

		storage.set({version: version});
	}

	if (version != window.localStorage.getItem(`${APP_NAME}_version`)) {
		resources.clearCache();
		window.localStorage.setItem(`${APP_NAME}_version`, version);
	}

	siteInfo.notice = storageData.notices[`${siteInfo.server}/${siteInfo.board}`] || '';

	storage.assignConfig(storageData.config);
	storage.assignRuntime(storageData.runtime);

	return sendToBackend('initialized')
		.then(() => transformWholeDocument(xsl));
})
.catch(err => {
	timingLogger.forceEndTag();
	console.error(err.stack);
	initialStyle(false);
	document.body[IHTML] = `${APP_NAME}: ${err.message}`;
	$t(document.body.appendChild(document[CRE]('pre')), err.stack);
});

}

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
