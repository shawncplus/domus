var http = require('http')
    , fs = require('fs')
	, FeedParser = require('feedparser')
	, fparser = new FeedParser()
	, util = require('util')
	, mongojs = require('mongojs')
	, bcrypt = require('bcrypt')

var Domus = {
	_db: null,

	_cache_dir: __dirname + '/../cache/',

	_routes: {
		'/': function(req, res)
		{
			res.send(404, 'Invalid method');
		},

		/**
		 * Attempt to authorize a user
		 */
		'/auth/': {
			/**
			 * @param {string} user
			 * @param {string} pass
			 */
			post: function (req, res)
			{
				var params = req.body;

				if (!params.user || !params.pass) {
					return res.json({
						error: 'No username/password given idiot.'
					});
				}

				Domus._db.users.findOne({email: params.user}, function (err, user)
				{
					if (err || !user) return res.send(400, err || { error: 'That user doesn\'t exist' });

					return res.json(bcrypt.compareSync(params.pass, user.hash) ?
						{
							email: user.email
						}
					:
						{
							error: 'Incorrect password'
						});
				});
			}
		},

		/**
		 * Fetch user details
		 */
		'/user/:user': {
			get: function (req, res)
			{
				if (!req.params.user) return res.json(400, { error: "What ain't no user where I'm from!" });

				Domus._db.users.findOne({email: req.params.user}, function (err, user)
				{
					res.json({
						email: user.email
					});
				});
			}
		},

		/**
		 * Get a list of widgets for a user
		 */
		'/user/:user/widgets/': {
			get: function (req, res)
			{
				Domus._db.users.findOne({email: req.params.user}, function (err, user)
				{
					if (err || !user) return res.json(400, { error: 'Bad user' });

					var ids = [];
					user.widgets.forEach(function (id) { ids.push(mongojs.ObjectId(id)); });

					Domus._db.widgets.find({ _id: { $in : ids}}, function (err, widgets)
					{
						if (err || !widgets) return res.json(400, { error: err });
						res.json(widgets);
					});
				});
			}
		},

		/**
		 * Get details for a specific widget
		 */
		'/widget/:widget_id': {
			get: function (req, res)
			{
				var id = req.params.widget_id;
				if (!/^[a-f0-9]+$/.test(id)) {
					return res.send(400, 'Bad widget id');
				}

				Domus._db.widgets.findOne({_id: mongojs.ObjectId(id)}, function (err, widget)
				{
					if (err || !widget) return res.send(400, 'No such widget... dummy');

					Domus.getWidgetItems(widget, function (items) {
						res.json({ 'items' : items });
					});
				});
			}
		}
	},

	/**
	 * get a widget's items from cache or source
	 * @param object widget
	 * @param function callback
	 * @return array
	 */
	getWidgetItems: function (widget, callback)
	{
		widget._id = widget._id.toString();
		var widget_dir = Domus._cache_dir + widget._id.substr(0, 2);
		var widget_file = widget_dir + '/' + widget._id;

		var cached = fs.existsSync(widget_file);
		var stale  = cached ?
			fs.statSync(widget_file).mtime.getTime() < (new Date(new Date().getTime() - (widget.refresh_interval * 60 * 1000))).getTime()
			 :
			false;

		if (!cached || stale) {
			fparser.parseUrl(widget.source, function (err, meta, articles)
			{
				if (err) return callback([]);
				var articles = articles.slice(0, widget.count);
				var items = [];

				for (var i in articles) {
					var article = articles[i];

					items.push({
						title: article.title,
						preview: article.description.substr(0, Math.min(article.description.length, 200)) + '...',
						link: article.link || article.guid
					});
				}

				if (!fs.existsSync(widget_dir)) fs.mkdirSync(widget_dir);
				fs.writeFileSync(widget_file, JSON.stringify(items), 'utf8');

				return callback(items);
			});
		} else {
			return callback(JSON.parse(fs.readFileSync(widget_file, 'utf8')));
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
			app.use(express.bodyParser());
		});

		this._db = mongojs.connect(app.get('dbconnection'), ["users", "widgets"]);

		for (var route in this._routes) {
			var events = this._routes[route];
			if (typeof events === 'function') {
				app.all(route, events);
			} else if (Array.isArray(events)) {
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
};
exports.Domus = Domus;
