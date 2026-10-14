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

    // 2. AUTHENTICATION & SESSIONS
    console.log('\n--- 2. Pruebas de Autenticación & Control de Sesiones ---');
    const badLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@pmforgex.com',
      password: 'wrongpassword'
    });
    assert(badLogin.status === 401, 'Login con contraseña inválida es rechazado con 401');

    // Login for all roles
    const adminLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@pmforgex.com',
      password: 'PMForgeX2026!Admin'
    });
    assert(adminLogin.status === 200 && adminLogin.data.token && adminLogin.data.user.role === 'super_admin', 'Login Super Admin exitoso con rol correcto');
    const adminToken = adminLogin.data.token;

    const pmLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'pm.carlos@pmforgex.com',
      password: 'PMForgeX2026!PM1'
    });
    assert(pmLogin.status === 200 && pmLogin.data.user.role === 'pm', 'Login PM Carlos exitoso');
    const pmToken = pmLogin.data.token;

    const creatorLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'creador.dragonslayer@pmforgex.com',
      password: 'PMForgeX2026!Creator'
    });
    assert(creatorLogin.status === 200 && creatorLogin.data.user.role === 'creator', 'Login Creador DragonSlayer exitoso');
    const creatorToken = creatorLogin.data.token;

    const ownerLogin = await makeRequest('POST', '/api/auth/login', {
      email: 'owner.metinclassic@pmforgex.com',
      password: 'PMForgeX2026!Owner'
    });
    assert(ownerLogin.status === 200 && ownerLogin.data.user.role === 'server_owner', 'Login Server Owner Roberto exitoso');
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
    const createTempUser = await makeRequest('POST', '/api/users', {
      email: testEmail,
      password: 'Password123!',
      full_name: 'Usuario Temporal',
      role: 'creator'
    }, adminToken);
    const tempId = createTempUser.data.id;
    assert(createTempUser.status === 201, 'Usuario temporal creado');

    const softDeleteRes = await makeRequest('DELETE', `/api/users/${tempId}`, null, adminToken);
    assert(softDeleteRes.status === 200, 'Usuario temporal dado de baja mediante soft delete');

    const tempLogin = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: 'Password123!'
    });
    assert(tempLogin.status === 401, 'Usuario dado de baja no puede iniciar sesión');

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
