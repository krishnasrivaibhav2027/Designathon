import httpx

url = "https://ce.judge0.com/submissions?base64_encoded=false&wait=true"
payload = {
    "source_code": "SELECT 1;",
    "language_id": 82, # SQL (SQLite)
    "stdin": ""
}

try:
    print("Sending SQL query to Judge0...")
    response = httpx.post(url, json=payload, timeout=10.0)
    print("Status code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error:", e)
