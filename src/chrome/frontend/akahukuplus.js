'use strict';

/*
 * akahukuplus
 *
 * @author akahuku@gmail.com
 */

if (true) {

/*
 * consts
 */

const APP_NAME = 'akahukuplus';
const FUTABA_CHARSET = 'Shift_JIS';
const NOTFOUND_TITLE = /404\s+file\s+not\s+found/i;
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

// others
const siteInfo = {
	server: '', board: '', resno: 0,
	logSize: 10000,
	maxAttachSize: 0,
	minThreadLifeTime: 0,
	lastModified: 0,
	subHash: {},
	nameHash: {},
	latestNumber: 0
};
const cursorPos = {
	x: 0,
	y: 0,
	pagex: 0,
	pagey: 0,
	moved: false
};
const pageModes = [];
const appStates = ['command'];

let version = '0.0.1';
let devMode = false;
let viewportRect;
let overrideUpfile;

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
		null,
		pageModes[0] == 'reply' ? LEAD_REPLIES_COUNT : null);

	try {
		timingLogger.startTag('parsing xsl');

		if (IDEOGRAPH_CONVERSION_UI) {
			xsl = 新字体の漢字を舊字體に変換(xsl);
		}

		xsl = (new window.DOMParser()).parseFromString(xsl, "text/xml");
		timingLogger.endTag();
	}
	catch (e) {
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
		throw new Error(
			`${APP_NAME}: XSL ファイルの評価に失敗しました。中止します。`);
	}

	// transform xsl into html
	timingLogger.startTag('applying xsl');
	document.body[IHTML] = '';
	xsltProcessor.setParameter(null, 'app_name', APP_NAME);
	xsltProcessor.setParameter(null, 'dev_mode', devMode ? '1' : '0');
	xsltProcessor.setParameter(null, 'page_mode', pageModes[0]);
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
	let removeHeadElements = function () {
		Array.prototype.slice.call($qsa('head > *'))
		.forEach(node => {
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
	let headNodes = Array.prototype.slice.call(
		$qsa('body style, body link'));
	while (headNodes.length) {
		let node = headNodes.shift();
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
		let node = document.body.appendChild(document[CRE]('pre'));
		node.appendChild(document.createTextNode(serializeXML(generateResult.xml)));
		node.style.fontFamily = 'Consolas';
		node.style.whiteSpace = 'pre-wrap';
	}

	fragment = xsl = null;
	bootVars = null;

	$('content').classList.remove('init');

	timingLogger.startTag('install');
	install(pageModes[0]);
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

		.add('#delete-post',    commands.openDeleteDialog)
		.add('#config',         commands.openConfigDialog)
		.add('#help',           commands.openHelpDialog)
		.add('#draw',           commands.openDrawDialog)
		.add('#toggle-panel',   commands.togglePanelVisibility)
		.add('#reload',         commands.reload)
		.add('#sage',           commands.toggleSage)
		.add('#search-start',   commands.search)
		.add('#clear-upfile',   commands.clearUpfile)
		.add('#toggle-catalog', commands.toggleCatalogVisibility)
		.add('#track',          commands.registerTrack)
		.add('#reload-ext',     commands.reloadExtension)
		.add('#toggle-logging', commands.toggleLogging)
		.add('#prev-summary',   commands.summaryBack)
		.add('#next-summary',   commands.summaryNext)

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
			if (pageModes[0] == 'catalog') {
				commands.toggleCatalogVisibility();
			}
			commands.reload();
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
				if (/\.(?:jpg|gif|png)$/.test(t.href)) {
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
				return 'passthrough';
			}
		})
		.add('.catalog-order', (e, t) => {
			let newActive;

			Array.prototype.forEach.call(
				$qsa('#catalog .catalog-options a'),
				node => {
					if (node == t) {
						node.classList.add('active');
						newActive = node;
					}
					else {
						node.classList.remove('active');
					}
				}
			);

			if (!newActive) {
				newActive = $qs('#catalog .catalog-options a');
				newActive.classList.add('active');
			}

			let order = newActive.href.match(/\w+$/)[0];
			let contentId = `catalog-threads-wrap-${order}`;
			Array.prototype.forEach.call(
				$qsa('#catalog .catalog-threads-wrap > div'),
				node => {
					if (node.id == contentId) {
						node.classList.remove('hide');
					}
					else {
						node.classList.add('hide');
					}
				}
			);

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
			sendToBackend('open', {url:t.href, selfUrl:window.location.href});
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

		.addStroke('command.edit', '\u001b', commands.deactivatePostForm)
		.addStroke('command.edit', '\u0013', commands.toggleSage)
		.addStroke('command.edit', '<S-enter>', commands.post)
		.addStroke('command.edit', '\u0001', commands.cursorTopOfLine)
		.addStroke('command.edit', '\u0005', commands.cursorBottomOfLine)
		//.addStroke('command.edit', 'C-p', commands.cursorPrev)
		//.addStroke('command.edit', 'C-n', commands.cursorNext)
		.addStroke('command.edit', '\u0002', commands.cursorBack)
		.addStroke('command.edit', '\u0006', commands.cursorForward)
		.updateManifest();

	/*
	 * favicon maintainer
	 */

	favicon = createFavicon();

	/*
	 * window resize handler
	 */

	setupWindowResizeEvent(100, e => {
		let vp = document.body.appendChild(document[CRE]('div'));
		try {
			vp.id = 'viewport-rect';
			viewportRect = vp.getBoundingClientRect();
		}
		finally {
			vp.parentNode.removeChild(vp);
		}

		let style = $('dynstyle-comment-maxwidth');
		if (!style) return;
		empty(style);

		// max width of comments
		let text = $qs('article div.text');
		if (text) {
			let isContentInvisible = $('content').classList.contains('hide');
			$('content').classList.remove('hide');
			try {
				let rect = text.getBoundingClientRect();
				style.appendChild(document.createTextNode([
					'.reply-wrap > div:last-child {',
					`  max-width:${Math.floor(rect.width * 0.9)}px;`,
					'}'
				].join('\n')));
			}
			finally {
				if (isContentInvisible) {
					$('content').classList.add('hide');
				}
			}
		}

		// max size of dialogs
		style.appendChild(document.createTextNode([
			`.dialog-wrap .dialog-content {`,
			`  max-width:${Math.floor(viewportRect.width * 0.8)}px;`,
			`  max-height:${Math.floor(viewportRect.height * 0.8)}px;`,
			`  min-width:${Math.floor(viewportRect.width * 0.25)}px;`,
			'}'
		].join('\n')));

		// header height adjustment
		let headerHeight = $('header').offsetHeight + HEADER_MARGIN_BOTTOM;
		$('content').style.marginTop =
		$('ad-aside-wrap').style.top =
		$('panel-aside-wrap').style.top = headerHeight + 'px';
		style.appendChild(document.createTextNode([
			`#content > article > .image > div {`,
			`  top:${headerHeight}px`,
			'}'
		].join('\n')));
	});

	/*
	 * window scroll handler
	 */

	scrollManager = createScrollManager(10);

	/*
	 * history handler
	 */

	historyStateWrapper = createHistoryStateWrapper(e => {
		/*
		console.log([
			`  previous page mode: ${pageModes[0]}`,
			`current page address: ${location.href}`
		].join('\n'));
		*/

		let isCatalog = window.location.hash == '#mode=cat';

		if (pageModes[0] == 'catalog' && !isCatalog
		||  pageModes[0] != 'catalog' && isCatalog) {
			commands.toggleCatalogVisibility();
		}

		if (pageModes[0] == 'summary') {
			commands.reload();
		}
		else if (pageModes[0] == 'catalog' && pageModes[1] == 'summary') {
			let re = /(\d+)\.htm$/.exec(window.location.pathname);
			let summaryIndex = re ? re[1] : 0;

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
			let pageCount = navElement.childElementCount;
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
		let upfile = $('upfile');
		let textonly = $('textonly');
		let resto = document.getElementsByName('resto')[0];

		switch (e.target.value) {
		case 'reply':
			upfile.disabled = textonly.disabled = upfile.getAttribute('data-origin') == 'js';
			resto.disabled = false;
			break;

		case 'thread':
			upfile.disabled = textonly.disabled = false;
			resto.disabled = true;
			break;
		}
	});

	// allow tegaki link, if baseform element exists or the page is summary
	(drawButtonWrap => {
		if (!drawButtonWrap) return;
		if (document.getElementsByName('baseform').length == 0 && pageModes[0] != 'summary') return;

		drawButtonWrap.classList.remove('hide');

		if (pageModes[0] == 'summary') {
			let canvas = $qs('.draw-canvas');
			if (!canvas) return;
			canvas.width = 640;
			canvas.height = 480;
		}
	})($qs('.draw-button-wrap'));

	// file element change listener
	(file => {
		if (!file) return;
		file.addEventListener('change', e => {
			setPostThumbnail(e.target.files[0]);
			resetForm('baseform', 'textonly');
			overrideUpfile = undefined;
		}, false);
	})($('upfile'));

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
	let nodes = $qsa('*[data-binding]');
	let result = null, re = null;
	for (let i = 0, goal = nodes.length; i < goal; i++) {
		let binding = nodes[i].getAttribute('data-binding');
		if ((re = /^xpath(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] == 'string' && re[1] != pageModes[0]) continue;
			try {
				result = xml.evaluate(re[2], xml, null,
					window.XPathResult.FIRST_ORDERED_NODE_TYPE, result);
				if (!result || !result.singleNodeValue) continue;
				$t(nodes[i],
					result.singleNodeValue.value
					|| result.singleNodeValue.textContent);
			}
			catch (e) {
				console.error(
					`${APP_NAME}: applyDataBindings: failed to apply the data "${re[2]}"` +
					`\n(${e.message})`);
			}
		}
		else if ((re = /^xpath-class(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] == 'string' && re[1] != pageModes[0]) continue;
			try {
				result = xml.evaluate(re[2], xml, null,
					window.XPathResult.STRING_TYPE, result);
				if (!result || !result.stringValue) continue;
				nodes[i].className = result.stringValue;
			}
			catch (e) {
				console.error(
					`${APP_NAME}: applyDataBindings: failed to apply the data "${re[2]}" to class` +
					`\n(${e.message})`);
			}
		}
		else if ((re = /^template(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] == 'string' && re[1] != pageModes[0]) continue;
			try {
				xsltProcessor.setParameter(null, 'render_mode', re[2]);
				let f = fixFragment(xsltProcessor.transformToFragment(xml, document));
				if (f.textContent.replace(/^\s+|\s+$/g, '') == '' && !$qs('[data-doe]', f)) continue;
				empty(nodes[i]);
				appendFragment(nodes[i], f);
			}
			catch (e) {
				console.error(
					`${APP_NAME}: applyDataBindings: failed to apply the template "${re[2]}"` +
					`\n(${e.message})`);
			}
		}
	}
}

/*
 * <<<1 classes / class constructors
 */

function createResourceManager () {
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
				setSlot(path, expires, xhr.response);
				callback(xhr.response);
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

		xhr.send();
	}

	function getResKey (key) {
		return `resource:${key}`;
	}

	function get (key, opts) {
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
	function stripTags (s) {
		while (/<\w+[^>]*>/.test(s)) {
			s = s.replace(/<(\w+)[^>]*>([^>]*)<\/\1>/g, '$2');
		}
		return s;
	}

	function textFactory (xml) {
		return function (s) {
			return xml.createTextNode(
				('' + s)
				.replace(/&amp;/g, '&')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>'));
		};
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

	function fetchReplies (s, regex, count, maxReplies, lowBoundNumber, threadNode, subHash, nameHash, baseUrl) {
		let text = textFactory(threadNode.ownerDocument);
		let repliesNode = element(threadNode, 'replies');
		let goal = count + maxReplies;
		let offset = count + 1;
		let reply;
		let postTimeRegex = getPostTimeRegex();

		for (;count < goal && (reply = regex.exec(s)); offset++, count++) {
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
			re = /ID:([^ "]+)/.exec(infoText);
			if (re) {
				let idNode = element(replyNode, 'user_id');
				idNode.appendChild(text(stripTags(re[1])));
				markStatistics.notifyId(number, re[1]);
			}

			// mark
			re = /(\[|dice\d+d\d+=)?<font\s+color="#ff0000">(.+?)<\/font>\]?/i.exec(comment);
			if (re && (!re[1] || re[1].substr(-1) != '=')) {
				if (!$qs('deleted', replyNode)) {
					element(replyNode, 'deleted');
				}

				let markNode = element(replyNode, 'mark');
				re[0].charAt(0) == '['
					&& re[0].substr(-1) == ']'
					&& markNode.setAttribute('bracket', 'true');
				re[2] = stripTags(re[2]);
				markNode.appendChild(text(re[2]));
				markStatistics.notifyMark(number, re[2]);
			}

			// そうだね (that's right）
			re = /<a[^>]+class=["']?sod["']?[^>]*>([^<]+)<\/a>/i.exec(info);
			if (re) {
				let sodaneNode = element(replyNode, 'sodane');
				sodaneNode.appendChild(text(re[1]
					.replace('x', ' × ')
					.replace('+', '＋')
				));
				sodaneNode.setAttribute('className', re[1] == '+' ? 'sodane-null' : 'sodane');
			}

			// skip, if we can
			if (number <= lowBoundNumber) {
				continue;
			}

			// offset
			element(replyNode, 'offset').appendChild(text(offset));

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
				postDateNode.setAttribute('value', postedDate.getTime() / 1000);
			}

			// subject
			re = /<input[^>]+type="checkbox"[^>]*>(?:<[^a][^>]*>)+([^<]+)/i.exec(info);
			if (re) {
				re[1] = re[1].replace(/^\s+|\s+$/g, '');
				element(replyNode, 'sub').appendChild(text(re[1]));
				subHash[re[1]] = (subHash[re[1]] || 0) + 1;
			}

			// name
			re = /Name\s*<font[^>]*>(.+?)<\/font>/i.exec(info);
			if (re) {
				re[1] = re[1]
					.replace(/<[^>]*>/g, '')
					.replace(/^\s+|\s+$/g, '');
				element(replyNode, 'name').appendChild(text(re[1]));
				nameHash[re[1]] = (nameHash[re[1]] || 0) + 1;
			}

			// mail address
			re = /<a href="mailto:([^"]*)"/i.exec(info);
			if (re) {
				let emailNode = element(replyNode, 'email');
				emailNode.appendChild(text(stripTags(re[1])));
				linkify(emailNode);
			}

			// src & thumbnail url
			let imagehref = /<br><a href="([^"]+)"[^>]*>(<img[^>]+>)<\/a>/i.exec(info);
			if (imagehref) {
				let imageNode = element(replyNode, 'image');
				let srcUrl = restoreDistributedImageURL(resolveRelativePath(imagehref[1], baseUrl));
				imageNode.appendChild(text(srcUrl));
				imageNode.setAttribute('base_name', imagehref[1].match(/[^\/]+$/)[0]);

				// animated
				re = /<small[^>]*>アニメGIF.<\/small[^>]*>/i.exec(info);
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
					thumbNode.appendChild(text(thumbUrl));
					thumbNode.setAttribute('width', thumbWidth);
					thumbNode.setAttribute('height', thumbHeight);
				}
			}

			// comment
			//if (count == 0) {
			//	comment += '';
			//}
			pushComment(element(replyNode, 'comment'), comment);
		}

		return {
			lastReached: count < goal && !reply,
			repliesNode: repliesNode,
			repliesCount: count,
			regex: regex
		}
	}

	function LinkTarget (className, pattern, handler) {
		this.className = className;
		this.pattern = pattern;
		this.handler = handler;
	}
	LinkTarget.prototype.getHref = function (re, anchor) {
		return this.completeScheme(this.handler(
			re.slice(this.offset, this.offset + this.backrefLength)
				.map(function (a) {return a == undefined ? '' : a}),
			anchor
		));
	};
	LinkTarget.prototype.completeScheme = function (url) {
		var scheme = /^[^:]+/.exec(url)[0];
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
			if (/\.(?:jpg|gif|png|webm|mp4|mp3|ogg)$/.test(re[2])) {
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
			anchor.setAttribute('basename', re[1] + re[2]);
			if (/\.(?:jpg|gif|png|webm|mp4|mp3|ogg)$/.test(re[2])) {
				anchor.setAttribute('class', `${this.className} lightbox`);
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
			'\\b((?:h?t?t?p?://)?(?:dec\\.2chan\\.net/up/src/)?(f\\d{4,})(\\.\\w+)?)',
			function (re, anchor) {
				anchor.setAttribute('title', 'あぷ');
				return this.upProc(re, anchor, 'http://dec.2chan.net/up/');
			}
		),
		new LinkTarget(
			'link-up-small',
			'\\b((?:h?t?t?p?://)?(?:dec\\.2chan\\.net/up/src/)?(fu\\d{4,})(\\.\\w+)?)',
			function (re, anchor) {
				anchor.setAttribute('title', 'あぷ小');
				return this.upProc(re, anchor, 'http://dec.2chan.net/up2/');
			}
		),
		new LinkTarget(
			'link-youtube',
			'\\b((?:h?t?t?p?s?://)?(' + [
				'www\\.youtube\\.com/watch\?(?:.*?v=([\\w\\-]+))',
				'www\\.youtube\\.com/v/([\\w\\-]+)',
				'youtu\\.be/([\\w\\-]+)'
			].join('|') + ')\\S*)',
			function (re, anchor) {
				anchor.setAttribute('youtube-key', re[2] || re[3] || re[4]);
				return `https://${re[1]}`;
			}
		),
		new LinkTarget(
			'link-nico2',
			'\\b((?:h?t?t?p?:s?//)?([^.]+\\.nicovideo\\.jp/watch/(sm\\w+)\\S*))',
			function (re, anchor) {
				anchor.setAttribute('nico2-key', re[2]);
				return `http://${re[1]}`;
			}
		),
		new LinkTarget(
			'link-futaba lightbox',
			'\\b((?:h?t?t?p?://)?[^.]+\\.2chan\\.net/[^/]+/[^/]+/src/\\d+\\.(?:jpg|gif|png|webm|mp4)\\S*)',
			function (re, anchor) {
				anchor.setAttribute(
					'thumbnail',
					re[0]
						.replace('/src/', '/thumb/')
						.replace(/\.(?:jpg|gif|png|webm|mp4)/, 's.jpg'));
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
	const emojiPattern = /([\u00a9\u00ae\u2002\u2003\u2005\u203c\u2049\u2122\u2139\u2194-\u2199\u21a9\u21aa\u231a\u231b\u23e9-\u23ec\u23f0\u23f3\u24c2\u25aa\u25ab\u25b6\u25c0\u25fb-\u25fe\u2600\u2601\u260e\u2611\u2614\u2615\u261d\u263a\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267b\u267f\u2693\u26a0\u26a1\u26aa\u26ab\u26bd\u26be\u26c4\u26c5\u26ce\u26d4\u26ea\u26f2\u26f3\u26f5\u26fa\u26fd\u2702\u2705\u2708-\u270c\u270f\u2712\u2714\u2716\u2728\u2733\u2734\u2744\u2747\u274c\u274e\u2753-\u2755\u2757\u2764\u2795-\u2797\u27a1\u27b0\u2934\u2935\u2b05-\u2b07\u2b1b\u2b1c\u2b50\u2b55\u3030\u303d\u3297\u3299]|\ud83c[\udc04\udccf\udd70\udd71\udd7e\udd7f\udd8e\udd91-\udd9a\ude01\ude02\ude1a\ude2f\ude32-\ude3a\ude50\ude51\udf00-\udf0c\udf0f\udf11\udf13-\udf15\udf19\udf1b\udf1f\udf20\udf30\udf31\udf34\udf35\udf37-\udf4a\udf4c-\udf4f\udf51-\udf7b\udf80-\udf93\udfa0-\udfc4\udfc6\udfc8\udfca\udfe0-\udfe3\udfe5-\udff0]|\ud83d[\udc0c-\udc0e\udc11\udc12\udc14\udc17-\udc29\udc2b-\udc3e\udc40\udc42-\udc64\udc66-\udc6b\udc6e-\udcac\udcae-\udcb5\udcb8-\udceb\udcee\udcf0-\udcf4\udcf6\udcf7\udcf9-\udcfc\udd03\udd0a-\udd14\udd16-\udd2b\udd2e-\udd3d\udd50-\udd5b\uddfb-\uddff\ude01-\ude06\ude09-\ude0d\ude0f\ude12-\ude14\ude16\ude18\ude1a\ude1c-\ude1e\ude20-\ude25\ude28-\ude2b\ude2d\ude30-\ude33\ude35\ude37-\ude40\ude45-\ude4f\ude80\ude83-\ude85\ude87\ude89\ude8c\ude8f\ude91-\ude93\ude95\ude97\ude99\ude9a\udea2\udea4\udea5\udea7-\udead\udeb2\udeb6\udeb9-\udebe\udec0]|\u0023\u20e3|\u0030\u20e3|\u0031\u20e3|\u0032\u20e3|\u0033\u20e3|\u0034\u20e3|\u0035\u20e3|\u0036\u20e3|\u0037\u20e3|\u0038\u20e3|\u0039\u20e3|\ud83c\udde8\ud83c\uddf3|\ud83c\udde9\ud83c\uddea|\ud83c\uddea\ud83c\uddf8|\ud83c\uddeb\ud83c\uddf7|\ud83c\uddec\ud83c\udde7|\ud83c\uddee\ud83c\uddf9|\ud83c\uddef\ud83c\uddf5|\ud83c\uddf0\ud83c\uddf7|\ud83c\uddf7\ud83c\uddfa|\ud83c\uddfa\ud83c\uddf8)[\ufe0e\ufe0f]?/;

	function linkify (node) {
		let r = node.ownerDocument.createRange();
		let re;
		while (node.lastChild.nodeType == 3) {
			if ((re = linkTargetRegex.exec(node.lastChild.nodeValue))) {
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
			else if ((re = emojiPattern.exec(node.lastChild.nodeValue))) {
				let emoji = node.ownerDocument[CRE]('emoji');
				emoji.setAttribute('alt', re[0]);

				r.setStart(node.lastChild, re.index);
				r.setEnd(node.lastChild, re.index + re[0].length);
				r.surroundContents(emoji);

				let cp = toUCS32(re[1]);
				if (cp >= 0) {
					emoji.setAttribute('codepoint', cp.toString(16));
				}
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

	function toUCS32 (s) {
		var result = -1;
		switch (s.length) {
		case 1:
			result = s.charCodeAt(0);
			break;
		case 2:
			var hcp = s.charCodeAt(0);
			var lcp = s.charCodeAt(1);
			result = ((hcp & 0x03c0) + 0x0040) << 10
					| (hcp & 0x003f) << 10
					| (lcp & 0x03ff);
			break;
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
				re = re
					.replace(/&#([0-9]+);/g, function ($0, $1) {return String.fromCharCode(parseInt($1, 10))})
					.replace(/&#x([0-9a-f]+);/gi, function ($0, $1) {return String.fromCharCode(parseInt($1, 16))});
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

		// 23:00 -> 01:00頃消えます: treat next day
		if (h != undefined && h < fromDate.getHours() && D == undefined) {
			D = fromDate.getDate() + 1;
		}
		// 31日 -> 1日頃消えます: treat next month
		if (D != undefined && D < fromDate.getDate() && M == undefined) {
			M = fromDate.getMonth() + 1;
		}
		// 12月 -> 1月頃消えます: treat next year
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

	function run (content, url, maxReplies) {
		timingLogger.startTag('createXMLGenerator#run');

		url || (url = window.location.href);
		typeof maxReplies == 'number' || (maxReplies = 0x7fffffff);

		var xml = document.implementation.createDocument(null, 'futaba', null);
		var text = textFactory(xml);
		var isReplyMode = /\b(?:res\/\d+\.htm|\.php\?res=\d+)/.test(url);
		var baseUrl = url;
		var remainingRepliesContext = [];
		var enclosureNode = xml.documentElement;
		var metaNode = element(enclosureNode, 'meta');
		var re;

		// create fundamental nodes
		element(metaNode, 'mode')
			.appendChild(text(isReplyMode ? 'reply' : 'summary'));
		element(metaNode, 'url')
			.appendChild(text(url));
		element(metaNode, 'version')
			.appendChild(text(version));
		element(metaNode, 'extension_id')
			.appendChild(text(getExtensionId()));

		// strip control characters, include LF and CR
		content = content.replace(/[\u0000-\u001f]/g, ' ');

		// strip bidi control character references
		content = content.replace(/[\u200e-\u200f\u202a-\u202e]/g, '');

		// strip script tag and its contents
		content = content.replace(/<script[^>]*>.*?<\/script>/gi, '');

		// strip comments
		content = content.replace(/<!--.*?-->/g, ' ');

		// regalize all references
		content = content.replace(/&amp;/g, '&');

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
			var re = />([^<>]+)(＠ふたば)/.exec(content);
			if (!re) return;
			var title = re[1].replace(/二次元裏$/, `虹裏${siteInfo.server}`)
				+ re[2];
			if (!isReplyMode && (re = /(\d+)\.htm$/.exec(window.location.pathname))) {
				title += ` [ページ ${re[1]}]`;
			}
			element(metaNode, 'title').appendChild(text(title));
		})();

		// page notices
		(function () {
			var notices = /<table[^>]+class="ftbl"[^>]*>(.*?)<\/form>/i.exec(content);
			if (!notices) return;
			var noticesNode = element(metaNode, 'notices');
			var noticeRegex = /<li[^>]*>(.*?)<\/li>/g;
			var notice;
			while ((notice = noticeRegex.exec(notices[1]))) {
				// viewers
				if (notice[1].match(/現在(\d+)/)) {
					element(metaNode, 'viewers').appendChild(text(RegExp.$1));
				}

				// log cycle
				if (notice[1].match(/この板の保存数は(\d+)/)) {
					element(metaNode, 'logsize').appendChild(text(RegExp.$1));
					siteInfo.logSize = RegExp.$1 - 0;
				}

				// max size of attachment file
				if (notice[1].match(/(\d+)\s*(KB|MB)/)) {
					siteInfo.maxAttachSize = parseMaxAttachSize(RegExp.$1, RegExp.$2);
					element(metaNode, 'maxattachsize').appendChild(text(siteInfo.maxAttachSize));
				}

				// min life time of thread
				if (notice[1].match(/最低(\d+)\s*(時間|分)保持/)) {
					siteInfo.minThreadLifeTime = parseMinThreadLifeTime(RegExp.$1, RegExp.$2);
					element(metaNode, 'minthreadlifetime').appendChild(text(siteInfo.minThreadLifeTime));
				}

				element(noticesNode, 'notice').appendChild(text(notice[1]));
			}
		})();

		// page navigator
		(function () {
			var navs = /<table[^>]+class="psen"[^>]*>(.*)<\/table>/i.exec(content);
			if (!navs) return;
			var buffer = [];

			var nav, navRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
			while ((nav = navRegex.exec(navs[1]))) {
				buffer.push([nav[2] - 0, resolveRelativePath(nav[1], baseUrl)]);
			}

			if (url.match(/(\d+)\.htm(?:[?#].*)?$/)) {
				buffer.push([RegExp.$1 - 0, url, true]);
			}
			else {
				buffer.push([0, url, true]);
			}

			buffer.sort(function (a, b) {return a[0] - b[0];});
			var navsNode = element(metaNode, 'navs');
			for (var i = 0, goal = buffer.length; i < goal; i++) {
				var navNode = element(navsNode, 'nav');

				navNode.appendChild(text(buffer[i][0]));
				navNode.setAttribute('href', buffer[i][1]);

				if (buffer[i][2]) {
					navNode.setAttribute('current', 'true');

					var linkNode = element(metaNode, 'link');
					linkNode.setAttribute('rel', 'prev');
					linkNode.appendChild(text(
						buffer[(i - 1 + buffer.length) % buffer.length][1]));

					var linkNode = element(metaNode, 'link');
					linkNode.setAttribute('rel', 'next');
					linkNode.appendChild(text(
						buffer[(i + 1 + buffer.length) % buffer.length][1]));
				}
			}
		})();

		// post form metadata
		(function () {
			var postform = /(<form[^>]+enctype="multipart\/form-data"[^>]*>)(.+?)<\/form>/i.exec(content);
			if (!postform) return;
			var pfNode = element(metaNode, 'postform');
			var attribRegex = /(action|method|enctype)="([^"]*)"/ig;
			var attrib;
			while ((attrib = attribRegex.exec(postform[1]))) {
				pfNode.setAttribute(attrib[1], attrib[2]);
			}

			var inputRegex = /<input[^>]+>/gi;
			var input;
			while ((input = inputRegex.exec(postform[2]))) {
				var inputNode = element(pfNode, 'input');
				var attribRegex = /(type|name|value)="([^"]*)"/ig;
				var attrib;
				while ((attrib = attribRegex.exec(input[0]))) {
					inputNode.setAttribute(attrib[1], attrib[2]);
				}
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
				let tmp = adsArray[index];
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

				if (width == 468 && height == 60) {
					className = 'mini';
				}
				else if (width == 728 && height == 90) {
					className = 'large';
				}

				i = i.replace(/\bsrc=/, 'src="about:blank" data-src=');

				adNode.appendChild(text(i));
				adNode.setAttribute('class', `size-${className}`);
				adNode.setAttribute('width', width);
				adNode.setAttribute('height', height);
				adNode.setAttribute('src', src);
			}
		})();

		// configurations
		(function () {
			var configNode = element(metaNode, 'configurations');
			var cs = getCatalogSettings();
			var paramNode;

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

		let threadIndex = 0;
		let threadRegex = /(<div\s+class="thre"[^>]*>\s*)(.+?<a[^>]+><img[^>]+><\/a>)?<input[^>]+value="?delete"?[^>]*>.*?<hr>/g;
		let matches;
		let postTimeRegex = getPostTimeRegex();
		markStatistics.start();
		while ((matches = threadRegex.exec(content))) {
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
			let expires = /<small>([^<]+?頃消えます)<\/small>/i.exec(topicInfo);
			let expireWarn = /<font[^>]+><b>このスレは古いので、/i.test(topicInfo);
			if (expires || expireWarn) {
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
				postDateNode.setAttribute('value', postedDate.getTime() / 1000);
			}

			// subject
			re = /<input[^>]+type="checkbox"[^>]*>(?:<[^a][^>]*>)+([^<]+)/i.exec(topicInfo);
			if (re) {
				re[1] = re[1].replace(/^\s+|\s+$/g, '');
				element(topicNode, 'sub').appendChild(text(re[1]));
				siteInfo.subHash[re[1]] = (siteInfo.subHash[re[1]] || 0) + 1;
			}

			// name
			re = /Name\s*<font[^>]*>(.+?)<\/font>/i.exec(topicInfo);
			if (re) {
				re[1] = re[1]
					.replace(/<[^>]*>/g, '')
					.replace(/^\s+|\s+$/g, '');
				element(topicNode, 'name').appendChild(text(re[1]));
				siteInfo.nameHash[re[1]] = (siteInfo.nameHash[re[1]] || 0) + 1;
			}

			// mail address
			re = /<a href="mailto:([^"]*)"/i.exec(topicInfo);
			if (re) {
				let emailNode = element(topicNode, 'email');
				emailNode.appendChild(text(stripTags(re[1])));
				linkify(emailNode);
			}

			// そうだね (that's right）
			re = /<a[^>]+class=["']?sod["']?[^>]*>([^<]+)<\/a>/i.exec(topicInfo);
			if (re) {
				let sodaneNode = element(topicNode, 'sodane');
				sodaneNode.appendChild(text(re[1]
					.replace('x', ' × ')
					.replace('+', '＋')
				));
				sodaneNode.setAttribute('className', re[1] == '+' ? 'sodane-null' : 'sodane');
			}

			// ID
			re = /ID:([^ ]+)/.exec(topicInfoText);
			if (re) {
				let idNode = element(topicNode, 'user_id');
				idNode.appendChild(text(stripTags(re[1])));
				markStatistics.notifyId(threadNumber, re[1]);
			}

			// src & thumbnail url
			let imagehref = /<br><a href="([^"]+)"[^>]*>(<img[^>]+>)<\/a>/i.exec(topicInfo);
			if (imagehref) {
				let imageNode = element(topicNode, 'image');
				let srcUrl = restoreDistributedImageURL(resolveRelativePath(imagehref[1], baseUrl));
				imageNode.appendChild(text(srcUrl));
				imageNode.setAttribute('base_name', imagehref[1].match(/[^\/]+$/)[0]);

				// animated
				re = /<small[^>]*>アニメGIF.<\/small[^>]*>/i.exec(topicInfo);
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
					thumbNode.appendChild(text(thumbUrl));
					thumbNode.setAttribute('width', thumbWidth);
					thumbNode.setAttribute('height', thumbHeight);
				}
			}

			// communist sign :-)
			re = /(\[|dice\d+d\d+=)?<font\s+color="#ff0000">(.+?)<\/font>\]?/i.exec(topic);
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
			re =  /font color="#707070">レス(\d+)件省略。/i.exec(topicInfo);
			if (re) {
				hiddenRepliesCount = re[1] - 0;
			}

			let result = fetchReplies(
				threadRest,
				/<table[^>]*>.*?<input[^>]*>.*?<\/td>/g,
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

			if (threadIndex == 0) {
				if (result.repliesNode.childElementCount) {
					siteInfo.latestNumber = $qs('number', result.repliesNode.lastElementChild).textContent - 0;
				}
			}

			result.repliesNode.setAttribute("total", result.repliesCount);
			result.repliesNode.setAttribute("hidden", hiddenRepliesCount);

			threadIndex++;
		}

		setDefaultSubjectAndName(xml, metaNode, siteInfo.subHash, siteInfo.nameHash);

		timingLogger.endTag();
		return {
			xml: xml,
			remainingRepliesContext: remainingRepliesContext
		};
	}

	function remainingReplies (context, url, maxReplies, lowBoundNumber, callback) {
		timingLogger.startTag('createXMLGenerator#remainingReplies');
		url || (url = window.location.href);
		typeof maxReplies == 'number' || (maxReplies = REST_REPLIES_PROCESS_COUNT);

		var base = document.getElementsByTagName('base')[0];
		if (base) {
			url = base.getAttribute('href');
		}

		function main () {
			do {
				if (context.length == 0) {
					callback();
					timingLogger.endTag();
					return;
				}

				var xml = document.implementation.createDocument(null, 'futaba', null);
				var result = fetchReplies(
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

				var worked = callback(xml, context[0].index, result.repliesCount, context[0].repliesCount);

				var lastIndex = context[0].regex.lastIndex;
				if (!result.lastReached && context[0].regex.exec(context[0].content)) {
					context[0].regex.lastIndex = lastIndex;
					context[0].repliesCount = result.repliesCount;
				}
				else {
					context.shift();
				}
			} while (!worked);

			if (context.length) {
				setTimeout(main, REST_REPLIES_PROCESS_INTERVAL);
			}
			else {
				callback();
				timingLogger.endTag();
				return;
			}
		}

		main();
	}

	return {
		run: run,
		remainingReplies: remainingReplies
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
右のテキストボックス上でホイールを回すと移動量が表示されるので, それらのうち最小の正の値を入力してください`,
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
				gdrive:'Google Drive',
				msonedrive:'Microsoft OneDrive',
				local:'local'
			},
			desc:`localストレージを使用できるのは現在Chromeのみです。
詳細は <a href="https://akahuku.github.io/akahukuplus/how-to-save-image-with-chrome.html" target="_blank">ドキュメント</a> を参照してください。`
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
			value = parseInt(value);
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

	function set (items) {
		chrome.storage.onChanged.removeListener(handleChanged);
		chrome.storage.sync.set(items, () => {
			if (chrome.runtime.lastError) {
				console.error(`${APP_NAME}: storage#set: ${chrome.runtime.lastError.message}`);
			}
			chrome.storage.onChanged.addListener(handleChanged);
		});
	}

	function handleChanged (changes, areaName) {
		if (onChanged) {
			onChanged(changes, areaName);
		}
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
			console.error(`${APP_NAME}: exception in clickDispatcher: ${e.toString()}\n${e.stack}`);
			result = undefined;
		}

		let isAnchor = false;
		for (var elm = e.target; elm; elm = elm.parentNode) {
			if (elm.nodeName == 'A') {
				isAnchor = true;
				break;
			}
		}

		if (isAnchor && result !== 'passthrough') {
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
		remove:remove
	};
}

function createKeyManager () {
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
				`${APP_NAME}: exception in keyManager: ${ex.toString()}\n${e.stack}`);
			result = undefined;
		}
		if (result === 'passthrough') {
			return;
		}
		return false;
	}

	function getFocusedNodeName () {
		let focusedNodeName = document.activeElement.nodeName.toLowerCase();
		if (focusedNodeName == 'input') {
			focusedNodeName += '.' + document.activeElement.type.toLowerCase();
		}
		return focusedNodeName;
	}

	function isSpecialInputElement (name) {
		return /^(?:input\.(?:submit|reset|checkbox|radio|file)|button)$/.test(name);
	}

	function isTextInputElement (name) {
		return /^(?:textarea|input\.(?:text|password))$/.test(name);
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
				stroke.forEach(function (s) {
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
		for (var i in strokes[mode]) {
			if (strokes[mode][i].isPrior) {
				m.push(i);
			}
		}

		qeema.setManifest(m);
	}

	qeema.install().addListener(keypress);

	return {
		addStroke:addStroke,
		removeStroke:removeStroke,
		updateManifest:updateManifest
	};
}

function createSound (name) {
	let volume = 50;
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
			if (typeof v == 'number' && v >= 0 && v <= 100) {
				volume = v;
			}
		}
	}
}

function createMarkStatistics () {
	let marks, otherMarks, ids;
	let repliesCount, newEntries;

	const KEY_MAP = {
		'管理人': 'admin',
		'なー': 'nar',
		'スレッドを立てた人によって削除されました': 'passive',
		'書き込みをした人によって削除されました': 'active'
	};

	function getRepliesCount () {
		return $qsa('article:first-child .reply-wrap').length;
	}

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
					let isNew = (`${i}_${num}`) in newEntries;
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
					let isNew = (`other_${num}`) in newEntries;
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
					let isNew = (`id_${num}`) in newEntries;
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

		return {
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

	function updatePanelView (statistics) {
		if (pageModes[0] != 'reply') return;

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
		let result = false;
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

			result = true;
			let s = current + `(${diff > 0 ? '+' : ''}${diff})`;
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
			let node;
			if (siteInfo.server == 'may' && siteInfo.board == 'id') {
				identified = false;
			}
			else if ((node = $qs('.topic-wrap .email'))
			&& /ID表示/i.test(node.textContent)) {
				identified = false;
			}
		}
		if (marked || identified) {
			sounds.detectNewMark.play();
		}

		return result;
	}

	function resetPostformView () {
		[
			'replies-total', 'replies-mark', 'replies-id',
			'pf-replies-total', 'pf-replies-mark', 'pf-replies-id'
		].forEach(function (id) {
			let e = $(id);
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
		notifyMark: notifyMark,
		notifyId: notifyId,
		updatePanelView: updatePanelView,
		updatePostformView: updatePostformView,
		resetPostformView: resetPostformView
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
		chrome.storage.sync.get({openedThreads:[]}, result => {
			if (chrome.runtime.lastError) {
				console.error(`${APP_NAME}: ${chrome.runtime.lastError.message}`);
				callback([]);
				return;
			}

			const now = Date.now();
			result.openedThreads = result.openedThreads.filter(item => item.expire > now);
			callback(result.openedThreads);
		});
	}

	function saveSlot (slot) {
		storage.set({
			openedThreads: slot
		});
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

	function getAll () {
		return new Promise(resolve => {
			loadSlot(slot => {
				let result = {};
				slot.forEach(item => {
					let key = item.key.split('-');
					if (siteInfo.server == key[0] && siteInfo.board == key[1]) {
						//console.log(`key: ${item.key} expire: ${(new Date(item.expire)).toLocaleString()}`);
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

	/*
	 * TODO: THIS STATEMENT IS TRANSIENT.
	 * WHEN AKAHUKUPLUS THAT USES chrome.storage HAS FULLY DISTRIBUTED,
	 * WE SHOULD DELETE THIS CODE.
	 */
	window.localStorage.removeItem('postUrl');

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
		if (transport.isRunning('catalog')) return;
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
				sendToBackend('open',
					{
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
			setTimeout(() => {setGeometory(item.thumbnail, item.zoomedRect)}, 0);
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
			setTimeout(() => {item.text.classList.add('run')}, 0);
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
		let elms = Array.prototype.slice.call($qsa('body > .catalog-popup'));
		for (let i = 0; i < popups.length; i++) {
			['thumbnail', 'text'].forEach(function (p) {
				let index = elms.indexOf(popups[i][p]);
				index >= 0 && elms.splice(index, 1);
			});
			if (popups[i].target == except) continue;
			close(i);
		}
		elms.forEach(function (elm) {
			elm.parentNode && elm.parentNode.removeChild(elm);
		});
	}

	function deleteAll () {
		Array.prototype.forEach.call(
			$qsa('body > .catalog-popup'),
			node => {
				node.parentNode && node.parentNode.removeChild(node);
			}
		);
		popups.length = 0;
		cursorPos.moved = false;
	}

	function init () {
		container = $(container);
		if (!container) return;

		container.addEventListener(MOVER_EVENT_NAME, mover, false);
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
		if (pageModes[0] != 'reply') return;

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
		var cache = getQuoteOriginCache(quote);
		if (cache) {
			return cache;
		}

		var sentinelNo = getPostNumber(sentinelWrap);

		// lookup quote type...
		var re = /^>+\s*(?:no\.)?(\d+)\s*(?:\n|$)/i.exec(quote.textContent);
		if (re) {
			// quote via post number
			var quotedNo = re[1] - 0;
			if (quotedNo >= sentinelNo) {
				return null;
			}

			var origin = $qs([
				`article .topic-wrap[data-number="${quotedNo}"]`,
				`article .reply-wrap > [data-number="${quotedNo}"]`
			].join(','));
			if (!origin) {
				return null;
			}
			if (origin == sentinelWrap) {
				return null;
			}

			var index = $qs('.no', origin);
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

		// quote via content string
		var span = document[CRE]('span');
		var quoteText = quote.textContent.replace(/[\s\u3000]*$/, '');
		var quoteTextForSearch;

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

		var nodes = $qsa([
			'article .topic-wrap .comment',
			'article .reply-wrap .comment'
		].join(','));
		for (var i = 0, goal = nodes.length; i < goal ; i++) {
			var origin = getWrapElement(nodes[i]);
			var originNo = getPostNumber(origin);

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
		let noElm = $qs('.no', div);
		if (noElm) {
			let a = document[CRE]('a');
			noElm.parentNode.replaceChild(a, noElm);
			a.className = 'jumpto-quote-anchor';
			a.href = '#jumpto-quote-origin';
			a.textContent = noElm.textContent;
			a.setAttribute(ORIGIN_ID_ATTR, quoteOrigin.element.id);
		}
		let checkElm = $qs('input[type="checkbox"]', div);
		if (checkElm) {
			checkElm.parentNode.removeChild(checkElm);
		}
		let iframe;
		while ((iframe = $qs('iframe', div))) {
			iframe.parentNode.removeChild(iframe);
		}

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
	var enabled = true;
	var text;

	function init () {
		window.addEventListener('mouseup', function (e) {
			setTimeout(mup, 0, e);
		}, false);

		clickDispatcher.add('.selmenu', function (e, t) {
			window.getSelection().collapseToStart();
			dispatch(t.href.match(/#ss-(.+)/)[1], text);
			text = undefined;
		});
	}

	function mup (e) {
		if (!enabled) return;

		var menu = $('selection-menu');
		if (!menu) return;

		if (isVisible(menu)) {
			hide(menu);
			return;
		}

		var s = '';
		var sel = window.getSelection();
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
	}

	function isVisible (menu) {
		return !menu.classList.contains('hide');
	}

	function show (menu) {
		menu.classList.remove('hide');
		menu.style.visibility = 'hidden';
		menu.style.left = menu.style.top = '0';

		var w = menu.offsetWidth;
		var h = menu.offsetHeight;
		var sl = docScrollLeft();
		var st = docScrollTop();
		var cw = viewportRect.width;
		var ch = viewportRect.height;
		var l = Math.max(0, Math.min(cursorPos.pagex, sl + cw - w));
		var t = Math.max(0, Math.min(cursorPos.pagey, st + ch - h));
		menu.style.left = l + 'px';
		menu.style.top = t + 'px';
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
				let com = $('com');
				if (com) {
					quote(com, text, /^quote\b/.test(key));
					commands.activatePostForm();
					com.setSelectionRange(com.value.length, com.value.length);
				}
			}
			break;

		case 'copy':
		case 'copy-with-quote':
			{
				let quoted = key == 'copy' ? text : getQuoted(text);

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
			sendToBackend('open',
				{
					url:'https://www.google.com/search?hl=ja&q=' +
						encodeURIComponent(text).replace(/%20/g, '+'),
					selfUrl:window.location.href
				});
			break;
		case 'amazon':
			sendToBackend('open',
				{
					url:'http://www.amazon.co.jp/' +
						'exec/obidos/external-search' +
						'?mode=blended&field-keywords=' +
						encodeURIComponent(text).replace(/%20/g, '+'),
					selfUrl:window.location.href
				});
			break;
		case 'wikipedia':
			sendToBackend('open',
				{
					url:'http://ja.wikipedia.org/wiki/' +
						'%E7%89%B9%E5%88%A5:Search?search=' +
						encodeURIComponent(text).replace(/%20/g, '+') +
						'&go=%E8%A1%A8%E7%A4%BA',
					selfUrl:window.location.href
				});
			break;
		case 'youtube':
			sendToBackend('open',
				{
					url:'http://www.youtube.com/results?search_query=' +
						encodeURIComponent(text).replace(/%20/g, '+') +
						'&search=Search',
					selfUrl:window.location.href
				});
			break;
		}
	}

	function getQuoted (s) {
		return s.split('\n')
			.map(line => `>${line}`)
			.join('\n');
	}

	function quote (target, text, addPrefix) {
		target = $(target);
		if (!target) return;

		var s = text;
		if (addPrefix) {
			s = getQuoted(s);
		}
		if (s == '') {
			return;
		}
		if (/^\s*$/.test(target.value)) {
			target.value = s.replace(/\n$/, '');
		}
		else {
			target.value = `${target.value.replace(/\n$/, '')}\n${s}`;
		}

		target.value += '\n';
	}

	function setClipboardGecko (text) {
		let textarea = document.body.appendChild(document[CRE]('textarea'));
		const styles = {
			position: 'fixed',
			width: '300px',
			height: '300px',
			left: '-400px',
			top: '0px'
		};
		for (let i in styles) {
			textarea.style[i] = styles[i];
		}
		textarea.value = text;
		textarea.focus();
		textarea.select();
		document.execCommand('copy');
		textarea.parentNode.removeChild(textarea);
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

		switch (pageModes[0]) {
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

			isLoading = true;
			getImageFrom(restoreDistributedImageURL(thumb.src), img => {
				if (img) {
					overwriteFavicon(img, createLinkNode());
				}
				isLoading = false;
			});
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
	const transport = {};
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
			transport[tag] = result;
		}

		return result;
	}

	function release (tag) {
		if (tag in transport) {
			delete transport[tag];
			lastUsedTime[tag] = Date.now();
		}
	}

	function abort (tag) {
		if (tag in transport) {
			try {
				transport[tag].abort();
			}
			catch (e) {
			}

			release(tag);
		}
	}

	function isRapidAccess (tag) {
		let result = false;

		if (tag in transport
		&& Date.now() - lastUsedTime[tag] <= NETWORK_ACCESS_MIN_INTERVAL) {
			setBottomStatus('ちょっと待ってね。');
			result = true;
		}

		return result;
	}

	function isRunning (tag) {
		if (tag) {
			return !!transport[tag];
		}
		else {
			return Object.keys(transport).length > 0;
		}
	}

	function getTransport (tag) {
		if (tag in transport) {
			return transport[tag];
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
			Array.prototype.forEach.call(
				$qsa('iframe[data-src]'),
				function (iframe) {
					iframe.src = iframe.getAttribute('data-src');
					iframe.removeAttribute('data-src');
				}
			);
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
		timer = setTimeout(function () {
			timer = null;
			doit();
		}, 1000);
	}

	function doit () {
		var st = docScrollTop();
		var vt = st - viewportRect.height;
		var vb = st + viewportRect.height * 2;
		Array.prototype.forEach.call(
			$qsa('.inline-video'),
			function (node) {
				var rect = node.getBoundingClientRect();
				if (rect.bottom + st < vt
				||  rect.top + st > vb) {
					// invisible
					if (node.childNodes.length) {
						setBottomStatus('解放: ' + node.parentNode.getElementsByTagName('a')[0].href);
						empty(node);
					}
				}
				else {
					// visible
					var markup = node.getAttribute('data-markup');
					if (markup && node.childNodes.length == 0) {
						setBottomStatus('読み込み中: ' + node.parentNode.getElementsByTagName('a')[0].href);
						node[IAHTML]('beforeend', markup);
					}
				}
			}
		);
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
				console.error(`${APP_NAME}: exception in resize handler: ${ex.message}`);
			}
		}, frequencyMsecs, e);
	}

	window.addEventListener('resize', handleResize);
	handler.call(window);
}

function setupPostFormItemEvent (items) {
	let initialComHeight;
	let timer;

	function updateInfoCore (item) {
		let el = $(item.id);
		if (!el) return;

		let lines = el.value.replace(/[\r\n\s]+$/, '').split(/\r?\n/);
		let bytes = lines.join('\r\n').replace(/[^\u0001-\u007f\uff61-\uff9f]/g, '__').length;
		let linesOvered = item.lines ? lines.length > item.lines : false;
		let bytesOvered = item.bytes ? bytes > item.byltes : false;

		let span = $('comment-info').appendChild(document[CRE]('span'));
		linesOvered || bytesOvered && span.classList.add('warn');
		$t(span, [
			item.head  ? `${item.head}:` : '',
			item.lines ? `${lines.length}/${item.lines}行` : '',
			item.lines ? ' (' : '',
			item.bytes ? `${bytes}/${item.bytes}` : '',
			item.lines ? ')' : ''
		].join(''));
	}

	function fixTextAreaHeight (e) {
		let com = e.target;
		let comBackend = $('comment-backend');
		if (!comBackend) return;
		comBackend.style.width = com.scrollWidth + 'px';
		$t(comBackend, com.value + (/[\r\n]/.test(com.value.substr(-1)) ? '_' : ''));
		com.style.height = Math.max(
			initialComHeight, Math.min(
				comBackend.offsetHeight,
				Math.floor(viewportRect.height * 0.8))) + 'px';
	}

	function updateInfo (e) {
		$('comment-info')[IHTML] = '';
		items.forEach(updateInfoCore);
	}

	function register (fn) {
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(fn, 50);
	}

	function isFileElementReady () {
		const upfile = $('upfile');
		if (!upfile) return false;
		if (upfile.disabled) return false;
		if (upfile.getAttribute('data-pasting')) return;
		return true;
	}

	function findAcceptableFile (files) {
		const availableTypes = [
			'image/jpg', 'image/jpeg',
			'image/png',
			'image/gif',
			'video/webm',
			'video/mp4'
		];
		return Array.prototype.reduce.call(files, (file, f) => {
			if (file) return file;
			if (availableTypes.indexOf(f.type) >= 0) return f;
			return null;
		}, null);
	}

	function dumpElement (head, elm) {
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
		console.log(head + ': ' + logs.join(' → '));
	}

	function handleDragOver (e) {
		if (!isFileElementReady()) return;
		if (!e.dataTransfer || !e.dataTransfer.items) return;
		if (!findAcceptableFile(e.dataTransfer.items)) return;

		e.preventDefault();
		//dumpElement('    dragover', e.target);

		register(() => {
			if (!$('postform-wrap').classList.contains('hover')) {
				commands.activatePostForm().then(() => {
				});
			}
			$('postform-drop-indicator').classList.remove('hide');
		});
	}

	function handleDragEnter (e) {
		if (!isFileElementReady()) return;

		e.preventDefault();
		//dumpElement('    dragenter', e.target);
	}

	function handleDragLeave (e) {
		if (!isFileElementReady()) return;

		//dumpElement('    dragleave', e.target);

		let isDocument = e.target == document
			|| e.target == document.documentElement
			|| e.target == document.body;
		if (isDocument && $('postform-wrap').classList.contains('hover')) {
			register(() => {
				commands.deactivatePostForm().then(() => {
					$('postform-drop-indicator').classList.add('hide');
				});
			});
		}
	}

	function handleDrop (e) {
		if (!isFileElementReady()) return;

		e.preventDefault();
		$('postform-drop-indicator').classList.add('hide');
		handlePaste(e);
		$('com').focus();
	}

	function handlePaste (e) {
		const upfile = $('upfile');
		if (!isFileElementReady()) return;

		const dataTransfer = e.clipboardData || e.dataTransfer;
		if (!dataTransfer) return;

		if (!dataTransfer.files
		|| dataTransfer.files.length == 0) {
			setTimeout(fixTextAreaHeight, 0, e);
			return;
		}

		let file = findAcceptableFile(dataTransfer.files);
		if (!file) return;

		upfile.setAttribute('data-pasting', '1');
		setBottomStatus('画像を貼り付けています...', true);
		resetForm('baseform', 'upfile', 'textonly');
		overrideUpfile = {
			name: file.name,
			data: file
		};

		if (siteInfo.maxAttachSize && file.size > siteInfo.maxAttachSize) {
			getImageFrom(file, img => {
				if (!img) {
					upfile.removeAttribute('data-pasting');
					return;
				}

				let canvas = document[CRE]('canvas');
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				let c = canvas.getContext('2d');
				c.fillStyle = '#000000';
				c.fillRect(0, 0, canvas.width, canvas.height);
				c.drawImage(img, 0, 0);

				setPostThumbnail(canvas, () => setBottomStatus());

				getBlobFrom(canvas.toDataURL('image/jpeg', 0.8), blob => {
					overrideUpfile.data = blob;
					upfile.removeAttribute('data-pasting');
				});
			});
		}
		else {
			setPostThumbnail(file, () => {
				setBottomStatus();
				upfile.removeAttribute('data-pasting');
			});
		}
	}

	let com = $('com');
	if (com) {
		initialComHeight = com.offsetHeight;
		items.forEach(item => {
			let el = $(item.id);
			if (!el) return;

			if (el.nodeName == 'TEXTAREA') {
				el.addEventListener('input', fixTextAreaHeight);
			}
			el.addEventListener('input', updateInfo);
		});
		updateInfo.call(com);
		com.addEventListener('paste', handlePaste);
		document.addEventListener('dragover', handleDragOver);
		document.addEventListener('dragenter', handleDragEnter, true);
		document.addEventListener('dragleave', handleDragLeave, true);
		document.addEventListener('drop', handleDrop);
	}
}

function setupWheelReload () {
	let accum = 0;
	let lastWheeled = 0;

	function handler (e) {
		if (transport.isRunning()) {
			e.preventDefault();
			return;
		}

		if (e.target.classList.contains('dialog-content-wrap')) {
			e.preventDefault();
			return;
		}

		const now = Date.now();
		const st = docScrollTop();
		const sh = document.documentElement.scrollHeight;

		let wheelDelta = e.deltaY;

		if (wheelDelta < 0 || st < sh - viewportRect.height) {
			lastWheeled = now;
			accum = 0;
			setBottomStatus();
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
			setBottomStatus();
		}

		accum += Math.abs(wheelDelta);

		if (accum < threshold) {
			setBottomStatus(`リロードぢから：${Math.min(Math.floor(accum / threshold * 100), 99)}%`);
			return;
		}

		lastWheeled = now;
		accum = 0;
		e.preventDefault();
		setBottomStatus();
		commands.reload();
	}

	window.addEventListener('wheel', handler, false);
}

function setupCustomEventHandler () {
	let statusHideTimer;
	document.addEventListener(`${APP_NAME}.bottomStatus`, function (e) {
		let ws = $('wheel-status');
		if (!ws) return;
		if ($qs('#dialog-wrap:not(.hide)')) return;

		let s = e.detail.message;
		if (!s || s == '') {
			ws.classList.add('hide');
		}
		else {
			ws.classList.remove('hide');
			$t(ws.getElementsByTagName('span')[0], s);
			if (statusHideTimer) {
				clearTimeout(statusHideTimer);
				statusHideTimer = null;
			}
			if (!e.detail.persistent) {
				statusHideTimer = setTimeout(function () {
					statusHideTimer = null;
					ws.classList.add('hide');
				}, 1000 * 3);
			}
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

function lightbox (anchor, ignoreThumbnail) {
	const MARGIN = 32;
	const CLICK_THRESHOLD_DISTANCE = 4;
	const CLICK_THRESHOLD_TIME = 500;
	const WHEEL_SCROLL_UNIT_FACTOR = 0.4;
	const ZOOMMODE_KEY = `${APP_NAME}.lightbox.zoomMode`;

	var lightboxWrap;
	var dimmer;
	var imageWrap;
	var loaderWrap;
	var image;
	var receiver;
	var linkedImage;
	var zoomMode = 'whole';
	var isInTransition = true;
	var dragState = {x:0, y:0, region:0};

	function getRegionId (e) {
		var lightbox = $qs('#lightbox-wrap');
		var imageRect = image ? image.getBoundingClientRect() : null;
		var imageWrapRect = $qs('.image-wrap', lightbox).getBoundingClientRect();
		if (imageRect
		&&  e.clientX >= imageRect.left && e.clientX < imageRect.right
		&&  e.clientY >= imageRect.top  && e.clientY < imageRect.bottom) {
			return 0;
		}
		else if (e.clientX >= imageWrapRect.left && e.clientX < imageWrapRect.right
		     &&  e.clientY >= imageWrapRect.top  && e.clientY < imageWrapRect.bottom) {
			return -1;
		}
		else {
			return -2;
		}
	}

	function getImageRect () {
		var vw = viewportRect.width - MARGIN * 2;
		var vh = viewportRect.height - MARGIN * 2;
		var tw = image.getAttribute('data-thumb-width') - 0;
		var th = image.getAttribute('data-thumb-height') - 0;
		var width = 0, height = 0, ratio = 0;

		switch (zoomMode) {
		case 'whole':
			// portrait image
			if (tw < th) {
				ratio = tw / th;
				width = Math.floor(vh * ratio);
				height = vh;
				if (width > vw) {
					ratio = th / tw;
					width = vw;
					height = Math.floor(vw * ratio);
				}
			}
			// landscape image
			else {
				ratio = th / tw;
				width = vw;
				height = Math.floor(vw * ratio);
				if (height > vh) {
					ratio = tw / th;
					width = Math.floor(vh * ratio);
					height = vh;
				}
			}
			break;

		case 'actual-size':
			width = image.naturalWidth;
			height = image.naturalHeight;
			break;

		case 'fit-to-width':
			width = vw;
			height = Math.floor(width * (th / tw));
			break;

		case 'fit-to-height':
			height = vh;
			width = Math.floor(height * (tw / th));
			break;
		}

		return {
			left:Math.floor(viewportRect.width / 2 - width / 2),
			top:Math.floor(viewportRect.height / 2 - height / 2),
			width:width,
			height:height
		};
	}

	function applyGeometory (rect, dropEndEvent) {
		var currentRect = image.getBoundingClientRect();
		if (rect.left != currentRect.left
		||  rect.top != currentRect.top
		||  rect.width != currentRect.width
		||  rect.height != currentRect.height) {

			['left', 'top', 'width', 'height']
				.forEach(function (p) {image.style[p] = rect[p] + 'px'});

			if (!dropEndEvent) {
				transitionend(image, handleImageTransitionEnd);
				isInTransition = true;
			}
		}
		else {
			handleImageTransitionEnd();
		}
	}

	function updateZoomModeLinks () {
		Array.prototype.forEach.call(
			$qsa('#lightbox-zoom-modes a'),
			function (node) {
				node.classList.remove('selected');
				node.getAttribute('href') == '#lightbox-' + zoomMode && node.classList.add('selected');
			}
		);
	}

	function updateGeometoryInfo () {
		if (image.naturalWidth && image.naturalHeight) {
			$t('lightbox-ratio',
				`${image.naturalWidth}x${image.naturalHeight}, ` +
				(image.offsetWidth / image.naturalWidth * 100).toFixed(2) + '%');
		}
	}

	function setZoomMode (zm, force) {
		if (zm != 'whole'
		&& zm != 'actual-size'
		&& zm != 'fit-to-width'
		&& zm != 'fit-to-height') return;
		if (zm == zoomMode && !force) return;

		zoomMode = zm;
		storage.runtime.lightbox.zoomMode = zm;
		storage.saveRuntime();

		/*
		 * TODO: THIS STATEMENT IS TRANSIENT.
		 * WHEN AKAHUKUPLUS THAT USES chrome.storage HAS FULLY DISTRIBUTED,
		 * WE SHOULD DELETE THIS CODE.
		 */
		window.localStorage.removeItem(ZOOMMODE_KEY);

		applyGeometory(getImageRect());
	}

	function initZoomMode () {
		var zm = storage.config.lightbox_zoom_mode.value;
		if (zm == 'last') {
			zm = storage.runtime.lightbox.zoomMode;
		}
		setZoomMode(zm);
	}

	function init () {
		var thumbImage = ignoreThumbnail ? null : $qs('img', anchor);
		lightboxWrap = $('lightbox-wrap');
		dimmer = $qs('.dimmer', lightboxWrap);
		imageWrap = $qs('.image-wrap', lightboxWrap);
		loaderWrap = $qs('.loader-wrap', lightboxWrap);
		receiver = $qs('.receiver', lightboxWrap);

		if (!lightboxWrap || !dimmer || !imageWrap || !loaderWrap || !receiver
		|| imageWrap.childNodes.length) {
			anchor = image = lightboxWrap = dimmer = imageWrap = loaderWrap = receiver = null;
			return;
		}

		appStates.unshift('lightbox');

		// thumbnail image
		if (thumbImage) {
			image = imageWrap.appendChild(thumbImage.cloneNode(false));
			['className', 'width', 'height'].forEach(function (p) {image.removeAttribute(p)});

			var rect = thumbImage.getBoundingClientRect();
			image.setAttribute('data-thumb-width', rect.width);
			image.setAttribute('data-thumb-height', rect.height);
			applyGeometory(rect, true);
		}

		if (thumbImage) {
			loaderWrap.classList.add('hide');
		}
		else {
			loaderWrap.classList.remove('hide');
		}

		// info
		$t('lightbox-ratio', '読み込み中...');
		var link = $('lightbox-link');
		$t(link, anchor.href.match(/\/([^\/]+)$/)[1]);
		link.href = anchor.href;

		// linked image
		linkedImage = new Image();
		linkedImage.src = anchor.href;
		if (linkedImage.naturalWidth && linkedImage.naturalHeight) {
			handleLinkedImageLoad.call(linkedImage);
		}
		else {
			linkedImage.addEventListener('load', handleLinkedImageLoad, false);
			linkedImage.addEventListener('error', handleLinkedImageError, false);
		}

		// register event handlers
		receiver.addEventListener('mousedown', handleMousedown, false);
		receiver.addEventListener('mouseup', handleMouseup, false);
		receiver.addEventListener('mousewheel', handleMousewheel, false);

		clickDispatcher
			.add('#lightbox-whole', handleZoomModeClick)
			.add('#lightbox-actual-size', handleZoomModeClick)
			.add('#lightbox-fit-to-width', handleZoomModeClick)
			.add('#lightbox-fit-to-height', handleZoomModeClick)
			.add('#lightbox-search', handleSearch);

		keyManager
			.addStroke('lightbox', ['o', 'a', 'w', 'h'], handleZoomModeKey)
			.addStroke('lightbox', '\u001b', leave)
			.addStroke('lightbox', 's', handleSearch)
			.addStroke('lightbox', [' ', '<S-space>'], handleStroke, true)
			.updateManifest();

		// disable auto selection menu
		selectionMenu.enabled = false;

		// start
		lightboxWrap.classList.remove('hide');
		if (thumbImage) {
			setTimeout(function () {
				applyGeometory(getImageRect());
				dimmer.classList.add('run');
			}, 0);
		}
		else {
			isInTransition = false;
			setTimeout(function () {
				dimmer.classList.add('run');
			}, 0);
		}
	}

	function handleImageTransitionEnd (e) {
		// show info panel
		$qs('.info', lightboxWrap).classList.remove('hide');

		// update zoom mode links
		updateZoomModeLinks();

		// update geometory info
		if (image.src == anchor.href) {
			updateGeometoryInfo();
		}

		isInTransition = false;
	}

	function handleLinkedImageLoad () {
		this.removeEventListener('load', handleLinkedImageLoad, false);
		this.removeEventListener('error', handleLinkedImageError, false);

		if (image) {
			image.src = this.src;
			updateGeometoryInfo();

			setTimeout(function () {
				initZoomMode();
			}, 0);
		}
		else {
			image = this;
			imageWrap.appendChild(image);
			image.setAttribute('data-thumb-width', image.naturalWidth);
			image.setAttribute('data-thumb-height', image.naturalHeight);
			loaderWrap.classList.add('hide');

			var w = image.naturalWidth;
			var h = image.naturalHeight;
			while (w > viewportRect.width / 4 || h > viewportRect.height / 4) {
				w /= 2;
				h /= 2;
			}

			applyGeometory({
				left:Math.floor(viewportRect.width / 2 - w / 2),
				top:Math.floor(viewportRect.height / 2 - h / 2),
				width:Math.floor(w),
				height:Math.floor(h)
			}, true);

			setTimeout(function () {
				applyGeometory(getImageRect());
				initZoomMode();
			}, 0);
		}

		linkedImage = null;
	}

	function handleLinkedImageError () {
		this.removeEventListener('load', handleLinkedImageLoad, false);
		this.removeEventListener('error', handleLinkedImageError, false);
		linkedImage = null;
	}

	function handleMousedown (e) {
		if (isInTransition) return;

		e.preventDefault();
		e.stopPropagation();

		if (e.target != e.currentTarget || e.button != 0) {
			dragState.region = -9;
			return;
		}

		dragState.x = e.clientX;
		dragState.y = e.clientY;
		dragState.region = getRegionId(e);
		dragState.imageRect = image ? image.getBoundingClientRect() : null;
		dragState.time = Date.now();

		if (image) {
			if (image.classList.contains('dragging')) {
				dragState.x = dragState.y = -1;
				dragState.region = -2;
			}
			else {
				receiver.addEventListener(MMOVE_EVENT_NAME, handleMousemove, false);
				image.classList.add('dragging');
			}
		}
	}

	function handleMousemove (e) {
		if (isInTransition) return;
		if (dragState.region != 0) return;

		e.preventDefault();
		e.stopPropagation();

		if (!image) return;

		var left, top;
		switch (zoomMode) {
		case 'actual-size':
			if (image.offsetWidth > viewportRect.width) {
				left = dragState.imageRect.left + (e.clientX - dragState.x);
			}
			if (image.offsetHeight > viewportRect.height) {
				top = dragState.imageRect.top + (e.clientY - dragState.y);
			}
			break;

		case 'fit-to-width':
			if (image.offsetHeight > viewportRect.height) {
				top = dragState.imageRect.top + (e.clientY - dragState.y);
			}
			break;

		case 'fit-to-height':
			if (image.offsetWidth > viewportRect.width) {
				left = dragState.imageRect.left + (e.clientX - dragState.x);
			}
			break;
		}

		if (left != undefined) {
			if (left > MARGIN) {
				left = MARGIN;
			}
			if (left < viewportRect.width - image.offsetWidth - MARGIN) {
				left = viewportRect.width - image.offsetWidth - MARGIN;
			}
			image.style.left = left + 'px';
		}

		if (top != undefined) {
			if (top > MARGIN) {
				top = MARGIN;
			}
			if (top < viewportRect.height - image.offsetHeight - MARGIN) {
				top = viewportRect.height - image.offsetHeight - MARGIN;
			}
			image.style.top = top + 'px';
		}
	}

	function handleMouseup (e) {
		if (isInTransition) return;

		e.preventDefault();
		e.stopPropagation();

		image && image.classList.remove('dragging');
		receiver.removeEventListener(MMOVE_EVENT_NAME, handleMousemove, false);

		var d = Math.sqrt(
			Math.pow(dragState.x - e.clientX, 2) +
			Math.pow(dragState.y - e.clientY, 2));

		if (Date.now() - dragState.time < CLICK_THRESHOLD_TIME
		&&  d < CLICK_THRESHOLD_DISTANCE) {
			leave();
		}
	}

	function handleMousewheel (e) {
		if (isInTransition) return;

		e.preventDefault();
		e.stopPropagation();

		if (!image) return;

		var top;
		var imageRect = image.getBoundingClientRect();
		switch (zoomMode) {
		case 'actual-size':
		case 'fit-to-width':
			if (image.offsetHeight > viewportRect.height) {
				var sign;
				if (e.wheelDelta) {
					sign = e.wheelDelta > 0 ? 1 : -1;
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
			if (top < viewportRect.height - image.offsetHeight - MARGIN) {
				top = viewportRect.height - image.offsetHeight - MARGIN;
			}
			image.style.top = top + 'px';
		}
	}

	function handleZoomModeClick (e, t) {
		if (isInTransition) return;
		if (!image) return;
		setZoomMode(
			t.getAttribute('href').replace('#lightbox-', ''));
	}

	function handleZoomModeKey (e) {
		if (isInTransition) return;
		if (!image) return;
		setZoomMode({
			'o': 'whole',
			'a': 'actual-size',
			'w': 'fit-to-width',
			'h': 'fit-to-height'
		}[e.key]);
	}

	function handleSearch (e) {
		if (isInTransition) return;
		if (!image) return;
		let lang = window.navigator.browserLanguage
			|| window.navigator.language
			|| window.navigator.userLanguage;
		var url = 'http://www.google.com/searchbyimage'
			+ `?sbisrc=${APP_NAME}`
			+ `&hl=${lang.toLowerCase()}`
			+ `&image_url=${encodeURIComponent(image.src)}`;
			sendToBackend('open', {url:url, selfUrl:window.location.href});
	}

	function handleStroke (e) {
		let view = window[USW] || window;
		let ev = new WheelEvent('wheel', {
			bubbles: true, cancelable: true, view: view,
			detail: 0, screenX: 0, screenY: 0, clientX: 0, clientY: 0,
			ctrlKey: e.ctrl, altKey: false, shiftKey: e.shift, metaKey: false,
			button: 0, relatedTarget: null
		});
		receiver.dispatchEvent(ev);
	}

	function leave () {
		$qs('.info', lightboxWrap).classList.add('hide');
		image && image.parentNode.removeChild(image);

		receiver.removeEventListener('mousedown', handleMousedown, false);
		receiver.removeEventListener(MMOVE_EVENT_NAME, handleMousemove, false);
		receiver.removeEventListener('mouseup', handleMouseup, false);

		clickDispatcher
			.remove('#lightbox-whole')
			.remove('#lightbox-actual-size')
			.remove('#lightbox-fit-to-width')
			.remove('#lightbox-fit-to-height')
			.remove('#lightbox-search');

		keyManager
			.removeStroke('lightbox');

		selectionMenu.enabled = true;

		transitionend(dimmer, function () {
			lightboxWrap.classList.add('hide');
			anchor = image = lightboxWrap = dimmer = imageWrap = receiver = null;
			appStates.shift();
			keyManager.updateManifest();
		});

		setTimeout(function () {
			dimmer.classList.remove('run');
		}, 0);
	}

	init();
}

/*
 * <<<1 drawer functions
 */

function startColorPicker (target, options) {
	const IMAGE_SV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPAgMAAABGuH3ZAAAACVBMVEUAAAAAAAD///+D3c/SAAAAAXRSTlMAQObYZgAAADdJREFUCNdjYGB1YGBgiJrCwMC4NJOBgS1AzIFBkoFxAoRIYXVIYUhhAxIgFkICrA6kA6IXbAoAsj4LrV7uPHgAAAAASUVORK5CYII=';
	const IMAGE_HUE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAAJCAYAAABNEB65AAAAR0lEQVQ4y9XTIQ4AMAhD0V/uf2emJkZCZlsUIYgnWoAmb7rukoQGqHlIQE+4O/6x1e/BEb3BZQjXDy7jqGiDK6CcSinkmvkDtwYMCcTVwlUAAAAASUVORK5CYII=';
	const IMAGE_UP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAICAYAAAAm06XyAAAAQElEQVQY05XMwQ0AIAhD0ToC++9YRqgnL0YKNuFE/oMkVEdS7t+FcoANzyqgDR0wCitgHL6Ar/AGFklFBH6Xmdg1tm7Xheu+iwAAAABJRU5ErkJggg==';
	const LRU_KEY = 'ColorPicker.LRUList';
	const LRU_COLOR_ATTR = 'data-color';

	var overlay, panel, colorPanel, LRUPanel, controlPanel,
		svCanvas, hueCanvas, receiver, colorText, okButton,
		svCursor, hueCursor, upArrow, currentColor;

	// utility functions
	function style (elm, s) {
		for (var i in s) if (i in elm.style) elm.style[i] = '' + s[i];
		return elm;
	}

	function cre (elm, name) {
		return elm.appendChild(document[CRE](name));
	}

	function parsejson (fragment, defaultValue) {
		try { return JSON.parse(fragment) }
		catch (e) { return defaultValue }
	}

	function minmax (min, value, max) {
		return Math.max(min, Math.min(value, max));
	}

	function emit () {
		var args = Array.prototype.slice.call(arguments), name = args.shift();
		if (!(name in options) || typeof options[name] != 'function') return;
		try { return options[name].apply(null, args) }
		catch (e) { }
	}

	// dom manipulators
	function createOverlay () {
		return style(overlay = cre(document.body, 'div'), {
			position: 'fixed',
			left: 0, top: 0, right: 0, bottom: 0,
			backgroundColor: 'rgba(0,0,0,.01)',
			zIndex: '1879048192'
		})
	}

	function createPanel () {
		style(panel = cre(document.body, 'div'), {
			position: 'absolute',
			backgroundColor: '#fff',
			color: '#333',
			padding: '16px',
			border: '1px solid #eee',
			borderRadius: '3px',
			boxShadow: '0 10px 6px -6px rgba(0,0,0,.5)',
			zIndex: '1879048193'
		});

		style(upArrow = cre(panel, 'img'), {
			position: 'absolute',
			left: '0', top: '-8px'
		});
		upArrow.src = IMAGE_UP;

		// row 1, color panel
		colorPanel = cre(panel, 'div');
		style(svCanvas = cre(colorPanel, 'canvas'), {
			margin: '0 14px 0 0',
			width: '200px',
			height: '200px',
			outline: '1px solid silver'
		});

		style(hueCanvas = cre(colorPanel, 'canvas'), {
			margin: '0',
			width: '32px',
			height: '200px',
			outline: '1px solid silver'
		});

		style(svCursor = cre(colorPanel, 'img'), {
			position: 'absolute',
			left: '0',
			top: '0'
		});
		svCursor.src = IMAGE_SV;

		style(hueCursor = cre(colorPanel, 'img'), {
			position: 'absolute',
			left: '-5px',
			top: '0'
		});
		hueCursor.src = IMAGE_HUE;

		style(receiver = cre(colorPanel, 'div'), {
			position: 'absolute',
			width: '281px', height: '226px',
			left: '0', top: '0',
			backgroundColor: 'rgba(0,0,0,.01)'
		});

		// row 2, LRU panel
		style(LRUPanel = cre(panel, 'div'), {
			margin: '8px 0 8px 0',
			padding: '0 0 0 3px',
			width: '246px',
			overflow: 'hidden',
			whiteSpace: 'nowrap'
		});
		for (var i = 0; i < 9; i++) {
			style(cre(LRUPanel, 'div'), {
				display: 'inline-block',
				width: '22px',
				height: '22px',
				backgroundColor: '#808080',
				margin: '0 3px 0 0',
				border: '1px solid silver',
				cursor: 'pointer'
			});
		}

		// row 3, control panel
		style(controlPanel = cre(panel, 'div'), {
			margin: '0',
			textAlign: 'right'
		});

		style(colorText = cre(controlPanel, 'input'), {
			margin: '0 4px 0 0',
			pading: '3px',
			border: '1px solid silver',
			width: '8em',
			fontFamily: 'monospace'
		});
		colorText.type = 'text';

		style(okButton = cre(controlPanel, 'input'), {
			width: '8em'
		});
		okButton.type = 'button';
		okButton.value = 'OK';

		return panel;
	}

	function paintSaturationValue (canvas, hueValue) {
		var c = canvas.getContext('2d');
		c.clearRect(0, 0, canvas.width, canvas.height);

		var g = c.createLinearGradient(0, 0, canvas.width, 0);
		g.addColorStop(0, `hsl(${hueValue},100%,100%)`);
		g.addColorStop(1, `hsl(${hueValue},100%, 50%)`);
		c.fillStyle = g;
		c.fillRect(0, 0, canvas.width, canvas.height);

		var g = c.createLinearGradient(0, 0, 0, canvas.height);
		g.addColorStop(0, `hsla(${hueValue},100%,50%,0)`);
		g.addColorStop(1, `hsla(${hueValue},100%, 0%,1)`);
		c.fillStyle = g;
		c.fillRect(0, 0, canvas.width, canvas.height);
	}

	function paintHue (canvas) {
		var c = canvas.getContext('2d');
		var g = c.createLinearGradient(0, 0, 0, canvas.height);
		g.addColorStop(0,         'hsl(  0,100%,50%)');
		g.addColorStop(1 / 6 * 1, 'hsl( 60,100%,50%)');
		g.addColorStop(1 / 6 * 2, 'hsl(120,100%,50%)');
		g.addColorStop(1 / 6 * 3, 'hsl(180,100%,50%)');
		g.addColorStop(1 / 6 * 4, 'hsl(240,100%,50%)');
		g.addColorStop(1 / 6 * 5, 'hsl(300,100%,50%)');
		g.addColorStop(1,         'hsl(360,100%,50%)');
		c.fillStyle = g;
		c.fillRect(0, 0, canvas.width, canvas.height);
	}

	function paintHexText (color) {
		colorText.value = color.text;
	}

	function paintHueCursor (color) {
		style(hueCursor, {
			left: (hueCanvas.offsetLeft - 7) + 'px',
			top: (hueCanvas.offsetTop - 4 + (color.hue / 360) * hueCanvas.offsetHeight) + 'px'
		});
	}

	function paintSvCursor (color) {
		style(svCursor, {
			left: (svCanvas.offsetLeft - 7 + color.saturation * (svCanvas.offsetWidth - 1)) + 'px',
			top: (svCanvas.offsetTop - 7 + (1 - color.value) * (svCanvas.offsetHeight - 1)) + 'px'
		});
	}

	function paintLRU () {
		var list = parsejson(window.sessionStorage[LRU_KEY]);
		if (!(list instanceof Array)) list = [];

		function setColor (node, color) {
			node.style.backgroundColor = color;
			node.setAttribute(LRU_COLOR_ATTR, color);
		}

		list.forEach(function (color, i) {
			if (LRUPanel.children[i]) {
				setColor(LRUPanel.children[i], color);
			}
		});

		// futaba specific
		setColor(LRUPanel.children[LRUPanel.children.length - 2], '#800000');
		setColor(LRUPanel.children[LRUPanel.children.length - 1], '#f0e0d6');
	}

	// event handlers
	function handleOverlayClick (e) {
		e.preventDefault();
		emit('cancel');
		leave();
	}

	function handleColorTextBlur (e) {
		currentColor = parseHexColor(e.target.value);
		updateHSV(currentColor);
		paintSaturationValue(svCanvas, currentColor.hue);
		paintHueCursor(currentColor);
		paintSvCursor(currentColor);
		paintHexText(currentColor);
		emit('change', currentColor);
	}

	function handleLRUPanelClick (e) {
		if (!e.target.hasAttribute(LRU_COLOR_ATTR)) return;
		colorText.value = e.target.getAttribute(LRU_COLOR_ATTR);
		handleColorTextBlur({target: colorText});
	}

	function handleOkButtonClick (e) {
		emit('ok', currentColor);
		pushLRU(currentColor.text);
		leave();
	}

	function handleReceiverMousedown (e) {
		var x = e.offsetX, y = e.offsetY;
		if (x >= svCanvas.offsetLeft && x < svCanvas.offsetLeft + svCanvas.offsetWidth
		&&  y >= svCanvas.offsetTop  && y < svCanvas.offsetTop  + svCanvas.offsetHeight) {
			e.target.addEventListener(MMOVE_EVENT_NAME, handleReceiverMousemove1, false);
			e.target.addEventListener('mouseup', handleReceiverMouseup, false);
			e.preventDefault();
			handleReceiverMousemove1(e);
		}
		else if (x >= hueCanvas.offsetLeft && x < hueCanvas.offsetLeft + hueCanvas.offsetWidth
		&&       y >= hueCanvas.offsetTop  && y < hueCanvas.offsetTop  + hueCanvas.offsetHeight) {
			e.target.addEventListener(MMOVE_EVENT_NAME, handleReceiverMousemove2, false);
			e.target.addEventListener('mouseup', handleReceiverMouseup, false);
			e.preventDefault();
			handleReceiverMousemove2(e);
		}
	}

	function handleReceiverMousemove1 (e) {
		if ('buttons' in e && !e.buttons) return handleReceiverMouseup(e);
		var x = e.offsetX - svCanvas.offsetLeft;
		var y = e.offsetY - svCanvas.offsetTop;
		currentColor.saturation = minmax(0, x / (svCanvas.offsetWidth - 1), 1.0);
		currentColor.value = 1.0 - minmax(0, y / (svCanvas.offsetHeight - 1), 1.0);
		updateRGB(currentColor);
		paintSvCursor(currentColor);
		paintHexText(currentColor);
		emit('change', currentColor);
	}

	function handleReceiverMousemove2 (e) {
		if ('buttons' in e && !e.buttons) return handleReceiverMouseup(e);
		var x = e.offsetX - hueCanvas.offsetLeft;
		var y = e.offsetY - hueCanvas.offsetTop;
		currentColor.hue = minmax(0, y / hueCanvas.offsetHeight * 360, 359);
		paintSaturationValue(svCanvas, currentColor.hue);
		updateRGB(currentColor);
		paintHueCursor(currentColor);
		paintHexText(currentColor);
		emit('change', currentColor);
	}

	function handleReceiverMouseup (e) {
		e.target.removeEventListener(MMOVE_EVENT_NAME, handleReceiverMousemove1, false);
		e.target.removeEventListener(MMOVE_EVENT_NAME, handleReceiverMousemove2, false);
		e.target.removeEventListener('mouseup', handleReceiverMouseup, false);
	}

	// core functions
	function parseHexColor (color) {
		var r = 255, g = 255, b = 255, re;
		re = /^\s*#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})\s*$/i.exec(color);
		if (re) {
			r = parseInt(re[1], 16);
			g = parseInt(re[2], 16);
			b = parseInt(re[3], 16);
		}
		else {
			re = /^\s*#?([0-9a-f])([0-9a-f])([0-9a-f])\s*$/i.exec(color)
			if (re) {
				r = parseInt(re[1], 16) * 17;
				g = parseInt(re[2], 16) * 17;
				b = parseInt(re[3], 16) * 17;
			}
		}
		var result = {
			hue: 0, saturation: 0, value: 0,
			r: r, g: g, b: b,
			text: ''
		};
		updateHSV(result);
		return result;
	}

	function updateRGB (color) {
		// @see https://en.wikipedia.org/wiki/HSL_and_HSV#From_HSV
		var C = color.value * color.saturation,
			Hd = color.hue / 60,
			X = C * (1 - Math.abs(Hd % 2 - 1)),
			m = color.value - C,
			R1, G1, B1;

		if      (0 <= Hd && Hd < 1) { R1 = C; G1 = X; B1 = 0; }
		else if (1 <= Hd && Hd < 2) { R1 = X; G1 = C; B1 = 0; }
		else if (2 <= Hd && Hd < 3) { R1 = 0; G1 = C; B1 = X; }
		else if (3 <= Hd && Hd < 4) { R1 = 0; G1 = X; B1 = C; }
		else if (4 <= Hd && Hd < 5) { R1 = X; G1 = 0; B1 = C; }
		else if (5 <= Hd && Hd < 6) { R1 = C; G1 = 0; B1 = X; }

		color.r = (minmax(0.0, R1 + m, 1.0) * 255).toFixed(0) - 0;
		color.g = (minmax(0.0, G1 + m, 1.0) * 255).toFixed(0) - 0;
		color.b = (minmax(0.0, B1 + m, 1.0) * 255).toFixed(0) - 0;
		updateHexText(color);
	}

	function updateHSV (color) {
		// @see https://en.wikipedia.org/wiki/HSL_and_HSV#Hue_and_chroma
		// @see https://en.wikipedia.org/wiki/HSL_and_HSV#Lightness
		// @see https://en.wikipedia.org/wiki/HSL_and_HSV#Saturation
		var r = color.r / 255, g = color.g / 255, b = color.b / 255,
			M = Math.max(r, g, b), m = Math.min(r, g, b), C = M - m, Hd;

		if      (C == 0) Hd = 0;
		else if (M == r) Hd = ((g - b) / C) % 6;
		else if (M == g) Hd = ((b - r) / C) + 2;
		else if (M == b) Hd = ((r - g) / C) + 4;

		color.hue = (60 * Hd + 360) % 360;
		color.value = M;
		color.saturation = minmax(0.0, C == 0 ? 0 : C / color.value, 1.0);
		updateHexText(color);
	}

	function updateHexText (color) {
		color.text = '#' +
			('00' + color.r.toString(16)).substr(-2) +
			('00' + color.g.toString(16)).substr(-2) +
			('00' + color.b.toString(16)).substr(-2);
	}

	function pushLRU (color) {
		var list = window.sessionStorage[LRU_KEY];
		try {
			list = parsejson(list);
			if (!(list instanceof Array)) list = [];

			for (var i = 0; i < list.length; i++) {
				if (list[i] == color) {
					list.splice(i, 1);
					list.unshift(color);
					break;
				}
			}

			if (i >= list.length) {
				list.length >= LRUPanel.children.length && list.pop();
				list.unshift(color);
			}
		}
		finally {
			window.sessionStorage[LRU_KEY] = JSON.stringify(list);
		}
	}

	function init () {
		options || (options = {});
		overlay = createOverlay();
		panel = createPanel();

		currentColor = parseHexColor(options.initialColor || '#fff');
		paintHue(hueCanvas);
		paintSaturationValue(svCanvas, currentColor.hue);
		paintSvCursor(currentColor);
		paintHueCursor(currentColor);
		paintHexText(currentColor);
		paintLRU();

		var targetPos = target.getBoundingClientRect();
		style(panel, {
			left: (docScrollLeft() + targetPos.left) + 'px',
			top: (docScrollTop() + targetPos.top + target.offsetHeight + 3) + 'px'
		});
		style(upArrow, {
			left: (Math.min(panel.offsetWidth, target.offsetWidth) / 2 - 7) + 'px'
		});

		overlay.addEventListener('click', handleOverlayClick, false);
		LRUPanel.addEventListener('click', handleLRUPanelClick, false);
		colorText.addEventListener('blur', handleColorTextBlur, false);
		okButton.addEventListener('click', handleOkButtonClick, false);
		receiver.addEventListener('mousedown', handleReceiverMousedown, false);
	}

	function leave () {
		overlay.removeEventListener('click', handleOverlayClick, false);
		LRUPanel.removeEventListener('click', handleLRUPanelClick, false);
		colorText.removeEventListener('blur', handleColorTextBlur, false);
		okButton.removeEventListener('click', handleOkButtonClick, false);
		receiver.removeEventListener('mousedown', handleReceiverMousedown, false);

		panel.parentNode.removeChild(panel);
		overlay.parentNode.removeChild(overlay);
		target.focus();
	}

	init();
}

function startDrawing (callback) {
	const PERSIST_KEY = 'data-persists';

	var drawWrap;
	var drawBoxOuter;
	var drawBoxInner;
	var drawCanvas;
	var ctx;
	var ctxPenSample;
	var undoImage;
	var mousedownPos = {x: null, y: null};

	var foregroundColor = '#800000';
	var backgroundColor = '#f0e0d6';
	var penSize = 3;
	var zoomFactor = 1;

	function displayPenSample (size) {
		var w = ctxPenSample.canvas.width;
		var h = ctxPenSample.canvas.height;
		ctxPenSample.clearRect(0, 0, w, h);
		ctxPenSample.beginPath();
		ctxPenSample.arc(w / 2, h / 2, size / 2, 0, 2 * Math.PI);
		ctxPenSample.closePath();
		ctxPenSample.fillStyle = '#fff';
		ctxPenSample.fill();
	}

	function setZoomFactor (zf) {
		zoomFactor = zf;
		drawCanvas.style.width = (ctx.canvas.width * zoomFactor) + 'px';
		drawCanvas.style.height = (ctx.canvas.height * zoomFactor) + 'px';
	}

	function canvasMousedown (x, y) {
		undoImage = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

		mousedownPos.x = x;
		mousedownPos.y = y;

		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.strokeStyle = ctx.fillStyle = foregroundColor;
	}

	function canvasMousemove (x, y) {
		ctx.lineTo(x, y);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(x, y);
	}

	function canvasMouseup (x, y) {
		if (x == mousedownPos.x && y == mousedownPos.y) {
			ctx.arc(x, y, ctx.lineWidth / 2, 0, 2 * Math.PI);
			ctx.closePath();
			ctx.fill();
		}
		else {
			ctx.lineTo(x, y);
			ctx.stroke();
		}

		mousedownPos.x = mousedownPos.y = null;
	}

	function dispatch (e, handler) {
		var x, y;

		if (e.target == drawCanvas) {
			x = e.offsetX;
			y = e.offsetY;
		}
		else if (e.target == drawBoxInner) {
			var r1 = drawBoxInner.getBoundingClientRect();
			var r2 = drawCanvas.getBoundingClientRect();
			x = r1.left - r2.left + e.offsetX;
			y = r1.top  - r2.top  + e.offsetY;
		}
		else if (e.target == drawBoxOuter) {
			var r1 = drawBoxOuter.getBoundingClientRect();
			var r2 = drawCanvas.getBoundingClientRect();
			x = r1.left - r2.left + e.offsetX;
			y = r1.top  - r2.top  + e.offsetY;
		}

		if (x != undefined && y != undefined) {
			x /= zoomFactor;
			y /= zoomFactor;
			e.cancelable && e.preventDefault();
			handler(x, y);
			return true;
		}
	}


	function initOnFirstRun () {
		// background color indicator
		var node = $qs('.draw-bg', drawWrap);
		node.setAttribute('data-color', backgroundColor);

		// foreground color indicator
		var node = $qs('.draw-fg', drawWrap);
		node.setAttribute('data-color', foregroundColor);

		// init canvas
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		handleZoomFactor({target: {value: zoomFactor}});

		// display pen sample
		handlePenRangeInput({target: $qs('.draw-pen-range', drawWrap)});

		drawWrap.setAttribute(PERSIST_KEY, '1');
	}

	function initOnSecondRun () {
		foregroundColor =
			$qs('.draw-color-wrap', drawWrap)
			.lastElementChild
			.getAttribute('data-color');
		backgroundColor =
			$qs('.draw-color-wrap', drawWrap)
			.firstElementChild
			.getAttribute('data-color');
		Array.prototype.some.call(
			$qsa('[name="draw-zoom"]', drawWrap),
			function (node) {
				if (node.checked) {
					zoomFactor = node.value - 0;
					return true;
				}
			}
		);
	}

	function init () {
		// retrieve container elements
		drawWrap = $('draw-wrap');
		drawBoxOuter = $qs('.draw-box-outer', drawWrap);
		drawBoxInner = $qs('.draw-box-inner', drawWrap);
		drawCanvas = $qs('.draw-canvas', drawWrap);

		// retrieve canvas contexts
		ctx = drawCanvas.getContext('2d');
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		ctxPenSample = $qs('.draw-pen-sample', drawWrap).getContext('2d');

		// start new state
		appStates.unshift('draw');

		// initialize when first run
		!drawWrap.hasAttribute(PERSIST_KEY) ?
			initOnFirstRun() :
			initOnSecondRun();

		// register some native events
		drawBoxOuter.addEventListener(
			'mousedown', handleMousedown, false);
		$qs('.draw-bg', drawWrap).addEventListener(
			'click', handleColorIndicatorClick, false);
		$qs('.draw-fg', drawWrap).addEventListener(
			'click', handleColorIndicatorClick, false);
		$qs('.draw-pen-range', drawWrap).addEventListener(
			'input', handlePenRangeInput, false);

		// register click-dispatched events
		clickDispatcher
			.add('#draw-color-switch', handleColorSwitch)
			.add('#draw-zoom-factor', handleZoomFactor)
			.add('#draw-clear', handleClear)
			.add('#draw-undo', handleUndo)
			.add('#draw-complete', handleComplete)
			.add('#draw-cancel', handleCancel);

		// register keyboard events
		keyManager
			.addStroke('draw', ['1', '2', '3', '4'], handleZoomFactorKey)
			.addStroke('draw', '[', handleThinerPen)
			.addStroke('draw', ']', handleThickerPen)
			.addStroke('draw', 'x', handleColorSwitch)
			.addStroke('draw', 'u', handleUndo)
			.addStroke('draw', '\u001b', handleCancel)
			.updateManifest();

		// disable auto selection menu
		selectionMenu.enabled = false;

		// start transition
		drawWrap.classList.remove('hide');
		drawBoxOuter.classList.remove('hide');
		setTimeout(function () {
			$qs('.dimmer', drawWrap).classList.add('run');
		}, 0);
	}

	function leave () {
		drawBoxOuter.removeEventListener(
			'mousedown', handleMousedown, false);
		$qs('.draw-bg', drawWrap).removeEventListener(
			'click', handleColorIndicatorClick, false);
		$qs('.draw-fg', drawWrap).removeEventListener(
			'click', handleColorIndicatorClick, false);
		$qs('.draw-pen-range', drawWrap).removeEventListener(
			'input', handlePenRangeInput, false);

		clickDispatcher
			.remove('#draw-color-switch')
			.remove('#draw-zoom-factor')
			.remove('#draw-clear')
			.remove('#draw-complete')
			.remove('#draw-cancel');

		keyManager
			.removeStroke('draw');

		selectionMenu.enabled = true;

		var dimmer = $qs('.dimmer', drawWrap);
		drawBoxOuter.classList.add('hide');
		transitionend(dimmer, function () {
			drawWrap.classList.add('hide');
			drawWrap = drawCanvas = dimmer = ctx = null;
			appStates.shift();
			keyManager.updateManifest();
		});

		setTimeout(function () {
			dimmer.classList.remove('run');
		}, 0);
	}

	function handleMousedown (e) {
		if (dispatch(e, canvasMousedown)) {
			drawBoxOuter.addEventListener(MMOVE_EVENT_NAME, handleMousemove, false);
			drawBoxOuter.addEventListener('mouseup', handleMouseup, false);
		}
	}

	function handleMousemove (e) {
		dispatch(e, canvasMousemove);
	}

	function handleMouseup (e) {
		dispatch(e, canvasMouseup);
		drawBoxOuter.removeEventListener(MMOVE_EVENT_NAME, handleMousemove, false);
		drawBoxOuter.removeEventListener('mouseup', handleMouseup, false);
	}

	function handleColorIndicatorClick (e) {
		e.target.setAttribute('data-color-saved', e.target.getAttribute('data-color'));
		startColorPicker(e.target, {
			initialColor: e.target.getAttribute('data-color'),
			change: function (color) {
				e.target.style.backgroundColor = color.text;
			},
			ok: function (color) {
				e.target.style.backgroundColor = color.text;
				e.target.setAttribute('data-color', color.text);
				e.target.removeAttribute('data-color-saved');
				if (e.target.parentNode.children[0] == e.target) {
					backgroundColor = color.text;
				}
				else {
					foregroundColor = color.text;
				}
			},
			cancel: function () {
				e.target.style.backgroundColor = e.target.getAttribute('data-color-saved');
				e.target.removeAttribute('data-color-saved');
			}
		});
	}

	function handleColorSwitch () {
		var container = $qs('.draw-color-wrap', drawWrap);
		container.appendChild(
			container.removeChild(container.firstElementChild));

		var tmp = foregroundColor;
		foregroundColor = backgroundColor;
		backgroundColor = tmp;
	}

	function handlePenRangeInput (e) {
		$('draw-pen-indicator').textContent = e.target.value;
		displayPenSample(e.target.value);
		ctx.lineWidth = e.target.value;
	}

	function handleZoomFactor (e) {
		setZoomFactor(e.target.value);
	}

	function handleZoomFactorKey (e) {
		var node = $qs(`[name="draw-zoom"][value="${e.key}"]`, drawWrap);
		if (node) {
			node.click();
		}
	}

	function handleThinerPen () {
		var range = $qs('.draw-pen-range', drawWrap);
		if (range) {
			range.value = Math.max(range.min, range.value - 1);
			handlePenRangeInput({target: range});
		}
	}

	function handleThickerPen () {
		var range = $qs('.draw-pen-range', drawWrap);
		if (range) {
			range.value = Math.min(range.max, (range.value - 0) + 1);
			handlePenRangeInput({target: range});
		}
	}

	function handleUndo () {
		if (undoImage) {
			ctx.putImageData(undoImage, 0, 0);
			undoImage = null;
		}
	}

	function handleClear () {
		if (window.confirm('消去していいですか？')) {
			undoImage = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.fillStyle = '#f0e0d6'; //backgroundColor;
			ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		}
	}

	function handleComplete () {
		try {
			callback(drawCanvas.toDataURL());
		}
		finally {
			leave();
		}
	}

	function handleCancel () {
		try {
			callback();
		}
		finally {
			leave();
		}
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
					console.error(`${APP_NAME}: xsl parsing failed: ${e.message}`);
					return;
				}

				try {
					p.importStylesheet(xsl);
				}
				catch (e) {
					console.error(`${APP_NAME}: importStylesheet failed: ${e.message}`);
					return;
				}

				try {
					f = fixFragment(p.transformToFragment(xml, document));
				}
				catch (e) {
					console.error(`${APP_NAME}: transformToFragment failed: ${e.message}`);
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
					return 'passthrough';
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

	function handleApply () {
		if (state != 'running') return;
		if (isPending) return;
		opts.onapply && opts.onapply(getRemoteController());
	}

	function handleOk () {
		if (state != 'running') return;
		if (isPending) return;
		opts.onok && opts.onok(getRemoteController());
		leave();
	}

	function handleCancel () {
		if (state != 'running') return;
		if (isPending) return;
		opts.oncancel && opts.oncancel(getRemoteController());
		leave();
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

function sendToBackend () {
	if (!backend) return;

	let args = Array.prototype.slice.call(arguments);
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
		backend.postMessage(data, callback);
	}
	else {
		return new Promise(resolve => {
			backend.postMessage(data, resolve);
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
	Array.prototype.forEach.call(
		$qsa('[data-doe]', container),
		function (node) {
			var doe = node.getAttribute('data-doe');
			node.removeAttribute('data-doe');
			node[IAHTML]('beforeend', doe);
		}
	);
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
	let ev = new CustomEvent(`${APP_NAME}.bottomStatus`, {
		bubbles: true,
		cancelable: true,
		detail: {
			message: s || '',
			persistent: !!persistent
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
		console.error(`${APP_NAME}: getDOMFromString failed: ${e.message}`);
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
					Array.prototype.forEach.call(
						$qsa('div,iframe', node2),
						div => {
							div.parentNode.removeChild(div);
						}
					);

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

function delay (msecs) {
	return new Promise(resolve => setTimeout(resolve, msecs));
}

function transitionendp (element, backupMsec) {
	return new Promise(resolve => transitionend(element, resolve, backupMsec));
}

function log () {
	devMode && console.log(
		Array.prototype.slice.call(arguments).join(' '));
}

function getTextForCatalog (text, maxLength) {
	var score = 0;
	var result = '';
	for (var i = 0, goal = text.length; i < goal; i++) {
		var ch = text.charAt(i);
		var s = /[\uff61-\uffdc\uffe8-\uffee]/.test(ch) ? .5 : 1;
		if (score >= maxLength || score + s > maxLength) break;
		result += ch;
		score += s;
	}
	return result;
}

function nodeToString (container) {
	var iterator = document.createNodeIterator(
		container,
		window.NodeFilter.SHOW_ELEMENT | window.NodeFilter.SHOW_TEXT,
		null, false);

	var result = [];
	var currentNode;
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

// http://stackoverflow.com/a/30666203
function getBlobFrom (url, callback) {
	let xhr = transport.create();

	xhr.open('GET', url);
	// Can't use blob directly because of https://crbug.com/412752
	xhr.responseType = 'arraybuffer';
	xhr.onload = () => {
		let mime = xhr.getResponseHeader('content-type');
		callback(new window.Blob([xhr.response], {type: mime}));
	};
	xhr.onerror = () => {
		callback();
	};
	xhr.onloadend = () => {
		xhr = null;
	};

	xhr.send();
}

function getImageFrom (target, callback) {
	let url;
	let needRevoke = false;
	let tagName = 'img';
	let loadEvent = 'onload';

	if (target instanceof File || target instanceof Blob) {
		url = URL.createObjectURL(target);
		needRevoke = true;
		if (target.type.startsWith('video/')) {
			tagName = 'video';
			loadEvent = 'onloadeddata';
		}
	}
	else {
		url = target;
	}

	let img = document[CRE](tagName);
	img[loadEvent] = () => {
		needRevoke && URL.revokeObjectURL(url);
		callback(img);
		img = null;
	};
	img.onerror = () => {
		needRevoke && URL.revokeObjectURL(url);
		callback();
		img = null;
	};
	img.src = url;
}

function getPostTimeRegex () {
	return /(\d+)\/(\d+)\/(\d+)\(.\)(\d+):(\d+):(\d+)(?:\s+IP:[a-zA-Z0-9_*:.\-()]+)?/;
}

function getReadableSize (s) {
	if (s >= 1024 * 1024) {
		return (s / (1024 * 1024)).toFixed(2) + 'MiB';
	}
	else if (s >= 1024) {
		return (s / 1024).toFixed(2) + 'KiB';
	}
	return s + ' Bytes';
}

function displayInlineVideo (anchor) {
	if ($qs('video', anchor.parentNode)) return;

	let thumbnail = $qs('img', anchor);
	let video = document[CRE]('video');
	let props = {
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

	// video file on siokara
	if (/\/\/www\.nijibox\d+\.com\//.test(anchor.href)) {
		/*
		 * div.link-siokara
		 *   a.lightbox
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

		video.style.width = '250px';
	}
	// video file on futaba
	else if (thumbnail) {
		anchor.parentNode.insertBefore(video, anchor);

		let r = thumbnail.getBoundingClientRect();
		thumbnail.classList.add('hide');

		video.style.width = r.width + 'px';
		video.style.height = r.height + 'px';
	}
	// other
	else {
		let container = anchor.parentNode.insertBefore(
			document[CRE]('div'), anchor.nextSibling);
		container.appendChild(video);
		video.style.width = '250px';
	}
}

function displayInlineAudio (anchor) {
	if ($qs('audio', anchor.parentNode)) return;

	let audio = document[CRE]('audio');
	let props = {
		autoplay: true,
		controls: true,
		muted: false,
		src: anchor.href,
		volume: 0.2
	};

	for (let i in props) {
		audio[i] = props[i];
	}

	let thumbnail = $qs('img', anchor.parentNode);
	anchor = thumbnail.parentNode;
	anchor.parentNode.insertBefore(audio, anchor);
	thumbnail.classList.add('hide');
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

function populateTextFormItems (form, callback) {
	var inputNodes = $qsa([
		'input[type="hidden"]',
		'input[type="text"]',
		'input[type="number"]',
		'input[type="password"]',
		'input[type="checkbox"]:checked',
		'input[type="radio"]:checked',
		'textarea',
		'select'
	].join(','), form);

	Array.prototype.forEach.call(inputNodes, function (node) {
		if (node.name == '') return;
		if (node.disabled) return;
		callback(node);
	});
}

function populateFileFormItems (form, callback) {
	var inputNodes = $qsa([
		'input[type="file"]'
	].join(','), form);

	Array.prototype.forEach.call(inputNodes, function (node) {
		if (node.name == '') return;
		if (node.disabled) return;
		if (node.files.length == 0) return;
		callback(node);
	});
}

function postBase (type, form, callback) {
	function getIconvPayload (form) {
		var payload = {};

		populateTextFormItems(form, function (node) {
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
		var data = [];

		for (var i in items) {
			var item = new Uint8Array(items[i]);
			data.push(
				`--${boundary}\r\n` +
				`Content-Disposition: form-data; name="${i}"\r\n\r\n`,
				item, '\r\n'
			);
		};

		populateFileFormItems(form, function (node) {
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
		var data = [];
		var delimiter = '';

		for (var i in items) {
			data.push(
				delimiter, i, '=',
				items[i].map(function (code) {
					if (code == 32) return '+';
					var ch = String.fromCharCode(code);
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

	function handleIconv (response) {
		if (!response) {
			callback && callback('Failed to convert charset.');
			return;
		}

		if (form.enctype == 'multipart/form-data') {
			var boundary = getBoundary();
			var data = getMultipartFormData(response, boundary);
			multipartPost(data, boundary);
		}
		else {
			var data = getUrlEncodedFormData(response);
			urlEncodedPost(data);
		}
	}

	function multipartPost (data, boundary) {
		xhr.open('POST', form.action);
		xhr.setRequestHeader('Content-Type', `multipart/form-data;boundary=${boundary}`);
		xhr.overrideMimeType(`text/html;charset=${FUTABA_CHARSET}`);

		xhr.onload = () => {
			callback && callback(xhr.responseText);
		};

		xhr.onerror = () => {
			callback && callback();
		};

		xhr.onloadend = () => {
			xhr = form = null;
			transport.release(type);
		};

		xhr.send(data);
	}

	function urlEncodedPost (data) {
		xhr.open('POST', form.action);
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.overrideMimeType(`text/html;charset=${FUTABA_CHARSET}`);

		xhr.onload = () => {
			callback && callback(xhr.responseText);
		};

		xhr.onerror = () => {
			callback && callback();
		};

		xhr.onloadend = () => {
			xhr = form = null;
			transport.release(type);
		};

		xhr.send(data);
	}

	let xhr = transport.create(type);
	sendToBackend('iconv', getIconvPayload(form), handleIconv);
}

function resetForm () {
	var form = document[CRE]('form');
	var elements = [];

	for (var i = 0; i < arguments.length; i++) {
		var org = $(arguments[i]);
		if (!org) continue;
		var clone = org.cloneNode(false);
		elements.push({org:org, clone:clone});
		org.parentNode.replaceChild(clone, org);
		form.appendChild(org);
	}

	if (elements.length) {
		form.reset();
		for (var i = 0; i < elements.length; i++) {
			elements[i].clone.parentNode.replaceChild(elements[i].org, elements[i].clone);
			elements[i] = null;
		}
	}
}

function parseModerateResponse (response) {
	var re;

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
		re = s.replace(/<!DOCTYPE[^>]+>\r?\n?/i, '');
	}

	return {error: re || 'なんか変です'};
}

function parsePostResponse (response) {
	var re;

	re = /<font[^>]*><b>(.*?)(?:<br\s*\/?>)+<a[^>]*>リロード<\/a>/i.exec(response);
	if (re) {
		return {
			error: re[1]
				.replace(/<br\b[^>]*>/ig, '\n')
				.replace(/<[^>]+>/g, ' ')
				.replace(/[\s\t\n]+/g, ' ')
		};
	}

	var refreshURL = '';
	re = /<meta\s+([^>]+)>/i.exec(response);
	if (re && /http-equiv="refresh"/i.test(re[1])) {
		re = /content="\d+;url=([^"]+)"/i.exec(re[1]);
		if (re) {
			refreshURL = resolveRelativePath(re[1]);
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
	setTimeout(function () {
		$qs('fieldset', 'postform').disabled = false;
	}, POSTFORM_LOCK_RELEASE_DELAY);
}

/*
 * <<<1 functions for reloading
 */

function reloadBase (type) {
	timingLogger.startTag('reloadBase');

	function detectionTest (doc) {
		// for mark detection test
		Array.prototype.forEach.call(
			$qsa('blockquote:nth-child(-n+4)', doc),
			function (node, i) {
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
			}
		);
		// for expiration warning test
		Array.prototype.forEach.call(
			$qsa('small + blockquote', doc),
			function (node, i) {
				node[IAHTML](
					'afterend',
					'<font color="#f00000"><b>このスレは古いので、もうすぐ消えます。</b></font><br>'
				);
			}
		);
	}

	return new Promise((resolve, reject) => {
		const now = Date.now();

		let xhr = transport.create(type);
		xhr.open('GET', window.location.href);
		xhr.overrideMimeType(`text/html;charset=${FUTABA_CHARSET}`);
		DEBUG_IGNORE_LAST_MODIFIED && (siteInfo.lastModified = 0);
		xhr.setRequestHeader('If-Modified-Since', siteInfo.lastModified || FALLBACK_LAST_MODIFIED);

		xhr.onload = function (e) {
			timingLogger.endTag();

			let lm = xhr.getResponseHeader('Last-Modified');
			if (lm) {
				siteInfo.lastModified = lm;
			}

			timingLogger.startTag('parsing html');
			let doc;
			if (xhr.status == 200) {
				doc = getDOMFromString(xhr.responseText);
				if (!doc) {
					timingLogger.endTag(); // parsing html
					reject(new Error('読み込んだ html からの DOM ツリー構築に失敗しました。'));
					return;
				}
			}
			timingLogger.endTag();

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
			transport.release(type);
		};

		xhr.send();
	});
}

function reloadCatalogBase (type, query) {
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
			transport.release(type);
		};

		xhr.send();
	});
}

function extractTweets () {
	var tweets = $qsa('.link-twitter');
	if (tweets.length == 0) return;

	function invokeTweetLoader (html) {
		var scriptSource = '';
		if (!$('twitter-widget-script')) {
			var re = /<script\b[^>]*src="([^"]+)"/.exec(html);
			if (re) {
				scriptSource = re[1];
			}
		}

		var scriptNode = document.head.appendChild(document[CRE]('script'));
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

	for (var i = 0; i < tweets.length && i < 10; i++) {
		var id = tweets[i].getAttribute('data-tweet-id');
		id && sendToBackend('get-tweet', {url:tweets[i].href, id:id}, getHandler(tweets[i]));
		tweets[i].classList.remove('link-twitter');
	}

	setTimeout(extractTweets, 991);
}

function extractIncompleteFiles () {
	var files = $qsa('.incomplete');
	if (files.length == 0) return;

	function getHandler (node) {
		return function (data) {
			if (data) {
				if (data.url) {
					empty(node);
					node.href = data.url;
					node.appendChild(document.createTextNode(data.base));
				}

				if (/\.(?:jpg|gif|png|webm|mp4|mp3|ogg)$/.test(data.url)) {
					node.classList.add('lightbox');
				}

				if (node.parentNode.nodeName != 'Q' && data.thumbnail) {
					let div = document[CRE]('div');
					div.className = 'link-siokara';

					let r = document.createRange();
					r.selectNode(node);
					r.surroundContents(div);
					node.classList.remove('link-siokara');

					let thumbDiv = div.appendChild(document[CRE]('div'));
					let thumbAnchor = node.cloneNode();
					thumbAnchor.classList.add('siokara-thumbnail');
					thumbDiv.appendChild(thumbAnchor);
					let img = thumbAnchor.appendChild(document[CRE]('img'));
					img.src = data.thumbnail;

					let saveDiv = div.appendChild(document[CRE]('div'));
					saveDiv.appendChild(document.createTextNode('['));
					let saveAnchor = saveDiv.appendChild(document[CRE]('a'));
					saveAnchor.className = 'js save-image';
					saveAnchor.href = data.url;
					saveAnchor.textContent = '保存する';
					saveDiv.appendChild(document.createTextNode(']'));
				}
			}
			else {
				var span = node.appendChild(document[CRE]('span'));
				span.className = 'link-completion-notice';
				span.textContent = '(補完失敗)';
			}
			node = null;
		}
	}

	for (var i = 0; i < files.length && i < 10; i++) {
		var id = files[i].getAttribute('data-basename');
		id && sendToBackend(
			'complete',
			{url:files[i].href, id:id},
			getHandler(files[i]));
		files[i].classList.remove('incomplete');
	}

	setTimeout(extractIncompleteFiles, 907);
}

function extractSiokaraThumbnails () {
	var files = $qsa('.incomplete-siokara-thumbnail');
	if (files.length == 0) return;

	function getHandler (node) {
		return function (data) {
			if (!data && /\.(webm|mp4|mp3|ogg)$/.test(node.href)) {
				data = chrome.extension.getURL('images/siokara-video.png');
			}
			if (data) {
				let div = document[CRE]('div');
				div.className = 'link-siokara';

				let r = document.createRange();
				r.selectNode(node);
				r.surroundContents(div);
				node.classList.remove('link-siokara');

				let thumbDiv = div.appendChild(document[CRE]('div'));
				let thumbAnchor = node.cloneNode();
				thumbAnchor.classList.add('siokara-thumbnail');
				thumbDiv.appendChild(thumbAnchor);
				let img = thumbAnchor.appendChild(document[CRE]('img'));
				img.src = data;

				let saveDiv = div.appendChild(document[CRE]('div'));
				saveDiv.appendChild(document.createTextNode('['));
				let saveAnchor = saveDiv.appendChild(document[CRE]('a'));
				saveAnchor.className = 'js save-image';
				saveAnchor.href = node.href;
				saveAnchor.textContent = '保存する';
				saveDiv.appendChild(document.createTextNode(']'));
			}
			node = null;
		}
	}

	for (var i = 0; i < files.length && i < 10; i++) {
		var thumbHref = files[i].getAttribute('data-thumbnail-href');
		if (thumbHref && files[i].parentNode.nodeName != 'Q') {
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
	var files = $qsa('.inline-video.nico2[data-nico2-key]');
	if (files.length == 0) return;

	for (var i = 0; i < files.length && i < 10; i++) {
		var key = files[i].getAttribute('data-nico2-key');
		var scriptNode = files[i].appendChild(document[CRE]('script'));
		scriptNode.type = 'text/javascript';
		scriptNode.src = `https://embed.nicovideo.jp/watch/${key}/script?w=640&h=360`;
		scriptNode.onload = function () {
			this.parentNode.removeChild(this);
		};
		files[i].removeAttribute('data-nico2-key');
	}

	setTimeout(extractNico2, 911);
}

/*
 * <<<1 functions for reload feature in reply mode
 */

function showFetchedRepliesStatus (content, autoHide) {
	var fetchStatus = $('fetch-status');
	if (!fetchStatus) return;

	if (content != undefined) {
		fetchStatus.classList.remove('hide');
		$t(fetchStatus, content);
		if (autoHide) {
			setTimeout(showFetchedRepliesStatus, RELOAD_LOCK_RELEASE_DELAY);
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
	var result = false;
	var ids = $qsa('topic > user_id', xml);
	for (var i = 0, goal = ids.length; i < goal; i++) {
		var number = $qs('number', ids[i].parentNode).textContent;

		var node = $qs(`.topic-wrap[data-number="${number}"]`, container);
		if (!node || $qs('.user-id', node)) continue;

		var postno = $qs('.postno', node);
		if (!postno) continue;

		var span = postno.parentNode.insertBefore((document[CRE]('span')), postno);
		span.className = 'user-id';
		span.textContent = 'ID:' + ids[i].textContent;
		postno.parentNode.insertBefore(document[CRE]('span'), postno);
		postno.parentNode.insertBefore(document.createTextNode(' |'), postno);

		result = true;
	}
	return result;
}

function updateTopicSodane (xml, container) {
	var result = false;
	var sodanes = $qsa('topic > sodane[className="sodane"]', xml);
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

function updateMarkedReplies (xml, container, start, end) {
	var result = false;
	var marks = $qsa('reply > mark', xml);
	var parentSelector = getParentSelector(start, end);
	for (var i = 0, goal = marks.length; i < goal; i++) {
		var number = $qs('number', marks[i].parentNode).textContent;

		var node = $qs(`${parentSelector} > [data-number="${number}"]`, container);
		if (!node || node.classList.contains('deleted')) continue;

		node.classList.add('deleted');

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

function updateReplyIDs (xml, container, start, end) {
	var result = false;
	var ids = $qsa('reply > user_id', xml);
	var parentSelector = getParentSelector(start, end);
	for (var i = 0, goal = ids.length; i < goal; i++) {
		var number = $qs('number', ids[i].parentNode).textContent;

		var node = $qs(`${parentSelector} > [data-number="${number}"]`, container);
		if (!node || $qs('.user-id', node)) continue;

		var div = node.appendChild(document[CRE]('div'));
		div.appendChild(document.createTextNode('──'));
		var span = div.appendChild(document[CRE]('span'));
		div.className = span.className = 'user-id';
		span.textContent = 'ID:' + ids[i].textContent;
		div.appendChild(document[CRE]('span'));

		result = true;
	}
	return result;
}

function updateReplySodanes (xml, container, start, end) {
	var result = false;
	var sodanes = $qsa('reply > sodane[className="sodane"]', xml);
	var parentSelector = getParentSelector(start, end);
	for (var i = 0, goal = sodanes.length; i < goal; i++) {
		var number = $qs('number', sodanes[i].parentNode).textContent;

		var node = $qs(`${parentSelector} > [data-number="${number}"]`, container);
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

function updateIdFrequency (stat) {
	for (var id in stat.idData) {
		for (var i = 0, goal = stat.idData[id].length; i < goal; i++) {
			if (stat.idData[id].length == 1) continue;

			var number = stat.idData[id][i].number;
			var unit = $qs([
				`article .topic-wrap[data-number="${number}"] span.user-id`,
				`article .reply-wrap > [data-number="${number}"] span.user-id`
			].join(','));
			if (!unit) continue;

			$t(unit.nextSibling, `(${i + 1}/${stat.idData[id].length})`);
		}
	}
}

function getParentSelector (start, end) {
	var parentSelector = '.reply-wrap';

	// start and end are 1-based.
	if (typeof start == 'number' && typeof end == 'number') {
		parentSelector += `:nth-child(n+${start})`;
		parentSelector += `:nth-child(-n+${end})`;
	}

	return parentSelector;
}

function getReplyContainer (index) {
	index || (index = 0);
	return $qs(`article:nth-of-type(${index + 1}) .replies`);
}

function getRule (container) {
	container || (container = getReplyContainer());
	if (!container) return;
	return $qs('.rule', container);
}

function createRule (container) {
	var rule = getRule(container);
	if (!rule) {
		rule = container.appendChild(document[CRE]('div'));
		rule.className = 'rule';
	}
	return rule;
}

function removeRule (container) {
	container || (container = getReplyContainer());
	if (!container) return;
	var rule = $qs('.rule', container);
	if (!rule) return;
	rule.parentNode.removeChild(rule);
}

function stripTextNodes (container) {
	container || (container = getReplyContainer());
	if (!container) return;

	var result = document.evaluate(
		'./text()', container, null,
		window.XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
		null);
	if (!result) return;

	for (var i = 0, goal = result.snapshotLength; i < goal; i++) {
		var node = result.snapshotItem(i);
		node.parentNode.removeChild(node);
	}
}

function processRemainingReplies (context, lowBoundNumber, callback) {
	if (typeof lowBoundNumber != 'number') {
		lowBoundNumber = -1;
	}
	timingLogger.reset().startTag(`proccessing remaining replies`, `lowBoundNumber:${lowBoundNumber}`);
	xmlGenerator.remainingReplies(
		context, null, null, lowBoundNumber,
		function (xml, index, count, count2) {
			timingLogger.startTag(`processRemainingReplies callback`, `index:${index}, count:${count}, count2:${count2}`);
			let worked = false;

			markStatistics.updatePostformView({
				count: {
					total: count,
					mark: 0,
					id: 0
				},
				delta: null
			});

			if (xml) {
				let container = getReplyContainer(index);
				if (!container) return;

				if (lowBoundNumber >= 0) {
					timingLogger.startTag('update marked replies, ids, sodanes');
					let markUpdated = updateMarkedReplies(xml, container, count2 + 1, count);
					let idUpdated = updateReplyIDs(xml, container, count2 + 1, count);
					let sodaneUpdated = updateReplySodanes(xml, container, count2 + 1, count);
					worked = markUpdated || idUpdated || sodaneUpdated;
					timingLogger.endTag(`markUpdated:${markUpdated}, idUpdated:${idUpdated}, sodaneUpdated:${sodaneUpdated}`);
				}

				if (lowBoundNumber < 0) {
					xsltProcessor.setParameter(null, 'render_mode', 'replies');
				}
				else {
					xsltProcessor.setParameter(null, 'low_bound_number', lowBoundNumber);
					xsltProcessor.setParameter(null, 'render_mode', 'replies_diff');
				}

				try {
					timingLogger.startTag('generate new replies fragment from xml');
					let f = fixFragment(xsltProcessor.transformToFragment(xml, document));
					if ($qs('.reply-wrap', f)) {
						lowBoundNumber >= 0 && createRule(container);
						appendFragment(container, f);
						stripTextNodes(container);
						if (lowBoundNumber < 0) {
							worked = true;
						}
					}
					timingLogger.endTag();
				}
				catch (e) {
					console.error(`${APP_NAME}: processRemainingReplies: exception(1), ${e.message}`);
				}

				try {
					worked && callback && callback();
				}
				catch (e) {
					console.error(`${APP_NAME}: processRemainingReplies: exception(2), ${e.message}`);
				}

				timingLogger.endTag(`worked:${worked}`);
			}
			else {
				let newStat;

				if (pageModes[0] == 'reply') {
					newStat = markStatistics.getStatistics(lowBoundNumber < 0);

					markStatistics.updatePanelView(newStat);
					if (markStatistics.updatePostformView(newStat)) {
						showFetchedRepliesStatus();
					}
					else {
						lowBoundNumber >= 0 && showFetchedRepliesStatus('新着レスなし', true);
					}
					updateIdFrequency(newStat);

				}

				timingLogger.startTag('misc updates');
				favicon.update();
				extractTweets();
				extractSiokaraThumbnails();
				extractNico2();
				extractIncompleteFiles();
				timingLogger.endTag();

				try {
					callback && callback(newStat);
				}
				catch (e) {
					console.error(`${APP_NAME}: processRemainingReplies: exception(3), ${e.message}`);
				}

				timingLogger.forceEndTag();
			}

			return worked;
		}
	);
}

function scrollToNewReplies () {
	const rule = getRule();
	if (!rule) return;

	const scrollTop = docScrollTop();
	const diff = rule.nextSibling.getBoundingClientRect().top - Math.floor(viewportRect.height / 2);
	if (diff <= 0) return;

	const startTime = Date.now();
	const timeLimit = startTime + RELOAD_AUTO_SCROLL_CONSUME;
	const timerPrecision = 5;

	setTimeout(function handleScroll () {
		const now = Date.now();
		if (now < timeLimit) {
			window.scrollTo(
				0,
				scrollTop + diff * ((now - startTime) / RELOAD_AUTO_SCROLL_CONSUME));
			setTimeout(handleScroll, timerPrecision);
		}
		else {
			window.scrollTo(0, scrollTop + diff);
		}
	}, timerPrecision);
}

/*
 * <<<1 functions which handles a thumbnail for posting image
 */

function setPostThumbnailVisibility (visible) {
	var thumb = $('post-image-thumbnail-wrap');
	if (!thumb) return;
	if (!thumb.getAttribute('data-available')) {
		thumb.classList.add('hide');
		return;
	}

	thumb.classList.remove('hide');

	transitionend(thumb, function (e) {
		if (!e.target.classList.contains('run')) {
			e.target.classList.add('hide');
		}
	});

	setTimeout(function () {
		if (visible) {
			thumb.classList.add('run');
		}
		else {
			if (!thumb.classList.contains('run')) {
				thumb.classList.add('hide');
			}
			else {
				thumb.classList.remove('run');
			}
		}
	}, 0);
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

function doDisplayThumbnail (thumbWrap, thumb, img) {
	let containerWidth = Math.min(Math.floor(viewportRect.width / 4 * 0.8), 250);
	let containerHeight = Math.min(Math.floor(viewportRect.width / 4 * 0.8), 250);
	let naturalWidth = img.naturalWidth || img.videoWidth || img.width;
	let naturalHeight = img.naturalHeight || img.videoHeight || img.height;
	let size = getThumbnailSize(
		naturalWidth, naturalHeight,
		containerWidth, containerHeight);

	let canvas = document[CRE]('canvas');
	canvas.width = size.width;
	canvas.height = size.height;

	let c = canvas.getContext('2d');
	c.fillStyle = '#f0e0d6';
	c.fillRect(0, 0, canvas.width, canvas.height);
	c.drawImage(
		img,
		0, 0, naturalWidth, naturalHeight,
		0, 0, canvas.width, canvas.height);

	thumbWrap.classList.add('hide');
	thumb.classList.remove('run');
	thumbWrap.setAttribute('data-available', '2');
	thumb.width = canvas.width;
	thumb.height = canvas.height;
	thumb.src = canvas.toDataURL();
	setTimeout(() => {commands.activatePostForm()}, 0);
}

function setPostThumbnail (file, callback) {
	let thumbWrap = $('post-image-thumbnail-wrap');
	let thumb = $('post-image-thumbnail');

	if (!thumbWrap || !thumb) return;

	if (!file || 'type' in file && !/^(?:image\/(?:jpeg|png|gif))|video\/(?:webm|mp4)$/.test(file.type)) {
		thumbWrap.removeAttribute('data-available');
		setPostThumbnailVisibility(false);
		callback && callback();
		return;
	}

	if (file instanceof HTMLCanvasElement) {
		doDisplayThumbnail(thumbWrap, thumb, file);
		thumbWrap = thumb = null;
		callback && callback();
		return;
	}

	$t('post-image-thumbnail-info', `${file.type}, ${getReadableSize(file.size)}`);

	getImageFrom(file, img => {
		if (img) {
			doDisplayThumbnail(thumbWrap, thumb, img);
		}

		thumbWrap = thumb = null;
		callback && callback();
	});
}

/*
 * <<<1 common panel tab handling functions
 */

function showPanel (callback) {
	let panel = $('panel-aside-wrap');

	// hide ad container
	$('ad-aside-wrap').classList.add('hide');

	// if catalog mode, ensure right margin
	if (pageModes[0] == 'catalog') {
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
			if (pageModes[0] == 'catalog') {
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

	Array.prototype.forEach.call(
		$qsa('.panel-tab-wrap .panel-tab', 'panel-aside-wrap'),
		function (node) {
			node.classList.remove('active');
			if (node.getAttribute('href') == `#${tabId}`) {
				node.classList.add('active');
			}
		}
	);

	Array.prototype.forEach.call(
		$qsa('.panel-content-wrap', 'panel-aside-wrap'),
		function (node) {
			node.classList.add('hide');
			if (node.id == `panel-content-${tabId}`) {
				node.classList.remove('hide');
			}
		}
	);
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
		Array.prototype.forEach.call(
			$qsa(opts.targetElementSelector, node),
			subNode => {
				let t = opts.getTextContent(subNode);
				t = t.replace(/^\s+|\s+$/g, '');
				text.push(t);
			}
		);
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

	activatePostForm: function () {
		catalogPopup.deleteAll();
		let postformWrap = $('postform-wrap');
		postformWrap.classList.add('hover');

		return transitionendp(postformWrap, 400).then(() => {
			$('com').focus();
			setPostThumbnailVisibility(true);
		});
	},
	deactivatePostForm: function (callback) {
		let postformWrap = $('postform-wrap');
		postformWrap.classList.remove('hover');
		return transitionendp(postformWrap, 400).then(() => {
			document.activeElement.blur();
			document.body.focus();
			setPostThumbnailVisibility(false);
		});
	},
	scrollPage: function (e) {
		let sh = document.documentElement.scrollHeight;
		if (!e.shift && scrollManager.lastScrollTop >= sh - viewportRect.height) {
			commands.invokeMousewheelEvent();
		}
		else if (storage.config.hook_space_key.value) {
			window.scrollBy(
				0, parseInt(viewportRect.height / 2) * (e.shift ? -1 : 1));
		}
		else {
			return 'passthrough';
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
	clearUpfile: function () {
		resetForm('upfile');
		setPostThumbnail();
	},
	summaryBack: function () {
		let current = $qs('.nav .nav-links .current');
		if (!current || !current.previousSibling) return;
		historyStateWrapper.pushState(current.previousSibling.href);
		if (pageModes[0] == 'catalog') {
			commands.toggleCatalogVisibility();
		}
		commands.reload();
	},
	summaryNext: function () {
		let current = $qs('.nav .nav-links .current');
		if (!current || !current.nextSibling) return;
		historyStateWrapper.pushState(current.nextSibling.href);
		if (pageModes[0] == 'catalog') {
			commands.toggleCatalogVisibility();
		}
		commands.reload();
	},

	/*
	 * reload/post
	 */

	reload: function () {
		switch (pageModes[0]) {
		case 'summary':
			commands.reloadSummary();
			break;
		case 'reply':
			commands.reloadReplies();
			break;
		case 'catalog':
			commands.reloadCatalog();
			break;
		}
	},
	reloadSummary: function () {
		const TRANSPORT_TYPE = 'reload-summary';

		let content = $('content');
		let indicator = $('content-loading-indicator');
		let footer = $('footer');

		if (transport.isRunning(TRANSPORT_TYPE)) {
			transport.abort(TRANSPORT_TYPE);
			indicator.classList.add('error');
			$t(indicator, '中断しました');
			return;
		}

		if (transport.isRapidAccess(TRANSPORT_TYPE)) {
			return;
		}

		if (pageModes[0] != 'summary') {
			return;
		}

		$t(indicator, '読み込み中です。ちょっとまってね。');
		content.style.height = content.offsetHeight + 'px';
		content.classList.add('init');
		indicator.classList.remove('hide');
		indicator.classList.remove('error');
		footer.classList.add('hide');

		Promise.all([
			transitionendp(content, 400),
			reloadBase(TRANSPORT_TYPE)
		]).then(data => {
			const [transitionResult, reloadResult] = data;
			const {doc, now, status} = reloadResult;

			let fragment;

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
				throw new Err(`内容が変だよ (${status})`);
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
			catch (ex) {
				throw new Error(
					'内部 xml からの html への変形に失敗しました。' +
					`\n(${ex.message})`);
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

				favicon.update();
				extractTweets();
				extractSiokaraThumbnails();
				extractNico2();
				extractIncompleteFiles();

				sendToBackend(
					'notify-viewers',
					{
						data: $('viewers').textContent - 0,
						siteInfo: siteInfo
					});

				timingLogger.forceEndTag();
			});
		}).catch(err => {
			footer.classList.remove('hide');
			indicator.classList.add('error');
			$t(indicator, err.message);
			console.error(`${APP_NAME}: reloadSummary failed: ${err.message}`);
		});
	},
	reloadReplies: function () {
		const TRANSPORT_TYPE = 'reload-replies';

		if (transport.isRunning(TRANSPORT_TYPE)) {
			transport.abort(TRANSPORT_TYPE);
			showFetchedRepliesStatus('中断しました', true);
			return;
		}

		if (transport.isRapidAccess(TRANSPORT_TYPE)) {
			return;
		}

		if (pageModes[0] != 'reply') {
			return;
		}

		timingLogger.reset().startTag('reloading replies');
		setBottomStatus('読み込み中...', true);
		removeRule();
		markStatistics.resetPostformView();

		reloadBase(TRANSPORT_TYPE)
		.then(reloadResult => {
			const {doc, now, status} = reloadResult;

			let result;

			switch (status) {
			case 404:
				$t('expires-remains', '-');
				$t('pf-expires-remains', '-');
				showFetchedRepliesStatus();
				setBottomStatus('完了: 404 Not found');
				$t('reload-anchor', 'Not found. ファイルがないよ。');
				timingLogger.forceEndTag();
				return;
			case 304:
				showFetchedRepliesStatus('更新なし', true);
				setBottomStatus('完了: 更新なし');
				timingLogger.forceEndTag();
				return;
			}

			if (!doc) {
				throw new Err(`内容が変だよ (${status})`);
			}

			timingLogger.startTag('generate internal xml');
			try {
				timingLogger.startTag('generate');
				result = xmlGenerator.run(doc.documentElement[IHTML], null, 0);
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
			catch (ex) {
				throw new Error(
					'内部 xml からの html への変形に失敗しました。' +
					`\n(${ex.message})`);
			}
			finally {
				timingLogger.endTag();
			}

			let lastNumber = ($qs([
				'article:nth-of-type(1)',
				'.reply-wrap:last-child',
				'[data-number]'
			].join(' ')) || $qs([
				'article:nth-of-type(1)',
				'.topic-wrap'
			].join(' '))).getAttribute('data-number') - 0;

			sendToBackend(
				'notify-viewers',
				{
					viewers: $('viewers').textContent - 0,
					siteInfo: siteInfo
				});

			timingLogger.forceEndTag();

			// process remaiing replies
			processRemainingReplies(result.remainingRepliesContext, lastNumber,
				function (newStat) {
					if (newStat) {
						setBottomStatus(
							'完了: ' + (newStat.delta.total ?
										`新着 ${newStat.delta.total} レス` :
										'新着レスなし'));
						scrollToNewReplies();
					}
				}
			);
		})
		.catch(err => {
			showFetchedRepliesStatus(err.message);
			setBottomStatus(err.message);
			timingLogger.forceEndTag();
			console.error(`${APP_NAME}: reloadReplies failed: ${err.message}`);
		});
	},
	reloadCatalog: function () {
		const TRANSPORT_MAIN_TYPE = 'reload-catalog-main';
		const TRANSPORT_SUB_TYPE = 'reload-catalog-sub';

		if (transport.isRunning(TRANSPORT_MAIN_TYPE)) {
			transport.abort(TRANSPORT_MAIN_TYPE);
			transport.abort(TRANSPORT_SUB_TYPE);
			return;
		}

		if (transport.isRapidAccess(TRANSPORT_MAIN_TYPE)) {
			return;
		}

		if (pageModes[0] != 'catalog') {
			return;
		}

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

		Promise.all([
			transitionendp(wrap, 400),
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

			wrap.style.maxWidth = ((anchorWidth + CATALOG_ANCHOR_MARGIN) * horzActual) + 'px';

			/*
			 * traverse all anchors in new catalog
			 */

			Array.prototype.forEach.call(
				$qsa('table[align="center"] td a', doc),
				node => {
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
					}

					to = anchor.appendChild(document[CRE]('div'));
					to.className = 'info';
					to.appendChild(document[CRE]('span')).textContent = repliesCount;
					to.appendChild(document[CRE]('span')).textContent = newIndicator;
				}
			);

			// find latest post number
			if (summaryReloadResult.status >= 200 && summaryReloadResult.status <= 299) {
				const firstThread = $qs('div.thre', summaryReloadResult.doc);
				const comments = $qsa('input[type="checkbox"][value="delete"]', firstThread);
				if (comments.length) {
					siteInfo.latestNumber = comments[comments.length - 1].name - 0;
				}
			}

			switch (sortType.n) {
			// default, old
			case 0: case 2:
				{
					const deleteLimit = siteInfo.latestNumber - siteInfo.logSize;
					//let logs = [];

					// process all remaining anchors which have not changed and find dead thread
					while (insertee) {
						let [threadNumber, imageNumber] = insertee.getAttribute('data-number').split(',');
						threadNumber -= 0;
						imageNumber -= 0;

						let isAdult = imageNumber > 0 && now - imageNumber >= siteInfo.minThreadLifeTime;

						if (threadNumber < deleteLimit
						&& (siteInfo.minThreadLifeTime == 0 || isAdult)) {
							let tmp = insertee.nextSibling;
							insertee.parentNode.removeChild(insertee);
							insertee = tmp;
							//logs.push(`${threadNumber} removed. latest:${siteInfo.latestNumber}, deleteLimit:${deleteLimit}, isAdult:${isAdult}`);
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
						&& (siteInfo.minThreadLifeTime == 0 || isAdult)) {
							node.classList.add('warned');
							//logs.push(`${threadNumber} warned. warnLimit:${warnLimit}, isAdult:${isAdult}`);
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
						let [threadNumber, imageNumber] = insertee.getAttribute('data-number').split(',');
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
		}).catch(err => {
			wrap.classList.remove('run');
			setBottomStatus('カタログの読み込みに失敗しました');
			window.scrollTo(0, 0);
		});
	},
	post: function () {
		const TRANSPORT_TYPE = 'post';

		if (transport.isRunning(TRANSPORT_TYPE)) {
			transport.abort(TRANSPORT_TYPE);
			setBottomStatus('中断しました');
			registerReleaseFormLock();
			return;
		}

		if (transport.isRapidAccess(TRANSPORT_TYPE)) {
			return;
		}

		setBottomStatus('投稿中...');
		$qs('fieldset', 'postform').disabled = true;

		postBase(
			TRANSPORT_TYPE, $('postform'),
			response => {
				if (!response) {
					setBottomStatus('サーバからの応答が変です');
					registerReleaseFormLock();
					return;
				}

				response = response.replace(/\r\n|\r|\n/g, '\t');
				/warning/i.test(response) && console.info(response.replace(/.{1,72}/g, '$&\n'));

				//log('got post result:\n' + response.replace(/.{1,72}/g, '$&\n'));

				let result = parsePostResponse(response);
				if (result.redirect) {
					setTimeout(function () {
						registerReleaseFormLock();
						commands.deactivatePostForm();
						setPostThumbnail();
						resetForm('com', 'upfile', 'textonly', 'baseform');
						overrideUpfile = undefined;
						setBottomStatus('投稿完了');

						let pageMode = pageModes[0];
						if (pageMode == 'reply' && $('post-switch-thread').checked) {
							pageMode = 'summary';
						}

						switch (pageMode) {
						case 'summary':
						case 'catalog':
							if (result.redirect != '') {
								sendToBackend('open', {
									url: result.redirect,
									selfUrl:window.location.href
								});
							}
							if ($('post-switch-reply')) {
								$('post-switch-reply').click();
							}
							break;
						case 'reply':
							commands.reload();
							break;
						}
					}, WAIT_AFTER_POST);
				}
				else {
					registerReleaseFormLock();
					window.alert(result.error || 'なんかエラー');
				}
			}
		);
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
			setTimeout(() => {
				let n = parseInt(xhr.responseText, 10) || 0;
				t.textContent = `そうだね × ${n}`;
				t.removeAttribute('data-busy');
				t.removeAttribute('data-text');
				t.classList.remove('sodane-null');
				t.classList.add('sodane');
				t = xhr = xhr.onload = xhr.onerror = null;
			}, WAIT_AFTER_POST);
		};
		xhr.onerror = () => {
			t.textContent = 'なんかエラー';
			setTimeout(() => {
				t.textContent = t.getAttribute('data-text');
				t.removeAttribute('data-busy');
				t.removeAttribute('data-text');
				t = xhr = xhr.onload = xhr.onerror = null;
			}, WAIT_AFTER_POST);
		};
		xhr.send();
	},
	saveImage: function (e, t) {
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

		sendToBackend('save-image', {
			url: href,
			path: storage.config.storage.value.replace('msonedrive', 'onedrive') + ':' + f,
			mimeType: getImageMimeType(href),
			anchorId: id
		});
	},

	/*
	 * dialogs
	 */

	openDeleteDialog: () => {
		const TRANSPORT_TYPE = 'delete';

		if (transport.isRunning(TRANSPORT_TYPE)) {
			transport.abort(TRANSPORT_TYPE);
			return;
		}

		if (transport.isRapidAccess(TRANSPORT_TYPE)) {
			return;
		}

		modalDialog({
			title: '記事削除',
			buttons: 'ok, cancel',
			oninit: dialog => {
				let xml = document.implementation.createDocument(null, 'dialog', null);
				let checksNode = xml.documentElement.appendChild(xml[CRE]('checks'));
				Array.prototype.forEach.call(
					$qsa('article input[type="checkbox"]:checked'),
					node => {
						checksNode.appendChild(xml[CRE]('check')).textContent =
							getPostNumber(node);
					}
				);
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
				let form = $qs('form', dialog.content);
				let status = $qs('.delete-status', dialog.content);
				if (!form || !status) return;

				form.action = `/${siteInfo.board}/futaba.php`;
				$t(status, '削除をリクエストしています...');
				postBase(TRANSPORT_TYPE, form,
					response => {
						response = response.replace(/\r\n|\r|\n/g, '\t');
						let result = parsePostResponse(response);

						if (!result.redirect) {
							$t(status, result.error || 'なんかエラー？');
							dialog.isPending = false;
							form = status = dialog = null;
							return;
						}

						$t(status, 'リクエストに成功しました');

						Array.prototype.forEach.call(
							$qsa('article input[type="checkbox"]:checked'),
							node => {
								node.checked = false;
							}
						);

						setTimeout(() => {
							dialog.isPending = false;
							dialog.close();
							form = status = dialog = null;
						}, WAIT_AFTER_POST);
					},
					() => {
						$t(status, 'ネットワークエラーです');
						dialog.isPending = false;
						form = status = dialog = null;
					}
				);

				dialog.isPending = true;
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

				// special element for mouse wheel unit
				setTimeout(() => {
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
					storageData[item.name.replace(/^config-item\./, '')] = item.value;
				});
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
							Array.prototype.forEach.call(
								$qsa('a', wrapElement),
								node => {
									node.parentNode.replaceChild(
										document.createTextNode(node.textContent),
										node);
								}
							);
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
						Array.prototype.forEach.call(
							$qsa('input[type="submit"]', form),
							node => {
								node.parentNode.removeChild(node);
							}
						);

						// strip tab borders
						Array.prototype.forEach.call(
							$qsa('table[border]', form),
							node => {
								node.removeAttribute('border');
							}
						);

						// make reason-text clickable
						Array.prototype.forEach.call(
							$qsa('input[type="radio"][name="reason"]', form),
							node => {
								let r = node.ownerDocument.createRange();
								let label = node.ownerDocument[CRE]('label');
								r.setStartBefore(node);
								r.setEndAfter(node.nextSibling);
								r.surroundContents(label);
							}
						);

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
					let form = $qs('form', dialog.content);
					let status = $qs('.moderate-status', dialog.content);
					if (!form || !status) return;

					$t(status, '申請を登録しています...');
					postBase('moderate', form,
						response => {
							response = response.replace(/\r\n|\r|\n/g, '\t');
							let result = parseModerateResponse(response);

							if (!result.registered) {
								$t(status, result.error || 'なんかエラー？');
								dialog.isPending = false;
								form = status = dialog = null;
								return;
							}

							$t(status, '登録されました');

							Array.prototype.forEach.call(
								$qsa('input[type="radio"]:checked', form),
								node => {
									storage.runtime.del.lastReason = node.value;
									storage.saveRuntime();
									node.checked = false;
								}
							);

							setTimeout(() => {
								dialog.isPending = false;
								dialog.close();
								form = status = dialog = null;
							}, WAIT_AFTER_POST);
						},
						() => {
							$t(status, 'ネットワークエラーです');
							dialog.isPending = false;
							form = status = dialog = null;
						}
					);

					dialog.isPending = true;
				}
			});
		};
		xhr.onerror = () => {
			anchor.removeAttribute('data-busy');
		};
		xhr.onloadend = () => {
			xhr = null;
		};
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
		startDrawing(dataURL => {
			if (!dataURL) return;

			let thumbWrap = $('post-image-thumbnail-wrap');
			let thumb = $('post-image-thumbnail');
			if (!thumbWrap || !thumb) return;

			getImageFrom(dataURL, img => {
				if (img) {
					let baseform = document.getElementsByName('baseform')[0];
					if (pageModes[0] == 'summary'
					 || pageModes[0] == 'catalog') {
						getBlobFrom(dataURL, blob => {
							overrideUpfile = {
								name: 'tegaki.png',
								data: blob
							};
						});
					}
					else if (baseform) {
						baseform.value = dataURL.replace(/^[^,]+,/, '');
					}
					resetForm('upfile', 'textonly');
					doDisplayThumbnail(thumbWrap, thumb, img);
				}
				thumbWrap = thumb = null;
			});
		});
	},

	/*
	 * form functionalities
	 */

	toggleSage: function () {
		var email = $('email');
		if (!email) return;
		email.value = /\bsage\b/.test(email.value) ?
			email.value.replace(/\s*\bsage\b\s*/g, '') :
			`sage ${email.value}`;
		email.setSelectionRange(email.value.length, email.value.length);
	},
	cursorPrev: function (e, t) {
		var n = t.selectionStart;
		var v = t.value;
		var column = 0;
		while (n-- > 0 && !/[\n]/.test(v.charAt(n))) {
			column++;
		}
		while (--n >= 0 && !/[\n]/.test(v.charAt(n))) {
			;
		}
		if (n < 0) {
			n = 0;
		}
		else {
			n++;
			while (column > 0 && n < v.length && !/[\n]/.test(v.charAt(n))) {
				n++;
				column--;
			}
		}
		t.selectionStart = n;
		t.selectionEnd = n;
	},
	cursorNext: function (e, t) {
		var n = t.selectionEnd;
		var v = t.value;
		var column = 0;
		while (n-- > 0 && !/[\n]/.test(v.charAt(n))) {
			column++;
		}
		while (++n < v.length && !/[\n]/.test(v.charAt(n))) {
			;
		}
		if (n >= v.length) {
			n = v.length;
		}
		else {
			n++;
			while (column > 0 && n < v.length && !/[\n]/.test(v.charAt(n))) {
				n++;
				column--;
			}
		}
		t.selectionStart = n;
		t.selectionEnd = n;
	},
	cursorBack: function (e, t) {
		var n = t.selectionStart;
		var v = t.value;
		if (n <= 0) {
			n = 0;
			t.selectionStart = n;
			t.selectionEnd = n;
			return;
		}
		n--;
		if (/[\n]/.test(v.charAt(n))) {
			while (n >= 0 && /[\n]/.test(v.charAt(n))) {
				n--;
			}
			n++;
		}
		t.selectionStart = n;
		t.selectionEnd = n;
	},
	cursorForward: function (e, t) {
		var n = t.selectionEnd;
		var v = t.value;
		if (n >= v.length) {
			n = v.length;
			t.selectionStart = n;
			t.selectionEnd = n;
			return;
		}
		if (/[\n]/.test(v.charAt(n))) {
			while (n < v.length && /[\n]/.test(v.charAt(n))) {
				n++;
			}
		}
		else {
			n++;
		}
		t.selectionStart = n;
		t.selectionEnd = n;
	},
	cursorTopOfLine: function (e, t) {
		var n = t.selectionStart;
		var v = t.value;
		var lastpos = t.getAttribute('data-last-pos');
		if (n == 0 && t.selectionEnd == v.length && lastpos) {
			n = lastpos - 0;
			if (n >= 0 && /[\n]/.test(v.charAt(n))) {
				n--;
			}
			while (n >= 0 && !/[\n]/.test(v.charAt(n))) {
				n--;
			}
			n++;
			t.selectionStart = n;
			t.selectionEnd = n;
			t.removeAttribute('data-last-pos');
		}
		else {
			t.setAttribute('data-last-pos', n);
			t.selectionStart = 0;
			t.selectionEnd = v.length;
		}
	},
	cursorBottomOfLine: function (e, t) {
		var n = t.selectionEnd;
		var v = t.value;
		while (n < v.length && !/[\n]/.test(v.charAt(n))) {
			n++;
		}
		t.selectionStart = n;
		t.selectionEnd = n;
	},

	/*
	 * catalog
	 */

	toggleCatalogVisibility: function (e, t) {
		let threads = $('content');
		let catalog = $('catalog');
		let ad = $('ad-aside-wrap');
		let panel = $('panel-aside-wrap');

		// activate catalog
		if (pageModes.length == 1) {
			threads.classList.add('hide');
			catalog.classList.remove('hide');
			ad.classList.add('hide');
			pageModes.unshift('catalog');
			$t($qs('#header a[href="#toggle-catalog"] span'), siteInfo.resno ? 'スレッド' : 'サマリー');

			if (panel.classList.contains('run')) {
				Array.from($qsa('#catalog .catalog-threads-wrap > div'))
					.forEach(div => {div.style.marginRight = '24%';});
			}

			let active = $qs(
				'#catalog .catalog-threads-wrap > div:not([class*="hide"])');
			if (active && active.childNodes.length == 0) {
				commands.reloadCatalog();
			}

			historyStateWrapper.updateHash('mode=cat');
		}

		// deactivate catalog
		else {
			threads.classList.remove('hide');
			catalog.classList.add('hide');
			ad.classList.remove('hide');
			$t($qs('#header a[href="#toggle-catalog"] span'), 'カタログ');
			catalogPopup.deleteAll();
			pageModes.shift();
			historyStateWrapper.updateHash('');
		}
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
		// TODO: fill me
		alert('Under Development!');
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
		activatePanelTab($qs('.panel-tab[href="#mark"]'));
		showPanel();
	},
	activateSearchTab: function () {
		let searchTab = $qs('.panel-tab[href="#search"]');
		activatePanelTab(searchTab);
		$t($qs('span', searchTab),
			(pageModes[0] == 'catalog' ? 'スレ' : 'レス') + '検索');
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
		if (pageModes[0] == 'catalog') {
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
		resources.clearCache();
		sendToBackend('reload');
	},
	toggleLogging: (e, t) => {
		timingLogger.locked = !t.value;
	}
};

/*
 * <<<1 bootstrap
 */

timingLogger = createTimingLogger();
timingLogger.startTag(`booting ${APP_NAME}`);

storage = createPersistentStorage();
storage.onChanged = (changes, areaName) => {
	if ('config' in changes) {
		storage.assignConfig(changes.config.newValue);
		applyDataBindings(xmlGenerator.run('').xml);
	}
	else if ('runtime' in changes) {
		storage.assignRuntime(changes.runtime.newValue);
	}
};

transport = createTransport();
resources = createResourceManager();

if (location.href.match(/^[^:]+:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^\/]+)\/res\/(\d+)\.htm/)) {
	siteInfo.server = RegExp.$1;
	siteInfo.board = RegExp.$2;
	siteInfo.resno = RegExp.$3 - 0;
	pageModes.unshift('reply');
}
else if (location.href.match(/^[^:]+:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^\/]+)/)) {
	siteInfo.server = RegExp.$1;
	siteInfo.board = RegExp.$2;
	pageModes.unshift('summary');
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
				config: storage.getAllConfig(),
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
			if (!NOTFOUND_TITLE.test(document.title)) {
				bootVars.bodyHTML = document.documentElement[IHTML];
				document.body[IHTML] =
					`${APP_NAME}: ` +
					`ページを再構成しています。ちょっと待ってね。`;
				resolve(true);
			}
			else {
				resolve(false);
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

	if (!storageData.migrated) {
		/*
		 * TODO: THIS BLOCK IS TRANSIENT.
		 * WHEN AKAHUKUPLUS THAT USES chrome.storage HAS FULLY DISTRIBUTED,
		 * WE SHOULD DELETE THIS IF-BLOCK.
		 */

		const migratable = true;
		const localKey = `${APP_NAME}_config`;
		let migrateData = {migrated: true};

		// migrate config data from localStorage
		let localData = window.localStorage.getItem(localKey);
		if (localData !== null) {
			try {
				localData = JSON.parse(localData);
			}
			catch (e) {
				localData = null;
			}
		}
		if (localData !== null) {
			for (let i in storageData.config) {
				if (i in localData) {
					storageData.config[i] = localData[i];
				}
			}

			migrateData.config = storageData.config;
		}
		if (migratable) {
			storage.set(migrateData);
			window.localStorage.removeItem(localKey);
		}
	}

	storage.assignConfig(storageData.config);
	storage.assignRuntime(storageData.runtime);

	return sendToBackend('initialized')
		.then(() => transformWholeDocument(xsl));
})
.catch(err => {
	timingLogger.forceEndTag();
	console.error(err);
	initialStyle(false);
	document.body[IHTML] = `${APP_NAME}: ${err.message}`;
	$t(document.body.appendChild(document[CRE]('pre')), err.stack);
});

}

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
