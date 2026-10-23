'use client';

import React, { useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Header from '../../../components/header';
import { useTheme } from '../../../components/themeprovider';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const TEAM_MEMBERS = [
  {
    name: 'Shrey',
    role: 'Full Stack Developer',
    description: 'Hackathon winner and tech enthusiast with a passion for building scalable applications.',
    initials: 'S',
  },
  {
    name: 'Shreyas',
    role: 'AI Engineer',
    description: 'Expert in LLMs and agentic workflows, focused on bringing intelligence to the legal system.',
    initials: 'SY',
  },
  {
    name: 'Pranika',
    role: 'UI/UX Designer',
    description: 'Creating delightful and premium digital experiences for users with a keen eye for detail.',
    initials: 'P',
  },
  {
    name: 'Medhansh',
    role: 'Backend Architect',
    description: 'Architecting robust and secure systems to handle complex legal data and workflows.',
    initials: 'M',
  },
];

export default function AboutPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  /* ── Color tokens ───────────────────────────────────── */
  const textPrimary = isDark ? '#ededed' : '#171717';
  const textSecondary = isDark ? 'rgba(237, 237, 237, 0.7)' : 'rgba(23, 23, 23, 0.7)';
  const borderColor = isDark ? 'rgba(205, 170, 128, 0.2)' : 'rgba(153, 121, 83, 0.2)';
  const accentColor = isDark ? '#cdaa80' : '#997953';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
  const cardBorder = isDark ? 'rgba(205, 170, 128, 0.1)' : 'rgba(153, 121, 83, 0.1)';

  /* ── GSAP: Hero entrance ────────────────────────────── */
  useGSAP(() => {
    if (!heroRef.current) return;
    const tl = gsap.timeline();
    tl.fromTo(
      heroRef.current.querySelectorAll('.hero-anim'),
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.2, ease: 'power3.out' }
    );
  }, { scope: heroRef });

  /* ── GSAP: Team cards reveal on scroll ──────────────── */
  useGSAP(() => {
    if (!teamRef.current) return;
    gsap.fromTo(
      teamRef.current.querySelectorAll('.team-card'),
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: teamRef.current,
          start: 'top 80%',
        },
      }
    );
  }, { scope: teamRef });

  const handleCardMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      y: -10,
      scale: 1.02,
      borderColor: accentColor,
      backgroundColor: isDark ? 'rgba(205, 170, 128, 0.05)' : 'rgba(153, 121, 83, 0.05)',
      boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px rgba(0,0,0,0.1)',
      duration: 0.4,
      ease: 'power2.out',
    });
  }, [accentColor, isDark]);

  const handleCardMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      y: 0,
      scale: 1,
      borderColor: cardBorder,
      backgroundColor: cardBg,
      boxShadow: 'none',
      duration: 0.3,
      ease: 'power2.inOut',
    });
  }, [cardBorder, cardBg]);

  return (
    <main className={`flex min-h-screen flex-col transition-colors duration-500 ${isDark ? 'bg-[#0f1e3f]' : 'bg-gray-50'}`}>
      <Header />

      <div ref={containerRef} className="flex-1 w-full max-w-7xl mx-auto px-6 py-32 lg:px-20">
        
        {/* Hero Section */}
        <section ref={heroRef} className="mb-24 text-center">
          <h1 
            className="hero-anim text-5xl md:text-7xl font-bold font-serif leading-tight mb-6"
            style={{ color: textPrimary }}
          >
            The Minds Behind <span style={{ color: accentColor }}>NyayaAI</span>
          </h1>
          <p 
            className="hero-anim text-lg md:text-xl font-sans max-w-3xl mx-auto leading-relaxed"
            style={{ color: textSecondary }}
          >
            A dedicated team of developers, designers, and AI specialists working together 
            to democratize law in India. Built with passion, precision, and a 
            commitment to legal tech excellence.
          </p>
        </section>

        {/* Team Grid */}
        <section ref={teamRef}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {TEAM_MEMBERS.map((member) => (
              <div
                key={member.name}
                className="team-card group relative p-8 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
                style={{ 
                  backgroundColor: cardBg, 
                  borderColor: cardBorder,
                }}
                onMouseEnter={handleCardMouseEnter}
                onMouseLeave={handleCardMouseLeave}
              >
                {/* Abstract Background Decoration */}
                <div 
                  className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ backgroundColor: accentColor }}
                />

                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold font-serif mb-6 shadow-lg"
                  style={{ 
                    backgroundColor: isDark ? '#cdaa80' : '#997953',
                    color: isDark ? '#0f1e3f' : '#ffffff' 
                  }}
                >
                  {member.initials}
                </div>

                <h3 
                  className="text-2xl font-bold font-serif mb-2"
                  style={{ color: textPrimary }}
                >
                  {member.name}
                </h3>
                
                <span 
                  className="text-xs font-bold uppercase tracking-widest mb-4 inline-block px-3 py-1 rounded-full"
                  style={{ 
                    color: accentColor,
                    backgroundColor: isDark ? 'rgba(205, 170, 128, 0.1)' : 'rgba(153, 121, 83, 0.1)'
                  }}
                >
                  {member.role}
                </span>

                <p 
                  className="text-sm font-sans leading-relaxed"
                  style={{ color: textSecondary }}
                >
                  {member.description}
                </p>

                {/* Tags */}
                <div className="mt-6 pt-6 border-t w-full flex flex-wrap justify-center gap-2" style={{ borderColor: borderColor }}>
                  {['Tech Enthusiast', 'Hackathon Winner'].map((tag) => (
                    <span 
                      key={tag}
                      className="text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded border opacity-60"
                      style={{ color: textPrimary, borderColor: borderColor }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mission Footer */}
        <section className="mt-32 text-center py-16 border-t" style={{ borderColor: borderColor }}>
          <h2 className="text-3xl font-serif font-bold mb-4" style={{ color: textPrimary }}>
            Building for Bharat
          </h2>
          <p className="text-sm font-sans max-w-xl mx-auto opacity-70" style={{ color: textSecondary }}>
            NyayaAI is more than just a tool. It's a movement to make legal guidance accessible 
            to every Indian citizen, regardless of their background or expertise.
          </p>
        </section>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
        
        .font-serif {
          font-family: 'Playfair Display', serif;
        }
      `}</style>
    </main>
  );
}
