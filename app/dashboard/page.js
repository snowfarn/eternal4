import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { getMembers, getApplications } from "@/lib/data";
import { applyToGang } from "@/lib/actions";
import ClientDashboard from "./ClientDashboard";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  let memberStatus = null; // null, 'pending', 'member'
  let memberData = null;

  if (session?.user) {
    const [members, apps] = await Promise.all([
      getMembers(),
      getApplications()
    ]);
    const isMember = members.find(m => m.id === session.user.id);
    const isPending = apps.find(a => a.id === session.user.id);

    if (isMember) {
      if (isMember.banned) {
        memberStatus = 'banned';
      } else {
        memberStatus = 'member';
      }
      
      // Auto-sync fresh Discord data for existing member
      try {
        const token = session.accessToken || session.user?.accessToken;
        const { syncDiscordUserData } = await import('@/lib/discord');
        const rich = await syncDiscordUserData(session.user.id, token).catch(() => null);
        if (rich) {
          const updated = {
            ...isMember,
            avatar: rich.avatar || isMember.avatar,
            avatarDecoration: rich.avatarDecoration || isMember.avatarDecoration || '',
            discordUsername: rich.username || isMember.discordUsername,
            discordBadge: rich.badge || isMember.discordBadge || '',
            discordBadgeIcon: rich.badgeIcon || isMember.discordBadgeIcon || '',
            discordStatusText: rich.statusText !== undefined && rich.statusText !== '' ? rich.statusText : (isMember.discordStatusText || ''),
            updatedAt: new Date().toISOString()
          };
          if (
            updated.avatarDecoration !== isMember.avatarDecoration ||
            updated.discordBadge !== isMember.discordBadge ||
            updated.discordBadgeIcon !== isMember.discordBadgeIcon ||
            updated.discordStatusText !== isMember.discordStatusText
          ) {
            const { writeJSON } = await import('@/lib/data');
            const idx = members.findIndex(m => m.id === session.user.id);
            if (idx !== -1) {
              members[idx] = updated;
              await writeJSON('members.json', members);
            }
          }
          memberData = updated;
        } else {
          memberData = isMember;
        }
      } catch {
        memberData = isMember;
      }
    } else if (isPending) {
      memberStatus = 'pending';
    } else {
      // Auto-submit application when logged into Discord so it immediately appears in Admin
      const token = session.accessToken || session.user?.accessToken;
      const { syncDiscordUserData } = await import('@/lib/discord');
      const rich = await syncDiscordUserData(session.user.id, token).catch(() => null);

      const newApp = {
        id: session.user.id,
        name: rich?.displayName || session.user.name || session.user.username || 'Discord User',
        username: rich?.username || session.user.username || session.user.name || '',
        avatar: rich?.avatar || session.user.image || 'https://cdn.discordapp.com/embed/avatars/0.png',
        avatarDecoration: rich?.avatarDecoration || '',
        discordBadge: rich?.badge || '',
        discordBadgeIcon: rich?.badgeIcon || '',
        discordStatusText: rich?.statusText || '',
        accessToken: token || '',
        appliedAt: new Date().toISOString()
      };
      await applyToGang(newApp);
      memberStatus = 'pending';
    }
  }

  return (
    <ClientDashboard 
      initialStatus={memberStatus} 
      initialMemberData={memberData} 
    />
  );
}
