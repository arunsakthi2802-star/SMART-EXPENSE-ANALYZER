import pytest
from datetime import datetime
from backend.app.services.auth_service import get_password_hash, verify_password, create_access_token, decode_access_token
from backend.app.services.ai_service import AIService

def test_password_hashing():
    password = "secret_password"
    pwd_hash = get_password_hash(password)
    assert pwd_hash != password
    assert verify_password(password, pwd_hash) is True
    assert verify_password("wrong_password", pwd_hash) is False

def test_jwt_issuance():
    payload = {"user_id": "123456", "role": "user"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["user_id"] == "123456"
    assert decoded["role"] == "user"

def test_category_prediction():
    # Expense keywords matching
    cat_food = AIService.predict_category("lunch at McDonalds restaurant", "McDonalds", "expense")
    assert cat_food == "Food"
    
    cat_shopping = AIService.predict_category("bought shoes on amazon", "Amazon", "expense")
    assert cat_shopping == "Shopping"
    
    cat_travel = AIService.predict_category("Uber taxi ride to office", "Uber", "expense")
    assert cat_travel == "Travel"
    
    # Income keywords matching
    cat_salary = AIService.predict_category("monthly payroll payment", "MyCorp LLC", "income")
    assert cat_salary == "Salary"

def test_health_score_calculation():
    incomes = [{"amount": 5000.0}]
    expenses = [
        {"amount": 1000.0, "priority": "high"},
        {"amount": 500.0, "priority": "low"},
        {"amount": 500.0, "priority": "medium"}
    ]
    budgets = [
        {"limit_amount": 2500.0, "current_spend": 2000.0}
    ]
    
    report = AIService.calculate_health_score(incomes, expenses, budgets)
    assert "score" in report
    assert report["score"] >= 0 and report["score"] <= 100
    assert report["savings_rate_percent"] == 60.0
