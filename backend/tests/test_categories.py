import requests
import json

url = "http://localhost:8001/analyze"

scenarios = [
    {
        "name": "Criminal",
        "narrative": "Someone broke into my house and stole my laptop while I was sleeping in Mumbai."
    },
    {
        "name": "Tenant",
        "narrative": "My landlord is refusing to return my security deposit even though I vacated the flat in Pune 2 months ago."
    },
    {
        "name": "Consumer",
        "narrative": "I bought a Samsung phone from Amazon but it stopped working in 2 days and they are refusing a refund."
    }
]

for scenario in scenarios:
    print(f"\n--- Testing Scenario: {scenario['name']} ---")
    payload = {
        "raw_narrative": scenario['narrative'],
        "language_preference": "english",
        "state_jurisdiction": "Maharashtra",
        "mode": "citizen"
    }
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        result = response.json()
        type_detected = result.get("case_state", {}).get("structured_facts", {}).get("incident_type")
        print(f"Narrative: {scenario['narrative'][:50]}...")
        print(f"Detected Type: {type_detected}")
    else:
        print(f"Failed! {response.text}")
