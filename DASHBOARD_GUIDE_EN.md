# MYTax Dashboard User Guide 📊

Welcome to the **MYTax Comprehensive Dashboard Guide**. The Dashboard is the central command center of the MYTax application, designed to give you a real-time, automated overview of your business's financial and tax health. 

This guide explains exactly how the Dashboard works, what each metric means, and how you should interact with the application to keep this dashboard populated and accurate.

---

## 1. Top Key Performance Indicators (KPIs)
At the very top of the dashboard, you will find four main KPI cards. These aggregate data from all your transactions for the current Year of Assessment (YA).

- **Total Revenue (YTD):** 
  - *What it is:* Your total gross income for the year.
  - *Where it comes from:* This number is automatically calculated by summing up all **Paid Invoices** and manual **Transactions** categorized as `revenue` or `income`.
- **Total Expenses (YTD):** 
  - *What it is:* The total cost of running your business this year.
  - *Where it comes from:* This is the sum of your approved **Payroll Runs**, submitted **Bills**, and manual **Transactions** categorized under expenses (e.g., `rent`, `salaries`, `utilities`).
- **Net Profit / (Loss):** 
  - *What it is:* Your raw profit before tax deduction (Revenue minus Expenses).
  - *Color Codes:* Turns green if your business is profitable, and red if you are operating at a loss.
- **Est. Tax Payable:** 
  - *What it is:* The exact amount of Corporate Tax you owe LHDN (Inland Revenue Board of Malaysia) for the current year.
  - *Where it comes from:* This value is populated *only* after you run the **Tax Computation** engine. If you haven't computed taxes yet, it will display "Not computed".

---

## 2. Revenue vs Expenses Chart (P&L Tracking)
Directly below the KPIs, you'll see an interactive Area Chart showing your cash flow month by month.
- **How it works:** It plots your Total Revenue (green) against your Total Expenses (red) over the 12 months.
- **Why it matters:** It visualizes your financial runway and seasonal trends, helping you identify months with cash-flow deficits before they become a problem.

---

## 3. Tax Summary (AI Computed)
On the right side of the charts, there is the **Tax Summary** panel. This is the most intelligent part of the dashboard.

- **Status Badge:** 
  - `Pending`: Means you have new financial data but haven't formally calculated the tax yet.
  - `Computed`: Means the numbers below are legally accurate representations of your tax liability.
- **The Numbers Explained:**
  - **Gross Revenue & Allowable Expenses:** Pulled straight from your ledger.
  - **Capital Allowance:** The system looks at your **Assets** (e.g., Laptops, Cars) and calculates how much depreciation you can deduct from your taxable income.
  - **Chargeable Income:** Your Net Profit *minus* Capital Allowances. This is the actual amount LHDN taxes you on.
  - **CP204 Paid:** Any monthly corporate tax installments you have already paid to LHDN this year.
  - **Balance Payable:** The final amount you need to pay by the end of the year.

### ⚠️ How to update the Tax Summary?
1. Go to the **Taxes** menu on the left sidebar.
2. Select the current year (e.g., 2026).
3. Click the **"Compute Tax"** button. The AI will instantly aggregate all your numbers and update the dashboard!

---

## 4. Upcoming Tax Deadlines
At the bottom of the dashboard, you will see a list of critical dates.
- **What it tracks:** Form C filings, CP204 monthly installments, SST submissions, and Employer E Form deadlines.
- **Automated Alerts:** The system uses your Financial Year End (set in the Company Settings) to automatically generate these statutory deadlines for you.
- **Urgency Tags:** 
  - `Red (Critical)`: Due in less than 7 days!
  - `Gold (High)`: Due in less than 30 days.
  - `Blue (Medium)`: Due safely in the future.

---

## 💡 Best Practices (Daily Workflow)
To ensure your dashboard is incredibly accurate, follow this daily/weekly routine:
1. **Always log your invoices:** Go to `Invoices` and create them. Mark them as `Paid` upon receipt.
2. **Run your payroll monthly:** Go to `Payroll` and click "Run Payroll". It automatically deducts EPF/SOCSO and posts it as an expense.
3. **Log petty cash:** Use `Transactions` to log rapid expenses. The **AI Categorizer** will automatically sort them into the right tax buckets!
4. **Compute Tax quarterly:** Click "Compute Tax" in the `Taxes` menu occasionally so you don't get surprised by a huge tax bill at the end of the year.
