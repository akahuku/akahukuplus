/*
 * editor helper for akahukuplus
 */

/**
 * Copyright 2022-2024 akahuku, akahuku@gmail.com
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

const INPUT = '*input*';
const CONTENT_EDITABLE = '*contentEditable*';
const PLATFORM = (() => {
	if (typeof process !== 'undefined') {
		return 'node';
	}
	if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
		return chrome.runtime.getURL('').startsWith('moz-') ? 'gecko' : 'blink';
	}
	if (typeof browser !== 'undefined' && browser?.runtime?.getURL) {
		return browser.runtime.getURL('').startsWith('moz-') ? 'gecko' : 'blink';
	}
	if (/\bChrome\//.test(navigator.userAgent)) {
		return 'blink';
	}
	if (/\bGecko\//.test(navigator.userAgent)) {
		return 'gecko';
	}
	return 'blink';
})();
const SELECT_MODE_KEY = 'appsweetsSelectMode';
//const LAST_POSITION_KEY = 'appsweetsLastPosition';
const FX_WRAP_ID = 'appsweets-fx-wrap-' + Math.trunc(Math.random() * 0x80000000).toString(16);

const WORD_MOVE_NONE = 240;
const WORD_MOVE_FALLBACK = 241;
const WORD_MOVE_EOL = 253;
const WORD_MOVE_JUMPED = 254;
const WORD_MOVE_FORWARD = 255;
const WORD_MOVE_BACKWARD = 256;

let passThroughValue;
let hookEnabled = true;
let killedText = '';
let tokensData = {
	tokenizer: undefined,
	subject: '',
	tokens: undefined
};
let log = () => {};
let editorHelper;

// <<< editUtils
const editUtils = {
	isSimpleEdit (el) {
		return el
			&& 'selectionStart' in el
			&& 'selectionEnd' in el
			&& 'value' in el;
	},
	isComplexEdit (el) {
		return el && el.isContentEditable;
	},
	getRoot (el) {
		if (el && el.nodeType === 3) {
			el = el.parentNode;
		}
		if (el && 'closest' in el) {
			return el.closest('[contentEditable="true"]');
		}
		return null;
	},
	value (el, value) {
		if (arguments.length == 1) {
			if (this.isSimpleEdit(el)) {
				return el.value;
			}
			else if (this.isComplexEdit(el)) {
				const selection = window.getSelection();
				const caretRange = selection.getRangeAt(0);
				let result;
				try {
					selection.selectAllChildren(this.getRoot(el));
					result = selection.toString();
				}
				finally {
					selection.removeAllRanges();
					selection.addRange(caretRange);
				}
				return result;
			}
		}
		else {
			if (this.isSimpleEdit(el)) {
				el.value = value;
			}
			else if (this.isComplexEdit(el)) {
				this.getRoot(el).textContent = value;
			}
		}
	},
	insert (el, pos, value) {
		if (this.isSimpleEdit(el)) {
			el.value = el.value.substring(0, pos) +
				value +
				el.value.substring(pos);
		}
		else if (this.isComplexEdit(el)) {
			const r = this.setSelectionRange(el, pos);
			r.insertNode(document.createTextNode(value));
			el.normalize();
		}
	},
	delete (el, pos, length) {
		if (this.isSimpleEdit(el)) {
			el.value = el.value.substring(0, pos) +
				el.value.substring(pos + length);
		}
		else if (this.isComplexEdit(el)) {
			const r = this.setSelectionRange(el, pos, pos + length);
			r.deleteContents();
			el.normalize();
		}
	},
	selectionStart (el) {
		return this.getSelectionRange(el)[0];
	},
	selectionEnd (el) {
		return this.getSelectionRange(el)[1];
	},
	getSelectionRange (el) {
		if (this.isSimpleEdit(el)) {
			return [el.selectionStart, el.selectionEnd];
		}
		else if (this.isComplexEdit(el)) {
			const result = [undefined, undefined];
			const root = this.getRoot(el);
			const iter = document.createNodeIterator(
				root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
			const sel = window.getSelection();
			const lines = [`*** getSelectionRange ***`];

			let current = 0;
			let node;

			while ((node = iter.nextNode())) {
				let next = current;
				if (node.nodeType === 1) {
					if (node.nodeName === 'BR') {
						next = current + 1;
						lines.push(`BR: ${current}..${next}`);
					}
				}
				else {
					next = current + node.nodeValue.length;
					lines.push(
						`#text "${node.nodeValue.replace(/\n/g, '\\n')}"` +
						` (${node.nodeValue.length}):` +
						` ${current}..${next}`
					);
				}

				if (node === sel.anchorNode) {
					result[0] = current + sel.anchorOffset;
					lines.push(
						`found anchor text: current: ${current},` +
						` offset: ${sel.anchorOffset},` +
						` result: ${result[0]}`
					);
				}
				if (node === sel.focusNode) {
					result[1] = current + sel.focusOffset;
					lines.push(
						`found focus text: current: ${current},` +
						` offset: ${sel.focusOffset}, ` +
						`result: ${result[1]}`
					);
				}

				if (result[0] !== undefined && result[1] !== undefined) {
					break;
				}

				current = next;
			}

			result.sort((a, b) => a - b);
			lines.push(`result: ${result[0]}, ${result[1]}`);
			log(lines.join('\n'));
			return result;
		}
		return [undefined, undefined];
	},
	getRawValue (el) {
		if (this.isSimpleEdit(el)) {
			return [el.value, el.selectionStart, el.selectionEnd];
		}
		else if (this.isComplexEdit(el)) {
			const result = [undefined, undefined];
			const root = this.getRoot(el);
			const iter = document.createNodeIterator(
				root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
			const sel = window.getSelection();

			const [anchorNode, anchorOffset] = sel.anchorNode === root ?
				[sel.anchorNode.childNodes[sel.anchorOffset], 0] :
				[sel.anchorNode, sel.anchorOffset];
			const [focusNode, focusOffset] = sel.focusNode === root ?
				[sel.focusNode.childNodes[sel.focusOffset], 0] :
				[sel.focusNode, sel.focusOffset];

			let content = '';

			for (let node; (node = iter.nextNode()); ) {
				if (node.nodeType === 1) {
					if (node === root) {
						continue;
					}
					if (node === anchorNode) {
						result[0] = content.length;
					}
					if (node === focusNode) {
						result[1] = content.length;
					}
					if (node.nodeName === 'BR') {
						content += '\n';
					}
				}
				else {
					if (node === anchorNode) {
						result[0] = content.length + anchorOffset;
					}
					if (node === focusNode) {
						result[1] = content.length + focusOffset;
					}
					const [, head, body, tail] = /^(\n*)([\s\S]*?)(\n*)$/.exec(node.nodeValue);
					content += head + body.replace(/\n/g, ' ') + tail;
				}
			}

			result.sort((a, b) => a - b);
			result.unshift(content);
			return result;
		}
		return [undefined, undefined, undefined];
	},
	setSelectionRange (el, start, end) {
		if (end === undefined) {
			end = start;
		}
		if (this.isSimpleEdit(el)) {
			el.selectionStart = start;
			el.selectionEnd = end;
		}
		else if (this.isComplexEdit(el)) {
			const root = this.getRoot(el);
			const iter = document.createNodeIterator(
				root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
			const r = document.createRange();
			const lines = [`*** setSelectionRange, start: ${start}, end: ${end} ***`];

			let current = 0;
			let node, nodep;

			while ((node = iter.nextNode())) {
				let next = current;
				if (node.nodeType === 1) {
					if (node === root) {
						continue;
					}
					if (node.nodeName === 'BR') {
						next = current + 1;
						lines.push(`BR: ${current}..${next}`);
					}
				}
				else {
					next = current + node.nodeValue.length;
					lines.push(`#text "${node.nodeValue.replace(/\n/g, '\\n')}" (${node.nodeValue.length}): ${current}..${next}`);

				}
				if (current <= start && start < next) {
					lines.push(`found start pos: range: ${current}..${next}, start: ${start}, computed offset: ${start - current}`);
					r.setStart(node, start - current);
					start = -1;
				}
				if (current <= end && end < next) {
					lines.push(`found end pos: range: ${current}..${next}, end: ${end}, computed offset: ${end - current}`);
					r.setEnd(node, end - current);
					end = -1;
				}
				if (start < 0 && end < 0) {
					break;
				}
				nodep = node;
				current = next;
			}

			if (!node && nodep) {
				if (start >= current) {
					r.setStartAfter(nodep);
				}
				if (end >= current) {
					r.setEndAfter(nodep);
				}
			}

			const s = window.getSelection();
			s.removeAllRanges();
			s.addRange(r);

			log(lines.join('\n'));

			return r;
		}
	},
	setSelectionRangeByLogicalPosition (el, start, end) {
		if (end === undefined) {
			end = start;
		}
		if (this.isSimpleEdit(el)) {
			el.selectionStart = start;
			el.selectionEnd = end;
		}
		else if (this.isComplexEdit(el)) {
			const root = this.getRoot(el);
			const iter = document.createNodeIterator(
				root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
			const r = document.createRange();
			const lines = [`*** setSelectionRangeByLogicalPosition, start: ${start}, end: ${end} ***`];

			let current = 0;
			let node, nodep;

			while ((node = iter.nextNode())) {
				let next = current;
				if (node.nodeType === 1) {
					if (node === root) {
						continue;
					}
					if (node.nodeName === 'BR') {
						next = current + 1;
						lines.push(`BR: ${current}..${next}`);
					}
				}
				else {
					// TBD: this behavior may depend on white-space css property.

					next = current + node.nodeValue.length;
					lines.push(`#text "${node.nodeValue.replace(/\n/g, '\\n')}" (${node.nodeValue.length}): ${current}..${next}`);

					// adjust start/end with a number of leading newlines
					const delta = node.nodeValue.length - node.nodeValue.trimLeft().length;
					if (delta) {
						if (start >= 0 && current <= start) {
							start += delta;
						}
						if (end >= 0 && current <= end) {
							end += delta;
						}
					}

					// adjust start/end with a number of intermediate newlines
					const trimmed = node.nodeValue.trim();
					for (let spaces = /\s\s+/g, re; (re = spaces.exec(trimmed)); ) {
						if (start >= 0 && current + re.index <= start) {
							start += re[0].length - 1;
						}
						if (end >= 0 && current + re.index <= end) {
							end += re[0].length - 1;
						}
					}

					// adjust start/end with a number of trailing newlines
					const delta2 = node.nodeValue.length - node.nodeValue.trimRight().length;
					if (delta2) {
						if (start >= 0 && next <= start) {
							start += delta2;
						}
						if (end >= 0 && next <= end) {
							end += delta2;
						}
					}
				}
				if (current <= start && start < next) {
					lines.push(`found start pos: range: ${current}..${next}, start: ${start}, computed offset: ${start - current}`);
					r.setStart(node, start - current);
					start = -1;
				}
				if (current <= end && end < next) {
					lines.push(`found end pos: range: ${current}..${next}, end: ${end}, computed offset: ${end - current}`);
					r.setEnd(node, end - current);
					end = -1;
				}
				if (start < 0 && end < 0) {
					break;
				}
				nodep = node;
				current = next;
			}

			if (!node && nodep) {
				if (start >= current) {
					r.setStartAfter(nodep);
				}
				if (end >= current) {
					r.setEndAfter(nodep);
				}
			}

			const s = window.getSelection();
			s.removeAllRanges();
			s.addRange(r);

			log(lines.join('\n'));
		}
	},
	normalize (el) {
		let normalized = false;

		if (this.isComplexEdit(el)) {
			const iter = document.createNodeIterator(
				this.getRoot(el), NodeFilter.SHOW_TEXT);
			for (let node; (node = iter.nextNode()); ) {
				if (/^\n|\n$|\n\n+/.test(node.nodeValue)) {
					normalized = true;
					node.nodeValue = node.nodeValue
						.replace(/\n+/g, '\n')
						.replace(/^\n+|\n+$/g, '');
				}
			}
		}

		return normalized;
	},
	direction (el) {
		if (this.isSimpleEdit(el)) {
			return el.selectionDirection;
		}
		else if (this.isComplexEdit(el)) {
			const s = window.getSelection();

			if ('direction' in s) {
				return s.direction;
			}

			const pos = s.anchorNode.compareDocumentPosition(s.focusNode);
			if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
				return 'forward';
			}
			if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
				return 'backward';
			}
			if (s.anchorNode === s.focusNode && s.anchorNode.nodeType === 3) {
				if (s.anchorOffset < s.focusOffset) {
					return 'forward';
				}
				if (s.focusOffset < s.anchorOffset) {
					return 'backward';
				}
			}
			return 'none';
		}
	}
};
// >>>

// <<< selectUtils
const selectionUtils = {
	isCollapsed (selection, e) {
		if (e.target === document) {
			return selection.isCollapsed;
		}
		else {
			return e.target.selectionStart === e.target.selectionEnd;
		}
	},
	getTarget (selection, e) {
		/*
		 *                   selectionchange event properties (2024/09)
		 *
		 *                          e.target        s.{anchorNode,focusNode}    eventPhase
		 * ================================================================================
		 * blink (empty content)
		 *   input                  input(*3)       ?(*1)                       3
		 *   textarea               textarea(*3)    ?(*1)                       3
		 *   content editable       document(*2)    [contentEditable="yes"]     2
		 * blink (non empty content)
		 *   input                  input(*3)       ?(*1)                       3
		 *   textarea               textarea(*3)    ?(*1)                       3
		 *   content editable       document(*2)    textNode                    2
		 * gecko (empty content)
		 *   input                  document(*2)    input                       2
		 *   textarea               document(*2)    textarea                    2
		 *   content editable       document(*2)    [contentEditable="yes"]     2
		 * gecko (non empty content)
		 *   input                  input(*3)       input                       3 -> 2
		 *   textarea               textarea(*3)    textarea                    3 -> 2
		 *   content editable       document(*2)    textNode                    2
		 *
		 * *1 could be the actual target's parent node?
		 * *2 when eventPhase = AT_TARGET (2)
		 * *3 when eventPhase = BUBBLING_PHASE (3)
		 */
		switch (PLATFORM) {
		case 'blink':
			if (e.target.nodeName === 'INPUT'
			|| e.target.nodeName === 'TEXTAREA') {
				return e.target;
			}
			else {
				return editUtils.getRoot(selection.focusNode);
			}

		case 'gecko':
			if (e.eventPhase === Event.AT_TARGET) {
				if (selection.focusNode.nodeName === 'INPUT'
				|| selection.focusNode.nodeName === 'TEXTAREA') {
					return selection.focusNode;
				}
				else {
					return editUtils.getRoot(selection.focusNode);
				}
			}
			break;
		}
		return null;
	}
};
// >>>

