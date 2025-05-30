import { getTranslation } from './i18n.js';
import { updateUILanguage, setupLanguageSwitcher, initLanguage } from './i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
    const promptForm = document.getElementById('promptForm');
    const statusMessage = document.getElementById('statusMessage');

    // Load current prompts
    async function loadPrompts() {
        try {
            const response = await fetch('/api/prompts');
            const data = await response.json();
            
            document.getElementById('systemPrompt').value = data.systemPrompt;
            document.getElementById('userPrompt').value = data.userPrompt;
            if (data.version) {
                document.getElementById('promptVersion').textContent = data.version;
            }
            if (data.lastModified) {
                document.getElementById('promptLastModified').textContent = new Date(data.lastModified).toLocaleString();
            }
        } catch (error) {
            showStatus(getTranslation('admin.error.loading'), 'danger');
        }
    }

    // Show status message
    function showStatus(message, type = 'success') {
        statusMessage.textContent = message;
        statusMessage.className = `alert alert-${type} mt-4`;
        statusMessage.classList.remove('d-none');
        
        // Hide message after 5 seconds
        setTimeout(() => {
            statusMessage.classList.add('d-none');
        }, 5000);
    }

    // Handle form submission
    promptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const systemPrompt = document.getElementById('systemPrompt').value;
        const userPrompt = document.getElementById('userPrompt').value;

        try {
            const response = await fetch('/api/prompts', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ systemPrompt, userPrompt })
            });

            if (response.ok) {
                showStatus(getTranslation('admin.success.saved'));
                await loadPrompts();
            } else {
                throw new Error('Failed to save prompts');
            }
        } catch (error) {
            showStatus(getTranslation('admin.error.saving'), 'danger');
        }
    });

    // Initial load of prompts
    await loadPrompts();

    initLanguage();
}); 