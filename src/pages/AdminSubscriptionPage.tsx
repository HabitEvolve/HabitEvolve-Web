import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, X, ChevronLeft, ChevronRight, Check, Minus, AlertTriangle,
  Gem, Package, Info, Users, Swords, Inbox, Power, PowerOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import adminSubscriptionApi from '../api/adminSubscriptionApi';
import { useAlert } from '../context/AlertContext';
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';
import type {
  SubscriptionPackageDto,
  RewardTier,
} from '../types/adminSubscription.types';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const BOSS_MODE_OPTIONS = ['EASY', 'NORMAL', 'HARD'] as const;
const PROOF_TYPE_OPTIONS = [
  'PHOTO', 'VIDEO', 'TIMER', 'SCREENSHOT',
  'GPS', 'STEP_COUNTER', 'TEXT_LOG', 'SELF_CHECK',
] as const;
const REWARD_TIER_OPTIONS: RewardTier[] = ['Basic', 'Standard', 'Premium'];

// ─── Helpers ────────────────────────────────────────────────────────────────

const errMsg = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || 'An unexpected error occurred.';
};

const csvToArr = (csv: string | null | undefined): string[] =>
  csv ? csv.split(',').map(s => s.trim()).filter(Boolean) : [];

const arrToCsv = (arr: string[]): string => arr.join(',');

// ─── Internal form state (arrays for multi-selects, CSV on submit) ───────────

interface PackageFormState {
  code: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  maxParties: number;
  maxMembersPerParty: number;
  questsPerMemberPerDay: number;
  partyQuestsPerWeek: number;
  bossModes: string[];
  maxDamagePerQuest: number;
  maxMGoldRewardPerQuest: number;
  proofTypes: string[];
  rewardTier: RewardTier;
  aiVerificationBossModes: string[];
}

const EMPTY_FORM: PackageFormState = {
  code: '',
  name: '',
  description: '',
  price: 0,
  durationDays: 30,
  maxParties: 1,
  maxMembersPerParty: 5,
  questsPerMemberPerDay: 3,
  partyQuestsPerWeek: 10,
  bossModes: ['EASY'],
  maxDamagePerQuest: 100,
  maxMGoldRewardPerQuest: 50,
  proofTypes: ['PHOTO'],
  rewardTier: 'Basic',
  aiVerificationBossModes: [],
};

const pkgToForm = (pkg: SubscriptionPackageDto): PackageFormState => ({
  code: pkg.code,
  name: pkg.name,
  description: pkg.description ?? '',
  price: pkg.price,
  durationDays: pkg.durationDays,
  maxParties: pkg.maxParties,
  maxMembersPerParty: pkg.maxMembersPerParty,
  questsPerMemberPerDay: pkg.questsPerMemberPerDay,
  partyQuestsPerWeek: pkg.partyQuestsPerWeek,
  bossModes: csvToArr(pkg.bossModes),
  maxDamagePerQuest: pkg.maxDamagePerQuest,
  maxMGoldRewardPerQuest: pkg.maxMGoldRewardPerQuest,
  proofTypes: csvToArr(pkg.proofTypes),
  rewardTier: pkg.rewardTier,
  aiVerificationBossModes: csvToArr(pkg.aiVerificationBossModes),
});

// ─── Tone taxonomy ───────────────────────────────────────────────────────────
// One hue per meaning. teal is spent only on a package that is genuinely live,
// rose only on switching one off, peach on money and on the top of a value ramp,
// deep on the operational default, cool as the second wayfinding hue.
type Tone = 'deep' | 'cool' | 'peach' | 'violet' | 'teal' | 'rose' | 'neutral';
const TONE: Record<Tone, { chip: string; wash: string; rail: string }> = {
  deep:    { chip: 'bg-sky-deep/12 ring-sky-deep/22 text-sky-deep',            wash: 'bg-sky-deep/8',    rail: 'bg-sky-deep' },
  cool:    { chip: 'bg-sky-deep-lo/14 ring-sky-deep-lo/24 text-sky-deep-lo',   wash: 'bg-sky-deep-lo/9', rail: 'bg-sky-deep-lo' },
  peach:   { chip: 'bg-sky-peach/20 ring-sky-peach/32 text-sky-peach-deep',    wash: 'bg-sky-peach/14',  rail: 'bg-sky-peach' },
  violet:  { chip: 'bg-sky-violet/14 ring-sky-violet/26 text-sky-violet-deep', wash: 'bg-sky-violet/10', rail: 'bg-sky-violet' },
  teal:    { chip: 'bg-sky-teal-bg ring-sky-teal/26 text-sky-teal',            wash: 'bg-sky-teal/10',   rail: 'bg-sky-teal' },
  rose:    { chip: 'bg-sky-rose/14 ring-sky-rose/26 text-sky-rose-deep',       wash: 'bg-sky-rose/10',   rail: 'bg-sky-rose' },
  neutral: { chip: 'bg-white/72 ring-white/85 text-sky-ink-2',                 wash: 'bg-white/48',      rail: 'bg-sky-ink/22' },
};

