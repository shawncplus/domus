<?php

require_once __DIR__.'/../vendor/autoload.php';

use Symfony\Component\HttpFoundation\Response;
$app = new Silex\Application(); 
$app['debug'] = true;


// Register services
$app->register(new Silex\Provider\TwigServiceProvider(), array(
	'twig.path'       => __DIR__.'/../views',
	'twig.options' => [
		'cache' => __DIR__.'/../cache',
	]
));

$app->get('/', function () use ($app) {
	return new Response($app['twig']->render('home.html.twig', [
		'widgets' => [
			[
				'id' => md5('shawn'),
				'title' => time(),
				'left' => 0,
				'top' => 0
			],
		]
	]), 200);
});

$app->get('/widget/{id}', function ($id) use ($app) {
	echo json_encode([
		'items' => [
			[
				'title' => 'Hello, World!',
				'link' => 'http://www.google.com/',
				'preview' => 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore...',
			],
			[
				'title' => 'Goodbye, World!',
				'link' => 'http://www.example.com/',
				'preview' => 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore...',
			]

		]
	]);
})->assert('id', '[a-f0-9]+');

$app->run();
