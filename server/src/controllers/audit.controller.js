const { db } = require('../db');

function getAuditLogs(req, res) {
  const { limit = 50, entity, action } = req.query;

  let query = `
    SELECT 
      al.id, al.user_id, al.action, al.entity, al.entity_id, al.details, al.ip_address, al.created_at,
      u.full_name as user_name, u.email as user_email, u.role as user_role
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (entity) {
    query += ' AND al.entity = ?';
    params.push(entity);
  }

  if (action) {
    query += ' AND al.action = ?';
    params.push(action);
  }

  query += ' ORDER BY al.id DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  const logs = db.prepare(query).all(...params);
  return res.json(logs);
}

module.exports = {
  getAuditLogs
};
