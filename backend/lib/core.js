var http = require('http'),
    fs   = require('fs'),
	FeedParser = require('feedparser'),
	fparser = new FeedParser()
	util = require('util');

var Domus = {

	_cache_dir: __dirname + '/../cache/',

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
			fparser.parseUrl(widget.source, function (err, meta, articles) {
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
	}
};
exports.Domus = Domus;
