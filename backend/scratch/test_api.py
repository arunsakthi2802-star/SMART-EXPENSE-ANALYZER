import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_signup():
    print("Testing signup...")
    payload = {
        "name": "Test User",
        "email": "newuser_test@example.com",
        "password": "Password123"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=payload)
    print("Signup Response:", response.status_code, response.json())
    return response.json()

def test_login():
    print("\nTesting login...")
    # First we try test user bypass
    payload = {
        "email": "test@budgetiq.com",
        "password": "Test@1234"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=payload)
    print("Login Response (Test User):", response.status_code, response.json())
    
    # Login normal user
    payload = {
        "email": "newuser_test@example.com",
        "password": "Password123"
    }
    response2 = requests.post(f"{BASE_URL}/auth/login", json=payload)
    print("Login Response (New User):", response2.status_code, response2.json())
    
    return response.json().get("access_token")

def test_dashboard(token):
    print("\nTesting dashboard...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/dashboard/summary", headers=headers)
    print("Dashboard Response:", response.status_code, response.json())

def test_transactions(token):
    print("\nTesting transactions...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Add a transaction
    payload = {
        "amount": 150.5,
        "type": "expense",
        "category_id": "Food", # Backend might resolve by name
        "date": "2023-10-01T12:00:00Z",
        "description": "Lunch at McDonald's",
        "payment_method": "Card"
    }
    response = requests.post(f"{BASE_URL}/transactions/", json=payload, headers=headers)
    print("Add Transaction Response:", response.status_code, response.json())
    
    # Get transactions
    response = requests.get(f"{BASE_URL}/transactions/", headers=headers)
    print("Get Transactions Response:", response.status_code)
    
def test_categories(token):
    print("\nTesting categories...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/categories/", headers=headers)
    print("Get Categories Response:", response.status_code, "Categories count:", len(response.json()))
    
if __name__ == "__main__":
    try:
        test_signup()
    except Exception as e:
        print("Signup error:", e)
        
    try:
        token = test_login()
        if token:
            test_categories(token)
            test_transactions(token)
            test_dashboard(token)
    except Exception as e:
        print("Error:", e)
