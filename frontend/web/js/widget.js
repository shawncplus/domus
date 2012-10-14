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
		$body.load('widget/' + widget_id, function (resp)
		{
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
