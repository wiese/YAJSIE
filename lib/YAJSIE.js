/**
 * YAJSIE - Yet Another JavaScript I18N Engine
 *
 * Simple internationalization (i18n) based on your existing PHP po-file i18n
 */
var YAJSIE = Class.create({
	data: null,
	dataLoaded: false,
	dataLoadingProblems: null,
	translationFile: 'YAJSIE_data.js',
	locale: null,	// no default setting here - has to be specified on construct
	_debug: Array(),

	/**
	 * Constructor method
	 *
	 * @tutorial Pass an anonymous object to configure YAJSIE's behavior
	 *
	 * @example YAJSIE = new YAJSIE('de_DE');
	 *
	 * @param string locale       The locale to use from the start
	 * @param object configObject Anonymous object used to pass further settings
	 *
	 * @return void
	 */
	initialize: function(locale, configObject) {

		if (Object.isUndefined(locale)) {
			throw new Error('You have to define at least the locale information.');
		}

		this.applyConfig(configObject);

		if (!this.dataLoaded) {
			this.loadData();
		}

		if (this.dataLoadingProblems !== null) {
			throw this.dataLoadingProblems;
		}

		this.setLocale(locale);
	},

	/**
	 * Translate a singular message
	 *
	 * @example YAJSIE._('I am so english');	// 'I am so english' translated
	 * @example YAJSIE._('#a# and #b#', {a: 'me', 'b': 'you'});	// 'me and you'
	 *
	 * @param string message       message
	 * @param object dataToReplace Anonymous object with placeholders to replace
	 *
	 * @return string
	 */
	_: function(message, dataToReplace) {
		return this._n(message, null, null, dataToReplace);
	},

	/**
	 * Translate plural message(s)
	 *
	 * @example YAJSIE._('File', 'Files', 5);
	 *
	 * @return string
	 */
	_n: function(message1, message2, n, dataToReplace) {
		var toReplace;
		try {
			toReplace = this.gettext(message1, message2, n);
		}
		catch (errorMessage) {
			this.debug(errorMessage);
			toReplace = message1;	// making sure we replace even if translation failed
		}

		return this.replaceData(toReplace, dataToReplace);
	},

	/**
	 * Translate a message making sure to return right plural form depending on n
	 *
	 * @example gettext('flower', 'flowers', 5);	// 'flowers' translated
	 *
	 * @param string message1 Message singular (english singluar)
	 * @param string message2 Message plural (english plural)
	 * @param number n        Number of items implying chosen message version
	 *
	 * @return string
	 */
	gettext: function(message1, message2, n) {

		var translation = this.getLocalSetting('translations')[message1];

		if (Object.isUndefined(translation)) {	// no translation found
			throw new Error("Translation for '" + message1 + "' not found!");
		}

		if (
			!Object.isArray(translation)
			||
			(
				Object.isArray(translation)
				&&
				translation.length < 2
			)
		) {
			throw new Error("Translation(s) for '" + message1 + "' corrupt!");
		}

		if (
			translation.length === 2 && translation[0] === null	// singular only
			&&
			Object.isString(message2)	// but asking for plural translation
		) {
			throw new Error("Plural Translation for '" + message1 + "' not defined!");
		}

		if (Object.isUndefined(n)	|| !Object.isNumber(n)) {
			n = 1;	// make default to 1 if no amount specified
		}

		var pluralIndex = this.getPluralFormId(this.getLocalSetting('pluralForms'), n);

		var translationText = translation[pluralIndex];

		if (Object.isUndefined(translationText)) {
			throw new Error("Plural form '" + pluralIndex + "' not found for '" + message1 + "'");
		}
		else {
			return translationText;
		}
	},

	/**
	 * Get the plural from id to use for the given amount (n)
	 *
	 * @param string rule The rule configured for plural forms
	 * @param number n    The amount
	 *
	 * @return number
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
			throw new Error(
				"The given plural rule '" + rule + "' could not be parsed successfully."
			);
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

		expressionResult++;	// key 0 represents the untranslated plural form - skip

		return expressionResult;
	},

	/**
	 * Replace placeholders in the given message by the data (key - value) given
	 *
	 * @param string message
	 * @param object dataToReplace
	 *
	 * @return string
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

	/**
	 * Get the local setting by the name 'key'
	 *
	 * @param string key      The name of the value to return
	 * @param bool   ruthless Should an extension be thrown on failure to find key
	 *
	 * @return mixed
	 */
	getLocalSetting: function(key, ruthless) {
		var data = this.getData();
		var localized = data.locales[this.locale];
		var value = localized[key];

		if (Object.isUndefined(localized[key])) {
			if (ruthless === false) {
				value = null;
			}
			else {
				throw new Error("The locale setting '" + key + "' is not defined!");
			}
		}

		return value;
	},

	/**
	 * Get the defined key from settings within the current locale setting
	 *
	 * @param string key
	 * @param bool   ruthless Fire exception if key not found - defaults to true
	 *
	 * @return mixed Depending on what is the value of this key
	 */
	getSetting: function(key, ruthless) {

		var data = this.getData();
		var config = data.config;

		var value = config[key];

		if (Object.isUndefined(value)) {
			if (ruthless === false) {
				value = null;
			}
			else {
				throw new Error("The key '" + key + "' is not defined!");
			}
		}

		return value;
	},

	/**
	 * Check if given locale is supported
	 *
	 * @param string locale The locale to test for
	 *
	 * @return bool
	 */
	checkLocale: function(locale) {
		var data = this.getData();
		return !Object.isUndefined(data.locales[locale]);
	},

	/**
	 * Apply the config object provided to the constructor
	 *
	 * @param object configObject
	 *
	 * @return void
	 */
	applyConfig: function(configObject) {
		if (!Object.isUndefined(configObject)) {
			if (!Object.isUndefined(configObject.variable)) {
				this.setDataFromVar(configObject.variable);
			}
			else if (Object.isString(configObject.file)) {	// either from variable or file
				this.translationFile = configObject.file;
			}
		}
	},

	/**
	 * Set the data object from a given variable
	 *
	 * @param Object variable The variable to populate the 'data' member with
	 *
	 * @return void
	 */
	setDataFromVar: function(variable) {
		if (!this.validateData(variable)) {
			throw new Error(
				"The given 'variable' does not contain usable YEJSIE data."
			);
		}

		this.data = variable;
		this.dataLoaded = true;
	},

	/**
	 * Set the desired (output) locale value
	 *
	 * @tutorial This can be compared to PHP's setlocale function - 2nd param only
	 *
	 * @example setLocale('de_DE')
	 *
	 * @param string locale The locale to use from now on
	 *
	 * @return self
	 */
	setLocale: function(locale) {
		if (!Object.isString(locale) || !this.checkLocale(locale)) {
			throw new Error(
				"The required locale setting '" + locale + "' is not available."
			);
		}
		else {
			this.locale = locale;
		}

		return this;
	},

	/**
	 * Load (configuration and translation) data from external file
	 *
	 * @uses this.translationFile
	 *
	 * @return void
	 */
	loadData: function() {

		if (this.dataLoaded) {
			throw new Error("Loading of data should happen only once.");
		}

		new Ajax.Request(this.translationFile, {
			method: 'get',
			asynchronous: false,	// seriously! others may rely on us being first
			contentType: 'application/json',
			evalJSON: 'force',
			onSuccess: function(transport) {
				var data = transport.responseJSON;

				if (!this.validateData(data)) {
					this.dataLoadingProblems = new Error(	// can't throw asynchronously
						"YAJSIE data loaded from external file '" + this.translationFile +
						"', but found corrupt data."
					);
					return false;
				}

				this.data = data;
				this.dataLoaded = true;
			}.bind(this),
			onFailure: function() {
				this.dataLoadingProblems = new Error(	// can't throw asynchronously
					"Failed loading YAJSIE data from external file '" +
					this.translationFile + "'."
				);
			}.bind(this)
		});
	},

	/**
	 * Get the data
	 *
	 * @return object
	 */
	getData: function() {
		if (this.dataLoaded) {
			return this.data;
		}

		throw new Error(
			"Wait a minute, how did you get here? Tried to access unloaded data."
		);
	},

	/**
	 * Validate the data object
	 *
	 * @return bool
	 */
	validateData: function(data) {
		return (
			!Object.isUndefined(data)
			&&
			!Object.isUndefined(data.config)
			&&
			!Object.isUndefined(data.config.template)
			&&
			Object.isString(data.config.template.pattern)
			&&
			!Object.isUndefined(data.locales)
		);
	},

	debug: function(message) {
		this._debug.push(message);
	},

	getDebug: function() {
		return this._debug;
	}
});
