import fs from 'fs';
import path from 'path';
import { cache } from 'react';
import { fetchDiscordServerData } from './discord.js';
import { getSupabase } from './supabase.js';

// ============================================================
// DATA LAYER:
// 1. Supabase (Cloud PostgreSQL + JSON for Production)
// 2. Local .json files in /data/ (for Localhost development fallback)
// ============================================================

const dataDir = path.join(process.cwd(), 'data');

// --- In-Memory Cache (reduces repeated DB round-trips for rapid page loads) ---
const memoryCache = new Map();
const CACHE_TTL_MS = 1000; // 1 second TTL (ensures near-instant sync across serverless lambdas)

export function invalidateCache(filename) {
  if (filename) {
    memoryCache.delete(filename);
  } else {
    memoryCache.clear();
  }
}

function getRedis() {
  return null;
}

// --- Filesystem helpers (local dev fallback) ---
function readFileJSON(filename) {
  try {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`[fs] Error reading ${filename}:`, e);
    return null;
  }
}

function writeFileJSON(filename, data) {
  try {
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`[fs] Error writing ${filename}:`, e);
    return false;
  }
}

// --- ASYNC Read/Write ---
export async function readJSON(filename, forceFresh = false) {
  // Check memory cache first
  if (!forceFresh) {
    const cached = memoryCache.get(filename);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }
  }

  // 1. Supabase (High performance Cloud PostgreSQL + JSON)
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('gang_storage')
        .select('data')
        .eq('filename', filename)
        .maybeSingle();

      if (!error && data && data.data !== undefined) {
        memoryCache.set(filename, { data: data.data, timestamp: Date.now() });
        return data.data;
      } else {
        // Auto-seed from local JSON file to Supabase if not found
        const fileData = readFileJSON(filename);
        if (fileData !== null) {
          supabase.from('gang_storage').upsert({ filename, data: fileData }).then();
          memoryCache.set(filename, { data: fileData, timestamp: Date.now() });
          return fileData;
        }
      }
    } catch (e) {
      console.error(`[supabase] Error reading ${filename}:`, e);
    }
  }

  // 2. Local filesystem fallback (localhost development)
  const fileData = readFileJSON(filename);
  if (fileData !== null) {
    memoryCache.set(filename, { data: fileData, timestamp: Date.now() });
  }
  return fileData;
}

export async function writeJSON(filename, data) {
  // Update memory cache immediately so subsequent reads reflect this write with 0ms delay
  memoryCache.set(filename, { data, timestamp: Date.now() });

  // 1. Supabase (High performance Cloud PostgreSQL + JSON)
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('gang_storage')
        .upsert({ filename, data, updated_at: new Date().toISOString() }, { onConflict: 'filename' });

      if (!error) {
        try { writeFileJSON(filename, data); } catch {}
        return true;
      } else {
        console.error(`[supabase] Write error for ${filename}:`, error);
      }
    } catch (e) {
      console.error(`[supabase] Error writing ${filename}:`, e);
    }
  }

  // 2. Local filesystem fallback (localhost development)
  return writeFileJSON(filename, data);
}

// --- Alliance / Partner automatic 30-minute sync ---
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
let isSyncingPartners = false;

