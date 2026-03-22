import warnings
warnings.filterwarnings('ignore')

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

app = FastAPI(title="MYTax AI Engine (YA 2026)")

# --- In-Memory ML Model for Transaction Categorization ---
CATEGORIES = [
    "rent", "salaries", "utilities", "marketing", "professional_fees",
    "travel", "entertainment", "insurance", "computers", "motor_vehicles",
    "revenue", "other"
]

TRAIN_DATA = [
    ("client consulting fee paid", "revenue"),
    ("software development service invoice", "revenue"),
    ("january payroll salary", "salaries"),
    ("epf socso contribution", "salaries"),
    ("office rent payment", "rent"),
    ("office space rental menara", "rent"),
    ("tnb electricity bill", "utilities"),
    ("water syabas", "utilities"),
    ("facebook ads campaign", "marketing"),
    ("lawyer retainer fee", "professional_fees"),
    ("audit fee kwc", "professional_fees"),
    ("flight to penang", "travel"),
    ("client dinner banquet", "entertainment"),
    ("purchase laptop for developer", "computers"),
    ("macbook pro m3", "computers"),
    ("honda civic company car", "motor_vehicles"),
]

X_train, y_train = zip(*TRAIN_DATA)
model = make_pipeline(TfidfVectorizer(ngram_range=(1,2)), MultinomialNB())
model.fit(X_train, y_train)

# Metadata mapping for accounting logic
CATEGORY_META = {
    "rent": {"type": "expense", "deductible": True},
    "salaries": {"type": "expense", "deductible": True},
    "utilities": {"type": "expense", "deductible": True},
    "marketing": {"type": "expense", "deductible": True},
    "professional_fees": {"type": "expense", "deductible": True},
    "travel": {"type": "expense", "deductible": True},
    "entertainment": {"type": "expense", "deductible": True, "rate": 50},
    "insurance": {"type": "expense", "deductible": True},
    "computers": {"type": "asset", "deductible": True, "aca": True},
    "motor_vehicles": {"type": "asset", "deductible": True},
    "revenue": {"type": "income", "deductible": False},
    "other": {"type": "expense", "deductible": True}
}

# --- Pydantic Models ---
class CategorizeRequest(BaseModel):
    description: str

class CategorizeResponse(BaseModel):
    category: str
    transaction_type: str
    is_tax_deductible: bool
    deductible_rate: int = 100
    is_aca_eligible: bool = False
    confidence: float

class Financials(BaseModel):
    revenue: float
    expenses: float
    is_sme: bool
    assets_purchased: float
    zakat_paid: float
    entertainment_expenses: float

class SuggestionResponse(BaseModel):
    suggestions: list
    estimated_savings: float

class MonthlyData(BaseModel):
    month: int
    revenue: float
    expenses: float

class PredictRequest(BaseModel):
    historical_data: list
    is_sme: bool

class PredictResponse(BaseModel):
    predicted_annual_revenue: float
    predicted_annual_expenses: float
    predicted_tax_payable: float
    confidence_interval: str


# --- Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "MYTax AI Engine"}

@app.post("/categorize", response_model=CategorizeResponse)
def categorize_transaction(req: CategorizeRequest):
    probs = model.predict_proba([req.description.lower()])[0]
    best_idx = np.argmax(probs)
    
    category = model.classes_[best_idx]
    confidence = float(probs[best_idx])
    
    if confidence < 0.15:
        category = "other"
        
    meta = CATEGORY_META[category]
        
    return {
        "category": category,
        "transaction_type": meta["type"],
        "is_tax_deductible": meta["deductible"],
        "deductible_rate": meta.get("rate", 100),
        "is_aca_eligible": meta.get("aca", False),
        "confidence": confidence
    }

@app.post("/optimize", response_model=SuggestionResponse)
def optimize_tax(req: Financials):
    suggestions = []
    savings = 0.0
    
    # Tax rates (SME -> 15%, Non-SME -> 24%)
    marginal_rate = 0.15 if req.is_sme else 0.24
    
    # Rule 1: Capital Allowance
    if req.assets_purchased > 0:
        ca_savings = req.assets_purchased * marginal_rate
        savings += ca_savings
        suggestions.append(f"Claim Capital Allowance (Schedule 3) on RM{req.assets_purchased:,.2f} of assets to save approximately RM{ca_savings:,.2f} in tax.")
    
    # Rule 2: Zakat (SME Rebate)
    if req.zakat_paid > 0:
        net_income = max(0, req.revenue - req.expenses)
        max_zakat = net_income * 0.025 # simplification
        zakat_savings = min(req.zakat_paid, max_zakat)
        savings += zakat_savings
        suggestions.append(f"Utilize RM{req.zakat_paid:,.2f} Zakat payments as a direct tax rebate.")
        
    # Rule 3: Entertainment 50% Add-back warning
    if req.entertainment_expenses > 0:
        suggestions.append(f"Note: RM{req.entertainment_expenses:,.2f} of entertainment expenses may be only 50% deductible under Income Tax Act 1967. Ensure client-related portions are properly documented.")

    # Rule 4: SME Threshold (RM50m revenue)
    if req.is_sme and req.revenue > 45000000:
        suggestions.append("Warning: Your revenue is approaching RM50 million. Exceeding this will revoke your SME tax status (15% tier) and subject all income to the flat 24% rate.")

    if not suggestions:
        suggestions.append("Your current financials are well-optimized. Keep maintaining proper documentation.")

    return {
        "suggestions": suggestions,
        "estimated_savings": savings
    }

@app.post("/predict", response_model=PredictResponse)
def predict_next_year(req: PredictRequest):
    if not req.historical_data:
        return {"predicted_annual_revenue": 0, "predicted_annual_expenses": 0, "predicted_tax_payable": 0, "confidence_interval": "N/A"}
        
    df = pd.DataFrame([vars(m) for m in req.historical_data])
    
    # Simple linear projection if we have > 2 months, otherwise average run rate
    if len(df) >= 3:
        # Fit simple line y = mx + c
        months = np.array(df['month']).reshape(-1, 1)
        
        from sklearn.linear_model import LinearRegression
        rev_model = LinearRegression().fit(months, df['revenue'])
        exp_model = LinearRegression().fit(months, df['expenses'])
        
        future_months = np.arange(1, 13).reshape(-1, 1)
        pred_rev = rev_model.predict(future_months).sum()
        pred_exp = exp_model.predict(future_months).sum()
    else:
        avg_rev = df['revenue'].mean()
        avg_exp = df['expenses'].mean()
        pred_rev = avg_rev * 12
        pred_exp = avg_exp * 12
        
    # Bound predictions > 0
    pred_rev = max(0, pred_rev)
    pred_exp = max(0, pred_exp)
    
    chargeable_income = max(0, pred_rev - pred_exp)
    
    if req.is_sme:
        if chargeable_income <= 150000:
            tax = chargeable_income * 0.15
        elif chargeable_income <= 600000:
            tax = (150000 * 0.15) + ((chargeable_income - 150000) * 0.17)
        else:
            tax = (150000 * 0.15) + (450000 * 0.17) + ((chargeable_income - 600000) * 0.24)
    else:
        tax = chargeable_income * 0.24
        
    return {
        "predicted_annual_revenue": float(pred_rev),
        "predicted_annual_expenses": float(pred_exp),
        "predicted_tax_payable": float(tax),
        "confidence_interval": "± 12.5%" if len(df) >= 6 else "± 25.0%"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