// <<< each actions
const fn = {
	common: {
		cursorPreviousLine (e, alter) {
			document.getSelection().modify(alter, 'backward', 'line');
		},
		cursorNextLine (e, alter) {
			document.getSelection().modify(alter, 'forward', 'line');
		},
		async cursorBackwardWord (e, alter) {
			const [content, ss, se] = editUtils.getRawValue(e.target);
			const result = await cursorBackwardWord.call(this, alter, content, ss, se);

			switch (result.action) {
			case WORD_MOVE_JUMPED:
				log(`WORD_MOVE_JUMPED: ${result.ss}, ${result.se}`);
				editUtils.setSelectionRange(e.target, result.ss, result.se);
				break;

			case WORD_MOVE_FALLBACK:
				log('WORD_MOVE_FALLBACK');
				document.getSelection().modify(alter, 'backward', 'word');
				break;
				
			case WORD_MOVE_BACKWARD:
				log('WORD_MOVE_BACKWARD');
				return fn.common.cursorBackwardChar.call(this, e, alter);
			}
		},
		async cursorForwardWord (e, alter) {
			const [content, ss, se] = editUtils.getRawValue(e.target);
			const result = await cursorForwardWord.call(this, alter, content, ss, se);

			switch (result.action) {
			case WORD_MOVE_JUMPED:
				log(`WORD_MOVE_JUMPED: ${result.ss}, ${result.se}`);
				editUtils.setSelectionRange(e.target, result.ss, result.se);
				break;

			case WORD_MOVE_FALLBACK:
				log('WORD_MOVE_FALLBACK');
				document.getSelection().modify(alter, 'forward', 'word');
				break;

			case WORD_MOVE_EOL:
				log('WORD_MOVE_EOL');
				return fn.common.cursorEndOfLine.call(this, e, alter);

			case WORD_MOVE_FORWARD:
				log('WORD_MOVE_FORWARD');
				return fn.common.cursorForwardChar.call(this, e, alter);
			}
		},
		cursorBackwardChar (e, alter) {
			document.getSelection().modify(alter, 'backward', 'character');
			log('selection: ' + editUtils.getSelectionRange(e.target).join(', '));
		},
		cursorForwardChar (e, alter) {
			document.getSelection().modify(alter, 'forward', 'character');
			log('selection: ' + editUtils.getSelectionRange(e.target).join(', '));
		},

		cursorDeleteBackwardChar () {
			const selection = document.getSelection();
			if (selection.toString().length == 0) {
				selection.modify('extend', 'backward', 'character');
			}
			else {
				this.killedText = selection.toString();
			}
			document.execCommand('delete', false, null);
		},
		cursorDeleteBackwardWord () {
			const selection = document.getSelection();
			if (selection.toString().length == 0) {
				selection.modify('extend', 'backward', 'word');
			}
			this.killedText = selection.toString();
			document.execCommand('delete', false, null);
		},
		cursorDeleteBackwardBlock () {
			const selection = document.getSelection();
			if (selection.toString().length == 0) {
				selection.modify('extend', 'backward', 'lineboundary');
			}
			this.killedText = selection.toString();
			document.execCommand('delete', false, null);
		},

		cursorDeleteForwardChar () {
			const selection = document.getSelection();
			if (selection.toString().length == 0) {
				selection.modify('extend', 'forward', 'character');
			}
			else {
				this.killedText = selection.toString();
			}
			document.execCommand('delete', false, null);
		},
		cursorDeleteForwardWord () {
			const selection = document.getSelection();
			if (selection.toString().length == 0) {
				selection.modify('extend', 'forward', 'word');
			}
			this.killedText = selection.toString();
			document.execCommand('delete', false, null);
		},
		cursorDeleteForwardBlock () {
			const selection = document.getSelection();
			if (selection.toString().length == 0) {
				selection.modify('extend', 'forward', 'lineboundary');
			}
			this.killedText = selection.toString();
			document.execCommand('delete', false, null);
		},

		cursorBeginningOfLine (e, alter) {
			document.getSelection().modify(alter, 'backward', 'lineboundary');
		},
		cursorEndOfLine (e, alter) {
			document.getSelection().modify(alter, 'forward', 'lineboundary');
		},

		yank () {
			document.execCommand('insertText', false, this.killedText);
		},
		copy (e) {
			const selection = document.getSelection();
			const selectionText = selection.toString();
			if (selectionText.length) {
				this.killedText = selectionText;
			}
			setSelectMode(e.target, false);
		},
		async expr (e) {
			const content = editUtils.value(e.target);
			const [ss, se] = editUtils.getSelectionRange(e.target);
			if (ss === se) {
				let start = content.lastIndexOf('\n', ss - 1);
				start = start < 0 ? 0 : start + 1;

				let end = content.indexOf('\n', ss);
				end = end < 0 ? content.length : end;

				const exprResult = (await getExprModule()).expr(content.substring(start, end));
				for (const result of exprResult.result) {
					if (result.first + start <= ss && ss <= result.last + start) {
						if ('value' in result) {
							editUtils.setSelectionRange(e.target, result.first + start, result.last + start);
							document.execCommand('insertText', false, result.value.toString());
						}
						break;
					}
				}
			}
			else {
				const exprResult = (await getExprModule()).expr(content.substring(ss, se));
				for (let i = exprResult.result.length - 1; i >= 0; i--) {
					const result = exprResult.result[i];
					if ('value' in result) {
						editUtils.setSelectionRange(e.target, result.first + ss, result.last + ss);
						document.execCommand('insertText', false, result.value.toString());
					}
				}
			}
		},
		newLine (e) {
			if (e.target.nodeName === 'INPUT') {
				return passThroughValue;
			}
			document.execCommand('insertLineBreak', false);
			/*
			 * another method
			 *
			 * note: in any case, execCommand() is deprecated and may be
			 *       removed from browsers in the near future.
			 */
			/*
			if (editUtils.isSimpleEdit(e.target)) {
				document.execCommand('insertText', false, '\n');
			}
			else if (editUtils.isComplexEdit(e.target)) {
				document.execCommand('insertHTML', false, '<br>');
			}
			*/
		},
		toggleSelectMode (e) {
			const target = e.target;
			setSelectMode(target, !isSelectMode(target));
		},
		[INPUT]: {
			selectAll (e) {
				const t = e.target;
				t.setSelectionRange(0, t.value.length);
			}
		},
		[CONTENT_EDITABLE]: {
			selectAll (e) {
				document.getSelection().selectAllChildren(e.target);
			}
		}
	},
	gecko: {
		[INPUT]: {
			cursorPreviousLine (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorPreviousLine);
			},
			cursorNextLine (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorNextLine);
			},
			cursorBackwardWord (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorBackwardWord);
			},
			cursorForwardWord (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorForwardWord);
			},
			cursorBackwardChar (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorBackwardChar);
			},
			cursorForwardChar (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorForwardChar);
			},

			cursorDeleteBackwardChar (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorDeleteBackwardChar);
			},
			cursorDeleteBackwardWord (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorDeleteBackwardWord);
			},
			cursorDeleteBackwardBlock (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorDeleteBackwardBlock);
			},

			cursorDeleteForwardChar (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorDeleteForwardChar);
			},
			cursorDeleteForwardWord (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorDeleteForwardWord);
			},
			cursorDeleteForwardBlock (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorDeleteForwardBlock);
			},

			cursorBeginningOfLine (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorBeginningOfLine);
			},
			cursorEndOfLine (e, alter) {
				return this.wrapAction(e, alter, fn.common.cursorEndOfLine);
			}
		}
	}
};
// >>>

