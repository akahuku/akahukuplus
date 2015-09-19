// ==UserScript==
// @name          frontend of akahukuplus
// @include       http://*.2chan.net/*/*.htm
// @include       http://*.2chan.net/*/*.htm?*
// @include       http://*.2chan.net/*/res/*.htm
// @include       http://*.2chan.net/*/res/*.htm?*
// @exclude       http://dec.2chan.net/up/*
// @exclude       http://dec.2chan.net/up2/*
// ==/UserScript==

/*
 * akahukuplus
 *
 * @author akahuku@gmail.com
 */

/*
 * consts
 */

const FUTABA_CHARSET = 'Shift_JIS';
const WAIT_AFTER_INIT_TRANSITION = 1000;
const WAIT_AFTER_RELOAD = 500;
const WAIT_AFTER_POST = 500;
const LEAD_REPLIES_COUNT = 50;
const REST_REPLIES_PROCESS_COUNT = 50;
const REST_REPLIES_PROCESS_INTERVAL = 200;
const POSTFORM_DEACTIVATE_DELAY = 500;
const BANNER_LOAD_DELAY = 1000;
const POSTFORM_LOCK_RELEASE_DELAY = 1000;
const RELOAD_LOCK_RELEASE_DELAY = 1000 * 3;
const RELOAD_AUTO_SCROLL_CONSUME = 200;
const WHEEL_RELOAD_UNIT_SIZE = 120;
const WHEEL_RELOAD_DEFAULT_FACTOR = 3;
const WHEEL_RELOAD_THRESHOLD_OVERRIDE = 0;
const NETWORK_ACCESS_MIN_INTERVAL = 1000 * 3;
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
const CATALOG_POPUP_THUMBNAIL_ZOOM_FACTOR = 4;

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

var bootVars = {iframeSources:'', bodyHTML:''};

// object instances
var config;
var favicon;
var timingLogger;
var backend;
var xmlGenerator;
var xsltProcessor;
var resources;
var sounds;
var clickDispatcher;
var keyManager;
var markStatistics;
var urlStorage;
var catalogPopup;
var quotePopup;
var selectionMenu;
var historyStateWrapper;

// xmlhttprequest
var transport;
var transportType;
var transportLastUsedTime = 0;

// others
var version = '0.1.0';
var devMode = false;
var pageModes = [];
var appStates = ['command'];
var viewportRect;
var cursorPos = {x:0, y:0, pagex:0, pagey:0};
var subHash = {};
var nameHash = {};
var lastModified;
var lastScrollTop;
var logSize = 10000;

/*
 * <<<1 bootstrap functions
 */

window.opera && (function () {
	function cancel (e) {
		if (!bootVars) {
			return;
		}
		if (e.element.text) {
			e.element.text = '';
		}
		if (e.element.src) {
			e.element.src = '';
		}
		if (e.source) {
			e.source = '';
		}

		removeAssets('script canceler');
		return e.preventDefault();
	}

	window.opera.addEventListener('BeforeScript', cancel, false);
	window.opera.addEventListener('BeforeExternalScript', cancel, false);
	window.opera.addEventListener('BeforeJavascriptURL', cancel, false);
})();

