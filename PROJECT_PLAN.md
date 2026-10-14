# PMForgeX (Versión 1.0) - Plan Maestro de Proyecto & Matriz RBAC

> **Documento de Auditoría, Planificación y Matriz de Permisos**  
> **Rol:** Lead Full-Stack Developer & QA Engineer  
> **Fecha:** 7 de Septiembre de 2026  
> **Estado:** Fase 1 completada (Auditoría & Plan de Trabajo) - Pendiente de aprobación para Fase 2

---

## 1. Auditoría del Repositorio y Entorno Actual

### 1.1 Hallazgos del Diagnóstico Inicial
1. **Código Fuente Previo:** 
   - No se encontró un repositorio o código base previo en el espacio de trabajo local ni en el sistema del usuario.
   - Toda la arquitectura, componentes y servicios se diseñarán y construirán desde una base limpia y moderna siguiendo estrictamente la especificación funcional v1.0.
2. **Especificación Funcional Identificada:**
   - Se localizó e inspeccionó el documento oficial `PMForgeX_Requisitos_Generales.docx` en `Downloads`, el cual cuenta con 32 secciones detalladas que definen la operativa completa del negocio.
3. **Activos de Marca y Diseño Encontrados:**
   - Se recuperaron y migraron a la carpeta del proyecto (`scratch/pmforgex/assets/`):
     - `formato principal.jpg`: Logotipo principal corporativo.
     - `formato horizontal.jpg`: Versión horizontal para cabeceras y navbar.
     - `formato isotipo.jpg`: Isotipo e icono para favicon y avatar.
     - `diseño1.png` a `diseño6.jpg`: Piezas y referencias visuales de la identidad PMForgeX.
4. **Entorno Tecnológico del Host:**
   - Sistema Operativo: Windows 64-bit.
   - Gestor de paquetes `winget` operativo.
   - Herramientas a aprovisionar para ejecución y despliegue: Node.js (LTS v24), npm, TypeScript, Vite/React, Tailwind CSS, SQLite/Prisma y suite de testing Vitest.

---

## 2. Estado de Módulos (Existentes vs. Pendientes / A Desarrollar)

| Módulo | Estado Actual | Componentes a Implementar |
| :--- | :--- | :--- |
| **Página Pública & Landing** | ⏳ Pendiente | Hero con identidad PMForgeX, Servicios, Ecosistemas (Metin2 + escalable), Cómo funciona, Contacto comercial y botón discreto de Acceso. |
| **Catálogo Público de Creadores** | ⏳ Pendiente | Grid interactivo con filtros por juego, plataforma y disponibilidad. Visualización exclusiva de datos públicos (nombre, avatar, redes, bio) sin exponer métricas confidenciales. |
| **Sistema de Autenticación & Sesión** | ⏳ Pendiente | Login privado sin registro abierto, hash seguro de contraseñas, validación de estado activo/suspendido, redirección dinámica por rol, cierre de sesión seguro. |
| **Control de Acceso RBAC Granular** | ⏳ Pendiente | Middleware de seguridad por rol y por pertenencia de recursos (ownership), bloqueo en backend e interfaz adaptativa. |
| **Dashboard Super Admin** | ⏳ Pendiente | KPIs globales, alertas de asignación (servidores sin PM, creadores sin servidor), gestión integral de usuarios (CRUD + suspensión + protección de Super Admin), gestión de servidores, asignaciones y logs. |
| **Dashboard Director Operacional** | ⏳ Pendiente | Supervisión operativa, vista de servidores activos, incidencias y reportes consolidados sin control de configuración global. |
| **Dashboard Director de PMs** | ⏳ Pendiente | Monitoreo del equipo de PMs, servidores a su cargo, seguimiento de actividades y cumplimiento. |
| **Dashboard Director de Creadores** | ⏳ Pendiente | Directorio integral de creadores, seguimiento de métricas agregadas, revisión de entregas y estado de creadores. |
| **Dashboard PM (Promoter Manager)** | ⏳ Pendiente | Gestión exclusiva de servidores y creadores asignados, creación/seguimiento de campañas, revisión y aprobación de evidencias con notas internas. |
| **Dashboard Creador / Streamer** | ⏳ Pendiente | Perfil público/privado, campañas asignadas, formulario de registro de transmisiones/videos (horas, enlaces, métricas, evidencias) y seguimiento del estado (Pendiente, En revisión, Aprobada, Rechazada). |
| **Dashboard Dueño de Servidor** | ⏳ Pendiente | Vista limpia de su servidor, PM asignado, creadores participantes, campañas activas, métricas de rendimiento y evidencias aprobadas. Sin acceso a datos de otros servidores ni costos internos. |
| **Módulo de Servidores & Relaciones** | ⏳ Pendiente | Registro de servidores, vinculación Servidor-Dueño, asignación Servidor-PM y Servidor-Creador. Integridad referencial con eliminación lógica (Soft Delete). |
| **Módulo de Campañas** | ⏳ Pendiente | Ciclo de vida de campañas (planificada, activa, completada, pausada), asignación de creadores, metas y seguimiento de entregables. |
| **Módulo de Registro de Métricas y Evidencias** | ⏳ Pendiente | Captura de fecha, plataforma, URL de directo/video, horas, media/pico de viewers, screenshots/evidencias, comentarios y flujo de aprobación por el PM. |
| **Logs de Auditoría y Notificaciones** | ⏳ Pendiente | Registro histórico de cambios sensibles (creación/suspensión de usuarios, cambios de estado en campañas y revisiones) y sistema de avisos para usuarios. |

