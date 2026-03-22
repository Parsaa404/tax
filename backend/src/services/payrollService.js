/**
 * MYTax - Payroll Calculation Service
 * Computes EPF, SOCSO, EIS, PCB (monthly tax), Zakat per LHDN/KWSP/PERKESO regulations.
 */
const TAX = require('../config/constants');

class PayrollService {
  /**
   * Calculate EPF contributions
   * @param {number} grossSalary
   * @param {number} employeeAge
   * @param {boolean} isForeign
   */
  calculateEPF(grossSalary, employeeAge = 30, isForeign = false) {
    // Foreign workers are not compulsory EPF contributors
    if (isForeign) return { employee: 0, employer: 0, epf_salary: grossSalary, note: 'Foreign worker - EPF not compulsory' };

    const isSenior = employeeAge >= 60;
    const employeeRate = isSenior ? TAX.EPF.EMPLOYEE_RATE_SENIOR : TAX.EPF.EMPLOYEE_RATE_STANDARD;

    let employerRate;
    if (isSenior) {
      employerRate = TAX.EPF.EMPLOYER_RATE_SENIOR;
    } else if (grossSalary > TAX.EPF.EMPLOYER_HIGHER_RATE_THRESHOLD) {
      employerRate = TAX.EPF.EMPLOYER_RATE_ABOVE_5K;
    } else {
      employerRate = TAX.EPF.EMPLOYER_RATE_STANDARD;
    }

    // Round to nearest RM (EPF rounds to nearest sen)
    const employeeEPF = Math.floor(grossSalary * employeeRate * 100) / 100;
    const employerEPF = Math.floor(grossSalary * employerRate * 100) / 100;

    return {
      employee: employeeEPF,
      employer: employerEPF,
      employee_rate: employeeRate,
      employer_rate: employerRate,
      epf_salary: grossSalary,
      is_senior: isSenior,
    };
  }

  /**
   * Calculate SOCSO contributions
   * @param {number} grossSalary
   * @param {number} employeeAge
   * @param {boolean} isForeign
   */
  calculateSOCSO(grossSalary, employeeAge = 30, isForeign = false) {
    if (isForeign) return { employee: 0, employer: 0, socso_salary: 0, note: 'Foreign worker - SOCSO not applicable' };

    const insurableSalary = Math.min(grossSalary, TAX.SOCSO.MAX_INSURABLE_SALARY);
    const isSenior = employeeAge >= 60;

    // Age >= 60: employer only (Employment Injury scheme), employee exempt
    const employeeSOCSO = isSenior ? 0 : Math.floor(insurableSalary * TAX.SOCSO.EMPLOYEE_RATE * 100) / 100;
    const employerRate = isSenior ? TAX.SOCSO.EMPLOYER_RATE_SENIOR : TAX.SOCSO.EMPLOYER_RATE;
    const employerSOCSO = Math.floor(insurableSalary * employerRate * 100) / 100;

    return {
      employee: employeeSOCSO,
      employer: employerSOCSO,
      socso_salary: insurableSalary,
      is_senior: isSenior,
    };
  }

  /**
   * Calculate EIS contributions
   * @param {number} grossSalary
   * @param {number} employeeAge
   * @param {boolean} isForeign
   */
  calculateEIS(grossSalary, employeeAge = 30, isForeign = false) {
    if (isForeign) return { employee: 0, employer: 0, eis_salary: 0, note: 'Foreign worker - EIS not applicable' };
    if (employeeAge >= TAX.EIS.MAX_AGE) {
      return { employee: 0, employer: 0, eis_salary: 0, note: 'Employee age >= 57 - EIS not applicable' };
    }

    const insurableSalary = Math.min(grossSalary, TAX.EIS.MAX_INSURABLE_SALARY);
    const employeeEIS = Math.floor(insurableSalary * TAX.EIS.EMPLOYEE_RATE * 100) / 100;
    const employerEIS = Math.floor(insurableSalary * TAX.EIS.EMPLOYER_RATE * 100) / 100;

    return {
      employee: employeeEIS,
      employer: employerEIS,
      eis_salary: insurableSalary,
    };
  }

