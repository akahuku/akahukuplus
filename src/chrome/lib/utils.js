/**
 * miscellaneous utility functions
 *
 *
 * Copyright 2024-2025 akahuku, akahuku@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * helper vars/functions for chrome extension
 */

export const {chromeWrap, IS_WEB_EXTENSION} = (() => {
	let chromeWrap = null;
	let isWebExtension = false;

	if (typeof browser !== 'undefined') {
		chromeWrap = browser;
		isWebExtension = true;
	}
	else if (typeof chrome !== 'undefined') {
		chromeWrap = chrome;
	}

	if (typeof chromeWrap?.management?.getSelf === 'function') {
		chromeWrap.management.getSelf().then(ei => {
			Object.defineProperty(chromeWrap, 'IS_DEVELOP', {
				value: ei.installType === 'development'
			});
		});
	}

	return {
		chromeWrap,
		IS_WEB_EXTENSION: isWebExtension
	};
})();

/*
 * i18n functions (relies on Chrome extension)
 */

// ported from https://github.com/sindresorhus/irregular-plurals/blob/main/irregular-plurals.json
const EN_IRREGULAR_PLURALS = {
	'abscissa': 'abscissae',
	'addendum': 'addenda',
	'adulthood': 'adulthood',
	'advice': 'advice',
	'afreet': 'afreets',
	'afrit': 'afrits',
	'agendum': 'agenda',
	'aid': 'aid',
	'aircraft': 'aircraft',
	'albino': 'albinos',
	'alcohol': 'alcohol',
	'alga': 'algae',
	'alto': 'altos',
	'alumna': 'alumnae',
	'alumnus': 'alumni',
	'alveolus': 'alveoli',
	'amoeba': 'amoebas',
	'ammo': 'ammo',
	'analysis': 'analyses',
	'analytics': 'analytics',
	'anathema': 'anathemas',
	'anime': 'anime',
	'antenna': 'antennas',
	'antithesis': 'antitheses',
	'aphelion': 'aphelia',
	'apparatus': 'apparatuses',
	'appendix': 'appendixes',
	'aquarium': 'aquariums',
	'archipelago': 'archipelagos',
	'armadillo': 'armadillos',
	'asyndeton': 'asyndetons',
	'athletics': 'athletics',
	'audio': 'audio',
	'aurora': 'auroras',
	'automaton': 'automatons',
	'axis': 'axes',
	'bacillus': 'bacilli',
	'bacterium': 'bacteria',
	'baculum': 'bacula',
	'barracks': 'barracks',
	'basis': 'bases',
	'basso': 'bassos',
	'beau': 'beaus',
	'beef': 'beefs',
	'blood': 'blood',
	'bema': 'bemas',
	'biceps': 'biceps',
	'bison': 'bison',
	'bream': 'bream',
	'breeches': 'breeches',
	'britches': 'britches',
	'brother': 'brothers',
	'buffalo': 'buffalo',
	'bureau': 'bureaus',
	'businessman': 'businessmen',
	'butter': 'butter',
	'cactus': 'cactuses',
	'calf': 'calves',
	'cash': 'cash',
	'candelabrum': 'candelabra',
	'canto': 'cantos',
	'cantus': 'cantus',
	'carcinoma': 'carcinomas',
	'carp': 'carp',
	'census': 'censuses',
	'chapeau': 'chapeaus',
	'charisma': 'charismas',
	'chairman': 'chairmen',
	'chassis': 'chassis',
	'cherub': 'cherubs',
	'chess': 'chess',
	'child': 'children',
	'château': 'châteaus',
	'clippers': 'clippers',
	'clitoris': 'clitorises',
	'clothes': 'clothes',
	'clothing': 'clothing',
	'cloaca': 'cloacae',
	'cod': 'cod',
	'codex': 'codices',
	'commerce': 'commerce',
	'coitus': 'coitus',
	'commando': 'commandos',
	'compendium': 'compendiums',
	'concerto': 'concertos',
	'consortium': 'consortia',
	'contralto': 'contraltos',
	'contretemps': 'contretemps',
	'cooperation': 'cooperation',
	'corps': 'corps',
	'corpus': 'corpora',
	'cortex': 'cortices',
	'cranium': 'crania',
	'crescendo': 'crescendos',
	'crisis': 'crises',
	'criterion': 'criteria',
	'curriculum': 'curricula',
	'cyclops': 'cyclopses',
	'cystoma': 'cystomata',
	'data': 'data',
	'datum': 'data',
	'debris': 'debris',
	'deer': 'deer',
	'desideratum': 'desiderata',
	'diabetes': 'diabetes',
	'diagnosis': 'diagnoses',
	'dictum': 'dicta',
	'die': 'dice',
	'digestion': 'digestion',
	'dingo': 'dingoes',
	'diploma': 'diplomas',
	'ditto': 'dittos',
	'djinni': 'djinn',
	'dogma': 'dogmata',
	'drama': 'dramas',
	'dwarf': 'dwarfs',
	'dynamo': 'dynamos',
	'economics': 'economics',
	'echo': 'echoes',
	'edema': 'edemas',
	'efreet': 'efreets',
	'eland': 'eland',
	'elf': 'elves',
	'elk': 'elk',
	'ellipsis': 'ellipses',
	'embargo': 'embargoes',
	'embryo': 'embryos',
	'emphasis': 'emphases',
	'emporium': 'emporia',
	'encomium': 'encomia',
	'enigma': 'enigmas',
	'equipment': 'equipment',
	'ephemeris': 'ephemerides',
	'erratum': 'errata',
	'excretion': 'excretion',
	'expertise': 'expertise',
	'extremum': 'extrema',
	'faux pas': 'faux pas',
	'fez': 'fezzes',
	'fiasco': 'fiascos',
	'fibula': 'fibulae',
	'firmware': 'firmware',
	'fish': 'fish',
	'flounder': 'flounder',
	'focus': 'focuses',
	'foot': 'feet',
	'fun': 'fun',
	'foramen': 'foramina',
	'formula': 'formulas',
	'forum': 'forums',
	'fungus': 'fungi',
	'gallows': 'gallows',
	'garbage': 'garbage',
	'ganglion': 'ganglia',
	'generalissimo': 'generalissimos',
	'genie': 'genies',
	'gentleman': 'gentlemen',
	'genus': 'genera',
	'ghetto': 'ghettos',
	'glomerulus': 'glomeruli',
	'goose': 'geese',
	'goy': 'goyim',
	'graffiti': 'graffiti',
	'graffito': 'graffiti',
	'grouse': 'grouse',
	'guano': 'guano',
	'gumma': 'gummata',
	'gymnasium': 'gymnasiums',
	'half': 'halves',
	'hamulus': 'hamuli',
	'hardware': 'hardware',
	'health': 'health',
	'headquarters': 'headquarters',
	'hero': 'heroes',
	'herpes': 'herpes',
	'highjinks': 'highjinks',
	'hijinks': 'hijinks',
	'hiatus': 'hiatuses',
	'hippopotamus': 'hippopotamuses',
	'homework': 'homework',
	'honorarium': 'honoraria',
	'hoof': 'hooves',
	'housework': 'housework',
	'hovercraft': 'hovercraft',
	'humerus': 'humeri',
	'hyperbaton': 'hyperbata',
	'hyperbola': 'hyperbolae',
	'hypothesis': 'hypotheses',
	'ilium': 'ilia',
	'impetus': 'impetuses',
	'incubus': 'incubi',
	'index': 'indexes',
	'information': 'information',
	'inferno': 'infernos',
	'innings': 'innings',
	'interregnum': 'interregna',
	'interstitium': 'interstitia',
	'jackanapes': 'jackanapes',
	'jeans': 'jeans',
	'jumbo': 'jumbos',
	'kakapo': 'kakapo',
	'knife': 'knives',
	'kudos': 'kudos',
	'labour': 'labour',
	'lacuna': 'lacunas',
	'larva': 'larvae',
	'leaf': 'leaves',
	'lemma': 'lemmas',
	'libretto': 'librettos',
	'life': 'lives',
	'lingo': 'lingos',
	'literature': 'literature',
	'loaf': 'loaves',
	'loculus': 'loculi',
	'locus': 'loci',
	'looey': 'looies',
	'louse': 'lice',
	'lumbago': 'lumbagos',
	'lumen': 'lumina',
	'lustrum': 'lustra',
	'lymphoma': 'lymphomata',
	'machinery': 'machinery',
	'mackerel': 'mackerel',
	'magma': 'magmas',
	'mail': 'mail',
	'magneto': 'magnetos',
	'man': 'men',
	'manga': 'manga',
	'manifesto': 'manifestos',
	'matrix': 'matrices',
	'maximum': 'maxima',
	'means': 'means',
	'measles': 'measles',
	'medico': 'medicos',
	'medium': 'media',
	'melisma': 'melismas',
	'memorandum': 'memoranda',
	'meniscus': 'menisci',
	'mews': 'mews',
	'miasma': 'miasmas',
	'millennium': 'millennia',
	'minimum': 'minima',
	'minutia': 'minutiae',
	'momentum': 'momenta',
	'mongoose': 'mongooses',
	'moose': 'moose',
	'mud': 'mud',
	'mouse': 'mice',
	'mumps': 'mumps',
	'music': 'music',
	'murex': 'murices',
	'mythos': 'mythoi',
	'nebula': 'nebulas',
	'nemesis': 'nemeses',
	'neurosis': 'neuroses',
	'news': 'news',
	'nexus': 'nexuses',
	'nimbus': 'nimbuses',
	'noumenon': 'noumena',
	'nova': 'novas',
	'nucleolus': 'nucleoli',
	'nucleus': 'nuclei',
	'oasis': 'oases',
	'occiput': 'occipita',
	'octavo': 'octavos',
	'octopus': 'octopuses',
	'oedema': 'oedemas',
	'offspring': 'offspring',
	'omphalos': 'omphaloi',
	'optimum': 'optima',
	'opus': 'opuses',
	'organon': 'organons',
	'ovum': 'ova',
	'ox': 'oxen',
	'parabola': 'parabolas',
	'paralysis': 'paralyses',
	'parenthesis': 'parentheses',
	'passerby': 'passersby',
	'penny': 'pennies',
	'personnel': 'personnel',
	'perihelion': 'perihelia',
	'person': 'people',
	'phalanx': 'phalanges',
	'phenomenon': 'phenomena',
	'photo': 'photos',
	'physics': 'physics',
	'phylum': 'phyla',
	'pike': 'pike',
	'pincers': 'pincers',
	'plankton': 'plankton',
	'plateau': 'plateaus',
	'platypus': 'platypuses',
	'plexus': 'plexuses',
	'pliers': 'pliers',
	'police': 'police',
	'policeman': 'policemen',
	'politics': 'politics',
	'pollution': 'pollution',
	'polyhedron': 'polyhedra',
	'pontifex': 'pontifices',
	'potato': 'potatoes',
	'premises': 'premises',
	'pro': 'pros',
	'proceedings': 'proceedings',
	'prognosis': 'prognoses',
	'prolegomenon': 'prolegomena',
	'prospectus': 'prospectuses',
	'quantum': 'quanta',
	'quarto': 'quartos',
	'quiz': 'quizzes',
	'rabies': 'rabies',
	'rain': 'rain',
	'radius': 'radii',
	'referendum': 'referendums',
	'reindeer': 'reindeer',
	'research': 'research',
	'rhino': 'rhinos',
	'rice': 'rice',
	'roof': 'roofs',
	'rostrum': 'rostrums',
	'salmon': 'salmon',
	'sarcoma': 'sarcomas',
	'sarcophagus': 'sarcophagi',
	'savings': 'savings',
	'scarf': 'scarves',
	'schema': 'schemas',
	'scissors': 'scissors',
	'scrotum': 'scrota',
	'sea bass': 'sea bass',
	'sewage': 'sewage',
	'self': 'selves',
	'seminoma': 'seminomas',
	'shambles': 'shambles',
	'seraph': 'seraphs',
	'series': 'series',
	'shears': 'shears',
	'sheep': 'sheep',
	'shelf': 'shelves',
	'shrimp': 'shrimp',
	'silex': 'silices',
	'simplex': 'simplexes',
	'simulacrum': 'simulacra',
	'software': 'software',
	'sinus': 'sinuses',
	'soliloquy': 'soliloquies',
	'solo': 'solos',
	'soma': 'somas',
	'soprano': 'sopranos',
	'spacecraft': 'spacecraft',
	'spokesman': 'spokesmen',
	'species': 'species',
	'spectrum': 'spectra',
	'speculum': 'specula',
	'sphinx': 'sphinxes',
	'squid': 'squid',
	'stadium': 'stadiums',
	'staff': 'staffs',
	'stairs': 'stairs',
	'stamen': 'stamens',
	'status': 'statuses',
	'stigma': 'stigmas',
	'stimulus': 'stimuli',
	'stoma': 'stomas',
	'stratum': 'strata',
	'stylus': 'styluses',
	'succubus': 'succubi',
	'swine': 'swine',
	'syconium': 'syconia',
	'syllabus': 'syllabuses',
	'symposium': 'symposiums',
	'synopsis': 'synopses',
	'synthesis': 'syntheses',
	'tennis': 'tennis',
	'tableau': 'tableaus',
	'tempo': 'tempos',
	'thanks': 'thanks',
	'testis': 'testes',
	'that': 'those',
	'thesis': 'theses',
	'thief': 'thieves',
	'this': 'these',
	'thrombus': 'thrombi',
	'tibia': 'tibias',
	'tomato': 'tomatoes',
	'tooth': 'teeth',
	'torpedo': 'torpedoes',
	'tornado': 'tornadoes',
	'torus': 'tori',
	'traffic': 'traffic',
	'transportation': 'transportation',
	'trapezium': 'trapezia',
	'trauma': 'traumas',
	'triceps': 'triceps',
	'trilby': 'trilbies',
	'trout': 'trout',
	'tuna': 'tuna',
	'ultimatum': 'ultimatums',
	'umbilicus': 'umbilici',
	'upstairs': 'upstairs',
	'uterus': 'uteruses',
	'vacuum': 'vacuums',
	'velum': 'vela',
	'vertebra': 'vertebrae',
	'vertex': 'vertices',
	'veto': 'vetoes',
	'viscus': 'viscera',
	'wealth': 'wealth',
	'welfare': 'welfare',
	'vita': 'vitae',
	'volcano': 'volcanoes',
	'vortex': 'vortices',
	'watercraft': 'watercraft',
	'wharf': 'wharves',
	'whiting': 'whiting',
	'wife': 'wives',
	'wildebeest': 'wildebeest',
	'wildlife': 'wildlife',
	'wolf': 'wolves',
	'woman': 'women'
};

