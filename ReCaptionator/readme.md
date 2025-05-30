# Ralph's Re-Caption-ator 
### Korean Air Japan Edition ✈️

A specialized AI-powered tool that rewrites agency social media captions to match Korean Air Japan's authentic voice and style, based on a year's worth of their actual tweets.

## 🎯 What Ralph Does

Ralph analyzes Korean Air Japan's historical social media posts to understand their unique voice, then rewrites your agency copy to match their style perfectly. No more back-and-forth revisions!

**Key Features:**
- 🔄 Rewrites captions in Korean Air Japan's authentic voice
- 📊 Analyzes style patterns from 140+ historical tweets
- 💡 Provides explanations of what was changed and why
- 🎨 Beautiful, airline-themed interface
- ⚡ Fast API responses optimized for agency workflows

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- OpenAI API key
- Korean Air Japan tweet data (CSV format)

### Installation

1. **Clone and install:**
```bash
git clone [your-repo]
cd ralphs-recaptionator
npm install
```

2. **Environment setup:**
```bash
cp .env.example .env
# Add your OpenAI API key to .env
```

3. **Add Korean Air data:**
```bash
# Rename your CSV file to: korean_air_tweets.csv
# Make sure it has a 'text' column with the tweet content
```

4. **Run Ralph:**
```bash
npm run dev  # Development
npm start    # Production
```

Visit `http://localhost:3000` to start re-captioning!

## 📊 CSV Data Format

Your Korean Air Japan tweet data should be in CSV format with at minimum:

```csv
text
"First tweet content here..."
"Second tweet content here..."
```

The system will automatically:
- Extract style patterns (hashtags, emojis, tone)
- Analyze sentence structure and vocabulary
- Calculate average lengths and common phrases
- Build a style profile for rewriting

## 🔧 API Usage

### POST `/api/recaption`

Rewrite a caption in Korean Air Japan's style:

```javascript
{
  "originalCaption": "Check out our amazing new flight deals!",
  "contentType": "tweet",
  "additionalNotes": "Emphasis on premium service"
}
```

**Response:**
```javascript
{
  "originalCaption": "Check out our amazing new flight deals!",
  "rewrittenCaption": "Experience exceptional value with Korean Air's latest offers ✈️ #FlyKoreanAir",
  "explanation": "Changed 'amazing' to 'exceptional value' to match KAL's premium positioning...",
  "styleAnalysis": {
    "avgLength": 87,
    "commonEmojis": ["✈️", "🌸", "🇯🇵"],
    "commonHashtags": ["#FlyKoreanAir", "#Premium"]
  },
  "ralphSays": "Caption successfully re-captioned! ✈️"
}
```

## 🎨 Features

### Smart Style Analysis
- Analyzes hashtag patterns and frequency
- Identifies emoji usage and placement
- Extracts common phrases and vocabulary
- Understands tone and brand voice

### Intelligent Rewriting
- Maintains core message while changing style
- Incorporates authentic Korean Air Japan phrases
- Adjusts length and structure appropriately
- Preserves important details (dates, locations, etc.)

### Agency-Friendly Interface
- Clean, professional design
- Mobile-responsive layout
- One-click copy functionality
- Export options for campaign management

## 🔄 Development with Cursor AI

This codebase is optimized for Cursor AI development:

1. **Well-commented code** for easy AI understanding
2. **Modular structure** for simple modifications
3. **Clear variable names** and function purposes
4. **Comprehensive error handling**
5. **Extensible architecture** for new features

### Suggested Cursor AI Enhancements:
- Add semantic similarity search for better tweet selection
- Implement caption history and favorites
- Add batch processing for multiple captions
- Create A/B testing functionality
- Add integration with social media scheduling tools

## 🛠️ Technical Stack

- **Backend:** Node.js + Express
- **AI:** OpenAI GPT-4
- **Data Processing:** CSV parsing with pattern analysis
- **Frontend:** Vanilla JS with modern CSS
- **Deployment:** Railway-ready with Docker support

## 📈 Performance

- **Response Time:** < 3 seconds typical
- **Accuracy:** Based on 140+ Korean Air Japan tweets
- **Reliability:** Built-in error handling and fallbacks
- **Scalability:** Stateless design, easy to scale

## 🎪 Why "Ralph"?

Ralph is your friendly AI assistant who's spent countless hours studying Korean Air Japan's social media presence. He's got their voice down to a science and loves helping agencies create authentic, on-brand content that clients actually approve of!

## 📝 License

MIT License - Feel free to customize Ralph for your agency's needs!

---

**Ready to let Ralph work his magic?** 🪄

Deploy, add your Korean Air data, and watch those revision rounds disappear!
