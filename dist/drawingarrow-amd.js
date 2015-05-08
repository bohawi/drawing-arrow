define('drawing-logic',['jquery'],
function ($) {

	// DRAWING CONSTRUCTOR AND PROTOTYPE

	var Drawing = function (element, options) {

		this.$element = $(element);
		this.$canvas = $('<canvas />');
		this.canvas = this.$canvas[0];
		this.ctx = this.canvas.getContext('2d');
		this.options = options;

		this._setResolution();

	};

	Drawing.prototype = /** @lends drawing.prototype */ {

		constructor: Drawing,

		/**
		 * @desc Set the drawing to an enabled ui state
		 * @fires enabled.fu.drawing
		 * @example
		 * $('#div').drawing('enable');
		*/
		enable: function () {

			// TODO ADD ENABLE CODE

			this.$element.trigger('enabled.fu.drawing');
		},

		/**
		 * @desc Set the drawing to a disabled ui state
		 * @example
		 * $('#div').drawing('disable');
		*/
		disable: function () {

			// TODO ADD DISABLE CODE

			this.$element.trigger('disabled.fu.drawing');
		},

		/**
		 * @desc Removes the drawing functionality completely. This will return the element back to its original state.
		 * @example
		 * $('#div').drawing('destroy');
		*/
		destroy: function () {

			// TODO ADD DESTROY CODE

			this.$element.trigger('destroyed.fu.drawing');
		},

		getElement: function getElement() {
			return this.$canvas;
		},

		_directionMap: function _directionMap(direction, options) {
			var pb;
			var pl;
			var pr;
			var pt;
			var w;
			var h;

			options = options || {};

			if (options.noPadding) {
				options.paddingBottom = 0;
				options.paddingLeft = 0;
				options.paddingRight = 0;
				options.paddingTop = 0;
			}

			pb = options.paddingBottom || this.options.paddingBottom;
			pl = options.paddingLeft || this.options.paddingLeft;
			pr = options.paddingRight || this.options.paddingRight;
			pt = options.paddingTop || this.options.paddingTop;
			w = this.options.width;
			h = this.options.height;

			switch (direction) {
			case 'nw':
				return [pl, pt];
			case 'n':
				return [w / 2, pt];
			case 'ne':
				return [w - pr, pt];
			case 'e':
				return [w - pr, h / 2];
			case 'se':
				return [w - pr, h - pb];
			case 's':
				return [w / 2, h - pb];
			case 'sw':
				return [pl, h - pb];
			case 'w':
				return [pl, h / 2];
			default:
				return false;
			}
		},

		/**
		 * Create a quadratic brush stroke - only supports a single control-point
		 * @param {Object} options
		 * @param {Array} options.startPoint [x,y] starting coordinates
		 * @param {Array} options.endPoint [x,y] ending coordinates
		 * @param {Array} options.controlPoint [x,y] control point coordinates
		 * @param {Function} options.formula The formula used to create the curve
		 * @param {Number} options.startRadius
		 * @param {Number} options.endRadius
		 * @param {String} options.color
		 */
		_drawQuadratic: function _drawQuadratic(options) {
			var startPoint = options.startPoint;
			var endPoint = options.endPoint;
			var controlPoint = options.controlPoint;
			var iterator = 1 / (options.iterator || Math.max(this.options.height, this.options.width));
			var x;
			var y;
			var radius;

			for (var i = 0; i <= 1; i += iterator) {
				x = this._formula(i, startPoint[0], controlPoint[0], endPoint[0]);
				y = this._formula(i, startPoint[1], controlPoint[1], endPoint[1]);
				radius = options.startRadius + (options.endRadius - options.startRadius) * i;

				this._paint({
					centerX: x,
					centerY: y,
					radius: radius,
					color: options.color
				});
			}

			return this;
		},

		/**
		 * First derivative of quadratic formula - Find the tangent slope
		 * @param {Number} t 0-1
		 * @param {Number} p0 Start point
		 * @param {Number} p1 Control point
		 * @param {Number} p2 End point
		 */
		_firstDerivative: function _firstDerivative(t, p0, p1, p2) {
			return 2 * (p0 - 2 * p1 + p2) * t - 2 * (p0 - p1);
		},

		/**
		 * Quadratic formula used to draw a curve with a start point, end point, and control point
		 * @param {Number} t 0-1
		 * @param {Number} p0 Start point
		 * @param {Number} p1 Control point
		 * @param {Number} p2 End point
		 */
		_formula: function _formula(t, p0, p1, p2) {
			var x = 1 - t;

			return p0 * Math.pow(x, 2) + 2 * p1 * x * t + p2 * Math.pow(t, 2);
			// return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
		},

		/**
		 * Draw a circle
		 * @param {Object} options
		 * @param {Number} options.centerX
		 * @param {Number} options.centerY
		 * @param {Number} options.radius
		 * @param {String} options.color
		 */
		_paint: function _paint(options) {
			this.ctx.beginPath();
			this.ctx.arc(options.centerX, options.centerY, options.radius, 0, 2 * Math.PI, false);
			this.ctx.fillStyle = options.color || this.options.color;
			this.ctx.fill();
		},

		/**
		 * To support high dpi screens we have to render at the size of the screen and resize down to display size
		 * Code inspired by http://www.html5rocks.com/en/tutorials/canvas/hidpi/
		 */
		_setResolution: function _setResolution() {
			var $canvas = this.$canvas;
			var canvas = this.canvas;
			var ctx = this.ctx;

			$canvas.removeAttr('style');
			var displayHeight = this.options.height;
			var displayWidth = this.options.width;
			var devicePixelRatio = window.devicePixelRatio || 1;
			var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
					ctx.mozBackingStorePixelRatio ||
					ctx.msBackingStorePixelRatio ||
					ctx.oBackingStorePixelRatio ||
					ctx.backingStorePixelRatio || 1;
			var ratio = devicePixelRatio / backingStoreRatio;
			var doScale = devicePixelRatio !== backingStoreRatio;

			canvas.height = displayHeight * ratio;
			canvas.width = displayWidth * ratio;

			canvas.style.width = displayWidth + 'px';
			canvas.style.height = displayHeight + 'px';

			if (doScale) {
				// scale the context to counter the fact that we've manually scaled our canvas element
				ctx.scale(ratio, ratio);
			}

			return this;
		}
	};

	return Drawing;
});