/*
 * functions
 */

function getAlter (e) {
	return (e.shiftKey || e.target.dataset[SELECT_MODE_KEY] === '1') ? 'extend' : 'move';
}

function isSelectMode (el) {
	return el.dataset[SELECT_MODE_KEY] === '1';
}

function dumpNode (node, limit = 32) {
	let header = '';

	if (node?.nodeType === Node.TEXT_NODE) {
		node = node.parentNode;
		header = '#text ';
	}
	if (!node) {
		return '(node is unavailable)';
	}
	if (node === document) {
		return '#document';
	}
	if (!node.outerHTML) {
		return '(node#outerHTML is unavilable)';
	}
	return header + node.outerHTML.replace(/\s+/g, ' ').substring(0, limit) + '...';
}

function setSelectMode (el, value) {
	let message;

	if (value) {
		message = 'select mode ON';
		el.dataset[SELECT_MODE_KEY] = '1';
	}
	else {
		message = 'select mode OFF';
		delete el.dataset[SELECT_MODE_KEY];

		if (editUtils.isSimpleEdit(el)) {
			const [ss, se] = editUtils.getSelectionRange(el);
			if (ss !== se) {
				if (editUtils.direction(el) === 'backward') {
					editUtils.setSelectionRange(el, ss);
					message += `, ss: ${ss} (backward)`;
				}
				else {
					editUtils.setSelectionRange(el, se);
					message += `, se: ${se} (forward)`;
				}
			}
			else {
				message += ' (already OFF)';
			}
		}
		else {
			const sel = window.getSelection();
			if (sel.anchorNode === sel.focusNode) {
				if (sel.anchorOffset < sel.focusOffset) {
					sel.collapseToEnd();
				}
				else {
					sel.collapseToStart();
				}
			}
			else {
				const rel = sel.anchorNode.compareDocumentPosition(sel.focusNode);
				if (rel & Node.DOCUMENT_POSITION_PRECEDING) {
					sel.collapseToStart();
				}
				else {
					sel.collapseToEnd();
				}
			}
		}
	}

	log(message);
}

