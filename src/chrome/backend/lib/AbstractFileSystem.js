(function (global) {

'use strict';

/*
 * OAuth2 core class <<<
 */

function OAuth2BasedOnlineStorage (opts) {
	opts || (opts = {});
	if (!('name' in opts) || typeof opts.name != 'string') {
		throw new Error('name is not defined or not a string');
	}
	if (!('clientId' in opts) || typeof opts.clientId != 'string') {
		throw new Error('clientId is not defined or not a string');
	}
	if (!('clientSecret' in opts) || typeof opts.clientSecret != 'string') {
		throw new Error('clientSecret is not defined or not a string');
	}
	if (!('authorizationEndPoint' in opts) || typeof opts.authorizationEndPoint != 'string') {
		throw new Error('authorizationEndPoint is not defined or not a string');
	}
	if (!('tokenEndPoint' in opts) || typeof opts.tokenEndPoint != 'string') {
		throw new Error('tokenEndPoint is not defined or not a string');
	}
	if (!('redirectURI' in opts) || typeof opts.redirectURI != 'string') {
		throw new Error('redirectURI is not defined or not a string');
	}
	if (!('scope' in opts) || typeof opts.scope != 'string') {
		throw new Error('scope is not defined or not a string');
	}

	if (!('id' in opts) || typeof opts.id != 'function') {
		throw new Error('id handler is not defined or not a function');
	}
	if (!('files' in opts) || typeof opts.files != 'function') {
		throw new Error('files handler is not defined or not a function');
	}
	if (!('load' in opts) || typeof opts.load != 'function') {
		throw new Error('load handler is not defined or not a function');
	}
	if (!('save' in opts) || typeof opts.save != 'function') {
		throw new Error('save handler is not defined or not a function');
	}

	class RetryableError extends Error {}

	const RETRY_MAX = 3;
	const RETRY_INTERVAL_MSECS = 1000;

	const {
		name,
		clientId,
		clientSecret,
		authorizationEndPoint,
		tokenEndPoint,
		redirectURI,
		scope
	} = opts;

	const fs = {
		opts: opts,
		concatPath: concatPath,
		dlog: dlog,
		fetch: (url, fetchOpts) => {
			// url
			if (url instanceof Array) {
				url = concatPath(url);
			}

			// fetchOpts
			fetchOpts = Object.assign({}, fetchOpts);
			if ('headers' in fetchOpts) {
				if (fetchOpts.headers instanceof Headers) {
					fetchOpts.headers.set('Authorization', `Bearer ${accessToken}`);
				}
				else {
					fetchOpts.headers['Authorization'] = `Bearer ${accessToken}`;
				}
			}
			else {
				fetchOpts.headers = {
					'Authorization': `Bearer ${accessToken}`
				};
			}

			return fetch(url, fetchOpts);
		}
	};

	let promise;
	let accessToken;
	let refreshToken;
	let userId;
	let tries = 0;
	let onDebugLog;

	function dlog (message) {
		if (onDebugLog) {
			onDebugLog(message);
		}
	}

	function concatPath (fragments) {
		return fragments.reduce((p, c) => `${p.replace(/\/$/, '')}/${c.replace(/^\//, '')}`);
	}

	function loadTokens () {
		function load (key) {
			return localStorage[key] || undefined;
		}

		accessToken = load(`${opts.name}.accessToken`);
		refreshToken = load(`${opts.name}.refreshToken`);
		userId = load(`${opts.name}.userId`);

		dlog([
			'*** loadTokens ***',
			`accessToken: ${accessToken}`,
			`refreshToken: ${refreshToken}`,
			`userId: ${userId}`
		].join('\n'));
	}

	function saveTokens () {
		dlog([
			'*** saveTokens ***',
			`accessToken: ${accessToken}`,
			`refreshToken: ${refreshToken}`,
			`userId: ${userId}`
		].join('\n'));

		if (typeof accessToken != 'string') {
			dlog(`saveTokens: accessToken ${accessToken} is not a string`);
			throw new Error('saveTokens: accessToken is not a string');
		}
		/*
		if (typeof refreshToken != 'string') {
			dlog(`saveTokens: refreshToken ${refreshToken} is not a string`);
			throw new Error('saveTokens: refreshToken is not a string');
		}
		*/
		if (typeof userId != 'string') {
			dlog(`saveTokens: userId ${userId} is not a string`);
			throw new Error('saveTokens: userId is not a string');
		}

		localStorage[`${opts.name}.accessToken`] = accessToken;
		localStorage[`${opts.name}.refreshToken`] = refreshToken;
		localStorage[`${opts.name}.userId`] = userId;
	}

	function chain (p) {
		if (promise) {
			promise = promise.then(p);
		}
		else {
			promise = p;
		}

		return promise;
	}

	function delay (ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	function startAuthorization () {
		return new Promise((resolve, reject) => {
			dlog('startAuthorization: start');

			const base = authorizationEndPoint.replace(/\?.*/, '');
			const queries = authorizationEndPoint.replace(/^[^?]*\?/, '').split('&');
			const params = new URLSearchParams;

			for (const q of queries) {
				let key, value;

				const index = q.indexOf('=');
				if (index >= 0) {
					key = q.substring(0, index);
					value = q.substring(index + 1);
					value = value.replace(/\{(\w+)\}/g, ($0, $1) => $1 in opts ? opts[$1] : $0);
				}
				else {
					key = q;
					value = '';
				}

				params.append(key, value);
			}

			chrome.tabs.create({url: `${base}?${params.toString()}`}, createdTab => {
				let gotParams;

				function onUpdated (tabId, changeInfo, tab) {
					//dlog(`onUpdated: tab#${tabId} ${JSON.stringify(changeInfo, null, ' ')}`);

					if (tabId == createdTab.id
					&& tab.url.indexOf(redirectURI) == 0
					&& changeInfo.status == 'complete') {
						dlog(`startAuthorization: redirection detected: "${tab.url}"`);
						gotParams = (new URL(tab.url)).searchParams;
						chrome.tabs.remove(tabId);
					}
				}

				function onRemoved (tabId, removeInfo) {
					//dlog(`onRemoved: tab#${tabId} ${JSON.stringify(removeInfo, null, ' ')}`);

					if (tabId == createdTab.id) {
						chrome.tabs.onUpdated.removeListener(onUpdated);
						chrome.tabs.onRemoved.removeListener(onRemoved);

						if (gotParams) {
							if (gotParams.has('code')) {
								const code = gotParams.get('code');
								dlog(`startAuthorization: param and code are available, code: ${code}`);
								tries++;
								resolve({
									code: code
								});
							}
							else if (gotParams.has('error')) {
								let message = gotParams.get('error');
								if (gotParams.has('description')) {
									message += ` (${gotParams.get('description')})`;
								}
								dlog(`startAuthorization: error returned: ${message}`);
								reject(new Error(`startAuthorization: ${message}`));
							}
							else {
								reject(new Error('startAuthorization: Authorization rejected by unknown reason.'));
							}
						}
						else {
							dlog('startAuthorization: param is not available');
							reject(new Error('startAuthorization: Authorization rejected by user.'));
						}
					}
				}

				chrome.tabs.onUpdated.addListener(onUpdated);
				chrome.tabs.onRemoved.addListener(onRemoved);
			});
		});
	}

	function exchangeToken (bag) {
		dlog('exchangeToken: start');

		let params = new URLSearchParams;
		params.append('client_id', clientId);
		params.append('redirect_uri', redirectURI);
		params.append('client_secret', clientSecret);

		if (bag.refresh_token) {
			params.append('refresh_token', bag.refresh_token);
			params.append('grant_type', 'refresh_token');
		}
		else if (bag.code) {
			params.append('code', bag.code);
			params.append('grant_type', 'authorization_code');
		}
		else {
			return Promise.reject(new Error('exchangeToken: Invalid argument, missing refresh_token or code.'));
		}

		return fetch(
			tokenEndPoint,
			{
				method: 'POST',
				credentials: 'omit',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: params.toString()
			}
		)
		.then(response => response.json())
		.then(response => {
			dlog('exchangeToken: ' + JSON.stringify(response, null, '  '));
			if ('refresh_token' in response) {
				refreshToken = response.refresh_token;
			}
			if ('access_token' in response) {
				accessToken = response.access_token;
			}
			if (!accessToken) {
				throw new RetryableError('exchangeToken: Failed to retrieve an access token.');
			}
		});
	}

	function ensureAccessToken () {
		dlog('ensureAccessToken: start');

		if (accessToken) {
			// authorized
			return Promise.resolve();
		}
		else {
			if (refreshToken) {
				// retrieve accessToken from refreshToken
				return exchangeToken({
					refresh_token: refreshToken
				});
			}
			else {
				// retrieve authorization code
				return startAuthorization().then(bag => exchangeToken(bag));
			}
		}
	}

	function doOperation (operationCoreFunction, ...args) {
		return opts.id(fs)
			.then(currentId => {
				if (userId == undefined) {
					userId = currentId;
					tries = 0;
					saveTokens();
				}
				else if (currentId != userId) {
					accessToken = userId = undefined;
					throw new RetryableError('doOperation: user ID mismatch. Retrying.');
				}
			})
			.catch(err => {
				dlog(`Failed to retrieve user's ID.`);
				accessToken = undefined;
				throw new RetryableError(`doOperation: Failed to retrieve user's ID. Retrying.`);
			})
			.then(() => operationCoreFunction.apply(null, args))
			.then(result => {
				tries = 0;
				try {
					const callback = args[args.length - 1];
					callback && callback({
						result: result
					});
				}
				catch (err) {
					console.error(err.stack);
				}
			});
	}

	function doOperationError (err, operationFunction, ...args) {
		if (err instanceof RetryableError && tries < RETRY_MAX) {
			tries++;
			dlog(`retrying #${tries}...`);
			return delay(RETRY_INTERVAL_MSECS * tries).then(() => operationFunction.apply(null, args));
		}
		else {
			dlog('Not retryable error. Stop.');
			tries = 0;
			try {
				const callback = args[args.length - 1];
				callback && callback({
					error: err.message,
					stack: err.stack
				});
			}
			catch (err) {
				console.error(err.stack);
			}
			return undefined;
		}
	}

	/*
	 * operations
	 */

	function files (path, callback) {
		dlog(`files: #${tries} try start`);
		return chain(
			ensureAccessToken()
			.then(() => {
				dlog('files: got access token');
				return doOperation(opts.files, path, fs, callback);
			})
			.catch(err => {
				dlog(`${Object.prototype.toString.call(err)}: Error occured while files(#${tries} try): ${err.stack}`);
				return doOperationError(err, files, path, callback);
			})
		);
	}

	function load (path, callback) {
		dlog(`load: #${tries} try start`);
		return chain(
			ensureAccessToken()
			.then(() => {
				dlog('load: got access token');
				return doOperation(opts.load, path, fs, callback);
			})
			.catch(err => {
				dlog(`${Object.prototype.toString.call(err)}: Error occured while load(#${tries} try): ${err.stack}`);
				return doOperationError(err, load, path, callback);
			})
		);
	}

	function save (path, content, callback) {
		dlog(`save: #${tries} try start`);
		return chain(
			ensureAccessToken()
			.then(() => {
				dlog('save: got access token');
				return doOperation(opts.save, path, content, fs, callback);
			})
			.catch(err => {
				dlog(`${Object.prototype.toString.call(err)}: Error occured while save(#${tries} try): ${err.stack}`);
				return doOperationError(err, save, path, content, callback);
			})
		);
	}

	function clearCredentials () {
		accessToken = refreshToken = userId = undefined;
		tries = 0;

		localStorage.removeItem(`${opts.name}.accessToken`);
		localStorage.removeItem(`${opts.name}.refreshToken`);
		localStorage.removeItem(`${opts.name}.userId`);
	}

	loadTokens();

	return {
		files: files,
		load: load,
		save: save,
		clearCredentials: clearCredentials,
		get onDebugLog () {
			return onDebugLog;
		},
		set onDebugLog (v) {
			if (typeof v == 'function') {
				onDebugLog = v;
			}
			else {
				onDebugLog = undefined;
			}
		}
	};
}
/* >>> */

/*
 * OneDrive (Microsoft Graph v1.0) implementation <<<
 *
 * reference page:
 *   https://docs.microsoft.com/en-us/graph/api/overview?view=graph-rest-1.0
 *   https://developer.microsoft.com/ja-jp/graph/docs/api-reference/v1.0/resources/onedrive
 */

function OneDrive (opts) {
	const opts2 = Object.assign({
		name: 'OneDrive',
		authorizationEndPoint:
			'https://login.microsoftonline.com/common/oauth2/v2.0/authorize' +
			'?client_id={clientId}&scope={scope}&response_type=code&redirect_uri={redirectURI}',
		tokenEndPoint:
			'https://login.microsoftonline.com/common/oauth2/v2.0/token',
		apiEndPoint:
			'https://graph.microsoft.com/v1.0/',
		scope: [
			'offline_access',
			'Files.ReadWrite.AppFolder',
			'User.Read'].join(' '),
		root:
			'/me/drive/root'
	}, opts);
	
	opts2.id = fs => {
		// https://graph.microsoft.com/v1.0/me
		const url = [fs.opts.apiEndPoint, '/me'];
		return fs.fetch(url)
			.then(response => response.json())
			.then(response => {
				if (response && 'id' in response) {
					return response.id;
				}
				else {
					throw new Error(`[${fs.opts.name}] id: Failed to retrieve user's ID`);
				}
			});
	};

	opts2.files = (path, fs) => {
		let url;
		let status;
		let ok;
		let p;

		// root: always a folder
		if (path == '/') {
			// https://graph.microsoft.com/v1.0/me/drive/special/approot/children
			url = [fs.opts.apiEndPoint, fs.opts.root, '/children'];
			p = fs.fetch(url);
		}

		// subfolder: ensure target path is a folder
		else {
			// https://graph.microsoft.com/v1.0/me/drive/special/approot:/path/to/file
			url = [fs.opts.apiEndPoint, `${fs.opts.root}:${path.replace(/\/$/, '')}`];
			p = fs.fetch(url)
				.then(response => {
					status = response.status;
					ok = response.ok;
					return response.json();
				})
				.then(data => {
					fs.dlog(`files pre-phase: ${status} ${ok}, ${JSON.stringify(data, null, '  ')}`);
					if (!ok) {
						throw new Error(`Invalid path (${status}): "${path}"`);
					}
					if (!data) {
						throw new Error(`Unknown data`);
					}
					if (!('folder' in data)) {
						throw new Error(`Path "${path}" is not a folder`);
					}

					// https://graph.microsoft.com/v1.0/me/drive/items/{item-id}/children
					url = [fs.opts.apiEndPoint, `/me/drive/items/${data.id}/children`];
					return fs.fetch(url);
				});
		}

		return p.then(response => {
				status = response.status;
				ok = response.ok;
				return response.json();
			})
			.then(data => {
				fs.dlog(`files: ${status} ${ok}, ${JSON.stringify(data, null, '  ')}`);
				let result;
				if (!ok) {
					result = [];
				}
				else if (data) {
					if ('value' in data) {
						result = data.value.map(item => {
							return {
								name: item.name,
								isDir: 'folder' in item,
								mimeType: 'file' in item && item.file.mimeType || '',
								created: new Date(item.createdDateTime),
								modified: new Date(item.lastModifiedDateTime),
								size: item.size
							};
						});
					}
					else {
						result = [];
					}
				}

				if (result) {
					return result;
				}
				else {
					throw new Error(`[${fs.opts.name}] files: Failed to retrieve children list from ${path}`);
				}
			});
	};

	opts2.load = (path, fs) => {
		let url;
		let status;
		let ok;
		let name;
		let mimeType;

		// root: always be error
		if (path == '/') {
			throw new Error(`[${fs.opts.name}] load: Root is not a file`);
		}

		// https://graph.microsoft.com/v1.0/me/drive/special/approot:/path/to/file
		url = [fs.opts.apiEndPoint, `${fs.opts.root}:${path.replace(/\/$/, '')}`];
		return fs.fetch(url)
			.then(response => {
				status = response.status;
				ok = response.ok;
				return response.json();
			})
			.then(data => {
				fs.dlog(`load pre-phase: ${status} ${ok}, ${JSON.stringify(data, null, '  ')}`);
				if (!ok) {
					throw new Error(`Invalid path (${status}): "${path}"`);
				}
				if (!data) {
					throw new Error(`Unknown data`);
				}
				if (!('file' in data)) {
					throw new Error(`Path "${path}" is not a file`);
				}

				// https://graph.microsoft.com/v1.0/me/drive/items/{item-id}/content
				url = [fs.opts.apiEndPoint, `/me/drive/items/${data.id}/content`];
				name = data.name;
				mimeType = data.file.mimeType;
				return fs.fetch(url);
			})
			.then(response => {
				status = response.status;
				ok = response.ok;

				if (response.ok) {
					return response.arrayBuffer();
				}
				else {
					return null;
				}
			})
			.then(data => {
				fs.dlog(`load: ${status} ${ok}`);
				if (ok && data) {
					if (mimeType == 'text/plain') {
						data = (new TextDecoder('UTF-8')).decode(data);
					}
					return {
						name: name,
						mimeType: mimeType,
						content: data
					};
				}
				else {
					throw new Error(`[${fs.opts.name}] load: Failed to retrieve file content from ${path}`);
				}
			});
	};

	opts2.save = (path, content, fs) => {
		// https://graph.microsoft.com/v1.0/me/drive/special/approot:/path/to/file:/content
		const url = [fs.opts.apiEndPoint, `${fs.opts.root}:${path}:/content`];
		const options = {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/octet-stream'
			},
			body: content instanceof Blob ? content : new Blob([content])
		};
		let status;
		let ok;

		return fs.fetch(url, options)
			.then(response => {
				status = response.status;
				ok = response.ok;
				return response.json();
			})
			.then(data => {
				fs.dlog(`save: ${status} ${ok}, ${JSON.stringify(data, null, '  ')}`);
				if (ok && data) {
					return true;
				}
				else {
					throw new Error(`[${fs.opts.name}] save: Failed to retrieve save content into ${path}`);
				}
			});
	};

	const storage = new OAuth2BasedOnlineStorage(opts2);

	return {
		files: (path)          => new Promise(resolve => storage.files(path, result => resolve(result))),
		load:  (path)          => new Promise(resolve =>  storage.load(path, result => resolve(result))),
		save:  (path, content) => new Promise(resolve =>  storage.save(path, content, result => resolve(result))),
		clearCredentials: ()   => storage.clearCredentials(),
		get options () {return opts},
		get storage () {return storage}
	};
}
/* >>> */

/*
 * Google Drive v3 implementation <<<
 *
 * reference page:
 *   https://developers.google.com/identity/protocols/OAuth2UserAgent
 */

function GoogleDrive (opts) {
	const opts2 = Object.assign({
		name: 'Google Drive',
		authorizationEndPoint:
			'https://accounts.google.com/o/oauth2/v2/auth' +
			'?client_id={clientId}&scope={scope}&access_type=offline&response_type=code&redirect_uri={redirectURI}',
		tokenEndPoint:
			'https://www.googleapis.com/oauth2/v4/token',
		apiEndPoint:
			'https://www.googleapis.com/drive/v3/',
		uploadApiEndPoint:
			'https://www.googleapis.com/upload/drive/v3/',
		userInfoApiEndPoint:
			'https://www.googleapis.com/userinfo/v2/',
		folderMimeType:
			'application/vnd.google-apps.folder',
		/*
		 * Application akahukuplus needs the following scope:
		 *   - https://www.googleapis.com/auth/drive
		 *     Save the image on the drive. Create folders and create files at this time.

		 *   - https://www.googleapis.com/auth/userinfo.profile
		 *     Acquire the user ID to confirm the authenticated user.
		 */
		scope: [
			'https://www.googleapis.com/auth/drive.file',
			'https://www.googleapis.com/auth/userinfo.profile'].join(' '),
		root:
			'/'
	}, opts);
	
	let rootId = '0AJjJamN9H7uPUk9PVA'; // for drive.file scope
	//let rootId = '';

	function splitPath (path) {
		const regex = /(?:\\.|[^\/])*(?:\/|$)/g;
		const result = [];

		let re;
		let foundLast = false;

		while (!foundLast && (re = regex.exec(path))) {
			foundLast = re[0].substr(-1) != '/';
			let tmp = foundLast ? re[0] : re[0].substr(0, re[0].length - 1);
			tmp = tmp.replace(/\\(.)/g, '$1');
			tmp != '' && result.push(tmp);
		}

		return result;
	}

	function mergeFragmentsAndMetadata (fragments, metadata) {
		if (!metadata) {
			metadata = [];
		}

		const result = [];
		const goal = Math.max(fragments.length, metadata.length);
		for (let i = 0; i < goal; i++) {
			let f, d;
			if (i < fragments.length) {
				f = fragments[i];
			}
			if (i < metadata.length) {
				d = metadata[i];
			}
			result.push({
				fragment: f,
				metadata: d
			});
		}

		return result;
	}

	function getMetadataFromPath (fs, path) {
		const fragments = splitPath(path);
		let ok;
		if (fragments.length == 0) {
			if (rootId == '') {
				// https://www.googleapis.com/drive/v3/files/root
				const url = [fs.opts.apiEndPoint, '/files/root'];

				return fs.fetch(url)
					.then(response => {
						ok = response.ok;
						return response.json();
					})
					.then(response => {
						if (ok && response && !('error' in response)) {
							rootId = response.id;
							return [];
						}
						else {
							fs.dlog(`getMetadataFromPath: Failed to retrieve root id`);
							throw new Error(`[${fs.opts.name}] getMetadataFromPath: Failed to retrieve root id`);
						}
					});
			}
			else {
				return Promise.resolve([]);
			}
		}
		else {
			const params = new URLSearchParams;
			const query = '(' +
				fragments.map(f => `name='${f.replace(/'/g, "\\'")}'`).join(' OR ') +
				') AND trashed=false';
			fs.dlog(`getMetadataFromPath: query: "${query}"`);
			params.append('q', query);
			params.append('fields', 'files(kind,id,name,mimeType,parents)');

			// https://www.googleapis.com/drive/v3/files?q=...&fields=...
			const url = [fs.opts.apiEndPoint, `/files?${params.toString()}`];

			return fs.fetch(url)
				.then(response => {
					ok = response.ok;
					return response.json();
				})
				.then(response => {
					if (ok && response && 'files' in response) {
						return buildPathOrderedMetadata(fragments, response.files);
					}
					else {
						fs.dlog(`getMetadataFromPath: failed`);
						throw new Error(`[${fs.opts.name}] getMetadataFromPath: Failed to retrieve path fragment fields.`);
					}
				});
		}
	}

	function buildPathOrderedMetadata (fragments, items) {
		const result = [];
		let parentId = rootId;

		for (let fragment of fragments) {
			const metadata = items.filter(item => {
				if (parentId === null) {
					return false;
				}
				if (item.name != fragment) {
					return false;
				}
				if (item.parents.indexOf(parentId) < 0) {
					return false;
				}

				return true;
			});

			switch (metadata.length) {
			case 0:
				result.push({
					fragment: fragment
				});
				parentId = null;
				break;

			case 1:
				result.push({
					fragment: fragment,
					metadata: metadata[0]
				});
				parentId = metadata[0].id;
				break;

			default:
				throw new Error(`buildPathOrderedMetadata: multiple path found, fragment: "${fragment}"`);
				return null;
			}
		}

		return result;
	}

	function MultipartFormData (metadata, content) {
		function getMetadataPart (metadata) {
			const m = {};
			for (let i in metadata) {
				if (metadata[i] != undefined) {
					m[i] = metadata[i];
				}
			}
			return JSON.stringify(m);
		}

		function getBoundary () {
			return '----------' +
				Math.floor(Math.random() * 0x80000000).toString(36) + '-' +
				Math.floor(Math.random() * 0x80000000).toString(36) + '-' +
				Math.floor(Math.random() * 0x80000000).toString(36);
		}

		function getFormData () {
			const data = [];

			if (metadata) {
				data.push(
					`--${boundary}\r\n` +
					`Content-Type: application/json;charset=UTF-8\r\n` +
					`\r\n`,
					getMetadataPart(metadata),
					`\r\n`);
			}

			if (content) {
				let contentType;
				if (metadata.mimeType) {
					contentType = metadata.mimeType;
				}
				else if (content instanceof Blob) {
					contentType = 'application/octet-stream';
				}
				else {
					contentType = 'text/plain';
				}

				data.push(
					`--${boundary}\r\n` +
					`Content-Type: ${contentType}\r\n` +
					'\r\n',
					content,
					'\r\n');
			}

			data.push(
				`--${boundary}--\r\n`);

			metadata = content = null;
			return new Blob(data);
		}

		const boundary = getBoundary();
		const result = getFormData();

		Object.defineProperties(this, {
			result: {
				value: result
			},
			boundary: {
				value: boundary
			}
		});
	}

	function generateId (fs) {
		fs.dlog(`generateId start`);

		// https://www.googleapis.com/drive/v3/files/generateIds?count=1
		const url = [fs.opts.apiEndPoint, '/files/generateIds?count=1'];
		let ok;
		return fs.fetch(url)
			.then(response => {
				ok = response.ok;
				return response.json();
			})
			.then(response => {
				if (ok && response && !('error' in response)) {
					return response;
				}
				else {
					fs.dlog(`generateId: failed: ${JSON.stringify(response, null, '  ')}`);
					throw new Error(`[${fs.opts.name}] createFile: Failed to create file "${name}"`);
				}
			});
	}

	function createFile (fs, parentId, name, content) {
		fs.dlog(`createFile: parentId:"${parentId}" name:"${name}"`);

		if (!parentId) {
			throw new Error('createFile: parentId is unavailable');
		}

		let id;
		return generateId(fs)
			// create metadata
			.then(response => {
				id = response.ids[0];

				// https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable
				const url = [fs.opts.uploadApiEndPoint, '/files?uploadType=resumable'];
				const opts = {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json;charset=UTF-8'
					},
					redirect: 'manual',
					body: JSON.stringify({
						parents: [parentId],
						id: id,
						name: name
					})
				};

				return fs.fetch(url, opts);
			})

			// create contents
			.then(response => {
				if (!response.ok) {
					fs.dlog(`createFile: Failed to create file metadata "${name}"`);
					throw new Error(`[${fs.opts.name}] createFile: Failed to create file metadata "${name}"`);
				}

				const url = response.headers.get('Location');
				const opts = {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/octet-stream'
					},
					body: content instanceof Blob ? content : new Blob([content])
				}

				return fs.fetch(url, opts);
			})

			// termination
			.then(response => {
				if (response.ok) {
					fs.dlog(`createFile: success`);
					return {
						id: id,
						name: name
					};
				}
				else {
					fs.dlog(`createFile: Failed to create file content: ${JSON.stringify(response, null, '  ')}`);
					throw new Error(`[${fs.opts.name}] createFile: Failed to create file content "${name}"`);
				}
			});
	}

	function createFolder (fs, parentId, name) {
		fs.dlog(`createFolder: parentId:"${parentId}" name:"${name}"`);

		if (!parentId) {
			throw new Error('createFolder: parentId is unavailable');
		}

		// https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
		const url = [fs.opts.uploadApiEndPoint, '/files?uploadType=multipart'];
		const body = new MultipartFormData({
			parents: [parentId],
			mimeType: fs.opts.folderMimeType,
			name: name
		});
		const opts = {
			method: 'POST',
			headers: {
				'Content-Type': `multipart/related;boundary="${body.boundary}"`
			},
			body: body.result
		};
		let ok;
		return fs.fetch(url, opts)
			.then(response => {
				ok = response.ok;
				return response.json();
			})
			.then(response => {
				if (ok && response && !('error' in response)) {
					return response;
				}
				else {
					fs.dlog(`createFolder: Failed to create folder "${name}"`);
					throw new Error(`[${fs.opts.name}] createFolder: Failed to create folder "${name}"`);
				}
			});
	}

	function updateContent (fs, id, content) {
		fs.dlog(`updateContent: id:${id}`);

		if (!id) {
			throw new Error('updateContent: id is unavailable');
		}

		// https://www.googleapis.com/upload/drive/v3/files/...?uploadType=media
		const url = [fs.opts.uploadApiEndPoint, `/files/${id}?uploadType=media`];
		const opts = {
			method: 'PATCH',
			headers: {
				'Contene-Type': 'application/octet-stream'
			},
			body: content instanceof Blob ? content : new Blob([content])
		};
		let ok;
		return fs.fetch(url, opts)
			.then(response => {
				ok = response.ok;
				return response.json();
			})
			.then(response => {
				if (ok && response && !('error' in response)) {
					return response;
				}
				else {
					fs.dlog(`createContent: failed: ${JSON.stringify(response, null, '  ')}`);
					throw new Error(`[${fs.opts.name}] updateContent: Failed to update content`);
				}
			});
	}

	opts2.id = fs => {
		let ok;
		return getMetadataFromPath(fs, '/')
			.then(data => {
				// https://www.googleapis.com/userinfo/v2/me?fields=id
				const url = [fs.opts.userInfoApiEndPoint, 'me?fields=id'];
				return fs.fetch(url)
			})
			.then(response => {
				ok = response.ok;
				return response.json();
			})
			.then(response => {
				if (ok && response && !('error' in response)) {
					return response.id;
				}
				else {
					fs.dlog(`id: failed to retrieve user's ID`);
					throw new Error(`[${fs.opts.name}] id: Failed to retrieve user's ID`);
				}
			});
	};

	opts2.files = (path, fs) => {
		let ok;
		return getMetadataFromPath(fs, fs.concatPath([fs.opts.root, path]))
			.then(data => {
				if (data.length) {
					if ('metadata' in data[data.length - 1]) {
						if (data[data.length - 1].metadata.mimeType != fs.opts.folderMimeType) {
							throw new Error(`[${fs.opts.name}] files: Path "${path}" is not a folder.`);
						}
					}
					else {
						throw new Error(`[${fs.opts.name}] files: Path "${path}" does not exist.`);
					}
				}

				const parentId = data.length ? data[data.length - 1].metadata.id : 'root';
				const params = new URLSearchParams;
				const query = `'${parentId}' in parents AND trashed=false`;
				fs.dlog(`files: query: "${query}"`);
				params.append('q', query);
				params.append('fields', 'files(kind,id,name,mimeType,createdTime,modifiedTime,size)');

				// https://www.googleapis.com/drive/v3/files?q=...&fields=...
				const url = [fs.opts.apiEndPoint, `/files?${params.toString()}`];

				return fs.fetch(url);
			})
			.then(response => {
				ok = response.ok;
				return response.json();
			})
			.then(response => {
				if (ok && response && 'files' in response) {
					return response.files.map(item => {
						return {
							name: item.name,
							isDir: item.mimeType == fs.opts.folderMimeType,
							mimeType: item.mimeType == fs.opts.folderMimeType ? '' : item.mimeType,
							created: new Date(item.createdTime),
							modified: new Date(item.modifiedTime),
							size: item.size
						};
					});
				}
				else {
					fs.dlog(`files: failed`);
					throw new Error(`[${fs.opts.name}] files: Failed to retrieve children list from ${path}`);
				}
			});
	};

	opts2.load = (path, fs) => {
		let ok;
		let name;
		let mimeType;
		return getMetadataFromPath(fs, fs.concatPath([fs.opts.root, path]))
			.then(data => {
				if (!data || data.length == 0) {
					throw new Error(`[${fs.opts.name}] load: Invalid path "${path}"`);
				}

				if (!('metadata' in data[data.length - 1])) {
					throw new Error(`[${fs.opts.name}] load: Invalid Path "${path}"`);
				}

				if (data[data.length - 1].metadata.mimeType == fs.opts.folderMimeType) {
					throw new Error(`[${fs.opts.name}] load: Path "${path}" is not a file.`);
				}

				const metadata = data[data.length - 1].metadata;
				name = metadata.name;
				mimeType = metadata.mimeType;

				// https://www.googleapis.com/drive/v3/files/...?alt=media
				const url = [fs.opts.apiEndPoint, `/files/${metadata.id}?alt=media`];
				return fs.fetch(url);
			})
			.then(response => {
				ok = response.ok;

				if (response.ok) {
					return response.arrayBuffer();
				}
				else {
					return null;
				}
			})
			.then(data => {
				if (ok && data) {
					if (mimeType == 'text/plain') {
						data = (new TextDecoder('UTF-8')).decode(data);
					}
					return {
						name: name,
						mimeType: mimeType,
						content: data
					};
				}
				else {
					fs.dlog(`load: failed`);
					throw new Error(`[${fs.opts.name}] load: Failed to retrieve file content from ${path}`);
				}
			});
	};

	opts2.save = (path, content, fs) => {
		return getMetadataFromPath(fs, fs.concatPath([fs.opts.root, path]))
			.then(data => {
				return data.reduce((prev, current, index) => {
					// exist folder or file
					if (current.metadata) {
						if (index == data.length - 1) {
							// last fragment: overwrite exist file
							return prev.then(() => {
								fs.dlog(`*** #${index} "${current.metadata.name}": last fragment: overwrite exist file.`);

								if (current.metadata.mimeType == fs.opts.folderMimeType) {
									throw new Error(`[${fs.opts.name}] save: Path "${path}" is not a file.`);
								}

								return updateContent(fs, current.metadata.id, content);
							});
						}
						else {
							// exist path fragment: do nothing
							return prev.then(() => {
								fs.dlog(`*** #${index} "${current.metadata.name}": exist path fragment: do nothing.`);
								return current.metadata;
							});
						}
					}

					// nonexist folder or file
					else {
						if (index == data.length - 1) {
							// last fragment: create new file
							return prev.then(prevMetadata => {
								fs.dlog(`*** #${index} "${current.fragment}": nonexist last fragment: create new file.`);
								return createFile(fs, prevMetadata.id, data[index].fragment, content);
							});
						}
						else {
							// nonexist path fragment: mkdir
							return prev.then(prevMetadata => {
								if (prevMetadata) {
									fs.dlog(`*** #${index} "${current.fragment}" nonexist path fragment: create folder.`);

									// mkdir on sub directory
									return createFolder(fs, prevMetadata.id, current.fragment)
										.then(metadata => {
											data[index].metadata = metadata;
											return metadata;
										});
								}
								else {
									fs.dlog(`*** #${index} "${current.fragment}" nonexist path fragment: create folder onto root.`);

									// mkdir on root
									return createFolder(fs, 'root', current.fragment)
										.then(metadata => {
											data[index].metadata = metadata;
											return metadata;
										});
								}
							});
						}
					}
				}, Promise.resolve());
			});
	};

	const storage = new OAuth2BasedOnlineStorage(opts2);

	return {
		files: (path)          => new Promise(resolve => storage.files(path, result => resolve(result))),
		load:  (path)          => new Promise(resolve =>  storage.load(path, result => resolve(result))),
		save:  (path, content) => new Promise(resolve =>  storage.save(path, content, result => resolve(result))),
		clearCredentials: ()   => storage.clearCredentials(),
		buildPathOrderedMetadata: buildPathOrderedMetadata,
		get options () {return opts},
		get storage () {return storage}
	};
}
/* >>> */

