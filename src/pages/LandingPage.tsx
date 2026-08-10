import type { ReactNode } from "react";
import { Link, Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Swords, Smartphone, Users, ClipboardList, Skull,
  Apple, PlayCircle, ArrowRight,
} from "lucide-react";
import PageMeta from "../components/common/PageMeta";
import LanguageToggle from "../components/common/LanguageToggle";
import HeroOrb from "../components/landing/HeroOrb";
import { useAuth } from "../context/AuthContext";
import { getRoleBasedRedirect } from "../utils/roleRedirect";

// Same brand mark used by MentorHeader / AppSidebar / the auth "Visual Gate" —
// one hosted asset, not a generated icon standing in for it.
const LOGO_URL = "https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png";

// Same shape as the primary Login button — one CTA recipe for the whole page,
// design-system §5 "Primary: sky-glass-fill gradient, white text, shadow-sky-fill".
const ctaPrimaryCls =
  "inline-flex items-center justify-center gap-1.5 rounded-sky-chip bg-linear-to-b from-sky-deep-lo to-sky-deep px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sky-fill sky-lift";

// ── HEADER ────────────────────────────────────────────────────────────────────
const Header = () => {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={LOGO_URL} alt="" className="h-9 w-9 shrink-0 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight text-sky-ink">HabitEvolve</span>
        </Link>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <LanguageToggle />
          <Link to="/login" className={ctaPrimaryCls}>
            {t("landing.header.loginBtn")}
          </Link>
        </div>
      </div>
    </header>
  );
};

// ── HERO ──────────────────────────────────────────────────────────────────────
const Hero = () => {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:pb-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-8">
        <div className="sky-in text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-deep ring-1 ring-white/80 shadow-sky-chip">
            {t("landing.hero.ctaSecondary")}
          </span>
          <h1 className="mt-5 text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-sky-ink sm:text-5xl lg:text-6xl">
            {t("landing.hero.titleLine1")}{" "}
            <span className="bg-linear-to-r from-sky-deep to-sky-violet bg-clip-text text-transparent">
              {t("landing.hero.titleHighlight")}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-balance text-base font-medium leading-relaxed text-sky-ink-2 sm:text-lg lg:mx-0">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a href="#roles" className={`${ctaPrimaryCls} px-6 py-3.5`}>
              {t("landing.hero.ctaPrimary")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* The 3D hook — floating sky gem, right side on desktop */}
        <div className="sky-in" style={{ animationDelay: "120ms" }}>
          <HeroOrb />
        </div>
      </div>
    </section>
  );
};