define('drawing',['drawing-logic', 'jquery'], function (Drawing, $) {

	// DRAWING PLUGIN DEFINITION

	var old = $.fn.drawing;

	/**
	 * @name drawing
	 * @constructor
	 * @classdesc the core module for drawing stuff






	*/

	$.fn.drawing = function (option, value) {

		var methodReturn;

		var $set = this.each(function () {

			var $this = $(this);
			var data = $this.data('drawing');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('drawing', (data = new Drawing(this, $.extend(true, {}, $.fn.drawing.defaults, options))));
			}

			if (typeof option === 'string') {
				methodReturn = data[option](value);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.drawing.defaults = {
		// controlPointWeight: 1,
		color: '#e67c2e',
		controlPoint: 'se',
		endPoint: 'ne',
		endRadius: 1.5,
		height: 200,
		outlineColor: '#ffffff',
		paddingBottom: 5,
		paddingLeft: 5,
		paddingRight: 5,
		paddingTop: 5,
		shape: 'arrow',
		startPoint: 'sw',
		startRadius: 2,
		target: void 0,
		width: 200
	};

	$.fn.drawing.Constructor = Drawing;

	/**
	 * @name drawing#noConflict
	 * @function
	 * @desc Prevent the drawing from overriding an existing version of $.fn.drawing
	 * @returns a self contained version of the ET Element drawing
	 * @example
	 * var etElement = $.fn.drawing.noConflict();
	 */
	$.fn.drawing.noConflict = function () {
		$.fn.drawing = old;
		return this;
	};

});



define('drawingarrow',['require','jquery','drawing'],function (require) {
	'use strict';

	var $ = require('jquery');
	require('drawing');

	var Drawing = $.fn.drawing.Constructor;

	Drawing.prototype.drawArrow = function drawArrow() {
		var $el = this.getElement();

		var startPoint = this._directionMap(this.options.startPoint);
		var endPoint = this._directionMap(this.options.endPoint);
		var controlPoint = this._directionMap(this.options.controlPoint);
		var run = this._firstDerivative(0.95, startPoint[0], controlPoint[0], endPoint[0]);
		var rise = -this._firstDerivative(0.95, startPoint[1], controlPoint[1], endPoint[1]);
		var tangent = Math.atan2(run, rise);

		if (tangent === 0 && 1 / tangent === -Infinity) {
			// Check for -0 values and rotate 180 degrees
			// This occurs when the arrow should point down
			tangent = Math.PI;
		} else if (isNaN(tangent)) {
			// rise === 0, should arrow point left or right?
			tangent = run > 0 ? Math.PI / 2 : -Math.PI / 2;
		}

		// draw white line
		// this._drawStroke({
		// 	startPoint: startPoint,
		// 	endPoint: endPoint,
		// 	controlPoint: controlPoint,
		// 	startRadius: this.options.startRadius + 2,
		// 	endRadius: this.options.endRadius + 2,
		// 	color: this.options.outlineColor
		// });

		// this.ctx.save();

		// this._drawArrowHead({
		// 	location: endPoint,
		// 	rotate: tangent,
		// 	color: this.options.outlineColor,
		// 	lineWidth: 9
		// });

		// this.ctx.restore();

		// draw orange line
		this._drawQuadratic({
			startPoint: startPoint,
			endPoint: endPoint,
			controlPoint: controlPoint,
			startRadius: this.options.startRadius,
			endRadius: this.options.endRadius,
			color: this.options.color
		});

		// this._drawArrowHead({
		// 	location: endPoint,
		// 	rotate: tangent,
		// 	color: this.options.color,
		// 	lineWidth: 5
		// });

		this.$element.html($el);
	};
});

