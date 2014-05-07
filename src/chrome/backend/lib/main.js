/**
 * main of backend
 *
 * @author akahuku@gmail.com
 */

(function (global) {
	'use strict';

	var ext = require('./kosian/Kosian').Kosian(global, {
		appName: 'akahukuplus',
		openBaseUrlPattern: /^https?:\/\/[^.]+\.2chan\.net(?::\d+)?\/[^\/]+\//,
		cryptKeyPath: 'README.md',
		writeDelaySecs: 1,
		fstab: {
			dropbox: {
				isDefault: true,
				enabled: true
			},
			gdrive: {
				enabled: true
			},
			onedrive: {
				enabled: true
			}
		}
	});

	var sjisUtils = require('./SjisUtils').SjisUtils;
	var fetchTweets = require('./FetchTweets').FetchTweets();
	var completeUpfiles = require('./CompleteUpfiles').CompleteUpfiles();
	var saveImage = require('./SaveImage').SaveImage();

	ext.receive(function (command, data, sender, respond) {
		switch (command) {
		case 'iconv':
			respond(sjisUtils.toSjis(data));
			break;
		case 'open':
			ext.openTabWithUrl(data.url, data.selfUrl);
			break;
		case 'get-tweet':
			fetchTweets.run(data.id, respond);
			break;
		case 'complete':
			completeUpfiles.run(data.id, respond);
			break;
		case 'save-image':
			saveImage.run(data.url, data.path, data.mimeType, data.anchorId, sender);
			break;
		}
	});
})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