export const {LOCALE, _} = (() => {
	let LOCALE, _;
	try {
		if (chromeWrap) {
			LOCALE = chromeWrap.i18n.getMessage('locale_code');
		}
		else if (typeof process !== 'undefined') {
			// TBD
			LOCALE = 'C';
		}
		else {
			throw new Error('This context is not a browser extension.');
		}

		if (LOCALE === '') {
			throw new Error('The current locale cannot be identified because the “locale_code” message is not registered.');
		}
	}
	catch {
		return {LOCALE: null, _: a => a};
	}

	switch (LOCALE) {
	case 'en':
		_ = (id, ...args) => {
			const result = chromeWrap.i18n.getMessage(id, args);
			return result.replace(/\b(\d+)(\s*)([a-z\u00a0]{2,})/g, ($0, n, space, word) => {
				if (n - 0 === 1) return $0;

				const index = word.lastIndexOf('\u00a0');
				if (index >= 0) {
					const lastWord = word.substring(index + 1);
					if (lastWord in EN_IRREGULAR_PLURALS) {
						return n + space + word.substring(0, index + 1) + EN_IRREGULAR_PLURALS[lastWord];
					}
				}
				else if (word in EN_IRREGULAR_PLURALS) {
					return n + space + EN_IRREGULAR_PLURALS[word];
				}

				if (/[hos]$/.test(word)) {
					word += 'es';
				}
				else if (/[^aeiou]y$/.test(word)) {
					word = word.substr(0, word.length - 1) + 'ies';
				}
				else {
					word += 's';
				}

				return n + space + word;
			});
		};
		break;

	case 'ja':
		_ = (id, ...args) => {
			return chromeWrap.i18n.getMessage(id, args);
		};
		break;

	default:
		_ = a => a;
		break;
	}

	return {LOCALE, _};
})();

