import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Pencil, Trash2, X, Loader2,
  ToggleLeft, ToggleRight, ShieldAlert,
  ChevronDown, ChevronUp, Users, Zap, Coins,
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import Pagination from '../components/common/SkyPagination';
import { adminQuestLibraryApi } from '../api/adminQuestLibraryApi';
import { adminGoalApi } from '../api/adminGoalApi';
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';
import type {
  QuestLibraryItemDto, QuestLibraryDifficulty, QuestLibraryStatus,
  RepeatRule, CreateQuestLibraryItemPayload, UpdateQuestLibraryItemPayload,
  SetRewardMatrixPayload, SetPersonalizationPayload,
  VerificationTag, CvQuestType,
} from '../types/adminQuestLibrary.types';
import type { GoalDto } from '../types/adminGoal.types';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const DIFFICULTIES: QuestLibraryDifficulty[] = ['EASY', 'NORMAL', 'HARD', 'EPIC'];
const STATUSES: QuestLibraryStatus[] = ['Draft', 'Published', 'Archived'];
const REPEAT_RULES: RepeatRule[] = ['Daily', 'Weekly', 'Monthly', 'OneTime'];
const PROOF_TYPES = ['SELF_CHECK', 'PHOTO', 'VIDEO', 'TEXT_LOG', 'SCREENSHOT', 'TIMER', 'GPS', 'STEP_COUNTER'];
const VERIFICATION_TAGS: VerificationTag[] = ['FACE', 'ITEM', 'ACTION'];
const CV_QUEST_TYPES: CvQuestType[] = ['running', 'drinking_water', 'sleeping', 'reading', 'cooking', 'exercise'];
const HOW_TO_SUBMIT_MAX = 500;

const DIFF_CFG: Record<QuestLibraryDifficulty, { label: string; cls: string }> = {
  EASY:   { label: 'Easy',   cls: 'bg-success-100 text-success-800' },
  NORMAL: { label: 'Normal', cls: 'bg-blue-100 text-blue-800' },
  HARD:   { label: 'Hard',   cls: 'bg-warning-100 text-warning-800' },
  EPIC:   { label: 'Epic',   cls: 'bg-purple-100 text-purple-800' },
};

const STATUS_CFG: Record<QuestLibraryStatus, { cls: string }> = {
  Draft:     { cls: 'bg-gray-100 text-gray-600' },
  Published: { cls: 'bg-success-100 text-success-800' },
  Archived:  { cls: 'bg-error-100 text-error-600' },
};

// ─── Style helpers ────────────────────────────────────────────────────────────
const inputCls = [
  'w-full px-3 py-2 rounded-sky-chip border border-sky-surf-border bg-white',
  'text-sky-ink text-sm font-medium',
  'focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20',
  'placeholder:text-sky-ink-3',
].join(' ');

