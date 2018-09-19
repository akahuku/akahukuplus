/**
 * online storage interface
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2012-2017 akahuku, akahuku@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function () {
	'use strict';

	/*
	 * consts
	 */

	const DEBUG = false;
	const AUTHORIZE_RETRY_MAX = 1;
	const PSEUDO_MIME_DIRECTORY = 'application/x-kosian-directory';
	const PSEUDO_MIME_GENERIC = 'application/octet-stream';
	const u = require('./Utils').Utils;
	const _ = u._;

	/*
	 * vars
	 */

	var writeDelaySecsDefault = 10;

	/*
	 * task queue class
	 */

	function TaskQueue (fs, authorize, ls, read, write) {
		var queue = [];
		var timer;

		function process () {
			timer = null;

			if (queue.length == 0) return;

			var top = queue.shift();
			switch (top.task) {
			case 'authorize':
				if (!fs.needAuthentication || fs.isAuthorized) {
					DEBUG && console.log('TaskQueue#process: nothing to do');
					run();
					break;
				}
				if (top.state == 'error') {
					DEBUG && console.log('TaskQueue#process: error');
					queue.shift();
					authorize(top);
				}
				else {
					DEBUG && console.log('TaskQueue#process: calling authroize');
					queue.unshift(top);
					authorize(top);
				}
				break;
			case 'ls':
				DEBUG && console.log('TaskQueue#process: calling ls');
				ls(top);
				break;
			case 'read':
				DEBUG && console.log('TaskQueue#process: calling read');
				read(top);
				break;
			case 'write':
				DEBUG && console.log('TaskQueue#process: calling write');
				write(top);
				break;
			}
		}

		function pushAuthorizeTask (referencedTask) {
			queue.unshift({
				task: 'authorize',
				state: 'initial-state',
				retryCount: 0,
				tabId: referencedTask && referencedTask.tabId,
				options: referencedTask && referencedTask.options
			});
		}

		function push (task) {
			if (!task) return;

			if (fs.needAuthentication && !fs.isAuthorized) {
				if (queue.length == 0 || queue[0].task != 'authorize') {
					pushAuthorizeTask(task);
				}
				else {
					if (!queue[0].tabId && task.tabId) {
						queue[0].tabId = task.tabId;
					}
					if (!queue[0].options && task.options) {
						queue[0].options = task.options;
					}
				}
			}

			if (task.task != 'authorize') {
				queue.push(task);
			}
		}

		function run (task) {
			push(task);

			if (!timer) {
				timer = u.setTimeout(process, 100);
			}
		}

		function getTopTask () {
			return queue[0];
		}

		function initCredentials (keys, callback) {
			var obj = fs.loadCredentials();

			if (!obj) return;
			//if (keys.some(function (key) {return !(key in obj)})) return;

			pushAuthorizeTask();
			queue[0].state = 'pre-authorized';

			try {
				callback(obj);
			}
			catch (e) {
			}
		}

		fs.ls = function (path, tabId, options) {
			run({
				task: 'ls',
				tabId: tabId,
				path: this.getInternalPath(path),
				options: options || {}
			});
		};
		fs.write = function (path, tabId, content, options) {
			run({
				task: 'write',
				tabId: tabId,
				path: this.getInternalPath(path),
				content: content,
				options: options || {}
			});
		};
		fs.read = function (path, tabId, options) {
			run({
				task: 'read',
				tabId: tabId,
				path: this.getInternalPath(path),
				options: options || {}
			});
		};

		this.initCredentials = initCredentials;
		this.push = push;
		this.run = run;
		this.__defineGetter__('topTask', getTopTask);
	}

	/*
	 * file writing binder class
	 */

	function WriteBinder (fs, writeCore, delaySecs) {
		var writeTimer;
		var writeBuffer = {};

		function handleWriteTimer () {
			writeTimer = null;

			try {
				for (var i in writeBuffer) {
					writeCore(writeBuffer[i]);
				}
			}
			finally {
				writeBuffer = {};
			}
		}

		function write (task) {
			if (!writeTimer) {
				var ds = delaySecs;
				if (task.options
				&& 'delaySecs' in task.options
				&& typeof task.options.delaySecs == 'number') {
					ds = Math.max(0.1, task.options.delaySecs);
				}
				writeTimer = u.setTimeout(handleWriteTimer, 1000 * ds);
			}
			writeBuffer[task.path] = task;
			fs.response(task, {state: 'buffered', path: task.path});
		}

		delaySecs || (delaySecs = writeDelaySecsDefault);
		this.write = write;
	}

	/*
	 * file system base class
	 */

	function FileSystem (extension, options) {
		this.extension = extension;
		options || (options = {});

		var self = this;
		var accessToken = '';
		var refreshToken = '';
		var tokenType = '';
		var uid = '';
		var locale = '';

		var handleError = this.handleError = function (task, status) {
			DEBUG && console.log('handleError: task:' + task.task + ', status:' + status);

			// 400 Bad Request
			// 401 Unauthorized
			// 403 Forbidden
			if ((status == 400 || status == 401 || status == 403) &&
				(refreshToken || task.refreshToken)) {
				if (self.taskQueue.topTask &&
					self.taskQueue.topTask.task == 'authorize' &&
					self.taskQueue.topTask.retryCount >= AUTHORIZE_RETRY_MAX) {
					return false;
				}

				self.isAuthorized = false;
				self.taskQueue.run(task);

				if (refreshToken && !self.taskQueue.topTask.refreshToken) {
					self.taskQueue.topTask.refreshToken = refreshToken;
				}

				self.taskQueue.topTask.state = 'access-token-expired';
				self.taskQueue.topTask.retryCount++;
				accessToken = refreshToken = tokenType = uid = locale = '';
				return true;
			}
			return false;
		};

		var handleAuthError = this.handleAuthError = function (task, message, status) {
			DEBUG && console.log('handleAuthError: task:' + task.task + ', message:' + message + ', status:' + status);

			self.isAuthorized = false;
			accessToken = refreshToken = tokenType = uid = locale = '';

			delete task.accessToken;
			delete task.refreshToken;
			delete task.tokenType;
			delete task.uid;

			if ((status == 400 || status == 401 || status == 403) &&
				task.retryCount < AUTHORIZE_RETRY_MAX) {
				task.state = 'initial-state';
				task.retryCount++;
			}
			else {
				task.state = 'error';
				task.message = message;
			}
			self.taskQueue.run();
		};

		this.authorizeOAuth2 = function (authOpts) {
			/*
			 * task: {
			 *   task: 'authorize',
			 *   state: 'initial-state',
			 *   retryCount: 0,
			 *   tabId: the tab id of related task
			 *   options: the options of related task
			 *
			 *   // set at fetching-authorization-code
			 *   csrfToken:
			 *
			 *   // set at got-code
			 *   code:
			 *
			 *   // set at pre-authorized
			 *   accessToken:
			 *   tokenType:
			 *   refreshToken:
			 *   uid:
			 * }
			 *
			 * authOpts: {
			 *   consumerKey:
			 *   consumerSecret:
			 *   startUrl:
			 *   callbackUrl:
			 *   exchangeUrl:
			 *   validateUrl:
			 *   validateUserIdKey:
			 *   scopes:
			 * }
			 */
			return function authorize (task) {
				if (task.task != 'authorize') {
					return self.handleAuthError(
						task,
						_('Not a authentication task: {0}', task.task));
				}

				DEBUG && console.log('FileSystem#authorize: state: ' + task.state);

				switch (task.state) {
				case 'error':
					self.responseError(task, {
						app_filesystem_error: [task.message || _('Unknown file system error')]
					});
					self.taskQueue.run();
					break;

				case 'initial-state':
					task.state = 'fetching-authorization-code';
					self.response(task, {state: 'authorizing', phase: '1/3'});

					task.csrfToken = Math.floor(Math.random() * 0x80000000).toString(16);

					var params = {
						response_type: 'code',
						client_id: authOpts.consumerKey,
						redirect_uri: authOpts.callbackUrl,
						state: task.csrfToken
					};
					if ('scopes' in authOpts) {
						params.scope = authOpts.scopes.join(' ');
					}

					extension.openTabWithUrl(
						u.getFullUrl(authOpts.startUrl, params),
						null,
						function (id, url) {
							if (task.state != 'fetching-authorization-code') {
								return handleAuthError(
									task,
									_('Invalid authentication state (fat): {0}', task.state));
							}

							// advance the state
							task.state = 'waiting-tab-switch';

							// watch browser tab
							extension.tabWatcher.add(id, authOpts.callbackUrl, function (newUrl) {
								if (task.state != 'waiting-tab-switch') {
									return handleAuthError(
										task,
										_('Invalid authentication state (wts): {0}', task.state));
								}

								extension.closeTab(id);

								if (task.tabId != null) {
									extension.focusTab(task.tabId);
								}

								var q = u.queryToObject(newUrl);
								DEBUG && console.log('FileSystem#authorize: tabwatcher callback: q: ' + JSON.stringify(q));
								if ('error' in q) {
									return handleAuthError(
										task,
										_('Authentication declined: {0}', q.error));
								}
								if (!('state' in q && 'code' in q)) {
									return handleAuthError(
										task,
										_('Invalid authorization response'));
								}

								// ensure csrfToken is valid
								if (q.state != task.csrfToken) {
									return handleAuthError(
										task,
										_('CSRF Token not matched'));
								}

								// advance the state
								task.state = 'got-code';
								task.code = q.code;
								self.taskQueue.run();
								DEBUG && console.log('FileSystem#authorize: state switched to ' + task.state);
							});
						}
					);
					break;

				case 'got-code':
				case 'access-token-expired':
					var param;
					if (task.state == 'got-code') {
						param = {
							code: task.code,
							grant_type: 'authorization_code',
							client_id: authOpts.consumerKey,
							client_secret: authOpts.consumerSecret,
							redirect_uri: authOpts.callbackUrl
						};
					}
					else {
						param = {
							refresh_token: task.refreshToken,
							grant_type: 'refresh_token',
							client_id: authOpts.consumerKey,
							client_secret: authOpts.consumerSecret
						};
					}

					// advance the state
					task.state = 'fetching-access-token';
					self.response(task, {state: 'authorizing', phase: '2/3'});

					extension.request(
						authOpts.exchangeUrl,
						{
							method: 'POST',
							content: param,
							responseType: 'json'
						},
						function (data, status) {
							DEBUG && console.log('FileSystem#authorize: ' + task.state + ' on ' + task.task + ' task succeed: ' + JSON.stringify(data));

							if (task.state != 'fetching-access-token') {
								return handleAuthError(
									task,
									_('Invalid authentication state (eca): {0}', task.state));
							}
							if (status != 200) {
								return handleAuthError(
									task,
									_('Invalid status code #{0}', status));
							}
							if (!('access_token' in data && 'token_type' in data)) {
								return handleAuthError(
									task,
									_('Invalid content response: ' + JSON.stringify(data)));
							}

							// advance the state
							task.state = 'pre-authorized';

							// store access token and token type
							task.accessToken = data.access_token;
							task.tokenType = data.token_type;

							// store refresh token if exists
							if ('refresh_token' in data) {
								task.refreshToken = data.refresh_token;
							}

							// store user id if exists
							if (authOpts.validateUserIdKey in data) {
								task.uid = data[authOpts.validateUserIdKey];
							}

							self.taskQueue.run();
							DEBUG && console.log('FileSystem#authorize: state switched to ' + task.state);
						},
						function () {
							DEBUG && console.log('FileSystem#authorize: ' + task.state + ' on ' + task.task + ' task fail: ' + JSON.stringify(data));

							handleAuthError(task);
						}
					);
					break;

				case 'pre-authorized':
					// advance the state
					task.state = 'fetching-account-info';
					self.response(task, {state: 'authorizing', phase: '3/3'});

					extension.request(
						authOpts.validateUrl,
						{
							method: authOpts.validateMethod || 'POST',
							accessToken: task.accessToken,
							tokenType: task.tokenType,
							responseType: 'json'
						},
						function (data, status) {
							DEBUG && console.log('FileSystem#authorize: ' + task.state + ' on ' + task.task + ' task succeed: ' + JSON.stringify(data));

							if (task.state != 'fetching-account-info') {
								return handleAuthError(
									task,
									_('Invalid authentication state (fai): {0}', task.state));
							}
							if (status != 200) {
								return handleAuthError(
									task,
									_('Invalid status code #{0}', status));
							}

							// validate user ID
							if ('uid' in task) {
								if (!(authOpts.validateUserIdKey in data)
								|| data[authOpts.validateUserIdKey] != task.uid) {
									return handleAuthError(
										task,
										_('User unmatch.'));
								}
							}

							// advance the state
							task.state = 'authorized';
							accessToken = task.accessToken;
							refreshToken = task.refreshToken;
							tokenType = task.tokenType;
							uid = data[authOpts.validateUserIdKey];
							locale = data.locale;

							self.saveCredentials({
								token: accessToken,
								refresh: refreshToken,
								type: tokenType,
								uid: uid
							});

							self.isAuthorized = true;
							self.taskQueue.run();
							DEBUG && console.log('FileSystem#authorize: authorized');
						},
						function (data, status) {
							DEBUG && console.log('FileSystem#authorize: ' + task.state + ' on ' + task.task + ' task fail: ' + JSON.stringify(data));

							if (handleError(task, status)) return;

							handleAuthError(
								task,
								_('Failed to validate access token.'), status);
						}
					);
					break;

				default:
					handleAuthError(
						task,
						_('Invalid authentication state: {0}', task.state));
					break;
				}
			};
		};

		this.request = function (url, opts, success, failure) {
			if (accessToken != '' && tokenType != '') {
				opts || (opts = {});
				if (!('accessToken' in opts)) {
					opts.accessToken = accessToken;
				}
				if (!('tokenType' in opts)) {
					opts.tokenType = tokenType;
				}
			}
			return this.extension.request(url, opts, success, failure);
		};

		this.__defineGetter__('locale', function () {return locale});
		this.__defineGetter__('uid', function () {return uid});
	}

	FileSystem.prototype = {
		backend: '*null*',
		needAuthentication: true,
		isAuthorized: false,
		write: function (path, content, tabId, options) {
			this.response({task: 'write', tabId: tabId, options: options}, {
				error: 'not implemented'
			});
		},
		read: function (path, tabId) {
			this.response({task: 'read', tabId: tabId}, {
				error: 'not implemented'
			});
		},
		ls: function (path, tabId, options) {
			options && this.extension.emit(options.onload, {});
		},
		response: function (task, data) {
			if (!task.options) {
				return;
			}

			var options = task.options;
			var name = typeof options.externalName == 'string' ?
				options.externalName : task.task;

			data.type = 'fileio-' + name + '-response';
			this.extension.emit(options.onresponse, data, task);
		},
		responseError: function (task, data) {
			var errorMessage = false;

			switch (u.objectType(data)) {
			case 'Object':
				if (errorMessage === false && 'text' in data) {
					var jsonData = u.parseJson(data.text);

					switch (u.objectType(jsonData.error)) {
					case 'String':
						errorMessage = [jsonData.error];
						break;

					case 'Object':
						errorMessage = [jsonData.error[Object.keys(jsonData.error)[0]]];
						break;
					}
				}
				if (errorMessage === false && 'status' in data) {
					switch (data.status) {
					case 404:
						errorMessage = _('File not found.');
						break;
					}
				}
				if (errorMessage === false && 'app_filesystem_error' in data) {
					errorMessage = data.app_filesystem_error;
				}
				break;

			case 'Array':
				errorMessage = data;
				break;

			default:
				errorMessage = [data + ''];
				break;
			}

			this.extension.isDev && console.error(
				this.extension.appName + ' background: file system error: ' + errorMessage.join(', '));

			this.response(task, {error: errorMessage});
			task.options && this.extension.emit(task.options.onerror, errorMessage);
		},
		getInternalPath: function (path) {
			var schema = this.backend + ':';
			if (path.indexOf(schema) == 0) {
				path = path.substring(schema.length);
			}
			return path;
		},
		getExternalPath: function (path) {
			if (path.charAt(0) != '/') {
				path = '/' + path;
			}
			return this.backend + ':' + path;
		},
		getPathPrefix: function (fragments, root) {
			var prefix = Array.prototype.slice.call(fragments);
			var rootFragments = u.splitPath(root);
			while (rootFragments.length) {
				rootFragments.shift();
				prefix.shift();
			}
			return prefix;
		},
		match: function (url) {
			return url.indexOf(this.backend + ':') == 0;
		},
		get credentialKeyName () {
			return 'filesystem.' + this.backend + '.tokens';
		},
		saveCredentials: function (data) {
			this.extension.storage.setItem(this.credentialKeyName, data);
		},
		loadCredentials: function () {
			return this.extension.storage.getItem(this.credentialKeyName);
		},
		clearCredentials: function () {
			this.extension.storage.setItem(this.credentialKeyName, undefined);
		}
	};

	/*
	 * file system class for dropbox
	 */

	function FileSystemDropbox (extension, options) {

		/*
		 * privates
		 */

		function getListItem (item) {
			/*
			 * the file list item which this library provides has following structure
			 * (this is based on dropbox metadata v2).
			 *
			 *   name       type    description
			 *   ----       ----    -----------
			 *   name       string  the name of the file/directory
			 *   size       string  a human redable description of the file size
			 *   bytes      number  the size in bytes
			 *   path       string  caonical path to the file or directory
			 *   is_dir     boolean whether the given entry is folder or not.
			 *   is_deleted boolean whether the given entry is deleted (only included
			 *                      if deleted files are being returned)
			 *   id         string  a unique identifier for the current revision of a
			 *                      file. this field is the same rev as elsewhere in
			 *                      the API and can be used to detect changes and avoid
			 *                      conflicts
			 *   modified   Date    the last time the file was modified on a storage
			 *   created    Date    created time
			 *   mime_type  string  MIME type
			 */

			return {
				name:       item.name,
				size:       u.readableSize(item.size || 0),
				bytes:      item.size || 0,
				path:       item.path_display.charAt(0) == '/' ? item.path_display :
																 '/' + item.path_display,
				is_dir:     item['.tag'] == 'folder',
				is_deleted: item['.tag'] == 'deleted',
				id:         item.id,
				modified:   new Date(item.server_modified),
				created:    new Date(item.client_modified || item.server_modified),
				mime_type:  item['.tag'] == 'folder' ? PSEUDO_MIME_DIRECTORY :
													   PSEUDO_MIME_GENERIC
			};
		}

		function getCanonicalPath (path) {
			if (path.substr(-1) == '/') {
				path = path.substring(0, path.length - 1);
			}

			return path;
		}

		/*
		 * tasks
		 */

		function ls (task) {
			var key = fileSystemRoot + task.path;
			var count = 0;
			var result;
			var endpoint;
			var cursor;

			function lsCore () {
				var param = {};

				switch (count) {
				case 0:
					if (key != '/') {
						endpoint = 'files/get_metadata';
						param.path = getCanonicalPath(key);
						break;
					}

					count = 1;
					result = getListItem({
						'.tag': 'folder',
						name: '*root*',
						size: 0,
						path_display: '/',
						id: '*root*',
						server_modified: new Date,
						client_modified: new Date
					});
					/* FALLTHRU */

				case 1:
					endpoint = 'files/list_folder';
					param.path = getCanonicalPath(key);
					break;

				default:
					endpoint = 'files/list_folder/continue';
					param.cursor = cursor;
					break;
				}

				self.request(
					API_BASE_URL + endpoint,
					{
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						content: JSON.stringify(param),
						responseType: 'json'
					},
					function (data, status) {
						if (count++ == 0) {
							result = getListItem(data);
							lsCore();
						}
						else {
							if (result.contents) {
								result.contents.push.apply(
									result.contents, data.entries.map(getListItem));
							}
							else {
								result.contents = data.entries.map(getListItem);
							}

							if (data.has_more) {
								cursor = data.cursor;
								lsCore();
							}
							else {
								self.response(task, {data: result});
								extension.emit(task.options.onload, result);
							}
						}
					},
					function (data, status) {
						DEBUG && console.error('dropbox#ls: ' + JSON.stringify(data));
						if (handleError(task, status)) return;
						self.responseError(task, _('Invalid path.'));
					}
				);
			}

			lsCore();
			taskQueue.run();
		}

		function read (task) {
			self.response(task, {state: 'reading', progress: 0, tag:0});

			self.request(
				API_CONTENT_URL + 'files/download',
				{
					beforesend: function (t) {
						t.onprogress = function (e) {
							if (!e.lengthComputable) return;
							self.response(task, {state: 'reading', progress: e.loaded / e.total, tag:1});
						};
					},
					method: 'POST',
					query: {
						arg: JSON.stringify({
							path: getCanonicalPath(fileSystemRoot + task.path)
						})
					},
					responseType: task.options.responseType || 'text'
				},
				function (data, status, xhr) {
					try {
						var meta = getListItem(u.parseJson(xhr.getResponseHeader('Dropbox-API-Result')));

						if (meta.is_dir) {
							return self.responseError(
								task, _('Cannot read a directory content.')
							);
						}

						meta.path = self.getExternalPath(meta.path);
						self.response(task, {
							state: 'complete',
							status: status,
							content: data,
							meta: meta
						});
					}
					finally {
						taskQueue.run();
					}
				},
				function (data, status) {
					DEBUG && console.error('dropbox#read: ' + JSON.stringify(data));
					if (handleError(task, status)) return;

					self.response(task, {
						state: 'complete',
						status: status || 404,
						meta: {path: task.path}
					});

					taskQueue.run();
				}
			);
		}

		function write (task) {
			self.response(task, {state: 'writing', progress: 0});

			self.request(
				API_CONTENT_URL + 'files/upload',
				{
					beforesend: function (t) {
						if (!t.upload) return;
						t.upload.onprogress = function (e) {
							if (!e.lengthComputable) return;
							self.response(task, {state: 'writing', progress: e.loaded / e.total});
						};
					},
					method: 'POST',
					headers: {'Content-Type': task.options.mimeType || 'application/octet-stream'},
					query: {
						arg: JSON.stringify({
							path: getCanonicalPath(fileSystemRoot + task.path),
							mode: 'overwrite'
						})
					},
					content: task.content,
					responseType: 'json'
				},
				function (data, status) {
					self.response(task, {
						state: 'complete',
						status: status,
						meta: getListItem(data)
					});
					taskQueue.run();
				},
				function (data, status) {
					DEBUG && console.error('dropbox#write: ' + JSON.stringify(data));
					if (handleError(task, status)) return;
					self.responseError(task, _('Failed to save ({0})', status));
					taskQueue.run();
				}
			);
		}

		/*
		 * consts
		 */

		const API_BASE_URL = 'https://api.dropboxapi.com/2/';
		const API_CONTENT_URL = 'https://content.dropboxapi.com/2/';

		/*
		 * init
		 */

		FileSystem.apply(this, arguments);
		this.backend = 'dropbox';

		var self = this;
		var writeBinder = new WriteBinder(this, write);
		var authorize = this.authorizeOAuth2({
			consumerKey: options.key,
			consumerSecret: options.secret,
			startUrl: 'https://www.dropbox.com/oauth2/authorize',
			callbackUrl: options.callback,
			exchangeUrl: 'https://api.dropbox.com/oauth2/token',
			validateUrl: 'https://api.dropboxapi.com/2/users/get_current_account',
			validateUserIdKey: 'account_id'
		});
		var taskQueue = this.taskQueue = new TaskQueue(this, authorize, ls, read, writeBinder.write);
		var handleError = this.handleError;

		var fileSystemRoot = options.root || '';

		taskQueue.initCredentials(
			['token', 'refresh', 'type', 'uid'],
			function (obj) {
				taskQueue.topTask.accessToken = obj.token;
				taskQueue.topTask.refreshToken = obj.refresh;
				taskQueue.topTask.tokenType = obj.type;
				taskQueue.topTask.uid = obj.uid;
			}
		);
	}

	FileSystemDropbox.prototype = Object.create(FileSystem.prototype);
	FileSystemDropbox.prototype.constructor = FileSystemDropbox;

	/*
	 * file system class for Google Drive
	 */

	function FileSystemGDrive (extension, options) {

		/*
		 * privates
		 */

		function buildPathOrderedMetadata (fragments, items) {
			var result;
			var nameHash = {};

			items.forEach(function (item) {
				if (item.title in nameHash) {
					nameHash[item.title].push(item);
				}
				else {
					nameHash[item.title] = [item];
				}
			});

			if (fragments.length >= 1
			&&  fragments[fragments.length - 1] in nameHash
			&&  nameHash[fragments[fragments.length - 1]].some(function (item) {
				result = [item];

				var parentId = item.parents[0].id;
				var foundRoot = item.parents[0].isRoot;
				var cont = true;

				for (var i = fragments.length - 2; cont && i >= 0; i--) {
					cont = fragments[i] in nameHash
					&& nameHash[fragments[i]].some(function (item2) {
						if (item2.id != parentId) return false;
						result.unshift(item2);
						parentId = item2.parents[0].id;
						foundRoot = item2.parents[0].isRoot;
						return true;
					});
				}

				return foundRoot;
			})) {
				return result;
			}

			return null;
		}

		function getMetadataFromPath (path, success, failure) {
			var params = {};
			var fragments = u.splitPath(path);
			if (fragments.length == 0) {
				self.request(
					API_BASE_URL + 'files/root',
					{
						responseType: 'json'
					},
					function (data, status) {
						success(fragments, [data], status);
					},
					function (data, status) {
						failure(fragments, null, status);
					}
				);
			}
			else {
				params.q = '(' +
					fragments
						.map(function (f) {return 'title=\'' + f.replace(/\'/g, '\'') + '\''})
						.join(' OR ') +
					') AND trashed=false';

				self.request(
					API_BASE_URL + 'files',
					{
						responseType: 'json',
						query: params
					},
					function (data, status) {
						var result = buildPathOrderedMetadata(fragments, data.items);

						if (!result) {
							result = buildPathOrderedMetadata(
								Array.prototype.slice.call(fragments, 0, fragments.length - 1),
								data.items
							);
						}

						success(fragments, result || null, status);
					},
					function (data, status) {
						failure(fragments, null, status);
					}
				);
			}
		}

		function getChildren (folderId, success, failure) {
			var params = {
				q: '\'' + folderId + '\' in parents AND trashed=false'
			};
			self.request(
				API_BASE_URL + 'files/',
				{
					responseType: 'json',
					query: params
				},
				function (data, status) {
					success(data.items, status);
				},
				failure
			);
		}

		function mkdirp (path, success, failure) {
			var fragments = u.splitPath(path);

			(function loop (parentId, index) {
				if (index >= fragments.length - 1) {
					success();
					return;
				}

				var query = {
					q: '\'' + parentId + '\' in parents' +
						' AND title=\'' + fragments[index] + '\'' +
						' AND trashed=false'
				};

				self.request(
					API_BASE_URL + 'files/',
					{
						responseType: 'json',
						query: query
					},
					function (data, status) {
						if (data.items.length) {
							loop(data.items[0].id, index + 1);
							return;
						}
						self.request(
							API_BASE_URL + 'files',
							{
								method: 'POST',
								headers: {
									'Content-Type':'application/json'
								},
								content: JSON.stringify({
									parents: [
										{id: parentId}
									],
									mimeType: MIME_TYPE_FOLDER,
									title: fragments[index]
								}),
								responseType: 'json'
							},
							function (data, status) {
								loop(data.id, index + 1);
							},
							failure
						);
					},
					failure
				);
			})('root', 0);
		}

		function getListItem (item, path) {
			return {
				name:       item.title,
				size:       u.readableSize(item.fileSize || 0),
				bytes:      item.fileSize || 0,
				path:       u.joinPath(path, item.title),
				is_dir:     item.mimeType == MIME_TYPE_FOLDER,
				is_deleted: item.labels.trashed,
				id:         item.id,
				modified:   new Date(item.modifiedDate),
				created:    new Date(item.createdDate),
				mime_type:  item.mimeType
			};
		}

		/*
		 * multipart/related handling class
		 */

		function GDriveFileContent (metadata, content) {
			var result;
			var boundary;

			function getMetadataPart (metadata) {
				var m = {};
				for (var i in metadata) {
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

			function main () {
				boundary = getBoundary();

				var data = [];
				data.push(
					'--' + boundary + '\r\n' +
					'Content-Type: application/json;charset=UTF-8\r\n' +
					'\r\n',
					getMetadataPart(metadata),
					'\r\n');
				data.push(
					'--' + boundary + '\r\n' +
					'Content-Type: ' + (metadata.mimeType || 'text/plain;charset=UTF-8') + '\r\n' +
					'\r\n',
					content,
					'\r\n');
				data.push(
					'--' + boundary + '--\r\n');

				result = extension.createBlob(data);
				metadata = content = null;
			}

			main();

			this.__defineGetter__('result', function () {return result});
			this.__defineGetter__('boundary', function () {return boundary});
		}

		/*
		 * tasks
		 */

		function ls (task) {
			getMetadataFromPath(fileSystemRoot + task.path,
				function (fragments, data, status) {
					var prefix = self.getPathPrefix(fragments, fileSystemRoot);

					if (!data || data.length < fragments.length) {
						self.responseError(task, _('Invalid path.'));
						return;
					}

					getChildren(
						data[data.length - 1].id,
						function (items) {
							var result = getListItem(data[data.length - 1], prefix)
							result.path = u.joinPath(prefix);
							result.contents = [];

							for (var i = 0, goal = items.length; i < goal; i++) {
								result.contents.push(getListItem(items[i], prefix));
							}

							self.response(task, {data: result});
							extension.emit(task.options.onload, result);
						},
						function (data, status) {
							if (handleError(task, status)) return;
							self.responseError(task, _('Failed to retrieve directory id.'));
						}
					);
				},
				function (fragments, data, status) {
					if (handleError(task, status)) return;
					self.responseError(task, _('Failed to retrieve path metadata.'));
				}
			);

			taskQueue.run();
		}

		function read (task) {
			self.response(task, {state: 'reading', progress: 0});

			getMetadataFromPath(fileSystemRoot + task.path,
				function (fragments, data, status) {
					// valid path and new file
					if (!data && fragments.length == 1 /* new file on the root directory */
					||  data && data.length < fragments.length /* new file on a sub directoru */
					) {
						self.response(task, {
							state: 'complete',
							status: 404,
							meta: {path: self.getExternalPath(task.path)}
						});
						taskQueue.run();
						return;
					}

					// invalid (non-existent) path
					if (!data) {
						self.responseError(task, _('Invalid path.'));
						taskQueue.run();
						return;
					}

					// valid path and existent file
					var meta = data[data.length - 1];
					if (meta.mimeType == MIME_TYPE_FOLDER) {
						self.responseError(task, _('Cannot read a directory content.'));
						taskQueue.run();
						return;
					}
					/*if (!/^text\//.test(meta.mimeType)) {
						self.responseError(task, _('Unknown MIME type: {0}', meta.mimeType));
						taskQueue.run();
						return;
					}*/
					if (!('downloadUrl' in meta)) {
						self.responseError(task, _('Unable to download.'));
						taskQueue.run();
						return;
					}

					// load...
					self.request(
						meta.downloadUrl,
						{
							beforesend: function (xhr) {
								xhr.onprogress = function (e) {
									if (!e.lengthComputable) return;
									self.response(task, {
										state: 'reading',
										progress: e.loaded / e.total
									});
								};
							},
							responseType: task.options.responseType || 'text'
						},
						function (data, status) {
							var prefix = self.getPathPrefix(fragments, fileSystemRoot);
							prefix.pop();
							self.response(task, {
								state: 'complete',
								status: status,
								content: data,
								meta: getListItem(meta, prefix)
							});
							taskQueue.run();
						},
						function (data, status) {
							if (handleError(task, status)) return;

							self.response(task, {
								state: 'complete',
								status: status || 404,
								meta: {path: self.getExternalPath(task.path)}
							});
							taskQueue.run();
						}
					);
				},
				function (fragments, data, status) {
					if (handleError(task, status)) return;
					self.responseError(task, _('Network Error'));
					taskQueue.run();
				}
			);
		}

		function write (task) {
			function writeCore () {
				self.response(task, {state: 'writing', progress: 0});

				getMetadataFromPath(fileSystemRoot + task.path, function (fragments, data, status) {
					var fileId = '';
					var parentId;
					var mimeType = task.options.mimeType || 'text/plain;charset=UTF-8';
					var method = 'POST';

					// new file on the root directory
					if (!data && fragments.length == 1) {
						parentId = 'root';
					}
					// new file on a sub directory
					else if (data && data.length < fragments.length) {
						parentId = data[data.length - 1].id;
					}
					// invalid (non-existent) path
					else if (!data) {
						if (/^auto$/i.test(task.options.mkdir)) {
							task.options.mkdir = 'force';
							taskQueue.run(task);
						}
						else {
							self.responseError(task, _('Invalid path.'));
							taskQueue.run();
						}
						return;
					}
					// valid and exsitent file
					else {
						if (data[data.length - 1].mimeType == MIME_TYPE_FOLDER) {
							self.responseError(task, _('Cannot overwrite a directory.'));
							taskQueue.run();
							return;
						}
						fileId = '/' + data[data.length - 1].id;
						parentId = data.length >= 2 ? data[data.length - 2].id : 'root';
						mimeType = data[data.length - 1].mimeType;
						method = 'PUT';
					}

					var mp = new GDriveFileContent({
						parents: [{kind: 'drive#file', id: parentId}],
						title: fragments[fragments.length - 1],
						mimeType: mimeType
					}, task.content);

					// save...
					self.request(
						API_UPLOAD_URL + 'files' + fileId,
						{
							method: method,
							query: {uploadType: 'multipart'},
							content: mp.result,
							beforesend: function (xhr) {
								xhr.setRequestHeader(
									'Content-Type',
									'multipart/related;boundary="' + mp.boundary + '"');
								/*xhr.setRequestHeader(
									'Content-Length', mp.result.length);*/
								xhr.upload.onprogress = function (e) {
									if (!e.lengthComputable) return;
									self.response(task, {
										state: 'writing',
										progress: e.loaded / e.total
									});
								};
							},
							responseType: 'json'
						},
						function (data, status) {
							var prefix = self.getPathPrefix(fragments, fileSystemRoot);
							prefix.pop();
							self.response(task, {
								state: 'complete',
								status: status,
								meta: getListItem(data, prefix)
							});
							taskQueue.run();
						},
						function (data, status) {
							if (handleError(task, status)) return;
							self.responseError(task, _('Failed to save ({0})', status));
							taskQueue.run();
						}
					);
				},
				function (fragments, data, status) {
					if (handleError(task, status)) return;
					self.responseError(task, _('Cannot retrieve path metadata'));
					taskQueue.run();
				})
			}

			if (/^force$/i.test(task.options.mkdir)) {
				mkdirp(
					fileSystemRoot + task.path,
					writeCore,
					function (data, status) {
						if (handleError(task, status)) return;
						self.responseError(task, _('Cannot emulate mkdir -p'));
						taskQueue.run();
					}
				);
			}
			else {
				writeCore();
			}
		}

		/*
		 * consts
		 */

		var API_BASE_URL = 'https://www.googleapis.com/drive/v2/';
		var API_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v2/';
		var MIME_TYPE_FOLDER = 'application/vnd.google-apps.folder';

		/*
		 * init
		 */

		FileSystem.apply(this, arguments);
		this.backend = 'gdrive';

		var self = this;
		var writeBinder = new WriteBinder(this, write);
		var authorize = this.authorizeOAuth2({
			consumerKey: options.key,
			consumerSecret: options.secret,
			startUrl: 'https://accounts.google.com/o/oauth2/auth?approval_prompt=force&access_type=offline',
			callbackUrl: options.callback,
			exchangeUrl: 'https://accounts.google.com/o/oauth2/token',
			validateUrl: 'https://www.googleapis.com/userinfo/v2/me?fields=id',
			validateMethod: 'GET',
			validateUserIdKey: 'id',
			scopes: [
				'https://www.googleapis.com/auth/drive',
				'https://www.googleapis.com/auth/userinfo.profile'
			]
		});
		var taskQueue = this.taskQueue = new TaskQueue(this, authorize, ls, read, writeBinder.write);
		var handleError = this.handleError;

		var fileSystemRoot = options.root || '';

		taskQueue.initCredentials(
			['token', 'refresh', 'type', 'uid'],
			function (obj) {
				taskQueue.topTask.accessToken = obj.token;
				taskQueue.topTask.refreshToken = obj.refresh;
				taskQueue.topTask.tokenType = obj.type;
				taskQueue.topTask.uid = obj.uid;
			}
		);
	}

	FileSystemGDrive.prototype = Object.create(FileSystem.prototype);
	FileSystemGDrive.prototype.constructor = FileSystemGDrive;

	/*
	 * file system class for Microsoft OneDrive
	 */

	function FileSystemOneDrive (extension, options) {
		/*
		 * privates
		 */

		var specialRootMap = {
			my_documents:     'me/skydrive/my_documents',
			my_photos:        'me/skydrive/my_photos',
			camera_roll:      'me/skydrive/camera_roll',
			public_documents: 'me/skydrive/public_documents'
		};

		function isFolder (type) {
			return type == 'folder' || type == 'album';
		}

		function getRoot (fragments) {
			return fragments[0] in specialRootMap ?
				specialRootMap[fragments.shift()] : 'me/skydrive';
		}

		function getPathPrefix (fragments, root) {
			var prefix = Array.prototype.slice.call(fragments);
			var rootFragments = u.splitPath(root);
			getRoot(rootFragments);
			while (rootFragments.length) {
				rootFragments.shift();
				prefix.shift();
			}
			return prefix;
		}

		function drillDown (path, mkdirp, success, failure) {
			var fragments = u.splitPath(path);
			var result = [];

			(function loop (endPointFragment, index) {
				if (fragments.length == 0) {
					// new file on the root
					success(fragments, result, status);
					return;
				}

				self.request(
					API_BASE_URL + endPointFragment + '/files',
					{
						responseType: 'json'
					},
					function (data, status) {
						if (!data.data) {
							failure(fragments, null, status);
							return;
						}

						for (var i = 0; i < data.data.length; i++) {
							var f = data.data[i];
							if (f.name != fragments[index]) continue;

							result.push(f);

							if (index >= fragments.length - 1) {
								// valid path
								success(fragments, result, status);
							}
							else if (!isFolder(f.type)) {
								failure(fragments, null, status);
							}
							else {
								loop(f.id, index + 1);
							}
							return;
						}

						if (index >= fragments.length - 1) {
							// new file
							success(fragments, result, status);
							return;
						}

						if (!mkdirp) {
							failure(fragments, null, status);
							return;
						}

						self.request(
							API_BASE_URL + endPointFragment,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								content: JSON.stringify({
									name: fragments[index]
								}),
								responseType: 'json'
							},
							function (data, status) {
								if (!data) {
									failure(fragments, null, status);
									return;
								}
								result.push(data);
								loop(data.id, index + 1);
							},
							function (data, status) {
								failure(fragments, null, status);
							}
						);
					},
					function (data, status) {
						failure(fragments, null, status);
					}
				);
			})(getRoot(fragments), 0);
		}

		function getListItem (item, path) {
			return {
				name:       item.name,
				size:       u.readableSize(item.size || 0),
				bytes:      item.size || 0,
				path:       u.joinPath(path, item.name),
				is_dir:     isFolder(item.type),
				is_deleted: false,
				id:         item.id,
				modified:   u.dateFromW3CDTF(item.updated_time),
				created:    u.dateFromW3CDTF(item.created_time),
				mime_type:  'application/x-onedrive-' + item.type
			};
		}

		/*
		 * tasks
		 */

		function ls (task) {
			function lsCore (dirData, endPointFragment, prefix) {
				var result = getListItem(dirData, prefix);
				result.path = u.joinPath(prefix);

				if (isFolder(dirData.type)) {
					self.request(
						API_BASE_URL + endPointFragment + '/files',
						{ responseType: 'json' },
						function (contentsData, status) {
							result.contents = [];

							for (var i = 0, goal = contentsData.data.length; i < goal; i++) {
								result.contents.push(getListItem(contentsData.data[i], prefix));
							}

							self.response(task, {data: result});
							extension.emit(task.options.onload, result);
						},
						function (data, status) {
							if (handleError(task, status)) return;
							self.responseError(task, _('Failed to retrieve metadata of children.'));
						}
					);
				}
				else {
					self.response(task, {data: result});
					extension.emit(task.options.onload, result);
				}
			}

			drillDown(
				fileSystemRoot + task.path,
				false,
				function (fragments, data, status) {
					var prefix = getPathPrefix(fragments, fileSystemRoot);

					// non-existent file or invalid path
					if (!data || data.length < fragments.length) {
						self.responseError(task, _('Invalid path.'));
						return;
					}

					// root
					if (data.length == 0) {
						self.request(
							API_BASE_URL + '/me/skydrive',
							{ responseType: 'json' },
							function (dirData, status) {
								lsCore(dirData, '/me/skydrive', prefix);
							},
							function (data, status) {
								if (handleError(task, status)) return;
								self.responseError(task, _('Failed to retrieve root metadata.'));
							}
						);
					}
					else {
						lsCore(data[data.length - 1], data[data.length - 1].id, prefix);
					}
				},
				function (fragments, data, status) {
					if (handleError(task, status)) return;
					self.responseError(task, _('Failed to retrieve path metadata.'));
				}
			);

			taskQueue.run();
		}

		function read (task) {
			self.response(task, {state: 'writing', progress: 0});
			drillDown(
				fileSystemRoot + task.path,
				/^(?:auto|force)$/.test(task.options.mkdir),
				function (fragments, data, status) {
					// valid path and new file
					if (!data && fragments.length == 1 /* new file on the root directory */
					||  data && data.length < fragments.length /* new file on a sub directoru */
					) {
						self.response(task, {
							state: 'complete',
							status: 404,
							meta: {path: self.getExternalPath(task.path)}
						});
						taskQueue.run();
						return;
					}

					// invalid (non-existent) path
					if (!data || fragments.length == 0) {
						self.responseError(task, _('Invalid path.'));
						taskQueue.run();
						return;
					}

					// valid path and existent file
					var meta = data[data.length - 1];
					if (isFolder(meta.type)) {
						self.responseError(task, _('Cannot read a directory content.'));
						taskQueue.run();
						return;
					}
					/*if (!/^text\//.test(meta.mimeType)) {
						self.responseError(task, _('Unknown MIME type: {0}', meta.mimeType));
						taskQueue.run();
						return;
					}*/

					// load...
					self.request(
						API_BASE_URL + data[data.length - 1].id + '/content',
						{
							beforesend: function (xhr) {
								xhr.onprogress = function (e) {
									if (!e.lengthComputable) return;
									self.response(task, {
										state: 'reading',
										progress: e.loaded / e.total
									});
								};
							},
							responseType: task.options.responseType || 'text'
						},
						function (data, status) {
							var prefix = getPathPrefix(fragments, fileSystemRoot);
							prefix.pop();
							self.response(task, {
								state: 'complete',
								status: status,
								content: data,
								meta: getListItem(meta, prefix)
							});
							taskQueue.run();
						},
						function (data, status) {
							if (handleError(task, status)) return;

							self.response(task, {
								state: 'complete',
								status: status || 404,
								meta: {path: self.getExternalPath(task.path)}
							});
							taskQueue.run();
						}
					);
				},
				function (fragments, data, status) {
					if (handleError(task, status)) return;
					self.responseError(task, _('Cannot retrieve path metadata'));
				}
			);
		}

		function write (task) {
			self.response(task, {state: 'writing', progress: 0});
			drillDown(
				fileSystemRoot + task.path,
				/^(?:auto|force)$/.test(task.options.mkdir),
				function (fragments, data, status) {
					var endPointFragment;
					var mimeType = task.options.mimeType || 'text/plain;charset=UTF-8';

					// new file on the root
					if (!data && fragments.length == 1) {
						endPointFragment = 'me/skydrive/files';
					}

					// new file on a sub directory
					else if (data && data.length < fragments.length) {
						endPointFragment = data[data.length - 1].id + '/files';
					}

					// invalid path
					else if (!data) {
						self.responseError(task, _('Invalid path.'));
						taskQueue.run();
						return;
					}

					// valid path
					else {
						if (isFolder(data[data.length - 1].type)) {
							self.responseError(task, _('Cannot overwrite a directory.'));
							taskQueue.run();
							return;
						}
						endPointFragment = data[data.length - 2].id + '/files';
					}

					var formData = extension.createFormData();
					formData.append(
						'file',
						extension.createBlob([task.content], {type: mimeType}),
						fragments[fragments.length - 1]
					);

					self.request(
						API_BASE_URL + endPointFragment,
						{
							method: 'POST',
							beforesend: function (t) {
								if (!t.upload) return;
								t.upload.onprogress = function (e) {
									if (!e.lengthComputable) return;
									self.response(task, {state: 'writing', progress: e.loaded / e.total});
								};
							},
							content: formData,
							responseType: 'json'
						},
						function (data, status) {
							var prefix = getPathPrefix(fragments, fileSystemRoot);
							prefix.pop();
							self.response(task, {
								state: 'complete',
								status: status,
								meta: getListItem(data, prefix)
							});
							taskQueue.run();
						},
						function (data, status) {
							if (handleError(task, status)) return;
							self.responseError(task, _('Failed to save ({0})', status));
							taskQueue.run();
						}
					);
				},
				function (fragments, data, status) {
					if (handleError(task, status)) return;
					self.responseError(task, _('Cannot retrieve path metadata'));
					taskQueue.run();
				}
			);
		}

		/*
		 * consts
		 */

		var API_BASE_URL = 'https://apis.live.net/v5.0/';

		/*
		 * init
		 */

		FileSystem.apply(this, arguments);
		this.backend = 'onedrive';

		var self = this;
		var writeBinder = new WriteBinder(this, write);
		var authorize = this.authorizeOAuth2({
			consumerKey: options.key,
			consumerSecret: options.secret,
			startUrl: 'https://login.live.com/oauth20_authorize.srf',
			callbackUrl: options.callback,
			exchangeUrl: 'https://login.live.com/oauth20_token.srf',
			validateUrl: API_BASE_URL + 'me',
			validateMethod: 'GET',
			validateUserIdKey: 'id',
			scopes: [
				'wl.skydrive_update',
				'wl.offline_access'
			]
		});
		var taskQueue = this.taskQueue = new TaskQueue(this, authorize, ls, read, writeBinder.write);
		var handleError = this.handleError;

		var fileSystemRoot = options.root || '';

		taskQueue.initCredentials(
			['token', 'refresh', 'type', 'uid'],
			function (obj) {
				taskQueue.topTask.accessToken = obj.token;
				taskQueue.topTask.refreshToken = obj.refresh;
				taskQueue.topTask.tokenType = obj.type;
				taskQueue.topTask.uid = obj.uid;
			}
		);
	}

	FileSystemOneDrive.prototype = Object.create(FileSystem.prototype);
	FileSystemOneDrive.prototype.constructor = FileSystemOneDrive;

	/*
	 * file system class for local file system
	 * this class depends on Chrome apps named "Local File Operator for wasavi"
	 */

	function FileSystemLocalFileChrome (extension, options) {

		/*
		 * tasks
		 */

		function ls (task) {
			chrome.runtime.sendMessage(
				LFO_ID,
				{
					command: 'ls',
					path: task.path
				},
				function (response) {
					if (chrome.runtime.lastError) {
						return self.responseError(
							task, chrome.runtime.lastError.message);
					}
					else if (!response) {
						return self.responseError(
							task, _('Invalid response.'));
					}
					else if (response.error) {
						return self.responseError(
							task, response.error);
					}

					var data = {
						name: response.name,
						size: '',
						bytes: 0,
						path: response.path,
						is_dir: true,
						is_deleted: false,
						id: null,
						modified: null,
						created: null,
						mime_type: PSEUDO_MIME_DIRECTORY,
						contents: response.entries
					};

					self.response(task, {data: data});
					extension.emit(task.options.onload, data);
				}
			);
			taskQueue.run();
		}

		function read (task) {
			self.response(task, {state: 'reading', progress: 0});

			chrome.runtime.sendMessage(
				LFO_ID,
				{
					command: 'read',
					path: task.path
				},
				function (response) {
					try {
						if (chrome.runtime.lastError) {
							return self.responseError(
								task, chrome.runtime.lastError.message);
						}
						else if (!response) {
							return self.responseError(
								task, _('Invalid response.'));
						}
						else if (response.error) {
							return self.responseError(
								task, response.error);
						}

						self.response(task, {
							state: 'complete',
							status: 200,
							content: response.content,
							meta: {
								name: response.name,
								size: u.readableSize(response.size),
								bytes: response.size,
								path: self.getExternalPath(response.path),
								is_dir: false,
								is_deleted: false,
								id: null,
								modified: new Date(response.lastModified),
								created: null,
								mime_type: PSEUDO_MIME_GENERIC,
							}
						});
					}
					finally {
						taskQueue.run();
					}
				}
			);
		}

		function write (task) {
			self.response(task, {state: 'writing', progress: 0});

			chrome.runtime.sendMessage(
				LFO_ID,
				{
					command: 'write',
					path: task.path,
					content: task.content
				},
				function (response) {
					try {
						if (chrome.runtime.lastError) {
							return self.responseError(
								task, chrome.runtime.lastError.message);
						}
						else if (!response) {
							return self.responseError(
								task, _('Invalid response.'));
						}
						else if (response.error) {
							return self.responseError(
								task, response.error);
						}

						self.response(task, {
							state: 'complete',
							status: 200,
							meta: {
								name: response.name,
								size: u.readableSize(response.size),
								bytes: response.size,
								path: self.getExternalPath(response.path),
								is_dir: false,
								is_deleted: false,
								id: null,
								modified: null,
								created: null,
								mime_type: PSEUDO_MIME_GENERIC
							}
						});
					}
					finally {
						taskQueue.run();
					}
				}
			);
		}

		/*
		 * init
		 */

		FileSystem.apply(this, arguments);
		this.backend = 'file';
		this.needAuthentication = false;
		var self = this;
		var taskQueue = this.taskQueue = new TaskQueue(this, null, ls, read, write);
		//var LFO_ID = 'igbjeepbgpdcjmpcjgkkfgelekeigbhc';	// develop version
		var LFO_ID = 'dkbdmkncpnepdbaneikhbbeiboehjnol';	// release version
	}

	FileSystemLocalFileChrome.prototype = Object.create(FileSystem.prototype);
	FileSystemLocalFileChrome.prototype.constructor = FileSystemLocalFileChrome;

	/*
	 * export
	 */

	function FileSystemImpl (name, ext, options) {
		switch (name) {
		case 'dropbox':
			return new FileSystemDropbox(ext, options);
		case 'gdrive':
			return new FileSystemGDrive(ext, options);
		case 'onedrive':
			return new FileSystemOneDrive(ext, options);
		case 'file':
			return new FileSystemLocalFileChrome(ext, options);
		default:
			return new FileSystem(ext, options);
		}
	}

	FileSystemImpl.setWriteDelaySecs = function (secs) {
		writeDelaySecsDefault = secs;
	};

	exports.FileSystemImpl = FileSystemImpl;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
