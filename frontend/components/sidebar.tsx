"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';
import { Menu, Home, Compass, Gavel, Store, HelpCircle, Sun, Moon, LogOut, User, type LucideIcon } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { useTheme } from './themeprovider'; // Adjust path to your ThemeProvider
import { signOut } from '@/lib/auth';

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

// ==========================================
// 1. EXPORTED INTERFACES
// ==========================================

export interface NavItem {
  id: string;
  icon: LucideIcon;
  label?: string;
  href?: string;
  onClick?: () => void;
}

export interface SidebarThemeColors {
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  hoverBgLight: string;
  hoverBgDark: string;
}

export interface SidebarProps {
  /** Array of main navigation items */
  navItems?: NavItem[];

  /** Configuration for the bottom/end of the sidebar */
  showThemeToggle?: boolean;
  showProfileButton?: boolean;
  onProfileClick?: () => void;
  showHelpIcon?: boolean;
  helpIcon?: LucideIcon;
  onHelpClick?: () => void;

  /** Theme & Color Overrides */
  themeColors?: Partial<SidebarThemeColors>;
}

// ==========================================
// 2. DEFAULT CONFIGURATION
// ==========================================

const DEFAULT_THEME: SidebarThemeColors = {
  bgLight: '#cdaa80',
  bgDark: '#0f1e3f',
  textLight: '#0f1e3f',
  textDark: '#cdaa80',
  // Using explicit rgba/hex for hover ensures we don't rely on Tailwind's opacity modifiers failing on dynamic variables
  hoverBgLight: 'rgba(15, 30, 63, 0.1)',   // #0f1e3f at 10%
  hoverBgDark: 'rgba(205, 170, 128, 0.1)', // #cdaa80 at 10%
};

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'menu', icon: Menu, label: 'Menu' },
  { id: 'home', icon: Home, label: 'Home', href: '/citizen/home' },
  { id: 'explore', icon: Compass, label: 'Explore', href: '/citizen/explore' },
  { id: 'cases', icon: Gavel, label: 'Cases', href: '/citizen/cases' },
  { id: 'marketplace', icon: Store, label: 'Marketplace', href: '/citizen/market_place' },
];

// ==========================================
// 3. COMPONENT
// ==========================================

