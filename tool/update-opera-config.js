#!/usr/bin/env node

const fs = require('fs');
const OptionParser = require('./lib/optparse');
const libxml = require('libxmljs');

var dir = '',
	outdir = '',
	localedir = '',
	ver = '',
	update_url = '',
	product = 'GoodExtension';

const defaultNamespace = 'http://www.w3.org/ns/widgets';

(new OptionParser)
	.on('--indir      required, path to extension directory', v => dir = v)
	.on('--product    required, product name', v => product = v)
	.on('--ver        required, string', v => ver = v)
	.on('--outdir     path to output directory', v => outdir = v)
	.on('--localedir  locale directory. default is "<indir>/locales"', v => localedir = v)
	.on('--update-url url', v => update_url = v)
	.parse(process.argv)

if (dir == '') {
	console.log('missing directory.');
	process.exit(1);
}
if (ver == '') {
	console.log('missing version.');
	process.exit(1);
}
if (product == '') {
	console.log('missing product name.');
	process.exit(1);
}

var xml = libxml.parseXmlString(
	fs.readFileSync(dir + '/config.xml', 'utf8'),
	{noblanks: true});

// set the version
xml.root().attr({version: ver});

// set the elements language description specified
if (localedir == '') {
	localedir = dir + '/locales';
}
if (localedir != '') {
	fs.readdirSync(localedir)
		.filter(e => fs.statSync(localedir + '/' + e).isDirectory())
		.forEach(e => {
			var message = JSON.parse(
				fs.readFileSync(localedir + '/' + e + '/messages.json', 'utf8'));
			var localeCode = e.replace(/_/g, '-').toLowerCase();

			[
				{
					message_suffix: 'name',
					element_name: 'name'
				},
				{
					message_suffix: 'desc',
					element_name: 'description'
				}
			].forEach(item => {
				var key1 = product + '_' + item.message_suffix;
				var key2 = 'message';

				if (!(key1 in message)) {
					throw new Error(key1 + ' not found');
				}

				if (!(key2 in message[key1])) {
					throw new Error(key1 + ' - ' + key2 + ' not found');
				}

				var element = xml.root().node(item.element_name, message[key1][key2]);
				element.attr({'xml:lang': localeCode});
			});
		})
}

// strip all elements language description NOT specified
while (true) {
	var elementNotLangSpecified = xml.get(
		'//xmlns:name[not(@xml:lang)] | //xmlns:description[not(@xml:lang)]',
		defaultNamespace
	);
	if (elementNotLangSpecified) {
		elementNotLangSpecified.remove();
	}
	else {
		break;
	}
}

// append update-description element if specified
if (update_url != '') {
	var updateDescriptions = xml.find(
		'//xmlns:update-description',
		{'xmlns': defaultNamespace});
	if (updateDescriptions.length) {
		updateDescriptions.forEach(node => {
			node.attr({href: update_url});
		});
	}
	else {
		xml.root().node('update-description').attr({href: update_url});
	}
}

// output
if (outdir != '') {
	fs.writeFileSync(outdir + '/config.xml', xml.toString(true));
}
else {
	console.log(xml.toString(true));
}
