import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useInView,
  animate,
} from 'framer-motion';
import { Store, Pause, Play, Star, ShoppingCart, BadgeCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslation } from '../i18n/LocaleContext';

const DEMO_PRODUCTS = [
  { emoji: '🍚', name: 'Basmati Rice 5kg', price: 'Rs. 850', grad: 'from-amber-200 to-amber-400', delay: '0s' },
  { emoji: '🥛', name: 'Fresh Milk 1L', price: 'Rs. 90', grad: 'from-sky-200 to-sky-400', delay: '2.25s' },
  { emoji: '🧣', name: 'Pashmina Scarf', price: 'Rs. 1,450', grad: 'from-violet-200 to-violet-400', delay: '4.5s' },
  { emoji: '🍯', name: 'Mustang Honey', price: 'Rs. 600', grad: 'from-rose-200 to-rose-400', delay: '6.75s' },
];

const AVATARS = [
  { initials: 'RS', grad: 'from-amber-400 to-orange-500' },
  { initials: 'SM', grad: 'from-sky-400 to-blue-500' },
  { initials: 'AP', grad: 'from-emerald-400 to-teal-500' },
  { initials: 'NK', grad: 'from-fuchsia-400 to-pink-500' },
];

const PARTICLES = [
  { left: '12%', top: '22%', delay: '0s', dur: '15s' },
  { left: '78%', top: '16%', delay: '3s', dur: '18s' },
  { left: '85%', top: '62%', delay: '6s', dur: '14s' },
  { left: '20%', top: '74%', delay: '9s', dur: '17s' },
  { left: '55%', top: '8%', delay: '12s', dur: '16s' },
  { left: '40%', top: '88%', delay: '5s', dur: '19s' },
];

const EASE = [0.22, 1, 0.36, 1] as const;

