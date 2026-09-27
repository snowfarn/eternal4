import { getSiteSettings, getRoles, getMemberByIdOrSlug, getMemberViews } from '@/lib/data';
import BioView from '@/components/BioView';
import { notFound } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Dynamic OpenGraph & Discord Embed Generation
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const member = await getMemberByIdOrSlug(id);
  const settings = await getSiteSettings();

  if (!member) {
    return {
      title: 'Operative Not Found | ' + (settings.siteName || 'Syndicate'),
      description: 'The requested operative profile could not be located.',
    };
  }

  if (member.banned) {
    return {
      title: 'Operative Suspended • Profile Banned | ' + (settings.siteName || 'Syndicate'),
      description: 'This operative account has been suspended by administration.',
    };
  }

  const siteName = settings.siteName || 'Slumzick';
  const displayName = member.name || 'Operative';
  const statusQuote = member.discordStatusText ? `"${member.discordStatusText}" ` : '';
  const bioText = statusQuote || member.bio || `${displayName} • Official Member Profile | ${siteName}`;
  const avatarImg = member.avatar || member.backgroundUrl || "https://cdn.discordapp.com/embed/avatars/0.png";

  return {
    title: `${displayName} • ${siteName}`,
    description: bioText,
    openGraph: {
      title: `${displayName} • ${siteName}`,
      description: bioText,
      images: [
        {
          url: avatarImg,
          width: 512,
          height: 512,
          alt: displayName,
        },
      ],
      type: 'profile',
      siteName: siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} • ${siteName}`,
      description: bioText,
      images: [avatarImg],
    },
  };
}

export async function generateViewport({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const member = await getMemberByIdOrSlug(id);
  const settings = await getSiteSettings();

  return {
    themeColor: member?.primaryColor || settings?.primaryColor || '#ff2a44',
  };
}

export default async function BioPage({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const member = await getMemberByIdOrSlug(id);
  if (!member) return notFound();

  // If member is banned, lock bio page
  if (member.banned) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#07070b] text-white p-6 relative overflow-hidden font-sans">
        <div className="fixed inset-0 -z-10" style={{ background: 'radial-gradient(circle at center, rgba(255,42,68,0.15) 0%, transparent 70%)' }} />
        <div className="max-w-md w-full p-8 rounded-3xl bg-black/60 border border-red-500/30 backdrop-blur-2xl text-center space-y-4 shadow-[0_0_50px_rgba(255,42,68,0.2)]">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(255,42,68,0.4)]">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-wider text-red-400 uppercase font-mono">
            ACCESS DENIED • PROFILE BANNED
          </h1>
          <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
            โปรไฟล์ของสมาชิกรายนี้ (<span className="text-white font-semibold">{member.name}</span>) ถูกระงับการใช้งานโดยผู้ดูแลระบบ จึงไม่สามารถเปิดดูหน้า Bio หรือข้อมูลได้ในขณะนี้
          </p>
          <div className="pt-4 border-t border-white/10 flex justify-center">
            <Link 
              href="/" 
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all hover:scale-105"
            >
              กลับสู่หน้าหลัก (Back to Home)
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [roles, settings, liveViews] = await Promise.all([
    getRoles(),
    getSiteSettings(),
    getMemberViews(member.id)
  ]);

  const displayViews = liveViews || member.views || 0;

  const role = roles.find(r => r.id === member.roleId) || null;
  const primaryColor = member.primaryColor || role?.color || '#ff2a44';
  const roleColor = (role?.color && role.color !== '#000000') ? role.color : primaryColor;
  const particleColor = member.particleColor || '#ffffff';

  // Background Media handling (MP4, WebM, GIF, JPG, PNG)
  const bgUrl = member.backgroundUrl || '';
  const isVideo = bgUrl && (bgUrl.endsWith('.mp4') || bgUrl.endsWith('.webm') || bgUrl.includes('video'));

  // Build unified social contacts list with real brand icons
  const contactLinks = [];

  // Roblox username / URL
  const robloxUsername = member.robloxUsername || 
    (member.socials?.roblox && !member.socials.roblox.includes('http') ? member.socials.roblox : null);

  const robloxUrl = member.socials?.roblox || member.robloxProfile || 
    (member.robloxUserId ? `https://www.roblox.com/users/${member.robloxUserId}/profile` : 
    (member.robloxUsername ? `https://www.roblox.com/search/users?keyword=${encodeURIComponent(member.robloxUsername)}` : null));

  if (robloxUrl) contactLinks.push({ platform: 'roblox', url: robloxUrl });

  // Discord profile link
  if (member.discordId) {
    contactLinks.push({ platform: 'discord', url: `https://discord.com/users/${member.discordId}` });
  }

  // Other social networks
  if (member.socials) {
    for (const [key, val] of Object.entries(member.socials)) {
      if (val && key !== 'roblox' && key !== 'discord') {
        contactLinks.push({ platform: key, url: val });
      }
    }
  }

  return (
    <BioView 
      member={member}
      role={role}
      primaryColor={primaryColor}
      roleColor={roleColor}
      particleColor={particleColor}
      displayViews={displayViews}
      bgUrl={bgUrl}
      isVideo={isVideo}
      contactLinks={contactLinks}
      robloxUsername={robloxUsername}
    />
  );
}
