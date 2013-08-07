var   rest = require('restler')
	, passport = require('passport')
	, LocalStrategy = require('passport-local').Strategy
	, util = require('util');

passport.requireAuth = function (req, res, next)
{
	if (req.isAuthenticated()) return next();
	res.redirect('/login');
};

var Domus = {
	config : {
		api_server: {
			host: 'http://localhost:8080',
		}
	},

	_routes: {
		/**
		 * Default route
		 * @view ../views/home.html.twig
		 */
		'/' : {
			get: [ passport.requireAuth, function(req, res)
			{
				rest.get(Domus.config.api_server.host + '/user/' + req.user.email).on('complete', function (data)
				{
					var params = {
						tabs: data.tabs,
						lights: req.query.lights || 'on',
						activetab: req.query.tab || 'Home'
					};

					["errors", "add_error", "addform"].forEach(function (e)
					{
						if (req.session.messages && req.session.messages[e]) {
							params[e] = req.session.messages[e];
						}
					});

					req.session.messages = {};

					res.render('home.html.twig', params);
				});
			}],

			'delete': [ passport.requireAuth, function (req, res)
			{
				var params = req.body;
				var callback = function (response)
				{
					res.json(response || { success: true });
				};

				switch(params.action) {
				case 'tab':
					rest.get(Domus.config.api_server.host + '/user/' + req.user.email).on('complete', function (data)
					{
						if (data.tabs.length === 1) {
							return callback({errors: ["You can't delete your last tab, don't ask me why."]});
						}
						Domus.deleteTab(params._id, req.user.email, callback);
					});
					break;
				case 'widget':
					Domus.deleteWidget(params._id, params.tab, req.user.email, callback);
					break;
				}
			}],

			post: [ passport.requireAuth, function (req, res)
			{
				var params = req.body;
				var callback = function (response)
				{
					if (response && response.errors) {
						req.session.messages ?
						req.session.messages.errors = response.errors
						 :
						req.session.messages = {
							errors: response.errors
						};
					}
					res.redirect('/');
				};

				switch(params.action) {
				case 'add':
					delete req.body.action;
					Domus.addWidget(req.body, req.user.email, callback);
					req.session.messages.addform = req.body;
					break;
				case 'edit':
					delete req.body.action;
					Domus.updateWidget(req.body, callback);
					req.session.messages.addform = req.body;
					break;
				case 'add_tab':
					delete req.body.action;
					Domus.addTab(req.body, req.user.email, callback);
					break;
				case 'move':
					Domus.moveWidget(req.body.source_tab, req.body.target_tab, req.body.widget, callback);
					break;
				default:
					res.json({ error: "WTF?", request: params });
					break;
				}
			}]
		},

		/**
		 * Render a tab
		 * @view ../views/tab.html.twig
		 */
		'/tab/:tab_id': {
			get: function (req, res)
			{
				rest.get(Domus.config.api_server.host + '/tab/' + req.params.tab_id).on('complete', function (data)
				{
					if (data.error) {
						return res.render('widget.error.html.twig', {
							error: data.error
						});
					}

					res.render('tab.html.twig', data);
				});
			}
		},

		/**
		 * Login route
		 * @view ../views/login.html.twig
		 */
		'/login': {
			get: function (req, res)
			{
				res.render('login.html.twig');
			},

			post: function (req, res, next)
			{
				passport.authenticate('local', function (err, user, info)
				{
					if (!user || err) {
						return res.render('login.html.twig', {
							error: info.message,
							username: info.username
						});
					}

					req.logIn(user, function (err) {
						return res.redirect('/');
					});
				})(req, res, next);
			}
		},

		'/logout': {
			get: function (req, res)
			{
				req.logOut();
				res.redirect('/');
			}
		},

		/**
		 * Widget route
		 * @param widget_id
		 */
		'/widget/:widget_id': {
			get: function (req, res)
			{
				var send_json = false;
				var widget_id = req.params.widget_id;
				if (/\.json$/.test(req.params.widget_id)) {
					widget_id = req.params.widget_id.replace(/\.json$/, '');
					send_json = true;
				}

				rest.get(Domus.config.api_server.host + '/widget/' + widget_id + (send_json ? '' : '/content/')).on('complete', function (data)
				{
					if (send_json) {
						return res.json(data);
					}

					if (data.error) {
						return res.render('widget.error.html.twig', {
							error: data.error
						});
					}

					if (!data.items || !data.items.length) {
						return res.render('widget.error.html.twig', {
							error: 'No news items or invalid source url'
						});
					}

					res.render('widget.html.twig', {
						widget: {
							id: req.params.widget_id,
							items: data.items
						}
					});
				});
			},

			put: function (req, res)
			{
				rest.json(Domus.config.api_server.host + '/widget/' + req.params.widget_id, {
					position: req.body.position // limit them to updating the position with this method
				}, {}, 'PUT').on('complete', function (data)
				{
					res.json(data);
				});
			}
		},


		/**
		 * Form generation endpoint
		 */
		'/form/:form_id': function (req, res)
		{
			switch(req.params.form_id)
			{
			case 'edit_widget':
				rest.get(Domus.config.api_server.host + '/widget/' + req.query.widget).on('complete', function (data)
				{
					return res.render('forms/edit_widget.html.twig', {
						data: data
					});
				});
				break;
			case 'add_widget':
				rest.get(Domus.config.api_server.host + '/user/' + req.user.email).on('complete', function (data)
				{
					return res.render('forms/add_widget.html.twig', {
						tabs: data.tabs
					});
				});
				break;
			case 'add_tab':
				return res.render('forms/add_tab.html.twig');
			case 'move':
				rest.get(Domus.config.api_server.host + '/user/' + req.user.email).on('complete', function (data)
				{
					return res.render('forms/move.html.twig', {
						widget: req.query.widget,
						tabs: data.tabs
					});
				});
				break;
			}
		}
	},

	/**
	 * Setup passport auth method
	 */
	_register_auth: function ()
	{
		passport.use(new LocalStrategy({
				usernameField: 'email',
				passwordField: 'password'
			},
			function(username, password, done)
			{
				rest.postJson(Domus.config.api_server.host + '/auth/', {
					user: username,
					pass: password
				}).on('complete', function (data)
				{
					if (data.error) {
						return done(null, false, { message: data.error, username: username });
					}

					return done(null, data);
				});
			}
		));

		passport.serializeUser(function(user, done)
		{
			done(null, user.email);
		});

		passport.deserializeUser(function(id, done)
		{
			rest.get(Domus.config.api_server.host + '/user/' + id).on('complete', function (user)
			{
				if (user.error) return done(user.error);
				done(null, user);
			});
		});
	},

	/**
	 * Create a widget and add it to the user
	 * @param {object} widget
	 * @param {string} user The user id, probably email
	 * @param {function} callback
	 */
	addWidget: function (widget, user, callback)
	{
		var errors = Domus._validateWidget(widget);

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
	updateWidget: function (widget, callback)
	{
		var errors = Domus._validateWidget(widget);

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
	deleteWidget: function (widget_id, tab_id, user, callback)
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
	moveWidget: function (source_tab, target_tab, widget, callback)
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
	 * Create a tab and add it to the user
	 * @param {object} tab
	 * @param {string} user The user id, probably email
	 * @param {function} callback
	 */
	addTab: function (tab, user, callback)
	{
		if (!tab.title.trim().length) {
			return callback({
				errors: 'No title given...'
			});
		}

		tab = {
			title: tab.title,
			widgets: []
		};

		rest.postJson(Domus.config.api_server.host + '/tab/', tab).on('complete', function (data)
		{
			if (data.error) {
				return callback({
					errors: [ data.error ]
				});
			}

			var tab = data[0];
			rest.put(Domus.config.api_server.host + '/user/' + user + '/tab/' + tab._id).on('complete', function (data)
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
	 * Delete a tab and the user association with it
	 * @param {string} tab_id
	 * @param {string} user
	 * @param {function} callback
	 */
	deleteTab: function (tab_id, user, callback)
	{
		rest.del(Domus.config.api_server.host + '/user/' + user + '/tab/' + tab_id).on('complete', function (data, response)
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
	_validateWidget: function (widget)
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
	},

	/**
	 * Setup express and assign routes from _routes to the app.
	 * Routes can be any of the following:
	 *   'route' : function () {}
	 *   'route' : [function () {}, ...] // app.all('route', func, ...)
	 *   'route' : { get: func(), post: func() }
	 *   'route' : { get: [func, ...], ... }
	 *
	 * @param {object} app Express app object
	 */
	setup: function (express, app)
	{
		app.configure(function ()
		{
			app.use(express.cookieParser());
			app.use(express.bodyParser());
			app.use(express.session({
				secret: 'workingatwendys',
				cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
			}));
			app.use(passport.initialize());
			app.use(passport.session());
		});

		this._register_auth();

		for (var route in this._routes) {
			var events = this._routes[route];
			if (typeof events === 'function') {
				app.all(route, events);
			} else if (util.isArray(events)) {
				events.unshift(route);
				app.all.apply(app, events);
			} else {
				for (var method in events) {
					if (['get', 'put', 'post', 'delete'].indexOf(method) < 0) continue;

					if (util.isArray(events[method])) {
						events[method].unshift(route);
						app[method].apply(app, events[method]);
					} else {
						app[method](route, events[method]);
					}
				}
			}
		}
	}
};

exports.Domus = Domus;
