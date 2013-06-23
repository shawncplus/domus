$(function () {

	// Fit the body to the window
	var fit = function () {
		var fix = $('#footer').position().top - $('#tab-container').offset().top - ($('#footer').height() / 2);
		$('#tab-container').height(fix);
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

	// Load first tab
	$('div.tab-pane.active').load('/tab/' + $('div.tab-pane.active').data('id'), function (response)
	{
		$('.widget').each(function (index, widget)
		{
			var widget_id = $(widget).data('id');
			var $body = $(widget).find('.widget-body');
			$body.load('/widget/' + widget_id);
		});
		$('div.tab-pane.active').data('loaded', 1);
	});

	// lazyload other tabs
	$('#tablist a[href]').click(function ()
	{
		// Skip the add button
		if ($(this).hasClass('btn')) {
			return;
		}

		// Update hash on tab select
		Domus.util.updateHash({
			tab: $(this).html()
		});

		var tab = $($(this).attr('href'));
		if (!tab.data('loaded'))
			tab.load('/tab/' + tab.data('id'), function (response)
			{
				tab.find('.widget').each(function (index, widget)
				{
					var widget_id = $(widget).data('id');
					var $body = $(widget).find('.widget-body');
					$body.load('/widget/' + widget_id);
				});

				tab.find('.widget').draggable({
					handle: 'ul.nav li.active',
					cursor: 'move',
					opacity: 0.35,
					stack: '.widget',
					containment: 'parent',
					start: function (e, ui)
					{
					},
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

				tab.data('loaded', 1);
			});
	});

	// Add/remove the active classes because this isn't built into the accordion bootstrap stuff
	$('a.accordion-toggle').on('click', function ()
	{
		$body = $($(this).data('parent')).find('div.accordion-heading').removeClass('accordion-toggle-active');
		$(this).parent().addClass('accordion-toggle-active');
	});

	// Change the form action for the edit window based on the button that launched it
	$('a[data-action]').on('click', function ()
	{
		var action = $(this).data('action');
		switch (action) {
		case 'delete':
			$('#delete_id').val($(this).data('target'));
			$('#delete_widget_tab_id').val($('div.tab-pane.active').data('id'));
			$('#delete_form').submit();
			break;
		case 'delete-tab':
			var answer = confirm("Are you sure you want to delete this tab? It'll delete the widgets along with it, move them to another tab if you want to save them.");

			if (answer) {
				var tab = $('div.tab-pane.active').data('id');
				$('#delete_tab_id').val(tab);
				$('#delete_tab_form').submit();
			}
			break;
		}
	});

	// Setup the fields so the user can see the actual value of a range input
	var updateRangePreview = function ()
	{
		$(this).prev('span.range-preview').html(this.valueAsNumber);
	};

	// Focus inputs and such on the form popups
	$('#addThing').on('shown', function ()
	{
		$('input[type=range]').each(updateRangePreview).on('change', updateRangePreview);
		$('#input-title-add').focus();
		$('#input-tab').val($('div.tab-pane.active').data('id'));
	});

	$('#editThing').on('shown', function ()
	{
		$('input[type=range]').each(updateRangePreview).on('change', updateRangePreview);
		$('#input-title-edit').focus();
	});

	$('#addTabForm').on('shown', function ()
	{
		$('#input-title-tab').focus();
	});

	$('#moveForm').on('shown', function ()
	{
		$('#move_source_tab').val($('div.tab-pane.active').data('id'));
	});

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
			},
			'?' : function (event, char, charcode)
			{
				event.preventDefault();
				$('#keybindHelpModal').modal('toggle');
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


	// Dat lightswitch
	$('#lightswitch button').click(function ()
	{
		var state = $(this).data('state');
		$(this).toggleClass('btn-inverse');
		$('.navbar').toggleClass('navbar-inverse');
		$('body').toggleClass('lights-off');

		switch(state)
		{
			case 'on':
				$(this).html('Light it up');
				$(this).data('state', 'off');
				Domus.util.updateHash({
					lights: 'off'
				});
				break;
			case 'off':
				$(this).html('Kill the lights');
				$(this).data('state', 'on');
				Domus.util.updateHash({
					lights: null
				});
				break;
		}
	});

	var options = Domus.util.parseHash(window.location.hash);

	// Handlers for hash items
	var handlers = {
		lights: function (val)
		{
			switch (val)
			{
			case 'off':
				$('#lightswitch button').click();
			}
		},

		tab: function (tab)
		{
			$('#tablist a:contains(' + tab + ')').click();
		}
	};

	for (var opt in options) {
		if (opt in handlers) {
			handlers[opt](options[opt]);
		}
	}
});
