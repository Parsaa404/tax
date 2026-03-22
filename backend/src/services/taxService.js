/**
 * MYTax - Tax Computation Service
 * Implements Malaysian tax calculations per LHDN regulations.
 * Updated for YA 2026: CGT (CGTA 2023), GMT (Pillar Two), SST 8%/6% split.
 */
const TAX = require('../config/constants');

class TaxService {
  /**
   * Calculate Corporate Income Tax (CIT)
   * Implements SME tiered rates: 15% / 17% / 24%
   * @param {number} chargeableIncome
   * @param {boolean} isSme
   * @param {boolean} isPartOfLargeGroup
   * @returns {Object} tax breakdown
   */
  calculateCIT(chargeableIncome, isSme = true, isPartOfLargeGroup = false) {
    if (chargeableIncome < 0) chargeableIncome = 0;

    // Non-SME or part of large group → flat 24%
    if (!isSme || isPartOfLargeGroup) {
      const tax = chargeableIncome * TAX.CIT.STANDARD_RATE;
      return {
        chargeable_income: chargeableIncome,
        is_sme: false,
        tax_rate_applied: TAX.CIT.STANDARD_RATE,
        tax_on_first_band: 0,
        tax_on_second_band: 0,
        tax_on_remainder: tax,
        total_tax: tax,
        effective_rate: chargeableIncome > 0 ? (tax / chargeableIncome) : 0,
        breakdown: [{ band: 'Standard 24%', amount: chargeableIncome, rate: 0.24, tax }],
      };
    }

    // SME tiered calculation
    let remaining = chargeableIncome;
    let tax_on_first_band = 0;
    let tax_on_second_band = 0;
    let tax_on_remainder = 0;
    const breakdown = [];

    // Band 1: First RM150,000 at 15%
    const BAND1 = 150000;
    const BAND2 = 600000; // cumulative up to RM600,000

    if (remaining > 0) {
      const band1Amount = Math.min(remaining, BAND1);
      tax_on_first_band = band1Amount * 0.15;
      breakdown.push({ band: 'First RM150,000 @ 15%', amount: band1Amount, rate: 0.15, tax: tax_on_first_band });
      remaining -= band1Amount;
    }

    // Band 2: RM150,001 - RM600,000 at 17%
    if (remaining > 0) {
      const band2Amount = Math.min(remaining, BAND2 - BAND1);
      tax_on_second_band = band2Amount * 0.17;
      breakdown.push({ band: 'RM150,001 - RM600,000 @ 17%', amount: band2Amount, rate: 0.17, tax: tax_on_second_band });
      remaining -= band2Amount;
    }

    // Band 3: Above RM600,000 at 24%
    if (remaining > 0) {
      tax_on_remainder = remaining * 0.24;
      breakdown.push({ band: 'Above RM600,000 @ 24%', amount: remaining, rate: 0.24, tax: tax_on_remainder });
    }

    const total_tax = tax_on_first_band + tax_on_second_band + tax_on_remainder;

    return {
      chargeable_income: chargeableIncome,
      is_sme: true,
      tax_on_first_band,
      tax_on_second_band,
      tax_on_remainder,
      total_tax,
      effective_rate: chargeableIncome > 0 ? (total_tax / chargeableIncome) : 0,
      breakdown,
    };
  }

  /**
   * Calculate SST (Sales & Service Tax)
   * @param {number} amount - taxable amount
   * @param {'service'|'sales_standard'|'sales_reduced'|'zero'} type
   */
  calculateSST(amount, type = 'service') {
    const rates = {
      service:           TAX.SST.SERVICE_TAX_RATE,      // 8% — professional, IT, consultancy, hotel
      service_fb:        TAX.SST.SERVICE_TAX_RATE_FB,   // 6% — F&B and telecommunications
      sales_standard:    TAX.SST.SALES_TAX_RATES.STANDARD,
      sales_reduced:     TAX.SST.SALES_TAX_RATES.REDUCED,
      zero:              0,
    };
    // NOTE: use explicit undefined check because zero (0) is falsy
    const rate = rates[type] !== undefined ? rates[type] : TAX.SST.SERVICE_TAX_RATE;
    const tax_amount = amount * rate;
    return {
      taxable_amount: amount,
      tax_type: type,
      rate,
      tax_amount,
      total: amount + tax_amount,
    };
  }

