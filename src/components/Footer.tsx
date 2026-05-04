import { Instagram, Mail, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { motion } from "framer-motion";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const Footer = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const text = {
    el: {
      ctaEyebrow: "Έτοιμος;",
      ctaTitle: "Μη Χάσεις\nΤίποτα Άλλο.",
      ctaBtn: "Ξεκίνα Τώρα",
      explore: "Εξερεύνηση", visitors: "Επισκέπτες", businesses: "Επιχειρήσεις",
      legalTitle: "Νομικά",
      terms: "Όροι Χρήσης", privacy: "Απόρρητο", license: "Άδεια", cookies: "Cookies",
      supportTitle: "Υποστήριξη",
      contact: "Επικοινωνία", demo: "Book a Demo",
      platformTitle: "Πλατφόρμα",
      rights: "© 2026 ΦΟΜΟ. Όλα τα δικαιώματα διατηρούνται.",
      madeIn: "Φτιαγμένο με ❤️ στην Κύπρο",
    },
    en: {
      ctaEyebrow: "Ready?",
      ctaTitle: "Stop Missing\nOut.",
      ctaBtn: "Get Started",
      explore: "Explore", visitors: "Visitors", businesses: "Businesses",
      legalTitle: "Legal",
      terms: "Terms of Use", privacy: "Privacy Policy", license: "License", cookies: "Cookies",
      supportTitle: "Support",
      contact: "Contact", demo: "Book a Demo",
      platformTitle: "Platform",
      rights: "© 2026 ΦΟΜΟ. All rights reserved.",
      madeIn: "Made with ❤️ in Cyprus",
    },
  };

  const t = text[language];

  const cols = [
    {
      title: t.platformTitle,
      links: [
        { to: "/feed", label: t.explore },
        { to: "/for-visitors", label: t.visitors },
        { to: "/for-businesses", label: t.businesses },
      ],
    },
    {
      title: t.legalTitle,
      links: [
        { to: "/terms", label: t.terms },
        { to: "/privacy", label: t.privacy },
        { to: "/license", label: t.license },
        { to: "/cookies", label: t.cookies },
      ],
    },
    {
      title: t.supportTitle,
      links: [
        { to: "/contact", label: t.contact },
        { to: "/book-demo", label: t.demo },
        { href: "mailto:support@fomo.com.cy", label: "support@fomo.com.cy" },
      ],
    },
  ];

  return (
    <footer className="relative bg-background overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      {/* ── Pre-footer CTA ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,hsl(var(--primary)/0.3),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_20%,hsl(var(--seafoam)/0.08),transparent)]" />

        <div className="container mx-auto px-4 py-20 sm:py-28 relative z-10 text-center max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-seafoam text-xs font-semibold tracking-widest uppercase mb-4"
          >
            {t.ctaEyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="font-urbanist font-black text-5xl sm:text-6xl lg:text-7xl text-white leading-[0.9] tracking-tight mb-8 whitespace-pre-line"
          >
            {t.ctaTitle}
          </motion.h2>
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.18 }}
            onClick={() => navigate("/signup")}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-seafoam text-aegean font-bold rounded-full hover:bg-seafoam/90 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-xl shadow-seafoam/20 text-base"
          >
            {t.ctaBtn}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </div>
      </div>

      {/* ── Links ── */}
      <div className="border-t border-white/8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-14">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-6">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-1 space-y-4">
              <span className="font-cinzel font-black text-lg text-white tracking-widest">ΦΟΜΟ</span>
              <p className="text-white/30 text-xs leading-relaxed max-w-[160px]">
                Cyprus's #1 event discovery platform.
              </p>
              <div className="flex gap-2 pt-1">
                {[
                  { href: "https://instagram.com/fomo.cy", icon: <Instagram className="w-3.5 h-3.5" />, label: "Instagram" },
                  { href: "https://tiktok.com/@fomo.cy", icon: <TikTokIcon className="w-3.5 h-3.5" />, label: "TikTok" },
                  { href: "mailto:support@fomo.com.cy", icon: <Mail className="w-3.5 h-3.5" />, label: "Email" },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.href.startsWith("http") ? "_blank" : undefined}
                    rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-seafoam hover:border-seafoam/30 hover:bg-seafoam/5 transition-all duration-200"
                    aria-label={s.label}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {cols.map((col) => (
              <div key={col.title} className="space-y-3">
                <h4 className="font-poppins font-semibold text-[11px] text-white/50 uppercase tracking-widest">
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {"to" in link ? (
                        <Link
                          to={link.to}
                          className="text-white/35 hover:text-white/75 transition-colors text-sm"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-white/35 hover:text-white/75 transition-colors text-sm"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/[0.06]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/20 text-xs">{t.rights}</p>
          <p className="text-white/20 text-xs">{t.madeIn}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
