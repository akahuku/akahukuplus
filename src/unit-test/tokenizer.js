import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {default as nodePath} from 'node:path';
import * as url from 'node:url';

import {
	isJapaneseClause, mergeTokens, findTokenIndex, getTokenizer
} from '../chrome/lib/tokenizer.js';

import {
	cursorBackwardWord, cursorForwardWord, setEditorHelperLogger, setTokenizer
} from '../chrome/lib/editor-helper.js';

const dirname = nodePath.dirname(url.fileURLToPath(import.meta.url));

function createTokens (t) {
	let index = 0;
	return t.map(segment => {
		const result = {segment, index, index2: index + segment.length, destructured: isJapaneseClause(segment)};
		index += segment.length;
		return result;
	});
}

async function getEditorHelperForTest () {
	const t = await getTokenizer();
	const editorHelper = {
		async tokenize (s) {
			return t.getClauses(s, true);
		}
	};

	return editorHelper;
}

describe('cursorBackwardWord', function () {
	this.timeout(1000 * 10);

	it('empty string', async () => {
		const editorHelper = await getEditorHelperForTest();
		const result = await cursorBackwardWord.call(editorHelper, 'move', '', 0, 0);
		assert.equal(result.action, 240);
	});

	it('move', async () => {
		//               0      4       8   1011      15  17  19  21
		const content = ' さっき食べてたのだ\n冷凍庫にまだあるのだ';
		const expected = [
		//    0    1   2   3   4   5   6   7   8   9
			240,   0,  1,  1,  1,  4,  4,  4,  4,  8,
			  8, 256, 11, 11, 11, 11, 15, 15, 17, 17,
			 19, 19
		];

		const editorHelper = await getEditorHelperForTest();
		console.dir(editorHelper.tokenize(content));

		for (let i = 0; i < expected.length; i++) {
			let ss = i;
			let se = i;
			const result = await cursorBackwardWord.call(editorHelper, 'move', content, ss, se);
			if (result.action === 254) {
				assert.equal(
					result.ss, expected[i],
					`backward test (position:${i}, expected index:${expected[i]})`);
			}
			else {
				assert.equal(
					result.action, expected[i],
					`backward test (position:${i}, expected index:${expected[i]})`);
			}
		}
	});
});

describe('cursorForwardWord', function () {
	this.timeout(1000 * 10);

	it('empty string', async () => {
		const editorHelper = await getEditorHelperForTest();
		const result = await cursorForwardWord.call(editorHelper, 'move', '', 0, 0);
		assert.equal(result.action, 240);
	});

	it('move', async () => {
		//               0      4       8   1011      15  17  19  21
		const content = ' さっき食べてたのだ\n冷凍庫にまだあるのだ';
		const expected = [
		//    0    1   2   3   4   5   6   7    8    9
			  1,   4,  4,  4,  8,  8,  8,  8, 253, 253,
			255,  15, 15, 15, 15, 17, 17, 19,  19, 253,
			253, 240
		];

		const editorHelper = await getEditorHelperForTest();
		for (let i = 0; i < expected.length; i++) {
			let ss = i;
			let se = i;
			const result = await cursorForwardWord.call(editorHelper, 'move', content, ss, se);
			if (result.action === 254) {
				assert.equal(
					result.ss, expected[i],
					`forward test (position:${i}, expected index:${expected[i]})`);
			}
			else {
				assert.equal(
					result.action, expected[i],
					`forward test (position:${i}, expected index:${expected[i]})`);
			}
		}
	});
});

describe('mergeTokens', () => {
	it('mergeTokens', () => {
		const intlTokens = createTokens([
			'c\'est',
			' ',
			'"',
			'8',
			'月',
			'に',
			'入',
			'っ',
			'た',
			'が',
			'東', '北',
			'は',
			'あ', 'ん', 'ま', 'り',
			'暑',
			'く',
			'な', 'い',
			'と', 'い', 'う',
			'か',
			'む', 'し', 'ろ',
			'涼', 'し', 'い',
			'ｺ', 'ﾝ', 'ﾃ', 'ﾝ', 'ﾂ',
			'"',
			'.',
		]);
		const kuromojiTokens = createTokens([
			'c',
			'\'',
			'est',
			' ',
			'"',
			'8',
			'月に',
			'入ったが',
			'東北は',
			'あんまり',
			'暑くないというか',
			'むしろ',
			'涼しい',
			'ｺﾝﾃﾝﾂ',
			'".',
		]);
		const expectedTokens = createTokens([
			'c\'est',
			' ',
			'"',
			'8',
			'月に',
			'入ったが',
			'東北は',
			'あんまり',
			'暑くないというか',
			'むしろ',
			'涼しい',
			'ｺﾝﾃﾝﾂ',
			'".',
		]).map(t => {
			return {
				segment: t.segment,
				index: t.index,
				index2: t.index2
			};
		});

		const result = mergeTokens(intlTokens, kuromojiTokens);
		assert.deepEqual(result, expectedTokens);
	});
});

