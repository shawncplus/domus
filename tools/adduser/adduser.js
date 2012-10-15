#!/usr/bin/env node

var mongojs = require('mongojs')
	, bcrypt = require('bcrypt')
	, util = require('util')

if (process.argv.length < 3) {
	util.log('no params');
	process.exit(1);
}

var user = process.argv[2],
	pass = process.argv[3],
	db   = process.argv[4];

var db = mongojs.connect(db, ["users"]);

var salt = bcrypt.genSaltSync(10),
	hash = bcrypt.hashSync(pass, salt);

db.users.insert({
	email: user,
	hash: hash,
	widgets: []
}, {safe: true}, function (err, doc)
{
	if (err) {
		util.log(err);
		process.exit(1);
	}
	util.log("User created: " + util.inspect(doc, null, 10, true));
	process.exit(0);
});
