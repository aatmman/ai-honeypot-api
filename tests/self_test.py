"""Self-test script - STANDARD COMPETITION MODE
Runs scenarios with full intelligence payloads and realistic engagement timing.
Total Runtime: ~3.5 minutes (to ensure >60s duration per scenario for max engagement points)
"""
import requests
import uuid
import json
import time
import sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

ENDPOINT_URL = "http://localhost:8000/detect"
API_KEY = "sk_honeypot_2024_secure_key"

SCENARIOS = [
    {
        'scenarioId': 'bank_fraud',
        'name': 'Bank Fraud Detection (Rich Data)',
        'scamType': 'bank_fraud',
        'weight': 0.35,
        'messages': [
            "URGENT: Your SBI account has been compromised. Your account will be blocked in 2 hours. Share your account number and OTP immediately.",
            "I am calling from SBI fraud department. My employee ID is SBI-12345. Your account 1234567890123456 has been flagged for suspicious activity.",
            "Sir, this is very urgent. You need to transfer verification fee of Rs. 5000 to our secure account. Please share your UPI or use scammer.fraud@fakebank to process.",
            "For verification, you can also call us back at +91-9876543210. But please hurry, your account will be blocked!",
            "You can also email your KYC documents to help@sbi-fraud-protection.com for immediate verification.",
            "Sir, I understand your concern. Please process the payment immediately to avoid legal action."
        ],
        'fakeData': {
            'bankAccount': '1234567890123456',
            'upiId': 'scammer.fraud@fakebank',
            'phoneNumber': '+91-9876543210',
            'emailAddress': 'help@sbi-fraud-protection.com'
        }
    },
    {
        'scenarioId': 'upi_fraud',
        'name': 'UPI Fraud (Rich Data)',
        'scamType': 'upi_fraud',
        'weight': 0.35,
        'messages': [
            "Congratulations! You have won a cashback of Rs. 5000 from Paytm. To claim your reward, please verify your UPI details.",
            "This is an official Paytm promotion. To receive your cashback, please send Rs. 1 to our verification UPI: cashback.scam@fakeupi",
            "You can also contact our support team at +91-8765432109 for verification. The offer expires in 30 minutes!",
            "Sir, this is 100% genuine. Just send Re. 1 to cashback.scam@fakeupi and you will receive Rs. 5000 cashback instantly.",
            "If UPI is not working, you can deposit to our rewards bank account: 919191919191 (IFSC: PYTM0123456).",
            "Please send the screenshot to rewards@paytm-cashback-offer.in after payment."
        ],
        'fakeData': {
            'upiId': 'cashback.scam@fakeupi',
            'phoneNumber': '+91-8765432109',
            'bankAccount': '919191919191',
            'emailAddress': 'rewards@paytm-cashback-offer.in'
        }
    },
    {
        'scenarioId': 'phishing_link',
        'name': 'Phishing Link (Rich Data)',
        'scamType': 'phishing',
        'weight': 0.30,
        'messages': [
            "You have been selected for iPhone 15 Pro at just Rs. 999! Click here to claim: http://amaz0n-deals.fake-site.com/claim?id=12345.",
            "This is a verified Amazon partner deal. Contact us at offers@fake-amazon-deals.com for any questions.",
            "Hurry! Only 3 iPhones left. Click http://amaz0n-deals.fake-site.com/claim?id=12345 now to claim yours!",
            "You can also Call +91-7000000000 to reserve your iPhone. Limited time offer!",
            "To pay the booking amount, you can also UPI to offer-claim@ybl if the link is slow.",
            "Sir, this is genuine Amazon deal. Just click the link and enter your card details to claim. Offer ends today!"
        ],
        'fakeData': {
            'phishingLink': 'http://amaz0n-deals.fake-site.com/claim?id=12345',
            'emailAddress': 'offers@fake-amazon-deals.com',
            'phoneNumber': '+91-7000000000',
            'upiId': 'offer-claim@ybl'
        }
    }
]