/*
 * log functions (relies on Chrome extension)
 */

let enableLogFunction = false;
let enableExternalLog = false;
let logName;
let logCount = 0;
let logSetup = (async () => {
	const manifest = chromeWrap?.runtime?.getManifest?.() ?? {};
	const IS_DEVELOP = typeof chromeWrap?.management?.getSelf === 'function' ?
		(await chromeWrap.management.getSelf()).installType === 'development' :
		false;

	// enable logging on developer mode
	enableLogFunction = IS_DEVELOP;

	// enable external logging on debug manifest
	enableExternalLog = IS_DEVELOP
		&& ('version_name' in manifest)
		&& /(?:develop|debug)/.test(manifest.version_name)
})();

function logCore (...args) {
	if (!enableLogFunction) return;

	const now = new Date;
	const header = `[${++logCount}] ${now.toLocaleTimeString()}.${('' + now.getMilliseconds()).padStart(3, '0')}`;
	const s = header + '\t' + args.map(a => {
		if (a instanceof Error) {
			a = `${a.message}\n${a.stack}`;
		}
		return a;
	}).join(' ');

	// ###DEBUG CODE START###
	if (enableExternalLog) {
		try {
			fetch('http://dev.appsweets.net/extension-beacon/index.php', {
				method: 'POST',
				mode: 'cors',
				body: new URLSearchParams({
					message: s,
					name: logName ?? ''
				})
			}).catch(err => {
				console.log(err.stack);
			});
		}
		catch {
			console.log(s);
		}
	}
	// ###DEBUG CODE END###
	console.log(s);
}

