import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { readJSON, writeJSON } from '@/lib/data';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  return handleSync(userId);
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  return handleSync(body.userId);
}

async function handleSync(requestedUserId) {
  try {
    const session = await getServerSession(authOptions);
    const targetUserId = requestedUserId || session?.user?.id || '1471173112409096269';

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    let syncedData = {
      discordId: targetUserId,
      username: session?.user?.name || '',
      displayName: '',
      avatar: session?.user?.image || '',
      avatarDecoration: '',
      banner: '',
      statusText: '',
      badge: '',
      discordStatus: 'online',
      guildCount: 0,
      guilds: [],
      syncedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      hasGuildScope: Boolean(session?.user?.accessToken)
    };

    // 1. Fetch from Lanyard API (Real-time gateway presence, custom status, activity, avatar decoration, primary guild tag)
    try {
      const lanyardRes = await fetch(`https://api.lanyard.rest/v1/users/${targetUserId}`, {
        cache: 'no-store'
      });
      if (lanyardRes.ok) {
        const lanyardJson = await lanyardRes.json();
        const d = lanyardJson?.data;
        if (d) {
          const user = d.discord_user;
          if (user) {
            syncedData.username = user.username || user.global_name || syncedData.username;
            syncedData.displayName = user.display_name || user.global_name || user.username;
            if (user.avatar) {
              const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
              syncedData.avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
            }
            // Discord Avatar Decoration / กรอบโปรไฟล์ Discord
            if (user.avatar_decoration_data?.asset) {
              syncedData.avatarDecoration = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=256&passthrough=true`;
            }
            if (user.primary_guild?.tag) {
              syncedData.badge = user.primary_guild.tag;
            }
            if (user.primary_guild?.badge && user.primary_guild?.identity_guild_id) {
              syncedData.badgeIcon = `https://cdn.discordapp.com/clan-badges/${user.primary_guild.identity_guild_id}/${user.primary_guild.badge}.png`;
            }
          }

          syncedData.discordStatus = d.discord_status || 'online';

          // Extract live custom status note only (Do not sync Spotify or game activity as requested)
          const customStatus = d.activities?.find(a => a.type === 4)?.state;
          syncedData.statusText = customStatus || '';
          syncedData.note = customStatus || '';
        }
      }
    } catch (e) {
      console.error('Lanyard sync error:', e);
    }

    // 2. If access token available from session, check Discord @me & Guilds API
    const accessToken = session?.accessToken || session?.user?.accessToken;
    if (accessToken) {
      try {
        // Fetch current authenticated user to get direct avatar & avatar decoration
        const meRes = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store'
        });
        if (meRes.ok) {
          const meUser = await meRes.json();
          if (meUser) {
            if (meUser.avatar_decoration_data?.asset && !syncedData.avatarDecoration) {
              syncedData.avatarDecoration = `https://cdn.discordapp.com/avatar-decoration-presets/${meUser.avatar_decoration_data.asset}.png?size=256&passthrough=true`;
            }
            if (meUser.avatar && (!syncedData.avatar || syncedData.avatar.includes('embed/avatars'))) {
              const ext = meUser.avatar.startsWith('a_') ? 'gif' : 'png';
              syncedData.avatar = `https://cdn.discordapp.com/avatars/${meUser.id}/${meUser.avatar}.${ext}?size=256`;
            }
            if (meUser.banner) {
              const ext = meUser.banner.startsWith('a_') ? 'gif' : 'png';
              syncedData.banner = `https://cdn.discordapp.com/banners/${meUser.id}/${meUser.banner}.${ext}?size=1024`;
            }
            const clan = meUser.clan || meUser.primary_guild;
            if (clan?.tag && !syncedData.badge) {
              syncedData.badge = clan.tag;
              if (clan.badge && clan.identity_guild_id) {
                syncedData.badgeIcon = `https://cdn.discordapp.com/clan-badges/${clan.identity_guild_id}/${clan.badge}.png`;
              }
            }
          }
        }
      } catch (e) {
        console.error('Discord @me error:', e);
      }

      try {
        const guildRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store'
        });
        if (guildRes.ok) {
          const guilds = await guildRes.json();
          if (Array.isArray(guilds)) {
            syncedData.guildCount = guilds.length;
            syncedData.guilds = guilds.slice(0, 10).map(g => ({
              id: g.id,
              name: g.name,
              icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null
            }));
            // If badge is still empty, use user's first guild name or acronym
            if (!syncedData.badge && guilds.length > 0) {
              const guildWithIcon = guilds.find(g => g.icon) || guilds[0];
              syncedData.badge = guildWithIcon.name.substring(0, 8).toUpperCase();
              if (guildWithIcon.icon) {
                syncedData.badgeIcon = `https://cdn.discordapp.com/icons/${guildWithIcon.id}/${guildWithIcon.icon}.png`;
              }
            }
          }
        }
      } catch (e) {
        console.error('Discord guilds error:', e);
      }
    }

    // Auto-persist into members.json so member profile stays in sync immediately
    try {
      const members = (await readJSON('members.json')) || [];
      const mIdx = members.findIndex(m => m && (m.id === targetUserId || m.discordId === targetUserId));
      if (mIdx !== -1) {
        members[mIdx] = {
          ...members[mIdx],
          avatar: syncedData.avatar || members[mIdx].avatar,
          avatarDecoration: syncedData.avatarDecoration || members[mIdx].avatarDecoration || '',
          discordUsername: syncedData.username || members[mIdx].discordUsername,
          discordBadge: syncedData.badge || members[mIdx].discordBadge || '',
          discordBadgeIcon: syncedData.badgeIcon || members[mIdx].discordBadgeIcon || '',
          discordStatusText: (syncedData.statusText !== undefined && syncedData.statusText !== '') ? syncedData.statusText : (members[mIdx].discordStatusText || ''),
          updatedAt: new Date().toISOString()
        };
        await writeJSON('members.json', members);
      }
    } catch (e) {
      console.error('Failed to auto-persist synced Discord data:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...syncedData,
        // Aliases for dashboard compatibility (some fields checked by both names)
        avatarUrl: syncedData.avatar,
        customStatus: syncedData.statusText,
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
