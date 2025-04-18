// japanese_routes.js
// Express routes for Japanese caption generation

const express = require('express');
const router = express.Router();
const { generateJapaneseCaption, logJapaneseFeedback } = require('./japanese_caption_generator');

/**
 * Route for generating Japanese captions
 * POST /api/japanese-caption
 */
router.post('/api/japanese-caption', async (req, res) => {
  try {
    const { draftCaption, contentType, contentTheme, additionalNotes } = req.body;
    
    // Validate input
    if (!draftCaption) {
      return res.status(400).json({ 
        error: 'Draft caption is required' 
      });
    }
    
    // Generate the Japanese caption
    const generatedCaption = await generateJapaneseCaption(
      draftCaption,
      contentType || 'image',
      contentTheme || 'product',
      additionalNotes || ''
    );
    
    // Return the generated caption
    res.json({ 
      caption: generatedCaption,
      original: draftCaption,
      contentType,
      contentTheme
    });
  } catch (error) {
    console.error('Error in Japanese caption route:', error);
    res.status(500).json({ 
      error: 'Failed to generate Japanese caption',
      message: error.message
    });
  }
});

/**
 * Route for submitting feedback from Japanese team
 * POST /api/japanese-caption/feedback
 */
router.post('/api/japanese-caption/feedback', (req, res) => {
  try {
    const { originalDraft, generatedCaption, feedback, rating } = req.body;
    
    // Validate input
    if (!originalDraft || !generatedCaption || !feedback) {
      return res.status(400).json({ 
        error: 'Original draft, generated caption, and feedback are required' 
      });
    }
    
    // Log the feedback
    logJapaneseFeedback(
      originalDraft,
      generatedCaption,
      feedback,
      rating || '3'
    );
    
    res.json({ 
      success: true,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    console.error('Error in feedback route:', error);
    res.status(500).json({ 
      error: 'Failed to record feedback',
      message: error.message
    });
  }
});

module.exports = router;
