/**
 * save an image to local/online file system
 *
 * @author akahuku@gmail.com
 */

(function () {
	'use strict';

	const LFO_ID_RELEASE = 'dkbdmkncpnepdbaneikhbbeiboehjnol';
	const LFO_ID_DEVELOP = 'igbjeepbgpdcjmpcjgkkfgelekeigbhc';

	function SaveImage (cryptKeyPath) {
		const ext = require('./kosian/Kosian').Kosian();

		let fs;

		/*
		 * private methods
		 */

		function loadConsumerKey () {
			return new Promise(resolve => {
				ext.resource('consumer_keys.bin', binkeys => {
					if (binkeys === false) {
						loadConsumerKeyJson().then(resolve);
					}
					else {
						resolve(binkeys);
					}
				}, {
					noCache: true,
					mimeType: 'text/plain;charset=x-user-defined',
				});
			});
		}

		function loadConsumerKeyJson () {
			return new Promise(resolve => {
				ext.resource('consumer_keys.json', textkeys => {
					if (textkeys === false) {
						throw new Error('!ERROR: Failed to load consumer_keys.json');
					}
					else {
						resolve(textkeys);
					}
				}, {noCache: true});
			});
		}

		function decrypt (consumerKeys) {
			return new Promise(resolve => {
				ext.resource(cryptKeyPath, cryptKey => {
					if (cryptKey === false) {
						throw new Error(`!ERROR: Failed to load crypt key file from ${cryptKeyPath}`);
					}

					const Blowfish = require('./kosian/Blowfish').Blowfish;
					const SHA1 = require('./kosian/SHA1').SHA1;

					const cryptKeyHash = SHA1.calc(cryptKey);
					const bf = new Blowfish(cryptKeyHash.substring(0, 16));

					if (consumerKeys.charAt(0) == '{') {
						/*
						ext.isDev && ext.log(
							'!INFO: crypted code:>>>>' +
							bf.encrypt64(consumerKeys) +
							'<<<<');
						 */
					}
					else{
						consumerKeys = bf.decrypt64(consumerKeys);
					}

					resolve(consumerKeys);
				});
			});
		}

		function getFileSystem () {
			if (fs) {
				return Promise.resolve(fs);
			}

			return loadConsumerKey()
				.then(consumerKeys => decrypt(consumerKeys))
				.then(consumerKeys => {
					consumerKeys = ext.utils.parseJson(consumerKeys, false);
					if (consumerKeys === false) {
						throw new Error('!ERROR: cannot restore consumer keys.');
					}

					const FileSystem = require('./AbstractFileSystem');
					const newfs = new FileSystem;

					for (const scheme in consumerKeys) {
						const data = consumerKeys[scheme];
						newfs.registerDriver(scheme, {
							clientId: data.key,
							clientSecret: data.secret,
							redirectURI: data.callback,
							root: data.root
						});
					}

					return fs = newfs;
				})
		}

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

		/*
		 * public methods
		 */

		function run (imageUrl, localPath, mimeType, anchorId, sender) {
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

			function saveToOnlineStorage (imageBlob) {
				return getFileSystem()
					.then(fs => {
						return fs.save(localPath, imageBlob);
					})
					.then(data => {
						if (!data) {
							throw new Error(`SaveImage#saveToOnlineStorage: data is unavailable`);
						}
						if ('error' in data) {
							throw new Error(`SaveImage#saveToOnlineStorage: ${data.error}`);
						}

						terminate({
							status: 200,
							state: 'complete'
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

			function saveToLocalFileSystem (imageBlob) {
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

			ext.request(
				imageUrl,
				{responseType: 'blob'},
				(imageBlob, status) => {
					const drive = /^([^:]+):/.exec(localPath)[1];

					if (drive == 'local') {
						localPath = localPath.replace(/^([^:]+):\/?/, '');
						saveToLocalFileSystem(imageBlob);
					}
					else {
						saveToOnlineStorage(imageBlob);
					}
				},
				(data, status) => {
					terminate({
						status: 400,
						state: 'error',
						error: `Cannot load image (${status})`,
					});
				}
			);
		}

		function clearCredentials (schemes) {
			return getFileSystem()
				.then(fs => {
					schemes.forEach(scheme => {
						fs.clearCredentials(`${scheme}:`);
					});
				});
		}

		/*
		 * constructor
		 */

		if (!(this instanceof SaveImage)) {
			return new SaveImage(cryptKeyPath);
		}
		else {
			return {
				run: run,
				clearCredentials: clearCredentials
			};
		}
	}

	exports.SaveImage = SaveImage;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
