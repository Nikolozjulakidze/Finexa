fro# Landing Page Redesign — Task Plan

## Goal

Transform the basic dark Starter page into a professional, theme-aware (dark default + light toggle) SaaS landing page inspired by twovector.com, using the blue-gradient brand identity.

## Steps

- [x] Gather context (read Starter, App, index.css, FeatureCard, FinexaLogo, ThemeContext, AuthHero, Login/Register)
- [x] Confirm design direction with user (dark default + light toggle, blue gradient)
- [x] Add new CSS utilities/keyframes to `index.css` (theme-aware, gradient mesh, aurora, shimmer, marquee, animated counters)
- [x] Rewrite `src/pages/Starter.jsx` with professional sections + GSAP animations + theme toggle
  - Sticky nav (logo, links, theme toggle, login/signup)
  - Hero with animated gradient + word-by-word text reveal + floating dashboard mockup
  - Stats bar with animated count-up
  - Features grid (enhanced 3D tilt cards)
  - How It Works section
  - Product showcase with animated charts
  - Testimonials
  - Pricing cards
  - FAQ accordion
  - CTA + Footer
- [x] Verify with `npm run build` (successful)
- [x] Enhance hero mock with professional DashboardMock (sidebar, KPIs, chart, donut, transactions)
- [x] Replace plain chips with creative floating ornaments (live notification, AI insight, savings goal, glow ring, orbiting particles)
- [x] Wire GSAP scroll-reveal animations for ornaments (slide, elastic, progress bar fill, particle stagger)
- [x] Fix light-mode visibility of ornaments (stronger shadows, borders, glow ring)
- [x] Verify with `npm run build` (successful)
