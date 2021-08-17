#!/usr/bin/env node

const fs = require('fs');
const OptionParser = require('./lib/optparse');

var dir = '',
	echo_only = false;

(new OptionParser)
	.on(
		'--indir    required, path to extension\'s locale directory',
		function (v) {dir = v})
	.on(
		'--echo    do not output to <extension\'s locale directory>/locales.json',
		function (v) {echo_only = true})
	.parse(process.argv)

if (dir == '') {
	console.log('missing directory.');
	process.exit(1);
}
console.log('directory: ' + dir);

var locales = fs.readdirSync(dir)
	.filter(function (e) {return fs.statSync(dir + '/' + e).isDirectory()})
	.sort();

var out = JSON.stringify(locales);
if (echo_only) {
	console.log(out);
}
else {
	fs.writeFileSync(dir + '/locales.json', out, 'utf8');
}