const getExprModule = (() => {
	let exprModule;
	return async () => {
		if (!exprModule) {
			exprModule = await import('./expr.js');
		}
		return exprModule;
	};
})();

const getTokenizerModule = (() => {
	let tokenizerModule;
	return async () => {
		if (!tokenizerModule) {
			tokenizerModule = await import('./tokenizer.js');
		}
		return tokenizerModule;
	};
})();

function EditorHelper () {
	/*
	 * functions
	 */

	function exec (name, e) {
		if (!hookEnabled) {
			return passThroughValue;
		}
		
		const subkey = (e.target.nodeName == 'INPUT' || e.target.nodeName == 'TEXTAREA') ?
			INPUT : CONTENT_EDITABLE;
		const handler = fn[PLATFORM]?.[subkey]?.[name]
			|| fn[PLATFORM]?.[name]
			|| fn.common[subkey]?.[name]
			|| fn.common[name];

		if (handler) {
			log(`calling ${name}`);
			return handler.call(this, e, getAlter(e));
		}
	}

	async function wrapAction (e, alter, callback) {
		/*
		 * note: Firefox does not allow Selection#modify() to work on
		 * INPUT/TEXTAREA elements, so we need to go through a
		 * contentEditable div element.
		 */
		const target = e.target;
		let cloned = document.getElementById(FX_WRAP_ID);
		if (!cloned) {
			cloned = document.body.appendChild(document.createElement('div'));
			cloned.id = FX_WRAP_ID;
			cloned.style.position = 'fixed';
			cloned.style.left = '100%';
			cloned.style.top = 0;
			cloned.style.margin = 0;
			cloned.style.padding = 0;
			cloned.style.border = 'none';
			cloned.style.backgroundColor = 'white';
			cloned.style.color = 'black';
			cloned.contentEditable = 'true';
			log(`clone element initialized`);
		}

		const targetStyle = window.getComputedStyle(target);
		const syncStyles = [
			'fontFamily',
			'fontSize',
			'fontStretch',
			'fontStyle',
			'fontVariant',
			'fontWeight',
			'lineHeight',
			'letterSpacing',
			'whiteSpace'
		];
		for (const s of syncStyles) {
			if (cloned.style[s] !== targetStyle[s]) {
				cloned.style[s] = targetStyle[s];
				log(`style updated: ${s}: ${targetStyle[s]}`);
			}
		}

		const w = target.scrollWidth
			- parseInt(targetStyle.paddingLeft, 10)
			- parseInt(targetStyle.paddingRight, 10);
		if (cloned.offsetWidth !== w) {
			log(`width updated: ${cloned.offsetWidth} -> ${w}px`);
			cloned.style.width = `${w}px`;
		}

		const h = target.scrollHeight
			- parseInt(targetStyle.paddingTop, 10)
			- parseInt(targetStyle.paddingBottom, 10);
		if (cloned.offsetHeight !== h) {
			log(`height updated: ${cloned.offsetHeight} -> ${h}px`);
			cloned.style.height = `${h}px`;
		}

		if (cloned.textContent !== target.value) {
			log(`content updated`);
			cloned.textContent = target.value;
		}

		const ss1 = target.selectionStart;
		const se1 = target.selectionEnd;
		let ss2 = ss1, se2 = se1;

		log(`wrapAction transaction start...`);
		stopEventListen();
		cloned.focus();
		try {
			editUtils.setSelectionRange(cloned, ss1, se1);

			const result = callback.call(this, {target: cloned}, alter);
			if (result instanceof Promise) {
				await result;
			}

			target.value = cloned.textContent;
			[ss2, se2] = editUtils.getSelectionRange(cloned);
		}
		finally {
			target.focus();
			await new Promise(resolve => setTimeout(resolve, 0));
			startEventListen();
		}

		if (ss1 != ss2 || se1 != se2) {
			log(`selection updated: ${ss1},${se1} -> ${ss2},${se2}`);
			target.setSelectionRange(ss2, se2);
		}

		log(`wrapAction transaction terminated`);
	}

	async function tokenize (s) {
		if (s !== tokensData.subject) {
			tokensData.subject = s;
			tokensData.tokens = null;

			if (tokensData.tokenizer) {
				try {
					tokensData.tokens = await tokensData.tokenizer(s);
				}
				catch (err) {
					tokensData.tokenizer = undefined;
					log(err.message + '\n' + err.stack);
				}
			}
		}

		return tokensData.tokens;
	}

	function handleChanged (changes, area) {
		if (area === 'local' && 'killedText' in changes) {
			killedText = changes.killedText.newValue;
		}
	}

	function handleInput (e) {
		//log(`document#input: type: ${e.inputType}, target: ${dumpNode(e.target)}`);

		if (isSelectMode(e.target)) {
			setSelectMode(e.target, false);
		}
	}

	/*
	function handleFocusin (e) {
		//log(`document#focusin: ${dumpNode(e.target)}`);

		if (!editUtils.normalize(e.target)
		&& LAST_POSITION_KEY in e.target.dataset
		&& /^(\d+):(\d+)$/.test(e.target.dataset[LAST_POSITION_KEY])) {
			const ss = RegExp.$1 - 0;
			const se = RegExp.$2 - 0;
			editUtils.setSelectionRange(e.target, ss, se);
		}
	}
	*/

	/*
	function handleFocusout (e) {
		//log(`document#focusout: ${dumpNode(e.target)}`);

		const [ss, se] = editUtils.getSelectionRange(e.target);
		if (ss !== undefined && se !== undefined) {
			e.target.dataset[LAST_POSITION_KEY] = `${ss}:${se}`;
		}
	}
	*/

	function handleSelectionchange (e) {
		//log(`document#selectionchange: ${dumpNode(e.target)}`);

		const s = window.getSelection();
		const target = selectionUtils.getTarget(s, e);
		if (target) {
			const isSelectionAvailable = !selectionUtils.isCollapsed(s, e);
			const currentSelectMode = isSelectMode(target);

			if (isSelectionAvailable !== currentSelectMode) {
				log([
					`document#selectionchange: eventPhase: ${e.eventPhase}, ${dumpNode(e.target)}`,
					`              target: ${dumpNode(target)}`,
					`isSelectionAvailable: ${isSelectionAvailable}`,
					`   currentSelectMode: ${currentSelectMode}`
				].join('\n'));
				setSelectMode(target, isSelectionAvailable);
			}
		}
	}

	function startEventListen () {
		document.addEventListener('input', handleInput);
		//document.addEventListener('focusin', handleFocusin);
		//document.addEventListener('focusout', handleFocusout);
		document.addEventListener('selectionchange', handleSelectionchange);
	}

	function stopEventListen () {
		document.removeEventListener('input', handleInput);
		//document.removeEventListener('focusin', handleFocusin);
		//document.removeEventListener('focusout', handleFocusout);
		document.removeEventListener('selectionchange', handleSelectionchange);
	}

	/*
	 * variables
	 */

	/*
	 * startup
	 */

	if (typeof chrome !== 'undefined' && chrome.storage) {
		chrome.storage.onChanged.addListener(handleChanged);
		chrome.storage.local.get({killedText: ''}).then(result => {
			killedText = result.killedText;
		});
	}

	startEventListen();

	return {
		get passThroughValue () {return passThroughValue},
		set passThroughValue (value) {
			passThroughValue = value;
		},
		get hookEnabled () {return hookEnabled},
		set hookEnabled (value) {
			value = !!value;
			if (value !== hookEnabled) {
				hookEnabled = value;
				hookEnabled ? startEventListen() : stopEventListen();
			}
		},
		get killedText () {return killedText},
		set killedText (value) {
			killedText = '' + value;

			if (typeof chrome !== 'undefined' && chrome.storage) {
				chrome.storage.onChanged.removeListener(handleChanged);
				chrome.storage.local.set({killedText}).then(() => {
					chrome.storage.onChanged.addListener(handleChanged);
				});
			}
		},
		get log () {return log},
		set log (value) {
			if (typeof value === 'function') {
				log = value;
			}
		},
		get tokenizer () {return tokensData.tokenizer},
		set tokenizer (value) {
			if (typeof value === 'function') {
				tokensData.tokenizer = value;
			}
		},
		get editUtils () {return editUtils},

		wrapAction, tokenize,

		cursorBeginningOfLine (e)     {return exec.call(this, 'cursorBeginningOfLine', e)},
		cursorEndOfLine (e)           {return exec.call(this, 'cursorEndOfLine', e)},
		cursorNextLine (e)            {return exec.call(this, 'cursorNextLine', e)},
		cursorPreviousLine (e)        {return exec.call(this, 'cursorPreviousLine', e)},
		cursorForwardChar (e)         {return exec.call(this, 'cursorForwardChar', e)},
		cursorBackwardChar (e)        {return exec.call(this, 'cursorBackwardChar', e)},
		cursorForwardWord (e)         {return exec.call(this, 'cursorForwardWord', e)},
		cursorBackwardWord (e)        {return exec.call(this, 'cursorBackwardWord', e)},
		cursorDeleteBackwardChar (e)  {return exec.call(this, 'cursorDeleteBackwardChar', e)},
		cursorDeleteBackwardWord (e)  {return exec.call(this, 'cursorDeleteBackwardWord', e)},
		cursorDeleteBackwardBlock (e) {return exec.call(this, 'cursorDeleteBackwardBlock', e)},
		cursorDeleteForwardChar (e)   {return exec.call(this, 'cursorDeleteForwardChar', e)},
		cursorDeleteForwardWord (e)   {return exec.call(this, 'cursorDeleteForwardWord', e)},
		cursorDeleteForwardBlock (e)  {return exec.call(this, 'cursorDeleteForwardBlock', e)},
		selectAll (e)                 {return exec.call(this, 'selectAll', e)},
		yank (e)                      {return exec.call(this, 'yank', e)},
		copy (e)                      {return exec.call(this, 'copy', e)},
		expr (e)                      {return exec.call(this, 'expr', e)},
		newLine (e)                   {return exec.call(this, 'newLine', e)},
		toggleSelectMode (e)          {return exec.call(this, 'toggleSelectMode', e)}
	};
}

