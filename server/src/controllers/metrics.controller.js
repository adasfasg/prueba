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
      WHERE status = 'approved'
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
    const aggregates = db.prepare("SELECT COALESCE(SUM(duration_minutes), 0) as m, COALESCE(SUM(total_views), 0) as v FROM activity_evidences WHERE status = 'approved'").get();

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
        (SELECT COALESCE(SUM(ae.duration_minutes), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status = 'approved') as minutes,
        (SELECT COALESCE(SUM(ae.total_views), 0) FROM activity_evidences ae WHERE ae.creator_id = u.id AND ae.status = 'approved') as views
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
      WHERE (s.pm_user_id = ? OR c.pm_user_id = ?) AND ae.status = 'approved'
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
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'review' THEN 1 END) as review_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN duration_minutes ELSE 0 END), 0) as total_minutes,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN total_views ELSE 0 END), 0) as total_views
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
      WHERE c.server_id = ? AND ae.status = 'approved'
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

module.exports = {
  getDashboardMetrics
};
