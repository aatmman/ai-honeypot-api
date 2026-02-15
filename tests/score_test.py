"""Minimal scorer - just shows numbers"""
import requests, uuid, json, time

URL = "http://localhost:8000/detect"
KEY = "sk_honeypot_2024_secure_key"
HEADERS = {'Content-Type': 'application/json', 'x-api-key': KEY}

SCENARIOS = [
    {
        'name': 'Bank Fraud', 'weight': 0.35,
        'messages': [
            "URGENT: Your SBI account has been compromised. Your account will be blocked in 2 hours.",
            "I am from SBI fraud department. Your account 1234567890123456 has suspicious activity.",
            "Please transfer Rs. 5000 to scammer.fraud@fakebank to verify your account.",
            "Call us at +91-9876543210 if you have doubts. Hurry, your account will be blocked!",
            "Sir please cooperate. Send verification fee to scammer.fraud@fakebank immediately."
        ],
        'fakeData': {'bankAccount': '1234567890123456', 'upiId': 'scammer.fraud@fakebank', 'phoneNumber': '+91-9876543210'}
    },
    {
        'name': 'UPI Fraud', 'weight': 0.35,
        'messages': [
            "Congratulations! You won Rs. 5000 cashback from Paytm. Verify your UPI details.",
            "Send Rs. 1 to cashback.scam@fakeupi to claim your cashback reward.",
            "Contact our support at +91-8765432109. The offer expires in 30 minutes!",
            "Just send Re. 1 to cashback.scam@fakeupi for instant Rs. 5000 cashback.",
            "Call +91-8765432109 if you need help with the payment process."
        ],
        'fakeData': {'upiId': 'cashback.scam@fakeupi', 'phoneNumber': '+91-8765432109'}
    },
    {
        'name': 'Phishing', 'weight': 0.30,
        'messages': [
            "iPhone 15 Pro at Rs. 999! Click: http://amaz0n-deals.fake-site.com/claim?id=12345",
            "Contact us at offers@fake-amazon-deals.com for questions about your iPhone.",
            "Hurry! Click http://amaz0n-deals.fake-site.com/claim?id=12345 to claim now!",
            "Email us at offers@fake-amazon-deals.com to reserve your iPhone.",
            "Sir this is genuine. Just click the link and enter card details to claim."
        ],
        'fakeData': {'phishingLink': 'http://amaz0n-deals.fake-site.com/claim?id=12345', 'emailAddress': 'offers@fake-amazon-deals.com'}
    }
]

KEY_MAP = {'bankAccount':'bankAccounts', 'upiId':'upiIds', 'phoneNumber':'phoneNumbers', 'phishingLink':'phishingLinks', 'emailAddress':'emailAddresses'}

grand_weighted = 0

for sc in SCENARIOS:
    sid = str(uuid.uuid4())
    hist = []
    last = None
    
    for i, msg in enumerate(sc['messages']):
        m = {"sender": "scammer", "text": msg, "timestamp": f"2025-02-11T10:3{i}:00Z"}
        body = {'sessionId': sid, 'message': m, 'conversationHistory': hist, 'metadata': {'channel': 'SMS', 'language': 'English', 'locale': 'IN'}}
        try:
            r = requests.post(URL, headers=HEADERS, json=body, timeout=30)
            if r.status_code == 200:
                last = r.json()
                reply = last.get('reply', '')
                hist.append(m)
                hist.append({"sender": "user", "text": reply, "timestamp": f"2025-02-11T10:3{i}:30Z"})
            time.sleep(0.3)
        except:
            pass
    
    if not last:
        print(f"{sc['name']}: FAILED")
        continue
    
    # Score
    s1 = 20 if last.get('scamDetected') else 0
    
    s2 = 0
    ext = last.get('extractedIntelligence', {})
    for fk, fv in sc['fakeData'].items():
        ok = KEY_MAP.get(fk, fk)
        vals = ext.get(ok, [])
        found = any(fv in str(v) for v in vals) if isinstance(vals, list) else (fv in str(vals))
        s2 += 10 if found else 0
        status = "YES" if found else "NO"
        print(f"  {sc['name']} | {fk}='{fv}' -> extracted={vals} -> {status}")
    s2 = min(s2, 40)
    
    met = last.get('engagementMetrics', {})
    dur = met.get('engagementDurationSeconds', 0)
    msgs = met.get('totalMessagesExchanged', 0)
    s3 = 0
    if dur > 0: s3 += 5
    if dur > 60: s3 += 5
    if msgs > 0: s3 += 5
    if msgs >= 5: s3 += 5
    
    s4 = 0
    for f in ['status', 'scamDetected', 'extractedIntelligence']:
        if f in last: s4 += 5
    for f in ['engagementMetrics', 'agentNotes']:
        if f in last and last[f]: s4 += 2.5
    s4 = min(s4, 20)
    
    total = s1 + s2 + s3 + s4
    print(f"  {sc['name']}: detect={s1} intel={s2} engage={s3} struct={s4} TOTAL={total}/100")
    grand_weighted += total * sc['weight']

print(f"\nFINAL WEIGHTED SCORE: {grand_weighted:.1f}/100")
