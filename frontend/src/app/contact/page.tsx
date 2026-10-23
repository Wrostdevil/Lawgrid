'use client';

import React, { useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Header from '../../../components/header';
import { useTheme } from '../../../components/themeprovider';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export default function ContactPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const heroRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);


  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  /* ── Color tokens ───────────────────────────────────── */
  const textPrimary = isDark ? '#ededed' : '#171717';
  const textSecondary = isDark ? 'rgba(237, 237, 237, 0.7)' : 'rgba(23, 23, 23, 0.7)';
  const borderColor = isDark ? 'rgba(205, 170, 128, 0.2)' : 'rgba(153, 121, 83, 0.2)';
  const inputBorderColor = isDark ? 'rgba(205, 170, 128, 0.15)' : 'rgba(153, 121, 83, 0.15)';
  const accentColor = isDark ? '#cdaa80' : '#997953';
  const btnBg = isDark ? '#cdaa80' : '#997953';
  const btnText = isDark ? '#0f1e3f' : '#ffffff';
  const btnHoverBg = isDark ? '#d9b88f' : '#8a6d4b';


  /* ── GSAP: Hero text entrance ───────────────────────── */
  useGSAP(() => {
    if (!heroRef.current) return;
    const els = heroRef.current.querySelectorAll('.hero-anim');
    gsap.fromTo(
      els,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out', delay: 0.2 },
    );
  }, []);

  /* ── GSAP: Form fields stagger entrance ─────────────── */
  useGSAP(() => {
    if (!formRef.current) return;

    // Stagger each field in from below
    gsap.fromTo(
      formRef.current.querySelectorAll('.form-field'),
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.4,
      },
    );

    // Animate each underline drawing in from the left
    gsap.fromTo(
      formRef.current.querySelectorAll('.field-border-line'),
      { scaleX: 0, transformOrigin: 'left' },
      {
        scaleX: 1,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.6,
      },
    );

    // Button entrance with a pop
    gsap.fromTo(
      formRef.current.querySelector('.send-btn'),
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)', delay: 1.1 },
    );
  }, []);

  /* ── GSAP: Interactive focus / blur on fields ─────── */
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = e.currentTarget.closest('.form-field');
    if (!field) return;
    const activeLine = field.querySelector('.field-active-line') as HTMLElement;
    const label = field.querySelector('.field-label') as HTMLElement;

    // Expand accent underline from center
    gsap.to(activeLine, { scaleX: 1, duration: 0.4, ease: 'power3.out' });
    // Lift the field slightly
    gsap.to(field, { y: -2, duration: 0.3, ease: 'power2.out' });
    // Emphasize the label
    if (label) gsap.to(label, { color: accentColor, y: -2, duration: 0.3, ease: 'power2.out' });
  }, [accentColor]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = e.currentTarget.closest('.form-field');
    if (!field) return;
    const activeLine = field.querySelector('.field-active-line') as HTMLElement;
    const label = field.querySelector('.field-label') as HTMLElement;

    // Retract accent underline
    gsap.to(activeLine, { scaleX: 0, duration: 0.3, ease: 'power3.in' });
    // Drop field back
    gsap.to(field, { y: 0, duration: 0.3, ease: 'power2.out' });
    // Reset label
    if (label) gsap.to(label, { color: textSecondary, y: 0, duration: 0.3, ease: 'power2.out' });
  }, [textSecondary]);



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <main className={`flex min-h-screen flex-col transition-colors duration-500 ${isDark ? 'bg-[#0f1e3f]' : 'bg-gray-50'}`}>
      <Header />

      {/* ─── Two-Column Hero: Left text + Right form ──── */}
      <section className="min-h-screen flex items-center px-6 pt-24 pb-16 lg:px-20 lg:pt-28">
        <div className="mx-auto w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

          {/* ── Left Column: Heading + Contact Info ───── */}
          <div ref={heroRef} className="flex flex-col justify-between lg:sticky lg:top-32 lg:min-h-[70vh]">
            <div>
              <h1
                className="hero-anim font-[var(--font-playfair)] text-5xl md:text-6xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight"
                style={{ color: textPrimary, fontFamily: 'var(--font-playfair), serif' }}
              >
                Get in Touch
              </h1>

              <p
                className="hero-anim mt-6 text-lg leading-relaxed max-w-md"
                style={{ color: textSecondary }}
              >
                Have questions or feedback? We&apos;d love to hear from you.
                Reach out and let&apos;s start a conversation.
              </p>

              <div className="hero-anim mt-8 flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: textSecondary }}>Get at</span>
                <a
                  href="mailto:contact@nyayaai.com"
                  className="text-sm font-semibold underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: textPrimary }}
                >
                  contact@nyayaai.com
                </a>
              </div>
            </div>

            {/* ── Contact Details (below heading, like reference) ── */}
            <div className="hero-anim mt-12 lg:mt-auto grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8" style={{ borderTop: `1px solid ${borderColor}` }}>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: textSecondary }}>Phone</h3>
                <p className="text-sm font-sans" style={{ color: textPrimary }}>+91 1234567890</p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: textSecondary }}>Address</h3>
                <p className="text-sm font-sans leading-relaxed" style={{ color: textPrimary }}>
                  123 Nyaya Bhavan<br />
                  Legal District, New Delhi 110001
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: textSecondary }}>Office Hours</h3>
                <p className="text-sm font-sans leading-relaxed" style={{ color: textPrimary }}>
                  Mon – Fri: 9:00 AM – 6:00 PM<br />
                  Sat: 10:00 AM – 4:00 PM
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: textSecondary }}>Follow Us</h3>
                <div className="flex gap-4">
                  {['Twitter', 'LinkedIn', 'Instagram'].map((s) => (
                    <a
                      key={s}
                      href="#"
                      className="text-sm font-sans transition-opacity hover:opacity-60"
                      style={{ color: textPrimary }}
                    >
                      {s}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Minimal underline form ──── */}
          <div ref={formRef}>
            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* Name */}
              <div className="form-field relative py-5">
                <label className="field-label block text-xs font-bold uppercase tracking-widest mb-1 transition-colors" style={{ color: textSecondary }}>
                  Name <span style={{ color: '#c47a5a' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="Your name"
                  required
                  className="w-full bg-transparent text-sm outline-none placeholder-current font-sans"
                  style={{ color: textPrimary, opacity: formData.name ? 1 : 0.5 }}
                />
                <div className="field-border-line absolute bottom-0 left-0 w-full h-px" style={{ backgroundColor: inputBorderColor }} />
                <div className="field-active-line absolute bottom-0 left-0 w-full h-[2px] scale-x-0 origin-center" style={{ backgroundColor: accentColor }} />
              </div>

              {/* Email */}
              <div className="form-field relative py-5">
                <label className="field-label block text-xs font-bold uppercase tracking-widest mb-1 transition-colors" style={{ color: textSecondary }}>
                  Email Address <span style={{ color: '#c47a5a' }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-transparent text-sm outline-none placeholder-current font-sans"
                  style={{ color: textPrimary, opacity: formData.email ? 1 : 0.5 }}
                />
                <div className="field-border-line absolute bottom-0 left-0 w-full h-px" style={{ backgroundColor: inputBorderColor }} />
                <div className="field-active-line absolute bottom-0 left-0 w-full h-[2px] scale-x-0 origin-center" style={{ backgroundColor: accentColor }} />
              </div>

              {/* Subject */}
              <div className="form-field relative py-5">
                <label className="field-label block text-xs font-bold uppercase tracking-widest mb-1 transition-colors" style={{ color: textSecondary }}>
                  Subject <span style={{ color: '#c47a5a' }}>*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="What is this about?"
                  required
                  className="w-full bg-transparent text-sm outline-none placeholder-current font-sans"
                  style={{ color: textPrimary, opacity: formData.subject ? 1 : 0.5 }}
                />
                <div className="field-border-line absolute bottom-0 left-0 w-full h-px" style={{ backgroundColor: inputBorderColor }} />
                <div className="field-active-line absolute bottom-0 left-0 w-full h-[2px] scale-x-0 origin-center" style={{ backgroundColor: accentColor }} />
              </div>

              {/* Message */}
              <div className="form-field relative py-5">
                <label className="field-label block text-xs font-bold uppercase tracking-widest mb-1 transition-colors" style={{ color: textSecondary }}>
                  Message <span style={{ color: '#c47a5a' }}>*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="Tell us more..."
                  required
                  rows={3}
                  className="w-full bg-transparent text-sm outline-none resize-none placeholder-current font-sans"
                  style={{ color: textPrimary, opacity: formData.message ? 1 : 0.5 }}
                />
                <div className="field-border-line absolute bottom-0 left-0 w-full h-px" style={{ backgroundColor: inputBorderColor }} />
                <div className="field-active-line absolute bottom-0 left-0 w-full h-[2px] scale-x-0 origin-center" style={{ backgroundColor: accentColor }} />
              </div>

              {/* Submit */}
              <div className="form-field mt-8">
                <button
                  type="submit"
                  className="send-btn rounded-full px-8 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] font-sans"
                  style={{
                    backgroundColor: btnBg,
                    color: btnText,
                    border: `1.5px solid ${btnBg}`,
                  }}
                  onMouseEnter={(e) => {
                    gsap.to(e.currentTarget, {
                      scale: 1.05,
                      y: -3,
                      backgroundColor: btnHoverBg,
                      borderColor: btnHoverBg,
                      boxShadow: `0 8px 25px ${isDark ? 'rgba(205,170,128,0.25)' : 'rgba(153,121,83,0.35)'}`,
                      duration: 0.35,
                      ease: 'power2.out',
                    });
                  }}
                  onMouseLeave={(e) => {
                    gsap.to(e.currentTarget, {
                      scale: 1,
                      y: 0,
                      backgroundColor: btnBg,
                      borderColor: btnBg,
                      boxShadow: '0 0px 0px transparent',
                      duration: 0.3,
                      ease: 'power2.inOut',
                    });
                  }}
                >
                  Send Message
                </button>
                {submitted && (
                  <p className="mt-4 text-sm font-sans text-emerald-600 dark:text-emerald-400">
                    Thanks for reaching out! We&apos;ll get back to you soon.
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
