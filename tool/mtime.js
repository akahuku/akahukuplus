#!/usr/bin/env node

const fs = require('fs');
const OptionParser = require('./lib/optparse');

var dir = '',
	base = '',
	basemtime = 0,
	out = '';

(new OptionParser)
	.on(
		'--dir    required, path to extension source directory',
		function (v) {dir = v})
	.on(
		'--base    path to target file of mtime',
		function (v) {base = v})
	.on(
		'--out    path to output file',
		function (v) {out = v})
	.parse(process.argv)

if (dir == '') {
	console.log('missing directory.');
	process.exit(1);
}
console.log('directory: ' + dir);

if (base != '') {
	try {
		basemtime = new Date(fs.statSync(base).mtime);
	}
	catch (ex) {
		basemtime = 0;
		base = '';
	}
}
else {
	basemtime = 0;
}

var latest = {
	time: 0,
	path: ''
};

function loop (path, callback) {
	fs.readdirSync(path).forEach(function (entry) {
		if (/\.sw.$/.test(entry)) return;

		var p = path + '/' + entry;
		if (fs.statSync(p).isDirectory()) {
			loop(p, callback);
		}
		else {
			callback(p);
		}
	});
}
loop(dir, function (f) {
	var mt = new Date(fs.statSync(f).mtime).getTime();
	if (mt > latest.time) {
		latest.time = mt;
		latest.path = f;
	}
	if (base != '' && mt > basemtime) {
		console.log('newer: ' + (new Date(mt)).toLocaleString() + '\t' + f);
	}
});

if (out == '') {
	console.log(
		'latest timestamp: ' +
		(new Date(latest.time)).toLocaleString() + '\t' +
		latest.path);
}
else {
	var mtime = Math.floor((new Date).getTime() / 1000);
	fs.utimesSync(out, mtime, mtime);
}
