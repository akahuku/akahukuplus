/*
 * application indepedent utility functions
 *
 * @author akahuku@gmail.com
 */

export function $ (id) {
	return typeof id == 'string' ? document.getElementById(id) : id;
}

export function $t (node, content) {
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

export function fixFragment (f, tagName) {
	const element = $qs(tagName || 'body', f);
	if (!element) return f;
	const r = document.createRange();
	r.selectNodeContents(element);
	return r.cloneContents();
}

export function serializeXML (xml) {
	return (new window.XMLSerializer())
		.serializeToString(xml)
		.replace(/<\/\w+>/g, '$&\n')
		.replace(/></g, '>\n<');
}

export function getCookie (key) {
	let result;
	document.cookie.split(';').some(function (a) {
		a = a.split('=', 2);
		if (a[0].replace(/^\s+|\s+$/g, '') == key) {
			result = unescape(a[1]);
			return true;
		}
	});
	return result;
}

export function setCookie (key, value, lifeDays, path) {
	const s = [];
	s.push(`${key}=${escape(value)}`);
	if (lifeDays) {
		const d = new Date;
		d.setDate(d.getDate() + lifeDays);
		s.push('expires=' + d.toUTCString());
	}
	if (path) {
		s.push('path=' + path);
	}
	document.cookie = s.join('; ');
}

export function getDOMFromString (s) {
	try {
		return (new window.DOMParser()).parseFromString(
			s.replace(/\r?\n/g, ' ')
				.replace(/<script[^>]*>.*?<\/script>/gi, '')
				.replace(/<img[^>]*>/gi, $0 => $0.replace(/\bsrc=/g, 'data-src=')),
			'text/html');
	}
	catch (e) {
		console.error(`getDOMFromString failed: ${e.stack}`);
	}
}

export function getImageMimeType (href) {
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

export function docScrollTop () {
	return Math.max(
		document.documentElement.scrollTop,
		document.body.scrollTop);
}

export function docScrollLeft () {
	return Math.max(
		document.documentElement.scrollLeft,
		document.body.scrollLeft);
}

export function transitionend (element, callback, backupMsec) {
	element = $(element);
	if (!element) {
		callback && callback({
			type: 'transitionend-backup',
			target: null,
		});
		callback = null;
		return;
	}

	let backupTimer;
	let handler = function handleTransitionEnd (e) {
		if (backupTimer) {
			clearTimeout(backupTimer);
			backupTimer = null;
		}
		if (callback) {
			callback(e);
		}
		handler = element = callback = e = null;
	};

	element.addEventListener('transitionend', handler, {once: true});
	backupTimer = setTimeout(handler, backupMsec || 1000, {
		type: 'transitionend-backup',
		target: element,
	});
}

export function delay (msecs) { /*returns promise*/
	return new Promise(resolve => setTimeout(resolve, msecs));
}

export function transitionendp (element, backupMsec) { /*returns promise*/
	return new Promise(resolve => transitionend(element, resolve, backupMsec));
}

export function dumpNode (node, tag) {
	console.log((tag ? `${tag}: ` : '') + node.innerHTML
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n')
		.replace(/\t/g, '\\t')
		.replace(/\f/g, '\\f')
		.replace(/[\x00-\x1f]/g, $0 => `\\x${('00' + $0.charCodeAt(0).toString(16)).substr(-2)}`));
}

export function getBlobFrom (url, mimeType = 'image/png', quality = 0.9) { /*returns promise*/
	if (url instanceof HTMLCanvasElement) {
		return new Promise(resolve => {
			url.toBlob(resolve, mimeType, quality);
		});
	}
	else {
		// http://stackoverflow.com/a/30666203
		return new Promise(resolve => {
			let xhr = new XMLHttpRequest;

			xhr.open('GET', url);
			// Can't use blob directly because of https://crbug.com/412752
			xhr.responseType = 'arraybuffer';
			xhr.onload = () => {
				const mime = xhr.getResponseHeader('content-type');
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

export function getImageFrom (target) { /*returns promise*/
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

		let media = document.createElement(tagName);
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

export function regalizeEditable (el) {
	const r = document.createRange();
	let div;
	el.normalize();
	while ((div = el.querySelector('div'))) {
		r.selectNodeContents(div);
		const prevBreak = div.previousSibling && div.previousSibling.nodeName == 'BR';
		if (!prevBreak) {
			div.parentNode.insertBefore(document.createElement('br'), div);
		}

		div.parentNode.insertBefore(r.extractContents(), div);
		div.parentNode.removeChild(div);
	}
	return el;
}

export function getContentsFromEditable (el) {
	let value;
	if ('value' in el) {
		value = el.value;
	}
	else {
		const div = regalizeEditable(el.cloneNode(true));
		const iterator = document.createNodeIterator(
			div, window.NodeFilter.SHOW_ELEMENT | window.NodeFilter.SHOW_TEXT);
		const result = [];
		let current;
		while ((current = iterator.nextNode())) {
			switch (current.nodeType) {
			case 1:
				current.nodeName == 'BR' && result.push('\n');
				break;
			case 3:
				result.push(current.nodeValue);
				break;
			}
		}

		value = result.join('').replace(/^\s+|\s+$/g, '');
	}
	return {value};
}

export function setContentsToEditable (el, s) {
	if ('value' in el) {
		el.value = s;
	}
	else {
		el.textContent = s;
	}
}

export function isHighSurrogate (ch) {
	if (typeof ch == 'string') {
		ch = ch.charCodeAt(0);
	}
	return 0xd800 <= ch && ch <= 0xdbff;
}

export function isLowSurrogate (ch) {
	if (typeof ch == 'string') {
		ch = ch.charCodeAt(0);
	}
	return 0xdc00 <= ch && ch <= 0xdfff;
}

export function isSurrogate (ch) {
	return isHighSurrogate(ch) || isLowSurrogate(ch);
}

export const resolveCharacterReference = (() => {
	const cache = {};

	return s => {
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

				if (source in cache) {
					return cache[source];
				}

				// for after transform is complete
				let converter = $('charref-converter');
				if (converter) {
					converter.innerHTML = source;
					return cache[source] = converter.textContent;
				}

				// for boot time
				converter = document.body.appendChild(document.createElement('div'));
				try {
					converter.innerHTML = source;
					return cache[source] = converter.textContent;
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
	};
})();

export const 新字体の漢字を舊字體に変換 = (function () {
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
 * This function is ported from:
 *   http://www2f.biglobe.ne.jp/takan/javac/freeware/nandeyanen.htm
 *   @note It is unknown license.
 */
export const osaka = (() => {
	const dictMap = new Map;
	let dict = {
		'こんばんわ': 'おこんばんわ',
		'ありがとう(?:ございました)?': 'おおきに',
		'あなた': 'あんさん',
		'あんな': 'あないな',
		'りますので': 'るさかいに',
		'りますから': 'るさかいに',
		'あります': 'あるんや',
		'(?:ある|或)いは': 'せやなかったら',
		'ありません': 'おまへん',
		'ありました': 'おました',
		'いない': 'おらへん',
		'(?:いま|今)までの': 'ムカシからの',
		'(?:いま|今)まで': '本日この時まで',
		'(?:今|いま)(?:時|どき)': 'きょうび',
		'いわゆる': 'ようみなはん言わはるとこの',
		'思いますが': '思うんやが',
		'思います': '思うで',
		'いただいた': 'もろた',
		'いただきます': 'もらうで',
		'いただきました': 'もろた',
		'いくら': 'なんぼ',
		'いつも': '毎日毎晩壱年中',
		'いるか': 'おるか',
		'いますので': 'おるさかいに',
		'いますから': 'おるさかいに',
		'(?:いちど|一度)': 'いっぺん',
		'いますが': ['おるけど', 'おるけどダンさん'],
		'いました': 'おったんや',
		'います': 'いますわ',
		'エラー': 'アヤマチ',
		'えない': 'えへん',
		'おかしな': 'ケッタイな',
		'おきました': 'おいたんや',
		'おっと': ['おっとドッコイ、', 'おっとドッコイたこやきはうまいで…あかん、脱線や'],
		'かなあ': 'かいな',
		'かならず': 'じぇったい',
		'かわいい': 'メンコイ',
		'(?:おそ|恐)らく': 'ワイが思うには',
		'おもしろい': 'オモロイ',
		'面白い': 'おもろい',
		'ください': 'おくんなはれ',
		'(?:くわ|詳)しく': 'ねちっこく',
		'けない': 'けへん',
		'ございます': 'おます',
		'ございました': 'おました',
		'こちら': 'ウチ',
		'(?:僕|俺)': ['ワテ', 'わて'],
		'こんな': 'こないな',
		'この(?:頃|ごろ)': 'きょうび',
		'(?:子|こ)(?:供|ども)': ['ガキ', 'ボウズ'],
		'コロン': 'てんてん',
		'下さい': 'くれへんかの',
		'さよう?なら': 'ほなさいなら',
		'さん': 'はん',
		'しかし': ['せやけどね', 'せやけどダンさん'],
		'おはよう': 'おはようさん',
		'(?:しかた|仕方)ない': 'しゃあない',
		'しなければ': 'せな',
		'しない': 'せん',
		'しばらく': 'ちーとの間',
		'している': 'しとる',
		'しました': 'したんや',
		'しまいました': 'しもたんや',
		'しますか': 'しまっか',
		'しますと': 'すやろ、ほしたら',
		'しまった': 'しもた',
		'しますので': 'するさかいに',
		'じゃ': 'や',
		'するとき': 'するっちうとき',
		'すべて': 'ずぅぇえええぇぇええんぶ',
		'(?:すく|少)なくとも': 'なんぼなんでも',
		'ずに': 'んと',
		'すごい': 'どエライ',
		'少し': 'ちびっと',
		'スリッパ': 'パッスリ',
		'せない': 'せへん',
		'そこで': 'ほんで',
		'そして': 'ほんで',
		'そんな': 'そないな',
		'そうだろ': 'そうやろ',
		'それから': 'ほんで',
		'それでは': 'ほなら',
		'(?:たと|例)えば': ['$&', '$&やね', '例あげたろか、たとえばやなあ'],
		'たのです': 'たちうワケや',
		'たので': 'たさかい',
		'ただし': 'せやけど',
		'たぶん': ['たぶんやけど', 'タブン…たぶんやで、わいもよーしらんがタブン'],
		'たくさん': 'ようけ',
		'だった': 'やった',
		'だけど': 'やけど',
		'だから': 'やから',
		'だが': 'やけど',
		'だろ': 'やろ',
		'だね([、。…！？!?]|\\.)*$': 'やね$1',
		'ちなみに': '余計なお世話やけど',
		'ちょっと': 'ちーとばかし',
		'ったし': 'ったことやねんし',
		'つまり': ' ゴチャゴチャゆうとる場合やあれへん、要は',
		'つまらない': 'しょーもない',
		'であった': 'やった',
		'ている': 'とる',
		'ていただいた': 'てもろた',
		'ていただきます': 'てもらうで',
		'ていただく': 'てもらうで',
		'ていただ': 'ていただ',
		'ていた': 'とった',
		'多く': 'ようけ',
		'ですか': 'やろか',
		'ですよ': 'や',
		'ですが': 'やけどアンタ',
		'ですね': 'やね',
		'でした': 'やった',
		'でしょう': 'でっしゃろ',
		'できない': 'でけへん',
		'ではない': 'ではおまへん',
		'です': 'や',
		'てない': 'てへん',
		'どういう(?:わけ|訳)か': 'なんでやろかわいもよー知らんが',
		'どうだ': 'どや',
		'どこか': 'どこぞ',
		'どんな': 'どないな',
		'という': 'ちう',
		'とすれば': 'とするやろ、ほしたら',
		'ところが': 'トコロが',
		'ところ': 'トコ',
		'とても': 'どエライ',
		'(?:なぜ|何故)か': 'なんでやろかわいもよー知らんが',
		'なった': 'なりよった',
		'なのですが': 'なんやけど',
		'なのです': 'なんやこれがホンマに',
		'なので': 'やので',
		'なぜ': 'なんでやねん',
		'など': 'やらなんやら',
		'ならない': 'ならへん',
		'なりました': 'なったんや',
		'のちほど': 'ノチカタ',
		'のです': 'のや',
		'(?:はじ|初)めまして': 'はじめてお目にかかりまんなあ',
		'(?:はじ|初)めて': ['初めて', 'この世におぎゃあいうて生まれてはじめて'],
		'びっくり仰天': 'クリビツテンギョー',
		'(?:ひと|人)(?:たち|達)': 'ヤカラ',
		'ヘルプ': '助け船',
		'ほんとう?': 'ホンマ',
		'まいますので': 'まうさかいに',
		'まったく': 'まるっきし',
		'全く': 'まるっきし',
		'ません': 'まへん',
		'ました': 'たんや',
		'ますか': 'まっしゃろか',
		'ますが': 'まっけど',
		'ましょう': 'まひょ',
		'ますので': 'よるさかいに',
		'むずかしい': 'ややこしい',
		'めない': 'めへん',
		'メッセージ': '文句',
		'もらった': 'もろた',
		'もらって': 'もろて',
		'よろしく': 'シブロクヨンキュー',
		'ります': 'るんや',
		'[らり]ない': 'りまへん',
		'れない': 'れへん',
		'ます': 'まんねん',
		'もっとも': 'もっとも',
		'もっと': ['もっともっと', 'もっともっともっともっと', 'もっともっともっともっともっともっともっともっともっと'],
		'ようやく': 'ようやっと',
		'よろしく': 'よろしゅう',
		'るのです': 'るちうワケや',
		'だ([、。…！？!?]|\\.)*$': 'や$1',
		'りました': 'ったんや',
		'る([、。…！？!?]|\\.)*$': ['$&', 'るんや$1', 'るちうわけや$1'],
		'い([、。…！？!?]|\\.)*$': ['$&', 'いんや$1', 'いちうわけや$1'],
		'た([、。…！？!?]|\\.)*$': ['$&', 'たちうわけや$1'],
		'う([、。…！？!?]|\\.)*$': 'うわ$1',
		'わがまま': 'ワガママ',
		'まま': 'まんま',
		'われわれ': 'ウチら',
		'わたし': 'わい',
		'私': 'ウチ',
		'アタシ': 'ウチ',
		'わない': 'いまへん',
		'本当': 'ホンマ',
		'全て': 'みな',
		'全部': 'ぜええんぶひとつのこらず',
		'全然': 'さらさら',
		'ぜんぜん': 'サラサラ',

		'日本語': '祖国語',
		'日本': '大日本帝国',
		'便利': ['$&', '便器…おっとちゃうわ、便利'],
		'当局': 'わい',
		'大変な?': 'エライ',
		'非常に': 'どエライ',
		'違う': 'ちゃう',
		'ANK': ['$&', 'アンコ……ウソやウソ、ANKやわ、はっはっ、'],
		'古い': '古くさい',
		'最近': 'きょうび',
		'以前': 'よりどエライ昔',
		'無効': 'チャラ',
		'中止': 'ヤメ',
		'外国': '異国',
		'海外': 'アチラ',
		'難し': 'ややこし',
		'面倒': '難儀',
		'遅([いかきく])': 'とろ$1',
		'良い': 'ええ',
		'入れる': 'ぶちこむ',
		'コギャル': 'セーラー服のねえちゃん',
		'女子高生': 'セーラー服のねえちゃん',
		'来た': '攻めて来よった',
		'同時': 'いっぺん',
		'先頭': 'アタマ',
		'破壊': 'カンペキに破壊',
		'挿入': ['ソーニュー', 'ソーニュー(うひひひ…おっとカンニンや)'],
		'置換': 'とっかえ',
		'無視': 'シカト',
		'注意': '用心',
		'最後': 'ケツ',
		'我々': 'うちら',
		'初心者': 'どシロウト',
		'付属': 'オマケ',
		'誤って': ['あかん言うて', 'あかーんいうて誤って'],
		'商人': 'あきんど',
		'商売': 'ショーバイ',
		'商業': 'ショーバイ',
		'誰': 'どなたはん',
		'再度': 'もっかい',
		'再び': 'もっかい',
		'自動的に': 'なあんもせんとホッタラかしといても',
		'無料': 'タダ',
		'変化': '変身',
		'右': '右翼',
		'左': '左翼',
		'自分': 'オノレ',
		'とても': 'ごっつ',
		'成功': ['$&', '性交…ひひひ、ウソや、成功'],
		'失敗': 'シッパイ',
		'優先': 'ヒイキ',
		'タクシー': 'タク',
		'カレンダー': '日メクリ',
		'たばこ': 'モク',
		'特長': 'ええトコ',
		'概要': 'おーまかなトコ',
		'概念': '能書き',
		'アルゴリズム': '理屈',
		'実用的': 'アホでも使えるよう',
		'何も': 'なあんも',
		'何か': '何ぞ',
		'いい': 'ええ',
		'マクドナルド': 'マクド',
		'なのかな': 'やろか',
		'かな': 'やろか',
		'こんにちは': 'もうかってまっか？',
		'どうも': 'もうかってまっか？',
		'クライアント': '客',
		'素人': 'トーシロ',
	};

	for (const i in dict) {
		const pattern = new RegExp(i, 'gm');
		dictMap.set(pattern, dict[i]);
	}

	dict = undefined;

	return function osaka (s) {
		for (let [pattern, replacement] of dictMap) {
			if (replacement instanceof Array) {
				replacement = replacement[Math.floor(Math.random() * replacement.length)];
			}
			s = s.replace(pattern, replacement);
		}

		return s;
	}
})();

export function mergeDeep (target, source) {
	function isArray (a) {
		return Array.isArray(a);
	}

	function isObject (a) {
		return a && typeof a == 'object';
	}

	if (!isObject(target)) return source;
	if (!isObject(source)) return target;

	for (const key in source) {
		const t = target[key];
		const s = source[key];

		// array
		if (isArray(s)) {
			if (isArray(t)) {
				target[key] = t.concat(s);
			}
			else {
				target[key] = [].concat(s);
			}
		}

		// object
		else if (isObject(s)) {
			target[key] = mergeDeep(Object.assign({}, t), s);
		}

		// other stuff
		else {
			target[key] = s;
		}
	}

	return target;
}

export function getErrorDescription (err) {
	let result = '';
	if ('stack' in err) {
		result += err.stack;
	}
	else {
		result += err.message;
		if ('fileName' in err) {
			result += ' at ' + err.fileName;
		}
		if ('lineNumber' in err) {
			result += ':' + err.lineNumber;
		}
	}
	return result;
}

export async function load (url, options = {}, type) {
	let response;

	try {
		response = await fetch(url, options);
	}
	catch (err) {
		// network error (network down, dns lookup failed...)
		return {error: 'network error: ' + getErrorDescription(err)};
	}

	if (!response.ok) {
		// server error (server down, not found...)
		return {error: `server error: ${response.statusText} (${response.status})`};
	}

	try {
		const headers = {};
		for (let h of response.headers) {
			headers[h[0].toLowerCase()] = h[1];
		}

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

		return {content, headers};
	}
	catch (err) {
		// response error (invalid json...)
		return {error: 'response error: ' + getErrorDescription(err)};
	}
}

export function substringWithStrictUnicode (s, maxLength = 100, minLength = 10) {
	const LENGTH_MAX_IN_UTF8 = 200;
	const LENGTH_MAX_IN_UTF16 = 200;

	const segments = 'Segmenter' in Intl ?
		Array.from((new Intl.Segmenter('ja')).segment(s)).map(seg => seg.segment) :
		[...s];

	for (let length = maxLength; length >= minLength; length--) {
		let tmp = segments.slice(0, length).join('');
		let lengthUTF8 = (new TextEncoder).encode(tmp).byteLength;
		let lengthUTF16 = tmp.length;

		if (lengthUTF8 <= LENGTH_MAX_IN_UTF8 && lengthUTF16 <= LENGTH_MAX_IN_UTF16) {
			s = tmp;
			break;
		}
	}

	return s;
}

export function invokeMousewheelEvent () {
	const view = window.unsafeWindow || window;
	const ev = new WheelEvent('wheel', {
		bubbles: true, cancelable: true, view: view,
		detail: 0, deltaX: 0, deltaY: 0, deltaZ: 0
	});
	document.body.dispatchEvent(ev);
}

export function getBoundingClientRect (element) {
	element = $(element);
	if (element) {
		const r = element.getBoundingClientRect();
		return {
			left: r.left,
			top: r.top,
			right: r.right,
			bottom: r.bottom,
			width: r.width,
			height: r.height
		};
	}
	else {
		return {
			left: 0,
			top: 0,
			right: 0,
			bottom: 0,
			width: 0,
			height: 0
		};
	}
}

export function voice (s, semiVoiced = false) {
	/*
	 * U+3099 Combining Katakana-Hiragana Voiced Sound Mark
	 * U+309A Combining Katakana-Hiragana Semi-Voiced Sound Mark
	 */
	const voicedMark = semiVoiced ? '\u309a' : '\u3099';
	const kanaPattern = /([あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑをんゟアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲンヿ])([\u3099\u309a])?/g;
	return s.normalize('NFD')
		.replace(
			kanaPattern,
			($0, base, mark) => mark ? base + mark : base + voicedMark)
		.normalize('NFC');
}
