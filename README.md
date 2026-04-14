# 🎓 Cuemath AI Tutor Screener

[![Live Demo](https://img.shields.io/badge/Live_Demo-https://tutor--screener--pi.vercel.app-4CAF50?style=for-the-badge&logo=vercel&logoColor=white)](https://tutor-screener-pi.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Groq](https://img.shields.io/badge/Groq-API-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)

## 📋 Problem Statement (Cuemath Build Challenge - Problem 3)

Cuemath hires hundreds of tutors monthly. Currently, human interviewers conduct 10-minute screening calls, which is **expensive, slow, and hard to scale**.

**The Challenge:** Build an AI interviewer that conducts a short voice conversation with a tutor candidate, asks relevant questions, and assesses whether they should move to the next round.

**Key Focus Areas:**
- Communication clarity
- Patience and warmth
- Ability to explain simply
- English fluency
- Teaching temperament

## ✨ Features

### Core Requirements (All Met ✅)
- 🎤 **Voice Conversation** - Candidate speaks, AI listens (Web Speech API)
- 🔊 **AI Voice Output** - AI responds verbally (Speech Synthesis)
- 💬 **Natural Conversation** - Context-aware, adaptive follow-ups
- 📊 **5-Dimension Assessment** - Scores (1-10) with detailed feedback
- 📄 **Downloadable Report Card** - Save assessment results
- 📋 **Interview History** - All past interviews saved locally
- ⏱️ **15-Minute Timer** - Realistic interview duration
- 📈 **Progress Tracking** - Visual progress indicator

### Extra Features (Added Value)
- 🗑️ **Delete History** - Manage past interviews
- 👁️ **View Past Interviews** - Review conversation history
- 🔄 **Auto-End on Request** - Candidate can end interview anytime
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🛡️ **Error Handling** - Retry logic and graceful degradation

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **AI Model** | Groq API (Llama 3.3 70B) |
| **Voice Input** | Web Speech API |
| **Voice Output** | Speech Synthesis API |
| **Styling** | CSS-in-JS |
| **Deployment** | Vercel |
| **State Management** | React Hooks + localStorage |

## 🚀 Live Demo

**URL:** [https://tutor-screener-pi.vercel.app/](https://tutor-screener-pi.vercel.app/)

### Try It Yourself:
1. Enter your name
2. Click "Start Interview"
3. Answer questions via **voice** (microphone) or **typing**
4. AI will respond verbally and ask follow-ups
5. Complete the interview to get your **assessment report**

## 📊 Assessment Rubric

| Dimension | What It Measures |
|-----------|------------------|
| **Communication** | Clarity of expression, ability to articulate ideas |
| **Patience** | Staying calm, handling difficult situations |
| **Simplicity** | Breaking down complex concepts |
| **Fluency** | English language flow and vocabulary |
| **Temperament** | Warmth, enthusiasm, attitude toward teaching |

## 🏗️ Architecture
┌─────────────────────────────────────────────────────────────┐
│ Browser │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│ │ Voice Input │ │ Text Input │ │ Speech Output │ │
│ │ (Web Speech)│ │ │ │ (Speech Synthesis) │ │
│ └──────┬──────┘ └──────┬──────┘ └──────────┬──────────┘ │
│ │ │ │ │
│ └────────────────┼────────────────────┘ │
│ │ │
│ ┌──────▼──────┐ │
│ │ Next.js │ │
│ │ Frontend │ │
│ └──────┬──────┘ │
└──────────────────────────┼──────────────────────────────────┘
│ API Calls
┌──────▼──────┐
│ Next.js │
│ API Routes │
└──────┬──────┘
│
┌──────▼──────┐
│ Groq API │
│ (Llama 3.3) │
└─────────────┘

text

## 💻 Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Setup Instructions

```bash
# Clone the repository
git clone https://github.com/Dutta-Raj/tutor-screener.git
cd tutor-screener

# Install dependencies
npm install

# Create environment file
echo "GROQ_API_KEY=your_api_key_here" > .env.local

# Run development server
npm run dev
