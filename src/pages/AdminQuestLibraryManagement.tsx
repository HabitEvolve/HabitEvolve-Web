import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Pencil, Trash2, X, Loader2,
  ToggleLeft, ToggleRight, ShieldAlert,
  ChevronDown, ChevronUp, Users, Coins,
  Check, Archive, PencilLine, AlertTriangle, Trophy,
  Sparkles, Star, Gem, Swords, Library, BookOpen, Search,
  Globe, Minus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import PageHeader from '../components/common/PageHeader';
import Pagination from '../components/common/SkyPagination';
import { adminQuestLibraryApi } from '../api/adminQuestLibraryApi';
import { adminGoalApi } from '../api/adminGoalApi';
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';
import type {
  QuestLibraryItemDto, QuestLibraryDifficulty, QuestLibraryStatus,
  RepeatRule, CreateQuestLibraryItemPayload, UpdateQuestLibraryItemPayload,
  SetRewardMatrixPayload, SetPersonalizationPayload,
  VerificationTag,
} from '../types/adminQuestLibrary.types';
import type { GoalDto } from '../types/adminGoal.types';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const DIFFICULTIES: QuestLibraryDifficulty[] = ['EASY', 'NORMAL', 'HARD', 'EPIC'];
const STATUSES: QuestLibraryStatus[] = ['Draft', 'Published', 'Archived'];
const REPEAT_RULES: RepeatRule[] = ['Daily', 'Weekly', 'Monthly', 'OneTime'];
const PROOF_TYPES = ['SELF_CHECK', 'PHOTO', 'VIDEO', 'TEXT_LOG', 'SCREENSHOT', 'TIMER', 'GPS', 'STEP_COUNTER'];
const VERIFICATION_TAGS: VerificationTag[] = ['FACE', 'ITEM', 'ACTION'];
const HOW_TO_SUBMIT_MAX = 500;

// ─── Style helpers ────────────────────────────────────────────────────────────
const inputCls = [
  'w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80',
  'text-sky-ink text-sm font-medium transition-shadow',
  'focus:outline-none focus:ring-2 focus:ring-sky-deep/45',
  'placeholder:text-sky-ink-3 disabled:opacity-55',
].join(' ');

const filterSelectCls = [
  'px-3 py-2 rounded-sky-chip bg-white/70 ring-1 ring-white/80',
  'text-xs font-semibold text-sky-ink transition-shadow',
  'focus:outline-none focus:ring-2 focus:ring-sky-deep/45',
].join(' ');

const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3';
const fieldLabel = `block mb-1.5 ${eyebrow}`;

// One hue per meaning, reused everywhere that meaning appears — chip, modal
// header, selection rail. deep = the operational default (goals, quantities),
// peach = reward and attention, dmg = damage, violet = the quest-template
// concept itself and Epic, teal = the one genuinely successful state
// (Published), rose = destructive, neutral = no state yet (Draft).
type Tone = 'deep' | 'peach' | 'dmg' | 'violet' | 'teal' | 'rose' | 'neutral';
const TONE: Record<Tone, { chip: string; wash: string; rail: string }> = {
  deep:    { chip: 'bg-sky-deep/12 ring-sky-deep/22 text-sky-deep',            wash: 'bg-sky-deep/8',    rail: 'bg-sky-deep' },
  peach:   { chip: 'bg-sky-peach/20 ring-sky-peach/32 text-sky-peach-deep',    wash: 'bg-sky-peach/14',  rail: 'bg-sky-peach' },
  dmg:     { chip: 'bg-sky-dmg/14 ring-sky-dmg/26 text-sky-dmg-deep',          wash: 'bg-sky-dmg/10',    rail: 'bg-sky-dmg' },
  violet:  { chip: 'bg-sky-violet/14 ring-sky-violet/26 text-sky-violet-deep', wash: 'bg-sky-violet/10', rail: 'bg-sky-violet' },
  teal:    { chip: 'bg-sky-teal-bg ring-sky-teal/26 text-sky-teal',            wash: 'bg-sky-teal/10',   rail: 'bg-sky-teal' },
  rose:    { chip: 'bg-sky-rose/14 ring-sky-rose/26 text-sky-rose-deep',       wash: 'bg-sky-rose/10',   rail: 'bg-sky-rose' },
  neutral: { chip: 'bg-white/72 ring-white/85 text-sky-ink-2',                 wash: 'bg-white/48',      rail: 'bg-sky-ink/22' },
};

// Difficulty is a category, not a verdict — Easy isn't "good" and Epic isn't
// "bad" — so the ramp is picked for separation at a glance and deliberately
// spends no teal: on this screen teal means Published and nothing else.
const DIFF_CFG: Record<QuestLibraryDifficulty, { label: string; cls: string }> = {
  EASY:   { label: 'Easy',   cls: TONE.neutral.chip },
  NORMAL: { label: 'Normal', cls: TONE.deep.chip },
  HARD:   { label: 'Hard',   cls: TONE.peach.chip },
  EPIC:   { label: 'Epic',   cls: TONE.violet.chip },
};

