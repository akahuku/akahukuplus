/*
 * editor helper module for akahukuplus
 *
 * @author akahuku@gmail.com
 */

const INPUT = '*input*';
const CONTENT_EDITABLE = '*contentEditable*';
const PLATFORM = 'InstallTrigger' in window ? 'gecko' : 'blink';

const editUtils = {
	isSimpleEdit: function (el) {
		return 'selectionStart' in el
			&& 'selectionEnd' in el
			&& 'value' in el;
	},
	isComplexEdit: function (el) {
		return el.isContentEditable;
	},
	getRoot: function (el) {
		return el.closest('[contentEditable="true"]');
	},
	value: function (el, value) {
		if (arguments.length == 1) {
			if (this.isSimpleEdit(el)) {
				return el.value;
			}
			else if (this.isComplexEdit(el)) {
				return this.getRoot(el).textContent;
			}
			return undefined;
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
	insert: function (el, pos, value) {
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
	delete: function (el, pos, length) {
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
	selectionStart: function (el) {
		if (this.isSimpleEdit(el)) {
			return el.selectionStart;
		}
		else if (this.isComplexEdit(el)) {
			const caretRange = window.getSelection().getRangeAt(0);
			const r = document.createRange();

			if (!el.firstChild) {
				el.appendChild(document.createTextNode(''));
			}
			r.setStartBefore(el.firstChild);
			r.setEnd(caretRange.startContainer, caretRange.startOffset);
			return r.toString().length;
		}
		return undefined;
	},
	selectionEnd: function (el) {
		if (this.isSimpleEdit(el)) {
			return el.selectionEnd;
		}
		else if (this.isComplexEdit(el)) {
			const caretRange = window.getSelection().getRangeAt(0);
			const r = document.createRange();

			if (!el.firstChild) {
				el.appendChild(document.createTextNode(''));
			}
			r.setStartBefore(el.firstChild);
			r.setEnd(caretRange.endContainer, caretRange.endOffset);
			return r.toString().length;
		}
		return undefined;
	},
	setSelectionRange: function (el, start, end) {
		if (arguments.length == 2) {
			return this.doSetSelectionPos(el, start);
		}
		else if (arguments.length > 2) {
			return this.doSetSelectionRange(el, start, end);
		}
	},
	doSetSelectionPos: function (el, value) {
		if (this.isSimpleEdit(el)) {
			el.selectionStart = value;
			el.selectionEnd = value;
		}
		else if (this.isComplexEdit(el)) {
			el = this.getRoot(el);

			const iter = document.createNodeIterator(
				el, window.NodeFilter.SHOW_TEXT, null, false);
			const r = document.createRange();
			let total = 0;
			let node, nodep;
			while ((node = iter.nextNode())) {
				const next = total + node.nodeValue.length;
				if (total <= value && value < next) {
					r.setStart(node, value - total);
					r.setEnd(node, value - total);
					break;
				}
				nodep = node;
				total = next;
			}

			if (!node && nodep && value >= total) {
				r.setStartAfter(nodep);
				r.setEndAfter(nodep);
			}

			const s = window.getSelection();
			s.removeAllRanges();
			s.addRange(r);
			return r;
		}
	},
	doSetSelectionRange: function (el, start, end) {
		if (this.isSimpleEdit(el)) {
			el.selectionStart = start;
			el.selectionEnd = end;
		}
		else if (this.isComplexEdit(el)) {
			el = this.getRoot(el);

			const iter = document.createNodeIterator(
				el, window.NodeFilter.SHOW_TEXT, null, false);
			const r = document.createRange();
			let total = 0;
			let node, nodep;
			while ((node = iter.nextNode())) {
				const next = total + node.nodeValue.length;
				if (total <= start && start < next) {
					r.setStart(node, start - total);
				}
				if (total <= end && end < next) {
					r.setEnd(node, end - total);
				}
				nodep = node;
				total = next;
			}

			if (nodep) {
				if (start >= total) {
					r.setStartAfter(nodep);
				}

				if (end >= total) {
					r.setEndAfter(nodep);
				}
			}

			const s = window.getSelection();
			s.removeAllRanges();
			s.addRange(r);
			return r;
		}
	}
};

const fn = {
	common: {
		cursorPreviousLine: e => {
			document.getSelection().modify(getAlter(e), 'backward', 'line');
		},
		cursorNextLine: e => {
			document.getSelection().modify(getAlter(e), 'forward', 'line');
		},
		cursorBackwardWord: e => {
			document.getSelection().modify(getAlter(e), 'backward', 'word');
		},
		cursorForwardWord: e => {
			document.getSelection().modify(getAlter(e), 'forward', 'word');
		},
		cursorBackwardChar: e => {
			document.getSelection().modify(getAlter(e), 'backward', 'character');
		},
		cursorForwardChar: e => {
			document.getSelection().modify(getAlter(e), 'forward', 'character');
		},
		cursorDeleteBackwardChar: e => {
			const selection = document.getSelection();
			const range = selection.getRangeAt(0);
			if (range.collapsed) {
				selection.modify('extend', 'backward', 'character');
			}
			document.execCommand('delete', false, null);
		},
		cursorDeleteBackwardWord: e => {
			const selection = document.getSelection();
			const range = selection.getRangeAt(0);
			if (range.collapsed) {
				selection.modify('extend', 'backward', 'word');
			}
			document.execCommand('delete', false, null);
		},
		cursorDeleteBackwardBlock: e => {
			const selection = document.getSelection();
			const range = selection.getRangeAt(0);
			if (range.collapsed) {
				selection.modify('extend', 'backward', 'lineboundary');
			}
			document.execCommand('delete', false, null);
		},
		cursorDeleteForwardChar: e => {
			const selection = document.getSelection();
			const range = selection.getRangeAt(0);
			if (range.collapsed) {
				selection.modify('extend', 'forward', 'character');
			}
			document.execCommand('delete', false, null);
		},
		cursorDeleteForwardWord: e => {
			const selection = document.getSelection();
			const range = selection.getRangeAt(0);
			if (range.collapsed) {
				selection.modify('extend', 'forward', 'word');
			}
			document.execCommand('delete', false, null);
		},
		cursorDeleteForwardBlock: e => {
			const selection = document.getSelection();
			const range = selection.getRangeAt(0);
			if (range.collapsed) {
				selection.modify('extend', 'forward', 'lineboundary');
			}
			document.execCommand('delete', false, null);
		},
		cursorBeginningOfLine: e => {
			document.getSelection().modify(getAlter(e), 'backward', 'lineboundary');
		},
		cursorEndOfLine: e => {
			document.getSelection().modify(getAlter(e), 'forward', 'lineboundary');
		},
		[INPUT]: {
			selectAll: e => {
				const t = e.target;
				t.setSelectionRange(0, t.value.length);
			}
		},
		[CONTENT_EDITABLE]: {
			selectAll: e => {
				document.getSelection().selectAllChildren(e.target);
			}
		}
	},
	gecko: {
		[INPUT]: {
			cursorPreviousLine: e => {
				doWithInput(e.target, fn.common.cursorPreviousLine);
			},
			cursorNextLine: e => {
				doWithInput(e.target, fn.common.cursorNextLine);
			},
			cursorBackwardWord: e => {
				doWithInput(e.target, fn.common.cursorBackwardWord);
			},
			cursorForwardWord: e => {
				doWithInput(e.target, fn.common.cursorForwardWord);
			},
			cursorBackwardChar: e => {
				doWithInput(e.target, fn.common.cursorBackwardChar);
			},
			cursorForwardChar: e => {
				doWithInput(e.target, fn.common.cursorForwardChar);
			},
			cursorDeleteBackwardChar: e => {
				doWithInput(e.target, fn.common.cursorDeleteBackwardChar);
			},
			cursorDeleteBackwardWord: e => {
				doWithInput(e.target, fn.common.cursorDeleteBackwardWord);
			},
			cursorDeleteBackwardBlock: e => {
				doWithInput(e.target, fn.common.cursorDeleteBackwardBlock);
			},
			cursorDeleteForwardChar: e => {
				doWithInput(e.target, fn.common.cursorDeleteForwardChar);
			},
			cursorDeleteForwardWord: e => {
				doWithInput(e.target, fn.common.cursorDeleteForwardWord);
			},
			cursorDeleteForwardBlock: e => {
				doWithInput(e.target, fn.common.cursorDeleteForwardBlock);
			},
			cursorBeginningOfLine: e => {
				doWithInput(e.target, fn.common.cursorBeginningOfLine);
			},
			cursorEndOfLine: e => {
				doWithInput(e.target, fn.common.cursorEndOfLine);
			}
		}
	}
};

function getAlter (e) {
	return e.shiftKey ? 'extend' : 'move';
}

function doWithInput (source, callback) {
	const cloned = document.body.appendChild(document.createElement('div'));
	try {
		const sourceStyle = window.getComputedStyle(source);
		[
			'borderTopStyle', 'borderLeftStyle', 'borderRightStyle', 'borderBottomStyle',
			'borderTopWidth', 'borderLeftWidth', 'borderRightWidth', 'borderBottomWidth',
			'paddingTop', 'paddingLeft', 'paddingRight', 'paddingBottom',
			'fontFamily', 'fontSize', 'fontWeight', 'lineHeight'
		].forEach(p => {
			cloned.style[p] = sourceStyle[p];
		});

		const boundings = source.getBoundingClientRect();
		cloned.style.position = 'absolute';
		cloned.style.boxSizing = 'content-box';
		cloned.style.width = `${boundings.width}px`;
		cloned.style.height = `${boundings.height}px`;
		cloned.style.left = `${-boundings.width}px`;
		cloned.style.top = `${boundings.top}px`;
		cloned.contentEditable = 'true';
		cloned.textContent = source.value;

		const ss1 = source.selectionStart;
		const se1 = source.selectionEnd;

		cloned.focus();
		editUtils.setSelectionRange(cloned, source.selectionStart, source.selectionEnd);
		callback(cloned);

		const ss2 = editUtils.selectionStart(cloned);
		const se2 = editUtils.selectionEnd(cloned);

		if (ss1 != ss2 || se1 != se2) {
			source.setSelectionRange(ss2, se2);
		}

		source.focus();
	}
	finally {
		cloned.parentNode.removeChild(cloned);
	}
}

export function createEditorHelper () {
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
			return handler(e);
		}
	}

	let passThroughValue = undefined;
	let hookEnabled = true;

	return {
		get passThroughValue () {
			return passThroughValue;
		},
		set passThroughValue (value) {
			passThroughValue = value;
		},
		get hookEnabled () {
			return hookEnabled;
		},
		set hookEnabled (value) {
			hookEnabled = !!value;
		},
		cursorBeginningOfLine: e => exec('cursorBeginningOfLine', e),
		cursorEndOfLine: e => exec('cursorEndOfLine', e),
		cursorNextLine: e => exec('cursorNextLine', e),
		cursorPreviousLine: e => exec('cursorPreviousLine', e),
		cursorForwardChar: e => exec('cursorForwardChar', e),
		cursorBackwardChar: e => exec('cursorBackwardChar', e),
		cursorForwardWord: e => exec('cursorForwardWord', e),
		cursorBackwardWord: e => exec('cursorBackwardWord', e),
		cursorDeleteBackwardChar: e => exec('cursorDeleteBackwardChar', e),
		cursorDeleteBackwardWord: e => exec('cursorDeleteBackwardWord', e),
		cursorDeleteBackwardBlock: e => exec('cursorDeleteBackwardBlock', e),
		cursorDeleteForwardChar: e => exec('cursorDeleteForwardChar', e),
		cursorDeleteForwardWord: e => exec('cursorDeleteForwardWord', e),
		cursorDeleteForwardBlock: e => exec('cursorDeleteForwardBlock', e),
		selectAll: e => exec('selectAll', e)
	};
}
