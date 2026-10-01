'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  Fingerprint,
  Home,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import { useLanguage } from '@/context/LanguageContext';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();
  const { t, lang } = useLanguage();

  // Auto-focus input on load & check active session
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    if (typeof window !== 'undefined') {
      if (window.location.search.includes('expired')) {
        setSessionExpiredNotice(true);
      }

      const isAuth = localStorage.getItem('adminAuth') === 'true';
      const expiresAt = parseInt(localStorage.getItem('adminAuthExpiry') || '0', 10);
      const now = Date.now();

      if (isAuth && expiresAt && now < expiresAt) {
        router.push('/secret-admin/dashboard');
      } else {
        localStorage.removeItem('adminAuth');
        localStorage.removeItem('adminAuthExpiry');
      }
    }
  }, [router]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!password || isLoading) return;

    setIsLoading(true);
    setIsError(false);

    // Secure authentication sequence
    setTimeout(() => {
      if (password === 'ufaslumzick@123') {
        const oneHourFromNow = Date.now() + 60 * 60 * 1000; // 1-hour session lifetime
        localStorage.setItem('adminAuth', 'true');
        localStorage.setItem('adminAuthExpiry', oneHourFromNow.toString());
        router.push('/secret-admin/dashboard');
      } else {
        setIsError(true);
        setIsLoading(false);
        setPassword('');
        if (inputRef.current) inputRef.current.focus();
      }
    }, 700);
  };

  return (
    <main className="min-h-screen bg-[#030306] flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Particle Canvas with Minimal Ambient Effect */}
      <ParticleBackground type="embers" color="#ff2a44" speed={0.8} density={0.8} />

      {/* Ambient Radial Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] max-w-[550px] max-h-[550px] bg-[#ff2a44]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Left Return to Home Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-4 left-4 z-20"
      >
        <Link
          href="/"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 hover:border-white/30 backdrop-blur-xl text-white text-xs font-semibold tracking-wider transition-all shadow-lg group cursor-pointer"
        >
          <Home size={13} className="text-[#ff2a44] group-hover:-translate-x-0.5 transition-transform" />
          <span>{t.adminLogin?.backHome || 'หน้าหลัก'}</span>
        </Link>
      </motion.div>

      {/* Central Login Card (Mobile-friendly, Compact, Cyberpunk Aesthetic) */}
      <motion.form
        initial={{ opacity: 0, y: 25, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleLogin}
        className="relative z-10 bg-black/75 backdrop-blur-3xl border border-white/15 hover:border-white/25 p-6 sm:p-10 rounded-[2rem] w-full max-w-[400px] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(255,42,68,0.15)] flex flex-col items-center overflow-hidden transition-all"
      >
        {/* Top Glowing Laser Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff2a44] to-transparent shadow-[0_0_15px_#ff2a44]" />

        {/* Security Crest Badge */}
        <div className="relative mb-5 group">
          <div className="absolute inset-0 bg-[#ff2a44] blur-xl opacity-35 group-hover:opacity-60 transition-opacity rounded-2xl" />
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-[#ff2a44]/20 via-black to-[#120306] border border-[#ff2a44]/50 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <ShieldAlert size={32} className="text-[#ff2a44] drop-shadow-[0_0_12px_rgba(255,42,68,0.8)]" />
          </div>
        </div>

        {/* Header Texts */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#ff2a44]/15 border border-[#ff2a44]/40 text-[#ff2a44] text-[10px] font-mono font-bold tracking-widest uppercase mb-1.5">
            <KeyRound size={11} /> {t.adminLogin?.badge || 'SECURITY CLEARANCE'}
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight drop-shadow-md">
            {t.adminLogin?.systemAccess || 'ศูนย์ควบคุมหลังบ้าน'}
          </h1>
          <p className="text-white/50 text-xs font-light tracking-wide flex items-center justify-center gap-1.5 mt-1">
            <Lock size={12} className="text-[#ff2a44]" /> {t.adminLogin?.restrictedArea || 'พื้นที่เฉพาะระดับผู้บริหาร'}
          </p>
        </div>

        {/* 1-Hour Session Expired Alert */}
        {sessionExpiredNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 w-full px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center gap-2 text-center font-mono"
          >
            <Clock size={13} className="shrink-0 text-amber-400" />
            <span>{lang === 'th' ? 'เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่' : 'Session expired. Please log in again.'}</span>
          </motion.div>
        )}

        {/* Input Box with Show/Hide Password */}
        <div className="w-full relative mb-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Fingerprint className={`w-4 h-4 transition-colors ${isError ? 'text-red-500 animate-pulse' : 'text-white/30'}`} />
            </div>

            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setIsError(false);
              }}
              placeholder={t.adminLogin?.accessCode || 'กรอกรหัสผ่านลับ...'}
              disabled={isLoading}
              className={`w-full bg-white/[0.04] border rounded-2xl py-3 pl-10 pr-10 text-white text-sm focus:outline-none focus:bg-white/[0.07] transition-all font-mono placeholder:text-white/30 ${isError
                ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)] bg-red-950/20'
                : 'border-white/15 focus:border-[#ff2a44] focus:shadow-[0_0_15px_rgba(255,42,68,0.25)]'
                }`}
            />

            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white transition-colors cursor-pointer"
              title={showPassword ? 'Hide Password' : 'Show Password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Error Message with Shake */}
          <AnimatePresence>
            {isError && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-1.5 mt-2 text-red-400 text-xs font-mono font-medium"
              >
                <AlertTriangle size={12} />
                <span>{t.adminLogin?.accessDenied || 'รหัสผ่านไม่ถูกต้อง การเข้าถึงถูกปฏิเสธ'}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading || !password}
          className="w-full relative group overflow-hidden rounded-2xl py-3.5 bg-gradient-to-r from-[#ff2a44] via-[#ff3b53] to-[#e61e38] text-white font-heading font-bold text-xs sm:text-sm tracking-wider uppercase shadow-[0_8px_25px_rgba(255,42,68,0.45)] hover:shadow-[0_12px_35px_rgba(255,42,68,0.65)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t.adminLogin?.authenticating || 'กำลังตรวจสอบสิทธิ์...'}</span>
            </>
          ) : (
            <>
              <span>{t.adminLogin?.initialize || 'เข้าสู่ระบบผู้ดูแล'}</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </motion.button>

        {/* Security Notice */}
        <div className="mt-6 flex items-center gap-1.5 text-[10px] text-white/30 font-mono tracking-wider">
          <CheckCircle2 size={11} className="text-[#ff2a44]" />
          <span>{t.adminLogin?.securityNotice || 'ระบบเข้ารหัสระดับสูง • 256-BIT ENCRYPTION'}</span>
        </div>
      </motion.form>
    </main>
  );
}
