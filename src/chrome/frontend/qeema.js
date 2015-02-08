// ==UserScript==
// @name          qeema: integrated keybord manager
// @include       http://*.2chan.net/*/*.htm
// @include       http://*.2chan.net/*/*.htm?*
// @include       http://*.2chan.net/*/res/*.htm
// @include       http://*.2chan.net/*/res/*.htm?*
// @exclude       http://dec.2chan.net/up/*
// @exclude       http://dec.2chan.net/up2/*
// ==/UserScript==

/**
 * qeema: integrated keyboard manager
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2012-2015 akahuku, akahuku@gmail.com
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

(function (global) {
	'use strict';

	// {{{1 consts
	var WEBKIT_FUNCTION_KEYCODES = {
		8: 'backspace',
		9: 'tab',
		13: 'enter',
		19: 'pause',
		27: 'esc',
		32: 'space',
		33: 'pageup', 34: 'pagedown',
		35: 'end', 36: 'home',
		37: 'left', 38: 'up', 39: 'right', 40: 'down',
		45: 'insert', 46: 'delete',
		91: 'os',
		112: 'f1', 113:  'f2', 114:  'f3', 115:  'f4',
		116: 'f5', 117:  'f6', 118:  'f7', 119:  'f8',
		120: 'f9', 121: 'f10', 122: 'f11', 123: 'f12',
		145: 'scrolllock'
	};
	var PRESTO_FUNCTION_KEYCODES = WEBKIT_FUNCTION_KEYCODES;
	var GECKO_FUNCTION_KEYCODES = WEBKIT_FUNCTION_KEYCODES;
	var WEBKIT_CTRL_MAP = {
		32:  0,  65:  1,  66:  2,  67:  3,  68:  4,  69:  5,  70:  6,  71:  7,  72:  8,  73:  9,
		74: 10,  75: 11,  76: 12,  77: 13,  78: 14,  79: 15,  80: 16,  81: 17,  82: 18,  83: 19,
		84: 20,  85: 21,  86: 22,  87: 23,  88: 24,  89: 25,  90: 26, 219: 27, 220: 28, 221: 29
		// following ctrl codes are not able to be handled on Webkit
		// because its key stroke depends on keyboard layout:
		//
		//   30(0x1e): ^^ = Ctrl+Shift+6 on us keyboard
		//   31(0x1f): ^_ = Ctrl+Shift_- on us keyboard
	};
	var PRESTO_CTRL_MAP = WEBKIT_CTRL_MAP;
	var GECKO_CTRL_MAP = null;

	var FUNCTION_KEY_ALIASES = {
		'bs':       'backspace',
		'nl':       'enter',
		'newline':  'enter',
		'linefeed': 'enter',
		'return':   'enter',
		'escape':   'esc',
		'ins':      'insert',
		'del':      'delete',
		'spc':      'space',
		'bar':      '|'.charCodeAt(0),
		'bslash':   '\\'.charCodeAt(0)
	};
	var PRIOR_KEYS_MANIFEST = 'data-prior-keys';
	// }}}

	// {{{1 classes
	function VirtualInputEvent (nativeEvent, code, char, key, shift, ctrl, alt, isSpecial) {
		this.nativeEvent = nativeEvent;
		this.code = code;
		this.char = char;
		this.key = key;
		this.shift = shift;
		this.ctrl = ctrl;
		this.alt = alt;
		this.isSpecial = isSpecial;
		this.isCompositionedFirst = false;
		this.isCompositionedLast = false;
	}
	VirtualInputEvent.prototype.preventDefault = function () {
		if (this.nativeEvent) {
			this.nativeEvent.preventDefault();
			this.nativeEvent = null;
		}
	};

	function DelayedTraceItem (keydownEvent) {
		this.keydownEvent = keydownEvent;
		this.inputEvents = [];
		this.value = '';
		this.pos = keydownEvent && 'selectionStart' in keydownEvent.target ?
			keydownEvent.target.selectionStart : undefined;
	}
	// }}}

	// {{{1 variables
	var target;
	var listeners = {
		input: [],
		compositionstart: [],
		compositionupdate: [],
		compositionend: [],
		log: []
	};
	var nopObject = new VirtualInputEvent(
		null,
		0, '*nop*', '*nop*',
		false, false, false,
		false
	);
	var functionKeyCodes = null;
	var ctrlMap = null;
	var consumed;
	var lastReceivedEvent = '';
	var lastFiredEvent = '';
	var dequeue = [];
	var lockCount = 0;
	var isSweeping = false;
	var enableLog = false;
	var enableLogBasic = false;
	var enableLogComposition = false;
	var enableLogInput = false;

	// for general composition
	var lastValue = '';
	var isInComposition = false;
	var isPreserved = false;
	var compositionResult = null;

	// for composition on Presto
	var cop = {
		keydownCode: -1,
		compositionStartPos: -1,
		lastCompositionLength: -1,
		inputEventInvokedCount: 0,
		keydownStack: [],
		keyupStack: [],
	};
	// }}}

	// {{{1 privates
	function logit () {
		fire('log',
			{message: Array.prototype.slice.call(arguments).join('')}
		);
	}

	function getFunctionKeyCodes () {
		if (global.chrome) return WEBKIT_FUNCTION_KEYCODES;
		if (global.opera) return PRESTO_FUNCTION_KEYCODES;
		if (global.gecko) return GECKO_FUNCTION_KEYCODES;
	}

	function getKeydownListener () {
		if (global.chrome || global.opera) return keydown;
		if (global.gecko) return null;
	}

	function getKeyupListener () {
		if (global.opera) return keyupPresto;
		if (global.gecko) return keyup;
	}

	function getInputListener () {
		if (global.chrome) return inputWebkit;
		if (global.opera) return inputPresto;
		if (global.gecko) return inputGecko;
	}

	function getCtrlMap () {
		if (global.chrome) return WEBKIT_CTRL_MAP;
		if (global.opera) return PRESTO_CTRL_MAP;
		if (global.gecko) return GECKO_CTRL_MAP;
	}

	function getListenersSet () {
		return {
			keydown: getKeydownListener(),
			keypress: keypress,
			keyup: getKeyupListener(),
			compositionstart: compositionstart,
			compositionupdate: compositionupdate,
			compositionend: compositionend,
			input: getInputListener()
		};
	}

	function getModifiers (result, e) {
		e.shiftKey && result.push('S');
		e.ctrlKey  && result.push('C');
		e.altKey   && result.push('A');
	}

	function getIncreasePosition (before, current) {
		var length = current.length - before.length;
		if (length <= 0) {
			return -1;
		}

		/*
		 * before:  abcdefg
		 * current: abcXYZdefg
		 * length:  10 - 7 = 3
		 * goal:    10 - 3 + 1 = 8
		 *
		 * loop #0: '' + 'abc' + 'abcdefg' -> x
		 * loop #1: 'a' + 'bcX' + 'bcdefg' -> x
		 * loop #2: 'ab' + 'cXY' + 'cdefg' -> x
		 * loop #3: 'abc' + 'XYZ' + 'defg' -> found, return value: 3
		 * loop #4: 'abcd' + 'YZd' + 'efg' -> x
		 * loop #5: 'abcde' + 'Zde' + 'fg' -> x
		 * loop #6: 'abcdef' + 'def' + 'g' -> x
		 * loop #7: 'abcdefg' + 'efg' + '' -> x
		 */
		for (var i = 0, goal = (current.length - length) + 1; i < goal; i++) {
			var tmp = before.substring(0, i)
				+ current.substring(i, i + length)
				+ before.substring(i);
			if (tmp == current) {
				return i;
			}
		}
		return -1;
	}

	function getIncreasedString (before, current) {
		var pos = getIncreasePosition(before, current);
		return pos >= 0 ?
			current.substr(pos, current.length - before.length) :
			'';
	}

	function pushInputEvent (e) {
		if (lockCount > 0 && e.code == 3) {
			fire('input', e);
		}
		else {
			dequeue.push(e);
			sweep();
		}
	}

	function pushCompositInputEvent (data) {
		if (lastFiredEvent == 'compositionupdate'
		&& !fireCompositEnd(data)) {
			return;
		}

		for (var i = 0, goal = data.length; i < goal; i++) {
			var ev = new VirtualInputEvent(
				null,
				data.charCodeAt(i), data.charAt(i), data.charAt(i),
				false, false, false,
				false
			);
			ev.isCompositionedFirst = i == 0;
			ev.isCompositionedLast = i == goal - 1;
			dequeue.push(ev);
		}

		sweep();
	}

	function fire (eventName, e) {
		lastFiredEvent = eventName;
		var l = listeners[eventName];
		for (var i = 0, goal = l.length; i < goal; i++) {
			if (l[i](e) === false) {
				e.preventDefault();
				if (consumed) {
					consumed.defaultPrevented = true;
				}
			};
		}
	}

	function fireCompositEnd (data) {
		lastFiredEvent = 'compositionend';
		var e = {data: data};
		var l = listeners.compositionend;
		for (var i = 0, goal = l.length; i < goal; i++) {
			if (l[i](e) === false) {
				return false;
			}
		}
		return true;
	}

	function ensureTarget (e) {
		return !target || target == e.target;
	}

	function clear (e) {
		!isPreserved && init('');
	}
	// }}}

	// {{{1 internal listeners
	function keydown (e) {
		lastReceivedEvent = e.type;
		consumed = false;

		var etype = '[ keydown' + (e.__delayedTrace ? ' (delayed)' : '') + ']';

		if (window.opera) {
			if (e.keyCode == 229 && !e.__delayedTrace) {
				cop.keydownStack.push(new DelayedTraceItem(e));
				enableLog && enableLogComposition && logit(
					etype,
					' *** stacked:', e.keyCode,
					', length:', cop.keydownStack.length,
					' ***'
				);
				return;
			}
			cop.keydownCode = e.keyCode;
			cop.inputEventInvokedCount = 0;
		}

		if (e.shiftKey && e.keyCode == 16
		||  e.ctrlKey && e.keyCode == 17
		||  e.altKey && e.keyCode == 18) {
			return;
		}

		enableLog && enableLogBasic && logit(
			etype,
			' keyCode:', e.keyCode,
			', which:', e.which,
			', charCode:', e.charCode,
			', shift:', e.shiftKey,
			', ctrl:', e.ctrlKey,
			', alt:', e.altKey
		);

		var charCode = 0;
		var keyCode = -e.keyCode;

		if (!(e.keyCode in functionKeyCodes)) {
			if (e.ctrlKey && !e.altKey && ctrlMap && e.keyCode in ctrlMap) {
				charCode = ctrlMap[e.keyCode];
				keyCode = 0;
				enableLog && enableLogBasic && logit(
					etype, ' found ctrl-shortcut'
				);
			}
			else {
				return;
			}
		}

		keypress({
			type: e.type,
			shiftKey: e.shiftKey,
			ctrlKey: e.ctrlKey,
			altKey: e.altKey,
			charCode: charCode,
			which: e.which,
			keyCode: keyCode,
			preventDefault: function () {e.preventDefault()}
		});

		consumed = {
			defaultPrevented: false
		};
	}

	function keypress (e) {
		lastReceivedEvent = e.type;

		var etype = '[keypress' +
			(e.type != 'keypress' ? ' (' + e.type + ' delegation)' : '') +
			(e.__delayedTrace ? ' (delayed)' : '') +
			']';

		if (e.type == 'keypress' && consumed) {
			if (consumed.defaultPrevented) {
				enableLog && enableLogBasic && logit(
					etype, ' ignoring consumed keypress and prevented default action.'
				);
				e.preventDefault();
			}
			else {
				enableLog && enableLogBasic && logit(
					etype, ' ignoring consumed keypress.'
				);
			}
			consumed = false;
			return;
		}

		enableLog && enableLogBasic && logit(
			etype,
			' keyCode:', e.keyCode,
			', which:', e.which,
			', charCode:', e.charCode,
			', shift:', e.shiftKey,
			', ctrl:', e.ctrlKey,
			', alt:', e.altKey
		);

		var c = [];
		var code;
		var char;
		var stroke;
		var isSpecial = false;
		var shiftKey = e.shiftKey;
		var ctrlKey = e.ctrlKey;
		var altKey = e.altKey;

		// special keys which processed by keydown listener (for Webkit, Presto)
		if (e.keyCode < 0) {
			code = e.keyCode >= -32 ? -e.keyCode : e.keyCode;
			getModifiers(c, e);
			char = '';
			stroke = functionKeyCodes[-e.keyCode];
			isSpecial = true;
		}

		// special keys (for Gecko)
		else if (e.charCode == 0) {
			code = e.keyCode < 32 ? e.keyCode : -e.keyCode;
			getModifiers(c, e);
			char = '';
			stroke = functionKeyCodes[e.keyCode];
			isSpecial = true;
		}

		// space is printable but allowed modifiers
		else if (e.charCode == 32) {
			code = ctrlKey && !altKey ? 0 : 32;
			getModifiers(c, e);
			char = String.fromCharCode(code);
			stroke = functionKeyCodes[e.charCode];
			isSpecial = true;
		}

		// others...
		else {
			code = e.charCode;

			// ctrl code directly
			if (code >= 0 && code <= 31) {
				char = String.fromCharCode(code);
				stroke = String.fromCharCode(code + 64).toLowerCase();
				getModifiers(c, e);
			}
			// ^@ - ^_
			else if (ctrlKey && !altKey) {
				if (code >= 64 && code <= 95 || code >= 97 && code <= 127) {
					code = code & 0x1f;
					char = String.fromCharCode(code);
					stroke = String.fromCharCode(code + 64).toLowerCase();
					getModifiers(c, e);
				}
				else {
					return;
				}
			}
			// printable chars
			else if (code >= 32) {
				char = String.fromCharCode(code);
				stroke = String.fromCharCode(code);
			}
		}

		if (stroke == undefined) return;

		c.push(stroke);
		pushInputEvent(new VirtualInputEvent(
			e,
			code, char, c.join('-'),
			shiftKey, ctrlKey, altKey, isSpecial));
	}

	function keyup (e) {
		if (e.shiftKey && e.keyCode == 16
		||  e.ctrlKey && e.keyCode == 17
		||  e.altKey && e.keyCode == 18) {
			return;
		}

		var etype = '[  keyup' + (e.__delayedTrace ? ' (delayed)' : '') + ']';

		enableLog && enableLogBasic && logit(
			etype,
			' keyCode:', e.keyCode,
			', which:', e.which,
			', charCode:', e.charCode,
			', shift:', e.shiftKey,
			', ctrl:', e.ctrlKey,
			', alt:', e.altKey
		);
	}

	function keyupPresto (e) {
		var etype = '[   keyup' + (e.__delayedTrace ? ' (delayed)' : '') + ']';

		/*
		 * preparing
		 */

		if (cop.keydownStack.length) {
			cop.keydownStack = cop.keydownStack.filter(function (item) {return !item.keydownEvent.repeat});
			if (cop.keyupStack.length != cop.keydownStack.length - 1 && !e.__delayedTrace) {
				cop.keyupStack.push(e);

				enableLog && enableLogComposition && logit(
					etype,
					' *** stacked: ', e.keyCode,
					', ', cop.keydownStack.length,
					' ***'
				);

				return;
			}

			/*
			 * process all of stacked events
			 */

			if (!e.__delayedTrace) {
				if (!isInComposition) {
					cop.compositionStartPos = cop.keydownStack[0].pos - 1;
					cop.lastCompositionLength = 0;
				}

				enableLog && enableLogComposition && logit(
					etype,
					' ***',
					' delayed tracing phase 1 start.',
					' keyupStack.length:', cop.keyupStack.length,
					' position:', (cop.keyupStack[0] || {pos:'?'}).pos,
					' ***'
				);

				while (cop.keyupStack.length) {
					var delayedKeydown = cop.keydownStack.shift();
					delayedKeydown.keydownEvent.__delayedTrace = true;
					keydown(delayedKeydown.keydownEvent);

					for (var i = 0, goal = delayedKeydown.inputEvents.length; i < goal; i++) {
						delayedKeydown.inputEvents[i].__delayedTrace = true;
						inputPresto(delayedKeydown.inputEvents[i]);
					}

					var delayedKeyup = cop.keyupStack.shift();
					delayedKeyup.__delayedValue = delayedKeydown.value;
					delayedKeyup.__delayedTrace = true;
					keyupPresto(delayedKeyup);
				}

				enableLog && enableLogComposition && logit(
					etype, ' *** delayed tracing phase 1 end ***'
				);

				if (cop.keydownStack.length != 1 || cop.keyupStack.length != 0) {
					return;
				}

				enableLog && enableLogComposition && logit(
					etype,
					' ***',
					' delayed tracing phase 2 start.',
					' keydownStack.length:', cop.keydownStack.length,
					' position:', (cop.keydownStack[0] || {pos:'?'}).pos,
					' ***'
				);

				var delayedKeydown = cop.keydownStack.shift();
				delayedKeydown.keydownEvent.__delayedTrace = true;
				keydown(delayedKeydown.keydownEvent);

				for (var i = 0, goal = delayedKeydown.inputEvents.length; i < goal; i++) {
					delayedKeydown.inputEvents[i].__delayedTrace = true;
					inputPresto(delayedKeydown.inputEvents[i]);
				}

				enableLog && enableLogComposition && logit(
					etype, ' *** delayed tracing phase 2 end ***'
				);

			}
		}

		/*
		 * keyup main
		 */

		if (e.keyCode == 16 || e.keyCode == 17 || e.keyCode == 18) {
			return;
		}

		enableLog && logit(
			etype,
			' keyCode:', e.keyCode,
			', which:', e.which,
			', __v:"', e.__delayedValue, '"',
			', v:"', e.target.value, '"'
		);

		if (cop.keydownCode == 229 || isInComposition) {
			/*
			 * 1. implicit fix:
			 * [keydown]	keyCode: 229, which: 229
			 * [input]		value:"...X" (X is the character which raised fixation)
			 * [input]		value:"...X" (X is the character which raised fixation)
			 * [input]		value:"...X" (X is the character which raised fixation)
			 * [keyup]		keyCode: Y, which: Y
			 *
			 * 2. explicit fix:
			 * [keydown]	keyCode: 229, which: 229
			 * [input]		value:"..."
			 * [input]		value:"..."
			 * [keyup]		keyCode: 13, which: 13
			 *
			 * 3. selecting a candidate
			 * [keydown]	keyCode: 229, which: 229
			 * [input]		value:"..."
			 * [keyup]		keyCode: Y, which: Y
			 *
			 * 4. escaping a composition
			 * [keydown]	keyCode: 229, which: 229
			 * [keyup]		keyCode: 27, which: 27
			 *
			 */
			var value = e.__delayedValue || e.target.value;
			var composition;

			if (isInComposition && cop.inputEventInvokedCount == 3) {
				composition = value.substr(
					cop.compositionStartPos,
					cop.lastCompositionLength);
				pushCompositInputEvent(composition);

				enableLog && enableLogComposition && logit(
					etype, ' composition end(1) with:"', composition, '"'
				);

				clear(e);
				cop.compositionStartPos += cop.lastCompositionLength;
				cop.lastCompositionLength = value.length - lastValue.length;
				fire('compositionstart', {data:''});
				enableLog && enableLogComposition && logit(
					etype, ' composition start(1)'
				);
			}
			else if (isInComposition && cop.inputEventInvokedCount == 2) {
				isInComposition = false;
				composition = value.substr(
					cop.compositionStartPos,
					cop.lastCompositionLength + value.length - lastValue.length);
				pushCompositInputEvent(composition);

				enableLog && enableLogComposition && logit(
					etype, ' composition end(2) with:"', composition, '"'
				);

				clear(e);
				value = e.target.value;
			}
			else if (
				isInComposition &&
				(e.keyCode == 27 && cop.inputEventInvokedCount == 0)
			) {
				isInComposition = false;
				fireCompositEnd('');

				enableLog && enableLogComposition && logit(
					etype, ' composition end(3)'
				);

				clear(e);
				value = e.target.value;
			}
			else if (value != lastValue) {
				if (!isInComposition) {
					isInComposition = true;
					fire('compositionstart', {data:''});

					enableLog && enableLogComposition && logit(
						etype, ' composition start(2)'
					);
				}

				var increment = value.length - lastValue.length;
				cop.lastCompositionLength += increment;

				if (cop.lastCompositionLength > 0) {
					composition = value.substr(
						cop.compositionStartPos,
						cop.lastCompositionLength);
					fire('compositionupdate', {data:composition});
				}
				else {
					isInComposition = false;
					fireCompositEnd('');

					enableLog && enableLogComposition && logit(
						etype, ' composition end(4)'
					);

					clear(e);
					value = e.target.value;
				}
			}
			cop.inputEventInvokedCount = 0;
			cop.keydownCode = -1;
			lastValue = value;
		}
	}

	function inputWebkit (e) {
		if (!ensureTarget(e)) return;

		var etype = '[   input' + (e.__delayedTrace ? ' (delayed)' : '') + ']';

		enableLog && enableLogInput && logit(
			etype, ' value:"', e.target.value, '"'
		);

		switch (lastReceivedEvent) {
		case 'keydown':
			var s = getIncreasedString(lastValue, e.target.value);
			if (s != '') {
				fire('compositionstart', {data:''});
				fire('compositionupdate', {data:s});
				pushCompositInputEvent(s);
			}
			clear(e);
			break;

		case 'compositionend':
			pushCompositInputEvent(compositionResult);
			compositionResult = null;
			clear(e);
			break;
		}

		lastValue = e.target.value;
		lastReceivedEvent = e.type;
	}

	function inputPresto (e) {
		var etype = '[   input' + (e.__delayedTrace ? ' (delayed)' : '') + ']';

		if (cop.keydownStack.length && !e.__delayedTrace) {
			var last = cop.keydownStack[cop.keydownStack.length - 1];
			if (!last.keydownEvent.repeat) {
				last.inputEvents.push(e);
				last.value = e.target.value;
			}

			enableLog && enableLogInput && logit(
				etype, ' *** stacked: "', e.target.value + '"',
				', length:' + cop.keydownStack.length,
				' ***'
			);

			return;
		}

		if (!ensureTarget(e)) return;

		lastReceivedEvent = e.type;
		cop.inputEventInvokedCount++;

		enableLog && enableLogInput && logit(
			etype, ' value:"', e.target.value + '"',
			', activeElement:',
			[
				document.activeElement.nodeName,
				document.activeElement.id,
				document.activeElement.style.display
			].join('/'),
			', inputEventInvokedCount: ', cop.inputEventInvokedCount
		);
	}

	function inputGecko (e) {
		if (!ensureTarget(e)) return;

		var etype = '[   input' + (e.__delayedTrace ? ' (delayed)' : '') + ']';

		enableLog && enableLogInput && logit(
			etype, ' value:"', e.target.value, '"'
		);

		if (lastReceivedEvent == 'compositionend') {
			pushCompositInputEvent(compositionResult);
			clear(e);
			compositionResult = null;
		}
		lastReceivedEvent = e.type;
	}

	function compositionstart (e) {
		if (!ensureTarget(e)) return;

		enableLog && enableLogComposition && logit(
			'[compositionstart] "', e.data, '"'
		);

		lastReceivedEvent = e.type;
		isInComposition = true;
		fire('compositionstart', {data:e.data});
	}

	function compositionupdate (e) {
		if (!ensureTarget(e)) return;

		enableLog && enableLogComposition && logit(
			'[compositionupdate] "', e.data, '"'
		);

		lastReceivedEvent = e.type;
		fire('compositionupdate', {data:e.data});
	}

	function compositionend (e) {
		if (!ensureTarget(e)) return;

		enableLog && enableLogComposition && logit(
			'[compositionend] "', e.data, '"'
		);

		lastReceivedEvent = e.type;
		compositionResult = e.data;
		isInComposition = false;
	}
	// }}}

	// {{{1 publics
	function install () {
		functionKeyCodes = getFunctionKeyCodes();
		if (functionKeyCodes) {
			ctrlMap = getCtrlMap();

			var listenersSet = getListenersSet();
			for (var i in listenersSet) {
				if (listenersSet[i]) {
					document.addEventListener(i, listenersSet[i], true);
				}
			}
		}
		return this;
	}

	function uninstall () {
		functionKeyCodes = null;
		ctrlMap = null;

		var listenersSet = getListenersSet();
		for (var i in listenersSet) {
			if (listenersSet[i]) {
				document.removeEventListener(i, listenersSet[i], true);
			}
		}
		return this;
	}

	function addListener () {
		var args = Array.prototype.slice.call(arguments);
		var type = 'input', listener;

		if (typeof args[0] == 'string') {
			type = args.shift();
		}
		if (!(type in listeners)) return;

		listener = args.shift();
		if (typeof listener != 'function') return;

		var index = listeners[type].indexOf(listener);
		if (index < 0) {
			listeners[type].push(listener);
		}

		return this;
	}

	function removeListener () {
		var args = Array.prototype.slice.call(arguments);
		var type = 'input', listener;

		if (typeof args[0] == 'string') {
			type = args.shift();
		}
		if (!(type in listeners)) return;

		listener = args.shift();
		if (typeof listener != 'function') return;

		var index = listeners[type].indexOf(listener);
		if (index >= 0) {
			listeners[type].splice(index, 1);
		}

		return this;
	}

	// composition initializer
	function init (aleading) {
		if (!target) return;
		if (typeof aleading == 'object'
		&& 'value' in aleading
		&& 'selectionStart' in aleading) {
			var element = aleading;
			lastValue = aleading = element.value.substring(
				0, element.selectionStart);
			if (target != element && !isPreserved) {
				target.value = aleading;
			}
		}
		else {
			lastValue = target.value = aleading || '';
			if (!isPreserved) {
				target.value = lastValue;
			}
		}

		isInComposition = false;
		compositionResult = null;

		cop.keydownCode = -1;
		cop.compositionStartPos = -1;
		cop.lastCompositionLength = -1;
		cop.inputEventInvokedCount = 0;
	}

	// code utils
	function code2letter (c, useSpecial) {
		if (typeof c != 'number') {
			return '';
		}
		if (c >= 0) {
			return String.fromCharCode(c);
		}
		if (useSpecial && -c in functionKeyCodes) {
			return '<' + functionKeyCodes[-c] + '>';
		}
		return '';
	}

	function toInternalString (e) {
		if (typeof e.code != 'number') {
			return '';
		}
		if (e.isSpecial && e.code < 0) {
			return '\ue000' + '<' + e.key + '>';
		}
		return String.fromCharCode(e.code);
	}

	function objectFromCode (c) {
		if (typeof c != 'number') {
			return null;
		}

		var identifier = '';
		var isSpecial = false;
		if (c >= 0) {
			identifier = String.fromCharCode(c);
		}
		else if (-c in functionKeyCodes) {
			identifier = functionKeyCodes[-c];
			isSpecial = true;
		}

		return new VirtualInputEvent(
			null,
			c, identifier, identifier,
			false, false, false,
			isSpecial
		);
	}

	function nopObjectFromCode () {
		return nopObject;
	}

	function insertFnKeyHeader (s) {
		return s.replace(/(\u0016)?(<[^>]+>|#\d{1,2})/g, function ($0, $1) {
			return $1 == '\u0016' ? $0 : '\ue000' + $0;
		});
	}

	function parseKeyDesc (desc, escaped) {
		function doParse (desc) {
			var parts = desc.toLowerCase().split('-');
			var shift = false, ctrl = false, alt = false, name = '';

			while (parts.length > 1 && /^[sca]$/.test(parts[0])) {
				shift = parts[0] == 's' || shift;
				ctrl = parts[0] == 'c' || ctrl;
				alt = parts[0] == 'a' || alt;
				parts.shift();
			}

			name = parts[0];

			if (name in FUNCTION_KEY_ALIASES) {
				if (typeof FUNCTION_KEY_ALIASES[name] == 'number') {
					return {
						code:FUNCTION_KEY_ALIASES[name],
						name:name,
						shift:shift,
						ctrl:ctrl,
						alt:alt
					};
				}
				else {
					name = FUNCTION_KEY_ALIASES[name];
				}
			}

			for (var i in functionKeyCodes) {
				if (functionKeyCodes[i] == name) {
					return {
						code:-i,
						name:name,
						shift:shift,
						ctrl:ctrl,
						alt:alt
					};
				}
			}

			return null;
		}
		if (typeof desc == 'number') {
			desc = String.fromCharCode(desc);
		}
		if (!escaped) {
			var consumed = 0;
			var re = /^\ue000<([^>]+)>/.exec(desc);
			if (re) {
				desc = re[1];
				consumed = re[0].length;
			}
			else {
				re = /^\ue000#(\d{1,2})/.exec(desc);
				if (re) {
					desc = 'f' + re[1];
					consumed = re[0].length;
				}
			}
			if (consumed) {
				var obj = doParse(desc);
				if (!obj) return {consumed:consumed};
				var c = [];
				obj.shift && c.push('s');
				obj.ctrl  && c.push('c');
				obj.alt  && c.push('a');
				c.push(obj.name);
				return {
					consumed:consumed,
					prop: new VirtualInputEvent(
						null,
						obj.code, obj.name, c.join('-'),
						obj.shift, obj.ctrl, obj.alt,
						true
					)
				};
			}
		}
		return {
			consumed:1,
			prop: new VirtualInputEvent(
				null,
				desc.charCodeAt(0), desc.charAt(0), desc.charAt(0),
				false, false, false,
				false
			)
		};
	}

	// dequeue manipulators
	function createSequences (s) {
		var result = [];
		for (var i = 0, goal = s.length; i < goal; i++) {
			var parseResult;
			if (s.charAt(i) == '\u0016') {
				if (i >= s.length - 1) break;
				parseResult = parseKeyDesc(s.substring(++i), true);
			}
			else {
				parseResult = parseKeyDesc(s.substring(i));
			}
			parseResult.prop && result.push(parseResult.prop);
			i += parseResult.consumed - 1;
		}
		return result;
	}

	function setDequeue (method, args, callback) {
		var items = [];

		for (var i = 0, goal = args.length; i < goal; i++) {
			var s = args[i];

			if (typeof s == 'string') {
				items.push.apply(items, createSequences(s));
			}
			else if (typeof s == 'object') {
				if ('value' in s && s.asComposition) {
					s = createSequences(s.value);
					if (s.length) {
						s[0].isCompositionedFirst = true;
						s[s.length - 1].isCompositionedLast = true;
					}
					items.push.apply(items, s);
				}
				else {
					items.push(s);
				}
			}
		}

		callback && callback(items);
		dequeue[method].apply(dequeue, items);
	}

	function push () {
		var args = Array.prototype.slice.call(arguments);
		var callback;

		if (typeof args[args.length - 1] == 'function') {
			callback = args.pop();
		}

		setDequeue('push', args, callback);
	}

	function unshift () {
		var args = Array.prototype.slice.call(arguments);
		var callback;

		if (typeof args[args.length - 1] == 'function') {
			callback = args.pop();
		}

		setDequeue('unshift', args, callback);
	}

	function invalidate () {
		dequeue.length = 0;
	}

	function sweep () {
		if (isSweeping) return;

		isSweeping = true;
		try {
			while (lockCount == 0 && dequeue.length) {
				fire('input', dequeue.shift());
			}
		}
		finally {
			isSweeping = false;
		}
	}

	function lock () {
		lockCount++;
	}

	function unlock (reset) {
		if (reset) {
			lockCount = 0;
		}
		else {
			lockCount--;
			if (lockCount < 0) {
				console.error('lockCount error');
				lockCount = 0;
			}
		}
		if (lockCount == 0) {
			sweep();
		}
	}

	// shortcut manifest
	function clearManifest () {
		document.documentElement.removeAttribute(PRIOR_KEYS_MANIFEST);
	}

	function getManifest (asis) {
		var m = document.documentElement.getAttribute(PRIOR_KEYS_MANIFEST) || '';

		if (!asis) {
			m = m.split(/ +/)
				.map(function (k) {return k.replace('space', ' ')});
		}

		return m;
	}

	function setManifest (m) {
		if (typeof m == 'string') {
			;
		}
		else if (m instanceof Array) {
			m = m.map(function (k) {return k.replace(' ', 'space')}).join(' ');
		}
		else {
			return;
		}

		document.documentElement.setAttribute(PRIOR_KEYS_MANIFEST, m);
	}

	function addManifest () {
		var keys = Array.prototype.slice.call(arguments);

		var m = getManifest(true);
		m += m != '' ? ' ' : '';
		m += keys.map(function (k) {return k.replace(' ', 'space')})
			.join(' ');

		document.documentElement.setAttribute(PRIOR_KEYS_MANIFEST, m);
	}

	function regalizeManifest () {
		var m = getManifest();
		var hash = {};
		m.forEach(function (k) {hash[k] = 1});
		setManifest(Object.keys(hash));
	}

	// disposer
	function dispose () {
		for (var i in listeners) {
			listeners[i] = undefined;
		}
		uninstall();
	}
	// }}}

	// boot
	(function () {
		if (global.gecko) return;
		for (var i in global) {
			if (!/moz/i.test(i)) continue;
			global.gecko = true;
			break;
		}
	})();
	global.qeema = Object.create(Object.prototype, {
		install: {value:install},
		uninstall: {value:uninstall},
		addListener: {value:addListener},
		removeListener: {value:removeListener},

		init: {value:init},

		code2letter: {value:code2letter},
		toInternalString: {value:toInternalString},
		objectFromCode: {value:objectFromCode},
		nopObjectFromCode: {value:nopObjectFromCode},
		insertFnKeyHeader: {value:insertFnKeyHeader},
		parseKeyDesc: {value:parseKeyDesc},

		createSequences: {value:createSequences},
		setDequeue: {value:setDequeue},
		push: {value:push},
		unshift: {value:unshift},
		invalidate: {value:invalidate},
		sweep: {value:sweep},
		lock: {value:lock},
		unlock: {value:unlock},
		dispose: {value:dispose},

		clearManifest: {value:clearManifest},
		getManifest: {value:getManifest},
		setManifest: {value:setManifest},
		addManifest: {value:addManifest},
		regalizeManifest: {value:regalizeManifest},

		preserve: {
			get: function () {return isPreserved},
			set: function (v) {isPreserved = !!v}
		},
		target: {
			get: function () {return target},
			set: function (v) {
				target = v;
				init(v.value);
			}
		},
		isInComposition: {
			get: function () {return isInComposition}
		},
		isLocked: {
			get: function () {return lockCount > 0}
		},
		log: {
			get: function () {return enableLog},
			set: function (v) {enableLog = !!v}
		},
		logBasic: {
			get: function () {return enableLogBasic},
			set: function (v) {enableLogBasic = !!v}
		},
		logComposition: {
			get: function () {return enableLogComposition},
			set: function (v) {enableLogComposition = !!v}
		},
		logInput: {
			get: function () {return enableLogInput},
			set: function (v) {enableLogInput = !!v}
		}
	});
})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
