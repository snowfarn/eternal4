/**
 * Shared Discord utilities for fetching public server invites & member counts
 */

export function extractInviteCode(input) {
  if (!input) return '';
  let str = input.trim();
  str = str.replace(/^[<"']+|[>"']+$/g, '');
  
  // Match discord.gg/xxx or discord.com/invite/xxx
  const urlMatch = str.match(/(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)([a-zA-Z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  // Match generic /invite/xxx path
  if (str.includes('/invite/')) {
    const parts = str.split('/invite/')[1]?.split(/[?#&/]/);
    if (parts && parts[0]) return parts[0];
  }
  // Fallback: clean out query parameters and take last segment
  const clean = str.split(/[?#&]/)[0].replace(/^https?:\/\//i, '').split('/').filter(Boolean).pop() || '';
  return clean.trim();
}

/**
 * Fetch live Discord invite info with member count & online presence count
 */
export async function fetchDiscordServerData(rawCodeOrUrl) {
  const code = extractInviteCode(rawCodeOrUrl);
  if (!code) return null;

  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`, {
      headers: {
        'User-Agent': 'GangBio/1.0',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) return null;
    const data = await res.json();
    const guild = data.guild;
    if (!guild) return null;

    const iconExt = guild.icon?.startsWith('a_') ? 'gif' : 'png';
    const bannerExt = guild.banner?.startsWith('a_') ? 'gif' : 'png';
    const splashExt = guild.splash?.startsWith('a_') ? 'gif' : 'png';

    const iconUrl = guild.icon 
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${iconExt}?size=256` 
      : null;
    
    const bannerUrl = guild.banner 
      ? `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.${bannerExt}?size=1024` 
      : (guild.splash ? `https://cdn.discordapp.com/splashes/${guild.id}/${guild.splash}.${splashExt}?size=1024` : null);

    return {
      code: data.code || code,
      guildId: guild.id,
      name: guild.name,
      description: guild.description || '',
      icon: iconUrl,
      banner: bannerUrl,
      memberCount: data.approximate_member_count || 0,
      presenceCount: data.approximate_presence_count || 0,
      inviteUrl: `https://discord.gg/${data.code || code}`
    };
  } catch (err) {
    console.error(`[discord] Failed to fetch server data for ${code}:`, err);
    return null;
  }
}

/**
 * Sync complete Discord User Profile: avatar, decoration, clan badge, status, guilds
 * Works with accessToken, profile object, and/or targetDiscordId + Lanyard
 */
export async function syncDiscordUserData(targetDiscordId, accessToken = null, profile = null) {
  if (!targetDiscordId && !profile?.id) return null;
  const discordId = targetDiscordId || profile?.id;

  let result = {
    discordId: discordId,
    username: '',
    displayName: '',
    avatar: '',
    avatarDecoration: '',
    badge: '',
    badgeIcon: '',
    statusText: '',
    discordStatus: 'offline',
    guildCount: 0,
    guilds: []
  };

  // 1. Extract directly from OAuth profile if passed from NextAuth
  if (profile) {
    result.username = profile.username || '';
    result.displayName = profile.global_name || profile.name || profile.username || '';
    if (profile.avatar) {
      const ext = profile.avatar.startsWith('a_') ? 'gif' : 'png';
      result.avatar = `https://cdn.discordapp.com/avatars/${discordId}/${profile.avatar}.${ext}?size=256`;
    }
    const decoAsset = profile.avatar_decoration_data?.asset;
    if (decoAsset) {
      result.avatarDecoration = `https://cdn.discordapp.com/avatar-decoration-presets/${decoAsset}.png?size=256&passthrough=true`;
    }
    const clan = profile.clan || profile.primary_guild;
    if (clan?.tag) {
      result.badge = clan.tag;
      if (clan.badge && clan.identity_guild_id) {
        result.badgeIcon = `https://cdn.discordapp.com/clan-badges/${clan.identity_guild_id}/${clan.badge}.png`;
      }
    }
  }

  // 2. If accessToken provided, call Discord OAuth APIs directly (@me & @me/guilds)
  if (accessToken) {
    try {
      const meRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store'
      });
      if (meRes.ok) {
        const me = await meRes.json();
        result.username = me.username || result.username;
        result.displayName = me.global_name || me.username || result.displayName;
        if (me.avatar && !result.avatar) {
          const ext = me.avatar.startsWith('a_') ? 'gif' : 'png';
          result.avatar = `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.${ext}?size=256`;
        }
        if (me.avatar_decoration_data?.asset && !result.avatarDecoration) {
          result.avatarDecoration = `https://cdn.discordapp.com/avatar-decoration-presets/${me.avatar_decoration_data.asset}.png?size=256&passthrough=true`;
        }
        const clan = me.clan || me.primary_guild;
        if (clan?.tag && !result.badge) {
          result.badge = clan.tag;
          if (clan.badge && clan.identity_guild_id) {
            result.badgeIcon = `https://cdn.discordapp.com/clan-badges/${clan.identity_guild_id}/${clan.badge}.png`;
          }
        }
      }
    } catch (e) {
      console.error('[discord] Error fetching @me:', e?.message);
    }

    try {
      const guildRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store'
      });
      if (guildRes.ok) {
        const guilds = await guildRes.json();
        if (Array.isArray(guilds)) {
          result.guildCount = guilds.length;
          result.guilds = guilds.slice(0, 10).map(g => ({
            id: g.id,
            name: g.name,
            icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null
          }));
          // If badge still empty, fallback to primary guild tag or first guild acronym
          if (!result.badge && guilds.length > 0) {
            const guildWithIcon = guilds.find(g => g.icon) || guilds[0];
            result.badge = guildWithIcon.name.substring(0, 8).toUpperCase();
            if (guildWithIcon.icon) {
              result.badgeIcon = `https://cdn.discordapp.com/icons/${guildWithIcon.id}/${guildWithIcon.icon}.png`;
            }
          }
        }
      }
    } catch (e) {
      console.error('[discord] Error fetching @me/guilds:', e?.message);
    }
  }

  // 3. Fetch live presence, custom status, clan tag, and decoration via Lanyard API
  try {
    const lanyardRes = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`, {
      cache: 'no-store'
    });
    if (lanyardRes.ok) {
      const lanyardJson = await lanyardRes.json();
      const d = lanyardJson?.data;
      if (d) {
        const user = d.discord_user;
        if (user) {
          result.username = result.username || user.username || user.global_name || '';
          result.displayName = result.displayName || user.display_name || user.global_name || user.username || '';
          if (user.avatar && !result.avatar) {
            const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
            result.avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
          }
          if (user.avatar_decoration_data?.asset) {
            result.avatarDecoration = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=256&passthrough=true`;
          }
          const clan = user.primary_guild || user.clan;
          if (clan?.tag) {
            result.badge = clan.tag;
            if (clan.badge && clan.identity_guild_id) {
              result.badgeIcon = `https://cdn.discordapp.com/clan-badges/${clan.identity_guild_id}/${clan.badge}.png`;
            }
          }
        }
        result.discordStatus = d.discord_status || 'offline';
        const customStatus = d.activities?.find(a => a.type === 4)?.state;
        if (customStatus) {
          result.statusText = customStatus;
        }
      }
    }
  } catch (e) {
    console.error('[discord] Lanyard fetch error:', e?.message);
  }

  return result;
}
