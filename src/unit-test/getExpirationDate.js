import assert from 'node:assert/strict';

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
			/*if (h != undefined && h < fromDate.getHours() && D == undefined) {
				D = fromDate.getDate() + 1;
			}*/
			// 31日 -> 1日頃消えます: treat as next month
			if (D != undefined && D < fromDate.getDate() && M == undefined) {
				M = fromDate.getMonth() + 1;
			}
			// 12月 -> 1月頃消えます: treat as next year
			if (M != undefined && M < fromDate.getMonth() && Y == undefined) {
				Y = fromDate.getFullYear() + 1;
			}

			//
			expireDate = new Date(
				Y == undefined ? fromDate.getFullYear() : Y,
				M == undefined ? fromDate.getMonth() : M,
				D == undefined ? fromDate.getDate() : D,
				h == undefined ? fromDate.getHours() : h,
				m == undefined ? fromDate.getMinutes() : m
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
				expireDateString = 'まもなく';
			}
			else {
				if (/日/.test(remainsString[0]) && remainsString.length > 1) {
					remainsString[0] += 'と';
				}

				expireDateString = `あと${remainsString.join('')}くらい`;
			}
		}

		return {
			base: fromDate,
			at: expireDate,
			string: expireDateString
		};
	}

describe('getExpirationDate', () => {
	it('年またぎ', () => {
		var now = new Date('2018-12-31 23:00:00');
		var result = getExpirationDate('2日9:10頃消えます', now);
		assert.equal(result.string, 'あと1日と10時間10分くらい');
	});

	it('月またぎ', () => {
		var now = new Date('2018-08-31 23:00:00');
		var result = getExpirationDate('1日9:10頃消えます', now);
		assert.equal(result.string, 'あと10時間10分くらい');
	});

	it('日またぎ', () => {
		var now = new Date('2018-09-01 23:00:00');
		var result = getExpirationDate('2日01:00頃消えます', now);
		assert.equal(result.string, 'あと2時間くらい');
	});

	it('時刻なし', () => {
		var now = new Date('2018-09-01 14:00:00');
		var result = getExpirationDate('10月22日頃消えます', now);
		assert.equal(result.string, 'あと51日くらい');
	});

	it('時刻だけ', () => {
		var now = new Date('2018-09-02 14:00:00');
		var result = getExpirationDate('15:10頃消えます', now);
		assert.equal(result.string, 'あと1時間10分くらい');
	});

	it('日と分', () => {
		var now = new Date('2018-09-01 14:00:00');
		var result = getExpirationDate('3日14:01頃消えます', now);
		assert.equal(result.string, 'あと2日と1分くらい');
	});

	it('まもなく', () => {
		var now = new Date('2018-09-01 14:00:00');
		var result = getExpirationDate('14:00頃消えます', now);
		assert.equal(result.string, 'まもなく');
	});

	it('ゾンビ', () => {
		var now = new Date('2018-09-01 14:00:00');
		var result = getExpirationDate('12:00頃消えます', now);
		assert.equal(result.string, '?');
	});
});
