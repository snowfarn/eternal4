'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function DiscordWidget({ 
  discordId, 
  customUsername, 
  customStatusText, 
  customBadge, 
  customBadgeIcon,
  avatarFallback, 
  avatarDecoration, 
  showDecoration = true, 
  primaryColor = '#ff2a44', 
  textColor = '#ffffff', 
  cardStyle = 'glass',
  className = ''
}) {
  const [lanyardData, setLanyardData] = useState(null);
  const [copied, setCopied] = useState(false);
  // FIX: Don't use localStorage in useState initializer — causes hydration mismatch
  // between server render (empty string) and client render (localStorage value).
  const [cachedStatusText, setCachedStatusText] = useState('');

  // Fetch Lanyard real-time Discord presence — client-side only
  useEffect(() => {
    if (!discordId) return;

    let isMounted = true;
    const fetchLanyard = async () => {
      try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json?.data) {
            setLanyardData(json.data);
          }
        }
      } catch {}
    };

    fetchLanyard();
    const pollInterval = setInterval(fetchLanyard, 15000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [discordId]);

  // Restore cached status from localStorage AFTER mount (client-only, avoids SSR mismatch)
  useEffect(() => {
    if (!discordId) return;
    try {
      const saved = localStorage.getItem(`discord_status_note_${discordId}`) || '';
      if (saved) {
        const timer = setTimeout(() => setCachedStatusText(saved), 0);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [discordId]);

  // Real status (do NOT fake online when offline)
  const rawStatus = lanyardData?.discord_status;
  // Only show real status; null/undefined = still loading = show offline pill
  const discordStatus = rawStatus || 'offline';
  const isOnline = discordStatus !== 'offline';

  const statusColorMap = {
    online: '#23a55a',
    idle: '#f0b232',
    dnd: '#f23f43',
    offline: '#80848e',
  };
  const statusColor = statusColorMap[discordStatus] || '#80848e';

  const statusLabelMap = {
    online: 'ออนไลน์',
    idle: 'ไม่อยู่หน้าจอ',
    dnd: 'ห้ามรบกวน',
    offline: 'ออฟไลน์',
  };

  // Live custom status note (Only custom status — do not pull game presence or Spotify as requested)
  const customActivity = lanyardData?.activities?.find(a => a.type === 4)?.state;

  // Persist live custom status text to localStorage when user is online
  useEffect(() => {
    if (customActivity && discordId && isOnline) {
      const timer = setTimeout(() => {
        setCachedStatusText(customActivity);
        try {
          localStorage.setItem(`discord_status_note_${discordId}`, customActivity);
        } catch {}
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [customActivity, discordId, isOnline]);

  // Display values with live Discord priority
  const hasLanyard = Boolean(lanyardData?.discord_user);

  const displayAvatar = hasLanyard && lanyardData.discord_user.avatar
    ? `https://cdn.discordapp.com/avatars/${lanyardData.discord_user.id}/${lanyardData.discord_user.avatar}.${lanyardData.discord_user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
    : (avatarFallback || 'https://cdn.discordapp.com/embed/avatars/0.png');

  const displayUsername = hasLanyard
    ? (lanyardData.discord_user.global_name || lanyardData.discord_user.username || customUsername || 'Operative')
    : (customUsername || 'Operative');

  // Status text logic: Only custom status note or custom text (no Spotify or game activity)
  const validSavedText = customStatusText && customStatusText !== 'Zick เช่เวงัน' ? customStatusText : null;
  const displayStatusText = isOnline
    ? (customActivity || cachedStatusText || validSavedText || statusLabelMap[discordStatus])
    : (validSavedText || statusLabelMap[discordStatus]);

  // Clan badge: Prioritize live primary_guild tag from Discord
  const primaryGuild = lanyardData?.discord_user?.primary_guild || lanyardData?.discord_user?.clan;
  const clanBadgeIcon = (hasLanyard && primaryGuild?.badge && primaryGuild?.identity_guild_id)
    ? `https://cdn.discordapp.com/clan-badges/${primaryGuild.identity_guild_id}/${primaryGuild.badge}.png`
    : (customBadgeIcon || (primaryGuild?.badge && primaryGuild?.identity_guild_id 
        ? `https://cdn.discordapp.com/clan-badges/${primaryGuild.identity_guild_id}/${primaryGuild.badge}.png` 
        : 'https://cdn.discordapp.com/clan-badges/1396736573445374082/09f17237050714f397357bc1465537e2.png'));

  const badgeText = hasLanyard
    ? (primaryGuild?.tag || (customBadge && customBadge !== 'NOPE' ? customBadge : ''))
    : ((customBadge && customBadge !== 'NOPE') ? customBadge : (primaryGuild?.tag || ''));

  // Avatar decoration: Prioritize live Discord decoration or clear if unequipped
  const decorationAsset = lanyardData?.discord_user?.avatar_decoration_data?.asset;
  const rawDecoration = hasLanyard
    ? (decorationAsset ? `https://cdn.discordapp.com/avatar-decoration-presets/${decorationAsset}.png?size=160&passthrough=true` : null)
    : (avatarDecoration || null);

  const decorationUrl = showDecoration
    ? (rawDecoration && rawDecoration.startsWith('http') 
        ? rawDecoration.replace('passthrough=false', 'passthrough=true') 
        : rawDecoration 
          ? `https://cdn.discordapp.com/avatar-decoration-presets/${rawDecoration}.png?size=160&passthrough=true` 
          : null)
    : null;

  const handleClick = (e) => {
    e.stopPropagation();
    try {
      if (discordId) {
        fetch(`/api/analytics/${discordId}/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'discord' }),
          keepalive: true
        }).catch(() => {});
      }
    } catch {}

    if (discordId) {
      window.open(`https://discord.com/users/${discordId}`, '_blank');
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(displayUsername);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardBgClasses = cardStyle === 'transparent'
    ? 'bg-transparent border border-white/5'
    : cardStyle === 'ultra_glass'
    ? 'bg-black/15 backdrop-blur-md border border-white/10 hover:border-white/20'
    : cardStyle === 'dark'
    ? 'bg-black/85 backdrop-blur-3xl border border-white/20 hover:border-white/35 shadow-xl'
    : 'bg-black/55 backdrop-blur-2xl border border-white/15 hover:border-white/35 shadow-[0_10px_30px_rgba(0,0,0,0.7)]';

  return (
    <motion.div
      onClick={handleClick}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all group select-none max-w-full cursor-pointer relative ${cardBgClasses} ${className}`}
      title={discordId ? 'Click to open Discord profile' : 'Click to copy Discord tag'}
    >
      {/* Avatar with real-time status dot & Discord decoration */}
      <div className="relative shrink-0 w-11 h-11 rounded-full shadow-md flex items-center justify-center">
        <img 
          src={displayAvatar} 
          alt={displayUsername} 
          className="w-full h-full rounded-full object-cover" 
        />
        {showDecoration && decorationUrl && (
          <img 
            src={decorationUrl} 
            alt="" 
            className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] max-w-none max-h-none pointer-events-none z-10 object-contain drop-shadow-md"
          />
        )}
        {/* Status dot — always shows real status */}
        <span 
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#09090d] flex items-center justify-center shadow-md transition-colors duration-500 z-20"
          style={{ backgroundColor: statusColor }}
        >
          {discordStatus === 'dnd' && (
            <span className="w-1.5 h-0.5 bg-[#09090d] rounded-full" />
          )}
          {discordStatus === 'idle' && (
            <span className="w-1.5 h-1.5 bg-[#09090d] rounded-full -translate-x-0.5 -translate-y-0.5" />
          )}
        </span>
      </div>

      {/* Identity & presence */}
      <div className="flex flex-col min-w-0 pr-1 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span 
            className="font-bold text-xs sm:text-sm tracking-wide truncate max-w-[150px] sm:max-w-[190px]"
            style={{ color: textColor }}
          >
            {displayUsername}
          </span>

          {/* Clan/server tag badge */}
          {badgeText && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-bold text-white/90 shrink-0">
              <img 
                src={clanBadgeIcon} 
                alt="" 
                className="w-3.5 h-3.5 object-contain rounded shrink-0" 
              />
              <span className="tracking-wider uppercase font-mono">{badgeText}</span>
            </div>
          )}
        </div>

        {/* Status text */}
        <p className="text-[11px] sm:text-xs font-light truncate max-w-[180px] sm:max-w-[240px] mt-0.5 transition-colors duration-300"
          style={{ color: isOnline ? 'rgba(255,255,255,0.65)' : '#80848e' }}
        >
          {displayStatusText}
        </p>
      </div>

      {copied && (
        <span className="absolute -top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded-md bg-green-500 text-black font-bold shadow-md">
          COPIED!
        </span>
      )}
    </motion.div>
  );
}
