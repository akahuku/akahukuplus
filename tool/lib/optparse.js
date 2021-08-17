module.exports = function () {
	var options = {};
	var minimistOptions = {
		alias: {
			'h': 'help',
			'?': 'help'
		}
	};

	function on () {
		var args = Array.prototype.slice.call(arguments);
		var key, callback, option, label;

		if (args.length == 0) throw new Error('callback not specified');
		callback = args.pop();
		if (typeof callback != 'function') throw new Error('callback is not a function');

		if (args.length == 0) throw new Error('option not specified');
		var tmp = args.shift().split(/ +/g);
		var longOptionName, shortOptionName;

		tmp.shift().split(',').forEach(function (optionName) {
			if (/^--(.+)/.test(optionName)) {
				longOptionName = RegExp.$1;
			}
			else if (/^-(.+)/.test(optionName)) {
				shortOptionName = RegExp.$1;
			}
		});

		if (longOptionName && shortOptionName) {
			minimistOptions.alias[shortOptionName] = longOptionName;
		}

		if (tmp.length) {
			label = tmp.join(' ');
		}
		else {
			label = '';
		}

		var obj = {
		};

		if (longOptionName) {
			options[longOptionName] = {
				callback: callback,
				option: '--' + longOptionName,
				label: label
			};
		}
		if (shortOptionName) {
			options[shortOptionName] = {
				callback: callback,
				option: '-' + shortOptionName,
				label: label
			};
		}

		return this;
	}

	function parse (argv) {
		var workargs = require('minimist', minimistOptions)(argv.slice(2));

		options['?'] = options['h'] = options['help'] = {
			callback: function () {
				printHelp(argv);
			}
		};

		for (var arg in workargs) {
			if (arg == '_') continue;
			if (arg in options) {
				options[arg].callback(workargs[arg]);
			}
			else {
				console.log('unknown option: ' + arg);
				printHelp(argv);
			}
		}

		return workargs;
	}

	function printHelp (argv) {
		var buffer = [
			/[^\/\\]+$/.exec(argv[1])[0] + ' [options]',
			'options:'
		];

		var longestOption = '';
		for (var i in options) {
			var o = options[i];
			if (!o.option) continue;
			if (o.option.length > longestOption.length) {
				longestOption = o.option;
			}
		}

		var maxWidth = longestOption.length;
		var spaces = longestOption.replace(/./g, ' ');
		var lastLabel = '';
		
		for (var i in options) {
			var o = options[i];
			if (!o.option) continue;
			var currentLabel = (o.label || '');
			if (currentLabel == lastLabel) {
				currentLabel = '';
			}
			else {
				lastLabel = currentLabel;
			}
			buffer.push(
				'  ' +
				o.option +
				spaces.substring(0, maxWidth - o.option.length) +
				' ' +
				currentLabel
			);
		}
		console.log(buffer.join('\n'));
		process.exit(2);
	}

	return {
		on: on,
		parse: parse
	};
};