export function setEditorHelperLogger (fn) {
	if (typeof fn === 'function') {
		log = fn;
	}
}

export function setTokenizer (fn) {
	if (typeof fn === 'function') {
		tokensData.tokenizer = fn;
	}
}

export async function cursorBackwardWord (alter, content, ss, se) {
	log(`cursorBackwardWord: ${ss}, ${se} "${content.replace(/\n/g, '\\n')}"`);

	if (content === '' || ss <= 0 || (ss === 0 && content.charAt(ss) === '\n')) {
		return {action: WORD_MOVE_NONE};
	}
	if (ss > 0 && content.charAt(ss - 1) === '\n') {
		return {action: WORD_MOVE_BACKWARD};
	}

	let start = content.lastIndexOf('\n', ss - 1);
	start = start < 0 ? 0 : start + 1;

	let end = content.indexOf('\n', ss);
	end = end < 0 ? content.length : end;

	const currentLine = content.substring(start, end);
	const tokens = await this.tokenize(currentLine);
	if (!tokens) {
		return {action: WORD_MOVE_FALLBACK};
	}

	let currentTokenIndex = (await getTokenizerModule())
		.findTokenIndex(tokens, se - start, false);

	log([
		`currentLine: "${currentLine.replace(/\n/g, '\\n')}"`,
		` start, end: ${start}, ${end}`,
		`     ss, se: ${ss}, ${se}`,
		`currentTokenIndex: ${currentTokenIndex}`,
		`tokens:`,
		`\t` + tokens.map(t => JSON.stringify(t)).join('\n\t')
	].join('\n'));

	if (currentTokenIndex < 0) {
		currentTokenIndex = tokens.length - 1;
	}
	else if (currentTokenIndex >= tokens.length) {
		currentTokenIndex = tokens.length - 1;
	}

	currentTokenIndex += tokens[currentTokenIndex].index + start < ss ? 1 : 0;
	ss = currentTokenIndex > 0 ? tokens[currentTokenIndex - 1].index + start : 0;

	return {
		action: WORD_MOVE_JUMPED,
		ss,
		se: alter === 'move' ? ss : se
	};
}

