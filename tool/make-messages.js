#!/usr/bin/env node

const fs = require('fs');
const OptionParser = require('./lib/optparse');

var basedir = '';
var echo_only = false;
var plurals = {}

function get_id (message) {
	return message
		.toLowerCase()
		.replace(/\{(\d+)\}/g, '@$1')
		.replace(/\{(\w+):\d+\}/g, function ($0, $1) {
			var id = '_plural_' + $1;
			if (!(id in plurals)) {
				plurals[id] = {
					message: $1 + 's'
				};
				plurals[id + '@one'] = {
					message: $1
				};
			}
			return $1;
		})
		.replace(/[^A-Za-z0-9_@ ]/g, '')
		.replace(/ +/g, '_');
}

function build_base_message (messages, file) {
	var result = true;
	var line_number = 1;
	fs.readFileSync(file, 'utf8').split('\n').forEach(function (line) {
		if (/\b_\(\s*'((\\'|[^'])+)'/.test(line)) {
			var message = RegExp.$1.replace(/\\'/g, "'");
			var id = get_id(message);
			if (id in messages) {
				if (messages[id].description != message) {
					console.log('\n*** ID conflict! ***');
					console.log('\t   line number: ' + line_number);
					console.log('\t            id: ' + id);
					console.log('\tstored message: ' + messages[id].description);
					console.log('\t   new message: ' + message);
					result = false;
				}
			}
			else {
				messages[id] = {
					message: message,
					description: message
				};
			}
		}
		line_number++;
	});
	return result;
}

function update_localized_messages (messages) {
	var dir = basedir + '/_locales/';
	fs.readdirSync(dir).forEach(function (e) {
		if (!fs.statSync(dir + e).isDirectory()) return;
		if (e == 'en_US') return;
		var path = dir + e + '/messages.json';
		if (!fs.existsSync(path)) return;
		update_localized_message(messages, e, path);
	});
}

function update_localized_message (messages, locale, path) {
	var dst_text = fs.readFileSync(path, 'utf8');
	var dst = JSON.parse(dst_text);
	var result = {};
	var new_keys = [];

	for (var key in messages) {
		var value = messages[key];
		if (key in dst) {
			result[key] = dst[key];
			if ('description' in messages[key]) {
				result[key].description = messages[key].description;
			}
		}
		else {
			result[key] = messages[key];
			new_keys.push(key);
		}
	}

	result = JSON.stringify(result, null, '\t');
	if (result == dst_text) {
		console.log(locale + ': no changes.');
	}
	else {
		if (echo_only) {
			result = result.split('\n');
			console.log('\nlocale ' + locale + ':');
			console.log(result.slice(0, 5).join('\n'));
			console.log('\t\t:');
			console.log('\t\t:');
			console.log('\t\t:');
			console.log(result.slice(-5).join('\n'));
			console.log('\n');
		}
		else {
			fs.writeFileSync(path, result);
		}

		if (new_keys.length) {
			new_keys = '\n\t' + new_keys.join('\n\t');
		}
		else {
			new_keys = ' nothing.';
		}
		console.log('New message keys for ' + locale + ':' + new_keys);
	}
}

function ksort (hash) {
	var result = {};

	Object.keys(hash).sort().forEach(function (key) {
		result[key] = hash[key];
	});

	return result;
}

function parse_args () {
	var files = [];

	var args = (new OptionParser)
		.on('--indir,-i    required, path to extension src directory',
			function (v) {basedir = v})
		.on('--echo    echo only. do not overwrite message files',
			function (v) {echo_only = true})
		.parse(process.argv);

	args._.forEach(function (arg) {
		if (fs.existsSync(arg)) {
			files.push(arg);
		}
		else {
			arg = basedir + '/' + arg;
			if (fs.existsSync(arg)) {
				files.push(arg);
			}
		}
	});

	if (files.length == 0) {
		console.log('file not specified. stop.');
		process.exit(1);
	}

	return files;
}

function pretty_json (obj, replacer, indent, buffer, nest) {
	buffer || (buffer = []);
	nest || (nest = 0);

	var currentIndent = '';
	for (var i = 0; i < nest; i++) {
		currentIndent += indent;
	}

	switch (Object.prototype.toString.call(obj)) {
	case '[object Object]':
		buffer.push(currentIndent + '{');
		for (var i in obj) {
			var n = buffer.length;
			pretty_json(obj[i], null, indent, buffer, nest + 1);
			buffer[n] = '"' + i.replace(/"/g, '\\"') + '": ';
			buffer[buffer.length - 1] += ',';
		}
		buffer[buffer.length - 1] = buffer[buffer.length - 1].replace(/,$/, '');
		buffer.push(currentIndent + '}');
		break;
	case '[object Array]':
		buffer.push(currentIndent + '[');
		for (var i = 0, goal = obj.length; i < goal; i++) {
			pretty_json(obj[i], null, indent, buffer, nest + 1);
			buffer[buffer.length - 1] += ',';
		}
		buffer[buffer.length - 1] = buffer[buffer.length - 1].replace(/,$/, '');
		buffer.push(currentIndent + ']');
		break;
	case '[object String]':
		buffer.push(currentIndent + '"' + obj.replace(/"/g, '\\"') + '"');
		break;
	case '[object Boolean]':
		buffer.push(currentIndent + (obj ? 'true' : 'false'));
		break;
	case '[object Number]':
		buffer.push(currentIndent + obj);
		break;
	}
	return buffer;
}

function main (files) {
	var messages = {};

	files.some(function (file) {
		console.log('reading: ' + file);
		if (!build_base_message(messages, file)) {
			messages = null;
			return true;
		}
	});

	if (messages) {
		messages = ksort(messages);

		var dir = basedir + '/_locales/';
		extension_info = JSON.parse(fs.readFileSync(dir + '/core.json', 'utf8'));
		plural_rule = JSON.parse(fs.readFileSync(dir + '/plural_rule.json', 'utf8'));

		messages = Object.assign(extension_info,
			plural_rule,
			plurals,
			messages);
		for (var key in messages) {
			if ('description' in messages[key]) {
				messages[key].description = messages[key].message;
			}
		}

		update_localized_messages(messages);

		messages = JSON.stringify(messages, null, '\t');

		if (echo_only) {
			messages = messages.split('\n');
			console.log('\nlocale en_US:');
			console.log(messages.slice(0, 5).join('\n'));
			console.log('\t\t:');
			console.log('\t\t:');
			console.log('\t\t:');
			console.log(messages.slice(-5).join('\n'));
			console.log('');
		}
		else {
			fs.writeFileSync(dir + '/en_US/messages.json', messages, 'utf8');
		}

		console.log('done.');
	}
}

main(parse_args());
