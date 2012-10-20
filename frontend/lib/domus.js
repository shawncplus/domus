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
						lights: req.query.lights || 'on'
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
				case 'delete':
					delete req.body.action;
					Domus.deleteWidget(req.body._id, req.user.email, callback);
					break;
				case 'move':
					// move widget to different tab
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

		widget.position = {};
		if ('_id' in widget) delete widget._id;
		rest.postJson(Domus.config.api_server.host + '/widget/', widget).on('complete', function (data)
		{
			if (data.error) {
				return callback({
					errors: [ data.error ]
				});
			}

			var widget = data[0];
			rest.put(Domus.config.api_server.host + '/user/' + user + '/widget/' + widget._id).on('complete', function (data)
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
	 * @param {string} user
	 * @param {function} callback
	 */
	deleteWidget: function (widget_id, user, callback)
	{
		rest.del(Domus.config.api_server.host + '/user/' + user + '/widget/' + widget_id).on('complete', function (data, response)
		{
			if (data.error) {
				return callback({
					errors: [ data.error ]
				});
			}

			rest.del(Domus.config.api_server.host + '/widget/' + widget_id).on('complete', function (data, response)
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
