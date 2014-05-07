/**
 * tab watcher
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */

(function () {
	'use strict';

	var u = require('./kosian/Utils').Utils;

	/*
	 * base class
	 */

	function TabWatcher (emit) {
		this.add = function (id, url, callback) {
			emit(callback, null);
		};
	}

	/*
	 * for chrome
	 */

	function ChromeTabWatcher (emit) {
		var targets = {};

		function handleTabUpdate (tabId, changeInfo, tab) {
			if (!targets[tabId] || !changeInfo.url) return;
			var target = targets[tabId];
			var isGoalUrl = u.baseUrl(tab.url) == u.baseUrl(target.goalUrl);
			if (tab.url == '' || isGoalUrl) {
				emit(target.callback, tab.url);
				delete targets[tabId];
				if (u.countOf(targets) == 0) {
					chrome.tabs.onUpdated.removeListener(handleTabUpdate);
					chrome.tabs.onRemoved.removeListener(handleTabRemove);
				}
			}
		}

		function handleTabRemove (tabId, removeInfo) {
			if (!targets[tabId]) return;
			emit(targets[tabId].callback, '');
			delete targets[tabId];
			if (u.countOf(targets) == 0) {
				chrome.tabs.onUpdated.removeListener(handleTabUpdate);
				chrome.tabs.onRemoved.removeListener(handleTabRemove);
			}
		}

		this.add = function (id, url, callback) {
			chrome.tabs.get(id, function (tab) {
				if (u.countOf(targets) == 0) {
					chrome.tabs.onUpdated.addListener(handleTabUpdate);
					chrome.tabs.onRemoved.addListener(handleTabRemove);
				}
				targets[id] = {tab:id, startUrl:tab.url, goalUrl:url, callback:callback};
			});
		};
	}

	ChromeTabWatcher.prototype.constructor = TabWatcher;

	/*
	 * for opera
	 */

	function OperaTabWatcher (emit) {
		var targets = [];
		var timer;

		function startTimer () {
			if (timer) return;
			timer = setInterval(function () {
				var newTargets = [];

				targets.forEach(function (target) {
					var currentUrl;
					try {
						currentUrl = target.tab.url || '';
					}
					catch (e) {
						currentUrl = '';
					}

					var isGoalUrl = u.baseUrl(currentUrl) == u.baseUrl(target.goalUrl);
					if (currentUrl == '' || isGoalUrl) {
						emit(target.callback, currentUrl);
						target.callback = null;
					}
					else {
						newTargets.push(target);
					}
				});

				if (newTargets.length == 0) {
					clearInterval(timer);
					timer = null;
				}
				else {
					targets = newTargets;
				}
			}, 1000);
		}

		this.add = function (id, url, callback) {
			opera.extension.tabs.getAll().some(function (tab) {
				if (id instanceof MessagePort && tab.port == id
				||  typeof id == 'number' && tab.id == id) {
					targets.push({tab:tab, startUrl:tab.url, goalUrl:url, callback:callback});
					startTimer();
					return true;
				}
				return false;
			});
		};
	}

	OperaTabWatcher.prototype.constructor = TabWatcher;

	/*
	 * for firefox (addon sdk)
	 */

	function FirefoxJetpackTabWatcher (emit) {
		var targets = [];
		var timer;

		function startTimer () {
			if (timer) return;

			timer = u.setInterval(function () {
				var newTargets = [];

				targets.forEach(function (target) {
					var currentUrl;
					try {
						currentUrl = target.tab.url || '';
					}
					catch (e) {
						currentUrl = '';
					}

					var isGoalUrl = u.baseUrl(currentUrl) == u.baseUrl(target.goalUrl);
					if (currentUrl == '' || isGoalUrl) {
						emit(target.callback, currentUrl);
						target.callback = null;
					}
					else {
						newTargets.push(target);
					}
				});

				if (newTargets.length == 0) {
					u.clearInterval(timer);
					timer = null;
				}
				else {
					targets = newTargets;
				}
			}, 1000);
		}

		this.add = function (id, url, callback) {
			// in this context, id is Tab object instance.
			targets.push({tab:id, startUrl:id.url, goalUrl:url, callback:callback});
			startTimer();
			return true;
		};
	}

	FirefoxJetpackTabWatcher.prototype.constructor = TabWatcher;

	/*
	 * exports
	 */

	function create (window, emit) {
		if (window.chrome) {
			return new ChromeTabWatcher(emit);
		}
		else if (window.opera) {
			return new OperaTabWatcher(emit);
		}
		else if (require('sdk/self')) {
			return new FirefoxJetpackTabWatcher(emit);
		}
		return new TabWatcher;
	}

	exports.TabWatcher = create;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
