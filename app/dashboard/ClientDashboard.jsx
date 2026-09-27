'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import {
  LogOut,
  Home,
  Save,
  Palette,
  Link as LinkIcon,
  Music,
  CheckCircle2,
  Shield,
  Sparkles,
  Upload,
  Eye,
  ExternalLink,
  Copy,
  AlertCircle,
  Gamepad2,
  Disc,
  User,
  Check,
  RefreshCw,
  Sliders,
  Clock,
  Timer,
  Play,
  Pause,
  Square,
  Volume2,
  Volume1,
  VolumeX,
  Crosshair,
  Compass,
  Zap,
  Globe,
  Radio,
  X,
  Share2,
  BarChart3,
  TrendingUp,
  Plus,
  Grid,
  Layers,
  Activity,
  MousePointer,
  Film,
  Search,
  FileText,
  Users
} from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { applyToGang, updateMemberBio, checkSlug } from '@/lib/actions';
import { useLanguage } from '@/context/LanguageContext';
import BioView from '@/components/BioView';
import DiscordServerWidget from '@/components/DiscordServerWidget';
import { BRAND_SVGS } from '@/components/BrandIcons';

const PARTICLE_OPTIONS = [
  { id: 'none', label: 'None / ปิด', desc: 'No particles' },
  { id: 'snow', label: 'Snow / หิมะตก', desc: 'Soft falling crystal flakes' },
  { id: 'sakura', label: 'Sakura / ซากุระร่วง', desc: 'Floating cherry blossom petals' },
  { id: 'rain', label: 'Cyber Rain / ฝนดิจิทัล', desc: 'Neon streaming cyber lines' },
  { id: 'embers', label: 'Embers / สะเก็ดไฟ', desc: 'Rising burning ash particles' },
  { id: 'stars', label: 'Stars / ดวงดาว', desc: 'Twinkling celestial cosmos' },
  { id: 'sparkles', label: 'Sparkles / ประกายเพชร', desc: 'Glistening diamond glints' },
  { id: 'cyber_dust', label: 'Cyber Dust / ละอองไซเบอร์', desc: 'Ambient neon energy motes' },
  { id: 'custom_image', label: '★ Custom Image / รูปกำหนดเอง', desc: 'Upload your own PNG/JPG/GIF sprites' },
];

const CURSOR_OPTIONS = [
  { id: 'none', label: 'Default / ปกติ', desc: 'Standard operating cursor' },
  { id: 'sparkle_trail', label: 'Sparkle Trail / ดาวกระจาย', desc: 'Trailing starlight glints' },
  { id: 'neon_dot', label: 'Neon Ring / วงแหวนนีออน', desc: 'Luminescent magnetic halo' },
  { id: 'fire_ember', label: 'Fire Ember / สะเก็ดไฟลอย', desc: 'Floating flame traces' },
  { id: 'ghost_blur', label: 'Ghost Glow / เงาไซเบอร์', desc: 'Velocity-sensitive light trail' },
  { id: 'sakura_trail', label: 'Sakura Trail / กลีบดอกไม้', desc: 'Flowing blossom trail' },
];

const THEME_COLOR_PRESETS = [
  { label: 'Syndicate Red', color: '#ff2a44' },
  { label: 'Crimson Blood', color: '#dc2626' },
  { label: 'Cyber Blue', color: '#3b82f6' },
  { label: 'Neon Violet', color: '#a855f7' },
  { label: 'Toxic Emerald', color: '#10b981' },
  { label: 'Imperial Gold', color: '#f59e0b' },
  { label: 'Sakura Pink', color: '#ec4899' },
  { label: 'Electric Cyan', color: '#06b6d4' },
  { label: 'Pure White', color: '#ffffff' },
];

const CARD_STYLE_OPTIONS = [
  { id: 'transparent', label: 'Transparent', desc: 'Invisible card, zero background' },
  { id: 'ultra_glass', label: 'Ultra Clear', desc: 'Minimal subtle glass 15%' },
  { id: 'glass', label: 'Frosted Glass', desc: 'Balanced cyber glass 45%' },
  { id: 'dark', label: 'Dark Obsidian', desc: 'Deep high-contrast obsidian 80%' },
];

function getYouTubeId(url) {
  if (!url) return null;
  try {
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0];
    const urlObj = new URL(url);
    return urlObj.searchParams.get('v');
  } catch {
    return null;
  }
}

