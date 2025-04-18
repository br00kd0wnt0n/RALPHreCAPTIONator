document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('captionForm');
    const toggleLanguageBtn = document.getElementById('toggleLanguage');
    const resultDiv = document.getElementById('result');
    const generatedCaptionDiv = document.getElementById('generatedCaption');
    let currentLanguage = 'en';

    // Language-specific labels
    const translations = {
        en: {
            title: 'Caption Generator',
            draftCaption: 'Draft Caption:',
            contentType: 'Content Type:',
            contentTheme: 'Content Theme:',
            additionalNotes: 'Additional Notes:',
            generateButton: 'Generate Caption',
            switchLanguage: 'Switch to Japanese',
            generatedCaption: 'Generated Caption',
            selectContentType: 'Select Content Type',
            selectContentTheme: 'Select Content Theme'
        },
        ja: {
            title: 'キャプション生成',
            draftCaption: 'ドラフト:',
            contentType: 'コンテンツタイプ:',
            contentTheme: 'コンテンツテーマ:',
            additionalNotes: '追加メモ:',
            generateButton: 'キャプションを生成',
            switchLanguage: '英語に切り替え',
            generatedCaption: '生成されたキャプション',
            selectContentType: 'コンテンツタイプを選択',
            selectContentTheme: 'コンテンツテーマを選択'
        }
    };

    // Function to update UI language
    function updateLanguage() {
        const t = translations[currentLanguage];
        document.querySelector('h1').textContent = t.title;
        document.querySelector('label[for="draftCaption"]').textContent = t.draftCaption;
        document.querySelector('label[for="contentType"]').textContent = t.contentType;
        document.querySelector('label[for="contentTheme"]').textContent = t.contentTheme;
        document.querySelector('label[for="additionalNotes"]').textContent = t.additionalNotes;
        document.querySelector('button[type="submit"]').textContent = t.generateButton;
        toggleLanguageBtn.textContent = t.switchLanguage;
        document.querySelector('#result h2').textContent = t.generatedCaption;
        
        // Update select options placeholder text
        document.querySelector('#contentType option[value=""]').textContent = t.selectContentType;
        document.querySelector('#contentTheme option[value=""]').textContent = t.selectContentTheme;
        
        // Toggle font for Japanese text
        document.body.classList.toggle('ja', currentLanguage === 'ja');
    }

    // Language toggle handler
    toggleLanguageBtn.addEventListener('click', () => {
        currentLanguage = currentLanguage === 'en' ? 'ja' : 'en';
        updateLanguage();
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

        console.log('Sending request with data:', formData);

        try {
            const response = await fetch('/api/generate-caption', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate caption');
            }

            generatedCaptionDiv.textContent = data.caption;
            resultDiv.classList.remove('hidden');
        } catch (error) {
            console.error('Error details:', error);
            alert(`Failed to generate caption: ${error.message}`);
        }
    });

    // Initialize language
    updateLanguage();
}); 
