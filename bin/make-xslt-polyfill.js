#!/usr/bin/env node

import fs from 'node:fs/promises';
import {default as nodePath} from 'node:path';
import * as url from 'node:url';

const __dirname = nodePath.dirname(url.fileURLToPath(import.meta.url));

console.log(`\
(() => {
	const xsltPolyfillOptions = {
		xsltUsePolyfillOnlyIfNeeded: false,
		xsltDontAutoloadXmlDocs: true,
		xsltPolyfillQuiet: false,
	};
`);

const contentPath = nodePath.join(
	__dirname,
	'../node_modules/xslt-polyfill/xslt-polyfill.min.js');
const content = await fs.readFile(contentPath, 'utf8');
console.log(content);

console.log(`\
})();
`);