export function log (...args) {
	if (logSetup) {
		console.log('log: waiting log setup...');
		logSetup.then(() => {
			console.log('log: after log setup');
			logSetup = undefined;
			logCore(...args);
		});
	}
	else {
		logCore(...args);
	}
}

log.config = con => {
	if ('enabled' in con) {
		enableLogFunction = !!con.enabled;
	}
	if ('enableExternalLog' in con) {
		enableExternalLog = !!con.enableExternalLog;
	}
	if ('name' in con) {
		logName = con.name;
	}
};

/*
 * offscreen utilities (relies on Chrome extension)
 *
 * note: currently we are using the “chrome” object directly,
 *       as the off-screen functionality is specific to manifest v3.
 */

export const {offscreenUrl, offscreenCloseAlarm} = ((c, b) => {
	if (!c || b) {
		return {
			offscreenUrl: '',
			offscreenCloseAlarm: ''
		};
	}
	else {
		return {
			offscreenUrl: chrome.runtime.getURL('asset/offscreen.html'),
			offscreenCloseAlarm: `offscreen-close-alarm-${chrome.runtime.id}`
		};
	}
})(typeof chrome !== 'undefined' ? chrome : null,
	typeof browser !== 'undefined' ? browser : null);

let offscreenDocumentCreating;

