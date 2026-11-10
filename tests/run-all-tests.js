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
