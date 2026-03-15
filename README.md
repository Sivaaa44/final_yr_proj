# भारत लीगल सहायता | Bharat Legal Sahayta

A modern, AI-powered legal assistant web application designed for rural Indian users. Built with React, TypeScript, Tailwind CSS, and Google Gemini API.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone or download this repository**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Add your API keys (or leave empty to use fallback responses and mock citations):
     ```
     VITE_GEMINI_API_KEY=
     VITE_KANOON_TOKEN=
     ```
   - **Note:** The app works without API keys: it uses intentional fallback guidance and mock legal citations for the demo. If `.env` was ever committed, rotate API keys after cloning.

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to `http://localhost:5173` (or the port shown in terminal)

## 🔑 Getting a Free Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in your `.env` file

**Free tier includes:** 15 requests per minute, generous monthly quota

## 🔑 Getting a Kanoon API Token

1. Visit [Kanoon API](https://api.kanoon.ir) or contact Kanoon for API access
2. Get your Bearer token
3. Add it to your `.env` file as `VITE_KANOON_TOKEN`

**Note:** The app works without Kanoon token, but will provide more accurate responses with real legal data when available.

## ✨ Features

- **Multi-language Support:** 9 Indian languages (Hindi, English, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam)
- **Auto Language Detection:** Automatically detects user's message language and replies in the same language
- **AI-Powered Chat:** Google Gemini integration for intelligent legal guidance
- **Real Legal Database:** Kanoon API integration for authentic Indian case laws and acts
- **Source Citations:** View actual legal sections and case names from Kanoon database
- **Voice Input/Output:** Web Speech API for hands-free interaction
- **Document Upload:** Upload images/PDFs for document analysis
- **Dark Mode:** Toggle between light and dark themes
- **Mobile Responsive:** Optimized for mobile devices
- **Offline Fallback:** Works without API keys using smart fallback responses

## 🛠️ Tech Stack

- **Vite** - Fast build tool
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Gemini API** - AI responses
- **Web Speech API** - Voice input/output

## 📱 Usage

1. **Select Language:** Choose your preferred language from the dropdown
2. **Start Chat:** Click "चैट शुरू करें" (Start Chat)
3. **Ask Questions:** Type or use voice input to ask legal questions
4. **Upload Documents:** Click the paperclip icon to upload documents
5. **Sample Questions:** Click on sample question chips for quick queries

## 🎨 Design Philosophy

- Clean, modern UI inspired by Google, PhonePe, and Bharat BillPay
- Calm, trusted colors (soft blue, light gray, white)
- Large, readable text for rural users
- High contrast for accessibility
- Thumb-friendly mobile interface

## 📝 Sample Legal Topics Covered

- FIR filing process (how to file – Q&A)
- RTI application (wizard: file an RTI with a public authority)
- Domestic violence support
- Land disputes
- Dowry-related issues
- Unpaid wages
- General legal guidance

## ⚠️ Disclaimer

This is an AI assistant for informational purposes only. For final legal advice, please consult a qualified lawyer.

## 🏗️ Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## 📄 License

This project is created for educational/demo purposes.

## 🤝 Support

For issues or questions, please check the code comments or create an issue in the repository.

---

**Built with ❤️ for rural India**

