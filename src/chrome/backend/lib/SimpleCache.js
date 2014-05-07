/**
 * simple cache
 *
 * @author akahuku@gmail.com
 */

(function (global) {

	function SimpleCache (ttl) {
		if (!(this instanceof SimpleCache)) {
			return new SimpleCache(ttl);
		}
		this.cache = {};
		this.ttlMsecs = ttl || 1000 * 60 * 60;
	}

	SimpleCache.prototype.exists = function (key) {
		return key in this.cache;
	};

	SimpleCache.prototype.get = function (key) {
		return this.cache[key].data;
	};

	SimpleCache.prototype.set = function (key, ttl, item) {
		this.cache[key] = {
			expires: Date.now() + ttl,
			data: item
		};
		return item;
	};

	SimpleCache.prototype.purge = function () {
		Object.keys(this.cache).forEach(function (i) {
			if (Date.now() >= this.cache[i].expires) {
				delete this.cache[i];
			}
		}, this);
	};

	exports.SimpleCache = SimpleCache;

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
