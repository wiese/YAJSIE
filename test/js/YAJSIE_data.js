{
	'config': {
		"template": {
			"pattern": "(^|.|\\r|\\n)(#(\\w+)#)"
		}
	},
	'locales': {
		'de_DE' : {
			"pluralForms": "nplurals=2; plural=n != 1;",
			"translations": {
				"first": [
					null,
					"erster"
				],
				"second ": [
					null,
					"zweiter ",
				],
				"  third": [
					null,
					"  dritter",
				],
				"i am #name#": [
					null,
					"ich bin #name#"
				],
				"another #n# times": [
					"one more time",
					"noch einmal",
					"noch #n# mal"
				]
			}
		},
		'ru_RU' : {
			"pluralForms": "nplurals=3; plural=n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2;",
			"translations": {
				"File": [
					"Files",
					"Файл",
					"Файла",
					"Файлов"
				]
			}
		}
	}
}