  /**
   * Calculate Withholding Tax
   * @param {number} amount
   * @param {string} type - 'contract_resident', 'royalty', 'interest', 'technical_fees', 'dividends'
   */
  calculateWithholdingTax(amount, type) {
    const rates = {
      contract_resident:     TAX.WITHHOLDING_TAX.CONTRACT_PAYMENT_RESIDENT,
      contract_non_resident: TAX.WITHHOLDING_TAX.CONTRACT_PAYMENT_NON_RESIDENT,
      contract_payments:     TAX.WITHHOLDING_TAX.CONTRACT_PAYMENT_RESIDENT,
      royalty:               TAX.WITHHOLDING_TAX.ROYALTY_NON_RESIDENT,
      interest:              TAX.WITHHOLDING_TAX.INTEREST_NON_RESIDENT,
      technical_fees:        TAX.WITHHOLDING_TAX.TECHNICAL_FEES_NON_RESIDENT,
      dividends:             0,
      rental:                0.10, // rental of movable property
    };
    const rate = rates[type] !== undefined ? rates[type] : 0.10;
    const tax_amount = amount * rate;
    return {
      gross_amount: amount,
      withholding_type: type,
      rate,
      tax_amount,
      net_payment: amount - tax_amount,
    };
  }

  /**
   * Calculate Capital Gains Tax (CGT) — CGTA 2023, fully in force from YA 2024
   * 10% on net gains from disposal of unlisted shares in Malaysian companies.
   * Listed shares on Bursa Malaysia are CGT-exempt.
   * @param {number} considerationReceived  — sale proceeds
   * @param {number} acquisitionCost        — cost basis (including incidentals)
   * @param {boolean} isListed              — true = Bursa listed (exempt)
   */
  calculateCGT(considerationReceived, acquisitionCost, isListed = false) {
    const grossGain = Math.max(considerationReceived - acquisitionCost, 0);
    if (isListed) {
      return {
        listed: true,
        gross_gain: grossGain,
        rate: TAX.CGT.LISTED_SHARES_RATE,
        cgt_payable: 0,
        note: 'Listed shares on Bursa Malaysia are exempt from CGT.',
      };
    }
    const rate = TAX.CGT.UNLISTED_SHARES_RATE; // 10%
    const cgt_payable = grossGain * rate;
    return {
      listed: false,
      consideration_received: considerationReceived,
      acquisition_cost: acquisitionCost,
      gross_gain: grossGain,
      rate,
      cgt_payable,
      effective_date: TAX.CGT.EFFECTIVE_DATE,
      note: 'Capital Gains Tax on unlisted shares — CGTA 2023 (effective 1 March 2024)',
    };
  }

  /**
   * Assess Global Minimum Tax (GMT / Pillar Two) exposure
   * Applies to MNE groups with global revenue ≥ EUR 750M.
   * Malaysia implements QDMTT — top-up tax collected locally.
   * @param {number} effectiveTaxRate  — current group ETR (decimal, e.g. 0.09)
   * @param {number} jurisdictionalProfit — profit in Malaysia (MYR)
   * @param {boolean} isMNE            — is the company part of a qualifying MNE group?
   */
  assessGMT(effectiveTaxRate, jurisdictionalProfit, isMNE = false) {
    if (!isMNE) {
      return {
        applicable: false,
        note: `GMT only applies to MNE groups with global revenue ≥ EUR ${(TAX.GMT.REVENUE_THRESHOLD_EUR / 1e6)}M. SMEs are not affected.`,
      };
    }
    const MIN_RATE = TAX.GMT.MINIMUM_RATE; // 15%
    if (effectiveTaxRate >= MIN_RATE) {
      return { applicable: true, current_etr: effectiveTaxRate, minimum_rate: MIN_RATE, top_up_rate: 0, top_up_tax: 0, note: 'ETR meets or exceeds 15% — no GMT top-up required.' };
    }
    const top_up_rate = MIN_RATE - effectiveTaxRate;
    const top_up_tax = jurisdictionalProfit * top_up_rate;
    return {
      applicable: true,
      current_etr: effectiveTaxRate,
      minimum_rate: MIN_RATE,
      top_up_rate,
      top_up_tax,
      note: `QDMTT top-up of ${(top_up_rate * 100).toFixed(2)}% applied on Malaysian profits.`,
    };
  }

