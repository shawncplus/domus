# Domus

I plan for domus to be my replacement for iGoogle. I don't know if I'm going to host it for others to use or have this project be a server that everyone can run on their own. Probably both.

 * in PHP - https://github.com/shawncplus/domus/tree/master
 * in nodejs - https://github.com/shawncplus/domus/tree/node
 * other languages possibly coming soon...

## TODO List

 * Tabs - Allow you to have different tabs
 * Non-rss items - Allow you to have things besides rss feeds. OpenSocial seems to be the leading suggestion at the moment. I really want to get gmail in there like the original iGoogle. I may be able to fuss with an iframed mobile gmail...

## Running it

If you want to run Domus locally, or host it yourself you'll have to define the following variables for your production environment.

### Backend
 * DBCON - This is your mongodb connection string, it looks like `mongodb://user:pass@host:port/db`


## Known Issues

   Node version:
 * Caching issue sometimes shows a different widget's content.
   * **Bandaid:** Edit the widget and save without changing anything will force a refresh