// ─── Shared style tokens ─────────────────────────────────────────────────────

const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3';

const inputCls = [
  'w-full rounded-sky-chip bg-white/70 ring-1 ring-white/80 px-3.5 py-2.5',
  'text-sm font-medium text-sky-ink transition-shadow',
  'focus:outline-none focus:ring-2 focus:ring-sky-deep/45',
  'placeholder:text-sky-ink-3',
].join(' ');

const labelCls = `block mb-1.5 ${eyebrow}`;

// ─── Micro-components ────────────────────────────────────────────────────────

// Live-or-not is a real state, so it carries a glyph as well as a hue — and off
// is not a failure, so it takes neutral rather than red.
const StatusBadge = ({ isActive }: { isActive: boolean }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sky-chip ring-1 px-2.5 py-1 text-xs font-semibold ${
        isActive ? TONE.teal.chip : TONE.neutral.chip
      }`}
    >
      {isActive
        ? <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
        : <Minus className="w-3 h-3" strokeWidth={3} aria-hidden="true" />}
      {isActive ? t('admin.subscriptionPage.statusActive') : t('admin.subscriptionPage.statusInactive')}
    </span>
  );
};

// Tiers are a value ramp, not a severity ramp, so the hues escalate towards the
// reward colour: operational deep → violet → peach at the top.
const TIER_TONE: Record<string, Tone> = { Basic: 'deep', Standard: 'violet', Premium: 'peach' };
const RewardTierBadge = ({ tier }: { tier: string }) => (
  <span className={`inline-block rounded-sky-chip ring-1 px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] ${TONE[TIER_TONE[tier] ?? 'neutral'].chip}`}>
    {tier.toUpperCase()}
  </span>
);

const ModeChip = ({ label }: { label: string }) => (
  <span className="rounded-[8px] bg-white/68 ring-1 ring-white/85 px-2 py-0.5 text-[10px] font-semibold text-sky-ink-2">
    {label}
  </span>
);

// Multi-select toggle chip group. The whole row sits in one recessed well so it
// reads as a single control, and only the chosen chips lift out of it.
const ChipGroup = ({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) => (
  <div className="mt-1 flex flex-wrap gap-1.5 rounded-sky-md bg-white/42 ring-1 ring-white/70 p-2">
    {options.map(opt => {
      const active = selected.includes(opt);
      return (
        <button
          key={opt}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(active ? selected.filter(s => s !== opt) : [...selected, opt])}
          className={`select-none rounded-sky-chip px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            active
              ? 'bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-chip'
              : 'text-sky-ink-2 hover:bg-white/70 hover:text-sky-ink'
          }`}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

// A long form needs wayfinding, so each section keeps its own rail hue and glyph
// — an operator can then say "the party block" and mean a colour.
const SectionHeader = ({ label, Icon, tone }: { label: string; Icon: LucideIcon; tone: Tone }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className={`grid place-items-center w-7 h-7 shrink-0 rounded-[10px] ring-1 ${TONE[tone].chip}`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden="true" />
    </span>
    <h3 className="whitespace-nowrap font-display text-xs font-semibold uppercase tracking-[0.14em] text-sky-ink">
      {label}
    </h3>
    <div className="h-px flex-1 bg-sky-ink/10" />
  </div>
);

const Field = ({
  label,
  span,
  children,
}: {
  label: string;
  span?: boolean;
  children: React.ReactNode;
}) => (
  <div className={span ? 'col-span-2' : ''}>
    <label className={labelCls}>{label}</label>
    {children}
  </div>
);

// ─── Package Form Modal ───────────────────────────────────────────────────────

interface PackageFormModalProps {
  mode: 'create' | 'edit';
  initial?: SubscriptionPackageDto;
  onClose: () => void;
  onSuccess: () => void;
}

const PackageFormModal = ({ mode, initial, onClose, onSuccess }: PackageFormModalProps) => {
  const { t } = useTranslation();
  const alert = useAlert();
  const [form, setForm] = useState<PackageFormState>(
    initial ? pkgToForm(initial) : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof PackageFormState>(k: K, v: PackageFormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.bossModes.length) { setError(t('admin.subscriptionPage.form.bossModesRequired')); return; }
    if (!form.proofTypes.length) { setError(t('admin.subscriptionPage.form.proofTypesRequired')); return; }

    setSaving(true);
    try {
      const base = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        maxParties: Number(form.maxParties),
        maxMembersPerParty: Number(form.maxMembersPerParty),
        questsPerMemberPerDay: Number(form.questsPerMemberPerDay),
        partyQuestsPerWeek: Number(form.partyQuestsPerWeek),
        bossModes: arrToCsv(form.bossModes),
        maxDamagePerQuest: Number(form.maxDamagePerQuest),
        maxMGoldRewardPerQuest: Number(form.maxMGoldRewardPerQuest),
        proofTypes: arrToCsv(form.proofTypes),
        rewardTier: form.rewardTier,
        aiVerificationBossModes: form.aiVerificationBossModes.length
          ? arrToCsv(form.aiVerificationBossModes)
          : undefined,
      };

      let res;
      if (mode === 'create') {
        res = await adminSubscriptionApi.createPackage({
          ...base,
          code: form.code.trim().toUpperCase(),
        });
      } else {
        res = await adminSubscriptionApi.updatePackage(initial!.packageId, base);
      }

      if (!res.success) throw new Error(res.message);
      onSuccess();
    } catch (e) {
      alert.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="modal-content fixed inset-0 z-[99999] bg-sky-abyss/45 backdrop-blur-md flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <SkyCard variant="admin" className="sky-in p-0 overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* ── Modal header ── */}
        {/* Which package is being edited is the fact that must not be misread, so
            the code is the title and the modal's purpose is demoted to an eyebrow. */}
        <div className={`relative flex shrink-0 items-center gap-3 overflow-hidden border-b border-white/65 px-6 py-4 ${TONE.violet.wash}`}>
          <span className={`absolute left-0 top-0 h-full w-[3px] ${TONE.violet.rail}`} aria-hidden="true" />
          <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ring-1 ${TONE.violet.chip}`}>
            <Package className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={eyebrow}>{mode === 'create' ? 'New package' : 'Edit package'}</p>
            <h2 className="truncate font-display text-base font-semibold leading-tight text-sky-ink">
              {mode === 'create'
                ? t('admin.subscriptionPage.form.newTitle')
                : t('admin.subscriptionPage.form.editTitle', { code: initial?.code })}
            </h2>
          </div>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X className="w-4 h-4" />
          </SkyButton>
        </div>

        {/* ── Scrollable form ── */}
        <form
          id="pkg-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-7 bg-white/34"
        >
          {/* Section A: Basic Info */}
          <div>
            <SectionHeader label={t('admin.subscriptionPage.form.sectionBasic')} Icon={Info} tone="deep" />
            <div className="grid grid-cols-2 gap-3">
              {mode === 'create' && (
                <Field label={t('admin.subscriptionPage.form.codeLabel')}>
                  <input
                    required
                    maxLength={50}
                    placeholder={t('admin.subscriptionPage.form.codePlaceholder')}
                    className={`${inputCls} font-mono tracking-[0.08em]`}
                    value={form.code}
                    onChange={e => set('code', e.target.value.toUpperCase())}
                  />
                </Field>
              )}
              <Field label={t('admin.subscriptionPage.form.nameLabel')} span={mode === 'edit'}>
                <input
                  required
                  maxLength={200}
                  placeholder={t('admin.subscriptionPage.form.namePlaceholder')}
                  className={inputCls}
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.descLabel')} span>
                <textarea
                  maxLength={1000}
                  rows={2}
                  placeholder={t('admin.subscriptionPage.form.descPlaceholder')}
                  className={`${inputCls} resize-none`}
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.priceLabel')}>
                <input
                  required
                  type="number"
                  min={0}
                  step={1}
                  className={`${inputCls} tabular-nums`}
                  value={form.price}
                  onChange={e => set('price', +e.target.value || 0)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.durationLabel')}>
                <input
                  required
                  type="number"
                  min={0}
                  step={1}
                  placeholder={t('admin.subscriptionPage.form.unlimitedHint')}
                  className={`${inputCls} tabular-nums`}
                  value={form.durationDays}
                  onChange={e => set('durationDays', +e.target.value || 0)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.rewardTierLabel')} span>
                <select
                  className={inputCls}
                  value={form.rewardTier}
                  onChange={e => set('rewardTier', e.target.value as RewardTier)}
                >
                  {REWARD_TIER_OPTIONS.map(tier => (
                    <option key={tier} value={tier}>{tier}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Section B: Party & Member Limits */}
          <div>
            <SectionHeader label={t('admin.subscriptionPage.form.sectionParty')} Icon={Users} tone="cool" />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.subscriptionPage.form.maxPartiesLabel')}>
                <input
                  required
                  type="number"
                  min={1}
                  className={`${inputCls} tabular-nums`}
                  value={form.maxParties}
                  onChange={e => set('maxParties', +e.target.value || 1)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.maxMembersLabel')}>
                <input
                  required
                  type="number"
                  min={1}
                  className={`${inputCls} tabular-nums`}
                  value={form.maxMembersPerParty}
                  onChange={e => set('maxMembersPerParty', +e.target.value || 1)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.partyQuestsLabel')} span>
                <input
                  required
                  type="number"
                  min={0}
                  className={`${inputCls} tabular-nums`}
                  value={form.partyQuestsPerWeek}
                  onChange={e => set('partyQuestsPerWeek', +e.target.value || 0)}
                />
              </Field>
            </div>
          </div>

          {/* Section C: Quest & Boss Limits */}
          <div>
            <SectionHeader label={t('admin.subscriptionPage.form.sectionQuest')} Icon={Swords} tone="violet" />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.subscriptionPage.form.memberQuestsLabel')}>
                <input
                  required
                  type="number"
                  min={0}
                  className={`${inputCls} tabular-nums`}
                  value={form.questsPerMemberPerDay}
                  onChange={e => set('questsPerMemberPerDay', +e.target.value || 0)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.maxDamageLabel')}>
                <input
                  required
                  type="number"
                  min={0}
                  className={`${inputCls} tabular-nums`}
                  value={form.maxDamagePerQuest}
                  onChange={e => set('maxDamagePerQuest', +e.target.value || 0)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.maxGoldLabel')}>
                <input
                  required
                  type="number"
                  min={0}
                  className={`${inputCls} tabular-nums`}
                  value={form.maxMGoldRewardPerQuest}
                  onChange={e => set('maxMGoldRewardPerQuest', +e.target.value || 0)}
                />
              </Field>
              <div className="col-span-2 h-px bg-sky-ink/5" />
              <Field label={t('admin.subscriptionPage.form.bossModesLabel')} span>
                <ChipGroup
                  options={BOSS_MODE_OPTIONS}
                  selected={form.bossModes}
                  onChange={v => set('bossModes', v)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.aiModesLabel')} span>
                <p className="mb-1 text-[10px] font-medium text-sky-ink-3">{t('admin.subscriptionPage.form.aiModesHint')}</p>
                <ChipGroup
                  options={BOSS_MODE_OPTIONS}
                  selected={form.aiVerificationBossModes}
                  onChange={v => set('aiVerificationBossModes', v)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.proofTypesLabel')} span>
                <ChipGroup
                  options={PROOF_TYPE_OPTIONS}
                  selected={form.proofTypes}
                  onChange={v => set('proofTypes', v)}
                />
              </Field>
            </div>
          </div>

          {error && (
            <div className="relative flex items-start gap-2.5 overflow-hidden rounded-sky-chip bg-sky-rose/10 pl-4 pr-4 py-2.5 text-sm font-semibold text-sky-rose-deep">
              <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-rose" aria-hidden="true" />
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px" strokeWidth={2.5} aria-hidden="true" />
              <span className="min-w-0">{error}</span>
            </div>
          )}
        </form>

        {/* ── Modal footer (button binds to form via form="pkg-form") ── */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-white/65 bg-white/44 px-6 py-4">
          <SkyButton type="button" variant="secondary" onClick={onClose}>
            {t('admin.subscriptionPage.form.cancel')}
          </SkyButton>
          <SkyButton type="submit" form="pkg-form" variant="primary" disabled={saving}>
            {saving
              ? t('admin.subscriptionPage.form.saving')
              : mode === 'create'
                ? t('admin.subscriptionPage.form.createPackage')
                : t('admin.subscriptionPage.form.saveChanges')}
          </SkyButton>
        </div>
      </SkyCard>
    </div>,
    document.body
  );
};

// ─── Toggle Confirm Modal ────────────────────────────────────────────────────

interface ToggleModalProps {
  pkg: SubscriptionPackageDto;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const ToggleModal = ({ pkg, loading, onConfirm, onClose }: ToggleModalProps) => {
  const { t } = useTranslation();
  return createPortal(
    <div
      className="modal-content fixed inset-0 z-[99999] bg-sky-abyss/45 backdrop-blur-md flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <SkyCard variant="admin" className="sky-in p-0 overflow-hidden w-full max-w-md">
        {/* Switching a package off takes a paid tier away from users, so this
            header states the direction in colour, glyph and words at once. */}
        <div className={`relative flex items-center gap-3 overflow-hidden border-b border-white/65 px-6 py-4 ${pkg.isActive ? TONE.rose.wash : TONE.teal.wash}`}>
          <span className={`absolute left-0 top-0 h-full w-[3px] ${pkg.isActive ? TONE.rose.rail : TONE.teal.rail}`} aria-hidden="true" />
          <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ring-1 ${pkg.isActive ? TONE.rose.chip : TONE.teal.chip}`}>
            {pkg.isActive
              ? <PowerOff className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
              : <Power className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className={eyebrow}>{pkg.code}</p>
            <h2 className="truncate font-display text-base font-semibold leading-tight text-sky-ink">
              {pkg.isActive
                ? t('admin.subscriptionPage.toggleModal.deactivateTitle')
                : t('admin.subscriptionPage.toggleModal.activateTitle')}
            </h2>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm font-medium leading-relaxed text-sky-ink-2">
            {t('admin.subscriptionPage.toggleModal.areYouSure', {
              action: pkg.isActive
                ? t('admin.subscriptionPage.toggleModal.actionDeactivate')
                : t('admin.subscriptionPage.toggleModal.actionActivate'),
              codeName: `${pkg.code} — ${pkg.name}`,
            })}
          </p>
          {pkg.isActive && (
            <p className="relative mt-3 flex items-start gap-2 overflow-hidden rounded-sky-chip bg-sky-peach/14 pl-4 pr-3 py-2 text-xs font-semibold text-sky-peach-deep">
              <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-peach" aria-hidden="true" />
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" strokeWidth={2.5} aria-hidden="true" />
              <span className="min-w-0">{t('admin.subscriptionPage.toggleModal.deactivateMessage')}</span>
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-white/65 bg-white/44 px-6 py-4">
          <SkyButton type="button" variant="secondary" onClick={onClose}>
            {t('admin.subscriptionPage.toggleModal.cancel')}
          </SkyButton>
          <SkyButton
            type="button"
            variant={pkg.isActive ? 'destructive' : 'success'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? t('admin.subscriptionPage.toggleModal.processing')
              : t('admin.subscriptionPage.toggleModal.confirm')}
          </SkyButton>
        </div>
      </SkyCard>
    </div>,
    document.body
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminSubscriptionPage() {
  const { t } = useTranslation();
  const alert = useAlert();
  const [packages, setPackages] = useState<SubscriptionPackageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [page, setPage] = useState(1);

  // Modal state
  const [formModal, setFormModal] = useState<{
    mode: 'create' | 'edit';
    pkg?: SubscriptionPackageDto;
  } | null>(null);
  const [toggleTarget, setToggleTarget] = useState<SubscriptionPackageDto | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await adminSubscriptionApi.getPackages({ includeInactive: showInactive });
      if (!res.success) throw new Error(res.message);
      setPackages(res.data ?? []);
      setPage(1);
    } catch (e) {
      setFetchError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  // Client-side pagination (BE returns flat list, not paginated)
  const totalPages = Math.max(1, Math.ceil(packages.length / PAGE_SIZE));
  const pagedRows = packages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const res = await adminSubscriptionApi.toggleStatus(toggleTarget.packageId, {
        isActive: !toggleTarget.isActive,
      });
      if (!res.success) throw new Error(res.message);
      alert.success(
        t('admin.subscriptionPage.toastStatusChanged', {
          code: toggleTarget.code,
          status: !toggleTarget.isActive
            ? t('admin.subscriptionPage.statusActive')
            : t('admin.subscriptionPage.statusInactive'),
        })
      );
      setToggleTarget(null);
      fetchPackages();
    } catch (e) {
      alert.error(errMsg(e));
    } finally {
      setToggling(false);
    }
  };

  // Table headers translated at render time
  const tableHeaders = [
    t('admin.subscriptionPage.table.code'),
    t('admin.subscriptionPage.table.name'),
    t('admin.subscriptionPage.table.price'),
    t('admin.subscriptionPage.table.duration'),
    t('admin.subscriptionPage.table.tier'),
    t('admin.subscriptionPage.table.bossModes'),
    t('admin.subscriptionPage.table.status'),
    t('admin.subscriptionPage.table.actions'),
  ];

  return (
    <div className="p-6 space-y-6">

      {/* ── Page header ── */}
      <div className="sky-in flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid place-items-center w-12 h-12 shrink-0 rounded-sky-md bg-sky-violet/12 ring-1 ring-sky-violet/22 text-sky-violet-deep">
            <Package className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={eyebrow}>Monetisation</p>
            <h1 className="font-display text-sky-h2 font-semibold leading-tight text-sky-ink">
              {t('admin.subscriptionPage.pageTitle')}
            </h1>
            <p className="mt-0.5 text-sm font-medium text-sky-ink-2">
              {t('admin.subscriptionPage.pageSubtitle')}
            </p>
          </div>
        </div>
        <SkyButton type="button" variant="primary" onClick={() => setFormModal({ mode: 'create' })} className="whitespace-nowrap shrink-0">
          <Plus className="w-4 h-4" />
          {t('admin.subscriptionPage.newPackage')}
        </SkyButton>
      </div>

      {/* ── Filter bar ── */}
      {/* The filter and the resulting count sit in one recessed strip, so the
          number is read as a consequence of the switch beside it. */}
      <div className="flex flex-wrap items-center gap-3 rounded-sky-md bg-white/42 ring-1 ring-white/70 px-3 py-2">
        <label className="flex cursor-pointer select-none items-center gap-2 rounded-sky-chip bg-white/62 ring-1 ring-white/80 px-3 py-1.5 transition-colors hover:bg-white/78">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="w-4 h-4 accent-sky-deep cursor-pointer"
          />
          <span className="text-sm font-semibold text-sky-ink">
            {t('admin.subscriptionPage.showInactive')}
          </span>
        </label>
        <span className="text-xs font-medium text-sky-ink-2 tabular-nums">
          {t(`admin.subscriptionPage.packageCount_${packages.length !== 1 ? 'other' : 'one'}`, { count: packages.length })}
        </span>
      </div>

      {/* ── Data table card ── */}
      <SkyCard variant="admin" className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <p className={`animate-pulse ${eyebrow}`}>
              {t('admin.subscriptionPage.loading')}
            </p>
          </div>
        ) : fetchError ? (
          <div className="p-6">
            {/* A failed fetch is the operator's own request being rejected, so it
                keeps the same rose rail every error banner in the console uses. */}
            <div className="relative flex items-start gap-3 overflow-hidden rounded-sky-md bg-sky-rose/10 pl-4 pr-4 py-3.5">
              <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-rose" aria-hidden="true" />
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-sky-rose-deep" strokeWidth={2.5} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sky-rose-deep">{fetchError}</p>
                <SkyButton type="button" variant="secondary" size="sm" onClick={fetchPackages} className="mt-3">
                  {t('admin.subscriptionPage.retry')}
                </SkyButton>
              </div>
            </div>
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24">
            <span className="grid place-items-center w-14 h-14 rounded-sky-md bg-white/72 ring-1 ring-white/85 text-sky-ink-3">
              <Inbox className="w-6 h-6" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <p className="font-display text-sm font-semibold text-sky-ink">
              {t('admin.subscriptionPage.noPackages')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="sky-table-head border-b border-white/65">
                    {tableHeaders.map((h, idx) => (
                      <th
                        key={idx}
                        className={`whitespace-nowrap px-4 py-3 ${
                          [t('admin.subscriptionPage.table.price'), t('admin.subscriptionPage.table.duration')].includes(h)
                            ? 'text-right'
                            : 'text-center'
                        } ${h === t('admin.subscriptionPage.table.name') ? 'text-left' : ''} ${h === t('admin.subscriptionPage.table.code') ? 'text-left' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="sky-stagger">
                  {pagedRows.map((pkg) => (
                    <tr key={pkg.packageId} className="sky-table-row">
                      {/* Code */}
                      {/* The code is the identifier an operator searches for, so it
                          is set in mono — a look-alike character has to be spottable. */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[13px] font-semibold tracking-[0.06em] text-sky-deep">{pkg.code}</span>
                      </td>
                      {/* Name + description */}
                      <td className="px-4 py-3 max-w-50">
                        <div className="truncate font-display font-semibold text-sky-ink">{pkg.name}</div>
                        {pkg.description && (
                          <div className="mt-0.5 truncate text-xs font-medium text-sky-ink-3">
                            {pkg.description}
                          </div>
                        )}
                      </td>
                      {/* Price */}
                      {/* Price is money, so it takes the reward hue and the display
                          face — it's the number this table is scanned for. */}
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-display font-semibold text-sky-peach-deep tabular-nums">
                          <Gem className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                          {pkg.price.toLocaleString()}
                        </span>
                      </td>
                      {/* Duration */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-display font-semibold text-sky-ink-2 tabular-nums">
                          {pkg.durationDays === 0 ? t('admin.subscriptionPage.unlimited') : `${pkg.durationDays}d`}
                        </span>
                      </td>
                      {/* Reward Tier */}
                      <td className="px-4 py-3 text-center">
                        <RewardTierBadge tier={pkg.rewardTier} />
                      </td>
                      {/* Boss Modes */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {csvToArr(pkg.bossModes).map(m => (
                            <ModeChip key={m} label={m} />
                          ))}
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <StatusBadge isActive={pkg.isActive} />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <SkyButton type="button" variant="secondary" size="sm" onClick={() => setFormModal({ mode: 'edit', pkg })}>
                            {t('admin.subscriptionPage.editBtn')}
                          </SkyButton>
                          <SkyButton
                            type="button"
                            variant={pkg.isActive ? 'destructive' : 'success'}
                            size="sm"
                            onClick={() => setToggleTarget(pkg)}
                          >
                            {pkg.isActive
                              ? t('admin.subscriptionPage.deactivateBtn')
                              : t('admin.subscriptionPage.activateBtn')}
                          </SkyButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/65 px-4 py-3">
                <span className="text-xs font-medium text-sky-ink-2 tabular-nums">
                  {t('admin.subscriptionPage.paginationInfo', { page, totalPages, total: packages.length })}
                </span>
                <div className="flex items-center gap-1.5">
                  <SkyButton type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-3.5 h-3.5" /> {t('admin.subscriptionPage.prevPage')}
                  </SkyButton>
                  {/* The page numbers share one recessed track, so the current page
                      is the only thing lifting out of a row of look-alike digits. */}
                  <div className="flex items-center gap-1 rounded-sky-md bg-white/42 ring-1 ring-white/70 p-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        aria-current={p === page ? 'page' : undefined}
                        aria-label={`Page ${p}`}
                        className={`rounded-sky-chip px-3 py-1.5 text-xs font-semibold tabular-nums transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          p === page
                            ? 'bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-chip'
                            : 'text-sky-ink-2 hover:bg-white/70 hover:text-sky-ink'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <SkyButton type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    {t('admin.subscriptionPage.nextPage')} <ChevronRight className="w-3.5 h-3.5" />
                  </SkyButton>
                </div>
              </div>
            )}
          </>
        )}
      </SkyCard>

      {/* ── Modals ── */}
      {formModal && (
        <PackageFormModal
          mode={formModal.mode}
          initial={formModal.pkg}
          onClose={() => setFormModal(null)}
          onSuccess={() => {
            const msg = formModal.mode === 'create'
              ? t('admin.subscriptionPage.toastCreated')
              : t('admin.subscriptionPage.toastUpdated');
            setFormModal(null);
            alert.success(msg);
            fetchPackages();
          }}
        />
      )}

      {toggleTarget && (
        <ToggleModal
          pkg={toggleTarget}
          loading={toggling}
          onConfirm={handleToggleConfirm}
          onClose={() => setToggleTarget(null)}
        />
      )}

    </div>
  );
}