export async function cursorForwardWord (alter, content, ss, se) {
	log(`cursorForwardWord: ${ss}, ${se} "${content.replace(/\n/g, '\\n')}"`);

	if (content === '' || se >= content.length) {
		return {action: WORD_MOVE_NONE};
	}
	if (content.charAt(se) === '\n') {
		return {action: WORD_MOVE_FORWARD};
	}

	let start = content.lastIndexOf('\n', se) + 1;
	let end = content.indexOf('\n', se);
	end = end < 0 ? content.length : end;

	const currentLine = content.substring(start, end);
	const tokens = await this.tokenize(currentLine);
	if (!tokens) {
		return {action: WORD_MOVE_FALLBACK};
	}

	let currentTokenIndex = (await getTokenizerModule())
		.findTokenIndex(tokens, se - start, true);

	log([
		`currentLine: "${currentLine.replace(/\n/g, '\\n')}"`,
		` start, end: ${start}, ${end}`,
		`     ss, se: ${ss}, ${se}`,
		`currentTokenIndex: ${currentTokenIndex}`,
		`tokens:`,
		`\t` + tokens.map(t => JSON.stringify(t)).join('\n\t')
	].join('\n'));

	if (currentTokenIndex < 0) {
		currentTokenIndex = -1;
	}
	else if (currentTokenIndex >= tokens.length - 1) {
		return {action: WORD_MOVE_EOL};
	}

	se = tokens[currentTokenIndex + 1].index + start;

	return {
		action: WORD_MOVE_JUMPED,
		ss: alter === 'move' ? se : ss,
		se
	};
}

export function createEditorHelper () {
	if (!editorHelper) {
		editorHelper = EditorHelper();
	}
	return editorHelper;
}

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