---

## 3. Matriz de Permisos RBAC (Secciones 6, 7, 11, 12 y 13)

La plataforma implementa un control de acceso estricto en tres capas: **Autenticación**, **Rol en Ruta/API (RBAC)** y **Alcance por Pertenencia (Ownership / Resource-Level Access Control)**.

| Acción / Recurso | Super Admin | Dir. Operacional | Dir. PMs | Dir. Creadores | PM (Promoter Manager) | Creador / Streamer | Dueño de Servidor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Acceso a Web Pública & Catálogo** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Crear / Suspender / Reactivar Usuarios** | ✅ Total | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Eliminar Usuarios (Soft Delete protegido)** | ✅ Protegido | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Asignar Roles a Usuarios** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Crear / Editar / Suspender Servidores** | ✅ | ✅ Supervisa | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Asignar PMs y Dueños a Servidores** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Asignar Creadores a Servidores/Campañas** | ✅ | ✅ | ✅ | ✅ | ✅ (Sus asignados) | ❌ | ❌ |
| **Ver Métricas Globales de la Agencia** | ✅ Total | ✅ Autorizadas | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Ver Servidores y Campañas Asignadas** | ✅ Todos | ✅ Todos | ✅ De sus PMs | ❌ | ✅ Solo Asignados | ❌ | ✅ Solo Su Servidor |
| **Crear / Gestionar Campañas** | ✅ | ✅ | ❌ | ❌ | ✅ (Sus servidores) | ❌ | ❌ |
| **Registrar Actividad / Evidencias / Métricas** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Solo Propias | ❌ |
| **Aprobar / Rechazar Evidencias** | ✅ | ❌ | ❌ | ❌ | ✅ (Sus campañas) | ❌ | ❌ |
| **Añadir Notas Internas / Incidencias** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver Resultados Comerciales del Servidor** | ✅ | ✅ | ❌ | ❌ | ✅ (Sus servidores) | ❌ | ✅ Solo Su Servidor |
| **Ver Datos Confidenciales (Precios, Pagos, Margen)**| ✅ | ❌ (Salvo auth) | ❌ | ❌ | ❌ | ❌ (Solo lo propio) | ❌ |
| **Ver Logs de Auditoría del Sistema** | ✅ Total | ✅ Operativos | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Configuraciones Generales de la Agencia** | ✅ Exclusivo | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Política de Segregación de Datos (Pública vs. Privada - Sección 18)