// ─── Portal ───────────────────────────────────────────────────────────────────
const Portal = ({ children }: { children: React.ReactNode }) =>
  createPortal(children, document.body);

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
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-warning-50">
            <div className="flex items-center gap-2">
              <img src="/icon/Item/Trophy/64w/Golden Trophy 1st 64px.png" className="w-5 h-5 object-contain" alt="" />
              <h2 className="font-bold text-lg text-sky-ink">Edit Rewards</h2>
            </div>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs font-semibold text-sky-ink-3 truncate">Quest: {item.title}</p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Gold', icon: <Coins className="w-3.5 h-3.5 text-warning-500" />, val: gold, set: setGold },
                { label: 'Bonus Gold', icon: <Coins className="w-3.5 h-3.5 text-warning-400" />, val: bonusGold, set: setBonusGold },
                { label: 'XP', icon: <img src="/icon/Item/Medal/64px/Bronze Medal 1st 64px.png" className="w-3.5 h-3.5 object-contain" alt="" />, val: xp, set: setXp },
                { label: 'Gems', icon: <Zap className="w-3.5 h-3.5 text-purple-500" />, val: gems, set: setGems },
              ].map(f => (
                <div key={f.label}>
                  <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">
                    {f.icon} {f.label}
                  </label>
                  <input
                    type="number" min={0}
                    value={f.val}
                    onChange={e => f.set(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
              <SkyButton type="button" variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <img src="/icon/Item/Trophy/64w/Golden Trophy 1st 64px.png" className="w-4 h-4 object-contain" alt="" />} Save
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
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-blue-50 shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-700" />
              <h2 className="font-bold text-lg text-sky-ink">Edit Goal Mappings</h2>
            </div>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <div className="p-5 space-y-3 overflow-y-auto flex-1">
            <p className="text-xs font-semibold text-sky-ink-3 truncate">Quest: {item.title}</p>
            <p className="text-xs text-sky-ink-2">Thay thế toàn bộ goal mappings. <strong>({selectedIds.length} selected)</strong></p>
            {allGoals.length === 0 ? (
              <p className="text-xs text-warning-600 font-semibold">No goals found.</p>
            ) : (
              <div className="border border-sky-surf-border rounded-sky-chip divide-y divide-gray-100">
                {allGoals.map(g => (
                  <label key={g.goalId} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors ${selectedIds.includes(g.goalId) ? 'bg-blue-50' : ''}`}>
                    <input type="checkbox" checked={selectedIds.includes(g.goalId)} onChange={() => toggle(g.goalId)} className="w-4 h-4 accent-sky-deep shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-sky-ink truncate">{g.goalName}</p>
                      <p className="text-[10px] font-mono text-sky-ink-3">{g.goalCode}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 px-5 py-4 border-t border-gray-200 shrink-0">
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
function QuestFormModal({ editing, allGoals, onSave, onClose }: {
  editing: QuestLibraryItemDto | null;
  allGoals: GoalDto[];
  onSave(payload: CreateQuestLibraryItemPayload | UpdateQuestLibraryItemPayload, isNew: boolean): Promise<void>;
  onClose(): void;
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
  const [cvQuestType, setCvQuestType] = useState(editing?.cvQuestType ?? '');
  const [saving, setSaving] = useState(false);
  const alert = useAlert();

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
          cvQuestType: cvQuestType || undefined,
        };
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
          cvQuestType: cvQuestType || undefined,
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
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-purple-50 shrink-0">
            <div className="flex items-center gap-2">
              <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" className="w-5 h-5 object-contain" alt="" />
              <h2 className="font-bold text-lg text-sky-ink">{editing ? 'Edit Quest' : 'New Quest'}</h2>
            </div>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Drink 2L of water" required />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inputCls} placeholder="Optional details…" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Difficulty *</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as QuestLibraryDifficulty)} className={inputCls}>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_CFG[d].label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Proof Type *</label>
                <select value={proofType} onChange={e => setProofType(e.target.value)} className={inputCls}>
                  {PROOF_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Repeat *</label>
                <select value={repeatRule} onChange={e => setRepeatRule(e.target.value as RepeatRule)} className={inputCls}>
                  {REPEAT_RULES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Damage</label>
              <input type="number" min={0} value={damage} onChange={e => setDamage(Number(e.target.value))} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">
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
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Verification Tags</label>
              <div className="flex flex-wrap gap-3">
                {VERIFICATION_TAGS.map(tag => (
                  <label key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sky-chip border border-sky-surf-border text-xs font-semibold bg-white text-sky-ink cursor-pointer">
                    <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} className="w-3.5 h-3.5 accent-sky-deep" />
                    {tag}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-sky-ink-3 mt-1">FACE blocks submission until the player verifies their portrait; ITEM/ACTION are hints only.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">CV Quest Type</label>
              <select value={cvQuestType} onChange={e => setCvQuestType(e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {CV_QUEST_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </div>

            {/* Rewards — only for create */}
            {!editing && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-2">Rewards</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Gold', val: gold, set: setGold },
                    { label: '+Bonus', val: bonusGold, set: setBonusGold },
                    { label: 'XP', val: xp, set: setXp },
                    { label: 'Gems', val: gems, set: setGems },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-[10px] font-semibold text-sky-ink-3 mb-1">{f.label}</label>
                      <input type="number" min={0} value={f.val} onChange={e => f.set(Number(e.target.value))} className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goals — only for create */}
            {!editing && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-2">
                  Map to Goals * <span className="text-[10px] font-normal normal-case text-sky-ink-3">({selectedGoalIds.length} selected)</span>
                </label>
                {allGoals.length === 0 ? (
                  <p className="text-xs text-warning-600 font-semibold">No goals available. Create goals first.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto border border-sky-surf-border rounded-sky-chip divide-y divide-gray-100">
                    {allGoals.map(g => (
                      <label key={g.goalId} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-purple-50 transition-colors ${selectedGoalIds.includes(g.goalId) ? 'bg-purple-50' : ''}`}>
                        <input type="checkbox" checked={selectedGoalIds.includes(g.goalId)} onChange={() => toggleGoal(g.goalId)} className="w-4 h-4 accent-sky-deep shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-sky-ink truncate">{g.goalName}</p>
                          <p className="text-[10px] font-mono text-sky-ink-3">{g.goalCode}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {editing && (
              <p className="text-xs text-sky-ink-3 bg-gray-50 rounded-sky-chip px-3 py-2">
                Dùng "Edit Goals" để cập nhật goal mappings. Dùng "Rewards" để cập nhật phần thưởng.
              </p>
            )}
          </form>

          <div className="flex gap-3 px-5 py-4 border-t border-gray-200 shrink-0">
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
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-error-500 shrink-0" />
            <h3 className="text-lg font-bold text-error-700">Delete Quest?</h3>
          </div>
          <p className="text-sm text-sky-ink-2 mb-6">Remove <strong>"{title}"</strong>? Only Draft or Archived quests can be deleted.</p>
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
    <div className="px-4 pb-4 pt-3 bg-purple-50/40 border-t border-gray-200 space-y-3">
      {/* Goals */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-600 mb-1.5">Mapped Goals</p>
        <div className="flex flex-wrap gap-1.5">
          {goalObjects.length === 0
            ? <span className="text-xs text-warning-600 font-semibold">No goals mapped — publish blocked</span>
            : goalObjects.map(g => (
              <span key={g.goalId} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {g.goalCode}
              </span>
            ))
          }
        </div>
      </div>

      {/* Rewards */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-warning-600 mb-1.5">Rewards</p>
        <div className="flex gap-3 flex-wrap text-xs font-semibold text-sky-ink-2">
          <span>🪙 Gold: <span className="font-bold text-sky-ink">{item.rewardGold}</span></span>
          <span>✨ Bonus: <span className="font-bold text-sky-ink">{item.rewardBonusGold}</span></span>
          <span>⭐ XP: <span className="font-bold text-sky-ink">{item.rewardXp}</span></span>
          <span>💎 Gems: <span className="font-bold text-sky-ink">{item.rewardGems}</span></span>
          <span>⚔️ Dmg: <span className="font-bold text-sky-ink">{item.damage}</span></span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setShowReward(true)}>
          <img src="/icon/Item/Trophy/64w/Golden Trophy 1st 64px.png" className="w-3.5 h-3.5 object-contain" alt="" /> Edit Rewards
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
  const statusCls = STATUS_CFG[safeStatus]?.cls ?? STATUS_CFG.Draft.cls;
  const diffCls = DIFF_CFG[item.difficulty]?.cls ?? DIFF_CFG.EASY.cls;
  const diffLabel = DIFF_CFG[item.difficulty]?.label ?? item.difficulty;

  const canDelete = safeStatus === 'Draft' || safeStatus === 'Archived';

  return (
    <SkyCard variant="admin" className="p-0 overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className={`shrink-0 mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${diffCls}`}>{diffLabel}</span>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-sky-ink">{item.title}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[10px] font-semibold text-sky-ink-3">{item.repeatRule}</span>
            <span className="text-[10px] font-semibold bg-gray-100 text-sky-ink-2 px-1.5 py-0.5 rounded-lg">{item.proofType}</span>
            <span className="text-[10px] font-semibold text-sky-ink-3">{(item.goalIds ?? []).length} goal{(item.goalIds ?? []).length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls}`}>{safeStatus}</span>

        <div className="flex items-center gap-1 shrink-0">
          <SkyButton type="button" variant="ghost" size="icon" onClick={() => setExpanded(e => !e)} title="Details" className="w-8 h-8">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </SkyButton>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onEdit} className="w-8 h-8"><Pencil className="w-4 h-4" /></SkyButton>

          {safeStatus === 'Draft' && (
            <SkyButton type="button" variant="ghost" size="icon" onClick={() => onStatusChange('publish')} disabled={statusChanging} title="Publish" className="w-8 h-8 text-success-600 hover:bg-success-50">
              {statusChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleRight className="w-4 h-4" />}
            </SkyButton>
          )}
          {(safeStatus === 'Draft' || safeStatus === 'Published') && (
            <SkyButton type="button" variant="ghost" size="icon" onClick={() => onStatusChange('archive')} disabled={statusChanging} title="Archive" className="w-8 h-8 text-error-500 hover:bg-error-50">
              {statusChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleLeft className="w-4 h-4" />}
            </SkyButton>
          )}

          {canDelete && (
            <SkyButton type="button" variant="ghost" size="icon" onClick={onDelete} className="w-8 h-8 text-error-500 hover:bg-error-50"><Trash2 className="w-4 h-4" /></SkyButton>
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
        status: filterStatus || undefined,
        difficulty: filterDiff || undefined,
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
  }, [filterStatus, filterDiff, page, alertCtx]);

  useEffect(() => { load(); }, [load]);

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
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-sky-chip bg-purple-100 flex items-center justify-center shrink-0">
          <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" className="w-6 h-6 object-contain" alt="" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-sky-ink">System Quest Library</h1>
          <p className="text-sm text-sky-ink-2">
            Manage reusable quest templates — publish to make available to players via goal mapping.
          </p>
        </div>
        <SkyButton type="button" variant="primary" onClick={() => setFormModal({ editing: null })} className="ml-auto">
          <Plus className="w-4 h-4" /> New Quest
        </SkyButton>
      </div>

      {/* Stats + Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Per-status breakdown can't be computed client-side once the list is
            server-paginated (items only holds the current page) — Total is the one
            count the BE's page metadata actually gives us accurately. */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-sky-ink-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Total</span>
          <span className="text-base font-bold">{totalRecords}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value as QuestLibraryStatus | ''); setPage(1); }}
            className="px-3 py-1.5 rounded-sky-chip border border-sky-surf-border text-xs font-semibold bg-white text-sky-ink focus:outline-none focus:border-sky-deep"
          >
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterDiff}
            onChange={e => { setFilterDiff(e.target.value as QuestLibraryDifficulty | ''); setPage(1); }}
            className="px-3 py-1.5 rounded-sky-chip border border-sky-surf-border text-xs font-semibold bg-white text-sky-ink focus:outline-none focus:border-sky-deep"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_CFG[d].label}</option>)}
          </select>
        </div>
      </div>

      {/* Quest list — only the true initial load (no items yet) replaces this whole
          section with a spinner; a page-change/filter-change refetch just dims the
          existing list in place so the table never unmounts under the user. */}
      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 justify-center py-20 text-sky-ink-3">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading quest library…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-sky-ink/15 rounded-sky-card text-sky-ink-3">
          <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" className="w-14 h-14 mx-auto mb-3 opacity-20 object-contain" alt="" />
          <p className="font-bold text-lg">No quests found</p>
          <p className="text-sm mt-1">Create a quest and map it to at least one goal before publishing.</p>
        </div>
      ) : (
        <div className={`space-y-3 transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
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
