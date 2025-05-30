let currentLanguage = 'en';
let translations = {};

// Initialize language system
export async function initLanguage() {
    try {
        // Get translations for current language
        const response = await fetch(`/api/translations?lang=${currentLanguage}`);
        const data = await response.json();
        translations = data.translations;
        
        // Update UI with translations
        updateUILanguage();
        
        // Set up language switcher
        setupLanguageSwitcher();
    } catch (error) {
        console.error('Error initializing language system:', error);
    }
}

// Update UI elements with current language translations
export function updateUILanguage() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });

    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            element.placeholder = translations[key];
        }
    });

    // Update HTML lang attribute
    document.documentElement.lang = currentLanguage;
}

// Set up language switcher buttons
export function setupLanguageSwitcher() {
    document.querySelectorAll('[data-lang]').forEach(button => {
        button.addEventListener('click', async () => {
            const newLang = button.getAttribute('data-lang');
            if (newLang !== currentLanguage) {
                // Update active state
                document.querySelectorAll('[data-lang]').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');

                // Update language
                currentLanguage = newLang;
                await initLanguage();
            }
        });
    });
}

// Get translation for a key
export function getTranslation(key) {
    return translations[key] || key;
}

// Initialize language system when DOM is loaded (if not imported as a module)
if (typeof module === "undefined") {
  document.addEventListener("DOMContentLoaded", initLanguage);
}

export function updateI18nTexts(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang] && translations[lang][key]) {
      el.placeholder = translations[lang][key];
    }
  });
} 