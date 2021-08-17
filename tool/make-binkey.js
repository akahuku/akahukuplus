#!/usr/bin/env node

const fs = require('fs');
const OptionParser = require('./lib/optparse');
const SHA1 = require('./lib/SHA1').SHA1;
const Blowfish = require('./lib/Blowfish').Blowfish;

var keyfile = '',
	srcfile = '',
	dstfile = '',
	verbose = 0;

(new OptionParser)
	.on('--key    path to crypt key file',
		function (v) {keyfile = v})
	.on('--src    path to crypt source file',
		function (v) {srcfile = v})
	.on('--dst    path to destination file',
		function (v) {dstfile = v})
	.on('--verbose    increase verbosity',
		function (v) {verbose++})
	.parse(process.argv);

if (keyfile == '') {
	console.log('missing key file.');
	process.exit(1);
}
verbose && console.log('key file: ' + keyfile);

if (srcfile == '') {
	console.log('missing source file.');
	process.exit(1);
}
verbose && console.log('source file: ' + srcfile);
verbose && console.log('destination file: ' + dstfile);

/*
 * load the key
 */

var key;
try {
	key = fs.readFileSync(keyfile, 'utf8');
}
catch (ex) {
	console.log('cannot read the key file: ' + keyfile + ', ' + ex.message);
	process.exit(1);
}
verbose > 1 && console.log('key:\n' + key);

key = SHA1.calc(key);
verbose && console.log('sha1 of key: ' + key);

/*
 * load the content
 */

var content;
try {
	content = fs.readFileSync(srcfile, 'utf8');
}
catch (ex) {
	console.log('cannot read the source file: ' + srcfile + ', ' + ex.message);
	process.exit(1);
}
verbose && console.log('length of source content: ' + content.length + ' characters');
verbose > 1 && console.log('source: ' + content);

/*
 * make binkey
 */

var bf = new Blowfish(key.substring(0, 16));
var content_crypted = bf.encrypt64(content);
var content_decrypted = bf.decrypt64(content_crypted);
if (content == content_decrypted) {
	verbose && console.log('encryption succeeded');
}
else {
	console.log('*** encryption failed ***');
	process.exit(1);
}

/*
 * output
 */

if (dstfile != '') {
	fs.writeFileSync(dstfile, content_crypted, 'utf8');
	verbose > 1 && console.log('crypted: ' + content_crypted);
}
else {
	console.log('\n*** result ***');
	console.log(content_crypted);
}
