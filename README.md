# Agentic Honeypot for Scam Prevention

## Project Overview

The Agentic Honeypot is an advanced AI-driven system designed to detect, engage, and expose digital scammers in real-time. Built for the India AI Impact Buildathon, this system employs a multi-persona AI swarm to simulate realistic victim behavior, keeping scammers engaged while autonomously extracting critical intelligence such as bank accounts, UPI IDs, phone numbers, and phishing links.

This project goes beyond simple detection by actively wasting scammers' time ("scambaiting") and generating actionable intelligence reports for law enforcement.

## Key Features

### 1. Advanced Scam Detection
- **Real-Time Classification**: Automatically categorizes conversations into scam types including Bank Fraud, UPI Fraud, Phishing, Investment Scams, and Tech Support Fraud.
- **RAG-Powered Intelligence**: Utilizes a Retrieval-Augmented Generation (RAG) engine grounded in a knowledge base of known scam patterns and Indian laws (e.g., IPC Section 170, PMLA).

### 2. Intelligent Engagement
- **Multi-Persona System**: Dynamically switches between personas (e.g., "Worried Parent", "Naive Youth") to match the specific scam context.
- **Adaptive Conversation Flow**: Implements a psychological strategy (Panic -> Trust -> Hesitation -> Compliance) to maximize engagement duration and extract more data.
- **Human-Like Behavior**: Simulates natural typing delays and emotional responses to evade bot detection.

### 3. Comprehensive Intelligence Extraction
- **Regex & Pattern Matching**: robustly captures high-value targets:
  - Phone Numbers (+91 and international formats)
  - Bank Account Numbers (context-aware digit extraction)
  - UPI IDs (excluding generic emails)
  - Phishing URLs and Domains
  - Email Addresses

### 4. Competition Compliance
- **Optimized /detect Endpoint**: Fully compliant with the competition's evaluation schema, earning a **100/100 weighted score** in self-tests.
- **Performance Metrics**: Tracks engagement duration and message counts to maximize evaluation points.

## Architecture

The system is built on a modern, scalable stack:

- **Backend**: FastAPI (Python) for high-performance async handling.
- **LLM Engine**: Groq API (Llama-3-70b) for fast, intelligent, and cost-effective responses.
- **Database**: SQLite for lightweight session persistence and intelligence storage.
- **Vector Search**: Custom RAG engine for pattern matching.

## Directory Structure

- `app/`: Core application logic (if restructured). *Currently in root for deployment simplicity.*
- `tests/`: Validation scripts (`self_test.py`, `score_test.py`).
- `docs/`: Project documentation and reference scenarios.
- `scripts/`: Utility scripts (`complaint_generator.py`).
- `knowledge/`: Scam pattern database (`scam_patterns.json`).
- `static/`: Frontend dashboard assets.

## API Reference

### POST /detect

Primary endpoint for the evaluation system.

**Request Body:**
```json
{
  "sessionId": "uuid-string",
  "message": {
    "text": "User message here",
    "sender": "scammer",
    "timestamp": "ISO-8601"
  },
  "conversationHistory": [...],
  "metadata": {...}
}
```

**Response Body:**
```json
{
  "status": "success",
  "reply": "AI Agent response...",
  "scamDetected": true,
  "scamType": "bank_fraud",
  "extractedIntelligence": {
    "bankAccounts": ["..."],
    "upiIds": ["..."],
    "phoneNumbers": ["..."],
    "phishingLinks": ["..."]
  },
  "engagementMetrics": {
    "totalMessagesExchanged": 5,
    "engagementDurationSeconds": 75
  }
}
```

## Setup & Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-repo/honeypot-system.git
    cd honeypot-system
    ```

2.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure Environment**
    Create a `.env` file with your keys:
    ```env
    GROQ_API_KEY=your_groq_api_key
    API_KEY_SECRET=sk_honeypot_2024_secure_key
    PORT=8000
    ```

4.  **Run the Server**
    ```bash
    python main.py
    ```
    Or using Uvicorn directly:
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000
    ```

## Testing

Run the self-test suite to verify system performance:
```bash
python tests/self_test.py
```
*Note: The test suite includes a simulation delay to verify engagement duration scoring.*

## Deployment

This project is configured for deployment on platforms- Railway 
- **Procfile** is included for web worker configuration.
- **requirements.txt** lists all necessary packages.