async function hasOffscreenDocument () {
	if (typeof chrome.runtime.getContexts == 'function') {
		const contexts = await chrome.runtime.getContexts({
			contextTypes: ['OFFSCREEN_DOCUMENT'],
			documentUrls: [offscreenUrl]
		});
		return contexts.length > 0;
	}
	else {
		for (const client of await clients.matchAll()) {
			if (client.url === offscreenUrl) {
				return true;
			}
		}
		return false;
	}
}

async function setupOffscreenDocument () {
	if (offscreenUrl == '') {
		throw new Error('this runtime is not a chrome extension');
	}

	const existingContexts = await hasOffscreenDocument();

	if (existingContexts) {
		return offscreenUrl;
	}

	// create offscreen document
	if (offscreenDocumentCreating) {
		await offscreenDocumentCreating;
	}
	else {
		offscreenDocumentCreating = chrome.offscreen.createDocument({
			url: offscreenUrl,
			reasons: [
				chrome.offscreen.Reason.AUDIO_PLAYBACK,
				chrome.offscreen.Reason.BLOBS
			],
			justification: 'reason for needing the document',
		});
		await offscreenDocumentCreating;
		offscreenDocumentCreating = null;
	}
	return offscreenUrl;
}

async function registerOffscreenDocumentCloser () {
	await chrome.alarms.clear(offscreenCloseAlarm);
	await chrome.alarms.create(offscreenCloseAlarm, {
		delayInMinutes: 1
	});
}

export async function openOffscreenDocument (command, params) {
	await setupOffscreenDocument();

	const existingContexts = await hasOffscreenDocument();
	let result;
	if (existingContexts) {
		result = await new Promise(resolve => {
			chrome.runtime.sendMessage({
				target: 'offscreen',
				log: {
					enabled: enableLogFunction,
					enableExternalLog: enableExternalLog,
					name: logName
				},
				command,
				params
			}, response => {
				if (chrome.runtime.lastError) {
					console.error(chrome.runtime.lastError);
				}
				resolve(response);
			});
		});
		await registerOffscreenDocumentCloser();
	}
	return result;
}

/*
 * tts function (relies on Chrome extension)
 */

