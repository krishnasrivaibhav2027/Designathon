import http.client
import urllib.parse

def test_options():
    conn = http.client.HTTPConnection("127.0.0.1", 8000)
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type"
    }
    print("Sending OPTIONS /api/users/dashboard-analytics...")
    conn.request("OPTIONS", "/api/users/dashboard-analytics", headers=headers)
    resp = conn.getresponse()
    print(f"Status: {resp.status} {resp.reason}")
    print("Headers:")
    for k, v in resp.getheaders():
        print(f"  {k}: {v}")
    conn.close()

if __name__ == "__main__":
    test_options()
