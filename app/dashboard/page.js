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
      memberData = isMember;
    } else if (isPending) {
      memberStatus = 'pending';
    } else {
      // Auto-submit application when logged into Discord so it immediately appears in Admin
      const newApp = {
        id: session.user.id,
        name: session.user.name || session.user.username || 'Discord User',
        username: session.user.username || session.user.name || '',
        avatar: session.user.image || 'https://cdn.discordapp.com/embed/avatars/0.png',
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
