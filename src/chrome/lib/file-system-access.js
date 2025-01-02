/*
 * File System Access utilities
 *
 * @see https://web.dev/file-system-access/
 * @see https://wicg.github.io/file-system-access/
 */

/**
 * Copyright 2022-2024 akahuku, akahuku@gmail.com
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

import * as idbkeyval from './idb-keyval.js';

export function regalizePath (path) {
	return path
		/*
		 * trim leading and trailing spaces
		 */
		.replace(/^\s+|\s+$/g, '')

		/*
		 * convert Windows style path delimiter to slash
		 *
		 * path\to\file -> path/to/file
		 */
		.replace(/\\/g, '/')

		/*
		 * combine a sequence of slashes into one
		 *
		 * path/////to/////file -> path/to/file
		 */
		.replace(/\/{2,}/g, '/')

		/*
		 * strip first slash (because all pathes are relative from root directory)
		 *
		 * /path/to/file -> path/to/file
		 */
		.replace(/^\//, '');
}

export function resolveRelativePath (components) {
	return components
		/*
		 * strip '.'
		 */
		.filter(component => component !== '.')

		/*
		 * resolve '..':
		 *
		 *   a/../b/ -> b/
		 *   ../b/   -> error
		 *   a/b/c/../../../d
		 *     -> a/b/../../d
		 *     -> a/../d
		 *     -> d
		 */
		.reduce((result, current) => {
			if (!result) {
				return result;
			}

			if (current !== '..') {
				result.push(current);
				return result;
			}

			if (result.length == 0) {
				return null;
			}

			result.pop();
			return result;
		}, []);
}

export function readTextAs (blob, encoding) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader;
		reader.onload = () => {resolve(reader.result)};
		reader.onerror = () => {reject(reader.error.message)};
		reader.readAsText(blob, encoding);
	});
}

