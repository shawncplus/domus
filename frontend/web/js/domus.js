$(function () {

	// Fit the body to the window
	var fit = function () {
		var fix = $('#footer').position().top - $('#widget-container').offset().top - ($('#footer').height() / 2);
		$('#widget-container').height(fix);
	};

	fit();
	$(window).resize(fit);

	$('.widget').draggable({
		handle: 'ul.nav',
		cursor: 'move',
		opacity: 0.35,
		stack: '.widget',
		containment: 'parent'
	});

	$('.widget').each(function (index, widget) {
		var id = $(widget).attr('data-id');
		$.getJSON('widget/' + id, function (resp) {
			var $body = $(widget).find('.widget-body');
			$.each(resp.items, function (i, item) {
				$body.append($('<h5><a href="' + item.link + '" target="_blank">' + item.title + '</a></h5><div><p>' + item.preview + '</p></div>'));
			});
			$body.accordion();
		});
	});
});
