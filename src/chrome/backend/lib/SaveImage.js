/**
 * save an image to local/online file system
 *
 * @author akahuku@gmail.com
 */

(function () {
	'use strict';

	const LFO_ID_RELEASE = 'dkbdmkncpnepdbaneikhbbeiboehjnol';
    const LFO_ID_DEVELOP = 'igbjeepbgpdcjmpcjgkkfgelekeigbhc';

	function SaveImage () {
		if (!(this instanceof SaveImage)) {
			return new SaveImage();
		}
		this.ext = require('./kosian/Kosian').Kosian();
	}

	SaveImage.prototype.run = function run (imageUrl, localPath, mimeType, anchorId, sender) {
		let ext = this.ext;
		let drive = /^([^:]+):/.exec(localPath)[1];

		if (drive == 'local') {
			localPath = localPath.replace(/^([^:]+):\/?/, '');
		}

		function saveToOnlineStorage (imageBlob, status) {
			ext.fileSystem.write(localPath, sender, imageBlob, {
				mimeType: 'application/octet-stream',
				mkdir: 'auto',
				onresponse: data => {
					if (!data) return;
					data.anchorId = anchorId;
					ext.postMessage(sender, data);
				}
			});
		}

		function saveToLocalFileSystem (imageBlob, status) {
			function ls (path) {
				return new Promise((resolve, reject) => {
					let re = /(.*[\\\/])([^\\\/]+)$/.exec(path);
					if (!re) {
						reject({error: 'basename not found'});
						return;
					}

					let directory = re[1];
					let basename = re[2];

					chrome.runtime.sendMessage(
						LFO_ID_RELEASE,
						{
							command: 'ls',
							path: directory
						},
						response => {
							if (chrome.runtime.lastError) {
								reject({error: chrome.runtime.lastError});
							}
							else if (response.entries) {
								resolve(response.entries.some(entry => entry.name == basename));
							}
							else {
								resolve(false);
							}
						}
					);
				});
			}

			function blobToDataURL (imageBlob) {
				return new Promise((resolve, reject) => {
					let r = new FileReader;
					r.onload = () => {
						resolve(r.result);
						r = null;
					};
					r.onerror = () => {
						reject({error: 'failed to read the blob'});
						r = null;
					};
					r.readAsDataURL(imageBlob);
				});
			}

			function writep (path, dataURL) {
				return new Promise((resolve, reject) => {
					chrome.runtime.sendMessage(
						LFO_ID_RELEASE,
						{
							command: 'writep',
							path: path,
							content: dataURL,
							type: 'url'
						},
						response => {
							if (chrome.runtime.lastError) {
								reject({error: chrome.runtime.lastError});
							}
							else if (response.error) {
								reject(response);
							}
							else {
								resolve(response);
							}
						}
					);
				});
			}

			function terminate (obj) {
				let payload = {
					anchorId: anchorId,
					type: 'fileio-write-response',
					status: 400,
					state: 'error',
					path: localPath
				};

				Object.assign(payload, obj);

				ext.postMessage(sender, payload);
			}

			return ls(localPath)
				.then(isExist => {
					if (isExist) {
						terminate({
							status: 304,
							state: 'complete'
						});
						return;
					}

					return blobToDataURL(imageBlob)
						.then(dataURL => writep(localPath, dataURL))
						.then(response => {
							terminate({
								status: 200,
								state: 'complete',
							});
						});
				})
				.catch(err => {
					let payload = {
						status: 400,
						state: 'error'
					};

					if (err instanceof Error) {
						payload.error = err.message;
					}
					else {
						payload.error = err.error || 'unknown error';
					}

					console.error(payload.error);
					terminate(payload);
				});
		}

		function saveToLocalFileSystem_ (imageBlob, status) {
			let r = new FileReader;
			r.onload = () => {
				chrome.runtime.sendMessage(
					LFO_ID_RELEASE,
					{
						command: 'writep',
						path: localPath,
						content: r.result,
						type: 'url'
					},
					response => {
						let payload = {
							anchorId: anchorId,
							type: 'fileio-write-response',
							status: 400,
							state: 'error'
						};

						if (chrome.runtime.lastError) {
							payload.error = chrome.runtime.lastError.message;
						}
						else if (response) {
							if (response.error) {
								payload.error = response.error;
							}
							else {
								payload.status = 200;
								payload.state = 'complete';
							}
						}
						else {
							payload.error = 'unknown error';
						}

						ext.postMessage(sender, payload);
						r = null;
					}
				);
			};
			r.onerror = () => {
				let payload = {
					anchorId: anchorId,
					type: 'fileio-write-response',
					status: 400,
					state: 'error'
				};
				ext.postMessage(sender, payload);
				r = null;
			};
			r.readAsDataURL(imageBlob);
		}

		function handleRequestError (data, status) {
			ext.postMessage(sender, {
				type: 'fileio-write-response',
				error: `Cannot load image (${status})`,
				anchorId: anchorId
			});
		}

		switch (drive) {
		case 'local':
			ext.request(
				imageUrl, {responseType: 'blob'},
				saveToLocalFileSystem, handleRequestError);
			break;

		default:
			ext.request(
				imageUrl, {responseType: 'blob'},
				saveToOnlineStorage, handleRequestError);
			break;
		}
	}

	exports.SaveImage = SaveImage;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
