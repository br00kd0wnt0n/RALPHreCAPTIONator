document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('captionForm');
    const toggleLanguageBtn = document.getElementById('toggleLanguage');
    const resultDiv = document.getElementById('result');
    const generatedCaptionDiv = document.getElementById('generatedCaption');
    let currentLanguage = 'en';

    toggleLanguageBtn.addEventListener('click', () => {
        currentLanguage = currentLanguage === 'en' ? 'ja' : 'en';
        toggleLanguageBtn.textContent = currentLanguage === 'en' ? 'Switch to Japanese' : 'Switch to English';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            draftCaption: document.getElementById('draftCaption').value,
            contentType: document.getElementById('contentType').value,
            contentTheme: document.getElementById('contentTheme').value,
            additionalNotes: document.getElementById('additionalNotes').value,
            language: currentLanguage
        };

        try {
            const response = await fetch('/api/generate-caption', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to generate caption');
            }

            const data = await response.json();
            generatedCaptionDiv.textContent = data.caption;
            resultDiv.classList.remove('hidden');
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate caption. Please try again.');
        }
    });
}); 