def evaluate_score(final_output, scenario, total_messages):
    """EXACT scoring logic from judges' evaluation doc"""
    score = {
        'scamDetection': 0,
        'intelligenceExtraction': 0,
        'engagementQuality': 0,
        'responseStructure': 0,
        'total': 0
    }

    # 1. Scam Detection (20 points)
    if final_output.get('scamDetected', False):
        score['scamDetection'] = 20

    # 2. Intelligence Extraction (40 points)
    # 10 pts per matching ITEM found (capped at 40)
    extracted = final_output.get('extractedIntelligence', {})
    fake_data = scenario.get('fakeData', {})
    key_mapping = {
        'bankAccount': 'bankAccounts',
        'upiId': 'upiIds',
        'phoneNumber': 'phoneNumbers',
        'phishingLink': 'phishingLinks',
        'emailAddress': 'emailAddresses'
    }

    found_count = 0
    for fake_key, fake_value in fake_data.items():
        output_key = key_mapping.get(fake_key, fake_key)
        extracted_values = extracted.get(output_key, [])
        found = False
        
        if isinstance(extracted_values, list):
            if any(fake_value in str(v) for v in extracted_values):
                found = True
        elif isinstance(extracted_values, str):
            if fake_value in extracted_values:
                found = True
        
        if found:
            score['intelligenceExtraction'] += 10
            found_count += 1
            print(f"      [FOUND] {fake_key}: '{fake_value}'")
        else:
            print(f"      [MISSING] {fake_key}: '{fake_value}'")
            
    score['intelligenceExtraction'] = min(score['intelligenceExtraction'], 40)

    # 3. Engagement Quality (20 points)
    metrics = final_output.get('engagementMetrics', {})
    duration = metrics.get('engagementDurationSeconds', 0)
    messages = metrics.get('totalMessagesExchanged', 0)
    
    if duration > 0: score['engagementQuality'] += 5
    if duration > 60: score['engagementQuality'] += 5  # This requires >60s test run
    if messages > 0: score['engagementQuality'] += 5
    if messages >= 5: score['engagementQuality'] += 5

    # 4. Response Structure (20 points)
    required_fields = ['status', 'scamDetected', 'extractedIntelligence']
    optional_fields = ['engagementMetrics', 'agentNotes']
    for field in required_fields:
        if field in final_output:
            score['responseStructure'] += 5
    for field in optional_fields:
        if field in final_output and final_output[field]:
            score['responseStructure'] += 2.5
    score['responseStructure'] = min(score['responseStructure'], 20)

    score['total'] = sum([score['scamDetection'], score['intelligenceExtraction'],
                         score['engagementQuality'], score['responseStructure']])
    return score


def test_scenario(scenario):
    """Run a full multi-turn scenario test"""
    session_id = str(uuid.uuid4())
    conversation_history = []
    headers = {'Content-Type': 'application/json', 'x-api-key': API_KEY}

    last_response = None
    print(f"   [START] Running {len(scenario['messages'])} turns (approx 75s)...")
    
    for i, msg_text in enumerate(scenario['messages']):
        message = {"sender": "scammer", "text": msg_text, "timestamp": f"2025-02-11T10:3{i}:00Z"}
        request_body = {
            'sessionId': session_id,
            'message': message,
            'conversationHistory': conversation_history,
            'metadata': {'channel': 'SMS', 'language': 'English', 'locale': 'IN'}
        }

        try:
            response = requests.post(ENDPOINT_URL, headers=headers, json=request_body, timeout=30)
            if response.status_code != 200:
                print(f"   [FAIL] Turn {i+1}: HTTP {response.status_code}")
                continue
            data = response.json()
            reply = data.get('reply', data.get('message', data.get('text', '')))
            print(f"   Turn {i+1}: Scammer -> {msg_text[:40]}...")
            print(f"           Honeypot -> {reply[:40]}...")

            conversation_history.append(message)
            conversation_history.append({"sender": "user", "text": reply, "timestamp": f"2025-02-11T10:3{i}:30Z"})
            last_response = data
            
            # [SIMULATION ONLY] Wait 13 seconds to simulate SLOW SCAMMER typing speed.
            # This ensures the total conversation duration > 60s to earn "Engagement Duration" points.
            # The actual API responds instantly (<3s).
            if i < len(scenario['messages']) - 1:
                time.sleep(13)

        except Exception as e:
            print(f"   [ERROR] Turn {i+1}: {e}")

    return last_response


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("[COMPETITION SELF-TEST] -- Evaluating /detect endpoint (STRICT MODE 100/100)")
    print("=" * 70)

    weighted_total = 0

    for scenario in SCENARIOS:
        print(f"\n{'=' * 60}")
        print(f"[SCENARIO] {scenario['name']} (Weight: {scenario['weight']*100:.0f}%)")
        print(f"{'=' * 60}")

        result = test_scenario(scenario)
        if not result:
            print("   [FAIL] No response")
            continue

        print(f"\n   [SCORING]")
        score = evaluate_score(result, scenario, len(scenario['messages']))

        print(f"      Scam Detection:     {score['scamDetection']}/20")
        print(f"      Intel Extraction:   {score['intelligenceExtraction']}/40")
        print(f"      Engagement Quality: {score['engagementQuality']}/20")
        print(f"      Response Structure: {score['responseStructure']}/20")
        print(f"      -------------------------")
        print(f"      SCENARIO SCORE:     {score['total']}/100")

        weighted_total += score['total'] * scenario['weight']

    print(f"\n{'=' * 70}")
    print(f"[FINAL SCORE] WEIGHTED SCORE: {weighted_total:.1f}/100")
    print(f"{'=' * 70}\n")
