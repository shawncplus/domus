var rest = require('restler')
  , Domus = require('../domus.js')
  , util = require('util');

util.log(util.inspect(Domus, 999, true));
/**
 * Widget model
 */
var Widget = {
	/**
	 * Create a widget and add it to the user
	 * @param {object} widget
	 * @param {string} user The user id, probably email
	 * @param {function} callback
	 */
	add: function (widget, user, callback)
	{
		var errors = Widget._validate(widget);

		if (errors.length) {
			return callback({ errors: errors });
		}

		var tab = widget.tab;
		delete widget.tab;

		widget.position = {};
		rest.postJson(Domus.config.api_server.host + '/widget/', widget).on('complete', function (data)
		{
			if (data.error) {
				return callback({
					errors: [ data.error ]
				});
			}

			var widget = data[0];
			rest.put(Domus.config.api_server.host + '/tab/' + tab + '/widget/' + widget._id).on('complete', function (data)
			{
				if (data.error) {
					return callback({
						errors: [ data.error ]
					});
				}

				return callback();
			});
		});
	},

	/**
	 * Update a widget
	 * @param {object} widget
	 * @param {function} callback
	 */
	update: function (widget, callback)
	{
		var errors = Widget._validate(widget);

		if (!widget._id) {
			errors.push("Wat? You tried to update when you wanted to create.");
		}

		if (errors.length) {
			return callback({ errors: errors });
		}

		rest.json(Domus.config.api_server.host + '/widget/' + widget._id, widget, {}, 'PUT').on('complete', function (data)
		{
			if (data.error) {
				return callback({
					errors: [ data.error ]
				});
			}

			return callback();
		});
	},

	/**
	 * Delete a widget and the user association with it
	 * @param {string} widget_id
	 * @param {string} tab_id
	 * @param {string} user
	 * @param {function} callback
	 */
	'delete': function (widget_id, tab_id, user, callback)
	{
		rest.del(Domus.config.api_server.host + '/tab/' + tab_id + '/widget/' + widget_id).on('complete', function (data, response)
		{
			if (data.error) {
				return callback({
					errors: [ data.error ]
				});
			}

			return callback();
		});
	},

	/**
	 * Move a widget between tabs
	 * @param {string} source_tab
	 * @param {string} target_tab
	 * @param {string} widget
	 * @param {function} callback
	 */
	move: function (source_tab, target_tab, widget, callback)
	{
		rest.postJson(Domus.config.api_server.host + '/widget/' + widget + '/move/', {
			source: source_tab,
			target: target_tab
		}).on('complete', function (data)
		{
			if (data.error) {
				return callback({
					errors: [ data.error ]
				});
			}

			return callback();
		});
	},

	/**
	 * Helper for making sure widget form data is valid
	 * @param {object} widget
	 * @return {array}
	 */
	_validate: function (widget)
	{
		var errors = [];
		if (!widget.title.trim().length) {
			errors.push("You didn't give the thing a title");
		}

		if (!widget.source.trim().length) {
			errors.push("No source, where do you expect to get the data?");
		}

		widget.count = parseInt(widget.count, 10);
		if (widget.count < 1 || widget.count > 5) {
			errors.push("Only 1-5 news items per thing, bud");
		}

		widget.refresh_interval = parseInt(widget.refresh_interval, 10);
		if (widget.refresh_interval < 5 || widget.refresh_interval > 60) {
			errors.push("Refresh interval has to be between 5 and 60 minutes");
		}

		return errors;
	}
};

exports.Widget = Widget;
