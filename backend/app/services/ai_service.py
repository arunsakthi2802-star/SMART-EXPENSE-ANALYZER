from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

# Heuristics for classification
KEYWORD_MAPPING = {
    "food": ["mcdonalds", "starbucks", "burger", "pizza", "restaurant", "food", "grocery", "groceries", "supermarket", "subway", "kfc", "diner", "eats"],
    "shopping": ["walmart", "amazon", "target", "ebay", "clothing", "nike", "mall", "store", "boutique", "shopping", "bestbuy"],
    "travel": ["uber", "lyft", "fuel", "gas", "petrol", "shell", "chevron", "airline", "flight", "metro", "subway", "train", "taxi", "hotel", "airbnb"],
    "medical": ["hospital", "pharmacy", "medical", "doctor", "dentist", "clinic", "cvs", "walgreens", "health", "insurance"],
    "education": ["school", "tuition", "coursera", "udemy", "book", "university", "college", "course", "training"],
    "entertainment": ["netflix", "spotify", "hulu", "cinema", "movie", "concert", "theatre", "game", "steam", "playstation", "xbox", "pub", "bar"],
    "bills": ["electricity", "water", "utility", "phone", "internet", "comcast", "verizon", "tmobile", "bill", "subscription", "insurance"],
    "rent": ["rent", "apartment", "housing", "landlord", "lease"],
    "investment": ["stocks", "etf", "crypto", "fidelity", "vanguard", "schwab", "coinbase", "binance", "mutual fund"]
}

INCOME_KEYWORD_MAPPING = {
    "salary": ["payroll", "salary", "stipend", "direct deposit", "wages", "employer"],
    "freelancing": ["freelance", "upwork", "fiverr", "contract", "gig", "client"],
    "business": ["business", "sales", "merchant payment", "stripe", "paypal", "revenue"],
    "investment": ["dividend", "interest", "capital gains", "fidelity", "vanguard", "schwab"],
    "rental": ["rental income", "tenant", "sublet"]
}

