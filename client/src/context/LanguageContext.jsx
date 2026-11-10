import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const translations = {
  es: {
    nav: {
      home: 'Inicio',
      about: '¿Quiénes somos?',
      services: 'Servicios',
      webDesign: 'Diseño Web',
      howItWorks: 'Cómo Funciona',
      contact: 'Contacto',
      login: 'Acceso Plataforma',
      contactBtn: 'Contactar',
      dashboard: 'Mi Panel',
      logout: 'Cerrar Sesión'
    },
    hero: {
      badge: 'AGENCIA OFICIAL DE CREADORES & SERVIDORES',
      title: 'Conectamos creadores. Impulsamos servidores. Medimos resultados.',
      description: 'Gestionamos campañas publicitarias, streams y promociones para servidores privados, con seguimiento de métricas, organización y resultados verificables.',
      ctaContact: 'Contactar Ahora',
      ctaServices: 'Ver Servicios & Planes',
      stats: {
        streamers: 'Streamers Verificados',
        servers: 'Servidores Gestionados',
        hours: 'Horas Transmitidas',
        views: 'Visualizaciones Auditadas'
      }
    },
    about: {
      badge: 'NUESTRA VISIÓN & PROPÓSITO',
      title: '¿Quiénes somos?',
      p1: 'En PMForgeX nacemos para simplificar y profesionalizar la gestión publicitaria de los servidores privados de videojuegos.',
      p2: 'Trabajar con múltiples creadores implica coordinar campañas, verificar horas de transmisión, revisar métricas, recopilar evidencias, gestionar pagos y mantener la publicidad activa. Todo esto requiere tiempo, organización y un seguimiento constante que puede convertirse en una carga para la administración de un servidor.',
      p3: 'PMForgeX centraliza toda esa gestión en un solo lugar. Coordinamos creadores de contenido, supervisamos campañas, registramos resultados y organizamos cada proceso para que los servidores puedan concentrarse en lo más importante: desarrollar su proyecto y hacer crecer su comunidad.',
      p4: 'No nos limitamos a conectar servidores con streamers. Nos encargamos de la gestión, el seguimiento y la organización de sus acciones de marketing, ofreciendo mayor control, transparencia y eficiencia en cada colaboración.',
      highlight: 'PMForgeX — Menos gestión, más crecimiento.'
    },
    services: {
      badge: 'SERVICIOS INTEGRALES',
      title: 'Todo lo que tu Servidor Necesita para Crecer',
      subtitle: 'Coordinamos toda la operativa publicitaria y de difusión para que el equipo técnico se enfoque en el juego.',
      items: [
        {
          title: 'Gestión de Streamers & Creadores',
          desc: 'Seleccionamos y coordinamos creadores de alto impacto y reputación. Establecemos calendarios de directos y pautas en el juego según objetivos de apertura o mantenimiento.'
        },
        {
          title: 'Publicidad en Redes Sociales',
          desc: 'Campañas de alcance masivo en TikTok, YouTube Shorts, Instagram Reels, Facebook y Discord. Creación de clips virales y pautas para atraer nuevos jugadores continuamente.'
        },
        {
          title: 'Coordinación de PMs Dedicados',
          desc: 'Un Promoter Manager asignado a tu servidor supervisa el cumplimiento de horas, resuelve incidencias técnicas, mantiene comunicación directa y asegura el retorno de inversión.'
        },
        {
          title: 'Auditoría, Métricas & Evidencias',
          desc: 'Cero promesas vacías. Cada directo y video se registra con VOD, capturas fotográficas de espectadores y métricas verificables auditadas antes de ser aprobadas.'
        }
      ]
    },
    webDesign: {
      badge: 'SOLUCIONES DIGITALES EXCLUSIVAS',
      title: 'Diseño Web & Landing Pages para Servidores',
      subtitle: 'La primera impresión de tu comunidad define su éxito. Desarrollamos plataformas web de alto rendimiento hechas a medida para servidores privados.',
      features: [
        {
          title: 'Landing Pages de Lanzamiento & Apertura',
          desc: 'Páginas de presentación con contador regresivo, tráiler épico, registro rápido y descarga de parches con alta conversión.'
        },
        {
          title: 'Sitios Web Completos con Ranking & Tienda',
          desc: 'Portales interactivos con tablas de clasificación PvP/PvE, panel de usuario, integración de donaciones y soporte multijugador.'
        },
        {
          title: 'Branding, Logos & Material Promocional',
          desc: 'Diseño de identidad visual, banners para streamers, overlays de transmisión, cabeceras de Discord y piezas publicitarias para redes.'
        },
        {
          title: 'Optimización Móvil & Carga Ultrarrápida',
          desc: 'Diseños 100% responsivos adaptados a teléfonos móviles, protegidos contra ataques y con entrega mediante redes CDN globales.'
        }
      ]
    },
    hub: {
      badge: 'TECNOLOGÍA PROPIA',
      title: 'Hub de Gestión & Auditoría en Tiempo Real',
      subtitle: 'Una herramienta profesional para dirigir campañas y verificar resultados sin depender de hojas de cálculo ni chats dispersos.',
      tag: 'PANEL PRIVADO DE CONTROL',
      card1: 'Monitoreo de Streams Activos',
      card2: 'Auditoría de Capturas de Pantalla',
      card3: 'Estadísticas de Espectadores & Pico',
      card4: 'Control de Horas Validadas por el PM'
    },
    steps: {
      badge: 'FLUJO DE TRABAJO',
      title: 'Cómo Opera PMForgeX en 6 Pasos',
      subtitle: 'Un proceso riguroso y transparente desde la incorporación hasta el reporte de impacto.',
      items: [
        { num: '01', title: 'Incorporación del Servidor', desc: 'Analizamos las metas, cronograma de apertura o torneos y definimos el presupuesto publicitario.' },
        { num: '02', title: 'Asignación de PM Responsable', desc: 'Se asigna un Promoter Manager dedicado que coordina la relación, los calendarios y las metas.' },
        { num: '03', title: 'Selección de Creadores & Redes', desc: 'Se eligen los streamers y se planifican los clips publicitarios para TikTok, Reels y YouTube.' },
        { num: '04', title: 'Transmisión & Publicidad en Redes', desc: 'Los creadores transmiten en vivo y se publican videos promocionales en todas las redes sociales.' },
        { num: '05', title: 'Auditoría de Evidencias & Capturas', desc: 'El PM valida cada VOD y revisa las capturas fotográficas de concurrencia antes de dar el visto bueno.' },
        { num: '06', title: 'Resultados Verificados para el Dueño', desc: 'El cliente consulta en su panel el impacto real: horas cumplidas, vistas totales y capturas auditadas.' }
      ]
    },
    contact: {
      badge: 'HABLEMOS DE TU PROYECTO',
      title: 'Impulsa tu Servidor con PMForgeX',
      desc: 'Cuéntanos sobre tu servidor y tus objetivos de jugadores. Coordinamos tu campaña con streamers y publicidad multicanal.',
      name: 'Nombre o Alias',
      serverName: 'Nombre del Servidor',
      game: 'Juego',
      contactInfo: 'Discord o WhatsApp',
      message: 'Mensaje o Detalles de la Campaña',
      sendBtn: 'Enviar Solicitud Comercial',
      success: '¡Mensaje recibido! Un Promoter Manager se pondrá en contacto contigo a la brevedad.'
    }
  },
  en: {
    nav: {
      home: 'Home',
      about: 'About Us',
      services: 'Services',
      webDesign: 'Web Design',
      howItWorks: 'How It Works',
      contact: 'Contact',
      login: 'Portal Access',
      contactBtn: 'Contact Us',
      dashboard: 'Dashboard',
      logout: 'Log Out'
    },
    hero: {
      badge: 'OFFICIAL CREATOR & SERVER AGENCY',
      title: 'Connecting creators. Empowering servers. Measuring results.',
      description: 'We manage advertising campaigns, streams, and promotions for private servers, with metric tracking, organization, and verifiable results.',
      ctaContact: 'Contact Us Now',
      ctaServices: 'View Services & Plans',
      stats: {
        streamers: 'Verified Streamers',
        servers: 'Managed Servers',
        hours: 'Hours Streamed',
        views: 'Audited Views'
      }
    },
    about: {
      badge: 'OUR VISION & PURPOSE',
      title: 'About Us',
      p1: 'At PMForgeX, we were founded to simplify and professionalize advertising management for private gaming servers.',
      p2: 'Working with multiple creators requires coordinating campaigns, verifying streaming hours, reviewing metrics, collecting proof, managing payouts, and maintaining active advertising. All of this demands time, structure, and continuous tracking that can overwhelm server administration.',
      p3: 'PMForgeX centralizes all this management in one place. We coordinate content creators, supervise campaigns, record verifiable results, and organize every stage so server owners can focus on what matters most: developing their project and growing their community.',
      p4: 'We do not merely connect servers with streamers. We manage, audit, and organize all marketing initiatives, providing superior control, transparency, and efficiency in every collaboration.',
      highlight: 'PMForgeX — Less management, more growth.'
    },
    services: {
      badge: 'END-TO-END SERVICES',
      title: 'Everything Your Server Needs to Scale',
      subtitle: 'We handle the entire promotional and promotional operations so your team can focus on gameplay.',
      items: [
        {
          title: 'Streamer & Creator Management',
          desc: 'We select and coordinate reputable high-impact creators, scheduling streams and gameplay integrations aligned with server launches or seasonal events.'
        },
        {
          title: 'Multi-Channel Social Media Advertising',
          desc: 'High-reach campaigns on TikTok, YouTube Shorts, Instagram Reels, Facebook, and Discord. We craft viral gameplay clips and continuous campaigns to attract new players.'
        },
        {
          title: 'Dedicated PM Coordination',
          desc: 'A dedicated Promoter Manager assigned to your server oversees requirements, resolves technical roadblocks, and ensures solid return on marketing investment.'
        },
        {
          title: 'Evidence & Metrics Auditing',
          desc: 'Zero empty promises. Every broadcast and video is recorded with public VOD links, photo screenshots of viewership, and verifiable metrics reviewed prior to approval.'
        }
      ]
    },
    webDesign: {
      badge: 'EXCLUSIVE DIGITAL SOLUTIONS',
      title: 'Web Design & Landing Pages for Servers',
      subtitle: 'First impressions shape player retention. We craft high-performance, tailored websites and digital experiences built specifically for private servers.',
      features: [
        {
          title: 'High-Converting Launch Landing Pages',
          desc: 'Presentation pages equipped with countdown timers, cinematic trailers, fast registration, and direct patch download links.'
        },
        {
          title: 'Full Web Portals with Rankings & Webshop',
          desc: 'Interactive player portals featuring PvP/PvE leaderboards, account management panels, donation integrations, and multiplayer support.'
        },
        {
          title: 'Branding, Logos & Marketing Assets',
          desc: 'Complete visual identity design, stream overlays, promotional Discord headers, and custom promotional banners for social media.'
        },
        {
          title: 'Mobile Optimization & Ultra-Fast Delivery',
          desc: 'Fully responsive designs engineered for smartphones, secured against common exploits, and served via high-speed global CDNs.'
        }
      ]
    },
    hub: {
      badge: 'PROPRIETARY TECH',
      title: 'Real-Time Management & Audit Hub',
      subtitle: 'A professional platform to coordinate campaigns and verify results without messy spreadsheets or scattered chat logs.',
      tag: 'PRIVATE CONTROL PANEL',
      card1: 'Active Stream Monitoring',
      card2: 'Screenshot Evidence Auditing',
      card3: 'Peak & Average Viewership Tracking',
      card4: 'PM-Verified Broadcast Hours'
    },
    steps: {
      badge: 'WORKFLOW PROCESS',
      title: 'How PMForgeX Operates in 6 Steps',
      subtitle: 'A transparent and disciplined process from onboarding through verified impact reporting.',
      items: [
        { num: '01', title: 'Server Onboarding', desc: 'We evaluate community goals, launch dates, and define the custom advertising budget.' },
        { num: '02', title: 'Dedicated PM Assigned', desc: 'A dedicated Promoter Manager is assigned to oversee communication, schedules, and deliverables.' },
        { num: '03', title: 'Creator & Channel Selection', desc: 'We select the right streamers and schedule promotional clips across TikTok, Reels, and YouTube.' },
        { num: '04', title: 'Live Streams & Social Media Push', desc: 'Creators broadcast live while social media promotional campaigns run across all gaming networks.' },
        { num: '05', title: 'Evidence & Screenshot Audit', desc: 'The PM verifies each VOD and inspects screenshot proof of concurrent viewership before approval.' },
        { num: '06', title: 'Verified Results for Server Owner', desc: 'The client reviews tangible results in their dashboard: audited hours, total reach, and verified proof.' }
      ]
    },
    contact: {
      badge: "LET'S TALK ABOUT YOUR SERVER",
      title: 'Scale Your Server with PMForgeX',
      desc: 'Tell us about your community and player acquisition goals. We coordinate your creator campaign and multi-channel advertising.',
      name: 'Name or Alias',
      serverName: 'Server Name',
      game: 'Game',
      contactInfo: 'Discord or WhatsApp',
      message: 'Message or Campaign Goals',
      sendBtn: 'Submit Business Inquiry',
      success: 'Inquiry received! A Promoter Manager will reach out to you shortly.'
    }
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('es');

  const toggleLanguage = () => {
    setLang(prev => (prev === 'es' ? 'en' : 'es'));
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
