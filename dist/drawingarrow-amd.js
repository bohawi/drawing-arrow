define('drawing-logic',['jquery'],
function ($) {

	// DRAWING CONSTRUCTOR AND PROTOTYPE

	var Drawing = function (element, options) {

		this.$element = $(element);
		this.options = options;

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

	$.fn.drawing.defaults = {};

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
		this._drawQuadratic({
			startPoint: startPoint,
			endPoint: endPoint,
			controlPoint: controlPoint,
			startRadius: this.options.startRadius + 2,
			endRadius: this.options.endRadius + 2,
			color: this.options.outlineColor
		});

		// TODO: Don't access ctx from plugins
		this.ctx.save();

		this._drawArrowHead({
			location: endPoint,
			rotate: tangent,
			color: this.options.outlineColor,
			lineWidth: 9
		});

		// TODO: Don't access ctx from plugins
		this.ctx.restore();

		// draw orange line
		this._drawQuadratic({
			startPoint: startPoint,
			endPoint: endPoint,
			controlPoint: controlPoint,
			startRadius: this.options.startRadius,
			endRadius: this.options.endRadius,
			color: this.options.color
		});

		this._drawArrowHead({
			location: endPoint,
			rotate: tangent,
			color: this.options.color,
			lineWidth: 5
		});

		this.$element.html($el);
	};

	/**
	 * draw the arrowhead
	 * @param {Object} options
	 * @param {Array} options.location [x,y] coordinates of arrowhead
	 * @param {Number} options.rotate Radians to rotate arrowhead
	 * @param {String} options.color
	 * @param {Number} options.lineWidth
	 */
	Drawing.prototype._drawArrowHead = function _drawArrowHead(options) {
		// draw arrow head
		// TODO: This method shouldn't access ctx
		// That should be the core's responsibility
		this.ctx.beginPath();
		this.ctx.translate(options.location[0], options.location[1]);
		this.ctx.rotate(options.rotate);
		if (this.options.scale) {
			this.ctx.scale(this.options.scale, this.options.scale);
		}
		this.ctx.moveTo(-7.5, 11.25);
		this.ctx.quadraticCurveTo(-7.5, 7.5, 0, 0);
		this.ctx.quadraticCurveTo(6, 7.5, 7.5, 12.75);
		this.ctx.quadraticCurveTo(2.25, 6, 0, 3.75);
		this.ctx.quadraticCurveTo(-2.25, 6, -7.5, 11.25);

		this.ctx.strokeStyle = options.color;
		this.ctx.fillStyle = options.color;
		this.ctx.lineWidth = options.lineWidth;
		this.ctx.lineCap = 'round';
		this.ctx.lineJoin = 'round';
		this.ctx.stroke();
		this.ctx.fill();
	};
});

