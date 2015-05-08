(function () {/**
 * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

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

}());