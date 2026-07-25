import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Shield, Target, Zap, Award, Rocket } from "lucide-react";

interface Slide {
  title: string;
  content: string;
  icon: React.ReactNode;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    title: "Welcome to PWNDORA",
    content:
      "Multi-stage vulnerability chain exploitation lab. Master real-world attack pathways in a safe, sandboxed environment built for serious cybersecurity training.",
    icon: <Shield className="w-12 h-12" />,
    accent: "from-emerald-500 to-green-400",
  },
  {
    title: "The Challenge",
    content:
      "Chain exactly 4 vulnerabilities in sequence. Each stage yields an artifact that unlocks the next — skip nothing, shortcuts don't exist. Every gate is enforced server-side.",
    icon: <Target className="w-12 h-12" />,
    accent: "from-orange-500 to-amber-400",
  },
  {
    title: "Stage Breakdown",
    content:
      "Stage 1 — Authentication Bypass (SQLi) → Stage 2 — OS Command Injection → Stage 3 — Server-Side Request Forgery → Stage 4 — Privilege Escalation & Data Exfiltration.",
    icon: <Zap className="w-12 h-12" />,
    accent: "from-emerald-600 to-teal-400",
  },
  {
    title: "Scoring System",
    content:
      "Earn 100–250 points per stage. Hints cost 10/20/30 points each. Race the clock, climb the leaderboard. Every second and every hint shapes your final rank.",
    icon: <Award className="w-12 h-12" />,
    accent: "from-orange-600 to-red-400",
  },
  {
    title: "Start Your Mission",
    content:
      "Register an operator account and begin your red team assessment. The Meridian HR Portal is live and waiting for you to dismantle it.",
    icon: <Rocket className="w-12 h-12" />,
    accent: "from-emerald-500 to-orange-400",
  },
];

export default function SlideCarousel({ onStart }: { onStart: () => void }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback(
    (idx: number) => {
      if (isAnimating || idx === current) return;
      setDirection(idx > current ? 1 : -1);
      setIsAnimating(true);
      setCurrent(idx);
      setTimeout(() => setIsAnimating(false), 500);
    },
    [current, isAnimating]
  );

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = SLIDES[current];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-6 py-8">
      {/* Slide content */}
      <div
        key={current}
        className="w-full max-w-lg animate-slide-in"
        style={{ animationDirection: direction === 1 ? "normal" : "reverse" }}
      >
        <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${slide.accent} text-zinc-950 mb-6 animate-pulse-glow`}>
          {slide.icon}
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-100 mb-4 tracking-tight">
          {slide.title}
        </h2>
        <p className="text-sm md:text-base text-zinc-400 leading-relaxed mb-8">{slide.content}</p>

        {current === SLIDES.length - 1 && (
          <button
            onClick={onStart}
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-orange-500 hover:from-emerald-400 hover:to-orange-400 text-zinc-950 font-bold text-sm rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            Enter the Lab
          </button>
        )}
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-emerald-400 transition-all duration-200 cursor-pointer backdrop-blur"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-emerald-400 transition-all duration-200 cursor-pointer backdrop-blur"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dot indicators */}
      <div className="flex gap-2 mt-6">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
              idx === current
                ? "bg-gradient-to-r from-emerald-500 to-orange-500 w-6"
                : "bg-zinc-700 hover:bg-zinc-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
