/*globals QUnit */

QUnit.config.autostart = false;
QUnit.config.reorder = false;

require(['jquery', 'drawingarrow'],
function ($) {

	QUnit.start();

	function create(options) {
		options = options || {};
		var $div = $('<div />');
		$('#qunit-fixture').append($div);
		$div.drawingarrow(options);
		return $div;
	}

	function elementFunctionExists(instance, funcName) {
		var element = instance.data('drawingarrow');

		return (element && typeof element[funcName] === 'function');
	}

	/*
	QUnit will reset the elements inside the #qunit-fixture element after each test,
	removing any events that may have existed. As long as you use elements only within
	this fixture, you don't have to manually clean up after your tests to keep them atomic.
	*/

	QUnit.module('DRAWINGARROW');

	QUnit.test('should be defined on jquery object', function () {
		QUnit.ok($('#qunit-fixture').drawingarrow, 'drawingarrow method is defined');
	});

	QUnit.test('should return element', function () {
		var $div = create();
		QUnit.equal($div.drawingarrow()[0], $div[0], 'div returned');
	});
	
	
	QUnit.test('noConflict', function () {
		var current = $.fn.drawingarrow;
		QUnit.ok(current === $.fn.drawingarrow.noConflict(), 'noConflict returns valid object');
		$.fn.drawingarrow = current;
	});

	QUnit.asyncTest('enable', function () {

		QUnit.expect(2);

		var $div = create();

		QUnit.ok(elementFunctionExists($div, 'enable'), 'enable method is defined');

		$div.on('enabled.fu.drawingarrow', function (e) {
			QUnit.ok(e, 'enabled.fu.drawingarrow event is fired when enable method is called');
			QUnit.start();
		});

		$div.drawingarrow('enable');

		// TODO TEST FOR ENABLED STATE
	});

	QUnit.asyncTest('disable', function () {

		QUnit.expect(2);

		var $div = create();

		QUnit.ok(elementFunctionExists($div, 'disable'), 'disable method is defined');

		$div.on('disabled.fu.drawingarrow', function (e) {
			QUnit.ok(e, 'disabled.fu.drawingarrow event is fired when disable method is called');
			QUnit.start();
		});

		$div.drawingarrow('disable');

		// TODO TEST FOR DISABLED STATE
	});

	QUnit.asyncTest('destroy', function () {

		QUnit.expect(2);

		var $div = create();

		QUnit.ok(elementFunctionExists($div, 'destroy'), 'destroy method is defined');

		$div.on('destroyed.fu.drawingarrow', function (e) {
			QUnit.ok(e, 'destroyed.fu.drawingarrow event is fired when destroy method is called');
			QUnit.start();
		});

		$div.drawingarrow('destroy');

		// TODO TEST FOR DESTROYED STATE
	});
});
