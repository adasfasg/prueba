const { db } = require('../db');

function getDashboardMetrics(req, res) {
  const { role, id: userId } = req.user;

  if (role === 'super_admin') {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE deleted_at IS NULL').get().c;
    const totalPms = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'pm' AND deleted_at IS NULL").get().c;
    const totalCreators = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'creator' AND deleted_at IS NULL").get().c;
    const totalServers = db.prepare('SELECT COUNT(*) as c FROM servers WHERE deleted_at IS NULL').get().c;
    const activeCampaigns = db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE deleted_at IS NULL AND status = 'active'").get().c;

    // Critical Alerts:
    // 1. Servers without PM
    const serversWithoutPm = db.prepare(`
      SELECT id, name, game, contact_info FROM servers 
      WHERE pm_user_id IS NULL AND deleted_at IS NULL
    `).all();

    // 2. Creators without server assignment
    const unassignedCreators = db.prepare(`
      SELECT u.id, u.full_name, cp.alias, cp.avatar_url FROM users u
      LEFT JOIN creator_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'creator' AND u.deleted_at IS NULL
      AND u.id NOT IN (SELECT creator_id FROM server_creators WHERE status = 'active')
    `).all();

    // 3. Pending reviews
    const pendingReviewsCount = db.prepare("SELECT COUNT(*) as c FROM activity_evidences WHERE status = 'review'").get().c;

    // Aggregates
    const aggregates = db.prepare(`
      SELECT 
        COALESCE(SUM(duration_minutes), 0) as total_minutes,
        COALESCE(SUM(total_views), 0) as total_views,
        COALESCE(MAX(peak_viewers), 0) as max_peak
      FROM activity_evidences 
      WHERE status IN ('approved', 'paid')
    `).get();

    return res.json({
      role,
      summary: {
        total_users: totalUsers,
        total_pms: totalPms,
        total_creators: totalCreators,
        total_servers: totalServers,
        active_campaigns: activeCampaigns,
        total_stream_hours: (aggregates.total_minutes / 60).toFixed(1),
        total_views: aggregates.total_views,
        peak_viewers: aggregates.max_peak,
        pending_reviews: pendingReviewsCount
      },
      alerts: {
        servers_without_pm: serversWithoutPm,
        unassigned_creators: unassignedCreators
      }
    });
  }

  if (role === 'director_ops') {
    const totalServers = db.prepare('SELECT COUNT(*) as c FROM servers WHERE deleted_at IS NULL').get().c;
    const activeCampaigns = db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE deleted_at IS NULL AND status = 'active'").get().c;
    const pendingReviews = db.prepare("SELECT COUNT(*) as c FROM activity_evidences WHERE status = 'review'").get().c;
    const aggregates = db.prepare("SELECT COALESCE(SUM(duration_minutes), 0) as m, COALESCE(SUM(total_views), 0) as v FROM activity_evidences WHERE status IN ('approved', 'paid')").get();

    return res.json({
      role,
      summary: {
        total_servers: totalServers,
        active_campaigns: activeCampaigns,
        pending_reviews: pendingReviews,
        total_hours: (aggregates.m / 60).toFixed(1),
        total_views: aggregates.v
      }
    });
  }

  if (role === 'director_pms') {
    const pms = db.prepare(`
      SELECT 
        u.id, u.full_name, u.email,
        (SELECT COUNT(*) FROM servers s WHERE s.pm_user_id = u.id AND s.deleted_at IS NULL) as servers_count,
        (SELECT COUNT(*) FROM campaigns c WHERE c.pm_user_id = u.id AND c.status = 'active') as active_campaigns_count,
        (SELECT COUNT(*) FROM activity_evidences ae 
         JOIN campaigns c ON ae.campaign_id = c.id 
         WHERE c.pm_user_id = u.id AND ae.status = 'review') as pending_reviews_count
      FROM users u
      WHERE u.role = 'pm' AND u.deleted_at IS NULL
    `).all();

    return res.json({
      role,
      pms_workload: pms
    });
  }

  if (role === 'director_creators') {
    const creators = db.prepare(`
      SELECT 
        cp.id, cp.alias, cp.is_available, u.full_name,
        (SELECT COUNT(DISTINCT sc.server_id) FROM server_creators sc WHERE sc.creator_id = u.id AND sc.status = 'active') as servers_count,
        (SELECT COALESCE(SUM(ae.duration_minutes), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status IN ('approved', 'paid')) as minutes,
        (SELECT COALESCE(SUM(ae.total_views), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status IN ('approved', 'paid')) as views
      FROM creator_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE u.deleted_at IS NULL
    `).all();

    return res.json({
      role,
      creators: creators.map(c => ({
        ...c,
        hours: (c.minutes / 60).toFixed(1)
      }))
    });
  }

  if (role === 'pm') {
    const myServers = db.prepare('SELECT COUNT(*) as c FROM servers WHERE pm_user_id = ? AND deleted_at IS NULL').get(userId).c;
    const myCampaigns = db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE pm_user_id = ? AND deleted_at IS NULL AND status = 'active'").get(userId).c;
    const myPendingReviews = db.prepare(`
      SELECT COUNT(*) as c FROM activity_evidences ae
      JOIN campaigns c ON ae.campaign_id = c.id
      JOIN servers s ON c.server_id = s.id
      WHERE (s.pm_user_id = ? OR c.pm_user_id = ?) AND ae.status = 'review'
    `).get(userId, userId).c;

    const myImpact = db.prepare(`
      SELECT 
        COALESCE(SUM(ae.duration_minutes), 0) as minutes,
        COALESCE(SUM(ae.total_views), 0) as views
      FROM activity_evidences ae
      JOIN campaigns c ON ae.campaign_id = c.id
      JOIN servers s ON c.server_id = s.id
      WHERE (s.pm_user_id = ? OR c.pm_user_id = ?) AND ae.status IN ('approved', 'paid')
    `).get(userId, userId);

    return res.json({
      role,
      summary: {
        my_servers: myServers,
        my_active_campaigns: myCampaigns,
        pending_reviews: myPendingReviews,
        managed_hours: (myImpact.minutes / 60).toFixed(1),
        managed_views: myImpact.views
      }
    });
  }

  if (role === 'creator') {
    const myEvidences = db.prepare(`
      SELECT 
        COUNT(CASE WHEN status IN ('approved', 'paid') THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'review' THEN 1 END) as review_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN duration_minutes ELSE 0 END), 0) as total_minutes,
        COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN total_views ELSE 0 END), 0) as total_views,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN payout_amount ELSE 0 END), 0) as total_earned
      FROM activity_evidences
      WHERE creator_id = ?
    `).get(userId);

    const activeCampaigns = db.prepare(`
      SELECT COUNT(*) as c FROM campaign_creators cc
      JOIN campaigns c ON cc.campaign_id = c.id
      WHERE cc.creator_id = ? AND c.status = 'active'
    `).get(userId).c;

    return res.json({
      role,
      summary: {
        approved_activities: myEvidences.approved_count,
        in_review: myEvidences.review_count,
        rejected: myEvidences.rejected_count,
        total_hours: (myEvidences.total_minutes / 60).toFixed(1),
        total_views: myEvidences.total_views,
        paid_activities: myEvidences.paid_count,
        total_earned: myEvidences.total_earned,
        active_campaigns: activeCampaigns
      }
    });
  }

  if (role === 'server_owner') {
    const server = db.prepare(`
      SELECT s.*, pm.full_name as pm_name, pm.email as pm_email, pm.phone as pm_phone
      FROM servers s
      LEFT JOIN users pm ON s.pm_user_id = pm.id
      WHERE s.owner_user_id = ? AND s.deleted_at IS NULL
    `).get(userId);

    if (!server) {
      return res.json({
        role,
        has_server: false,
        message: 'No tienes un servidor registrado aún.'
      });
    }

    const metrics = db.prepare(`
      SELECT 
        COALESCE(SUM(ae.duration_minutes), 0) as total_minutes,
        COALESCE(SUM(ae.total_views), 0) as total_views,
        COALESCE(MAX(ae.peak_viewers), 0) as max_peak,
        COUNT(ae.id) as approved_streams_count
      FROM activity_evidences ae
      JOIN campaigns c ON ae.campaign_id = c.id
      WHERE c.server_id = ? AND ae.status IN ('approved', 'paid')
    `).get(server.id);

    const creators = db.prepare(`
      SELECT u.id, cp.alias, cp.avatar_url, cp.platforms, sc.assigned_at
      FROM server_creators sc
      JOIN users u ON sc.creator_id = u.id
      LEFT JOIN creator_profiles cp ON u.id = cp.user_id
      WHERE sc.server_id = ? AND sc.status = 'active'
    `).all(server.id);

    return res.json({
      role,
      has_server: true,
      server: {
        id: server.id,
        name: server.name,
        game: server.game,
        status: server.status,
        logo_url: server.logo_url,
        website_url: server.website_url,
        pm: {
          name: server.pm_name || 'Pendiente de asignación',
          email: server.pm_email || null,
          phone: server.pm_phone || null
        }
      },
      summary: {
        total_hours: (metrics.total_minutes / 60).toFixed(1),
        total_views: metrics.total_views,
        peak_viewers: metrics.max_peak,
        approved_streams: metrics.approved_streams_count,
        active_creators: creators.length
      },
      creators: creators.map(c => {
        let platforms = [];
        try { platforms = JSON.parse(c.platforms || '[]'); } catch (e) {}
        return { ...c, platforms };
      })
    });
  }

  return res.json({ role, summary: {} });
}