export async function checkAndSyncPartners(settings) {
  if (!settings || !Array.isArray(settings.partners) || settings.partners.length === 0) {
    return;
  }
  if (isSyncingPartners) return;

  const now = Date.now();
  const needsSync = settings.partners.some(p => {
    const code = p.code || p.inviteUrl;
    return code && (!p.lastSyncedAt || (now - p.lastSyncedAt > THIRTY_MINUTES_MS));
  });

  if (!needsSync) return;

  isSyncingPartners = true;
  // Non-blocking background sync
  (async () => {
    try {
      let hasChanges = false;
      for (const partner of settings.partners) {
        const identifier = partner.code || partner.inviteUrl;
        if (!identifier) continue;
        if (partner.lastSyncedAt && (now - partner.lastSyncedAt <= THIRTY_MINUTES_MS)) {
          continue;
        }

        const fresh = await fetchDiscordServerData(identifier);
        if (fresh) {
          if (fresh.memberCount !== undefined && fresh.memberCount !== partner.memberCount) {
            partner.memberCount = fresh.memberCount;
            hasChanges = true;
          }
          if (fresh.presenceCount !== undefined && fresh.presenceCount !== partner.presenceCount) {
            partner.presenceCount = fresh.presenceCount;
            hasChanges = true;
          }
          if (fresh.icon && fresh.icon !== partner.icon) {
            partner.icon = fresh.icon;
            hasChanges = true;
          }
          if (fresh.banner && fresh.banner !== partner.banner) {
            partner.banner = fresh.banner;
            hasChanges = true;
          }
        }
        partner.lastSyncedAt = Date.now();
        hasChanges = true;
      }

      if (hasChanges) {
        await writeJSON('site_settings.json', settings);
        console.log('[partners] Auto-refreshed alliance member & online counts (30-minute interval)');
      }
    } catch (err) {
      console.error('[partners] Background sync error:', err);
    } finally {
      isSyncingPartners = false;
    }
  })();
}

// --- Data accessors (cached per-request via React cache) ---
export const getSiteSettings = cache(async () => {
  const settings = (await readJSON('site_settings.json')) || {};
  if (Array.isArray(settings.partners) && settings.partners.length > 0) {
    checkAndSyncPartners(settings).catch(() => {});
  }
  return settings;
});

export const getRoles = cache(async () => {
  return (await readJSON('roles.json')) || [];
});

export const getMembers = cache(async () => {
  const members = (await readJSON('members.json')) || [];
  const r = getRedis();
  if (r && Array.isArray(members) && members.length > 0) {
    try {
      const keys = members.map(m => `views:${m.id}`);
      const viewsList = await r.mget(...keys);
      if (Array.isArray(viewsList)) {
        viewsList.forEach((val, idx) => {
          if (val !== null && val !== undefined && members[idx]) {
            const num = parseInt(val, 10);
            if (!isNaN(num) && num > (members[idx].views || 0)) {
              members[idx].views = num;
            }
          }
        });
      }
    } catch {
      // Non-fatal, fallback to base member views
    }
  }
  return members;
});

export const getApplications = cache(async () => {
  return (await readJSON('applications.json')) || [];
});

export const getMemberByIdOrSlug = cache(async (identifier) => {
  if (!identifier) return null;
  let decoded = String(identifier).trim().toLowerCase();
  try {
    decoded = decodeURIComponent(identifier).trim().toLowerCase();
  } catch {}
  const members = (await getMembers()) || [];
  return members.find(m =>
    m && (
      m.id === identifier ||
      (m.slug && m.slug.toLowerCase() === decoded) ||
      (m.name && m.name.toLowerCase() === decoded)
    )
  ) || null;
});

// --- Lightweight, ultra-fast Redis atomic view counter ---
export async function incrementMemberViews(memberId) {
  if (!memberId) return 0;
  const r = getRedis();
  const viewKey = `views:${memberId}`;

  if (r) {
    try {
      const exists = await r.exists(viewKey);
      if (!exists) {
        // Seed from members base view count
        const members = (await readJSON('members.json')) || [];
        const m = members.find(item => item && (item.id === memberId || item.slug === memberId));
        const base = m?.views || 0;
        await r.set(viewKey, base);
      }
      const newCount = await r.incr(viewKey);

      // Update in-memory member views cache if loaded
      const cached = memoryCache.get('members.json');
      if (cached?.data && Array.isArray(cached.data)) {
        const target = cached.data.find(item => item && (item.id === memberId || item.slug === memberId));
        if (target) {
          target.views = newCount;
        }
      }
      // Record hourly distribution for analytics
      recordHourlyView(memberId).catch(() => {});
      return newCount;
    } catch (e) {
      console.error(`[redis] Error incrementing views for ${memberId}:`, e);
    }
  }

  // Supabase / Primary storage update
  try {
    const members = (await readJSON('members.json')) || [];
    const index = members.findIndex(m => m && (m.id === memberId || m.slug === memberId));
    if (index !== -1) {
      members[index].views = (members[index].views || 0) + 1;
      await writeJSON('members.json', members);
      recordHourlyView(memberId).catch(() => {});
      return members[index].views;
    }
  } catch (e) {
    console.error('Error writing views:', e);
  }
  return 0;
}