// Status carries a glyph as well as a hue, so Published never relies on colour
// alone to be told apart from Draft.
const STATUS_CFG: Record<QuestLibraryStatus, { cls: string; Icon: LucideIcon }> = {
  Draft:     { cls: TONE.neutral.chip, Icon: PencilLine },
  Published: { cls: TONE.teal.chip,    Icon: Check },
  Archived:  { cls: TONE.rose.chip,    Icon: Archive },
};

// ─── Portal ───────────────────────────────────────────────────────────────────
const Portal = ({ children }: { children: React.ReactNode }) =>
  createPortal(children, document.body);

// ─── Shared modal chrome ──────────────────────────────────────────────────────
// Every modal here opens with the same header shape — tinted strip, left rail,
// icon chip, eyebrow, display-face title — so tone is the only thing that
// changes between them and an operator learns the layout once.
function ModalHead({ Icon, eyebrowText, title, tone, onClose }: {
  Icon: LucideIcon; eyebrowText: string; title: string; tone: Tone; onClose(): void;
}) {
  return (
    <div className={`relative flex items-center justify-between gap-3 shrink-0 overflow-hidden border-b border-white/65 p-5 ${TONE[tone].wash}`}>
      <span className={`absolute left-0 top-0 h-full w-[3px] ${TONE[tone].rail}`} aria-hidden="true" />
      <div className="flex items-center gap-3 min-w-0">
        <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ring-1 ${TONE[tone].chip}`}>
          <Icon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={eyebrow}>{eyebrowText}</p>
          <h2 className="font-display text-sky-h3 font-semibold leading-tight text-sky-ink truncate">{title}</h2>
        </div>
      </div>
      <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
        <X className="w-5 h-5" />
      </SkyButton>
    </div>
  );
}

// A missing goal mapping isn't an error the operator caused — it's a
// precondition to notice — so it reads on the peach attention tone with a rail
// and a glyph rather than as a red failure.
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-start gap-2.5 overflow-hidden rounded-sky-chip bg-sky-peach/14 pl-4 pr-3.5 py-2.5">
      <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-peach" aria-hidden="true" />
      <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-peach-deep" strokeWidth={2.2} aria-hidden="true" />
      <p className="text-xs font-semibold text-sky-peach-deep">{children}</p>
    </div>
  );
}

// ─── Goal picker row ──────────────────────────────────────────────────────────
// Shared by both places a quest gets mapped to goals. Goal = deep, matching the
// Goal & Task Engine screen, so one concept doesn't get two colour languages.
function GoalPickRow({ goal, checked, onToggle }: {
  goal: GoalDto; checked: boolean; onToggle(): void;
}) {
  return (
    <label className={`relative flex items-center gap-3 px-4 py-2.5 cursor-pointer overflow-hidden transition-colors ${checked ? TONE.deep.wash : 'hover:bg-white/62'}`}>
      {/* Selection is carried by a rail and a tick as well as the tint, so a run
          of picked rows stays readable without counting checkboxes. */}
      {checked && <span className={`absolute left-0 top-0 h-full w-[3px] ${TONE.deep.rail}`} aria-hidden="true" />}
      <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
      <span className="grid place-items-center w-[18px] h-[18px] shrink-0 rounded-[6px] bg-white/80 ring-1 ring-white/85 text-white transition-all peer-checked:bg-sky-deep peer-checked:ring-sky-deep peer-focus-visible:ring-2 peer-focus-visible:ring-sky-deep/55">
        <Check className={`w-3 h-3 transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-sky-ink truncate">{goal.goalName}</p>
        <p className="text-[10px] font-mono text-sky-ink-3">{goal.goalCode}</p>
      </div>
    </label>
  );
}

const goalListCls = 'rounded-sky-md bg-white/45 ring-1 ring-white/70 divide-y divide-white/70 overflow-hidden';