function formatSeconds(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

export default function ClientDashboard({ initialStatus, initialMemberData }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, lang, toggleLang } = useLanguage();
  const [memberStatus, setMemberStatus] = useState(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Tabs: profile (Identity), appearance (Style/Theme/FX), music (Soundtrack), socials (Integrations)
  const [activeTab, setActiveTab] = useState('profile');
  const [copiedLink, setCopiedLink] = useState(false);
  const [slugStatus, setSlugStatus] = useState({ checking: false, available: true, message: '' });
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Uploading indicators
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingFrame, setUploadingFrame] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingParticle, setUploadingParticle] = useState(false);
  const [particleUrlInput, setParticleUrlInput] = useState('');
  const [isSyncingDiscord, setIsSyncingDiscord] = useState(false);

  // Analytics Engine state
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Live Music Engine state
  const [fetchedMusicInfo, setFetchedMusicInfo] = useState(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const previewAudioRef = useRef(null);
  const previewYtIframeRef = useRef(null);

  const [bioData, setBioData] = useState(() => {
    return {
      name: initialMemberData?.name || '',
      slug: initialMemberData?.slug || initialMemberData?.name?.toLowerCase().replace(/[^a-z0-9_-]/g, '') || '',
      avatar: initialMemberData?.avatar || '',
      avatarDecoration: initialMemberData?.avatarDecoration || '',
      showAvatarDecoration: initialMemberData?.showAvatarDecoration || 'both',
      bio: initialMemberData?.bio || '',
      particleType: initialMemberData?.particleType || 'snow',
      particleColor: initialMemberData?.particleColor || '#ffffff',
      cursorEffect: initialMemberData?.cursorEffect || 'sparkle_trail',
      primaryColor: initialMemberData?.primaryColor || '#ff2a44',
      textColor: initialMemberData?.textColor || '#ffffff',
      cardStyle: initialMemberData?.cardStyle || 'glass',
      profileContainerStyle: initialMemberData?.profileContainerStyle || initialMemberData?.profileLayout || 'contained',
      socialsLayout: initialMemberData?.socialsLayout || 'balanced',
      musicPlayerStyle: initialMemberData?.musicPlayerStyle || 'deck',
      backgroundUrl: initialMemberData?.backgroundUrl || '',
      bgDarkness: initialMemberData?.bgDarkness !== undefined ? initialMemberData.bgDarkness : 45,
      bgBlur: initialMemberData?.bgBlur !== undefined ? initialMemberData.bgBlur : 0,
      musicUrl: initialMemberData?.musicUrl || '',
      musicTitle: initialMemberData?.musicTitle || '',
      musicArtist: initialMemberData?.musicArtist || '',
      musicCover: initialMemberData?.musicCover || '',
      musicStartTime: initialMemberData?.musicStartTime !== undefined ? initialMemberData.musicStartTime : 0,
      musicVolume: initialMemberData?.musicVolume !== undefined ? initialMemberData.musicVolume : 40,
      discordId: initialMemberData?.discordId || initialMemberData?.id || '',
      discordUsername: initialMemberData?.discordUsername || initialMemberData?.name || '',
      discordStatusText: initialMemberData?.discordStatusText || '',
      discordBadge: initialMemberData?.discordBadge || 'OPERATIVE',
      robloxUsername: initialMemberData?.robloxUsername || '',
      robloxUserId: initialMemberData?.robloxUserId || '',
      socials: {
        roblox: initialMemberData?.socials?.roblox || (initialMemberData?.robloxUsername || ''),
        instagram: initialMemberData?.socials?.instagram || '',
        youtube: initialMemberData?.socials?.youtube || '',
        tiktok: initialMemberData?.socials?.tiktok || '',
        facebook: initialMemberData?.socials?.facebook || '',
        twitch: initialMemberData?.socials?.twitch || '',
        spotify: initialMemberData?.socials?.spotify || '',
        steam: initialMemberData?.socials?.steam || '',
        github: initialMemberData?.socials?.github || '',
        soundcloud: initialMemberData?.socials?.soundcloud || '',
      },
      customParticleImages: initialMemberData?.customParticleImages || [],
      particleEmitDirection: initialMemberData?.particleEmitDirection || 'all',
      particleSize: initialMemberData?.particleSize || 'medium',
      discordServerInvite: initialMemberData?.discordServerInvite || '',
      discordServerData: initialMemberData?.discordServerData || null,
      discordServerStyle: initialMemberData?.discordServerStyle || 'banner_card',
      showDiscordServer: initialMemberData?.showDiscordServer !== undefined ? initialMemberData.showDiscordServer : true,
      views: initialMemberData?.views || 1
    };
  });

  // Music Search & Auto-Lyrics state
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [songSearchResults, setSongSearchResults] = useState([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);

  // Discord Server Promotion state
  const [discordInviteInput, setDiscordInviteInput] = useState(initialMemberData?.discordServerInvite || '');
  const [isFetchingDiscordServer, setIsFetchingDiscordServer] = useState(false);

  // Auto-sync Discord presence, avatar frame and clan badge silently on mount
  useEffect(() => {
    const targetUserId = session?.user?.id || initialMemberData?.discordId || initialMemberData?.id;
    if (targetUserId) {
      fetch('/api/discord/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId })
      })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const d = json.data;
          setBioData(prev => ({
            ...prev,
            discordId: d.discordId || prev.discordId,
            discordUsername: d.username || d.displayName || prev.discordUsername,
            discordBadge: d.badge || '',
            discordBadgeIcon: d.badgeIcon || '',
            avatarDecoration: d.avatarDecoration || '',
            // Keep user's custom avatar if they uploaded or set one; only use discord avatar if no avatar exists yet
            avatar: prev.avatar || d.avatar || '',
          }));
        }
      })
      .catch(() => {});
    }
  }, [session?.user?.id, initialMemberData?.discordId, initialMemberData?.id]);

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper file uploader with automatic old file cleanup
  const handleFileUpload = async (file, onDone, setUploadingState, oldUrl = null) => {
    if (!file) return;
    setUploadingState(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (oldUrl && typeof oldUrl === 'string' && oldUrl.startsWith('/uploads/')) {
        formData.append('oldUrl', oldUrl);
      }
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        onDone(data.url);
        showToast(lang === 'th' ? 'อัปโหลดไฟล์สำเร็จแล้ว' : 'File uploaded successfully');
      } else {
        showToast(data.error || 'Upload failed', true);
      }
    } catch {
      showToast(lang === 'th' ? 'การอัปโหลดขัดข้อง' : 'Upload error', true);
    } finally {
      setUploadingState(false);
    }
  };

  // 1-Click Discord Auto-Sync (pulls everything: ID, username, avatar, badge, status)
  const handleSyncDiscordAccount = async () => {
    const targetUserId = session?.user?.id || bioData.discordId;
    if (!targetUserId) {
      showToast(lang === 'th' ? 'ไม่พบ ID ของ Discord สำหรับเชื่อมโยง' : 'No Discord ID detected', true);
      return;
    }
    setIsSyncingDiscord(true);
    try {
      const res = await fetch('/api/discord/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setBioData(prev => ({
          ...prev,
          discordId: d.discordId || prev.discordId,
          discordUsername: d.username || d.displayName || prev.discordUsername,
          discordStatusText: d.statusText && d.statusText !== d.username ? d.statusText : prev.discordStatusText,
          discordBadge: d.badge || '',
          discordBadgeIcon: d.badgeIcon || '',
          avatar: prev.avatar || d.avatar || '',
          avatarDecoration: d.avatarDecoration || '',
        }));
        showToast(lang === 'th' 
          ? `ซิงก์ Discord สำเร็จ: @${d.username || d.displayName}${d.badge ? ` · แท็ก: ${d.badge}` : ''}${d.avatarDecoration ? ' · พร้อมกรอบโปรไฟล์' : ''}` 
          : `Discord synced: @${d.username || d.displayName}${d.badge ? ` · Tag: ${d.badge}` : ''}`);
      } else {
        showToast(lang === 'th' ? 'เชื่อมต่อ Discord ไม่สำเร็จ — ตรวจสอบว่าเข้าร่วม Lanyard server แล้ว' : 'Failed to sync Discord — make sure you joined the Lanyard server', true);
      }
    } catch {
      showToast(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ' : 'Error syncing Discord', true);
    } finally {
      setIsSyncingDiscord(false);
    }
  };

  // Fetch Member Analytics & Traffic Insights when Analytics tab is opened
  useEffect(() => {
    if (activeTab === 'analytics' && session?.user?.id) {
      queueMicrotask(() => setIsLoadingAnalytics(true));
      fetch(`/api/analytics/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setAnalyticsData(data.data);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingAnalytics(false));
    }
  }, [activeTab, session?.user?.id]);

  // YouTube auto-metadata fetcher — always refresh when URL changes
  useEffect(() => {
    const url = bioData.musicUrl;
    if (!url) {
      queueMicrotask(() => setFetchedMusicInfo(null));
      return;
    }
    const ytId = getYouTubeId(url);
    if (ytId) {
      fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.title) {
            const thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            setFetchedMusicInfo({
              title: data.title,
              author: data.author_name || 'YouTube Audio',
              thumbnail: thumb,
              ytId: ytId
            });
            // Always overwrite title/artist/cover when URL changes
            setBioData(prev => ({
              ...prev,
              musicTitle: data.title,
              musicArtist: data.author_name || '',
              musicCover: thumb
            }));
          }
        })
        .catch(() => {
          const thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
          setFetchedMusicInfo({ title: 'YouTube Soundtrack', author: 'Gang Audio', thumbnail: thumb, ytId });
          setBioData(prev => ({
            ...prev,
            musicTitle: prev.musicTitle || 'YouTube Soundtrack',
            musicArtist: prev.musicArtist || 'Gang Audio',
            musicCover: prev.musicCover || thumb
          }));
        });
    } else if (url) {
      const fallbackTitle = url.split('/').pop()?.split('?')[0] || 'Direct Audio';
      queueMicrotask(() => {
        setFetchedMusicInfo(prev => ({
          title: fallbackTitle,
          author: 'Custom Soundtrack',
          thumbnail: prev?.thumbnail || null,
          ytId: null
        }));
        // For direct audio, only set title if empty
        setBioData(prev => ({
          ...prev,
          musicTitle: prev.musicTitle || fallbackTitle,
        }));
      });
    }
  }, [bioData.musicUrl]);

  // YouTube iframe postMessage command helper
  const sendPreviewYTCommand = (func, args = []) => {
    try {
      if (previewYtIframeRef.current && previewYtIframeRef.current.contentWindow) {
        previewYtIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch {}
  };

  // Real-time volume changer for settings & test playback
  const handleVolumeChange = (newVol) => {
    const volNum = Math.min(100, Math.max(0, Number(newVol) || 0));
    setBioData(prev => ({ ...prev, musicVolume: volNum }));
    if (getYouTubeId(bioData.musicUrl)) {
      sendPreviewYTCommand('setVolume', [volNum]);
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = volNum / 100;
    }
  };

  // Instant Test Play & Stop Toggle
  const handleToggleTestAudio = (customSec = null) => {
    const targetSec = customSec !== null ? customSec : (Number(bioData.musicStartTime) || 0);

    // If currently testing audio and no specific new second requested -> STOP
    if (isTestingAudio && customSec === null) {
      if (getYouTubeId(bioData.musicUrl)) {
        sendPreviewYTCommand('pauseVideo');
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsTestingAudio(false);
      showToast(lang === 'th' ? 'หยุดทดสอบเสียงแล้ว' : 'Audio test stopped');
      return;
    }

    // Play immediately from target timestamp at configured volume
    const targetVol = bioData.musicVolume !== undefined ? Number(bioData.musicVolume) : 40;
    const ytId = getYouTubeId(bioData.musicUrl);
    if (ytId) {
      sendPreviewYTCommand('unMute');
      sendPreviewYTCommand('setVolume', [targetVol]);
      sendPreviewYTCommand('seekTo', [targetSec, true]);
      sendPreviewYTCommand('playVideo');
      setTimeout(() => {
        sendPreviewYTCommand('unMute');
        sendPreviewYTCommand('setVolume', [targetVol]);
        sendPreviewYTCommand('seekTo', [targetSec, true]);
        sendPreviewYTCommand('playVideo');
      }, 200);
      setTimeout(() => {
        sendPreviewYTCommand('playVideo');
      }, 600);
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = targetVol / 100;
      previewAudioRef.current.currentTime = targetSec;
      previewAudioRef.current.play().catch(() => {});
    }
    setIsTestingAudio(true);
    showToast(
      lang === 'th' 
        ? `กำลังเล่นทดสอบจากวินาทีที่ ${targetSec} (${formatSeconds(targetSec)})` 
        : `Testing audio from ${targetSec}s (${formatSeconds(targetSec)})`
    );
  };

  // Listen to preview YouTube iframe events for currentTime & playback state & duration
  useEffect(() => {
    const handlePreviewMsg = (e) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;
        if (data.info && typeof data.info.currentTime === 'number') {
          setPreviewCurrentTime(Math.floor(data.info.currentTime));
        }
        if (data.info && typeof data.info.duration === 'number' && data.info.duration > 0) {
          setPreviewDuration(Math.floor(data.info.duration));
        }
        if (data.info && data.info.playerState !== undefined) {
          if (data.info.playerState === 0 || data.info.playerState === 2) {
            setIsTestingAudio(false);
          } else if (data.info.playerState === 1) {
            setIsTestingAudio(true);
          }
        }
      } catch {}
    };
    window.addEventListener('message', handlePreviewMsg);
    return () => window.removeEventListener('message', handlePreviewMsg);
  }, []);

  const effectiveDuration = previewDuration > 0 ? previewDuration : Math.max(240, (Number(bioData.musicStartTime) || 0) + 60);

  // Live slug checking debounce
  useEffect(() => {
    if (!bioData.slug) {
      queueMicrotask(() => setSlugStatus({ checking: false, available: true, message: '' }));
      return;
    }
    const timer = setTimeout(async () => {
      setSlugStatus(prev => ({ ...prev, checking: true }));
      try {
        const res = await checkSlug(session?.user?.id, bioData.slug);
        if (res.available) {
          setSlugStatus({ checking: false, available: true, message: lang === 'th' ? 'ที่อยู่นี้พร้อมใช้งาน' : 'Address available' });
        } else {
          setSlugStatus({ checking: false, available: false, message: lang === 'th' ? 'ที่อยู่นี้มีผู้ใช้แล้ว' : 'Address already in use' });
        }
      } catch {
        setSlugStatus({ checking: false, available: true, message: '' });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [bioData.slug, session?.user?.id, lang]);

  // Music Search Track handler (iTunes / Apple Music Public API)
  const handleSearchSongs = async (customQuery = null) => {
    const q = (customQuery !== null ? customQuery : songSearchQuery).trim();
    if (!q) {
      showToast(lang === 'th' ? 'กรุณาพิมพ์ชื่อเพลงหรือศิลปินที่ต้องการค้นหา' : 'Please enter a song name or artist', true);
      return;
    }
    setIsSearchingSongs(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.results) {
        setSongSearchResults(data.results);
        if (data.results.length === 0) {
          showToast(lang === 'th' ? 'ไม่พบผลลัพธ์ ลองระบุชื่อหรือศิลปินเพิ่มเติม' : 'No tracks found, try adding artist', true);
        } else {
          showToast(lang === 'th' ? `พบ ${data.results.length} เพลงที่ตรงกัน คลิกเลือกได้ทันที` : `Found ${data.results.length} songs. Click to select.`);
        }
      } else {
        showToast(data.error || 'Search error', true);
      }
    } catch {
      showToast(lang === 'th' ? 'เกิดข้อผิดพลาดในการค้นหาเพลง' : 'Failed to search songs', true);
    } finally {
      setIsSearchingSongs(false);
    }
  };

  // Select Track from Search Results & Automatically Auto-Fill
  const handleSelectSong = (track) => {
    setBioData(prev => ({
      ...prev,
      musicTitle: track.title,
      musicArtist: track.artist,
      musicCover: track.cover || prev.musicCover,
      musicUrl: track.previewUrl || prev.musicUrl,
    }));
    // Also update fetchedMusicInfo so the Live Preview section shows updated cover/title immediately
    setFetchedMusicInfo({
      title: track.title,
      author: track.artist,
      thumbnail: track.cover || null,
      ytId: null
    });
    setSongSearchResults([]);
    showToast(lang === 'th' ? `เลือกเพลง: ${track.title} โดย ${track.artist}` : `Selected: ${track.title} by ${track.artist}`);
  };

  // Discord Server Invite Info Fetcher
  const handleFetchDiscordServer = async (customInvite = null) => {
    const target = (customInvite !== null ? customInvite : (discordInviteInput || bioData.discordServerInvite || '')).trim();
    if (!target) {
      showToast(lang === 'th' ? 'กรุณากรอกลิงก์คำเชิญเซิร์ฟเวอร์ เช่น https://discord.gg/...' : 'Please enter Discord invite link or code', true);
      return;
    }
    setIsFetchingDiscordServer(true);
    try {
      const res = await fetch(`/api/discord/invite?code=${encodeURIComponent(target)}`);
      const data = await res.json();
      const serverData = data.data || (data.found || data.name ? data : null);
      if (serverData && serverData.name) {
        setBioData(prev => ({
          ...prev,
          discordServerInvite: target,
          discordServerData: serverData,
          showDiscordServer: true
        }));
        showToast(lang === 'th' 
          ? `ดึงข้อมูลเซิร์ฟเวอร์สำเร็จ: ${serverData.name} (สมาชิก ${serverData.memberCount?.toLocaleString() || 0} คน)` 
          : `Discord server fetched: ${serverData.name}`);
      } else {
        showToast(data.error || (lang === 'th' ? 'ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้ ตรวจสอบว่าลิงก์ถูกต้องและยังไม่หมดอายุ' : 'Failed to fetch server data'), true);
      }
    } catch {
      showToast(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ Discord' : 'Error connecting to Discord', true);
    } finally {
      setIsFetchingDiscordServer(false);
    }
  };

  // Save changes handler
  const handleSaveBio = async () => {
    if (!session?.user?.id) return;
    setIsSubmitting(true);
    try {
      const sanitizedData = {
        ...bioData,
        musicStartTime: Math.max(0, Math.floor(Number(bioData.musicStartTime) || 0)),
        musicVolume: Math.min(100, Math.max(0, Number(bioData.musicVolume !== undefined ? bioData.musicVolume : 40)))
      };
      const res = await updateMemberBio(session.user.id, sanitizedData);
      if (res.success) {
        showToast(lang === 'th' ? 'บันทึกการตั้งค่าประวัติส่วนตัวเรียบร้อยแล้ว' : 'Bio profile updated successfully');
        router.refresh();
      } else {
        showToast(res.message || (lang === 'th' ? 'เกิดข้อผิดพลาดในการบันทึก' : 'Error updating profile'), true);
      }
    } catch {
      showToast(lang === 'th' ? 'ไม่สามารถบันทึกข้อมูลได้' : 'Failed to save changes', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveBioUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/bio/${bioData.slug || session?.user?.id || ''}`
    : `/bio/${bioData.slug || session?.user?.id || ''}`;

  const copyBioLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(effectiveBioUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      showToast(lang === 'th' ? 'คัดลอกลิงก์ Bio แล้ว' : 'Copied Bio link');
    }
  };

  // Preview social links (memoized for smooth performance)
  const previewContacts = useMemo(() => {
    const list = [];
    if (bioData.socials) {
      for (const [k, v] of Object.entries(bioData.socials)) {
        if (v && k !== 'roblox' && k !== 'discord') {
          list.push({ platform: k, url: v });
        }
      }
    }
    return list;
  }, [bioData.socials]);

  // If not logged in
  if (status === 'unauthenticated' || !session?.user) {
    return (
      <main className="min-h-screen bg-[#040407] text-white flex flex-col items-center justify-center p-4 relative font-sans select-none">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,42,68,0.1),transparent_70%)] pointer-events-none -z-10" />
        <div className="max-w-md w-full p-8 rounded-3xl bg-black/60 border border-white/10 backdrop-blur-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#ff2a44]/15 border border-[#ff2a44]/30 flex items-center justify-center mx-auto text-[#ff2a44] shadow-[0_0_25px_rgba(255,42,68,0.3)]">
            <Shield size={32} />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#ff2a44] uppercase font-bold">
              SECURITY ACCESS REQUIRED
            </span>
            <h1 className="text-2xl font-black text-white mt-1 uppercase font-heading">
              {lang === 'th' ? 'ระบบสมาชิกแก๊ง' : 'OPERATIVE PORTAL'}
            </h1>
            <p className="text-white/60 text-xs mt-2 leading-relaxed">
              {lang === 'th' 
                ? 'เข้าสู่ระบบด้วยบัญชี Discord เพื่อจัดการประวัติส่วนตัว ตกแต่ง Bio และปรับแต่งเพลงประจำตัว' 
                : 'Sign in with your Discord account to customize your operative dossier and soundtrack.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signIn('discord')}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#ff2a44] hover:bg-[#e0243c] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,42,68,0.4)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Disc size={16} />
            <span>{lang === 'th' ? 'เข้าสู่ระบบด้วย Discord' : 'Sign in with Discord'}</span>
          </button>
          <div className="pt-2">
            <Link href="/" className="text-xs text-white/40 hover:text-white transition-colors">
              ← {lang === 'th' ? 'กลับสู่หน้าหลัก' : 'Return to Home'}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#040407] text-white p-3 sm:p-6 pb-28 relative font-sans select-none">
      {/* Dynamic Background Atmosphere */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,42,68,0.08),transparent_65%)] pointer-events-none -z-10" />

      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl backdrop-blur-2xl shadow-2xl text-xs sm:text-sm font-semibold border ${
              toastMessage.isError
                ? 'bg-red-950/90 border-red-500/50 text-red-300'
                : 'bg-black/90 border-emerald-500/50 text-emerald-300'
            }`}
          >
            {toastMessage.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Headless Audio Test Engine for YouTube (No video frame rendering to save network bandwidth) */}
      {getYouTubeId(bioData.musicUrl) && (
        <iframe
          ref={previewYtIframeRef}
          src={`https://www.youtube.com/embed/${getYouTubeId(bioData.musicUrl)}?enablejsapi=1&autoplay=0&controls=0`}
          title="Bio Audio Test Engine"
          className="w-1 h-1 opacity-[0.001] pointer-events-none absolute -bottom-2 -right-2 overflow-hidden"
          allow="accelerometer; autoplay; encrypted-media"
          onLoad={() => {
            try {
              previewYtIframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'listening' }),
                '*'
              );
            } catch {}
          }}
        />
      )}

      {/* Direct Audio Element for MP3 testing */}
      {!getYouTubeId(bioData.musicUrl) && bioData.musicUrl && (
        <audio 
          ref={previewAudioRef} 
          src={bioData.musicUrl} 
          onTimeUpdate={e => setPreviewCurrentTime(Math.floor(e.currentTarget.currentTime))}
          onLoadedMetadata={e => setPreviewDuration(Math.floor(e.currentTarget.duration))}
          onEnded={() => setIsTestingAudio(false)}
          onPause={() => setIsTestingAudio(false)}
          className="hidden" 
        />
      )}

      {/* Top Cyber Command Bar — Redesigned for Pixel-Perfect Mobile & Desktop Balance */}
      <header className="max-w-6xl mx-auto mb-6 p-3 sm:p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-2xl shadow-xl relative z-20">
        {/* MOBILE VIEW (< md) */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {/* Mobile Top Row: User Identity & Compact Utilities */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-10 h-10 rounded-2xl shrink-0 border border-white/15 bg-black flex items-center justify-center">
                <img
                  src={bioData.avatar || session.user.image}
                  alt=""
                  className="w-full h-full object-cover rounded-2xl"
                />
                {bioData.avatarDecoration && (
                  <img
                    src={bioData.avatarDecoration.replace('passthrough=false', 'passthrough=true')}
                    alt=""
                    className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] max-w-none max-h-none pointer-events-none z-10 object-contain drop-shadow-md"
                  />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white truncate font-heading">
                    {bioData.name || session.user.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-[#ff2a44]/20 border border-[#ff2a44]/40 text-[#ff4757] shrink-0">
                    {memberStatus === 'member' ? (lang === 'th' ? 'สังกัด' : 'OP') : 'APP'}
                  </span>
                </div>
                <span className="text-[10px] text-white/40 font-mono truncate">
                  ID: {session.user.id}
                </span>
              </div>
            </div>

            {/* Quick Action Icons: Lang, Home, Logout */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleLang}
                className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono font-bold text-white flex items-center gap-1 cursor-pointer"
                title="Switch Language"
              >
                <Globe size={12} className="text-[#ff2a44]" />
                <span>{lang.toUpperCase()}</span>
              </button>
              <Link
                href="/"
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
                title="Return Home"
              >
                <Home size={13} />
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>

          {/* Mobile Bottom Row: Balanced 3-Action Grid */}
          <div className="flex items-center gap-1.5 w-full">
            {/* Bio Link Pill */}
            {memberStatus === 'member' && (
              <div className="flex-1 min-w-0 flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono">
                <span className="text-white font-bold truncate">
                  {bioData.slug || session.user.id}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={copyBioLink}
                    className="text-white/60 hover:text-white p-0.5 cursor-pointer"
                    title="Copy Bio URL"
                  >
                    {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                  <a
                    href={effectiveBioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-white p-0.5"
                    title="Open Bio"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Live Preview Toggle */}
            {memberStatus === 'member' && (
              <button
                type="button"
                onClick={() => setShowLivePreview(!showLivePreview)}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                  showLivePreview 
                    ? 'bg-[#ff2a44] text-white border-[#ff2a44] shadow-[0_0_12px_rgba(255,42,68,0.5)]' 
                    : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
                }`}
              >
                <Eye size={12} />
                <span>{lang === 'th' ? (showLivePreview ? 'ปิดตัวอย่าง' : 'ตัวอย่าง') : (showLivePreview ? 'Close' : 'Preview')}</span>
              </button>
            )}

            {/* Save Button */}
            {memberStatus === 'member' && (
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#ff2a44] to-[#e0243c] hover:brightness-110 disabled:opacity-50 text-white text-[11px] font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(255,42,68,0.4)] flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Save size={12} />
                <span>{isSubmitting ? (lang === 'th' ? '...' : '...') : (lang === 'th' ? 'บันทึก' : 'Save')}</span>
              </button>
            )}
          </div>
        </div>

        {/* DESKTOP VIEW (>= md) */}
        <div className="hidden md:flex items-center justify-between gap-3">
          {/* Left: Operative Identification with Avatar Frame */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-2xl shrink-0 border border-white/15 bg-black flex items-center justify-center">
              <img
                src={bioData.avatar || session.user.image}
                alt=""
                className="w-full h-full object-cover rounded-2xl"
              />
              {bioData.avatarDecoration && (
                <img
                  src={bioData.avatarDecoration.replace('passthrough=false', 'passthrough=true')}
                  alt=""
                  className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] max-w-none max-h-none pointer-events-none z-10 object-contain drop-shadow-md"
                />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white truncate font-heading">
                  {bioData.name || session.user.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-[#ff2a44]/20 border border-[#ff2a44]/40 text-[#ff4757]">
                  {memberStatus === 'member' ? (lang === 'th' ? 'สมาชิกสังกัด' : 'OPERATIVE') : (lang === 'th' ? 'รออนุมัติ' : 'APPLICANT')}
                </span>
              </div>
              <span className="text-[11px] text-white/40 font-mono truncate">
                ID: {session.user.id}
              </span>
            </div>
          </div>

          {/* Right: Actions, Language Switcher, Preview Toggle & Save */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Bio Link Quick Copy */}
            {memberStatus === 'member' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
                <span className="text-white/40">bio/</span>
                <span className="text-white font-bold truncate max-w-[130px]">
                  {bioData.slug || session.user.id}
                </span>
                <button
                  type="button"
                  onClick={copyBioLink}
                  className="text-white/60 hover:text-white transition-colors cursor-pointer p-0.5"
                  title="Copy Bio URL"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
                <a
                  href={effectiveBioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors p-0.5"
                  title="Open Public Bio"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            {/* Bilingual Language Switcher Toggle */}
            <button
              type="button"
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer"
              title="Switch Language / เปลี่ยนภาษา"
            >
              <Globe size={13} className="text-[#ff2a44]" />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* Device Preview Toggle */}
            {memberStatus === 'member' && (
              <button
                type="button"
                onClick={() => setShowLivePreview(!showLivePreview)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  showLivePreview 
                    ? 'bg-[#ff2a44] text-white border-[#ff2a44] shadow-[0_0_15px_rgba(255,42,68,0.5)]' 
                    : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
                }`}
              >
                <Eye size={13} />
                <span>{lang === 'th' ? (showLivePreview ? 'ปิดตัวอย่าง' : 'ดูตัวอย่าง') : (showLivePreview ? 'Close Preview' : 'Preview')}</span>
              </button>
            )}

            {/* Save Button */}
            {memberStatus === 'member' && (
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-xl bg-[#ff2a44] hover:bg-[#e0243c] disabled:opacity-50 text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(255,42,68,0.4)] flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={13} />
                <span>{isSubmitting ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (lang === 'th' ? 'บันทึกข้อมูล' : 'Save Changes')}</span>
              </button>
            )}

            {/* Return Home & Logout */}
            <Link 
              href="/"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
              title="Return Home"
            >
              <Home size={14} />
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <div className="max-w-6xl mx-auto relative z-10">

        {/* NON-MEMBER (APPLICATION STATUS) */}
        {!memberStatus && (
          <div className="bg-black/60 border border-white/10 rounded-3xl p-8 sm:p-12 text-center backdrop-blur-3xl shadow-2xl max-w-xl mx-auto space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#ff2a44]/15 border border-[#ff2a44]/30 flex items-center justify-center mx-auto text-[#ff2a44] shadow-[0_0_25px_rgba(255,42,68,0.3)]">
              <Sparkles size={28} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight font-heading">
                {lang === 'th' ? 'ยื่นใบสมัครเข้าร่วมแก๊ง' : 'JOIN THE SYNDICATE'}
              </h2>
              <p className="text-white/60 text-xs sm:text-sm mt-2 leading-relaxed">
                {lang === 'th'
                  ? 'บัญชีของคุณยังไม่ได้เป็นสมาชิกอย่างเป็นทางการ กดปุ่มด้านล่างเพื่อส่งใบสมัครเข้าสู่ระบบพิจารณาของผู้ดูแล'
                  : 'Your account is not registered as an operative. Submit your application below to be reviewed by leadership.'}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setIsSubmitting(true);
                await applyToGang({
                  id: session.user.id,
                  name: session.user.name || 'Discord User',
                  avatar: session.user.image || '',
                  appliedAt: new Date().toISOString()
                });
                setMemberStatus('pending');
                setIsSubmitting(false);
                showToast(lang === 'th' ? 'ส่งใบสมัครเรียบร้อยแล้ว' : 'Application submitted');
              }}
              disabled={isSubmitting}
              className="py-3 px-8 rounded-2xl bg-[#ff2a44] hover:bg-[#e0243c] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(255,42,68,0.4)] transition-all cursor-pointer"
            >
              {isSubmitting ? (lang === 'th' ? 'กำลังส่งข้อมูล...' : 'Submitting...') : (lang === 'th' ? 'ยืนยันการส่งใบสมัคร' : 'Confirm Application')}
            </button>
          </div>
        )}

        {/* PENDING APPLICANT */}
        {memberStatus === 'pending' && (
          <div className="bg-black/60 border border-amber-500/20 rounded-3xl p-8 sm:p-12 text-center backdrop-blur-3xl shadow-2xl max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Clock size={28} className="animate-spin-slow" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase text-amber-300 font-heading">
              {lang === 'th' ? 'อยู่ระหว่างการพิจารณาใบสมัคร' : 'APPLICATION UNDER REVIEW'}
            </h2>
            <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
              {lang === 'th'
                ? 'ใบสมัครของคุณถูกส่งไปยังบอร์ดบริหารแล้ว โปรดรอการอนุมัติและแต่งตั้งยศตำแหน่งจากผู้ดูแลระบบ'
                : 'Your clearance request is currently in queue. Once approved by administration, your operative dashboard will be unlocked.'}
            </p>
          </div>
        )}

        {/* BANNED / SUSPENDED */}
        {memberStatus === 'banned' && (
          <div className="bg-black/60 border border-red-500/30 rounded-3xl p-8 sm:p-12 text-center backdrop-blur-3xl shadow-2xl max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={28} />
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase text-red-400 font-heading">
              {lang === 'th' ? 'บัญชีถูกระงับการใช้งาน' : 'OPERATIVE SUSPENDED'}
            </h2>
            <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
              {lang === 'th'
                ? 'บัญชีของคุณถูกระงับการใช้งานโดยผู้ดูแลระบบ ไม่สามารถปรับแต่งข้อมูลหรือเปิดเผยหน้า Bio ได้'
                : 'This operative account has been suspended by syndicate command.'}
            </p>
          </div>
        )}

        {/* ACTIVE MEMBER STUDIO (Full Custom Bio & Live Engine) */}
        {memberStatus === 'member' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT / CENTER: Customization Studio (Tabs + Forms) */}
            <div className={`space-y-6 ${showLivePreview ? 'lg:col-span-7' : 'lg:col-span-12 max-w-4xl mx-auto w-full'}`}>

              {/* ── Mobile: Fixed Bottom Nav Bar / Desktop: Inline Segmented Tabs ── */}
              {/* Desktop inline pill tabs */}
              <div className="hidden sm:flex items-center gap-1 p-1 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-2xl">
                {[
                  { id: 'profile', icon: User, label: lang === 'th' ? 'ตัวตน' : 'Identity' },
                  { id: 'appearance', icon: Palette, label: lang === 'th' ? 'สไตล์' : 'Style' },
                  { id: 'music', icon: Music, label: lang === 'th' ? 'เพลง' : 'Music' },
                  { id: 'socials', icon: Share2, label: lang === 'th' ? 'เชื่อมต่อ' : 'Links' },
                  { id: 'analytics', icon: BarChart3, label: lang === 'th' ? 'สถิติ' : 'Analytics' },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                        isActive
                          ? 'bg-[#ff2a44] text-white font-bold shadow-[0_0_15px_rgba(255,42,68,0.5)]'
                          : 'text-white/55 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-white' : 'text-white/50'} />
                      <span className="text-xs font-semibold">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile: Fixed Bottom Navigation Bar (always visible, app-style) */}
              <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 border-t border-white/10 backdrop-blur-3xl safe-area-bottom">
                <div className="flex items-stretch">
                  {[
                    { id: 'profile', icon: User, label: lang === 'th' ? 'โปรไฟล์' : 'Profile' },
                    { id: 'appearance', icon: Palette, label: lang === 'th' ? 'สไตล์' : 'Style' },
                    { id: 'music', icon: Music, label: lang === 'th' ? 'เพลง' : 'Music' },
                    { id: 'socials', icon: Share2, label: lang === 'th' ? 'ลิงก์' : 'Links' },
                    { id: 'analytics', icon: BarChart3, label: lang === 'th' ? 'สถิติ' : 'Stats' },
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex flex-col items-center justify-center py-2.5 px-1 gap-1 transition-all duration-200 cursor-pointer relative ${
                          isActive ? 'text-white' : 'text-white/40 active:text-white/70'
                        }`}
                        style={{ minHeight: 56 }}
                      >
                        {/* Active indicator pill */}
                        {isActive && (
                          <span
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                            style={{ background: '#ff2a44', boxShadow: '0 0 8px rgba(255,42,68,0.8)' }}
                          />
                        )}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-[#ff2a44]/20' : ''}`}>
                          <Icon
                            size={18}
                            className={isActive ? 'text-[#ff4757]' : 'text-white/40'}
                            style={isActive ? { filter: 'drop-shadow(0 0 4px rgba(255,42,68,0.6))' } : {}}
                          />
                        </div>
                        <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-[#ff4757]' : 'text-white/40'}`}>
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>


              {/* TAB 1: IDENTITY & PROFILE */}
              {activeTab === 'profile' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-black/50 border border-white/10 backdrop-blur-2xl space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-heading">
                      <User size={18} className="text-[#ff2a44]" />
                      <span>{lang === 'th' ? 'ตัวตนและข้อมูลโปรไฟล์ (Identity & Profile)' : 'Identity & Profile'}</span>
                    </h3>
                    <p className="text-xs text-white/50 mt-1">
                      {lang === 'th' ? 'กำหนดที่อยู่ URL สโลแกน และรูปภาพตัวตนของคุณในทำเนียบสมาชิก' : 'Set your unique URL handle, slogan, and operative dossier info.'}
                    </p>
                  </div>

                  {/* Slug / Custom Bio URL — Fixed non-overlapping input group */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                      <LinkIcon size={13} className="text-[#ff2a44]" />
                      <span>{lang === 'th' ? 'ที่อยู่ลิงก์ Bio ส่วนตัว (Custom Slug)' : 'Custom Bio URL Handle'}</span>
                    </label>
                    <div className="flex items-center bg-black/60 border border-white/15 focus-within:border-[#ff2a44] focus-within:ring-1 focus-within:ring-[#ff2a44]/40 rounded-2xl overflow-hidden transition-all">
                      <div className="px-3.5 py-2.5 bg-white/5 border-r border-white/10 text-xs font-mono text-white/40 select-none shrink-0 flex items-center gap-1">
                        <span className="text-[#ff2a44] font-bold">/</span>bio/
                      </div>
                      <input
                        type="text"
                        value={bioData.slug || ''}
                        onChange={e => setBioData({ ...bioData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                        placeholder="your-custom-slug"
                        className="flex-1 bg-transparent px-3.5 py-2.5 text-xs font-mono text-white outline-none placeholder:text-white/20 min-w-0"
                      />
                    </div>
                    {slugStatus.message && (
                      <span className={`text-[11px] font-mono flex items-center gap-1 ${slugStatus.available ? 'text-emerald-400' : 'text-red-400'}`}>
                        {slugStatus.available ? <Check size={11} /> : <AlertCircle size={11} />}
                        {slugStatus.message}
                      </span>
                    )}
                  </div>

                  {/* Display Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                      {lang === 'th' ? 'ชื่อเรียกขาน / นามแฝง (Codename)' : 'Display Codename'}
                    </label>
                    <input
                      type="text"
                      value={bioData.name}
                      onChange={e => setBioData({ ...bioData, name: e.target.value })}
                      placeholder="Codename / ชื่อในแก๊ง"
                      className="w-full bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-2xl px-4 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  {/* Profile Avatar Upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                      {lang === 'th' ? 'รูปภาพโปรไฟล์ (Avatar Image / GIF)' : 'Avatar Image / GIF'}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-white/15 bg-black">
                        <img src={bioData.avatar || session.user.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={bioData.avatar}
                          onChange={e => setBioData({ ...bioData, avatar: e.target.value })}
                          placeholder="URL รูปภาพ หรือ GIF..."
                          className="flex-1 bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-2xl px-3 py-2 text-xs text-white outline-none"
                        />
                        <label className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 transition-all">
                          <Upload size={13} />
                          <span>{uploadingAvatar ? '...' : (lang === 'th' ? 'อัปโหลด' : 'Upload')}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleFileUpload(e.target.files[0], url => setBioData({ ...bioData, avatar: url }), setUploadingAvatar, bioData.avatar)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Profile Frame / Avatar Decoration (ดึงอัตโนมัติจาก Discord + เลือกลักษณะการแสดงผล) */}
                  <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={13} className="text-[#ff2a44]" />
                        <span>{lang === 'th' ? 'กรอบโปรไฟล์ Discord (Avatar Decoration อัตโนมัติ)' : 'Discord Avatar Frame (Auto Synced)'}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {bioData.avatarDecoration ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {lang === 'th' ? 'ดึงกรอบแล้ว' : 'Synced'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400">
                            {lang === 'th' ? 'ไม่มีกรอบใน Discord' : 'No Frame Detected'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleSyncDiscordAccount}
                          disabled={isSyncingDiscord}
                          className="px-2.5 py-1 rounded-xl bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[#818cf8] text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer"
                          title="Refresh Discord Frame"
                        >
                          <RefreshCw size={10} className={isSyncingDiscord ? 'animate-spin' : ''} />
                          <span>{isSyncingDiscord ? '...' : (lang === 'th' ? 'รีเฟรชกรอบ' : 'Refresh')}</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Live Composite Preview of Avatar WITH Auto-detected Discord Frame */}
                    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-black/40 border border-white/10">
                      <div className="relative w-14 h-14 rounded-full shrink-0 border border-white/20 bg-black flex items-center justify-center shadow-lg">
                        <img 
                          src={bioData.avatar || session.user.image} 
                          alt="" 
                          className="w-full h-full rounded-full object-cover" 
                        />
                        {bioData.avatarDecoration && bioData.showAvatarDecoration !== 'none' && (
                          <img
                            src={(bioData.avatarDecoration.startsWith('http') ? bioData.avatarDecoration : `https://cdn.discordapp.com/avatar-decoration-presets/${bioData.avatarDecoration}.png?size=256&passthrough=true`).replace('passthrough=false', 'passthrough=true')}
                            alt=""
                            className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] max-w-none max-h-none pointer-events-none z-10 object-contain drop-shadow-md"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-white">
                            {bioData.avatarDecoration 
                              ? (lang === 'th' ? 'ตรวจพบกรอบจาก Discord อัตโนมัติ' : 'Discord Avatar Decoration Detected') 
                              : (lang === 'th' ? 'ยังไม่พบกรอบโปรไฟล์ Discord' : 'No Discord Avatar Frame Found')}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
                          {bioData.avatarDecoration 
                            ? (lang === 'th' 
                                ? 'ระบบดึงกรอบจาก Discord ของคุณมาใช้งานให้อัตโนมัติ ไม่ต้องอัปโหลดเอง' 
                                : 'Your frame is automatically retrieved directly from Discord.') 
                            : (lang === 'th' 
                                ? 'หากคุณใส่กรอบใน Discord แล้ว ให้กด "รีเฟรชกรอบ" หรือตรวจสอบว่าเข้าห้อง discord.gg/lanyard แล้ว' 
                                : 'Wear a frame in Discord and join discord.gg/lanyard to auto-sync.')}
                        </p>
                      </div>
                    </div>

                    {/* Avatar Frame Display Placement Selection (เลือกจุดแสดงผลกรอบโปรไฟล์) */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-mono text-white/60 uppercase">
                        <span>{lang === 'th' ? 'ตำแหน่งที่ต้องการแสดงกรอบโปรไฟล์' : 'Display Frame Placement'}</span>
                        <span className="text-[#ff4757] font-bold">
                          {bioData.showAvatarDecoration === 'both' ? (lang === 'th' ? 'ทั้งสองจุด' : 'Both')
                            : bioData.showAvatarDecoration === 'top_only' ? (lang === 'th' ? 'บนเท่านั้น' : 'Top Only')
                            : bioData.showAvatarDecoration === 'bottom_only' ? (lang === 'th' ? 'ล่างเท่านั้น' : 'Bottom Only')
                            : (lang === 'th' ? 'ปิดกรอบ' : 'Hidden')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'both', label: lang === 'th' ? 'แสดงทั้งสองจุด' : 'Both (Top & Bottom)', desc: lang === 'th' ? 'โปรไฟล์บน + วิดเจ็ตล่าง' : 'Header & Discord Widget' },
                          { id: 'top_only', label: lang === 'th' ? 'โปรไฟล์บนเท่านั้น' : 'Top Profile Only', desc: lang === 'th' ? 'เฉพาะรูปโปรไฟล์ใหญ่' : 'Only main header avatar' },
                          { id: 'bottom_only', label: lang === 'th' ? 'กล่องล่างเท่านั้น' : 'Discord Widget Only', desc: lang === 'th' ? 'เฉพาะกล่อง Discord' : 'Only Discord widget avatar' },
                          { id: 'none', label: lang === 'th' ? 'ซ่อนกรอบทั้งหมด' : 'Hide Frame', desc: lang === 'th' ? 'ไม่แสดงกรอบใดๆ' : 'Do not display decoration' },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setBioData({ ...bioData, showAvatarDecoration: opt.id })}
                            className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                              (bioData.showAvatarDecoration || 'both') === opt.id
                                ? 'bg-[#ff2a44] text-white border-[#ff2a44] shadow-[0_0_12px_rgba(255,42,68,0.4)]'
                                : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
                            }`}
                          >
                            <span className="font-bold text-xs block leading-tight">{opt.label}</span>
                            <span className="text-[9px] opacity-70 mt-1 block leading-tight">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-white/40 italic pt-1">
                        {lang === 'th'
                          ? '* หมายเหตุ: กรอบโปรไฟล์จะแสดงเฉพาะในหน้า Bio ส่วนตัวของคุณเท่านั้น และไม่แสดงในหน้ารวมรายชื่อสมาชิก (Roster)'
                          : '* Note: Avatar decoration frames are only rendered on your individual Bio page and not in the main roster list.'}
                      </p>
                    </div>
                  </div>

                  {/* Bio Description / Slogan */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                      {lang === 'th' ? 'สโลแกนหรือคำคมประจำตัว (Operative Bio / Slogan)' : 'Operative Bio / Slogan'}
                    </label>
                    <textarea
                      rows={3}
                      value={bioData.bio}
                      onChange={e => setBioData({ ...bioData, bio: e.target.value })}
                      placeholder={lang === 'th' ? 'ใส่คำคม คติประจำใจ หรือข้อความที่ต้องการสื่อสาร...' : 'Write your bio, motto or role description...'}
                      className="w-full bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-2xl p-3.5 text-xs text-white outline-none resize-none"
                    />
                  </div>

                  {/* Custom Operative Status Text (สถานะตอนออฟไลน์) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Radio size={13} className="text-emerald-400" />
                        <span>{lang === 'th' ? 'ข้อความสถานะกำหนดเอง (สถานะตอนออฟไลน์)' : 'Custom Status Text (Offline Status)'}</span>
                      </span>
                      <span className="text-[10px] font-mono text-white/40">
                        {lang === 'th' ? 'แสดงเมื่อไม่ได้ออนไลน์ Discord' : 'Shown when offline'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={bioData.discordStatusText}
                      onChange={e => setBioData({ ...bioData, discordStatusText: e.target.value })}
                      placeholder={lang === 'th' ? 'เช่น ปิดการแจ้งเตือน, AFK, ทักทิ้งไว้ (แสดงเมื่อไม่ได้ออนไลน์ Discord)...' : 'e.g. Do Not Disturb, AFK, Leave a message (shown when offline on Discord)...'}
                      className="w-full bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-2xl px-4 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: APPEARANCE & AESTHETICS (GUN.LOLS STYLE) */}
              {activeTab === 'appearance' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-black/50 border border-white/10 backdrop-blur-2xl space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-heading">
                      <Palette size={18} className="text-[#ff2a44]" />
                      <span>{lang === 'th' ? 'รูปลักษณ์และเอฟเฟกต์บรรยากาศ (Appearance & FX)' : 'Appearance & Atmosphere'}</span>
                    </h3>
                    <p className="text-xs text-white/50 mt-1">
                      {lang === 'th' ? 'ปรับแต่งพื้นหลัง ความมืด แสงนีออน สีกระจก และละอองอนุภาคตามสไตล์ของคุณ' : 'Customize background media, dimming, glow accents, glass styles and particles.'}
                    </p>
                  </div>

                  {/* Background Media Engine */}
                  <div className="space-y-3 p-4 rounded-2xl bg-black/40 border border-white/10">
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center justify-between">
                      <span>{lang === 'th' ? 'พื้นหลัง (Background Image / GIF / Video)' : 'Background Image / GIF / Video'}</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bioData.backgroundUrl}
                        onChange={e => setBioData({ ...bioData, backgroundUrl: e.target.value })}
                        placeholder="https://... หรืออัปโหลดไฟล์ภาพ/GIF"
                        className="flex-1 bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-2xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                      />
                      <label className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 transition-all">
                        <Upload size={13} />
                        <span>{uploadingBg ? '...' : (lang === 'th' ? 'อัปโหลด' : 'Upload')}</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={e => handleFileUpload(e.target.files[0], url => setBioData({ ...bioData, backgroundUrl: url }), setUploadingBg, bioData.backgroundUrl)}
                        />
                      </label>
                    </div>

                    {/* Background Darkness & Blur Sliders */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono text-white/70">
                          <span>{lang === 'th' ? 'ความมืดของพื้นหลัง (Dimming)' : 'Backdrop Darkness'}</span>
                          <span className="text-[#ff2a44] font-bold">{bioData.bgDarkness || 45}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          step="5"
                          value={bioData.bgDarkness !== undefined ? bioData.bgDarkness : 45}
                          onChange={e => setBioData({ ...bioData, bgDarkness: parseInt(e.target.value, 10) })}
                          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff2a44]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono text-white/70">
                          <span>{lang === 'th' ? 'ความเบลอของพื้นหลัง (Blur)' : 'Backdrop Blur'}</span>
                          <span className="text-[#ff2a44] font-bold">{bioData.bgBlur || 0}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="2"
                          value={bioData.bgBlur !== undefined ? bioData.bgBlur : 0}
                          onChange={e => setBioData({ ...bioData, bgBlur: parseInt(e.target.value, 10) })}
                          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff2a44]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Primary Accent Color & Nickname Font Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary Accent Color */}
                    <div className="space-y-2 p-4 rounded-2xl bg-black/40 border border-white/10">
                      <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center justify-between">
                        <span>{lang === 'th' ? 'สีธีมหลัก (Theme Accent)' : 'Primary Accent Color'}</span>
                        <span className="font-mono text-[10px] text-[#ff2a44] font-bold">{bioData.primaryColor}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={bioData.primaryColor}
                          onChange={e => setBioData({ ...bioData, primaryColor: e.target.value })}
                          className="w-9 h-9 rounded-xl border border-white/20 bg-transparent cursor-pointer shrink-0"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {THEME_COLOR_PRESETS.slice(0, 6).map(p => (
                            <button
                              key={p.color}
                              type="button"
                              onClick={() => setBioData({ ...bioData, primaryColor: p.color })}
                              className="w-6 h-6 rounded-lg border border-white/20 transition-transform hover:scale-110 cursor-pointer"
                              style={{ backgroundColor: p.color }}
                              title={p.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Nickname Font Color */}
                    <div className="space-y-2 p-4 rounded-2xl bg-black/40 border border-white/10">
                      <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center justify-between">
                        <span>{lang === 'th' ? 'สีชื่อแสดงผล (Name Color)' : 'Nickname Color'}</span>
                        <span className="font-mono text-[10px] text-white font-bold">{bioData.textColor}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={bioData.textColor}
                          onChange={e => setBioData({ ...bioData, textColor: e.target.value })}
                          className="w-9 h-9 rounded-xl border border-white/20 bg-transparent cursor-pointer shrink-0"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {['#ffffff', '#bae6fd', '#fbcfe8', '#fef08a', '#a7f3d0', '#e9d5ff'].map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setBioData({ ...bioData, textColor: c })}
                              className="w-6 h-6 rounded-lg border border-white/20 transition-transform hover:scale-110 cursor-pointer"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Master Profile Container ON/OFF Toggle & Style Selector (เปิด/ปิด กรอบสี่เหลี่ยมกล่องหลัง พร้อมปรับองค์ประกอบใหม่ Bento Grid) */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3.5">
                    <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                      <div>
                        <div className="flex items-center gap-2">
                          <Layers size={15} className="text-[#ff2a44]" />
                          <span className="font-bold text-xs sm:text-sm text-white">
                            {lang === 'th' ? 'กรอบสี่เหลี่ยมพื้นหลัง (Master Card Container)' : 'Master Card Container'}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 mt-1">
                          {lang === 'th' 
                            ? 'เปิดหรือปิดกรอบสี่เหลี่ยมกล่องหลัง ปิด = ใช้แบบเดิมลอยอิสระ (ยอดวิวซ้ายล่าง) | เปิด = จัดองค์ประกอบใหม่ Bento Grid สองคอลัมน์' 
                            : 'Toggle master background card. OFF = original floating (bottom-left views) | ON = new Bento grid composition.'}
                        </p>
                      </div>

                      {/* Primary ON / OFF Toggle Buttons */}
                      <div className="flex items-center bg-black/70 p-1 rounded-xl border border-white/15 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setBioData({ ...bioData, profileContainerStyle: 'floating' })}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            (bioData.profileContainerStyle || 'contained') === 'floating'
                              ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/30'
                              : 'text-white/40 hover:text-white/75'
                          }`}
                        >
                          <span>✕</span>
                          <span>{lang === 'th' ? 'ปิด (แบบเดิม)' : 'OFF (Classic)'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBioData({ 
                            ...bioData, 
                            profileContainerStyle: (bioData.profileContainerStyle === 'floating' || !bioData.profileContainerStyle) ? 'contained' : bioData.profileContainerStyle 
                          })}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            (bioData.profileContainerStyle || 'contained') !== 'floating'
                              ? 'bg-gradient-to-r from-[#ff2a44] to-[#ff4757] text-white shadow-[0_0_15px_rgba(255,42,68,0.4)]'
                              : 'text-white/40 hover:text-white/75'
                          }`}
                        >
                          <span>✓</span>
                          <span>{lang === 'th' ? 'เปิด (แบบใหม่ Bento)' : 'ON (Bento Layout)'}</span>
                        </button>
                      </div>
                    </div>

                    {/* When ON: Show Master Card Style Options */}
                    {(bioData.profileContainerStyle || 'contained') !== 'floating' ? (
                      <div className="pt-2.5 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-white/70">
                          <span>{lang === 'th' ? 'เลือกดีไซน์กรอบสี่เหลี่ยมจัดองค์ประกอบใหม่:' : 'Choose Master Card Design:'}</span>
                          <span className="font-mono text-[#ff4757] uppercase text-[10px]">
                            {bioData.profileContainerStyle || 'contained'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            {
                              id: 'contained',
                              icon: '🎴',
                              label: lang === 'th' ? 'Bento Glass Card' : 'Bento Glass Card',
                              desc: lang === 'th' ? 'กรอบการ์ดสี่เหลี่ยมมน จัดองค์ประกอบ Bento Grid สองคอลัมน์คู่ขนาน กระชับ สวยทันสมัย' : 'Modern Bento layout with 2-column widgets'
                            },
                            {
                              id: 'cyber_hud',
                              icon: '🛡️',
                              label: lang === 'th' ? 'Cyber HUD Frame' : 'Cyber HUD Frame',
                              desc: lang === 'th' ? 'กรอบเหลี่ยมมุมไซเบอร์แทคติคัล พร้อมมุมเล็ง 4 ทิศ และแท็ก OPERATIVE // VERIFIED' : 'Tactical HUD border with illuminated brackets'
                            },
                            {
                              id: 'compact_dock',
                              icon: '💎',
                              label: lang === 'th' ? 'Compact Capsule' : 'Compact Capsule Card',
                              desc: lang === 'th' ? 'กรอบแคปซูลทรงเพรียวกระชับ รวมทุกส่วนไว้ตรงกลางอย่างลงตัว' : 'Slim high-density sleek capsule card'
                            }
                          ].map(layout => (
                            <button
                              key={layout.id}
                              type="button"
                              onClick={() => setBioData({ ...bioData, profileContainerStyle: layout.id })}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                (bioData.profileContainerStyle || 'contained') === layout.id
                                  ? 'bg-[#ff2a44] text-white border-[#ff2a44] shadow-[0_0_15px_rgba(255,42,68,0.4)]'
                                  : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <div className="text-xl mb-1">{layout.icon}</div>
                              <span className="font-bold text-xs">{layout.label}</span>
                              <span className="text-[9px] opacity-75 mt-1 leading-relaxed">{layout.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* When OFF: Friendly confirmation message */
                      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3 text-xs text-white/80">
                        <span className="text-xl shrink-0">✨</span>
                        <div className="text-[11px] leading-relaxed">
                          <strong className="text-white block font-bold">
                            {lang === 'th' ? 'กำลังใช้งาน: "แบบเดิมดั้งเดิม (Classic Floating)"' : 'Active: "Classic Freeform Floating"'}
                          </strong>
                          <span className="text-white/60">
                            {lang === 'th' 
                              ? 'ทุกองค์ประกอบลอยอิสระบนภาพพื้นหลัง ไร้กรอบสี่เหลี่ยมด้านหลัง และยอดวิวนับจริงจะอยู่ที่มุมซ้ายล่างของจอ 100%' 
                              : 'All elements float freely over the wallpaper without an outer card. View counter is fixed at the bottom-left corner.'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Glassmorphic Style Options */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                      {lang === 'th' ? 'สไตล์กระจกการ์ด (Card Glass Style)' : 'Card Glass Style'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {CARD_STYLE_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBioData({ ...bioData, cardStyle: opt.id })}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            bioData.cardStyle === opt.id
                              ? 'bg-[#ff2a44]/20 border-[#ff2a44] text-white shadow-[0_0_15px_rgba(255,42,68,0.3)]'
                              : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="font-bold text-xs">{opt.label}</span>
                          <span className="text-[10px] text-white/40 mt-1">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Social Contacts Layout Style (6 รูปแบบจัดวางสวยงาม สมดุลทุกชิ้น) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                        <Grid size={13} className="text-[#ff2a44]" />
                        <span>{lang === 'th' ? 'รูปแบบการจัดวางช่องทางติดต่อ (Socials Layout Style)' : 'Social Contacts Layout Style'}</span>
                      </label>
                      <span className="text-[10px] font-mono text-[#ff4757] font-bold">
                        {bioData.socialsLayout || 'balanced'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        {
                          id: 'balanced',
                          icon: '⚖️',
                          label: lang === 'th' ? 'ตารางสมมาตร' : 'Balanced Grid',
                          desc: lang === 'th' ? 'จัดกึ่งกลาง 2-4 คอลัมน์สมดุลเท่ากันทุกชิ้น แนะนำ' : 'Auto-balanced symmetrical grid matrix'
                        },
                        {
                          id: 'floating_dock',
                          icon: '🍏',
                          label: lang === 'th' ? 'แท่นบาร์ลอยแก้วหรู' : 'Mac Glass Dock',
                          desc: lang === 'th' ? 'แถบกระจกมนใส Frosted Glass สไตล์มินิมอล' : 'Minimal frosted glass floating dock pill'
                        },
                        {
                          id: 'stacked_cards',
                          icon: '🎴',
                          label: lang === 'th' ? 'การ์ดเรียงแถวหรู' : 'Sleek Stacked Cards',
                          desc: lang === 'th' ? 'การ์ดแนวยาวพร้อมไอคอน แบรนด์ และลูกศรชี้นำ' : 'Full width glass cards with brand and arrow'
                        },
                        {
                          id: 'compact_matrix',
                          icon: '💎',
                          label: lang === 'th' ? 'เมทริกซ์แคปซูลมินิมอล' : 'Compact Matrix',
                          desc: lang === 'th' ? 'แคปซูลขนาดเล็กจัดวางเรียงชิดแบบมีระดับ ไม่รกตา' : 'Clean high-density chic mini capsules'
                        }
                      ].map(style => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setBioData({ ...bioData, socialsLayout: style.id })}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            (bioData.socialsLayout || 'balanced') === style.id
                              ? 'bg-[#ff2a44] text-white border-[#ff2a44] shadow-[0_0_15px_rgba(255,42,68,0.4)]'
                              : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span>{style.icon}</span>
                            <span>{style.label}</span>
                          </div>
                          <span className="text-[9px] opacity-70 mt-1 leading-relaxed">{style.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Particle Atmosphere Type */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                        {lang === 'th' ? 'เอฟเฟกต์ละอองบรรยากาศ (Atmospheric Particles)' : 'Atmospheric Particles'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-white/50">{lang === 'th' ? 'สีละออง:' : 'Color:'}</span>
                        <input
                          type="color"
                          value={bioData.particleColor || '#ffffff'}
                          onChange={e => setBioData({ ...bioData, particleColor: e.target.value })}
                          className="w-5 h-5 rounded-md border border-white/20 bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PARTICLE_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBioData({ ...bioData, particleType: opt.id })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            bioData.particleType === opt.id
                              ? 'bg-[#ff2a44]/20 border-[#ff2a44] text-white'
                              : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
                          }`}
                        >
                          <span className="font-bold text-xs block leading-tight">{opt.label}</span>
                          <span className="text-[9px] text-white/40 block mt-0.5 truncate">{opt.desc}</span>
                        </button>
                      ))}
                    </div>

                    {/* Custom Image Particles Sub-Panel — Advanced Custom Particle Engine */}
                    {bioData.particleType === 'custom_image' && (
                      <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-black/60 border border-[#ff2a44]/40 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#ff2a44] animate-ping" />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              {lang === 'th' ? 'ระบบ Sprite พาสติเคิลแบบกำหนดเอง' : 'Custom Image Particle Engine'}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#ff2a44]/20 border border-[#ff2a44]/40 text-[#ff4757]">
                            {(bioData.customParticleImages || []).length} {lang === 'th' ? 'รูปที่ใช้งาน' : 'active sprites'}
                          </span>
                        </div>

                        {/* Symmetrical Scaling Notice */}
                        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-2.5 text-xs">
                          <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-bold text-white/90">
                              {lang === 'th' ? 'ระบบบีบขนาดให้สมมาตรอัตโนมัติ' : 'Automatic Symmetrical Clamping'}
                            </p>
                            <p className="text-[11px] text-white/50 leading-relaxed">
                              {lang === 'th'
                                ? 'อัปโหลดรูปภาพ PNG, JPG หรือภาพขยับ GIF ได้ไม่จำกัดจำนวน รูปจะถูกปรับอัตราส่วนให้สมดุลและสมมาตรเสมอ ไม่ว่าจะมีความกว้างหรือความยาวเท่าไรก็ตาม'
                                : 'Upload unlimited PNG, JPG, or animated GIF files. Sprites are automatically proportioned and clamped to stay balanced.'}
                            </p>
                          </div>
                        </div>

                        {/* Image Preview Grid with Delete Actions */}
                        {(bioData.customParticleImages || []).length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono text-white/60">
                              <span>{lang === 'th' ? 'รูปภาพที่กำลังแสดงผล (กดปุ่ม ✕ สีแดงเพื่อลบ):' : 'Active Sprites (Click red ✕ to delete):'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  (bioData.customParticleImages || []).forEach(url => {
                                    if (url && typeof url === 'string' && url.startsWith('/uploads/')) {
                                      fetch(`/api/upload?url=${encodeURIComponent(url)}`, { method: 'DELETE' }).catch(() => {});
                                    }
                                  });
                                  setBioData({ ...bioData, customParticleImages: [] });
                                }}
                                className="text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer text-xs"
                              >
                                {lang === 'th' ? 'ล้างทั้งหมด' : 'Clear All'}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-4 pt-4 pb-3 px-4 rounded-2xl bg-black/60 border border-white/10 max-h-56 overflow-y-auto">
                              {(bioData.customParticleImages || []).map((imgUrl, idx) => (
                                <div key={idx} className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-white/20 bg-neutral-900/95 shadow-xl flex flex-col items-center justify-center p-2 transition-all hover:border-red-500/80 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                                  <img
                                    src={imgUrl}
                                    alt=""
                                    className="w-full h-full object-contain drop-shadow"
                                  />
                                  {/* Big prominent, non-clipped remove button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      const removedUrl = (bioData.customParticleImages || [])[idx];
                                      if (removedUrl && typeof removedUrl === 'string' && removedUrl.startsWith('/uploads/')) {
                                        fetch(`/api/upload?url=${encodeURIComponent(removedUrl)}`, { method: 'DELETE' }).catch(() => {});
                                      }
                                      const newImgs = [...(bioData.customParticleImages || [])];
                                      newImgs.splice(idx, 1);
                                      setBioData({ ...bioData, customParticleImages: newImgs });
                                      showToast(lang === 'th' ? `ลบรูปที่ #${idx + 1} เรียบร้อย` : `Deleted sprite #${idx + 1}`);
                                    }}
                                    className="absolute -top-2.5 -right-2.5 z-40 w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 active:scale-90 text-white font-black text-sm flex items-center justify-center shadow-[0_4px_14px_rgba(239,68,68,0.9)] border-2 border-white cursor-pointer transition-all hover:scale-110 touch-manipulation"
                                    title={lang === 'th' ? 'กดเพื่อลบรูปนี้' : 'Delete Sprite'}
                                  >
                                    ✕
                                  </button>
                                  {/* Index Badge */}
                                  <span className="absolute bottom-1 left-2 text-[9px] font-mono font-bold text-white/60 bg-black/70 px-1 rounded pointer-events-none">
                                    #{idx + 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Particle Image: Dual Upload & URL Input */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-white/60 uppercase">
                            {lang === 'th' ? 'เพิ่มรูปภาพพาสติเคิลใหม่ (+ อัปโหลด หรือใส่ URL)' : 'Add New Particle Sprites (+ Upload or URL)'}
                          </span>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {/* URL input */}
                            <div className="flex-1 flex gap-1.5">
                              <input
                                type="text"
                                value={particleUrlInput}
                                onChange={e => setParticleUrlInput(e.target.value)}
                                placeholder="https://... (วางลิงก์รูป PNG/GIF)"
                                className="flex-1 bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!particleUrlInput.trim()) return;
                                  setBioData({
                                    ...bioData,
                                    customParticleImages: [...(bioData.customParticleImages || []), particleUrlInput.trim()]
                                  });
                                  setParticleUrlInput('');
                                  showToast(lang === 'th' ? 'เพิ่มรูปภาพแล้ว' : 'Image added');
                                }}
                                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                              >
                                <Plus size={14} />
                                <span>{lang === 'th' ? 'เพิ่ม' : 'Add'}</span>
                              </button>
                            </div>

                            {/* Prominent Multi-File Upload Button with + */}
                            <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#ff2a44] hover:bg-[#e0243c] text-white text-xs font-bold cursor-pointer transition-all shadow-[0_0_15px_rgba(255,42,68,0.35)] shrink-0">
                              <Plus size={14} className="stroke-[3]" />
                              <span>{uploadingParticle ? (lang === 'th' ? 'กำลังบีบอัด...' : 'Processing...') : (lang === 'th' ? 'อัปโหลดรูปภาพ' : 'Upload Images')}</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp"
                                multiple
                                className="hidden"
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (!files.length) return;
                                  setUploadingParticle(true);
                                  const newUrls = [...(bioData.customParticleImages || [])];
                                  for (const file of files) {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                      const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                      const data = await res.json();
                                      if (data.success && data.url) newUrls.push(data.url);
                                    } catch {}
                                  }
                                  setBioData({ ...bioData, customParticleImages: newUrls });
                                  setUploadingParticle(false);
                                  showToast(lang === 'th' ? `อัปโหลดและปรับขนาดสมมาตร ${files.length} รูปเรียบร้อย` : `Uploaded ${files.length} images`);
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Particle Scale / Size Controls */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-[10px] font-mono text-white/60 uppercase">
                            <span>{lang === 'th' ? 'ขนาดพาสติเคิลที่ตกสาด (Particle Size)' : 'Particle Size Scale'}</span>
                            <span className="text-[#ff4757] font-bold">
                              {bioData.particleSize === 'small' ? '24px (เล็ก)' : bioData.particleSize === 'large' ? '50px (ใหญ่)' : '36px (ปานกลาง)'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'small', label: lang === 'th' ? 'เล็ก (24px)' : 'Small (24px)', desc: 'ละเอียด ละมุน' },
                              { id: 'medium', label: lang === 'th' ? 'ปานกลาง (36px)' : 'Medium (36px)', desc: 'สมดุล แนะนำ' },
                              { id: 'large', label: lang === 'th' ? 'ใหญ่ (50px)' : 'Large (50px)', desc: 'ชัดเจน โดดเด่น' },
                            ].map(sz => (
                              <button
                                key={sz.id}
                                type="button"
                                onClick={() => setBioData({ ...bioData, particleSize: sz.id })}
                                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                                  (bioData.particleSize || 'medium') === sz.id
                                    ? 'bg-[#ff2a44] text-white border-[#ff2a44] shadow-[0_0_12px_rgba(255,42,68,0.4)]'
                                    : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
                                }`}
                              >
                                <span className="font-bold text-xs block">{sz.label}</span>
                                <span className="text-[9px] opacity-70 block">{sz.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Motion Physics & Fall Behaviors */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-mono text-white/60 uppercase">
                            {lang === 'th' ? 'ทิศทางและลักษณะการลอย/การตก (Physics & Direction)' : 'Motion Physics & Direction'}
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              { id: 'rain', icon: '🌧️', label: lang === 'th' ? 'ฝนสาดลงมา' : 'Rain Torrent', desc: 'ร่วงลงมาเป็นสาย' },
                              { id: 'up', icon: '🎈', label: lang === 'th' ? 'ลอยฟุ้งขึ้นฟ้า' : 'Float Up', desc: 'ลอยขึ้นสู่ด้านบน' },
                              { id: 'burst', icon: '💥', label: lang === 'th' ? 'ระเบิดสาดออก' : 'Radial Burst', desc: 'พุ่งกระจายรอบทิศ' },
                              { id: 'drift', icon: '❄️', label: lang === 'th' ? 'หิมะส่ายร่วง' : 'Snow Drift', desc: 'ส่ายไปมาซ้ายขวา' },
                              { id: 'fountain', icon: '⛲', label: lang === 'th' ? 'น้ำพุพุ่งโค้ง' : 'Fountain Arc', desc: 'พุ่งโค้งตกลงมา' },
                              { id: 'all', icon: '🌀', label: lang === 'th' ? 'ลอยอิสระ' : 'Zero-G Space', desc: 'ไหลลอยทุกทิศทาง' },
                            ].map(dir => (
                              <button
                                key={dir.id}
                                type="button"
                                onClick={() => setBioData({ ...bioData, particleEmitDirection: dir.id })}
                                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                  (bioData.particleEmitDirection || 'all') === dir.id
                                    ? 'bg-[#ff2a44] text-white border-[#ff2a44] shadow-[0_0_12px_rgba(255,42,68,0.4)]'
                                    : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 font-bold text-xs">
                                  <span>{dir.icon}</span>
                                  <span>{dir.label}</span>
                                </div>
                                <span className="text-[9px] opacity-70 mt-0.5">{dir.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mouse Cursor Trail FX */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                      {lang === 'th' ? 'หางเคอร์เซอร์เมาส์ (Mouse Cursor Trail)' : 'Mouse Cursor Trail'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CURSOR_OPTIONS.map(cur => (
                        <button
                          key={cur.id}
                          type="button"
                          onClick={() => setBioData({ ...bioData, cursorEffect: cur.id })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            bioData.cursorEffect === cur.id
                              ? 'bg-[#ff2a44]/20 border-[#ff2a44] text-white'
                              : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
                          }`}
                        >
                          <span className="font-bold text-xs block leading-tight">{cur.label}</span>
                          <span className="text-[9px] text-white/40 block mt-0.5 truncate">{cur.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SOUNDTRACK & AUDIO ENGINE */}
              {activeTab === 'music' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-black/50 border border-white/10 backdrop-blur-2xl space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-heading">
                      <Music size={18} className="text-[#ff2a44]" />
                      <span>{lang === 'th' ? 'ระบบเพลงประจำตัว (Soundtrack Engine)' : 'Soundtrack Engine'}</span>
                    </h3>
                    <p className="text-xs text-white/50 mt-1">
                      {lang === 'th' ? 'ใส่ลิงก์ YouTube หรืออัปโหลด MP3 พร้อมกำหนดท่อนดรอป (Start Second) และความดังเริ่มต้น' : 'Embed YouTube or MP3 with custom drop timestamp and initial visitor volume.'}
                    </p>
                  </div>

                  {/* Song Search & Auto-Select Engine (พิมพ์ชื่อเพลงและดึงชื่อเพลงมาให้เลือกได้ทันที) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-2">
                        <Search size={14} className="text-[#ff2a44]" />
                        <span>{lang === 'th' ? 'ค้นหาเพลงอัตโนมัติ (Search & Auto-Fill Soundtrack)' : 'Search & Auto-Fill Soundtrack'}</span>
                      </label>
                      <span className="text-[10px] font-mono text-white/40">
                        {lang === 'th' ? 'พิมพ์ชื่อเพลงหรือศิลปิน' : 'Type title or artist'}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={songSearchQuery}
                          onChange={e => setSongSearchQuery(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchSongs();
                            }
                          }}
                          placeholder={lang === 'th' ? 'พิมพ์ชื่อเพลง หรือชื่อศิลปิน (เช่น Feather, BIRDS OF A FEATHER, Bodyslam)...' : 'Search song title or artist...'}
                          className="w-full bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-xl pl-9 pr-8 py-2.5 text-xs text-white outline-none font-mono"
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        {songSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSongSearchQuery('');
                              setSongSearchResults([]);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSearchSongs()}
                        disabled={isSearchingSongs}
                        className="px-4 py-2.5 rounded-xl bg-[#ff2a44] hover:bg-[#ff4757] text-white text-xs font-bold font-mono transition-all shadow-[0_0_15px_rgba(255,42,68,0.3)] flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={isSearchingSongs ? 'animate-spin' : ''} />
                        <span>{isSearchingSongs ? (lang === 'th' ? 'กำลังค้นหา...' : 'Searching...') : (lang === 'th' ? 'ค้นหาเพลง' : 'Search')}</span>
                      </button>
                    </div>

                    {/* Search Results Grid */}
                    {songSearchResults.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
                          <span>{lang === 'th' ? `ผลการค้นหา (${songSearchResults.length} เพลง) — คลิกเลือกเพลงที่ต้องการ:` : `Results (${songSearchResults.length}) — Click to select:`}</span>
                          <button
                            type="button"
                            onClick={() => setSongSearchResults([])}
                            className="text-white/40 hover:text-white text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <X size={10} />
                            <span>{lang === 'th' ? 'ปิดผลลัพธ์' : 'Close'}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                          {songSearchResults.map((track) => (
                            <div
                              key={track.id}
                              onClick={() => handleSelectSong(track)}
                              className="group p-2.5 rounded-xl bg-black/60 hover:bg-[#ff2a44]/15 border border-white/10 hover:border-[#ff2a44]/60 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(255,42,68,0.25)]"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/15 bg-black/80 flex items-center justify-center">
                                  {track.cover ? (
                                    <img src={track.cover} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Disc size={18} className="text-white/40" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate group-hover:text-[#ff4757] transition-colors">
                                    {track.title}
                                  </div>
                                  <div className="text-[10px] text-white/50 truncate font-mono">
                                    {track.artist}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="px-2.5 py-1 rounded-lg bg-white/10 group-hover:bg-[#ff2a44] text-white text-[10px] font-bold font-mono shrink-0 transition-all"
                              >
                                {lang === 'th' ? 'เลือกเพลง' : 'Select'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Music URL / File Upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                      {lang === 'th' ? 'ลิงก์เพลง หรือไฟล์เสียง' : 'Soundtrack URL or Audio File'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bioData.musicUrl}
                        onChange={e => setBioData({ ...bioData, musicUrl: e.target.value })}
                        placeholder="https://youtu.be/... หรืออัปโหลด MP3"
                        className="flex-1 bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-2xl px-4 py-2.5 text-xs text-white outline-none font-mono"
                      />
                      <label className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 transition-all">
                        <Upload size={13} />
                        <span>{uploadingAudio ? '...' : (lang === 'th' ? 'อัปโหลด MP3' : 'Upload MP3')}</span>
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={e => handleFileUpload(e.target.files[0], url => setBioData({ ...bioData, musicUrl: url }), setUploadingAudio, bioData.musicUrl)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Music Player UI Style Selector (เลือกได้ 4 สไตล์) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                        <Disc size={13} className="text-[#ff2a44]" />
                        <span>{lang === 'th' ? 'รูปแบบ UI เครื่องเล่นเพลงในหน้า Bio (เลือกได้ 4 สไตล์)' : 'Bio Music Player UI Style'}</span>
                      </label>
                      <span className="text-[10px] font-mono text-[#ff4757] font-bold uppercase">
                        {bioData.musicPlayerStyle || 'deck'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'deck', icon: '🎛️', label: 'Studio Deck', desc: lang === 'th' ? 'มินิมอล กระจกใสคลาสสิก' : 'Classic frosted glass deck' },
                        { id: 'vinyl', icon: '💿', label: 'Vinyl Turntable', desc: lang === 'th' ? 'แผ่นเสียงหมุน 360° พร้อมเข็ม' : 'Spinning 360° vinyl with needle' },
                        { id: 'pill', icon: '💊', label: 'Cyber Capsule', desc: lang === 'th' ? 'แคปซูลลอยนีออน พร้อมคลื่น EQ' : 'Floating capsule with audio EQ' },
                        { id: 'card', icon: '🖼️', label: 'Showcase Card', desc: lang === 'th' ? 'การ์ดปกขนาดใหญ่ ปุ่ม Play กลาง' : 'Album artwork showcase card' },
                        { id: 'wave', icon: '🌊', label: 'Waveform Strip', desc: lang === 'th' ? 'แถบคลื่นเสียงมินิมอลเรียบหรู' : 'Minimal waveform strip player' },
                      ].map(style => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setBioData({ ...bioData, musicPlayerStyle: style.id })}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            (bioData.musicPlayerStyle || 'deck') === style.id
                              ? 'bg-[#ff2a44] text-white border-[#ff2a44] shadow-[0_0_15px_rgba(255,42,68,0.4)]'
                              : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="text-xl mb-1">{style.icon}</div>
                          <span className="font-bold text-xs">{style.label}</span>
                          <span className="text-[9px] opacity-70 mt-1 leading-relaxed">{style.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* LIVE PREVIEW & AUDIO CONTROLLER */}
                  {bioData.musicUrl && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
                      
                      {/* Track Details Row */}
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-white/15 shadow-md bg-black">
                            {fetchedMusicInfo?.thumbnail || bioData.musicCover ? (
                              <img src={fetchedMusicInfo?.thumbnail || bioData.musicCover} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#ff2a44] to-black flex items-center justify-center">
                                <Disc size={24} className="text-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isTestingAudio ? 'bg-[#ff2a44] animate-ping' : 'bg-emerald-400'}`} />
                                {isTestingAudio 
                                  ? (lang === 'th' ? 'กำลังทดสอบเสียง...' : 'TESTING AUDIO...') 
                                  : (lang === 'th' ? 'เพลงพร้อมเล่น' : 'TRACK READY')}
                              </span>
                            </div>
                            <h5 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md mt-0.5">
                              {bioData.musicTitle || fetchedMusicInfo?.title || 'Soundtrack'}
                            </h5>
                            <span className="text-xs text-white/50 truncate">
                              {bioData.musicArtist || fetchedMusicInfo?.author || 'Operative Theme'}
                            </span>
                          </div>
                        </div>

                        {/* Song Info Stats */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 flex items-center gap-2">
                            <Timer size={13} className="text-[#ff2a44]" />
                            <div className="flex flex-col">
                              <span className="text-[9px] text-white/40 uppercase font-mono leading-none">
                                {lang === 'th' ? 'ความยาวเพลง' : 'Duration'}
                              </span>
                              <span className="text-xs font-mono font-bold text-white leading-tight">
                                {previewDuration > 0 ? `${formatSeconds(previewDuration)} (${previewDuration}s)` : (lang === 'th' ? 'กำลังตรวจจับ...' : 'Detecting...')}
                              </span>
                            </div>
                          </div>

                          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 flex items-center gap-2">
                            <Volume2 size={13} className="text-cyan-400" />
                            <div className="flex flex-col">
                              <span className="text-[9px] text-white/40 uppercase font-mono leading-none">
                                {lang === 'th' ? 'เสียงเริ่มต้น' : 'Init Vol'}
                              </span>
                              <span className="text-xs font-mono font-bold text-cyan-300 leading-tight">
                                {bioData.musicVolume !== undefined ? bioData.musicVolume : 40}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Timeline Scrubber Bar ("หลอดเพลง") */}
                      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <label className="text-xs font-semibold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                            <Sliders size={13} className="text-[#ff2a44]" />
                            <span>{lang === 'th' ? 'หลอดปรับช่วงเวลาเริ่มเพลง (Timeline Scrubber)' : 'Timeline Scrubber'}</span>
                          </label>

                          <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-[#ff2a44]/20 border border-[#ff2a44]/40 text-[#ff4757] flex items-center gap-1.5">
                            <Clock size={12} className="text-[#ff2a44]" />
                            <span>{lang === 'th' ? `เริ่มที่: ${formatSeconds(bioData.musicStartTime)} (${Number(bioData.musicStartTime) || 0}s)` : `Starts: ${formatSeconds(bioData.musicStartTime)}`}</span>
                          </span>
                        </div>

                        {/* Range Track Bar */}
                        <div className="relative py-1">
                          <input 
                            type="range"
                            min="0"
                            max={effectiveDuration}
                            step="1"
                            value={Math.min(effectiveDuration, Number(bioData.musicStartTime) || 0)}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10);
                              setBioData({ ...bioData, musicStartTime: val });
                              if (isTestingAudio) {
                                handleToggleTestAudio(val);
                              }
                            }}
                            className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff2a44] hover:accent-[#ff4757] focus:outline-none transition-all"
                          />
                        </div>

                        {/* Timeline Labels */}
                        <div className="flex justify-between items-center text-[10px] font-mono text-white/50">
                          <span className="flex items-center gap-1">
                            <Play size={10} className="text-white/40" /> 00:00 ({lang === 'th' ? 'ต้นเพลง' : 'Start'})
                          </span>
                          <span className="text-[#ff4757] font-semibold flex items-center gap-1">
                            <Compass size={11} className="text-[#ff2a44]" />
                            {lang === 'th' ? `จุดเริ่ม: ${formatSeconds(bioData.musicStartTime)} (${Number(bioData.musicStartTime) || 0}s)` : `Drop: ${formatSeconds(bioData.musicStartTime)}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer size={10} className="text-white/40" />
                            {formatSeconds(effectiveDuration)} {previewDuration > 0 ? (lang === 'th' ? '(เต็มเพลง)' : '(Full)') : ''}
                          </span>
                        </div>
                      </div>

                      {/* Default Visitor Volume Setting */}
                      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <label className="text-xs font-semibold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                            {(Number(bioData.musicVolume) || 40) === 0 ? (
                              <VolumeX size={14} className="text-white/40" />
                            ) : (Number(bioData.musicVolume) || 40) < 50 ? (
                              <Volume1 size={14} className="text-cyan-400" />
                            ) : (
                              <Volume2 size={14} className="text-cyan-400" />
                            )}
                            <span>{lang === 'th' ? 'ระดับเสียงเริ่มต้นเมื่อเข้าดู Bio (Default Visitor Volume)' : 'Default Visitor Volume'}</span>
                          </label>

                          <span className="text-xs font-mono font-bold px-3 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                            {bioData.musicVolume !== undefined ? bioData.musicVolume : 40}%
                          </span>
                        </div>

                        {/* Volume Slider */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleVolumeChange((Number(bioData.musicVolume) || 40) === 0 ? 40 : 0)}
                            className="text-white/60 hover:text-white transition-colors cursor-pointer"
                            title="Mute / Unmute"
                          >
                            {(Number(bioData.musicVolume) || 40) === 0 ? (
                              <VolumeX size={16} className="text-red-400" />
                            ) : (
                              <Volume2 size={16} className="text-cyan-400" />
                            )}
                          </button>

                          <input 
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={bioData.musicVolume !== undefined ? bioData.musicVolume : 40}
                            onChange={e => handleVolumeChange(parseInt(e.target.value, 10))}
                            className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 focus:outline-none"
                          />

                          <span className="text-xs font-mono text-white/70 min-w-[36px] text-right font-bold">
                            {bioData.musicVolume !== undefined ? bioData.musicVolume : 40}%
                          </span>
                        </div>

                        {/* Quick Volume Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[10px] text-white/40 font-mono">
                            {lang === 'th' ? 'เลือกระดับเสียง:' : 'Presets:'}
                          </span>
                          {[
                            { vol: 15, label: lang === 'th' ? '15% แผ่วเบา' : '15% Quiet' },
                            { vol: 30, label: lang === 'th' ? '30% มาตรฐาน' : '30% Standard' },
                            { vol: 50, label: lang === 'th' ? '50% ปานกลาง' : '50% Medium' },
                            { vol: 75, label: lang === 'th' ? '75% ชัดเจน' : '75% Loud' },
                            { vol: 100, label: lang === 'th' ? '100% สูงสุด' : '100% Max' },
                          ].map(preset => (
                            <button
                              key={preset.vol}
                              type="button"
                              onClick={() => handleVolumeChange(preset.vol)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono transition-all cursor-pointer ${
                                (Number(bioData.musicVolume !== undefined ? bioData.musicVolume : 40)) === preset.vol
                                  ? 'bg-cyan-500 text-black font-bold shadow-sm'
                                  : 'bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Drop Point Second Inputs & Test Controls */}
                      <div className="pt-3 border-t border-white/10 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock size={14} className="text-[#ff2a44]" />
                            <span>{lang === 'th' ? 'กรอกวินาทีที่เริ่มเพลงแบบละเอียด (Fine-Tune Drop Point)' : 'Fine-Tune Drop Point'}</span>
                          </label>

                          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#ff2a44]/20 border border-[#ff2a44]/40 text-[#ff4757] flex items-center gap-1.5">
                            <Timer size={12} className="text-[#ff4757]" />
                            <span>{lang === 'th' ? `เริ่มที่: ${formatSeconds(bioData.musicStartTime)} (${Number(bioData.musicStartTime) || 0} วินาที)` : `Starts: ${formatSeconds(bioData.musicStartTime)} (${Number(bioData.musicStartTime) || 0}s)`}</span>
                          </span>
                        </div>

                        {/* Number Input & Actions */}
                        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                          {/* Controlled Input with bug fixed */}
                          <div className="relative flex-1 sm:max-w-[200px]">
                            <input 
                              type="number" 
                              min="0"
                              max="3600"
                              step="1"
                              value={bioData.musicStartTime === undefined || bioData.musicStartTime === null ? '' : bioData.musicStartTime} 
                              onChange={e => {
                                const rawVal = e.target.value;
                                if (rawVal === '') {
                                  setBioData({ ...bioData, musicStartTime: '' });
                                } else {
                                  const parsed = parseInt(rawVal, 10);
                                  setBioData({ ...bioData, musicStartTime: isNaN(parsed) ? '' : Math.max(0, parsed) });
                                }
                              }} 
                              onBlur={() => {
                                if (bioData.musicStartTime === '' || isNaN(Number(bioData.musicStartTime))) {
                                  setBioData({ ...bioData, musicStartTime: 0 });
                                } else {
                                  setBioData({ ...bioData, musicStartTime: Math.max(0, Math.floor(Number(bioData.musicStartTime))) });
                                }
                              }}
                              className="w-full bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-2xl pl-4 pr-14 py-2.5 text-sm font-mono font-bold text-white outline-none"
                              placeholder="0"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-white/40">วินาที</span>
                          </div>

                          {/* Grab Timestamp button */}
                          {previewCurrentTime > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setBioData({ ...bioData, musicStartTime: previewCurrentTime });
                                showToast(lang === 'th' ? `บันทึกวินาทีที่ ${previewCurrentTime} เป็นจุดเริ่มเพลงแล้ว` : `Set drop point to ${previewCurrentTime}s`);
                              }}
                              className="px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Crosshair size={13} className="text-amber-400" />
                              <span>{lang === 'th' ? `ดึงเวลาที่ฟังอยู่ (${formatSeconds(previewCurrentTime)})` : `Grab Time (${formatSeconds(previewCurrentTime)})`}</span>
                            </button>
                          )}

                          {/* Instant Test Play & Stop Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleTestAudio()}
                            className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                              isTestingAudio
                                ? 'bg-amber-500/25 hover:bg-amber-500/35 border-amber-500/50 text-amber-300 ring-2 ring-amber-500/30 animate-pulse'
                                : 'bg-[#ff2a44]/20 hover:bg-[#ff2a44]/30 border-[#ff2a44]/40 text-white hover:border-[#ff2a44]'
                            }`}
                          >
                            {isTestingAudio ? (
                              <>
                                <Square size={13} className="text-amber-400 fill-amber-400" />
                                <span>{lang === 'th' ? 'หยุดทดสอบ' : 'Stop Test'}</span>
                              </>
                            ) : (
                              <>
                                <Play size={13} className="text-[#ff2a44] fill-[#ff2a44]" />
                                <span>{lang === 'th' ? 'ทดสอบเล่นท่อนนี้' : 'Test Play'}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] text-white/40 font-mono">
                            {lang === 'th' ? 'เลือกด่วน:' : 'Quick Presets:'}
                          </span>
                          {[
                            { sec: 0, label: '0s (ตั้งแต่แรก)' },
                            { sec: 15, label: '15s' },
                            { sec: 30, label: '30s (ฮุค 1)' },
                            { sec: 45, label: '45s' },
                            { sec: 60, label: '1:00 (ดรอป)' },
                            { sec: 75, label: '1:15' },
                            { sec: 90, label: '1:30' },
                          ].map(preset => (
                            <button
                              key={preset.sec}
                              type="button"
                              onClick={() => {
                                setBioData({ ...bioData, musicStartTime: preset.sec });
                                if (isTestingAudio) {
                                  handleToggleTestAudio(preset.sec);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all cursor-pointer ${
                                (Number(bioData.musicStartTime) || 0) === preset.sec
                                  ? 'bg-[#ff2a44] text-white font-bold shadow-sm'
                                  : 'bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Manual Title & Artist Overrides */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                        {lang === 'th' ? 'ชื่อเพลง (Custom Title)' : 'Track Title'}
                      </label>
                      <input
                        type="text"
                        value={bioData.musicTitle}
                        onChange={e => setBioData({ ...bioData, musicTitle: e.target.value })}
                        placeholder="ชื่อเพลง..."
                        className="w-full bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-2xl px-4 py-2.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                        {lang === 'th' ? 'ชื่อศิลปิน (Artist Name)' : 'Artist Name'}
                      </label>
                      <input
                        type="text"
                        value={bioData.musicArtist}
                        onChange={e => setBioData({ ...bioData, musicArtist: e.target.value })}
                        placeholder="ชื่อศิลปิน..."
                        className="w-full bg-black/60 border border-white/15 focus:border-[#ff2a44] rounded-2xl px-4 py-2.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: WIDGETS & SOCIAL DOCK */}
              {activeTab === 'socials' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-black/50 border border-white/10 backdrop-blur-2xl space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-heading">
                      <Share2 size={18} className="text-[#ff2a44]" />
                      <span>{lang === 'th' ? 'การเชื่อมต่อและช่องทางติดต่อ (Integrations & Socials)' : 'Integrations & Socials'}</span>
                    </h3>
                    <p className="text-xs text-white/50 mt-1">
                      {lang === 'th' ? 'เชื่อมต่อวิดเจ็ต Discord, Roblox และปุ่มโซเชียลมีเดียสไตล์ Gun.lol' : 'Link your Discord presence, Roblox operative card, and social media buttons.'}
                    </p>
                  </div>

                  {/* Discord Presence Sync */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                        <Disc size={14} className="text-[#5865F2]" />
                        <span>Discord Presence Widget</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleSyncDiscordAccount}
                        disabled={isSyncingDiscord}
                        className="px-3 py-1.5 rounded-xl bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[#5865F2] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={12} className={isSyncingDiscord ? 'animate-spin' : ''} />
                        <span>{isSyncingDiscord ? 'Syncing...' : (lang === 'th' ? 'ซิงก์จาก Discord' : 'Auto Sync')}</span>
                      </button>
                    </div>

                    {/* Lanyard Real-Time & Auto-Pull Guide */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#5865F2]/15 via-black to-[#ff2a44]/10 border border-[#5865F2]/30 space-y-3.5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shadow-md">
                            <Zap size={15} />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-white">
                              {lang === 'th' ? 'ทำไมต้องเข้าร่วม discord.gg/lanyard ?' : 'Why join discord.gg/lanyard ?'}
                            </h4>
                            <p className="text-[11px] text-white/50">
                              {lang === 'th' ? 'เชื่อมต่อเพื่อปลดล็อกการดึงข้อมูลสดทั้งหมดจาก Discord เข้าสู่หน้า Bio อัตโนมัติ' : 'Connect once to unlock auto-pulling all live Discord data directly to your Bio.'}
                            </p>
                          </div>
                        </div>

                        <a
                          href="https://discord.gg/lanyard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(88,101,242,0.4)] flex items-center gap-1.5 shrink-0"
                        >
                          <ExternalLink size={12} />
                          <span>{lang === 'th' ? 'กดเข้าร่วม Lanyard' : 'Join Lanyard Discord'}</span>
                        </a>
                      </div>

                      {/* What Lanyard pulls list (Only Avatar Decoration and Clan Tag as requested) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-start gap-2">
                          <span className="text-base shrink-0">🖼️</span>
                          <div>
                            <span className="font-bold text-white block text-[11px]">
                              {lang === 'th' ? 'ดึงกรอบโปรไฟล์ (Avatar Decoration)' : 'Avatar Decoration'}
                            </span>
                            <span className="text-[10px] text-white/50">
                              {lang === 'th' ? 'ดึงกรอบอนิเมชั่นที่คุณใส่ใน Discord มาแสดงบน Bio อัตโนมัติ' : 'Sync your animated Discord avatar frame automatically.'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-start gap-2">
                          <span className="text-base shrink-0">🏷️</span>
                          <div>
                            <span className="font-bold text-white block text-[11px]">
                              {lang === 'th' ? 'ดึงป้ายสังกัด / แท็กกิลด์ (Clan Tag)' : 'Clan Tag & Server Badge'}
                            </span>
                            <span className="text-[10px] text-white/50">
                              {lang === 'th' ? 'ดึงป้ายแท็ก Discord เช่น [REAL] หรือแท็กเซิร์ฟเวอร์ของคุณ' : 'Pulls clan tag and identity guild badge.'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Sync Action Bar */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                        <span className="text-[10px] font-mono text-white/50">
                          {bioData.avatarDecoration ? (
                            <span className="text-emerald-400 font-bold">✓ ตรวจพบกรอบโปรไฟล์ Discord เรียบร้อยแล้ว</span>
                          ) : (
                            <span>* เมื่อเข้าดิส Lanyard แล้ว กดปุ่มด้านขวาเพื่อดึงข้อมูลทั้งหมด</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={handleSyncDiscordAccount}
                          disabled={isSyncingDiscord}
                          className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <RefreshCw size={12} className={isSyncingDiscord ? 'animate-spin' : ''} />
                          <span>{isSyncingDiscord ? 'กำลังดึงข้อมูล...' : (lang === 'th' ? 'ซิงก์ดึงข้อมูลทั้งหมดเดี๋ยวนี้' : 'Sync All Discord Data')}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-white/50">Discord ID:</span>
                        <input
                          type="text"
                          value={bioData.discordId}
                          onChange={e => setBioData({ ...bioData, discordId: e.target.value })}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-1"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-white/50">Discord Tag / Username:</span>
                        <input
                          type="text"
                          value={bioData.discordUsername}
                          onChange={e => setBioData({ ...bioData, discordUsername: e.target.value })}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-1"
                        />
                      </div>
                    </div>
                  </div>

{/* Discord Server Showcase & Promotion (โปรโมทเซิร์ฟเวอร์ดิสคอร์ด) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-[#5865F2]/30 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Users size={15} className="text-[#5865F2]" />
                          <span>{lang === 'th' ? 'โปรโมทเซิร์ฟเวอร์ Discord (Discord Server Showcase)' : 'Discord Server Showcase'}</span>
                        </span>
                        <p className="text-[11px] text-white/50 mt-0.5">
                          {lang === 'th' ? 'วางลิงก์คำเชิญเซิร์ฟเวอร์ ระบบจะดึงรูปภาพปก, ชื่อ, คำอธิบาย และยอดสมาชิกผ่าน API มาจัดวางบนหน้า Bio อัตโนมัติ' : 'Paste invite URL to auto-pull server icon, banner, description, and live member count.'}
                        </p>
                      </div>

                      {/* Visibility Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
                        <input
                          type="checkbox"
                          checked={bioData.showDiscordServer !== false}
                          onChange={e => setBioData({ ...bioData, showDiscordServer: e.target.checked })}
                          className="w-4 h-4 accent-[#5865F2] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-white/80">
                          {lang === 'th' ? 'แสดงการ์ดบน Bio' : 'Show on Bio'}
                        </span>
                      </label>
                    </div>

                    {/* Invite Link Input + Fetch Button */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discordInviteInput}
                        onChange={e => setDiscordInviteInput(e.target.value)}
                        placeholder="https://discord.gg/yourserver หรือ invite code"
                        className="flex-1 bg-black/60 border border-white/15 focus:border-[#5865F2] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleFetchDiscordServer()}
                        disabled={isFetchingDiscordServer}
                        className="px-4 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(88,101,242,0.3)] flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={isFetchingDiscordServer ? 'animate-spin' : ''} />
                        <span>{isFetchingDiscordServer ? (lang === 'th' ? 'กำลังดึง...' : 'Fetching...') : (lang === 'th' ? 'ดึงข้อมูลเซิร์ฟเวอร์' : 'Fetch Info')}</span>
                      </button>
                    </div>

                    {/* Server Style Selector */}
                    {bioData.discordServerData && (
                      <div className="space-y-3 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                            {lang === 'th' ? 'รูปแบบการจัดวางการ์ดโปรโมท' : 'Promotion Card Layout Style'}
                          </label>
                          <span className="text-[10px] font-mono text-[#5865F2] uppercase font-bold">
                            {bioData.discordServerStyle || 'banner_card'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'banner_card', label: lang === 'th' ? 'Hero Banner' : 'Hero Banner', desc: lang === 'th' ? 'แบนเนอร์กว้างภาพเต็ม' : 'Full width hero banner' },
                            { id: 'compact_dock', label: lang === 'th' ? 'Cyber Dock' : 'Cyber Dock', desc: lang === 'th' ? 'การ์ดกึ่งโปร่งใสมินิมอล' : 'Compact glass dock' },
                            { id: 'cyber_spotlight', label: lang === 'th' ? 'Tech Spotlight' : 'Tech Spotlight', desc: lang === 'th' ? 'กล่องสปอตไลท์นีออน' : 'Neon stage highlight' },
                            { id: 'minimal_chip', label: lang === 'th' ? 'Glass Pill' : 'Glass Pill', desc: lang === 'th' ? 'ชิปมินิมอลแถวยาว' : 'Streamlined chip row' },
                          ].map(style => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => setBioData({ ...bioData, discordServerStyle: style.id })}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                (bioData.discordServerStyle || 'banner_card') === style.id
                                  ? 'bg-[#5865F2] text-white border-[#5865F2] shadow-[0_0_12px_rgba(88,101,242,0.4)]'
                                  : 'bg-black/50 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <span className="font-bold text-xs">{style.label}</span>
                              <span className="text-[9px] opacity-70 mt-0.5">{style.desc}</span>
                            </button>
                          ))}
                        </div>

                        {/* In-Dashboard Live Preview of Server Card */}
                        <div className="pt-2">
                          <span className="text-[10px] font-mono text-white/40 block mb-1.5 uppercase">
                            {lang === 'th' ? 'ตัวอย่างการ์ดโปรโมทที่จะแสดงบน Bio:' : 'Live Widget Preview on Bio:'}
                          </span>
                          <div className="p-3 rounded-2xl bg-black/80 border border-white/10 flex justify-center">
                            <DiscordServerWidget
                              serverData={bioData.discordServerData}
                              style={bioData.discordServerStyle || 'banner_card'}
                              primaryColor={bioData.primaryColor}
                              textColor={bioData.textColor}
                              cardStyle={bioData.cardStyle}
                              previewMode={true}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Roblox Operative Card */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                    <span className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                      <Gamepad2 size={14} className="text-red-400" />
                      <span>Roblox Operative Profile</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-white/50">Roblox Username:</span>
                        <input
                          type="text"
                          value={bioData.robloxUsername}
                          onChange={e => setBioData({ ...bioData, robloxUsername: e.target.value })}
                          placeholder="Roblox Username"
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-1"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-white/50">Roblox User ID (Optional):</span>
                        <input
                          type="text"
                          value={bioData.robloxUserId}
                          onChange={e => setBioData({ ...bioData, robloxUserId: e.target.value })}
                          placeholder="e.g. 123456789"
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Social Brand Links Dock */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-white/80 uppercase tracking-wider">
                      {lang === 'th' ? 'ลิงก์โซเชียลมีเดีย (Social Links)' : 'Social Links'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: 'youtube', label: 'YouTube URL', placeholder: 'https://youtube.com/@...' },
                        { key: 'tiktok', label: 'TikTok URL', placeholder: 'https://tiktok.com/@...' },
                        { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/...' },
                        { key: 'facebook', label: 'Facebook URL', placeholder: 'https://facebook.com/...' },
                        { key: 'twitch', label: 'Twitch URL', placeholder: 'https://twitch.tv/...' },
                        { key: 'spotify', label: 'Spotify Profile URL', placeholder: 'https://open.spotify.com/user/...' },
                        { key: 'steam', label: 'Steam Profile URL', placeholder: 'https://steamcommunity.com/id/...' },
                        { key: 'github', label: 'GitHub URL', placeholder: 'https://github.com/...' },
                      ].map(item => (
                        <div key={item.key} className="space-y-1">
                          <span className="text-[10px] font-mono text-white/50 uppercase">{item.label}</span>
                          <input
                            type="text"
                            value={bioData.socials?.[item.key] || ''}
                            onChange={e => setBioData({
                              ...bioData,
                              socials: { ...bioData.socials, [item.key]: e.target.value }
                            })}
                            placeholder={item.placeholder}
                            className="w-full bg-black/60 border border-white/10 focus:border-[#ff2a44] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 5: DOSSIER ANALYTICS & INSIGHTS (กราฟคนเข้าชม & ยอดกดติดต่อ) */}
              {activeTab === 'analytics' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-black/50 border border-white/10 backdrop-blur-2xl space-y-6">
                  {/* Tab Header with Auto-Refresh */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-heading">
                        <BarChart3 size={18} className="text-[#ff2a44]" />
                        <span>{lang === 'th' ? 'สถิติและพฤติกรรมผู้เข้าชม (Dossier Analytics)' : 'Dossier Analytics & Traffic'}</span>
                      </h3>
                      <p className="text-xs text-white/50 mt-1">
                        {lang === 'th' ? 'ดูกราฟวิเคราะห์ว่าคนคลิกช่องทางติดต่อใดมากที่สุด และเข้าส่องโปรไฟล์ของคุณในช่วงเวลาใด' : 'Analyze your most clicked contact links and 24-hour visitor traffic timeline.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isLoadingAnalytics}
                      onClick={() => {
                        if (session?.user?.id) {
                          setIsLoadingAnalytics(true);
                          fetch(`/api/analytics/${session.user.id}`)
                            .then(res => res.json())
                            .then(data => {
                              if (data.success && data.data) setAnalyticsData(data.data);
                              showToast(lang === 'th' ? 'อัปเดตข้อมูลสถิติล่าสุดแล้ว' : 'Analytics refreshed');
                            })
                            .catch(() => {})
                            .finally(() => setIsLoadingAnalytics(false));
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                    >
                      <RefreshCw size={12} className={isLoadingAnalytics ? 'animate-spin text-[#ff2a44]' : 'text-white/60'} />
                      <span>{isLoadingAnalytics ? (lang === 'th' ? 'กำลังโหลด...' : 'Loading...') : (lang === 'th' ? 'รีเฟรชสถิติ' : 'Refresh')}</span>
                    </button>
                  </div>

                  {/* 4 Quick Metric Highlight Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Total Views */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1 relative overflow-hidden">
                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-[10px] font-mono uppercase font-bold">{lang === 'th' ? 'ยอดคนดูรวม' : 'Total Views'}</span>
                        <Eye size={14} className="text-cyan-400" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-white">
                        {analyticsData?.viewsTotal ?? bioData.views ?? 0}
                      </div>
                      <span className="text-[9px] text-white/40 block font-mono">
                        {lang === 'th' ? 'วิวโปรไฟล์สะสม' : 'Total dossier visits'}
                      </span>
                    </div>

                    {/* Total Contact Clicks */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1 relative overflow-hidden">
                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-[10px] font-mono uppercase font-bold">{lang === 'th' ? 'คลิกติดต่อ' : 'Contact Clicks'}</span>
                        <MousePointer size={14} className="text-amber-400" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-white">
                        {analyticsData?.clicksTotal ?? 0}
                      </div>
                      <span className="text-[9px] text-white/40 block font-mono">
                        {lang === 'th' ? 'การกดปุ่มติดต่อ' : 'Total link actions'}
                      </span>
                    </div>

                    {/* CTR (Click-Through Rate) */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1 relative overflow-hidden">
                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-[10px] font-mono uppercase font-bold">{lang === 'th' ? 'อัตราการคลิก' : 'CTR Rate'}</span>
                        <Activity size={14} className="text-emerald-400" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                        {analyticsData?.ctr ?? Math.min(100, Math.round(((analyticsData?.clicksTotal || 0) / Math.max(1, analyticsData?.viewsTotal || bioData.views || 1)) * 100))}%
                      </div>
                      <span className="text-[9px] text-white/40 block font-mono">
                        {lang === 'th' ? 'สัดส่วนคนดูที่กด' : 'Clicks per visitor'}
                      </span>
                    </div>

                    {/* Top Platform */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1 relative overflow-hidden">
                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-[10px] font-mono uppercase font-bold">{lang === 'th' ? 'อันดับ 1' : 'Top Platform'}</span>
                        <TrendingUp size={14} className="text-[#ff2a44]" />
                      </div>
                      <div className="text-base sm:text-lg font-black font-mono text-[#ff4757] truncate capitalize">
                        {analyticsData?.topPlatform || 'Roblox'}
                      </div>
                      <span className="text-[9px] text-white/40 block font-mono">
                        {analyticsData?.topClicks ? `${analyticsData.topClicks} clicks` : (lang === 'th' ? 'ยอดนิยมสูงสุด' : 'Most engaged')}
                      </span>
                    </div>
                  </div>

                  {/* GRAPH 1: MOST CLICKED CONTACTS BAR GRAPH (คนเข้ามากดติดต่ออะไรเยอะสุด) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <MousePointer size={15} className="text-[#ff2a44]" />
                        <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-heading">
                          {lang === 'th' ? 'กราฟช่องทางติดต่อที่คนเข้ามากดเยอะที่สุด' : 'Most Clicked Contact Channels'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-white/40">
                        {lang === 'th' ? 'เรียงตามจำนวนคลิกจริง' : 'Sorted by total interactions'}
                      </span>
                    </div>

                    {/* Contact Click Bars */}
                    {analyticsData?.clicks && Object.keys(analyticsData.clicks).length > 0 ? (
                      <div className="space-y-3 pt-1">
                        {Object.entries(analyticsData.clicks)
                          .sort(([, a], [, b]) => Number(b) - Number(a))
                          .map(([platform, count]) => {
                            const clicksNum = Number(count) || 0;
                            const totalClicks = Math.max(1, analyticsData.clicksTotal || 1);
                            const percent = Math.min(100, Math.round((clicksNum / totalClicks) * 100));
                            const brandObj = BRAND_SVGS[platform.toLowerCase()] || BRAND_SVGS.globe;

                            return (
                              <div key={platform} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-0.5">
                                      {brandObj?.svg ? (
                                        <span className="w-3.5 h-3.5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
                                          {brandObj.svg}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold text-white uppercase">{platform.slice(0, 2)}</span>
                                      )}
                                    </div>
                                    <span className="font-bold text-white capitalize">{platform}</span>
                                  </div>
                                  <div className="flex items-center gap-2 font-mono text-[11px]">
                                    <span className="text-white/40">{percent}%</span>
                                    <span className="font-bold text-white px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                                      {clicksNum} {lang === 'th' ? 'คลิก' : 'clicks'}
                                    </span>
                                  </div>
                                </div>

                                {/* Animated glowing progress bar */}
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
                                  <div
                                    className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#ff2a44] to-[#f43f5e]"
                                    style={{
                                      width: `${Math.max(6, percent)}%`,
                                      boxShadow: '0 0 10px rgba(255,42,68,0.5)'
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-white/40 space-y-1 font-mono">
                        <p>{lang === 'th' ? 'ยังไม่มีข้อมูลการคลิกช่องทางติดต่อ' : 'No contact link clicks recorded yet.'}</p>
                        <p className="text-[10px] text-white/30">
                          {lang === 'th' ? 'ระบบจะเริ่มบันทึกสถิติแบบเรียลไทม์ทันทีเมื่อมีผู้เยี่ยมชมกดปุ่มในหน้า Bio ของคุณ' : 'Real-time telemetry will appear when visitors interact with your bio links.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* GRAPH 2: 24-HOUR PEAK TRAFFIC TIMELINE (ดูเราช่วงไหนอะไรยังไง) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <Clock size={15} className="text-[#ff2a44]" />
                        <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-heading">
                          {lang === 'th' ? 'ช่วงเวลาที่คนเข้าดูโปรไฟล์ตลอด 24 ชั่วโมง' : '24-Hour Dossier Traffic Timeline'}
                        </h4>
                      </div>

                      {/* Peak Hour Highlight Badge */}
                      <span className="px-3 py-1 rounded-full bg-[#ff2a44]/20 border border-[#ff2a44]/40 text-[#ff4757] font-mono text-[10px] font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff2a44] animate-pulse" />
                        <span>{lang === 'th' ? `ช่วงพีคสุด: ${analyticsData?.peakHour || '20:00 - 21:00 น.'}` : `Peak Window: ${analyticsData?.peakHour || '20:00 - 21:00'}`}</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-white/50 leading-relaxed">
                      {lang === 'th'
                        ? 'กราฟแสดงการกระจายตัวของผู้ชมตามชั่วโมงในแต่ละวัน (00:00 ถึง 23:00 น.) ช่วยให้ทราบว่าผู้คนสนใจเข้ามาดูประวัติของคุณในช่วงเวลาใดมากที่สุด'
                        : 'Hourly view distribution (00:00 to 23:00) revealing peak operative surveillance windows.'}
                    </p>

                    {/* 24-Column Bar Graph */}
                    {analyticsData?.hourlyViews && Array.isArray(analyticsData.hourlyViews) ? (
                      <div className="pt-4">
                        <div className="h-36 flex items-end justify-between gap-1 sm:gap-1.5 px-1 pb-2 border-b border-white/10">
                          {(() => {
                            const maxVal = Math.max(1, ...analyticsData.hourlyViews);
                            return analyticsData.hourlyViews.map((viewsCount, hour) => {
                              const heightPct = Math.max(8, Math.round((viewsCount / maxVal) * 100));
                              const isPeak = viewsCount === maxVal && maxVal > 0;

                              return (
                                <div
                                  key={hour}
                                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                                >
                                  {/* Hover Floating Tooltip */}
                                  <div className="absolute -top-9 bg-black/90 text-white border border-white/20 text-[9px] font-mono px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                    <span className="text-[#ff4757] font-bold">{String(hour).padStart(2, '0')}:00</span> · {viewsCount} {lang === 'th' ? 'วิว' : 'views'}
                                  </div>

                                  {/* Bar Column */}
                                  <div
                                    className={`w-full rounded-t-md transition-all duration-300 ${
                                      isPeak
                                        ? 'bg-gradient-to-t from-[#ff2a44] to-[#f43f5e] shadow-[0_0_12px_rgba(255,42,68,0.75)]'
                                        : viewsCount > 0
                                        ? 'bg-[#ff2a44]/40 hover:bg-[#ff2a44]/80'
                                        : 'bg-white/5 hover:bg-white/15'
                                    }`}
                                    style={{ height: `${heightPct}%` }}
                                  />
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* X-Axis Hour Labels */}
                        <div className="flex justify-between items-center text-[9px] font-mono text-white/40 pt-2 px-1">
                          <span>00:00</span>
                          <span>04:00</span>
                          <span>08:00</span>
                          <span className="text-white/70 font-bold">12:00</span>
                          <span>16:00</span>
                          <span className="text-[#ff4757] font-bold">20:00 (Peak)</span>
                          <span>23:59</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-white/40 font-mono">
                        {lang === 'th' ? 'กำลังประมวลผลข้อมูลช่วงเวลา...' : 'Processing hourly traffic...'}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT: Live Interactive Device Preview Simulator (Gun.lol side preview) */}
            {showLivePreview && (
              <div className="lg:col-span-5 sticky top-6">
                <div className="p-4 rounded-3xl bg-black/70 border border-white/15 backdrop-blur-3xl shadow-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-mono uppercase font-bold text-white/80">
                        {lang === 'th' ? 'การแสดงผลแบบเรียลไทม์ (LIVE SIMULATOR)' : 'LIVE DOSSIER SIMULATOR'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLivePreview(false)}
                      className="p-1 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
                      title="Close Preview"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Device Frame — Strictly Non-Interactive (Zero views added, audio blocked, no clicks) */}
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#07070b] min-h-[580px] flex flex-col items-center justify-center p-0 select-none" style={{ isolation: 'isolate' }}>
                    {/* Top Security Banner informing user preview is safe & muted */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/85 border border-white/15 text-[10px] font-mono text-white/70 pointer-events-none z-40 flex items-center gap-1.5 shadow-lg backdrop-blur-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>{lang === 'th' ? 'โหมดตัวอย่าง (ปิดเสียงเพลง / ไม่นับยอดวิว / ลิงก์ไม่ทำงาน)' : 'PREVIEW (NO AUDIO / NO VIEWS / SAFE)'}</span>
                    </div>

                    {/* Total Block Overlay: captures and cancels any click/hover inside preview */}
                    <div
                      className="absolute inset-0 z-30 cursor-not-allowed bg-transparent"
                      title={lang === 'th' ? 'โหมดดูตัวอย่าง (ไม่สามารถกดคลิกได้)' : 'Preview Mode (Interactions Disabled)'}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                    />

                    {/* BioView component with previewMode strictly active */}
                    <div className="w-full transform scale-[0.85] origin-top relative z-10 pointer-events-none">
                      <BioView
                        previewMode={true}
                        member={{
                          ...bioData,
                          id: session?.user?.id,
                          name: bioData.name || session?.user?.name || 'Operative',
                          views: bioData.views || 1,
                          profileContainerStyle: bioData.profileContainerStyle || 'contained',
                          musicPlayerStyle: bioData.musicPlayerStyle || 'deck',
                          socialsLayout: bioData.socialsLayout || 'balanced',
                          discordServerInvite: bioData.discordServerInvite,
                          discordServerData: bioData.discordServerData,
                          discordServerStyle: bioData.discordServerStyle || 'banner_card',
                          showDiscordServer: bioData.showDiscordServer,
                        }}
                        role={{
                          name: initialMemberData?.roleName || 'Operative',
                          color: bioData.primaryColor,
                          icon: 'Shield'
                        }}
                        primaryColor={bioData.primaryColor}
                        roleColor={bioData.primaryColor}
                        particleColor={bioData.particleColor}
                        displayViews={bioData.views || 1}
                        bgUrl={bioData.backgroundUrl}
                        isVideo={bioData.backgroundUrl?.includes('.mp4') || bioData.backgroundUrl?.includes('.webm')}
                        contactLinks={previewContacts}
                        robloxUsername={bioData.robloxUsername}
                        playerStyle={bioData.musicPlayerStyle || 'deck'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
