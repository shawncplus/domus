var http = require('http')
	, request = require('request')
    , fs = require('fs')
	, FeedParser = require('feedparser')
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
		 * Read/update for user. Creation is completely manual right now on purpose.
		 */
		'/user/:user': {
			get: function (req, res)
			{
				if (!req.params.user) return res.json(400, { error: "What ain't no user where I'm from!" });

				Domus._db.users.findOne({email: req.params.user}, function (user_err, user)
				{
					if (!user)
					{
						res.json(404, { error: "User not found: " + req.params.user });
						return;
					}

					Domus._db.tabs.find({ _id : { $in : user.tabs }}, function (tab_err, tabs)
					{
						if (tab_err)
						{
							res.json(500, { error: tab_err });
							return;
						}

						res.json({
							email: user.email,
							tabs: tabs
						});
					});
				});
			},

			put: function (req, res)
			{
				if (!req.params.user) return res.json(400, { error: "What ain't no user where I'm from!" });
				Domus._db.users.update({email: req.params.user}, { $set : req.body }, {multi:false, safe: true}, function (err, count)
				{
					if (count) {
						res.json(200);
					} else {
						res.json(400, { error: err});
					}
				});
			}
		},

		/**
		 * Endpoint for adding/removing a user's widgets
		 */
		'/user/:user/tab/:tab_id': {
			put: function (req, res)
			{
				Domus._db.users.findOne({email: req.params.user}, function (err, user)
				{
					if (err || !user) return res.json(400, { error: 'Bad user' });

					Domus._db.users.update(
						{email: req.params.user},
						{$addToSet: {tabs: mongojs.ObjectId(req.params.tab_id)}},
						{multi: false, safe: true},
						function (err, count)
						{
							if (count) {
								res.send(200);
							} else {
								res.json(400, { error: err });
							}
						}
					);
				});
			},

			'delete': function (req, res)
			{
				Domus._db.users.findOne({email: req.params.user}, function (err, user)
				{
					if (err || !user) return res.json(400, { error: 'Bad user' });

					Domus._db.users.update(
						{email: req.params.user},
						{$pull: {tabs: mongojs.ObjectId(req.params.tab_id)}},
						{multi: false, safe: true},
						function (err, count)
						{
							if (count) {
								Domus.deleteTab(req.params.tab_id, function (response)
								{
									if (!response) {
										res.json(400, {error: 'Delete of tab failed...'});
									} else {
										res.send(200);
									}
								});
							} else {
								res.json(400, { error: err });
							}
						}
					);
				});
			}
		},

		/**
		 * Endpoint for creating a new tab
		 */
		'/tab/': {
			post: function (req, res)
			{
				var required = ['title'];

				var valid = true;
				if (!required.every(function (e) { return e in req.body }))
				{
					return res.json(400, {
						error: "Missing one of required parameters: " + required.join(', ')
					});
				}

				Domus._db.tabs.insert(req.body, {safe: true}, function (err, tab)
				{
					res.json(201, tab);
				});
			}
		},

		/**
		 * Get a specific tab
		 * @param tab_id
		 * @return json
		 */
		'/tab/:tab_id': {
			get: function (req, res)
			{
				Domus._db.tabs.findOne({_id: mongojs.ObjectId(req.params.tab_id)}, function (err, tab)
				{
					if (err || !tab) return res.send(400, 'No such tab... dummy');
					Domus._db.widgets.find({_id: {$in : tab.widgets.map(mongojs.ObjectId)}}, function (err, widgets)
					{
						tab.widgets = widgets;
						res.json(tab);
					});
				});
			},

			'delete': function (req, res)
			{
				Domus.deleteTab(req.params.tab_id, function (response)
				{
					if (!response) {
						res.send(400, {error: 'Delete failed...'});
					} else {
						res.send(200);
					}
				});
			}
		},

		/**
		 * Add/remove a widget to a tab
		 * @param tab_id
		 * @param widget_id
		 * @return json
		 */
		'/tab/:tab_id/widget/:widget_id': {
			put: function (req, res)
			{
				Domus._db.tabs.update(
					{_id: mongojs.ObjectId(req.params.tab_id)},
					{$addToSet: { widgets: req.params.widget_id}},
					{multi: false, safe: true},
					function (err, count)
					{
						if (count) {
							res.send(200);
						} else {
							res.json(400, { error: err });
						}
					}
				);
			},

			'delete': function (req, res)
			{
				Domus._db.tabs.update(
					{_id: mongojs.ObjectId(req.params.tab_id)},
					{$pull: {tabs: req.params.widget_id}},
					{multi: false, safe: true},
					function (err, count)
					{
						if (count) {
							Domus._db.widgets.remove({_id: mongojs.ObjectId(req.params.widget_id)}, {safe: true}, function (err, response)
							{
								if (response) {
									Domus.cleanupWidget(req.params.widget_id, function ()
									{
										res.send(200);
									});
								} else {
									res.json(400, { error: "Delete failed" });
								}
							});
						} else {
							res.json(400, { error: err });
						}
					}
				);
			}
		},

		/**
		 * Endpoint for creating a new widget
		 */
		'/widget/': {
			post: function (req, res)
			{
				var required = [
					'title', 'source', 'refresh_interval', 'count', 'position'
				];

				var valid = true;
				if (!required.every(function (e) { return e in req.body }))
				{
					return res.json(400, {
						error: "Missing one of required parameters: " + required.join(', ')
					});
				}

				Domus._db.widgets.insert(req.body, {safe: true}, function (err, widget)
				{
					res.json(201, widget);
				});
			},

			/**
			 * Debugging endpoint to get cached versions of widgets
			 */
			get: function (req, res)
			{
				Domus._db.widgets.find({}, function (err, widgets)
				{
					var output = [];
					widgets.forEach(function (widget)
					{
						widget._id = widget._id.toString();
						var widget_dir = Domus._cache_dir + widget._id.substr(0, 2);
						var widget_file = widget_dir + '/' + widget._id;

						if (fs.existsSync(widget_file)) {
							var widget = {
								widget: widget,
								content: JSON.parse(fs.readFileSync(widget_file, 'utf8'))
							};
							output.push(widget);
						}
					});

					res.json(output);
				});
			}
		},

		/**
		 * RUD a widget
		 */
		'/widget/:widget_id': {
			get: function (req, res)
			{
				Domus._db.widgets.findOne({_id: mongojs.ObjectId(req.params.widget_id)}, function (err, widget)
				{
					if (err || !widget) return res.send(400, 'No such widget... dummy');
					res.json(widget);
				});
			},

			put: function (req, res)
			{
				var id = req.params.widget_id;
				if (!/^[a-f0-9]+$/.test(id)) {
					return res.json(400, { error: 'Bad widget id'});
				}

				if ('_id' in req.body) delete req.body._id;

				Domus._db.widgets.update({_id: mongojs.ObjectId(id)}, { $set : req.body }, {multi:false, safe: true}, function (err, count)
				{
					
					if (count) {
						// Don't wipe the cache if they only changed the position
						req.body.position = { top: 0, left: 0};
						if (util.inspect(req.body) === util.inspect({ position: { top: 0, left: 0 } })) {
							Domus._db.widgets.findOne({_id: mongojs.ObjectId(id)}, function (err, widget) { res.json(widget); });
						} else {
							Domus.cleanupWidget(id, function ()
							{
								Domus._db.widgets.findOne({_id: mongojs.ObjectId(id)}, function (err, widget) { res.json(widget); });
							});
						}
					} else {
						res.json(400, { error: err});
					}
				});
			},

			'delete': function (req, res)
			{
				var id = req.params.widget_id;
				if (!/^[a-f0-9]+$/.test(id)) {
					return res.json(400, { error: 'Bad widget id'});
				}

				Domus._db.widgets.remove({_id: mongojs.ObjectId(id)}, {safe: true}, function (err, response)
				{
					if (response) {
						Domus.cleanupWidget(id, function ()
						{
							res.send(200);
						});
					} else {
						res.json(400, { error: "Delete failed" });
					}
				});
			}
		},

		/**
		 * Endpoint to fetch the actual contents of a widget
		 */
		'/widget/:widget_id/content/': {
			get: function (req, res)
			{
				var id = req.params.widget_id;
				if (!/^[a-f0-9]+$/.test(id)) {
					return res.json(400, { error: 'Bad widget id'});
				}

				Domus._db.widgets.findOne({_id: mongojs.ObjectId(id)}, function (err, widget)
				{
					if (err || !widget) return res.send(400, 'No such widget... dummy');

					Domus.getWidgetItems(widget, function (items) {
						if (items.error) {
							return res.json({error:items.error});
						}
						res.json({ 'items' : items });
					});
				});
			}
		},

		'/widget/:widget_id/move/': {
			post: function (req, res)
			{
				Domus._db.tabs.update(
					{_id: mongojs.ObjectId(req.body.source)},
					{$pull: { widgets: req.params.widget_id}},
					{multi: false, safe: true},
					function (err, count)
					{
						if (count) {
							Domus._db.tabs.update(
								{_id: mongojs.ObjectId(req.body.target)},
								{$addToSet: { widgets: req.params.widget_id}},
								{multi: false, safe: true},
								function (err, count)
								{
									if (count) {
										res.send(200);
									} else {
										res.json(400, { error: err });
									}
								}
							);
						} else {
							res.json(400, { error: err });
						}
					}
				);
			}
		}
	},

	/**
	 * There's a lot involved in removing a tab so make its own function
	 * @param string id Tab id
	 * @param function callback
	 */
	deleteTab: function (id, callback)
	{
		Domus._db.tabs.findOne({_id: mongojs.ObjectId(id)}, function (err, tab)
		{
			tab.widgets.forEach(function (widget)
			{
				Domus._db.widgets.remove({_id: mongojs.ObjectId(widget)}, {safe: true}, function (err, response)
				{
					Domus.cleanupWidget(widget, function () { });
				});
			});

			Domus._db.tabs.remove({_id: mongojs.ObjectId(id)}, {safe: true}, function (err, response)
			{
				return callback(response);
			});
		});
	},

	/**
	 * Cleanup a widget's cache from the filesystem
	 * @param object widget
	 * @param function callback
	 * @return array
	 */
	cleanupWidget: function (id, callback)
	{
		var widget_dir  = Domus._cache_dir + id.substr(0, 2);
		var widget_file = widget_dir + '/' + id;

		if (fs.existsSync(widget_file)) {
			fs.unlinkSync(widget_file);
		}

		// get rid of the directory if that was the last one
		if (fs.existsSync(widget_dir)) {
			if (!fs.readdirSync(widget_dir).length) {
				fs.rmdirSync(widget_dir);
			}
		}

		return callback();
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
			var items = [], count = widget.count;
			request(widget.source)
				.on('error', function (err)
				{
					callback({
						error: err
					});
				})
				.pipe(new FeedParser())
				.on('meta', function () {})
				.on('readable', function ()
				{
					var stream = this, article = null;

					while (article = stream.read()) {
						if (count-- <= 0) {
							break;
						}
						items.push({
							title: article.title,
							preview: article.description.substr(0, Math.min(article.description.length, 200)) + '...',
							link: article.link || article.guid
						});
					}

					if (!fs.existsSync(widget_dir)) fs.mkdirSync(widget_dir);
					fs.writeFileSync(widget_file, JSON.stringify(items), 'utf8');

					callback(items);
				})
				.on('error', function (err)
				{
					console.log(err);
					callback({
						error: err
					});
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

		if (!fs.existsSync(Domus._cache_dir)) {
			fs.mkdirSync(Domus._cache_dir);
		} else {
			// Clear the cache on startup
			var rmDir = function(dirPath) {
				var files = fs.readdirSync(dirPath);
				if (files.length > 0) {
					for (var i = 0; i < files.length; i++) {
						var filePath = dirPath + '/' + files[i];
						if (fs.statSync(filePath).isFile()) {
							fs.unlinkSync(filePath);
						} else {
							rmDir(filePath);
						}
					}
				}
			};

			rmDir(Domus._cache_dir);
		}

		app.configure(function ()
		{
			app.use(express.bodyParser());
		});

		this._db = mongojs.connect(app.get('dbconnection'), ["users", "widgets", "tabs"]);

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
