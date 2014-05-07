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
		this.ext.request(
			imageUrl,
			{
				responseType:'blob',
				bind:this
			},
			function (data, status) {
				this.ext.fileSystem.write(localPath, sender, data, {
					mimeType:mimeType,
					mkdir:'auto',
					onresponse:function (data) {data.anchorId = anchorId}
				});
			},
			function (data, status) {
				this.ext.sendRequest(sender, {
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