describe('findTokenIndex', () => {
	it('forward', () => {
		const tokens = createTokens([
			//    1         4    5                 12          16   17              23
			' ', '邪悪な', ' ', '二次創作だなと', '思ったら', ' ', '原作者だった', ' '
		]).filter(t => t.segment !== ' ');
		const forwardTests = [
			[0, -1],
			[2, 0],
			[4, 0],
			[11, 1],
			[12, 2],
			[16, 2],
			[20, 3],
			[23, 3],
			[50, 3]
		];
		for (const test of forwardTests) {
			assert.equal(
				findTokenIndex(tokens, test[0], true),
				test[1],
				`forward test (position:${test[0]}, expected index:${test[1]})`);
		}
	});

	it('backward', () => {
		const tokens = createTokens([
			//    1         4    5                 12          16   17              23
			' ', '邪悪な', ' ', '二次創作だなと', '思ったら', ' ', '原作者だった', ' '
		]).filter(t => t.segment !== ' ');
		const backwardTests = [
			[0, 0],
			[2, 0],
			[4, 1],
			[11, 1],
			[12, 2],
			[16, 3],
			[20, 3],
			[23, -1],
			[50, -1]
		];
		for (const test of backwardTests) {
			assert.equal(
				findTokenIndex(tokens, test[0], false),
				test[1],
				`backward test (position:${test[0]}, expected index:${test[1]})`);
		}
	});

	it('backword for 2 tokens', () => {
		const tokens = createTokens([
			'おいしい', 'のだ'
		]).filter(t => t.segment !== ' ');
		const backwardTests = [
			[6, -1],
		];
		for (const test of backwardTests) {
			assert.equal(
				findTokenIndex(tokens, test[0], false),
				test[1],
				`backward test (position:${test[0]}, expected index:${test[1]})`);
		}
	});
});

describe('getTokenizer', function () {
	this.timeout(1000 * 10);

	it('getClauses', async () => {
		const tests = [
			{
				test: 'Amaẑon cutting hundreds of Seattle jobs (in its consumer business) -source',
				expect: [
					'Amaẑon', 'cutting', 'hundreds', 'of', 'Seattle', 'jobs',
					'(', 'in', 'its', 'consumer', 'business', ')', '-', 'source',
				]
			},
			{
				test: '第一生命から出向の社員が7万2000人分の契約情報を漏えい。',
				expect: [
					'第一生命から', '出向の', '社員が',
					'7万2000人分の', '契約', '情報を', '漏えい', '。',
				]
			},
			{
				test: 'elle l\'a dit, "8月に入ったが東北はあんまり暑くないというかむしろ涼しいｺﾝﾃﾝﾂ".',
				expect: [
					'elle', 'l\'a', 'dit', ',', '"',
					'8', '月に', '入ったが',
					'東北は', 'あんまり', '暑くないというか',
					'むしろ', '涼しい', 'ｺﾝﾃﾝﾂ', '".',
				]
			},
			{
				test: 'ずんだ嫌いのずん子もありですって明言してるから公式で…',
				expect: [
					'ずんだ', '嫌いの', 'ずん', '子も',
					'ありですって', '明言してるから',
					'公式で', '…'
				]
			}
		];

		const tokenizer = await getTokenizer();

		const testsFiltered = tests.some(t => t.only) ? tests.filter(t => t.only) : tests;
		for (const t of testsFiltered) {
			const tokens = tokenizer.getClauses(t.test, true);
			assert.ok(Array.isArray(tokens));
			assert.deepEqual(tokens.map(t => t.segment), t.expect);
			console.log('"' + tokens.map(t => t.segment).join('", "') + '"');
		}
	});
});

setEditorHelperLogger(s => {console.log(s)});

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