export function Speech () {
	const con = {
		voice: 'tts',
		volume: 0.5,
		pitch: 1.0,
		rate: 1.0,
		voiceTextApiKey: null,
		fallback: false
	};

	/*
	async function openPopup (params) {
		await chromeWrap.storage.local.set({
			speechParams: params
		});

		const url = chromeWrap.runtime.getURL('asset/speech.html');
		const popup = await chromeWrap.windows.create({
			type: 'popup',
			focused: false,
			top: 1, left: 1,
			height: 1, width: 1,
			url
		});
		const tabId = popup.tabs[0].id;

		await Promise.all([
			chromeWrap.storage.local.set({
				speechTab: tabId
			}),
			new Promise(resolve => {
				chromeWrap.tabs.onRemoved.addListener(function onRemoved (tabId) {
					if (tabId == tabId) {
						chromeWrap.tabs.onRemoved.removeListener(onRemoved);
						resolve();
					}
				})
			})
		]);
	}
	*/

	function startTTS (text) {
		return new Promise(resolve => {
			chromeWrap.tts.speak(
				text,
				{
					lang: 'ja-JP',
					volume: con.volume,
					pitch: con.pitch,
					rate: con.rate,
					onEvent: e => {
						switch (e.type) {
						case 'end':
						case 'interrupted':
						case 'cancelled':
						case 'error':
							resolve();
							break;
						}
					},
				}
			);
		});
	}

	function startWebSpeech (text) {
		return openOffscreenDocument('speech', {
			type: 'webspeech',
			volume: con.volume,
			pitch: con.pitch,
			rate: con.rate,
			lang: 'ja-JP',
			text
		});
	}

	function startVoiceText (text, voice) {
		return openOffscreenDocument('speech', {
			type: 'voicetext',
			voice: voice,
			volume: con.volume,
			pitch: con.pitch,
			rate: con.rate,
			text
		});
	}

	function config (newconfig) {
		for (const p in con) {
			if (p in newconfig) {
				con[p] = newconfig[p];
			}
		}
		return this;
	}

	function start (text) {
		let p;

		switch (con.voice) {
		case 'voicetext/hikari':
		case 'voicetext/show':
			p = startVoiceText(text, con.voice.split('/')[1]);
			break;
		case 'webspeech':
			p = startWebSpeech(text);
			break;
		case 'tts':
			return startTTS(text);
		default:
			return Promise.reject(new Error('unknown voice type'));
		}

		if (con.fallback) {
			p = p.catch(() => {
				return startTTS(text);
			});
		}

		return p;
	}

	function stop () {
		let p;

		switch (con.voice) {
		case 'voicetext/hikari':
		case 'voicetext/show':
		case 'webspeech':
			p = openOffscreenDocument('speech-stop', {});
			break;
		case 'tts':
			chromeWrap.tts.stop();
			p = Promise.resolve();
			break;
		default:
			return Promise.reject(new Error('unknown voice type'));
		}

		return p;
	}

	return {config, start, stop};
}

/*
 * audio functions (relies on Chrome extension)
 */

export function audioPlay (key) {
	return openOffscreenDocument('audio-play', {key});
}

/*
 * misc functions
 */

export function dcl () {
	return new Promise(resolve => {
		if (document.readyState === 'complete' || document.readyState === 'interactive') {
			resolve();
		}
		else {
			document.addEventListener('DOMContentLoaded', resolve, {once: true});
		}
	});
}

export function delay (wait) {
	return new Promise(resolve => {
		setTimeout(resolve, wait);
	});
}

export function $ (id) {
	return typeof id === 'string' ? document.getElementById(id) : id;
}

export function $qs (selector, node) {
	return ($(node) || document).querySelector(selector);
}

export function $qsa (selector, node) {
	return ($(node) || document).querySelectorAll(selector);
}

export function removeChild (...args) {
	for (let node of args) {
		node = $(node);
		if (node instanceof Node) {
			if (node.parentNode) {
				node.parentNode.removeChild(node);
			}
		}
		else if (node instanceof NodeList) {
			removeChild.apply(null, Array.from(node));
		}
	}
}

export function empty (...args) {
	for (let node of args) {
		node = $(node);
		if (!node) continue;
		const r = document.createRange();
		r.selectNodeContents(node);
		r.deleteContents();
	}
}

export function updateI18n () {
	document.querySelectorAll('[data-i18n]').forEach(node => {
		const key = node.dataset.i18n;
		const localized = chromeWrap.i18n.getMessage(key);
		if (typeof localized == 'string' && localized != '') {
			node.textContent = localized;
		}
	});
}

