$(function () {

	// Fit the body to the window
	var fit = function () {
		var fix = $('#footer').position().top - $('#widget-container').offset().top - ($('#footer').height() / 2);
		$('#widget-container').height(fix);
	};

	fit();
	$(window).resize(fit);

	var showLoader = function (title, message) {
		$('#loadingLabel').html(title);
		$('#loadingLabel').next('p').html(message);
		$('#loadingmodal').modal('show');
	};

	var hideLoader = function () {
		$('#loadingmodal').modal('hide');
	};

	$('.widget').draggable({
		handle: 'ul.nav',
		cursor: 'move',
		opacity: 0.35,
		stack: '.widget',
		containment: 'parent',
		stop: function (e, ui)
		{
			var widget_id = ui.helper.data('id');
			showLoader('Saving position', 'Saving widget position...');
			$.ajax({
				type: 'PUT',
				url: 'widget/' + widget_id,
				data: JSON.stringify({
					position: ui.helper.position()
				}),
				contentType: 'application/json',
				dataType: 'json',
				processData: false
			}).done(function (response)
			{
				hideLoader();
			});
		}
	});

	$('.widget').each(function (index, widget)
	{
		var widget_id = $(widget).data('id');
		var $body = $(widget).find('.widget-body');
		$.getJSON('widget/' + widget_id, function (resp) {
			var $body = $(widget).find('.widget-body');
			$body.empty();
			var collapsed = false;
			$.each(resp.items, function (i, item) {
				$body.append($(
				'<div class="accordion-group">' + 
					'<div class="accordion-heading">' +
						'<a class="accordion-toggle" data-parent="#' + $(widget).attr('id') + ' .widget-body" data-toggle="collapse" href="#widget-body-' + widget_id + i + '">' + item.title + '</a>' +
					'</div>' +
					'<div id="widget-body-' + widget_id + i +'" class="accordion-body collapse">' +
						'<div class="accordion-inner">' + item.preview + '</div>' +
						'<div class="accordion-inner-footer">' +
							'<a class="btn btn-small btn-block btn-primary" target="_blank" href="' + item.link + '">See full article</a>' +
						'</div>' +
					'</div>' +
				'<div>'
				));
				collapsed = true;
			});

			$(widget).find('.widget-header a[data-action=edit]').click(function ()
			{
			});


			$(widget).find('.widget-header a[data-action=delete]').click(function ()
			{
			});
		});
	});

	$('a.accordion-toggle').live('click', function ()
	{
		$body = $($(this).data('parent')).find('div.accordion-heading').removeClass('accordion-toggle-active');
		$(this).parent().addClass('accordion-toggle-active');
	});

	$('#editThing').live('shown', function () {
		$('#input-title').focus();
	})

	// Setup the fields so the user can see the actual value of a range input
	var updateRangePreview = function ()
	{
		$(this).prev('span.range-preview').html(this.valueAsNumber);
	};
	$('input[type=range]').each(updateRangePreview).live('change', updateRangePreview);

	$('.alert').alert();
});
