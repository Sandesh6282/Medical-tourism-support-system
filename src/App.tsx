import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowRight, ArrowDown, ChevronUp, Info, X } from 'lucide-react';
import { useVideoScrub } from '@/hooks/useVideoScrub';
import Stagger from '@/components/Stagger';
import { DashboardWorkspace, DashboardTab } from '@/components/dashboard/DashboardWorkspace';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4';

interface NavItem {
  label: string;
  href: string;
  progress?: number;
  isDashboardTrigger?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '#home', progress: 0.0 },
  { label: 'About the Project', href: '#about', progress: 0.27 },
  { label: 'How It Works', href: '#how-it-works', progress: 0.47 },
  { label: 'Evaluation Criteria', href: '#criteria', progress: 0.67 },
  { label: 'Explore System', href: '#dashboard/rankings', isDashboardTrigger: true },
];

export function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navEntered, setNavEntered] = useState(false);

  // Unified view state: 'landing' or 'dashboard'
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>(() => {
    return typeof window !== 'undefined' && window.location.hash.startsWith('#dashboard')
      ? 'dashboard'
      : 'landing';
  });

  const {
    containerRef,
    videoRef,
    canvasRef,
    progress,
    canvasLive,
    status,
    fallbackReason,
  } = useVideoScrub(VIDEO_URL, { enabled: viewMode === 'landing' });

  const [initialDashboardTab, setInitialDashboardTab] = useState<DashboardTab>(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hash;
      if (h.startsWith('#dashboard/')) {
        const tab = h.replace('#dashboard/', '') as DashboardTab;
        if (
          ['preferences', 'weights', 'rankings', 'comparison', 'sensitivity', 'methodology'].includes(
            tab
          )
        ) {
          return tab;
        }
      }
    }
    return 'rankings';
  });

  const openDashboard = useCallback((tab: DashboardTab = 'rankings') => {
    setInitialDashboardTab(tab);
    setViewMode('dashboard');
    window.location.hash = `#dashboard/${tab}`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const returnToLanding = useCallback(() => {
    setViewMode('landing');
    window.location.hash = '#home';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Diagnostic log for video scrub status & fallback
  useEffect(() => {
    if (status === 'fallback' && fallbackReason) {
      console.info(`[Medical Tourism DSS] Fallback seeking active: ${fallbackReason}`);
    } else if (status === 'ready') {
      console.info('[Medical Tourism DSS] MP4 frame bank successfully built and ready.');
    }
  }, [status, fallbackReason]);

  // Trigger nav entrance animation after 200ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setNavEntered(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Handle body overflow when mobile menu is open/closed
  useEffect(() => {
    if (mobileMenuOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [mobileMenuOpen]);

  // Smooth scroll jump helper
  const scrollToProgress = (targetProgress: number) => {
    const container = containerRef.current;
    if (!container) return;
    const maxScroll = container.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: maxScroll * targetProgress,
      behavior: 'smooth',
    });
  };

  // Support direct URL hash changes and deep links
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#dashboard')) {
        setViewMode('dashboard');
        const tab = hash.replace('#dashboard/', '') as DashboardTab;
        if (
          ['preferences', 'weights', 'rankings', 'comparison', 'sensitivity', 'methodology'].includes(
            tab
          )
        ) {
          setInitialDashboardTab(tab);
        }
      } else {
        setViewMode('landing');
        if (hash === '#about') scrollToProgress(0.27);
        else if (hash === '#how-it-works') scrollToProgress(0.47);
        else if (hash === '#criteria') scrollToProgress(0.67);
        else if (hash === '#countries') scrollToProgress(0.85);
        else if (hash === '#explore') scrollToProgress(0.98);
        else if (hash === '#home' || hash === '#hero') scrollToProgress(0.0);
      }
    };

    if (window.location.hash) {
      // Delay slightly for container layout to stabilize
      setTimeout(handleHash, 100);
    }

    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Navbar color state: navy (#1D3045) before 0.55, white after 0.55
  const isDarkScene = progress >= 0.55;
  const navTextColorClass = isDarkScene ? 'text-white' : 'text-[#1D3045]';
  const navBgColorClass = isDarkScene ? 'bg-white' : 'bg-[#1D3045]';
  const navInvertedIconClass = isDarkScene ? 'text-[#1D3045]' : 'text-white';

  // Active navigation index based on scroll position
  const activeNavIndex = useMemo(() => {
    if (progress < 0.18) return 0; // Home
    if (progress < 0.37) return 1; // About the Project
    if (progress < 0.57) return 2; // How It Works
    if (progress < 0.77) return 3; // Evaluation Criteria
    return -1;
  }, [progress]);

  // Section opacities across the 600vh scroll range
  const {
    opacity1,
    opacity2,
    opacity3,
    opacity4,
    opacity5,
    opacity6,
  } = useMemo(() => {
    const p = progress;

    // Section 1: Hero (0.0 to 0.17)
    let o1 = 0;
    if (p < 0.13) {
      o1 = 1;
    } else if (p < 0.17) {
      o1 = Math.max(0, 1 - (p - 0.13) / 0.04);
    }

    // Section 2: About the Project (0.18 to 0.37)
    let o2 = 0;
    if (p >= 0.18 && p < 0.22) {
      o2 = (p - 0.18) / 0.04;
    } else if (p >= 0.22 && p < 0.33) {
      o2 = 1;
    } else if (p >= 0.33 && p < 0.37) {
      o2 = Math.max(0, 1 - (p - 0.33) / 0.04);
    }

    // Section 3: How It Works (0.38 to 0.57)
    let o3 = 0;
    if (p >= 0.38 && p < 0.42) {
      o3 = (p - 0.38) / 0.04;
    } else if (p >= 0.42 && p < 0.53) {
      o3 = 1;
    } else if (p >= 0.53 && p < 0.57) {
      o3 = Math.max(0, 1 - (p - 0.53) / 0.04);
    }

    // Section 4: Evaluation Criteria (0.58 to 0.77)
    let o4 = 0;
    if (p >= 0.58 && p < 0.62) {
      o4 = (p - 0.58) / 0.04;
    } else if (p >= 0.62 && p < 0.73) {
      o4 = 1;
    } else if (p >= 0.73 && p < 0.77) {
      o4 = Math.max(0, 1 - (p - 0.73) / 0.04);
    }

    // Section 5: Country Coverage (0.78 to 0.93)
    let o5 = 0;
    if (p >= 0.78 && p < 0.82) {
      o5 = (p - 0.78) / 0.04;
    } else if (p >= 0.82 && p < 0.89) {
      o5 = 1;
    } else if (p >= 0.89 && p < 0.93) {
      o5 = Math.max(0, 1 - (p - 0.89) / 0.04);
    }

    // Section 6: Final CTA (0.94 to 1.0)
    let o6 = 0;
    if (p >= 0.93 && p < 0.96) {
      o6 = (p - 0.93) / 0.03;
    } else if (p >= 0.96) {
      o6 = 1;
    }

    return {
      opacity1: o1,
      opacity2: o2,
      opacity3: o3,
      opacity4: o4,
      opacity5: o5,
      opacity6: o6,
    };
  }, [progress]);

  return (
    <>
      {viewMode === 'dashboard' && (
        <DashboardWorkspace
          onBackToHome={returnToLanding}
          initialTab={initialDashboardTab}
        />
      )}

      <div style={{ display: viewMode === 'landing' ? 'block' : 'none' }}>
        <main
          ref={containerRef}
          id="main-landing-track"
          className="relative w-full h-[600vh] bg-[#1D3045]"
        >
      {/* Anchor targets along the scroll track */}
      <div id="home" className="absolute top-0 pointer-events-none" />
      <div id="about" className="absolute top-[27%] pointer-events-none" />
      <div id="how-it-works" className="absolute top-[47%] pointer-events-none" />
      <div id="criteria" className="absolute top-[67%] pointer-events-none" />
      <div id="countries" className="absolute top-[85%] pointer-events-none" />
      <div id="explore" className="absolute top-[98%] pointer-events-none" />

      {/* Sticky full-viewport scene */}
      <div className="sticky top-0 h-screen w-full overflow-hidden select-none">
        {/* Layer 1: Background Video (Underneath) */}
        <video
          ref={videoRef}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Layer 2: Decoded Canvas (Fades in over video when live) */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-700 ${
            canvasLive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Layer 3: Absolute Navigation & Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {/* Top Navbar */}
          <header
            id="navbar"
            className="w-full absolute top-0 left-0 z-50 pointer-events-auto px-6 sm:px-8 md:px-12 pt-8 sm:pt-12 pb-6 flex items-center justify-between"
          >
            {/* Desktop Left Cluster */}
            <nav
              id="desktop-nav"
              aria-label="Main Navigation"
              className="hidden lg:flex items-center gap-7 xl:gap-9"
            >
              {NAV_ITEMS.map((item, i) => {
                const isActive = i === activeNavIndex;
                const delayMs = i * 70 + 100;

                if (item.isDashboardTrigger) {
                  return (
                    <button
                      key={item.label}
                      id="nav-link-explore"
                      type="button"
                      onClick={() => openDashboard('rankings')}
                      style={{
                        transform: navEntered ? 'translateY(0)' : 'translateY(-12px)',
                        opacity: navEntered ? 1 : 0,
                        transition: `transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, color 500ms ease, border-color 500ms ease`,
                      }}
                      className={`text-xs tracking-[0.15em] uppercase font-semibold hover:opacity-75 transition-all px-3 py-1.5 rounded-full border flex items-center gap-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-current ${
                        isDarkScene
                          ? 'border-white/40 text-white hover:border-white'
                          : 'border-[#1D3045]/40 text-[#1D3045] hover:border-[#1D3045]'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={12} />
                    </button>
                  );
                }

                return (
                  <button
                    key={item.label}
                    id={`nav-link-${i}`}
                    type="button"
                    onClick={() => {
                      if (item.progress !== undefined) {
                        scrollToProgress(item.progress);
                      }
                    }}
                    style={{
                      transform: navEntered ? 'translateY(0)' : 'translateY(-12px)',
                      opacity: navEntered ? 1 : 0,
                      transition: `transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, color 500ms ease`,
                    }}
                    className={`text-xs tracking-[0.15em] uppercase font-medium hover:opacity-70 transition-opacity relative py-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-current ${navTextColorClass} ${
                      isActive
                        ? "after:content-[''] after:absolute after:left-0 after:bottom-[-3px] after:w-full after:h-[2px] after:bg-current"
                        : ''
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Mobile / Tablet Left Hamburger Button (< lg) */}
            <div className="lg:hidden flex items-center">
              <button
                id="hamburger-btn"
                type="button"
                aria-label="Open Navigation Menu"
                onClick={() => setMobileMenuOpen(true)}
                className="flex flex-col gap-[5px] p-2 -ml-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-current"
              >
                <span
                  className={`w-6 h-[2px] rounded-full transition-colors duration-500 ${navBgColorClass}`}
                />
                <span
                  className={`w-6 h-[2px] rounded-full transition-colors duration-500 ${navBgColorClass}`}
                />
                <span
                  className={`w-4 h-[2px] rounded-full transition-colors duration-500 ${navBgColorClass}`}
                />
              </button>
            </div>

            {/* Right Cluster (hidden below sm breakpoint) */}
            <div
              id="nav-right-cluster"
              style={{
                transform: navEntered ? 'translateY(0)' : 'translateY(-12px)',
                opacity: navEntered ? 1 : 0,
                transition:
                  'transform 600ms cubic-bezier(0.16, 1, 0.3, 1) 500ms, opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) 500ms, color 500ms ease',
              }}
              className="hidden sm:flex items-center gap-5"
            >
              <span
                className={`text-xs tracking-[0.2em] uppercase font-medium transition-colors duration-500 ${navTextColorClass}`}
              >
                AHP-TOPSIS DSS
              </span>

              {/* 20px filled circle with inverted 10px Info icon */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-500 ${navBgColorClass}`}
                title="Medical Tourism Decision Support System | Knee Arthroplasty"
                aria-label="System Information"
              >
                <Info size={10} className={`transition-colors duration-500 ${navInvertedIconClass}`} />
              </div>

              {/* MENU trigger button */}
              <button
                id="menu-trigger-btn"
                type="button"
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileMenuOpen(true);
                  }
                }}
                className={`text-xs tracking-[0.2em] uppercase font-medium transition-colors duration-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-current ${navTextColorClass} ${
                  'lg:cursor-default cursor-pointer'
                }`}
              >
                MENU
              </button>
            </div>
          </header>

          {/* Sequential Text Sections Container */}
          <div className="relative w-full h-full">
            {/* ========================================================
                SECTION 1: HERO
               ======================================================== */}
            <section
              id="section-1"
              aria-label="Introduction & Hero"
              style={{
                opacity: opacity1,
                visibility: opacity1 > 0.005 ? 'visible' : 'hidden',
                pointerEvents: opacity1 > 0.05 ? 'auto' : 'none',
              }}
              className="absolute inset-0 flex flex-col justify-center items-start px-6 sm:px-8 md:px-20 lg:px-32"
            >
              <Stagger
                isVisible={opacity1 > 0.3}
                delays={[0, 120, 240, 360]}
                className="max-w-4xl"
              >
                {/* Heading */}
                <h1
                  id="hero-title"
                  style={{
                    fontSize: 'clamp(2rem, 5vw, 4.75rem)',
                    lineHeight: 1.15,
                    color: '#1D3045',
                  }}
                  className="font-light uppercase tracking-tight"
                >
                  A Smarter Way to Choose Your Surgical Destination
                </h1>

                {/* Subtitle */}
                <p
                  id="hero-subtitle"
                  style={{
                    color: 'rgba(29, 48, 69, 0.85)',
                  }}
                  className="mt-6 text-xs sm:text-sm tracking-[0.25em] uppercase font-medium"
                >
                  Evidence-informed hospital comparison for knee replacement surgery
                </p>

                {/* Supporting Text */}
                <p
                  id="hero-supporting-text"
                  style={{
                    color: 'rgba(29, 48, 69, 0.72)',
                  }}
                  className="mt-4 text-sm sm:text-base leading-relaxed max-w-2xl font-normal"
                >
                  Explore hospitals across countries using your priorities, hospital performance data, and multi-criteria decision analysis.
                </p>

                {/* Primary CTA Button */}
                <div className="mt-8 flex items-center gap-4">
                  <button
                    id="hero-cta-btn"
                    type="button"
                    onClick={() => openDashboard('preferences')}
                    className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[#1D3045] text-white hover:bg-[#1D3045]/90 transition-all duration-300 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium flex items-center gap-3 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D3045]"
                  >
                    <span>Explore the Decision Support System</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </Stagger>

              {/* Bottom-right scroll cue button */}
              <div
                style={{
                  opacity: opacity1 > 0.3 ? 1 : 0,
                  transform: opacity1 > 0.3 ? 'translateY(0)' : 'translateY(24px)',
                  transition:
                    'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) 400ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) 400ms',
                }}
                className="absolute bottom-12 right-6 sm:right-8 md:right-12"
              >
                <button
                  id="hero-scroll-btn"
                  type="button"
                  aria-label="Scroll to About Section"
                  onClick={() => scrollToProgress(0.27)}
                  style={{ borderColor: 'rgba(29, 48, 69, 0.5)' }}
                  className="w-12 h-12 rounded-full border flex items-center justify-center hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D3045]"
                >
                  <ArrowDown size={18} color="#1D3045" />
                </button>
              </div>
            </section>

            {/* ========================================================
                SECTION 2: ABOUT THE PROJECT
               ======================================================== */}
            <section
              id="section-2"
              aria-label="About the Project"
              style={{
                opacity: opacity2,
                visibility: opacity2 > 0.005 ? 'visible' : 'hidden',
                pointerEvents: opacity2 > 0.05 ? 'auto' : 'none',
              }}
              className="absolute inset-0 flex flex-col justify-center items-center px-6 sm:px-8 text-center"
            >
              <div className="max-w-[960px] mx-auto flex flex-col items-center">
                <Stagger
                  isVisible={opacity2 > 0.3}
                  delays={[0, 150, 300]}
                  className="flex flex-col items-center"
                >
                  {/* Eyebrow badge */}
                  <span
                    id="about-badge"
                    style={{ color: 'rgba(29, 48, 69, 0.7)' }}
                    className="text-xs tracking-[0.3em] uppercase font-medium mb-4"
                  >
                    Final Year Engineering Project • MCDM Architecture
                  </span>

                  {/* Heading */}
                  <h2
                    id="about-headline"
                    style={{
                      fontSize: 'clamp(1.75rem, 4.5vw, 3.8rem)',
                      lineHeight: 1.2,
                      color: '#1D3045',
                    }}
                    className="font-light tracking-tight uppercase"
                  >
                    Making Medical Tourism Decisions Clearer
                  </h2>

                  {/* Core explanation */}
                  <p
                    id="about-body"
                    style={{
                      color: 'rgba(29, 48, 69, 0.8)',
                    }}
                    className="mt-6 text-sm sm:text-base md:text-lg leading-relaxed max-w-3xl font-normal"
                  >
                    Patients considering knee replacement surgery abroad face a complex landscape of competing factors—balancing procedural expenses, hospital clinical quality, waiting times, travel logistics, and language barriers. The system is designed to organize these factors into an evidence-informed framework and help patients compare hospital alternatives according to their own preferences.
                  </p>

                  {/* Highlight pill cards */}
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
                    <div
                      style={{ borderColor: 'rgba(29, 48, 69, 0.25)', backgroundColor: 'rgba(255, 255, 255, 0.35)' }}
                      className="p-4 rounded-xl border backdrop-blur-xs"
                    >
                      <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#1D3045]/60">Target Procedure</div>
                      <div className="text-sm font-medium text-[#1D3045] mt-1">Knee Arthroplasty</div>
                    </div>
                    <div
                      style={{ borderColor: 'rgba(29, 48, 69, 0.25)', backgroundColor: 'rgba(255, 255, 255, 0.35)' }}
                      className="p-4 rounded-xl border backdrop-blur-xs"
                    >
                      <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#1D3045]/60">Decision Model</div>
                      <div className="text-sm font-medium text-[#1D3045] mt-1">Hybrid AHP-TOPSIS</div>
                    </div>
                    <div
                      style={{ borderColor: 'rgba(29, 48, 69, 0.25)', backgroundColor: 'rgba(255, 255, 255, 0.35)' }}
                      className="p-4 rounded-xl border backdrop-blur-xs"
                    >
                      <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#1D3045]/60">Candidate Set</div>
                      <div className="text-sm font-medium text-[#1D3045] mt-1">4 Nations • 16 Hospitals</div>
                    </div>
                  </div>
                </Stagger>
              </div>

              {/* Right-side quick section navigation */}
              <aside
                aria-label="Section Navigation Controls"
                className="absolute bottom-12 right-6 sm:right-8 md:right-12 flex flex-col items-center gap-3"
              >
                <button
                  type="button"
                  aria-label="Scroll Up to Home"
                  onClick={() => scrollToProgress(0)}
                  style={{ borderColor: 'rgba(29, 48, 69, 0.3)' }}
                  className="w-10 h-10 rounded-full border flex items-center justify-center hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1D3045]"
                >
                  <ChevronUp size={16} color="rgba(29, 48, 69, 0.8)" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll Down to How It Works"
                  onClick={() => scrollToProgress(0.47)}
                  style={{ borderColor: 'rgba(29, 48, 69, 0.4)' }}
                  className="w-10 h-10 rounded-full border flex items-center justify-center hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1D3045]"
                >
                  <ArrowDown size={16} color="#1D3045" />
                </button>
              </aside>
            </section>

            {/* ========================================================
                SECTION 3: HOW IT WORKS
               ======================================================== */}
            <section
              id="section-3"
              aria-label="How It Works — Analytical Methodology"
              style={{
                opacity: opacity3,
                visibility: opacity3 > 0.005 ? 'visible' : 'hidden',
                pointerEvents: opacity3 > 0.05 ? 'auto' : 'none',
              }}
              className="absolute inset-0 flex flex-col justify-center items-center px-6 sm:px-8 md:px-16 lg:px-24"
            >
              <div className="w-full max-w-6xl mx-auto">
                <Stagger
                  isVisible={opacity3 > 0.3}
                  delays={[0, 100, 200, 300]}
                >
                  {/* Section Eyebrow */}
                  <div className="text-center mb-3">
                    <span
                      style={{ color: 'rgba(29, 48, 69, 0.7)' }}
                      className="text-xs tracking-[0.25em] uppercase font-medium"
                    >
                      Three-Stage Analytical Process
                    </span>
                  </div>

                  {/* Section Title */}
                  <h2
                    id="how-it-works-title"
                    style={{
                      fontSize: 'clamp(1.75rem, 3.8vw, 3.25rem)',
                      lineHeight: 1.2,
                      color: '#1D3045',
                    }}
                    className="font-light tracking-tight uppercase text-center mb-10"
                  >
                    From Patient Preferences to Hospital Rankings
                  </h2>

                  {/* Three Clean Content Blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 text-left">
                    {/* Stage 1: AHP */}
                    <div
                      style={{
                        borderColor: 'rgba(29, 48, 69, 0.25)',
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                      }}
                      className="p-6 sm:p-7 rounded-2xl border backdrop-blur-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold tracking-[0.2em] text-[#1D3045]/60 uppercase mb-2">
                          Stage 01
                        </div>
                        <h3 className="text-base sm:text-lg font-medium text-[#1D3045] uppercase tracking-wide mb-3">
                          AHP — Analytic Hierarchy Process
                        </h3>
                        <p className="text-xs sm:text-sm text-[#1D3045]/80 leading-relaxed font-normal">
                          Patients compare criteria in pairs. AHP derives relative criterion weights and checks the consistency of those preferences.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#1D3045]/15 text-[11px] font-medium tracking-wider text-[#1D3045]/70 uppercase">
                        Consistency Ratio: CR &lt; 0.10
                      </div>
                    </div>

                    {/* Stage 2: TOPSIS */}
                    <div
                      style={{
                        borderColor: 'rgba(29, 48, 69, 0.25)',
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                      }}
                      className="p-6 sm:p-7 rounded-2xl border backdrop-blur-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold tracking-[0.2em] text-[#1D3045]/60 uppercase mb-2">
                          Stage 02
                        </div>
                        <h3 className="text-base sm:text-lg font-medium text-[#1D3045] uppercase tracking-wide mb-3">
                          TOPSIS Multi-Criteria Engine
                        </h3>
                        <p className="text-xs sm:text-sm text-[#1D3045]/80 leading-relaxed font-normal">
                          The system combines criterion weights with hospital performance data to calculate relative closeness scores and rank available alternatives.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#1D3045]/15 text-[11px] font-medium tracking-wider text-[#1D3045]/70 uppercase">
                        Closeness to Ideal Benchmark
                      </div>
                    </div>

                    {/* Stage 3: Sensitivity Analysis */}
                    <div
                      style={{
                        borderColor: 'rgba(29, 48, 69, 0.25)',
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                      }}
                      className="p-6 sm:p-7 rounded-2xl border backdrop-blur-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold tracking-[0.2em] text-[#1D3045]/60 uppercase mb-2">
                          Stage 03
                        </div>
                        <h3 className="text-base sm:text-lg font-medium text-[#1D3045] uppercase tracking-wide mb-3">
                          Sensitivity Analysis
                        </h3>
                        <p className="text-xs sm:text-sm text-[#1D3045]/80 leading-relaxed font-normal">
                          The system compares alternative preference scenarios, such as cost-focused, quality-focused, and time-focused decisions, to explore how rankings change.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#1D3045]/15 text-[11px] font-medium tracking-wider text-[#1D3045]/70 uppercase">
                        Decision Robustness Testing
                      </div>
                    </div>
                  </div>
                </Stagger>
              </div>

              {/* Scroll cues */}
              <div className="absolute bottom-12 right-6 sm:right-8 md:right-12 flex flex-col items-center gap-3">
                <button
                  type="button"
                  aria-label="Scroll Up to About"
                  onClick={() => scrollToProgress(0.27)}
                  style={{ borderColor: 'rgba(29, 48, 69, 0.3)' }}
                  className="w-10 h-10 rounded-full border flex items-center justify-center hover:opacity-70 transition-opacity"
                >
                  <ChevronUp size={16} color="rgba(29, 48, 69, 0.8)" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll Down to Criteria"
                  onClick={() => scrollToProgress(0.67)}
                  style={{ borderColor: 'rgba(29, 48, 69, 0.4)' }}
                  className="w-10 h-10 rounded-full border flex items-center justify-center hover:opacity-70 transition-opacity"
                >
                  <ArrowDown size={16} color="#1D3045" />
                </button>
              </div>
            </section>

            {/* ========================================================
                SECTION 4: EVALUATION CRITERIA (Darker video zone -> White text)
               ======================================================== */}
            <section
              id="section-4"
              aria-label="Evaluation Criteria"
              style={{
                opacity: opacity4,
                visibility: opacity4 > 0.005 ? 'visible' : 'hidden',
                pointerEvents: opacity4 > 0.05 ? 'auto' : 'none',
              }}
              className="absolute inset-0 flex flex-col justify-center items-center px-6 sm:px-8 md:px-16 lg:px-24"
            >
              <div className="w-full max-w-6xl mx-auto">
                <Stagger
                  isVisible={opacity4 > 0.3}
                  delays={[0, 100, 200]}
                >
                  <div className="text-center mb-3">
                    <span className="text-xs tracking-[0.3em] uppercase font-medium text-white/60">
                      Multi-Dimensional Decision Matrix
                    </span>
                  </div>

                  <h2
                    id="criteria-title"
                    style={{
                      fontSize: 'clamp(1.75rem, 3.8vw, 3.25rem)',
                      lineHeight: 1.2,
                    }}
                    className="font-light tracking-tight uppercase text-white text-center mb-8"
                  >
                    What Matters in Your Decision?
                  </h2>

                  {/* 6 Clearly Labelled Criteria Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
                    {/* Criterion 1 */}
                    <div className="p-5 rounded-xl border border-white/20 bg-[#1D3045]/40 backdrop-blur-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white/50">
                          Criterion 01
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300/90 font-medium">
                          Cost
                        </span>
                      </div>
                      <h3 className="text-base font-medium text-white uppercase tracking-wide mb-1.5">
                        Procedure Cost
                      </h3>
                      <p className="text-xs text-white/70 leading-relaxed font-normal">
                        Total surgical package, surgeon fee, implant components, operating theater, and inpatient hospital expenses.
                      </p>
                    </div>

                    {/* Criterion 2 */}
                    <div className="p-5 rounded-xl border border-white/20 bg-[#1D3045]/40 backdrop-blur-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white/50">
                          Criterion 02
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-emerald-400/40 text-emerald-300/90 font-medium">
                          Benefit
                        </span>
                      </div>
                      <h3 className="text-base font-medium text-white uppercase tracking-wide mb-1.5">
                        Hospital Quality
                      </h3>
                      <p className="text-xs text-white/70 leading-relaxed font-normal">
                        International accreditations (e.g., JCI, ISO), orthopedic surgical track record, infection control, and clinical safety standards.
                      </p>
                    </div>

                    {/* Criterion 3 */}
                    <div className="p-5 rounded-xl border border-white/20 bg-[#1D3045]/40 backdrop-blur-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white/50">
                          Criterion 03
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300/90 font-medium">
                          Cost
                        </span>
                      </div>
                      <h3 className="text-base font-medium text-white uppercase tracking-wide mb-1.5">
                        Waiting Time
                      </h3>
                      <p className="text-xs text-white/70 leading-relaxed font-normal">
                        Duration elapsed from initial clinical consultation and medical clearance to the confirmed surgical admission date.
                      </p>
                    </div>

                    {/* Criterion 4 */}
                    <div className="p-5 rounded-xl border border-white/20 bg-[#1D3045]/40 backdrop-blur-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white/50">
                          Criterion 04
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300/90 font-medium">
                          Cost
                        </span>
                      </div>
                      <h3 className="text-base font-medium text-white uppercase tracking-wide mb-1.5">
                        Travel & Accommodation Cost
                      </h3>
                      <p className="text-xs text-white/70 leading-relaxed font-normal">
                        Round-trip airfare, medical transit, and lodging expenses for the patient and accompanying caregiver.
                      </p>
                    </div>

                    {/* Criterion 5 */}
                    <div className="p-5 rounded-xl border border-white/20 bg-[#1D3045]/40 backdrop-blur-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white/50">
                          Criterion 05
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-emerald-400/40 text-emerald-300/90 font-medium">
                          Benefit
                        </span>
                      </div>
                      <h3 className="text-base font-medium text-white uppercase tracking-wide mb-1.5">
                        Language Accessibility
                      </h3>
                      <p className="text-xs text-white/70 leading-relaxed font-normal">
                        English fluency among surgical staff, dedicated international patient liaisons, and certified medical interpreters.
                      </p>
                    </div>

                    {/* Criterion 6 */}
                    <div className="p-5 rounded-xl border border-white/20 bg-[#1D3045]/40 backdrop-blur-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white/50">
                          Criterion 06
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-emerald-400/40 text-emerald-300/90 font-medium">
                          Benefit
                        </span>
                      </div>
                      <h3 className="text-base font-medium text-white uppercase tracking-wide mb-1.5">
                        Post-operative Support
                      </h3>
                      <p className="text-xs text-white/70 leading-relaxed font-normal">
                        Structured discharge planning, teleconsultation access, and remote physical rehabilitation guidance post-surgery.
                      </p>
                    </div>
                  </div>
                </Stagger>
              </div>

              {/* Navigation controls */}
              <div className="absolute bottom-12 right-6 sm:right-8 md:right-12 flex flex-col items-center gap-3">
                <button
                  type="button"
                  aria-label="Scroll Up to How It Works"
                  onClick={() => scrollToProgress(0.47)}
                  className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:border-white transition-colors"
                >
                  <ChevronUp size={16} className="text-white/80" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll Down to Destinations"
                  onClick={() => scrollToProgress(0.85)}
                  className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center hover:border-white transition-colors"
                >
                  <ArrowDown size={16} className="text-white" />
                </button>
              </div>
            </section>

            {/* ========================================================
                SECTION 5: COUNTRY COVERAGE (Dark video zone -> White text)
               ======================================================== */}
            <section
              id="section-5"
              aria-label="Country Coverage"
              style={{
                opacity: opacity5,
                visibility: opacity5 > 0.005 ? 'visible' : 'hidden',
                pointerEvents: opacity5 > 0.05 ? 'auto' : 'none',
              }}
              className="absolute inset-0 flex flex-col justify-center items-center px-6 sm:px-8 md:px-16 lg:px-24 text-center"
            >
              <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
                <Stagger
                  isVisible={opacity5 > 0.3}
                  delays={[0, 100, 200, 300]}
                  className="flex flex-col items-center w-full"
                >
                  <span className="text-xs tracking-[0.3em] uppercase font-medium text-white/60 mb-2">
                    Comparative Geographic Scope
                  </span>

                  <h2
                    id="countries-title"
                    style={{
                      fontSize: 'clamp(1.75rem, 3.8vw, 3.25rem)',
                      lineHeight: 1.2,
                    }}
                    className="font-light tracking-tight uppercase text-white mb-4"
                  >
                    Compare Across Destinations
                  </h2>

                  <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-2xl leading-relaxed mb-8 font-normal">
                    The project is designed to evaluate four destination countries, examining four hospitals per country for a planned comparison set of 16 hospitals.
                  </p>

                  {/* 4 Countries Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full text-left">
                    {/* India */}
                    <div className="p-5 rounded-xl border border-white/20 bg-[#1D3045]/50 backdrop-blur-xs flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white/50 mb-1">
                          Destination 01
                        </div>
                        <div className="text-lg font-medium text-white uppercase tracking-wide">
                          India
                        </div>
                        <div className="text-xs text-white/70 mt-2 font-normal leading-relaxed">
                          Major international orthopedic volume with favorable procedural cost advantages.
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-medium tracking-wider text-emerald-300 uppercase">
                        4 Hospitals Planned
                      </div>
                    </div>

                    {/* Türkiye */}
                    <div className="p-5 rounded-xl border border-white/20 bg-[#1D3045]/50 backdrop-blur-xs flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white/50 mb-1">
                          Destination 02
                        </div>
                        <div className="text-lg font-medium text-white uppercase tracking-wide">
                          Türkiye
                        </div>
                        <div className="text-xs text-white/70 mt-2 font-normal leading-relaxed">
                          Euro-Asian medical hub with modern JCI-accredited tertiary facilities.
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-medium tracking-wider text-emerald-300 uppercase">
                        4 Hospitals Planned
                      </div>
                    </div>

                    {/* Thailand */}
                    <div className="p-5 rounded-xl border border-white/20 bg-[#1D3045]/50 backdrop-blur-xs flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white/50 mb-1">
                          Destination 03
                        </div>
                        <div className="text-lg font-medium text-white uppercase tracking-wide">
                          Thailand
                        </div>
                        <div className="text-xs text-white/70 mt-2 font-normal leading-relaxed">
                          Pioneering healthcare hospitality combining clinical standards with patient care.
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-medium tracking-wider text-emerald-300 uppercase">
                        4 Hospitals Planned
                      </div>
                    </div>

                    {/* USA */}
                    <div className="p-5 rounded-xl border border-white/20 bg-[#1D3045]/50 backdrop-blur-xs flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white/50 mb-1">
                          Destination 04
                        </div>
                        <div className="text-lg font-medium text-white uppercase tracking-wide">
                          USA
                        </div>
                        <div className="text-xs text-white/70 mt-2 font-normal leading-relaxed">
                          Established clinical technology baseline and domestic comparison benchmark.
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/10 text-[11px] font-medium tracking-wider text-emerald-300 uppercase">
                        4 Hospitals Planned
                      </div>
                    </div>
                  </div>

                  {/* Scope Transparency Note */}
                  <div className="mt-6 text-[11px] tracking-wide text-white/50 uppercase">
                    Data scope structured for decision analysis methodology demonstration • Live unverified records excluded
                  </div>
                </Stagger>
              </div>

              {/* Navigation controls */}
              <div className="absolute bottom-12 right-6 sm:right-8 md:right-12 flex flex-col items-center gap-3">
                <button
                  type="button"
                  aria-label="Scroll Up to Criteria"
                  onClick={() => scrollToProgress(0.67)}
                  className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:border-white transition-colors"
                >
                  <ChevronUp size={16} className="text-white/80" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll Down to Final CTA"
                  onClick={() => scrollToProgress(0.98)}
                  className="w-10 h-10 rounded-full border border-white/40 flex items-center justify-center hover:border-white transition-colors"
                >
                  <ArrowDown size={16} className="text-white" />
                </button>
              </div>
            </section>

            {/* ========================================================
                SECTION 6: FINAL CALL TO ACTION (Closing Section)
               ======================================================== */}
            <section
              id="section-6"
              aria-label="Decision Support Launch CTA"
              style={{
                opacity: opacity6,
                visibility: opacity6 > 0.005 ? 'visible' : 'hidden',
                pointerEvents: opacity6 > 0.05 ? 'auto' : 'none',
              }}
              className="absolute inset-0 flex flex-col justify-center items-center px-6 sm:px-8 md:px-20 lg:px-32 text-center"
            >
              <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
                <Stagger
                  isVisible={opacity6 > 0.3}
                  delays={[0, 150, 300, 450]}
                  className="flex flex-col items-center"
                >
                  {/* Eyebrow */}
                  <span className="text-xs sm:text-sm tracking-[0.3em] uppercase text-white/60 mb-3 font-medium">
                    AHP-TOPSIS Decision System
                  </span>

                  {/* Heading */}
                  <h2
                    id="final-cta-headline"
                    style={{
                      fontSize: 'clamp(2rem, 4.5vw, 4rem)',
                      lineHeight: 1.2,
                    }}
                    className="font-light text-white uppercase tracking-tight mb-6"
                  >
                    Find the Options That Fit Your Priorities
                  </h2>

                  {/* Supporting text */}
                  <p className="text-sm sm:text-base md:text-lg text-white/80 max-w-2xl leading-relaxed mb-10 font-normal">
                    Explore hospital alternatives through a structured, preference-based decision-support process.
                  </p>

                  {/* Final CTA Button */}
                  <div className="flex items-center gap-4">
                    <button
                      id="final-cta-btn"
                      type="button"
                      onClick={() => openDashboard('rankings')}
                      className="px-8 sm:px-10 py-4 sm:py-4.5 rounded-full bg-white text-[#1D3045] hover:bg-white/90 hover:scale-105 transition-all duration-300 text-xs sm:text-sm tracking-[0.2em] uppercase font-semibold flex items-center gap-3 shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <span>Start Comparing Hospitals</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>

                  {/* Academic Attribution Footer */}
                  <div className="mt-16 text-xs tracking-[0.2em] uppercase text-white/40">
                    Medical Tourism Decision Support System Using AHP-TOPSIS • Final Year Engineering Project
                  </div>
                </Stagger>
              </div>

              {/* Scroll back to top button */}
              <div className="absolute bottom-12 right-6 sm:right-8 md:right-12">
                <button
                  type="button"
                  aria-label="Return to Top"
                  onClick={() => scrollToProgress(0)}
                  className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:border-white transition-colors"
                >
                  <ChevronUp size={16} className="text-white/80" />
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ========================================================
          FULL-SCREEN MOBILE MENU OVERLAY
         ======================================================== */}
      <div
        id="mobile-menu-overlay"
        aria-hidden={!mobileMenuOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={`fixed inset-0 z-[100] bg-[#1D3045] flex flex-col justify-between transition-all duration-500 ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto visible'
            : 'opacity-0 pointer-events-none invisible'
        }`}
      >
        {/* Inner Panel with vertical translation (-32px to 0) */}
        <div
          style={{
            transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-32px)',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="flex-1 flex flex-col justify-between transition-transform duration-500"
        >
          {/* Top Bar with Close Button */}
          <div className="w-full flex justify-end px-6 sm:px-8 pt-8 sm:pt-12">
            <button
              id="mobile-menu-close-btn"
              type="button"
              aria-label="Close Navigation Menu"
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:border-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Centered Navigation Links */}
          <nav
            aria-label="Mobile Navigation Links"
            className="flex flex-col items-center justify-center py-6 gap-2"
          >
            {NAV_ITEMS.map((item, i) => {
              const isActive = i === activeNavIndex;
              const delayMs = i * 60;

              if (item.isDashboardTrigger) {
                return (
                  <button
                    key={item.label}
                    id="mobile-nav-link-explore"
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openDashboard('rankings');
                    }}
                    style={{
                      opacity: mobileMenuOpen ? 1 : 0,
                      transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                      transitionDelay: `${delayMs}ms`,
                      transitionDuration: '500ms',
                      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    className="mt-4 px-6 py-3 rounded-full border border-white/50 text-white text-lg sm:text-xl font-light tracking-wide uppercase flex items-center gap-2 hover:bg-white/10 transition-colors"
                  >
                    <span>{item.label}</span>
                    <ArrowRight size={16} />
                  </button>
                );
              }

              return (
                <button
                  key={item.label}
                  id={`mobile-nav-link-${i}`}
                  type="button"
                  onClick={() => {
                    if (item.progress !== undefined) {
                      scrollToProgress(item.progress);
                    }
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    opacity: mobileMenuOpen ? 1 : 0,
                    transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                    transitionDelay: `${delayMs}ms`,
                    transitionDuration: '500ms',
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className={`px-8 sm:px-12 py-2.5 text-xl sm:text-2xl font-light tracking-wide uppercase transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-white ${
                    isActive ? 'text-white font-normal' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile Menu Footer */}
          <footer className="flex items-center justify-between px-8 sm:px-12 pb-10 text-xs tracking-[0.2em] uppercase text-white/60">
            <span>AHP-TOPSIS DSS</span>
            <span>KNEE REPLACEMENT</span>
          </footer>
        </div>
      </div>
    </main>
    </div>
    </>
  );
}

export default App;
