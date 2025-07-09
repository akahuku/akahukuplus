import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Blob} from 'node:buffer';
import {randomUUID} from 'node:crypto';
import child_process from 'node:child_process';

import 'jsdom-global/register.js';
import {tweakPng, tweakJpeg} from '../chrome/lib/utils-apext.js';

function md5 (path) {
	const result = child_process.execFileSync('/usr/bin/md5sum', ['-z', path])
		.toString()
		.split('\x00');
	return result[0];
}

describe('tweakPng', () => {
	it('crc32forPng', () => {
		assert.equal(tweakPng.crc32('IEND'), 0xAE426082);
	});

	it('tweakPng', async () => {
		const files = [
			'1477681.png',
			'aura.apng'
		];

		for (const file of files) {
			const sourcePath = `/home/akahuku/picture/${file}`;
			const destPath = `/run/user/1000/ut.png`;

			const blob = new Blob(
				[await fs.readFile(sourcePath)],
				{type: 'image/png'}
			);
			const result = await tweakPng(blob, {
				log: true,
				returnChunks: true,
				stripExif: true,
				comment: randomUUID()
			});

			assert.ok(Array.isArray(result));

			const blob2 = new Blob(result, {type: 'image/png'});
			const result2 = await tweakPng(blob2, {
				returnChunks: true
			});

			await fs.writeFile(destPath, blob2.stream());

			const md5_1 = md5(sourcePath);
			const md5_2 = md5(destPath);

			assert.notEqual(md5_1, md5_2);
		}
	});
});

describe('tweakJpeg', () => {
	it('tweakJpeg', async () => {
		const files = [
			'きのこを喰らうめるみちゃん.jpg',
			/*
			'田園のはらこ飯 ほっき飯 かき飯.jpg',
			'鯖.jpg',
			'1530028532701.jpg',
			'1573172361357.jpg',
			'1600599108559.jpg'
			*/
		];

		for (const file of files) {
			const sourcePath = `/home/akahuku/picture/${file}`;
			const destPath = `/run/user/1000/ut.jpg`;

			const blob = new Blob(
				[await fs.readFile(sourcePath)],
				{type: 'image/jpeg'}
			);
			const result = await tweakJpeg(blob, {
				log: true,
				returnChunks: true,
				stripExif: true,
				comment: randomUUID()
			});

			assert.ok(Array.isArray(result));

			const blob2 = new Blob(result, {type: 'image/jpeg'});
			const result2 = await tweakJpeg(blob2, {
				log: true,
				returnChunks: true
			});

			await fs.writeFile(destPath, blob2.stream());

			const md5_1 = md5(sourcePath);
			const md5_2 = md5(destPath);

			assert.notEqual(md5_1, md5_2);
		}
	});
});


