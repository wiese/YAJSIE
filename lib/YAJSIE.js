/**
 * YAJSIE - Yet Another JavaScript I18N Engine
 *
 * Simple internationalization (i18n)
 */
var YAJSIE = Class.create({
	translationVariable: 'YAJSIE_data',
	translationFile: 'YAJSIE_data.js',
	locale: null,	// no default setting here - has to be specified on construct

	/**
	 * Constructor method
	 *
	 * @tutorial Pass an anonymous object to configure YAJSIE's behavior
	 *
	 * @example
	 * YAJSIE = new YAJSIE({file: 'YAJSIE_data.js', variable: 'YAJSIE_data'});
	 * actually equals the default setting - so no need to specify this as seen
	 *
	 * @param Object configObject Anonymous object used to pass settings
	 *
	 * @return void
	 */
	initialize: function(configObject) {

		this.applyConfigObject(configObject);

		if (this.translationFile !== null) {
			this.require(this.translationFile);
		}
	},

	/**
	 * Translate a singular message
	 *
	 * @example YAJSIE._('I am so english');	// 'I am so english' translated
	 * @example YAJSIE._('#a# + #b#', {a: 'lorem', 'b': 'ipsum'});	// 'lorem + ipsum'
	 *
	 * @param String message       message
	 * @param Object dataToReplace Anoymous object defining placeholders to replace
	 *
	 * @return string
	 */
	_: function(message, dataToReplace) {
		return this._n(message, null, null, dataToReplace);
	},

	_n: function(message1, message2, n, dataToReplace) {
		try {
			var translation = this.gettext(message1, message2, n);
		}
		catch (errorMessage) {
			this.debug(errorMessage);
			return message1;
		}

		return this.replaceData(translation, dataToReplace);
	},

	gettext: function(message1, message2, n) {

		var translation = this.getSetting('translations')[message1];

		if (Object.isUndefined(translation)) {	// no translation found
			throw new Error("Translation for '" + message1 + "' not found!");
		}

		if (Object.isString(translation)) {	// singular only
			if (Object.isString(message2)) {
				throw new Error("Plural Translation for '" + message1 + "' not defined!");
			}
			return translation;
		}
		else if (typeof translation == 'object') {	// plural
			if (
				Object.isUndefined(n)
				||
				!Object.isNumber(n)
			) {
				n = 1;
			}

			var pluralFormId = this.getPluralFormId(this.getSetting('pluralForms'), n);

			var id = "msgstr[" + pluralFormId + "]";

			var translationText = translation[id];

			if (Object.isUndefined(translation)) {
				throw new Error("Plural form '" + pluralFormId + "' not found for '" + message1 + "'");
			}
			else {
				return translationText;
			}
		}
		else {
			throw new Error('Translation format unknown');
		}
	},

	/**
	 * Get the plural from id to use for the given amount (n)
	 *
	 * @param string rule The rule configured for plural forms
	 * @param Number n    The amount
	 */
	getPluralFormId: function(rule, n) {

		var segments = rule.match(/nplurals=([\d]+);\s+plural=([^;]+);/i);

		if (
			segments === null
			||
			!Object.isString(segments[1])
			||
			!Object.isString(segments[2])
		) {
			throw new Error("The given rule '" + rule + "' could not be parsed successfully.");
		}

		var nPluralForms = segments[1];	// number of plural forms in the current textdomain
		var pluralRule = segments[2];	// rule determining which plural form to use

		var pluralExpression = "var n = " + n + "; (" + pluralRule + ");";

		try {
			var expressionResult = eval(pluralExpression);
		}
		catch (errorMessage) {
			throw new Error("Error evaluating plural rule '" + rule + "'.");
		}

		expressionResult = Number(expressionResult);	// make bool become int as well

		return expressionResult;
	},

	/**
	 * Replce placeholders in the given message by the data (key - value) given
	 *
	 * @param String message
	 * @param Object dataToReplace
	 *
	 * @return String
	 */
	replaceData: function(message, dataToReplace) {
		if (typeof dataToReplace !== 'object') {
			return message;
		}

		var templateSettings = this.getSetting('template');

		// /(^|.|\r|\n)(\<%=\s*(\w+)\s*%\>)/    => '<%= field %>'
		// /(^|.|\r|\n)(#\{(.*?)\})/	          => '#{field}'
		var pattern = /(^|.|\r|\n)(#(\w+)#)/;	// set default template pattern
		if (templateSettings !== null) {
			if (Object.isString(templateSettings.pattern)) {
				pattern = templateSettings.pattern;
			}
		}

		var template = new Template(message, pattern);

		return template.evaluate(dataToReplace);
	},

	debug: function(message) {
		console.warn(message);
	},

	/**
	 * Get the defined key from settings within the current locale setting
	 *
	 * @param String  key
	 * @param boolean ruthless Fire exception be if key not found - defaults true
	 *
	 * @return mixed Depending on what is the value of this key
	 */
	getSetting: function(key, ruthless) {
		var data = window[this.translationVariable];

		if (Object.isUndefined(data)) {
			throw "The configured variable '" + this.translationVariable + "' does not contain valid YAJSIE data.";
		}

		var localized = data[this.locale];

		if (Object.isUndefined(localized)) {
			throw "The configured locale setting '" + this.locale + "' is not defined in the given YAJSIE data.";
		}

		var value = localized[key];

		if (Object.isUndefined(localized[key])) {
			if (ruthless === false) {
				value = null;
			}
			else {
				throw "The key '" + key + "' is not defined!";
			}
		}

		return value;
	},

	checkLocale: function(locale) {
		var data = window[this.translationVariable];
		return !Object.isUndefined(data[locale]);
	},

	/**
	 * Load the specifies file into the current document
	 *
	 * @param String fileName
	 *
	 * @return void
	 */
	require: function(fileName) {
		// inserting via DOM fails in Safari 2.0, so brute force approach
		document.write('<script type="text/javascript" src="'+fileName+'"><\/script>');
	},

	/**
	 * Apply the config object provided to the constructor
	 *
	 * @param Object configObject
	 *
	 * @return void
	 */
	applyConfigObject: function(configObject) {
		if (!Object.isUndefined(configObject)) {
			if (Object.isString(configObject.file)) {
				this.translationFile = configObject.file;
			}
			else {
				// only if neither file nor variable given, keep the defaults
				if (Object.isString(configObject.variable)) {
					this.translationFile = null;	// no additional file for the translations
				}
			}

			if (Object.isString(configObject.variable)) {
				this.translationVariable = configObject.variable;
			}

			this.setLocale(configObject.locale);
		}
		else {
			throw new Error('You have to define at least the locale information');
		}
	},

	/**
	 * Set the desired (output) locale value
	 *
	 * @tutorial This can be compared to PHP's setlocale function - 2nd param only
	 *
	 * @example setLocale('de_DE')
	 *
	 * @param String locale
	 *
	 * @return self
	 */
	setLocale: function(locale) {
		if (!Object.isString(locale) || !this.checkLocale(locale)) {
			throw new Error("The required locale setting '" + locale + "' is not available.");
		}
		else {
			this.locale = locale;
		}

		return this;
	}
});