  /**
   * Calculate Capital Allowance for a fixed asset
   * @param {Object} asset - { cost, acquisition_date, category, year_of_assessment }
   */
  calculateCapitalAllowance(asset) {
    const { cost, acquisition_date, category, year_of_assessment } = asset;
    const acquisitionYear = new Date(acquisition_date).getFullYear();
    const yearsElapsed = year_of_assessment - acquisitionYear;

    // Get rates
    // Map lowercase DB-style categories → constant key names
    const categoryKeyMap = {
      plant_machinery: 'PLANT_MACHINERY',
      motor_vehicles: 'MOTOR_VEHICLES',
      office_equipment: 'OFFICE_EQUIPMENT',
      furniture: 'FURNITURE',
      computers: 'COMPUTERS',
    };
    const aaRates = TAX.CAPITAL_ALLOWANCE.ANNUAL_ALLOWANCE;
    const iaRate = TAX.CAPITAL_ALLOWANCE.INITIAL_ALLOWANCE;
    const aaKey = categoryKeyMap[category] || categoryKeyMap[category?.toLowerCase()] || null;

    // Computers get ACA (full year 1 write-off for SME)
    if (category === 'computers') {
      if (yearsElapsed === 0) {
        return {
          year: year_of_assessment,
          is_year_1: true,
          ia: 0,
          aa: cost, // 100% ACA
          total_ca: cost,
          residual_expenditure: 0,
          note: 'Accelerated Capital Allowance - full write-off for computer equipment',
        };
      }
      return { year: year_of_assessment, is_year_1: false, ia: 0, aa: 0, total_ca: 0, residual_expenditure: 0 };
    }

    const aaRate = aaKey ? (aaRates[aaKey] || 0.10) : 0.10;

    if (yearsElapsed === 0) {
      // Year 1: IA + AA
      const ia = cost * iaRate;
      const aa = cost * aaRate;
      const totalCA = Math.min(ia + aa, cost);
      return {
        year: year_of_assessment,
        is_year_1: true,
        ia,
        aa,
        total_ca: totalCA,
        residual_expenditure: cost - totalCA,
        category,
        ia_rate: iaRate,
        aa_rate: aaRate,
      };
    } else {
      // Subsequent years: AA only on residual
      const iaAlreadyClaimed = cost * iaRate;
      const aaAlreadyClaimed = cost * aaRate * yearsElapsed;
      const alreadyClaimed = Math.min(iaAlreadyClaimed + aaAlreadyClaimed, cost);
      const residualBroughtForward = Math.max(cost - alreadyClaimed, 0);
      const aa = Math.min(cost * aaRate, residualBroughtForward);
      return {
        year: year_of_assessment,
        is_year_1: false,
        ia: 0,
        aa,
        total_ca: aa,
        residual_expenditure: Math.max(residualBroughtForward - aa, 0),
        category,
        aa_rate: aaRate,
      };
    }
  }

  /**
   * Run full tax computation for a company for a financial year
   * @param {Object} data - company financials
   */
  computeFullTax(data) {
    const {
      gross_revenue,
      total_allowable_expenses,
      total_capital_allowance,
      losses_brought_forward = 0,
      zakat_paid = 0,
      cp204_paid = 0,
      is_sme = true,
      is_part_of_large_group = false,
    } = data;

    const adjusted_income = gross_revenue - total_allowable_expenses;
    const statutory_income = Math.max(adjusted_income - total_capital_allowance, 0);
    const chargeable_income = Math.max(statutory_income - losses_brought_forward, 0);

    const citResult = this.calculateCIT(chargeable_income, is_sme, is_part_of_large_group);

    // Zakat offset (max 10% of tax)
    const max_zakat_offset = citResult.total_tax * TAX.ZAKAT.COMPANY_TAX_OFFSET_CAP;
    const zakat_offset = Math.min(zakat_paid, max_zakat_offset);
    const tax_after_rebates = Math.max(citResult.total_tax - zakat_offset, 0);
    const balance_tax_payable = Math.max(tax_after_rebates - cp204_paid, 0);

    return {
      gross_revenue,
      total_allowable_expenses,
      adjusted_income,
      total_capital_allowance,
      statutory_income,
      losses_brought_forward,
      chargeable_income,
      ...citResult,
      tax_before_rebates: citResult.total_tax,
      zakat_offset,
      tax_after_rebates,
      cp204_paid,
      balance_tax_payable,
      overpayment: Math.max(cp204_paid - tax_after_rebates, 0),
    };
  }
}

module.exports = new TaxService();
