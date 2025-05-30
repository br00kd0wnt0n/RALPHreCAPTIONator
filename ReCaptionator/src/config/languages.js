const translations = {
  en: {
    // Main UI
    title: "ReCAPTIONator",
    subtitle: "Korean Air Japan Edition ✈️",
    footer: "Powered by Korean Air Japan's authentic voice patterns • Built with ❤️ for better social copy",
    
    // Form Labels
    "form.caption.label": "Original Caption",
    "form.caption.placeholder": "Write / paste caption copy here",
    "form.contentType.label": "Content Type",
    "form.contentType.promotion": "Promotion",
    "form.contentType.announcement": "Announcement",
    "form.contentType.event": "Event",
    "form.contentType.general": "General",
    "form.context.label": "Additional Context (Optional)",
    "form.context.placeholder": "Any specific requirements or campaign context...",
    "form.submit": "Rewrite Caption",
    
    // Results
    "results.title": "✨ Rewritten Caption",
    "results.caption": "New Caption:",
    "results.explanation": "Explanation:",
    "results.styleAnalysis": "Style Analysis:",
    "results.waiting": "Waiting for your caption...",
    "results.waitingExplanation": "Your explanation will appear here...",
    "results.waitingAnalysis": "Style analysis will be shown here...",
    "results.stats.avgLength": "Avg Length",
    "results.stats.commonEmojis": "Common Emojis",
    "results.stats.commonHashtags": "Common Hashtags",
    
    // Loading
    "loading": "Processing your caption...",
    
    // Admin Panel
    "admin.title": "Prompt Manager",
    "admin.subtitle": "Customize AI Behavior ✈️",
    "admin.backToMain": "← Back to ReCAPTIONator",
    "admin.systemPrompt.label": "System Prompt:",
    "admin.systemPrompt.placeholder": "Enter the system prompt that defines AI behavior...",
    "admin.userPrompt.label": "User Prompt:",
    "admin.userPrompt.placeholder": "Enter the user prompt template...",
    "admin.save": "💾 Save Changes",
    "admin.reset": "🔄 Reset to Defaults",
    
    // Status Messages
    "admin.saveSuccess": "Changes saved successfully!",
    "admin.resetSuccess": "Prompts reset to defaults!",
    "admin.errorSaving": "Error saving changes. Please try again.",
    "admin.errorResetting": "Error resetting prompts. Please try again.",
    "admin.errorLoading": "Error loading prompts. Please refresh the page."
  },
  
  ja: {
    // Main UI
    title: "ReCAPTIONator",
    subtitle: "大韓航空日本版 ✈️",
    footer: "大韓航空の本物の声パターンで提供 • より良いソーシャルコピーのために作られました",
    
    // Form Labels
    "form.caption.label": "元のキャプション",
    "form.caption.placeholder": "ここにキャプションを入力または貼り付けてください",
    "form.contentType.label": "コンテンツタイプ",
    "form.contentType.promotion": "プロモーション",
    "form.contentType.announcement": "お知らせ",
    "form.contentType.event": "イベント",
    "form.contentType.general": "一般",
    "form.context.label": "追加コンテキスト（任意）",
    "form.context.placeholder": "特定の要件やキャンペーンコンテキスト...",
    "form.submit": "キャプションを書き直す",
    
    // Results
    "results.title": "✨ 書き直されたキャプション",
    "results.caption": "新しいキャプション:",
    "results.explanation": "説明:",
    "results.styleAnalysis": "スタイル分析:",
    "results.waiting": "キャプションを入力してください...",
    "results.waitingExplanation": "説明はここに表示されます...",
    "results.waitingAnalysis": "スタイル分析はここに表示されます...",
    "results.stats.avgLength": "平均文字数",
    "results.stats.commonEmojis": "よく使う絵文字",
    "results.stats.commonHashtags": "よく使うハッシュタグ",
    
    // Loading
    "loading": "キャプションを処理中...",
    
    // Admin Panel
    "admin.title": "プロンプト管理",
    "admin.subtitle": "AIの動作をカスタマイズ ✈️",
    "admin.backToMain": "← ReCAPTIONatorに戻る",
    "admin.systemPrompt.label": "システムプロンプト:",
    "admin.systemPrompt.placeholder": "AIの動作を定義するシステムプロンプトを入力...",
    "admin.userPrompt.label": "ユーザープロンプト:",
    "admin.userPrompt.placeholder": "ユーザープロンプトテンプレートを入力...",
    "admin.save": "💾 変更を保存",
    "admin.reset": "🔄 デフォルトに戻す",
    
    // Status Messages
    "admin.saveSuccess": "変更が正常に保存されました！",
    "admin.resetSuccess": "プロンプトがデフォルトにリセットされました！",
    "admin.errorSaving": "変更の保存中にエラーが発生しました。もう一度お試しください。",
    "admin.errorResetting": "プロンプトのリセット中にエラーが発生しました。もう一度お試しください。",
    "admin.errorLoading": "プロンプトの読み込み中にエラーが発生しました。ページを更新してください。"
  }
};

// Get translation for a key in the current language
const getTranslation = (key, lang = 'en') => {
  const langTranslations = translations[lang] || translations.en;
  return langTranslations[key] || key;
};

// Get all translations for a specific language
const getLanguageTranslations = (lang = 'en') => {
  return translations[lang] || translations.en;
};

module.exports = {
  getTranslation,
  getLanguageTranslations,
  availableLanguages: Object.keys(translations)
}; 