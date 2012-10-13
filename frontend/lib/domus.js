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
				rest.get(Domus.config.api_server.host + '/user/' + req.user.email + '/widgets/').on('complete', function (data)
				{
					res.render('home.html.twig', { widgets: data });
				});
			}]
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
						return res.redirect(req.headers.origin);
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
				rest.get(Domus.config.api_server.host + '/widget/' + req.params.widget_id).on('complete', function (data)
				{
					res.json(data);
				});
			}
		}
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
			app.use(express.session({ secret: 'workingatwendys' }));
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
	}
};



exports.Domus = Domus;