| Dato / Atributo | Exposición Pública (Web/Catálogo) | Exposición Privada (Super Admin) | Exposición a PM Asignado | Exposición a Server Owner | Exposición a Creador |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Alias / Nombre Artístico** | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| **Avatar / Foto de Perfil** | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| **Redes Sociales & Enlaces** | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| **Juegos & Especialidad** | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| **Disponibilidad para Campañas**| ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Editable |
| **Tarifas / Precios por Hora/Video** | 🚫 **Oculto** | ✅ Visible | 🚫 **Oculto** | 🚫 **Oculto** | ✅ Solo Propio |
| **Pagos y Comisiones Internas** | 🚫 **Oculto** | ✅ Visible | 🚫 **Oculto** | 🚫 **Oculto** | 🚫 **Oculto** |
| **Métricas Internas & Conversión** | 🚫 **Oculto** | ✅ Visible | ✅ Agregado asignado | ✅ Métricas su servidor | 🚫 Solo de su contenido |
| **Información de Otros Clientes** | 🚫 **Oculto** | ✅ Visible | 🚫 **Oculto** | 🚫 **Oculto** | 🚫 **Oculto** |

---

## 5. Arquitectura Técnica y Modelo de Datos

### 5.1 Stack Seleccionado
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + React Router.
- **Backend / API:** Node.js + Express / Fastify modular con TypeScript.
- **Base de Datos:** SQLite con Better-SQLite3 / Prisma ORM:
  - Soporte ACID local de alto rendimiento y cero configuración externa requerida.
  - Integridad referencial habilitada con Foreign Keys y Soft Deletes (`deleted_at IS NULL`).
- **Seguridad:**
  - Cifrado seguro de contraseñas con `bcryptjs`.
  - Tokens de sesión JWT con expiración, firma con secreto de entorno y blacklist para logout.
  - Validación de esquemas en todas las peticiones con `Zod`.
  - Rate limiting y sanitización contra inyecciones y XSS.
- **Suite de Pruebas:** Vitest + React Testing Library + Supertest para cobertura unitaria e integración de los flujos críticos.

### 5.2 Esquema Entidad-Relación (Relaciones Sección 15)
1. `User` (id, email, password_hash, full_name, role, status [active|suspended], phone, notes, created_at, updated_at, deleted_at)
2. `CreatorProfile` (id, user_id, alias, avatar_url, bio, games [json], platforms [json], social_links [json], is_available, hourly_rate_internal, fixed_rate_internal)
3. `Server` (id, name, game, status [active|paused|suspended], contact_info, owner_user_id, pm_user_id, logo_url, notes, created_at, updated_at, deleted_at)
4. `ServerCreator` (id, server_id, creator_id, assigned_at, status)
5. `Campaign` (id, name, server_id, pm_user_id, status [draft|active|paused|completed], start_date, end_date, objective, budget_internal, notes, created_at, updated_at, deleted_at)
6. `CampaignCreator` (id, campaign_id, creator_id, agreement_terms, payout_internal, assigned_at)
7. `ActivityEvidence` (id, campaign_id, creator_id, type [stream|video|post], platform, content_url, date, duration_minutes, avg_viewers, peak_viewers, total_views, evidence_files [json], comments, status [pending|review|approved|rejected], rejection_reason, reviewed_by_user_id, reviewed_at, created_at, updated_at)
8. `AuditLog` (id, user_id, action, entity, entity_id, details [json], ip_address, created_at)
9. `Notification` (id, user_id, title, message, type [info|warning|success|danger], is_read, link_url, created_at)

---

## 6. Plan de Ejecución Paso a Paso

