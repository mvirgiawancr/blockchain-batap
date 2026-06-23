import requests
import uuid

BASE_URL = "http://localhost:8000"
REGISTER_ENDPOINT = "/api/v1/auth/register"
TIMEOUT = 30

def test_post_apiv1authregister_register_new_user():
    url = BASE_URL + REGISTER_ENDPOINT
    unique_email = f"testuser_{uuid.uuid4().hex}@example.com"
    payload = {
        "username": f"testuser_{uuid.uuid4().hex[:8]}",
        "email": unique_email,
        "password": "Password123!",
        "full_name": "Test User"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 201, f"Expected status 201, got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate response contains registered user data fields
    assert isinstance(data, dict), "Response JSON is not an object"
    assert "id" in data, "Response missing user identifier"
    assert data.get("username") == payload["username"], "Username mismatch in response"
    # Email might be returned or omitted for privacy; if present, it should match
    if "email" in data:
        assert data["email"] == payload["email"], "Email mismatch in response"


test_post_apiv1authregister_register_new_user()
