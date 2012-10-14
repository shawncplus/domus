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
		handle: 'ul.nav li.active',
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

	// Change the form action for the edit window based on the button that launched it
	$('a[data-action]').live('click', function ()
	{
		var action = $(this).data('action');
		switch (action) {
		case 'edit':
			var widget_id = $(this).data('target');
			$.getJSON('/widget/' + widget_id + '.json', function (response)
			{
				$('#editThing form input[name=action]').val(action);
				for (var field in response) {
					var isnt_int_field = !~$.inArray(field, ['refresh_interval', 'count']);
					if (isnt_int_field) {
						$('#input-' + field).val(response[field]);
					} else {
						$('#input-' + field).attr('value', response[field]);
						$('#input-' + field).trigger('change');
					}
				
				}
				$('#editThing').modal('show');
			});
			break;
		case 'add':
			$('#editThing form input[name=action]').val(action);
			$(['title', 'source', 'refresh_interval', 'count', '_id']).each(function (i, field)
			{
				$('#input-' + field).val($('#input-' + field).data('default') || null);
				$('#input-' + field).trigger('change');
			});
			$('#editThing').modal('show');
			break;
		case 'delete':
			$('#delete_id').val($(this).data('target'));
			$('#delete_form').submit();
			break;
		}
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

	$(document).keypress(function (e)
	{
		var events = {
			'/' : function (event, char, charcode)
			{
				event.preventDefault();
				$('#searchbox').focus();
			},
			'a' : function (event, char, charcode)
			{
				event.preventDefault();
				$('#add_button').trigger('click', $('#add_button')[0]);
			}
		};

		var char = String.fromCharCode(e.which);

		if (char in events) {
			if (e.delegateTarget && e.delegateTarget.activeElement && e.delegateTarget.activeElement.type === "text") {
				return;
			}

			events[char](e, char, e.which);
		}
	});
});