export function getErrorDescription (err) {
	let result = '';

	if ('message' in err) {
		result += err.message;
	}

	if ('fileName' in err) {
		result += ' at ' + err.fileName;
		if ('lineNumber' in err) {
			result += ':' + err.lineNumber;
		}
	}

	if ('stack' in err) {
		if (result !== '') {
			result += '\n';
		}
		result += err.stack;
	}

	return result;
}

export async function load (url, options = {}, type) {
	const result = {};
	let fetchActual, response;

	if (typeof content !== 'undefined' && typeof content.fetch === 'function') {
		fetchActual = content.fetch;
	}
	else if (typeof fetch === 'function') {
		fetchActual = fetch;
	}
	else {
		result.error = `fetch() is unavailable on this platform`;
		return result;
	}

	try {
		response = await fetchActual(url, options);
	}
	catch (err) {
		// network error (network down, dns lookup failed...)
		result.error = 'network error: ' + getErrorDescription(err);
		return result;
	}

	if ('headers' in response) {
		const headers = {};
		for (let h of response.headers) {
			headers[h[0].toLowerCase()] = h[1];
		}
		result.headers = headers;

		if (typeof response.headers.getSetCookie == 'function') {
			result.cookies = response.headers.getSetCookie();
		}
	}

	if ('status' in response) {
		result.status = response.status;
	}

	if ('statusText' in response) {
		result.statusText = response.statusText;
	}

	if (!response.ok) {
		// server error (server down, not found, not modified...)
		result.error = `server error: ${response.statusText} (${response.status})`;
		return result;
	}

	try {
		let content;
		switch (type) {
		case 'text':
			content = await response.text();
			break;

		case 'blob':
			content = await response.blob();
			break;

		case 'arraybuffer':
			content = await response.arrayBuffer();
			break;

		case /^text\s*;\s*charset\s*=\s*(.+)$/i.test(type) && type:
			{
				const encoding = RegExp.$1;
				const blob = await response.blob();
				content = await new Promise((resolve, reject) => {
					const reader = new FileReader;
					reader.onload = () => {resolve(reader.result)};
					reader.onerror = () => {reject(reader.error.message)};
					reader.readAsText(blob, encoding);
				});
			}
			break;

		case /^data(?:\s*;\s*fold\s*=\s*(\d+))?/.test(type) && type:
			{
				const fold = RegExp.$1 ? RegExp.$1 - 0 : 0;
				const blob = await response.blob();
				content = await new Promise((resolve, reject) => {
					const reader = new FileReader;
					reader.onload = () => {
						resolve(fold === 0 ?
							reader.result :
							reader.result.replace(new RegExp(`.{${fold}}`, 'g'), '$&\n')
						);
					};
					reader.onerror = () => {reject(reader.error.message)};
					reader.readAsDataURL(blob);
				});
			}
			break;

		default:
			content = await response.json();
			break;
		}

		result.content = content;
		return result;
	}
	catch (err) {
		// response error (invalid json...)
		result.error = 'response error: ' + getErrorDescription(err);
		return result;
	}
}

export function getReadableSize (size) {
	const s = typeof size == 'string' ? size - 0 : size;
	if (typeof s != 'number' || isNaN(s) || !isFinite(s) || s < 0) return size;

	const UNIT = 1024;
	const index = Math.log(size) / Math.log(UNIT) | 0;
	if (index == 0) {
		return s == 1 ? `${s}Byte` : `${s}Bytes`;
	}

	return (s / Math.pow(UNIT, index)).toFixed(20).replace(/(\...).*/, '$1') +
		' KMGTPEZY'.charAt(index) +
		'iB';
}

export function debounce (fn, interval = 100) {
	let timerId;
	return (...args) => {
		timerId && clearTimeout(timerId);
		timerId = setTimeout(() => {
			timerId = undefined;
			fn.apply(null, args);
		}, interval);
	}
}

export function throttle (fn, limit) {
	let waiting = false;
	return (...args) => {
		if (!waiting) {
			fn.apply(null, args);
			waiting = true;
			setTimeout(() => {
				waiting = false;
			}, limit);
		}
	}
}

export function createFormData (data) {
	const result = new URLSearchParams;

	for (const name in data) {
		result.append(name, data[name]);
	}

	return result;
}

export function parseJson (s) {
	try {
		return JSON.parse(s);
	}
	catch {
		return undefined;
	}
}

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
