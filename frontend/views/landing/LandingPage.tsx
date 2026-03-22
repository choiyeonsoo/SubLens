"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const revealEls = document.querySelectorAll<HTMLElement>(".lp-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add("lp-visible");
            }, i * 60);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <>
      <style>{`
        .lp-root {
          --primary: #7c3aed;
          --primary-dark: #6d28d9;
          --accent: #a78bfa;
          --accent2: #f472b6;
          --bg: #f8f7ff;
          --bg2: #ffffff;
          --bg3: #ede9fe;
          --surface: #ffffff;
          --surface2: #f5f3ff;
          --border: rgba(124, 58, 237, 0.15);
          --text: #1e1b4b;
          --text2: #4a3880;
          --text3: #9879d8;
          --shadow: 0 4px 24px rgba(124, 58, 237, 0.1);
          --shadow-lg: 0 12px 48px rgba(124, 58, 237, 0.16);
          --radius: 16px;
          --radius-sm: 10px;
          font-family: "Noto Sans KR", sans-serif;
          background: var(--bg);
          color: var(--text);
          transition: background 0.35s, color 0.35s;
          overflow-x: hidden;
        }

        [data-theme="dark"] .lp-root {
          --bg: #0d0b1a;
          --bg2: #130f22;
          --bg3: #1e1635;
          --surface: #1a1530;
          --surface2: #231c42;
          --border: rgba(124, 58, 237, 0.25);
          --text: #ede9fe;
          --text2: #c4b5fd;
          --text3: #7c3aed;
          --shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
          --shadow-lg: 0 12px 48px rgba(0, 0, 0, 0.6);
        }

        .lp-root *, .lp-root *::before, .lp-root *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* NAV */
        .lp-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 5%;
          height: 68px;
          background: rgba(245, 247, 255, 0.82);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--border);
          transition: background 0.35s;
        }
        [data-theme="dark"] .lp-nav {
          background: rgba(8, 13, 28, 0.85);
        }
        .lp-nav-logo {
          font-family: "Syne", sans-serif;
          font-weight: 800;
          font-size: 22px;
          color: var(--primary);
          letter-spacing: -0.5px;
          text-decoration: none;
          cursor: pointer;
        }
        .lp-nav-logo span { color: var(--accent); }
        .lp-nav-links {
          display: flex;
          gap: 36px;
          list-style: none;
        }
        .lp-nav-links a {
          font-size: 14px;
          font-weight: 500;
          color: var(--text2);
          text-decoration: none;
          transition: color 0.2s;
        }
        .lp-nav-links a:hover { color: var(--primary); }
        .lp-nav-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .lp-btn-ghost {
          font-size: 14px;
          font-weight: 500;
          color: var(--text2);
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 8px;
          transition: color 0.2s, background 0.2s;
          font-family: inherit;
        }
        .lp-btn-ghost:hover {
          color: var(--primary);
          background: var(--surface2);
        }
        .lp-btn-primary {
          font-size: 14px;
          font-weight: 600;
          background: var(--primary);
          color: #fff;
          border: none;
          cursor: pointer;
          padding: 10px 22px;
          border-radius: 10px;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          font-family: inherit;
          letter-spacing: -0.2px;
        }
        .lp-btn-primary:hover {
          background: var(--primary-dark);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35);
        }
        .lp-theme-toggle {
          width: 42px;
          height: 24px;
          border-radius: 12px;
          background: var(--surface2);
          border: 1.5px solid var(--border);
          cursor: pointer;
          position: relative;
          transition: background 0.3s;
          flex-shrink: 0;
        }
        .lp-theme-toggle::after {
          content: "";
          position: absolute;
          top: 2px; left: 3px;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: var(--primary);
          transition: transform 0.3s, background 0.3s;
        }
        [data-theme="dark"] .lp-theme-toggle::after {
          transform: translateX(18px);
          background: var(--accent);
        }

        /* HERO */
        .lp-hero {
          min-height: 100vh;
          padding: 140px 5% 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          overflow: hidden;
          background: var(--bg);
        }
        .lp-hero-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        .lp-hero-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
        }
        [data-theme="dark"] .lp-hero-blob { opacity: 0.28; }
        .lp-hero-blob-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #7c3aed, transparent);
          top: -100px; left: -150px;
          animation: lpBlobFloat 8s ease-in-out infinite;
        }
        .lp-hero-blob-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #a78bfa, transparent);
          top: 0; right: -100px;
          animation: lpBlobFloat 10s ease-in-out infinite reverse;
        }
        .lp-hero-blob-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #ff6b8a, transparent);
          bottom: 100px; left: 50%;
          transform: translateX(-50%);
          animation: lpBlobFloat 12s ease-in-out infinite;
        }
        @keyframes lpBlobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -20px) scale(1.05); }
          66% { transform: translate(-15px, 15px) scale(0.96); }
        }
        .lp-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--surface);
          border: 1.5px solid var(--border);
          padding: 7px 16px;
          border-radius: 100px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
          animation: lpFadeUp 0.6s ease both;
        }
        .lp-hero-badge-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--accent);
          animation: lpPulse 2s ease-in-out infinite;
        }
        @keyframes lpPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
        .lp-hero h1 {
          font-size: clamp(38px, 6vw, 68px);
          font-weight: 900;
          line-height: 1.18;
          letter-spacing: -1.5px;
          color: var(--text);
          margin-bottom: 22px;
          position: relative; z-index: 1;
          animation: lpFadeUp 0.7s 0.1s ease both;
        }
        .lp-highlight {
          background: linear-gradient(135deg, var(--primary), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-hero-sub {
          font-size: clamp(16px, 2vw, 19px);
          font-weight: 400;
          color: var(--text2);
          line-height: 1.75;
          max-width: 560px;
          margin-bottom: 44px;
          position: relative; z-index: 1;
          animation: lpFadeUp 0.7s 0.2s ease both;
        }
        .lp-hero-cta {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
          position: relative; z-index: 1;
          animation: lpFadeUp 0.7s 0.3s ease both;
        }
        .lp-btn-lg {
          font-size: 16px;
          font-weight: 700;
          font-family: inherit;
          padding: 16px 36px;
          border-radius: 12px;
          cursor: pointer;
          border: none;
          letter-spacing: -0.3px;
          transition: all 0.2s;
        }
        .lp-btn-lg-primary {
          background: linear-gradient(135deg, var(--primary), #c4b5fd);
          color: #fff;
          box-shadow: 0 8px 28px rgba(124, 58, 237, 0.35);
        }
        .lp-btn-lg-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(124, 58, 237, 0.45);
        }
        .lp-btn-lg-ghost {
          background: var(--surface);
          color: var(--text);
          border: 1.5px solid var(--border);
        }
        .lp-btn-lg-ghost:hover {
          background: var(--surface2);
          border-color: var(--primary);
          color: var(--primary);
        }
        .lp-hero-stats {
          display: flex;
          gap: 48px;
          margin-top: 80px;
          justify-content: center;
          flex-wrap: wrap;
          position: relative; z-index: 1;
          animation: lpFadeUp 0.7s 0.4s ease both;
        }
        .lp-hero-stat { text-align: center; }
        .lp-hero-stat-num {
          font-size: 32px;
          font-weight: 900;
          color: var(--text);
          letter-spacing: -1px;
          line-height: 1;
        }
        .lp-hero-stat-num span { color: var(--primary); }
        .lp-hero-stat-label {
          font-size: 13px;
          color: var(--text3);
          margin-top: 6px;
        }
        .lp-hero-dashboard {
          position: relative; z-index: 1;
          margin-top: 80px;
          width: min(780px, 90%);
          animation: lpFadeUp 0.8s 0.5s ease both;
        }
        .lp-dashboard-frame {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 20px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }
        .lp-dashboard-topbar {
          background: var(--surface2);
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border);
        }
        .lp-topbar-dot { width: 10px; height: 10px; border-radius: 50%; }
        .lp-topbar-dot:nth-child(1) { background: #ff6b8a; }
        .lp-topbar-dot:nth-child(2) { background: #ffbe6b; }
        .lp-topbar-dot:nth-child(3) { background: #6bff9c; }
        .lp-topbar-url {
          flex: 1;
          background: var(--bg3);
          border-radius: 6px;
          padding: 4px 12px;
          font-size: 11px;
          color: var(--text3);
          margin: 0 12px;
        }
        .lp-dashboard-body { padding: 24px; }
        .lp-dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }
        .lp-dash-card {
          background: var(--bg3);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid var(--border);
        }
        .lp-dash-card-label { font-size: 11px; color: var(--text3); font-weight: 500; margin-bottom: 8px; }
        .lp-dash-card-value { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
        .lp-dash-card-sub { font-size: 11px; color: var(--accent); margin-top: 4px; font-weight: 600; }
        .lp-dash-card-sub.red { color: var(--accent2); }
        .lp-sub-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }
        .lp-sub-row:last-child { border-bottom: none; }
        .lp-sub-icon {
          width: 34px; height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .lp-sub-name { font-size: 13px; font-weight: 600; flex: 1; }
        .lp-sub-date { font-size: 11px; color: var(--text3); }
        .lp-sub-price { font-size: 13px; font-weight: 700; color: var(--text); }
        .lp-sub-badge {
          font-size: 10px; font-weight: 700;
          padding: 2px 8px;
          border-radius: 100px;
        }
        .lp-sub-badge.active { background: rgba(0, 198, 167, 0.15); color: var(--accent); }
        .lp-sub-badge.soon { background: rgba(255, 107, 138, 0.15); color: var(--accent2); }

        @keyframes lpFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* SECTIONS */
        .lp-section { padding: 100px 5%; }
        .lp-section-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 16px;
        }
        .lp-section-label::before {
          content: "";
          display: block;
          width: 18px; height: 2px;
          background: var(--primary);
        }
        .lp-section-title {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 900;
          letter-spacing: -1px;
          line-height: 1.22;
          color: var(--text);
          margin-bottom: 16px;
        }
        .lp-section-desc {
          font-size: 17px;
          color: var(--text2);
          line-height: 1.75;
          max-width: 520px;
          margin-bottom: 56px;
        }

        /* FEATURES */
        .lp-features { background: var(--bg2); }
        .lp-features-inner { max-width: 1100px; margin: 0 auto; }
        .lp-features-header { text-align: center; }
        .lp-features-header .lp-section-label { justify-content: center; }
        .lp-features-header .lp-section-desc { margin: 0 auto 56px; }
        .lp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .lp-feature-card {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          padding: 32px 28px;
          transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
          position: relative;
          overflow: hidden;
        }
        .lp-feature-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--primary), var(--accent));
          opacity: 0;
          transition: opacity 0.3s;
        }
        .lp-feature-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
          border-color: rgba(124, 58, 237, 0.4);
        }
        .lp-feature-card:hover::before { opacity: 1; }
        .lp-feature-icon {
          width: 48px; height: 48px;
          border-radius: 12px;
          background: var(--bg3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-bottom: 20px;
          border: 1.5px solid var(--border);
        }
        .lp-feature-card h3 {
          font-size: 17px;
          font-weight: 800;
          margin-bottom: 10px;
          letter-spacing: -0.3px;
        }
        .lp-feature-card p { font-size: 14px; color: var(--text2); line-height: 1.75; }
        .lp-feature-card.featured {
          background: linear-gradient(135deg, var(--primary) 0%, #c4b5fd 100%);
          border-color: transparent;
          color: #fff;
        }
        .lp-feature-card.featured .lp-feature-icon {
          background: rgba(255,255,255,0.2);
          border-color: rgba(255,255,255,0.3);
        }
        .lp-feature-card.featured h3 { color: #fff; }
        .lp-feature-card.featured p { color: rgba(255,255,255,0.85); }
        .lp-feature-card.featured:hover { box-shadow: 0 16px 48px rgba(124, 58, 237, 0.45); }

        /* HOW IT WORKS */
        .lp-how { background: var(--bg); }
        .lp-how-inner { max-width: 1100px; margin: 0 auto; }
        .lp-how-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          position: relative;
        }
        .lp-how-steps::before {
          content: "";
          position: absolute;
          top: 30px; left: 15%; right: 15%;
          height: 1.5px;
          background: linear-gradient(90deg, var(--primary), var(--accent));
          opacity: 0.3;
          z-index: 0;
        }
        .lp-how-step {
          text-align: center;
          padding: 24px 16px;
          position: relative; z-index: 1;
        }
        .lp-how-step-num {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: var(--surface);
          border: 2px solid var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 900;
          color: var(--primary);
          margin: 0 auto 20px;
          letter-spacing: -1px;
          box-shadow: 0 0 0 6px var(--bg3);
        }
        .lp-how-step h3 { font-size: 15px; font-weight: 800; margin-bottom: 10px; }
        .lp-how-step p { font-size: 13px; color: var(--text2); line-height: 1.7; }

        /* PRICING */
        .lp-pricing { background: var(--bg2); }
        .lp-pricing-inner { max-width: 900px; margin: 0 auto; text-align: center; }
        .lp-pricing-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          text-align: left;
        }
        .lp-pricing-card {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 20px;
          padding: 36px 32px;
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .lp-pricing-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .lp-pricing-card.popular {
          background: linear-gradient(145deg, var(--primary) 0%, #a78bfa 100%);
          border-color: transparent;
          color: #fff;
        }
        .lp-pricing-card.popular *:not(.lp-pricing-cta-white) { color: #fff !important; }
        .lp-pricing-cta-white { color: var(--primary) !important; }
        .lp-pricing-card.popular .lp-pricing-feature { border-color: rgba(255,255,255,0.15); }
        .lp-pricing-badge {
          display: inline-block;
          font-size: 11px; font-weight: 700;
          background: rgba(255,255,255,0.25);
          padding: 3px 12px;
          border-radius: 100px;
          margin-bottom: 20px;
          letter-spacing: 0.5px;
        }
        .lp-pricing-plan { font-size: 14px; font-weight: 700; color: var(--text3); margin-bottom: 8px; }
        .lp-pricing-price {
          font-size: 42px; font-weight: 900;
          color: var(--text);
          letter-spacing: -2px;
          line-height: 1;
          margin-bottom: 6px;
        }
        .lp-pricing-price span { font-size: 16px; font-weight: 500; letter-spacing: 0; }
        .lp-pricing-desc { font-size: 13px; color: var(--text3); margin-bottom: 28px; line-height: 1.6; }
        .lp-pricing-features { list-style: none; margin-bottom: 32px; }
        .lp-pricing-feature {
          font-size: 14px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text2);
        }
        .lp-pricing-feature::before {
          content: "✓";
          font-size: 13px; font-weight: 800;
          color: var(--accent);
          flex-shrink: 0;
        }
        .lp-pricing-card.popular .lp-pricing-feature::before { color: #ede9fe; }
        .lp-pricing-cta {
          display: block;
          text-align: center;
          padding: 14px;
          border-radius: 10px;
          font-size: 15px; font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          width: 100%;
        }
        .lp-pricing-cta-ghost {
          background: var(--bg3);
          color: var(--primary);
          border: 1.5px solid var(--primary);
        }
        .lp-pricing-cta-ghost:hover { background: var(--primary); color: #fff; }
        .lp-pricing-cta-white { background: rgba(255,255,255,0.95); color: var(--primary); }
        .lp-pricing-cta-white:hover { background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,0.15); }

        /* TESTIMONIALS */
        .lp-testimonials { background: var(--bg); }
        .lp-testimonials-inner { max-width: 1100px; margin: 0 auto; }
        .lp-testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .lp-testi-card {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          padding: 28px;
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .lp-testi-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); }
        .lp-testi-stars { font-size: 14px; margin-bottom: 16px; letter-spacing: 2px; }
        .lp-testi-text { font-size: 14px; color: var(--text2); line-height: 1.8; margin-bottom: 20px; }
        .lp-testi-author { display: flex; align-items: center; gap: 12px; }
        .lp-testi-avatar {
          width: 40px; height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px; font-weight: 800;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: #fff;
          flex-shrink: 0;
        }
        .lp-testi-name { font-size: 13px; font-weight: 700; }
        .lp-testi-role { font-size: 11.5px; color: var(--text3); margin-top: 2px; }

        /* CTA */
        .lp-cta-section { background: var(--bg2); padding: 100px 5%; text-align: center; }
        .lp-cta-box {
          max-width: 700px;
          margin: 0 auto;
          background: linear-gradient(135deg, var(--primary) 0%, #c4b5fd 100%);
          border-radius: 28px;
          padding: 72px 60px;
          position: relative;
          overflow: hidden;
        }
        .lp-cta-box h2 {
          font-size: clamp(24px, 4vw, 38px);
          font-weight: 900;
          color: #fff;
          letter-spacing: -1px;
          line-height: 1.25;
          margin-bottom: 16px;
          position: relative;
        }
        .lp-cta-box p {
          font-size: 16px;
          color: rgba(255,255,255,0.82);
          margin-bottom: 40px;
          line-height: 1.7;
          position: relative;
        }
        .lp-cta-actions {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
          position: relative;
        }
        .lp-btn-white {
          background: #fff;
          color: var(--primary);
          font-weight: 700;
          font-size: 16px;
          padding: 16px 36px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          letter-spacing: -0.3px;
        }
        .lp-btn-white:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .lp-btn-outline-white {
          background: transparent;
          color: #fff;
          border: 2px solid rgba(255,255,255,0.5);
          font-size: 16px;
          font-weight: 600;
          padding: 16px 36px;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          letter-spacing: -0.3px;
        }
        .lp-btn-outline-white:hover { border-color: #fff; background: rgba(255,255,255,0.08); }

        /* FOOTER */
        .lp-footer {
          background: var(--bg);
          border-top: 1px solid var(--border);
          padding: 56px 5% 36px;
        }
        .lp-footer-inner { max-width: 1100px; margin: 0 auto; }
        .lp-footer-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 48px;
          flex-wrap: wrap;
          margin-bottom: 48px;
        }
        .lp-footer-brand { max-width: 260px; }
        .lp-footer-logo {
          font-family: "Syne", sans-serif;
          font-weight: 800;
          font-size: 20px;
          color: var(--primary);
          margin-bottom: 12px;
        }
        .lp-footer-logo span { color: var(--accent); }
        .lp-footer-brand p { font-size: 13.5px; color: var(--text3); line-height: 1.75; }
        .lp-footer-links-group { display: flex; gap: 60px; flex-wrap: wrap; }
        .lp-footer-col h4 { font-size: 13px; font-weight: 700; margin-bottom: 16px; color: var(--text); }
        .lp-footer-col ul { list-style: none; }
        .lp-footer-col li { margin-bottom: 10px; }
        .lp-footer-col a { font-size: 13.5px; color: var(--text3); text-decoration: none; transition: color 0.2s; }
        .lp-footer-col a:hover { color: var(--primary); }
        .lp-footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 28px;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
          gap: 12px;
        }
        .lp-footer-copyright { font-size: 12.5px; color: var(--text3); }

        /* SCROLL REVEAL */
        .lp-reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .lp-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .lp-features-grid { grid-template-columns: 1fr 1fr; }
          .lp-how-steps { grid-template-columns: 1fr 1fr; }
          .lp-how-steps::before { display: none; }
          .lp-pricing-cards { grid-template-columns: 1fr; max-width: 440px; margin: 0 auto; }
          .lp-testimonials-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }
          .lp-nav-links { display: none; }
        }
        @media (max-width: 640px) {
          .lp-features-grid { grid-template-columns: 1fr; }
          .lp-dashboard-grid { grid-template-columns: 1fr 1fr; }
          .lp-cta-box { padding: 44px 28px; }
          .lp-hero-stats { gap: 28px; }
        }
      `}</style>

      <div className="lp-root" ref={revealRef}>
        {/* NAV */}
        <nav className="lp-nav">
          <span className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            SUB<span>LENS</span>
          </span>
          <ul className="lp-nav-links">
            <li><a href="#features">기능</a></li>
            <li><a href="#how">사용방법</a></li>
            <li><a href="#pricing">요금제</a></li>
            <li><a href="#reviews">후기</a></li>
          </ul>
          <div className="lp-nav-right">
            <button className="lp-theme-toggle" onClick={toggleTheme} aria-label="다크모드 전환" />
            <button className="lp-btn-ghost" onClick={() => router.push("/login")}>로그인</button>
            <button className="lp-btn-primary" onClick={() => router.push("/signup")}>무료로 시작하기</button>
          </div>
        </nav>

        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-hero-bg">
            <div className="lp-hero-blob lp-hero-blob-1" />
            <div className="lp-hero-blob lp-hero-blob-2" />
            <div className="lp-hero-blob lp-hero-blob-3" />
          </div>
          <div className="lp-hero-badge">
            <span className="lp-hero-badge-dot" />
            구독 관리의 새로운 기준
          </div>
          <h1>
            흩어진 구독,<br />
            이제 <span className="lp-highlight">한눈에 관리</span>하세요
          </h1>
          <p className="lp-hero-sub">
            넷플릭스, 유튜브 프리미엄, 클라우드 스토리지까지<br />
            모든 구독 서비스를 SUBLENS 하나로 추적하고<br />
            불필요한 지출을 스마트하게 줄여보세요.
          </p>
          <div className="lp-hero-cta">
            <button className="lp-btn-lg lp-btn-lg-primary" onClick={() => router.push("/signup")}>
              지금 무료로 시작하기 →
            </button>
            <button className="lp-btn-lg lp-btn-lg-ghost" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              2분 데모 보기 ▷
            </button>
          </div>
          <div className="lp-hero-stats">
            <div className="lp-hero-stat">
              <div className="lp-hero-stat-num">2.4<span>만+</span></div>
              <div className="lp-hero-stat-label">활성 사용자</div>
            </div>
            <div className="lp-hero-stat">
              <div className="lp-hero-stat-num">₩<span>89억+</span></div>
              <div className="lp-hero-stat-label">추적된 구독 지출</div>
            </div>
            <div className="lp-hero-stat">
              <div className="lp-hero-stat-num">4.9<span>★</span></div>
              <div className="lp-hero-stat-label">앱스토어 평점</div>
            </div>
          </div>
          <div className="lp-hero-dashboard">
            <div className="lp-dashboard-frame">
              <div className="lp-dashboard-topbar">
                <div className="lp-topbar-dot" />
                <div className="lp-topbar-dot" />
                <div className="lp-topbar-dot" />
                <div className="lp-topbar-url">app.sublens.io/dashboard</div>
              </div>
              <div className="lp-dashboard-body">
                <div className="lp-dashboard-grid">
                  <div className="lp-dash-card">
                    <div className="lp-dash-card-label">이번 달 총 지출</div>
                    <div className="lp-dash-card-value">₩84,200</div>
                    <div className="lp-dash-card-sub">지난달보다 ↓ 12%</div>
                  </div>
                  <div className="lp-dash-card">
                    <div className="lp-dash-card-label">활성 구독</div>
                    <div className="lp-dash-card-value">8개</div>
                    <div className="lp-dash-card-sub">갱신 예정 3개</div>
                  </div>
                  <div className="lp-dash-card">
                    <div className="lp-dash-card-label">다음 청구일</div>
                    <div className="lp-dash-card-value">3일</div>
                    <div className="lp-dash-card-sub red">Netflix ₩17,000</div>
                  </div>
                </div>
                <div>
                  <div className="lp-sub-row">
                    <div className="lp-sub-icon" style={{ background: "#ff6b8a22" }}>🎬</div>
                    <div style={{ flex: 1 }}>
                      <div className="lp-sub-name">Netflix</div>
                      <div className="lp-sub-date">2025.04.03 갱신</div>
                    </div>
                    <span className="lp-sub-badge soon">3일 후</span>
                    <div className="lp-sub-price">₩17,000</div>
                  </div>
                  <div className="lp-sub-row">
                    <div className="lp-sub-icon" style={{ background: "#ff000022" }}>▶</div>
                    <div style={{ flex: 1 }}>
                      <div className="lp-sub-name">YouTube Premium</div>
                      <div className="lp-sub-date">2025.04.15 갱신</div>
                    </div>
                    <span className="lp-sub-badge active">활성</span>
                    <div className="lp-sub-price">₩14,900</div>
                  </div>
                  <div className="lp-sub-row">
                    <div className="lp-sub-icon" style={{ background: "#7c3aed22" }}>☁</div>
                    <div style={{ flex: 1 }}>
                      <div className="lp-sub-name">iCloud 200GB</div>
                      <div className="lp-sub-date">2025.04.22 갱신</div>
                    </div>
                    <span className="lp-sub-badge active">활성</span>
                    <div className="lp-sub-price">₩3,900</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="lp-section lp-features" id="features">
          <div className="lp-features-inner">
            <div className="lp-features-header">
              <div className="lp-section-label">핵심 기능</div>
              <h2 className="lp-section-title lp-reveal">구독 관리, 이렇게<br />달라집니다</h2>
              <p className="lp-section-desc lp-reveal">
                복잡하게 흩어진 구독 서비스를 한 곳에서 파악하고,<br />스마트한 알림으로 불필요한 지출을 방지하세요.
              </p>
            </div>
            <div className="lp-features-grid">
              <div className="lp-feature-card featured lp-reveal">
                <div className="lp-feature-icon">📊</div>
                <h3>실시간 대시보드</h3>
                <p>모든 구독의 현황을 직관적인 차트와 카드로 한눈에 확인하세요. 월별 지출 추이와 절감 포인트를 바로 파악할 수 있어요.</p>
              </div>
              <div className="lp-feature-card lp-reveal">
                <div className="lp-feature-icon">🔔</div>
                <h3>스마트 갱신 알림</h3>
                <p>청구일 3일, 1일 전 이메일과 푸시 알림을 보내드립니다. 깜빡하고 결제되는 일, 이제 없어요.</p>
              </div>
              <div className="lp-feature-card lp-reveal">
                <div className="lp-feature-icon">📈</div>
                <h3>지출 패턴 분석</h3>
                <p>카테고리별 구독 비용을 분석하여 어디에 얼마를 쓰고 있는지 명확하게 보여드립니다.</p>
              </div>
              <div className="lp-feature-card lp-reveal">
                <div className="lp-feature-icon">🔒</div>
                <h3>보안 인증 시스템</h3>
                <p>JWT 기반 HttpOnly Cookie 인증과 Refresh Token Rotation으로 안전한 로그인 환경을 제공합니다.</p>
              </div>
              <div className="lp-feature-card lp-reveal">
                <div className="lp-feature-icon">🗂️</div>
                <h3>카테고리 분류</h3>
                <p>엔터테인먼트, 업무용 툴, 클라우드 등 카테고리별로 자동 분류되어 관리가 더욱 편리해집니다.</p>
              </div>
              <div className="lp-feature-card lp-reveal">
                <div className="lp-feature-icon">💡</div>
                <h3>절감 인사이트</h3>
                <p>사용 패턴을 분석해 비용 절감이 가능한 구독을 알려드립니다. 평균 월 ₩18,000 절약 효과!</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="lp-section lp-how" id="how">
          <div className="lp-how-inner">
            <div className="lp-section-label lp-reveal">사용 방법</div>
            <h2 className="lp-section-title lp-reveal">단 3분이면 충분해요</h2>
            <p className="lp-section-desc lp-reveal">복잡한 설정 없이 간단하게 시작할 수 있습니다.</p>
            <div className="lp-how-steps">
              <div className="lp-how-step lp-reveal">
                <div className="lp-how-step-num">1</div>
                <h3>무료 회원가입</h3>
                <p>이메일과 비밀번호만으로<br />30초 만에 가입 완료</p>
              </div>
              <div className="lp-how-step lp-reveal">
                <div className="lp-how-step-num">2</div>
                <h3>구독 추가</h3>
                <p>서비스명, 금액, 갱신일을<br />입력하거나 검색으로 추가</p>
              </div>
              <div className="lp-how-step lp-reveal">
                <div className="lp-how-step-num">3</div>
                <h3>자동 추적 시작</h3>
                <p>갱신일 알림이 자동으로<br />설정되어 바로 작동</p>
              </div>
              <div className="lp-how-step lp-reveal">
                <div className="lp-how-step-num">4</div>
                <h3>지출 최적화</h3>
                <p>분석 리포트로 절감 포인트를<br />발견하고 비용 절약</p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="lp-section lp-pricing" id="pricing">
          <div className="lp-pricing-inner">
            <div className="lp-section-label lp-reveal" style={{ justifyContent: "center" }}>요금제</div>
            <h2 className="lp-section-title lp-reveal">합리적인 가격으로<br />시작하세요</h2>
            <p className="lp-section-desc lp-reveal" style={{ margin: "0 auto 48px" }}>
              무료로 충분히 경험하고, 더 필요하면 그때 업그레이드하세요.
            </p>
            <div className="lp-pricing-cards">
              <div className="lp-pricing-card lp-reveal">
                <div className="lp-pricing-plan">FREE</div>
                <div className="lp-pricing-price">₩0 <span>/ 월</span></div>
                <div className="lp-pricing-desc">가볍게 시작하는 구독 관리</div>
                <ul className="lp-pricing-features">
                  <li className="lp-pricing-feature">구독 등록 최대 10개</li>
                  <li className="lp-pricing-feature">갱신 알림 (이메일)</li>
                  <li className="lp-pricing-feature">기본 대시보드</li>
                  <li className="lp-pricing-feature">월간 지출 리포트</li>
                </ul>
                <button className="lp-pricing-cta lp-pricing-cta-ghost" onClick={() => router.push("/signup")}>
                  무료로 시작하기
                </button>
              </div>
              <div className="lp-pricing-card popular lp-reveal">
                <div className="lp-pricing-badge">🔥 가장 인기</div>
                <div className="lp-pricing-plan">PRO</div>
                <div className="lp-pricing-price">₩4,900 <span>/ 월</span></div>
                <div className="lp-pricing-desc">구독 관리를 제대로 하고 싶은 분들을 위해</div>
                <ul className="lp-pricing-features">
                  <li className="lp-pricing-feature">구독 등록 무제한</li>
                  <li className="lp-pricing-feature">갱신 알림 (이메일 + 푸시)</li>
                  <li className="lp-pricing-feature">고급 분석 대시보드</li>
                  <li className="lp-pricing-feature">카테고리별 지출 분석</li>
                  <li className="lp-pricing-feature">절감 인사이트 리포트</li>
                  <li className="lp-pricing-feature">우선 고객 지원</li>
                </ul>
                <button className="lp-pricing-cta lp-pricing-cta-white" onClick={() => router.push("/signup")}>
                  14일 무료 체험 →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="lp-section lp-testimonials" id="reviews">
          <div className="lp-testimonials-inner">
            <div className="lp-section-label lp-reveal">사용자 후기</div>
            <h2 className="lp-section-title lp-reveal">이미 수만 명이<br />경험하고 있어요</h2>
            <p className="lp-section-desc lp-reveal" style={{ marginBottom: "48px" }}>
              구독 관리 때문에 골치 아팠던 분들의 솔직한 후기입니다.
            </p>
            <div className="lp-testimonials-grid">
              <div className="lp-testi-card lp-reveal">
                <div className="lp-testi-stars">★★★★★</div>
                <p className="lp-testi-text">
                  &ldquo;매달 결제되는 구독이 얼마인지 정확히 몰랐는데, SUBLENS 쓰고 나서 월 ₩23,000이나 절약했어요. 쓰지도 않는 구독을 2개나 발견했거든요.&rdquo;
                </p>
                <div className="lp-testi-author">
                  <div className="lp-testi-avatar">김</div>
                  <div>
                    <div className="lp-testi-name">김민준</div>
                    <div className="lp-testi-role">직장인 · 서울</div>
                  </div>
                </div>
              </div>
              <div className="lp-testi-card lp-reveal">
                <div className="lp-testi-stars">★★★★★</div>
                <p className="lp-testi-text">
                  &ldquo;UI가 정말 깔끔하고 직관적이에요. 다른 앱들은 복잡한데 이건 처음 봐도 바로 쓸 수 있어요. 갱신 알림 기능 덕분에 깜짝 청구 없어졌습니다.&rdquo;
                </p>
                <div className="lp-testi-author">
                  <div className="lp-testi-avatar">이</div>
                  <div>
                    <div className="lp-testi-name">이수연</div>
                    <div className="lp-testi-role">프리랜서 디자이너 · 부산</div>
                  </div>
                </div>
              </div>
              <div className="lp-testi-card lp-reveal">
                <div className="lp-testi-stars">★★★★★</div>
                <p className="lp-testi-text">
                  &ldquo;팀 구독 관리를 여기서 하고 있어요. 직원들이 사용하는 SaaS 툴 비용을 한눈에 볼 수 있어서 예산 관리가 훨씬 쉬워졌습니다.&rdquo;
                </p>
                <div className="lp-testi-author">
                  <div className="lp-testi-avatar">박</div>
                  <div>
                    <div className="lp-testi-name">박지호</div>
                    <div className="lp-testi-role">스타트업 대표 · 판교</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-cta-section">
          <div className="lp-cta-box">
            <h2>지금 바로 시작해보세요<br />첫 달은 완전 무료</h2>
            <p>신용카드 등록 없이 무료로 체험하세요.<br />언제든지 해지 가능합니다.</p>
            <div className="lp-cta-actions">
              <button className="lp-btn-white" onClick={() => router.push("/signup")}>무료로 시작하기 →</button>
              <button className="lp-btn-outline-white" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                기능 더 보기
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-footer-inner">
            <div className="lp-footer-top">
              <div className="lp-footer-brand">
                <div className="lp-footer-logo">SUB<span>LENS</span></div>
                <p>구독 관리의 새로운 기준.<br />흩어진 구독을 한눈에, 불필요한 지출을 스마트하게 줄이세요.</p>
              </div>
              <div className="lp-footer-links-group">
                <div className="lp-footer-col">
                  <h4>서비스</h4>
                  <ul>
                    <li><a href="#features">기능 소개</a></li>
                    <li><a href="#pricing">요금제</a></li>
                    <li><a href="#">업데이트 소식</a></li>
                  </ul>
                </div>
                <div className="lp-footer-col">
                  <h4>지원</h4>
                  <ul>
                    <li><a href="#">도움말 센터</a></li>
                    <li><a href="#">문의하기</a></li>
                    <li><a href="#">API 문서</a></li>
                  </ul>
                </div>
                <div className="lp-footer-col">
                  <h4>법적 고지</h4>
                  <ul>
                    <li><a href="#">이용약관</a></li>
                    <li><a href="#">개인정보처리방침</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="lp-footer-bottom">
              <div className="lp-footer-copyright">© 2026 SUBLENS. All rights reserved.</div>
              <div style={{ fontSize: "12px", color: "var(--text3)" }}>
                서울특별시 강남구 테헤란로 · 사업자 등록번호 000-00-00000 · 대표자 최연수
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
