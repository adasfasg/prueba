const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pmforgex.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for reliability and performance
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initSchema() {
  db.exec(`
    -- Tabla de Usuarios con control de estado y borrado suave
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      logo_url TEXT,
      website_url TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
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
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
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
      status TEXT NOT NULL DEFAULT 'review' CHECK(status IN ('pending', 'review', 'approved', 'rejected')),
      rejection_reason TEXT,
      reviewed_by_user_id INTEGER REFERENCES users(id),
      reviewed_at DATETIME,
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

    -- Configuraciones del Sistema
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = {
  db,
  initSchema
};
