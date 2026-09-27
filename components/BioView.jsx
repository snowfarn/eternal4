'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  Eye,
  Sparkles,
  Crown,
  Flame,
  Star,
  Zap,
  Swords,
  Crosshair,
  Gem,
  Ghost,
  Trophy,
  User,
  Award
} from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import CursorEffect from '@/components/CursorEffect';
import DiscordWidget from '@/components/DiscordWidget';
import RobloxWidget from '@/components/RobloxWidget';
import BioMusicPlayer from '@/components/BioMusicPlayer';
import DiscordServerWidget from '@/components/DiscordServerWidget';
import { SocialBrandButton, BRAND_SVGS } from '@/components/BrandIcons';

const ICON_MAP = {
  Crown,
  Shield,
  Flame,
  Star,
  Zap,
  Swords,
  Crosshair,
  Gem,
  Ghost,
  Trophy,
  User,
  Award,
  Sparkles
};

export default function BioView({
  member,
  role,
  primaryColor,
  roleColor,
  particleColor,
  displayViews,
  bgUrl,
  isVideo,
  contactLinks,
  robloxUsername,
  previewMode = false
}) {
  const textColor = member.textColor || '#ffffff';
  const cardStyle = member.cardStyle || 'glass';

  // Memoized so a fresh array instance (or the `|| []` fallback) never re-triggers the
  // particle engine effect, which would clear and respawn every sprite on each render.
  const customParticleImages = useMemo(
    () => (Array.isArray(member.customParticleImages) ? member.customParticleImages.filter(Boolean) : []),
    [member.customParticleImages]
  );



  // Avatar decoration display placements (both, top_only, bottom_only, none)
  const showTopDecoration = member.showAvatarDecoration !== 'none' && member.showAvatarDecoration !== 'bottom_only';
  const showBottomDecoration = member.showAvatarDecoration !== 'none' && member.showAvatarDecoration !== 'top_only';

  // Live view tracking with micro-animation & anti-spam cooldown (Skipped in PREVIEW mode!)
  const [currentViews, setCurrentViews] = useState(displayViews || 0);
  const [justIncremented, setJustIncremented] = useState(false);
  const viewsToDisplay = Math.max(currentViews, typeof displayViews === 'number' ? displayViews : 0);

  useEffect(() => {
    // PREVENT view increment when viewing in dashboard preview!
    if (previewMode || !member?.id) return;

    const sessionKey = `viewed_${member.id}`;
    const lastViewed = sessionStorage.getItem(sessionKey);
    const now = Date.now();
    const shouldIncrement = !lastViewed || (now - parseInt(lastViewed, 10) > 45000);

    if (shouldIncrement) {
      sessionStorage.setItem(sessionKey, now.toString());
      fetch(`/api/views/${member.id}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.success && typeof data.views === 'number') {
            setCurrentViews(data.views);
            setJustIncremented(true);
            setTimeout(() => setJustIncremented(false), 2500);
          }
        })
        .catch(() => { });
    }
  }, [member?.id, displayViews, previewMode]);

  // Asynchronous contact link click tracking (Skipped in PREVIEW mode)
  const handleSocialClick = (platform, url, e) => {
    if (previewMode) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    try {
      if (member?.id && platform) {
        fetch(`/api/analytics/${member.id}/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform }),
          keepalive: true
        }).catch(() => { });
      }
    } catch { }
  };

  const RoleIcon = (role?.icon && ICON_MAP[role.icon]) ? ICON_MAP[role.icon] : Shield;

  // Filter out roblox from contactLinks if we display the full gun.lol RobloxWidget
  const filteredSocialLinks = contactLinks.filter(item => item.platform !== 'roblox' && item.platform !== 'discord');

  // UI box glassmorphism style classes based on user custom preference
  const bioBoxClasses = cardStyle === 'transparent'
    ? 'bg-transparent border border-transparent shadow-none'
    : cardStyle === 'ultra_glass'
      ? 'bg-black/15 backdrop-blur-md border border-white/10 shadow-sm'
      : cardStyle === 'dark'
        ? 'bg-black/85 backdrop-blur-3xl border border-white/20 shadow-lg'
        : 'bg-black/45 backdrop-blur-2xl border border-white/10 shadow-sm';

  const counterBoxClasses = cardStyle === 'transparent'
    ? 'bg-transparent border border-white/10'
    : cardStyle === 'ultra_glass'
      ? 'bg-black/20 backdrop-blur-md border border-white/10'
      : cardStyle === 'dark'
        ? 'bg-black/85 backdrop-blur-3xl border border-white/20'
        : 'bg-black/55 backdrop-blur-2xl border border-white/15';

  const profileLayout = member.profileContainerStyle || member.profileLayout || 'contained';
  const isMasterCardOn = profileLayout !== 'floating';
  const hasRoblox = Boolean(robloxUsername || member.robloxUsername || member.robloxUserId);
  const socialsInBentoTile = isMasterCardOn && !hasRoblox && filteredSocialLinks.length > 0 && member.socialsLayout !== 'stacked_cards' && filteredSocialLinks.length <= 6;

  // Real-time Discord presence & auto-sync hook for live avatar, decoration, and clan tag
  const [liveLanyard, setLiveLanyard] = useState(null);
  const targetDiscordId = member.discordId || member.id;

  useEffect(() => {
    if (!targetDiscordId) return;
    let isMounted = true;

    const fetchLiveDiscord = async () => {
      try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${targetDiscordId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json?.data) {
            setLiveLanyard(json.data);
            const user = json.data.discord_user;
            if (user) {
              const liveDeco = user.avatar_decoration_data?.asset
                ? `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=256&passthrough=true`
                : '';
              const liveTag = user.primary_guild?.tag || user.clan?.tag || '';
              const liveStatus = json.data.activities?.find(a => a.type === 4)?.state || '';

              // If Discord decoration, clan tag, or custom status changed/detected, auto-sync to server in the background
              if (
                (liveDeco && liveDeco !== (member.avatarDecoration || '')) ||
                (liveTag && liveTag !== (member.discordBadge || '')) ||
                (liveStatus && liveStatus !== (member.discordStatusText || ''))
              ) {
                fetch('/api/discord/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: targetDiscordId }),
                  keepalive: true
                }).catch(() => { });
              }
            }
          }
        }
      } catch { }
    };

    fetchLiveDiscord();
    const interval = setInterval(fetchLiveDiscord, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [targetDiscordId, member.avatarDecoration, member.discordBadge]);

  // Derived live Discord values (prioritize real-time Discord state when loaded)
  const hasLiveLanyard = Boolean(liveLanyard?.discord_user);
  const liveAvatar = hasLiveLanyard && liveLanyard.discord_user.avatar
    ? `https://cdn.discordapp.com/avatars/${liveLanyard.discord_user.id}/${liveLanyard.discord_user.avatar}.${liveLanyard.discord_user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
    : (member.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png');

  const liveAvatarDecoration = hasLiveLanyard
    ? (liveLanyard.discord_user.avatar_decoration_data?.asset
      ? `https://cdn.discordapp.com/avatar-decoration-presets/${liveLanyard.discord_user.avatar_decoration_data.asset}.png?size=256&passthrough=true`
      : '')
    : (member.avatarDecoration || '');

  const liveClanTag = hasLiveLanyard
    ? (liveLanyard.discord_user.primary_guild?.tag || (member.discordBadge && member.discordBadge !== 'REAL' ? member.discordBadge : ''))
    : (member.discordBadge || '');

  const liveClanBadgeIcon = hasLiveLanyard
    ? (liveLanyard.discord_user.primary_guild?.badge && liveLanyard.discord_user.primary_guild?.identity_guild_id
      ? `https://cdn.discordapp.com/clan-badges/${liveLanyard.discord_user.primary_guild.identity_guild_id}/${liveLanyard.discord_user.primary_guild.badge}.png`
      : '')
    : (member.discordBadgeIcon || '');

  const masterCardBgClasses = cardStyle === 'transparent'
    ? 'bg-transparent border border-white/10 shadow-none'
    : cardStyle === 'ultra_glass'
      ? 'bg-black/25 backdrop-blur-xl border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)]'
      : cardStyle === 'dark'
        ? 'bg-[#09090e]/95 backdrop-blur-3xl border border-white/20 shadow-[0_30px_70px_rgba(0,0,0,0.95)]'
        : 'bg-black/50 backdrop-blur-3xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.85)]';

  return (
    <main className="min-h-screen flex flex-col relative items-center justify-center p-4 sm:p-6 pb-16 overflow-x-hidden font-sans select-none">
      {/* Background Media Engine */}
      {isVideo ? (
        <>
          <video
            autoPlay
            loop
            muted
            playsInline
            src={bgUrl}
            className="fixed inset-0 w-full h-full object-cover -z-20 pointer-events-none"
            style={{ filter: (member.bgBlur ?? 0) > 0 ? `blur(${member.bgBlur}px)` : undefined }}
          />
          {(member.bgDarkness ?? 50) > 0 && (
            <div
              className="fixed inset-0 -z-20 pointer-events-none"
              style={{ backgroundColor: `rgba(0, 0, 0, ${(member.bgDarkness ?? 50) / 100})` }}
            />
          )}
        </>
      ) : bgUrl ? (
        <div
          className="fixed inset-0 -z-20 bg-[#040407] bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, ${(member.bgDarkness ?? 50) / 100}), rgba(4, 4, 7, ${Math.min(0.98, ((member.bgDarkness ?? 50) / 100) + 0.25)})), url(${bgUrl})`,
            filter: (member.bgBlur ?? 0) > 0 ? `blur(${member.bgBlur}px)` : undefined
          }}
        />
      ) : (
        <div className="fixed inset-0 -z-20 bg-gradient-to-b from-[#08080c] via-[#040407] to-black pointer-events-none" />
      )}

      {/* Atmospheric Vignette & Contrast Depth */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 35%, rgba(0, 0, 0, 0.6) 80%, rgba(0, 0, 0, 0.95) 100%)'
        }}
      />

      {/* Particle Atmosphere (Skipped in dashboard preview to keep UI 100% smooth) */}
      {!previewMode && (
        <ParticleBackground
          type={member.particleType || 'none'}
          color={particleColor}
          customImages={customParticleImages}
          emitDirection={member.particleEmitDirection || 'all'}
          particleSize={member.particleSize || 'medium'}
        />
      )}

      {/* Interactive Mouse Cursor Trail Effect (Skipped in dashboard preview) */}
      {!previewMode && (
        <CursorEffect type={member.cursorEffect || 'none'} color={primaryColor} />
      )}

      {/* Top Floating Back Navigation */}
      <Link
        href={previewMode ? '#' : '/members'}
        prefetch={!previewMode}
        onClick={(e) => { if (previewMode) e.preventDefault(); }}
        className={`fixed top-4 left-4 sm:top-6 sm:left-6 text-white/80 hover:text-white transition-all z-40 flex items-center gap-2 font-bold text-xs bg-black/60 border border-white/15 px-3.5 sm:px-4 py-2 rounded-full backdrop-blur-2xl hover:bg-white/10 shadow-xl group ${previewMode ? 'pointer-events-none' : ''}`}
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform text-[#ff2a44]" />
        <span className="tracking-wider uppercase font-mono text-[11px]">ROSTER</span>
      </Link>

      {/* Master Profile Container (ตามรูปตัวอย่าง Gun.lol กล่องสี่เหลี่ยมครอบทั้งหมด หรือ มินิมอลลอย / ไซเบอร์ / แคปซูล) */}
      <div
        className={
          !isMasterCardOn
            ? 'w-full max-w-[460px] z-10 relative flex flex-col items-center text-center my-auto pt-4 sm:pt-6'
            : profileLayout === 'cyber_hud'
              ? `w-full max-w-[540px] sm:max-w-[570px] z-10 relative flex flex-col items-center text-center my-auto p-5 sm:p-7 rounded-2xl transition-all duration-300 border border-white/15 relative ${masterCardBgClasses}`
              : profileLayout === 'compact_dock'
                ? `w-full max-w-[440px] sm:max-w-[480px] z-10 relative flex flex-col items-center text-center my-auto p-4 sm:p-6 rounded-[28px] transition-all duration-300 ${masterCardBgClasses}`
                : `w-full max-w-[540px] sm:max-w-[570px] z-10 relative flex flex-col items-center text-center my-auto p-5 sm:p-7 rounded-[32px] sm:rounded-[36px] transition-all duration-300 ${masterCardBgClasses}`
        }
        style={
          !isMasterCardOn
            ? undefined
            : profileLayout === 'cyber_hud'
              ? { boxShadow: `0 0 35px ${primaryColor}20, inset 0 0 20px ${primaryColor}10` }
              : cardStyle === 'transparent'
                ? undefined
                : { boxShadow: '0 25px 60px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,255,255,0.15)' }
        }
      >
        {/* Cyber HUD Corner Brackets */}
        {profileLayout === 'cyber_hud' && (
          <>
            <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2" style={{ borderColor: primaryColor }} />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2" style={{ borderColor: primaryColor }} />
            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2" style={{ borderColor: primaryColor }} />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2" style={{ borderColor: primaryColor }} />
          </>
        )}

        {/* Top Header Bar inside Card: Clan Tag / Verified on Left + View Counter on Right */}
        {isMasterCardOn && (
          <div className="w-full flex items-center justify-between gap-2 mb-3">
            {profileLayout === 'cyber_hud' ? (
              <span className="text-[10px] font-mono font-bold tracking-widest flex items-center gap-1.5" style={{ color: primaryColor }}>
                <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: primaryColor }} />
                OPERATIVE // VERIFIED
              </span>
            ) : liveClanTag ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] sm:text-[11px] font-mono font-bold text-white shadow-sm">
                {liveClanBadgeIcon ? (
                  <img src={liveClanBadgeIcon} alt="" className="w-3.5 h-3.5 object-contain rounded shrink-0" />
                ) : (
                  <span className="text-[11px]">🛡️</span>
                )}
                <span className="tracking-wider uppercase">{liveClanTag}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono tracking-widest text-white/60">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span>{role ? role.name.toUpperCase() : 'VERIFIED BIO'}</span>
              </div>
            )}

            {/* Top-Right Glowing View Counter */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider select-none transition-all duration-300 ${counterBoxClasses} ${justIncremented ? 'ring-2 ring-emerald-400/50 scale-105 shadow-[0_0_15px_rgba(52,211,153,0.4)]' : ''
                }`}
              style={{ color: `${textColor}cc` }}
            >
              <Eye
                size={12}
                className={`transition-colors duration-300 ${justIncremented ? 'text-emerald-400 animate-pulse' : ''}`}
                style={!justIncremented ? { color: `${textColor}99` } : {}}
              />
              <span className={`transition-colors duration-300 ${justIncremented ? 'text-emerald-300 font-extrabold' : ''}`}>
                {viewsToDisplay}
              </span>
              {justIncremented && (
                <span className="text-[10px] text-emerald-400 font-bold animate-bounce ml-0.5">
                  +1
                </span>
              )}
            </div>
          </div>
        )}

        {/* Profile Avatar with Discord Frame / Custom Decoration */}
        <div className="relative mb-3 group cursor-pointer">
          {/* Ambient Glow */}
          <div
            className="absolute -inset-2 rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none"
            style={{ backgroundColor: primaryColor }}
          />

          {/* Core Avatar Frame — 100% Circular Precision with Discord 120% Overlay */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.8)] flex items-center justify-center shrink-0">
            <img
              src={liveAvatar}
              className={`w-full h-full rounded-full object-cover block ${showTopDecoration && liveAvatarDecoration ? '' : 'border-4 border-[#07070a]'}`}
              alt={member.name}
            />
            {/* Discord Avatar Decoration (288x288 canvas over 240x240 avatar = exactly 120% at -10% offset, max-w-none allows overflow) */}
            {showTopDecoration && liveAvatarDecoration && (
              <img
                src={(liveAvatarDecoration.startsWith('http') ? liveAvatarDecoration : `https://cdn.discordapp.com/avatar-decoration-presets/${liveAvatarDecoration}.png?size=256&passthrough=true`).replace('passthrough=false', 'passthrough=true')}
                alt=""
                className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] max-w-none max-h-none pointer-events-none z-20 object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]"
              />
            )}
          </div>
        </div>

        {/* Display Name with Custom Font Color */}
        <h1
          className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1"
          style={{
            color: textColor,
            textShadow: `0 0 16px ${textColor}90, 0 0 35px ${primaryColor}70`
          }}
        >
          {member.name}
        </h1>

        {/* Syndicate Role Tag */}
        {role && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 border shadow-sm backdrop-blur-md"
            style={{
              color: role.color || roleColor,
              borderColor: `${role.color || roleColor}60`,
              backgroundColor: `${role.color || roleColor}18`,
              boxShadow: `0 0 12px ${role.color || roleColor}25`
            }}
          >
            {role.icon && (role.icon.startsWith('http') || role.icon.startsWith('/')) ? (
              <img src={role.icon} alt="" className="w-3 h-3 object-contain shrink-0" />
            ) : (
              <RoleIcon size={11} className="shrink-0" />
            )}
            <span>{role.name}</span>
          </div>
        )}

        {/* Bio Description / Slogan with Customizable Glass Box */}
        {member.bio && (
          <div className="max-w-xs sm:max-w-sm w-full px-2 mb-3">
            <p
              className={`text-xs sm:text-sm font-light leading-relaxed py-1.5 px-3.5 rounded-xl inline-block transition-all ${bioBoxClasses}`}
              style={{ color: `${textColor}e0` }}
            >
              {member.bio}
            </p>
          </div>
        )}

        {/* Connected Profile Widgets: Bento Grid Composition when Master Card ON */}
        {isMasterCardOn ? (
          hasRoblox ? (
            /* Bento Grid 2-Column: Discord (Col 1) + Roblox (Col 2) side-by-side */
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-1 mb-3">
              <div className="w-full flex">
                <DiscordWidget
                  discordId={member.discordId || member.id}
                  customUsername={member.discordUsername}
                  customStatusText={member.discordStatusText}
                  customBadge={liveClanTag}
                  customBadgeIcon={liveClanBadgeIcon || member.discordBadgeIcon}
                  avatarFallback={liveAvatar}
                  avatarDecoration={liveAvatarDecoration}
                  showDecoration={showBottomDecoration}
                  primaryColor={primaryColor}
                  textColor={textColor}
                  cardStyle={cardStyle}
                  className="w-full justify-start"
                />
              </div>
              <div className="w-full flex">
                <RobloxWidget
                  username={robloxUsername || member.robloxUsername}
                  userId={member.robloxUserId}
                  primaryColor={primaryColor}
                  textColor={textColor}
                  cardStyle={cardStyle}
                  className="w-full justify-start"
                />
              </div>
            </div>
          ) : socialsInBentoTile ? (
            /* Bento Grid 2-Column: Discord (Col 1) + Social Channels Tile (Col 2) side-by-side */
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-1 mb-3">
              <div className="w-full flex">
                <DiscordWidget
                  discordId={member.discordId || member.id}
                  customUsername={member.discordUsername}
                  customStatusText={member.discordStatusText}
                  customBadge={liveClanTag}
                  customBadgeIcon={liveClanBadgeIcon || member.discordBadgeIcon}
                  avatarFallback={liveAvatar}
                  avatarDecoration={liveAvatarDecoration}
                  showDecoration={showBottomDecoration}
                  primaryColor={primaryColor}
                  textColor={textColor}
                  cardStyle={cardStyle}
                  className="w-full justify-start"
                />
              </div>
              <div className={`w-full flex flex-col justify-center items-center p-3 rounded-2xl transition-all ${cardStyle === 'transparent' ? 'border border-white/10' :
                  cardStyle === 'ultra_glass' ? 'bg-black/20 backdrop-blur-md border border-white/10' :
                    cardStyle === 'dark' ? 'bg-black/85 backdrop-blur-3xl border border-white/20' :
                      'bg-black/55 backdrop-blur-2xl border border-white/15'
                }`}>
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <span>CONNECT CHANNELS</span>
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {filteredSocialLinks.map((item, idx) => {
                    const brand = BRAND_SVGS[item.platform.toLowerCase()] || { color: primaryColor, glow: primaryColor, name: item.platform, svg: null };
                    return (
                      <a
                        key={`${item.platform}-${idx}`}
                        href={previewMode ? '#' : item.url}
                        target={previewMode ? '_self' : '_blank'}
                        rel="noopener noreferrer"
                        onClick={(e) => handleSocialClick(item.platform, item.url, e)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all group ${previewMode ? 'cursor-default' : 'hover:scale-115 hover:shadow-lg cursor-pointer'
                          }`}
                        style={{ background: cardStyle === 'transparent' ? 'transparent' : `${brand.color}18` }}
                        title={item.platform}
                      >
                        <span className="w-4 h-4 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full transition-transform group-hover:scale-110" style={{ color: brand.color }}>
                          {brand.svg || <SocialBrandButton platform={item.platform} url={item.url} asIcon />}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Discord Centered inside Master Card */
            <div className="w-full max-w-[420px] flex justify-center mb-3">
              <DiscordWidget
                discordId={member.discordId || member.id}
                customUsername={member.discordUsername}
                customStatusText={member.discordStatusText}
                customBadge={liveClanTag}
                customBadgeIcon={liveClanBadgeIcon || member.discordBadgeIcon}
                avatarFallback={liveAvatar}
                avatarDecoration={liveAvatarDecoration}
                showDecoration={showBottomDecoration}
                primaryColor={primaryColor}
                textColor={textColor}
                cardStyle={cardStyle}
                className="w-full justify-start"
              />
            </div>
          )
        ) : (
          /* Classic Floating Mode: Vertical stack of connected widgets */
          <div className="w-full flex flex-col items-center gap-2.5 px-2 mb-3">
            <DiscordWidget
              discordId={member.discordId || member.id}
              customUsername={member.discordUsername}
              customStatusText={member.discordStatusText}
              customBadge={liveClanTag}
              customBadgeIcon={liveClanBadgeIcon || member.discordBadgeIcon}
              avatarFallback={liveAvatar}
              avatarDecoration={liveAvatarDecoration}
              showDecoration={showBottomDecoration}
              primaryColor={primaryColor}
              textColor={textColor}
              cardStyle={cardStyle}
            />
            {hasRoblox && (
              <RobloxWidget
                username={robloxUsername || member.robloxUsername}
                userId={member.robloxUserId}
                primaryColor={primaryColor}
                textColor={textColor}
                cardStyle={cardStyle}
              />
            )}
          </div>
        )}

        {/* Other Social Contacts: 4 Rich Symmetrical & Dynamic Layouts */}
        {filteredSocialLinks.length > 0 && !socialsInBentoTile && (
          <div className="w-full max-w-[420px] px-2 mb-3">
            {member.socialsLayout === 'floating_dock' || member.socialsLayout === 'dock' ? (
              /* 2. Floating Glass Dock — Sleek macOS-style bar with frosted glass icons */
              <div className="w-full max-w-[400px] mx-auto">
                <div className={`flex items-center justify-center gap-1.5 p-2 rounded-2xl transition-all duration-300 ${cardStyle === 'transparent'
                    ? 'bg-transparent border border-white/10 shadow-none'
                    : cardStyle === 'ultra_glass'
                      ? 'bg-black/15 backdrop-blur-md border border-white/10 shadow-sm'
                      : cardStyle === 'dark'
                        ? 'bg-black/85 backdrop-blur-3xl border border-white/20 shadow-lg'
                        : 'bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]'
                  }`}>
                  {filteredSocialLinks.map((item, idx) => {
                    const brand = BRAND_SVGS[item.platform.toLowerCase()] || { color: primaryColor, glow: primaryColor, name: item.platform, svg: null };
                    return (
                      <a
                        key={`${item.platform}-${idx}`}
                        href={previewMode ? '#' : item.url}
                        target={previewMode ? '_self' : '_blank'}
                        rel="noopener noreferrer"
                        onClick={(e) => handleSocialClick(item.platform, item.url, e)}
                        className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${previewMode ? 'cursor-default' : 'cursor-pointer hover:-translate-y-2 hover:shadow-[0_8px_24px_rgba(0,0,0,0.8)]'}`}
                        style={{
                          background: cardStyle === 'transparent' ? 'transparent' : `linear-gradient(135deg, ${brand.color}15 0%, ${brand.color}08 100%)`,
                        }}
                        title={item.platform}
                      >
                        <span
                          className="w-5 h-5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full transition-all duration-300 group-hover:scale-125 group-hover:drop-shadow-[0_0_10px_currentColor]"
                          style={{ color: brand.color }}
                        >
                          {brand.svg || <SocialBrandButton platform={item.platform} url={item.url} asIcon />}
                        </span>
                        {/* Hover tooltip */}
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 border border-white/20 text-[9px] font-mono text-white capitalize opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                          {item.platform}
                        </span>
                        {/* Active indicator dot */}
                        <span
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                          style={{ backgroundColor: brand.color, boxShadow: `0 0 6px ${brand.color}` }}
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : member.socialsLayout === 'stacked_cards' ? (
              /* 3. Stacked Glass Cards — Premium horizontal cards that match cardStyle */
              <div className="flex flex-col gap-2 w-full max-w-[380px] mx-auto">
                {filteredSocialLinks.map((item, idx) => {
                  const brand = BRAND_SVGS[item.platform.toLowerCase()] || { color: primaryColor, glow: primaryColor, name: item.platform, svg: null };
                  const cardBgClass = cardStyle === 'transparent'
                    ? 'border border-white/10 hover:border-white/25 shadow-none'
                    : cardStyle === 'ultra_glass'
                      ? 'border border-white/10 hover:border-white/25 backdrop-blur-md shadow-sm'
                      : cardStyle === 'dark'
                        ? 'border border-white/20 hover:border-white/30 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.8)]'
                        : 'border border-white/10 hover:border-white/25 backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]';

                  const cardBgGradient = cardStyle === 'transparent'
                    ? `linear-gradient(135deg, ${brand.color}12 0%, transparent 60%)`
                    : cardStyle === 'ultra_glass'
                      ? `linear-gradient(135deg, ${brand.color}0A 0%, transparent 60%), rgba(0,0,0,0.15)`
                      : cardStyle === 'dark'
                        ? `linear-gradient(135deg, ${brand.color}0A 0%, transparent 60%), rgba(0,0,0,0.85)`
                        : `linear-gradient(135deg, ${brand.color}0A 0%, transparent 60%), rgba(0,0,0,0.5)`;

                  return (
                    <a
                      key={`${item.platform}-${idx}`}
                      href={previewMode ? '#' : item.url}
                      target={previewMode ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                      onClick={(e) => handleSocialClick(item.platform, item.url, e)}
                      className={`group flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden ${cardBgClass} ${previewMode ? 'cursor-default' : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.7)]'}`}
                      style={{
                        background: cardBgGradient,
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center p-1.5 border border-white/10 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:border-white/30"
                        style={{
                          backgroundColor: `${brand.color}18`,
                          boxShadow: `0 0 16px ${brand.color}20`
                        }}
                      >
                        <span className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full" style={{ color: brand.color }}>
                          {brand.svg || <SocialBrandButton platform={item.platform} url={item.url} asIcon />}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-white capitalize block truncate group-hover:text-white">
                          {item.platform}
                        </span>
                        <span className="text-[10px] text-white/30 font-mono truncate block">
                          {item.url?.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30)}
                        </span>
                      </div>
                      <span className="text-white/20 group-hover:text-white/70 group-hover:translate-x-1 transition-all text-xs">
                        ↗
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : member.socialsLayout === 'compact_matrix' ? (
              /* 4. Compact Icon Matrix — Tight circular icon buttons with brand glow & cardStyle support */
              <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-[320px] mx-auto">
                {filteredSocialLinks.map((item, idx) => {
                  const brand = BRAND_SVGS[item.platform.toLowerCase()] || { color: primaryColor, glow: primaryColor, name: item.platform, svg: null };
                  const matrixClass = cardStyle === 'transparent'
                    ? 'border border-white/15 bg-transparent hover:bg-white/[0.08] shadow-none'
                    : cardStyle === 'ultra_glass'
                      ? 'border border-white/10 bg-black/15 hover:bg-black/30 backdrop-blur-md shadow-sm'
                      : cardStyle === 'dark'
                        ? 'border border-white/20 bg-black/85 hover:bg-black/95 backdrop-blur-3xl shadow-lg'
                        : 'border border-white/12 bg-white/[0.04] hover:bg-white/[0.1] backdrop-blur-xl shadow-md';

                  return (
                    <a
                      key={`${item.platform}-${idx}`}
                      href={previewMode ? '#' : item.url}
                      target={previewMode ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                      onClick={(e) => handleSocialClick(item.platform, item.url, e)}
                      className={`group relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${matrixClass} ${previewMode ? 'cursor-default' : 'cursor-pointer hover:scale-110 hover:-translate-y-1'}`}
                      title={item.platform}
                      style={{
                        boxShadow: cardStyle === 'transparent' ? undefined : `0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px ${brand.color}15`
                      }}
                    >
                      <span
                        className="w-5 h-5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_currentColor]"
                        style={{ color: brand.color }}
                      >
                        {brand.svg || <SocialBrandButton platform={item.platform} url={item.url} asIcon />}
                      </span>
                      {/* Hover ring */}
                      <span
                        className="absolute inset-0 rounded-full border-2 opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none"
                        style={{ borderColor: brand.color }}
                      />
                      {/* Tooltip */}
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 border border-white/20 text-[8px] font-mono text-white/90 capitalize opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {item.platform}
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : (
              /* 1. Balanced Symmetrical Matrix (Style 1 - default, passes cardStyle) */
              <div className={`mx-auto flex flex-wrap items-center justify-center gap-2.5 ${filteredSocialLinks.length <= 4
                  ? 'max-w-xs'
                  : filteredSocialLinks.length <= 6
                    ? 'max-w-[320px]'
                    : filteredSocialLinks.length <= 8
                      ? 'max-w-[340px]'
                      : 'max-w-[380px]'
                }`}>
                {filteredSocialLinks.map((item, idx) => (
                  <SocialBrandButton
                    key={`${item.platform}-${idx}`}
                    platform={item.platform}
                    url={item.url}
                    cardStyle={cardStyle}
                    disabled={previewMode}
                    onClick={(e) => handleSocialClick(item.platform, item.url, e)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discord Server Promotion Widget (โปรโมทเซิร์ฟเวอร์ดิสคอร์ด) */}
        {member.showDiscordServer !== false && member.discordServerData && (
          <div className="w-full max-w-[420px] px-2 mb-3">
            <DiscordServerWidget
              serverData={member.discordServerData}
              style={member.discordServerStyle || 'banner_card'}
              primaryColor={primaryColor}
              textColor={textColor}
              previewMode={previewMode}
              cardStyle={cardStyle}
            />
          </div>
        )}

        {/* Integrated Bio Music Player with Multi-Style UI & Preview Support */}
        {member.musicUrl && (
          <BioMusicPlayer
            url={member.musicUrl}
            title={member.musicTitle}
            artist={member.musicArtist}
            cover={member.musicCover}
            musicStartTime={member.musicStartTime || 0}
            musicVolume={member.musicVolume !== undefined ? member.musicVolume : 45}
            primaryColor={primaryColor}
            textColor={textColor}
            cardStyle={cardStyle}
            previewMode={previewMode}
            playerStyle={member.musicPlayerStyle || 'deck'}
          />
        )}

        {/* Subtle DEV Instagram Credit inside Card */}
        <div className="pt-2 pb-1 text-center">
          <a
            href="https://www.instagram.com/gkbyontop/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-white/30 hover:text-white/80 transition-colors uppercase cursor-pointer"
            title="Developer Instagram: @gkbyontop"
          >
            <span>DEV</span>
            <span>•</span>
            <span className="hover:underline">@gkbyontop</span>
          </a>
        </div>
      </div>



      {/* Bottom-Left Live View Counter with Micro-Animation (เฉพาะโหมดลอยอิสระ floating แบบเดิม) */}
      {!isMasterCardOn && (
        <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-30">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-xl text-xs font-mono font-bold tracking-wider select-none transition-all duration-300 ${counterBoxClasses} ${justIncremented ? 'ring-2 ring-emerald-400/50 scale-105 shadow-[0_0_15px_rgba(52,211,153,0.4)]' : ''
              }`}
            style={{ color: `${textColor}cc` }}
          >
            <Eye
              size={13}
              className={`transition-colors duration-300 ${justIncremented ? 'text-emerald-400 animate-pulse' : ''}`}
              style={!justIncremented ? { color: `${textColor}99` } : {}}
            />
            <span className={`transition-colors duration-300 ${justIncremented ? 'text-emerald-300 font-extrabold' : ''}`}>
              {viewsToDisplay}
            </span>
            {justIncremented && (
              <span className="text-[10px] text-emerald-400 font-bold animate-bounce ml-0.5">
                +1
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