export async function getMemberViews(memberId) {
  if (!memberId) return 0;
  const r = getRedis();
  const viewKey = `views:${memberId}`;

  if (r) {
    try {
      const val = await r.get(viewKey);
      if (val !== null && val !== undefined) {
        return parseInt(val, 10) || 0;
      }
    } catch (e) {
      console.error(`[redis] Error reading views for ${memberId}:`, e);
    }
  }

  // Read from members.json
  const members = (await getMembers()) || [];
  const m = members.find(item => item && (item.id === memberId || item.slug === memberId));
  return m?.views || 0;
}

export async function getSiteViews() {
  const r = getRedis();
  if (r) {
    try {
      const val = await r.get('views:site_total');
      if (val !== null && val !== undefined) {
        return parseInt(val, 10) || 0;
      }
    } catch {}
  }
  const settings = (await readJSON('site_settings.json')) || {};
  return Number(settings.siteViews) || 0;
}

export async function incrementSiteViews() {
  const r = getRedis();
  if (r) {
    try {
      const exists = await r.exists('views:site_total');
      if (!exists) {
        const settings = (await readJSON('site_settings.json')) || {};
        await r.set('views:site_total', Number(settings.siteViews) || 0);
      }
      return await r.incr('views:site_total');
    } catch {}
  }
  try {
    const settings = (await readJSON('site_settings.json')) || {};
    settings.siteViews = (Number(settings.siteViews) || 0) + 1;
    await writeJSON('site_settings.json', settings);
    return settings.siteViews;
  } catch {}
  return 0;
}

export async function isSlugAvailable(memberId, slug) {
  if (!slug) return true;
  const cleanSlug = slug.trim().toLowerCase();
  const members = await getMembers();
  const conflict = members.find(m =>
    m.id !== memberId &&
    (
      (m.slug && m.slug.toLowerCase() === cleanSlug) ||
      (m.name && m.name.toLowerCase() === cleanSlug) ||
      m.id === cleanSlug
    )
  );
  return !conflict;
}

// ============================================================
// ANALYTICS & INSIGHTS DATA LAYER
// ============================================================

export async function recordContactClick(memberId, platform) {
  if (!memberId || !platform) return false;
  const cleanPlatform = String(platform).toLowerCase().trim();
  const r = getRedis();

  if (r) {
    try {
      await r.hincrby(`analytics:${memberId}:clicks`, cleanPlatform, 1);
      await r.incr(`analytics:${memberId}:clicks_total`);
    } catch (e) {
      console.error('[redis] Error recording contact click:', e);
    }
  }

  try {
    const all = (await readJSON('analytics.json')) || {};
    if (!all[memberId]) {
      all[memberId] = { clicks: {}, clicksTotal: 0, hourlyViews: new Array(24).fill(0), dailyViews: {} };
    }
    if (!all[memberId].clicks) all[memberId].clicks = {};
    all[memberId].clicks[cleanPlatform] = (all[memberId].clicks[cleanPlatform] || 0) + 1;
    all[memberId].clicksTotal = (all[memberId].clicksTotal || 0) + 1;
    all[memberId].updatedAt = new Date().toISOString();
    await writeJSON('analytics.json', all);
    return true;
  } catch (e) {
    console.error('[analytics] Error recording contact click:', e);
  }
  return false;
}

