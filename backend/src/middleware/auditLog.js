const { db } = require('../config/database');

/**
 * Immutable Audit Log Middleware
 * Records every mutation (POST, PUT, PATCH, DELETE) to audit_log.
 * Audit entries are NEVER updated or deleted.
 */
const auditLog = (entityType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    // Only log successful mutations
    if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== 'GET') {
      try {
        await db('audit_log').insert({
          company_id: req.user?.companyId || null,
          user_id: req.user?.userId || null,
          user_email: req.user?.email || 'anonymous',
          action: req.method === 'POST' ? 'CREATE' : req.method === 'PUT' || req.method === 'PATCH' ? 'UPDATE' : req.method === 'DELETE' ? 'DELETE' : req.method,
          entity_type: entityType,
          entity_id: body?.data?.id || body?.id || null,
          new_values: body?.data || body,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
        });
      } catch (err) {
        // Never block response because of audit log failure
        console.error('Audit log error:', err.message);
      }
    }
    return originalJson(body);
  };

  next();
};

module.exports = { auditLog };
