import httpx
import asyncio

BASE_URL = "http://localhost:8000/api/v1"

async def test_auth_flow():
    async with httpx.AsyncClient() as client:
        # 1. Register a new user
        register_data = {
            "full_name": "Test User",
            "email": f"testuser_{asyncio.get_event_loop().time()}@example.com",
            "password": "testpassword123"
        }
        print(f"Testing registration for {register_data['email']}...")
        reg_response = await client.post(f"{BASE_URL}/auth/register", json=register_data)
        if reg_response.status_code == 201:
            print("OK: Registration successful")
        else:
            print(f"ERROR: Registration failed: {reg_response.text}")
            return

        # 2. Login with the new user
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        print("Testing login...")
        login_response = await client.post(f"{BASE_URL}/auth/login", json=login_data)
        if login_response.status_code == 200:
            print("OK: Login successful")
            token = login_response.json()["access_token"]
            
            # 3. Verify 'me' endpoint
            headers = {"Authorization": f"Bearer {token}"}
            me_response = await client.get(f"{BASE_URL}/auth/me", headers=headers)
            if me_response.status_code == 200:
                print(f"OK: 'me' endpoint verified: {me_response.json()['full_name']}")
            else:
                print(f"ERROR: 'me' endpoint failed: {me_response.text}")
        else:
            print(f"ERROR: Login failed: {login_response.text}")

if __name__ == "__main__":
    asyncio.run(test_auth_flow())
