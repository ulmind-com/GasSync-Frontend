import React, { useEffect, useRef, useCallback, useState } from 'react';

/* ============================================================
   CURSOR GLOW — Premium radial spotlight that follows the mouse
   ============================================================ */
export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${pos.current.x - 200}px, ${pos.current.y - 200}px)`;
      }
      raf.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove);
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed z-[9998] w-[400px] h-[400px] rounded-full opacity-0 transition-opacity duration-500"
      style={{
        background: 'radial-gradient(circle, rgb(var(--color-primary) / 0.07) 0%, rgb(var(--color-primary) / 0.03) 35%, transparent 70%)',
        filter: 'blur(2px)',
        willChange: 'transform',
      }}
      onTransitionEnd={() => {}}
    />
  );
}

/* ============================================================
   USE CURSOR GLOW VISIBILITY — Shows glow only when mouse moves
   ============================================================ */
export function CursorGlowWithVisibility() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -400, y: -400 });
  const raf = useRef<number>(0);
  const [visible, setVisible] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
      clearTimeout(hideTimeout.current);
      hideTimeout.current = setTimeout(() => setVisible(false), 3000);
    };
    const onLeave = () => setVisible(false);

    const animate = () => {
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${pos.current.x - 250}px, ${pos.current.y - 250}px)`;
      }
      raf.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf.current);
      clearTimeout(hideTimeout.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed z-[9998] w-[500px] h-[500px] rounded-full transition-opacity duration-700"
      style={{
        background: 'var(--cursor-glow)',
        filter: 'var(--cursor-glow-blur)',
        willChange: 'transform',
        opacity: visible ? 1 : 0,
      }}
    />
  );
}

/* ============================================================
   TILT CARD — 3D perspective tilt on hover with shine highlight
   ============================================================ */
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  tiltStrength?: number;
  glareEnabled?: boolean;
  onClick?: () => void;
}

export function TiltCard({ children, className = '', tiltStrength = 8, glareEnabled = true, onClick }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);
  const target = useRef({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const current = useRef({ rotateX: 0, rotateY: 0 });

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    target.current.rotateX = (0.5 - y) * tiltStrength;
    target.current.rotateY = (x - 0.5) * tiltStrength;
    target.current.glareX = x * 100;
    target.current.glareY = y * 100;
  }, [tiltStrength]);

  const onMouseLeave = useCallback(() => {
    target.current = { rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 };
  }, []);

  useEffect(() => {
    const ease = 0.12;
    const animate = () => {
      current.current.rotateX += (target.current.rotateX - current.current.rotateX) * ease;
      current.current.rotateY += (target.current.rotateY - current.current.rotateY) * ease;

      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(800px) rotateX(${current.current.rotateX}deg) rotateY(${current.current.rotateY}deg)`;
      }
      if (glareRef.current && glareEnabled) {
        const intensity = Math.sqrt(target.current.rotateX ** 2 + target.current.rotateY ** 2) / tiltStrength;
        glareRef.current.style.background = `radial-gradient(circle at ${target.current.glareX}% ${target.current.glareY}%, rgb(255 255 255 / ${0.12 * intensity}), transparent 60%)`;
      }
      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [tiltStrength, glareEnabled]);

  return (
    <div
      ref={cardRef}
      className={`relative transition-shadow duration-300 ${className}`}
      style={{ willChange: 'transform', transformStyle: 'preserve-3d' }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {children}
      {glareEnabled && (
        <div
          ref={glareRef}
          className="absolute inset-0 rounded-[inherit] pointer-events-none z-10"
          style={{ mixBlendMode: 'overlay' }}
        />
      )}
    </div>
  );
}

/* ============================================================
   MAGNETIC BUTTON — Subtly follows cursor within proximity
   ============================================================ */
interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export function Magnetic({ children, className = '', strength = 0.3 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * strength;
    const dy = (e.clientY - cy) * strength;
    ref.current.style.transform = `translate(${dx}px, ${dy}px)`;
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'translate(0, 0)';
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)', willChange: 'transform' }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

/* ============================================================
   HOVER BORDER GLOW — Card with animated gradient border glow
   ============================================================ */
interface GlowBorderProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowBorder({ children, className = '', glowColor }: GlowBorderProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty('--glow-x', `${x}px`);
    ref.current.style.setProperty('--glow-y', `${y}px`);
  }, []);

  return (
    <div
      ref={ref}
      className={`relative group ${className}`}
      onMouseMove={onMouseMove}
      style={{ '--glow-color': glowColor || 'rgb(var(--color-primary))' } as React.CSSProperties}
    >
      {/* Animated border glow */}
      <div
        className="absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(300px circle at var(--glow-x, 50%) var(--glow-y, 50%), var(--glow-color, rgb(var(--color-primary))) / 0.15, transparent 50%)`,
        }}
      />
      {children}
    </div>
  );
}

/* ============================================================
   SPOTLIGHT CARD — Cards that show a radial spotlight on hover
   ============================================================ */
interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function SpotlightCard({ children, className = '', spotlightColor }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Spotlight overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-500 rounded-[inherit]"
        style={{
          background: `radial-gradient(350px circle at ${position.x}px ${position.y}px, ${spotlightColor || 'rgb(var(--color-primary) / 0.08)'}, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />
      {children}
    </div>
  );
}