const reveal = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: EASE },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(reduced ? value.toLocaleString('en-US') : '0');

  useEffect(() => {
    if (!inView || reduced) {
      if (reduced) setDisplay(value.toLocaleString('en-US'));
      return;
    }
    const controls = animate(0, value, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString('en-US')),
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return (
    <p ref={ref} className="text-xl font-bold tracking-tight sm:text-2xl">
      {display}
      {suffix}
    </p>
  );
}

function MagneticButton({
  children,
  className,
  onClick,
  label,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  label: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.4 });
  const y = useSpring(my, { stiffness: 220, damping: 18, mass: 0.4 });

  function handleMove(e: React.MouseEvent<HTMLButtonElement>) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left - rect.width / 2) * 0.22);
    my.set((e.clientY - rect.top - rect.height / 2) * 0.32);
  }

  function handleLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      style={{ x, y }}
      whileTap={{ scale: 0.97 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

function TiltWindow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 120, damping: 16 });
  const sry = useSpring(ry, { stiffness: 120, damping: 16 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ry.set(((e.clientX - rect.left) / rect.width - 0.5) * 4);
    rx.set(-((e.clientY - rect.top) / rect.height - 0.5) * 4);
  }

  function handleLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <div style={{ perspective: 1200 }}>
      <div className="demo-float">
        <motion.div
          ref={ref}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

function DemoPanel({ onCtaClick }: { onCtaClick?: () => void }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [spot, setSpot] = useState({ x: 50, y: 35 });

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function scrollToForm() {
    onCtaClick?.();
  }

  return (
    <motion.div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setSpot({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
      }}
      className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent via-orange-700 to-gray-900 p-6 text-background shadow-2xl sm:p-10"
    >
      {/* ---- Layered background ---- */}
      <div className="pointer-events-none absolute inset-0">
        <div className="demo-blob absolute -top-28 -right-24 h-80 w-80 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="demo-blob absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" style={{ animationDelay: '-11s' }} />
        <div className="absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-rose-400/10 blur-3xl" />
        <div className="demo-grid absolute inset-0" />
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(560px circle at ${spot.x}% ${spot.y}%, rgba(255,255,255,0.09), transparent 45%)`,
          }}
        />
        {!reduced &&
          PARTICLES.map((p, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="demo-particle absolute h-1 w-1 rounded-full bg-white/70"
              style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.dur }}
            />
          ))}
        <div className="demo-noise absolute inset-0 opacity-[0.06] mix-blend-overlay" />
        <div className="demo-vignette absolute inset-0" />
      </div>

      <div className="relative">
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative flex items-center justify-between">
          <motion.div variants={reveal} className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center rounded-xl bg-background/15 p-2 shadow-inner backdrop-blur-md">
              <Store className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">KinaHub</span>
          </motion.div>
          <motion.span
            variants={reveal}
            className="flex items-center gap-1.5 rounded-full bg-background/15 px-3 py-1 text-xs font-semibold backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            {t('auth.demoLive', { defaultValue: 'Live demo' })}
          </motion.span>
        </motion.div>

        <motion.h2
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative mt-9 text-4xl font-extrabold tracking-tight leading-[1.08] sm:text-5xl"
        >
          <motion.span variants={reveal} className="inline-block">
            {t('auth.demoTagline', { defaultValue: 'Buy local. Sell smart.' }).split('.').slice(0, 1)[0] + '.'}
          </motion.span>{' '}
          <motion.span
            variants={reveal}
            className="inline-block bg-gradient-to-r from-amber-200 via-orange-200 to-yellow-200 bg-clip-text text-transparent"
          >
            {t('auth.demoTagline', { defaultValue: 'Buy local. Sell smart.' }).split('.').slice(1)[0] + '.'}
          </motion.span>
        </motion.h2>
        <motion.p
          variants={reveal}
          initial="hidden"
          animate="show"
          className="relative mt-3 max-w-md text-sm leading-relaxed text-background/75 sm:text-[15px]"
        >
          {t('auth.demoSubtitle', { defaultValue: 'No signup needed — everything resets on refresh.' })}
        </motion.p>

        {/* ---- Demo window ---- */}
        <motion.div variants={reveal} initial="hidden" animate="show" className="relative mt-9">
          <TiltWindow>
            <div
              className={`relative overflow-hidden rounded-2xl border border-background/15 bg-background/10 shadow-2xl backdrop-blur-md ${playing ? '' : 'demo-paused'}`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div className="flex items-center gap-1.5 border-b border-background/10 px-3.5 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/90" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/90" />
                <span className="ml-2 flex flex-1 items-center gap-1 truncate rounded-md bg-background/10 px-2.5 py-1 text-[10px] text-background/70">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400/90" />
                  kinahub.com.np/shop
                </span>
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? t('auth.demoPause', { defaultValue: 'Pause demo' }) : t('auth.demoPlay', { defaultValue: 'Play demo' })}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background/20 text-background transition-colors hover:bg-background/35"
                >
                  {playing ? <Pause className="h-3 w-3" /> : <Play className="ml-0.5 h-3 w-3" />}
                </button>
              </div>

              <div className="relative">
                <video
                  ref={videoRef}
                  src="/demo/KinaHub_Demo.mp4"
                  className="aspect-video w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  onClick={togglePlay}
                  aria-label="KinaHub product demo"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
                <div className="pointer-events-none absolute -inset-x-8 -top-10 h-24 rotate-[-8deg] bg-gradient-to-b from-white/10 to-transparent blur-sm" />
                {!playing && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity"
                    aria-label={t('auth.demoPlay', { defaultValue: 'Play demo' })}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-background shadow-2xl transition-transform hover:scale-105">
                      <Play className="ml-1 h-6 w-6" />
                    </span>
                  </button>
                )}
              </div>

              {/* Animated add-to-cart loop */}
              <div className="relative h-20 overflow-hidden p-3">
                <div className="demo-cursor pointer-events-none absolute left-2 top-2 z-20">
                  <span className="block h-4 w-4 rounded-full bg-background/90 shadow-lg" />
                  <span className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-background" />
                </div>
                {DEMO_PRODUCTS.map((product) => (
                  <div
                    key={product.name}
                    className="demo-card absolute inset-x-3 top-3 flex items-center gap-3 rounded-lg bg-background/90 p-2 shadow-lg"
                    style={{ animationDelay: product.delay }}
                  >
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${product.grad} text-lg`}>
                      {product.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-gray-800">{product.name}</p>
                      <p className="text-[10px] text-gray-500">{product.price}</p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[9px] font-bold text-green-700">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m4 12 5 5L20 7" />
                      </svg>
                      {t('auth.demoAdded', { defaultValue: 'Added' })}
                    </span>
                  </div>
                ))}
                <div className="demo-toast absolute bottom-2 right-3 z-20 flex items-center gap-2 rounded-lg bg-background/95 px-3 py-2 shadow-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-background">
                    <ShoppingCart className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-gray-800">{t('auth.demoCheckout', { defaultValue: 'Checkout' })}</p>
                    <p className="text-[9px] text-gray-500">Rs. 2,990</p>
                  </div>
                </div>
                <div className="absolute bottom-2 left-3 z-20 h-1 w-24 overflow-hidden rounded-full bg-background/30">
                  <div className="demo-progress h-full rounded-full bg-accent" />
                </div>
              </div>
            </div>
          </TiltWindow>
        </motion.div>

        {/* ---- CTAs ---- */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative mt-8 flex flex-wrap items-center gap-3">
          <MagneticButton
            label={t('auth.demoCtaPrimary', { defaultValue: 'Create free account' })}
            onClick={scrollToForm}
            className="btn-shine group inline-flex items-center gap-2 rounded-xl bg-background px-5 py-3 text-sm font-bold text-gray-900 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-shadow hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-background/70"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            {t('auth.demoCtaPrimary', { defaultValue: 'Create free account' })}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </MagneticButton>
          <MagneticButton
            label={t('auth.demoCtaSecondary', { defaultValue: 'Watch demo' })}
            onClick={togglePlay}
            className="inline-flex items-center gap-2 rounded-xl border border-background/25 bg-background/10 px-5 py-3 text-sm font-semibold text-background backdrop-blur-md transition-colors hover:bg-background/20 focus-visible:ring-2 focus-visible:ring-background/70"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {t('auth.demoCtaSecondary', { defaultValue: 'Watch demo' })}
          </MagneticButton>
        </motion.div>

        {/* ---- Social proof ---- */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative mt-8 flex items-center gap-3">
          <motion.div variants={reveal} className="flex -space-x-2.5">
            {AVATARS.map((avatar) => (
              <span
                key={avatar.initials}
                className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-orange-900/60 bg-gradient-to-br ${avatar.grad} text-[10px] font-bold text-white shadow-md`}
              >
                {avatar.initials}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow-sm">
                  <BadgeCheck className="h-3 w-3 text-green-600" />
                </span>
              </span>
            ))}
          </motion.div>
          <motion.div variants={reveal} className="min-w-0">
            <div className="flex items-center gap-0.5 text-yellow-300">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.span
                  key={star}
                  initial={{ opacity: 0, scale: 0, rotate: -30 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: 0.9 + star * 0.07, type: 'spring', stiffness: 320, damping: 14 }}
                >
                  <Star className="h-3.5 w-3.5 fill-current" />
                </motion.span>
              ))}
              <span className="ml-1.5 text-xs font-bold">4.9</span>
            </div>
            <p className="truncate text-xs text-background/80">
              {t('auth.demoTrusted', { defaultValue: 'Trusted by 500+ Nepali shoppers' })}
            </p>
          </motion.div>
        </motion.div>

        {/* ---- Stats ---- */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative mt-7 grid grid-cols-3 gap-3">
          {[
            { value: 500, suffix: '+', label: t('auth.statShoppers', { defaultValue: 'Shoppers' }) },
            { value: 50, suffix: '+', label: t('auth.statSellers', { defaultValue: 'Local stores' }) },
            { value: 10000, suffix: '+', label: t('auth.statOrders', { defaultValue: 'Orders delivered' }) },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={reveal}
              className="rounded-xl border border-background/15 bg-background/10 px-3 py-3.5 text-center backdrop-blur-md transition-colors duration-300 hover:bg-background/15"
            >
              <CountUp value={stat.value} suffix={stat.suffix} />
              <p className="mt-0.5 text-[10px] text-background/70">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default DemoPanel;
