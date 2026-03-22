# MYTax - Malaysian Comprehensive Tax System (YA 2026)

MYTax is a fully functional, end-to-end accounting and tax computation system designed specifically for the Malaysian statutory landscape under **YA 2026** tax laws. It provides everything an SME or enterprise needs to maintain double-entry books, compute taxes correctly, calculate payroll deductions, and remain compliant with the LHDN (Inland Revenue Board).

## 🚀 Key Features (Updated for 2026)
### 1. Corporate Income Tax (CIT)
*   **Territorial System:** Automatically aligns with the territorial basis of taxation (ITA 1967).
*   **SME Qualification (2026):** Validates the dual SME condition: Paid-up ordinary share capital ≤ RM2.5M **AND** Gross Income ≤ RM50M.
*   **Tiered Tax Rates:** 
    *   First RM150k @ 15%
    *   Next RM450k @ 17%
    *   Remainder @ 24% (Standard rate for non-SMEs)
*   **Capital Allowance:** Computes Initial Allowance (IA) and Annual Allowance (AA) across all Schedule 3 asset classes, including 100% Accelerated Capital Allowance (ACA) for computers/software.
*   **Advance Tax (CP204):** Computes estimated tax payable and generates the 12-month CP204 instalment schedule.
*   **Zakat Offsets:** Apply Zakat rebates (limited to 10% of aggregate income) prior to CIT finalization.

### 2. Capital Gains Tax (CGT)
*   Compliant with **Capital Gains Tax Act 2023 (CGTA 2023)**, fully enforced in 2026.
*   **10% Flat Rate:** Automatically calculates tax on the gross gain from the disposal of **unlisted shares** in Malaysian companies.
*   **Bursa Listing Exemption:** Automatically exempts gains from the disposal of shares listed on Bursa Malaysia.
*   Self-assessed, tracks 60-day payment deadlines.

### 3. Global Minimum Tax (GMT)
*   Assess exposure to **Pillar Two** GloBE Rules via the **Qualified Domestic Minimum Top-up Tax (QDMTT)** mechanism.
*   Automatically calculates top-up tax if the Effective Tax Rate (ETR) drops below 15%.
*   Applies exclusively to MNEs with global revenue ≥ EUR 750 million (SMEs are safely bypassed).

### 4. Sales and Service Tax (SST) & MyInvois
*   **Dual Rate Service Tax:** Supports the standard 8% rate and the reduced 6% rate (reserved for Food & Beverage and Telecommunications).
*   **Sales Tax:** Supports Standard (10%), Reduced (5%), and Zero-rated (0%) categories.
*   **e-Invoice (MyInvois):** 100% mandatory compliance for 2026. Validates invoices internally as ready to push via the LHDN MyInvois API.

### 5. Payroll Deductions (PCB & Statutory)
*   Calculates **EPF (KWSP)** based on age (< 60 vs ≥ 60) and employee (11%) / employer (13% / 12%) thresholds.
*   Computes **SOCSO (PERKESO)** and **EIS** with standard contribution caps.
*   Runs algorithmic **PCB (Monthly Tax Deduction)** estimations based on resident tax brackets, capturing personal, spouse, and child reliefs.

### 6. Withholding Tax (WHT)
*   Computes payments to non-residents across all major contract categories: Royalties (10%), Technical Fees (10%), Interest (15%), Contract payments (10%/3%), and Single-tier Dividends (0%).

### 7. Full Double-Entry Accounting Core
*   General Ledger, Chart of Accounts, Journal Entries.
*   Immutable Audit Log tracking all writes and deletes to prevent tampering.
*   Financial Reports: Trial Balance, Balance Sheet, P&L.

### 8. Premium Frontend
*   React + Vite SPA with modern, minimal, dark-mode styling.
*   **Help Center:** Extensive embedded documentation explaining tax laws, thresholds, and application usage.

---

## 🏗️ Architecture Stack
*   **Frontend:** React 18, Vite, React Router DOM, Recharts, Lucide-React, Axios.
*   **Backend:** Node.js, Express, Knex.js.
*   **Database:** PostgreSQL (with `pg` driver, configured for Supabase or local environments).
*   **Security:** JWT Authentication with bcrypt password hashing, Helmet, express-rate-limit, CORS, Immutable Audit Trails.
*   **Testing:** Jest, Supertest.

---

## 🛠️ Setup Instructions
### 1. Prerequisites
1.  **PostgreSQL** Database.
2.  **Node.js** (v18+) for the backend API.
3.  **Python 3.12+** for the AI Microservice.

### 2. Database Setup
```bash
cd backend
# Create a .env file based on the example (or set POSTGRES_URL directly)
cp .env.example .env
# Edit .env and verify database connection string
npx knex migrate:latest
npm run seed
```

### 3. Backend Setup
```bash
cd backend
npm install
npm start
```
The backend server runs on `http://localhost:3000`.

### 4. AI Service (Python Microservice) Setup
The `ai-service` handles complex ML tasks (categorization, tax optimization, and linear regression prediction) using FastAPI and scikit-learn.

```bash
cd ai-service
python -m venv venv
# Windows:
.\venv\Scripts\activate 
# Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
python main.py
```
The AI Engine runs on `http://localhost:8000`.

### 5. Frontend Setup
```bash
cd frontend
npm install

# Start the Vite development server (runs on port 5173, proxies /api to port 3000)
npm run dev
```

### 4. Accessing the App
Navigate to `http://localhost:5173` in your browser. Register a new user to automatically provision a new company workspace, complete with a pre-seeded Chart of Accounts.

---

## 🧪 Testing
The backend features an extensive Jest test suite covering all 8 development phases (Health Checks, Core Accounting, Tax Engine, Payroll/Invoices, advanced 2026 Compliance, and Security).

```bash
cd backend
npm test
```

*Note: The test suite creates and tears down temporary database records.*

---

## 📝 License
MIT License. Created to assist the Malaysian software ecosystem with navigating the complexities of YA 2026 tax compliances.
