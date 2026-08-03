import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
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

// ─── Shared style tokens ─────────────────────────────────────────────────────

const inputCls = [
  'w-full rounded-sky-chip border border-sky-surf-border px-3 py-2',
  'bg-white text-sm font-medium text-sky-ink',
  'focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20',
].join(' ');

const labelCls =
  'block text-[10px] font-bold text-sky-ink-3 mb-1 uppercase tracking-widest';

// ─── Micro-components ────────────────────────────────────────────────────────

const StatusBadge = ({ isActive }: { isActive: boolean }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
        isActive ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-success-500' : 'bg-error-500'}`} />
      {isActive ? t('admin.subscriptionPage.statusActive') : t('admin.subscriptionPage.statusInactive')}
    </span>
  );
};

const tierColors: Record<string, string> = {
  Basic: 'bg-sky-deep/10 text-sky-deep',
  Standard: 'bg-violet-100 text-violet-800',
  Premium: 'bg-warning-100 text-warning-800',
};
const RewardTierBadge = ({ tier }: { tier: string }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${tierColors[tier] ?? 'bg-gray-100 text-gray-700'}`}>
    {tier.toUpperCase()}
  </span>
);

const ModeChip = ({ label }: { label: string }) => (
  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-sky-ink-2">
    {label}
  </span>
);

// Multi-select toggle chip group
const ChipGroup = ({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) => (
  <div className="flex flex-wrap gap-2 mt-1">
    {options.map(opt => {
      const active = selected.includes(opt);
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(active ? selected.filter(s => s !== opt) : [...selected, opt])}
          className={`px-3 py-1 text-xs font-bold rounded-sky-chip transition-all select-none ${
            active
              ? 'bg-warning-300 text-sky-ink'
              : 'bg-white border border-sky-surf-border text-sky-ink-3 hover:border-sky-deep hover:text-sky-ink'
          }`}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

const SectionHeader = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="h-4 w-1.5 bg-warning-400 rounded-full shrink-0" />
    <h3 className="text-xs font-bold text-sky-ink uppercase tracking-widest whitespace-nowrap">
      {label}
    </h3>
    <div className="flex-1 h-px bg-sky-ink/10" />
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
      className="modal-content fixed inset-0 z-[99999] bg-sky-ink/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <SkyCard variant="admin" className="p-0 overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-warning-50 shrink-0">
          <h2 className="text-base font-bold text-sky-ink uppercase tracking-widest">
            {mode === 'create'
              ? t('admin.subscriptionPage.form.newTitle')
              : t('admin.subscriptionPage.form.editTitle', { code: initial?.code })}
          </h2>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close modal">
            <X className="w-4 h-4" />
          </SkyButton>
        </div>

        {/* ── Scrollable form ── */}
        <form
          id="pkg-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-7 bg-white"
        >
          {/* Section A: Basic Info */}
          <div>
            <SectionHeader label={t('admin.subscriptionPage.form.sectionBasic')} />
            <div className="grid grid-cols-2 gap-3">
              {mode === 'create' && (
                <Field label={t('admin.subscriptionPage.form.codeLabel')}>
                  <input
                    required
                    maxLength={50}
                    placeholder={t('admin.subscriptionPage.form.codePlaceholder')}
                    className={inputCls}
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
                  className={inputCls}
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
                  className={inputCls}
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
            <SectionHeader label={t('admin.subscriptionPage.form.sectionParty')} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.subscriptionPage.form.maxPartiesLabel')}>
                <input
                  required
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.maxParties}
                  onChange={e => set('maxParties', +e.target.value || 1)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.maxMembersLabel')}>
                <input
                  required
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.maxMembersPerParty}
                  onChange={e => set('maxMembersPerParty', +e.target.value || 1)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.partyQuestsLabel')} span>
                <input
                  required
                  type="number"
                  min={0}
                  className={inputCls}
                  value={form.partyQuestsPerWeek}
                  onChange={e => set('partyQuestsPerWeek', +e.target.value || 0)}
                />
              </Field>
            </div>
          </div>

          {/* Section C: Quest & Boss Limits */}
          <div>
            <SectionHeader label={t('admin.subscriptionPage.form.sectionQuest')} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.subscriptionPage.form.memberQuestsLabel')}>
                <input
                  required
                  type="number"
                  min={0}
                  className={inputCls}
                  value={form.questsPerMemberPerDay}
                  onChange={e => set('questsPerMemberPerDay', +e.target.value || 0)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.maxDamageLabel')}>
                <input
                  required
                  type="number"
                  min={0}
                  className={inputCls}
                  value={form.maxDamagePerQuest}
                  onChange={e => set('maxDamagePerQuest', +e.target.value || 0)}
                />
              </Field>
              <Field label={t('admin.subscriptionPage.form.maxGoldLabel')}>
                <input
                  required
                  type="number"
                  min={0}
                  className={inputCls}
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
                <p className="text-[10px] text-sky-ink-3 mb-1">{t('admin.subscriptionPage.form.aiModesHint')}</p>
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
            <div className="bg-error-50 text-error-700 px-4 py-2.5 rounded-sky-chip text-sm font-bold">
              ⚠ {error}
            </div>
          )}
        </form>

        {/* ── Modal footer (button binds to form via form="pkg-form") ── */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0 bg-white">
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
      className="modal-content fixed inset-0 z-[99999] bg-sky-ink/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <SkyCard variant="admin" className="p-0 overflow-hidden w-full max-w-md">
        <div className={`px-6 py-4 border-b border-gray-200 ${pkg.isActive ? 'bg-error-100' : 'bg-success-100'}`}>
          <h2 className="text-base font-bold text-sky-ink uppercase tracking-widest">
            {pkg.isActive
              ? t('admin.subscriptionPage.toggleModal.deactivateTitle')
              : t('admin.subscriptionPage.toggleModal.activateTitle')}
          </h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-sky-ink-2 font-medium leading-relaxed">
            {t('admin.subscriptionPage.toggleModal.areYouSure', {
              action: pkg.isActive
                ? t('admin.subscriptionPage.toggleModal.actionDeactivate')
                : t('admin.subscriptionPage.toggleModal.actionActivate'),
              codeName: `${pkg.code} — ${pkg.name}`,
            })}
          </p>
          {pkg.isActive && (
            <p className="mt-2 text-xs font-bold text-error-500">
              {t('admin.subscriptionPage.toggleModal.deactivateMessage')}
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-sky-ink uppercase tracking-tight">
            {t('admin.subscriptionPage.pageTitle')}
          </h1>
          <p className="text-sm text-sky-ink-3 mt-1 font-medium">
            {t('admin.subscriptionPage.pageSubtitle')}
          </p>
        </div>
        <SkyButton type="button" variant="primary" onClick={() => setFormModal({ mode: 'create' })} className="whitespace-nowrap shrink-0">
          <Plus className="w-4 h-4" />
          {t('admin.subscriptionPage.newPackage')}
        </SkyButton>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="w-4 h-4 accent-sky-deep cursor-pointer"
          />
          <span className="text-sm font-bold text-sky-ink-2">
            {t('admin.subscriptionPage.showInactive')}
          </span>
        </label>
        <span className="text-xs text-sky-ink-3 font-medium">
          {t(`admin.subscriptionPage.packageCount_${packages.length !== 1 ? 'other' : 'one'}`, { count: packages.length })}
        </span>
      </div>

      {/* ── Data table card ── */}
      <SkyCard variant="admin" className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <p className="text-sky-ink-3 font-bold uppercase tracking-widest text-sm animate-pulse">
              {t('admin.subscriptionPage.loading')}
            </p>
          </div>
        ) : fetchError ? (
          <div className="py-24 text-center">
            <p className="text-error-500 font-bold text-sm">{fetchError}</p>
            <SkyButton type="button" variant="primary" size="sm" onClick={fetchPackages} className="mt-4">
              {t('admin.subscriptionPage.retry')}
            </SkyButton>
          </div>
        ) : packages.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-sky-ink-3 font-bold text-sm">
              {t('admin.subscriptionPage.noPackages')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/60">
                    {tableHeaders.map((h, idx) => (
                      <th
                        key={idx}
                        className={`px-4 py-3 font-bold uppercase tracking-widest text-xs whitespace-nowrap text-sky-ink-3 ${
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
                <tbody>
                  {pagedRows.map((pkg) => (
                    <tr key={pkg.packageId} className="sky-table-row">
                      {/* Code */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-sky-deep tracking-wider">{pkg.code}</span>
                      </td>
                      {/* Name + description */}
                      <td className="px-4 py-3 max-w-50">
                        <div className="font-bold text-sky-ink truncate">{pkg.name}</div>
                        {pkg.description && (
                          <div className="text-xs text-sky-ink-3 truncate mt-0.5">
                            {pkg.description}
                          </div>
                        )}
                      </td>
                      {/* Price */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-success-600 whitespace-nowrap">
                          💎 {pkg.price.toLocaleString()}
                        </span>
                      </td>
                      {/* Duration */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-sky-ink-2">
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <span className="text-xs font-bold text-sky-ink-3">
                  {t('admin.subscriptionPage.paginationInfo', { page, totalPages, total: packages.length })}
                </span>
                <div className="flex items-center gap-1.5">
                  <SkyButton type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-3.5 h-3.5" /> {t('admin.subscriptionPage.prevPage')}
                  </SkyButton>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-sky-chip transition-all ${
                        p === page
                          ? 'bg-sky-deep text-white'
                          : 'border border-sky-surf-border text-sky-ink-2 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
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
