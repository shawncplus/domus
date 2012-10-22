$(function () {
	// draggable using live events
	(function ($) {
		$.fn.liveDraggable = function (opts) {
			this.live("mouseover", function() {
				if (!$(this).data("init")) {
					$(this).data("init", true).draggable(opts);
				}
			});
			return $();
		};
	}(jQuery));

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

	$('.widget').liveDraggable({
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
	$('#tablist a').click(function ()
	{
		// Skip the add button
		if ($(this).hasClass('btn')) {
			return;
		}

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

				tab.data('loaded', 1);
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
		case 'delete':
			$('#delete_id').val($(this).data('target'));
			$('#delete_tab_id').val($('div.tab-pane.active').data('id'));
			$('#delete_form').submit();
			break;
		}
	});

	// Setup the fields so the user can see the actual value of a range input
	var updateRangePreview = function ()
	{
		$(this).prev('span.range-preview').html(this.valueAsNumber);
	};

	// Focus inputs and such on the form popups
	$('#addThing').live('shown', function ()
	{
		$('input[type=range]').each(updateRangePreview).live('change', updateRangePreview);
		$('#input-title-add').focus();
		$('#input-tab').val($('div.tab-pane.active').data('id'));
	});

	$('#editThing').live('shown', function ()
	{
		$('input[type=range]').each(updateRangePreview).live('change', updateRangePreview);
		$('#input-title-edit').focus();
	});

	$('#addTabForm').live('shown', function ()
	{
		$('#input-title-tab').focus();
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
				if (!window.location.hash) {
					window.history.replaceState({}, document.title, window.location.href + '#lights-off');
				}
				break;
			case 'off':
				$(this).html('Kill the lights');
				$(this).data('state', 'on');
				window.history.replaceState({}, document.title, window.location.href.replace(new RegExp(window.location.hash + '$'), ''));
				break;
		}
	});

	if (window.location.hash === '#lights-off') {
		$('#lightswitch button').click();
	}
});