class AIService:
    @staticmethod
    def predict_category(description: str, merchant: str, tx_type: str = "expense") -> str:
        """
        Uses keyword-matching heuristics to predict categories.
        """
        text = f"{description.lower()} {merchant.lower()}"
        mapping = INCOME_KEYWORD_MAPPING if tx_type == "income" else KEYWORD_MAPPING
        
        for category, keywords in mapping.items():
            if any(keyword in text for keyword in keywords):
                return category.capitalize()
                
        # Default category fallbacks
        return "Other Income" if tx_type == "income" else "Shopping"

    @staticmethod
    def predict_future_spending(expenses: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Predicts next month's spending by category using exponential moving average or basic trend estimation.
        """
        if not expenses:
            return {}
            
        df = pd.DataFrame(expenses)
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M')
        
        # Aggregate spending by category and month
        monthly_category = df.groupby(['month', 'category_name'])['amount'].sum().reset_index()
        
        predictions = {}
        unique_categories = df['category_name'].unique()
        
        for category in unique_categories:
            cat_data = monthly_category[monthly_category['category_name'] == category].sort_values('month')
            amounts = cat_data['amount'].tolist()
            
            if not amounts:
                predictions[category] = 0.0
                continue
                
            # If only 1 month data, predict that same amount
            if len(amounts) == 1:
                predictions[category] = float(amounts[0])
            elif len(amounts) == 2:
                # Simple average
                predictions[category] = float(np.mean(amounts))
            else:
                # Weighted average placing more weight on recent months (simple EMA)
                weights = [0.1, 0.3, 0.6]
                recent_amounts = amounts[-3:]
                # Pad if we have less than 3 but more than 2
                if len(recent_amounts) < 3:
                    recent_amounts = [amounts[0]] + recent_amounts
                predictions[category] = float(np.average(recent_amounts, weights=weights[:len(recent_amounts)]))
                
        return predictions

    @staticmethod
    def detect_anomalies(new_amount: float, category_name: str, historical_expenses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detects if a transaction is anomalous (e.g. 2x standard deviation or 3x mean above standard baseline).
        """
        cat_expenses = [e['amount'] for e in historical_expenses if e.get('category_name') == category_name]
        
        if len(cat_expenses) < 3:
            # Not enough data, compare to overall transaction mean if available
            all_expenses = [e['amount'] for e in historical_expenses]
            if not all_expenses:
                return {"is_anomaly": False, "confidence": 0.0, "reason": ""}
            mean = np.mean(all_expenses)
            threshold = 3 * mean
            if new_amount > threshold:
                return {
                    "is_anomaly": True,
                    "confidence": 0.7,
                    "reason": f"Amount is significantly higher than your typical transactions (avg: {mean:.2f})."
                }
            return {"is_anomaly": False, "confidence": 0.0, "reason": ""}
            
        mean = np.mean(cat_expenses)
        std_dev = np.std(cat_expenses)
        
        # If std_dev is 0 (all values same), avoid division by zero or infinite thresholds
        if std_dev == 0:
            std_dev = mean * 0.1
            
        z_score = (new_amount - mean) / std_dev
        
        if z_score > 2.5 or new_amount > (3 * mean):
            return {
                "is_anomaly": True,
                "confidence": min(0.99, float(0.5 + (z_score / 10))),
                "reason": f"This transaction is {z_score:.1f} standard deviations higher than your typical {category_name} spending (avg: {mean:.2f})."
            }
            
        return {"is_anomaly": False, "confidence": 0.0, "reason": ""}

    @staticmethod
    def calculate_health_score(incomes: List[Dict[str, Any]], expenses: List[Dict[str, Any]], budgets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculates a financial health score from 0-100.
        Factors:
        - Savings Rate (up to 40 pts): (Income - Expense) / Income. Goal: > 20%
        - Budget compliance (up to 30 pts): Ratio of spent vs budget limits. Goal: No budget overruns
        - High priority ratio (up to 30 pts): Avoid over-spending on low priority/luxury categories
        """
        total_income = sum(i['amount'] for i in incomes)
        total_expense = sum(e['amount'] for e in expenses)
        savings = total_income - total_expense
        
        # 1. Savings Score (Max 40 points)
        if total_income == 0:
            savings_score = 0
            savings_rate = 0
        else:
            savings_rate = savings / total_income
            if savings_rate >= 0.30:
                savings_score = 40
            elif savings_rate > 0:
                savings_score = int(savings_rate * 133.3)  # Scale linearly to 40
            else:
                savings_score = 0
                
        # 2. Budget Compliance Score (Max 30 points)
        overruns = 0
        if not budgets:
            budget_score = 20  # Default middle score if no budgets set
        else:
            for b in budgets:
                limit = b.get('limit_amount', 0)
                spent = b.get('current_spend', 0)
                if spent > limit and limit > 0:
                    overruns += 1
            
            overrun_ratio = overruns / len(budgets)
            budget_score = int((1 - overrun_ratio) * 30)

        # 3. Discretionary Spending / Priority Score (Max 30 points)
        low_priority_spend = sum(e['amount'] for e in expenses if e.get('priority') == 'low')
        if total_expense == 0:
            priority_score = 30
        else:
            low_priority_ratio = low_priority_spend / total_expense
            if low_priority_ratio <= 0.20:
                priority_score = 30
            elif low_priority_ratio >= 0.60:
                priority_score = 5
            else:
                priority_score = int(30 - ((low_priority_ratio - 0.20) / 0.40) * 25)

        total_score = max(0, min(100, savings_score + budget_score + priority_score))
        
        # 4. Generate Highly Detailed AI Insights (Expenses Reduction & Incomes Expansion)
        advice = []
        
        # --- EXPENSE REDUCTION INSIGHTS ---
        if savings_rate < 0.10:
            advice.append("⚠️ Low Savings Rate: Your savings rate is currently under 10%. Try cutting discretionary expenditures (entertainment, dining out) by 15% to build a solid cash cushion.")
        elif savings_rate < 0.20:
            advice.append("📈 Moderate Savings Rate: You are saving between 10-20% of your income. Aim to reach the gold standard 20% mark by setting automatic transfers to your savings goals.")
        else:
            advice.append("🌟 Excellent Savings Rate: You are saving more than 20% of your income. Consider shifting some surplus cash to investments to earn compound returns.")
            
        # Category-specific spend alerts
        cat_totals = {}
        for e in expenses:
            cat_name = e.get("category_name", "Other")
            cat_totals[cat_name] = cat_totals.get(cat_name, 0.0) + e["amount"]
            
        for cat_name, amt in cat_totals.items():
            if cat_name.lower() in ["food", "groceries", "dining"] and total_expense > 0 and (amt / total_expense) > 0.25:
                advice.append(f"🍔 Food Cost Analysis: Dining out & food expenses make up {int((amt/total_expense)*100)}% of your monthly outflows. Save up to 30% on food by meal planning or cooking at home.")
            elif cat_name.lower() in ["shopping", "entertainment"] and total_expense > 0 and (amt / total_expense) > 0.20:
                advice.append(f"🛍️ Discretionary Alert: {cat_name} makes up {int((amt/total_expense)*100)}% of your total spend. Consider applying the 48-hour rule for non-essential purchases to curb impulse buys.")
            elif cat_name.lower() in ["travel", "fuel", "gas"] and total_expense > 0 and (amt / total_expense) > 0.15:
                advice.append(f"🚗 Travel/Commute optimization: Fuel and transit fees represent {int((amt/total_expense)*100)}% of your expenses. Explore carpooling, public transit, or loyalty gas discounts to reduce transit costs.")

        if overruns > 0:
            advice.append(f"🛑 Budget Compliance: You have exceeded budget limits in {overruns} category periods. Adjust your spending habits or increase limits for high-priority necessities.")

        # --- INCOME EXPANSION INSIGHTS ---
        inc_totals = {}
        for i in incomes:
            cat_name = i.get("category_name", "Other")
            inc_totals[cat_name] = inc_totals.get(cat_name, 0.0) + i["amount"]
            
        if len(inc_totals) <= 1:
            advice.append("💼 Single Income Source: You currently rely on a single source of income. Safeguard your finances by looking into secondary income sources, freelancing, or launching a side gig.")
        
        if "freelancing" in [k.lower() for k in inc_totals.keys()]:
            advice.append("💡 Freelance Growth: Since you already do freelancing work, leverage platforms like Upwork or Fiverr to raise your gig rates by 10% or expand your client base to boost monthly revenues.")
        else:
            advice.append("Monetize Skills: Boost your cash flow by monetizing skills (writing, designing, tutoring, coding) through contract projects on freelancing networks in your spare time.")

        if total_income > total_expense and savings > 0:
            advice.append(f"💰 Passive Income Yield: You have a net monthly surplus of ${savings:,.2f}. Put this idle capital to work by investing in dividend stocks, REITs, or high-yield savings certificates to create recurring passive income.")
        else:
            advice.append("📉 Deficit Warning: You currently spend more than or equal to what you earn. Before looking into investments, prioritize establishing a $1,000 emergency stash to cover unexpected bills.")

        return {
            "score": total_score,
            "savings_rate_percent": round(savings_rate * 100, 2),
            "breakdown": {
                "savings_score": savings_score,
                "budget_compliance_score": budget_score,
                "priority_score": priority_score
            },
            "recommendations": advice
        }

    @staticmethod
    def analyze_receipt(filename: str) -> Dict[str, Any]:
        """
        Simulates AI receipt extraction based on keywords in the filename or mock values.
        In a real application, this would run OCR (e.g. Tesseract) or pass the document
        to an LLM (e.g. Gemini API) to extract fields.
        """
        fn_lower = filename.lower()
        
        # Default mock values
        amount = 15.00
        merchant = "Generic Store"
        description = "Store purchase"
        category = "Shopping"
        date_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M")
        
        # Starbucks receipt
        if "starbucks" in fn_lower or "coffee" in fn_lower or "cafe" in fn_lower:
            amount = 12.75
            merchant = "Starbucks"
            description = "Coffee & pastries"
            category = "Food"
        # Walmart receipt
        elif "walmart" in fn_lower or "grocery" in fn_lower or "supermarket" in fn_lower:
            amount = 84.50
            merchant = "Walmart"
            description = "Weekly grocery shopping"
            category = "Food"
        # Uber receipt
        elif "uber" in fn_lower or "taxi" in fn_lower or "lyft" in fn_lower:
            amount = 28.40
            merchant = "Uber"
            description = "Ride to downtown office"
            category = "Travel"
        # Amazon receipt
        elif "amazon" in fn_lower or "shopping" in fn_lower:
            amount = 45.99
            merchant = "Amazon"
            description = "Online shop items"
            category = "Shopping"
        # Netflix receipt
        elif "netflix" in fn_lower or "subscription" in fn_lower:
            amount = 15.99
            merchant = "Netflix"
            description = "Monthly streaming subscription"
            category = "Entertainment"
            
        return {
            "amount": amount,
            "merchant_name": merchant,
            "date": date_str,
            "description": description,
            "category_name": category
        }

