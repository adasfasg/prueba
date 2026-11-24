const path = require('node:path');
const fs = require('node:fs');

const testDbPath = path.join(__dirname, '../data/test_pmforgex.db');
try { if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath); } catch (e) {}
try { if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`); } catch (e) {}
try { if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`); } catch (e) {}
process.env.DB_PATH = testDbPath;

const http = require('node:http');
const app = require('../server/src/app');
const { seedDatabase } = require('../server/src/seed');

let server;
const PORT = 5055;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const data = body ? JSON.stringify(body) : null;
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody || '{}');
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 Iniciando Suite Completa de Pruebas QA para PMForgeX v1.0');
  console.log('🧪 ========================================================');

  seedDatabase();

  await new Promise(resolve => {
    server = app.listen(PORT, resolve);
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. PUBLIC ENDPOINTS & DATA SANITIZATION (SECCIÓN 18)
    console.log('\n--- 1. Pruebas de Endpoints Públicos y Sanitización de Datos ---');
    const pubCreators = await makeRequest('GET', '/api/public/creators');
    assert(pubCreators.status === 200, 'GET /api/public/creators responde 200 OK');
    assert(Array.isArray(pubCreators.data) && pubCreators.data.length >= 3, 'Retorna catálogo de creadores activos');

    // Strict confidentiality check: no private rates, commissions or payouts
    const hasLeakedFinancials = pubCreators.data.some(c => 
      c.hourly_rate_internal !== undefined ||
      c.fixed_rate_internal !== undefined ||
      c.commission_percentage !== undefined
    );
    assert(!hasLeakedFinancials, 'SECRECÍA CUMPLIDA: Catálogo público NO expone tarifas, comisiones ni márgenes');

    const pubStats = await makeRequest('GET', '/api/public/stats');
    assert(pubStats.status === 200 && pubStats.data.total_creators >= 3, 'GET /api/public/stats retorna métricas agregadas públicas');

    const contactRes = await makeRequest('POST', '/api/public/contact', {
      name: 'Tester Servidor',
      email: 'tester@server.com',
      server_name: 'MetinTest 2026',
      message: 'Interesados en contratar streamers para apertura.'
    });
    assert(contactRes.status === 200 && contactRes.data.success === true, 'POST /api/public/contact procesa formulario');

    // 2. AUTHENTICATION & SESSIONS (USERNAME & 2FA OTP)
    console.log('\n--- 2. Pruebas de Autenticación & Control de Sesiones con 2FA ---');
    const badLogin = await makeRequest('POST', '/api/auth/login', {
      identifier: 'admin',
      password: 'wrongpassword'
    });
    assert(badLogin.status === 401, 'Login con contraseña inválida es rechazado con 401');

    // Helper to complete 2FA login
    async function doFullLogin(identifier, password) {
      const step1 = await makeRequest('POST', '/api/auth/login', { identifier, password });
      if (step1.status !== 200 || !step1.data.requires_2fa) return step1;
      return await makeRequest('POST', '/api/auth/verify-2fa', {
        temp_token: step1.data.temp_token,
        otp_code: step1.data.dev_otp
      });
    }

    // Step 1: Request 2FA code with username
    const adminStep1 = await makeRequest('POST', '/api/auth/login', {
      identifier: 'admin',
      password: 'PMForgeX2026!Admin'
    });
    assert(adminStep1.status === 200 && adminStep1.data.requires_2fa === true, 'Paso 1: Login con usuario admin solicita código 2FA');

    // Bad OTP code rejected
    const badOtp = await makeRequest('POST', '/api/auth/verify-2fa', {
      temp_token: adminStep1.data.temp_token,
      otp_code: '000000'
    });
    assert(badOtp.status === 401, 'Paso 2: Código OTP erróneo es rechazado con 401');

    // Valid OTP code succeeds
    const adminLogin = await makeRequest('POST', '/api/auth/verify-2fa', {
      temp_token: adminStep1.data.temp_token,
      otp_code: adminStep1.data.dev_otp
    });
    assert(adminLogin.status === 200 && adminLogin.data.token && adminLogin.data.user.role === 'super_admin', 'Paso 2: Verificación OTP exitosa y emisión de token JWT');
    const adminToken = adminLogin.data.token;

    // PM Login with username
    const pmLogin = await doFullLogin('pm.carlos', 'PMForgeX2026!PM1');
    assert(pmLogin.status === 200 && pmLogin.data.user.role === 'pm', 'Login con usuario pm.carlos y 2FA exitoso');
    const pmToken = pmLogin.data.token;

    // Creator Login with username
    const creatorLogin = await doFullLogin('dragonslayer', 'PMForgeX2026!Creator');
    assert(creatorLogin.status === 200 && creatorLogin.data.user.role === 'creator', 'Login con usuario dragonslayer y 2FA exitoso');
    const creatorToken = creatorLogin.data.token;

    // Server Owner Login with username
    const ownerLogin = await doFullLogin('owner.astra2', 'PMForgeX2026!Owner');
    assert(ownerLogin.status === 200 && ownerLogin.data.user.role === 'server_owner', 'Login con usuario owner.astra2 y 2FA exitoso');
    const ownerToken = ownerLogin.data.token;

    // 3. RBAC & PERMISSIONS MATRIX ENFORCEMENT
    console.log('\n--- 3. Matriz de Permisos RBAC y Bloqueo de Rutas ---');
    
    // Creator tries to access users administration
    const creatorAccessUsers = await makeRequest('GET', '/api/users', null, creatorToken);
    assert(creatorAccessUsers.status === 403, 'RBAC: Creador tiene prohibido acceder a /api/users (403)');

    // PM tries to access users administration
    const pmAccessUsers = await makeRequest('GET', '/api/users', null, pmToken);
    assert(pmAccessUsers.status === 403, 'RBAC: PM tiene prohibido acceder a /api/users (403)');

    // Super Admin accesses users administration
    const adminAccessUsers = await makeRequest('GET', '/api/users', null, adminToken);
    assert(adminAccessUsers.status === 200 && Array.isArray(adminAccessUsers.data), 'RBAC: Super Admin accede exitosamente a /api/users');

    // Server Owner server scoping
    const ownerServers = await makeRequest('GET', '/api/servers', null, ownerToken);
    assert(ownerServers.status === 200, 'Server Owner accede a /api/servers');
    assert(ownerServers.data.length === 1 && ownerServers.data[0].name === 'Astra2 International', 'SCOPE: Server Owner SOLO ve su propio servidor (Astra2), ningún otro');

    // PM server scoping
    const pmServers = await makeRequest('GET', '/api/servers', null, pmToken);
    assert(pmServers.status === 200 && pmServers.data.every(s => s.pm_user_id === 5), 'SCOPE: PM Carlos SOLO ve servidores asignados a él');

    // 4. SUPER ADMIN PROTECTION (SECCIÓN 7.4)
    console.log('\n--- 4. Protección de Cuenta Principal del Super Admin ---');
    const deleteAdminAttempt = await makeRequest('DELETE', '/api/users/1', null, adminToken);
    assert(deleteAdminAttempt.status === 400, 'SEGURIDAD: Intento de eliminar la cuenta principal de Super Admin es bloqueado (400)');

    const suspendAdminAttempt = await makeRequest('PUT', '/api/users/1', { status: 'suspended' }, adminToken);
    assert(suspendAdminAttempt.status === 400, 'SEGURIDAD: Intento de suspender la cuenta principal de Super Admin es bloqueado (400)');

    // 5. WORKFLOW LIFECYCLE: CREADOR -> PM -> SERVER OWNER (SECCIÓN 26)
    console.log('\n--- 5. Flujo Operativo Integral de Evidencias y Métricas ---');
    
    // Creator submits new stream evidence for Campaign 1
    const newEvidenceRes = await makeRequest('POST', '/api/evidences', {
      campaign_id: 1,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/videos/test999888',
      activity_date: '2026-09-07',
      duration_minutes: 180,
      avg_viewers: 420,
      peak_viewers: 680,
      total_views: 3100,
      creator_notes: 'Directo especial apertura nuevo mapa.'
    }, creatorToken);
    assert(newEvidenceRes.status === 201, 'Creador registra nueva actividad (Directo Twitch 180 min)');
    const createdEvidenceId = newEvidenceRes.data.id;

    // Server Owner checks evidences before review: must NOT see the unapproved evidence
    const ownerEvidencesBefore = await makeRequest('GET', '/api/evidences', null, ownerToken);
    const ownerSeesUnapproved = ownerEvidencesBefore.data.some(e => e.id === createdEvidenceId);
    assert(!ownerSeesUnapproved, 'PRIVACIDAD: Dueño de Servidor NO ve evidencias pendientes o en revisión');

    // PM reviews and approves the evidence
    const reviewRes = await makeRequest('PUT', `/api/evidences/${createdEvidenceId}/review`, {
      status: 'approved',
      internal_notes: 'Revisado y validado en Twitch VOD. Excelente rendimiento.'
    }, pmToken);
    assert(reviewRes.status === 200, 'PM aprueba la evidencia con notas internas');

    // Server Owner checks evidences after approval: NOW it is visible!
    const ownerEvidencesAfter = await makeRequest('GET', '/api/evidences', null, ownerToken);
    const ownerSeesApproved = ownerEvidencesAfter.data.some(e => e.id === createdEvidenceId);
    assert(ownerSeesApproved, 'FLUJO CUMPLIDO: Dueño de Servidor ve inmediatamente la evidencia aprobada');

    // Verify Server Owner does NOT see the PM internal notes
    const approvedItemForOwner = ownerEvidencesAfter.data.find(e => e.id === createdEvidenceId);
    assert(approvedItemForOwner.internal_notes === undefined, 'CONFIDENCIALIDAD: Notas internas del PM están ocultas para el Dueño de Servidor');

    // 6. DASHBOARD METRICS & REAL-TIME ALERTS
    console.log('\n--- 6. Métricas y Alertas del Dashboard ---');
    const adminMetrics = await makeRequest('GET', '/api/metrics/dashboard', null, adminToken);
    assert(adminMetrics.status === 200, 'GET /api/metrics/dashboard responde 200');
    assert(adminMetrics.data.alerts.servers_without_pm.length >= 1, 'ALERTA DETECTADA: Super Admin ve servidores sin PM (OldSchool World Mt2)');

    // 7. SOFT DELETE INTEGRITY (SECCIÓN 5 Y 20)
    console.log('\n--- 7. Borrado Suave e Integridad Referencial ---');
    const testEmail = `temp.user_${Date.now()}@pmforgex.com`;
    const testUsername = `test_user_${Date.now()}`;
    const createTempUser = await makeRequest('POST', '/api/users', {
      username: testUsername,
      email: testEmail,
      password: 'Password123!',
      full_name: 'Usuario Temporal',
      role: 'creator'
    }, adminToken);
    const tempId = createTempUser.data.id;
    assert(createTempUser.status === 201 && createTempUser.data.username === testUsername, 'Usuario creado exitosamente con Nombre de Usuario explícito (username)');

    const softDeleteRes = await makeRequest('DELETE', `/api/users/${tempId}`, null, adminToken);
    assert(softDeleteRes.status === 200, 'Usuario temporal dado de baja mediante soft delete');

    const tempLogin = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: 'Password123!'
    });
    assert(tempLogin.status === 401, 'Usuario dado de baja no puede iniciar sesión');

    // 8. ASIGNACIÓN DE SERVIDOR POR ADMIN Y GESTIÓN DE CAMPAÑAS POR PM
    console.log('\n--- 8. Reglas de Negocio: Asignación de PM/Streamer por Admin y Campañas por PM ---');
    
    // Admin creates a server and assigns PM (user 5) and streamers (users 2 and 3)
    const adminCreateServerRes = await makeRequest('POST', '/api/servers', {
      name: 'Valhalla World 2026',
      game: 'Metin2',
      contact_info: 'discord.gg/valhalla',
      pm_user_id: 5,
      creator_ids: [2, 3]
    }, adminToken);
    assert(adminCreateServerRes.status === 201, 'ADMIN: Administrador crea servidor y asigna PM y Streamers simultáneamente');
    const newServerId = adminCreateServerRes.data.id;

    // Verify creators are linked to new server
    const getNewServers = await makeRequest('GET', '/api/servers', null, adminToken);
    const valhallaServer = getNewServers.data.find(s => s.id === newServerId);
    assert(valhallaServer && valhallaServer.creators.length === 2, 'ADMIN: Servidor tiene los 2 streamers asignados por el Admin');

    // PM attempts to assign a creator to the server directly: MUST BE 403 (Admin exclusive!)
    const pmAssignServerCreator = await makeRequest('POST', `/api/servers/${newServerId}/creators`, {
      creator_id: 4
    }, pmToken);
    assert(pmAssignServerCreator.status === 403, 'REGLA ESTRICTA: PM tiene PROHIBIDO asignar streamers al servidor (403)');

    // PM creates a campaign for his assigned server and actions streamer ID 2
    const pmCreateCampRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Campaña Lanzamiento Valhalla',
      server_id: newServerId,
      objective: 'Lograr 500 jugadores recurrentes en fin de semana',
      requirements: '3 directos de 2 horas',
      budget_internal: 800,
      creator_ids: [2]
    }, pmToken);
    assert(pmCreateCampRes.status === 201, 'PM: PM crea campaña para su servidor y acciona streamer a la campaña');
    const newCampId = pmCreateCampRes.data.id;

    // PM actions streamer ID 3 to the campaign
    const pmActionStreamer = await makeRequest('POST', `/api/campaigns/${newCampId}/creators`, {
      creator_id: 3,
      agreement_terms: '2 directos adicionales'
    }, pmToken);
    assert(pmActionStreamer.status === 200, 'PM: PM acciona streamer adicional a su campaña');

    // PM desvinculates streamer ID 3 from the campaign
    const pmRemoveStreamer = await makeRequest('DELETE', `/api/campaigns/${newCampId}/creators/3`, null, pmToken);
    assert(pmRemoveStreamer.status === 200, 'PM: PM desvincula streamer de la campaña');

    // Admin modifies / overrides the campaign
    const adminUpdateCamp = await makeRequest('PUT', `/api/campaigns/${newCampId}`, {
      name: 'Campaña Lanzamiento Valhalla (Aprobada por Admin)',
      budget_internal: 1200
    }, adminToken);
    assert(adminUpdateCamp.status === 200, 'ADMIN OVERRIDE: Administrador modifica detalles y presupuesto de la campaña');

    // Admin soft deletes the campaign
    const adminDeleteCamp = await makeRequest('DELETE', `/api/campaigns/${newCampId}`, null, adminToken);
    assert(adminDeleteCamp.status === 200, 'ADMIN OVERRIDE: Administrador elimina/cancela campaña');

    // 6. PM & STREAMER TALENT MANAGEMENT & DIRECTORY
    console.log('\n--- 6. Pruebas de Directorio, Ficha y Modificación de PMs & Streamers ---');
    
    // Fetch users with enriched talent metrics
    const usersRes = await makeRequest('GET', '/api/users', null, adminToken);
    assert(usersRes.status === 200 && Array.isArray(usersRes.data), 'GET /api/users responde 200 OK con lista enriquecida');
    
    const samplePm = usersRes.data.find(u => u.role === 'pm');
    assert(samplePm && samplePm.pm_servers_count !== undefined, 'PM incluye métricas calculadas (pm_servers_count, pm_campaigns_count)');
    
    const sampleCreator = usersRes.data.find(u => u.role === 'creator');
    assert(sampleCreator && sampleCreator.creator_alias && sampleCreator.total_hours_streamed !== undefined, 'Streamer incluye ficha enriquecida (alias, horas, audiencia, juegos)');
    assert(Array.isArray(sampleCreator.creator_games) && Array.isArray(sampleCreator.creator_platforms), 'Juegos y plataformas se devuelven como arreglos parseados');

    // Admin updates PM information
    const updatePmRes = await makeRequest('PUT', `/api/users/${samplePm.id}`, {
      full_name: 'Carlos PM Senior Modificado',
      phone: '+34 699 111 222',
      notes: 'PM Senior responsable de lanzamientos Metin2 clase A'
    }, adminToken);
    assert(updatePmRes.status === 200, 'ADMIN: Modificar información de PM (nombre, teléfono, notas internas)');

    // Admin updates Streamer information (including creator_profiles fields)
    const updateCreatorRes = await makeRequest('PUT', `/api/users/${sampleCreator.id}`, {
      full_name: 'Alex Gamer Modificado',
      alias: 'AlexTitanStreams',
      hourly_rate_internal: 45.0,
      fixed_rate_internal: 300.0,
      commission_percentage: 15.0,
      bio: 'Especialista en duelos PvP de Metin2 y aperturas masivas.',
      games: ['Metin2', 'Lineage 2'],
      platforms: ['Twitch', 'Kick'],
      notes: 'Streamer de alta fidelidad y retención.',
      social_links: { twitch: 'https://twitch.tv/alextitan', kick: 'https://kick.com/alextitan' }
    }, adminToken);
    assert(updateCreatorRes.status === 200, 'ADMIN: Modificar información completa de Streamer (alias, tarifas, bio, juegos, redes, notas)');

    // Verify persistence after modification
    const verifyUserRes = await makeRequest('GET', '/api/users', null, adminToken);
    const updatedCreator = verifyUserRes.data.find(u => u.id === sampleCreator.id);
    assert(updatedCreator.creator_alias === 'AlexTitanStreams', 'PERSISTENCIA: Alias de streamer actualizado en BD');
    assert(updatedCreator.hourly_rate_internal === 45.0, 'PERSISTENCIA: Tarifa por hora actualizada en BD');
    assert(updatedCreator.commission_percentage === 15.0, 'PERSISTENCIA: Comisión actualizada en BD');
    assert(updatedCreator.creator_games.includes('Lineage 2'), 'PERSISTENCIA: Arreglo de juegos actualizado en BD');

    // Security & RBAC: PM must NOT be able to modify other users
    const pmTamperUser = await makeRequest('PUT', `/api/users/${sampleCreator.id}`, {
      full_name: 'Hacked By PM'
    }, pmToken);
    assert(pmTamperUser.status === 403, 'SEGURIDAD RBAC: Promoter Manager NO tiene permisos para modificar otros usuarios (403)');

    // Username update & collision validation
    const customNewUsername = 'pm_lead_' + Date.now();
    const updateUsernameRes = await makeRequest('PUT', `/api/users/${samplePm.id}`, {
      username: customNewUsername
    }, adminToken);
    assert(updateUsernameRes.status === 200 && updateUsernameRes.data.username === customNewUsername, 'ADMIN: Modificar nombre de usuario (username) exitosamente');

    // Attempt invalid username characters
    const invalidUsernameRes = await makeRequest('PUT', `/api/users/${samplePm.id}`, {
      username: 'usuario con espacios!@#'
    }, adminToken);
    assert(invalidUsernameRes.status === 400, 'VALIDACIÓN: Rechaza nombres de usuario con caracteres inválidos (400)');

    // Attempt colliding username
    const conflictUsernameRes = await makeRequest('PUT', `/api/users/${sampleCreator.id}`, {
      username: customNewUsername
    }, adminToken);
    assert(conflictUsernameRes.status === 400, 'UNICIDAD: Rechaza colisión de nombre de usuario duplicado (400)');

    // Restore samplePm username for idempotency in subsequent test runs
    const restoreUsernameRes = await makeRequest('PUT', `/api/users/${samplePm.id}`, {
      username: samplePm.username
    }, adminToken);
    assert(restoreUsernameRes.status === 200, 'IDEMPOTENCIA: Restaura nombre de usuario original tras validaciones');

    // 9. INFORMES REPRESENTATIVOS & ANALYTICS EJECUTIVO (ADMIN)
    console.log('\n--- 9. Pruebas del Centro de Informes Representativos & Analytics ---');

    // Access control: Creador/PM has no access to executive reports
    const creatorReportsRes = await makeRequest('GET', '/api/metrics/reports', null, creatorToken);
    assert(creatorReportsRes.status === 403, 'RBAC: Creador no tiene acceso a informes ejecutivos (403)');

    // Super Admin accesses reports
    const adminReportsRes = await makeRequest('GET', '/api/metrics/reports', null, adminToken);
    assert(adminReportsRes.status === 200, 'ADMIN: Super Admin accede exitosamente a /api/metrics/reports (200 OK)');
    const reports = adminReportsRes.data;

    // Verify Top Streamers Ranking
    assert(Array.isArray(reports.top_streamers) && reports.top_streamers.length > 0, 'INFORMES: Retorna ranking de top streamers con métricas completas');
    assert(reports.top_streamers[0].rank === 1 && reports.top_streamers[0].total_views >= reports.top_streamers[reports.top_streamers.length - 1].total_views, 'INFORMES: Top Streamers ordenados correctamente por visualizaciones acumuladas DESC');
    assert(reports.top_streamers[0].views_share_percentage !== undefined, 'INFORMES: Incluye cuota porcentual de audiencia');

    // Verify Ecosystems & Games Distribution
    assert(Array.isArray(reports.ecosystems) && reports.ecosystems.length > 0, 'INFORMES: Retorna desglose de impacto por juego/ecosistema (Metin2, MU Online, etc.)');

    // Verify Streaming Platforms Distribution
    assert(Array.isArray(reports.platforms) && reports.platforms.length > 0, 'INFORMES: Retorna distribución por plataforma de stream (Twitch, Kick, YouTube)');

    // Verify Servers Performance
    assert(Array.isArray(reports.servers) && reports.servers.length > 0, 'INFORMES: Retorna ranking de servidores por audiencia y horas');

    // Verify PMs Performance
    assert(Array.isArray(reports.pms) && reports.pms.length > 0, 'INFORMES: Retorna métricas de supervisión y carga operativa de PMs');

    // Verify Campaign Financials
    assert(Array.isArray(reports.campaigns) && reports.campaigns.length > 0, 'INFORMES: Retorna balance financiero de campañas con costo/hora y CPM estimado');

    // Verify Time Range Filter (7d / 30d)
    const reports7dRes = await makeRequest('GET', '/api/metrics/reports?timeRange=7d', null, adminToken);
    assert(reports7dRes.status === 200 && reports7dRes.data.timeRange === '7d', 'INFORMES: Filtro reactivo por periodo temporal (7d/30d/Histórico)');

    // 10. FLUJO DE LIQUIDACIÓN Y ESTADO 'PAGADO' (PAID) EN ENTREGAS
    console.log('\n--- 10. Pruebas de Revisión y Liquidación: Estado Pagado (paid) ---');

    // 10.1 Creator registers a new delivery
    const deliverySubmitRes = await makeRequest('POST', '/api/evidences', {
      campaign_id: 1,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/videos/98421054',
      activity_date: '2026-09-08',
      duration_minutes: 120,
      avg_viewers: 220,
      peak_viewers: 340,
      total_views: 1850,
      creator_notes: 'Directo especial PvP para liquidación'
    }, creatorToken);
    assert(deliverySubmitRes.status === 201, 'CREADOR: Registra entrega de stream exitosamente para auditoría');
    const newDeliveryId = deliverySubmitRes.data.id;

    // 10.2 PM reviews and approves the delivery (status -> approved)
    const pmApproveRes = await makeRequest('PUT', `/api/evidences/${newDeliveryId}/review`, {
      status: 'approved',
      internal_notes: 'Auditoría PM completada y validada'
    }, pmToken);
    assert(pmApproveRes.status === 200, 'PM: Aprueba entrega tras verificar métricas y VOD');

    // 10.3 Security RBAC: PM must NOT be able to mark delivery as paid
    const pmPayAttempt1 = await makeRequest('PUT', `/api/evidences/${newDeliveryId}/review`, {
      status: 'paid'
    }, pmToken);
    assert(pmPayAttempt1.status === 403, 'SEGURIDAD RBAC: PM tiene PROHIBIDO marcar entregas como pagadas (403)');

    const pmPayAttempt2 = await makeRequest('POST', `/api/evidences/${newDeliveryId}/pay`, {
      payout_amount: 100.00,
      payment_reference: 'HACK-TRX'
    }, pmToken);
    assert(pmPayAttempt2.status === 403, 'SEGURIDAD RBAC: Endpoint /api/evidences/:id/pay bloqueado para PMs (403)');

    // 10.4 Super Admin views deliveries with suggested payout
    const adminEvidencesRes = await makeRequest('GET', '/api/evidences', null, adminToken);
    assert(adminEvidencesRes.status === 200, 'ADMIN: Super Admin obtiene listado integral de entregas');
    const targetDelivery = adminEvidencesRes.data.find(e => e.id === newDeliveryId);
    assert(targetDelivery && targetDelivery.suggested_payout !== undefined, 'ADMIN: Entrega incluye cálculo automático de liquidación sugerida');

    // 10.5 Super Admin reviews and pays the delivery
    const payoutAmount = 90.00;
    const paymentRef = 'TRX-PAY-2026-9901';
    const adminPayRes = await makeRequest('POST', `/api/evidences/${newDeliveryId}/pay`, {
      payout_amount: payoutAmount,
      payment_reference: paymentRef,
      payment_notes: 'Liquidación oficial autorizada por Super Admin'
    }, adminToken);
    assert(adminPayRes.status === 200 && adminPayRes.data.status === 'paid', 'ADMIN: Super Admin procesa y liquida pago de entrega exitosamente (200 OK)');

    // 10.6 Verify persistence of payment fields
    const verifyPaidRes = await makeRequest('GET', '/api/evidences', null, adminToken);
    const paidDelivery = verifyPaidRes.data.find(e => e.id === newDeliveryId);
    assert(paidDelivery.status === 'paid', 'PERSISTENCIA: Estado de entrega actualizado a "paid" en BD');
    assert(paidDelivery.payout_amount === payoutAmount, 'PERSISTENCIA: Monto de liquidación guardado exactamente');
    assert(paidDelivery.payment_reference === paymentRef, 'PERSISTENCIA: Referencia de transacción bancaria/cripto persistida');
    assert(paidDelivery.paid_at !== null, 'PERSISTENCIA: Fecha y hora de pago registradas');

    // 10.7 Creator views paid delivery and payment confirmation
    const creatorEvidencesRes = await makeRequest('GET', '/api/evidences', null, creatorToken);
    const creatorView = creatorEvidencesRes.data.find(e => e.id === newDeliveryId);
    assert(creatorView && creatorView.status === 'paid' && creatorView.payout_amount === payoutAmount, 'CREADOR: Ve entrega con estado "paid" y comprobante de liquidación');

    // 10.8 Server Owner visibility and confidentiality check
    const ownerEvidencesRes = await makeRequest('GET', '/api/evidences', null, ownerToken);
    const ownerView = ownerEvidencesRes.data.find(e => e.id === newDeliveryId);
    assert(ownerView !== undefined, 'DUEÑO SERVIDOR: Puede ver la entrega cumplida tras liquidación');
    assert(ownerView.payment_notes === undefined && ownerView.hourly_rate_internal === undefined, 'CONFIDENCIALIDAD: Tarifas y notas privadas de pago están protegidas para el cliente');

    // 10.9 Audience metrics continue counting paid deliveries
    const statsAfterPay = await makeRequest('GET', '/api/public/stats');
    assert(statsAfterPay.status === 200 && statsAfterPay.data.total_stream_hours > 0, 'MÉTRICAS: Horas y visualizaciones de entregas pagadas se contabilizan continuamente');

    // 11. INFORMES FINANCIEROS DE PAGOS E INGRESOS POR SERVIDOR (EXCLUSIVO ADMIN)
    console.log('\n--- 11. Pruebas de Informes Financieros, Ingresos de Servidor y Gastos PM/Streamer ---');

    // 11.1 RBAC: Strict access restriction (PM, Creator, Server Owner blocked)
    const creatorFinBlock = await makeRequest('GET', '/api/financials/servers', null, creatorToken);
    assert(creatorFinBlock.status === 403, 'SEGURIDAD RBAC: Creador tiene PROHIBIDO consultar informes financieros de servidores (403)');

    const pmFinBlock = await makeRequest('GET', '/api/financials/servers', null, pmToken);
    assert(pmFinBlock.status === 403, 'SEGURIDAD RBAC: Promoter Manager tiene PROHIBIDO consultar informes financieros de servidores (403)');

    const ownerFinBlock = await makeRequest('GET', '/api/financials/servers', null, ownerToken);
    assert(ownerFinBlock.status === 403, 'SEGURIDAD RBAC: Dueño de Servidor tiene PROHIBIDO consultar informes financieros de servidores (403)');

    const pmTransBlock = await makeRequest('POST', '/api/financials/transactions', {
      server_id: 1, type: 'income', concept: 'Hack', amount: 500, transaction_date: '2026-09-08'
    }, pmToken);
    assert(pmTransBlock.status === 403, 'SEGURIDAD RBAC: PM tiene PROHIBIDO registrar movimientos financieros de servidores (403)');

    // 11.2 Super Admin accesses server financial reports
    const adminFinRes = await makeRequest('GET', '/api/financials/servers', null, adminToken);
    assert(adminFinRes.status === 200, 'ADMIN: Super Admin accede exitosamente a /api/financials/servers (200 OK)');
    const finData = adminFinRes.data;
    assert(finData.summary && finData.summary.total_platform_income !== undefined, 'FINANZAS: Retorna balance global (ingresos, gastos streamers, gastos PM, beneficio neto)');
    assert(Array.isArray(finData.servers) && finData.servers.length > 0, 'FINANZAS: Retorna desglose de servidores con P&L individual');

    const astraReport = finData.servers.find(s => s.server_id === 1);
    assert(astraReport && astraReport.financials.total_income > 0, 'FINANZAS: Servidor registra ingresos de apertura (Astra2)');
    assert(astraReport && astraReport.financials.total_pm_expense > 0, 'FINANZAS: Servidor registra gastos de supervisión al PM asignado (Carlos)');
    assert(astraReport && astraReport.financials.net_profit !== undefined, 'FINANZAS: Calcula beneficio neto de plataforma para el servidor');

    // 11.3 Admin registers new server opening revenue
    const newOpeningFee = 2200.00;
    const addIncomeRes = await makeRequest('POST', '/api/financials/transactions', {
      server_id: 1,
      type: 'income',
      category: 'opening_fee',
      concept: 'Fee de Apertura Fase 2 Astra2',
      amount: newOpeningFee,
      transaction_date: '2026-09-08',
      payment_reference: 'INV-ASTRA2-QA',
      payment_method: 'Cripto / USDT',
      recipient_or_payer_name: 'Roberto Díaz'
    }, adminToken);
    assert(addIncomeRes.status === 201, 'ADMIN: Registra pago de apertura de servidor exitosamente (201 Created)');

    // 11.4 Admin registers PM compensation for the server
    const pmFeeAmount = 400.00;
    const addPmFeeRes = await makeRequest('POST', '/api/financials/transactions', {
      server_id: 1,
      type: 'expense_pm',
      category: 'pm_fee',
      concept: 'Bono de Lanzamiento PM Carlos',
      amount: pmFeeAmount,
      transaction_date: '2026-09-08',
      payment_reference: 'PM-BONUS-01',
      recipient_user_id: 5,
      recipient_or_payer_name: 'Carlos Mendoza'
    }, adminToken);
    assert(addPmFeeRes.status === 201, 'ADMIN: Registra gasto/compensación al PM asignado exitosamente (201 Created)');

    // 11.5 Verify updated financial report reflection
    const updatedFinRes = await makeRequest('GET', '/api/financials/servers?server_id=1', null, adminToken);
    assert(updatedFinRes.status === 200, 'ADMIN: Filtra reporte financiero por servidor específico');
    const updatedAstra = updatedFinRes.data.servers.find(s => s.server_id === 1);
    assert(updatedAstra.financials.total_income >= astraReport.financials.total_income + newOpeningFee, 'AUDITORÍA: Ingresos de apertura reflejan el nuevo pago registrado');
    assert(updatedAstra.financials.total_pm_expense >= astraReport.financials.total_pm_expense + pmFeeAmount, 'AUDITORÍA: Gastos de PM reflejan la nueva compensación registrada');
    assert(updatedAstra.financials.net_profit === (updatedAstra.financials.total_income - updatedAstra.financials.total_expenses), 'MATEMÁTICA CONTABLE: Beneficio Neto = Ingresos - Gastos Streamers - Gastos PM');

    console.log('\n--- 12. Pruebas de Directorio de Streamers, Estadísticas y Edición de PM ---');

    // 12.1 PM Carlos accede al directorio de creadores enriquecido con métricas de entregas
    const pmCreatorsRes = await makeRequest('GET', '/api/creators', null, pmToken);
    assert(pmCreatorsRes.status === 200, 'PM: Promoter Manager accede al directorio de creadores (200 OK)');
    assert(Array.isArray(pmCreatorsRes.data) && pmCreatorsRes.data.length >= 3, 'PM: Recibe lista de streamers de la plataforma');

    // 12.2 Identificación exacta de streamers a su cargo
    const dragonInList = pmCreatorsRes.data.find(c => c.user_id === 7 || (c.alias && c.alias.includes('Dragon')));
    const metinKingInList = pmCreatorsRes.data.find(c => c.user_id === 9 || (c.alias && c.alias.includes('MetinKing')));
    assert(dragonInList && dragonInList.is_under_charge === true, 'ESTATUS OPERATIVO: DragonSlayer está a cargo de PM Carlos (is_under_charge: true)');
    assert(metinKingInList && metinKingInList.is_under_charge === false, 'ESTATUS OPERATIVO: MetinKing NO está a cargo de PM Carlos (is_under_charge: false)');

    // 12.3 Verificación de estadísticas de entregas calculadas
    assert(dragonInList.total_evidences !== undefined, 'MÉTRICAS: Creador incluye conteo total de entregas');
    assert(dragonInList.approved_evidences !== undefined, 'MÉTRICAS: Creador incluye conteo de entregas aprobadas');
    assert(dragonInList.total_hours_streamed !== undefined, 'MÉTRICAS: Creador incluye horas totales transmitidas');
    assert(dragonInList.avg_viewers !== undefined, 'MÉTRICAS: Creador incluye media de espectadores');

    // 12.4 PM consulta historial de entregas de un creador
    const creatorEvsRes = await makeRequest('GET', `/api/creators/${dragonInList.id}/evidences`, null, pmToken);
    assert(creatorEvsRes.status === 200, 'PM: Consulta historial detallado de transmisiones y entregas del streamer');
    assert(Array.isArray(creatorEvsRes.data.evidences), 'HISTORIAL: Retorna listado de entregas y VODs del creador');

    // 12.5 PM modifica información de un streamer A SU CARGO exitosamente
    const updateDragonRes = await makeRequest('PUT', `/api/creators/${dragonInList.id}`, {
      alias: 'DragonSlayer Pro PM',
      bio: 'Biografía actualizada por el PM Carlos a cargo del servidor Astra2.',
      games: ['Metin2', 'WoW'],
      platforms: ['Twitch', 'Kick'],
      phone: '+34 699 111 222',
      notes: 'Creador muy puntual y comprometido con los directos de Astra2.'
    }, pmToken);
    assert(updateDragonRes.status === 200, 'PM AUTORIZADO: PM Carlos modifica streamer asignado a su cargo exitosamente (200 OK)');

    // 12.6 Verificación de persistencia de cambios
    const verifyUpdatedCreator = await makeRequest('GET', '/api/creators', null, pmToken);
    const updatedDragon = verifyUpdatedCreator.data.find(c => c.user_id === 7);
    assert(updatedDragon && updatedDragon.alias === 'DragonSlayer Pro PM', 'PERSISTENCIA: Alias de creador actualizado por PM');
    assert(updatedDragon && updatedDragon.bio.includes('Astra2'), 'PERSISTENCIA: Bio de creador actualizada por PM');
    assert(updatedDragon && updatedDragon.phone === '+34 699 111 222', 'PERSISTENCIA: Teléfono de contacto actualizado por PM');

    // 12.7 SEGURIDAD RBAC: PM intenta modificar streamer que NO está a su cargo -> BLOQUEO 403
    const blockedUpdateRes = await makeRequest('PUT', `/api/creators/${metinKingInList.id}`, {
      alias: 'Hack Alias',
      bio: 'Intento no autorizado'
    }, pmToken);
    assert(blockedUpdateRes.status === 403, 'SEGURIDAD RBAC: PM tiene PROHIBIDO modificar creadores que NO están a su cargo (403 Forbidden)');

    // 12.8 SEGURIDAD FINANCIERA: PM intenta alterar tarifas económicas internas -> Ignorado o protegido
    await makeRequest('PUT', `/api/creators/${dragonInList.id}`, {
      hourly_rate_internal: 9999.00
    }, pmToken);
    const checkRatesRes = await makeRequest('GET', '/api/creators', null, adminToken);
    const checkDragonAdmin = checkRatesRes.data.find(c => c.user_id === 7);
    assert(checkDragonAdmin.hourly_rate_internal !== 9999.00, 'CONFIDENCIALIDAD: PM no puede alterar tarifas internas confidenciales de la agencia');

    // Restaurar alias original para mantener idempotencia
    await makeRequest('PUT', `/api/creators/${dragonInList.id}`, {
      alias: 'DragonSlayer',
      bio: 'Streamer enfocado en contenido PvP de Metin2, directos diarios de farmeo y torneos de gremio.',
      games: ['Metin2'],
      platforms: ['Twitch', 'YouTube', 'TikTok']
    }, adminToken);

    // 13. EXCLUSIVIDAD SUPER ADMIN: SUSPENDER, REACTIVAR Y ELIMINAR SERVIDORES
    console.log('\n--- 13. Exclusividad Super Admin: Suspender, Reactivar y Eliminar Servidores ---');

    // 13.1 Crear un servidor de pruebas con PM Carlos y Creador DragonSlayer
    const createSrvRes = await makeRequest('POST', '/api/servers', {
      name: 'Metin2 Nexus QA',
      game: 'Metin2',
      status: 'active',
      contact_info: 'nexus@metin2.com',
      owner_user_id: 8, // owner.astra2
      pm_user_id: 5,    // pm.carlos
      creator_ids: [7]  // dragonslayer
    }, adminToken);
    assert(createSrvRes.status === 201, 'SUPER ADMIN: Crea servidor "Metin2 Nexus QA" con status activo (201 Created)');
    const testServerId = createSrvRes.data.id;

    // 13.2 PM intenta suspender el servidor por endpoint directo -> 403 Forbidden
    const pmSuspendStatusRes = await makeRequest('PUT', `/api/servers/${testServerId}/status`, {
      status: 'suspended'
    }, pmToken);
    assert(pmSuspendStatusRes.status === 403, 'SEGURIDAD RBAC: PM tiene PROHIBIDO suspender servidor por /status (403 Forbidden)');

    // 13.3 PM intenta suspender el servidor por updateServer general -> 403 Forbidden
    const pmSuspendUpdateRes = await makeRequest('PUT', `/api/servers/${testServerId}`, {
      status: 'suspended'
    }, pmToken);
    assert(pmSuspendUpdateRes.status === 403, 'SEGURIDAD RBAC: PM tiene PROHIBIDO cambiar status a suspended en updateServer (403 Forbidden)');

    // 13.4 PM intenta eliminar el servidor -> 403 Forbidden
    const pmDeleteRes = await makeRequest('DELETE', `/api/servers/${testServerId}`, null, pmToken);
    assert(pmDeleteRes.status === 403, 'SEGURIDAD RBAC: PM tiene PROHIBIDO eliminar servidor (403 Forbidden)');

    // 13.5 Server Owner intenta suspender el servidor -> 403 Forbidden
    const ownerSuspendRes = await makeRequest('PUT', `/api/servers/${testServerId}/status`, {
      status: 'suspended'
    }, ownerToken);
    assert(ownerSuspendRes.status === 403, 'SEGURIDAD RBAC: Server Owner tiene PROHIBIDO suspender servidor (403 Forbidden)');

    // 13.6 Creator intenta eliminar el servidor -> 403 Forbidden
    const creatorDeleteRes = await makeRequest('DELETE', `/api/servers/${testServerId}`, null, creatorToken);
    assert(creatorDeleteRes.status === 403, 'SEGURIDAD RBAC: Creator tiene PROHIBIDO eliminar servidor (403 Forbidden)');

    // 13.7 Super Admin suspende el servidor exitosamente
    const adminSuspendRes = await makeRequest('PUT', `/api/servers/${testServerId}/status`, {
      status: 'suspended'
    }, adminToken);
    assert(adminSuspendRes.status === 200 && adminSuspendRes.data.status === 'suspended', 'SUPER ADMIN: Suspende servidor exitosamente (200 OK)');

    // 13.8 Intentar crear campaña en servidor suspendido -> 400 Bad Request
    const campOnSuspended = await makeRequest('POST', '/api/campaigns', {
      name: 'Campaña en Servidor Suspendido',
      server_id: testServerId,
      start_date: '2026-11-10',
      end_date: '2026-11-20'
    }, pmToken);
    assert(campOnSuspended.status === 400, 'PROTECCIÓN: Creación de campaña rechazada en servidor suspendido (400 Bad Request)');

    // 13.9 Super Admin reactiva el servidor exitosamente
    const adminReactivateRes = await makeRequest('PUT', `/api/servers/${testServerId}/status`, {
      status: 'active'
    }, adminToken);
    assert(adminReactivateRes.status === 200 && adminReactivateRes.data.status === 'active', 'SUPER ADMIN: Reactiva servidor exitosamente (200 OK)');

    // 13.10 Super Admin elimina el servidor (Soft Delete)
    const adminDeleteRes = await makeRequest('DELETE', `/api/servers/${testServerId}`, null, adminToken);
    assert(adminDeleteRes.status === 200, 'SUPER ADMIN: Elimina servidor exitosamente (Soft Delete 200 OK)');

    // 13.11 Verificar que el servidor eliminado ya no aparece en GET /api/servers
    const allServersRes = await makeRequest('GET', '/api/servers', null, adminToken);
    const serverStillPresent = allServersRes.data.some(s => s.id === testServerId);
    assert(!serverStillPresent, 'PERSISTENCIA: Servidor eliminado no figura en listado activo');

    // 14. AGRUPACIÓN DE CAMPAÑAS POR SERVIDOR & HISTORIAL DE CAMPAÑAS
    console.log('\n--- 14. Agrupación de Campañas por Servidor e Historial de Campañas ---');

    // 14.1 Consultar campañas en GET /api/campaigns y verificar metadatos de servidor para agrupación
    const adminCampsRes = await makeRequest('GET', '/api/campaigns', null, adminToken);
    assert(adminCampsRes.status === 200 && Array.isArray(adminCampsRes.data), 'GET /api/campaigns retorna lista de campañas');
    const hasServerGroupMetadata = adminCampsRes.data.every(c => c.server_id && c.server_name && c.server_game);
    assert(hasServerGroupMetadata, 'AGRUPACIÓN: Cada campaña incluye server_id, server_name y server_game para agrupar por servidor');

    // 14.2 Crear dos campañas en el servidor Astra2 (server_id: 1)
    const campARes = await makeRequest('POST', '/api/campaigns', {
      name: 'Astra2 Alpha Launch QA',
      server_id: 1,
      start_date: '2026-11-01',
      end_date: '2026-11-10',
      objective: 'Apertura fase Alpha con 30h de directos',
      requirements: 'Logo en stream y enlaces de registro',
      budget_internal: 400.00,
      creator_ids: [7] // dragonslayer
    }, pmToken);
    assert(campARes.status === 201, 'PM: Crea campaña "Astra2 Alpha Launch QA" activa (201 Created)');
    const campAId = campARes.data.id;

    const campBRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Astra2 Weekend EXP Boost',
      server_id: 1,
      start_date: '2026-11-15',
      end_date: '2026-11-17',
      objective: 'Evento de farmeo intensivo de fin de semana',
      requirements: 'Directos de 3h diarias',
      budget_internal: 250.00,
      creator_ids: [7]
    }, pmToken);
    assert(campBRes.status === 201, 'PM: Crea campaña "Astra2 Weekend EXP Boost" activa (201 Created)');
    const campBId = campBRes.data.id;

    // 14.3 Finalizar Campaña A y archivarla en el Historial del Servidor (status = 'completed')
    const finalizeRes = await makeRequest('PUT', `/api/campaigns/${campAId}`, {
      status: 'completed'
    }, pmToken);
    assert(finalizeRes.status === 200, 'HISTORIAL: PM finaliza Campaña A y la archiva en el Historial (200 OK)');

    // 14.4 Verificar que Campaña A ahora figura con status 'completed' en la API
    const verifyCampsRes = await makeRequest('GET', '/api/campaigns', null, pmToken);
    const completedCamp = verifyCampsRes.data.find(c => c.id === campAId);
    assert(completedCamp && completedCamp.status === 'completed', 'PERSISTENCIA: Campaña archivada con status "completed"');

    // 14.5 Pausar Campaña B
    const pauseRes = await makeRequest('PUT', `/api/campaigns/${campBId}`, {
      status: 'paused'
    }, pmToken);
    assert(pauseRes.status === 200, 'ESTADO: PM pausa Campaña B temporalmente (status = "paused")');

    // 14.6 Reactivar Campaña A desde el Historial
    const reactivateCampRes = await makeRequest('PUT', `/api/campaigns/${campAId}`, {
      status: 'active'
    }, pmToken);
    assert(reactivateCampRes.status === 200, 'REACTIVACIÓN: PM reactiva Campaña A del Historial a estado activa (200 OK)');

    // 14.7 Dueño de Servidor consulta GET /api/campaigns
    const ownerCampsRes = await makeRequest('GET', '/api/campaigns', null, ownerToken);
    assert(ownerCampsRes.status === 200 && Array.isArray(ownerCampsRes.data), 'DUEÑO SERVIDOR: Consulta campañas de su servidor');
    const ownerOnlyHisServer = ownerCampsRes.data.every(c => c.server_id === 1);
    assert(ownerOnlyHisServer, 'RBAC SCOPE: Dueño de Servidor SOLO ve campañas correspondientes a su servidor');
    const noBudgetLeaked = ownerCampsRes.data.every(c => c.budget_internal === undefined);
    assert(noBudgetLeaked, 'CONFIDENCIALIDAD: Presupuesto interno de campaña permanece oculto para el Dueño del Servidor');

    // 14.8 Creador consulta GET /api/campaigns
    const creatorCampsRes = await makeRequest('GET', '/api/campaigns', null, creatorToken);
    assert(creatorCampsRes.status === 200 && Array.isArray(creatorCampsRes.data), 'CREADOR: Consulta campañas en las que participa');
    const creatorHasServerData = creatorCampsRes.data.every(c => c.server_name && c.server_game);
    assert(creatorHasServerData, 'CREADOR AGRUPACIÓN: Creador recibe metadatos de servidor para agrupar sus campañas');

    // 15. CONTRATOS PARA STREAMERS Y PMS, PRESUPUESTO FINAL Y DEDUCCIÓN DE GANANCIA DE SERVIDORES
    console.log('\n--- 15. Contratos para Streamers y PMs, Presupuesto Final y Deducción de Ganancia ---');

    // 15.1 PM intenta crear un contrato -> 403 Forbidden
    const pmCreateContractRes = await makeRequest('POST', '/api/contracts', {
      server_id: 1,
      user_id: 7,
      role: 'streamer',
      contract_type: 'hourly',
      title: 'Contrato No Autorizado'
    }, pmToken);
    assert(pmCreateContractRes.status === 403, 'SEGURIDAD RBAC: PM tiene PROHIBIDO crear contratos oficiales (403 Forbidden)');

    // 15.2 Creador intenta crear un contrato -> 403 Forbidden
    const creatorCreateContractRes = await makeRequest('POST', '/api/contracts', {
      server_id: 1,
      user_id: 7,
      role: 'streamer',
      contract_type: 'hourly',
      title: 'Contrato No Autorizado'
    }, creatorToken);
    assert(creatorCreateContractRes.status === 403, 'SEGURIDAD RBAC: Creador tiene PROHIBIDO crear contratos (403 Forbidden)');

    // 15.3 Super Admin crea Contrato Híbrido para Streamer DragonSlayer en Astra2
    const streamerContractRes = await makeRequest('POST', '/api/contracts', {
      server_id: 1,
      user_id: 7, // dragonslayer
      role: 'streamer',
      contract_type: 'hybrid',
      title: 'Contrato Híbrido Apertura Astra2 - DragonSlayer',
      base_amount: 150.00,
      hourly_rate: 10.00,
      hours_committed: 20,
      terms_description: '20 horas de streaming en horario estelar con overlay oficial.'
    }, adminToken);
    assert(streamerContractRes.status === 201, 'SUPER ADMIN: Crea Contrato Híbrido para streamer (201 Created)');
    assert(streamerContractRes.data.total_budgeted === 350.00, 'MATEMÁTICA CONTRACTUAL: Presupuesto calculado exactamente: $150 base + ($10 * 20h) = $350.00');
    const streamerContractId = streamerContractRes.data.id;

    // 15.4 Super Admin crea Contrato Fijo para PM Carlos en Astra2
    const pmContractRes = await makeRequest('POST', '/api/contracts', {
      server_id: 1,
      user_id: 5, // pm.carlos
      role: 'pm',
      contract_type: 'fixed_fee',
      title: 'Honorario Fijo Supervisión Astra2 - Carlos Mendoza',
      base_amount: 350.00,
      terms_description: 'Supervisión integral de apertura y creadores asignados.'
    }, adminToken);
    assert(pmContractRes.status === 201, 'SUPER ADMIN: Crea Contrato Fijo para PM (201 Created)');
    assert(pmContractRes.data.total_budgeted === 350.00, 'MATEMÁTICA CONTRACTUAL: Presupuesto fijo de PM establecido en $350.00');
    const pmContractId = pmContractRes.data.id;

    // 15.5 Super Admin consulta P&L con Presupuesto de Contratos y Ganancia Proyectada
    const finContractsRes = await makeRequest('GET', '/api/financials/servers?server_id=1', null, adminToken);
    assert(finContractsRes.status === 200, 'FINANZAS: Super Admin consulta balance y contratos del servidor Astra2');
    const astra2Fin = finContractsRes.data.servers.find(s => s.server_id === 1);
    assert(astra2Fin && astra2Fin.contracts_summary.total_budgeted === 700.00, 'PRESUPUESTO TOTAL: Servidor acumula $700.00 en presupuesto comprometido ($350 streamer + $350 PM)');
    assert(astra2Fin && astra2Fin.financials.remaining_committed_budget === 700.00, 'SALDO COMPROMETIDO: $700.00 pendientes de liquidar');
    assert(astra2Fin && astra2Fin.financials.projected_net_profit === (astra2Fin.financials.total_income - 700.00), 'DEDUCCIÓN DE GANANCIA: Ganancia final proyectada descuenta el 100% del presupuesto de contratos');

    // 15.6 Super Admin liquida un abono de $150.00 al contrato del Streamer
    const payContractRes = await makeRequest('POST', `/api/contracts/${streamerContractId}/pay`, {
      amount: 150.00,
      payment_reference: 'TX-PAY-STREAMER-001',
      payment_method: 'Transferencia',
      notes: 'Anticipo por inicio de campaña de apertura'
    }, adminToken);
    assert(payContractRes.status === 200, 'PAGOS: Super Admin liquida abono de $150 al contrato del streamer');
    assert(payContractRes.data.total_paid === 150.00, 'PERSISTENCIA: Total pagado del contrato actualizado a $150.00');
    assert(payContractRes.data.remaining_balance === 200.00, 'PERSISTENCIA: Saldo pendiente del contrato reducido a $200.00');

    // 15.7 Verificar que el pago se descontó automáticamente de la ganancia en caja del servidor
    const verifyFinAfterPay = await makeRequest('GET', '/api/financials/servers?server_id=1', null, adminToken);
    const astra2AfterPay = verifyFinAfterPay.data.servers.find(s => s.server_id === 1);
    assert(astra2AfterPay.contracts_summary.remaining_balance === 550.00, 'DEDUCCIÓN EN TIEMPO REAL: Saldo pendiente global del servidor reducido a $550.00 ($200 streamer + $350 PM)');

    // 15.8 Creador DragonSlayer consulta sus contratos
    const creatorContractsRes = await makeRequest('GET', '/api/contracts', null, creatorToken);
    assert(creatorContractsRes.status === 200, 'CREADOR: Consulta sus contratos activos');
    const creatorContract = creatorContractsRes.data.find(c => c.id === streamerContractId);
    assert(creatorContract && creatorContract.total_paid === 150.00 && creatorContract.remaining_balance === 200.00, 'CREADOR: Visualiza su presupuesto, lo que ya cobró y su saldo pendiente');

    // 16. ASIGNACIÓN DE MÚLTIPLES PMS POR SERVIDOR, PRESUPUESTO DE SERVIDOR Y GANANCIA POR SERVIDOR Y POR CAMPAÑA
    console.log('\n--- 16. Asignación de Múltiples PMs por Servidor, Presupuesto de Servidor y Ganancia por Servidor y por Campaña ---');

    // 16.1 Login 2FA para PM Elena (id: 6)
    const elenaLogin = await doFullLogin('pm.elena', 'PMForgeX2026!PM2');
    assert(elenaLogin.status === 200 && elenaLogin.data.token, 'AUTENTICACIÓN: Login y token JWT emitido para PM Elena (id: 6)');
    const pmElenaToken = elenaLogin.data.token;

    // 16.2 Super Admin crea Servidor con Presupuesto Asignado ($5,000 USD) y múltiples PMs (Carlos id:5 y Elena id:6)
    const newServerWithMultiplePms = await makeRequest('POST', '/api/servers', {
      name: 'Metin2 Omniverse QA',
      game: 'Metin2',
      budget: 5000.00,
      pm_ids: [5, 6],
      notes: 'Servidor multi-PM con presupuesto asignado oficial.'
    }, adminToken);
    assert(newServerWithMultiplePms.status === 201, 'SUPER ADMIN: Crea servidor con Presupuesto y Múltiples PMs (201 Created)');
    const multiServerId = newServerWithMultiplePms.data.id;

    // 16.3 Consultar GET /api/servers y verificar que incluye budget y assigned_pms con ambos PMs
    const getServersRes = await makeRequest('GET', '/api/servers', null, adminToken);
    const multiServer = getServersRes.data.find(s => s.id === multiServerId);
    assert(multiServer && multiServer.budget === 5000.00, 'PRESUPUESTO SERVIDOR: Servidor expone presupuesto asignado de $5000.00 USD');
    assert(multiServer && Array.isArray(multiServer.assigned_pms) && multiServer.assigned_pms.length === 2, 'MÚLTIPLES PMS: Servidor incluye listado de 2 PMs asignados oficialmente');
    const pmsIds = (multiServer.assigned_pms || []).map(p => p.pm_id);
    assert(pmsIds.includes(5) && pmsIds.includes(6), 'INTEGRIDAD MULTI-PM: Tanto Carlos (id:5) como Elena (id:6) figuran asignados al servidor');

    // 16.4 PM Elena (asignada vía server_pms) crea una campaña en el servidor con presupuesto de campaña ($1,200 USD)
    const elenaCampaignRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Omniverse Beta Launch',
      server_id: multiServerId,
      budget_internal: 1200.00,
      objective: 'Campaña de apertura y reclutamiento inicial'
    }, pmElenaToken);
    assert(elenaCampaignRes.status === 201, 'AUTORIZACIÓN MULTI-PM: PM Elena crea campaña exitosamente en servidor multi-PM (201 Created)');
    const omniverseCampId = elenaCampaignRes.data.id;

    // 16.5 Creador no autorizado a gestionar PMs en servidor -> 403 Forbidden
    const unauthAddPmRes = await makeRequest('POST', `/api/servers/${multiServerId}/pms`, { pm_id: 6 }, creatorToken);
    assert(unauthAddPmRes.status === 403, 'SEGURIDAD RBAC: Creador tiene PROHIBIDO asignar PMs a servidores (403 Forbidden)');

    // 16.6 Super Admin añade creador a la campaña, crea evidencia pagada ($200 USD) y registra ingreso de apertura ($3,000 USD)
    await makeRequest('POST', `/api/campaigns/${omniverseCampId}/creators`, {
      creator_id: 7,
      agreement_terms: 'Directos de apertura',
      payout_internal: 200.00
    }, adminToken);

    // Registrar ingreso del servidor ($3,000 USD)
    await makeRequest('POST', '/api/financials/transactions', {
      server_id: multiServerId,
      type: 'income',
      category: 'opening_fee',
      concept: 'Fee Apertura Oficial Omniverse',
      amount: 3000.00,
      transaction_date: '2026-11-19'
    }, adminToken);

    // Crear y liquidar evidencia de campaña ($200 USD)
    const createEvRes = await makeRequest('POST', '/api/evidences', {
      campaign_id: omniverseCampId,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/dragonslayer/omniverse',
      activity_date: '2026-11-19',
      duration_minutes: 120,
      total_views: 1500
    }, creatorToken);
    const omniEvId = createEvRes.data.id;

    // Aprobar y pagar evidencia (exclusivo admin)
    await makeRequest('PUT', `/api/evidences/${omniEvId}/review`, { status: 'approved' }, adminToken);
    await makeRequest('POST', `/api/evidences/${omniEvId}/pay`, {
      payout_amount: 200.00,
      payment_reference: 'TX-OMNI-001',
      payment_notes: 'Pago completo de directo Omniverse'
    }, adminToken);

    // 16.7 Consultar P&L de Servidores y verificar Ganancia por Servidor y Ganancia por Campaña
    const omniFinRes = await makeRequest('GET', `/api/financials/servers?server_id=${multiServerId}`, null, adminToken);
    assert(omniFinRes.status === 200, 'FINANZAS: Super Admin consulta P&L detallado de Servidor y Campañas');
    const omniFin = omniFinRes.data.servers.find(s => s.server_id === multiServerId);

    // Ganancia por Servidor:
    assert(omniFin && omniFin.financials.server_budget === 5000.00, 'GANANCIA SERVIDOR: Presupuesto del Servidor reflejado en $5000.00 USD');
    assert(omniFin && omniFin.financials.total_income === 3000.00, 'GANANCIA SERVIDOR: Ingresos totales del servidor reflejados en $3000.00 USD');
    assert(omniFin && omniFin.financials.net_profit === 2800.00, 'GANANCIA SERVIDOR: Ganancia Neta en Caja calculada: $3000 ingreso - $200 gasto = $2800.00 USD');
    assert(omniFin && omniFin.financials.budget_remaining === 4800.00, 'PRESUPUESTO SERVIDOR: Saldo de presupuesto restante calculado: $5000 - $200 = $4800.00 USD');

    // Ganancia por Campaña:
    const omniCampPnl = (omniFin.breakdown?.campaigns_pnl || []).find(c => c.campaign_id === omniverseCampId);
    assert(omniCampPnl && omniCampPnl.budget === 1200.00, 'GANANCIA CAMPAÑA: Presupuesto de campaña reflejado en $1200.00 USD');
    assert(omniCampPnl && omniCampPnl.paid_streamers_expense === 200.00, 'GANANCIA CAMPAÑA: Gasto pagado en streamers reflejado en $200.00 USD');
    assert(omniCampPnl && omniCampPnl.net_profit === 1000.00, 'GANANCIA CAMPAÑA: Ganancia neta calculada exactamente: $1200 presupuesto - $200 pagado = $1000.00 USD');
    assert(omniCampPnl && omniCampPnl.profit_margin_percentage === 83.3, 'GANANCIA CAMPAÑA: Margen de rentabilidad calculado: 83.3%');

    // 16.8 Desvincular un PM del servidor mediante endpoint dedicado DELETE /api/servers/:id/pms/:pmId
    const removePmRes = await makeRequest('DELETE', `/api/servers/${multiServerId}/pms/6`, null, adminToken);
    assert(removePmRes.status === 200, 'GESTIÓN MULTI-PM: Super Admin desvincula un PM del servidor exitosamente (200 OK)');
    const checkAfterRemove = await makeRequest('GET', '/api/servers', null, adminToken);
    const multiAfterRemove = checkAfterRemove.data.find(s => s.id === multiServerId);
    assert(multiAfterRemove.assigned_pms.length === 1 && multiAfterRemove.assigned_pms[0].pm_id === 5, 'PERSISTENCIA MULTI-PM: Servidor conserva al PM restante (Carlos) activo');

    // ========================================================
    // 17. CONTROL ESTRICTO DE PRESUPUESTO POR SERVIDOR/ACUMULADO Y RESTRICCIÓN DE EVIDENCIAS Y HORAS
    // ========================================================
    console.log('\n--- 17. RESTRICCIONES DE PRESUPUESTO Y TOPES DE DIRECTOS/HORAS ---');

    // 17.1 Creación de servidor con presupuesto oficial limitado ($1,000 USD)
    const budgetServerRes = await makeRequest('POST', '/api/servers', {
      name: 'Chronos World PvP',
      game: 'Metin2',
      budget: 1000.00,
      pm_ids: [5],
      notes: 'Servidor con presupuesto estrictamente auditado de $1000 USD.'
    }, adminToken);
    assert(budgetServerRes.status === 201, 'CONTROL PRESUPUESTO: Creación de servidor con límite presupuestario de $1,000.00 USD (201 Created)');
    const budgetServerId = budgetServerRes.data.id;

    // 17.2 Campaña individual que excede el presupuesto total del servidor ($1,500 > $1,000) -> 400 Bad Request
    const exceedSingleRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Campaña Excesiva Unitaria',
      server_id: budgetServerId,
      budget_internal: 1500.00,
      objective: 'Debe ser rechazada por exceder el tope del servidor'
    }, adminToken);
    assert(exceedSingleRes.status === 400, 'VALIDACIÓN TECHO PRESUPUESTO: Rechazo 400 Bad Request al intentar campaña unitaria ($1,500) mayor al servidor ($1,000)');
    assert(exceedSingleRes.data.error.includes('exceder el presupuesto total del servidor'), 'MENSAJE VALIDACIÓN: Error explícito indicando límite del servidor');

    // 17.3 Creación exitosa de Campaña 1 dentro del presupuesto ($600.00 <= $1,000.00)
    const camp1Res = await makeRequest('POST', '/api/campaigns', {
      name: 'Chronos Fase 1 - Teasers',
      server_id: budgetServerId,
      budget_internal: 600.00,
      target_evidences: 10,
      target_hours: 20.0,
      objective: 'Fase inicial de promoción'
    }, adminToken);
    assert(camp1Res.status === 201, 'CONTROL PRESUPUESTO: Creación exitosa de Campaña 1 ($600.00 USD) dentro del límite del servidor');
    const camp1Id = camp1Res.data.id;

    // 17.4 Campaña 2 que hace que el acumulado del grupo exceda el servidor ($600 + $500 = $1,100 > $1,000) -> 400 Bad Request
    const exceedAccumRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Chronos Fase 2 - Exceso Acumulado',
      server_id: budgetServerId,
      budget_internal: 500.00,
      objective: 'Debe ser rechazada porque el acumulado ($1,100) excede los $1,000 disponibles'
    }, adminToken);
    assert(exceedAccumRes.status === 400, 'VALIDACIÓN ACUMULADO GRUPO: Rechazo 400 Bad Request cuando el acumulado de campañas excede el presupuesto del servidor');
    assert(exceedAccumRes.data.error.includes('Presupuesto restante disponible: $400.00'), 'MENSAJE DISPONIBILIDAD: Alerta indica exactamente el saldo remanente ($400.00)');

    // 17.5 Creación válida de Campaña 2 dentro del saldo exacto disponible ($400.00) con límites de directos (2) y horas (4.0h)
    const camp2Res = await makeRequest('POST', '/api/campaigns', {
      name: 'Chronos Fase 2 - Directos Estrictos',
      server_id: budgetServerId,
      budget_internal: 400.00,
      target_evidences: 2,
      target_hours: 4.0,
      objective: 'Campaña con cupo exacto de 2 directos y 4 horas máximas'
    }, adminToken);
    assert(camp2Res.status === 201, 'CUPO CAMPAÑA: Creación exitosa de Campaña 2 ($400.00 USD) agotando el saldo del servidor (2 directos, 4.0h)');
    const camp2Id = camp2Res.data.id;

    // 17.6 Rechazar actualización de presupuesto si se intenta elevar excediendo el servidor
    const updateExceedRes = await makeRequest('PUT', `/api/campaigns/${camp2Id}`, {
      budget_internal: 450.00 // 600 + 450 = 1050 > 1000
    }, adminToken);
    assert(updateExceedRes.status === 400, 'VALIDACIÓN UPDATE: Edición de campaña rechazada (400) si el nuevo presupuesto acumulado excede el servidor');

    // 17.7 Asignar creador (user id: 7) a la Campaña 2
    await makeRequest('POST', `/api/campaigns/${camp2Id}/creators`, {
      creator_id: 7,
      agreement_terms: 'Directos limitados',
      payout_internal: 200.00
    }, adminToken);

    // 17.8 Streamer entrega Evidencia 1 (2 horas = 120 min) -> Exitosa (201 Created)
    const ev1Res = await makeRequest('POST', '/api/evidences', {
      campaign_id: camp2Id,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/dragonslayer/chronos-1',
      activity_date: '2026-11-19',
      duration_minutes: 120,
      total_views: 800
    }, creatorToken);
    assert(ev1Res.status === 201, 'ENTREGA 1: Streamer registra 1º directo (2h / 120min) en campaña con límites (201 Created)');

    // 17.9 Streamer entrega Evidencia 2 (2 horas = 120 min) -> Exitosa (201 Created)
    const ev2Res = await makeRequest('POST', '/api/evidences', {
      campaign_id: camp2Id,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/dragonslayer/chronos-2',
      activity_date: '2026-11-19',
      duration_minutes: 120,
      total_views: 950
    }, creatorToken);
    assert(ev2Res.status === 201, 'ENTREGA 2: Streamer registra 2º directo (2h / 120min) alcanzando el cupo total de 2 directos y 4.0 horas (201 Created)');

    // 17.10 Restricción: Streamer intenta registrar un 3º directo superando el límite de 2 directos -> 400 Bad Request
    const ev3Res = await makeRequest('POST', '/api/evidences', {
      campaign_id: camp2Id,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/dragonslayer/chronos-3',
      activity_date: '2026-11-19',
      duration_minutes: 60,
      total_views: 400
    }, creatorToken);
    assert(ev3Res.status === 400, 'RESTRICCIÓN TOPE EVIDENCIAS: Intento de entrega 3 rechazada con 400 Bad Request por límite alcanzado');
    assert(ev3Res.data.error.includes('Se ha alcanzado el límite máximo de 2'), 'MENSAJE LÍMITE DIRECTOS: Error informa claramente que se alcanzó el tope de directos');

    // 17.11 Restricción de horas en campaña dedicada
    const hoursCampRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Horas Restringidas Test',
      server_id: budgetServerId,
      budget_internal: 0, // 0 para no requerir presupuesto
      target_evidences: 10,
      target_hours: 3.0,
      objective: 'Campaña con límite estricto de 3.0 horas'
    }, adminToken);
    const hoursCampId = hoursCampRes.data.id;
    await makeRequest('POST', `/api/campaigns/${hoursCampId}/creators`, { creator_id: 7 }, adminToken);

    // Intento de entrega de 4 horas (240 min) > 3.0 horas límite -> 400 Bad Request
    const exceedHoursEvRes = await makeRequest('POST', '/api/evidences', {
      campaign_id: hoursCampId,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/dragonslayer/long-stream',
      activity_date: '2026-11-19',
      duration_minutes: 240,
      total_views: 500
    }, creatorToken);
    assert(exceedHoursEvRes.status === 400, 'RESTRICCIÓN TOPE HORAS: Intento de entrega de 4.0h rechazada con 400 Bad Request por exceder cupo de 3.0h');
    assert(exceedHoursEvRes.data.error.includes('excede el cupo de horas disponible'), 'MENSAJE LÍMITE HORAS: Error informa que la duración ingresada excede el cupo');

    // ========================================================
    // 18. INFORME CONSOLIDADO DE GASTOS POR STREAMER, SERVIDORES Y PAGOS DE PMS (POR CORTES O FECHAS)
    // ========================================================
    console.log('\n--- 18. INFORME DE GASTOS POR CORTES O FECHAS ---');

    // 18.1 Control de Acceso RBAC estricto
    const unauthCreatorReport = await makeRequest('GET', '/api/financials/expense-report', null, creatorToken);
    assert(unauthCreatorReport.status === 403, 'RBAC INFORME: Creador tiene PROHIBIDO consultar el informe de gastos y cortes (403 Forbidden)');

    const unauthPmReport = await makeRequest('GET', '/api/financials/expense-report', null, pmToken);
    assert(unauthPmReport.status === 403, 'RBAC INFORME: PM tiene PROHIBIDO consultar el informe de gastos de servidores (403 Forbidden)');

    // 18.2 Super Admin consulta informe histórico completo (cutoff=all)
    const adminReportAll = await makeRequest('GET', '/api/financials/expense-report?cutoff=all', null, adminToken);
    assert(adminReportAll.status === 200, 'INFORME CORTES: Super Admin obtiene informe histórico completo exitosamente (200 OK)');
    assert(adminReportAll.data.summary && adminReportAll.data.summary.total_expenses > 0, 'INFORME CORTES: Totales consolidados de gastos computados');
    assert(adminReportAll.data.summary.total_streamers_paid > 0, 'INFORME CORTES: Registra gastos liquidados en streamers');
    assert(adminReportAll.data.summary.total_income > 0, 'INFORME CORTES: Registra ingresos por servidores');
    assert(Array.isArray(adminReportAll.data.streamers), 'INFORME CORTES: Contiene lista detallada de gastos por cada streamer');
    assert(Array.isArray(adminReportAll.data.servers), 'INFORME CORTES: Contiene lista detallada de gastos por cada servidor');
    assert(Array.isArray(adminReportAll.data.pms), 'INFORME CORTES: Contiene lista detallada de pagos a Promoter Managers');
    assert(Array.isArray(adminReportAll.data.audit_log), 'INFORME CORTES: Contiene auditoría cronológica de transacciones del corte');

    // 18.3 Comprobar desglose exacto por Streamer
    const dragonStreamer = adminReportAll.data.streamers.find(s => s.username === 'dragonslayer');
    assert(dragonStreamer && dragonStreamer.total_spent > 0, 'GASTO STREAMER: Streamer dragonslayer refleja gastos totales liquidados');
    assert(dragonStreamer && Array.isArray(dragonStreamer.servers) && dragonStreamer.servers.length > 0, 'GASTO STREAMER: Detalla los servidores donde participó el streamer');
    assert(dragonStreamer && Array.isArray(dragonStreamer.payment_details), 'GASTO STREAMER: Incluye comprobantes y recibos individuales de pago');

    // 18.4 Comprobar desglose exacto por Servidor
    const multiServerExpense = adminReportAll.data.servers.find(s => s.server_id === multiServerId);
    assert(multiServerExpense && multiServerExpense.streamers_expense === 200.00, 'GASTO SERVIDOR: Servidor Omniverse desglosa $200.00 USD en streamers');
    assert(multiServerExpense && multiServerExpense.total_income === 3000.00, 'GASTO SERVIDOR: Servidor Omniverse desglosa $3,000.00 USD en ingresos');
    assert(multiServerExpense && multiServerExpense.net_profit === 2800.00, 'GASTO SERVIDOR: Servidor Omniverse calcula ganancia neta exacta ($2,800.00 USD)');
    assert(multiServerExpense && multiServerExpense.assigned_pms.length > 0, 'GASTO SERVIDOR: Servidor detalla PMs asignados a cargo');

    // 18.5 Consulta de informe por Corte Quincenal (cutoff=q2_current)
    const q2Report = await makeRequest('GET', '/api/financials/expense-report?cutoff=q2_current', null, adminToken);
    assert(q2Report.status === 200, 'INFORME QUINCENAL: Consulta exitosa de 2ª Quincena del mes actual (200 OK)');
    assert(q2Report.data.period && q2Report.data.period.cutoff === 'q2_current', 'INFORME QUINCENAL: Periodo identificado con etiqueta quincenal');
    assert(q2Report.data.period.startDate && q2Report.data.period.endDate, 'INFORME QUINCENAL: Fechas automáticas del corte generadas (16 al fin de mes)');

    // 18.6 Consulta de informe con Rango por Fechas Personalizado (cutoff=custom)
    const customReport = await makeRequest('GET', '/api/financials/expense-report?cutoff=custom&startDate=2026-11-01&endDate=2026-11-30', null, adminToken);
    assert(customReport.status === 200, 'INFORME POR FECHAS: Consulta exitosa con rango personalizado de fechas (200 OK)');
    assert(customReport.data.period.startDate === '2026-11-01' && customReport.data.period.endDate === '2026-11-30', 'INFORME POR FECHAS: Fechas personalizadas aplicadas correctamente');
    assert(customReport.data.summary.total_expenses > 0, 'INFORME POR FECHAS: Consolida gastos ocurridos en el rango de fechas');

    // 18.7 Consulta filtrada por servidor específico
    const filteredServerReport = await makeRequest('GET', `/api/financials/expense-report?cutoff=all&serverId=${multiServerId}`, null, adminToken);
    assert(filteredServerReport.status === 200, 'FILTRO SERVIDOR: Consulta de gastos acotada a servidor específico (200 OK)');
    assert(filteredServerReport.data.servers.length === 1 && filteredServerReport.data.servers[0].server_id === multiServerId, 'FILTRO SERVIDOR: Responde únicamente con el servidor filtrado');

    // 19. CAMPAÑAS DIFERENCIADAS POR PM Y ASIGNACIÓN DE 1 O 2+ PMS A CARGO
    console.log('\n--- 19. Campañas Diferenciadas por PM: Asignación de 1 o Múltiples PMs por Campaña ---');

    // 19.1 Super Admin crea un tercer PM (Marcos) para tener 3 PMs en el servidor
    const createPmMarcosRes = await makeRequest('POST', '/api/users', {
      username: 'pm.marcos',
      email: 'pm.marcos@pmforgex.com',
      password: 'PMForgeX2026!Marcos',
      full_name: 'Marcos PM',
      role: 'pm',
      phone: '+34699887766'
    }, adminToken);
    assert(createPmMarcosRes.status === 201, 'MULTI-PM: Super Admin crea 3er PM (Marcos) exitosamente (201 Created)');
    const pmMarcosId = createPmMarcosRes.data.id;

    // Login 2FA para Marcos
    const marcosLogin = await doFullLogin('pm.marcos', 'PMForgeX2026!Marcos');
    assert(marcosLogin.status === 200 && marcosLogin.data.token, 'AUTENTICACIÓN: Login y token JWT emitido para 3er PM Marcos');
    const pmMarcosToken = marcosLogin.data.token;

    // 19.2 Super Admin crea un Servidor con 3 PMs (Carlos: 5, Elena: 6, Marcos: pmMarcosId)
    const server3PmsRes = await makeRequest('POST', '/api/servers', {
      name: 'Metin2 Fortress Trio PMs',
      game: 'Metin2',
      budget: 6000.00,
      pm_ids: [5, 6, pmMarcosId],
      notes: 'Servidor con 3 PMs asignados que gestionan campañas independientes.'
    }, adminToken);
    assert(server3PmsRes.status === 201, 'SERVIDOR MULTI-PM: Creación de servidor con 3 PMs asignados oficialmente (201 Created)');
    const fortressServerId = server3PmsRes.data.id;

    // 19.3 Campaña 1: Asignada a 1 solo PM (Carlos id: 5)
    const campCarlosRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Fortress - Campaña Exclusiva Carlos',
      server_id: fortressServerId,
      budget_internal: 1500.00,
      pm_ids: [5],
      objective: 'Campaña gestionada únicamente por Carlos'
    }, adminToken);
    assert(campCarlosRes.status === 201, 'CAMPAÑA 1 PM: Campaña creada con 1 solo PM asignado (Carlos)');
    const campCarlosId = campCarlosRes.data.id;

    // 19.4 Campaña 2: Asignada a 2 PMs en co-gestión (Elena id: 6 y Marcos: pmMarcosId)
    const campDuoRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Fortress - Campaña Co-gestión Elena y Marcos',
      server_id: fortressServerId,
      budget_internal: 2000.00,
      pm_ids: [6, pmMarcosId],
      objective: 'Campaña co-gestionada por 2 PMs (Elena y Marcos)'
    }, adminToken);
    assert(campDuoRes.status === 201, 'CAMPAÑA 2 PMS: Campaña creada con 2 PMs a cargo (Elena y Marcos)');
    const campDuoId = campDuoRes.data.id;

    // 19.5 Comprobación de integridad de assigned_pms y pm_ids en GET /api/campaigns (Admin)
    const adminCampaignsList = await makeRequest('GET', '/api/campaigns', null, adminToken);
    const fetchedCampCarlos = adminCampaignsList.data.find(c => c.id === campCarlosId);
    const fetchedCampDuo = adminCampaignsList.data.find(c => c.id === campDuoId);

    assert(fetchedCampCarlos && fetchedCampCarlos.pm_ids.includes(5) && fetchedCampCarlos.assigned_pms.length === 1, 'INTEGRIDAD CAMPAÑA: Campaña 1 refleja 1 PM a cargo con sus datos');
    assert(fetchedCampDuo && fetchedCampDuo.pm_ids.includes(6) && fetchedCampDuo.pm_ids.includes(pmMarcosId) && fetchedCampDuo.assigned_pms.length === 2, 'INTEGRIDAD CAMPAÑA: Campaña 2 refleja los 2 PMs asignados a cargo');

    // 19.6 Aislamiento de Campañas: Carlos SOLO debe ver su campaña, NO la de Elena y Marcos
    const carlosCampaigns = await makeRequest('GET', '/api/campaigns', null, pmToken);
    const carlosCanSeeCamp1 = carlosCampaigns.data.some(c => c.id === campCarlosId);
    const carlosCanSeeCamp2 = carlosCampaigns.data.some(c => c.id === campDuoId);
    assert(carlosCanSeeCamp1, 'AISLAMIENTO PM: PM Carlos ve su campaña asignada (Campaña 1)');
    assert(!carlosCanSeeCamp2, 'AISLAMIENTO PM: PM Carlos NO ve la campaña de Elena y Marcos en el mismo servidor');

    // 19.7 Aislamiento de Campañas: Elena y Marcos ven Campaña 2, pero NO la de Carlos
    const elenaCampaigns = await makeRequest('GET', '/api/campaigns', null, pmElenaToken);
    const elenaCanSeeCamp1 = elenaCampaigns.data.some(c => c.id === campCarlosId);
    const elenaCanSeeCamp2 = elenaCampaigns.data.some(c => c.id === campDuoId);
    assert(!elenaCanSeeCamp1, 'AISLAMIENTO PM: PM Elena NO ve la campaña exclusiva de Carlos');
    assert(elenaCanSeeCamp2, 'AISLAMIENTO PM: PM Elena ve la campaña co-asignada a ella y a Marcos');

    const marcosCampaigns = await makeRequest('GET', '/api/campaigns', null, pmMarcosToken);
    const marcosCanSeeCamp1 = marcosCampaigns.data.some(c => c.id === campCarlosId);
    const marcosCanSeeCamp2 = marcosCampaigns.data.some(c => c.id === campDuoId);
    assert(!marcosCanSeeCamp1, 'AISLAMIENTO PM: PM Marcos NO ve la campaña exclusiva de Carlos');
    assert(marcosCanSeeCamp2, 'AISLAMIENTO PM: PM Marcos ve la campaña co-asignada');

    // 19.8 Seguridad y RBAC: PM Carlos intenta editar la campaña de Elena y Marcos -> 403 Forbidden
    const unauthEditCamp = await makeRequest('PUT', `/api/campaigns/${campDuoId}`, {
      objective: 'Intento malicioso de modificar campaña ajena'
    }, pmToken);
    assert(unauthEditCamp.status === 403, 'SEGURIDAD CAMPAÑAS: PM Carlos rechazado con 403 al intentar editar campaña donde no está a cargo');

    // 19.9 Autorización co-PM: PM Elena y PM Marcos sí pueden editar su campaña compartida
    const authEditCamp = await makeRequest('PUT', `/api/campaigns/${campDuoId}`, {
      objective: 'Actualización coordinada por Elena'
    }, pmElenaToken);
    assert(authEditCamp.status === 200, 'AUTORIZACIÓN CO-PM: PM asignada a cargo (Elena) modifica la campaña exitosamente (200 OK)');

    // 19.10 Flujo de Evidencias y Aislamiento de Revisión entre PMs:
    // Vinculamos streamer a Campaña 2 y enviamos evidencia
    await makeRequest('POST', `/api/campaigns/${campDuoId}/creators`, {
      creator_id: 7,
      agreement_terms: 'Directo dúo'
    }, adminToken);

    const duoEvRes = await makeRequest('POST', '/api/evidences', {
      campaign_id: campDuoId,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/dragonslayer/fortress-duo',
      activity_date: '2026-11-20',
      duration_minutes: 90,
      total_views: 1200
    }, creatorToken);
    assert(duoEvRes.status === 201, 'EVIDENCIA: Streamer envía actividad para campaña con 2 PMs (201 Created)');
    const duoEvId = duoEvRes.data.id;

    // PM Carlos NO está a cargo de esta campaña -> Intento de revisión denegado con 403
    const carlosReviewAttempt = await makeRequest('PUT', `/api/evidences/${duoEvId}/review`, {
      status: 'approved',
      internal_notes: 'Carlos no debería poder revisar esto'
    }, pmToken);
    assert(carlosReviewAttempt.status === 403, 'SEGURIDAD EVIDENCIAS: PM no asignado a la campaña es rechazado con 403 al intentar revisar su evidencia');

    // PM Marcos (uno de los 2 PMs asignados) revisa y aprueba exitosamente
    const marcosReviewSuccess = await makeRequest('PUT', `/api/evidences/${duoEvId}/review`, {
      status: 'approved',
      internal_notes: 'Aprobado oficialmente por PM Marcos'
    }, pmMarcosToken);
    assert(marcosReviewSuccess.status === 200, 'AUTORIZACIÓN CO-PM EVIDENCIA: Co-PM asignado (Marcos) aprueba la entrega exitosamente (200 OK)');

    // 19.11 Reasignación / Adición de PM a Campaña: Super Admin suma a Carlos como 3er co-PM
    const reassignCampRes = await makeRequest('PUT', `/api/campaigns/${campDuoId}`, {
      pm_ids: [6, pmMarcosId, 5]
    }, adminToken);
    assert(reassignCampRes.status === 200, 'REASIGNACIÓN PMS: Super Admin actualiza la campaña sumando a Carlos como co-PM');

    // Ahora Carlos SÍ puede ver la Campaña 2
    const carlosCampaignsAfter = await makeRequest('GET', '/api/campaigns', null, pmToken);
    const carlosCanSeeCamp2Now = carlosCampaignsAfter.data.some(c => c.id === campDuoId);
    assert(carlosCanSeeCamp2Now, 'PERSISTENCIA MULTI-PM: PM Carlos ahora tiene acceso completo tras ser incorporado a la campaña');

    // 20. MULTIPLICADOR DE DIRECTOS POR STREAMER Y SEGUIMIENTO DE AVANCE INDIVIDUAL
    console.log('\n--- 20. Multiplicador de Directos por Streamer y Avance Individual de Entregas ---');

    // 20.1 Login con segunda streamer (Valquiria)
    const valquiriaLogin = await doFullLogin('valquiria', 'PMForgeX2026!Creator');
    assert(valquiriaLogin.status === 200 && valquiriaLogin.data.user.id === 8, 'LOGIN STREAMER 2: Valquiria inicia sesión con 2FA exitosamente');
    const valquiriaToken = valquiriaLogin.data.token;

    // 20.2 Crear Campaña con cuota de 3 directos por streamer y asignar a 2 streamers (DragonSlayer: 7 y Valquiria: 8)
    const multiStreamerCampRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Torneo Dúos - 3 Directos por Streamer',
      server_id: multiServerId,
      budget_internal: 800.00,
      target_evidences: 3,
      target_hours: 10.0,
      objective: 'Cada streamer debe completar 3 directos de torneo',
      creator_ids: [7, 8],
      pm_ids: [5]
    }, adminToken);
    assert(multiStreamerCampRes.status === 201, 'CREACIÓN CAMPAÑA MULTI-STREAMER: Super Admin crea campaña con 3 directos/streamer y 2 streamers');
    const multiStreamerCampId = multiStreamerCampRes.data.id;

    // 20.3 Consultar campaña y verificar cálculo de multiplicador de directos totales (3 directos × 2 streamers = 6)
    const campDetailsRes = await makeRequest('GET', '/api/campaigns', null, adminToken);
    const createdCamp = campDetailsRes.data.find(c => c.id === multiStreamerCampId);
    assert(createdCamp, 'CONSULTA CAMPAÑA: Campaña encontrada en listado de campañas');
    assert(createdCamp.target_evidences_per_creator === 3, 'OBJETIVO INDIVIDUAL: target_evidences_per_creator es exactamente 3');
    assert(createdCamp.total_target_evidences === 6, 'MULTIPLICADOR DIRECTOS TOTALES: total_target_evidences es 6 (3 directos × 2 streamers)');
    assert(Array.isArray(createdCamp.creators) && createdCamp.creators.length === 2, 'STREAMERS ASIGNADOS: 2 streamers presentes en la campaña');

    // Verificar métricas individuales iniciales de cada streamer
    const dSlayerInitial = createdCamp.creators.find(c => c.creator_user_id === 7);
    const valqInitial = createdCamp.creators.find(c => c.creator_user_id === 8);
    assert(dSlayerInitial && dSlayerInitial.approved_evidences === 0 && dSlayerInitial.status_label === 'Sin Entregas', 'AVANCE INDIVIDUAL INICIAL: DragonSlayer inicia con 0 directos y estado "Sin Entregas"');
    assert(valqInitial && valqInitial.approved_evidences === 0 && valqInitial.status_label === 'Sin Entregas', 'AVANCE INDIVIDUAL INICIAL: Valquiria inicia con 0 directos y estado "Sin Entregas"');

    // 20.4 Streamer 1 (DragonSlayer) realiza sus 3 directos
    for (let i = 1; i <= 3; i++) {
      const evRes = await makeRequest('POST', '/api/evidences', {
        campaign_id: multiStreamerCampId,
        type: 'stream',
        platform: 'Twitch',
        content_url: `https://twitch.tv/dragonslayer/torneo-duo-${i}`,
        activity_date: '2026-11-21',
        duration_minutes: 90,
        total_views: 1000 + i * 100
      }, creatorToken);
      assert(evRes.status === 201, `ENTREGA STREAMER 1: DragonSlayer envía entrega ${i} de 3`);

      // PM aprueba la entrega
      const reviewRes = await makeRequest('PUT', `/api/evidences/${evRes.data.id}/review`, {
        status: 'approved',
        internal_notes: `Directo ${i} aprobado`
      }, pmToken);
      assert(reviewRes.status === 200, `REVISIÓN PM: Entrega ${i} de DragonSlayer aprobada`);
    }

    // 20.5 Verificar avance individual tras 3 directos de DragonSlayer
    const campAfterSlayer = (await makeRequest('GET', '/api/campaigns', null, adminToken)).data.find(c => c.id === multiStreamerCampId);
    const dSlayerProgress = campAfterSlayer.creators.find(c => c.creator_user_id === 7);
    assert(dSlayerProgress.approved_evidences === 3, 'AVANCE INDIVIDUAL STREAMER 1: Registra 3 directos aprobados');
    assert(dSlayerProgress.progress_percentage === 100, 'AVANCE INDIVIDUAL STREAMER 1: Progreso alcanza el 100%');
    assert(dSlayerProgress.is_completed === true && dSlayerProgress.status_label === 'Completado', 'ESTADO INDIVIDUAL STREAMER 1: Marcado como completado');

    // 20.6 Restricción Individual: DragonSlayer intenta entregar un 4º directo (supera su cupo de 3 directos) -> 400 Bad Request
    const slayerOverLimitRes = await makeRequest('POST', '/api/evidences', {
      campaign_id: multiStreamerCampId,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/dragonslayer/torneo-duo-extra',
      activity_date: '2026-11-21',
      duration_minutes: 60,
      total_views: 500
    }, creatorToken);
    assert(slayerOverLimitRes.status === 400, 'RESTRICCIÓN INDIVIDUAL CUOTA: Intento de 4º directo de DragonSlayer es rechazado con 400 Bad Request');
    assert(slayerOverLimitRes.data.error.includes('Se ha alcanzado el límite máximo de 3'), 'MENSAJE RESTRICCIÓN INDIVIDUAL: Error indica límite de 3 directos alcanzado');

    // 20.7 Streamer 2 (Valquiria) entrega 1 directo -> Debe permitirse ya que su cuota individual está libre (0/3)
    const valqEv1Res = await makeRequest('POST', '/api/evidences', {
      campaign_id: multiStreamerCampId,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/valquiria/torneo-duo-1',
      activity_date: '2026-11-21',
      duration_minutes: 120,
      total_views: 1400
    }, valquiriaToken);
    assert(valqEv1Res.status === 201, 'ENTREGA STREAMER 2: Valquiria entrega directo 1 exitosamente (no es bloqueada por las entregas del streamer 1)');

    // PM aprueba entrega de Valquiria
    await makeRequest('PUT', `/api/evidences/${valqEv1Res.data.id}/review`, {
      status: 'approved',
      internal_notes: 'Directo 1 Valquiria aprobado'
    }, pmToken);

    // 20.8 Verificar métricas finales consolidadas de la campaña y avance individual
    const finalCampRes = (await makeRequest('GET', '/api/campaigns', null, adminToken)).data.find(c => c.id === multiStreamerCampId);
    assert(finalCampRes.total_target_evidences === 6, 'CONSOLIDADO CAMPAÑA: Objetivo total se mantiene en 6 directos');
    assert(finalCampRes.approved_evidences_count === 4, 'CONSOLIDADO CAMPAÑA: 4 directos aprobados en total (3 DragonSlayer + 1 Valquiria)');
    assert(finalCampRes.evidences_progress_percentage === 67, 'CONSOLIDADO CAMPAÑA: 67% de avance global en la campaña');

    const valqFinal = finalCampRes.creators.find(c => c.creator_user_id === 8);
    assert(valqFinal.approved_evidences === 1 && valqFinal.target_evidences === 3, 'AVANCE INDIVIDUAL STREAMER 2: Valquiria registra 1/3 directos');
    assert(valqFinal.progress_percentage === 33 && valqFinal.status_label === 'En Progreso', 'ESTADO INDIVIDUAL STREAMER 2: Valquiria en progreso con 33%');

    // 21. GESTIÓN Y RECALCULO DE FINANZAS: EDICIÓN Y ELIMINACIÓN DE PAGOS, Y BORRADO EN CASCADA
    console.log('\n--- 21. Gestión de Finanzas: Edición/Eliminación de Pagos y Borrado de Entregas, Campañas y Servidores ---');

    // 21.1 Liquidar pago de una evidencia aprobada
    const evToPayId = valqEv1Res.data.id;
    const initialPayRes = await makeRequest('POST', `/api/evidences/${evToPayId}/pay`, {
      payout_amount: 150.00,
      payment_reference: 'TRX-QA-INITIAL',
      payment_notes: 'Pago inicial directo Valquiria'
    }, adminToken);
    assert(initialPayRes.status === 200, 'PAGO INICIAL: Liquidación de entrega realizada (200 OK)');

    // Verificar que el gasto se computa en el servidor
    const finBeforeEdit = (await makeRequest('GET', `/api/financials/servers?server_id=${multiServerId}`, null, adminToken)).data.servers[0];
    const streamerExpBefore = finBeforeEdit.financials.total_streamers_expense;

    // 21.2 EDITAR PAGO DE ENTREGA (PUT /api/evidences/:id/pay)
    const editPayRes = await makeRequest('PUT', `/api/evidences/${evToPayId}/pay`, {
      payout_amount: 220.00,
      payment_reference: 'TRX-QA-EDITED',
      payment_notes: 'Pago corregido con bono extra'
    }, adminToken);
    assert(editPayRes.status === 200, 'EDICIÓN PAGO: Pago de entrega modificado exitosamente a $220.00 USD (200 OK)');
    assert(editPayRes.data.payout_amount === 220.00, 'DATOS PAGO: Monto actualizado reflejado en respuesta');

    // Verificar que el gasto del servidor aumentó en $70 ($220 - $150)
    const finAfterEdit = (await makeRequest('GET', `/api/financials/servers?server_id=${multiServerId}`, null, adminToken)).data.servers[0];
    assert(finAfterEdit.financials.total_streamers_expense === streamerExpBefore + 70.00, 'RECÁLCULO GASTO SERVIDOR: El gasto del servidor se actualiza automáticamente con el nuevo monto');

    // 21.3 ANULAR / ELIMINAR PAGO DE ENTREGA (DELETE /api/evidences/:id/pay)
    const revertPayRes = await makeRequest('DELETE', `/api/evidences/${evToPayId}/pay`, null, adminToken);
    assert(revertPayRes.status === 200, 'ANULACIÓN PAGO: Pago de entrega anulado/eliminado correctamente (200 OK)');

    // Verificar que la entrega vuelve a estado 'approved' y payout_amount es null
    const evidencesListAfterRevert = (await makeRequest('GET', '/api/evidences', null, adminToken)).data;
    const revertedEv = evidencesListAfterRevert.find(e => e.id === evToPayId);
    assert(revertedEv && revertedEv.status === 'approved' && !revertedEv.payout_amount, 'ESTADO REVERTIDO: Entrega vuelve a "approved" y no registra payout');

    // Verificar que el gasto del servidor disminuyó en los $220 anulados
    const finAfterRevert = (await makeRequest('GET', `/api/financials/servers?server_id=${multiServerId}`, null, adminToken)).data.servers[0];
    assert(finAfterRevert.financials.total_streamers_expense === streamerExpBefore - 150.00, 'DESCUENTO AUTOMÁTICO: El gasto en streamers se redujo exactamente al anular el pago');

    // 21.4 EDICIÓN DE TRANSACCIÓN FINANCIERA (PUT /api/financials/transactions/:id)
    const createTxRes = await makeRequest('POST', '/api/financials/transactions', {
      server_id: multiServerId,
      type: 'expense_pm',
      category: 'pm_fee',
      concept: 'Honorario mensual PM Test',
      amount: 400.00,
      transaction_date: '2026-11-22',
      payment_method: 'Transferencia'
    }, adminToken);
    assert(createTxRes.status === 201, 'CREAR TRANSACCIÓN: Registro financiero de prueba creado (201 Created)');
    const txId = createTxRes.data.id;

    const editTxRes = await makeRequest('PUT', `/api/financials/transactions/${txId}`, {
      amount: 480.00,
      concept: 'Honorario mensual PM Test (Actualizado)',
      transaction_date: '2026-11-22',
      payment_method: 'Transferencia'
    }, adminToken);
    assert(editTxRes.status === 200, 'EDICIÓN TRANSACCIÓN: Transacción financiera editada a $480.00 USD (200 OK)');

    // 21.5 ELIMINACIÓN DE TRANSACCIÓN FINANCIERA (DELETE /api/financials/transactions/:id)
    const deleteTxRes = await makeRequest('DELETE', `/api/financials/transactions/${txId}`, null, adminToken);
    assert(deleteTxRes.status === 200, 'ELIMINAR TRANSACCIÓN: Transacción financiera anulada y eliminada correctamente (200 OK)');

    // 21.6 ELIMINACIÓN DE ENTREGA (DELETE /api/evidences/:id) Y RECÁLCULO AUTOMÁTICO
    const deleteEvRes = await makeRequest('DELETE', `/api/evidences/${evToPayId}`, null, adminToken);
    assert(deleteEvRes.status === 200, 'ELIMINAR ENTREGA: Entrega eliminada definitivamente del sistema (200 OK)');

    const evidencesAfterDelete = (await makeRequest('GET', '/api/evidences', null, adminToken)).data;
    assert(!evidencesAfterDelete.some(e => e.id === evToPayId), 'INTEGRIDAD ENTREGA: La entrega ya no existe en el catálogo');

    // 21.7 BORRADO DE CAMPAÑA Y EXCLUSIÓN AUTOMÁTICA DE GASTOS
    const deleteCampRes = await makeRequest('DELETE', `/api/campaigns/${multiStreamerCampId}`, null, adminToken);
    assert(deleteCampRes.status === 200, 'ELIMINAR CAMPAÑA: Campaña eliminada mediante soft delete');

    // Verificar que la campaña eliminada no suma en presupuestos activos ni en gastos del servidor
    const finAfterCampDelete = (await makeRequest('GET', `/api/financials/servers?server_id=${multiServerId}`, null, adminToken)).data.servers[0];
    const campInActivePnl = finAfterCampDelete.breakdown.campaigns_pnl.some(c => c.campaign_id === multiStreamerCampId);
    assert(!campInActivePnl, 'EXCLUSIÓN CAMPAÑA BORRADA: La campaña eliminada fue excluida del balance P&L activo del servidor');

    // 21.8 BORRADO DE SERVIDOR Y SINCRONIZACIÓN EN CASCADA
    const deleteServerRes = await makeRequest('DELETE', `/api/servers/${multiServerId}`, null, adminToken);
    assert(deleteServerRes.status === 200, 'ELIMINAR SERVIDOR: Servidor eliminado por Super Admin (200 OK)');

    // Verificar que el servidor eliminado ya no aparece en el balance activo de servidores
    const allFinServers = (await makeRequest('GET', '/api/financials/servers', null, adminToken)).data.servers;
    assert(!allFinServers.some(s => s.server_id === multiServerId), 'EXCLUSIÓN SERVIDOR BORRADO: El servidor eliminado no contamina los balances activos');

    // 22. DESCUENTO AUTOMÁTICO DE PRESUPUESTO, LIQUIDACIÓN PM AL FINALIZAR Y GANANCIA POR PRESUPUESTO NO USADO
    console.log('\n--- 22. Descuento Automático de Presupuesto, Liquidación de PM al Concluir y Ganancia por Presupuesto No Usado ---');

    // 22.1 Crear servidor con presupuesto de $3000 USD
    const srvAutoBudgetRes = await makeRequest('POST', '/api/servers', {
      name: 'Chronicles of Metin (Presupuesto QA)',
      game: 'Metin2',
      budget: 3000.00,
      pm_user_id: 2, // PM Carlos
      owner_user_id: 6
    }, adminToken);
    assert(srvAutoBudgetRes.status === 201, 'CREAR SERVIDOR: Servidor creado con presupuesto de $3,000 USD (201 Created)');
    const autoServerId = srvAutoBudgetRes.data.id;

    // 22.2 Crear campaña con presupuesto de $1,200 USD y honorario de PM de $200 USD
    const campAutoRes = await makeRequest('POST', '/api/campaigns', {
      name: 'Campaña Lanzamiento Alfa',
      server_id: autoServerId,
      budget_internal: 1200.00,
      pm_fee: 200.00,
      target_evidences: 2,
      creator_ids: [7], // DragonSlayer
      pm_ids: [2],
      status: 'active'
    }, adminToken);
    assert(campAutoRes.status === 201, 'CREAR CAMPAÑA: Campaña creada con presupuesto $1,200 y honorario PM $200');
    const autoCampId = campAutoRes.data.id;

    // 22.3 Verificar que el presupuesto del servidor se descuenta automáticamente para nuevas campañas
    const finSrv1 = (await makeRequest('GET', `/api/financials/servers?server_id=${autoServerId}`, null, adminToken)).data.servers[0];
    assert(finSrv1.campaigns_summary.total_budget === 1200.00, 'PRESUPUESTO ASIGNADO: $1,200 USD asignados a la campaña');
    assert(finSrv1.campaigns_summary.remaining_budget_for_campaigns === 1800.00, 'DESCUENTO EN SERVIDOR: Presupuesto restante libre del servidor es exactamente $1,800 USD ($3,000 - $1,200)');

    // 22.4 Streamer realiza entregas y se liquidan ($250 + $250 = $500)
    const d1Res = await makeRequest('POST', '/api/evidences', {
      campaign_id: autoCampId,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/dragonslayer/v/qa-delivery-1',
      activity_date: '2026-11-22',
      duration_minutes: 120
    }, creatorToken);
    assert(d1Res.status === 201, 'ENTREGA 1: Streamer registra primer directo');

    await makeRequest('PUT', `/api/evidences/${d1Res.data.id}/review`, { status: 'approved' }, pmToken);
    await makeRequest('POST', `/api/evidences/${d1Res.data.id}/pay`, {
      payout_amount: 250.00,
      payment_reference: 'TRX-QA-D1',
      payment_notes: 'Liquidación directa 1'
    }, adminToken);

    const d2Res = await makeRequest('POST', '/api/evidences', {
      campaign_id: autoCampId,
      type: 'stream',
      platform: 'Twitch',
      content_url: 'https://twitch.tv/dragonslayer/v/qa-delivery-2',
      activity_date: '2026-11-23',
      duration_minutes: 120
    }, creatorToken);
    assert(d2Res.status === 201, 'ENTREGA 2: Streamer registra segundo directo');

    await makeRequest('PUT', `/api/evidences/${d2Res.data.id}/review`, { status: 'approved' }, pmToken);
    await makeRequest('POST', `/api/evidences/${d2Res.data.id}/pay`, {
      payout_amount: 250.00,
      payment_reference: 'TRX-QA-D2',
      payment_notes: 'Liquidación directa 2'
    }, adminToken);

    // 22.5 Verificar recálculo dinámico a medida que se entregan directos (en campaña activa)
    const campActiveList = (await makeRequest('GET', '/api/campaigns', null, adminToken)).data;
    const campActive = campActiveList.find(c => c.id === autoCampId);
    assert(campActive.financials.paid_streamers_expense === 500.00, 'DESCUENTO EN CAMPAÑA: $500 USD descontados automáticamente por directos entregados');
    assert(campActive.financials.unused_budget === 700.00, 'PRESUPUESTO NO USADO ACTUAL: $700 USD libres ($1,200 - $500)');
    assert(campActive.financials.projected_net_profit === 500.00, 'PROYECCIÓN FINAL: $500 USD netos proyectados contemplando el honorario del PM ($200)');

    // 22.6 Finalizar la campaña: el pago del PM se descuenta automáticamente del presupuesto final
    const completeCampRes = await makeRequest('PUT', `/api/campaigns/${autoCampId}`, {
      status: 'completed'
    }, adminToken);
    assert(completeCampRes.status === 200, 'FINALIZAR CAMPAÑA: Campaña concluida exitosamente (200 OK)');

    // 22.7 Verificar que el honorario del PM se liquidó automáticamente en transacciones financieras
    const srvReportRes = (await makeRequest('GET', `/api/financials/servers?server_id=${autoServerId}`, null, adminToken)).data.servers[0];
    const pmTx = srvReportRes.breakdown.pm_expenses.find(t => t.concept.includes('Honorario Cierre Campaña: Campaña Lanzamiento Alfa'));
    assert(pmTx && pmTx.amount === 200.00, 'LIQUIDACIÓN AUTOMÁTICA PM: Honorario de $200 USD generado para el PM de la campaña');

    // 22.8 Verificar que el total no usado del presupuesto se refleja exactamente como ganancia total
    const campCompletedList = (await makeRequest('GET', '/api/campaigns', null, adminToken)).data;
    const campCompleted = campCompletedList.find(c => c.id === autoCampId);
    assert(campCompleted.financials.paid_streamers_expense === 500.00, 'GASTO FINAL STREAMERS: $500 USD liquidados');
    assert(campCompleted.financials.paid_pm_expense === 200.00, 'GASTO FINAL PM: $200 USD liquidados por fin de campaña');
    assert(campCompleted.financials.total_spent === 700.00, 'TOTAL CONSUMIDO: $700 USD consumidos del presupuesto');
    assert(campCompleted.financials.unused_budget === 500.00, 'PRESUPUESTO NO USADO: $500 USD de remanente no utilizado');
    assert(campCompleted.financials.net_profit === 500.00, 'GANANCIA TOTAL REFLEJADA: La ganancia total es exactamente el presupuesto no usado ($500 USD)');
    assert(campCompleted.financials.profit_margin_percentage === 41.7, 'MARGEN FINAL: 41.7% de margen neto de ganancia');

    // 22.9 Verificar balance del servidor consolidado
    const finSrvFinal = (await makeRequest('GET', `/api/financials/servers?server_id=${autoServerId}`, null, adminToken)).data.servers[0];
    assert(finSrvFinal.campaigns_summary.total_spent === 700.00, 'BALANCE SERVIDOR: $700 USD consumidos en total en campañas');
    assert(finSrvFinal.campaigns_summary.unused_budget === 500.00, 'BALANCE SERVIDOR: $500 USD de presupuesto de campaña no utilizado');
    assert(finSrvFinal.campaigns_summary.total_net_profit === 500.00, 'BALANCE SERVIDOR: $500 USD de ganancia total neta generada');

    // 22.10 Verificar cálculo de eficiencia sobre presupuesto en el informe de cortes
    const cutoffSrvRes = (await makeRequest('GET', `/api/financials/cutoff-report?server_id=${autoServerId}`, null, adminToken)).data;
    const srvCutoffData = cutoffSrvRes.servers.find(s => s.server_id === autoServerId);
    assert(srvCutoffData, 'INFORME DE CORTES: Servidor listado en el reporte');
    assert(srvCutoffData.is_profitable === true, 'ESTADO EFICIENCIA: El servidor es rentable y eficiente al operar por debajo del presupuesto');
    assert(srvCutoffData.status_label === 'EFICIENTE', 'ETIQUETA EFICIENTE: El estado del servidor es EFICIENTE (no DÉFICIT)');
    assert(srvCutoffData.net_profit === 2300.00, 'REMANENTE NETO CALCULADO: Ganancia / remanente neto de $2,300.00 USD ($3,000 presupuesto - $700 gastos)');
    assert(srvCutoffData.profit_margin_percentage === 76.7, 'MARGEN DE EFICIENCIA: 76.7% de eficiencia sobre el presupuesto');

    console.log('\n--- 23. Módulo de Pagos a PMs: Estado de Campañas, Servidores y Liquidaciones Directas ---');
    
    // 23.1 RBAC: Creador tiene prohibido acceder a /api/financials/pms-summary
    const creatorPmSummaryRes = await makeRequest('GET', '/api/financials/pms-summary', null, creatorToken);
    assert(creatorPmSummaryRes.status === 403, 'RBAC: Creador tiene prohibido acceder al resumen de pagos a PMs (403)');

    // 23.2 Consulta de resumen consolidado de PMs por Super Admin
    const pmsSummaryRes = await makeRequest('GET', '/api/financials/pms-summary', null, adminToken);
    assert(pmsSummaryRes.status === 200, 'GET /api/financials/pms-summary responde 200 OK');
    assert(pmsSummaryRes.data.summary && pmsSummaryRes.data.pms, 'ESTRUCTURA PMs: Retorna objeto con summary global y lista de pms');
    assert(Array.isArray(pmsSummaryRes.data.pms) && pmsSummaryRes.data.pms.length > 0, 'LISTA PMs: Retorna al menos 1 PM activo');

    const targetPmData = pmsSummaryRes.data.pms.find(p => p.username === 'pm.carlos') || pmsSummaryRes.data.pms[0];
    assert(targetPmData, 'PM IDENTIFICADO: Promoter Manager encontrado en el listado');
    assert(Array.isArray(targetPmData.servers), 'SERVIDORES PM: Lista de servidores asignados al PM disponible');
    assert(Array.isArray(targetPmData.campaigns), 'CAMPAÑAS PM: Lista de campañas asignadas al PM disponible');
    assert(Array.isArray(targetPmData.payments), 'PAGOS PM: Historial de transacciones del PM disponible');
    assert(targetPmData.metrics.status_label, 'ESTADO PM: Etiqueta de estado financiero asignada (AL DÍA / PENDIENTE)');

    // Si tiene servidores asignados, verificar campos requeridos
    if (targetPmData.servers.length > 0) {
      const srv0 = targetPmData.servers[0];
      assert(srv0.id && srv0.name && srv0.status, 'DETALLE SERVIDOR: Contiene ID, nombre y estado del servidor');
      assert(typeof srv0.budget === 'number' && typeof srv0.budget_remaining === 'number', 'PRESUPUESTO SERVIDOR: Valores numéricos de presupuesto y remanente');
    }

    // 23.3 Validación de campos obligatorios en POST /api/financials/pm-payout
    const invalidPayoutRes = await makeRequest('POST', '/api/financials/pm-payout', {
      pm_id: targetPmData.pm_id,
      amount: -50
    }, adminToken);
    assert(invalidPayoutRes.status === 400, 'VALIDACIÓN PAGO PM: Rechaza pago sin servidor o con monto negativo (400)');

    // 23.4 Ejecutar liquidación directa de honorario a PM
    const targetCamp = targetPmData.campaigns.length > 0 ? targetPmData.campaigns[0] : null;
    const targetServerIdForPay = targetCamp ? targetCamp.server_id : (targetPmData.servers.length > 0 ? targetPmData.servers[0].id : autoServerId);
    const initialPaidTotal = targetPmData.metrics.total_paid;
    
    const payoutPayload = {
      pm_id: targetPmData.pm_id,
      server_id: targetServerIdForPay,
      campaign_id: targetCamp ? targetCamp.id : null,
      amount: 150.00,
      concept: 'Liquidación de Honorario por Supervisión de Servidor QA',
      payment_method: 'Transferencia',
      payment_reference: 'TRANS-PM-TEST-9988',
      transaction_date: new Date().toISOString().split('T')[0],
      notes: 'Pago de prueba unitaria QA verificado'
    };

    const payoutExecRes = await makeRequest('POST', '/api/financials/pm-payout', payoutPayload, adminToken);
    assert(payoutExecRes.status === 201, 'REGISTRAR PAGO A PM: Pago procesado exitosamente (201 Created)');
    assert(payoutExecRes.data.transaction_id, 'TRANSACCIÓN CREADA: Retorna ID de transacción financiera generada');
    assert(payoutExecRes.data.transaction.amount === 150.00, 'MONTO REGISTRADO: Monto de $150.00 USD registrado correctamente');

    // 23.5 Verificar actualización inmediata en el resumen del PM
    const updatedSummaryRes = await makeRequest('GET', `/api/financials/pms-summary?pm_id=${targetPmData.pm_id}`, null, adminToken);
    const updatedPmData = updatedSummaryRes.data.pms[0];
    assert(updatedPmData.metrics.total_paid === initialPaidTotal + 150.00, 'ACTUALIZACIÓN PAGOS: Métrica de total_paid del PM incrementada exactamente en $150.00 USD');
    
    const foundPaymentTx = updatedPmData.payments.find(p => p.id === payoutExecRes.data.transaction_id);
    assert(foundPaymentTx, 'HISTORIAL PAGOS: Transacción aparece inmediatamente en el historial del PM');
    assert(foundPaymentTx.payment_reference === 'TRANS-PM-TEST-9988', 'REFERENCIA PAGO: Código de referencia registrado correctamente');

    // 23.6 Limpieza de la transacción de prueba para mantener balances
    const deletePmPayTxRes = await makeRequest('DELETE', `/api/financials/transactions/${payoutExecRes.data.transaction_id}`, null, adminToken);
    assert(deletePmPayTxRes.status === 200, 'ANULAR PAGO: Transacción de prueba anulada y eliminada correctamente');

  } catch (err) {
    console.error('Error durante ejecución de pruebas:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log(`📊 RESULTADOS QA: ${passed} pruebas exitosas, ${failed} pruebas fallidas.`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 Todas las pruebas de backend, seguridad y flujos RBAC pasaron al 100%.\n');
  }
}

runTests();
