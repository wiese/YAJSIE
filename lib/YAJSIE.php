<?php

class YAJSIE {

	protected $PO2JSON = 'vendor/po2json/po2json';
	protected $templatePattern;
	protected $localeDir;
	protected $textdomain;
	protected $translationFile;

	public function __construct(array $config = array()) {
		$config = array_merge(array(
			'localeDir' => 'locale',
			'textdomain' => 'messages',
			'translationFile' => 'YAJSIE_data.js',
			'templatePattern' => '(^|.|\r|\n)(#(\w+)#)',
		), $config);

		extract($config, EXTR_OVERWRITE);

		$this->localeDir = $localeDir;
		$this->textdomain = $textdomain;
		$this->translationFile = $translationFile;
		$this->templatePattern = $templatePattern;

		$this->run();
	}

	protected function run() {
		$locales = $this->getLocales($this->localeDir);

		if (!count($locales)) {
			die('no locales found.');
		}

		$output = array();
		foreach ($locales AS $locale) {
			$output[$locale] = $this->translate($this->getLocalePoFileName($locale));
		}

		$structure = new stdClass();
		$structure->config = new stdClass();
		$structure->config->template = new stdClass();
		$structure->config->template->pattern = $this->templatePattern;
		$structure->locales = $output;

		$this->save($this->translationFile, json_encode($structure));
	}

	protected function getLocalePoFileName($locale) {
		return
			$this->localeDir.'/'.$locale.'/LC_MESSAGES/'.$this->textdomain.'.po';
	}

	/**
	 * Get available locales (first level sub directories in the locales folder)
	 *
	 * @param string $parentDir
	 *
	 * @return array
	 */
	protected function getLocales($parentDir) {

		$parentDir = realpath($parentDir);
		$contents = scandir($parentDir);

		if ($contents === false) {
			die("The provided locales dir '$parentDir' is not usable.");
		}

		$locales = array();

		foreach ($contents AS $item) {
			if ($item != '.' && $item != '..' && is_dir($parentDir . '/' .  $item)) {
				$locales[] = $item;
			}
		}

		return $locales;
	}

	/**
	 *
	 * @todo number format for locale http://www.php.net/manual/en/function.localeconv.php
	 *
	 * @param string $sourceFile
	 *
	 * @return string
	 */
	public function translate($sourceFile) {

		$sourceFile = realpath($sourceFile);
		if ($sourceFile === false) {
			die("source file $sourceFile no good.");
		}

		$data = $this->po2json($sourceFile);
		$data = json_decode($data, true);

		if (
			is_array($data)
			&&
			isset($data["messages"])
			&&
			isset($data["messages"][""])
		) {
			$headers = $data["messages"][""];

			$translations = $data["messages"];
			unset($translations[""]);

			$targetStructure = $this->getTargetStructure();

			$targetStructure->pluralForms = trim($headers["Plural-Forms"]);
			$targetStructure->translations = $translations;
			$targetStructure->template->pattern = $this->templatePattern;

			return $targetStructure;
		}
		else {
			die('The json encountered is odd.');
		}
	}

	/**
	 * Get translation json from po file
	 *
	 * @param string $poFile
	 *
	 * @return string
	 */
	protected function po2json($poFile) {

		$PO2JSON = realpath(dirname(__FILE__).'/../'.$this->PO2JSON);

		exec(
			sprintf('%s -p "%s" | cat',	$PO2JSON,	escapeshellcmd($poFile)),
			$output,
			$return
		);

		if ($return !== 0) {
			die("error converting po $poFile to json");
		}

		$output = implode("\n", $output);	// @todo ugly
		return $output;
	}

	protected function headerFormat($string) {
		$string = preg_replace('/[^\w]/', ' ', $string);
		$string = ucwords($string);
		$string = preg_replace('/\s+/', '', $string);
		return $string;
	}

	protected function getTargetStructure() {
		$structure = new stdClass();
		$structure->pluralForms = "";
		$structure->translations = new stdClass();

		return $structure;
	}

	protected function save($targetFile, $contents) {
		if (!file_put_contents($targetFile, $contents)) {
			die("Failed writing to target '$targetFile'.");
		}
	}
}
