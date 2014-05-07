/**
 * file system interface
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */

(function (global) {
	'use strict';

	function FileSystem (ext, fstab) {
		if (!(this instanceof FileSystem)) {
			return new FileSystem(ext, fstab);
		}

		this.ext = ext || require('./kosian/Kosian').Kosian();
		this.fstab = fstab;
		this.init();
	}

	FileSystem.prototype.init = function () {
		/*
		 * consumer_keys.json sample:
		 *
		 * {
		 *     "dropbox": {
		 *         "key":    "YOUR-CONSUMER-KEY",
		 *         "secret": "YOUR-CONSUMER-SECRET"
		 *     }
		 * }
		 *
		 * in production package, consumer_keys.json is encrypted.
		 */

		function initFileSystemCore (data) {
			var log = [];
			var FileSystemImpl = require('./kosian/FileSystemImpl').FileSystemImpl;

			data = this.ext.utils.parseJson(data);

			for (var i in this.fstab) {
				if (!data[i]) continue;
				if (!('key' in data[i])) continue;

				this.fstab[i].isNull = false;
				this.fstab[i].instance = FileSystemImpl(i, data[i]);
				log.push(i);
			}

			this.ext.isDev && console.info(
				this.ext.appName + ': following filesystems are available: ' + log.join(', '));

			this.fstab.nullFs = {
				enabled:true,
				isNull:true,
				instance:FileSystemImpl()
			};
		}

		this.ext.resource('consumer_keys.bin', function (binkeys) {
			if (binkeys === false) {
				this.ext.resource('consumer_keys.json', initFileSystemCore, {noCache:true, bind:this});
				return;
			}

			this.ext.resource(this.cryptKeyPath, function (data) {
				var Blowfish = require('./kosian/Blowfish').Blowfish;
				var SHA1 = require('./kosian/SHA1').SHA1;
				initFileSystemCore.call(
					this,
					(new Blowfish(SHA1.calc(data))).decrypt64(binkeys)
				);
			}, {noCache:true, bind:this});
		}, {noCache:true, bind:this});
	};

	FileSystem.prototype.getInstance = function (path) {
		var defaultFs;
		var nullFs;
		var drive = '';

		path.replace(/^([^\/:]+):/, function ($0, $1) {
			drive = $1;
			return '';
		});

		if (drive != '' && drive in this.fstab && this.fstab[drive].enabled) {
			return this.fstab[drive].instance;
		}

		for (var i in this.fstab) {
			var fs = this.fstab[i];
			if (!fs.instance) {
				continue;
			}
			if (fs.isDefault) {
				defaultFs = fs.instance;
			}
			if (fs.isNull) {
				nullFs = fs.instance;
			}
		}
		return drive != '' ? nullFs : (defaultFs || nullFs);
	};

	FileSystem.prototype.getInfo = function () {
		var result = [];
		for (var i in this.fstab) {
			var fs = this.fstab[i];
			if (fs.isNull) continue;
			result.push({name:i, isDefault:fs.isDefault});
		}
		return result;
	};

	FileSystem.prototype.clearCredentials = function (target) {
		Object.keys(fstab).forEach(function (name) {
			var fs = this.fstab[name];
			if (!fs || !fs.instance || typeof fs.instance.clearCredentials != 'function') return;
			if (typeof target == 'string') {
				if (target == name) {
					fs.instance.clearCredentials();
				}
			}
			else {
				fs.instance.clearCredentials();
			}
		});
	};

	FileSystem.prototype.ls = function (path) {
		var fs = this.getInstance(path);
		fs.ls.apply(fs, arguments);
	};

	FileSystem.prototype.write = function (path) {
		var fs = this.getInstance(path);
		fs.write.apply(fs, arguments);
	};

	FileSystem.prototype.read = function (path) {
		var fs = this.getInstance(path);
		fs.read.apply(fs, arguments);
	};

	exports.FileSystem = FileSystem;
})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
