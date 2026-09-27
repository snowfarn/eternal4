import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const apps = (await readJSON('applications.json')) || [];
    const members = (await readJSON('members.json')) || [];
    const memberIds = new Set(members.map(m => m.id));
    
    // CRITICAL: Filter out anyone who is already a member
    const pendingApps = apps.filter(a => !memberIds.has(a.id));
    
    // If there were stale entries, clean them up
    if (pendingApps.length !== apps.length) {
      await writeJSON('applications.json', pendingApps);
    }

    return NextResponse.json({
      success: true,
      applications: pendingApps,
      count: pendingApps.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, appId, appData } = body;

    // Always read fresh data from Redis
    const apps = (await readJSON('applications.json')) || [];
    const members = (await readJSON('members.json')) || [];
    const roles = (await readJSON('roles.json')) || [];

    if (action === 'approve') {
      const targetApp = appData || apps.find(a => a.id === appId);
      if (!targetApp) {
        return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
      }

      const memberIndex = members.findIndex(m => m.id === targetApp.id);
      
      // Query Discord/Lanyard with saved accessToken to get the absolute latest status and clan badge
      const { syncDiscordUserData } = await import('@/lib/discord');
      const rich = await syncDiscordUserData(targetApp.id, targetApp.accessToken).catch(() => null);

      const finalAvatar = rich?.avatar || targetApp.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
      const finalDecoration = rich?.avatarDecoration || targetApp.avatarDecoration || '';
      const finalBadge = rich?.badge || targetApp.discordBadge || '';
      const finalBadgeIcon = rich?.badgeIcon || targetApp.discordBadgeIcon || '';
      const finalStatusText = rich?.statusText || targetApp.discordStatusText || '';
      const finalUsername = rich?.username || targetApp.username || targetApp.name;
      const cleanSlug = (targetApp.name || '').toLowerCase().replace(/[^a-z0-9_-]/g, '') || targetApp.id;

      if (memberIndex === -1) {
        const newMember = {
          id: targetApp.id,
          name: targetApp.name || 'Member',
          slug: cleanSlug,
          avatar: finalAvatar,
          avatarDecoration: finalDecoration,
          roleId: roles[0]?.id || 'member',
          accessory: 'none',
          bio: 'New Syndicate Member',
          particleType: 'snow',
          particleColor: '#ffffff',
          cursorEffect: 'sparkle_trail',
          primaryColor: '#ff2a44',
          textColor: '#ffffff',
          cardStyle: 'glass',
          discordId: targetApp.id,
          discordUsername: finalUsername,
          discordStatusText: finalStatusText,
          discordBadge: finalBadge,
          discordBadgeIcon: finalBadgeIcon,
          views: 0,
          socials: {},
          createdAt: new Date().toISOString()
        };
        members.push(newMember);
      } else {
        // If already a member, refresh and update with newly pulled Discord info
        members[memberIndex] = {
          ...members[memberIndex],
          avatar: finalAvatar || members[memberIndex].avatar,
          avatarDecoration: finalDecoration || members[memberIndex].avatarDecoration || '',
          discordBadge: finalBadge || members[memberIndex].discordBadge || '',
          discordBadgeIcon: finalBadgeIcon || members[memberIndex].discordBadgeIcon || '',
          discordStatusText: finalStatusText || members[memberIndex].discordStatusText || '',
          discordUsername: finalUsername || members[memberIndex].discordUsername,
          updatedAt: new Date().toISOString()
        };
      }
      await writeJSON('members.json', members);

      // Always remove from applications (even if already member)
      const updatedApps = apps.filter(a => a.id !== targetApp.id);
      await writeJSON('applications.json', updatedApps);

      return NextResponse.json({
        success: true,
        message: alreadyMember ? 'Already a member, cleaned up application' : 'Application approved successfully',
        applications: updatedApps,
        members: members
      });
    }

    if (action === 'reject') {
      // Only remove the specific appId, not others
      const updatedApps = apps.filter(a => a.id !== appId);
      await writeJSON('applications.json', updatedApps);

      return NextResponse.json({
        success: true,
        message: 'Application rejected',
        applications: updatedApps
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
