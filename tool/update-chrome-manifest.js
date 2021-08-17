#!/usr/bin/env node

const fs = require('fs');
const OptionParser = require('./lib/optparse');

var dir = '',
	outdir = '',
	ver = '',
	strip_update_url = false,
	strip_applications = false,
	update_url = false,
	manifest = 'manifest.json';

(new OptionParser)
	.on(
		'--indir,-i    required, path to extension source directory',
		function (v) {dir = v})
	.on(
		'--outdir,-o    required, path to destination directory',
		function (v) {outdir = v})
	.on(
		'--ver,-v    required, version string',
		function (v) {ver = v})
	.on(
		'--strip-update-url    strip "update_url" key from manifest',
		function (v) {strip_update_url = true})
	.on(
		'--strip-applications    strip "applications" key from manifest',
		function (v) {strip_applications = true})
	.on(
		'--update-url    url points update manifest file',
		function (v) {update_url = v})
	.parse(process.argv)

if (dir == '') {
	console.log('missing base directory.');
	process.exit(1);
}
if (ver == '') {
	console.log('missing version.');
	process.exit(1);
}

var content;
try {
	content = fs.readFileSync(dir + '/' + manifest, 'utf8');
}
catch (ex) {
	console.log('cannot read ' + dir + '/' + manifest);
	process.exit(1);
}

content = JSON.parse(content);
content['version'] = ver;
if (update_url && update_url in content) {
	content['update_url'] = update_url;
}
if (strip_update_url) {
	delete content['update_url'];
}
if (strip_applications) {
	delete content['applications'];
}

content = JSON.stringify(content, null, '\t');

if (outdir != '') {
	fs.writeFileSync(outdir + '/' + manifest, content, 'utf8');
}
else {
	console.log(content);
}
