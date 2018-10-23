/*
 * color picker
 *
 * @author akahuku@gmail.com
 */

Akahuku.startColorPicker = function startColorPicker (target, options) {
	const IMAGE_SV = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPAgMAAABGuH3ZAAAACVBMVEUAAAAAAAD///+D3c/SAAAAAXRSTlMAQObYZgAAADdJREFUCNdjYGB1YGBgiJrCwMC4NJOBgS1AzIFBkoFxAoRIYXVIYUhhAxIgFkICrA6kA6IXbAoAsj4LrV7uPHgAAAAASUVORK5CYII=';
	const IMAGE_HUE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAAJCAYAAABNEB65AAAAR0lEQVQ4y9XTIQ4AMAhD0V/uf2emJkZCZlsUIYgnWoAmb7rukoQGqHlIQE+4O/6x1e/BEb3BZQjXDy7jqGiDK6CcSinkmvkDtwYMCcTVwlUAAAAASUVORK5CYII=';
	const IMAGE_UP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAICAYAAAAm06XyAAAAQElEQVQY05XMwQ0AIAhD0ToC++9YRqgnL0YKNuFE/oMkVEdS7t+FcoANzyqgDR0wCitgHL6Ar/AGFklFBH6Xmdg1tm7Xheu+iwAAAABJRU5ErkJggg==';
	const LRU_KEY = 'ColorPicker.LRUList';
	const LRU_COLOR_ATTR = 'data-color';

	var overlay, panel, colorPanel, LRUPanel, controlPanel,
		svCanvas, hueCanvas, receiver, colorText, okButton,
		svCursor, hueCursor, upArrow, currentColor;

	// utility functions
	function style (elm, s) {
		for (var i in s) if (i in elm.style) elm.style[i] = '' + s[i];
		return elm;
	}

	function cre (elm, name) {
		return elm.appendChild(document.createElement(name));
	}

	function parsejson (fragment, defaultValue) {
		try { return JSON.parse(fragment) }
		catch (e) { return defaultValue }
	}

	function minmax (min, value, max) {
		return Math.max(min, Math.min(value, max));
	}

	function emit () {
		var args = Array.prototype.slice.call(arguments), name = args.shift();
		if (!(name in options) || typeof options[name] != 'function') return;
		try { return options[name].apply(null, args) }
		catch (e) { }
	}

	// dom manipulators
	function createOverlay () {
		return style(overlay = cre(document.body, 'div'), {
			position: 'fixed',
			left: 0, top: 0, right: 0, bottom: 0,
			backgroundColor: 'rgba(0,0,0,.01)',
			zIndex: '1879048192'
		})
	}

	function createPanel () {
		style(panel = cre(document.body, 'div'), {
			position: 'absolute',
			backgroundColor: '#fff',
			color: '#333',
			padding: '16px',
			border: '1px solid #eee',
			borderRadius: '3px',
			boxShadow: '0 10px 6px -6px rgba(0,0,0,.5)',
			zIndex: '1879048193'
		});

		style(upArrow = cre(panel, 'img'), {
			position: 'absolute',
			left: '0', top: '-8px'
		});
		upArrow.src = IMAGE_UP;

		// row 1, color panel
		colorPanel = cre(panel, 'div');
		style(svCanvas = cre(colorPanel, 'canvas'), {
			margin: '0 14px 0 0',
			width: '200px',
			height: '200px',
			outline: '1px solid silver'
		});

		style(hueCanvas = cre(colorPanel, 'canvas'), {
			margin: '0',
			width: '32px',
			height: '200px',
			outline: '1px solid silver'
		});

		style(svCursor = cre(colorPanel, 'img'), {
			position: 'absolute',
			left: '0',
			top: '0'
		});
		svCursor.src = IMAGE_SV;

		style(hueCursor = cre(colorPanel, 'img'), {
			position: 'absolute',
			left: '-5px',
			top: '0'
		});
		hueCursor.src = IMAGE_HUE;

		style(receiver = cre(colorPanel, 'div'), {
			position: 'absolute',
			width: '281px', height: '226px',
			left: '0', top: '0',
			backgroundColor: 'rgba(0,0,0,.01)'
		});

		// row 2, LRU panel
		style(LRUPanel = cre(panel, 'div'), {
			margin: '8px 0 8px 0',
			padding: '0 0 0 3px',
			width: '246px',
			overflow: 'hidden',
			whiteSpace: 'nowrap'
		});
		for (var i = 0; i < 9; i++) {
			style(cre(LRUPanel, 'div'), {
				display: 'inline-block',
				width: '22px',
				height: '22px',
				backgroundColor: '#808080',
				margin: '0 3px 0 0',
				border: '1px solid silver',
				cursor: 'pointer'
			});
		}

		// row 3, control panel
		style(controlPanel = cre(panel, 'div'), {
			margin: '0',
			textAlign: 'right'
		});

		style(colorText = cre(controlPanel, 'input'), {
			margin: '0 4px 0 0',
			pading: '3px',
			border: '1px solid silver',
			width: '8em',
			fontFamily: 'monospace'
		});
		colorText.type = 'text';

		style(okButton = cre(controlPanel, 'input'), {
			width: '8em'
		});
		okButton.type = 'button';
		okButton.value = 'OK';

		return panel;
	}

	function paintSaturationValue (canvas, hueValue) {
		var c = canvas.getContext('2d');
		c.clearRect(0, 0, canvas.width, canvas.height);

		var g = c.createLinearGradient(0, 0, canvas.width, 0);
		g.addColorStop(0, `hsl(${hueValue},100%,100%)`);
		g.addColorStop(1, `hsl(${hueValue},100%, 50%)`);
		c.fillStyle = g;
		c.fillRect(0, 0, canvas.width, canvas.height);

		var g = c.createLinearGradient(0, 0, 0, canvas.height);
		g.addColorStop(0, `hsla(${hueValue},100%,50%,0)`);
		g.addColorStop(1, `hsla(${hueValue},100%, 0%,1)`);
		c.fillStyle = g;
		c.fillRect(0, 0, canvas.width, canvas.height);
	}

	function paintHue (canvas) {
		var c = canvas.getContext('2d');
		var g = c.createLinearGradient(0, 0, 0, canvas.height);
		g.addColorStop(0,         'hsl(  0,100%,50%)');
		g.addColorStop(1 / 6 * 1, 'hsl( 60,100%,50%)');
		g.addColorStop(1 / 6 * 2, 'hsl(120,100%,50%)');
		g.addColorStop(1 / 6 * 3, 'hsl(180,100%,50%)');
		g.addColorStop(1 / 6 * 4, 'hsl(240,100%,50%)');
		g.addColorStop(1 / 6 * 5, 'hsl(300,100%,50%)');
		g.addColorStop(1,         'hsl(360,100%,50%)');
		c.fillStyle = g;
		c.fillRect(0, 0, canvas.width, canvas.height);
	}

	function paintHexText (color) {
		colorText.value = color.text;
	}

	function paintHueCursor (color) {
		style(hueCursor, {
			left: (hueCanvas.offsetLeft - 7) + 'px',
			top: (hueCanvas.offsetTop - 4 + (color.hue / 360) * hueCanvas.offsetHeight) + 'px'
		});
	}

	function paintSvCursor (color) {
		style(svCursor, {
			left: (svCanvas.offsetLeft - 7 + color.saturation * (svCanvas.offsetWidth - 1)) + 'px',
			top: (svCanvas.offsetTop - 7 + (1 - color.value) * (svCanvas.offsetHeight - 1)) + 'px'
		});
	}

	function paintLRU () {
		var list = parsejson(window.sessionStorage[LRU_KEY]);
		if (!(list instanceof Array)) list = [];

		function setColor (node, color) {
			node.style.backgroundColor = color;
			node.setAttribute(LRU_COLOR_ATTR, color);
		}

		list.forEach(function (color, i) {
			if (LRUPanel.children[i]) {
				setColor(LRUPanel.children[i], color);
			}
		});

		// futaba specific
		setColor(LRUPanel.children[LRUPanel.children.length - 2], '#800000');
		setColor(LRUPanel.children[LRUPanel.children.length - 1], '#f0e0d6');
	}

	// event handlers
	function handleOverlayClick (e) {
		e.preventDefault();
		emit('cancel');
		leave();
	}

	function handleColorTextBlur (e) {
		currentColor = parseHexColor(e.target.value);
		updateHSV(currentColor);
		paintSaturationValue(svCanvas, currentColor.hue);
		paintHueCursor(currentColor);
		paintSvCursor(currentColor);
		paintHexText(currentColor);
		emit('change', currentColor);
	}

	function handleLRUPanelClick (e) {
		if (!e.target.hasAttribute(LRU_COLOR_ATTR)) return;
		colorText.value = e.target.getAttribute(LRU_COLOR_ATTR);
		handleColorTextBlur({target: colorText});
	}

	function handleOkButtonClick (e) {
		emit('ok', currentColor);
		pushLRU(currentColor.text);
		leave();
	}

	function handleReceiverMousedown (e) {
		var x = e.offsetX, y = e.offsetY;
		if (x >= svCanvas.offsetLeft && x < svCanvas.offsetLeft + svCanvas.offsetWidth
		&&  y >= svCanvas.offsetTop  && y < svCanvas.offsetTop  + svCanvas.offsetHeight) {
			e.target.addEventListener('mousemove', handleReceiverMousemove1, false);
			e.target.addEventListener('mouseup', handleReceiverMouseup, false);
			e.preventDefault();
			handleReceiverMousemove1(e);
		}
		else if (x >= hueCanvas.offsetLeft && x < hueCanvas.offsetLeft + hueCanvas.offsetWidth
		&&       y >= hueCanvas.offsetTop  && y < hueCanvas.offsetTop  + hueCanvas.offsetHeight) {
			e.target.addEventListener('mousemove', handleReceiverMousemove2, false);
			e.target.addEventListener('mouseup', handleReceiverMouseup, false);
			e.preventDefault();
			handleReceiverMousemove2(e);
		}
	}

	function handleReceiverMousemove1 (e) {
		if ('buttons' in e && !e.buttons) return handleReceiverMouseup(e);
		var x = e.offsetX - svCanvas.offsetLeft;
		var y = e.offsetY - svCanvas.offsetTop;
		currentColor.saturation = minmax(0, x / (svCanvas.offsetWidth - 1), 1.0);
		currentColor.value = 1.0 - minmax(0, y / (svCanvas.offsetHeight - 1), 1.0);
		updateRGB(currentColor);
		paintSvCursor(currentColor);
		paintHexText(currentColor);
		emit('change', currentColor);
	}

	function handleReceiverMousemove2 (e) {
		if ('buttons' in e && !e.buttons) return handleReceiverMouseup(e);
		var x = e.offsetX - hueCanvas.offsetLeft;
		var y = e.offsetY - hueCanvas.offsetTop;
		currentColor.hue = minmax(0, y / hueCanvas.offsetHeight * 360, 359);
		paintSaturationValue(svCanvas, currentColor.hue);
		updateRGB(currentColor);
		paintHueCursor(currentColor);
		paintHexText(currentColor);
		emit('change', currentColor);
	}

	function handleReceiverMouseup (e) {
		e.target.removeEventListener('mousemove', handleReceiverMousemove1, false);
		e.target.removeEventListener('mousemove', handleReceiverMousemove2, false);
		e.target.removeEventListener('mouseup', handleReceiverMouseup, false);
	}

	// core functions
	function parseHexColor (color) {
		var r = 255, g = 255, b = 255, re;
		re = /^\s*#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})\s*$/i.exec(color);
		if (re) {
			r = parseInt(re[1], 16);
			g = parseInt(re[2], 16);
			b = parseInt(re[3], 16);
		}
		else {
			re = /^\s*#?([0-9a-f])([0-9a-f])([0-9a-f])\s*$/i.exec(color)
			if (re) {
				r = parseInt(re[1], 16) * 17;
				g = parseInt(re[2], 16) * 17;
				b = parseInt(re[3], 16) * 17;
			}
		}
		var result = {
			hue: 0, saturation: 0, value: 0,
			r: r, g: g, b: b,
			text: ''
		};
		updateHSV(result);
		return result;
	}

	function updateRGB (color) {
		// @see https://en.wikipedia.org/wiki/HSL_and_HSV#From_HSV
		var C = color.value * color.saturation,
			Hd = color.hue / 60,
			X = C * (1 - Math.abs(Hd % 2 - 1)),
			m = color.value - C,
			R1, G1, B1;

		if      (0 <= Hd && Hd < 1) { R1 = C; G1 = X; B1 = 0; }
		else if (1 <= Hd && Hd < 2) { R1 = X; G1 = C; B1 = 0; }
		else if (2 <= Hd && Hd < 3) { R1 = 0; G1 = C; B1 = X; }
		else if (3 <= Hd && Hd < 4) { R1 = 0; G1 = X; B1 = C; }
		else if (4 <= Hd && Hd < 5) { R1 = X; G1 = 0; B1 = C; }
		else if (5 <= Hd && Hd < 6) { R1 = C; G1 = 0; B1 = X; }

		color.r = (minmax(0.0, R1 + m, 1.0) * 255).toFixed(0) - 0;
		color.g = (minmax(0.0, G1 + m, 1.0) * 255).toFixed(0) - 0;
		color.b = (minmax(0.0, B1 + m, 1.0) * 255).toFixed(0) - 0;
		updateHexText(color);
	}

	function updateHSV (color) {
		// @see https://en.wikipedia.org/wiki/HSL_and_HSV#Hue_and_chroma
		// @see https://en.wikipedia.org/wiki/HSL_and_HSV#Lightness
		// @see https://en.wikipedia.org/wiki/HSL_and_HSV#Saturation
		var r = color.r / 255, g = color.g / 255, b = color.b / 255,
			M = Math.max(r, g, b), m = Math.min(r, g, b), C = M - m, Hd;

		if      (C == 0) Hd = 0;
		else if (M == r) Hd = ((g - b) / C) % 6;
		else if (M == g) Hd = ((b - r) / C) + 2;
		else if (M == b) Hd = ((r - g) / C) + 4;

		color.hue = (60 * Hd + 360) % 360;
		color.value = M;
		color.saturation = minmax(0.0, C == 0 ? 0 : C / color.value, 1.0);
		updateHexText(color);
	}

	function updateHexText (color) {
		color.text = '#' +
			('00' + color.r.toString(16)).substr(-2) +
			('00' + color.g.toString(16)).substr(-2) +
			('00' + color.b.toString(16)).substr(-2);
	}

	function pushLRU (color) {
		var list = window.sessionStorage[LRU_KEY];
		try {
			list = parsejson(list);
			if (!(list instanceof Array)) list = [];

			for (var i = 0; i < list.length; i++) {
				if (list[i] == color) {
					list.splice(i, 1);
					list.unshift(color);
					break;
				}
			}

			if (i >= list.length) {
				list.length >= LRUPanel.children.length && list.pop();
				list.unshift(color);
			}
		}
		finally {
			window.sessionStorage[LRU_KEY] = JSON.stringify(list);
		}
	}

	function init () {
		options || (options = {});
		overlay = createOverlay();
		panel = createPanel();

		currentColor = parseHexColor(options.initialColor || '#fff');
		paintHue(hueCanvas);
		paintSaturationValue(svCanvas, currentColor.hue);
		paintSvCursor(currentColor);
		paintHueCursor(currentColor);
		paintHexText(currentColor);
		paintLRU();

		var targetPos = target.getBoundingClientRect();
		style(panel, {
			left: (docScrollLeft() + targetPos.left) + 'px',
			top: (docScrollTop() + targetPos.top + target.offsetHeight + 3) + 'px'
		});
		style(upArrow, {
			left: (Math.min(panel.offsetWidth, target.offsetWidth) / 2 - 7) + 'px'
		});

		overlay.addEventListener('click', handleOverlayClick, false);
		LRUPanel.addEventListener('click', handleLRUPanelClick, false);
		colorText.addEventListener('blur', handleColorTextBlur, false);
		okButton.addEventListener('click', handleOkButtonClick, false);
		receiver.addEventListener('mousedown', handleReceiverMousedown, false);
	}

	function leave () {
		overlay.removeEventListener('click', handleOverlayClick, false);
		LRUPanel.removeEventListener('click', handleLRUPanelClick, false);
		colorText.removeEventListener('blur', handleColorTextBlur, false);
		okButton.removeEventListener('click', handleOkButtonClick, false);
		receiver.removeEventListener('mousedown', handleReceiverMousedown, false);

		panel.parentNode.removeChild(panel);
		overlay.parentNode.removeChild(overlay);
		target.focus();
	}

	init();
};
