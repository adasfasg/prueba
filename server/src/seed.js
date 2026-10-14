const bcrypt = require('bcryptjs');
const { db, initSchema } = require('./db');

function seedDatabase() {
  initSchema();

  // Check if users already exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers && existingUsers.count > 0) {
    console.log('[Seed] Database already contains users. Skipping seed.');
    return;
  }

  console.log('[Seed] Seeding database with initial accounts and test records...');

  // Password hashes
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('PMForgeX2026!Admin', salt);
  const opsPass = bcrypt.hashSync('PMForgeX2026!Ops', salt);
  const dirPmsPass = bcrypt.hashSync('PMForgeX2026!DirPM', salt);
  const dirCrPass = bcrypt.hashSync('PMForgeX2026!DirCr', salt);
  const pm1Pass = bcrypt.hashSync('PMForgeX2026!PM1', salt);
  const pm2Pass = bcrypt.hashSync('PMForgeX2026!PM2', salt);
  const creatorPass = bcrypt.hashSync('PMForgeX2026!Creator', salt);
  const ownerPass = bcrypt.hashSync('PMForgeX2026!Owner', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, status, phone, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Super Admin
  insertUser.run(1, 'admin@pmforgex.com', adminPass, 'Director General (Super Admin)', 'super_admin', 'active', '+34 600 000 001', 'Cuenta principal del dueño. Protegida contra eliminación.');
  
  // 2. Director Operacional
  insertUser.run(2, 'operaciones@pmforgex.com', opsPass, 'Marcos Valero (Dir. Operacional)', 'director_ops', 'active', '+34 600 000 002', 'Supervisa la operativa global de campañas y clientes.');
  
  // 3. Director de PMs
  insertUser.run(3, 'director.pm@pmforgex.com', dirPmsPass, 'Sofía Ramos (Dir. PMs)', 'director_pms', 'active', '+34 600 000 003', 'Supervisa el equipo de Promoter Managers.');
  
  // 4. Director de Creadores
  insertUser.run(4, 'director.creadores@pmforgex.com', dirCrPass, 'Alejandro Sanz (Dir. Creadores)', 'director_creators', 'active', '+34 600 000 004', 'Supervisa el talento y catálogo de creadores.');
  
  // 5. PM 1 (Carlos)
  insertUser.run(5, 'pm.carlos@pmforgex.com', pm1Pass, 'Carlos Rodríguez (PM Senior)', 'pm', 'active', '+34 600 000 005', 'Promoter Manager asignado a servidores veteranos.');

  // 6. PM 2 (Elena)
  insertUser.run(6, 'pm.elena@pmforgex.com', pm2Pass, 'Elena Gómez (PM Junior)', 'pm', 'active', '+34 600 000 006', 'Promoter Manager asignada a nuevos lanzamientos.');

  // 7. Creador 1 (DragonSlayer MT2)
  insertUser.run(7, 'creador.dragonslayer@pmforgex.com', creatorPass, 'Álvaro Martín (DragonSlayer MT2)', 'creator', 'active', '+34 600 000 007', 'Streamer veterano especialista en PvP y Gremios.');

  // 8. Creador 2 (ValquiriaPlay)
  insertUser.run(8, 'creador.valquiria@pmforgex.com', creatorPass, 'Lucía Serrano (ValquiriaPlay)', 'creator', 'active', '+34 600 000 008', 'Creadora de contenido en directo, tutoriales y PvE.');

  // 9. Creador 3 (MetinKing)
  insertUser.run(9, 'creador.metinking@pmforgex.com', creatorPass, 'Javier Castro (MetinKing)', 'creator', 'active', '+34 600 000 009', 'Especialista en YouTube Shorts y TikTok viral de Metin2.');

  // 10. Dueño de Servidor 1 (Astra2)
  insertUser.run(10, 'owner.metinclassic@pmforgex.com', ownerPass, 'Roberto Díaz (Owner Astra2)', 'server_owner', 'active', '+34 600 000 010', 'Administrador del servidor privado Astra2 Classic.');

  // 11. Dueño de Servidor 2 (Metin2 Origin)
  insertUser.run(11, 'owner.origin@pmforgex.com', ownerPass, 'Gabriel Vega (Owner Origin)', 'server_owner', 'active', '+34 600 000 011', 'Propietario del servidor Metin2 Origin 2026.');

  // Insert Creator Profiles
  const insertProfile = db.prepare(`
    INSERT INTO creator_profiles (user_id, alias, avatar_url, bio, games, platforms, social_links, is_available, hourly_rate_internal, fixed_rate_internal, commission_percentage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProfile.run(
    7,
    'DragonSlayer MT2',
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&auto=format&fit=crop&q=80',
    'Streamer de Metin2 con más de 7 años de experiencia. Especialista en directos de guerras de gremios, torneos PvP y aperturas de servidores.',
    JSON.stringify(['Metin2', 'Lineage II']),
    JSON.stringify(['Twitch', 'YouTube', 'TikTok']),
    JSON.stringify({
      twitch: 'https://twitch.tv/dragonslayer_mt2',
      youtube: 'https://youtube.com/@dragonslayer_mt2',
      tiktok: 'https://tiktok.com/@dragonslayermt2',
      discord: 'https://discord.gg/dragonslayer'
    }),
    1,
    25.0,
    150.0,
    15.0
  );

  insertProfile.run(
    8,
    'ValquiriaPlay',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    'Creadora de contenido enfocada en guías para nuevos jugadores, farmeo eficiente y streaming diario interactivo con la comunidad.',
    JSON.stringify(['Metin2', 'MU Online']),
    JSON.stringify(['Twitch', 'YouTube']),
    JSON.stringify({
      twitch: 'https://twitch.tv/valquiria_play',
      youtube: 'https://youtube.com/@valquiriaplay',
      twitter: 'https://twitter.com/valquiriaplay'
    }),
    1,
    20.0,
    120.0,
    15.0
  );

  insertProfile.run(
    9,
    'MetinKing',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    'Creador de clips de alto impacto, YouTube Shorts virales y reels promocionales para servidores de apertura y lanzamientos.',
    JSON.stringify(['Metin2']),
    JSON.stringify(['YouTube', 'TikTok']),
    JSON.stringify({
      youtube: 'https://youtube.com/@metinking_official',
      tiktok: 'https://tiktok.com/@metinking',
      discord: 'https://discord.gg/metinking'
    }),
    1,
    18.0,
    95.0,
    12.0
  );

  // Insert Servers
  const insertServer = db.prepare(`
    INSERT INTO servers (id, name, game, status, contact_info, owner_user_id, pm_user_id, logo_url, website_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Servidor 1: Astra2 (Asignado a PM Carlos, Dueño: Roberto Díaz)
  insertServer.run(
    1,
    'Astra2 International',
    'Metin2',
    'active',
    'Discord: AstraAdmin#0001 / Email: contact@astra2.org',
    10,
    5, // PM Carlos
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
    'https://astra2.org',
    'Servidor de estilo OldSchool con apertura programada. Alto presupuesto de marketing.'
  );

  // Servidor 2: Metin2 Origin (Asignado a PM Elena, Dueño: Gabriel Vega)
  insertServer.run(
    2,
    'Metin2 Origin',
    'Metin2',
    'active',
    'Discord: OriginSupport / Email: info@metin2origin.com',
    11,
    6, // PM Elena
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    'https://metin2origin.com',
    'Servidor MidSchool con eventos mensuales y sistema de drops dinámico.'
  );

  // Servidor 3: OldSchool Mt2 (SIN PM ASIGNADO -> dispara alerta en dashboard de Super Admin!)
  insertServer.run(
    3,
    'OldSchool World Mt2',
    'Metin2',
    'active',
    'Email: contact@oldschoolmt2.net',
    null,
    null, // Sin PM asignado
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
    'https://oldschoolmt2.net',
    'Nuevo cliente incorporado recientemente. Requiere asignación de PM urgente.'
  );

  // Relaciones Servidor - Creadores
  const insertServerCreator = db.prepare(`
    INSERT INTO server_creators (server_id, creator_id, status)
    VALUES (?, ?, ?)
  `);
  insertServerCreator.run(1, 7, 'active'); // DragonSlayer en Astra2
  insertServerCreator.run(1, 8, 'active'); // Valquiria en Astra2
  insertServerCreator.run(2, 9, 'active'); // MetinKing en Origin

  // Insert Campaigns
  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (id, name, server_id, pm_user_id, status, start_date, end_date, objective, requirements, budget_internal, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCampaign.run(
    1,
    'Gran Apertura Astra2 - Fase de Lanzamiento',
    1,
    5, // PM Carlos
    'active',
    '2026-09-01',
    '2026-09-30',
    'Alcanzar 50.000 visualizaciones acumuladas y 1.500 jugadores concurrentes durante el primer fin de semana.',
    'Requisitos: 3 directos semanales de mínimo 2 horas cada uno + 1 video resumen en YouTube con enlaces al registro.',
    1200.0,
    'Campaña prioritaria del mes. Mantener estrecha comunicación con Roberto Díaz.'
  );

  insertCampaign.run(
    2,
    'Campaña Torneo PvP - Metin2 Origin',
    2,
    6, // PM Elena
    'active',
    '2026-09-10',
    '2026-09-25',
    'Promocionar el gran torneo de gremios de fin de mes.',
    'Requisitos: Transmisión en directo del sorteo y cobertura de las finales.',
    600.0,
    'El dueño facilitará cuentas especiales y pases de batalla para sorteos.'
  );

  // Vincular creadores a campañas
  const insertCampCreator = db.prepare(`
    INSERT INTO campaign_creators (campaign_id, creator_id, agreement_terms, payout_internal)
    VALUES (?, ?, ?, ?)
  `);
  insertCampCreator.run(1, 7, '6 directos de 2h + 2 reels semanales', 500.0);
  insertCampCreator.run(1, 8, '4 directos de 2h + tutorial de inicio', 350.0);
  insertCampCreator.run(2, 9, '5 shorts promocionales + cobertura de torneo', 250.0);

  // Insert Activity Evidences
  const insertEvidence = db.prepare(`
    INSERT INTO activity_evidences (
      campaign_id, creator_id, type, platform, content_url, activity_date, duration_minutes,
      avg_viewers, peak_viewers, total_views, evidence_screenshots, creator_notes, internal_notes,
      status, rejection_reason, reviewed_by_user_id, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Evidencia 1: Aprobada (Visible para el dueño de servidor Astra2!)
  insertEvidence.run(
    1,
    7, // DragonSlayer
    'stream',
    'Twitch',
    'https://twitch.tv/videos/1298471203',
    '2026-09-03',
    145,
    340,
    512,
    2850,
    JSON.stringify(['https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600']),
    'Directo de apertura del servidor Astra2. Gran recepción de la comunidad con más de 500 personas en pico.',
    'Excelente resultado y cumplimiento de horarios pactados. Mención constante de la IP y web.',
    'approved',
    null,
    5, // Carlos Rodríguez
    '2026-09-04 10:15:00'
  );

  // Evidencia 2: En Revisión (Lista para que el PM Carlos la evalúe en su bandeja!)
  insertEvidence.run(
    1,
    8, // ValquiriaPlay
    'stream',
    'Twitch',
    'https://twitch.tv/videos/1299104822',
    '2026-09-06',
    130,
    185,
    260,
    1420,
    JSON.stringify(['https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600']),
    'Transmisión de farmeo y leveo en mapas iniciales de Astra2. Respondí dudas a más de 40 jugadores nuevos.',
    null,
    'review',
    null,
    null,
    null
  );

  // Evidencia 3: Rechazada (Ejemplo con motivo para corregir)
  insertEvidence.run(
    1,
    7, // DragonSlayer
    'video',
    'YouTube',
    'https://youtube.com/watch?v=sample123',
    '2026-09-02',
    12,
    0,
    0,
    110,
    JSON.stringify([]),
    'Video corto promocional de Astra2.',
    'No incluyó el banner oficial ni el enlace de referido en la descripción del video.',
    'rejected',
    'Falta el enlace de registro de Astra2 en la descripción principal y el logo de PMForgeX en la intro.',
    5,
    '2026-09-03 14:00:00'
  );

  // Insert Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run(1, 'USER_CREATED', 'users', 1, JSON.stringify({ email: 'admin@pmforgex.com', role: 'super_admin' }), '127.0.0.1');
  insertAudit.run(1, 'SERVER_CREATED', 'servers', 1, JSON.stringify({ name: 'Astra2 International', game: 'Metin2' }), '127.0.0.1');
  insertAudit.run(1, 'PM_ASSIGNED', 'servers', 1, JSON.stringify({ serverId: 1, pmId: 5 }), '127.0.0.1');
  insertAudit.run(5, 'EVIDENCE_APPROVED', 'activity_evidences', 1, JSON.stringify({ evidenceId: 1, status: 'approved' }), '127.0.0.1');

  // Insert Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, is_read, link_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertNotif.run(1, 'Alerta de Servidor', 'El servidor OldSchool World Mt2 no tiene un PM asignado.', 'warning', 0, '/dashboard/admin?tab=servers');
  insertNotif.run(5, 'Nueva Evidencia para Revisar', 'ValquiriaPlay ha subido una nueva evidencia para la campaña Astra2.', 'info', 0, '/dashboard/pm?tab=review');
  insertNotif.run(10, 'Resultados Actualizados', 'Se ha aprobado una nueva transmisión con 512 espectadores pico para Astra2.', 'success', 0, '/dashboard/server-owner');

  console.log('[Seed] Database successfully populated with initial test suite data.');
}

module.exports = {
  seedDatabase
};
