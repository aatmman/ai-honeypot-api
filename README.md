# 🕵️ Agentic Honeypot API

An intelligent AI-powered honeypot system that engages scammers in realistic conversations to extract intelligence (phone numbers, bank accounts, UPI IDs, phishing links).

Built for the **India AI Impact Buildathon** (Problem Statement 2: AI for Fraud Detection & User Safety).

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Stage State Machine** | Adapts responses based on scam progression (HOOK → TRUST → PAYMENT → CLOSING) |
| ⏳ **Typing Delay Simulation** | 1-3 second realistic delays for human-like responses |
| 🎭 **Multi-Persona System** | 4 victim personalities (Elderly, Young, Skeptical, Worried Parent) |
| 📊 **Confidence-Weighted Intel** | Each extracted entity has confidence score + timestamp |

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables
```bash
# PowerShell
$env:GROQ_API_KEY = "your_groq_api_key"
$env:API_KEY_SECRET = "your_secret_key"

# Linux/Mac
export GROQ_API_KEY="your_groq_api_key"
export API_KEY_SECRET="your_secret_key"
```

### 3. Run Server
```bash
python main.py
```

Server runs at `http://localhost:8000`

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/honeypot` | POST | Main conversation handler |
| `/health` | GET | Health check with feature status |
| `/api/sessions` | GET | List all active sessions |
| `/api/session/{id}` | GET | Get specific session data |

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Free API key from [console.groq.com](https://console.groq.com) |
| `API_KEY_SECRET` | Yes | Secret key for API authentication |

## 📦 Deployment (Railway)

1. Push to GitHub
2. Connect repo to [Railway](https://railway.app)
3. Add environment variables
4. Deploy! ✅

## 🛡️ Tech Stack

- **Framework**: FastAPI
- **AI Model**: Llama 3.3 70B (via Groq - FREE)
- **Validation**: Pydantic
- **Deployment**: Railway