/*
 * Dropbox v2 implementation <<<
 *
 * reference page:
 *   https://www.dropbox.com/developers/documentation/http/documentation
 */

function Dropbox (opts) {
	const opts2 = Object.assign({
		name: 'Dropbox',
		authorizationEndPoint:
			'https://www.dropbox.com/oauth2/authorize' +
			'?client_id={clientId}&response_type=code&redirect_uri={redirectURI}&locale={locale}',
		tokenEndPoint:
			'https://api.dropboxapi.com/oauth2/token',
		apiEndPoint:
			'https://api.dropboxapi.com/2/',
		contentApiEndPoint:
			'https://content.dropboxapi.com/2/',
		scope:
			'',
		root:
			'/',
		locale:
			navigator.languages[0]
	}, opts);

	function json2header (obj) {
		return JSON.stringify(obj)
			.replace(/[\u007f-\uffff]/g, $0 => '\\u' + ('0000' + $0.charCodeAt(0).toString(16)).substr(-4));
	}

	opts2.id = fs => {
		// https://api.dropboxapi.com/2/users/get_current_account
		const url = [fs.opts.apiEndPoint, '/users/get_current_account'];
		const opts = {
			method: 'POST'
		};
		return fs.fetch(url, opts)
			.then(response => response.json())
			.then(response => {
				if (response && 'account_id' in response) {
					return response.account_id;
				}
				else {
					throw new Error(`[${fs.opts.name}] id: Failed to retrieve user's ID`);
				}
			});
	};

	opts2.files = (path, fs) => {
		const result = [];

		function main (cursor) {
			// https://api.dropboxapi.com/2/files/list_folder
			// https://api.dropboxapi.com/2/files/list_folder/continue
			const url = [fs.opts.apiEndPoint];
			const opts = {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json;charset=UTF-8'
				}
			};
			let ok;

			if (cursor) {
				url.push('/files/list_folder/continue');
				opts.body = JSON.stringify({
					cursor: cursor
				});
			}
			else {
				url.push('/files/list_folder');
				opts.body = JSON.stringify({
					path: fs.concatPath([fs.opts.root, path])
				});
			}

			return fs.fetch(url, opts)
				.then(response => {
					ok = response.ok;
					return response.json();
				})
				.then(response => {
					if (ok && response && !('error' in response) && 'entries' in response) {
						result.push.apply(result, response.entries.map(item => {
							let mimeType = 'application/octet-stream';

							if (/\.txt$/.test(item.name)) {
								mimeType = 'text/plain';
							}

							return {
								name: item.name,
								isDir: item['.tag'] == 'folder',
								mimeType: mimeType,
								created: null,
								modified: new Date(item.server_modified),
								size: item.size
							};
						}));
						if (response.has_more) {
							return main(response.cursor);
						}
						else {
							return result;
						}
					}
					else {
						fs.dlog(`files: failed`);
						throw new Error(`[${fs.opts.name}] files: Failed to retrieve children list from ${path}`);
					}
				})
		}

		return main();
	};

	opts2.load = (path, fs) => {
		// https://content.dropboxapi.com/2/files/download
		const url = [fs.opts.contentApiEndPoint, '/files/download'];
		const opts = {
			method: 'POST',
			headers: {
				'Dropbox-API-Arg': json2header({
					path: fs.concatPath([fs.opts.root, path])
				})
			}
		}
		let ok;
		let metadata;
		return fs.fetch(url, opts)
			.then(response => {
				ok = response.ok;
				metadata = JSON.parse(response.headers.get('Dropbox-API-Result'));
				return response.arrayBuffer();
			})
			.then(response => {
				if (ok) {
					let mimeType = 'application/octet-stream';

					if (/\.txt$/.test(metadata.name)) {
						mimeType = 'text/plain';
						response = (new TextDecoder('UTF-8')).decode(response);
					}

					return {
						name: metadata.name,
						mimeType: mimeType,
						content: response
					};
				}
				else {
					throw new Error(`[${fs.opts.name}] load: Failed to retrieve file content from ${path}`);
				}
			});
	};

	opts2.save = (path, content, fs) => {
		// https://content.dropboxapi.com/2/files/upload
		const url = [fs.opts.contentApiEndPoint, '/files/upload'];
		const opts = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/octet-stream',
				'Dropbox-API-Arg': json2header({
					path: fs.concatPath([fs.opts.root, path]),
					mode: 'overwrite'
				})
			},
			body: content instanceof Blob ? content : new Blob([content])
		}
		let ok;
		let metadata;
		return fs.fetch(url, opts)
			.then(response => {
				ok = response.ok;
				return response.json();
			})
			.then(response => {
				if (ok && response && !('error' in response)) {
					return {
						name: response.name,
						isDir: false,
						mimeType: '',
						created: null,
						modified: new Date(response.server_modified),
						size: response.size
					};
				}
				else {
					throw new Error(`[${fs.opts.name}] load: Failed to retrieve file content from ${path}`);
				}
			});
	};

	const storage = new OAuth2BasedOnlineStorage(opts2);

	return {
		files: (path)          => new Promise(resolve => storage.files(path, result => resolve(result))),
		load:  (path)          => new Promise(resolve =>  storage.load(path, result => resolve(result))),
		save:  (path, content) => new Promise(resolve =>  storage.save(path, content, result => resolve(result))),
		clearCredentials: ()   => storage.clearCredentials(),
		get options () {return opts},
		get storage () {return storage}
	};
}
/* >>> */

