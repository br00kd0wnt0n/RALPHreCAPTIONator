const express = require('express');
const router = express.Router();
const { recaption } = require('../controllers/recaptionController');
const { getPrompts, updatePrompts } = require('../controllers/promptController');
const { getTranslations } = require('../controllers/languageController');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', tool: "Ralph's Re-Caption-ator (tm)" });
});

// Main re-captioning endpoint
router.post('/recaption', recaption);

// Prompt management endpoints
router.get('/prompts', getPrompts);
router.put('/prompts', updatePrompts);

// Language endpoints
router.get('/translations', getTranslations);

module.exports = router; 