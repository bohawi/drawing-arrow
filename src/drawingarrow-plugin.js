
define(function (require) {
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
