import asyncio
import httpx

async def main():
    url = "https://ce.judge0.com/submissions?base64_encoded=false&wait=true"
    payload = {
        "source_code": "print('hello')",
        "language_id": 71,
        "stdin": ""
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            print("Async Status:", response.status_code)
            print("Async Response:", response.json())
    except Exception as e:
        print("Async Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
