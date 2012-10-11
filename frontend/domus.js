var Twig = require("twig"),
    express = require('express'),
    app = express(),
    crypto = require('crypto');

app.set('views', __dirname + '/views');
app.use('/static', express.static(__dirname + '/web'));
app.param(function(name, fn){
	if (fn instanceof RegExp) {
		return function(req, res, next, val){
			var captures;
			if (captures = fn.exec(String(val))) {
				req.params[name] = captures;
				next();
			} else {
				next('route');
			}
		}
	}
});

app.get('/', function(req, res) {
	res.render('home.html.twig', {
		widgets: [
			{
				id: crypto.createHash('md5').update('testshawn').digest('hex'),
				title: 'Test Widget',
				left: 0,
				top: 0
			}
		]
	});
});

app.param('widget_id', /^[a-f0-9]+$/);

app.get('/widget/:widget_id', function (req, res) {
	res.json({
		'items': [
			{
				'title': 'Hello, World!',
				'link': 'http://www.google.com/',
				'preview': 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore...',
			},
			{
				'title': 'Goodbye, World!',
				'link': 'http://www.example.com/',
				'preview': 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore...',
			}
		]
	});
});

app.listen(9999);