export const Sidebar: React.FC<SidebarProps> = ({
  navItems = DEFAULT_NAV_ITEMS,
  showThemeToggle = true,
  showProfileButton = false,
  onProfileClick,
  showHelpIcon = false,
  helpIcon: HelpIcon = HelpCircle,
  onHelpClick,
  themeColors = {},
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Restore expanded state from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      // Force collapsed on mobile by default
      if (isMobile) {
        setIsExpanded(false);
      } else {
        const stored = localStorage.getItem('sidebarExpanded');
        if (stored === 'true') {
          setIsExpanded(true);
        } else {
          setIsExpanded(false);
        }
      }
      setIsReady(true);
    }
  }, []);
  const sidebarRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const themeIconRef = useRef<HTMLDivElement | null>(null);
  const expandTlRef = useRef<gsap.core.Timeline | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme, mounted } = useTheme();

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsExpanded(false);
    }
  }, [pathname]);

  // Merge default colors with any user-provided overrides
  const colors = { ...DEFAULT_THEME, ...themeColors };

  // Setup CSS Variables for dynamic styling
  const dynamicStyles = {
    '--sb-bg-light': colors.bgLight,
    '--sb-bg-dark': colors.bgDark,
    '--sb-text-light': colors.textLight,
    '--sb-text-dark': colors.textDark,
    '--sb-hover-light': colors.hoverBgLight,
    '--sb-hover-dark': colors.hoverBgDark,
  } as React.CSSProperties;

  useEffect(() => {
    const bottomActionsCount = (showThemeToggle ? 1 : 0) + (showProfileButton ? 1 : 0) + 1 + (showHelpIcon ? 1 : 0);
    iconRefs.current.length = navItems.length + bottomActionsCount;
    labelRefs.current.length = navItems.length + bottomActionsCount;
  }, [navItems.length, showThemeToggle, showProfileButton, showHelpIcon]);

  // GSAP Entrance Animations
  useGSAP(() => {
    if (!mounted || !sidebarRef.current) return;

    const validRefs = iconRefs.current.filter(Boolean);
    gsap.set(validRefs, { transformOrigin: '50% 50%' });

    const tl = gsap.timeline();
    tl.fromTo(
      sidebarRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
    ).fromTo(
      validRefs,
      { x: -20, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        stagger: 0.08,
        duration: 0.5,
        ease: 'power3.out',
        overwrite: 'auto',
      },
      '-=0.2'
    );
  }, { dependencies: [navItems.length, showThemeToggle, mounted], scope: sidebarRef });

  // GSAP Animations
  useGSAP(() => {
    if (!mounted || !sidebarRef.current) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const labels = labelRefs.current.filter(Boolean);
      
      // Animate sidebar width with a subtle overshoot for a "premium" feel
      gsap.to(sidebarRef.current, {
        width: isExpanded ? 240 : 90,
        duration: 0.6,
        ease: isExpanded ? 'back.out(1.1)' : 'power3.inOut',
        overwrite: 'auto',
      });

      // Animate labels with a glide-in effect
      gsap.to(labels, {
        opacity: isExpanded ? 1 : 0,
        x: isExpanded ? 0 : -10,
        maxWidth: isExpanded ? 200 : 0,
        marginLeft: isExpanded ? 16 : 0,
        duration: 0.5,
        ease: 'power2.inOut',
        stagger: isExpanded ? 0.05 : 0.02,
        overwrite: 'auto',
      });
    });

    mm.add("(max-width: 767px)", () => {
      const items = iconRefs.current.filter(Boolean);
      const labels = labelRefs.current.filter(Boolean);

      // Animate mobile drawer position and width
      gsap.to(sidebarRef.current, {
        x: isExpanded ? 0 : '-100%',
        width: isExpanded ? 240 : 0,
        opacity: isExpanded ? 1 : 0,
        duration: 0.5,
        ease: isExpanded ? 'expo.out' : 'expo.in',
        overwrite: 'auto',
      });

      // Animate labels on mobile
      gsap.to(labels, {
        opacity: isExpanded ? 1 : 0,
        maxWidth: isExpanded ? 200 : 0,
        x: isExpanded ? 0 : -10,
        marginLeft: isExpanded ? 16 : 0,
        duration: 0.4,
        ease: 'power2.out',
        stagger: isExpanded ? 0.05 : 0,
        overwrite: 'auto',
      });

      // Stagger items inside the mobile drawer
      if (isExpanded) {
        gsap.fromTo(items, 
          { y: 15, opacity: 0 },
          { 
            y: 0, 
            opacity: 1, 
            duration: 0.5, 
            stagger: 0.06, 
            ease: 'back.out(1.2)',
            delay: 0.1,
            overwrite: 'auto'
          }
        );
      }

      // Backdrop animation
      if (backdropRef.current) {
        gsap.to(backdropRef.current, {
          opacity: isExpanded ? 1 : 0,
          pointerEvents: isExpanded ? 'auto' : 'none',
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    });

    return () => mm.revert();
  }, { dependencies: [isExpanded, mounted, isReady], scope: sidebarRef });

  // GSAP Hover Effects
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.killTweensOf(e.currentTarget);
    gsap.to(e.currentTarget, { scale: 1.12, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.killTweensOf(e.currentTarget);
    gsap.to(e.currentTarget, { scale: 1, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
  };

  const handleThemeToggle = () => {
    if (themeIconRef.current) {
      gsap.to(themeIconRef.current, {
        rotate: theme === 'dark' ? 0 : 35,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
    toggleTheme();
  };

  const handleMenuToggle = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarExpanded', String(next));
      }
      return next;
    });
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Failed to sign out:', error.message);
      return;
    }
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Menu Toggle Button - Only visible on mobile */}
      <button
        onClick={handleMenuToggle}
        className="fixed top-4 left-4 z-[1100] p-3 rounded-full bg-[var(--sb-bg-light)] dark:bg-[var(--sb-bg-dark)] text-[var(--sb-text-light)] dark:text-[var(--sb-text-dark)] shadow-lg md:hidden border border-[var(--sb-text-light)]/20 dark:border-[var(--sb-text-dark)]/20 active:scale-90 transition-transform duration-200"
        style={dynamicStyles}
      >
        <Menu size={20} />
      </button>

      {/* Backdrop for mobile drawer */}
      <div 
        ref={backdropRef}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] md:hidden opacity-0 pointer-events-none"
        onClick={() => {
          setIsExpanded(false);
          if (typeof window !== 'undefined') {
            localStorage.setItem('sidebarExpanded', 'false');
          }
        }}
      />

      <aside
        ref={sidebarRef}
        style={dynamicStyles}
        className={`
          fixed top-0 left-0 h-full w-[90px] transition-colors duration-300 ease-in-out z-[1000]
          md:relative md:h-full md:flex-col md:rounded-none md:shadow-none md:py-10 md:px-0 md:overflow-visible
          flex flex-col py-6 px-4
          bg-[var(--sb-bg-light)] dark:bg-[var(--sb-bg-dark)] 
          text-[var(--sb-text-light)] dark:text-[var(--sb-text-dark)] 
          ${!isReady && 'opacity-0'}
        `}
      >
      {/* Top / Main Navigation Items */}
      <div className="flex flex-col items-start gap-4 md:gap-8 w-full md:px-[25px]">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isMenuTop = item.id === 'menu';
          return (
            <div
              key={item.id}
              ref={(el) => { iconRefs.current[index] = el; }}
              onClick={() => {
                if (isMenuTop) {
                  handleMenuToggle();
                  return;
                }

                if (item.href) {
                  router.push(item.href);
                }

                if (item.onClick) {
                  item.onClick();
                }
              }}
              title={item.label}
              className={`
                cursor-pointer p-2 rounded-xl transition-colors duration-300 flex items-center
                hover:bg-[var(--sb-hover-light)] dark:hover:bg-[var(--sb-hover-dark)]
                ${index === 0 ? 'md:mb-8' : ''} /* Pushes first icon away from the rest on desktop */
                md:justify-start md:overflow-hidden md:w-full
              `}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Icon size={24} strokeWidth={2.25} className="shrink-0" />

              <span
                ref={(el) => { labelRefs.current[index] = el; }}
                className={`
                md:block whitespace-nowrap overflow-hidden opacity-100 md:opacity-0 md:max-w-0 ml-4 md:ml-0
              `}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom Icons Container */}
      <div className="flex flex-col gap-4 mt-auto items-start w-full md:px-[25px]">

        {/* Profile Button */}
        {showProfileButton && (
          <div
            ref={(el) => { iconRefs.current[navItems.length + (showProfileButton ? 0 : 0)] = el; }}
            onClick={onProfileClick}
            title="Profile"
            className="cursor-pointer p-2 rounded-xl hover:bg-[var(--sb-hover-light)] dark:hover:bg-[var(--sb-hover-dark)] transition-colors duration-300 flex items-center md:justify-start md:overflow-hidden md:w-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <User size={24} strokeWidth={2.25} className="shrink-0" />
            <span
              ref={(el) => { labelRefs.current[navItems.length + (showProfileButton ? 0 : 0)] = el; }}
              className={`
              md:block whitespace-nowrap overflow-hidden opacity-100 md:opacity-0 md:max-w-0 ml-4 md:ml-0
            `}
            >
              Profile
            </span>
          </div>
        )}

        {/* Theme Toggle Button */}
        {showThemeToggle && mounted && (
          <div
            ref={(el) => { iconRefs.current[navItems.length + (showProfileButton ? 1 : 0)] = el; }}
            onClick={handleThemeToggle}
            title="Toggle Theme"
            className="cursor-pointer p-2 rounded-xl hover:bg-[var(--sb-hover-light)] dark:hover:bg-[var(--sb-hover-dark)] transition-colors duration-300 flex items-center md:justify-start md:overflow-hidden md:w-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              ref={themeIconRef}
              className="shrink-0 transition-transform duration-300"
              style={{ transform: `rotate(${theme === 'dark' ? 0 : 35}deg)` }}
            >
              {theme === 'dark' ? (
                <Sun size={24} strokeWidth={2.25} />
              ) : (
                <Moon size={24} strokeWidth={2.25} />
              )}
            </div>
            <span
              ref={(el) => { labelRefs.current[navItems.length + (showProfileButton ? 1 : 0)] = el; }}
              className={`
              md:block whitespace-nowrap overflow-hidden opacity-100 md:opacity-0 md:max-w-0 ml-4 md:ml-0
            `}
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </div>
        )}

        {/* Logout Button */}
        <div
          ref={(el) => { iconRefs.current[navItems.length + (showProfileButton ? 1 : 0) + (showThemeToggle ? 1 : 0)] = el; }}
          onClick={handleLogout}
          title="Logout"
          className="cursor-pointer p-2 rounded-xl hover:bg-[var(--sb-hover-light)] dark:hover:bg-[var(--sb-hover-dark)] transition-colors duration-300 flex items-center md:justify-start md:overflow-hidden md:w-full"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <LogOut size={24} strokeWidth={2.25} className="shrink-0" />
          <span
            ref={(el) => { labelRefs.current[navItems.length + (showProfileButton ? 1 : 0) + (showThemeToggle ? 1 : 0)] = el; }}
            className={`
              md:block whitespace-nowrap overflow-hidden opacity-100 md:opacity-0 md:max-w-0 ml-4 md:ml-0
            `}
          >
            Logout
          </span>
        </div>

        {/* Help Icon */}
        {showHelpIcon && (
          <div
            ref={(el) => { iconRefs.current[navItems.length + (showProfileButton ? 1 : 0) + (showThemeToggle ? 1 : 0) + 1] = el; }}
            onClick={onHelpClick}
            title="Help & Support"
            className="cursor-pointer p-2 rounded-xl hover:bg-[var(--sb-hover-light)] dark:hover:bg-[var(--sb-hover-dark)] transition-colors duration-300 flex items-center md:justify-start md:overflow-hidden md:w-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <HelpIcon size={24} strokeWidth={2.25} className="shrink-0" />
            <span
              ref={(el) => { labelRefs.current[navItems.length + (showProfileButton ? 1 : 0) + (showThemeToggle ? 1 : 0) + 1] = el; }}
              className={`
              md:block whitespace-nowrap overflow-hidden opacity-100 md:opacity-0 md:max-w-0 ml-4 md:ml-0
            `}
            >
              Help & Support
            </span>
          </div>
        )}
      </div>
    </aside>
    </>
  );
};