function getReportsMetrics(req, res) {
  const { role } = req.user;
  if (!['super_admin', 'director_ops', 'director_pms', 'director_creators'].includes(role)) {
    return res.status(403).json({ error: 'Acceso restringido: Se requieren permisos administrativos o directivos.' });
  }

  const { timeRange = 'all' } = req.query;
  let dateFilter = '';
  if (timeRange === '7d') {
    dateFilter = " AND ae.activity_date >= date('now', '-7 days')";
  } else if (timeRange === '30d') {
    dateFilter = " AND ae.activity_date >= date('now', '-30 days')";
  }

  // 1. Top Streamers by Views and Stream Hours
  const rawTopStreamers = db.prepare(`
    SELECT 
      u.id as user_id, u.username, u.full_name, u.status, u.phone,
      cp.alias, cp.avatar_url, cp.games, cp.platforms, cp.hourly_rate_internal, cp.commission_percentage,
      COALESCE(SUM(ae.total_views), 0) as total_views,
      COALESCE(SUM(ae.duration_minutes), 0) as total_minutes,
      COALESCE(MAX(ae.peak_viewers), 0) as peak_viewers,
      ROUND(COALESCE(AVG(ae.avg_viewers), 0), 0) as avg_viewers,
      COUNT(ae.id) as approved_streams_count,
      (SELECT COUNT(DISTINCT sc.server_id) FROM server_creators sc WHERE sc.creator_id = u.id AND sc.status = 'active') as servers_count,
      (SELECT COUNT(DISTINCT cc.campaign_id) FROM campaign_creators cc WHERE cc.creator_id = u.id) as campaigns_count
    FROM users u
    JOIN creator_profiles cp ON u.id = cp.user_id
    LEFT JOIN activity_evidences ae ON u.id = ae.creator_id AND ae.status IN ('approved', 'paid') ${dateFilter}
    WHERE u.deleted_at IS NULL
    GROUP BY u.id
    ORDER BY total_views DESC, total_minutes DESC
  `).all();

  const topStreamers = rawTopStreamers.map((s, idx) => {
    let parsedGames = [];
    let parsedPlatforms = [];
    try { parsedGames = typeof s.games === 'string' ? JSON.parse(s.games) : s.games; } catch(e){ parsedGames = s.games ? [s.games] : []; }
    try { parsedPlatforms = typeof s.platforms === 'string' ? JSON.parse(s.platforms) : s.platforms; } catch(e){ parsedPlatforms = s.platforms ? [s.platforms] : []; }

    return {
      rank: idx + 1,
      ...s,
      games: Array.isArray(parsedGames) ? parsedGames : [parsedGames],
      platforms: Array.isArray(parsedPlatforms) ? parsedPlatforms : [parsedPlatforms],
      total_hours: (s.total_minutes / 60).toFixed(1)
    };
  });

  // Global total views from top streamers for percentage calculation
  const totalViewsAccumulated = topStreamers.reduce((acc, s) => acc + s.total_views, 0);
  const totalMinutesAccumulated = topStreamers.reduce((acc, s) => acc + s.total_minutes, 0);
  const topStreamersWithShare = topStreamers.map(s => ({
    ...s,
    views_share_percentage: totalViewsAccumulated > 0 ? ((s.total_views / totalViewsAccumulated) * 100).toFixed(1) : 0
  }));

  // 2. Ecosystem & Game Distribution
  const ecosystemStats = db.prepare(`
    SELECT 
      s.game,
      COUNT(DISTINCT s.id) as servers_count,
      COUNT(DISTINCT c.id) as campaigns_count,
      COALESCE(SUM(ae.total_views), 0) as total_views,
      COALESCE(SUM(ae.duration_minutes), 0) as total_minutes,
      COUNT(ae.id) as approved_streams_count
    FROM servers s
    LEFT JOIN campaigns c ON s.id = c.server_id AND c.deleted_at IS NULL
    LEFT JOIN activity_evidences ae ON c.id = ae.campaign_id AND ae.status IN ('approved', 'paid') ${dateFilter}
    WHERE s.deleted_at IS NULL
    GROUP BY s.game
    ORDER BY total_views DESC, servers_count DESC
  `).all().map(e => ({
    ...e,
    total_hours: (e.total_minutes / 60).toFixed(1),
    views_share_percentage: totalViewsAccumulated > 0 ? ((e.total_views / totalViewsAccumulated) * 100).toFixed(1) : 0
  }));

  // 3. Streaming Platform Distribution (Twitch, Kick, YouTube, TikTok, etc.)
  const platformStats = db.prepare(`
    SELECT 
      ae.platform,
      COUNT(ae.id) as streams_count,
      COALESCE(SUM(ae.total_views), 0) as total_views,
      COALESCE(SUM(ae.duration_minutes), 0) as total_minutes,
      COALESCE(MAX(ae.peak_viewers), 0) as peak_viewers,
      ROUND(COALESCE(AVG(ae.avg_viewers), 0), 0) as avg_viewers
    FROM activity_evidences ae
    WHERE ae.status IN ('approved', 'paid') ${dateFilter}
    GROUP BY ae.platform
    ORDER BY total_views DESC
  `).all().map(p => ({
    ...p,
    total_hours: (p.total_minutes / 60).toFixed(1)
  }));

  // 4. Server Performance Ranking
  const serverStats = db.prepare(`
    SELECT 
      s.id, s.name, s.game, s.status, s.logo_url,
      pm.full_name as pm_name,
      owner.full_name as owner_name,
      (SELECT COUNT(*) FROM server_creators sc WHERE sc.server_id = s.id AND sc.status = 'active') as creators_count,
      (SELECT COUNT(*) FROM campaigns c WHERE c.server_id = s.id AND c.deleted_at IS NULL AND c.status = 'active') as active_campaigns_count,
      COALESCE(SUM(ae.total_views), 0) as total_views,
      COALESCE(SUM(ae.duration_minutes), 0) as total_minutes,
      COUNT(ae.id) as streams_count
    FROM servers s
    LEFT JOIN users pm ON s.pm_user_id = pm.id
    LEFT JOIN users owner ON s.owner_user_id = owner.id
    LEFT JOIN campaigns c ON s.id = c.server_id AND c.deleted_at IS NULL
    LEFT JOIN activity_evidences ae ON c.id = ae.campaign_id AND ae.status IN ('approved', 'paid') ${dateFilter}
    WHERE s.deleted_at IS NULL
    GROUP BY s.id
    ORDER BY total_views DESC, total_minutes DESC
  `).all().map(srv => ({
    ...srv,
    total_hours: (srv.total_minutes / 60).toFixed(1)
  }));

  // 5. Promoter Managers Performance
  const pmStats = db.prepare(`
    SELECT 
      u.id, u.username, u.full_name, u.email, u.phone, u.status,
      (SELECT COUNT(*) FROM servers s WHERE s.pm_user_id = u.id AND s.deleted_at IS NULL) as servers_count,
      (SELECT COUNT(*) FROM campaigns c WHERE c.pm_user_id = u.id AND c.deleted_at IS NULL AND c.status = 'active') as active_campaigns_count,
      (SELECT COUNT(*) FROM activity_evidences ae 
       JOIN campaigns c ON ae.campaign_id = c.id 
       JOIN servers s ON c.server_id = s.id 
       WHERE (s.pm_user_id = u.id OR c.pm_user_id = u.id) AND ae.status IN ('approved', 'paid') ${dateFilter}) as approved_evidences_count,
      COALESCE((
        SELECT SUM(ae.total_views) FROM activity_evidences ae 
        JOIN campaigns c ON ae.campaign_id = c.id 
        JOIN servers s ON c.server_id = s.id 
        WHERE (s.pm_user_id = u.id OR c.pm_user_id = u.id) AND ae.status IN ('approved', 'paid') ${dateFilter}
      ), 0) as total_views_managed,
      COALESCE((
        SELECT SUM(ae.duration_minutes) FROM activity_evidences ae 
        JOIN campaigns c ON ae.campaign_id = c.id 
        JOIN servers s ON c.server_id = s.id 
        WHERE (s.pm_user_id = u.id OR c.pm_user_id = u.id) AND ae.status IN ('approved', 'paid') ${dateFilter}
      ), 0) as total_minutes_managed
    FROM users u
    WHERE u.role = 'pm' AND u.deleted_at IS NULL
    ORDER BY total_views_managed DESC, servers_count DESC
  `).all().map(pm => ({
    ...pm,
    total_hours_managed: (pm.total_minutes_managed / 60).toFixed(1)
  }));

  // 6. Campaign Financial & Budget Execution
  const campaignStats = db.prepare(`
    SELECT 
      c.id, c.name, c.status, c.budget_internal, c.start_date, c.end_date,
      s.name as server_name, s.game as server_game,
      pm.full_name as pm_name,
      (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id = c.id) as creators_count,
      COALESCE(SUM(ae.total_views), 0) as total_views,
      COALESCE(SUM(ae.duration_minutes), 0) as total_minutes,
      COUNT(ae.id) as streams_count
    FROM campaigns c
    JOIN servers s ON c.server_id = s.id
    LEFT JOIN users pm ON c.pm_user_id = pm.id
    LEFT JOIN activity_evidences ae ON c.id = ae.campaign_id AND ae.status IN ('approved', 'paid') ${dateFilter}
    WHERE c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.budget_internal DESC, total_views DESC
  `).all().map(camp => {
    const hours = camp.total_minutes / 60;
    const costPerHour = hours > 0 ? (camp.budget_internal / hours).toFixed(2) : 0;
    const cpm = camp.total_views > 0 ? ((camp.budget_internal / camp.total_views) * 1000).toFixed(2) : 0;

    return {
      ...camp,
      total_hours: hours.toFixed(1),
      cost_per_hour: costPerHour,
      cpm
    };
  });

  // 7. Evidence Audit QA Metrics (Funnel)
  const auditEvidenceStats = db.prepare(`
    SELECT 
      COUNT(CASE WHEN status IN ('approved', 'paid') THEN 1 END) as approved_count,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as pending_payout_count,
      COUNT(CASE WHEN status = 'review' THEN 1 END) as review_count,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN payout_amount ELSE 0 END), 0) as total_payout_liquidated,
      COUNT(*) as total_count
    FROM activity_evidences ae
    WHERE 1=1 ${dateFilter}
  `).get();

  const totalEv = auditEvidenceStats.total_count || 0;
  const approvalRate = totalEv > 0 ? ((auditEvidenceStats.approved_count / totalEv) * 100).toFixed(1) : 100;

  // 8. Overall Summary
  const totalCampaignBudget = db.prepare("SELECT COALESCE(SUM(budget_internal), 0) as b FROM campaigns WHERE deleted_at IS NULL").get().b;
  const peakViewersGlobal = db.prepare("SELECT COALESCE(MAX(peak_viewers), 0) as p FROM activity_evidences WHERE status IN ('approved', 'paid')").get().p;

  return res.json({
    timeRange,
    summary: {
      total_views: totalViewsAccumulated,
      total_stream_hours: (totalMinutesAccumulated / 60).toFixed(1),
      total_approved_streams: db.prepare("SELECT COUNT(*) as c FROM activity_evidences WHERE status IN ('approved', 'paid')").get().c,
      total_paid_streams: auditEvidenceStats.paid_count,
      pending_payout_streams: auditEvidenceStats.pending_payout_count,
      total_paid_out: auditEvidenceStats.total_payout_liquidated,
      peak_viewers: peakViewersGlobal,
      total_campaign_budget: totalCampaignBudget,
      total_creators_active: db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'creator' AND status = 'active' AND deleted_at IS NULL").get().c,
      total_servers_active: db.prepare("SELECT COUNT(*) as c FROM servers WHERE status = 'active' AND deleted_at IS NULL").get().c,
      total_pms: db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'pm' AND status = 'active' AND deleted_at IS NULL").get().c,
      evidence_funnel: {
        ...auditEvidenceStats,
        approval_rate: approvalRate
      }
    },
    top_streamers: topStreamersWithShare,
    ecosystems: ecosystemStats,
    platforms: platformStats,
    servers: serverStats,
    pms: pmStats,
    campaigns: campaignStats
  });
}

module.exports = {
  getDashboardMetrics,
  getReportsMetrics
};