### Fase 1: Arquitectura Base y Preparación del Entorno
- [x] Extracción y análisis de requisitos desde `PMForgeX_Requisitos_Generales.docx`.
- [x] Respaldo de recursos visuales y logotipos de PMForgeX en `assets/`.
- [x] Generación del plan maestro `PROJECT_PLAN.md` y matriz de permisos.
- [ ] Aprovisionamiento de Node.js en el sistema anfitrión e inicialización de la estructura del proyecto en `scratch/pmforgex`.
- [ ] Implementación de la base de datos con migraciones, modelos relacionales y datos semilla (Seed) con usuarios de prueba para los 7 roles.

### Fase 2: Desarrollo y Conexión de Módulos
- [ ] **Módulo Público:** Landing page institucional moderna con identidad visual oficial, sección de Servicios, Ecosistemas de juegos, catálogo público interactivo (con filtros y sin exponer datos confidenciales) y contacto.
- [ ] **Módulo de Autenticación & RBAC:** Control de acceso cerrado, login con redirección automática por rol y cierre de sesión.
- [ ] **Dashboards Especializados por Rol:**
  1. *Super Admin:* Gestión global de usuarios, servidores, asignaciones, alertas y auditoría. Protección contra auto-bloqueo/eliminación.
  2. *Director Operacional:* Panel operativo y reportes de estado.
  3. *Director de PMs:* Supervisión de PMs y servidores a su cargo.
  4. *Director de Creadores:* Directorio completo de creadores y rendimiento.
  5. *Promoter Manager (PM):* Gestión de servidores y creadores asignados, asignación de campañas y revisión de evidencias.
  6. *Creador / Streamer:* Registro de actividades/métricas con evidencias y seguimiento de estados (Pendiente, En revisión, Aprobada, Rechazada).
  7. *Dueño de Servidor:* Monitor de resultados, métricas consolidadas y contenido publicado de su servidor.
- [ ] **Flujo Integral Conectado:** Servidor -> Asignación de PM -> Asignación de Creador -> Creación de Campaña -> Registro de Transmisión/Evidencia -> Aprobación por PM -> Visualización en vivo en el panel del Server Owner.

### Fase 3: Validación, QA, Seguridad y Lanzamiento
- [ ] Inspección exhaustiva de interfaz: Cero botones muertos o sin funcionalidad conectada.
- [ ] Pruebas de seguridad RBAC: Verificación de que peticiones directas a la API sin los roles/propiedades adecuadas sean denegadas con HTTP 403 Forbidden.
- [ ] Tests automatizados unitarios y de integración de endpoints críticos.
- [ ] Verificación de responsive en móvil, tablet y escritorio.
- [ ] Guía de despliegue y manual de usuario para cada uno de los roles.

---

## 7. Credenciales de Prueba Preconfiguradas (Seed Data)
Para verificar de inmediato cada uno de los roles tras el despliegue:

| Rol | Correo Electrónico | Contraseña Inicial | Alcance / Vista Principal |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@pmforgex.com` | `PMForgeX2026!Admin` | Control total del sistema y configuración. |
| **Director Operacional** | `operaciones@pmforgex.com` | `PMForgeX2026!Ops` | Supervisión general de operaciones y servidores. |
| **Director de PMs** | `director.pm@pmforgex.com` | `PMForgeX2026!DirPM` | Supervisión de los Promoter Managers. |
| **Director de Creadores**| `director.creadores@pmforgex.com` | `PMForgeX2026!DirCr` | Supervisión del talento y resultados de creadores. |
| **Promoter Manager (PM)**| `pm.carlos@pmforgex.com` | `PMForgeX2026!PM1` | Gestión de sus servidores y creadores asignados. |
| **Creador (Streamer)** | `creador.dragonslayer@pmforgex.com` | `PMForgeX2026!Creator` | Subida de directos, evidencias y métricas. |
| **Dueño de Servidor** | `owner.metinclassic@pmforgex.com` | `PMForgeX2026!Owner` | Consulta de métricas y campañas de su servidor. |
