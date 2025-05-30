const { getLanguageTranslations, availableLanguages } = require('../config/languages');

const getTranslations = (req, res) => {
  try {
    const lang = req.query.lang || 'en';
    const translations = getLanguageTranslations(lang);
    res.json({
      translations,
      currentLanguage: lang,
      availableLanguages
    });
  } catch (error) {
    console.error('Error fetching translations:', error);
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
};

module.exports = {
  getTranslations
}; 