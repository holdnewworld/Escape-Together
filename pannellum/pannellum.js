/*
 * Pannellum - An HTML5 based Panorama Viewer
 * Copyright (c) 2011-2016 Matthew Petroff
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

window.pannellum = (function(window, document, undefined) {

	'use strict';

	/**
	 * Creates a new panorama viewer.
	 * @constructor
	 * @param {HTMLElement|string} container - The container (div) element for the
	 *      viewer, or its ID.
	 * @param {Object} initialConfig - Inital configuration for viewer.
	 */
	function Viewer(container, initialConfig) {

// Declare variables
		var config,
			renderer,
			preview,
			isUserInteracting = false,
			latestInteraction = Date.now(),
			onPointerDownPointerX = 0,
			onPointerDownPointerY = 0,
			onPointerDownPointerDist = -1,
			onPointerDownYaw = 0,
			onPointerDownPitch = 0,
			keysDown = new Array(10),
			fullscreenActive = false,
			loaded = false,
			error = false,
			isTimedOut = false,
			listenersAdded = false,
			panoImage,
			prevTime,
			yawSpeed = 0,
			pitchSpeed = 0,
			zoomSpeed = 0,
			animating = false,
			autoRotateStart,
			autoRotateSpeed = 0,
			externalEventListeners = {},
			specifiedPhotoSphereExcludes = [],
			update = false, // Should we update when still to render dynamic content
			hotspotsCreated = false;

		var defaultConfig = {
			hfov: 100,
			minHfov: 50,
			maxHfov: 120,
			pitch: 0,
			minPitch: undefined,
			maxPitch: undefined,
			yaw: 0,
			minYaw: -180,
			maxYaw: 180,
			roll: 0,
			haov: 360,
			vaov: 180,
			vOffset: 0,
			autoRotate: false,
			autoRotateInactivityDelay: -1,
			type: 'equirectangular',
			northOffset: 0,
			showFullscreenCtrl: true,
			dynamic: false,
			keyboardZoom: true,
			mouseZoom: true
		};

// Initialize container
		container = typeof container === 'string' ? document.getElementById(container) : container;
		container.classList.add('pnlm-container');
		container.tabIndex = 0;

// Create container for renderer
		var renderContainer = document.createElement('div');
		renderContainer.className = 'pnlm-render-container';
		container.appendChild(renderContainer);
		var dragFix = document.createElement('div');
		dragFix.className = 'pnlm-dragfix';
		container.appendChild(dragFix);

// Display about information on right click
		var aboutMsg = document.createElement('span');
		aboutMsg.className = 'pnlm-about-msg';
		aboutMsg.innerHTML = '<a href="https://pannellum.org/" target="_blank">Pannellum</a>';
		container.appendChild(aboutMsg);
		dragFix.addEventListener('contextmenu', aboutMessage);

// Create info display
		var infoDisplay = {};

// Panorama info
		infoDisplay.container = document.createElement('div');
		infoDisplay.container.className = 'pnlm-panorama-info';
		infoDisplay.title = document.createElement('div');
		infoDisplay.title.className = 'pnlm-title-box';
		infoDisplay.container.appendChild(infoDisplay.title);
		infoDisplay.author = document.createElement('div');
		infoDisplay.author.className = 'pnlm-author-box';
		infoDisplay.container.appendChild(infoDisplay.author);
		container.appendChild(infoDisplay.container);

// Load box
		infoDisplay.load = {};
		infoDisplay.load.box = document.createElement('div');
		infoDisplay.load.box.className = 'pnlm-load-box';
		infoDisplay.load.box.innerHTML = '<p>Loading...</p>';
		infoDisplay.load.lbox = document.createElement('div');
		infoDisplay.load.lbox.className = 'pnlm-lbox';
		infoDisplay.load.lbox.innerHTML = '<div class="pnlm-loading"></div>';
		infoDisplay.load.box.appendChild(infoDisplay.load.lbox);
		infoDisplay.load.lbar = document.createElement('div');
		infoDisplay.load.lbar.className = 'pnlm-lbar';
		infoDisplay.load.lbarFill = document.createElement('div');
		infoDisplay.load.lbarFill.className = 'pnlm-lbar-fill';
		infoDisplay.load.lbar.appendChild(infoDisplay.load.lbarFill);
		infoDisplay.load.box.appendChild(infoDisplay.load.lbar);
		infoDisplay.load.msg = document.createElement('p');
		infoDisplay.load.msg.className = 'pnlm-lmsg';
		infoDisplay.load.box.appendChild(infoDisplay.load.msg);
		container.appendChild(infoDisplay.load.box);

// Error message
		infoDisplay.errorMsg = document.createElement('div');
		infoDisplay.errorMsg.className = 'pnlm-error-msg pnlm-info-box';
		container.appendChild(infoDisplay.errorMsg);

// Create controls
		var controls = {};
		controls.container = document.createElement('div');
		controls.container.className = 'pnlm-controls-container';
		container.appendChild(controls.container);

// Load button
		controls.load = document.createElement('div');
		controls.load.className = 'pnlm-load-button';
		controls.load.innerHTML = '<p>Click to<br>Load<br>Panorama<p>';
		controls.load.addEventListener('click', load);
		container.appendChild(controls.load);

// Zoom controls
		controls.zoom = document.createElement('div');
		controls.zoom.className = 'pnlm-zoom-controls pnlm-controls';
		controls.zoomIn = document.createElement('div');
		controls.zoomIn.className = 'pnlm-zoom-in pnlm-sprite pnlm-control';
		controls.zoomIn.addEventListener('click', zoomIn);
		controls.zoom.appendChild(controls.zoomIn);
		controls.zoomOut = document.createElement('div');
		controls.zoomOut.className = 'pnlm-zoom-out pnlm-sprite pnlm-control';
		controls.zoomOut.addEventListener('click', zoomOut);
		controls.zoom.appendChild(controls.zoomOut);
		controls.container.appendChild(controls.zoom);

// Fullscreen toggle
		controls.fullscreen = document.createElement('div');
		controls.fullscreen.addEventListener('click', toggleFullscreen);
		controls.fullscreen.className = 'pnlm-fullscreen-toggle-button pnlm-sprite pnlm-fullscreen-toggle-button-inactive pnlm-controls pnlm-control';
		if (document.fullscreenEnabled || document.mozFullScreenEnabled || document.webkitFullscreenEnabled)
			controls.container.appendChild(controls.fullscreen);

		/*removed be Neta and Robert because it's buggy
		 // Device orientation toggle
		 controls.orientation = document.createElement('div');
		 controls.orientation.addEventListener('click', function(e) {
		 window.addEventListener('deviceorientation', orientationListener);
		 });
		 controls.orientation.className = 'pnlm-orientation-button pnlm-sprite pnlm-controls pnlm-control';
		 if (window.DeviceOrientationEvent) {
		 window.addEventListener('deviceorientation', function(e) {
		 window.removeEventListener('deviceorientation', this);
		 if (e && e.alpha !== null && e.beta !== null && e.gamma !== null)
		 controls.container.appendChild(controls.orientation);
		 });
		 }*/

// Compass
		var compass = document.createElement('div');
		compass.className = 'pnlm-compass pnlm-controls pnlm-control';
		container.appendChild(compass);

// Load and process configuration
		if (initialConfig.firstScene) {
			// Activate first scene if specified in URL
			mergeConfig(initialConfig.firstScene);
		} else if (initialConfig.default && initialConfig.default.firstScene) {
			// Activate first scene if specified in file
			mergeConfig(initialConfig.default.firstScene);
		} else {
			mergeConfig(null);
		}
		processOptions();

		/**
		 * Initializes viewer.
		 * @private
		 */
		function init() {
			// Display an error for IE 9 as it doesn't work but also doesn't otherwise
			// show an error (older versions don't work at all)
			// Based on: http://stackoverflow.com/a/10965203
			var div = document.createElement("div");
			div.innerHTML = "<!--[if lte IE 9]><i></i><![endif]-->";
			if (div.getElementsByTagName("i").length == 1) {
				anError();
				return;
			}

			var i, p;

			if (config.type == 'cubemap') {
				panoImage = [];
				for (i = 0; i < 6; i++) {
					panoImage.push(new Image());
					panoImage[i].crossOrigin = 'anonymous';
				}
				infoDisplay.load.lbox.style.display = 'block';
				infoDisplay.load.lbar.style.display = 'none';
			} else if (config.type == 'multires') {
				var c = JSON.parse(JSON.stringify(config.multiRes));    // Deep copy
				// Avoid "undefined" in path, check (optional) multiRes.basePath, too
				// Use only multiRes.basePath if it's an absolute URL
				if (config.basePath && config.multiRes.basePath &&
					!(/^(?:[a-z]+:)?\/\//i.test(config.multiRes.basePath))) {
					c.basePath = config.basePath + config.multiRes.basePath;
				} else if (config.multiRes.basePath) {
					c.basePath = config.multiRes.basePath;
				} else if(config.basePath) {
					c.basePath = config.basePath;
				}
				panoImage = c;
			} else {
				if (config.dynamic === true) {
					panoImage = config.panorama;
				} else {
					if (config.panorama === undefined) {
						anError('No panorama image was specified.');
						return;
					}
					panoImage = new Image();
				}
			}

			// Configure image loading
			if (config.type == 'cubemap') {
				// Quick loading counter for synchronous loading
				var itemsToLoad = 6;

				var onLoad = function() {
					itemsToLoad--;
					if (itemsToLoad === 0) {
						onImageLoad();
					}
				};

				var onError = function(e) {
					var a = document.createElement('a');
					a.href = e.target.src;
					a.innerHTML = a.href;
					anError('The file ' + a.outerHTML + ' could not be accessed.');
				};

				for (i = 0; i < panoImage.length; i++) {
					panoImage[i].onload = onLoad;
					panoImage[i].onerror = onError;
					p = config.cubeMap[i];
					if (config.basePath && !absoluteURL(p)) {
						p = config.basePath + p;
					}
					panoImage[i].src = encodeURI(p);
				}
			} else if (config.type == 'multires') {
				onImageLoad();
			} else {
				p = '';
				if (config.basePath) {
					p = config.basePath;
				}

				if (config.dynamic !== true) {
					// Still image
					p = absoluteURL(config.panorama) ? config.panorama : p + config.panorama;

					panoImage.onload = function() {
						window.URL.revokeObjectURL(this.src);  // Clean up
						onImageLoad();
					};

					var xhr = new XMLHttpRequest();
					xhr.onloadend = function() {
						if (xhr.status != 200) {
							// Display error if image can't be loaded
							var a = document.createElement('a');
							a.href = encodeURI(p);
							a.innerHTML = a.href;
							anError('The file ' + a.outerHTML + ' could not be accessed.');
						}
						var img = this.response;
						parseGPanoXMP(img);
						infoDisplay.load.msg.innerHTML = '';
					};
					xhr.onprogress = function(e) {
						if (e.lengthComputable) {
							// Display progress
							var percent = e.loaded / e.total * 100;
							infoDisplay.load.lbarFill.style.width = percent + '%';
							var unit, numerator, denominator;
							if (e.total > 1e6) {
								unit = 'MB';
								numerator = (e.loaded / 1e6).toFixed(2);
								denominator = (e.total / 1e6).toFixed(2);
							} else if (e.total > 1e3) {
								unit = 'kB';
								numerator = (e.loaded / 1e3).toFixed(1);
								denominator = (e.total / 1e3).toFixed(1);
							} else {
								unit = 'B';
								numerator = e.loaded;
								denominator = e.total;
							}
							infoDisplay.load.msg.innerHTML = numerator + ' / ' + denominator + ' ' + unit;
						} else {
							// Display loading spinner
							infoDisplay.load.lbox.style.display = 'block';
							infoDisplay.load.lbar.style.display = 'none';
						}
					};
					try {
						xhr.open('GET', p, true);
					} catch (e) {
						// Malformed URL
						anError('There is something wrong with the panorama URL.');
					}
					xhr.responseType = 'blob';
					xhr.setRequestHeader('Accept', 'image/*,*/*;q=0.9');
					xhr.send();
				}
			}

			container.classList.add('pnlm-grab');
			container.classList.remove('pnlm-grabbing');
		}

		/**
		 * Test if URL is absolute or relative.
		 * @private
		 * @param {string} url - URL to test
		 * @returns {boolean} True if absolute, else false
		 */
		function absoluteURL(url) {
			// From http://stackoverflow.com/a/19709846
			return new RegExp('^(?:[a-z]+:)?//', 'i').test(url) | url[0] == '/';
		};

		/**
		 * Create renderer and initialize event listeners once image is loaded.
		 * @private
		 */
		function onImageLoad() {
			if (!renderer)
				renderer = new libpannellum.renderer(renderContainer);

			// Only add event listeners once
			if (!listenersAdded) {
				listenersAdded = true;
				container.addEventListener('mousedown', onDocumentMouseDown, false);
				document.addEventListener('mousemove', onDocumentMouseMove, false);
				document.addEventListener('mouseup', onDocumentMouseUp, false);
				if (config.mouseZoom) {
					container.addEventListener('mousewheel', onDocumentMouseWheel, false);
					container.addEventListener('DOMMouseScroll', onDocumentMouseWheel, false);
				}
				container.addEventListener('mozfullscreenchange', onFullScreenChange, false);
				container.addEventListener('webkitfullscreenchange', onFullScreenChange, false);
				container.addEventListener('msfullscreenchange', onFullScreenChange, false);
				container.addEventListener('fullscreenchange', onFullScreenChange, false);
				window.addEventListener('resize', onDocumentResize, false);
				window.addEventListener('orientationchange', onDocumentResize, false);
				container.addEventListener('keydown', onDocumentKeyPress, false);
				container.addEventListener('keyup', onDocumentKeyUp, false);
				container.addEventListener('blur', clearKeys, false);
				document.addEventListener('mouseleave', onDocumentMouseUp, false);
				container.addEventListener('touchstart', onDocumentTouchStart, false);
				container.addEventListener('touchmove', onDocumentTouchMove, false);
				container.addEventListener('touchend', onDocumentTouchEnd, false);
				container.addEventListener('pointerdown', onDocumentPointerDown, false);
				container.addEventListener('pointermove', onDocumentPointerMove, false);
				container.addEventListener('pointerup', onDocumentPointerUp, false);
				container.addEventListener('pointerleave', onDocumentPointerUp, false);

				// Deal with MS pointer events
				if (window.navigator.pointerEnabled)
					container.style.touchAction = 'none';
			}

			renderInit();
			setTimeout(function(){isTimedOut = true;}, 500);
		}

		/**
		 * Parses Google Photo Sphere XMP Metadata.
		 * https://developers.google.com/photo-sphere/metadata/
		 * @private
		 * @param {Image} image - Image to read XMP metadata from.
		 */
		function parseGPanoXMP(image) {
			var reader = new FileReader();
			reader.addEventListener('loadend', function() {
				var img = reader.result;

				// This awful browser specific test exists because iOS 8 does not work
				// with non-progressive encoded JPEGs.
				if (navigator.userAgent.toLowerCase().match(/(iphone|ipod|ipad).* os 8_/)) {
					var flagIndex = img.indexOf('\xff\xc2');
					if (flagIndex < 0 || flagIndex > 65536) {
						anError("Due to iOS 8's broken WebGL implementation, only " +
							"progressive encoded JPEGs work for your device (this " +
							"panorama uses standard encoding).");
					}
				}

				var start = img.indexOf('<x:xmpmeta');
				if (start > -1 && config.ignoreGPanoXMP !== true) {
					var xmpData = img.substring(start, img.indexOf('</x:xmpmeta>') + 12);

					// Extract the requested tag from the XMP data
					var getTag = function(tag) {
						var result;
						if (xmpData.indexOf(tag + '="') >= 0) {
							result = xmpData.substring(xmpData.indexOf(tag + '="') + tag.length + 2);
							result = result.substring(0, result.indexOf('"'));
						} else if (xmpData.indexOf(tag + '>') >= 0) {
							result = xmpData.substring(xmpData.indexOf(tag + '>') + tag.length + 1);
							result = result.substring(0, result.indexOf('<'));
						}
						if (result !== undefined) {
							return Number(result);
						}
						return null;
					};

					// Relevant XMP data
					var xmp = {
						fullWidth: getTag('GPano:FullPanoWidthPixels'),
						croppedWidth: getTag('GPano:CroppedAreaImageWidthPixels'),
						fullHeight: getTag('GPano:FullPanoHeightPixels'),
						croppedHeight: getTag('GPano:CroppedAreaImageHeightPixels'),
						topPixels: getTag('GPano:CroppedAreaTopPixels'),
						heading: getTag('GPano:PoseHeadingDegrees'),
						horizonPitch: getTag('GPano:PosePitchDegrees'),
						horizonRoll: getTag('GPano:PoseRollDegrees')
					};

					if (xmp.fullWidth !== null && xmp.croppedWidth !== null &&
						xmp.fullHeight !== null && xmp.croppedHeight !== null &&
						xmp.topPixels !== null) {

						// Set up viewer using GPano XMP data
						if (specifiedPhotoSphereExcludes.indexOf('haov') < 0)
							config.haov = xmp.croppedWidth / xmp.fullWidth * 360;
						if (specifiedPhotoSphereExcludes.indexOf('vaov') < 0)
							config.vaov = xmp.croppedHeight / xmp.fullHeight * 180;
						if (specifiedPhotoSphereExcludes.indexOf('vOffset') < 0)
							config.vOffset = ((xmp.topPixels + xmp.croppedHeight / 2) / xmp.fullHeight - 0.5) * -180;
						if (xmp.heading !== null && specifiedPhotoSphereExcludes.indexOf('northOffset') < 0) {
							// TODO: make sure this works correctly for partial panoramas
							config.northOffset = xmp.heading;
							if (config.compass !== false) {
								config.compass = true;
							}
						}
						if (xmp.horizonPitch !== null && xmp.horizonRoll !== null) {
							if (specifiedPhotoSphereExcludes.indexOf('horizonPitch') < 0)
								config.horizonPitch = xmp.horizonPitch;
							if (specifiedPhotoSphereExcludes.indexOf('horizonRoll') < 0)
								config.horizonRoll = xmp.horizonRoll;
						}

						// TODO: add support for initial view settings
					}
				}

				// Load panorama
				panoImage.src = window.URL.createObjectURL(image);
			});
			if (reader.readAsBinaryString !== undefined)
				reader.readAsBinaryString(image);
			else
				reader.readAsText(image);
		}

		/**
		 * Displays an error message.
		 * @private
		 * @param {string} errorMsg - Error message to display. If not specified, a
		 *      generic WebGL error is displayed.
		 */
		function anError(errorMsg) {
			if (errorMsg === undefined)
				errorMsg = 'Your browser does not have the necessary WebGL support to display this panorama.';
			infoDisplay.errorMsg.innerHTML = '<p>' + errorMsg + '</p>';
			controls.load.style.display = 'none';
			infoDisplay.load.box.style.display = 'none';
			infoDisplay.errorMsg.style.display = 'table';
			error = true;
			renderContainer.style.display = 'none';
			fireEvent('error', errorMsg);
		}

		/**
		 * Hides error message display.
		 * @private
		 */
		function clearError() {
			if (error) {
				infoDisplay.load.box.style.display = 'none';
				infoDisplay.errorMsg.style.display = 'none';
				error = false;
				fireEvent('errorcleared');
			}
		}

		/**
		 * Displays about message.
		 * @private
		 * @param {MouseEvent} event - Right click location
		 */
		function aboutMessage(event) {
			var pos = mousePosition(event);
			aboutMsg.style.left = pos.x + 'px';
			aboutMsg.style.top = pos.y + 'px';
			clearTimeout(aboutMessage.t1);
			clearTimeout(aboutMessage.t2);
			aboutMsg.style.display = 'block';
			aboutMsg.style.opacity = 1;
			aboutMessage.t1 = setTimeout(function() {aboutMsg.style.opacity = 0;}, 2000);
			aboutMessage.t2 = setTimeout(function() {aboutMsg.style.display = 'none';}, 2500);
			event.preventDefault();
		}

		/**
		 * Calculate mouse position relative to top left of viewer container.
		 * @private
		 * @param {MouseEvent} event - Mouse event to use in calculation
		 * @returns {Object} Calculated X and Y coordinates
		 */
		function mousePosition(event) {
			var bounds = container.getBoundingClientRect();
			var pos = {};
			pos.x = event.clientX - bounds.left;
			pos.y = event.clientY - bounds.top;
			return pos;
		}

		/**
		 * Event handler for mouse clicks. Initializes panning. Prints center and click
		 * location coordinates when hot spot debugging is enabled.
		 * @private
		 * @param {MouseEvent} event - Document mouse down event.
		 */
		function onDocumentMouseDown(event) {
			// Override default action
			event.preventDefault();
			// But not all of it
			container.focus();

			// Only do something if the panorama is loaded
			if (!loaded) {
				return;
			}

			// Calculate mouse position relative to top left of viewer container
			var pos = mousePosition(event);

			// Log pitch / yaw of mouse click when debugging / placing hot spots
			if (config.hotSpotDebug) {
				var coords = mouseEventToCoords(event);
				console.log('Pitch: ' + coords[0] + ', Yaw: ' + coords[1] + ', Center Pitch: ' +
					config.pitch + ', Center Yaw: ' + config.yaw + ', HFOV: ' + config.hfov);
			}

			// Turn off auto-rotation if enabled
			autoRotateSpeed = config.autoRotate ? config.autoRotate : autoRotateSpeed;
			config.autoRotate = false;

			window.removeEventListener('deviceorientation', orientationListener);
			config.roll = 0;

			zoomSpeed = 0;

			isUserInteracting = true;
			latestInteraction = Date.now();

			onPointerDownPointerX = pos.x;
			onPointerDownPointerY = pos.y;

			onPointerDownYaw = config.yaw;
			onPointerDownPitch = config.pitch;

			container.classList.add('pnlm-grabbing');
			container.classList.remove('pnlm-grab');

			animateInit();
		}

		/**
		 * Calculate panorama pitch and yaw from location of mouse event.
		 * @private
		 * @param {MouseEvent} event - Document mouse down event.
		 * @returns {number[]} [pitch, yaw]
		 */
		function mouseEventToCoords(event) {
			var pos = mousePosition(event);
			var canvas = renderer.getCanvas();
			var x = pos.x / canvas.width * 2 - 1;
			var y = (1 - pos.y / canvas.height * 2) * canvas.height / canvas.width;
			var focal = 1 / Math.tan(config.hfov * Math.PI / 360);
			var s = Math.sin(config.pitch * Math.PI / 180);
			var c = Math.cos(config.pitch * Math.PI / 180);
			var a = focal * c - y * s;
			var root = Math.sqrt(x*x + a*a);
			var pitch = Math.atan((y * c + focal * s) / root) * 180 / Math.PI;
			var yaw = Math.atan2(x / root, a / root) * 180 / Math.PI + config.yaw;
			return [pitch, yaw];
		}

		/**
		 * Event handler for mouse moves. Pans center of view.
		 * @private
		 * @param {MouseEvent} event - Document mouse move event.
		 */
		function onDocumentMouseMove(event) {
			if (isUserInteracting && loaded) {
				latestInteraction = Date.now();
				var canvas = renderer.getCanvas();
				var pos = mousePosition(event);
				//TODO: This still isn't quite right
				var yaw = ((Math.atan(onPointerDownPointerX / canvas.width * 2 - 1) - Math.atan(pos.x / canvas.width * 2 - 1)) * 180 / Math.PI * config.hfov / 90) + onPointerDownYaw;
				yawSpeed = (yaw - config.yaw) % 360 * 0.2;
				config.yaw = yaw;

				var vfov = 2 * Math.atan(Math.tan(config.hfov/360*Math.PI) * canvas.height / canvas.width) * 180 / Math.PI;

				var pitch = ((Math.atan(pos.y / canvas.height * 2 - 1) - Math.atan(onPointerDownPointerY / canvas.height * 2 - 1)) * 180 / Math.PI * vfov / 90) + onPointerDownPitch;
				pitchSpeed = (pitch - config.pitch) * 0.2;
				config.pitch = pitch;
			}
		}

		/**
		 * Event handler for mouse up events. Stops panning.
		 * @private
		 */
		function onDocumentMouseUp() {
			if (!isUserInteracting) {
				return;
			}
			isUserInteracting = false;
			if (Date.now() - latestInteraction > 15) {
				// Prevents jump when user rapidly moves mouse, stops, and then
				// releases the mouse button
				pitchSpeed = yawSpeed = 0;
			}
			container.classList.add('pnlm-grab');
			container.classList.remove('pnlm-grabbing');
			latestInteraction = Date.now();
		}

		/**
		 * Event handler for touches. Initializes panning if one touch or zooming if
		 * two touches.
		 * @private
		 * @param {TouchEvent} event - Document touch start event.
		 */
		function onDocumentTouchStart(event) {
			// Only do something if the panorama is loaded
			if (!loaded) {
				return;
			}

			// Turn off auto-rotation if enabled
			autoRotateSpeed = config.autoRotate ? config.autoRotate : autoRotateSpeed;
			config.autoRotate = false;

			window.removeEventListener('deviceorientation', orientationListener);
			config.roll = 0;

			zoomSpeed = 0;

			// Calculate touch position relative to top left of viewer container
			var pos0 = mousePosition(event.targetTouches[0]);

			onPointerDownPointerX = pos0.x;
			onPointerDownPointerY = pos0.y;

			if (event.targetTouches.length == 2) {
				// Down pointer is the center of the two fingers
				var pos1 = mousePosition(event.targetTouches[1]);
				onPointerDownPointerX += (pos1.x - pos0.x) * 0.5;
				onPointerDownPointerY += (pos1.y - pos0.y) * 0.5;
				onPointerDownPointerDist = Math.sqrt((pos0.x - pos1.x) * (pos0.x - pos1.x) +
					(pos0.y - pos1.y) * (pos0.y - pos1.y));
			}
			isUserInteracting = true;
			latestInteraction = Date.now();

			onPointerDownYaw = config.yaw;
			onPointerDownPitch = config.pitch;

			animateInit();
		}

		/**
		 * Event handler for touch movements. Pans center of view if one touch or
		 * adjusts zoom if two touches.
		 * @private
		 * @param {TouchEvent} event - Document touch move event.
		 */
		function onDocumentTouchMove(event) {
			// Override default action
			event.preventDefault();
			if (loaded) {
				latestInteraction = Date.now();
			}
			if (isUserInteracting && loaded) {
				var pos0 = mousePosition(event.targetTouches[0]);
				var clientX = pos0.x;
				var clientY = pos0.y;

				if (event.targetTouches.length == 2 && onPointerDownPointerDist != -1) {
					var pos1 = mousePosition(event.targetTouches[1]);
					clientX += (pos1.x - pos0.x) * 0.5;
					clientY += (pos1.y - pos0.y) * 0.5;
					var clientDist = Math.sqrt((pos0.x - pos1.x) * (pos0.x - pos1.x) +
						(pos0.y - pos1.y) * (pos0.y - pos1.y));
					setHfov(config.hfov + (onPointerDownPointerDist - clientDist) * 0.1);
					onPointerDownPointerDist = clientDist;
				}

				// The smaller the config.hfov value (the more zoomed-in the user is), the faster
				// yaw/pitch are perceived to change on one-finger touchmove (panning) events and vice versa.
				// To improve usability at both small and large zoom levels (config.hfov values)
				// we introduce a dynamic pan speed coefficient.
				//
				// Currently this seems to *roughly* keep initial drag/pan start position close to
				// the user's finger while panning regardless of zoom level / config.hfov value.
				var touchmovePanSpeedCoeff = config.hfov / 360;

				var yaw = (onPointerDownPointerX - clientX) * touchmovePanSpeedCoeff + onPointerDownYaw;
				yawSpeed = (yaw - config.yaw) % 360 * 0.2;
				config.yaw = yaw;

				var pitch = (clientY - onPointerDownPointerY) * touchmovePanSpeedCoeff + onPointerDownPitch;
				pitchSpeed = (pitch - config.pitch) * 0.2;
				config.pitch = pitch;
			}
		}

		/**
		 * Event handler for end of touches. Stops panning and/or zooming.
		 * @private
		 */
		function onDocumentTouchEnd() {
			isUserInteracting = false;
			if (Date.now() - latestInteraction > 150) {
				pitchSpeed = yawSpeed = 0;
			}
			onPointerDownPointerDist = -1;
			latestInteraction = Date.now();
		}

		var pointerIDs = [],
			pointerCoordinates = [];
		/**
		 * Event handler for touch starts in IE / Edge.
		 * @private
		 * @param {PointerEvent} event - Document pointer down event.
		 */
		function onDocumentPointerDown(event) {
			if (event.pointerType == 'touch') {
				pointerIDs.push(event.pointerId);
				pointerCoordinates.push({clientX: event.clientX, clientY: event.clientY});
				event.targetTouches = pointerCoordinates;
				onDocumentTouchStart(event);
				event.preventDefault();
			}
		}

		/**
		 * Event handler for touch moves in IE / Edge.
		 * @private
		 * @param {PointerEvent} event - Document pointer move event.
		 */
		function onDocumentPointerMove(event) {
			if (event.pointerType == 'touch') {
				for (var i = 0; i < pointerIDs.length; i++) {
					if (event.pointerId == pointerIDs[i]) {
						pointerCoordinates[i] = {clientX: event.clientX, clientY: event.clientY};
						event.targetTouches = pointerCoordinates;
						onDocumentTouchMove(event);
						//event.preventDefault();
						return;
					}
				}
			}
		}

		/**
		 * Event handler for touch ends in IE / Edge.
		 * @private
		 * @param {PointerEvent} event - Document pointer up event.
		 */
		function onDocumentPointerUp(event) {
			if (event.pointerType == 'touch') {
				var defined = false;
				for (var i = 0; i < pointerIDs.length; i++) {
					if (event.pointerId == pointerIDs[i])
						pointerIDs[i] = undefined;
					if (pointerIDs[i])
						defined = true;
				}
				if (!defined) {
					pointerIDs = [];
					pointerCoordinates = [];
					onDocumentTouchEnd();
				}
				event.preventDefault();
			}
		}

		/**
		 * Event handler for mouse wheel. Changes zoom.
		 * @private
		 * @param {WheelEvent} event - Document mouse wheel event.
		 */
		function onDocumentMouseWheel(event) {
			event.preventDefault();

			// Only do something if the panorama is loaded
			if (!loaded) {
				return;
			}

			// Turn off auto-rotation if enabled
			autoRotateSpeed = config.autoRotate ? config.autoRotate : autoRotateSpeed;
			config.autoRotate = false;
			latestInteraction = Date.now();

			if (event.wheelDeltaY) {
				// WebKit
				setHfov(config.hfov - event.wheelDeltaY * 0.05);
				zoomSpeed = event.wheelDelta < 0 ? 1 : -1;
			} else if (event.wheelDelta) {
				// Opera / Explorer 9
				setHfov(config.hfov - event.wheelDelta * 0.05);
				zoomSpeed = event.wheelDelta < 0 ? 1 : -1;
			} else if (event.detail) {
				// Firefox
				setHfov(config.hfov + event.detail * 1.5);
				zoomSpeed = event.detail > 0 ? 1 : -1;
			}

			animateInit();
		}

		/**
		 * Event handler for key presses. Updates list of currently pressed keys.
		 * @private
		 * @param {KeyboardEvent} event - Document key press event.
		 */
		function onDocumentKeyPress(event) {
			// Override default action
			event.preventDefault();

			// Turn off auto-rotation if enabled
			autoRotateSpeed = config.autoRotate ? config.autoRotate : autoRotateSpeed;
			config.autoRotate = false;
			latestInteraction = Date.now();

			window.removeEventListener('deviceorientation', orientationListener);
			config.roll = 0;

			// Record key pressed
			var keynumber = event.keycode;
			if (event.which) {
				keynumber = event.which;
			}

			// If escape key is pressed
			if (keynumber == 27) {
				// If in fullscreen mode
				if (fullscreenActive) {
					toggleFullscreen();
				}
			} else {
				// Change key
				changeKey(keynumber, true);
			}
		}

		/**
		 * Clears list of currently pressed keys.
		 * @private
		 */
		function clearKeys() {
			for (var i = 0; i < 10; i++) {
				keysDown[i] = false;
			}
		}

		/**
		 * Event handler for key releases. Updates list of currently pressed keys.
		 * @private
		 * @param {KeyboardEvent} event - Document key up event.
		 */
		function onDocumentKeyUp(event) {
			// Override default action
			event.preventDefault();

			// Record key released
			var keynumber = event.keycode;
			if (event.which) {
				keynumber = event.which;
			}

			// Change key
			changeKey(keynumber, false);
		}

		/**
		 * Updates list of currently pressed keys.
		 * @private
		 * @param {number} keynumber - Key number.
		 * @param {boolean} value - Whether or not key is pressed.
		 */
		function changeKey(keynumber, value) {
			var keyChanged = false;
			switch(keynumber) {
				// If minus key is released
				case 109: case 189: case 17:
				if (keysDown[0] != value) { keyChanged = true; }
				keysDown[0] = value; break;

				// If plus key is released
				case 107: case 187: case 16:
				if (keysDown[1] != value) { keyChanged = true; }
				keysDown[1] = value; break;

				// If up arrow is released
				case 38:
					if (keysDown[2] != value) { keyChanged = true; }
					keysDown[2] = value; break;

				// If "w" is released
				case 87:
					if (keysDown[6] != value) { keyChanged = true; }
					keysDown[6] = value; break;

				// If down arrow is released
				case 40:
					if (keysDown[3] != value) { keyChanged = true; }
					keysDown[3] = value; break;

				// If "s" is released
				case 83:
					if (keysDown[7] != value) { keyChanged = true; }
					keysDown[7] = value; break;

				// If left arrow is released
				case 37:
					if (keysDown[4] != value) { keyChanged = true; }
					keysDown[4] = value; break;

				// If "a" is released
				case 65:
					if (keysDown[8] != value) { keyChanged = true; }
					keysDown[8] = value; break;

				// If right arrow is released
				case 39:
					if (keysDown[5] != value) { keyChanged = true; }
					keysDown[5] = value; break;

				// If "d" is released
				case 68:
					if (keysDown[9] != value) { keyChanged = true; }
					keysDown[9] = value;
			}

			if (keyChanged && value) {
				if (typeof performance !== 'undefined' && performance.now()) {
					prevTime = performance.now();
				} else {
					prevTime = Date.now();
				}
				animateInit();
			}
		}

		/**
		 * Pans and/or zooms panorama based on currently pressed keys. Also handles
		 * panorama "inertia" and auto rotation.
		 * @private
		 */
		function keyRepeat() {
			// Only do something if the panorama is loaded
			if (!loaded) {
				return;
			}

			var isKeyDown = false;

			var prevPitch = config.pitch;
			var prevYaw = config.yaw;
			var prevZoom = config.hfov;

			var newTime;
			if (typeof performance !== 'undefined' && performance.now()) {
				newTime = performance.now();
			} else {
				newTime = Date.now();
			}
			if (prevTime === undefined) {
				prevTime = newTime;
			}
			var diff = (newTime - prevTime) * config.hfov / 1700;
			diff = Math.min(diff, 1.0);

			// If minus key is down
			if (keysDown[0] && config.keyboardZoom === true) {
				setHfov(config.hfov + (zoomSpeed * 0.8 + 0.5) * diff);
				isKeyDown = true;
			}

			// If plus key is down
			if (keysDown[1] && config.keyboardZoom === true) {
				setHfov(config.hfov + (zoomSpeed * 0.8 - 0.2) * diff);
				isKeyDown = true;
			}

			// If up arrow or "w" is down
			if (keysDown[2] || keysDown[6]) {
				// Pan up
				config.pitch += (pitchSpeed * 0.8 + 0.2) * diff;
				isKeyDown = true;
			}

			// If down arrow or "s" is down
			if (keysDown[3] || keysDown[7]) {
				// Pan down
				config.pitch += (pitchSpeed * 0.8 - 0.2) * diff;
				isKeyDown = true;
			}

			// If left arrow or "a" is down
			if (keysDown[4] || keysDown[8]) {
				// Pan left
				config.yaw += (yawSpeed * 0.8 - 0.2) * diff;
				isKeyDown = true;
			}

			// If right arrow or "d" is down
			if (keysDown[5] || keysDown[9]) {
				// Pan right
				config.yaw += (yawSpeed * 0.8 + 0.2) * diff;
				isKeyDown = true;
			}

			if (isKeyDown)
				latestInteraction = Date.now();

			// If auto-rotate
			var inactivityInterval = Date.now() - latestInteraction;
			if (config.autoRotate &&
				config.autoRotateStopDelay !== false) {
				// Pan
				if (newTime - prevTime > 0.001) {
					config.yaw -= config.autoRotate * (newTime - prevTime) / 1000;
				}

				// Deal with stopping auto rotation after a set delay
				if (config.autoRotateStopDelay) {
					config.autoRotateStopDelay -= newTime - prevTime;
					if (config.autoRotateStopDelay <= 0) {
						config.autoRotateStopDelay = false;
					}
				}
			}

			// "Inertia"
			if (diff > 0) {
				// "Friction"
				var friction = 0.85;

				// Yaw
				if (!keysDown[4] && !keysDown[5] && !keysDown[8] && !keysDown[9]) {
					config.yaw += yawSpeed * diff * friction;
				}
				// Pitch
				if (!keysDown[2] && !keysDown[3] && !keysDown[6] && !keysDown[7]) {
					config.pitch += pitchSpeed * diff * friction;
				}
				// Zoom
				if (!keysDown[0] && !keysDown[1]) {
					setHfov(config.hfov + zoomSpeed * diff * friction);
				}
			}

			prevTime = newTime;
			if (diff > 0) {
				yawSpeed = yawSpeed * 0.8 + (config.yaw - prevYaw) / diff * 0.2;
				pitchSpeed = pitchSpeed * 0.8 + (config.pitch - prevPitch) / diff * 0.2;
				zoomSpeed = zoomSpeed * 0.8 + (config.hfov - prevZoom) / diff * 0.2;

				// Limit speed
				var maxSpeed = 5;
				yawSpeed = Math.min(maxSpeed, Math.max(yawSpeed, -maxSpeed));
				pitchSpeed = Math.min(maxSpeed, Math.max(pitchSpeed, -maxSpeed));
				zoomSpeed = Math.min(maxSpeed, Math.max(zoomSpeed, -maxSpeed));
			}

			// Stop movement if opposite controls are pressed
			if (keysDown[0] && keysDown[0]) {
				zoomSpeed = 0;
			}
			if ((keysDown[2] || keysDown[6]) && (keysDown[3] || keysDown[7])) {
				pitchSpeed = 0;
			}
			if ((keysDown[4] || keysDown[8]) && (keysDown[5] || keysDown[9])) {
				yawSpeed = 0;
			}
		}

		/**
		 * Event handler for document resizes. Updates viewer size and rerenders view.
		 * @private
		 */
		function onDocumentResize() {
			// Resize panorama renderer (moved to onFullScreenChange)
			//renderer.resize();
			//animateInit();

			// Kludge to deal with WebKit regression: https://bugs.webkit.org/show_bug.cgi?id=93525
			onFullScreenChange();
		}

		/**
		 * Initializes animation.
		 * @private
		 */
		function animateInit() {
			if (animating) {
				return;
			}
			animating = true;
			animate();
		}

		/**
		 * Animates view, using requestAnimationFrame to trigger rendering.
		 * @private
		 */
		function animate() {
			render();
			if (autoRotateStart)
				clearTimeout(autoRotateStart);
			if (isUserInteracting) {
				requestAnimationFrame(animate);
			} else if (keysDown[0] || keysDown[1] || keysDown[2] || keysDown[3] ||
				keysDown[4] || keysDown[5] || keysDown[6] || keysDown[7] ||
				keysDown[8] || keysDown[9] || config.autoRotate ||
				Math.abs(yawSpeed) > 0.01 || Math.abs(pitchSpeed) > 0.01 ||
				Math.abs(zoomSpeed) > 0.01) {

				keyRepeat();
				if (config.autoRotateInactivityDelay >= 0 && autoRotateSpeed &&
					Date.now() - latestInteraction > config.autoRotateInactivityDelay)
					config.autoRotate = autoRotateSpeed;
				requestAnimationFrame(animate);
			} else if (renderer && (renderer.isLoading() || (config.dynamic === true && update))) {
				requestAnimationFrame(animate);
			} else {
				animating = false;
				var autoRotateStartTime = config.autoRotateInactivityDelay -
					(Date.now() - latestInteraction);
				if (autoRotateStartTime > 0) {
					autoRotateStart = setTimeout(function() {
						config.autoRotate = autoRotateSpeed;
						animateInit();
					}, autoRotateStartTime);
				} else if (config.autoRotateInactivityDelay >= 0 && autoRotateSpeed) {
					config.autoRotate = autoRotateSpeed;
					animateInit();
				}
			}
		}

		/**
		 * Renders panorama view.
		 * @private
		 */
		function render() {
			var tmpyaw;

			if (loaded) {
				if (config.yaw > 180) {
					config.yaw -= 360;
				} else if (config.yaw < -180) {
					config.yaw += 360;
				}

				// Keep a tmp value of yaw for autoRotate comparison later
				tmpyaw = config.yaw;

				// Ensure the yaw is within min and max allowed
				var yawRange = config.maxYaw - config.minYaw,
					minYaw = -180,
					maxYaw = 180;
				if (yawRange < 360) {
					minYaw = config.minYaw + config.hfov / 2;
					maxYaw = config.maxYaw - config.hfov / 2;
					if (yawRange < config.hfov) {
						// Keep either min or max yaw in view when both can be seen at once
						var diff = config.hfov - yawRange;
						minYaw -= diff;
						maxYaw += diff;
					}
				}
				config.yaw = Math.max(minYaw, Math.min(maxYaw, config.yaw));

				// Check if we autoRotate in a limited by min and max yaw
				// If so reverse direction
				if (config.autoRotate !== false && tmpyaw != config.yaw) {
					config.autoRotate *= -1;
				}

				// Ensure the calculated pitch is within min and max allowed
				var canvas = renderer.getCanvas();
				var vfov = 2 * Math.atan(Math.tan(config.hfov / 180 * Math.PI * 0.5) /
						(canvas.width / canvas.height)) / Math.PI * 180;
				var minPitch = config.minPitch + vfov / 2,
					maxPitch = config.maxPitch - vfov / 2;
				var pitchRange = config.maxPitch - config.minPitch;
				if (pitchRange < vfov) {
					// Keep either min or max pitch in view when both can be seen at once
					var diff = vfov - pitchRange;
					minPitch -= diff;
					maxPitch += diff;
				}
				if (isNaN(minPitch))
					minPitch = -90;
				if (isNaN(maxPitch))
					maxPitch = 90;
				config.pitch = Math.max(minPitch, Math.min(maxPitch, config.pitch));

				renderer.render(config.pitch * Math.PI / 180, config.yaw * Math.PI / 180, config.hfov * Math.PI / 180, {roll: config.roll * Math.PI / 180});

				renderHotSpots();
				// console.log('renderer');

				// Update compass
				if (config.compass) {
					compass.style.transform = 'rotate(' + (-config.yaw - config.northOffset) + 'deg)';
					compass.style.webkitTransform = 'rotate(' + (-config.yaw - config.northOffset) + 'deg)';
				}
			}
		}

		/**
		 * Creates a new quaternion.
		 * @constructor
		 * @param {Number} w - W value
		 * @param {Number} x - X value
		 * @param {Number} y - Y value
		 * @param {Number} z - Z value
		 */
		function Quaternion(w, x, y, z) {
			this.w = w;
			this.x = x;
			this.y = y;
			this.z = z;
		}

		/**
		 * Multiplies quaternions.
		 * @private
		 * @param {Quaternion} q - Quaternion to multiply
		 * @returns {Quaternion} Result of multiplication
		 */
		Quaternion.prototype.multiply = function(q) {
			return new Quaternion(this.w*q.w - this.x*q.x - this.y*q.y - this.z*q.z,
				this.x*q.w + this.w*q.x + this.y*q.z - this.z*q.y,
				this.y*q.w + this.w*q.y + this.z*q.x - this.x*q.z,
				this.z*q.w + this.w*q.z + this.x*q.y - this.y*q.x);
		}

		/**
		 * Converts quaternion to Euler angles.
		 * @private
		 * @returns {Number[]} [phi angle, theta angle, psi angle]
		 */
		Quaternion.prototype.toEulerAngles = function() {
			var phi = Math.atan2(2 * (this.w * this.x + this.y * this.z),
					1 - 2 * (this.x * this.x + this.y * this.y)),
				theta = Math.asin(2 * (this.w * this.y - this.z * this.x)),
				psi = Math.atan2(2 * (this.w * this.z + this.x * this.y),
					1 - 2 * (this.y * this.y + this.z * this.z));
			return [phi, theta, psi];
		}

		/**
		 * Converts device orientation API Tait-Bryan angles to a quaternion.
		 * @private
		 * @param {Number} alpha - Alpha angle (in degrees)
		 * @param {Number} beta - Beta angle (in degrees)
		 * @param {Number} gamma - Gamma angle (in degrees)
		 * @returns {Quaternion} Orientation quaternion
		 */
		function taitBryanToQuaternion(alpha, beta, gamma) {
			var r = [beta ? beta * Math.PI / 180 / 2 : 0,
				gamma ? gamma * Math.PI / 180 / 2 : 0,
				alpha ? alpha * Math.PI / 180 / 2 : 0];
			var c = [Math.cos(r[0]), Math.cos(r[1]), Math.cos(r[2])],
				s = [Math.sin(r[0]), Math.sin(r[1]), Math.sin(r[2])];

			return new Quaternion(c[0]*c[1]*c[2] - s[0]*s[1]*s[2],
				s[0]*c[1]*c[2] - c[0]*s[1]*s[2],
				c[0]*s[1]*c[2] + s[0]*c[1]*s[2],
				c[0]*c[1]*s[2] + s[0]*s[1]*c[2]);
		}

		/**
		 * Computes current device orientation quaternion from device orientation API
		 * Tait-Bryan angles.
		 * @private
		 * @param {Number} alpha - Alpha angle (in degrees)
		 * @param {Number} beta - Beta angle (in degrees)
		 * @param {Number} gamma - Gamma angle (in degrees)
		 * @returns {Quaternion} Orientation quaternion
		 */
		function computeQuaternion(alpha, beta, gamma) {
			// Convert Tait-Bryan angles to quaternion
			var quaternion = taitBryanToQuaternion(alpha, beta, gamma);
			// Apply world transform
			quaternion = quaternion.multiply(new Quaternion(Math.sqrt(0.5), -Math.sqrt(0.5), 0, 0));
			// Apply screen transform
			var angle = window.orientation ? -window.orientation * Math.PI / 180 / 2 : 0;
			return quaternion.multiply(new Quaternion(Math.cos(angle), 0, -Math.sin(angle), 0));
		}

		/**
		 * Event handler for device orientation API. Controls pointing.
		 * @private
		 * @param {DeviceOrientationEvent} event - Device orientation event.
		 */
		function orientationListener(e) {
			var q = computeQuaternion(e.alpha, e.beta, e.gamma).toEulerAngles();
			config.pitch = q[0] / Math.PI * 180;
			config.roll = -q[1] / Math.PI * 180;
			config.yaw = -q[2] / Math.PI * 180 + config.northOffset;
			animate();
		}

		/**
		 * Initializes renderer.
		 * @private
		 */
		function renderInit() {
			try {
				var params = {};
				if (config.horizonPitch !== undefined)
					params.horizonPitch = config.horizonPitch * Math.PI / 180;
				if (config.horizonRoll !== undefined)
					params.horizonRoll = config.horizonRoll * Math.PI / 180;
				renderer.init(panoImage, config.type, config.dynamic, config.haov * Math.PI / 180, config.vaov * Math.PI / 180, config.vOffset * Math.PI / 180, renderInitCallback, params);
				if (config.dynamic !== true) {
					// Allow image to be garbage collected
					panoImage = undefined;
				}
			} catch(event) {
				// Panorama not loaded

				// Display error if there is a bad texture
				if (event.type == 'webgl error' || event.type == 'no webgl') {
					anError();
				} else if (event.type == 'webgl size error') {
					anError('This panorama is too big for your device! It\'s ' +
						event.width + 'px wide, but your device only supports images up to ' +
						event.maxWidth + 'px wide. Try another device.' +
						' (If you\'re the author, try scaling down the image.)');
				} else {
					anError('Unknown error. Check developer console.');
					throw event;
				}
			}
		}

		/**
		 * Triggered when render initialization finishes. Handles fading between
		 * scenes as well as showing the compass and hotspots and hiding the loading
		 * display.
		 * @private
		 */
		function renderInitCallback() {
			// Fade if specified
			if (config.sceneFadeDuration && renderer.fadeImg !== undefined) {
				renderer.fadeImg.style.opacity = 0;
				// Remove image
				var fadeImg = renderer.fadeImg;
				delete renderer.fadeImg;
				setTimeout(function() {
					renderContainer.removeChild(fadeImg);
				}, config.sceneFadeDuration);
			}

			// Show compass if applicable
			if (config.compass) {
				compass.style.display = 'inline';
			} else {
				compass.style.display = 'none';
			}

			// Show hotspots
			createHotSpots();

			// Hide loading display
			infoDisplay.load.box.style.display = 'none';
			if (preview !== undefined) {
				renderContainer.removeChild(preview);
				preview = undefined;
			}
			loaded = true;

			fireEvent('load');

			animateInit();
		}

		/**
		 * Creates hot spot elements for the current scene.
		 * @private
		 */
		function createHotSpots() {
			if (hotspotsCreated) return;

			if (!config.hotSpots) {
				config.hotSpots = [];
			} else {
				//deleted by neta since we don't use the tooltip and it's simply annoying
				// Sort by pitch so tooltip is never obscured by another hot spot
				// config.hotSpots = config.hotSpots.sort(function(a, b) {
				// 	return a.pitch < b.pitch;
				// });
				config.hotSpots.forEach(function(hs) {
					var div = document.createElement('div');
					div.className = 'pnlm-hotspot pnlm-sprite pnlm-' + escapeHTML(hs.type);
					// div.className = 'pnlm-hotspot pnlm-' + escapeHTML(hs.type);

					var span = document.createElement('span');
					if (hs.text)
						span.innerHTML = escapeHTML(hs.text);

					var a;
					if (hs.video) {
						var video = document.createElement('video'),
							p = hs.video;
						if (config.basePath && !absoluteURL(p))
							p = config.basePath + p;
						video.src = encodeURI(p);
						video.controls = true;
						video.style.width = hs.width + 'px';
						renderContainer.appendChild(div);
						span.appendChild(video);
					} else if (hs.image) {
						var p = hs.image;
						if (config.basePath && !absoluteURL(p))
							p = config.basePath + p;
						a = document.createElement('a');
						a.href = encodeURI(hs.URL ? hs.URL : p);
						a.target = '_blank';
						span.appendChild(a);
						var image = document.createElement('img');
						image.src = encodeURI(p);
						image.style.width = hs.width + 'px';
						image.style.paddingTop = '5px';
						renderContainer.appendChild(div);
						a.appendChild(image);
						span.style.maxWidth = 'initial';
					} else if (hs.URL) {
						a = document.createElement('a');
						a.href = encodeURI(hs.URL);
						a.target = '_blank';
						renderContainer.appendChild(a);
						div.style.cursor = 'pointer';
						span.style.cursor = 'pointer';
						a.appendChild(div);
					} else {
						if (hs.sceneId) {
							div.onclick = function() {
								loadScene(hs.sceneId, hs.targetPitch, hs.targetYaw, hs.targetHfov);
								return false;
							};
							div.ontouchend = function() {
								loadScene(hs.sceneId, hs.targetPitch, hs.targetYaw, hs.targetHfov);
								return false;
							};
							// div.style.cursor = 'pointer';
							// span.style.cursor = 'pointer';
						}
						renderContainer.appendChild(div);
					}

					if (hs.text || hs.video || hs.image) {
						div.classList.add('pnlm-tooltip');
						div.appendChild(span);
						span.style.width = span.scrollWidth - 20 + 'px';
						span.style.marginLeft = -(span.scrollWidth - 26) / 2 + 'px';
						span.style.marginTop = -span.scrollHeight - 12 + 'px';
					}
					hs.div = div;
				});
			}
			hotspotsCreated = true;
			renderHotSpots();
			console.log('createHotSpots');
		}

		/**
		 * Destroys currently create hot spot elements.
		 * @private
		 */
		function destroyHotSpots() {
			if (config.hotSpots) {
				for (var i = 0; i < config.hotSpots.length; i++) {
					var current = config.hotSpots[i].div;
					while(current.parentNode != renderContainer) {
						current = current.parentNode;
					}
					renderContainer.removeChild(current);
					delete config.hotSpots[i].div;
				}
			}
			hotspotsCreated = false;
			delete config.hotSpots;
		}

		/**
		 * Renders hot spots, updating their positions and visibility.
		 * @private
		 */
		function renderHotSpots() {
			config.hotSpots.forEach(function(hs) {
				var hsPitchSin = Math.sin(hs.pitch * Math.PI / 180);
				var hsPitchCos = Math.cos(hs.pitch * Math.PI / 180);
				var configPitchSin = Math.sin(config.pitch * Math.PI / 180);
				var configPitchCos = Math.cos(config.pitch * Math.PI / 180);
				var yawCos = Math.cos((-hs.yaw + config.yaw) * Math.PI / 180);
				var hfovTan = Math.tan(config.hfov * Math.PI / 360);
				var z = hsPitchSin * configPitchSin + hsPitchCos * yawCos * configPitchCos;
				if ((hs.yaw <= 90 && hs.yaw > -90 && z <= 0) ||
					((hs.yaw > 90 || hs.yaw <= -90) && z <= 0)) {
					hs.div.style.visibility = 'hidden';
				} else {
					hs.div.style.visibility = 'visible';
					// Subpixel rendering doesn't work in Firefox
					// https://bugzilla.mozilla.org/show_bug.cgi?id=739176
					var canvas = renderer.getCanvas(),
						canvasWidth = canvas.width / (window.devicePixelRatio || 1),
						canvasHeight = canvas.height / (window.devicePixelRatio || 1);
					var transform = 'translate(';
					hs.x = (-canvasWidth /
					hfovTan * Math.sin((-hs.yaw + config.yaw) * Math.PI / 180) *
					hsPitchCos / z / 2 + canvasWidth / 2 - 13);
					transform += hs.x + 'px, ';
					hs.y = (-canvasWidth / hfovTan * (hsPitchSin *

					configPitchCos - hsPitchCos * yawCos * configPitchSin) / z / 2 +
					canvasHeight / 2 - 13);
					transform += hs.y + 'px) translateZ(9999px)';

					hs.div.style.webkitTransform = transform;
					hs.div.style.MozTransform = transform;
					hs.div.style.transform = transform;
				}
			});
			overlayCoordinates();
		}

		function overlayCoordinates(){

			let arr = config.hotSpots;
			arr.forEach((hs, index) => {
				let display = "display:" + (hs.shown ? 'block': 'none');

				if(hs.imgSrc && !config.isRendered){
					hs.div.innerHTML = `<img id=${hs.id} width="64" height="64" src=${hs.imgSrc} onClick="window.postMessage(this.id,'*')" style=display/>`;
				}
				//if it's a hotspot, and not a point for correction
				if(hs.div.childElementCount){
					let object = hs.div.children[0];
					let width = arr[index+1].x-arr[index].x;
					object.style.position = 'absolute';
					object.style.top = '13px';
					object.style.left = '13px';
					object.attributes.width.value = width;
					let height = arr[index+1].y-arr[index].y;
					object.attributes.height.value = height;
				}
			});
            config.isRendered = true;
		}

		/**
		 * Merges a scene configuration into the current configuration.
		 * @private
		 * @param {string} sceneId - Identifier of scene configuration to merge in.
		 */
		function mergeConfig(sceneId) {
			config = {};
			var k;
			var photoSphereExcludes = ['haov', 'vaov', 'vOffset', 'northOffset', 'horizonPitch', 'horizonRoll'];
			specifiedPhotoSphereExcludes = [];

			// Merge default config
			for (k in defaultConfig) {
				if (defaultConfig.hasOwnProperty(k)) {
					config[k] = defaultConfig[k];
				}
			}

			// Merge default scene config
			for (k in initialConfig.default) {
				if (initialConfig.default.hasOwnProperty(k)) {
					config[k] = initialConfig.default[k];
					if (photoSphereExcludes.indexOf(k) >= 0) {
						specifiedPhotoSphereExcludes.push(k);
					}
				}
			}

			// Merge current scene config
			if ((sceneId !== null) && (sceneId !== '') && (initialConfig.scenes) && (initialConfig.scenes[sceneId])) {
				var scene = initialConfig.scenes[sceneId];
				for (k in scene) {
					if (scene.hasOwnProperty(k)) {
						config[k] = scene[k];
						if (photoSphereExcludes.indexOf(k) >= 0) {
							specifiedPhotoSphereExcludes.push(k);
						}
					}
				}
				config.scene = sceneId;
			}

			// Merge initial config
			for (k in initialConfig) {
				if (initialConfig.hasOwnProperty(k)) {
					config[k] = initialConfig[k];
					if (photoSphereExcludes.indexOf(k) >= 0) {
						specifiedPhotoSphereExcludes.push(k);
					}
				}
			}
		}

		/**
		 * Processes configuration options.
		 * @private
		 */
		function processOptions() {
			// Process preview first so it always loads before the browser hits its
			// maximum number of connections to a server as can happen with cubic
			// panoramas
			if ('preview' in config) {
				var p = config.preview;
				if (config.basePath) {
					p = config.basePath + p;
				}
				preview = document.createElement('div');
				preview.className = 'pnlm-preview-img';
				preview.style.backgroundImage = "url('" + encodeURI(p) + "')";
				renderContainer.appendChild(preview);
			}

			// Process other options
			for (var key in config) {
				if (config.hasOwnProperty(key)) {
					switch(key) {
						case 'title':
							infoDisplay.title.innerHTML = escapeHTML(config[key]);
							infoDisplay.container.style.display = 'inline';
							break;

						case 'author':
							infoDisplay.author.innerHTML = 'by ' + escapeHTML(config[key]);
							infoDisplay.container.style.display = 'inline';
							break;

						case 'fallback':
							infoDisplay.errorMsg.innerHTML = '<p>Your browser does not support WebGL.<br><a href="' + encodeURI(config[key]) + '" target="_blank">Click here to view this panorama in an alternative viewer.</a></p>';
							break;

						case 'hfov':
							setHfov(Number(config[key]));
							break;

						case 'autoLoad':
							if (config[key] === true && renderer === undefined) {
								// Show loading box
								infoDisplay.load.box.style.display = 'inline';
								// Hide load button
								controls.load.style.display = 'none';
								// Initialize
								init();
							}
							break;

						case 'showZoomCtrl':
							if (config[key]) {
								// Show zoom controls
								controls.zoom.style.display = 'block';
							} else {
								// Hide zoom controls
								controls.zoom.style.display = 'none';
							}
							break;

						case 'showFullscreenCtrl':
							if (config[key] && ('fullscreen' in document || 'mozFullScreen' in document ||
								'webkitIsFullScreen' in document || 'msFullscreenElement' in document)) {

								// Show fullscreen control
								controls.fullscreen.style.display = 'block';
							} else {
								// Hide fullscreen control
								controls.fullscreen.style.display = 'none';
							}
							break;
					}
				}
			}
		}

		/**
		 * Toggles fullscreen mode.
		 * @private
		 */
		function toggleFullscreen() {
			let father = document.querySelector('#father')
			if (loaded && !error) {
				if (!fullscreenActive) {
					try {
						if (father.requestFullscreen) {
							father.requestFullscreen();
						} else if (father.mozRequestFullScreen) {
							father.mozRequestFullScreen();
						} else if (father.msRequestFullscreen) {
							father.msRequestFullscreen();
						} else {
							father.webkitRequestFullScreen();
						}
					} catch(event) {
						// Fullscreen doesn't work
					}
				} else {
					if (document.exitFullscreen) {
						document.exitFullscreen();
					} else if (document.mozCancelFullScreen) {
						document.mozCancelFullScreen();
					} else if (document.webkitCancelFullScreen) {
						document.webkitCancelFullScreen();
					} else if (document.msExitFullscreen) {
						document.msExitFullscreen();
					}
				}
			}
		}

		/**
		 * Event handler for fullscreen changes.
		 * @private
		 */
		function onFullScreenChange() {
			if (document.fullscreen || document.mozFullScreen || document.webkitIsFullScreen || document.msFullscreenElement) {
				controls.fullscreen.classList.add('pnlm-fullscreen-toggle-button-active');
				fullscreenActive = true;
			} else {
				controls.fullscreen.classList.remove('pnlm-fullscreen-toggle-button-active');
				fullscreenActive = false;
			}

			// Resize renderer (deal with browser quirks and fixes #155)
			renderer.resize();
			setHfov(config.hfov);
			animateInit();
		}

		/**
		 * Increases panorama zoom. For use with zoom button.
		 * @private
		 */
		function zoomIn() {
			if (loaded) {
				setHfov(config.hfov - 5);
			}
		}

		/**
		 * Decreases panorama zoom. For use with zoom button.
		 * @private
		 */
		function zoomOut() {
			if (loaded) {
				setHfov(config.hfov + 5);
			}
		}

		/**
		 * Sets viewer's horizontal field of view.
		 * @private
		 * @param {number} hfov - Desired horizontal field of view in degrees.
		 */
		function setHfov(hfov) {
			// Keep field of view within bounds
			var minHfov = config.minHfov;
			if (config.type == 'multires' && renderer) {
				minHfov = Math.min(minHfov, renderer.getCanvas().width / (config.multiRes.cubeResolution / 90 * 0.9));
			}
			if (minHfov >= config.maxHfov) {
				// Don't change view if bounds don't make sense
				console.log('HFOV bounds do not make sense (minHfov >= maxHfov).')
				return;
			} if (hfov < minHfov) {
				config.hfov = minHfov;
			} else if (hfov > config.maxHfov) {
				config.hfov = config.maxHfov;
			} else {
				config.hfov = hfov;
			}
		}

		/**
		 * Loads panorama.
		 * @private
		 */
		function load() {
			// Since WebGL error handling is very general, first we clear any error box
			// since it is a new scene and the error from previous maybe because of lacking
			// memory etc and not because of a lack of WebGL support etc
			clearError();

			controls.load.style.display = 'none';
			infoDisplay.load.box.style.display = 'inline';
			init();
		}

		/**
		 * Loads scene.
		 * @private
		 * @param {string} sceneId - Identifier of scene configuration to merge in.
		 * @param {number} targetPitch - Pitch viewer should be centered on once scene loads.
		 * @param {number} targetYaw - Yaw viewer should be centered on once scene loads.
		 * @param {number} targetHfov - HFOV viewer should use once scene loads.
		 * @param {boolean} [fadeDone] - If `true`, fade setup is skipped.
		 */
		function loadScene(sceneId, targetPitch, targetYaw, targetHfov, fadeDone) {
			loaded = false;

			// Set up fade if specified
			var fadeImg, workingPitch, workingYaw, workingHfov;
			if (config.sceneFadeDuration && !fadeDone) {
				fadeImg = new Image();
				fadeImg.className = 'pnlm-fade-img';
				fadeImg.style.transition = 'opacity ' + (config.sceneFadeDuration / 1000) + 's';
				fadeImg.style.width = '100%';
				fadeImg.style.height = '100%';
				fadeImg.onload = function() {
					loadScene(sceneId, targetPitch, targetYaw, targetHfov, true);
				};
				var data = renderer.render(config.pitch * Math.PI / 180, config.yaw * Math.PI / 180, config.hfov * Math.PI / 180, {returnImage: true});
				if (data !== undefined) {
					fadeImg.src = data;
				}
				renderContainer.appendChild(fadeImg);
				renderer.fadeImg = fadeImg;
				return;
			}

			// Set new pointing
			if (targetPitch === 'same') {
				workingPitch = config.pitch;
			} else {
				workingPitch = targetPitch;
			}
			if (targetYaw === 'same') {
				workingYaw = config.yaw;
			} else if (targetYaw === 'sameAzimuth') {
				workingYaw = config.yaw + config.northOffset - initialConfig.scenes[sceneId].northOffset;
			} else {
				workingYaw = targetYaw;
			}
			if (targetHfov === 'same') {
				workingHfov = config.hfov;
			} else {
				workingHfov = targetHfov;
			}

			// Destroy hot spots from previous scene
			destroyHotSpots();

			// Create the new config for the scene
			mergeConfig(sceneId);

			// Stop motion
			yawSpeed = pitchSpeed = zoomSpeed = 0;

			// Reload scene
			processOptions();
			if (workingPitch !== undefined) {
				config.pitch = workingPitch;
			}
			if (workingYaw !== undefined) {
				config.yaw = workingYaw;
			}
			if (workingHfov !== undefined) {
				config.hfov = workingHfov;
			}
			fireEvent('scenechange');
			load();
		}

		/**
		 * Escapes HTML string (to mitigate possible DOM XSS attacks).
		 * @private
		 * @param {string} s - String to escape
		 * @returns {string} Escaped string
		 */
		function escapeHTML(s) {
			return String(s).replace(/&/g, '&amp;')
				.replace('"', '&quot;')
				.replace("'", '&#39;')
				.replace('<', '&lt;')
				.replace('>', '&gt;')
				.replace('/', '&#x2f;');
		}

		/**
		 * Returns the pitch of the center of the view.
		 * @memberof Viewer
		 * @instance
		 * @returns {number} Pitch in degrees
		 */
		this.getPitch = function() {
			return config.pitch;
		};

		/**
		 * Sets the pitch of the center of the view.
		 * @memberof Viewer
		 * @instance
		 * @param {number} pitch - Pitch in degrees
		 * @returns {Viewer} `this`
		 */
		this.setPitch = function(pitch) {
			config.pitch = pitch;
			requestAnimationFrame(animate);
			return this;
		};

		/**
		 * Returns the minimum and maximum allowed pitches (in degrees).
		 * @memberof Viewer
		 * @instance
		 * @returns {number[]} [minimum pitch, maximum pitch]
		 */
		this.getPitchBounds = function() {
			return [config.minPitch, config.maxPitch];
		};

		/**
		 * Set the minimum and maximum allowed pitches (in degrees).
		 * @memberof Viewer
		 * @instance
		 * @param {number[]} bounds - [minimum pitch, maximum pitch]
		 * @returns {Viewer} `this`
		 */
		this.setPitchBounds = function(bounds) {
			config.minPitch = Math.max(-90, Math.min(bounds[0], 90));
			config.maxPitch = Math.max(-90, Math.min(bounds[1], 90));
			return this;
		};

		/**
		 * Returns the yaw of the center of the view.
		 * @memberof Viewer
		 * @instance
		 * @returns {number} Yaw in degrees
		 */
		this.getYaw = function() {
			return config.yaw;
		};

		/**
		 * Sets the yaw of the center of the view.
		 * @memberof Viewer
		 * @instance
		 * @param {number} yaw - Yaw in degrees [-180, 180]
		 * @returns {Viewer} `this`
		 */
		this.setYaw = function(yaw) {
			while (yaw > 180) {
				yaw -= 360;
			}
			while (yaw < -180) {
				yaw += 360;
			}
			config.yaw = yaw;
			requestAnimationFrame(animate);
			return this;
		};

		/**
		 * Returns the minimum and maximum allowed pitches (in degrees).
		 * @memberof Viewer
		 * @instance
		 * @returns {number[]} [yaw pitch, maximum yaw]
		 */
		this.getYawBounds = function() {
			return [config.minYaw, config.maxYaw];
		};

		/**
		 * Set the minimum and maximum allowed yaws (in degrees [-180, 180]).
		 * @memberof Viewer
		 * @instance
		 * @param {number[]} bounds - [minimum yaw, maximum yaw]
		 * @returns {Viewer} `this`
		 */
		this.setYawBounds = function(bounds) {
			config.minYaw = Math.max(-180, Math.min(bounds[0], 180));
			config.maxYaw = Math.max(-180, Math.min(bounds[1], 180));
			return this;
		};

		/**
		 * Returns the horizontal field of view.
		 * @memberof Viewer
		 * @instance
		 * @returns {number} Horizontal field of view in degrees
		 */
		this.getHfov = function() {
			return config.hfov;
		};

		/**
		 * Sets the horizontal field of view.
		 * @memberof Viewer
		 * @instance
		 * @param {number} hfov - Horizontal field of view in degrees
		 * @returns {Viewer} `this`
		 */
		this.setHfov = function(hfov) {
			setHfov(hfov);
			requestAnimationFrame(animate);
			return this;
		};

		/**
		 * Returns the minimum and maximum allowed horizontal fields of view
		 * (in degrees).
		 * @memberof Viewer
		 * @instance
		 * @returns {number[]} [minimum hfov, maximum hfov]
		 */
		this.getHfovBounds = function() {
			return [config.minHfov, config.maxHfov];
		};

		/**
		 * Set the minimum and maximum allowed horizontal fields of view (in degrees).
		 * @memberof Viewer
		 * @instance
		 * @param {number[]} bounds - [minimum hfov, maximum hfov]
		 * @returns {Viewer} `this`
		 */
		this.setHfovBounds = function(bounds) {
			config.minHfov = Math.max(0, bounds[0]);
			config.maxHfov = Math.max(0, bounds[1]);
			return this;
		};

		/**
		 * Returns the panorama's north offset.
		 * @memberof Viewer
		 * @instance
		 * @returns {number} North offset in degrees
		 */
		this.getNorthOffset = function() {
			return config.northOffset;
		};

		/**
		 * Sets the panorama's north offset.
		 * @memberof Viewer
		 * @instance
		 * @param {number} heading - North offset in degrees
		 * @returns {Viewer} `this`
		 */
		this.setNorthOffset = function(heading) {
			config.northOffset = Math.max(360, Math.min(0, heading));
			requestAnimationFrame(animate);
			return this;
		};

		/**
		 * Start auto rotation.
		 * @memberof Viewer
		 * @instance
		 * @param {number} [speed] - Auto rotation speed / direction. If not specified, previous value is used.
		 * @returns {Viewer} `this`
		 */
		this.startAutoRotate = function(speed) {
			speed = speed || autoRotateSpeed || 1;
			config.autoRotate = speed;
			animateInit();
			return this;
		};

		/**
		 * Stop auto rotation.
		 * @memberof Viewer
		 * @instance
		 * @returns {Viewer} `this`
		 */
		this.stopAutoRotate = function() {
			autoRotateSpeed = config.autoRotate ? config.autoRotate : autoRotateSpeed;
			config.autoRotate = false;
			return this;
		};

		/**
		 * Returns the panorama renderer.
		 * @memberof Viewer
		 * @instance
		 * @returns {Renderer}
		 */
		this.getRenderer = function() {
			return renderer;
		};

		/**
		 * Sets update flag for dynamic content.
		 * @memberof Viewer
		 * @instance
		 * @param {boolean} bool - Whether or not viewer should update even when still
		 * @returns {Viewer} `this`
		 */
		this.setUpdate = function(bool) {
			update = bool === true;
			if (renderer === undefined)
				onImageLoad();
			else
				requestAnimationFrame(animate);
			return this;
		}

		/**
		 * Calculate panorama pitch and yaw from location of mouse event.
		 * @memberof Viewer
		 * @instance
		 * @param {MouseEvent} event - Document mouse down event.
		 * @returns {number[]} [pitch, yaw]
		 */
		this.mouseEventToCoords = function(event) {
			return mouseEventToCoords(event);
		}

		/**
		 * Change scene being viewed.
		 * @memberof Viewer
		 * @instance
		 * @param {string} sceneId - Identifier of scene to switch to.
		 * @param {number} [pitch] - Pitch to use with new scene
		 * @param {number} [yaw] - Yaw to use with new scene
		 * @param {number} [hfov] - HFOV to use with new scene
		 * @returns {Viewer} `this`
		 */
		this.loadScene = function(sceneId, pitch, yaw, hfov) {
			if (loaded)
				loadScene(sceneId, pitch, yaw, hfov);
			return this;
		}

		/**
		 * Get ID of current scene.
		 * @memberof Viewer
		 * @instance
		 * @returns {string} ID of current scene
		 */
		this.getScene = function() {
			return config.scene;
		}

		/**
		 * Toggle fullscreen.
		 * @memberof Viewer
		 * @instance
		 * @returns {Viewer} `this`
		 */
		this.toggleFullscreen = function() {
			toggleFullscreen();
			return this;
		}

		/**
		 * Subscribe listener to specified event.
		 * @memberof Viewer
		 * @instance
		 * @param {string} type - Type of event to subscribe to.
		 * @param {Function} listener - Listener function to subscribe to event.
		 * @returns {Viewer} `this`
		 */
		this.on = function(type, listener) {
			externalEventListeners[type] = externalEventListeners[type] || [];
			externalEventListeners[type].push(listener);
			return this;
		}

		/**
		 * Remove an event listener (or listeners).
		 * @memberof Viewer
		 * @param {string} [type] - Type of event to remove listeners from. If not specified, all listeners are removed.
		 * @param {Function} [listener] - Listener function to remove. If not specified, all listeners of specified type are removed.
		 * @returns {Viewer} `this`
		 */
		this.off = function(type, listener) {
			if (!type) {
				// Remove all listeners if type isn't specified
				externalEventListeners = {};
				return this;
			}
			if (listener) {
				var i = externalEventListeners[type].indexOf(listener);
				if (i >= 0) {
					// Remove listener if found
					externalEventListeners[type].splice(i, 1);
				}
				if (externalEventListeners[type].length = 0) {
					// Remove category if empty
					delete externalEventListeners[type];
				}
			} else {
				// Remove category of listeners if listener isn't specified
				delete externalEventListeners[type];
			}
			return this;
		}

		/**
		 * Fire listeners attached to specified event.
		 * @private
		 * @param {string} [type] - Type of event to fire listeners for.
		 */
		function fireEvent(type) {
			if (type in externalEventListeners) {
				for (var i = 0; i < externalEventListeners[type].length; i++) {
					externalEventListeners[type][i].apply(null, [].slice.call(arguments, 1));
				}
			}
		}

		/**
		 * Destructor.
		 * @instance
		 * @memberof Viewer
		 */
		this.destroy = function() {
			if (renderer)
				renderer.destroy()
			if (listenersAdded) {
				container.removeEventListener('mousedown', onDocumentMouseDown, false);
				document.removeEventListener('mousemove', onDocumentMouseMove, false);
				document.removeEventListener('mouseup', onDocumentMouseUp, false);
				container.removeEventListener('mousewheel', onDocumentMouseWheel, false);
				container.removeEventListener('DOMMouseScroll', onDocumentMouseWheel, false);
				container.removeEventListener('mozfullscreenchange', onFullScreenChange, false);
				container.removeEventListener('webkitfullscreenchange', onFullScreenChange, false);
				container.removeEventListener('msfullscreenchange', onFullScreenChange, false);
				container.removeEventListener('fullscreenchange', onFullScreenChange, false);
				window.removeEventListener('resize', onDocumentResize, false);
				window.removeEventListener('orientationchange', onDocumentResize, false);
				container.removeEventListener('keydown', onDocumentKeyPress, false);
				container.removeEventListener('keyup', onDocumentKeyUp, false);
				container.removeEventListener('blur', clearKeys, false);
				document.removeEventListener('mouseleave', onDocumentMouseUp, false);
				container.removeEventListener('touchstart', onDocumentTouchStart, false);
				container.removeEventListener('touchmove', onDocumentTouchMove, false);
				container.removeEventListener('touchend', onDocumentTouchEnd, false);
				container.removeEventListener('pointerdown', onDocumentPointerDown, false);
				container.removeEventListener('pointermove', onDocumentPointerMove, false);
				container.removeEventListener('pointerup', onDocumentPointerUp, false);
				container.removeEventListener('pointerleave', onDocumentPointerUp, false);
			}
			container.innerHTML = '';
			container.classList.remove('pnlm-container');
			container.classList.remove('pnlm-grab');
			container.classList.remove('pnlm-grabbing');
		}

	}

	return {
		viewer: function(container, config) {
			return new Viewer(container, config);
		}
	};

})(window, document);