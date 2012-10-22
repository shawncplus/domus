var Domus = {
	util: {
		/**
		 * Parse a hash into an object
		 * @param {string} hash
		 * @return {object}
		 */
		parseHash : function (hash)
		{
			var data = {};
			hash = hash.replace(/^#/, '');
			var pieces = hash.split('|');

			if (hash.length) {
				$.each(pieces, function (i, piece)
				{
					var piece = piece.split('=');
					var func = piece[0];
					var vals = piece[1];

					data[func] = vals;
				});
			}

			return data;
		},

		/**
		 * Compile data into a window hash
		 * @param {object} data
		 * @return {string}
		 */
		compileHash : function (data)
		{
			var hash = [];
			for (var i in data) {
				if (typeof data[i] !== 'function') {
					hash.push(i + '=' + ($.isArray(data[i]) ? data[i].join(',') : data[i]));
				}
			}

			return '#' + hash.join('|');
		},

		/**
		 * Update window hash
		 * @param {object} data {key: 'val'} to place in hash
		 */
		updateHash : function (data)
		{
			if (!window.location.hash) {
				return window.history.replaceState({}, document.title, window.location.href.replace(/#$/, '') + Domus.util.compileHash(data));
			}

			$.each(data, function (i, val)
			{
				var currenthash = Domus.util.parseHash(window.location.hash);
				if (!(i in currenthash)) {
					currenthash[i] = val;
					window.history.replaceState({}, document.title, window.location.href.replace(window.location.hash, '') + Domus.util.compileHash(currenthash));
				} else {
					var currenthash = Domus.util.parseHash(window.location.hash);

					if (val === null) {
						delete currenthash[i];
					} else {
						currenthash[i] = val;
					}

					window.history.replaceState({}, document.title, window.location.href.replace(window.location.hash, '') + Domus.util.compileHash(currenthash));
				}
			});
		}
	}
};
