<?php
require_once dirname(__FILE__).'/../../lib/YAJSIE.php';

$yajsie = new YAJSIE(array(
	'localeDir' => dirname(__FILE__).'/../locale',
	'translationFile' => dirname(__FILE__).'/../htdocs/bla.js',
));