// html extension to DOMParser: @see https://gist.github.com/kethinov/4760460
(function (DOMParser) {
	'use strict';

	var DOMParser_proto = DOMParser.prototype,
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
			var doc = document.implementation.createHTMLDocument('');
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
	result = '';
	for (var i = 0, goal = s.length; i < goal; i++) {
		result += String.fromCharCode(s.charCodeAt(i) - 1);
	}
	return result;
}

function removeAssets (context) {
	var nodes = document.querySelectorAll('script, link, style, iframe, object');
	for (var i = nodes.length - 1; i >= 0; i--) {
		if (/^akahuku_/.test(nodes[i].id)) continue;
		if (nodes[i].nodeName == 'IFRAME') {
			bootVars.iframeSources += nodes[i].outerHTML;
		}
		//console.log((context || '') + ': ' +  nodes[i].nodeName + ' removed');
		nodes[i].parentNode.removeChild(nodes[i]);
	}
}

function initialStyle (isStart) {
	var s;

	if (isStart) {
		try {
			s = document.documentElement.appendChild(document[CRE]('style'));
		}
		catch (e) {
			s = null;
		}

		if (s) {
			s.type = 'text/css';
			s.id = 'akahuku_initial_style';
			s.appendChild(document.createTextNode('body {visibility:hidden}'));
		}
	}
	else {
		s = $('akahuku_initial_style');
		if (s) {
			s.parentNode.removeChild(s);
		}
	}
}

function initCustomEventHandler () {
	document.addEventListener('Akahukuplus.imageError', function (e) {
		if (e.detail && e.detail.target instanceof window.HTMLImageElement) {
			resources.get(
				'/images/404.jpg',
				{method:'readAsDataURL'},
				function (data) {
					e.detail.target.src = data || '';
				}
			);
		}
	}, false);

	var statusHideTimer;
	document.addEventListener('Akahukuplus.bottomStatus', function (e) {
		var ws = $('wheel-status');
		if (!ws) return;

		var s = e.detail.message;
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

function handleDOMContentLoaded (e) {
	timingLogger.startTag(e.type);
	document.removeEventListener(e.type, arguments.callee, false);
	bootVars.bodyHTML = document.documentElement[IHTML];
	removeAssets(e.type);
	initialStyle(false);
	config = createConfigurator();
	config.assign();
	backend = WasaviExtensionWrapper.create({extensionName: 'akahukuplus'});

	var connected = false;
	var retryRest = 5;
	var wait = 1000;
	var gotInit = function (req) {
		if (connected) return;
		connected = true;
		backend.tabId = req.tabId;
		version = req.version;
		devMode = req.devMode;
		resources = createResourceManager();
		initCustomEventHandler();
		document.body[IHTML] = 'akahukuplus: ページを再構成しています。ちょっと待ってね。';
		timingLogger.endTag();
		boot();
	};
	var timeout = function () {
		if (connected || retryRest <= 0) return;
		retryRest--;
		wait += 1000;
		setTimeout(function () {timeout()}, wait);
		backend.connect('init', gotInit);
	};

	setTimeout(function () {timeout()}, wait);
	backend.connect('init', gotInit);
}

function boot () {
	timingLogger.startTag('boot');
	resources.get(
		'/xsl/fundamental.xsl',
		{expires:DEBUG_ALWAYS_LOAD_XSL ? 1 : 1000 * 60 * 60},
		function (xsl) {
			if (xsl === null) {
				document.body[IHTML] =
					'akahukuplus: 内部用の XSL ファイルの取得に失敗しました。中止します。';
				return;
			}

			if (/\/futaba\.php\?.*res=\d+/.test(window.location.href)
			||  /\/res\/\d+\.htm$/.test(window.location.pathname)) {
				pageModes.unshift('reply');
			}
			else if (/\/(?:futaba|\d+)\.htm$/.test(window.location.pathname)) {
				pageModes.unshift('summary');
			}

			markStatistics = createMarkStatistics();
			xmlGenerator = createXMLGenerator();
			var generateResult = xmlGenerator.run(
				bootVars.bodyHTML + bootVars.iframeSources,
				null,
				pageModes[0] == 'reply' ? LEAD_REPLIES_COUNT : null);
			var xml = generateResult.xml;

			try {
				timingLogger.startTag('parsing xsl');
				xsl = (new window.DOMParser()).parseFromString(xsl, "text/xml");
				timingLogger.endTag();
			}
			catch (e) {
				document.body[IHTML] =
					'akahukuplus: XSL ファイルの DOM ツリー構築に失敗しました。中止します。';
				$t(document.body.appendChild(document[CRE]('pre')), e.stack);
				return;
			}

			xsltProcessor = new window.XSLTProcessor();
			try {
				timingLogger.startTag('constructing xsl');
				xsltProcessor.importStylesheet(xsl);
				timingLogger.endTag();
			}
			catch (e) {
				document.body[IHTML] =
					'akahukuplus: XSL ファイルの評価に失敗しました。中止します。';
				$t(document.body.appendChild(document[CRE]('pre')), e.stack);
				return;
			}

			try {
				// transform xsl into html
				timingLogger.startTag('applying xsl');
				document.body[IHTML] = '';
				xsltProcessor.setParameter(null, 'page_mode', pageModes[0]);
				xsltProcessor.setParameter(null, 'render_mode', 'full');

				var fragment = xsltProcessor.transformToFragment(xml, document);
				if (!fragment) {
					throw new Error('Cannot transform and import the XML document.');
				}

				var head = fragment.querySelector('head');
				var body = fragment.querySelector('body');
				var removeHeadElements = function () {
					Array.prototype.slice
					.call(document.querySelectorAll('head > *'))
					.forEach(function (node) {
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

				// some tweaks: remove obsolete attributes on body element
				['bgcolor', 'text', 'link', 'vlink', 'alink'].forEach(function (p) {
					document.body.removeAttribute(p);
				});

				// some tweaks: move some elements to its proper position
				var headNodes = Array.prototype.slice.call(
					document.querySelectorAll('body style, body link'));
				while (headNodes.length) {
					var node = headNodes.shift();
					node.parentNode.removeChild(node);
					document.head.appendChild(node);
				}

				// some tweaks: ensure title element exists
				if (document.head.getElementsByTagName('title').length == 0) {
					document.head.appendChild(document[CRE]('title')).setAttribute('data-binding', 'xpath:/futaba/meta/title');
				}

				// expand all bindings
				applyDataBindings(xml);

				// start transition
				var startTransition = function () {
					transitionend('content', function (e) {
						if (!bootVars) return;
						bootVars = null;

						install(pageModes[0]);

						timingLogger.endTag('(' + e.type + ')');
						timingLogger.endTag('!');
						timingLogger.locked = true;

						processRemainingReplies(generateResult.remainingRepliesContext);
					}, WAIT_AFTER_INIT_TRANSITION);
					$('content').classList.remove('init');
				};
				if (document.readyState == 'complete'
				|| document.readyState == 'interactive') {
					startTransition();
					startTransition = null;
				}
				else {
					window.addEventListener('load', function (e) {
						this.removeEventListener(e.type, arguments.callee, false);
						startTransition();
						startTransition = null;
					}, false);
				}
			}
			catch (e) {
				document.body[IHTML] =
					'akahukuplus: 内部 XML から HTML への変換に失敗しました。中止します。';
				$t(document.body.appendChild(document[CRE]('pre')), e.stack);
				return;
			}

			if (DEBUG_DUMP_INTERNAL_XML) {
				var node = document.body.appendChild(document[CRE]('pre'));
				node.appendChild(document.createTextNode(serializeXML(xml)));
				node.style.fontFamily = 'Consolas';
				node.style.whiteSpace = 'pre-wrap';
			}

			if (false) {
				var s = document.documentElement[IHTML];
				var ta = document.body.appendChild(document[CRE]('textarea'));
				ta.value = s;
				s = '';
			}

			xml = xsl = null;
		}
	);
}

/*
 * <<<1 applyDataBindings: apply a data in xml to a element, with its data binding definition
 */

function applyDataBindings (xml) {
	var nodes = document.querySelectorAll('*[data-binding]');
	var result = null, re = null;
	for (var i = 0, goal = nodes.length; i < goal; i++) {
		var binding = nodes[i].getAttribute('data-binding');
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
					'applyDataBindings: failed to apply the data "' + re[2] + '"' +
					'\n(' + e.message + ')');
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
					'applyDataBindings: failed to apply the data "' + re[2] + '" to class' +
					'\n(' + e.message + ')');
			}
		}
		else if ((re = /^template(?:\[([^\]]+)\])?:(.+)/.exec(binding))) {
			if (typeof re[1] == 'string' && re[1] != pageModes[0]) continue;
			try {
				xsltProcessor.setParameter(null, 'render_mode', re[2]);
				var f = fixFragment(xsltProcessor.transformToFragment(xml, document));
				if (f.textContent.replace(/^\s+|\s+$/g, '') == '' && !f.querySelector('[data-doe]')) continue;
				empty(nodes[i]);
				appendFragment(nodes[i], f);
			}
			catch (e) {
				console.error(
					'applyDataBindings: failed to apply the template "' + re[2] + '"' +
					'\n(' + e.message + ')');
			}
		}
	}
}

/*
 * <<<1 classes / class constructors
 */

function createResourceManager () {
	function loadViaBackend (path, callback, expires, method) {
		sendToBackend(
			'get-resource', {
				path: path,
				asDataURL: method == 'readAsDataURL'
			},
			function (data) {
				if (data) {
					callback(data.data);
					var slot = {
						expires: Date.now() + (expires === undefined ? 1000 * 60 * 60 : expires),
						data: data.data
					};
					window.localStorage.setItem(getResKey(path), JSON.stringify(slot));
				}
				else {
					callback(null);
				}
			}
		);
	}
	function loadDirectly (path, callback, expires, method) {
		var file = opera.extension.getFile(path);
		if (!file) {
			setTimeout(function () {
				callback(null);
				callback = null;
			}, 1);
			return;
		}
		
		var fr = new FileReader;
		fr.onload = function () {
			callback(fr.result);

			var slot = {
				expires: Date.now() + (expires === undefined ? 1000 * 60 * 60 : expires),
				data: fr.result
			};
			window.localStorage.setItem(getResKey(path), JSON.stringify(slot));

			callback = fr.onload = fr.onerror = null;
			fr = null;
		};
		fr.onerror = function () {
			callback(null);
			callback = fr.onload = fr.onerror = null;
			fr = null;
		};
		fr[method](file);
	}
	function getResKey (key) {
		return 'resource:' + key;
	}

	function get (key) {
		var resKey = getResKey(key);
		var opts;
		var callback;

		switch (arguments.length) {
		case 2:
			callback = arguments[1];
			break;
		case 3:
			opts = arguments[1];
			callback = arguments[2];
			break;
		default:
			throw new Error('createResourceManager: invalid argument number');
			break;
		}

		opts || (opts = {});
		var method = opts.method || 'readAsText';
		var expires = opts.expires;

		if (typeof callback != 'function') {
			throw new Error('createResourceManager: callback is not a function');
		}

		var slot = window.localStorage.getItem(resKey);
		if (slot !== null) {
			slot = JSON.parse(slot);
			if (slot.expires > Date.now()) {
				setTimeout(function (data) {
					callback(data);
					callback = null;
				}, 1, slot.data);
				return;
			}
			window.localStorage.removeItem(resKey);
		}

		if (window.opera) {
			loadDirectly(key, callback, expires, method);
		}
		else {
			loadViaBackend(key, callback, expires, method);
		}
	}

	return {
		get:get
	};
}

function createXMLGenerator () {
	function stripTags (s) {
		while (/<\w+[^>]*>/.test(s)) {
			s = s.replace(/<(\w+)[^>]*>([^>]*)<\/\1>/g, '$2');
		}
		return s;
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
		var text = textFactory(threadNode.ownerDocument);
		var repliesNode = element(threadNode, 'replies');
		var goal = count + maxReplies;
		var offset = count + 1;
		var reply;

		for (;count < goal && (reply = regex.exec(s)); offset++, count++) {
			var re = /^(.*)<blockquote[^>]*>(.*)<\/blockquote>/i.exec(reply[0]);
			if (!re) continue;

			var info = re[1];
			var infoText = info.replace(/<\/?\w+(\s+\w+\s*=\s*"[^"]*")*[^>]*>/g, '');
			var comment = re[2];
			var replyNode = element(repliesNode, 'reply');
			var number;

			// number
			re = /No\.(\d+)/i.exec(infoText);
			if (re) {
				number = re[1];
				var numberNode = element(replyNode, 'number');
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
				var idNode = element(replyNode, 'user_id');
				idNode.appendChild(text(stripTags(re[1])));
				markStatistics.notifyId(number, re[1]);
			}

			// mark
			re = /\[?<font\s+color="#ff0000">(.+?)<\/font>\]?/i.exec(comment);
			if (re) {
				if (!replyNode.querySelector('deleted')) {
					element(replyNode, 'deleted');
				}

				var markNode = element(replyNode, 'mark');
				re[0].charAt(0) == '['
					&& re[0].substr(-1) == ']'
					&& markNode.setAttribute('bracket', 'true');
				re[1] = stripTags(re[1]);
				markNode.appendChild(text(re[1]));
				markStatistics.notifyMark(number, re[1]);
			}

			// そうだね (that's right）
			re = /<a[^>]+class=["']?sod["']?[^>]*>([^<]+)<\/a>/i.exec(info);
			if (re) {
				var sodaneNode = element(replyNode, 'sodane');
				sodaneNode.appendChild(text(re[1].replace('x', ' × ')));
				sodaneNode.setAttribute('className', re[1] == '+' ? 'sodane-null' : 'sodane');
			}

			// skip, if we can
			if (number <= lowBoundNumber) {
				continue;
			}

			// offset
			element(replyNode, 'offset').appendChild(text(offset));

			// posted date
			re = /(\d+)\/(\d+)\/(\d+)\(.\)(\d+):(\d+):(\d+)/.exec(info);
			if (re) {
				var postedDate = new Date(
					2000 + (re[1] - 0),
					re[2] - 0,
					re[3] - 0,
					re[4] - 0,
					re[5] - 0,
					re[6] - 0,
					0
				);
				var postDateNode = element(replyNode, 'post_date');
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
				var emailNode = element(replyNode, 'email');
				emailNode.appendChild(text(stripTags(re[1])));
				linkify(emailNode);
			}

			// src & thumbnail url
			var imagehref = /<br><a href="([^"]+)"[^>]*>(<img[^>]+>)<\/a>/i.exec(info);
			if (imagehref) {
				var imageNode = element(replyNode, 'image');
				imageNode.appendChild(text(resolveRelativePath(imagehref[1], baseUrl)));
				imageNode.setAttribute('base_name', imagehref[1].match(/[^\/]+$/)[0]);

				// animated
				re = /<!--AnimationGIF-->/i.exec(info);
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
				var thumbUrl = '', thumbWidth = false, thumbHeight = false;
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
				if (thumbUrl != '' && thumbWidth !== false && thumbHeight !== false) {
					var thumbNode = element(replyNode, 'thumb');
					thumbNode.appendChild(text(thumbUrl));
					thumbNode.setAttribute('width', thumbWidth);
					thumbNode.setAttribute('height', thumbHeight);
				}
			}

			// comment
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
	LinkTarget.prototype.completeScheme = function (url, scheme) {
		scheme || (scheme = 'http');
		if (/^[^:]*:\/\//.test(url)) {
			url = url.replace(/^[^:]*:\/\//, scheme + '://');
		}
		else {
			url = scheme + '://' + url;
		}
		return url;
	};
	LinkTarget.prototype.siokaraProc = function (re, anchor, baseUrl) {
		if (re[2]) {
			anchor.setAttribute('basename', re[1] + re[2]);
			if (/\.(?:jpg|gif|png)$/.test(re[2])) {
				anchor.setAttribute('class', this.className + ' lightbox');
				anchor.setAttribute('thumbnail', baseUrl + 'misc/' + re[1] + '.thumb.jpg');
			}
			return baseUrl + 'src/' + re[1] + re[2];
		}
		else {
			anchor.setAttribute('basename', re[1]);
			anchor.setAttribute('class', this.className + ' incomplete');
			return baseUrl + 'index.html';
		}
	};
	LinkTarget.prototype.upProc = function (re, anchor, baseUrl) {
		if (re[2]) {
			anchor.setAttribute('basename', re[1] + re[2]);
			if (/\.(?:jpg|gif|png)$/.test(re[2])) {
				anchor.setAttribute('class', this.className + ' lightbox');
			}
			return baseUrl + 'src/' + re[1] + re[2];
		}
		else {
			anchor.setAttribute('basename', re[1]);
			anchor.setAttribute('class', this.className + ' incomplete');
			return baseUrl + 'up.htm';
		}
	};
	var linkTargets = [
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
			'\\b((?:h?t?t?p?s?://)?(?:' + [
				'www\\.youtube\\.com/watch\?(?:.*?v=([\\w\\-]+))',
				'www\\.youtube\\.com/v/([\\w\\-]+)',
				'youtu\\.be/([\\w\\-]+)'
			].join('|') + ')\\S*)',
			function (re, anchor) {
				anchor.setAttribute('youtube-key', re[1] || re[2] || re[3]);
				return re[0];
			}
		),
		new LinkTarget(
			'link-nico2',
			'\\b((?:h?t?t?p?://)?[^.]+\\.nicovideo\\.jp/watch/(sm\\w+)\\S*)',
			function (re, anchor) {
				anchor.setAttribute('nico2-key', re[1]);
				return re[0];
			}
		),
		new LinkTarget(
			'link-futaba lightbox',
			'\\b((?:h?t?t?p?://)?[^.]+\\.2chan\\.net/[^/]+/[^/]+/src/\\d+\\.(?:jpg|gif|png)\\S*)',
			function (re, anchor) {
				anchor.setAttribute(
					'thumbnail',
					re[0]
						.replace('/src/', '/thumb/')
						.replace(/\.(?:jpg|gif|png)/, 's.jpg'));
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
			'\\b((h?t?t?p?s?)(://\\S+))',
			function (re, anchor) {
				var scheme = /s$/.test(re[1]) ? 'https': 'http';
				return scheme + re[2];
			}
		)
	];
	var linkTargetRegex = new RegExp(linkTargets.map(function (a, i) {
		var re = (a.pattern.replace(/\(\?/g, '')).match(/\(/g);
		linkTargets[i].backrefLength = re ? re.length : 0;
		linkTargets[i].offset = i > 0 ? linkTargets[i - 1].offset + linkTargets[i - 1].backrefLength : 1;
		return a.pattern;
	}).join('|'));
	var emojiPattern = /([\u00a9\u00ae\u2002\u2003\u2005\u203c\u2049\u2122\u2139\u2194-\u2199\u21a9\u21aa\u231a\u231b\u23e9-\u23ec\u23f0\u23f3\u24c2\u25aa\u25ab\u25b6\u25c0\u25fb-\u25fe\u2600\u2601\u260e\u2611\u2614\u2615\u261d\u263a\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267b\u267f\u2693\u26a0\u26a1\u26aa\u26ab\u26bd\u26be\u26c4\u26c5\u26ce\u26d4\u26ea\u26f2\u26f3\u26f5\u26fa\u26fd\u2702\u2705\u2708-\u270c\u270f\u2712\u2714\u2716\u2728\u2733\u2734\u2744\u2747\u274c\u274e\u2753-\u2755\u2757\u2764\u2795-\u2797\u27a1\u27b0\u2934\u2935\u2b05-\u2b07\u2b1b\u2b1c\u2b50\u2b55\u3030\u303d\u3297\u3299]|\ud83c[\udc04\udccf\udd70\udd71\udd7e\udd7f\udd8e\udd91-\udd9a\ude01\ude02\ude1a\ude2f\ude32-\ude3a\ude50\ude51\udf00-\udf0c\udf0f\udf11\udf13-\udf15\udf19\udf1b\udf1f\udf20\udf30\udf31\udf34\udf35\udf37-\udf4a\udf4c-\udf4f\udf51-\udf7b\udf80-\udf93\udfa0-\udfc4\udfc6\udfc8\udfca\udfe0-\udfe3\udfe5-\udff0]|\ud83d[\udc0c-\udc0e\udc11\udc12\udc14\udc17-\udc29\udc2b-\udc3e\udc40\udc42-\udc64\udc66-\udc6b\udc6e-\udcac\udcae-\udcb5\udcb8-\udceb\udcee\udcf0-\udcf4\udcf6\udcf7\udcf9-\udcfc\udd03\udd0a-\udd14\udd16-\udd2b\udd2e-\udd3d\udd50-\udd5b\uddfb-\uddff\ude01-\ude06\ude09-\ude0d\ude0f\ude12-\ude14\ude16\ude18\ude1a\ude1c-\ude1e\ude20-\ude25\ude28-\ude2b\ude2d\ude30-\ude33\ude35\ude37-\ude40\ude45-\ude4f\ude80\ude83-\ude85\ude87\ude89\ude8c\ude8f\ude91-\ude93\ude95\ude97\ude99\ude9a\udea2\udea4\udea5\udea7-\udead\udeb2\udeb6\udeb9-\udebe\udec0])[\ufe0e\ufe0f]?/;

	function linkify (node) {
		var r = node.ownerDocument.createRange();
		var re;
		while (node.lastChild.nodeType == 3) {
			if ((re = linkTargetRegex.exec(node.lastChild.nodeValue))) {
				var index = -1;
				linkTargets.some(function (a, i) {
					if (re[a.offset] != undefined && re[a.offset] != '') {
						index = i;
						return true;
					}
				});
				if (index < 0) break;

				var anchor = node.ownerDocument[CRE]('a');
				r.setStart(node.lastChild, re.index);
				r.setEnd(node.lastChild, re.index + re[0].length);
				r.surroundContents(anchor);
				anchor.setAttribute('class', linkTargets[index].className);
				anchor.setAttribute('href', linkTargets[index].getHref(re, anchor));
			}
			else if ((re = emojiPattern.exec(node.lastChild.nodeValue))) {
				var emoji = node.ownerDocument[CRE]('emoji');
				r.setStart(node.lastChild, re.index);
				r.setEnd(node.lastChild, re.index + re[0].length);
				r.surroundContents(emoji);

				var cp = toUCS32(re[1]);
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

	function getExpirationDate (s) {
		var d = new Date;
		var Y, M, D, h, m;

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

		if (h != undefined && h < d.getHours() && D == undefined) {
			D = d.getDate() + 1;
		}
		if (D != undefined && D < d.getDate() && M == undefined) {
			M = d.getMonth() + 1;
		}
		if (M != undefined && M < d.getMonth() && Y == undefined) {
			Y = d.getFullYear() + 1;
		}

		Y != undefined && d.setFullYear(Y);
		M != undefined && d.setMonth(M);
		D != undefined && d.setDate(D);
		h != undefined && m != undefined && d.setHours(h, m);

		var remains = d.getTime() - Date.now();
		if (remains < 0) {
			return '?';
		}

		var remainsString = [];
		[
			[1000 * 60 * 60 * 24, '日と'],
			[1000 * 60 * 60, '時間'],
			[1000 * 60, '分']
		].forEach(function (unit) {
			if (remains >= unit[0]) {
				remainsString.push(Math.floor(remains / unit[0]) + unit[1]);
				remains %= unit[0];
			}
		});

		return remainsString.length ?
			'あと' + remainsString.join('') + 'くらい' :
			'あと数秒！';
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

		// strip control characters, include LF and CR
		content = content.replace(/[\u0000-\u001f]/g, ' ');

		// strip bidi control character references
		content = content.replace(/[\u200e-\u200f\u202a-\u202e]/g, '');

		// strip script tag and its contents
		content = content.replace(/<script[^>]*>.*?<\/script>/gi, '');

		// regalize all references
		content = content.replace(/&amp;/g, '&');

		// base url
		re = /<base[^>]+href="([^"]+)"/i.exec(content);
		if (re) {
			baseUrl = re[1];
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
			var title = re[1]
				.replace(/二次元裏$/, '虹裏' + window.location.hostname.split('.')[0])
				+ re[2];
			if (!isReplyMode && (re = /(\d+)\.htm$/.exec(window.location.pathname))) {
				title += ' [ページ ' + re[1] + ']';
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
					logSize = RegExp.$1 - 0;
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
			pfNode = element(metaNode, 'postform');
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
			var adsNode = element(metaNode, 'ads');

			var adsHash = {};
			var adsRegex = /<iframe[^>]+>.*?<\/iframe>/gi;
			var ads;
			while ((ads = adsRegex.exec(content))) {
				if (!(ads[0] in adsHash)) {
					adsHash[ads[0]] = 1;
				}
			}
			var bannersNode = element(adsNode, 'banners');
			for (var i in adsHash) {
				var width = /width="(\d+)"/.exec(i);
				var height = /height="(\d+)"/.exec(i);
				var src = /src="([^"]*)"/.exec(i);
				if (!width || !height) continue;

				var adNode = element(bannersNode, 'ad');
				var className = 'unknown';

				width = width[1] - 0;
				height = height[1] - 0;
				src = src[1];

				if (width == 468 && height == 60) {
					className = 'mini';
				}
				else if (width == 728 && height == 90) {
					className = 'large';
				}

				i = i.replace(/\bsrc=/, 'src="about:blank" data-src=');

				adNode.appendChild(text(i));
				adNode.setAttribute('class', 'size-' + className);
				adNode.setAttribute('width', width);
				adNode.setAttribute('height', height);
				adNode.setAttribute('src', src);
			}

			var re = /<div\s+class="ama"[^>]*>(.+<\/blockquote>)\s*<\/div>/i.exec(content);
			if (re) {
				re[1] = re[1].replace(/style="[^"]+"/i, '');
				re[1] = re[1].replace(/<img[^>]*>/gi, function ($0) {
					return $0
						.replace(/\bdata-src=/gi, 'src=')
						.replace(/(?:align|border|[hv]space)="[^"]*"/gi, '');
				});
				re[1] = re[1].replace(/(<\/?)blockquote\b/gi, '$1div');
				var amazonNode = element(adsNode, 'amazon');
				amazonNode.appendChild(text(re[1]));
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
			paramNode.setAttribute('value', config.data.storage.value)

			paramNode = configNode.appendChild(element(configNode, 'param'));
			paramNode.setAttribute('name', 'banner_enabled')
			paramNode.setAttribute('value', config.data.banner_enabled.value ? '1' : '0')
		})();

		/*
		 * split content into threads
		 */

		var threadIndex = 0;
		var threadRegex = /(<br>|<\/div>)(<a[^>]+><img[^>]+><\/a>)?<input[^>]+value="?delete"?[^>]*>.*?<hr>/g;
		var matches;
		markStatistics.start();
		while ((matches = threadRegex.exec(content))) {
			var match = matches[0];
			var topic = /^(.+?)<blockquote[^>]*>(.*?)<\/blockquote>(.*)/i.exec(match);
			if (!topic) continue;

			var topicInfo = topic[1];
			var topicInfoText = topicInfo.replace(/<\/?\w+(\s+\w+\s*=\s*"[^"]*")*\s*>/g, '');
			var threadRest = topic[3];
			topic = topic[2];

			re = /^(.*?)(<table .*)/i.exec(threadRest);
			if (re) {
				topicInfo += ' ' + re[1];
				threadRest = re[2];
			}
			else {
				topicInfo += ' ' + threadRest;
				threadRest = '';
			}
			
			var htmlref;
			if (isReplyMode) {
				htmlref = /\b(res\/(\d+)\.htm|futaba\.php\?res=(\d+))/.exec(window.location.href);
			}
			else {
				htmlref = /<a href=['"]?(res\/(\d+)\.htm|futaba\.php\?res=(\d+))[^>]*>/i.exec(topicInfo);
			}
			if (!htmlref)  continue;

			/*
			 * thread meta informations
			 */

			var threadNode = element(enclosureNode, 'thread');
			threadNode.setAttribute('url', resolveRelativePath(htmlref[1], baseUrl));

			/*
			 * topic informations
			 */

			var topicNode = element(threadNode, 'topic');

			// expiration date
			var expires = /<small>(.+?頃消えます)<\/small>/i.exec(topicInfo);
			var expireWarn = /<font[^>]+><b>このスレは古いので、/i.test(topicInfo);
			if (expires || expireWarn) {
				var expiresNode = element(topicNode, 'expires');
				if (expires) {
					expiresNode.appendChild(text(expires[1]));
					expiresNode.setAttribute('remains', getExpirationDate(expires[1]));
				}
				if (expireWarn) {
					expiresNode.setAttribute('warned', 'true');
				}
			}

			// number
			var threadNumber = 0;
			if (typeof htmlref[2] == 'string' && htmlref[2] != '') {
				threadNumber = htmlref[2] - 0;
			}
			else if (typeof htmlref[3] == 'string' && htmlref[3] != '') {
				threadNumber = htmlref[3] - 0;
			}
			if (threadNumber) {
				var threadNumberNode = element(topicNode, 'number');
				threadNumberNode.appendChild(text(threadNumber));
				re = /^(\d*?)((\d)\3+)$/.exec(threadNumber);
				if (re) {
					threadNumberNode.setAttribute('lead', re[1]);
					threadNumberNode.setAttribute('trail', re[2]);
				}
			}

			// posted date
			re = /(\d+)\/(\d+)\/(\d+)\(.\)(\d+):(\d+):(\d+)/.exec(topicInfo);
			if (re) {
				var postedDate = new Date(
					2000 + (re[1] - 0),
					re[2] - 0,
					re[3] - 0,
					re[4] - 0,
					re[5] - 0,
					re[6] - 0,
					0
				);
				var postDateNode = element(topicNode, 'post_date');
				postDateNode.appendChild(text(re[0]));
				postDateNode.setAttribute('value', postedDate.getTime() / 1000);
			}

			// subject
			re = /<input[^>]+type="checkbox"[^>]*>(?:<[^a][^>]*>)+([^<]+)/i.exec(topicInfo);
			if (re) {
				re[1] = re[1].replace(/^\s+|\s+$/g, '');
				element(topicNode, 'sub').appendChild(text(re[1]));
				subHash[re[1]] = (subHash[re[1]] || 0) + 1;
			}

			// name
			re = /Name\s*<font[^>]*>(.+?)<\/font>/i.exec(topicInfo);
			if (re) {
				re[1] = re[1]
					.replace(/<[^>]*>/g, '')
					.replace(/^\s+|\s+$/g, '');
				element(topicNode, 'name').appendChild(text(re[1]));
				nameHash[re[1]] = (nameHash[re[1]] || 0) + 1;
			}

			// mail address
			re = /<a href="mailto:([^"]*)"/i.exec(topicInfo);
			if (re) {
				var emailNode = element(topicNode, 'email');
				emailNode.appendChild(text(stripTags(re[1])));
				linkify(emailNode);
			}

			// そうだね (that's right）
			re = /<a[^>]+class=["']?sod["']?[^>]*>([^<]+)<\/a>/i.exec(topicInfo);
			if (re) {
				var sodaneNode = element(topicNode, 'sodane');
				sodaneNode.appendChild(text(re[1].replace('x', ' × ')));
				sodaneNode.setAttribute('className', re[1] == '+' ? 'sodane-null' : 'sodane');
			}

			// ID
			re = /ID:([^ ]+)/.exec(topicInfoText);
			if (re) {
				var idNode = element(topicNode, 'user_id');
				idNode.appendChild(text(stripTags(re[1])));
				markStatistics.notifyId(threadNumber, re[1]);
			}

			// src & thumbnail url
			var imagehref = /<br><a href="([^"]+)"[^>]*>(<img[^>]+>)<\/a>/i.exec(topicInfo);
			if (imagehref) {
				var imageNode = element(topicNode, 'image');
				imageNode.appendChild(text(resolveRelativePath(imagehref[1], baseUrl)));
				imageNode.setAttribute('base_name', imagehref[1].match(/[^\/]+$/)[0]);

				// animated
				re = /<!--AnimationGIF-->/i.exec(topicInfo);
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
				var thumbUrl = '', thumbWidth = false, thumbHeight = false;
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
				if (thumbUrl != '' && thumbWidth !== false && thumbHeight !== false) {
					var thumbNode = element(topicNode, 'thumb');
					thumbNode.appendChild(text(thumbUrl));
					thumbNode.setAttribute('width', thumbWidth);
					thumbNode.setAttribute('height', thumbHeight);
				}
			}

			// communist sign :-)
			re = /\[?<font\s+color="#ff0000">(.+?)<\/font>\]?/i.exec(topic);
			if (re) {
				var markNode = element(topicNode, 'mark');
				re[0].charAt(0) == '['
					&& re[0].substr(-1) == ']'
					&& markNode.setAttribute('bracket', 'true');
				markNode.appendChild(text(stripTags(re[1])));
			}

			// comment
			pushComment(element(topicNode, 'comment'), topic);

			/*
			 * replies
			 */

			var hiddenRepliesCount = 0;
			re =  /font color="#707070">レス(\d+)件省略。/i.exec(topicInfo);
			if (re) {
				hiddenRepliesCount = re[1] - 0;
			}

			var result = fetchReplies(
				threadRest,
				/<table[^>]*>.*?<input[^>]*>.*?<\/td>/g,
				hiddenRepliesCount, maxReplies, -1, threadNode,
				subHash, nameHash, baseUrl);

			var lastIndex = result.regex.lastIndex;
			if (!result.lastReached && result.regex.exec(threadRest)) {
				result.regex.lastIndex = lastIndex;
				remainingRepliesContext.push({
					index: threadIndex,
					repliesCount: result.repliesCount,
					regex: result.regex,
					content: threadRest
				});
			}

			result.repliesNode.setAttribute("total", result.repliesCount);
			result.repliesNode.setAttribute("hidden", hiddenRepliesCount);

			threadIndex++;
		}

		setDefaultSubjectAndName(xml, metaNode, subHash, nameHash);

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
					subHash, nameHash, url);

				result.repliesNode.setAttribute("total", result.repliesCount);
				result.repliesNode.setAttribute("hidden", context[0].repliesCount);
				setDefaultSubjectAndName(xml, element(xml.documentElement, 'meta'), subHash, nameHash);

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

			setTimeout(function () {main()}, REST_REPLIES_PROCESS_INTERVAL);
		}

		main();
		timingLogger.endTag();
	}

	return {
		run: run,
		remainingReplies: remainingReplies
	};
}

function createConfigurator () {
	var keyName = 'akahukuplus_config';
	var data = {
		wheel_reload_unit_size: {
			type:'int',
			value:WHEEL_RELOAD_UNIT_SIZE,
			name:'ホイールの1目盛りの単位移動量',
			desc:'通常は120',
		},
		wheel_reload_threshold_override: {
			type:'int',
			value:WHEEL_RELOAD_THRESHOLD_OVERRIDE,
			name:'ホイールリロード発動量',
			desc:'ページ末尾で何回ホイールを回したときリロードを行うかを指定する。通常は0',
			min:0
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
			name:'使用するオンラインストレージ',
			list:{
				dropbox:'dropbox',
				gdrive:'Google Drive',
				msonedrive:'Microsoft OneDrive'
			}
		},
		save_image_name_template: {
			type:'string',
			value:'$SERVER/$BOARD/$SERIAL.$EXT',
			name:'保存するファイル名のテンプレート',
			desc:'以下のマクロを使用できます: ' +
				'$SERVER (サーバ名)、$BOARD (板名)、$THREAD (スレッド番号)、' +
				'$YEAR (画像の投稿年)、$MONTH (画像の投稿月)、$DAY (画像の投稿日)、' +
				'$SERIAL (画像番号)、$DIST (画像の分散キー)、$EXT (拡張子)'
		},
		lightbox_enabled: {
			type:'bool',
			value:true,
			name:'画像を lightbox で表示する'
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
			value:false,
			name:'バナーを表示する'
		}
	};

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
			var keys = Object.keys(data[name].list);
			if (keys.indexOf(value) < 0) {
				value = keys[0];
			}
			break;
		default:
			return;
		}

		return value;
	}

	function save () {
		var tmp = {};

		for (var i in data) {
			if (typeof data[i].onsave == 'function') {
				data[i].onsave(data[i]);
			}
			if (data[i].value != data[i].defaultValue) {
				tmp[i] = data[i].value;
			}
		}

		window.localStorage.setItem(keyName, JSON.stringify(tmp));
	}

	function assign (storage) {
		if (!storage) {
			storage = window.localStorage.getItem(keyName);
			if (storage == null) return;

			try {
				storage = JSON.parse(storage);
			}
			catch (e) {
				storage = null;
			}
		}
		if (!storage) return;

		for (var i in storage) {
			if (!(i in data)) continue;
			var value = validate(i, storage[i]);
			if (value != undefined) {
				data[i].value = value;
			}
		}
	}

	function reset () {
		for (var i in data) {
			data[i].value = data[i].defaultValue;
		}
	}

	function init () {
		for (var i in data) {
			if (typeof data[i].onload == 'function') {
				data[i].onload(data[i]);
			}
			data[i].defaultValue = data[i].value;
		}
	}

	init();
	return {
		save: save,
		assign: assign,
		reset: reset,
		get data () {return data},
		get keyName () {return keyName}
	};
}

function createTimingLogger () {
	var a = [];
	var b = [];
	var last = false;
	var locked = false;
	function timeOffset (now) {
		if (last === false) {
			return now;
		}
		else {
			return ('            +' + (now - last)).substr(-13);
		}
	}
	return {
		startTag: function (s) {
			if (locked) return;
			var now = Date.now();
			var item = {time:now, message: s};
			a.push(item);
			b.push(
				'[start]\t' +
				timeOffset(now) + '\t' +
				item.message);
			last = now;
		},
		endTag: function (s) {
			if (locked) return;
			var item = a.pop();
			if (!item) return;
			var now = Date.now();
			b.push(
				'[done]\t' +
				timeOffset(now) + '\t' +
				item.message + (s ? (' ' + s) : '') +
				' (' + (now - item.time).toFixed(4) + ' msecs)');
			if (a.length == 0) {
				log('*** timing dump ***\n' + this.dump());
				a.length = b.length = 0;
			}
			last = now;
		},
		dump: function () {
			if (locked) return;
			return b.join('\n');
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
	var keys = {};

	function handler (e) {
		var t = e.target, fragment;
		while (t) {
			var code = t.nodeName;
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

		for (var i in keys) {
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
		var result;
		try {
			result = keys[fragment](e, t);
		}
		catch (e) {
			console.error('exception in clickDispatcher: ' + e.toString() + '\n' + e.stack);
			result = undefined;
		}

		var isAnchor = false;
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
	var strokes = {};

	function keypress (e) {
		var focusedNodeName = getFocusedNodeName();
		if (isSpecialInputElement(focusedNodeName)) {
			return;
		}

		var mode = appStates[0] +
			(isTextInputElement(focusedNodeName) ? '.edit' : '');
		if (!(mode in strokes) || !(e.key in strokes[mode])) {
			return;
		}

		var result;
		try {
			result = strokes[mode][e.key].handler(e, document.activeElement);
		}
		catch (ex) {
			console.error(
				'exception in keyManager: ' + ex.toString() + '\n' + e.stack);
			result = undefined;
		}
		if (result === 'passthrough') {
			return;
		}
		return false;
	}

	function getFocusedNodeName () {
		var focusedNodeName = document.activeElement.nodeName.toLowerCase();
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
		stroke.forEach(function (s) {
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

		var m = [];
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
	var volume = 50;
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

function sendToBackend (type, data, callback) {
	var args = Array.prototype.slice.call(arguments), data, callback;
	if (args.length > 1 && typeof args[args.length - 1] == 'function') {
		callback = args.pop();
	}
	if (args.length > 1) {
		data = args.pop();
	}
	else {
		data = {};
	}
	data.type = type;
	backend.postMessage(data, callback);
}

function createMarkStatistics () {
	var marks, otherMarks, ids;
	var repliesCount, newEntries;

	var KEY_MAP = {
		'管理人': 'admin',
		'なー': 'nar',
		'スレッドを立てた人によって削除されました': 'passive',
		'書き込みをした人によって削除されました': 'active'
	};

	function getRepliesCount () {
		return document.querySelectorAll('article:first-child .reply-wrap').length;
	}

	function notifyMark (number, content) {
		var key = KEY_MAP[content];
		if (key) {
			if (!(number in marks[key])) {
				newEntries[key + '_' + number] = 1;
			}
			marks[key][number] = 1;
		}
		else {
			if (!(content in otherMarks)) {
				otherMarks[content] = {};
			}
			if (!(number in otherMarks[content])) {
				newEntries['other_' + number] = 1;
			}
			otherMarks[content][number] = 1;
		}
	}

	function notifyId (number, id) {
		if (!(id in ids)) {
			ids[id] = {};
		}
		if (!(number in ids[id])) {
			newEntries['id_' + number] = 1;
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
		var extMarks = {};
		var newMarks = {};
		var extIds = {};
		var newIds = {};
		var currentRepliesCount = getRepliesCount();

		function getMarkData () {
			var result = {};

			for (var i in marks) {
				result[i] = [];
				for (var num in marks[i]) {
					var isNew = (i + '_' + num) in newEntries;
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
			var result = {};

			for (var host in otherMarks) {
				result[host] = [];
				for (var num in otherMarks[host]) {
					var isNew = ('other_' + num) in newEntries;
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
			var result = {};

			for (var id in ids) {
				result[id] = [];

				for (var num in ids[id]) {
					var isNew = ('id_' + num) in newEntries;
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
			var p = container.appendChild(document[CRE]('p'));
			p.classList.add('sub-header');
			p.textContent = label;

			var pp = p.appendChild(document[CRE]('span'));
			pp.appendChild(document.createTextNode('(' + count + ' 回)'));
		}

		function outputArray (container, a) {
			for (var i = 0; i < a.length; i++) {
				container.appendChild(document.createTextNode(' '));
				var span = container.appendChild(document[CRE]('span'));
				span.classList.add('a');
				span.textContent = 'No.' + a[i].number;
				span.setAttribute('data-number', a[i].number);
				a[i].isNew && span.classList.add('new');
			}
		}

		var markData = statistics.markData;
		var otherMarkData = statistics.otherMarkData;
		var idData = statistics.idData;

		for (var i in markData) {
			var container = $('stat-' + i);
			if (!container) continue;

			empty(container);
			var data = markData[i];
			if (data.length) {
				var li = setListItemVisibility(container, true);
				if (li) {
					var header = li.querySelector('p span');
					if (header) {
						header.textContent = ' (' + markData[i].length + ')';
					}
				}
				outputArray(container, markData[i]);
			}
			else {
				setListItemVisibility(container, false);
			}
		}

		var container = $('stat-other');
		if (container) {
			empty(container);
			if (Object.keys(otherMarkData).length) {
				setListItemVisibility(container, true);
				for (var i in otherMarkData) {
					outputSubHeader(container, i, otherMarkData[i].length);
					outputArray(container, otherMarkData[i]);
				}
			}
			else {
				setListItemVisibility(container, false);
			}
		}

		var container = $('stat-id');
		if (container) {
			empty(container);
			var idKeys = Object.keys(idData);
			if (idKeys.length) {
				$t('stat-id-header', '(' + idKeys.length + ' ID)');
				for (var i in idData) {
					var li = container.appendChild(document[CRE]('li'));
					outputSubHeader(li, i, idData[i].length);
					var div = li.appendChild(document[CRE]('div'));
					outputArray(div, idData[i]);
				}
			}
			else {
				$t('stat-id-header', '');
			}
		}
	}

	function updatePostformView (statistics) {
		var result = false;

		for (var i in statistics.count) {
			var current = statistics.count[i];
			var diff;

			if (!statistics.delta || (diff = statistics.delta[i]) == undefined || diff == 0) {
				$t('replies-' + i, current);
				$t('pf-replies-' + i, current);
				continue;
			}

			result = true;
			var s = current + '(' + (diff > 0 ? '+' : '') + diff + ')';
			$t('replies-' + i, s);
			$t('pf-replies-' + i, s);
			(i == 'mark' || i == 'id') && sounds.detectNewMark.play();
		}

		return result;
	}

	function resetPostformView () {
		[
			'replies-total', 'replies-mark', 'replies-id',
			'pf-replies-total', 'pf-replies-mark', 'pf-replies-id'
		].forEach(function (id) {
			var e = $(id);
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
	var lex = /-?"[^"]*"|\(|\)|-\(|\||[^\s|)]+/g;
	var query;
	var lastIndex;
	var reachedToEof;

	function next () {
		if (reachedToEof) return null;
		lastIndex = lex.lastIndex;
		var re = lex.exec(query);
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
		var result = [];
		while (true) {
			var a = and(v);
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
		var result = [];
		while (true) {
			var a = word(v);
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
			var a = or(next());
			v = next();
			if (v != ')') {
				throw new Error('括弧がつり合っていません');
			}
			return '(' + a + ')';
		}
		else if (v == '-(') {
			var a = or(next());
			v = next();
			if (v != ')') {
				throw new Error('括弧がつり合っていません');
			}
			return '!(' + a + ')';
		}
		else if (v !== null) {
			var op = '>=';
			if (v.charAt(0) == '-') {
				op = '<';
				v = v.substring(1);
			}
			if (v.charAt(0) == '"' && v.substr(-1) == '"') {
				v = v.substring(1, v.length - 1);
			}
			else {
				v = v.toLowerCase();
			}
			if (v == '') {
				return '';
			}
			return 'target.indexOf("' + v.replace(/"/g, '\\"') + '")' + op + '0';
		}
		else {
			return '';
		}
	}

	function compile (q) {
		query = q.replace(/^\s+|\s+$/g, '');
		var result;
		if (query.charAt(0) == '/' && query.substr(-1) == '/') {
			try {
				regex = new RegExp(query.substring(1, query.length - 1), 'i');
				result = {
					test: function (target) {return regex.test(target)}
				};
			}
			catch (e) {
				result = {
					test: function () {return false},
					message: '正規表現に誤りがあります'
				};
			}
		}
		else {
			lex.lastIndex = lastIndex = 0;
			reachedToEof = false;
			var source;

			try {
				source = or(next());
				//log(source);
			}
			catch (e) {
				result = {
					test: function () {return false},
					message:e.message
				};
			}

			try {
				var f = window[FUN];
				result = {
					test: new f('target', 'return ' + source)
				};
			}
			catch (e) {
				result = {
					test: function () {return false},
					message:e.message
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
	function getSlot () {
		var slot = window.localStorage.getItem('postUrl');
		if (slot != null) {
			slot = JSON.parse(slot).filter(function (item) {
				return Date.now() - item.created < 1000 * 60 * 60 * 24 * 2;
			});
		}
		else {
			slot = [];
		}
		return slot;
	}

	function setSlot (slot) {
		window.localStorage.setItem('postUrl', JSON.stringify(slot));
	}

	function indexOf (slot, key) {
		var result = -1;
		slot.some(function (item, i) {
			if (item.key == key) {
				result = i;
				return true;
			}
		});
		return result;
	}

	function ensureUrl (url) {
		return /:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^\/]+)\/res\/(\d+)\.htm/.exec(url);
	}

	function ensureUrl2 (url) {
		return /:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^\/]+)\//.exec(url);
	}

	function getKey (url) {
		var re = ensureUrl(url);
		return re ? (re[1] + '-' + re[2] + '-' + re[3]) : null;
	}

	function memo (url) {
		var key = getKey(url);
		if (!key) return;

		var slot = getSlot();
		var index = indexOf(slot, key);
		if (index >= 0) {
			slot[index].count++;
		}
		else {
			slot.push({created: Date.now(), key: key, count: 1});
		}
		setSlot(slot);
	}

	function getAll (url) {
		var result = {};
		var url = ensureUrl2(url);
		if (!url) return result;
		getSlot().forEach(function (item) {
			var key = item.key.split('-');
			if (url[1] == key[0] && url[2] == key[1]) {
				result[key[2]] = item.count;
			}
		});
		return result;
	}

	return {
		memo: memo,
		getAll: getAll
	};
}

function createCatalogPopup (container) {
	var popups = [];
	var timer;

	function _log (s) {
		//log(s);
	}

	function mover (e) {
		if (!config.data.catalog_popup_enabled.value) return;
		if (transport) return;
		_log('mover: ' + (e.target.outerHTML || '<#document>').match(/<[^>]*>/)[0]);

		var target;
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
		timer = setTimeout(function (target) {
			timer = null;
			for (var p = document.elementFromPoint(cursorPos.x, cursorPos.y); p; p = p.parentNode) {
				if (p == target) {
					_log('mover phase 2: target found');
					prepare(target);
					break;
				}
			}
		}, CATALOG_POPUP_DELAY, target);
	}

	function indexOf (target) {
		var result = -1;
		popups.some(function (item, i) {
			if (item.target == target) {
				result = i;
				return true;
			}
		});
		return result;
	}

	function getRect (elm) {
		var rect = elm.getBoundingClientRect();
		var sl = docScrollLeft();
		var st = docScrollTop();
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
		var sl = viewportRect.left + docScrollLeft();
		var st = viewportRect.top + docScrollTop();
		var sr = sl + viewportRect.width;
		var sb = st + viewportRect.height;
		if ('left' in rect && rect.left < sl) rect.left = sl;
		if ('left' in rect && 'right' in rect && 'width' in rect && rect.right > sr) rect.left = sr - rect.width;
		if ('top' in rect && rect.top < st) rect.top = st;
		if ('top' in rect && 'bottom' in rect && 'height' in rect && rect.bottom > sb) rect.top = sb - rect.height;
	}

	function prepare (target) {
		var index = indexOf(target);
		_log('prepare: index: ' + index +
			', target: ' + (target.querySelector('.text') || {textContent:''}).textContent);
		if (index >= 0) {
			_log('prepare: popup for the target already exists. exit.');
			return;
		}

		var thumbnail, text, shrinkedRect;

		var targetThumbnail = target.querySelector('img');
		if (targetThumbnail && targetThumbnail.naturalWidth && targetThumbnail.naturalHeight) {
			thumbnail = document.body.appendChild(document[CRE]('img'));
			thumbnail.src = targetThumbnail.src.replace('/cat/', '/thumb/');
			thumbnail.className = 'catalog-popup hide';
			thumbnail.setAttribute('data-url', target.href);
			thumbnail.addEventListener('click', function (e) {
				sendToBackend('open', {url:this.getAttribute('data-url'), selfUrl:window.location.href});
			}, false);
			shrinkedRect = getRect(targetThumbnail);
		}

		var targetText = target.querySelector('.text');
		var targetCount = target.querySelector('.info span:first-child');
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

		var item = {
			state: 'initialize',
			target: target,
			thumbnail: thumbnail,
			shrinkedRect: shrinkedRect,
			text: text
		};
		popups.push(item);
		index = popups.length - 1;

		if (thumbnail && (!thumbnail.naturalWidth || !thumbnail.naturalHeight)) {
			thumbnail.addEventListener('load', function () {
				this.removeEventListener('load', arguments.callee, false);
				this.removeEventListener('error', arguments.callee, false);
				open(target);
			}, false);
			thumbnail.addEventListener('error', function () {
				this.removeEventListener('load', arguments.callee, false);
				this.removeEventListener('error', arguments.callee, false);
				open(target);
			}, false);
		}
		else {
			open(index);
		}
		_log('exit prepare');
	}

	function open (target) {
		var index = typeof target == 'number' ? target : indexOf(target);
		if (index < 0 || target >= popups.length) {
			_log('open: index is ' + index + ' invalid. exit.');
			return;
		}

		var item = popups[index];
		_log('open: ' + item.text.textContent);
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
			setTimeout(function () {setGeometory(item.thumbnail, item.zoomedRect)}, 0);
		}
		if (item.text) {
			var rect = getRect(item.target);
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
			setTimeout(function () {item.text.classList.add('run')}, 0);
		}
		item.state = 'running';
		_log('exit open');
	}

	function close (target) {
		var index = typeof target == 'number' ? target : indexOf(target);
		if (index < 0 || index >= popups.length) {
			_log('close: index ' + index + ' is invalid. exit.');
			return;
		}

		var item = popups[index];
		if (item.state == 'closing') return;

		var handleTransitionend = function (e) {
			if (e && e.target) {
				var t = e.target;
				t.parentNode && t.parentNode.removeChild(t);
			}
			if (item && --item.closingCount <= 0 && item.state == 'closing') {
				for (var i = 0; i < popups.length; i++) {
					if (popups[i] == item) {
						item = null;
						popups.splice(i, 1);
						break;
					}
				}
			}
		};
		_log('close: ' + item.text.textContent);

		var count = 0;
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
		_log('closeAll: closing ' + popups.length + ' popup(s)');
		var elms = Array.prototype.slice.call(document.querySelectorAll('body > .catalog-popup'));
		for (var i = 0; i < popups.length; i++) {
			['thumbnail', 'text'].forEach(function (p) {
				var index = elms.indexOf(popups[i][p]);
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
			document.querySelectorAll('body > .catalog-popup'),
			function (node) {
				node.parentNode && node.parentNode.removeChild(node);
			}
		);
		popups.length = 0;
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
	var POOL_ID = 'quote-popup-pool';
	var ORIGIN_CACHE_ATTR = 'data-quote-origin';
	var ORIGIN_ID_ATTR = 'data-quote-origin-id';
	var POPUP_DELAY_MSEC = 1000 * 0.5;
	var POPUP_HIGHLIGHT_MSEC = 1000 * 2;
	var POPUP_HIGHLIGHT_TOP_MARGIN = 64;
	var POPUP_POS_OFFSET = 8;

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
		}, POPUP_DELAY_MSEC));
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

		quote.setAttribute(ORIGIN_CACHE_ATTR, id + '|' + index);
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

			var origin = document.querySelector([
				'article .topic-wrap[data-number="' + quotedNo + '"]',
				'article .reply-wrap > [data-number="' + quotedNo + '"]'
			].join(','));
			if (!origin) {
				return null;
			}
			if (origin == sentinelWrap) {
				return null;
			}

			var index = origin.querySelector('.no');
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

		var nodes = document.querySelectorAll([
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

			if (indexOfNodes(ch.querySelectorAll('.comment'), sentinelComment) >= 0) {
				break;
			}

			ch.parentNode.removeChild(ch);
		}
	}

	function createPopup (quoteOrigin) {
		var no = quoteOrigin.element.getAttribute('data-number') ||
			quoteOrigin.element.querySelector('[data-number]').getAttribute('data-number');
		quoteOrigin.element.id = '_' + no;

		// create new popup
		var div = $(POOL_ID).appendChild(document[CRE]('div'));
		div.className = 'quote-popup';
		div.appendChild(quoteOrigin.element.cloneNode(true));

		// some tweaks for contents
		var noElm = div.querySelector('.no');
		if (noElm) {
			var a = document[CRE]('a');
			noElm.parentNode.replaceChild(a, noElm);
			a.className = 'jumpto-quote-anchor';
			a.href = '#jumpto-quote-origin';
			a.textContent = noElm.textContent;
			a.setAttribute(ORIGIN_ID_ATTR, quoteOrigin.element.id);
		}
		var checkElm = div.querySelector('input[type="checkbox"]');
		if (checkElm) {
			checkElm.parentNode.removeChild(checkElm);
		}
		var iframe;
		while ((iframe = div.querySelector('iframe'))) {
			iframe.parentNode.removeChild(iframe);
		}

		// positioning
		div.style.visibility = 'hidden';
		div.style.left = div.style.top = '0';
		var w = div.offsetWidth;
		var h = div.offsetHeight;
		var sl = docScrollLeft();
		var st = docScrollTop();
		var cw = viewportRect.width;
		var ch = viewportRect.height;
		var l = Math.max(0, Math.min(cursorPos.pagex + POPUP_POS_OFFSET, sl + cw - w));
		var t = Math.max(0, Math.min(cursorPos.pagey + POPUP_POS_OFFSET, st + ch - h));
		div.style.left = l + 'px';
		div.style.top = t + 'px';
		div.style.visibility = '';
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
				removePopup(quotePopupContainer.querySelector('.comment'));
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
		var y = Math.max(0, target.getBoundingClientRect().top + st - POPUP_HIGHLIGHT_TOP_MARGIN);
		y < st && window.scrollTo(0, y);
		removePopup();

		setTimeout(function () {
			target.classList.remove('highlight');
		}, POPUP_HIGHLIGHT_MSEC);
	}

	init();
	return {
		jumpto: jumpto
	};
}

function createSelectionMenu () {
	var enabled = true;
	var text;

	function init () {
		window.addEventListener('mouseup', function (e) {
			setTimeout(function (e) {mup(e)}, 1, e);
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
			s = sel.getRangeAt(0).toString()
				.replace(/(?:\r\n|\r|\n)/g, '\n')
				.replace(/\n{2,}/g, '\n') || '';
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
			var com = $('com');
			if (com) {
				quote(com, text, /^quote\b/.test(key));
				commands.activatePostForm();
				com.setSelectionRange(com.value.length, com.value.length);
			}
			break;

		case 'copy':
		case 'copy-with-quote':
			backend.setClipboard(key == 'copy' ? text : getQuoted(text));
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
			.map(function (line) {return '>' + line})
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
			target.value = target.value.replace(/\n$/, '') + '\n' + s;
		}

		target.value += '\n';
	}

	init();
	return {
		get enabled () {return enabled},
		set enabled (v) {enabled = !!enabled},
		dispatch: dispatch
	};
}

function createFavicon () {
	var FAVICON_ID = 'dyn-favicon';
	var isLoading = false;

	function createLinkNode () {
		var link = document.head.appendChild(document[CRE]('link'));
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

		var w = 16;
		var h = 16;
		var factor = 3;
		var canvas = document[CRE]('canvas');
		canvas.width = w * factor;
		canvas.height = h * factor;
		var c = canvas.getContext('2d');
		c.fillStyle = '#000000';
		c.fillRect(0, 0, canvas.width, canvas.height);
		var clipSize = Math.min(image.width, image.height);
		c.drawImage(image,
			image.width / 2 - clipSize / 2,
			image.height / 2 - clipSize / 2,
			clipSize, clipSize, 0, 0, canvas.width, canvas.height);

		var ps = c.getImageData(0, 0, w * factor, h * factor);
		var pd;
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
			var factorPower = Math.pow(factor, 2);
			for (var i = 0; i < h; i++) {
				for (var j = 0; j < w; j++) {
					var avg = [0, 0, 0, 0];

					for (var k = 0; k < factor; k++) {
						for (var l = 0; l < factor; l++) {
							avg[0] += ps.data[((i * factor + k) * w * factor + (j * factor + l)) * 4 + 0];
							avg[1] += ps.data[((i * factor + k) * w * factor + (j * factor + l)) * 4 + 1];
							avg[2] += ps.data[((i * factor + k) * w * factor + (j * factor + l)) * 4 + 2];
							avg[3] += ps.data[((i * factor + k) * w * factor + (j * factor + l)) * 4 + 3];
						}
					}

					for (var k = 0; k < 4; k++) {
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

		var link = $(FAVICON_ID);
		if (link) {
			if (window.opera) {
				var href = link.href;
				link.parentNode.removeChild(link);
				createLinkNode().href = '/favicon.ico';

				setTimeout(function () {
					var link = $(FAVICON_ID);
					if (!link) return;
					link.parentNode.removeChild(link);
					createLinkNode().href = href;
				}, 100);
			}
			return;
		}

		switch (pageModes[0]) {
		case 'summary':
		case 'catalog':
			var re = /^[^:]+:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^\/]+)\//.exec(window.location.href);
			if (!re) break;

			isLoading = true;
			resources.get(
				'/images/board/' + re[1] + '-' + re[2] + '.png',
				{method:'readAsDataURL'},
				function (data) {
					if (data) {
						createLinkNode().href = data.replace(/^data:[^,]+/, 'data:image/png;base64');
					}
					isLoading = false;
				}
			);
			break;

		case 'reply':
			var thumb = document.querySelector('article:nth-of-type(1) img');
			if (!thumb) break;

			isLoading = true;
			var re = /^[^:]+:\/\/[^.]+\.2chan\.net(?::\d+)?\/([^\/]+)(\/[^\/]+\/thumb\/\d+s\.jpg)/.exec(thumb.src);
			var src = re ? re[2] : thumb.src;
			var img = new Image();
			function handleImageLoad (e) {
				this.removeEventListener('load', arguments.callee, false);
				this.removeEventListener('error', arguments.callee, false);
				overwriteFavicon(this, createLinkNode());
				img = null;
				isLoading = false;
			}
			img.addEventListener('load', handleImageLoad, false);
			img.addEventListener('error', handleImageLoad, false);
			img.src = src;
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
			hash = '#' + hash.replace(/^#/, '');
			window.removeEventListener('popstate', popstateHandler, false);
			window.location.hash = hash;
			window.addEventListener('popstate', popstateHandler, false);
		}
	};
}

/*
 * <<<1 page set-up functions
 */

function setupSticky (selector, initCallback, aMarginTop) {
	var marginTop = undefined;

	function handleScroll () {
		var scrollTop = lastScrollTop = docScrollTop();

		var nodes = document.querySelectorAll(selector);
		for (var i = 0, goal = nodes.length; i < goal; i++) {
			var stickyItem = nodes[i];
			var stickyItemRect = stickyItem.getBoundingClientRect();
			var containerRect = stickyItem.parentNode.getBoundingClientRect();
			var needFix = false;

			if (stickyItemRect.height > viewportRect.height) {
				if (stickyItemRect.top + stickyItemRect.height < viewportRect.bottom) {
					needFix = true;
				}
			}
			else {
				if (stickyItemRect.height >= containerRect.height) {
					continue;
				}
				if (containerRect.top - marginTop < 0 && 0 < containerRect.bottom - marginTop) {
					needFix = true;
				}
			}
			if (needFix) {
				if (stickyItem.parentNode.style.width == '') {
					stickyItem.parentNode.style.width = stickyItemRect.width + 'px';
				}
				stickyItem.style.position = 'fixed';
				var bottom = Math.min(containerRect.bottom, viewportRect.bottom);
				stickyItem.style.top = Math.min(marginTop, bottom - stickyItemRect.height) + 'px';
			}
			else {
				stickyItem.style.position = stickyItem.style.top = stickyItem.style.left = '';
			}
		}
	}

	function init () {
		var nodes = document.querySelectorAll(selector);
		if (nodes.length) {
			for (var i = 0, goal = nodes.length; i < goal; i++) {
				var rect2 = nodes[i].getBoundingClientRect();
				marginTop = marginTop === undefined ? rect2.top : Math.min(marginTop, rect2.top);
				initCallback && initCallback(nodes[i], rect2);
			}
			if (aMarginTop != undefined) {
				marginTop = aMarginTop;
			}
			else {
				marginTop += docScrollTop();
			}
		}
		window.addEventListener('scroll', handleScroll, false);
		handleScroll();
	}

	init();
}

function setupParallax (selector) {
	var marginTop = undefined;

	function init () {
		var node = document.querySelector(selector);
		if (!node) return;
		marginTop = node.getBoundingClientRect().top;
		window.addEventListener('scroll', handleScroll, false);
		handleScroll();
		setTimeout(function () {
			Array.prototype.forEach.call(
				document.querySelectorAll('iframe[data-src]'),
				function (iframe) {
					iframe.src = iframe.getAttribute('data-src');
					iframe.removeAttribute('data-src');
				}
			);
		}, 1000 * 1);
	}

	function handleScroll () {
		var node = document.querySelector(selector);
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
		window.addEventListener('scroll', handleScroll, false);
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
			document.querySelectorAll('.inline-video'),
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

function setupMouseHoverEvent (element, enterCallback, leaveCallback) {
	function mover (e) {
		if (this == e.relatedTarget || isChild(e.relatedTarget)) return;
		enterCallback.call(element, e);
	}

	function mout (e) {
		if (this == e.relatedTarget || isChild(e.relatedTarget)) return;
		leaveCallback.call(element, e);
	}

	function isChild (el) {
		if (el == element) return false;
		while (el && el != element) {
			el = el.parentNode;
		}
		return el == element;
	}

	element = $(element);
	if (!element) return;
	enterCallback && element.addEventListener(MOVER_EVENT_NAME, mover, false);
	leaveCallback && element.addEventListener(MOUT_EVENT_NAME, mout, false);
}

function setupWindowResizeEvent (element, handler) {
	element = $(element);
	if (!element) return;
	window.addEventListener('resize', handler, false);
	handler.call(element);
}

function setupTextFieldEvent (items) {
	var initialComHeight;

	function updateInfoCore (item) {
		var el = $(item.id);
		if (!el) return;

		var lines = el.value.replace(/[\r\n\s]+$/, '').split(/\r?\n/);
		var bytes = lines.join('\r\n').replace(/[^\u0001-\u007f\uff61-\uff9f]/g, '__').length;
		var linesOvered = item.lines ? lines.length > item.lines : false;
		var bytesOvered = item.bytes ? bytes > item.byltes : false;

		var span = $('comment-info').appendChild(document[CRE]('span'));
		linesOvered || bytesOvered && span.classList.add('warn');
		$t(span, [
			item.head  ? (item.head + ':') : '',
			item.lines ? (lines.length + '/' + item.lines + '行') : '',
			item.lines ? ' (' : '',
			item.bytes ? (bytes + '/' + item.bytes) : '',
			item.lines ? ')' : ''
		].join(''));
	}

	function fixTextAreaHeight (e) {
		var comBackend = $('comment-backend');
		if (!comBackend) return;
		comBackend.style.width = this.scrollWidth + 'px';
		$t(comBackend, this.value + (/[\r\n]/.test(this.value.substr(-1)) ? '_' : ''));
		this.style.height = Math.max(
			initialComHeight, Math.min(
				comBackend.offsetHeight,
				Math.floor(viewportRect.height * 0.8))) + 'px';
	}

	function updateInfo (e) {
		$('comment-info')[IHTML] = '';
		items.forEach(updateInfoCore);
	}

	var com = $('com');
	if (com) {
		initialComHeight = com.offsetHeight;
		items.forEach(function (item) {
			var el = $(item.id);
			if (!el) return;

			el.nodeName == 'TEXTAREA' && el.addEventListener('input', fixTextAreaHeight, false);
			el.addEventListener('input', updateInfo, false);
		});
		updateInfo.call(com);
	}
}

function setupWheelReload () {
	var accum = 0;
	var lastWheeled = 0;
	var statusHideTimer;

	function handler (e) {
		if (transport) {
			e.preventDefault();
			return;
		}

		var now = Date.now();
		var wheelDelta = e.wheelDelta;
		var st = docScrollTop();
		var sh = document.documentElement.scrollHeight;

		if (wheelDelta > 0 || st < sh - viewportRect.height) {
			lastWheeled = now;
			accum = 0;
			setBottomStatus();
			return;
		}

		var factor = config.data.wheel_reload_threshold_override.value <= 0 ?
			WHEEL_RELOAD_DEFAULT_FACTOR :
			config.data.wheel_reload_threshold_override.value;
		var threshold = config.data.wheel_reload_unit_size.value * factor;

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
			setBottomStatus('リロードぢから：' + Math.min(Math.floor(accum / threshold * 100), 99) + '%');
			return;
		}

		lastWheeled = now;
		accum = 0;
		e.preventDefault();
		setBottomStatus();
		commands.reload();
	}

	window.addEventListener('mousewheel', handler, false);
}

function setupPostShadowMouseEvent (tabContent, nodeName, className) {
	var scrollTop;
	var timer;

	function registerTimer (scrollTop) {
		/*
		clearTimer();
		timer = setTimeout(function (scrollTop) {
			window.scrollTo(0, scrollTop);
		}, 1000, scrollTop);
		 */
	}

	function clearTimer () {
		timer && clearTimeout(timer);
	}

	function mover (e) {
		if (!e || e.target.nodeName != nodeName || !e.target.classList.contains(className)) return;

		var number = e.target.getAttribute('data-number');
		if (!number) return;

		var unit = document.querySelector([
			'article .topic-wrap[data-number="' + number + '"]',
			'article .reply-wrap > [data-number="' + number + '"]'
		].join(','));
		if (!unit) return;

		var st = docScrollTop();
		var rect = unit.getBoundingClientRect();
		scrollTop = st;
		if (rect.top < 0 || rect.bottom >= viewportRect.height) {
			window.scrollTo(
				0,
				Math.floor(
					st +
					rect.top +
					(rect.height / 2) -
					(viewportRect.height / 2)));
		}
		unit.classList.add('hilight');
		clearTimer();
	}

	function mout (e) {
		if (!e || e.target.nodeName != nodeName || !e.target.classList.contains(className)) return;
		Array.prototype.forEach.call(
			document.querySelectorAll([
				'article .topic-wrap.hilight',
				'article .reply-wrap > .hilight'
			].join(',')),
			function (node) {
				node.classList.remove('hilight');
			}
		);
		registerTimer(scrollTop);
	}

	function init () {
		tabContent = $(tabContent);
		if (!tabContent) return;

		tabContent.addEventListener(MOVER_EVENT_NAME, mover, false);
		tabContent.addEventListener(MOUT_EVENT_NAME, mout, false);

		nodeName = nodeName.toUpperCase();
	}

	init();
}

function install (mode) {
	timingLogger.startTag('install');

	/*
	 * last modified date
	 */

	try {
		lastModified = new Date(document.lastModified).toUTCString();
	}
	catch (e) {
		lastModified = 0;
	}

	/*
	 * connection to backend
	 */

	backend.setMessageListener(function (data) {
		switch (data.type) {
		case 'fileio-authorize-response':
		case 'fileio-write-response':
			var anchor = $(data.anchorId);

			var message;
			if (data.error || data.state == 'complete') {
				if (data.error) {
					message = '保存失敗';
				}
				else {
					message = '保存完了';
					sounds.imageSaved.play();
				}
				anchor && setTimeout(function (anchor) {
					$t(anchor, anchor.getAttribute('data-original-text'));
					anchor.removeAttribute('data-original-text');
					anchor = null;
				}, 1000 * 3, anchor);
			}
			else {
				switch (data.state) {
				case 'authorizing':	message = '認可の確認中...'; break;
				case 'buffered':	message = 'バッファ済み...'; break;
				case 'writing':		message = '書き込み中...'; break;
				}
			}
			message && $t(anchor, message);
			break;
		}
	});

	/*
	 * instantiate click dispachter
	 * and register click handlers
	 */

	clickDispatcher = createClickDispatcher();
	clickDispatcher
		.add('#void',        function () {})

		.add('#delete-post', commands.openDeleteDialog)
		.add('#config',      commands.openConfigDialog)
		.add('#help',        commands.openHelpDialog)
		.add('#toggle-panel',commands.togglePanelVisibility)
		.add('#reload',      commands.reload)
		.add('#sage',        commands.toggleSage)
		.add('#search-start',commands.search)
		.add('#clear-upfile',commands.clearUpfile)
		.add('#catalog',     commands.toggleCatalogVisibility)
		.add('#track',       commands.registerTrack)

		.add('.del', function (e, t) {
			commands.openModerateDialog(e, t);
		})
		.add('.postno', function (e, t) {
			var wrap = getWrapElement(t);
			if (!wrap) return;
			var comment = wrap.querySelector('.comment');
			if (!comment) return;
			selectionMenu.dispatch('quote', comment.textContent);
		})
		.add('.save-image',  function (e, t) {
			if (t.getAttribute('data-original-text')) return;

			var href = t.getAttribute('data-href') || t.href;
			var f = getImageName(href);
			if (f == undefined || f == '') return;

			var id;
			do {
				id = 'save-image-anchor-' + (Math.floor(Math.random() * 0x10000)).toString(16);
			} while ($(id));

			t.setAttribute('data-original-text', t.textContent);
			t.id = id;
			$t(t, '保存中...');

			sendToBackend('save-image', {
				url:href,
				path:config.data.storage.value.replace('msonedrive', 'onedrive') + ':' + f,
				mimeType:getImageMimeType(href),
				anchorId:id
			});
		})
		.add('.panel-tab',   function (e, t) {
			showPanel(function (panel) {
				activatePanelTab(t);
			});
		})
		.add('.switch-to', function (e, t) {
			historyStateWrapper.pushState(t.href);
			commands.reload();
		})
		.add('.lightbox', function (e, t) {
			if (config.data.lightbox_enabled.value) {
				lightbox(t, t.classList.contains('link-siokara'));
			}
			else {
				return 'passthrough';
			}
		})
		.add('.catalog-order', function (e, t) {
			var newActive;

			Array.prototype.forEach.call(
				document.querySelectorAll('#catalog .catalog-options a'),
				function (node) {
					node.classList.remove('active');
					if (node == t) {
						node.classList.add('active');
						newActive = node;
					}
				}
			);

			if (!newActive) {
				newActive = document.querySelector('#catalog .catalog-options a');
				newActive.classList.add('active');
			}

			var contentId = 'catalog-threads-wrap-' + newActive.href.match(/\w+$/)[0];
			Array.prototype.forEach.call(
				document.querySelectorAll('#catalog .catalog-threads-wrap > div'),
				function (node) {
					node.classList.add('hide');
					if (node.id == contentId) {
						node.classList.remove('hide');
					}
				}
			);

			commands.reload();
		})
		.add('.sodane', function (e, t) {
			commands.sodane(e, t);
		})
		.add('.sodane-null', function (e, t) {
			commands.sodane(e, t);
		})
		.add('*noclass*', function (e, t) {
			var re1 = /(.*)#[^#]*$/.exec(t.href);
			var re2 = /(.*)(#[^#]*)?$/.exec(window.location.href);
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

		.addStroke('command.edit', '\u001b', commands.deactivatePostForm)
		.addStroke('command.edit', '\u0013', commands.toggleSage)
		.addStroke('command.edit', '<S-enter>', commands.post)
		//.addStroke('command.edit', 'm-a', commands.cursorTopOfLine)
		//.addStroke('command.edit', 'm-e', commands.cursorBottomOfLine)
		//.addStroke('command.edit', 'C-p', commands.cursorPrev)
		//.addStroke('command.edit', 'C-n', commands.cursorNext)
		//.addStroke('command.edit', 'C-b', commands.cursorBack)
		//.addStroke('command.edit', 'C-f', commands.cursorForward)
		.addStroke('command.edit', '\u000d', function (e, t) {
			switch (t.id) {
			case 'search-text':
				commands.search(e, t);
				break;
			case 'catalog-horz-number':
				commands.reloadCatalog(e, t);
				break;
			default:
				return 'passthrough';
			}
		})
		.updateManifest();

	/*
	 * favicon maintainer
	 */

	favicon = createFavicon();

	/*
	 * window resize handler
	 */

	setupWindowResizeEvent(window, function (e) {
		var vp = document.body.appendChild(document[CRE]('div'));
		vp.id = 'viewport-rect';
		viewportRect = vp.getBoundingClientRect();
		vp.parentNode.removeChild(vp);

		var style = $('dynstyle-comment-maxwidth');
		if (!style) return;
		empty(style);

		var text = document.querySelector('article div.text');
		if (text) {
			var rect = text.getBoundingClientRect();
			style.appendChild(document.createTextNode([
				'.reply-wrap > div:last-child {',
				'  max-width:' + Math.floor(rect.width * 0.9) + 'px;',
				'}'
			].join('\n')));
		}

		style.appendChild(document.createTextNode([
			'.dialog-wrap .dialog-content {',
			'  max-width:' + Math.floor(viewportRect.width * 0.8) + 'px;',
			'  max-height:' + Math.floor(viewportRect.height * 0.8) + 'px;',
			'  min-width:' + Math.floor(viewportRect.width * 0.25) + 'px;',
			'}'
		].join('\n')));
	});

	/*
	 * localStorage handler
	 */

	window.addEventListener('storage', function (e) {
		if (e.key == config.keyName) {
			config.reset();
			config.assign();
		}
	}, false);

	/*
	 * history handler
	 */

	historyStateWrapper = createHistoryStateWrapper(function () {
		commands.reload();
	});

	/*
	 * mouse cursor tracker
	 */

	window.addEventListener(MMOVE_EVENT_NAME, function (e) {
		cursorPos.x = e.clientX;
		cursorPos.y = e.clientY;
		cursorPos.pagex = e.pageX;
		cursorPos.pagey = e.pageY;
	}, false);

	/*
	 * mouseup handler (equiv to 'onselectionchange' in effect)
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
	 * post form submit listener
	 */

	(function (postform) {
		if (!postform) return;
		postform.addEventListener('submit', function (e) {
			e.preventDefault();
			commands.post();
		}, false);
	})($('postform'));

	/*
	 * post switcher
	 */

	(function (elms, handler) {
		for (var i = 0; i < elms.length; i++) {
			elms[i].addEventListener('click', handler, false);
		}
	})(document.getElementsByName('post-switch'), function (e) {
		var upfile = $('upfile');
		var textonly = $('textonly');
		var resto = document.getElementsByName('resto')[0];

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

	/*
	 * file element change listener
	 */

	(function (file) {
		if (!file) return;
		file.addEventListener('change', function (e) {
			setPostThumbnail(this.files[0]);
			$('textonly').checked = false;
		}, false);
	})($('upfile'));

	/*
	 * comment text box handling
	 */

	setupTextFieldEvent([
		{id:'com',              bytes:1000, lines:15},
		{id:'name',  head:'名', bytes:100},
		{id:'email', head:'メ', bytes:100},
		{id:'sub',   head:'題', bytes:100}
	]);

	/*
	 * post form visibility handling
	 */

	(function () {
		var frameOutTimer;
		setupMouseHoverEvent(
			'postform-wrap',
			function (e) {
				if (frameOutTimer) {
					clearTimeout(frameOutTimer);
					frameOutTimer = null;
				}
				commands.activatePostForm();
			},
			function (e) {
				if (frameOutTimer) return;

				frameOutTimer = setTimeout(function () {
					frameOutTimer = null;
					var p = document.elementFromPoint(cursorPos.x, cursorPos.y);
					while (p && p.id != 'postform-wrap') {
						p = p.parentNode;
					}
					if (p) return;
					var thumb = $('post-image-thumbnail-wrap');
					if (thumb && thumb.getAttribute('data-available') == '2') {
						thumb.setAttribute('data-available', '1');
						return;
					}
					commands.deactivatePostForm();
				}, POSTFORM_DEACTIVATE_DELAY);
			}
		);
	})();

	/*
	 * sticky image handling
	 */

	(function (article) {
		if (!article) return;
		setupSticky(
			'article > .image > div', null,
			article.getBoundingClientRect().top + docScrollTop());
	})(document.querySelector('article'));

	/*
	 * parallax banner handling
	 */

	setupParallax('#ad-aside-wrap');

	/*
	 * inline viewo viewer
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
	 * mark statistics panel
	 */

	setupPostShadowMouseEvent('panel-content-mark', 'span', 'a');
	setupPostShadowMouseEvent('panel-content-search', 'div', 'a');

	/*
	 * catalog popup
	 */

	catalogPopup = createCatalogPopup(document.querySelector('#catalog'));

	/*
	 * url memorizer
	 */

	urlStorage = createUrlStorage();
	urlStorage.memo(window.location.href);

	/*
	 * quote popup
	 */

	quotePopup = createQuotePopup();

	/*
	 * special custom events from my keysnail.js :-)
	 *
	 * RequestMoreContent:
	 *    emulates space key behavior at bottom of page
	 *    on Presto Opera
	 */

	document.addEventListener('RequestMoreContent', function (e) {
		e.preventDefault();
		commands.invokeMousewheelEvent();
	}, false);

	/*
	 * switch according to mode of pseudo-query
	 */

	var queries = (function () {
		var result = {};
		window.location.hash
		.replace(/^#/, '')
		.split('&').forEach(function (s) {
			s = s.split('=');
			s[0] = decodeURIComponent(s[0]);
			s[1] = s.length >= 2 ? decodeURIComponent(s[1]) : null;
			result[s[0]] = s[1];
		});
		return result;
	})();

	switch (queries.mode) {
	case 'cat':
		setTimeout(function () {
			commands.toggleCatalogVisibility();
		}, 1);
		break;
	}

	/*
	 * end!
	 */

	timingLogger.endTag();
}

/*
 * <<<1 lightbox functions
 */

function lightbox (anchor, ignoreThumbnail) {
	var MARGIN = 32;
	var CLICK_THRESHOLD_DISTANCE = 4;
	var CLICK_THRESHOLD_TIME = 500;
	var WHEEL_SCROLL_UNIT_FACTOR = 0.4;
	var ZOOMMODE_KEY = 'akahukuplus.lightbox.zoomMode';

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
		var lightbox = document.querySelector('#lightbox-wrap');
		var imageRect = image ? image.getBoundingClientRect() : null;
		var imageWrapRect = lightbox.querySelector('.image-wrap').getBoundingClientRect();
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
			document.querySelectorAll('#lightbox-zoom-modes a'),
			function (node) {
				node.classList.remove('selected');
				node.getAttribute('href') == '#lightbox-' + zoomMode && node.classList.add('selected');
			}
		);
	}

	function updateGeometoryInfo () {
		if (image.naturalWidth && image.naturalHeight) {
			$t('lightbox-ratio',
				image.naturalWidth + 'x' + image.naturalHeight + ', ' +
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
		window.localStorage.setItem(ZOOMMODE_KEY, zm);
		applyGeometory(getImageRect());
	}

	function initZoomMode () {
		var zm = config.data.lightbox_zoom_mode.value;
		if (zm == 'last') {
			zm = window.localStorage.getItem(ZOOMMODE_KEY);
		}
		setZoomMode(zm);
	}

	function init () {
		var thumbImage = ignoreThumbnail ? null : anchor.querySelector('img');
		lightboxWrap = $('lightbox-wrap');
		dimmer = lightboxWrap.querySelector('.dimmer');
		imageWrap = lightboxWrap.querySelector('.image-wrap');
		loaderWrap = lightboxWrap.querySelector('.loader-wrap');
		receiver = lightboxWrap.querySelector('.receiver');

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

		// loader image
		if (!/^data:/.test(loaderWrap.querySelector('img').src)) {
			resources.get(
				'/images/icon128.png',
				{method:'readAsDataURL'},
				function (data) {
					data && Array.prototype.forEach.call(
						loaderWrap.querySelectorAll('img'),
						function (img) {img.src = data}
					)
				}
			);
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
			.addStroke('lightbox', ['1', '2', 'w', 'h'], handleZoomModeKey)
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
		lightboxWrap.querySelector('.info').classList.remove('hide');

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
			'1': 'whole',
			'2': 'actual-size',
			'w': 'fit-to-width',
			'h': 'fit-to-height'
		}[e.key]);
	}

	function handleSearch (e) {
		if (isInTransition) return;
		if (!image) return;
		var url = 'http://www.google.com/searchbyimage'
			+ '?sbisrc=akahukuplus'
			+ '&hl=' +  (window.navigator.browserLanguage
				|| window.navigator.language
				|| window.navigator.userLanguage).toLowerCase()
			+ '&image_url=' + encodeURIComponent(image.src);
			sendToBackend('open', {url:url, selfUrl:window.location.href});
	}

	function handleStroke (e) {
		var ev = document.createEvent('MouseEvents');
		ev.initMouseEvent(
			'mousewheel', true, true, window[USW] || window,
			0, 0, 0, 0, 0,
			e.ctrl, false, e.shift, false,
			0, null);
		receiver.dispatchEvent(ev);
	}

	function leave () {
		lightboxWrap.querySelector('.info').classList.add('hide');
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

		contentWrap = dialogWrap.querySelector('.dialog-content-wrap');
		content = dialogWrap.querySelector('.dialog-content');
		dimmer = dialogWrap.querySelector('.dimmer');
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
		var title = dialogWrap.querySelector('.dialog-content-title');
		if (!title) return;
		title.textContent = opt != undefined ? opt : 'dialog';
	}

	function initButtons (opt) {
		var footer = dialogWrap.querySelector('.dialog-content-footer');
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
				if (button.getAttribute('href') != '#' + opt + '-dialog') return;
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
			'/xsl/' + xslName + '.xsl',
			{expires:DEBUG_ALWAYS_LOAD_XSL ? 1 : 1000 * 60 * 60},
			function (xsl) {
				var p = new window.XSLTProcessor;

				try {
					var f;

					try {
						xsl = (new window.DOMParser()).parseFromString(xsl, "text/xml");
					}
					catch (e) {
						console.error('xsl parsing failed: ' + e.message);
						return;
					}

					try {
						p.importStylesheet(xsl);
					}
					catch (e) {
						console.error('importStylesheet failed: ' + e.message);
						return;
					}

					try {
						f = fixFragment(p.transformToFragment(xml, document));
					}
					catch (e) {
						console.error('transformToFragment failed: ' + e.message);
						return;
					}

					appendFragment(content, f);
				}
				finally {
					isPending = false;
					startTransition();
				}
			}
		);
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

function empty (node) {
	node = $(node);
	if (!node) return;
	var r = document.createRange();
	r.selectNodeContents(node);
	r.deleteContents();
}

function fixFragment (f, tagName) {
	var element = f.querySelector(tagName || 'body');
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
		document.querySelectorAll('[data-doe]'),
		function (node) {
			var doe = node.getAttribute('data-doe');
			node.removeAttribute('data-doe');
			node[IAHTML]('beforeend', doe);
		}
	);
	return container;
}

function resolveRelativePath (url, baseUrl) {
	if (baseUrl == undefined) {
		baseUrl = (document.getElementsByTagName('base')[0] || window.location).href;
	}
	baseUrl = baseUrl.replace(/\/[^\/]*$/, '/');
	if (/^\w+:\/\//.test(url)) {
		return url;
	}
	else if (/^\//.test(url)) {
		return baseUrl.replace(/^(\w+:\/\/[^\/]+).*$/, '$1') + url;
	}
	else {
		return baseUrl + url;
	}
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
	s.push(key + '=' + escape(value));
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
	var re = /^[^:]+:\/\/[^.]+\.2chan\.net(?::\d+)?(\/[^\/]+)\//.exec(window.location.href);
	if (!re) return;
	setCookie(key, value, lifeDays, re[1]);
}

function getCatalogSettings () {
	var data = getCookie('cxyl');
	if (data == undefined) {
		data = [15, 5, 0];
	}
	else {
		data = data.split('x').map(function (a) {return a - 0});
	}
	return data;
}

function setBottomStatus (s, persistent) {
	var ev = document.createEvent('CustomEvent');
	ev.initCustomEvent('Akahukuplus.bottomStatus', true, true, {
		message: s || '',
		persistent: !!persistent
	});
	document.dispatchEvent(ev);
}

function getDOMFromString (s) {
	try {
		return (new window.DOMParser()).parseFromString(
			transport.responseText
			.replace(/\r?\n/g, ' ')
			.replace(/<script[^>]*>.*?<\/script>/gi, '')
			.replace(/<img[^>]*>/gi, function ($0) {
				return $0.replace(/\bsrc=/g, 'data-src=')
			})
			, 'text/html');
	}
	catch (e) {
		console.error(e.message);
	}
}

function isRapidAccess () {
	if (Date.now() - transportLastUsedTime <= NETWORK_ACCESS_MIN_INTERVAL) {
		setBottomStatus('ちょっと待ってね。');
		return true;
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
	return 'application/octet-stream';
}

function getImageName (href) {
	var dateAvailable = true;
	var re;
	var imageDate;

	// distributed url
	re = /^https?:\/\/[^.]+\.2chan\.net(?::\d+)?\/([^\/]+)\/([^\/]+)\/src\/(\d+)\.([^.]+)/.exec(href);

	// direct url
	if (!re) {
		re = /^https?:\/\/([^.]+)\.2chan\.net(?::\d+)?\/([^\/]+)\/src\/(\d+)\.([^.]+)/.exec(href);
	}

	// siokara files
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
	 * re[3]: image serial number (unix time stamp + 3 digits of msec value)
	 * re[4]: file name extension (excludes a dot)
	 */

	if (dateAvailable) {
		imageDate = new Date(re[3].replace(/\d{3}$/, '') - 0);
	}
	else {
		imageDate = new Date;
	}

	var f = config.data.save_image_name_template.value.replace(
		/\$([A-Z]+)/g,
		function ($0, $1) {
			switch ($1) {
			case 'SERVER':
				return re[1];
			case 'BOARD':
				return re[2];
			case 'THREAD':
				// TBD
			case 'YEAR':
				return imageDate.getFullYear();
			case 'MONTH':
				return imageDate.getMonth();
			case 'DAY':
				return imageDate.getDay();
			case 'SERIAL':
				return re[3];
			case 'DIST':
				return re[3].substr(-3);
			case 'EXT':
				return re[4];
			default:
				return $0;
			}
		}
	);

	f = '/' + f;
	f = f.replace(/\/\/+/g, '/');

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
	var result;

	for (; element; element = element.parentNode) {
		var n = element.getAttribute('data-number');
		if (n) {
			result = n - 0;
		}
		if (element.classList.contains('topic-wrap')
		|| element.classList.contains('reply-wrap')) {
			if (result == undefined) {
				result = element
					.querySelector('[data-number]')
					.getAttribute('data-number') - 0;
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
	if (!element) return;

	var backupTimer;
	var handler = function (e) {
		if (backupTimer) {
			clearTimeout(backupTimer);
			backupTimer = null;
		}
		if (element) {
			element.removeEventListener('transitionend', arguments.callee, false);
		}
		if (callback) {
			callback.call(element, e);
		}
		handler = element = callback = e = null;
	};

	element.addEventListener('transitionend', handler, false);
	backupTimer = setTimeout(function (e) {handler(e)}, backupMsec || 1000, {
		type: 'transitionend-backup',
		target: element,
	});
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

/*
 * <<<1 functions for posting
 */

function populateTextFormItems (form, callback) {
	var inputNodes = form.querySelectorAll([
		'input[type="hidden"]',
		'input[type="text"]',
		'input[type="number"]',
		'input[type="password"]',
		'input[type="checkbox"]:checked',
		'input[type="radio"]:checked',
		'textarea',
		'select'
	].join(','));

	Array.prototype.forEach.call(inputNodes, function (node) {
		if (node.name == '') return;
		if (node.disabled) return;
		callback(node);
	});
}

function populateFileFormItems (form, callback) {
	var inputNodes = form.querySelectorAll([
		'input[type="file"]'
	].join(','));

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
			payload[node.name] = node.value;
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
			data.push(
				'--' + boundary + '\r\n' +
				'Content-Disposition: form-data; name="' + i + '"\r\n' +
				'\r\n',
				new window.Uint8Array(items[i]),
				'\r\n'
			);
		};

		populateFileFormItems(form, function (node) {
			data.push(
				'--' + boundary + '\r\n' +
				'Content-Disposition: form-data' +
				'; name="' + node.name + '"' +
				'; filename="' + node.files[0].name.replace(/"/g, '`') + '"\r\n' +
				'Content-Type: ' + node.files[0].type + '\r\n' +
				'\r\n',
				node.files[0],
				'\r\n'
			);
		});

		data.push('--' + boundary + '--\r\n');
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
		transport.open('POST', form.action);
		transport.setRequestHeader('Content-Type', 'multipart/form-data;boundary=' + boundary);
		transport.overrideMimeType('text/html;charset=' + FUTABA_CHARSET);

		transport.onload = function () {
			try {
				callback && callback(transport.responseText);
			}
			finally {
				transport = form = null;
				transportLastUsedTime = Date.now();
			}
		};

		transport.onerror = function () {
			try {
				callback && callback();
			}
			finally {
				transport = form = null;
				transportLastUsedTime = Date.now();
			}
		};

		transport.send(data);
	}

	function urlEncodedPost (data) {
		transport.open('POST', form.action);
		transport.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		transport.overrideMimeType('text/html;charset=' + FUTABA_CHARSET);

		transport.onload = function () {
			callback && callback(transport.responseText);
			transport = form = null;
		};

		transport.onerror = function () {
			callback && callback();
			transport = form = null;
		};

		transport.send(data);
	}

	transport = new window.XMLHttpRequest;
	transportType = type;
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
		re = s.replace(/<!DOCTYPE[^>]+>\r?\n?/i, '');
	}

	return {error: re || 'なんか変です'};
}

function registerReleaseFormLock () {
	setTimeout(function () {
		$('postform').querySelector('fieldset').disabled = false;
		if (transportType == 'post') {
			transport = null;
		}
	}, POSTFORM_LOCK_RELEASE_DELAY);
}

/*
 * <<<1 functions for reloading
 */

function reloadBase (callback, errorCallback) {
	timingLogger.startTag('reloadBase');
	var now = Date.now();

	transport = new window.XMLHttpRequest;
	transportType = 'reload';
	transport.open('GET', window.location.href);
	transport.overrideMimeType('text/html;charset=' + FUTABA_CHARSET);
	DEBUG_IGNORE_LAST_MODIFIED && (lastModified = 0);
	transport.setRequestHeader('If-Modified-Since', lastModified || 'Fri, 01 Jan 2010 00:00:00 GMT');

	transport.onload = function (e) {
		timingLogger.endTag();

		var lm = transport.getResponseHeader('Last-Modified');
		lm && (lastModified = lm);

		timingLogger.startTag('parsing html');
		var doc;
		if (transport.status == 200) {
			doc = getDOMFromString(transport.responseText);
			if (!doc) {
				transport = doc = null;
				errorCallback(new Error('読み込んだ html からの DOM ツリー構築に失敗しました。'));
				return;
			}

			// for mark detection test
			if (doc) {
				false && Array.prototype.forEach.call(
					doc.querySelectorAll('blockquote:nth-child(-n+4)'),
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
				false && Array.prototype.forEach.call(
					doc.querySelectorAll('small + blockquote'),
					function (node, i) {
						node[IAHTML](
							'afterend',
							'<font color="#f00000"><b>このスレは古いので、もうすぐ消えます。</b></font><br>'
						);
					}
				);
			}
		}
		timingLogger.endTag();

		try {
			callback && callback(doc, now, transport.status);
		}
		catch (ex) {
			errorCallback && errorCallback(ex);
		}
		finally {
			transport = doc = null;
			transportLastUsedTime = Date.now();
		}
	};

	transport.onerror = function (e) {
		timingLogger.endTag();
		try {
			errorCallback && errorCallback(new Error(
				'ネットワークエラーにより内容を取得できません。' +
				'\n(' + transport.status + ')'));
		}
		finally {
			transport = null;
			transportLastUsedTime = Date.now();
		}
	};

	timingLogger.startTag('loading via xhr');
	transport.send();
}

function reloadCatalogBase (query, callback, errorCallback) {
	timingLogger.startTag('reloadCatalogBase');
	var now = Date.now();

	transport = new window.XMLHttpRequest;
	transportType = 'reload';
	transport.open('GET', resolveRelativePath('futaba.php?mode=cat' + query));
	transport.overrideMimeType('text/html;charset=' + FUTABA_CHARSET);

	transport.onload = function (e) {
		timingLogger.endTag();

		timingLogger.startTag('parsing html');
		var doc;
		if (transport.status == 200) {
			doc = getDOMFromString(transport.responseText);
			if (!doc) {
				transport = doc = null;
				errorCallback(new Error('読み込んだ html からの DOM ツリー構築に失敗しました。'));
				return;
			}
		}
		timingLogger.endTag();

		try {
			callback && callback(doc, now, transport.status);
		}
		catch (ex) {
			errorCallback && errorCallback(ex);
		}
		finally {
			transport = doc = null;
			transportLastUsedTime = Date.now();
		}
	};

	transport.onerror = function (e) {
		timingLogger.endTag();
		try {
			errorCallback && errorCallback(new Error(
				'ネットワークエラーにより内容を取得できません。' +
				'\n(' + transport.status + ')'));
		}
		finally {
			transport = null;
			transportLastUsedTime = Date.now();
		}
	};

	timingLogger.startTag('loading via xhr');
	transport.send();
}

function extractTweets () {
	var tweets = document.querySelectorAll('.link-twitter');
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
				'document.head.removeChild(document.getElementById("' + scriptNode.id + '"));';
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

	setTimeout(function () {extractTweets()}, 991);
}

function extractIncompleteFiles () {
	var files = document.querySelectorAll('.incomplete');
	if (files.length == 0) return;

	function getHandler (node) {
		return function (data) {
			if (data) {
				if (data.url) {
					empty(node);
					node.href = data.url;
					node.appendChild(document.createTextNode(data.base));
				}

				if (/\.(?:jpg|gif|png)$/.test(data.url)) {
					node.classList.add('lightbox');
				}

				if (node.parentNode.nodeName != 'Q' && data.thumbnail) {
					node.appendChild(document[CRE]('br'));
					var img = node.appendChild(document[CRE]('img'));
					img[ONER] =
						'document.dispatchEvent(new CustomEvent(' +
						'  "Akahukuplus.imageError",' +
						'  {detail:{target:this}}' +
						'))';
					img.src = data.thumbnail;
				}
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

	setTimeout(function () {extractIncompleteFiles()}, 907);
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
			setTimeout(function () {
				showFetchedRepliesStatus();
			}, RELOAD_LOCK_RELEASE_DELAY);
		}
	}
	else {
		$t(fetchStatus, '');
		fetchStatus.classList.add('hide');
	}
}

function updateMarkedTopic (xml, container) {
	var result = false;
	var marks = xml.querySelectorAll('topic > mark');
	for (var i = 0, goal = marks.length; i < goal; i++) {
		var number = marks[i].parentNode.querySelector('number').textContent;

		var node = container.querySelector('.topic-wrap[data-number="' + number + '"]');
		if (!node || node.querySelector('.mark')) continue;

		var comment = node.querySelector('.comment');
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
	var ids = xml.querySelectorAll('topic > user_id');
	for (var i = 0, goal = ids.length; i < goal; i++) {
		var number = ids[i].parentNode.querySelector('number').textContent;

		var node = container.querySelector('.topic-wrap[data-number="' + number + '"]');
		if (!node || node.querySelector('.user-id')) continue;

		var postno = node.querySelector('.postno');
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
	var sodanes = xml.querySelectorAll('topic > sodane[className="sodane"]');
	for (var i = 0, goal = sodanes.length; i < goal; i++) {
		var number = sodanes[i].parentNode.querySelector('number').textContent;
		var node = container.querySelector('.topic-wrap[data-number="' + number + '"]');
		if (!node) continue;

		var sodane = node.querySelector('.sodane, .sodane-null');
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
	var marks = xml.querySelectorAll('reply > mark');
	var parentSelector = getParentSelector(start, end);
	for (var i = 0, goal = marks.length; i < goal; i++) {
		var number = marks[i].parentNode.querySelector('number').textContent;

		var node = container.querySelector(parentSelector + ' > [data-number="' + number + '"]');
		if (!node || node.classList.contains('deleted')) continue;

		node.classList.add('deleted');

		var comment = node.querySelector('.comment');
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
	var ids = xml.querySelectorAll('reply > user_id');
	var parentSelector = getParentSelector(start, end);
	for (var i = 0, goal = ids.length; i < goal; i++) {
		var number = ids[i].parentNode.querySelector('number').textContent;

		var node = container.querySelector(parentSelector + ' > [data-number="' + number + '"]');
		if (!node || node.querySelector('.user-id')) continue;

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
	var sodanes = xml.querySelectorAll('reply > sodane[className="sodane"]');
	var parentSelector = getParentSelector(start, end);
	for (var i = 0, goal = sodanes.length; i < goal; i++) {
		var number = sodanes[i].parentNode.querySelector('number').textContent;

		var node = container.querySelector(parentSelector + ' > [data-number="' + number + '"]');
		if (!node) continue;

		var sodane = node.querySelector('.sodane, .sodane-null');
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
			var unit = document.querySelector([
				'article .topic-wrap[data-number="' + number + '"] span.user-id',
				'article .reply-wrap > [data-number="' + number + '"] span.user-id'
			].join(','));
			if (!unit) continue;

			$t(unit.nextSibling, '(' + (i + 1) + '/' + stat.idData[id].length + ')');
		}
	}
}

function getParentSelector (start, end) {
	var parentSelector = '.reply-wrap';

	// start and end are 1-based.
	if (typeof start == 'number' && typeof end == 'number') {
		parentSelector += ':nth-child(n+' + start + ')';
		parentSelector += ':nth-child(-n+' + end + ')';
	}

	return parentSelector;
}

function getReplyContainer (index) {
	index || (index = 0);
	return document.querySelector('article:nth-of-type(' + (index + 1) + ') .replies');
}

function getRule (container) {
	container || (container = getReplyContainer());
	if (!container) return;
	return container.querySelector('.rule');
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
	var rule = container.querySelector('.rule');
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
	xmlGenerator.remainingReplies(
		context, null, null, lowBoundNumber,
		function (xml, index, count, count2) {
			timingLogger.startTag('processRemainingReplies callback');
			var worked = false;

			markStatistics.updatePostformView({
				count: {
					total: count,
					mark: 0,
					id: 0
				},
				delta: null
			});

			if (xml) {
				var container = getReplyContainer(index);
				if (!container) return;

				if (lowBoundNumber >= 0) {
					timingLogger.startTag('update marked posts');
					worked = updateMarkedReplies(xml, container, count2 + 1, count) || worked;
					timingLogger.endTag();

					timingLogger.startTag('update reply ids');
					worked = updateReplyIDs(xml, container, count2 + 1, count) || worked;
					timingLogger.endTag();

					timingLogger.startTag('update reply sodanes');
					worked = updateReplySodanes(xml, container, count2 + 1, count) || worked;
					timingLogger.endTag();
				}

				if (lowBoundNumber < 0) {
					xsltProcessor.setParameter(null, 'render_mode', 'replies');
				}
				else {
					xsltProcessor.setParameter(null, 'low_bound_number', lowBoundNumber);
					xsltProcessor.setParameter(null, 'render_mode', 'replies_diff');
				}

				try {
					timingLogger.startTag('generate new replies xml');
					var f = fixFragment(xsltProcessor.transformToFragment(xml, document));
					if (f.querySelector('.reply-wrap')) {
						lowBoundNumber >= 0 && createRule(container);
						appendFragment(container, f);
						stripTextNodes(container);
						worked = true;
					}
					timingLogger.endTag();
				}
				catch (e) {
					console.error('processRemainingReplies: exception(1), ' + e.message);
				}

				try {
					worked && callback && callback();
				}
				catch (e) {
					console.error('processRemainingReplies: exception(2), ' + e.message);
				}
			}
			else {
				if (pageModes[0] == 'reply') {
					var newStat = markStatistics.getStatistics(lowBoundNumber < 0);

					markStatistics.updatePanelView(newStat);
					if (markStatistics.updatePostformView(newStat)) {
						showFetchedRepliesStatus();
					}
					else {
						lowBoundNumber >= 0 && showFetchedRepliesStatus('新着レスなし', true);
					}
					updateIdFrequency(newStat);

				}

				favicon.update();
				extractTweets();
				extractIncompleteFiles();

				try {
					callback && callback(newStat);
				}
				catch (e) {
					console.error('processRemainingReplies: exception(3), ' + e.message);
				}
			}

			timingLogger.endTag();
			return worked;
		}
	);
}

function scrollToNewReplies () {
	var rule = getRule();
	if (!rule) return;

	var scrollTop = docScrollTop();
	var diff = rule.nextSibling.getBoundingClientRect().top - Math.floor(viewportRect.height / 2);
	if (diff <= 0) return;

	var startTime = Date.now();
	var timeLimit = startTime + RELOAD_AUTO_SCROLL_CONSUME;
	var log = [];

	setTimeout(function handleScroll () {
		if (Date.now() < timeLimit) {
			window.scrollTo(
				0,
				scrollTop + Math.floor(diff * ((Date.now() - startTime) / RELOAD_AUTO_SCROLL_CONSUME)));
			setTimeout(function () {handleScroll()}, 10);
		}
		else {
			window.scrollTo(0, scrollTop + diff);
		}
	}, 10);
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

function setPostThumbnail (file) {
	var thumbWrap = $('post-image-thumbnail-wrap');
	var thumb = $('post-image-thumbnail');

	if (!thumbWrap || !thumb) return;
	if (!file || !/^image\/(?:jpeg|png|gif)$/.test(file.type)) {
		thumbWrap.removeAttribute('data-available');
		setPostThumbnailVisibility(false);
		return;
	}

	var fr = new FileReader;
	fr.onload = function () {
		var img = document[CRE]('img');
		img.onload = function () {
			var containerWidth = Math.min(Math.floor(viewportRect.width / 4 * 0.8), 250);
			var containerHeight = Math.min(Math.floor(viewportRect.width / 4 * 0.8), 250);
			var size = getThumbnailSize(
				img.naturalWidth, img.naturalHeight,
				containerWidth, containerHeight);

			var canvas = document[CRE]('canvas');
			canvas.width = size.width;
			canvas.height = size.height;

			var c = canvas.getContext('2d');
			c.fillStyle = '#f0e0d6';
			c.fillRect(0, 0, canvas.width, canvas.height);
			c.drawImage(
				img,
				0, 0, img.naturalWidth, img.naturalHeight,
				0, 0, canvas.width, canvas.height);

			thumbWrap.classList.add('hide');
			thumb.classList.remove('run');
			thumbWrap.setAttribute('data-available', '2');
			thumb.width = canvas.width;
			thumb.height = canvas.height;
			thumb.src = canvas.toDataURL();
			setTimeout(function () {commands.activatePostForm()}, 0);

			img = img.onload = null;
		};
		img.src = fr.result;
		fr = null;
	};
	fr.onerror = function () {
		thumbWrap.removeAttribute('data-available');
		setPostThumbnailVisibility(false);
		fr = null;
	};
	fr.readAsDataURL(file);
}

/*
 * <<<1 panel tab handling functions
 */

function showPanel (callback) {
	var ad = $('ad-aside-wrap');
	var panel = $('panel-aside-wrap');

	if (ad.classList.contains('hide')) {
		callback && callback(panel);
		return;
	}

	ad.classList.add('hide');

	if (panel.classList.contains('hide') && !panel.classList.contains('run')) {
		panel.classList.remove('hide');
		callback && transitionend(panel, function (e) {
			callback(e.target);
		});
		setTimeout(function () {panel.classList.add('run')}, 0);
	}
}

function hidePanel (callback) {
	var ad = $('ad-aside-wrap');
	var panel = $('panel-aside-wrap');

	if (!ad.classList.contains('hide')) {
		callback && callback(panel);
		return;
	}

	if (!panel.classList.contains('hide') && panel.classList.contains('run')) {
		transitionend(panel, function (e) {
			e.target.classList.add('hide');
			$('ad-aside-wrap').classList.remove('hide');
			callback && callback(e.target);
		});
		setTimeout(function () {panel.classList.remove('run')}, 0);
	}
}

function activatePanelTab (tab) {
	var re = /#(.+)/.exec(tab.href);
	if (!re) return;

	Array.prototype.forEach.call(
		$('panel-aside-wrap').querySelectorAll('.panel-tab-wrap .panel-tab'),
		function (node) {
			node.classList.remove('active');
			if (node.getAttribute('href') == '#' + re[1]) {
				node.classList.add('active');
			}
		}
	);

	var activePanelContent;
	Array.prototype.forEach.call(
		$('panel-aside-wrap').querySelectorAll('.panel-content-wrap > div'),
		function (node) {
			node.classList.add('hide');
			if (node.id == 'panel-content-' + re[1]) {
				node.classList.remove('hide');
				activePanelContent = node;
			}
		}
	);
	if (activePanelContent) {
		activePanelContent.style.height = '';
		var wrapRect = activePanelContent.parentNode.getBoundingClientRect();
		activePanelContent.style.height = wrapRect.height + 'px';
	}
}

/*
 * <<<1 application commands
 */

var commands = {

	/*
	 * general functionalities
	 */

	activatePostForm: function () {
		$('postform-wrap').classList.add('hover');
		$('com').focus();
		setPostThumbnailVisibility(true);
	},
	deactivatePostForm: function () {
		$('postform-wrap').classList.remove('hover');
		document.activeElement.blur();
		document.body.focus();
		setPostThumbnailVisibility(false);
	},
	scrollPage: function (e) {
		var st = docScrollTop();
		var sh = document.documentElement.scrollHeight;
		if (!e.shift && lastScrollTop >= sh - viewportRect.height) {
			commands.invokeMousewheelEvent();
		}
		else {
			window.scrollBy(
				0, parseInt(viewportRect.height / 2) * (e.shift ? -1 : 1));
		}
	},
	invokeMousewheelEvent: function () {
		var ev = document.createEvent('MouseEvents');
		var view = window[USW] || window;
		ev.initMouseEvent('mousewheel', true, true, view,
			0, 0, 0, 0, 0,
			false, false, false, false,
			0, null);
		view.dispatchEvent(ev);
	},
	clearUpfile: function () {
		resetForm('upfile');
		setPostThumbnail();
	},
	summaryBack: function () {
		if (pageModes[0] != 'summary') return;
		var current = document.querySelector('.nav .nav-links .current');
		if (!current || !current.previousSibling) return;
		historyStateWrapper.pushState(current.previousSibling.href);
		commands.reload();
	},
	summaryNext: function () {
		if (pageModes[0] != 'summary') return;
		var current = document.querySelector('.nav .nav-links .current');
		if (!current || !current.nextSibling) return;
		historyStateWrapper.pushState(current.nextSibling.href);
		commands.reload();
	},

	/*
	 * reload/post
	 */

	reload: function () {
		if (isRapidAccess()) return;

		//timingLogger.locked = false;
		setTimeout(function () {
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
		}, 1);
	},
	reloadSummary: function () {
		var content = $('content');
		var indicator = $('content-loading-indicator');
		var footer = $('footer');

		if (transport) {
			if (transportType == 'reload') {
				try {transport.abort()} catch (e) {}
				transport = null;
				indicator.classList.add('error');
				$t(indicator, '中断しました');
			}
			return;
		}

		if (pageModes[0] != 'summary') {
			return;
		}

		$t(indicator, '読み込み中です。ちょっとまってね。');
		content.style.height = content.offsetHeight = 'px';
		content.classList.add('init');
		indicator.classList.remove('hide');
		footer.classList.add('hide');

		reloadBase(
			function (doc, now, status) {
				switch (status) {
				case 304:
					window.scrollTo(0, 0);
					setTimeout(function () {
						footer.classList.remove('hide');
						content.classList.remove('init');
						content = indicator = null;
						timingLogger.endTag();
					}, WAIT_AFTER_RELOAD);
					return;
				}

				if (!doc) {
					throw new Error('内容が変だよ。');
				}

				timingLogger.startTag('generate internal xml');
				try {
					var fragment = (function () {
						timingLogger.startTag('generate');
						var xml = xmlGenerator.run(doc.documentElement[IHTML]).xml;
						timingLogger.endTag();

						timingLogger.startTag('applying data bindings');
						applyDataBindings(xml);
						timingLogger.endTag();

						timingLogger.startTag('transforming');
						xsltProcessor.setParameter(null, 'render_mode', 'threads');
						var result = fixFragment(xsltProcessor.transformToFragment(xml, document));
						timingLogger.endTag();

						return result;
					})();
				}
				catch (ex) {
					throw new Error(
						'内部 xml からの html への変形に失敗しました。' +
						'\n(' + ex.message + ')');
				}
				timingLogger.endTag();

				timingLogger.startTag('waiting (max ' + WAIT_AFTER_RELOAD + 'msecs)');
				setTimeout(function () {
					timingLogger.endTag();

					timingLogger.startTag('appending the contents');
					empty(content);
					window.scrollTo(0, 0);
					content.style.height = '';
					appendFragment(content, fragment);
					fragment = null;
					timingLogger.endTag();

					timingLogger.startTag('waiting transition');
					setTimeout(function () {
						timingLogger.endTag();

						timingLogger.startTag('transition');
						transitionend(content, function () {
							timingLogger.endTag();
							footer.classList.remove('hide');
							footer = null;

							favicon.update();
							extractTweets();
							extractIncompleteFiles();

							timingLogger.endTag();
						});
						content.classList.remove('init');
						content = indicator = null;
					}, 0);
				}, Math.max(0, WAIT_AFTER_RELOAD - (Date.now() - now)));
			},
			function (e) {
				indicator.classList.add('error');
				$t(indicator, e.message);
			}
		);
	},
	reloadReplies: function () {
		if (transport) {
			if (transportType == 'reload') {
				try {transport.abort()} catch (e) {}
				transport = null;
				showFetchedRepliesStatus('中断しました', true);
			}
			return;
		}

		if (pageModes[0] != 'reply') {
			return;
		}

		setBottomStatus('読み込み中...', true);
		removeRule();
		markStatistics.resetPostformView();

		reloadBase(
			function (doc, now, status) {
				switch (status) {
				case 404:
					$t('expires-remains', '-');
					$t('pf-expires-remains', '-');
					showFetchedRepliesStatus();
					setBottomStatus('完了: 404 Not found');
					$t('reload-anchor', 'Not found. ファイルがないよ。');
					return;
				case 304:
					showFetchedRepliesStatus('更新なし', true);
					setBottomStatus('完了: 更新なし');
					$t('reload-anchor', '続きを読む');
					return;
				default:
					$t('reload-anchor', '続きを読む');
				}

				if (!doc) {
					showFetchedRepliesStatus('内容が変だよ (' + status + ')');
					setBottomStatus('完了: エラー ' + status);
					return;
				}

				timingLogger.startTag('generate internal xml');
				try {
					timingLogger.startTag('generate');
					var result = xmlGenerator.run(doc.documentElement[IHTML], null, 0);
					timingLogger.endTag();

					timingLogger.startTag('applying data bindings');
					applyDataBindings(result.xml);
					timingLogger.endTag();

					timingLogger.startTag('update topic id');
					updateMarkedTopic(result.xml, document);
					updateTopicID(result.xml, document);
					updateTopicSodane(result.xml, document);
					timingLogger.endTag();
				}
				catch (ex) {
					throw new Error(
						'内部 xml からの html への変形に失敗しました。' +
						'\n(' + ex.message + ')');
				}
				timingLogger.endTag();

				var lastNumber = (document.querySelector([
					'article:nth-of-type(1)',
					'.reply-wrap:last-child',
					'[data-number]'
				].join(' ')) || document.querySelector([
					'article:nth-of-type(1)',
					'.topic-wrap'
				].join(' '))).getAttribute('data-number') - 0;

				timingLogger.startTag('processing remaining replies');
				processRemainingReplies(result.remainingRepliesContext, lastNumber,
					function (newStat) {
						if (newStat) {
							timingLogger.endTag();
							timingLogger.endTag();
							setBottomStatus(
								'完了: ' + (newStat.delta.total ?
											'新着 ' + newStat.delta.total + ' レス' :
											'新着レスなし'));
							scrollToNewReplies();
						}
					}
				);
			},
			function (e) {
				showFetchedRepliesStatus(e.message);
				setBottomStatus(e.message);
				console.error(e.message);
			}
		);
	},
	reloadCatalog: function () {
		if (transport) {
			if (transportType == 'reload') {
				try {transport.abort()} catch (e) {}
				transport = null;
			}
			return;
		}

		var sortMap = {
			'#catalog-order-default': {n:0, key:'default'},
			'#catalog-order-new': {n:1, key:'new'},
			'#catalog-order-old': {n:2, key:'old'},
			'#catalog-order-most': {n:3, key:'most'},
			'#catalog-order-less': {n:4, key:'less'},
			'#catalog-order-hist': {n:9, key:'hist'}
		};
		var p = document.querySelector('#catalog .catalog-options a.active');
		var sortType = sortMap[p ? p.getAttribute('href') : '#catalog-order-default'];
		var wrap = $('catalog-threads-wrap-' + sortType.key);

		//
		(function () {
			var textLength = 0;
			var withText = $('catalog-with-text');
			var cs = getCatalogSettings();

			if (/^[1-9][0-9]*$/.test(cs[2])) {
				textLength = cs[2];
			}

			if (textLength == 0 && withText.checked) {
				textLength = config.data.catalog_text_max_length.value;
			}
			else if (textLength > 0 && !withText.checked) {
				textLength = 0;
			}

			withText.checked = textLength > 0;
			commands.updateCatalogSettings({
				x: $('catalog-horz-number').value,
				y: $('catalog-vert-number').value,
				text: textLength
			});
		})();

		setBottomStatus('読み込み中...', true);
		catalogPopup.deleteAll();
		wrap.classList.add('run');
		reloadCatalogBase(
			sortType ? '&sort=' + sortType.n : '',
			function (doc, now, status) {
				var insertee = wrap.firstChild;
				var newIndicator = wrap.childNodes.length ? 'new' : '';
				var newClass = wrap.childNodes.length ? 'new' : '';
				var latestNumber = 0;
				var horzActual = doc.querySelectorAll('table[align="center"] tr:first-child td').length;
				var vertActual = doc.querySelectorAll('table[align="center"] tr').length;
				var currentCs = getCatalogSettings();

				//
				var cellImageWidth = Math.floor(CATALOG_THUMB_WIDTH * config.data.catalog_thumbnail_scale.value);
				var cellImageHeight = Math.floor(CATALOG_THUMB_HEIGHT * config.data.catalog_thumbnail_scale.value);
				var anchorWidth = cellImageWidth + CATALOG_ANCHOR_PADDING;

				if ($('catalog-horz-number').value == '') {
					$('catalog-horz-number').value = currentCs[0];
				}
				if ($('catalog-vert-number').value == '') {
					$('catalog-vert-number').value = currentCs[1];
				}

				wrap.style.maxWidth = ((anchorWidth + CATALOG_ANCHOR_MARGIN) * horzActual) + 'px';

				Array.prototype.forEach.call(
					doc.querySelectorAll('table[align="center"] td a'),
					function (node) {
						var repliesCount = 0, from, to;
						var id = /(\d+)\.htm/.exec(node.getAttribute('href'));
						if (!id) return;
						id = id[1] - 0;
						if (id > latestNumber) {
							latestNumber = id;
						}

						// number of replies
						from = node.parentNode.querySelector('font');
						if (from) {
							repliesCount = from.textContent - 0;
						}

						// anchor cell
						var anchor = $('c-' + sortType.key + '-' + id);
						if (anchor) {
							if (anchor == insertee) {
								insertee = insertee.nextSibling;
							}
							anchor.parentNode.insertBefore(anchor, insertee);

							var info = anchor.querySelector('.info');
							var oldRepliesCount = info.firstChild.textContent - 0;
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
						else {
							anchor = wrap.insertBefore(document[CRE]('a'), insertee);
							anchor.id = 'c-' + sortType.key + '-' + id;
							anchor.setAttribute('data-number', id);
						}
						anchor.style.width = anchorWidth + 'px';

						// image
						var pad = anchor.appendChild(document[CRE]('div'));

						['href', 'target'].forEach(function (atr) {
							var value = node.getAttribute(atr);
							if (value == null) return;
							anchor.setAttribute(atr.replace('data-', ''), value);
						});

						from = node.querySelector('img');
						if (from) {
							to = anchor.appendChild(document[CRE]('img'));
							['data-src', 'width', 'height', 'alt'].forEach(function (atr) {
								var value = from.getAttribute(atr);
								if (value == null) return;

								switch (atr) {
								case 'data-src':
									to.src = config.data.catalog_thumbnail_scale.value >= 1.5 ?
										value.replace('/cat/', '/thumb/') : value;
									break;

								case 'width':
									value = Math.floor((value - 0) * config.data.catalog_thumbnail_scale.value);
									to.style.width = value + 'px';
									break;

								case 'height':
									value = Math.floor((value - 0) * config.data.catalog_thumbnail_scale.value);
									to.style.height = value + 'px';
									pad.style.height = (cellImageHeight - value) + 'px';
									break;

								case 'alt':
									to.setAttribute('alt', value);
									break;
								}
							});
						}
						else {
							pad.style.height = cellImageHeight + 'px';
						}

						// text
						from = node.parentNode.querySelector('small');
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

						// finish
						anchor.className = newClass;
					}
				);

				var urls = urlStorage.getAll(window.location.href);

				switch (sortType.n) {
				case 0: case 2:
					while (insertee) {
						insertee.className = '';
						insertee.querySelector('.info').lastChild.textContent = '';
						insertee = insertee.nextSibling;
					}

					var deleteLimit = latestNumber - logSize;
					var warnLimit = Math.floor(latestNumber - logSize * CATALOG_EXPIRE_WARN_RATIO);
					var node = wrap.firstChild;
					while (node) {
						var n = node.getAttribute('data-number') - 0;
						if (n in urls) {
							node.classList.add('soft-visited');
						}
						if (n < deleteLimit) {
							var tmp = node.nextSibling;
							node.parentNode.removeChild(node);
							node = tmp;
						}
						else {
							if (n < warnLimit) {
								node.classList.add('warned');
							}
							node = node.nextSibling;
						}
					}
					break;
				default:
					while (insertee) {
						var tmp = insertee.nextSibling;
						insertee.parentNode.removeChild(insertee);
						insertee = tmp;
					}

					var node = wrap.firstChild;
					while (node) {
						var n = node.getAttribute('data-number') - 0;
						if (n in urls) {
							node.classList.add('soft-visited');
						}
						node = node.nextSibling;
					}
					break;
				}

				wrap.classList.remove('run');
				setBottomStatus('完了');
				window.scrollTo(0, 0);
			},
			function (e) {
				wrap.classList.remove('run');
				setBottomStatus('カタログの読み込みに失敗しました');
			}
		);
	},
	post: function () {
		if (transport) {
			if (transportType == 'post') {
				try {transport.abort()} catch (e) {}
				setBottomStatus('中断しました');
				registerReleaseFormLock();
			}
			return;
		}

		if (isRapidAccess()) return;

		setBottomStatus('投稿中...');
		$('postform').querySelector('fieldset').disabled = true;

		postBase(
			'post',
			$('postform'),
			function (response) {
				if (!response) {
					setBottomStatus('サーバからの応答が変です');
					registerReleaseFormLock();
					return;
				}

				response = response.replace(/\r\n|\r|\n/g, '\t');
				/warning/i.test(response) && console.info(response.replace(/.{1,72}/g, '$&\n'));

				//log('got post result:\n' + response.replace(/.{1,72}/g, '$&\n'));

				var result = parsePostResponse(response);
				if (result.redirect) {
					registerReleaseFormLock();
					setTimeout(function () {
						commands.deactivatePostForm();
						setPostThumbnail();
						resetForm('com', 'upfile', 'textonly', 'baseform');
						setBottomStatus('投稿完了');

						var pageMode = pageModes[0];
						if (pageMode == 'reply' && $('post-switch-thread').checked) {
							pageMode = 'summary';
						}

						switch (pageMode) {
						case 'summary':
						case 'catalog':
							if (result.redirect != '') {
								sendToBackend(
									'open',
									{url:result.redirect, selfUrl:window.location.href});
							}
							if ($('post-switch-reply')) {
								$('post-switch-reply').click();
							}
							break;
						case 'reply':
							transportLastUsedTime = 0;
							commands.reload();
							break;
						}
					}, WAIT_AFTER_POST);
					return;
				}

				registerReleaseFormLock();
				window.alert(result.error || 'なんかエラー');
			}
		);
	},
	sodane: function (e, t) {
		if (!t) return;
		if (t.getAttribute('data-busy')) return;

		var postNumber = getPostNumber(t);
		if (!postNumber) return;

		t.setAttribute('data-busy', '1');
		t.setAttribute('data-text', t.textContent);
		t.textContent = '...';

		var board = window.location.pathname.split('/')[1];
		var xhr = new window.XMLHttpRequest;
		xhr.open('GET', '/sd.php?' + board + '.' + postNumber);
		xhr.onload = function () {
			setTimeout(function () {
				var n = parseInt(xhr.responseText, 10) || 0;
				t.textContent = 'そうだね \u00d7 ' + n;
				t.removeAttribute('data-busy');
				t.removeAttribute('data-text');
				t = xhr = xhr.onload = xhr.onerror = null;
			}, 1000);
		};
		xhr.onerror = function () {
			t.textContent = 'なんかエラー';
			setTimeout(function () {
				t.textContent = t.getAttribute('data-text');
				t.removeAttribute('data-busy');
				t.removeAttribute('data-text');
				t = xhr = xhr.onload = xhr.onerror = null;
			}, 1000);
		};
		xhr.send();
	},

	/*
	 * dialogs
	 */

	openDeleteDialog: function () {
		if (transport) return;

		modalDialog({
			title: '記事削除',
			buttons: 'ok, cancel',
			oninit: function (dialog) {
				var xml = document.implementation.createDocument(null, 'dialog', null);
				var checksNode = xml.documentElement.appendChild(xml[CRE]('checks'));
				Array.prototype.forEach.call(
					document.querySelectorAll('article input[type="checkbox"]:checked'),
					function (node) {
						checksNode.appendChild(xml[CRE]('check')).textContent =
							getPostNumber(node);
					}
				);
				xml.documentElement.appendChild(xml[CRE]('delete-key')).textContent =
					getCookie('pwdc')
				dialog.initFromXML(xml, 'delete-dialog');
			},
			onopen: function (dialog) {
				var deleteKey = dialog.content.querySelector('.delete-key');
				if (deleteKey) {
					deleteKey.focus();
				}
				else {
					dialog.initButtons('cancel');
				}
			},
			onok: function (dialog) {
				var form = dialog.content.querySelector('form');
				var status = dialog.content.querySelector('.delete-status');
				if (!form || !status) return;

				$t(status, '削除をリクエストしています...');
				postBase(
					'delete',
					form,
					function (response) {
						response = response.replace(/\r\n|\r|\n/g, '\t');
						var result = parsePostResponse(response);

						if (result.redirect) {
							$t(status, 'リクエストに成功しました');

							Array.prototype.forEach.call(
								document.querySelectorAll('article input[type="checkbox"]:checked'),
								function (node) {
									node.checked = false;
								}
							);

							setTimeout(function () {
								dialog.isPending = false;
								dialog.close();
								form = status = dialog = null;
								commands.reload();
							}, WAIT_AFTER_POST);

							return;
						}

						$t(status, result.error || 'なんかエラー？');
						dialog.isPending = false;
						form = status = dialog = null;
					},
					function () {
						$t(status, 'ネットワークエラーです');
						dialog.isPending = false;
						form = status = dialog = null;
					}
				);

				dialog.isPending = true;
			}
		});
	},
	openConfigDialog: function () {
		if (transport) return;

		modalDialog({
			title: '設定',
			buttons: 'ok, cancel',
			oninit: function (dialog) {
				var xml = document.implementation.createDocument(null, 'dialog', null);
				var itemsNode = xml.documentElement.appendChild(xml[CRE]('items'));
				itemsNode.setAttribute('prefix', 'config-item.');

				var data = config.data;
				for (var i in data) {
					var item = itemsNode.appendChild(xml[CRE]('item'));
					item.setAttribute('internal', i);
					item.setAttribute('name', data[i].name);
					item.setAttribute('value', data[i].value);
					item.setAttribute('type', data[i].type);
					'desc' in data[i] && item.setAttribute('desc', data[i].desc);
					'min' in data[i] && item.setAttribute('min', data[i].min);
					'max' in data[i] && item.setAttribute('max', data[i].max);

					if ('list' in data[i]) {
						for (var j in data[i].list) {
							var li = item.appendChild(xml[CRE]('li'));
							li.textContent = data[i].list[j];
							li.setAttribute('value', j);
							j == data[i].value && li.setAttribute('selected', 'true');
						}
					}
				}
				dialog.initFromXML(xml, 'config-dialog');
			},
			onok: function (dialog) {
				var storage = {};
				populateTextFormItems(dialog.content, function (item) {
					storage[item.name.replace(/^config-item\./, '')] = item.value;
				});
				config.assign(storage);
				config.save();
				applyDataBindings(xmlGenerator.run('').xml);
			}
		});
	},
	openModerateDialog: function (e, anchor) {
		if (transport) return;
		if (isRapidAccess()) return;

		var re = /(^[^:]+:\/\/[^\/]+\/)([^\/]+)\//.exec(window.location.href);
		if (!re) return;

		var baseUrl = re[1];
		var moderatorUrl = baseUrl +
			'del.php' +
			'?b=' + encodeURIComponent(re[2]) +
			'&d=' + encodeURIComponent(getPostNumber(anchor));

		transport = new window.XMLHttpRequest;
		transportType = 'moderate-pre';
		transport.open('GET', moderatorUrl);
		transport.overrideMimeType('text/html;charset=' + FUTABA_CHARSET);
		transport.onload = function () {
			var doc;
			if (!(transport.status >= 400 && transport.status <= 499)) {
				doc = getDOMFromString(transport.responseText);
			}
			transport = null;
			if (!doc) return;

			modalDialog({
				title: 'del の申請',
				buttons: 'ok, cancel',
				oninit: function (dialog) {
					var xml = document.implementation.createDocument(null, 'dialog', null);
					dialog.initFromXML(xml, 'moderate-dialog');
				},
				onopen: function (dialog) {
					var dest = dialog.content.querySelector('.moderate-target');
					if (dest) {
						for (var node = anchor; node; node = node.parentNode) {
							if (node.classList.contains('topic-wrap')
							||  node.classList.contains('reply-wrap')) {
								node = node.cloneNode(true);

								Array.prototype.forEach.call(
									node.querySelectorAll('a'),
									function (node) {
										node.href = '#void';
									}
								);

								dest.appendChild(node);
								break;
							}
						}
					}

					var form = doc.querySelector('form[method="POST"]');
					var dest = dialog.content.querySelector('.moderate-form');
					if (form && dest) {
						form = form.cloneNode(true);

						form.action = resolveRelativePath(form.getAttribute('action'), baseUrl);
						Array.prototype.forEach.call(
							form.querySelectorAll('input[type="submit"]'),
							function (node) {
								node.parentNode.removeChild(node);
							}
						);
						Array.prototype.forEach.call(
							form.querySelectorAll('table[border]'),
							function (node) {
								node.removeAttribute('border');
							}
						);

						dest.appendChild(form);
					}
				},
				onok: function (dialog) {
					var form = dialog.content.querySelector('form');
					var status = dialog.content.querySelector('.moderate-status');
					if (!form || !status) return;

					$t(status, '申請を登録しています...');
					postBase(
						'moderate',
						form,
						function (response) {
							response = response.replace(/\r\n|\r|\n/g, '\t');
							var result = parseModerateResponse(response);

							if (result.registered) {
								$t(status, '登録されました');

								Array.prototype.forEach.call(
									form.querySelectorAll('input[type="radio"]:checked'),
									function (node) {
										node.checked = false;
									}
								);

								setTimeout(function () {
									dialog.isPending = false;
									dialog.close();
									form = status = dialog = null;
								}, WAIT_AFTER_POST);

								return;
							}

							$t(status, result.error || 'なんかエラー？');
							dialog.isPending = false;
							form = status = dialog = null;
						},
						function () {
							$t(status, 'ネットワークエラーです');
							dialog.isPending = false;
							form = status = dialog = null;
						}
					);

					dialog.isPending = true;
				}
			});
		};
		transport.onerror = function () {
			transport = null;
		};
		transport.send();
	},
	openHelpDialog: function (e, anchor) {
		modalDialog({
			title: 'キーボード ショートカット',
			buttons: 'ok',
			oninit: function (dialog) {
				var xml = document.implementation.createDocument(null, 'dialog', null);
				dialog.initFromXML(xml, 'help-dialog');
			}
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
			'sage ' + email.value;
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
		while (n >= 0 && !/[\n]/.test(v.charAt(n))) {
			n--;
		}
		n++;
		t.selectionStart = n;
		t.selectionEnd = n;
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
		var threads = $('content');
		var catalog = $('catalog');
		var ad = $('ad-aside-wrap');
		var panel = $('panel-aside-wrap');

		if (pageModes.length == 1) {
			threads.classList.add('hide');
			catalog.classList.remove('hide');
			ad.classList.add('hide');
			panel.classList.add('hide');
			pageModes.unshift('catalog');
			$t(document.querySelector('#header a[href="#catalog"]'), 'サマリー');

			var active = document.querySelector(
				'#catalog .catalog-threads-wrap > div:not([class*="hide"])');
			if (active && active.childNodes.length == 0) {
				commands.reloadCatalog();
			}
			historyStateWrapper.updateHash('#mode=cat');
		}
		else {
			threads.classList.remove('hide');
			catalog.classList.add('hide');
			ad.classList.remove('hide');
			panel.classList.add('hide');
			$t(document.querySelector('#header a[href="#catalog"]'), 'カタログ');
			catalogPopup.deleteAll();
			pageModes.shift();
			historyStateWrapper.updateHash('');
		}
	},
	updateCatalogSettings: function (settings) {
		var cs = getCatalogSettings();
		if ('x' in settings) {
			var tmp = parseInt(settings.x);
			if (!isNaN(tmp) && tmp >= 1 && tmp <= 20) {
				cs[0] = tmp;
			}
		}
		if ('y' in settings) {
			var tmp = parseInt(settings.y);
			if (!isNaN(tmp) && tmp >= 1 && tmp <= 100) {
				cs[1] = tmp;
			}
		}
		if ('text' in settings) {
			var tmp = parseInt(settings.text);
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
		var ad = $('ad-aside-wrap');
		var panel = $('panel-aside-wrap');
		if (ad.classList.contains('hide') && !panel.classList.contains('hide')) {
			commands.hidePanel();
		}
		else if (!ad.classList.contains('hide') && panel.classList.contains('hide')) {
			commands.showPanel();
		}
	},
	hidePanel: function () {
		hidePanel();
	},
	showPanel: function () {
		showPanel(function (panel) {
			activatePanelTab(document.querySelector('.panel-tab.active'));
		});
	},
	activateStatisticsTab: function () {
		showPanel(function (panel) {
			activatePanelTab(document.querySelector('.panel-tab[href="#mark"]'));
		});
	},
	activateSearchTab: function () {
		showPanel(function (panel) {
			activatePanelTab(document.querySelector('.panel-tab[href="#search"]'));
			$('search-text').focus();
		});
	},
	activateNoticeTab: function () {
		showPanel(function (panel) {
			activatePanelTab(document.querySelector('.panel-tab[href="#notice"]'));
		});
	},

	/*
	 * panel (search)
	 */

	search: function () {
		var tester = createQueryCompiler().compile($('search-text').value);
		if (tester.message) {
			log(tester.message);
			return;
		}

		var result = $('search-result');
		var matched = 0;
		empty(result);

		Array.prototype.forEach.call(
			document.querySelectorAll('article .topic-wrap, article .reply-wrap'),
			function (node) {
				var text = [];
				Array.prototype.forEach.call(
					node.querySelectorAll('.sub, .name, .postdate, span.user-id, .email, .comment'),
					function (subNode) {
						var t = subNode.textContent;
						t = t.replace(/^\s+|\s+$/g, '');
						t = t.toLowerCase();
						if (t.length) {
							text.push(t);
						}
					}
				);
				text = text.join('\t');

				if (tester.test(text)) {
					var div = result.appendChild(document[CRE]('div'));
					div.textContent = text;
					div.className = 'a';
					div.setAttribute('data-number',
						node.getAttribute('data-number') || node.querySelector('[data-number]').getAttribute('data-number'));
					matched++;
				}
			}
		);

		$t('search-result-count', matched + ' 件を抽出');
	}
};

/*
 * <<<1 bootstrap
 */

if (document.title != '404 File Not Found') {
	timingLogger = createTimingLogger();
	timingLogger.startTag('booting akahukuplus');
	initialStyle(true);
	removeAssets('script top');
	document.addEventListener('DOMContentLoaded', handleDOMContentLoaded, false);
}

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
