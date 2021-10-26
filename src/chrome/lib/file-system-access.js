/*
 * File System Access utilities
 *
 * @see https://web.dev/file-system-access/
 * @see https://wicg.github.io/file-system-access/
 * @author akahuku@gmail.com
 */

import * as idbkeyval from './idb-keyval.js';

const isdev = !('key' in chrome.runtime.getManifest());

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

export function createFileSystemAccess (id = 'default', startIn) {
	let rootDirectoryHandle;

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
		const options = {};
		if (readWrite) {
			options.mode = 'readwrite';
		}

		// Check if permission was already granted. If so, return true.
		const queriedPermission = await fileHandle.queryPermission(options);
		isdev && console.log([
			`queryPermission result: ${queriedPermission}`,
			`mode: ${options.mode}`
		].join(', '));
		if (queriedPermission === 'granted') {
			return true;
		}

		// Request permission. If the user grants permission, return true.
		const requestedPermission = await fileHandle.requestPermission(options);
		isdev && console.log([
			`requestPermission result: ${requestedPermission}`,
			`mode: ${options.mode}`
		].join(', '));
		if (requestedPermission === 'granted') {
			return true;
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

	async function queryRootDirectoryPermission (readwrite = false) {
		if (typeof showDirectoryPicker != 'function') {
			return 'unavailable';
		}

		let handle = rootDirectoryHandle;
		if (!handle) {
			handle = await idbkeyval.get(`root-${id}`);
		}

		if (!handle) {
			return 'uninitialized';
		}

		const options = {};
		if (readwrite) {
			options.mode = 'readwrite';
		}
		const result = await handle.queryPermission(options);

		if (result !== 'granted') {
			invalidateRootDirectory();
		}

		return result;
	}

	async function getRootDirectory (readwrite = false) {
		try {
			if (typeof showDirectoryPicker != 'function') {
				throw new Error('File System Access API is unavailable on this platform.');
			}

			if (rootDirectoryHandle) {
				return {
					handle: rootDirectoryHandle,
					from: 'Memory'
				};
			}

			rootDirectoryHandle = await idbkeyval.get(`root-${id}`);
			if (rootDirectoryHandle) {
				if ((await verifyPermission(rootDirectoryHandle, readwrite)) === false) {
					throw new Error('getRootDirectory: Permission denied');
				}

				return {
					handle: rootDirectoryHandle,
					from: 'Database'
				};
			}

			const options = {id};
			if (startIn) {
				options.startIn = startIn;
			}
			rootDirectoryHandle = await showDirectoryPicker(options);
			idbkeyval.set(`root-${id}`, rootDirectoryHandle);

			return {
				handle: rootDirectoryHandle,
				from: 'User action'
			};
		}
		catch (e) {
			//await forgetRootDirectory();
			return {error: e.message};
		}
	}

	async function forgetRootDirectory () {
		rootDirectoryHandle = undefined;
		await idbkeyval.del(`root-${id}`);
		return {success: true};
	}

	return {
		readFrom, writeTo, getFileHandle, appendTo, listFiles,
		invalidateRootDirectory, queryRootDirectoryPermission, getRootDirectory, forgetRootDirectory,
		get isRootDirectoryAvailable () {
			return !!rootDirectoryHandle;
		},
		get enabled () {
			return location.protocol === 'https:' && typeof showDirectoryPicker === 'function';
		}
	};
}