  /**
   * Calculate PCB (Monthly Tax Deduction)
   * Simplified calculation based on annual income projection.
   * @param {number} grossMonthly
   * @param {number} spouseStatus - 0 = single/not applicable, 1 = married
   * @param {number} numChildren
   * @param {boolean} isMuslim
   */
  calculatePCB(grossMonthly, spouseStatus = 0, numChildren = 0, isMuslim = false) {
    const annualIncome = grossMonthly * 12;

    // Apply personal reliefs
    let taxableIncome = annualIncome
      - TAX.PCB.PERSONAL_RELIEF
      - (spouseStatus === 1 ? TAX.PCB.SPOUSE_RELIEF : 0)
      - (numChildren * TAX.PCB.CHILD_RELIEF);

    if (taxableIncome <= 0) return { monthly_pcb: 0, annual_tax: 0, taxable_annual: 0 };

    // Progressive tax
    const brackets = TAX.PCB.INCOME_BRACKETS;
    let annualTax = 0;
    let prevLimit = 0;

    for (const bracket of brackets) {
      const limit = bracket.upTo || Infinity;
      if (taxableIncome <= prevLimit) break;

      const band = Math.min(taxableIncome, limit) - prevLimit;
      if (band > 0) annualTax += band * bracket.rate;
      prevLimit = limit;
      if (bracket.above) {
        // Final bracket
        if (taxableIncome > bracket.above) {
          annualTax += (taxableIncome - bracket.above) * bracket.rate;
        }
        break;
      }
    }

    const monthlyPCB = Math.max(annualTax / 12, 0);

    return {
      gross_monthly: grossMonthly,
      annual_income: annualIncome,
      taxable_annual: taxableIncome,
      annual_tax: annualTax,
      monthly_pcb: Math.round(monthlyPCB * 100) / 100,
    };
  }

  /**
   * Calculate Zakat for Muslim employees
   * @param {number} netMonthly - after EPF and other deductions
   * @param {boolean} isMuslim
   */
  calculateZakat(netMonthly, isMuslim = false) {
    if (!isMuslim) return { zakat: 0, applicable: false };
    const annualNet = netMonthly * 12;
    // Zakat = 2.5% of annual zakatable income (savings exceeding nisab)
    const zakat_annual = annualNet * TAX.ZAKAT.NISAB_RATE;
    return {
      applicable: true,
      zakat_monthly: Math.round((zakat_annual / 12) * 100) / 100,
      zakat_annual,
      rate: TAX.ZAKAT.NISAB_RATE,
    };
  }

  /**
   * Full payroll calculation for one employee
   */
  calculateEmployeePayroll(employee, payPeriod = {}) {
    const { bonus = 0, allowances = 0, overtime = 0, other_deductions = 0 } = payPeriod;

    // PostgreSQL returns DECIMAL/NUMERIC as strings — always parse
    const basicSalary = parseFloat(employee.basic_salary) || 0;
    const grossSalary = basicSalary + parseFloat(bonus) + parseFloat(allowances) + parseFloat(overtime);
    const age = employee.date_of_birth
      ? Math.floor((new Date() - new Date(employee.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
      : 30;

    const epf = this.calculateEPF(basicSalary, age, employee.is_foreign); // EPF on basic only
    const socso = this.calculateSOCSO(basicSalary, age, employee.is_foreign);
    const eis = this.calculateEIS(basicSalary, age, employee.is_foreign);

    const netForPCB = basicSalary - epf.employee; // EPF reduces PCB base
    const pcb = this.calculatePCB(netForPCB, employee.spouse_status, employee.num_children, employee.is_muslim);

    // Optional Zakat
    const netBeforeZakat = grossSalary - epf.employee - socso.employee - eis.employee - pcb.monthly_pcb;
    const zakatInfo = employee.is_muslim ? this.calculateZakat(netBeforeZakat, true) : { zakat: 0, zakat_monthly: 0 };
    const zakatDeduction = zakatInfo.zakat_monthly || 0;

    const totalDeductions = epf.employee + socso.employee + eis.employee + pcb.monthly_pcb + zakatDeduction + other_deductions;
    const netSalary = grossSalary - totalDeductions;

    const employerCost = grossSalary + epf.employer + socso.employer + eis.employer;

    return {
      // Input
      basic_salary: basicSalary,
      bonus,
      allowances,
      overtime,
      gross_salary: grossSalary,
      // Deductions
      epf_employee: epf.employee,
      epf_employer: epf.employer,
      socso_employee: socso.employee,
      socso_employer: socso.employer,
      eis_employee: eis.employee,
      eis_employer: eis.employer,
      pcb: pcb.monthly_pcb,
      zakat: zakatDeduction,
      other_deductions,
      // Results
      net_salary: Math.round(netSalary * 100) / 100,
      employer_cost: Math.round(employerCost * 100) / 100,
      calculation_details: { epf, socso, eis, pcb, zakat: zakatInfo },
    };
  }
}

module.exports = new PayrollService();
