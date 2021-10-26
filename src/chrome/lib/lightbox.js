/*
 * lightbox module for akahukuplus
 *
 * @author akahuku@gmail.com
 */

import {$, $qs, $qsa, $t, getImageFrom, delay, transitionendp, empty} from './utils.js';

export function lightbox (args) {
	const {clickDispatcher, keyManager, storage} = args;

	function start (anchor) {
		const RUNNING_EXCLUSION_KEY = 'data-lightbox-status';
		const MARGIN = 32;
		const CLICK_THRESHOLD_DISTANCE = 4;
		const CLICK_THRESHOLD_TIME = 500;
		const WHEEL_SCROLL_UNIT_FACTOR = 0.33;
		const DIMMER_TRANSITION_DURATION_MSECS = 400;
		const IMAGE_TRANSITION_DURATION_MSECS = 300;

		let lightboxWrap;
		let dimmer;
		let imageWrap;
		let loaderWrap;
		let receiver;
		let image;
		let zoomMode;
		let rotation;
		let isInTransition;
		let dragState = {
			x: 0,
			y: 0,
			region: -2,
			imageRect: null
		};

		/*
		 * private functions
		 */

		function isScrollableHorizontally () {
			return image && imageWrap.offsetWidth > args.viewportRect.width;
		}

		function isScrollableVertically () {
			return image && imageWrap.offsetHeight > args.viewportRect.height;
		}

		function isScrollable () {
			return isScrollableHorizontally() || isScrollableVertically();
		}

		function isRotated () {
			return rotation == 'left' || rotation == 'right';
		}

		function appendPxSuffix (obj, suffix) {
			const result = {};
			suffix || (suffix = 'px');
			for (let i in obj) {
				if (typeof obj[i] == 'number') {
					result[i] = obj[i] + 'px';
				}
			}
			return result;
		}

		function getRegionId (e) {
			const imageRect = dragState.imageRect;
			const imageWrapRect = image.getBoundingClientRect();

			let result;

			if (imageRect
			&&  e.clientX >= imageRect.left && e.clientX < imageRect.right
			&&  e.clientY >= imageRect.top  && e.clientY < imageRect.bottom) {
				result = 0;
			}
			/*else if (e.clientX >= imageWrapRect.left && e.clientX < imageWrapRect.right
				 &&  e.clientY >= imageWrapRect.top  && e.clientY < imageWrapRect.bottom) {
				result = -1;
			}*/
			else {
				result = -1;
			}
			return result;
		}

		function getDistance (e) {
			return Math.sqrt(
				Math.pow(dragState.x - e.clientX, 2) +
				Math.pow(dragState.y - e.clientY, 2));
		}

		function getImageRect () {
			let vleft, vtop, vwidth, vheight;
			let width = 0, height = 0;
			let zm = zoomMode;

			if (arguments.length >= 1 && typeof arguments[0] == 'object') {
				vleft = arguments[0].left;
				vtop = arguments[0].top;
				vwidth = arguments[0].width;
				vheight = arguments[0].height;
				zm = 'whole';
			}
			else {
				vleft = MARGIN;
				vtop = MARGIN;
				vwidth = args.viewportRect.width - MARGIN * 2;
				vheight = args.viewportRect.height - MARGIN * 2;
			}

			const nwidth = isRotated() ? image.naturalHeight : image.naturalWidth;
			const nheight = isRotated() ? image.naturalWidth : image.naturalHeight;

			switch (zm) {
			case 'whole':
				if (nwidth <= vwidth && nheight <= vheight) {
					width = nwidth;
					height = nheight;
				}
				else {
					// portrait image
					if (nwidth < nheight) {
						let ratio = nwidth / nheight;
						width = Math.floor(vheight * ratio);
						height = vheight;
						if (width > vwidth) {
							ratio = nheight / nwidth;
							width = vwidth;
							height = Math.floor(vwidth * ratio);
						}
					}
					// landscape image
					else {
						let ratio = nheight / nwidth;
						width = vwidth;
						height = Math.floor(vwidth * ratio);
						if (height > vheight) {
							ratio = nwidth / nheight;
							width = Math.floor(vheight * ratio);
							height = vheight;
						}
					}
				}
				break;

			case 'actual-size':
				width = nwidth;
				height = nheight;
				break;

			case 'fit-to-width':
				width = vwidth;
				height = Math.floor(width * (nheight / nwidth));
				break;

			case 'fit-to-height':
				height = vheight;
				width = Math.floor(height * (nwidth / nheight));
				break;
			}

			const result = {
				left: vleft + vwidth / 2 - width / 2,
				top: vtop + vheight / 2 - height / 2,
				width: width,
				height: height
			};
			return result;
		}

		function applyGeometory (rect) {
			let result;
			let updated = false;

			// positioning
			const currentRect = imageWrap.getBoundingClientRect();
			if (rect.left != currentRect.left
			||  rect.top != currentRect.top
			||  rect.width != currentRect.width
			||  rect.height != currentRect.height) {
				// styling image wrapper
				Object.assign(imageWrap.style, appendPxSuffix(rect));

				// styling image itself
				if (isRotated()) {
					image.style.width = rect.height + 'px';
					image.style.height = rect.width + 'px';
				}
				else {
					image.style.width = rect.width + 'px';
					image.style.height = rect.height + 'px';
				}
				updated = true;
			}

			// rotation
			const degrees = {
				'normal': 0,
				'left': -90,
				'right': 90,
				'180': 180
			};
			const currentTransform = /rotate\(([-0-9]+)deg\)/.exec(image.style.transform) || ['', 0];
			const currentDegree = parseInt(currentTransform[1], 10);
			let newDegree = degrees[rotation];
			if (newDegree == 180) {
				newDegree *= currentDegree >= 0 ? 1 : -1;
			}
			if (newDegree != currentDegree) {
				image.style.transform = `rotate(${newDegree}deg)`;
				updated = true;
			}

			//
			if (updated) {
				image.style.opacity = 1.0;
				result = transitionendp(image, IMAGE_TRANSITION_DURATION_MSECS);
			}
			else {
				result = Promise.resolve(true);
			}

			isInTransition = true;
			return result.then(() => {
				// show info panel
				$qs('.info', lightboxWrap).style.top = '0';

				// update mode links
				updateModeLinks();

				// update geometory info
				updateGeometoryInfo();

				isInTransition = false;
			});
		}

		function setZoomMode (zm, opts) {
			opts || (opts = {});
			if (!image) return;
			if (zm != 'whole'
			&& zm != 'actual-size'
			&& zm != 'fit-to-width'
			&& zm != 'fit-to-height') return;

			zoomMode = zm;
			storage.runtime.lightbox.zoomMode = zm;
			storage.saveRuntime();

			let rect;
			if (zoomMode == 'actual-size'
			&& opts.event && getRegionId(opts.event) == 0
			&& (image.naturalWidth > args.viewportRect.width - MARGIN * 2 || image.naturalHeight > args.viewportRect.height - MARGIN * 2)) {
				const ratio = image.offsetWidth / image.naturalWidth;
				const imageRect = image.getBoundingClientRect();
				const offsetX = (opts.event.clientX - imageRect.left) / ratio;
				const offsetY = (opts.event.clientY - imageRect.top) / ratio;

				rect = getImageRect();
				if (image.naturalWidth > args.viewportRect.width - MARGIN * 2) {
					rect.left = opts.event.clientX - offsetX;
				}
				if (image.naturalHeight > args.viewportRect.height - MARGIN * 2) {
					rect.top = opts.event.clientY - offsetY;
				}
			}

			if (!rect) {
				rect = getImageRect();
			}

			applyGeometory(rect);
		}

		function updateModeLinks () {
			$qsa('#lightbox-zoom-modes a').forEach(node => {
				if (node.getAttribute('href') == '#lightbox-' + zoomMode) {
					node.classList.add('selected');
				}
				else {
					node.classList.remove('selected');
				}
			});

			$qsa('#lightbox-rotate-modes a').forEach(node => {
				if (node.getAttribute('href') == '#lightbox-' + rotation) {
					node.classList.add('selected');
				}
				else {
					node.classList.remove('selected');
				}
			});
		}

		function updateGeometoryInfo () {
			if (!image) return;
			if (!image.naturalWidth || !image.naturalHeight) return;

			const size = `${image.naturalWidth}x${image.naturalHeight}`;
			const zoomRatio = `   ${(parseInt(image.style.width, 10) / image.naturalWidth * 100).toFixed(2)}%`.substr(-7); // max: '100.00%'.length == 7

			$t('lightbox-ratio', `${size}, ${zoomRatio}`);
		}

		/*
		 * event handlers
		 */

		function handlePointerDown (e) {
			if (isInTransition) return;
			if (e.target != receiver) return;

			receiver.setPointerCapture(e.pointerId);

			e.preventDefault();

			if (e.target != e.currentTarget || e.buttons != 1) {
				dragState.region = -9;
				return;
			}

			dragState.time = Date.now();
			dragState.x = e.clientX;
			dragState.y = e.clientY;

			if (image) {
				dragState.imageRect = image.getBoundingClientRect();
				dragState.region = getRegionId(e);

				if (imageWrap.classList.contains('dragging')) {
					dragState.x = dragState.y = -1;
					dragState.region = -2;
				}
				else {
					receiver.addEventListener('pointermove', handlePointerMove);
					imageWrap.classList.add('dragging');
				}
			}
			else {
				dragState.imageRect = null;
				dragState.region = -2;
			}
		}

		function handlePointerMove (e) {
			if (isInTransition) return;
			if (dragState.region != 0) return;

			let left, top;
			switch (zoomMode) {
			case 'actual-size':
				//if (isScrollableHorizontally()) {
					left = dragState.imageRect.left + (e.clientX - dragState.x);
				//}
				//if (isScrollableVertically()) {
					top = dragState.imageRect.top + (e.clientY - dragState.y);
				//}
				break;

			case 'fit-to-width':
				if (isScrollableVertically()) {
					top = dragState.imageRect.top + (e.clientY - dragState.y);
				}
				break;

			case 'fit-to-height':
				if (isScrollableHorizontally()) {
					left = dragState.imageRect.left + (e.clientX - dragState.x);
				}
				break;
			}

			if (left != undefined) {
				imageWrap.style.left = left + 'px';
			}

			if (top != undefined) {
				imageWrap.style.top = top + 'px';
			}
		}

		function handlePointerUp (e) {
			if (isInTransition) return;

			image && imageWrap.classList.remove('dragging');
			receiver.releasePointerCapture(e.pointerId);
			receiver.removeEventListener('pointermove', handlePointerMove);

			// clicked?
			if (Date.now() - dragState.time < CLICK_THRESHOLD_TIME
			&&  getDistance(e) < CLICK_THRESHOLD_DISTANCE) {
				switch (dragState.region) {
				case 0: // inside image
					setZoomMode(
						zoomMode == 'whole' ? 'actual-size' : 'whole',
						{event: e});
					break;
				default: // outside image
					leave();
					break;
				}
			}

			// dragged?
			else if (image) {
				const rect = imageWrap.getBoundingClientRect();
				let left = rect.left;
				let top = rect.top;

				if (isScrollableHorizontally()) {
					if (left > MARGIN) {
						left = MARGIN;
					}
					if (left < args.viewportRect.width - imageWrap.offsetWidth - MARGIN) {
						left = args.viewportRect.width - imageWrap.offsetWidth - MARGIN;
					}
				}
				else {
					left = args.viewportRect.width / 2 - imageWrap.offsetWidth / 2;
				}

				if (isScrollableVertically()) {
					if (top > MARGIN) {
						top = MARGIN;
					}
					if (top < args.viewportRect.height - imageWrap.offsetHeight - MARGIN) {
						top = args.viewportRect.height - imageWrap.offsetHeight - MARGIN;
					}
				}
				else {
					top = args.viewportRect.height / 2 - imageWrap.offsetHeight / 2;
				}

				if (left != rect.left || top != rect.top) {
					isInTransition = true;
					imageWrap.style.left = left + 'px';
					imageWrap.style.top = top + 'px';
					transitionendp(image, IMAGE_TRANSITION_DURATION_MSECS).then(() => {
						isInTransition = false;
					});
				}
			}
		}

		function handlePointerWheel (e) {
			if (isInTransition) return;

			e.preventDefault();
			e.stopPropagation();

			if (!image) return;

			let top;
			let imageRect = imageWrap.getBoundingClientRect();
			switch (zoomMode) {
			case 'actual-size':
			case 'fit-to-width':
				if (imageWrap.offsetHeight > args.viewportRect.height) {
					let sign;
					if (e.deltaY) {
						sign = e.deltaY > 0 ? -1 : 1;
					}
					else {
						sign = e.shiftKey ? 1 : -1;
					}
					top = imageRect.top +
						  Math.floor(args.viewportRect.height * WHEEL_SCROLL_UNIT_FACTOR) * sign;
				}
				break;
			}

			if (top != undefined) {
				if (top > MARGIN) {
					top = MARGIN;
				}
				if (top < args.viewportRect.height - imageWrap.offsetHeight - MARGIN) {
					top = args.viewportRect.height - imageWrap.offsetHeight - MARGIN;
				}
				isInTransition = true;
				imageWrap.style.top = top + 'px';
				transitionendp(image, IMAGE_TRANSITION_DURATION_MSECS).then(() => {
					isInTransition = false;
				});
			}
		}

		function handleZoomModeClick (e, t) {
			if (isInTransition) return;
			if (!image) return;
			setZoomMode(t.getAttribute('href').replace('#lightbox-', ''));
		}

		function handleRotateModeClick (e, t) {
			if (isInTransition) return;
			if (!image) return;
			rotation = t.getAttribute('href').replace('#lightbox-', '');
			setZoomMode('whole');
		}

		function handleZoomModeKey (e) {
			if (isInTransition) return;
			if (!image) return;
			setZoomMode({
				'O': 'whole',
				'A': 'actual-size',
				'W': 'fit-to-width',
				'H': 'fit-to-height'
			}[e.key]);
		}

		function handleRotateModeKey (e) {
			if (isInTransition) return;
			if (!image) return;
			rotation = {
				'n': 'normal',
				'l': 'left',
				'r': 'right',
				'v': '180'
			}[e.key];
			setZoomMode('whole');
		}

		function handleSearch (e) {
			if (isInTransition) return;
			if (!image) return;
			args.onsearch(image.src);
		}

		function handleCopyClick (e) {
			if (isInTransition) return;
			if (!image) return;
			if (location.protocol != 'https:') return;
			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			canvas.getContext('2d').drawImage(image, 0, 0);
			args.oncopy(canvas);
		}

		function handleStroke (e) {
			if (isInTransition) return;
			if (!image) return;
			const view = window.unsafeWindow || window;
			const ev = new WheelEvent('wheel', {
				bubbles: true, cancelable: true, view: view,
				detail: 0, screenX: 0, screenY: 0, clientX: 0, clientY: 0,
				ctrlKey: e.ctrlKey, altKey: false, shiftKey: e.shiftKey, metaKey: false,
				button: 0, relatedTarget: null
			});
			receiver.dispatchEvent(ev);
		}

		/*
		 * entry functions
		 */

		function init () {
			if (document.body.getAttribute(RUNNING_EXCLUSION_KEY) != null) return;

			// block recursive execution
			document.body.setAttribute(RUNNING_EXCLUSION_KEY, 'loading');

			// initialize variables
			lightboxWrap = $('lightbox-wrap');
			dimmer = $qs('.dimmer', lightboxWrap);
			imageWrap = $qs('.image-wrap', lightboxWrap);
			loaderWrap = $qs('.loader-wrap', lightboxWrap);
			receiver = $qs('.receiver', lightboxWrap);
			rotation = 'normal';

			// initialize zoom mode
			zoomMode = storage.config.lightbox_zoom_mode.value;
			if (zoomMode == 'last') {
				zoomMode = storage.runtime.lightbox.zoomMode;
			}

			// info
			$t('lightbox-ratio', '読み込み中...');
			const link = $('lightbox-link');
			$t(link, anchor.href.match(/\/([^\/]+)$/)[1]);
			link.href = anchor.href;

			// start
			document.body.style.userSelect = 'none';
			lightboxWrap.classList.remove('hide');
			Promise.all([
				getImageFrom(anchor.href).then(loadedImage => {
					loaderWrap.classList.add('hide');
					image = loadedImage;
					if (image) {
						imageWrap.appendChild(image);

						const thumb = $qs('img', anchor);
						if (thumb) {
							const rect1 = thumb.getBoundingClientRect();
							const rect2 = getImageRect(rect1);
							const rect3 = appendPxSuffix(rect2);
							Object.assign(imageWrap.style, rect3);
							image.style.width = rect3.width;
							image.style.height = rect3.height;
						}
						else {
							const rect1 = anchor.getBoundingClientRect();
							const size = Math.max(rect1.width, rect1.height);
							const rect2 = getImageRect({
								left: rect1.left + rect1.width / 2 - size / 2,
								top: rect1.top + rect1.height / 2 - size / 2,
								width: size,
								height: size
							});
							const rect3 = appendPxSuffix(rect2);
							Object.assign(imageWrap.style, rect3);
							image.style.width = rect3.width;
							image.style.height = rect3.height;
						}

						imageWrap.classList.remove('hide');

						return delay(100).then(() => applyGeometory(getImageRect()));
					}
					else {
						loaderWrap.classList.remove('hide');
						$t($qs('p', loaderWrap), '読み込みに失敗しました。');
					}
				}),
				delay(0)
					.then(() => dimmer.classList.add('run'))
					.then(() => transitionendp(dimmer, DIMMER_TRANSITION_DURATION_MSECS))
					.then(() => {
						args.onenter();

						clickDispatcher
							.add('#lightbox-whole', handleZoomModeClick)
							.add('#lightbox-actual-size', handleZoomModeClick)
							.add('#lightbox-fit-to-width', handleZoomModeClick)
							.add('#lightbox-fit-to-height', handleZoomModeClick)
							.add('#lightbox-normal', handleRotateModeClick)
							.add('#lightbox-left', handleRotateModeClick)
							.add('#lightbox-right', handleRotateModeClick)
							.add('#lightbox-180', handleRotateModeClick)
							.add('#lightbox-search', handleSearch)
							.add('#lightbox-copy', handleCopyClick)
							.add('#lightbox-close', leave);

						keyManager
							.addStroke('lightbox', ['O', 'A', 'W', 'H'], handleZoomModeKey)
							.addStroke('lightbox', ['n', 'l', 'r', 'v'], handleRotateModeKey)
							.addStroke('lightbox', '\u001b', leave)
							.addStroke('lightbox', 's', handleSearch)
							.addStroke('lightbox', 'c', handleCopyClick)
							.addStroke('lightbox', [' ', '<S-space>'], handleStroke, true);

						receiver.addEventListener('pointerdown', handlePointerDown);
						receiver.addEventListener('pointermove', handlePointerMove);
						receiver.addEventListener('pointerup', handlePointerUp);
						receiver.addEventListener('wheel', handlePointerWheel);

						// debug handler
						if (false) {
							const handler = e => {
								e.preventDefault();
								handleZoomModeClick(e, e.target);
							};
							$qsa('#lightbox-zoom-modes a').forEach(node => {
								node.addEventListener('click', handler);
							});
						}
						if (false) {
							const handler = e => {
								e.preventDefault();
								handleRotateModeClick(e, e.target);
							};
							$qsa('#lightbox-rotate-modes a').forEach(node => {
								node.addEventListener('click', handler);
							});
						}

						document.body.setAttribute(RUNNING_EXCLUSION_KEY, 'running');
					}),
				delay(1000)
					.then(() => {
						if (!image && loaderWrap.classList.contains('hide')) {
							loaderWrap.classList.remove('hide');
							$t($qs('p', loaderWrap), '読み込み中...');
						}
					})
			]);
		}

		function leave () {
			$qs('.info', lightboxWrap).style.top = '';
			if (image) {
				image.style.opacity = '';
			}
			imageWrap.classList.add('hide');
			loaderWrap.classList.add('hide');
			empty(imageWrap);

			receiver.removeEventListener('pointerdown', handlePointerDown);
			receiver.removeEventListener('pointermove', handlePointerMove);
			receiver.removeEventListener('pointerup', handlePointerUp);
			receiver.removeEventListener('wheel', handlePointerWheel);

			clickDispatcher
				.remove('#lightbox-whole')
				.remove('#lightbox-actual-size')
				.remove('#lightbox-fit-to-width')
				.remove('#lightbox-fit-to-height')
				.remove('#lightbox-normal')
				.remove('#lightbox-left')
				.remove('#lightbox-right')
				.remove('#lightbox-180')
				.remove('#lightbox-search')
				.remove('#lightbox-close');

			keyManager
				.removeStroke('lightbox');

			delay(0)
				.then(() => dimmer.classList.remove('run'))
				.then(() => transitionendp(dimmer, DIMMER_TRANSITION_DURATION_MSECS))
				.then(() => {
					lightboxWrap.classList.add('hide');
					anchor = image = lightboxWrap =
					dimmer = imageWrap = receiver = null;

					args.onleave();

					document.body.removeAttribute(RUNNING_EXCLUSION_KEY);
					document.body.style.userSelect = '';
				});
		}

		init();
	}

	return {start};
}
