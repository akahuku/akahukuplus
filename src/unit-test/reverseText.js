import assert from 'node:assert/strict';

import {reverseText} from '../chrome/lib/utils-apext.js';

describe('reverseText', () => {
	it('reverseText', () => {
		const src = `\
この作品ゆるいギャグが本当に好きストーリー進行の邪魔にならないけどクスッと笑っちゃう感じ
軟禁されてる晶子助けに行ったらもう逃げ出す準備万全になってるのなんのツッコミも入らず流されてるとこ好き
Debianには大量のパッケージが収録されているが、なかには長期間にわたってメンテナンスされていないものも少なくない。そうしたパッケージの扱いについて、Debian開発者のひとりであるHelmut Grohneがより多くの該当パッケージをunstableから削除することを提案したことが最初のきっかけとなっている。`;

		const result = reverseText(src);
		assert.equal(result, `\
じ感うゃちっ笑とッスクどけいならなに魔邪の行進ーリートスき好に当本がグャギいるゆ品作のこ
き好ことるてれさ流ずら入もミコッツのんなのるてっなに全万備準す出げ逃うもらたっ行にけ助子晶るてれさ禁軟
。いなくな少ものもいないてれさスンナテンメてったわに間期長はにかな、がるいてれさ録収がジーケッパの量大はにnaibeD。るいてっなとけかっきの初最がとこたし案提をとこるす除削らかelbatsnuをジーケッパ当該のく多りよがenhorG tumleHるあでりとひの者発開naibeD、ていつにい扱のジーケッパたしうそ`);
	});
});

