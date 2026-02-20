# Agentic Honeypot API

## Description
The Agentic Honeypot API is an advanced, AI-driven defense system designed to actively detect, engage, and expose digital scammers in real-time. Instead of simply blocking malicious traffic, our honeypot simulates realistic, vulnerable human targets (using dynamic personas like "Worried Parent" or "Naive Youth"). This approach maximizes scammer engagement time, tying up their resources while autonomously extracting critical threat intelligence such as rogue bank accounts, UPI IDs, illicit phone numbers, and phishing domains. The system achieves a perfect convergence of cybersecurity defense and offensive threat intelligence gathering.

## Tech Stack
- **Language/Framework:** Python 3.10+, FastAPI
- **Key Libraries:** `pydantic`, `python-dotenv`, `requests`, `uvicorn`
- **Database:** SQLite (for lightweight session persistence and intelligence mapping)
- **LLM/AI Models Used:** Groq API (Meta Llama 3.3 70B Versatile) for high-speed, dynamic natural language generation; Groq Whisper for audio transcription; Groq Vision for image forensic analysis.

## Setup Instructions
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/honeypot-system.git
   cd honeypot-system
   ```

2. **Install dependencies**
   Ensure you have Python 3 installed, then run:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set environment variables**
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   *Required variables:*
   - `GROQ_API_KEY`: Your Groq API key (get one for free at console.groq.com)
   - `API_KEY_SECRET`: Your chosen secure API key for the evaluator (e.g., `sk_honeypot_2024_secure_key`)

4. **Run the application**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
   The API will now be running on `http://localhost:8000`.

## API Endpoint
- **URL:** `https://your-deployed-url.com/api/honeypot` (Also backwards compatible with `/detect` and `/`)
- **Method:** POST
- **Authentication:** `x-api-key` header (Optional but recommended, expects the value of `API_KEY_SECRET`)

## Approach
Our honeypot strategy relies on three core pillars designed to maximize disruption to scam networks:

- **How we detect scams:** 
  The system uses a fast, heuristic-based NLP ruleset running in a state machine alongside a RAG-backed knowledge base of Indian cyber laws and scam trends. We calculate a weighted "Scam Confidence Score" based on urgency keywords, threats (e.g., "digital arrest"), financial requests, and the presence of suspicious links or phone numbers from the very first message.

- **How we extract intelligence:**
  We utilize a highly robust, multi-stage Regular Expression engine that constantly scans the *entire conversation history*. This allows us to catch poorly formatted Indian phone numbers (e.g., `+91-987...`, `9876...`), isolate UPI IDs from standard email addresses, and accurately capture 11-18 digit Indian bank account numbers. Every piece of intelligence is tagged with a confidence score and timestamped.

- **How we maintain engagement:**
  The system employs a "Multi-Persona Swarm". Based on the initial scam classification, the honeypot selects a tailored persona (e.g., an elderly confused citizen for a fake CBI digital arrest, or a tech-naive youth for a lottery scam). The LLM is strictly prompted to play this character flawessly—using natural language, showing hesitation, asking clarifying questions, and demanding proof (such as account numbers or callback numbers)—which keeps the scammer invested in the conversation for maximum turns while tricking them into revealing identifiable information.