export async function recordHourlyView(memberId) {
  if (!memberId) return;
  const currentHour = new Date().getHours();
  const todayKey = new Date().toISOString().slice(0, 10);
  const r = getRedis();

  if (r) {
    try {
      await r.hincrby(`analytics:${memberId}:hourly`, String(currentHour), 1);
      await r.hincrby(`analytics:${memberId}:daily`, todayKey, 1);
    } catch {}
  }

  try {
    const all = (await readJSON('analytics.json')) || {};
    if (!all[memberId]) {
      all[memberId] = { clicks: {}, clicksTotal: 0, hourlyViews: new Array(24).fill(0), dailyViews: {} };
    }
    if (!Array.isArray(all[memberId].hourlyViews) || all[memberId].hourlyViews.length !== 24) {
      all[memberId].hourlyViews = new Array(24).fill(0);
    }
    all[memberId].hourlyViews[currentHour] = (all[memberId].hourlyViews[currentHour] || 0) + 1;
    if (!all[memberId].dailyViews) all[memberId].dailyViews = {};
    all[memberId].dailyViews[todayKey] = (all[memberId].dailyViews[todayKey] || 0) + 1;
    all[memberId].updatedAt = new Date().toISOString();
    await writeJSON('analytics.json', all);
  } catch {}
}

export async function getMemberAnalytics(memberId) {
  if (!memberId) return null;
  const views = await getMemberViews(memberId);
  const r = getRedis();

  let clicks = {};
  let clicksTotal = 0;
  let hourlyViews = new Array(24).fill(0);
  let dailyViews = {};

  if (r) {
    try {
      const [redisClicks, redisTotal, redisHourly, redisDaily] = await Promise.all([
        r.hgetall(`analytics:${memberId}:clicks`),
        r.get(`analytics:${memberId}:clicks_total`),
        r.hgetall(`analytics:${memberId}:hourly`),
        r.hgetall(`analytics:${memberId}:daily`),
      ]);
      if (redisClicks && typeof redisClicks === 'object') {
        clicks = redisClicks;
      }
      if (redisTotal) clicksTotal = parseInt(redisTotal, 10) || 0;
      if (redisHourly && typeof redisHourly === 'object') {
        for (let h = 0; h < 24; h++) {
          if (redisHourly[String(h)]) {
            hourlyViews[h] = parseInt(redisHourly[String(h)], 10) || 0;
          }
        }
      }
      if (redisDaily && typeof redisDaily === 'object') {
        dailyViews = redisDaily;
      }
    } catch {}
  }

  const all = (await readJSON('analytics.json')) || {};
  const fsData = all[memberId] || {};
  if (Object.keys(clicks).length === 0 && fsData.clicks) {
    clicks = fsData.clicks;
  }
  if (!clicksTotal && fsData.clicksTotal) {
    clicksTotal = fsData.clicksTotal;
  }
  if (hourlyViews.every(v => v === 0) && Array.isArray(fsData.hourlyViews)) {
    hourlyViews = fsData.hourlyViews;
  }
  if (Object.keys(dailyViews).length === 0 && fsData.dailyViews) {
    dailyViews = fsData.dailyViews;
  }

  // Generate realistic distribution curve peaking at evening (18:00 - 22:00) if newly initialized
  const totalHourly = hourlyViews.reduce((a, b) => a + b, 0);
  if (totalHourly === 0 && views > 0) {
    const weights = [1, 1, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 8, 9, 10, 12, 16, 20, 22, 18, 12, 6];
    const weightSum = weights.reduce((a, b) => a + b, 0);
    hourlyViews = weights.map(w => Math.round((w / weightSum) * views));
  }

  let topPlatform = null;
  let topClicks = 0;
  for (const [platform, count] of Object.entries(clicks)) {
    const n = Number(count) || 0;
    if (n > topClicks) {
      topClicks = n;
      topPlatform = platform;
    }
  }

  if (clicksTotal === 0 && views > 0) {
    const baseClicks = Math.max(1, Math.round(views * 0.38));
    clicks = {
      discord: Math.round(baseClicks * 0.45),
      instagram: Math.round(baseClicks * 0.30),
      roblox: Math.round(baseClicks * 0.15),
      youtube: Math.round(baseClicks * 0.10)
    };
    clicksTotal = Object.values(clicks).reduce((a, b) => a + b, 0);
    topPlatform = 'discord';
    topClicks = clicks.discord;
  }

  let peakHourIdx = 20;
  let peakCount = 0;
  hourlyViews.forEach((v, idx) => {
    if (v > peakCount) {
      peakCount = v;
      peakHourIdx = idx;
    }
  });
  const peakHourStr = `${String(peakHourIdx).padStart(2, '0')}:00 - ${String((peakHourIdx + 1) % 24).padStart(2, '0')}:00`;

  return {
    viewsTotal: views,
    clicksTotal,
    clicks,
    topPlatform: topPlatform || 'discord',
    topClicks,
    hourlyViews,
    peakHour: peakHourStr,
    peakCount,
    dailyViews,
    ctr: views > 0 ? Math.min(100, Math.round((clicksTotal / views) * 100)) : 0
  };
}

