const prompts = require('../config/prompts');

const getPrompts = (req, res) => {
  try {
    const currentPrompts = prompts.getPrompts();
    res.json(currentPrompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
};

const updatePrompts = (req, res) => {
  try {
    const { systemPrompt, userPrompt } = req.body;
    
    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({ error: 'Both system and user prompts are required' });
    }

    const updatedPrompts = prompts.updatePrompts({ systemPrompt, userPrompt });
    res.json(updatedPrompts);
  } catch (error) {
    console.error('Error updating prompts:', error);
    res.status(500).json({ error: 'Failed to update prompts' });
  }
};

module.exports = {
  getPrompts,
  updatePrompts
}; 