# PMForgeX (Versión 1.0) 🚀

Plataforma integral para conectar servidores privados de gaming (Metin2 y futuros títulos) con streamers y creadores de contenido de alto impacto. Sistema completo con web pública, catálogo interactivo sin exposición de datos confidenciales, control de acceso RBAC para 7 roles y flujo de auditoría de evidencias.

---

## ⚡ Características Principales

1. **Web Pública & Catálogo Interactivo:**
   - Landing page institucional con diseño gaming e identidad corporativa oficial.
   - Catálogo interactivo de creadores con filtros por juego, plataforma y disponibilidad.
   - **Confidencialidad rigurosa:** Las tarifas por hora, pagos internos y comisiones no se exponen jamás de forma pública.
   - Formulario de contacto comercial conectado a notificaciones del sistema.

2. **Control de Acceso RBAC (7 Roles):**
   - **Super Admin / Dueño:** Control total, gestión de usuarios con protección contra auto-eliminación o auto-suspensión, asignación de PMs, servidores y logs de auditoría.
   - **Director Operacional:** Monitoreo de servidores activos, incidencias y reportes globales.
   - **Director de PMs:** Supervisión de la carga de trabajo de los Promoter Managers.
   - **Director de Creadores:** Supervisión del directorio de talento, horas y métricas.
   - **Promoter Manager (PM):** Gestión de servidores y creadores asignados, creación de campañas y **bandeja de revisión de evidencias** (aprobar / rechazar con feedback obligatorio).
   - **Creador / Streamer:** Perfil público, registro de transmisiones/videos con métricas y enlaces a VODs, y seguimiento de estados (`review`, `approved`, `rejected`).
   - **Dueño de Servidor (Server Owner):** Panel limpio orientado a resultados con su PM asignado, creadores trabajando en su servidor y enlaces directos a evidencias verificadas.

3. **Arquitectura & Trazabilidad:**
   - Backend modular en Node.js (Express) con base de datos SQLite integrada (`node:sqlite`) con claves foráneas, modo WAL y borrado lógico (`deleted_at`).
   - Frontend SPA en React + Vite + Tailwind CSS + Lucide Icons.
   - 28 pruebas unitarias y de integración pasando al 100%.

---

## 🔑 Credenciales de Prueba (Seed Preconfigurado)

| Rol | Correo Electrónico | Contraseña | Panel Asignado |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@pmforgex.com` | `PMForgeX2026!Admin` | `/dashboard/admin` |
| **Director Operacional** | `operaciones@pmforgex.com` | `PMForgeX2026!Ops` | `/dashboard/director-ops` |
| **Director de PMs** | `director.pm@pmforgex.com` | `PMForgeX2026!DirPM` | `/dashboard/director-pms` |
| **Director de Creadores** | `director.creadores@pmforgex.com` | `PMForgeX2026!DirCr` | `/dashboard/director-creators` |
| **Promoter Manager** | `pm.carlos@pmforgex.com` | `PMForgeX2026!PM1` | `/dashboard/pm` |
| **Creador / Streamer** | `creador.dragonslayer@pmforgex.com` | `PMForgeX2026!Creator` | `/dashboard/creator` |
| **Dueño de Servidor** | `owner.metinclassic@pmforgex.com` | `PMForgeX2026!Owner` | `/dashboard/server-owner` |

---

## 🛠️ Instalación y Ejecución Local

### Prerrequisitos
- Node.js (LTS v22+ o v24+)
- npm

### Pasos
```bash
# 1. Instalar dependencias
npm install

# 2. Compilar el cliente para producción
npm run build:client

# 3. Iniciar el servidor
npm start
```
La aplicación estará disponible en `http://localhost:5000`.

### Ejecutar Tests Automatizados (QA)
```bash
npm test
```

---

## 📤 Guía para Subir a GitHub

### 1. Inicializar Git y Crear el Primer Commit
Abre PowerShell o terminal en la carpeta del proyecto (`scratch/pmforgex`):

```bash
# Inicializar repositorio local
git init

# Configurar tu nombre y correo en Git si es la primera vez
git config user.name "Tu Nombre"
git config user.email "tu-correo@ejemplo.com"

# Agregar archivos (el .gitignore omitirá node_modules y bases de datos)
git add .

# Crear el commit inicial
git commit -m "feat: lanzamiento inicial PMForgeX v1.0 con RBAC, Web Pública y QA completo"
```

### 2. Crear el Repositorio en GitHub
1. Entra a [github.com/new](https://github.com/new).
2. Nombra tu repositorio (ej. `pmforgex`).
3. Puedes elegir **Público** o **Privado**.
4. **No** marques la opción de agregar README ni .gitignore (ya los creamos localmente).
5. Pulsa **Create repository**.

### 3. Vincular y Subir
Copia los comandos que te proporciona GitHub:

```bash
# Renombrar rama principal a main
git branch -M main

# Vincular con tu repositorio remoto (reemplaza con tu URL)
git remote add origin https://github.com/TU_USUARIO/pmforgex.git

# Subir el código
git push -u origin main
```

---

## 🌐 Opciones Recomendadas para Publicar en Producción

### Opción 1: Render (Recomendada y Gratuita / Económica)
1. Inicia sesión en [render.com](https://render.com).
2. Haz clic en **New +** $\rightarrow$ **Web Service**.
3. Conecta tu repositorio de GitHub `pmforgex`.
4. Configuración:
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build:client`
   - **Start Command:** `npm start`
5. En la sección **Advanced** $\rightarrow$ **Disks**, agrega un disco persistente (montado en `/app/data` o `./data`) para que la base de datos SQLite conserve los datos permanentemente al reiniciar.
6. Agrega las variables de entorno:
   - `JWT_SECRET`: una clave secreta segura.
   - `NODE_ENV`: `production`
7. Haz clic en **Deploy Web Service**. Render te proporcionará una URL pública con HTTPS (ej. `https://pmforgex.onrender.com`).

### Opción 2: Railway
1. Inicia sesión en [railway.app](https://railway.app).
2. Haz clic en **New Project** $\rightarrow$ **Deploy from GitHub repo**.
3. Selecciona `pmforgex`. Railway detectará automáticamente el `Dockerfile` o `package.json`.
4. Agrega un volumen persistente montado en `/app/data`.
5. ¡Listo! Despliegue automático con cada `git push`.

### Opción 3: VPS Propio (Ubuntu / Debian con Nginx y PM2)
```bash
git clone https://github.com/TU_USUARIO/pmforgex.git /var/www/pmforgex
cd /var/www/pmforgex
npm install
npm run build:client
pm2 start server/src/index.js --name pmforgex
```
Configura Nginx como proxy inverso hacia el puerto `5000` con certificado SSL gratuito vía Let's Encrypt (`certbot`).

---

## 📄 Licencia
Este proyecto es propiedad de PMForgeX. Todos los derechos reservados.