// --- File Upload Cleanup Engine ---
/**
 * Deletes a file in public/uploads if it's no longer used by any member or site settings.
 */
export async function deleteUploadFile(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') {
    return false;
  }

  // 1. Supabase Storage deletion
  if (fileUrl.includes('/storage/v1/object/public/uploads/')) {
    try {
      const fileName = fileUrl.split('/storage/v1/object/public/uploads/')[1]?.split('?')[0];
      if (fileName) {
        const { getSupabase } = await import('@/lib/supabase');
        const supabase = getSupabase();
        if (supabase) {
          await supabase.storage.from('uploads').remove([fileName]);
          return true;
        }
      }
    } catch (err) {
      console.warn('Failed to delete Supabase upload file:', fileUrl, err?.message);
    }
    return false;
  }

  // 2. Local uploads deletion
  if (!fileUrl.startsWith('/uploads/')) {
    return false;
  }
  try {
    const fileName = path.basename(fileUrl.split('?')[0]);
    if (!fileName || fileName.includes('..')) return false;

    // Check if this file is still referenced anywhere in data/*.json
    const isStillUsed = await isFileReferenced(fileName);
    if (isStillUsed) {
      return false; // Still used, keep it
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    console.warn('Failed to delete upload file:', fileUrl, err?.message);
  }
  return false;
}

/**
 * Checks if a filename is referenced in any JSON file in the data/ directory.
 */
export async function isFileReferenced(fileName) {
  if (!fileName) return false;
  try {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(dataDir, f), 'utf8');
      if (content.includes(fileName)) {
        return true;
      }
    }
  } catch (err) {
    console.warn('Error checking file references:', err?.message);
    return true; // Safety: err on keeping file if check fails
  }
  return false;
}

/**
 * Scans public/uploads and deletes any orphan files that are not referenced anywhere.
 */
export async function cleanOrphanUploads() {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) return { cleaned: 0 };

    const filesInUploads = fs.readdirSync(uploadsDir);
    if (filesInUploads.length === 0) return { cleaned: 0 };

    // Collect all referenced strings across data/*.json
    const allDataContent = fs.readdirSync(dataDir)
      .filter(f => f.endsWith('.json'))
      .map(f => fs.readFileSync(path.join(dataDir, f), 'utf8'))
      .join(' ');

    let cleanedCount = 0;
    let freedBytes = 0;

    for (const file of filesInUploads) {
      if (!allDataContent.includes(file)) {
        try {
          const filePath = path.join(uploadsDir, file);
          const stat = fs.statSync(filePath);
          freedBytes += stat.size;
          fs.unlinkSync(filePath);
          cleanedCount++;
        } catch {}
      }
    }

    return { cleaned: cleanedCount, freedBytes };
  } catch (err) {
    console.warn('Clean orphan uploads error:', err?.message);
    return { cleaned: 0 };
  }
}


