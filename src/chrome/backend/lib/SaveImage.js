/**
 * save a image to local file system
 *
 * @author akahuku@gmail.com
 */

(function () {
	'use strict';

	function SaveImage () {
		if (!(this instanceof SaveImage)) {
			return new SaveImage();
		}
		this.ext = require('./kosian/Kosian').Kosian();
	}

	SaveImage.prototype.run = function run (imageUrl, localPath, mimeType, anchorId, sender) {
		var ext = this.ext;
		ext.request(
			imageUrl,
			{
				responseType:'blob'
			},
			function (data, status) {
				ext.fileSystem.write(localPath, sender, data, {
					mimeType:mimeType,
					mkdir:'auto',
					onresponse:function (data) {
						if (!data) return;
						data.anchorId = anchorId;
						ext.postMessage(sender, data);
					}
				});
			},
			function (data, status) {
				ext.postMessage(sender, {
					type:'fileio-write-response',
					error:'cannot load (' + status + ')',
					anchorId:anchorId
				});
			}
		);
	}

	exports.SaveImage = SaveImage;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
