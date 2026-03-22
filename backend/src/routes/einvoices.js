const express = require('express');
const { db } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Mock LHDN MyInvois e-Invoice Service
const mockLHDN = {
  submit: async (invoice, company) => ({
    uuid: `UUID-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    submission_uid: `SUB-${Date.now()}`,
    long_id: `LONG-${Date.now()}`,
    validation_status: 'pending',
    lhdn_status: 'submitted',
    submitted_at: new Date().toISOString(),
  }),
  checkStatus: async (uuid) => ({
    uuid,
    validation_status: 'valid',
    lhdn_status: 'accepted',
    validated_at: new Date().toISOString(),
    qr_code_url: `https://myinvois.hasil.gov.my/qr/${uuid}`,
  }),
};

// POST /api/einvoices/submit/:invoiceId
router.post('/submit/:invoiceId', requireRole('owner', 'accountant'), async (req, res) => {
  try {
    const invoice = await db('invoices as i')
      .join('customers as c', 'i.customer_id', 'c.id')
      .where('i.id', req.params.invoiceId)
      .where('i.company_id', req.user.companyId)
      .select('i.*', 'c.name as customer_name', 'c.tax_number as customer_tax_number')
      .first();

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.einvoice_id) return res.status(409).json({ error: 'e-Invoice already submitted', einvoice_id: invoice.einvoice_id });

    const company = await db('companies').where({ id: req.user.companyId }).first();
    const items = await db('invoice_items').where({ invoice_id: invoice.id }).orderBy('line_number');

    // Build MyInvois JSON payload
    const payload = {
      eInvoiceVersion: '1.0',
      eInvoiceTypeCode: '01',   // 01 = Invoice
      eInvoiceCode: invoice.invoice_number,
      eInvoiceOriginalReferenceNumber: null,
      issuanceDateTime: new Date(invoice.issue_date).toISOString(),
      invoiceCurrencyCode: invoice.currency || 'MYR',
      currencyExchangeRate: 1,
      billFrequency: null,
      billingPeriod: null,
      paymentMode: '02',         // 02 = credit
      paymentTerms: `Due by ${invoice.due_date}`,
      paymentDueDate: invoice.due_date,
      supplierDetails: {
        TIN: company.tax_number,
        registrationNo: company.registration_number,
        businessName: company.name,
        address: company.address,
        country: company.country || 'MY',
      },
      buyerDetails: {
        TIN: invoice.customer_tax_number,
        businessName: invoice.customer_name,
      },
      lineItems: items.map((item) => ({
        classification: '004',
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unit_price),
        subtotal: parseFloat(item.subtotal),
        taxType: invoice.tax_type === 'SST' ? 'S' : 'E',
        taxRate: invoice.tax_rate,
        taxAmount: (parseFloat(item.subtotal) * (invoice.tax_rate / 100)),
        total: parseFloat(item.subtotal) * (1 + invoice.tax_rate / 100),
      })),
      invoiceSummary: {
        subtotal: parseFloat(invoice.subtotal),
        taxAmount: parseFloat(invoice.tax_amount),
        totalExcludingTax: parseFloat(invoice.subtotal),
        totalIncludingTax: parseFloat(invoice.total_amount),
      },
    };

    // Call mock LHDN
    const lhdnResponse = await mockLHDN.submit(invoice, company);

    const [einvoice] = await db('einvoices').insert({
      company_id: req.user.companyId,
      invoice_id: invoice.id,
      uuid: lhdnResponse.uuid,
      submission_uid: lhdnResponse.submission_uid,
      long_id: lhdnResponse.long_id,
      validation_status: lhdnResponse.validation_status,
      lhdn_status: lhdnResponse.lhdn_status,
      json_payload: payload,
      lhdn_response: lhdnResponse,
      submitted_at: lhdnResponse.submitted_at,
    }).returning('*');

    // Update invoice with einvoice info
    await db('invoices').where({ id: invoice.id }).update({
      einvoice_id: lhdnResponse.uuid,
      einvoice_status: 'pending',
      status: 'sent',
      updated_at: new Date(),
    });

    res.status(201).json({ message: 'e-Invoice submitted successfully', data: einvoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/einvoices/status/:uuid
router.get('/status/:uuid', async (req, res) => {
  try {
    const einvoice = await db('einvoices')
      .where({ uuid: req.params.uuid, company_id: req.user.companyId }).first();
    if (!einvoice) return res.status(404).json({ error: 'e-Invoice not found' });

    // Mock status check from LHDN
    const statusUpdate = await mockLHDN.checkStatus(req.params.uuid);

    const [updated] = await db('einvoices').where({ id: einvoice.id }).update({
      validation_status: statusUpdate.validation_status,
      lhdn_status: statusUpdate.lhdn_status,
      qr_code_url: statusUpdate.qr_code_url,
      validated_at: statusUpdate.validated_at,
      updated_at: new Date(),
    }).returning('*');

    // Update invoice status
    if (statusUpdate.validation_status === 'valid') {
      await db('invoices').where({ einvoice_id: req.params.uuid }).update({
        einvoice_status: 'valid', updated_at: new Date(),
      });
    }

    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/einvoices (list all)
router.get('/', async (req, res) => {
  try {
    const einvoices = await db('einvoices as e')
      .join('invoices as i', 'e.invoice_id', 'i.id')
      .where('e.company_id', req.user.companyId)
      .select('e.*', 'i.invoice_number', 'i.total_amount')
      .orderBy('e.submitted_at', 'desc');
    res.json({ data: einvoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
