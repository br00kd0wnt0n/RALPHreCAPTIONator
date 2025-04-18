// japanese_prompt_template.js
// This file defines the prompt template for generating Japanese social media captions

/**
 * Creates a structured prompt for the OpenAI API to generate Japanese social media captions
 * based on client's style, incorporating example captions and input parameters
 * 
 * @param {string} draftCaption - The draft caption or post description (can be in English or Japanese)
 * @param {string} contentType - The type of content (image, video, carousel, etc.)
 * @param {string} contentTheme - The theme or topic of the content
 * @param {string} additionalNotes - Any additional requirements or notes
 * @param {Array<string>} exampleCaptions - Array of example captions from the client
 * @returns {Object} - The structured prompt object for the OpenAI API
 */
function createJapaneseCaptionPrompt(draftCaption, contentType, contentTheme, additionalNotes, exampleCaptions) {
  // Select a subset of examples to prevent token overflow
  // Use a maximum of 6 examples, prioritizing more recent/relevant ones
  const maxExamples = 6;
  const selectedExamples = exampleCaptions.slice(0, maxExamples);
  const formattedExamples = selectedExamples.map((caption, index) => 
    `例 ${index + 1}:\n${caption}`
  ).join('\n\n');

  // System instructions focused on Japanese caption generation
  const systemContent = `
あなたは日本の企業のためのソーシャルメディアキャプションのスペシャリストです。
クライアントの独自のブランドの声と文体を正確に再現し、自然で魅力的な日本語のキャプションを作成します。

以下の例を分析して、クライアントの文体を理解してください：

${formattedExamples}

これらの例を分析する際は、以下の特徴に注目してください：

1. 言語構造
   - 文末表現パターン（〜です、〜ます、〜だ、など）
   - 疑問文の構造と修辞的な質問
   - 文の長さと完全な文と文の断片の使用
   - 改行やフォーマットのパターン

2. 敬語レベル
   - 聴衆に対する敬語や丁寧語の使用
   - プロフェッショナルとカジュアルなトーンのバランス

3. 文字使用
   - 漢字、ひらがな、カタカナのバランス
   - 英語の外来語や外国語のフレーズの使用
   - ローマ字の使用とその様式的目的
   - 半角と全角文字の選択

4. 絵文字と記号パターン
   - 絵文字の頻度、配置、種類（文の始め、中間、終わり）
   - 日本特有の絵文字使用（例：🙇‍♀️, 🎐, 🎋）
   - 装飾的な記号（★, ♪, 〜など）とそのパターン
   - 顔文字（^_^）や（＼(^o^)／）などの使用

5. ハッシュタグの慣例
   - ハッシュタグの言語選択（日本語 vs 英語）
   - ハッシュタグの配置（テキストに統合、または最後にグループ化）
   - ブランド固有のハッシュタグとキャンペーンタグ
   - 一般的に使用されるハッシュタグの数

これらの特徴に基づいて、クライアントの文体を正確に再現した新しいキャプションを作成してください。`;

  // User prompt with the specific request
  const userContent = `
以下のドラフトキャプションをクライアントの文体に合わせて書き直してください：

ドラフト: ${draftCaption}

コンテンツタイプ: ${contentType}
コンテンツテーマ: ${contentTheme}
追加要件: ${additionalNotes}

クライアントの文体を維持しながら、元のメッセージの本質を伝える魅力的なキャプションを作成してください。`;

  // Return the structured prompt for the OpenAI API
  return {
    messages: [
      {
        role: "system",
        content: systemContent
      },
      {
        role: "user",
        content: userContent
      }
    ],
    temperature: 0.7,
    max_tokens: 800
  };
}

module.exports = { createJapaneseCaptionPrompt };
