/*
 * utility functions for reply seach for akahukuplus
 *
 * @author akahuku@gmail.com
 */

export function createQueryCompiler () {
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
		const result = [];
		while (true) {
			const a = and(v);
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
		const result = [];
		while (true) {
			const a = word(v);
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
			const a = or(next());
			v = next();
			if (v != ')') {
				throw new Error('括弧がつり合っていません');
			}
			return `(${a})`;
		}
		else if (v == '-(') {
			const a = or(next());
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
				query = query.substring(1, query.length - 1);
				query = query.replace(/(?<!\\)\^/g, '(?:^|\\t)');
				query = query.replace(/(?<!\\)\$/g, '(?:$|\\t)');
				const regex = new RegExp(query, 'i');
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
				const f = window.Function;
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

export const getLegalizedStringForSearch = (function () {
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

	return s => ('' + s)
		.replace(/[\u200b-\u200f\u202a-\u202e]/g, '')
		.replace(key, $0 => {
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