// ── ROLE GATEWAY ──────────────────────────────────────────────────────────────
const RoleCard = ({
  iconTint, icon, title, subtitle, description, children,
}: {
  iconTint: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  description: string;
  children: ReactNode;
}) => (
  <div className="sky-glass sky-lift flex flex-col rounded-sky-card p-6">
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-sky-chip ${iconTint}`}>
      {icon}
    </span>
    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3">
      {subtitle}
    </p>
    <h3 className="mt-1 font-display text-xl font-bold text-sky-ink">{title}</h3>
    <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-sky-ink-2">
      {description}
    </p>
    <div className="mt-5">{children}</div>
  </div>
);

const RoleGateway = () => {
  const { t } = useTranslation();
  return (
    <section id="roles" className="px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="sky-in mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-deep">
            {t("landing.roles.sectionLabel")}
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold text-sky-ink sm:text-4xl">
            {t("landing.roles.sectionTitle")}
          </h2>
        </div>

        <div className="sky-stagger mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Admin — sky-deep, the platform-wide primary colour, matches Admin's
              current sidebar-active token (index.css §Role-Color Tokens). */}
          <RoleCard
            iconTint="bg-sky-deep/12 text-sky-deep"
            icon={<LayoutDashboard className="h-5 w-5" aria-hidden="true" />}
            title={t("landing.roles.admin.title")}
            subtitle={t("landing.roles.admin.subtitle")}
            description={t("landing.roles.admin.description")}
          >
            <Link to="/login?role=admin" className={`${ctaPrimaryCls} w-full`}>
              {t("landing.roles.admin.cta")}
            </Link>
          </RoleCard>

          {/* Mentor — sky-violet, the existing "epic / mentor accent" token. */}
          <RoleCard
            iconTint="bg-sky-violet/14 text-sky-violet-deep"
            icon={<Swords className="h-5 w-5" aria-hidden="true" />}
            title={t("landing.roles.mentor.title")}
            subtitle={t("landing.roles.mentor.subtitle")}
            description={t("landing.roles.mentor.description")}
          >
            <Link to="/login?role=mentor" className={`${ctaPrimaryCls} w-full`}>
              {t("landing.roles.mentor.cta")}
            </Link>
          </RoleCard>

          {/* Player — mobile-only, no web login. sky-peach: the "reward/game"
              accent (never a role-identity colour, so it doesn't collide with
              Admin/Mentor sidebar signals) fits a Hero-flavoured card. */}
          <RoleCard
            iconTint="bg-sky-peach/20 text-sky-peach-deep"
            icon={<Smartphone className="h-5 w-5" aria-hidden="true" />}
            title={t("landing.roles.player.title")}
            subtitle={t("landing.roles.player.subtitle")}
            description={t("landing.roles.player.description")}
          >
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-sky-ink-3">
                {t("landing.roles.player.mobileOnly")}
              </p>
              <div className="flex gap-2">
                <span
                  aria-disabled="true"
                  className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-sky-chip bg-white/55 px-3 py-2.5 text-xs font-semibold text-sky-ink-3 ring-1 ring-white/70"
                >
                  <Apple className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("landing.roles.player.appStore")}
                </span>
                <span
                  aria-disabled="true"
                  className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-sky-chip bg-white/55 px-3 py-2.5 text-xs font-semibold text-sky-ink-3 ring-1 ring-white/70"
                >
                  <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("landing.roles.player.googlePlay")}
                </span>
              </div>
            </div>
          </RoleCard>
        </div>
      </div>
    </section>
  );
};

// ── MENTOR MARKETING (zig-zag) ────────────────────────────────────────────────
const MentorFeatureRow = ({
  reverse, iconTint, icon, title, description,
}: {
  reverse?: boolean;
  iconTint: string;
  icon: ReactNode;
  title: string;
  description: string;
}) => (
  <div className={`flex flex-col items-center gap-6 md:gap-10 ${reverse ? "md:flex-row-reverse" : "md:flex-row"}`}>
    <div className="sky-glass-tint flex h-40 w-full shrink-0 items-center justify-center rounded-sky-card md:h-48 md:w-64">
      <span className={`grid h-16 w-16 place-items-center rounded-full ${iconTint}`}>
        {icon}
      </span>
    </div>
    <div className="text-center md:text-left">
      <h3 className="font-display text-2xl font-bold text-sky-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-sky-ink-2">
        {description}
      </p>
    </div>
  </div>
);

const MentorMarketing = () => {
  const { t } = useTranslation();
  return (
    <section className="px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="sky-in mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-violet-deep">
            {t("landing.mentorMarketing.sectionLabel")}
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold text-sky-ink sm:text-4xl">
            {t("landing.mentorMarketing.heading")}
          </h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-sky-ink-2 sm:text-base">
            {t("landing.mentorMarketing.subheading")}
          </p>
        </div>

        <div className="sky-stagger mt-12 flex flex-col gap-12 sm:gap-16">
          <MentorFeatureRow
            iconTint="bg-sky-violet/14 text-sky-violet-deep"
            icon={<Users className="h-7 w-7" aria-hidden="true" />}
            title={t("landing.mentorMarketing.featureA.title")}
            description={t("landing.mentorMarketing.featureA.description")}
          />
          <MentorFeatureRow
            reverse
            iconTint="bg-sky-deep/12 text-sky-deep"
            icon={<ClipboardList className="h-7 w-7" aria-hidden="true" />}
            title={t("landing.mentorMarketing.featureB.title")}
            description={t("landing.mentorMarketing.featureB.description")}
          />
          <MentorFeatureRow
            iconTint="bg-sky-peach/20 text-sky-peach-deep"
            icon={<Skull className="h-7 w-7" aria-hidden="true" />}
            title={t("landing.mentorMarketing.featureC.title")}
            description={t("landing.mentorMarketing.featureC.description")}
          />
        </div>

        <div className="sky-in mt-12 text-center">
          <Link to="/login?role=mentor" className={`${ctaPrimaryCls} px-6 py-3.5`}>
            {t("landing.mentorMarketing.cta")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};

// ── FOOTER ────────────────────────────────────────────────────────────────────
const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-white/60 px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="" className="h-7 w-7 object-contain" />
          <span className="font-display text-sm font-bold text-sky-ink">HabitEvolve</span>
        </div>
        <p className="text-xs font-medium text-sky-ink-3">{t("landing.footer.tagline")}</p>
        <p className="text-xs font-medium text-sky-ink-3">
          © {new Date().getFullYear()} HabitEvolve. {t("landing.footer.rights")}
        </p>
      </div>
    </footer>
  );
};

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  // Same guard SignIn.tsx used to carry at "/" — a returning, still-logged-in
  // visitor skips the marketing page and goes straight to their dashboard.
  if (isAuthenticated && user) {
    return <Navigate to={getRoleBasedRedirect(user.roles)} replace />;
  }

  return (
    <>
      <PageMeta
        title="HabitEvolve — Level Up Your Habits in the Sky"
        description="HabitEvolve turns daily habits into an RPG adventure. Admins and Mentors run the platform from the web console; Heroes play on the mobile app."
      />
      <div className="sky-mesh-bg min-h-screen">
        <Header />
        <main>
          <Hero />
          <RoleGateway />
          <MentorMarketing />
        </main>
        <Footer />
      </div>
    </>
  );
}
