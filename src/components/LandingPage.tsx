import React, { useState, useEffect, useRef, useCallback } from "react";
import { Layers, LogIn, UserPlus, ChevronDown, Sparkles, ShieldCheck, Terminal, Lock } from "lucide-react";
import SlideCarousel from "./SlideCarousel";

function useMouseGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, []);
  return ref;
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  hue: number;
}

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);

    for (let i = 0; i < 80; i++) {
      particles.current.push({
        id: i,
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        hue: Math.random() > 0.5 ? 160 : 30,
      });
    }

    const handleMouse = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handleMouse);

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles.current) {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const dx = mouse.current.x - p.x;
        const dy = mouse.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          p.x -= dx * 0.01;
          p.y -= dy * 0.01;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 55%, ${p.opacity})`;
        ctx.fill();
      }

      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const a = particles.current[i];
          const b = particles.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(${a.hue}, 70%, 50%, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

function CursorTrail() {
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const dotsRef = useRef<HTMLDivElement[]>([]);
  const raf = useRef<number>(0);

  useEffect(() => {
    const NUM = 12;
    const dots: HTMLDivElement[] = [];
    for (let i = 0; i < NUM; i++) {
      const dot = document.createElement("div");
      dot.className = "fixed pointer-events-none z-50 rounded-full mix-blend-screen transition-opacity";
      const size = Math.max(3, 8 - i * 0.5);
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.background = i % 2 === 0
        ? `rgba(16, 185, 129, ${0.8 - i * 0.06})`
        : `rgba(249, 115, 22, ${0.8 - i * 0.06})`;
      dot.style.boxShadow = `0 0 ${6 - i * 0.4}px ${i % 2 === 0 ? "rgba(16,185,129,0.5)" : "rgba(249,115,22,0.5)"}`;
      document.body.appendChild(dot);
      dots.push(dot);
      trailRef.current.push({ x: 0, y: 0 });
    }
    dotsRef.current = dots;

    let mx = 0, my = 0;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMove);

    const animate = () => {
      trailRef.current[0] = { x: mx, y: my };
      for (let i = 1; i < NUM; i++) {
        const prev = trailRef.current[i - 1];
        const cur = trailRef.current[i];
        cur.x += (prev.x - cur.x) * 0.35;
        cur.y += (prev.y - cur.y) * 0.35;
        dots[i].style.left = `${cur.x - 3}px`;
        dots[i].style.top = `${cur.y - 3}px`;
      }
      dots[0].style.left = `${mx - 4}px`;
      dots[0].style.top = `${my - 4}px`;
      raf.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove", onMove);
      dots.forEach((d) => d.remove());
    };
  }, []);

  return null;
}

const FEATURES = [
  { icon: <ShieldCheck className="w-7 h-7" />, title: "4-Stage Chain", desc: "Progressive vulnerability exploitation — each stage gates the next." },
  { icon: <Terminal className="w-7 h-7" />, title: "Live Hacking Terminal", desc: "Intercept API traffic, craft payloads, and test exploits in real time." },
  { icon: <Lock className="w-7 h-7" />, title: "Server-Side Gates", desc: "No client-side bypasses. Every stage transition is validated server-side." },
  { icon: <Sparkles className="w-7 h-7" />, title: "AI Co-Pilot", desc: "Gemini-powered tutor explains vulnerabilities and guides your learning." },
];

export default function LandingPage({ onShowAuth }: { onShowAuth: () => void }) {
  const glowRef = useMouseGlow();
  const hero = useScrollReveal();
  const feat = useScrollReveal();
  const split = useScrollReveal();
  const [time, setTime] = useState("");

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toUTCString().replace("GMT", "UTC"));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono overflow-x-hidden">
      <ParticleField />
      <CursorTrail />

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 w-full z-40 bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-orange-500 rounded-lg text-zinc-950">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-sm font-extrabold tracking-wider">PWNDORA</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 hidden md:block tabular-nums">{time}</span>
            <button
              onClick={onShowAuth}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 hover:border-emerald-500/50 rounded-lg text-zinc-300 hover:text-emerald-400 transition-all duration-200 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" /> Login
            </button>
            <button
              onClick={onShowAuth}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-orange-500 hover:from-emerald-500 hover:to-orange-400 text-zinc-950 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> Register
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section
        ref={glowRef}
        className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at var(--mx, 50%) var(--my, 50%), rgba(16,185,129,0.06) 0%, rgba(249,115,22,0.03) 40%, transparent 70%)",
        }}
      >
        <div
          ref={hero.ref}
          className={`relative z-10 text-center max-w-4xl mx-auto px-6 transition-all duration-1000 ${
            hero.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-widest mb-8 animate-float">
            <Sparkles className="w-3.5 h-3.5" /> Advanced Cybersecurity Training Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[0.95] tracking-tight mb-6">
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-orange-400 bg-clip-text text-transparent animate-gradient">
              PWNDORA
            </span>
            <br />
            <span className="text-zinc-300 text-2xl sm:text-3xl md:text-4xl font-extrabold">
              Vulnerability Chain Lab
            </span>
          </h1>

          <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Chain 4 real-world vulnerabilities in sequence. Exploit, learn, and master the kill chain
            in a fully sandboxed enterprise simulation.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={onShowAuth}
              className="group px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-orange-500 hover:from-emerald-400 hover:to-orange-400 text-zinc-950 font-bold text-sm rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] cursor-pointer flex items-center gap-2"
            >
              Launch Lab
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </button>
            <button
              onClick={() => scrollTo("split-section")}
              className="px-8 py-3.5 bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-bold text-sm rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-2"
            >
              Learn More <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Animated rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
          <div className="w-[600px] h-[600px] rounded-full border border-emerald-500/10 animate-spin-slow" />
          <div className="absolute inset-8 rounded-full border border-orange-500/10 animate-spin-reverse" />
          <div className="absolute inset-16 rounded-full border border-emerald-500/5 animate-spin-slow" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 py-24 px-6">
        <div
          ref={feat.ref}
          className={`max-w-6xl mx-auto transition-all duration-1000 delay-200 ${
            feat.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <h2 className="text-center text-2xl md:text-3xl font-extrabold mb-4">
            Built for{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-orange-400 bg-clip-text text-transparent">
              Serious Training
            </span>
          </h2>
          <p className="text-center text-zinc-500 text-sm mb-16 max-w-lg mx-auto">
            Every component engineered for realistic offensive security education.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group p-6 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl hover:border-emerald-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] hover:-translate-y-1 cursor-default"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-orange-500/10 rounded-xl text-emerald-400 group-hover:text-orange-400 transition-colors duration-300 w-fit mb-4">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-zinc-200 mb-2">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPLIT SECTION: VIDEO + SLIDES ── */}
      <section id="split-section" className="relative z-10 py-24 px-6">
        <div
          ref={split.ref}
          className={`max-w-7xl mx-auto transition-all duration-1000 delay-100 ${
            split.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <h2 className="text-center text-2xl md:text-3xl font-extrabold mb-16">
            See It In{" "}
            <span className="bg-gradient-to-r from-orange-400 to-emerald-400 bg-clip-text text-transparent">
              Action
            </span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Video */}
            <div className="relative group rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-900/60 hover:border-emerald-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-orange-500/5 pointer-events-none" />
              <video
                src="/video.mp4"
                className="w-full aspect-video object-cover"
                autoPlay
                muted
                loop
                controls
              />
            </div>

            {/* Right: Slide Carousel */}
            <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:border-orange-500/30 transition-all duration-500 overflow-hidden min-h-[400px]">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-emerald-500/5 pointer-events-none" />
              <SlideCarousel onStart={onShowAuth} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-zinc-900 py-6 text-center">
        <p className="text-[10px] text-zinc-600 font-mono tracking-wider">
          PWNDORA SECURITY LABS &bull; LICENSED EDUCATIONAL MATERIAL FOR CYBER COMPLIANCE TRAINING
        </p>
      </footer>
    </div>
  );
}
