# Domus

I plan for domus to be my replacement for iGoogle. I don't know if I'm going to host it for others to use or have this project be a server that everyone can run on their own. Probably both.

 * in PHP - https://github.com/shawncplus/domus/tree/master
 * in nodejs - https://github.com/shawncplus/domus/tree/node
 * other languages possibly coming soon...

## TODO List

 * Tabs - Allow you to have different tabs
 * Non-rss items - Allow you to have things besides rss feeds. OpenSocial seems to be the leading suggestion at the moment. I really want to get gmail in there like the original iGoogle. I may be able to fuss with an iframed mobile gmail...

## Running it
### Dependencies
 * Node v 0.8.x
 * MongoDB

### Actually running it
 1. Clone this repo
 2. `cd frontend/;npm install`
 3. `cd ../backend;npm install`
 4. `cd ../`
 5. `./frontend/bin/domus &`
 6. `./backend/bin/domus-be &`

If you're running Domus in a production environment (That is to say, Express has its env set to production) you'll have to define the following environment variables

 * DBCON - This is your mongodb connection string, it looks like `mongodb://user:pass@host:port/db`


At this point your servers are running and you can visit localhost:1234 in  your browser but you won't have any users to log in with. I've intentionally left out user creation because of... other reasons so you'll have to use the script in the tools directory to create them like so:

    ./tools/adduser/adduser.js username password dbconnectionstring

Et voila, you've got domus up and running.


## Known Issues

   Node version:
 * Caching issue sometimes shows a different widget's content.
   * **Bandaid:** Edit the widget and save without changing anything will force a refresh
