import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Pencil, Trash2, X, Loader2,
  ToggleLeft, ToggleRight, ShieldAlert,
  ChevronDown, ChevronUp, Users, Zap, Coins,
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { adminQuestLibraryApi } from '../api/adminQuestLibraryApi';
import { adminGoalApi } from '../api/adminGoalApi';
import type {
  QuestLibraryItemDto, QuestLibraryDifficulty, QuestLibraryStatus,
  RepeatRule, CreateQuestLibraryItemPayload, UpdateQuestLibraryItemPayload,
  SetRewardMatrixPayload, SetPersonalizationPayload,
} from '../types/adminQuestLibrary.types';
import type { GoalDto } from '../types/adminGoal.types';

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFFICULTIES: QuestLibraryDifficulty[] = ['EASY', 'NORMAL', 'HARD', 'EPIC'];
const STATUSES: QuestLibraryStatus[] = ['Draft', 'Published', 'Archived'];
const REPEAT_RULES: RepeatRule[] = ['Daily', 'Weekly', 'Monthly', 'OneTime'];
const PROOF_TYPES = ['SELF_CHECK', 'PHOTO', 'VIDEO', 'TEXT_LOG', 'SCREENSHOT', 'TIMER', 'STEP_COUNTER'];

const DIFF_CFG: Record<QuestLibraryDifficulty, { label: string; cls: string }> = {
  EASY:   { label: 'Easy',   cls: 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300' },
  NORMAL: { label: 'Normal', cls: 'bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300' },
  HARD:   { label: 'Hard',   cls: 'bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-300' },
  EPIC:   { label: 'Epic',   cls: 'bg-purple-100 border-purple-400 text-purple-800 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300' },
};

const STATUS_CFG: Record<QuestLibraryStatus, { cls: string }> = {
  Draft:     { cls: 'bg-gray-100 border-gray-400 text-gray-600 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300' },
  Published: { cls: 'bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-300' },
  Archived:  { cls: 'bg-red-100 border-red-300 text-red-600 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400' },
};

// ─── Style helpers ────────────────────────────────────────────────────────────
const inputCls = [
  'w-full px-3 py-2 rounded-xl border-2 border-black bg-white dark:bg-gray-800',
  'text-gray-900 dark:text-gray-100 text-sm font-medium',
  'focus:outline-none focus:ring-2 focus:ring-violet-400',
  'dark:border-gray-600 dark:placeholder:text-gray-500',
].join(' ');

const btnBase = [
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black',
  'font-black text-sm transition-all shadow-[2px_2px_0_0_#1A1D20]',
  'hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-amber-100 dark:bg-amber-900/30 rounded-t-3xl">
            <div className="flex items-center gap-2">
              <img src="/icon/Item/Trophy/64w/Golden Trophy 1st 64px.png" className="w-5 h-5 object-contain" alt="" />
              <h2 className="font-black text-lg text-gray-900 dark:text-gray-100">Edit Rewards</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs font-bold text-gray-400 truncate">Quest: {item.title}</p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Gold', icon: <Coins className="w-3.5 h-3.5 text-yellow-500" />, val: gold, set: setGold },
                { label: 'Bonus Gold', icon: <Coins className="w-3.5 h-3.5 text-orange-400" />, val: bonusGold, set: setBonusGold },
                { label: 'XP', icon: <img src="/icon/Item/Medal/64px/Bronze Medal 1st 64px.png" className="w-3.5 h-3.5 object-contain" alt="" />, val: xp, set: setXp },
                { label: 'Gems', icon: <Zap className="w-3.5 h-3.5 text-purple-500" />, val: gems, set: setGems },
              ].map(f => (
                <div key={f.label}>
                  <label className="flex items-center gap-1 text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">
                    {f.icon} {f.label}
                  </label>
                  <input
                    type="number" min={0}
                    value={f.val}
                    onChange={e => f.set(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 rounded-xl text-sm font-black bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className={`${btnBase} flex-1 justify-center bg-amber-300 dark:bg-amber-600 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <img src="/icon/Item/Trophy/64w/Golden Trophy 1st 64px.png" className="w-4 h-4 object-contain" alt="" />} Save
              </button>
            </div>
          </div>
        </div>
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-md flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-indigo-100 dark:bg-indigo-900/30 rounded-t-3xl shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
              <h2 className="font-black text-lg text-gray-900 dark:text-gray-100">Edit Goal Mappings</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5 space-y-3 overflow-y-auto flex-1">
            <p className="text-xs font-bold text-gray-400 truncate">Quest: {item.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Thay thế toàn bộ goal mappings. <strong>({selectedIds.length} selected)</strong></p>
            {allGoals.length === 0 ? (
              <p className="text-xs text-amber-600 font-semibold">No goals found.</p>
            ) : (
              <div className="border-2 border-black dark:border-gray-600 rounded-2xl divide-y divide-gray-100 dark:divide-white/5">
                {allGoals.map(g => (
                  <label key={g.goalId} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors ${selectedIds.includes(g.goalId) ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                    <input type="checkbox" checked={selectedIds.includes(g.goalId)} onChange={() => toggle(g.goalId)} className="w-4 h-4 accent-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{g.goalName}</p>
                      <p className="text-[10px] font-mono text-gray-400">{g.goalCode}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 px-5 py-4 border-t-2 border-gray-100 dark:border-white/10 shrink-0">
            <button onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className={`${btnBase} flex-1 justify-center bg-indigo-300 dark:bg-indigo-700 text-gray-900 dark:text-white`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Save Goals
            </button>
          </div>
        </div>
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
  const [saving, setSaving] = useState(false);
  const alert = useAlert();

  const toggleGoal = (id: number) =>
    setSelectedGoalIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

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
        };
        await onSave(payload, true);
      }
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-violet-100 dark:bg-violet-900/30 rounded-t-3xl shrink-0">
            <div className="flex items-center gap-2">
              <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" className="w-5 h-5 object-contain" alt="" />
              <h2 className="font-black text-lg text-gray-900 dark:text-gray-100">{editing ? 'Edit Quest' : 'New Quest'}</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-violet-200 dark:hover:bg-violet-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Drink 2L of water" required />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inputCls} placeholder="Optional details…" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Difficulty *</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as QuestLibraryDifficulty)} className={inputCls}>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_CFG[d].label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Proof Type *</label>
                <select value={proofType} onChange={e => setProofType(e.target.value)} className={inputCls}>
                  {PROOF_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Repeat *</label>
                <select value={repeatRule} onChange={e => setRepeatRule(e.target.value as RepeatRule)} className={inputCls}>
                  {REPEAT_RULES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Damage</label>
              <input type="number" min={0} value={damage} onChange={e => setDamage(Number(e.target.value))} className={inputCls} />
            </div>

            {/* Rewards — only for create */}
            {!editing && (
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-2">Rewards</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Gold', val: gold, set: setGold },
                    { label: '+Bonus', val: bonusGold, set: setBonusGold },
                    { label: 'XP', val: xp, set: setXp },
                    { label: 'Gems', val: gems, set: setGems },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-[10px] font-black text-gray-400 mb-1">{f.label}</label>
                      <input type="number" min={0} value={f.val} onChange={e => f.set(Number(e.target.value))}
                        className="w-full px-2 py-1.5 border-2 border-black dark:border-gray-600 rounded-xl text-sm font-black bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goals — only for create */}
            {!editing && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-2">
                  Map to Goals * <span className="text-[10px] font-normal normal-case text-gray-400">({selectedGoalIds.length} selected)</span>
                </label>
                {allGoals.length === 0 ? (
                  <p className="text-xs text-amber-600 font-semibold">No goals available. Create goals first.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto border-2 border-black dark:border-gray-600 rounded-2xl divide-y divide-gray-100 dark:divide-white/5">
                    {allGoals.map(g => (
                      <label key={g.goalId} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors ${selectedGoalIds.includes(g.goalId) ? 'bg-violet-50 dark:bg-violet-900/10' : ''}`}>
                        <input type="checkbox" checked={selectedGoalIds.includes(g.goalId)} onChange={() => toggleGoal(g.goalId)} className="w-4 h-4 accent-violet-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{g.goalName}</p>
                          <p className="text-[10px] font-mono text-gray-400">{g.goalCode}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {editing && (
              <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                Dùng "Edit Goals" để cập nhật goal mappings. Dùng "Rewards" để cập nhật phần thưởng.
              </p>
            )}
          </form>

          <div className="flex gap-3 px-5 py-4 border-t-2 border-gray-100 dark:border-white/10 shrink-0">
            <button type="button" onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
            <button type="submit" disabled={saving} onClick={handleSubmit} className={`${btnBase} flex-1 justify-center bg-violet-300 dark:bg-violet-700 text-gray-900 dark:text-white`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editing ? 'Save Changes' : 'Create Quest'}
            </button>
          </div>
        </div>
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
            <h3 className="text-lg font-black text-red-700 dark:text-red-400">Delete Quest?</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Remove <strong>"{title}"</strong>? Only Draft or Archived quests can be deleted.</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700`}>Cancel</button>
            <button onClick={onConfirm} disabled={loading} className={`${btnBase} flex-1 justify-center bg-red-400 text-white`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
            </button>
          </div>
        </div>
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
    <div className="px-4 pb-4 pt-3 bg-violet-50/40 dark:bg-violet-900/5 border-t-2 border-gray-100 dark:border-white/5 space-y-3">
      {/* Goals */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-violet-500 dark:text-violet-400 mb-1.5">Mapped Goals</p>
        <div className="flex flex-wrap gap-1.5">
          {goalObjects.length === 0
            ? <span className="text-xs text-amber-600 font-bold">No goals mapped — publish blocked</span>
            : goalObjects.map(g => (
              <span key={g.goalId} className="text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-violet-200 dark:border-violet-700 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                {g.goalCode}
              </span>
            ))
          }
        </div>
      </div>

      {/* Rewards */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-amber-500 dark:text-amber-400 mb-1.5">Rewards</p>
        <div className="flex gap-3 flex-wrap text-xs font-bold text-gray-600 dark:text-gray-300">
          <span>🪙 Gold: <span className="font-black">{item.rewardGold}</span></span>
          <span>✨ Bonus: <span className="font-black">{item.rewardBonusGold}</span></span>
          <span>⭐ XP: <span className="font-black">{item.rewardXp}</span></span>
          <span>💎 Gems: <span className="font-black">{item.rewardGems}</span></span>
          <span>⚔️ Dmg: <span className="font-black">{item.damage}</span></span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <button onClick={() => setShowReward(true)} className={`${btnBase} bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 py-1.5 text-xs`}>
          <img src="/icon/Item/Trophy/64w/Golden Trophy 1st 64px.png" className="w-3.5 h-3.5 object-contain" alt="" /> Edit Rewards
        </button>
        <button onClick={() => setShowGoals(true)} className={`${btnBase} bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 py-1.5 text-xs`}>
          <Users className="w-3.5 h-3.5" /> Edit Goals
        </button>
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
    <div className="border-2 border-black dark:border-gray-600 rounded-2xl overflow-hidden shadow-[3px_3px_0_0_#1A1D20] bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3 p-4">
        <span className={`shrink-0 mt-0.5 text-[10px] font-black px-2 py-0.5 rounded-full border ${diffCls}`}>{diffLabel}</span>

        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-gray-900 dark:text-gray-100">{item.title}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400">{item.repeatRule}</span>
            <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-lg">{item.proofType}</span>
            <span className="text-[10px] font-bold text-gray-400">{(item.goalIds ?? []).length} goal{(item.goalIds ?? []).length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border ${statusCls}`}>{safeStatus}</span>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400" title="Details">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-gray-400"><Pencil className="w-4 h-4" /></button>

          {safeStatus === 'Draft' && (
            <button onClick={() => onStatusChange('publish')} disabled={statusChanging} title="Publish"
              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              {statusChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleRight className="w-4 h-4" />}
            </button>
          )}
          {(safeStatus === 'Draft' || safeStatus === 'Published') && (
            <button onClick={() => onStatusChange('archive')} disabled={statusChanging} title="Archive"
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 dark:text-red-400">
              {statusChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleLeft className="w-4 h-4" />}
            </button>
          )}

          {canDelete && (
            <button onClick={onDelete} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      {expanded && (
        <ExpandedRow item={item} allGoals={allGoals} onRefresh={onRefresh} />
      )}
    </div>
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
  const alertCtx = useAlert();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminQuestLibraryApi.getItems({
        status: filterStatus || undefined,
        difficulty: filterDiff || undefined,
      });
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : [];
        setItems(data);
      } else {
        alertCtx.error(res.message ?? 'Failed to load.');
      }
    } catch {
      alertCtx.error('Failed to load quest library.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDiff, alertCtx]);

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

  const counts = {
    total:     items.length,
    Draft:     items.filter(i => i.status === 'Draft').length,
    Published: items.filter(i => i.status === 'Published').length,
    Archived:  items.filter(i => i.status === 'Archived').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-violet-300 border-4 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
          <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" className="w-6 h-6 object-contain" alt="" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">System Quest Library</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage reusable quest templates — publish to make available to players via goal mapping.
          </p>
        </div>
        <button
          onClick={() => setFormModal({ editing: null })}
          className={`${btnBase} ml-auto bg-violet-300 dark:bg-violet-600 text-gray-900 dark:text-white py-2`}
        >
          <Plus className="w-4 h-4" /> New Quest
        </button>
      </div>

      {/* Stats + Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        {[
          { label: 'Total',     val: counts.total,     cls: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300' },
          { label: 'Published', val: counts.Published, cls: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' },
          { label: 'Draft',     val: counts.Draft,     cls: 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400' },
          { label: 'Archived',  val: counts.Archived,  cls: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500' },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border-2 ${s.cls} shadow-[2px_2px_0_0_#1A1D20]`}>
            <span className="text-[10px] font-black uppercase tracking-wide opacity-60">{s.label}</span>
            <span className="text-base font-black">{s.val}</span>
          </div>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as QuestLibraryStatus | '')}
            className="px-3 py-1.5 border-2 border-black dark:border-gray-600 rounded-xl text-xs font-black bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-[2px_2px_0_0_#1A1D20]"
          >
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterDiff}
            onChange={e => setFilterDiff(e.target.value as QuestLibraryDifficulty | '')}
            className="px-3 py-1.5 border-2 border-black dark:border-gray-600 rounded-xl text-xs font-black bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-[2px_2px_0_0_#1A1D20]"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_CFG[d].label}</option>)}
          </select>
        </div>
      </div>

      {/* Quest list */}
      {loading ? (
        <div className="flex items-center gap-2 justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading quest library…
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl text-gray-400">
          <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" className="w-14 h-14 mx-auto mb-3 opacity-20 object-contain" alt="" />
          <p className="font-black text-lg">No quests found</p>
          <p className="text-sm mt-1">Create a quest and map it to at least one goal before publishing.</p>
        </div>
      ) : (
        <div className="space-y-3">
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
