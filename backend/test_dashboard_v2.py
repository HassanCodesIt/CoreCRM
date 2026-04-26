import httpx
import asyncio

BASE_URL = "http://localhost:8000/api/v1"

async def test_dashboard():
    async with httpx.AsyncClient() as client:
        # 1. Login to get token
        login_data = {"email": "admin@crm.com", "password": "admin123"}
        response = await client.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Test Dashboard Endpoints
        endpoints = [
            "/dashboard/summary",
            "/dashboard/recent-leads",
            "/dashboard/top-reps",
            "/dashboard/activities",
            "/dashboard/pipeline",
            "/dashboard/funnel",
            "/dashboard/tickets",
            "/dashboard/ai-insight"
        ]
        
        for ep in endpoints:
            print(f"Testing {ep}...")
            res = await client.get(f"{BASE_URL}{ep}", headers=headers)
            if res.status_code == 200:
                print(f"OK: {ep} loaded successfully")
            else:
                print(f"ERROR: {ep} failed with status {res.status_code}: {res.text}")

if __name__ == "__main__":
    asyncio.run(test_dashboard())
