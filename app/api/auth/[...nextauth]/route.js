import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { readJSON, writeJSON } from "@/lib/data";
import { syncDiscordUserData } from "@/lib/discord";

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      authorization: {
        params: {
          // Request identify & guilds scopes as requested by user
          scope: 'identify guilds'
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord' && (profile?.id || user?.id)) {
        try {
          const discordId = profile?.id || user?.id;
          const members = (await readJSON('members.json')) || [];
          const memberIdx = members.findIndex(m => m.id === discordId);
          
          // Pull rich details from Discord API + Profile + Lanyard
          const rich = await syncDiscordUserData(discordId, account?.access_token, profile).catch(() => null);

          // If already a member, auto-sync their Discord avatar, decoration, badge, and status immediately
          if (memberIdx !== -1) {
            console.log('[signIn] Existing member logged in, auto-updating Discord profile:', discordId);
            if (rich) {
              members[memberIdx] = {
                ...members[memberIdx],
                avatar: rich.avatar || members[memberIdx].avatar,
                avatarDecoration: rich.avatarDecoration || members[memberIdx].avatarDecoration || '',
                discordUsername: rich.username || members[memberIdx].discordUsername,
                discordBadge: rich.badge || members[memberIdx].discordBadge || '',
                discordBadgeIcon: rich.badgeIcon || members[memberIdx].discordBadgeIcon || '',
                discordStatusText: rich.statusText !== undefined && rich.statusText !== '' ? rich.statusText : (members[memberIdx].discordStatusText || ''),
                updatedAt: new Date().toISOString()
              };
              await writeJSON('members.json', members);
            }
            return true;
          }

          const apps = (await readJSON('applications.json')) || [];

          let avatarUrl = user?.image || 'https://cdn.discordapp.com/embed/avatars/0.png';
          if (profile?.avatar) {
            const ext = profile.avatar.startsWith('a_') ? 'gif' : 'png';
            avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${profile.avatar}.${ext}?size=256`;
          }
          if (rich?.avatar) avatarUrl = rich.avatar;

          const displayName = profile?.global_name || rich?.displayName || profile?.username || user?.name || 'Discord User';
          const username = profile?.username || rich?.username || user?.name || '';

          const appRecord = {
            id: discordId,
            name: displayName,
            username: username,
            avatar: avatarUrl,
            avatarDecoration: rich?.avatarDecoration || '',
            discordBadge: rich?.badge || '',
            discordBadgeIcon: rich?.badgeIcon || '',
            discordStatusText: rich?.statusText || '',
            accessToken: account?.access_token || '',
            appliedAt: new Date().toISOString()
          };

          const existingIdx = apps.findIndex(a => a.id === discordId);
          if (existingIdx !== -1) {
            apps[existingIdx] = {
              ...apps[existingIdx],
              ...appRecord,
              updatedAt: new Date().toISOString()
            };
          } else {
            apps.push(appRecord);
          }
          await writeJSON('applications.json', apps);
        } catch (e) {
          console.error('[signIn] ERROR:', e);
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.id = profile.id;
        token.username = profile.username;
        token.global_name = profile.global_name;
        token.discriminator = profile.discriminator;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub || token.id;
        session.user.username = token.username;
        session.user.global_name = token.global_name;
        session.accessToken = token.accessToken;
        session.user.accessToken = token.accessToken;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 3600, // 1 hour
  },
  jwt: {
    maxAge: 3600, // 1 hour
  },
  secret: process.env.NEXTAUTH_SECRET || "super-secret-gang-key-12345",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
