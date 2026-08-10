import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  LifeBuoy, Mail, Clock, Copy, Check, BookOpen, UserCog, ShieldQuestion,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";

// ⚠️ PLACEHOLDERS — swap these for the team's real support channel before launch.
// The domain matches the one already used across the seeded accounts; nothing
// here is wired to a live mailbox yet. Kept in one object so replacing them is a
// single edit rather than a hunt through the markup.
const SUPPORT_CONTACT = {
  email: "support@habitevolve.com",
  /** Local time zone the hours below are expressed in. */
  timezone: "GMT+7",
  hoursWeekday: "09:00 – 18:00",
  hoursWeekend: "09:00 – 12:00",
};

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

// ── CARD SHELL ────────────────────────────────────────────────────────────────
const SupportCard = ({
  Icon, tone, title, children,
}: {
  Icon: LucideIcon;
  tone: string;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="sky-glass-admin rounded-sky-card p-5">
    <div className="flex items-center gap-2.5 mb-3">
      <span className={`grid place-items-center w-9 h-9 rounded-sky-chip shrink-0 ${tone}`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <span className={eyebrow}>{title}</span>
    </div>
    {children}
  </div>
);

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Support() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // navigator.clipboard is unavailable over plain http on some hosts, so a
  // failure here must not break the page — the address stays selectable anyway.
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_CONTACT.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the mailto link and the visible text still work */
    }
  };

  return (
    <>
      <PageMeta
        title="Support | HabitEvolve"
        description="Contact the HabitEvolve support team"
      />
      <PageBreadcrumb pageTitle={t("support.title")} />

      <div className="max-w-3xl justify-self-center w-full space-y-5 sky-stagger">

        <PageHeader
          icon={<LifeBuoy className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
          tone="deep"
          title={t("support.title")}
          description={t("support.subtitle")}
        />

        {/* ── PRIMARY CHANNEL: EMAIL ───────────────────────────────────────── */}
        <SupportCard Icon={Mail} tone="bg-sky-deep/12 text-sky-deep" title={t("support.emailSection")}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <a
              href={`mailto:${SUPPORT_CONTACT.email}`}
              className="font-display text-lg font-semibold text-sky-deep underline decoration-sky-deep/35 decoration-2 underline-offset-2 transition-colors hover:text-sky-abyss hover:decoration-sky-abyss/50 break-all"
            >
              {SUPPORT_CONTACT.email}
            </a>
            <button
              type="button"
              onClick={copyEmail}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sky-chip bg-white/70 ring-1 ring-white/85 text-xs font-semibold text-sky-ink-2 shadow-sky-chip transition hover:bg-white/90 hover:text-sky-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
            >
              {copied
                ? <><Check className="w-3.5 h-3.5 shrink-0 text-sky-teal" aria-hidden="true" /> {t("support.copied")}</>
                : <><Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {t("support.copy")}</>}
            </button>
          </div>
          <p className="text-xs font-medium text-sky-ink-3 mt-2.5">{t("support.emailHint")}</p>
        </SupportCard>

        {/* ── HOURS ────────────────────────────────────────────────────────── */}
        <SupportCard Icon={Clock} tone="bg-sky-violet/14 text-sky-violet-deep" title={t("support.hoursSection")}>
          <dl className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm font-medium text-sky-ink-2">{t("support.weekdays")}</dt>
              <dd className="font-display text-sm font-semibold text-sky-ink tabular-nums">{SUPPORT_CONTACT.hoursWeekday}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm font-medium text-sky-ink-2">{t("support.weekend")}</dt>
              <dd className="font-display text-sm font-semibold text-sky-ink tabular-nums">{SUPPORT_CONTACT.hoursWeekend}</dd>
            </div>
          </dl>
          <p className="text-xs font-medium text-sky-ink-3 mt-3">
            {t("support.hoursHint", { timezone: SUPPORT_CONTACT.timezone })}
          </p>
        </SupportCard>

        {/* ── WHAT TO INCLUDE ──────────────────────────────────────────────── */}
        {/* Not decoration: a report without account id and steps is the single
            biggest cause of a support round-trip. */}
        <SupportCard Icon={ShieldQuestion} tone="bg-sky-peach/20 text-sky-peach-deep" title={t("support.beforeYouWriteSection")}>
          <ul className="space-y-2">
            {["account", "steps", "screenshot", "time"].map((key) => (
              <li key={key} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-peach-deep" aria-hidden="true" />
                <span className="font-medium text-sky-ink-2">{t(`support.checklist.${key}`)}</span>
              </li>
            ))}
          </ul>
        </SupportCard>

        {/* ── SELF-SERVE SHORTCUTS ─────────────────────────────────────────── */}
        <SupportCard Icon={BookOpen} tone="bg-sky-teal-bg text-sky-teal" title={t("support.selfServeSection")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/profile"
              className="flex items-center gap-2.5 rounded-sky-md bg-white/55 ring-1 ring-white/75 px-4 py-3 transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
            >
              <UserCog className="w-4 h-4 shrink-0 text-sky-ink-3" aria-hidden="true" />
              <span className="text-sm font-semibold text-sky-ink">{t("support.linkProfile")}</span>
            </Link>
            <Link
              to="/edit-profile"
              className="flex items-center gap-2.5 rounded-sky-md bg-white/55 ring-1 ring-white/75 px-4 py-3 transition hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
            >
              <BookOpen className="w-4 h-4 shrink-0 text-sky-ink-3" aria-hidden="true" />
              <span className="text-sm font-semibold text-sky-ink">{t("support.linkEditProfile")}</span>
            </Link>
          </div>
          <p className="text-xs font-medium text-sky-ink-3 mt-3">{t("support.selfServeHint")}</p>
        </SupportCard>

      </div>
    </>
  );
}