export function createFileSystemAccess (id = 'default', globalOptions = {}) {
	let rootDirectoryHandle;
	let log = globalOptions.logger || function () {};

	async function parsePath (path, create = false) {
		try {
			if (typeof path !== 'string') {
				throw new Error('parsePath: Invalid path type');
			}

			const components = resolveRelativePath(regalizePath(path).split('/'));
			if (!components) {
				throw new Error('parsePath: Invalid path format');
			}

			const baseName = components.pop();
			let directoryHandle = rootDirectoryHandle;

			for (const component of components) {
				try {
					directoryHandle = await directoryHandle.getDirectoryHandle(component);
				}
				catch (e) {
					if (create) {
						directoryHandle = await directoryHandle.getDirectoryHandle(component, {create: true});
					}
					else {
						throw e;
					}
				}
			}

			return {
				path: [...components, baseName].join('/'),
				baseName: baseName,
				parentDirectoryHandle: directoryHandle
			};
		}
		catch (e) {
			return {
				error: e.message
			};
		}
	}

	/*
	 * this function is ported from
	 * https://web.dev/file-system-access/#stored-file-or-directory-handles-and-permissions
	 */

	async function verifyPermission (fileHandle, readWrite = false) {
		log(`enter verifyPermission, readWrite: ${readWrite}`);

		const options = {};
		if (readWrite) {
			options.mode = 'readwrite';
		}

		// Check if permission was already granted. If so, return true.
		try {
			const queriedPermission = await fileHandle.queryPermission(options);
			log(`verifyPermission: result of queryPermission(): ${queriedPermission}`);

			if (queriedPermission === 'granted') {
				return true;
			}
		}
		catch (e) {
			log(`queryPermission: exception ${Object.prototype.toString.call(e)} occured while calling queryPermission(): ${e.stack}`);
			return false;
		}

		// Request permission. If the user grants permission, return true.
		//
		// According to the spec, requestPermission() may return an exception.
		// @see: https://wicg.github.io/file-system-access/#api-filesystemhandle-requestpermission
		try {
			const requestedPermission = await fileHandle.requestPermission(options);
			log(`verifyPermission: result of requestPermission(): ${requestedPermission}`);

			if (requestedPermission === 'granted') {
				return true;
			}
		}
		catch (e) {
			log(`requestPermission: exception ${Object.prototype.toString.call(e)} occured while calling requestPermission: ${e.stack}`);
			return false;
		}

		// The user didn't grant permission, so return false.
		return false;
	}

	// exported functions

	async function readFrom (path, format = 'text') {
		const root = await getRootDirectory();
		if (root.error) {
			return root;
		}

		const pathInfo = await parsePath(path);
		if (pathInfo.error) {
			return pathInfo;
		}

		try {
			const fileHandle = await pathInfo.parentDirectoryHandle.getFileHandle(pathInfo.baseName);
			const file = await fileHandle.getFile();

			let content;
			if (/^(file|blob)$/i.test(format)) {
				content = file;
			}
			if (/^arraybuffer$/i.test(format)) {
				content = await file.arrayBuffer();
			}
			else if (/^text\s*;\s*charset\s*=\s*(.+)$/i.test(format)) {
				content = await readTextAs(file, RegExp.$1);
			}
			else {
				content = await file.text();
			}

			return {
				name: file.name,
				size: file.size,
				lastModified: file.lastModifiedDate,
				type: file.type,
				path: pathInfo.path,
				content: content
			};
		}
		catch (e) {
			return {
				error: e.message
			};
		}
	}

	async function writeTo (path, content, options = {create: false, append: false}) {
		const root = await getRootDirectory(true);
		if (root.error) {
			return root;
		}

		const pathInfo = await parsePath(path, options.create);
		if (pathInfo.error) {
			return pathInfo;
		}

		try {
			/*
			 * '1260060987-職場ではえ〜⁠❤️パソコンとかわかんな〜い⁠❤️を貫き通すに限る.html'
			 */
			const fileHandle = await pathInfo.parentDirectoryHandle.getFileHandle(pathInfo.baseName, {create: true});
			const oldSize = (await fileHandle.getFile()).size;

			if (options.append) {
				// append
				const writable = await fileHandle.createWritable({keepExistingData: true});
				await writable.write({type: 'write', position: oldSize, data: content});
				await writable.close();
			}
			else {
				// overwrite
				const writable = await fileHandle.createWritable();
				await writable.write(content);
				await writable.close();
			}

			// retrieve file metadata after write
			const file = await fileHandle.getFile();

			return {
				name: file.name,
				size: file.size,
				lastModified: file.lastModifiedDate,
				type: file.type,
				path: pathInfo.path
			};
		}
		catch (e) {
			return {
				error: e.message
			};
		}
	}

	async function getFileHandle (path, readWrite = false) {
		const root = await getRootDirectory(readWrite);
		if (root.error) {
			return root;
		}

		const pathInfo = await parsePath(path);
		if (pathInfo.error) {
			return pathInfo;
		}

		try {
			return {
				fileHandle: await pathInfo.parentDirectoryHandle.getFileHandle(pathInfo.baseName)
			};
		}
		catch (e) {
			return {
				error: e.message
			};
		}
	}

	function appendTo (path, content) {
		return writeTo(path, content, {append: true});
	}

	async function listFiles (path, options = {}) {
		const root = await getRootDirectory(!!options.forReadWrite);
		if (root.error) {
			return root;
		}

		const pathInfo = await parsePath(path);
		if (pathInfo.error) {
			return pathInfo;
		}

		/*
		 * use cases:
		 *
		 * 1. (empty string)
		 *   parent: root (directory)
		 *   base: ''
		 *   -> list children of root
		 * 2. dir
		 *   parent: dir's parent (directory)
		 *   base: 'dir'
		 *   -> list children of dir (this is exceptional behavior)
		 * 3. dir/
		 *   parent: dir (directory)
		 *   base: ''
		 *   -> list children of dir
		 * 4. dir/file
		 *   parent: dir (directory)
		 *   base: 'file'
		 *   -> list only 'file', children of dir
		 * 5. dir/file/
		 *   parent: file (file)
		 *   base: ''
		 *   -> error: file is not a directory
		 */

		let files = [];
		let directories = [];
		try {
			// 5.
			if (pathInfo.parentDirectoryHandle.kind !== 'directory' && pathInfo.baseName === '') {
				throw new Error(`${pathInfo.baseName} is not a directory`);
			}

			let parentHandle = pathInfo.parentDirectoryHandle;
			let baseName = pathInfo.baseName;

			// 2.
			if (baseName !== '') {
				try {
					const handle = await parentHandle.getDirectoryHandle(baseName);
					if (handle) {
						parentHandle = handle;
						baseName = '';
					}
				}
				catch (e) {
					//
				}
			}

			const fileGenerator = typeof options.fileGenerator === 'function' ?
				options.fileGenerator :
				file => {
					return {
						name: file.name,
						size: file.size,
						lastModified: file.lastModifiedDate,
						type: file.type
					};
				};
			const dirGenerator = typeof options.directoryGenerator === 'function' ?
				options.directoryGenerator :
				dir => {
					return {
						name: dir.name,
						size: 0,
						lastModified: null,
						type: 'directory'
					};
				};
			for await (const entryHandle of parentHandle.values()) {
				switch (entryHandle.kind) {
				case 'file':
					if (!options.skipFile) {
						const file = await entryHandle.getFile();
						const fileItem = fileGenerator(file, pathInfo.path);
						if (fileItem) {
							files.push(fileItem);
						}
					}
					break;
				case 'directory':
					if (!options.skipDirectory) {
						const dirItem = dirGenerator(entryHandle, pathInfo.path);
						if (dirItem) {
							directories.push(dirItem);
						}
					}
					break;
				}
			}

			if (baseName != '') {
				files = files.filter(f => f.name === baseName);
				directories = directories.filter(d => d.name === baseName);
			}

			if ('group-directories-first' in options && options['group-directories-first']) {
				directories.sort((a, b) => a.name.localeCompare(b.name));
				files.sort((a, b) => a.name.localeCompare(b.name));
				files = [...directories, ...files];
			}
			else {
				files = [...directories, ...files];
				files.sort((a, b) => a.name.localeCompare(b.name));
			}

			return {
				path: pathInfo.path,
				baseName: pathInfo.baseName,
				files: files
			};
		}
		catch (e) {
			return {
				error: e.message
			};
		}
	}

	function invalidateRootDirectory () {
		rootDirectoryHandle = undefined;
	}

	function forgetRootDirectory () {
		rootDirectoryHandle = undefined;
		return idbkeyval.del(`root-${id}`).then(() => {
			return {success: true};
		});
	}

	async function queryRootDirectoryPermission (readWrite = false) {
		try {
			log([
				`*** enter queryRootDirectoryPermission  ***`,
				`  readWrite: ${readWrite}`,
				`  current root: ${Object.prototype.toString.call(rootDirectoryHandle)}`
			].join('\n'));

			if (typeof showDirectoryPicker != 'function') {
				log('queryRootDirectoryPermission: returning "unavailable"');
				return {permission: 'unavailable'};
			}

			let handle = rootDirectoryHandle;

			if (!handle) {
				handle = await idbkeyval.get(`root-${id}`);
				log('queryRootDirectoryPermission: root directory handle restored from database.');
			}

			if (!handle) {
				log('queryRootDirectoryPermission: returning "uninitialized"');
				return {permission: 'uninitialized'};
			}

			const options = {};
			if (readWrite) {
				options.mode = 'readwrite';
			}
			const result = await handle.queryPermission(options);
			log(`queryRootDirectoryPermission: queryPermission result: ${result}`);

			if (result === 'granted') {
				rootDirectoryHandle = handle;
			}
			else {
				invalidateRootDirectory();
				log(`queryRootDirectoryPermission: root directory handle invalidated`);
			}

			return {permission: result};
		}
		catch (e) {
			return {error: e.message, permission: 'error'};
		}
	}

	async function getRootDirectory (readWrite = false) {
		try {
			log([
				`*** enter getRootDirectory ***`,
				`  readWrite: ${readWrite}`,
				`  current root: ${Object.prototype.toString.call(rootDirectoryHandle)}`
			].join('\n'));

			if (typeof showDirectoryPicker != 'function') {
				log(`getRootDirectory: file system access API is unavailable`);
				throw new Error('File System Access API is unavailable on this platform.');
			}

			let from = 'memory';

			if (!rootDirectoryHandle) {
				from = 'database';
				rootDirectoryHandle = await idbkeyval.get(`root-${id}`);
				log(`getRootDirectory: root directory handle restored from database: ${Object.prototype.toString.call(rootDirectoryHandle)}`);
			}

			if (!rootDirectoryHandle) {
				from = 'user action';

				try {
					const options = {id};
					if (globalOptions.startIn) {
						options.startIn = globalOptions.startIn;
					}
					rootDirectoryHandle = await window.showDirectoryPicker(options);
					idbkeyval.set(`root-${id}`, rootDirectoryHandle);
				}
				catch (e) {
					// if user aborted a request, exception occurs.
					log(`getRootDirectory: user aborted the request.`);
					await forgetRootDirectory();
					return {error: 'user aborted the request', handle: null, from};
				}
				log(`getRootDirectory: root directory handle initialized by user action: ${Object.prototype.toString.call(rootDirectoryHandle)}`);
			}

			if (!rootDirectoryHandle) {
				throw new Error('Failed to get root directory handle');
			}

			const verified = await verifyPermission(rootDirectoryHandle, readWrite);
			if (!verified) {
				log(`getRootDirectory: user refused the authorization.`);
				await forgetRootDirectory();
				return {error: 'user refused the authorization', handle: null, from};
			}

			log(`getRootDirectory: root directory handle is available. source is ${from}`);

			return {handle: rootDirectoryHandle, from};
		}
		catch (e) {
			log(`getRootDirectory: exception ${Object.prototype.toString.call(e)} occured: ${e.stack}`);
			await forgetRootDirectory();
			return {error: e.message};
		}
	}

	async function getStatus () {
		const apiAvailable = typeof showDirectoryPicker == 'function';
		const handles = {
			memory: rootDirectoryHandle || null,
			database: await idbkeyval.get(`root-${id}`) || null
		};
		const permissions = {
			memory: null,
			database: null
		};

		if (handles.memory) {
			permissions.memory = await handles.memory.queryPermission({mode: 'readwrite'});
			handles.memory = Object.prototype.toString.call(handles.memory);
		}

		if (handles.database) {
			permissions.database = await handles.database.queryPermission({mode: 'readwrite'});
			handles.database = Object.prototype.toString.call(handles.database);
		}

		return {id, apiAvailable, handles, permissions};
	}

	return {
		readFrom, writeTo, getFileHandle, appendTo, listFiles,
		invalidateRootDirectory, forgetRootDirectory,
		queryRootDirectoryPermission, getRootDirectory,
		getStatus,
		get id () {
			return id;
		},
		get enabled () {
			return location.protocol === 'https:'
				&& typeof showDirectoryPicker === 'function';
		},
		get logger () {
			return log;
		},
		set logger (fn) {
			if (typeof fn == 'function') {
				log = fn;
			}
		}
	};
}