/*
 * Facade class <<<
 */

function FileSystem (initialScheme, initialOpts) {
	const instances = {};

	let defaultScheme;
	let debug = false;

	function splitSchemeAndPath (path) {
		const re = /^(?:([^:]+):)?(.*)/.exec(path);
		return {
			scheme: re[1] || defaultScheme,
			path: re[2]
		};
	}

	function call (method, args) {
		const clonedArgs = args.slice();
		const {scheme, path} = splitSchemeAndPath(clonedArgs[0]);
		const instance = getDriverInstance(scheme);
		clonedArgs[0] = path;
		return instance[method].apply(instance, clonedArgs);
	}

	function handleDebugLog (message) {
		console.log(message);
	}

	/*
	 * public functions
	 */

	function getDriverInstance (scheme) {
		if (!scheme || scheme == '') {
			throw new Error(`FileSystem: getDriverInstance: Invalid scheme.`);
		}

		if (!(scheme.toLowerCase() in instances)) {
			throw new Error(`FileSystem: getDriverInstance: Unknown scheme "${scheme}".`);
		}

		return instances[scheme.toLowerCase()];
	}

	function setDefaultScheme (scheme) {
		if (typeof scheme != 'string') {
			throw new Error(`FileSystem: setDefaultScheme: Not a string.`);
		}

		if (scheme == '') {
			throw new Error(`FileSystem: setDefaultScheme: Empty scheme.`);
		}

		defaultScheme = scheme;
	}

	function setDebugFlag (value) {
		debug = !!value;
		for (const i in instances) {
			if (debug) {
				instances[i].storage.onDebugLog = handleDebugLog;
			}
			else {
				instances[i].storage.onDebugLog = null;
			}
		}
	}

	function registerDriver (scheme, opts) {
		if (typeof scheme != 'string') {
			throw new Error(`FileSystem: registerDriver: Not a string.`);
		}

		if (scheme == '') {
			throw new Error(`FileSystem: registerDriver: Empty scheme.`);
		}

		scheme = scheme.toLowerCase();

		switch (scheme) {
		case 'onedrive':
			instances[scheme] = new OneDrive(opts);
			break;

		case 'googledrive':
			instances[scheme] = new GoogleDrive(opts);
			break;

		case 'dropbox':
			instances[scheme] = new Dropbox(opts);
			break;

		default:
			throw new Error(`FileSystem: registerDriver: Unknown scheme: "${scheme}".`);
		}
	}

	function files (...args) {
		return call('files', args);
	}

	function load (...args) {
		return call('load', args);
	}

	function save (...args) {
		return call('save', args);
	}

	function clearCredentials (...args) {
		return call('clearCredentials', args);
	}

	function init () {
		if (initialScheme && initialScheme != '') {
			registerDriver(initialScheme, initialOpts);
			setDefaultScheme(initialScheme);
		}

		initialScheme = initialOpts = undefined;
	}

	init();

	return {
		get defaultScheme () {
			return defaultScheme;
		},
		set defaultScheme (value) {
			setDefaultScheme(value);
		},
		get debug () {
			return debug;
		},
		set debug (value) {
			setDebugFlag (value);
		},
		driver: getDriverInstance,
		registerDriver: registerDriver,

		files: files,
		load: load,
		save: save,
		clearCredentials: clearCredentials
	};
}

if (typeof module !== 'undefined' && typeof exports !== 'undefined') {
	module.exports = FileSystem;
}
else {
	global.FileSystem = FileSystem;
}

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
