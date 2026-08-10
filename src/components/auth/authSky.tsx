import type { ReactNode } from "react";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

// ── Sky-Pastel auth primitives ───────────────────────────────────────────────
// SignInForm and SignUpForm were byte-identical across their left panel, field
// chrome, submit button, divider and error banner — only the copy differed. The
// neo-brutalism versions (thick outlines + hard offset shadows) are retired
// here per DESIGN.md: auth is an operational screen, so it gets glass, navy
// shadows and the cool primary, with no game accents.
//
// Nothing in this module touches submit/validation logic — every piece takes its
// state as props and calls back out.

export const authLabel =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

/**
 * The left "visual gate": mascot + slogan over a deep-sky gradient.
 * Was a brand-green gradient, which the colour law forbids — it now runs abyss → deep → sky-1, so the login screen
 * reads as the same product as the mobile app's sky background.
 */
export const AuthGate = ({
  mascotAlt,
  slogan,
  tagline,
}: {
  mascotAlt: string;
  slogan: string;
  tagline: string;
}) => (
  <section className="hidden lg:flex lg:w-[45%] shrink-0 relative flex-col items-center justify-center overflow-hidden bg-linear-to-b from-sky-abyss via-sky-deep to-sky-1 p-12">
    {/* Two very soft radial blooms instead of the old dot pattern — depth without
        a busy texture behind the mascot. */}
    <div
      className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-white/12 blur-3xl"
      aria-hidden="true"
    />
    <div
      className="pointer-events-none absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-sky-3/22 blur-3xl"
      aria-hidden="true"
    />
    <div className="relative flex max-w-md flex-col items-center gap-8 text-center">
      <div className="relative h-98 w-98 md:h-112 md:w-112">
        <img
          alt={mascotAlt}
          className="relative z-10 h-full w-full object-contain drop-shadow-[0_18px_40px_rgba(27,42,64,0.45)]"
          src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png"
        />
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl">
          {slogan}
        </h2>
        <p className="text-base font-medium text-white/72">{tagline}</p>
      </div>
    </div>
  </section>
);

/**
 * Right-hand pane: mesh background + the glass card that holds the form.
 * `icon` is an optional badge above the title — the forms leave it off; the
 * post-register confirmation uses it to lead with its success glyph.
 */
export const AuthPane = ({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  children: ReactNode;
}) => (
  <section className="sky-mesh-bg relative flex flex-1 items-center justify-center overflow-y-auto px-6 py-12 sm:px-10 lg:px-16">
    <div className="w-full max-w-md">
      <div className="sky-glass rounded-sky-card p-8 sky-in">
        <div className="relative mb-8 text-center">
          {icon && <div className="mb-5 flex justify-center">{icon}</div>}
          <h1 className="font-display text-3xl font-semibold tracking-tight text-sky-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-sky-ink-2">{subtitle}</p>
        </div>
        <div className="relative">{children}</div>
      </div>
    </div>
  </section>
);

/** Rose-rail banner for a failed submit — rail + tint + glyph, never colour alone. */
export const AuthError = ({ message }: { message: string }) => (
  <div
    role="alert"
    className="relative flex items-start gap-2.5 overflow-hidden rounded-sky-md bg-sky-rose/10 px-4 py-3 ring-1 ring-sky-rose/26"
  >
    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" aria-hidden="true" />
    <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-sky-rose-deep" aria-hidden="true" />
    <p className="text-sm font-semibold text-sky-rose-deep">{message}</p>
  </div>
);

/**
 * One labelled field. `onToggleReveal` turns it into a password field with the
 * eye affordance; leaving it off renders a plain input.
 */
export const AuthField = ({
  id,
  name,
  type,
  label,
  value,
  placeholder,
  error,
  onChange,
  revealed,
  onToggleReveal,
  revealLabel,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  revealed?: boolean;
  onToggleReveal?: () => void;
  revealLabel?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className={authLabel}>
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        className={`w-full rounded-sky-md bg-white/72 px-4 py-3.5 text-base font-medium text-sky-ink shadow-sky-fill outline-none transition-shadow placeholder:text-sky-ink-3 focus:ring-2 focus:ring-sky-deep/45 ${
          onToggleReveal ? "pr-12" : ""
        } ${error ? "ring-1 ring-sky-rose/45" : "ring-1 ring-white/85"}`}
      />
      {onToggleReveal && (
        <button
          type="button"
          onClick={onToggleReveal}
          aria-label={revealLabel}
          className="absolute right-3 top-1/2 inline-grid -translate-y-1/2 place-items-center h-8 w-8 rounded-sky-chip text-sky-ink-3 transition-colors hover:bg-white/70 hover:text-sky-ink"
        >
          {revealed ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}
    </div>
    {error && (
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-rose-deep">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {error}
      </p>
    )}
  </div>
);

/** Deep-gradient primary submit — the same shape SkyButton uses, at form width. */
export const AuthSubmit = ({
  loading,
  children,
  className = "",
}: {
  loading: boolean;
  children: ReactNode;
  className?: string;
}) => (
  <button
    type="submit"
    disabled={loading}
    className={[
      "w-full rounded-sky-md bg-linear-to-b from-sky-deep-lo to-sky-deep py-3.5 font-display text-base font-semibold text-white",
      "shadow-[0_10px_24px_-10px_rgba(36,52,77,0.55)] ring-1 ring-sky-deep/30 transition-all duration-200",
      loading
        ? "cursor-not-allowed opacity-65"
        : "hover:-translate-y-px hover:shadow-[0_14px_30px_-10px_rgba(36,52,77,0.6)] active:translate-y-0 active:scale-[0.99]",
      className,
    ].join(" ")}
  >
    {children}
  </button>
);

/** Hairline rule with a centred caption. */
export const AuthDivider = ({ label }: { label: string }) => (
  <div className="my-7 flex items-center gap-3">
    <span className="h-px flex-1 bg-sky-ink/12" />
    <span className={authLabel}>{label}</span>
    <span className="h-px flex-1 bg-sky-ink/12" />
  </div>
);

/** Inline text link used for the forgot-password / switch-mode lines. */
export const authLink =
  "font-semibold text-sky-deep underline decoration-sky-deep/35 decoration-2 underline-offset-2 transition-colors hover:text-sky-abyss hover:decoration-sky-abyss/50";
