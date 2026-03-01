

## Plan: Match Landing Page Background to Internal App Color

**The Problem:**
The landing page uses `#0D3B66` (Aegean Navy) as its background, but the internal app uses a darker color defined as `--background: 207 72% 12%` in dark mode (approximately `#081E2E`). You want them to match.

**What Changes:**

1. **`src/pages/Index.tsx`** — Change the wrapper `bg-[#0D3B66]` to `bg-background`

2. **`src/components/home/HeroSection.tsx`** — Replace all `#0D3B66` overlay references with the CSS variable equivalent (`hsl(var(--background))`) so the hero gradient and overlays use the same dark color

3. **Scan other landing page sections** (FeaturesSection, FAQSection, WaitlistSignup, Footer, PartnerLogoMarquee, UpcomingEventsPreview) for any hardcoded `#0D3B66` and replace with `bg-background` or the CSS variable

4. **Bottom fade gradient** in HeroSection — update the `from-[#0f4475]` to blend into the new background color seamlessly

**Result:** The landing page will use the exact same dark background as the internal app header/pages, creating a unified look. Since the app is always in dark mode, `bg-background` will consistently resolve to the correct color.

