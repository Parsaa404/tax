// Malaysian Tax Constants - MYTax System
// Based on LHDN (Inland Revenue Board of Malaysia) official rates
// Updated for YA 2026 — CGT, GMT, SST 8%/6% split, e-Invoice mandatory

const TAX_CONSTANTS = {
  // ============================================================
  // CORPORATE INCOME TAX (CIT) - YA 2026
  // Territorial system: income accrued in Malaysia is taxable;
  // foreign-sourced income taxable only upon remittance to Malaysia.
  // ============================================================
  CIT: {
    // SME Tiered Rates (Paid-up capital ≤ RM2.5M AND not part of large group)
    SME_RATES: [
      { upTo: 150000, rate: 0.15 },   // 15% on first RM150,000
      { upTo: 600000, rate: 0.17 },   // 17% on next RM450,000 (RM150,001 - RM600,000)
      { above: 600000, rate: 0.24 },  // 24% on remainder
    ],
    // Standard Rate
    STANDARD_RATE: 0.24, // 24% for non-SME companies
    // SME Eligibility (BOTH conditions must be met)
    SME_MAX_PAID_UP_CAPITAL: 2500000,  // RM2.5 million paid-up ordinary share capital
    SME_MAX_GROSS_INCOME:    50000000, // RM50 million annual gross income (NEW 2026 condition)
  },

  // ============================================================
  // CAPITAL GAINS TAX (CGT) — YA 2026 (CGTA 2023 fully in force)
  // ============================================================
  CGT: {
    // 10% on gains from disposal of unlisted shares in MY companies
    UNLISTED_SHARES_RATE: 0.10,
    // Listed shares on Bursa: CGT-exempt
    LISTED_SHARES_RATE:   0.00,
    // Real property gains: taxed under RPGT (separate regime)
    EFFECTIVE_DATE: '2024-03-01',
  },

  // ============================================================
  // GLOBAL MINIMUM TAX (GMT / Pillar Two) — YA 2026
  // ============================================================
  GMT: {
    // Applies to MNE groups with consolidated global revenue ≥ EUR 750M
    MINIMUM_RATE: 0.15,              // 15% effective tax rate floor
    REVENUE_THRESHOLD_EUR: 750000000,// EUR 750 million
    // Qualified Domestic Minimum Top-up Tax (QDMTT) — Malaysia collects
    // the top-up tax locally before other countries can.
    QDMTT: true,
    APPLICABILITY: 'MNE groups only — does NOT apply to SMEs',
  },

  // ============================================================
  // EPF (KWSP) - Employee Provident Fund
  // ============================================================
  EPF: {
    // Employee Contribution Rates
    EMPLOYEE_RATE_STANDARD: 0.11,     // 11% (age < 60)
    EMPLOYEE_RATE_SENIOR: 0.055,      // 5.5% (age >= 60)
    // Employer Contribution Rates
    EMPLOYER_RATE_STANDARD: 0.13,     // 13% (salary ≤ RM5,000 after 1.1.2024)
    EMPLOYER_RATE_ABOVE_5K: 0.12,     // 12% (salary > RM5,000)
    EMPLOYER_RATE_SENIOR: 0.04,       // 4% (employee age >= 60)
    // Salary threshold
    EMPLOYER_HIGHER_RATE_THRESHOLD: 5000,
    // Maximum insurable earnings (no cap on EPF technically, but for reference)
    MAX_MONTHLY_CONTRIBUTION_CAP: null,
  },

  // ============================================================
  // SOCSO (PERKESO) - Social Security Organisation
  // ============================================================
  SOCSO: {
    MAX_INSURABLE_SALARY: 4000,  // Contributions on first RM4,000 only
    EMPLOYEE_RATE: 0.005,        // 0.5%
    EMPLOYER_RATE: 0.0175,       // 1.75%
    // Employees aged 60+ (Employment Injury scheme only)
    EMPLOYER_RATE_SENIOR: 0.0125, // 1.25%
  },

  // ============================================================
  // EIS (SIP) - Employment Insurance System
  // ============================================================
  EIS: {
    MAX_INSURABLE_SALARY: 4000,  // Contributions on first RM4,000 only
    EMPLOYEE_RATE: 0.002,        // 0.2%
    EMPLOYER_RATE: 0.002,        // 0.2%
    // Employees aged 57+ are NOT subject to EIS
    MAX_AGE: 57,
  },

  // ============================================================
  // PCB (Potongan Cukai Bulanan) - Monthly Tax Deduction
  // ============================================================
  PCB: {
    // Individual Income Tax Rates YA 2024
    INCOME_BRACKETS: [
      { upTo: 5000,    rate: 0.00, base: 0 },
      { upTo: 20000,   rate: 0.01, base: 0 },
      { upTo: 35000,   rate: 0.03, base: 150 },
      { upTo: 50000,   rate: 0.08, base: 600 },
      { upTo: 70000,   rate: 0.13, base: 1800 },
      { upTo: 100000,  rate: 0.21, base: 5700 },
      { upTo: 250000,  rate: 0.24, base: 12000 },
      { upTo: 400000,  rate: 0.245, base: 48000 },
      { upTo: 600000,  rate: 0.25, base: 84750 },
      { upTo: 1000000, rate: 0.26, base: 134750 },
      { upTo: 2000000, rate: 0.28, base: 238950 },
      { above: 2000000, rate: 0.30, base: 518950 },
    ],
    // Personal Reliefs (Annual)
    PERSONAL_RELIEF: 9000,
    SPOUSE_RELIEF: 4000,
    CHILD_RELIEF: 2000,  // per child
  },

  // ============================================================
  // SST (Sales & Service Tax) — YA 2026
  // Register with RMCD when annual taxable turnover ≥ RM500,000
  // ============================================================
  SST: {
    // Service Tax (ST) — effective 1 March 2024
    SERVICE_TAX_RATE:        0.08, // 8% — professional, IT, hotel, consultancy etc.
    SERVICE_TAX_RATE_FB:     0.06, // 6% — F&B and telecommunications (unchanged)
    SALES_TAX_RATES: {
      STANDARD: 0.10,             // 10% — manufactured/imported goods
      REDUCED:  0.05,             // 5%  — food preparations, construction materials
      ZERO:     0.00,             // 0%  — exports, basic food, agriculture inputs
    },
    REGISTRATION_THRESHOLD: 500000, // RM500,000 annual taxable turnover
    // e-Invoicing: ALL transactions (B2B, B2C, B2G) must use LHDN MyInvois
    // Transition period ended July 2025 — 100% mandatory from 2026.
    EINVOICE_MANDATORY: true,
    EINVOICE_PLATFORM:  'MyInvois (LHDN)',
  },

  // ============================================================
  // COMPLIANCE CALENDAR (Self-Assessment System)
  // ============================================================
  COMPLIANCE: {
    // CP204: Estimated tax — submit 30 days BEFORE start of new financial year
    CP204_SUBMISSION_DAYS_BEFORE_FY: 30,
    // CP204 instalment: pay in 12 equal monthly instalments by the 10th
    CP204_INSTALMENTS: 12,
    CP204_PAYMENT_DAY:  10,  // 10th of each month
    // Form C: annual tax return — 7 months after financial year end
    FORM_C_MONTHS_AFTER_FY: 7,
  },

  // ============================================================
  // TAX INCENTIVES
  // ============================================================
  INCENTIVES: {
    PIONEER_STATUS: {
      MIN_TAX_EXEMPTION: 0.70, // 70% income tax exemption
      MAX_TAX_EXEMPTION: 1.00, // 100% income tax exemption
      DURATION_YEARS_MIN: 5,
      DURATION_YEARS_MAX: 10,
      APPLICABLE_TO: 'High-tech, manufacturing, strategic projects',
    },
    // Capital Allowance applies because accounting depreciation is NOT
    // allowed as a tax deduction under ITA 1967.
    CAPITAL_ALLOWANCE_NOTE: 'Replaces depreciation — deductible from chargeable income (Schedule 3, ITA 1967)',
  },

  // ============================================================
  // WITHHOLDING TAX
  // ============================================================
  WITHHOLDING_TAX: {
    CONTRACT_PAYMENT_RESIDENT: 0.10,      // 10%
    CONTRACT_PAYMENT_NON_RESIDENT: 0.10, // 10%
    ROYALTY_NON_RESIDENT: 0.10,          // 10%
    INTEREST_NON_RESIDENT: 0.15,         // 15%
    TECHNICAL_FEES_NON_RESIDENT: 0.10,   // 10%
    DIVIDENDS: 0.00,                      // 0% (single-tier)
  },

  // ============================================================
  // CAPITAL ALLOWANCE
  // ============================================================
  CAPITAL_ALLOWANCE: {
    // Initial Allowance (IA) - Year 1 only
    INITIAL_ALLOWANCE: 0.20,     // 20% of qualifying cost
    // Annual Allowance (AA) - each subsequent year
    ANNUAL_ALLOWANCE: {
      PLANT_MACHINERY: 0.20,     // 20%
      MOTOR_VEHICLES: 0.20,      // 20%
      OFFICE_EQUIPMENT: 0.20,    // 20%
      FURNITURE: 0.10,           // 10%
      COMPUTERS: 0.80,           // 80% (Accelerated Capital Allowance)
    },
    // Accelerated Capital Allowance (ACA) for SMEs
    ACA_COMPUTER_EQUIPMENT: 1.00, // Full write-off in 1 year for SME
    ACA_CERTIFICATION: 'MS ISO or equivalent',
  },

  // ============================================================
  // ZAKAT (Islamic Obligatory Tithe)
  // ============================================================
  ZAKAT: {
    NISAB_RATE: 0.025,  // 2.5% of zakatable income
    // Zakat can offset up to 10% of company tax liability (companies)
    COMPANY_TAX_OFFSET_CAP: 0.10,
  },

  // ============================================================
  // REAL PROPERTY GAINS TAX (RPGT)
  // ============================================================
  RPGT: {
    COMPANY_RATES: [
      { yearsHeld: [1], rate: 0.30 },
      { yearsHeld: [2], rate: 0.20 },
      { yearsHeld: [3], rate: 0.15 },
      { yearsHeld: [4], rate: 0.10 },
      { yearsHeld: [5], rate: 0.05 },
      { yearsHeld: [6, Infinity], rate: 0.00 },
    ],
  },

  // ============================================================
  // GENERAL
  // ============================================================
  DEFAULT_CURRENCY: 'MYR',
  FINANCIAL_YEAR_MONTHS: 12,
  COUNTRY: 'Malaysia',
};

module.exports = TAX_CONSTANTS;
