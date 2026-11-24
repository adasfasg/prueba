const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'pmforgex.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for reliability and performance
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initSchema() {
  db.exec(`
    -- Tabla de Usuarios con control de estado y borrado suave
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN (
        'super_admin',
        'director_ops',
        'director_pms',
        'director_creators',
        'pm',
        'creator',
        'server_owner'
      )),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      phone TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    );

    -- Tabla de Códigos de Verificación de Inicio de Sesión (2FA / OTP)
    CREATE TABLE IF NOT EXISTS login_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      otp_code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Perfil de Creador (separación estricta de datos públicos vs privados)
    CREATE TABLE IF NOT EXISTS creator_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alias TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT,
      games TEXT DEFAULT '["Metin2"]',
      platforms TEXT DEFAULT '["Twitch"]',
      social_links TEXT DEFAULT '{}',
      is_available INTEGER DEFAULT 1,
      -- DATOS PRIVADOS (Solo Super Admin)
      hourly_rate_internal REAL DEFAULT 0,
      fixed_rate_internal REAL DEFAULT 0,
      commission_percentage REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Servidores Privados
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      game TEXT NOT NULL DEFAULT 'Metin2',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'suspended')),
      contact_info TEXT,
      owner_user_id INTEGER REFERENCES users(id),
      pm_user_id INTEGER REFERENCES users(id),
      budget REAL DEFAULT 0,
      logo_url TEXT,
      website_url TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    );

    -- Relación Servidor - Múltiples PMs Asignados
    CREATE TABLE IF NOT EXISTS server_pms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      pm_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      UNIQUE(server_id, pm_id)
    );

    -- Relación Servidor - Creadores Asignados
    CREATE TABLE IF NOT EXISTS server_creators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      UNIQUE(server_id, creator_id)
    );

    -- Campañas de Promoción
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE RESTRICT,
      pm_user_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft', 'active', 'paused', 'completed')),
      start_date DATE,
      end_date DATE,
      objective TEXT,
      requirements TEXT,
      budget_internal REAL DEFAULT 0,
      target_evidences INTEGER DEFAULT 0,
      target_hours REAL DEFAULT 0,
      pm_fee REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    );

    -- Relación Campaña - Múltiples PMs Asignados a Cargo
    CREATE TABLE IF NOT EXISTS campaign_pms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      pm_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(campaign_id, pm_id)
    );

    -- Creadores vinculados a una Campaña
    CREATE TABLE IF NOT EXISTS campaign_creators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agreement_terms TEXT,
      payout_internal REAL DEFAULT 0,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(campaign_id, creator_id)
    );

    -- Registro de Actividades, Métricas y Evidencias
    CREATE TABLE IF NOT EXISTS activity_evidences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
      creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      type TEXT NOT NULL CHECK(type IN ('stream', 'video', 'post', 'event')),
      platform TEXT NOT NULL CHECK(platform IN ('Twitch', 'YouTube', 'TikTok', 'Kick', 'Facebook', 'Discord', 'Otro')),
      content_url TEXT NOT NULL,
      activity_date DATE NOT NULL,
      duration_minutes INTEGER DEFAULT 0,
      avg_viewers INTEGER DEFAULT 0,
      peak_viewers INTEGER DEFAULT 0,
      total_views INTEGER DEFAULT 0,
      evidence_screenshots TEXT DEFAULT '[]',
      creator_notes TEXT,
      internal_notes TEXT,
      status TEXT NOT NULL DEFAULT 'review' CHECK(status IN ('pending', 'review', 'approved', 'rejected', 'paid')),
      rejection_reason TEXT,
      reviewed_by_user_id INTEGER REFERENCES users(id),
      reviewed_at DATETIME,
      paid_at DATETIME,
      paid_by_user_id INTEGER REFERENCES users(id),
      payout_amount REAL,
      payment_reference TEXT,
      payment_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Logs de Auditoría
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Notificaciones del Sistema
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning', 'danger')),
      is_read INTEGER DEFAULT 0,
      link_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Registro de Transacciones Financieras por Servidor (Ingresos por Aperturas y Gastos en PMs / Streamers)
    CREATE TABLE IF NOT EXISTS server_financial_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense_streamer', 'expense_pm', 'expense_platform')),
      category TEXT NOT NULL CHECK(category IN ('opening_fee', 'monthly_contract', 'campaign_budget', 'streamer_payout', 'pm_fee', 'pm_commission', 'other')),
      concept TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_date DATE NOT NULL,
      payment_reference TEXT,
      payment_method TEXT DEFAULT 'Transferencia' CHECK(payment_method IN ('Transferencia', 'PayPal', 'Cripto / USDT', 'Tarjeta / Stripe', 'Efectivo', 'Otro')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'pending')),
      recipient_or_payer_name TEXT,
      recipient_user_id INTEGER REFERENCES users(id),
      contract_id INTEGER REFERENCES server_contracts(id) ON DELETE SET NULL,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
      notes TEXT,
      created_by_user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Contratos por Servidor para Streamers y PMs con cálculo de Presupuesto Final y Descuento en Ganancia
    CREATE TABLE IF NOT EXISTS server_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('pm', 'streamer')),
      contract_type TEXT NOT NULL CHECK(contract_type IN (
        'hourly',
        'fixed_fee',
        'hybrid',
        'monthly_retainer',
        'commission_percentage',
        'cpm_views'
      )),
      title TEXT NOT NULL,
      base_amount REAL DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      hours_committed REAL DEFAULT 0,
      cpm_rate REAL DEFAULT 0,
      commission_percentage REAL DEFAULT 0,
      total_budgeted REAL NOT NULL DEFAULT 0,
      total_paid REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled', 'draft')),
      start_date DATE,
      end_date DATE,
      terms_description TEXT,
      notes TEXT,
      created_by_user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Configuraciones del Sistema
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Ensure budget column exists in servers
  try {
    const srvCols = db.prepare('PRAGMA table_info(servers)').all();
    if (srvCols && !srvCols.some(c => c.name === 'budget')) {
      db.exec('ALTER TABLE servers ADD COLUMN budget REAL DEFAULT 0;');
    }
  } catch (err) {
    console.error('[DB Migration error for servers.budget]:', err.message);
  }

  // Migration: Ensure server_pms table exists and migrate existing servers.pm_user_id
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS server_pms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
        pm_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        UNIQUE(server_id, pm_id)
      );
    `);
    db.exec(`
      INSERT OR IGNORE INTO server_pms (server_id, pm_id, status)
      SELECT id, pm_user_id, 'active' FROM servers WHERE pm_user_id IS NOT NULL;
    `);
  } catch (err) {
    console.error('[DB Migration error for server_pms]:', err.message);
  }

  // Migration: Ensure campaign_pms table exists and backfill existing campaigns.pm_user_id
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS campaign_pms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        pm_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(campaign_id, pm_id)
      );
    `);
    db.exec(`
      INSERT OR IGNORE INTO campaign_pms (campaign_id, pm_id)
      SELECT id, pm_user_id FROM campaigns WHERE pm_user_id IS NOT NULL;
    `);
  } catch (err) {
    console.error('[DB Migration error for campaign_pms]:', err.message);
  }

  // Migration: Ensure target_evidences and target_hours exist in campaigns
  try {
    const campCols = db.prepare('PRAGMA table_info(campaigns)').all();
    if (campCols && !campCols.some(c => c.name === 'target_evidences')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN target_evidences INTEGER DEFAULT 0;');
    }
    if (campCols && !campCols.some(c => c.name === 'target_hours')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN target_hours REAL DEFAULT 0;');
    }
    if (campCols && !campCols.some(c => c.name === 'pm_fee')) {
      db.exec('ALTER TABLE campaigns ADD COLUMN pm_fee REAL DEFAULT 0;');
    }
  } catch (err) {
    console.error('[DB Migration error for campaigns targets]:', err.message);
  }

  // Migration: Ensure contract_id and campaign_id exist in server_financial_transactions
  try {
    const finCols = db.prepare('PRAGMA table_info(server_financial_transactions)').all();
    if (finCols && !finCols.some(c => c.name === 'contract_id')) {
      db.exec('ALTER TABLE server_financial_transactions ADD COLUMN contract_id INTEGER REFERENCES server_contracts(id);');
    }
    if (finCols && !finCols.some(c => c.name === 'campaign_id')) {
      db.exec('ALTER TABLE server_financial_transactions ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id);');
    }
  } catch (err) {
    console.error('[DB Migration error for contract_id/campaign_id]:', err.message);
  }

  // Migration: Ensure username column exists in users
  try {
    const columns = db.prepare('PRAGMA table_info(users)').all();
    if (!columns.some(c => c.name === 'username')) {
      db.exec('ALTER TABLE users ADD COLUMN username TEXT;');
    }
  } catch (err) {
    console.error('[DB Migration error]:', err.message);
  }

  // Migration: Ensure activity_evidences supports 'paid' status and payment columns
  try {
    const tableInfo = db.prepare("PRAGMA table_info(activity_evidences)").all();
    if (tableInfo && tableInfo.length > 0) {
      const hasPaidAt = tableInfo.some(col => col.name === 'paid_at');
      const createSqlRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='activity_evidences'").get();
      const needsMigration = !hasPaidAt || (createSqlRow && !createSqlRow.sql.includes("'paid'"));

      if (needsMigration) {
        db.exec("PRAGMA foreign_keys = OFF;");
        db.exec(`
          CREATE TABLE activity_evidences_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
            creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            type TEXT NOT NULL CHECK(type IN ('stream', 'video', 'post', 'event')),
            platform TEXT NOT NULL CHECK(platform IN ('Twitch', 'YouTube', 'TikTok', 'Kick', 'Facebook', 'Discord', 'Otro')),
            content_url TEXT NOT NULL,
            activity_date DATE NOT NULL,
            duration_minutes INTEGER DEFAULT 0,
            avg_viewers INTEGER DEFAULT 0,
            peak_viewers INTEGER DEFAULT 0,
            total_views INTEGER DEFAULT 0,
            evidence_screenshots TEXT DEFAULT '[]',
            creator_notes TEXT,
            internal_notes TEXT,
            status TEXT NOT NULL DEFAULT 'review' CHECK(status IN ('pending', 'review', 'approved', 'rejected', 'paid')),
            rejection_reason TEXT,
            reviewed_by_user_id INTEGER REFERENCES users(id),
            reviewed_at DATETIME,
            paid_at DATETIME,
            paid_by_user_id INTEGER REFERENCES users(id),
            payout_amount REAL,
            payment_reference TEXT,
            payment_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          INSERT INTO activity_evidences_new (
            id, campaign_id, creator_id, type, platform, content_url, activity_date,
            duration_minutes, avg_viewers, peak_viewers, total_views, evidence_screenshots,
            creator_notes, internal_notes, status, rejection_reason, reviewed_by_user_id,
            reviewed_at, created_at, updated_at
          )
          SELECT 
            id, campaign_id, creator_id, type, platform, content_url, activity_date,
            duration_minutes, avg_viewers, peak_viewers, total_views, evidence_screenshots,
            creator_notes, internal_notes, status, rejection_reason, reviewed_by_user_id,
            reviewed_at, created_at, updated_at
          FROM activity_evidences;

          DROP TABLE activity_evidences;
          ALTER TABLE activity_evidences_new RENAME TO activity_evidences;
        `);
        db.exec("PRAGMA foreign_keys = ON;");
      }
    }
  } catch (err) {
    console.error('[DB Migration activity_evidences error]:', err.message);
  }

  // Data Integrity: Ensure any campaigns belonging to soft-deleted servers are marked as soft-deleted
  try {
    db.prepare(`
      UPDATE campaigns 
      SET deleted_at = CURRENT_TIMESTAMP, status = 'completed' 
      WHERE server_id IN (SELECT id FROM servers WHERE deleted_at IS NOT NULL) 
        AND deleted_at IS NULL
    `).run();
  } catch (err) {
    console.error('[DB Data Integrity Cleanup error]:', err.message);
  }
}

module.exports = {
  db,
  initSchema
};