// ─── Reward Modal ─────────────────────────────────────────────────────────────
function RewardModal({ item, onClose, onSaved }: {
  item: QuestLibraryItemDto;
  onClose(): void;
  onSaved(): void;
}) {
  const [gold, setGold] = useState(item.rewardGold);
  const [bonusGold, setBonusGold] = useState(item.rewardBonusGold);
  const [xp, setXp] = useState(item.rewardXp);
  const [gems, setGems] = useState(item.rewardGems);
  const [saving, setSaving] = useState(false);
  const alert = useAlert();

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminQuestLibraryApi.setRewardMatrix(item.templateId, { gold, bonusGold, xp, gems } as SetRewardMatrixPayload);
      alert.success('Rewards saved.');
      onSaved();
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Failed to save rewards.');
    } finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="p-0 overflow-hidden w-full max-w-md">
          <ModalHead Icon={Trophy} eyebrowText="Reward matrix" title="Edit Rewards" tone="peach" onClose={onClose} />
          <div className="p-5 space-y-4">
            {/* Which quest is being repriced is the one fact that must not be
                misread here, so it gets its own labelled slot instead of a
                caption that scans as decoration. */}
            <div className="rounded-sky-chip bg-white/62 ring-1 ring-white/80 px-3.5 py-2.5">
              <p className={eyebrow}>Quest</p>
              <p className="text-sm font-semibold text-sky-ink truncate">{item.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Gold', Icon: Coins, tone: 'peach' as Tone, val: gold, set: setGold },
                { label: 'Bonus Gold', Icon: Sparkles, tone: 'peach' as Tone, val: bonusGold, set: setBonusGold },
                { label: 'XP', Icon: Star, tone: 'deep' as Tone, val: xp, set: setXp },
                { label: 'Gems', Icon: Gem, tone: 'violet' as Tone, val: gems, set: setGems },
              ].map(f => (
                <div key={f.label}>
                  <label className={`flex items-center gap-1.5 mb-1.5 ${eyebrow}`}>
                    <span className={`grid place-items-center w-5 h-5 shrink-0 rounded-[7px] ring-1 ${TONE[f.tone].chip}`}>
                      <f.Icon className="w-3 h-3" strokeWidth={2.4} aria-hidden="true" />
                    </span>
                    {f.label}
                  </label>
                  <input
                    type="number" min={0}
                    value={f.val}
                    onChange={e => f.set(Number(e.target.value))}
                    className={`${inputCls} tabular-nums`}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
              <SkyButton type="button" variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />} Save
              </SkyButton>
            </div>
          </div>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── Goals Modal ──────────────────────────────────────────────────────────────
function GoalsModal({ item, allGoals, onClose, onSaved }: {
  item: QuestLibraryItemDto;
  allGoals: GoalDto[];
  onClose(): void;
  onSaved(): void;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>(item.goalIds ?? []);
  const [saving, setSaving] = useState(false);
  const alert = useAlert();

  const toggle = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const handleSave = async () => {
    if (selectedIds.length === 0) { alert.error('Must keep at least 1 goal.'); return; }
    setSaving(true);
    try {
      await adminQuestLibraryApi.setPersonalization(item.templateId, { goalIds: selectedIds } as SetPersonalizationPayload);
      alert.success('Goal mappings updated.');
      onSaved();
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Failed to update goals.');
    } finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="p-0 overflow-hidden w-full max-w-md flex flex-col max-h-[80vh]">
          <ModalHead Icon={Users} eyebrowText="Personalization" title="Edit Goal Mappings" tone="deep" onClose={onClose} />
          <div className="p-5 space-y-3 overflow-y-auto flex-1">
            <div className="rounded-sky-chip bg-white/62 ring-1 ring-white/80 px-3.5 py-2.5">
              <p className={eyebrow}>Quest</p>
              <p className="text-sm font-semibold text-sky-ink truncate">{item.title}</p>
            </div>
            {/* Saving replaces the whole mapping rather than adding to it, so the
                live count sits beside that warning instead of under the list. */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-sky-ink-2">Thay thế toàn bộ goal mappings.</p>
              <span className={`shrink-0 inline-flex items-center rounded-sky-chip ring-1 px-2 py-0.5 text-[11px] font-semibold tabular-nums ${TONE.deep.chip}`}>
                {selectedIds.length} selected
              </span>
            </div>
            {allGoals.length === 0 ? (
              <Notice>No goals found.</Notice>
            ) : (
              <div className={goalListCls}>
                {allGoals.map(g => (
                  <GoalPickRow key={g.goalId} goal={g} checked={selectedIds.includes(g.goalId)} onToggle={() => toggle(g.goalId)} />
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 px-5 py-4 border-t border-white/65 shrink-0">
            <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
            <SkyButton type="button" variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Save Goals
            </SkyButton>
          </div>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── Quest Form Modal ─────────────────────────────────────────────────────────
function QuestFormModal({ editing, allGoals, onSave, onClose, onGlobalToggled }: {
  editing: QuestLibraryItemDto | null;
  allGoals: GoalDto[];
  onSave(payload: CreateQuestLibraryItemPayload | UpdateQuestLibraryItemPayload, isNew: boolean): Promise<void>;
  onClose(): void;
  onGlobalToggled(): void;
}) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [difficulty, setDifficulty] = useState<QuestLibraryDifficulty>(editing?.difficulty ?? 'EASY');
  const [proofType, setProofType] = useState(editing?.proofType ?? 'SELF_CHECK');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>(editing?.repeatRule ?? 'Daily');
  const [damage, setDamage] = useState(editing?.damage ?? 10);
  // Reward fields — only for create
  const [gold, setGold] = useState(editing?.rewardGold ?? 50);
  const [bonusGold, setBonusGold] = useState(editing?.rewardBonusGold ?? 0);
  const [xp, setXp] = useState(editing?.rewardXp ?? 100);
  const [gems, setGems] = useState(editing?.rewardGems ?? 0);
  const [selectedGoalIds, setSelectedGoalIds] = useState<number[]>(editing?.goalIds ?? []);
  const [howToSubmit, setHowToSubmit] = useState(editing?.howToSubmit ?? '');
  const [verificationTags, setVerificationTags] = useState(editing?.verificationTags ?? '');
  const [isGlobal, setIsGlobal] = useState(editing?.isGlobal ?? false);
  const [togglingGlobal, setTogglingGlobal] = useState(false);
  const [saving, setSaving] = useState(false);
  const alert = useAlert();

  // Global is a standalone flag (its own endpoint, PATCH .../global) — flips immediately
  // rather than waiting for "Save Changes", same as the list row's Publish/Archive toggles.
  const handleToggleGlobal = async () => {
    if (!editing) return;
    const next = !isGlobal;
    setTogglingGlobal(true);
    try {
      await adminQuestLibraryApi.toggleGlobal(editing.templateId, { isGlobal: next });
      setIsGlobal(next);
      // Matches the "[Global] ..." naming already used by every seeded global quest — auto-prefix
      // on enable so an admin doesn't have to remember/type it by hand. Only affects the title
      // input here; still needs "Save Changes" to persist, same as any other field in this form.
      if (next && !title.trimStart().startsWith('[Global]')) {
        setTitle(prev => `[Global] ${prev}`.trim());
      }
      onGlobalToggled();
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Failed to update Global status.');
    } finally { setTogglingGlobal(false); }
  };

  const toggleGoal = (id: number) =>
    setSelectedGoalIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const selectedTags = (verificationTags ?? '')
    .split(',').map(s => s.trim()).filter(Boolean) as VerificationTag[];
  const toggleTag = (tag: VerificationTag) => {
    const next = selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag];
    setVerificationTags(next.join(','));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert.error('Title is required.'); return; }
    if (!editing && selectedGoalIds.length === 0) { alert.error('Map to at least 1 goal.'); return; }
    setSaving(true);
    try {
      if (editing) {
        const payload: UpdateQuestLibraryItemPayload = {
          templateId: editing.templateId,
          title: title.trim(),
          description: desc.trim() || undefined,
          difficulty,
          damage,
          proofType,
          repeatRule,
          howToSubmit: howToSubmit.trim() || undefined,
          verificationTags: verificationTags || undefined,
        };
        if (gold !== editing.rewardGold) {
          await adminQuestLibraryApi.setRewardMatrix(editing.templateId, {
            gold, bonusGold: editing.rewardBonusGold, xp: editing.rewardXp, gems: editing.rewardGems,
          });
        }
        await onSave(payload, false);
      } else {
        const payload: CreateQuestLibraryItemPayload = {
          title: title.trim(),
          description: desc.trim() || undefined,
          difficulty,
          damage,
          proofType,
          repeatRule,
          rewardGold: gold,
          rewardBonusGold: bonusGold,
          rewardXp: xp,
          rewardGems: gems,
          goalIds: selectedGoalIds,
          howToSubmit: howToSubmit.trim() || undefined,
          verificationTags: verificationTags || undefined,
        };
        await onSave(payload, true);
      }
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="p-0 overflow-hidden w-full max-w-xl max-h-[90vh] flex flex-col">
          <ModalHead
            Icon={BookOpen}
            eyebrowText="Quest template"
            title={editing ? 'Edit Quest' : 'New Quest'}
            tone="violet"
            onClose={onClose}
          />

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className={fieldLabel}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Drink 2L of water" required />
            </div>

            <div>
              <label className={fieldLabel}>Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inputCls} placeholder="Optional details…" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={fieldLabel}>Difficulty *</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as QuestLibraryDifficulty)} className={inputCls}>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_CFG[d].label}</option>)}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Proof Type *</label>
                <select value={proofType} onChange={e => setProofType(e.target.value)} className={inputCls}>
                  {PROOF_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>Repeat *</label>
                <select value={repeatRule} onChange={e => setRepeatRule(e.target.value as RepeatRule)} className={inputCls}>
                  {REPEAT_RULES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={fieldLabel}>Damage</label>
              <input type="number" min={0} value={damage} onChange={e => setDamage(Number(e.target.value))} className={`${inputCls} tabular-nums`} />
            </div>

            {/* Global is its own concept (bypasses the daily 5-quest limit, shown to every
                player regardless of goal selection) — its own plated row, same shape as the
                isActive toggle on Target Rules, so an operator recognises the control on sight. */}
            {editing && (
              <div className={`relative flex items-center justify-between gap-4 overflow-hidden rounded-sky-md pl-4 pr-4 py-3.5 ring-1 ring-white/78 ${
                isGlobal ? TONE.violet.wash : 'bg-white/48'
              }`}>
                <span className={`absolute left-0 top-0 h-full w-[3px] ${isGlobal ? TONE.violet.rail : 'bg-sky-ink/18'}`} aria-hidden="true" />
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className={`grid place-items-center w-8 h-8 shrink-0 rounded-sky-chip ring-1 ${TONE.violet.chip}`}>
                    <Globe className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-sky-ink">Global Quest</p>
                    <p className="text-xs text-sky-ink-2 font-medium mt-0.5">Shown to every player, doesn't count toward the daily 5-quest limit.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleGlobal}
                  disabled={togglingGlobal}
                  aria-pressed={isGlobal}
                  className={`group relative shrink-0 inline-flex items-center w-[74px] h-7 rounded-full ring-1 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/50 disabled:opacity-60 ${
                    isGlobal ? 'bg-sky-violet ring-sky-violet/40' : 'bg-sky-ink/14 ring-white/70'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 grid place-items-center w-6 h-6 rounded-full bg-white shadow-sky-chip transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isGlobal ? 'translate-x-[46px]' : 'translate-x-0'
                    }`}
                  >
                    {togglingGlobal
                      ? <Loader2 className="w-3 h-3 animate-spin text-sky-ink-3" aria-hidden="true" />
                      : isGlobal
                        ? <Check className="w-3 h-3 text-sky-violet" strokeWidth={3} aria-hidden="true" />
                        : <Minus className="w-3 h-3 text-sky-ink-3" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  <span className={`absolute text-[10px] font-semibold uppercase tracking-[0.1em] transition-opacity ${
                    isGlobal ? 'left-3 text-white opacity-100' : 'right-3 text-sky-ink-2 opacity-100'
                  }`}>
                    {isGlobal ? 'On' : 'Off'}
                  </span>
                </button>
              </div>
            )}

            <div>
              <label className={fieldLabel}>
                How To Submit
                <span className="ml-1.5 text-[10px] font-normal normal-case text-sky-ink-3">{howToSubmit.length}/{HOW_TO_SUBMIT_MAX}</span>
              </label>
              <textarea
                value={howToSubmit}
                onChange={e => setHowToSubmit(e.target.value)}
                rows={2}
                maxLength={HOW_TO_SUBMIT_MAX}
                className={inputCls}
                placeholder="Player-facing submission instructions…"
              />
              <p className="text-[10px] text-sky-ink-3 mt-1.5 leading-relaxed">
                This text is sent to the AI verifier along with the player's proof — write it as an instruction the AI should check against, not just a note for the player.
              </p>
            </div>

            <div>
              <label className={fieldLabel}>Verification Tags</label>
              {/* Verification method is a category, not a verdict — it gets the
                  violet game hue, and a tick rather than a colour swap alone so
                  which tags are on survives a glance. */}
              <div className="flex flex-wrap gap-2">
                {VERIFICATION_TAGS.map(tag => {
                  const on = selectedTags.includes(tag);
                  return (
                    <label
                      key={tag}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sky-chip ring-1 text-xs font-semibold cursor-pointer transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] focus-within:ring-2 focus-within:ring-sky-deep/45 ${on ? TONE.violet.chip : 'bg-white/62 ring-white/80 text-sky-ink-2 hover:bg-white/80 hover:text-sky-ink'}`}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggleTag(tag)} className="sr-only" />
                      <Check className={`w-3.5 h-3.5 transition-opacity ${on ? 'opacity-100' : 'opacity-25'}`} strokeWidth={2.6} aria-hidden="true" />
                      {tag}
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-sky-ink-3 mt-2 leading-relaxed">
                <strong className="font-semibold text-sky-ink-2">FACE</strong> blocks submission until the player verifies their portrait; ITEM/ACTION are hints only.
              </p>
            </div>

            {/* Rewards — full matrix on create; edit only re-prices Gold here (Bonus/XP/Gems
                stay in the dedicated Edit Rewards modal since it's the one place that also
                explains the payout grid). */}
            <div>
              <p className={`mb-2 ${eyebrow}`}>Rewards</p>
              <div className="grid grid-cols-4 gap-2">
                {editing ? (
                  <div>
                    <label className={fieldLabel}>Gold</label>
                    <input type="number" min={0} value={gold} onChange={e => setGold(Number(e.target.value))} className={`${inputCls} tabular-nums`} />
                  </div>
                ) : [
                  { label: 'Gold', val: gold, set: setGold },
                  { label: '+Bonus', val: bonusGold, set: setBonusGold },
                  { label: 'XP', val: xp, set: setXp },
                  { label: 'Gems', val: gems, set: setGems },
                ].map(f => (
                  <div key={f.label}>
                    <label className={fieldLabel}>{f.label}</label>
                    <input type="number" min={0} value={f.val} onChange={e => f.set(Number(e.target.value))} className={`${inputCls} tabular-nums`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Goals — only for create */}
            {!editing && (
              <div>
                <label className={`block mb-2 ${eyebrow}`}>
                  Map to Goals * <span className="text-[10px] font-normal normal-case text-sky-ink-3">({selectedGoalIds.length} selected)</span>
                </label>
                {allGoals.length === 0 ? (
                  <Notice>No goals available. Create goals first.</Notice>
                ) : (
                  <div className={`max-h-36 overflow-y-auto ${goalListCls}`}>
                    {allGoals.map(g => (
                      <GoalPickRow key={g.goalId} goal={g} checked={selectedGoalIds.includes(g.goalId)} onToggle={() => toggleGoal(g.goalId)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {editing && (
              <p className="text-xs text-sky-ink-2 bg-white/62 ring-1 ring-white/80 rounded-sky-chip px-3.5 py-2.5 leading-relaxed">
                Dùng <strong className="font-semibold text-sky-ink">Edit Goals</strong> để cập nhật goal mappings.
                Dùng <strong className="font-semibold text-sky-ink">Rewards</strong> để cập nhật phần thưởng.
              </p>
            )}
          </form>

          <div className="flex gap-3 px-5 py-4 border-t border-white/65 shrink-0">
            <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
            <SkyButton type="submit" variant="primary" disabled={saving} onClick={handleSubmit} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editing ? 'Save Changes' : 'Create Quest'}
            </SkyButton>
          </div>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ title, onConfirm, onCancel, loading }: {
  title: string; onConfirm(): void; onCancel(): void; loading: boolean;
}) {
  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ring-1 ${TONE.rose.chip}`}>
              <ShieldAlert className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className={eyebrow}>Irreversible</p>
              <h3 className="font-display text-sky-h3 font-semibold leading-tight text-sky-ink">Delete Quest?</h3>
            </div>
          </div>
          <p className="text-sm text-sky-ink-2 mb-6 leading-relaxed">
            Remove <strong className="font-semibold text-sky-ink">{title}</strong>? Only Draft or Archived quests can be deleted.
          </p>
          <div className="flex gap-3">
            <SkyButton type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</SkyButton>
            <SkyButton type="button" variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
            </SkyButton>
          </div>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── Expanded row ─────────────────────────────────────────────────────────────
function ExpandedRow({ item, allGoals, onRefresh }: {
  item: QuestLibraryItemDto;
  allGoals: GoalDto[];
  onRefresh(): void;
}) {
  const [showReward, setShowReward] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  const goalObjects = allGoals.filter(g => (item.goalIds ?? []).includes(g.goalId));

  return (
    <div className="px-4 pb-4 pt-4 bg-white/42 border-t border-white/70 space-y-4">
      {/* Goals */}
      <div>
        <p className={`mb-1.5 ${eyebrow}`}>Mapped goals</p>
        {goalObjects.length === 0 ? (
          <Notice>No goals mapped — publish blocked</Notice>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {goalObjects.map(g => (
              <span key={g.goalId} className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sky-chip ring-1 ${TONE.deep.chip}`}>
                {g.goalCode}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Payout — the five numbers an operator compares across quests, so they
          get an even grid with each figure on the display face, rather than a
          run of inline text that has to be re-parsed on every row. */}
      <div>
        <p className={`mb-1.5 ${eyebrow}`}>Payout</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { label: 'Gold', Icon: Coins, tone: 'peach' as Tone, val: item.rewardGold },
            { label: 'Bonus', Icon: Sparkles, tone: 'peach' as Tone, val: item.rewardBonusGold },
            { label: 'XP', Icon: Star, tone: 'deep' as Tone, val: item.rewardXp },
            { label: 'Gems', Icon: Gem, tone: 'violet' as Tone, val: item.rewardGems },
            { label: 'Damage', Icon: Swords, tone: 'dmg' as Tone, val: item.damage },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-2.5 rounded-sky-chip bg-white/64 ring-1 ring-white/80 px-3 py-2">
              <span className={`grid place-items-center w-7 h-7 shrink-0 rounded-[10px] ring-1 ${TONE[r.tone].chip}`}>
                <r.Icon className="w-3.5 h-3.5" strokeWidth={2.3} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className={eyebrow}>{r.label}</p>
                <p className="font-display text-sm font-semibold leading-tight text-sky-ink tabular-nums">{r.val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setShowReward(true)}>
          <Trophy className="w-3.5 h-3.5" /> Edit Rewards
        </SkyButton>
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setShowGoals(true)}>
          <Users className="w-3.5 h-3.5" /> Edit Goals
        </SkyButton>
      </div>

      {showReward && (
        <RewardModal
          item={item}
          onClose={() => setShowReward(false)}
          onSaved={() => { setShowReward(false); onRefresh(); }}
        />
      )}
      {showGoals && (
        <GoalsModal
          item={item}
          allGoals={allGoals}
          onClose={() => setShowGoals(false)}
          onSaved={() => { setShowGoals(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Quest row ────────────────────────────────────────────────────────────────
function QuestRow({ item, allGoals, onEdit, onDelete, onStatusChange, onRefresh, statusChanging }: {
  item: QuestLibraryItemDto;
  allGoals: GoalDto[];
  onEdit(): void;
  onDelete(): void;
  onStatusChange(action: 'publish' | 'archive'): void;
  onRefresh(): void;
  statusChanging: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const safeStatus = (item.status ?? 'Draft') as QuestLibraryStatus;
  const statusCfg = STATUS_CFG[safeStatus] ?? STATUS_CFG.Draft;
  const StatusIcon = statusCfg.Icon;
  const diffCls = DIFF_CFG[item.difficulty]?.cls ?? DIFF_CFG.EASY.cls;
  const diffLabel = DIFF_CFG[item.difficulty]?.label ?? item.difficulty;

  const canDelete = safeStatus === 'Draft' || safeStatus === 'Archived';

  return (
    <SkyCard variant="admin" className="p-0 overflow-hidden sky-lift">
      <div className="flex items-start gap-3 p-4">
        <span className={`shrink-0 mt-0.5 rounded-sky-chip ring-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${diffCls}`}>{diffLabel}</span>
        {item.isGlobal && (
          <span className={`shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-sky-chip ring-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${TONE.violet.chip}`}>
            <Globe className="w-3 h-3" strokeWidth={2.6} aria-hidden="true" /> Global
          </span>
        )}

        <div className="flex-1 min-w-0">
          {/* The title is what an operator scans this list by, so it is the only
              thing here on the display face at full ink. */}
          <p className="font-display text-sm font-semibold leading-snug text-sky-ink">{item.title}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="rounded-sky-chip bg-white/62 ring-1 ring-white/80 px-2 py-0.5 text-[10px] font-semibold text-sky-ink-2">{item.repeatRule}</span>
            <span className="rounded-sky-chip bg-white/62 ring-1 ring-white/80 px-2 py-0.5 text-[10px] font-semibold text-sky-ink-2">{item.proofType}</span>
            <span className="text-[10px] font-semibold text-sky-ink-3 tabular-nums">{(item.goalIds ?? []).length} goal{(item.goalIds ?? []).length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <span className={`shrink-0 inline-flex items-center gap-1 rounded-sky-chip ring-1 px-2.5 py-1 text-[10px] font-semibold ${statusCfg.cls}`}>
          <StatusIcon className="w-3 h-3" strokeWidth={2.6} aria-hidden="true" />
          {safeStatus}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <SkyButton type="button" variant="ghost" size="icon" onClick={() => setExpanded(e => !e)} title="Details" aria-label="Details" aria-expanded={expanded} className="w-8 h-8">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </SkyButton>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onEdit} title="Edit" aria-label="Edit" className="w-8 h-8"><Pencil className="w-4 h-4" /></SkyButton>

          {/* Publish is the only genuinely successful action in this cluster, so
              it is the only teal control; archive withdraws (peach) and delete is
              irreversible (rose). Three actions, three distinct meanings. */}
          {safeStatus === 'Draft' && (
            <SkyButton type="button" variant="ghost" size="icon" onClick={() => onStatusChange('publish')} disabled={statusChanging} title="Publish" aria-label="Publish" className="w-8 h-8 text-sky-teal hover:bg-sky-teal/14">
              {statusChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleRight className="w-4 h-4" />}
            </SkyButton>
          )}
          {(safeStatus === 'Draft' || safeStatus === 'Published') && (
            <SkyButton type="button" variant="ghost" size="icon" onClick={() => onStatusChange('archive')} disabled={statusChanging} title="Archive" aria-label="Archive" className="w-8 h-8 text-sky-peach-deep hover:bg-sky-peach/18">
              {statusChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleLeft className="w-4 h-4" />}
            </SkyButton>
          )}

          {canDelete && (
            <SkyButton type="button" variant="ghost" size="icon" onClick={onDelete} title="Delete" aria-label="Delete" className="w-8 h-8 text-sky-rose-deep hover:bg-sky-rose/14"><Trash2 className="w-4 h-4" /></SkyButton>
          )}
        </div>
      </div>

      {expanded && (
        <ExpandedRow item={item} allGoals={allGoals} onRefresh={onRefresh} />
      )}
    </SkyCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminQuestLibraryManagement() {
  const [items, setItems] = useState<QuestLibraryItemDto[]>([]);
  const [allGoals, setAllGoals] = useState<GoalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<QuestLibraryStatus | ''>('');
  const [filterDiff, setFilterDiff] = useState<QuestLibraryDifficulty | ''>('');
  const [filterGlobal, setFilterGlobal] = useState<'' | 'global' | 'normal'>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formModal, setFormModal] = useState<{ editing: QuestLibraryItemDto | null } | null>(null);
  const [delItem, setDelItem] = useState<QuestLibraryItemDto | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [statusChanging, setStatusChanging] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const alertCtx = useAlert();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminQuestLibraryApi.getItems({
        search: searchQuery.trim() || undefined,
        status: filterStatus || undefined,
        difficulty: filterDiff || undefined,
        isGlobal: filterGlobal === '' ? undefined : filterGlobal === 'global',
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      if (res.success) {
        setItems(Array.isArray(res.data) ? res.data : []);
        setTotalPages(res.totalPages ?? 1);
        setTotalRecords(res.totalRecords ?? 0);
      } else {
        alertCtx.error(res.message ?? 'Failed to load.');
      }
    } catch {
      alertCtx.error('Failed to load quest library.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, filterDiff, filterGlobal, page, alertCtx]);

  useEffect(() => { load(); }, [load]);

  // Debounce: update searchQuery 400ms after the user stops typing, and jump back to page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    adminGoalApi.getGoals()
      .then(res => { if (res.success) setAllGoals(res.data ?? []); })
      .catch(() => {});
  }, []);

  const handleSave = async (payload: CreateQuestLibraryItemPayload | UpdateQuestLibraryItemPayload, isNew: boolean) => {
    if (isNew) {
      await adminQuestLibraryApi.create(payload as CreateQuestLibraryItemPayload);
      alertCtx.success('Quest created.');
    } else {
      const p = payload as UpdateQuestLibraryItemPayload;
      await adminQuestLibraryApi.update(p.templateId, p);
      alertCtx.success('Quest updated.');
    }
    setFormModal(null);
    load();
  };

  const handleStatusChange = async (item: QuestLibraryItemDto, action: 'publish' | 'archive') => {
    setStatusChanging(item.templateId);
    try {
      await adminQuestLibraryApi.changeStatus(item.templateId, { action });
      alertCtx.success(`Quest ${action}ed.`);
      load();
    } catch (ex: any) {
      alertCtx.error(ex?.response?.data?.message ?? 'Status change failed.');
    } finally { setStatusChanging(null); }
  };

  const handleDelete = async () => {
    if (!delItem) return;
    setDelLoading(true);
    try {
      await adminQuestLibraryApi.deleteItem(delItem.templateId);
      alertCtx.success('Quest deleted.');
      setDelItem(null);
      load();
    } catch (ex: any) {
      alertCtx.error(ex?.response?.data?.message ?? 'Delete failed.');
    } finally { setDelLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={<Library className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
        tone="violet"
        eyebrow="Content library"
        title="System Quest Library"
        description="Manage reusable quest templates — publish to make available to players via goal mapping."
        actions={
          <SkyButton type="button" variant="primary" onClick={() => setFormModal({ editing: null })}>
            <Plus className="w-4 h-4" /> New Quest
          </SkyButton>
        }
      />

      {/* Stats + Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Per-status breakdown can't be computed client-side once the list is
            server-paginated (items only holds the current page) — Total is the one
            count the BE's page metadata actually gives us accurately. */}
        <div className="inline-flex items-center gap-2.5 rounded-sky-chip bg-white/62 ring-1 ring-white/80 px-3.5 py-2">
          <span className={eyebrow}>Total</span>
          <span className="font-display text-base font-semibold leading-none text-sky-ink tabular-nums">{totalRecords}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-ink-3 pointer-events-none" aria-hidden="true" />
            <label className="sr-only" htmlFor="ql-search">Search quests</label>
            <input
              id="ql-search"
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search quests…"
              className={`${filterSelectCls} pl-8 w-52`}
            />
          </div>
          <label className="sr-only" htmlFor="ql-filter-status">Filter by status</label>
          <select
            id="ql-filter-status"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value as QuestLibraryStatus | ''); setPage(1); }}
            className={filterSelectCls}
          >
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="sr-only" htmlFor="ql-filter-diff">Filter by difficulty</label>
          <select
            id="ql-filter-diff"
            value={filterDiff}
            onChange={e => { setFilterDiff(e.target.value as QuestLibraryDifficulty | ''); setPage(1); }}
            className={filterSelectCls}
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_CFG[d].label}</option>)}
          </select>
          <label className="sr-only" htmlFor="ql-filter-global">Filter by Global</label>
          <select
            id="ql-filter-global"
            value={filterGlobal}
            onChange={e => { setFilterGlobal(e.target.value as '' | 'global' | 'normal'); setPage(1); }}
            className={filterSelectCls}
          >
            <option value="">All quests</option>
            <option value="global">Global only</option>
            <option value="normal">Normal only</option>
          </select>
        </div>
      </div>

      {/* Quest list — only the true initial load (no items yet) replaces this whole
          section with a spinner; a page-change/filter-change refetch just dims the
          existing list in place so the table never unmounts under the user. */}
      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 justify-center py-20 text-sm font-medium text-sky-ink-3">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading quest library…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-sky-ink/15 rounded-sky-card bg-white/38">
          <span className={`grid place-items-center w-14 h-14 mx-auto mb-4 rounded-sky-md ring-1 ${TONE.violet.chip}`}>
            <Library className="w-7 h-7" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <p className="font-display text-sky-h3 font-semibold text-sky-ink">No quests found</p>
          <p className="text-sm mt-1.5 text-sky-ink-2">
            {searchQuery ? 'Try a different search term.' : 'Create a quest and map it to at least one goal before publishing.'}
          </p>
        </div>
      ) : (
        <div className={`space-y-3 sky-stagger transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
          {items.map(item => (
            <QuestRow
              key={item.templateId}
              item={item}
              allGoals={allGoals}
              onEdit={() => setFormModal({ editing: item })}
              onDelete={() => setDelItem(item)}
              onStatusChange={action => handleStatusChange(item, action)}
              onRefresh={load}
              statusChanging={statusChanging === item.templateId}
            />
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {formModal !== null && (
        <QuestFormModal
          editing={formModal.editing}
          allGoals={allGoals}
          onSave={handleSave}
          onClose={() => setFormModal(null)}
          onGlobalToggled={load}
        />
      )}
      {delItem && (
        <ConfirmDeleteModal
          title={delItem.title}
          loading={delLoading}
          onConfirm={handleDelete}
          onCancel={() => setDelItem(null)}
        />
      )}
    </div>
  );
}
