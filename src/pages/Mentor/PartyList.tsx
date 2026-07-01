import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAlert } from "../../context/AlertContext";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import partyMentorApi from "../../api/mentorPartyApi";
import {
  inkBorder, shadowSm, shadowMd, shadowLg, easeExpo, btnBase, inputCls, getMentorId, Spinner,
  JoinPolicyBadge, CapacityMeter, GameModal,
  POLICY_STYLES, JOIN_POLICIES, POLICY_LABEL_KEYS,
} from "./PartyWorkspace/shared";
import type { PartyItem, CreatePartyPayload } from "../../types/api.types";

export default function PartyList() {
  const { t } = useTranslation();
  const notify = useAlert();
  const navigate = useNavigate();

  // ── PARTY LIST ─────────────────────────────────────────────────────────────
  const [parties, setParties] = useState<PartyItem[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [partiesError, setPartiesError] = useState<string | null>(null);

  const fetchParties = useCallback(async () => {
    setLoadingParties(true);
    setPartiesError(null);
    try {
      const res = await partyMentorApi.getMentorParties();
      if (res.success && res.data) setParties(res.data);
      else setPartiesError(res.message ?? t("admin.partyManagement.flashCreateFailed"));
    } catch (err: any) {
      setPartiesError(err?.response?.data?.message ?? t("admin.partyManagement.flashCreateFailed"));
    } finally {
      setLoadingParties(false);
    }
  }, [t]);

  useEffect(() => { fetchParties(); }, [fetchParties]);

  // ── CREATE PARTY ────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<Pick<CreatePartyPayload, "name" | "description" | "joinPolicy">>({
    name: "",
    description: "",
    joinPolicy: "PUBLIC",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const resetCreateModal = () => {
    setShowCreate(false);
    setCreateForm({ name: "", description: "", joinPolicy: "PUBLIC" });
    setCreateError(null);
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    const mentorUserId = getMentorId();
    try {
      const res = await partyMentorApi.createParty({ ...createForm, mentorUserId });
      if (res.success) {
        resetCreateModal();
        notify.success(t("admin.partyManagement.flashCreated"));
        fetchParties();
      } else {
        setCreateError(res.message ?? t("admin.partyManagement.flashCreateFailed"));
      }
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? t("admin.partyManagement.flashCreateFailed"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <PageMeta
        title={t("admin.partyManagement.metaTitle")}
        description={t("admin.partyManagement.metaDesc")}
      />
      <PageBreadcrumb pageTitle={t("admin.partyManagement.pageTitle")} />

      <div>
        {/* Header — left-aligned, editorial */}
        <div className="mb-7 max-w-[70ch]">
          <span className="inline-block text-xs font-black uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300 mb-2">
            {t("admin.partyManagement.hub.kicker")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-[1.05]">
            {t("admin.partyManagement.pageTitle")}
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium mt-2">
            {t("admin.partyManagement.hub.heroLede")}
          </p>
        </div>

        {/* Massive, physical "Create New Party" tile */}
        <button
          onClick={() => setShowCreate(true)}
          className={`group w-full flex items-center gap-5 sm:gap-6 text-left bg-brand-500 border-[3px] ${inkBorder} rounded-[32px] ${shadowLg} hover:shadow-none hover:translate-x-2 hover:translate-y-2 active:shadow-none active:translate-x-2 active:translate-y-2 transition-all duration-150 ${easeExpo} px-6 sm:px-8 py-6 sm:py-7 mb-8`}
        >
          <span className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-25 dark:bg-gray-800 border-[3px] ${inkBorder} shrink-0 group-hover:rotate-90 transition-transform duration-300 ${easeExpo}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-game-outline dark:text-brand-300">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
              {t("admin.partyManagement.hub.createCta")}
            </p>
            <p className="text-sm text-brand-50 font-medium mt-0.5">
              {t("admin.partyManagement.hub.createSub")}
            </p>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0 hidden sm:block group-hover:translate-x-1 transition-transform">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>

        {/* Loading state */}
        {loadingParties && (
          <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
            <Spinner size={24} />
            <span className="font-bold text-sm">{t("admin.partyManagement.loading")}</span>
          </div>
        )}

        {/* Error state */}
        {!loadingParties && partiesError && (
          <div className={`bg-error-50 dark:bg-error-500/15 border-[3px] border-error-500 rounded-[28px] ${shadowSm} px-6 py-5 flex items-center justify-between gap-4`}>
            <span className="font-black text-error-800 dark:text-error-300 text-sm">{partiesError}</span>
            <button onClick={fetchParties} className={`${btnBase} bg-gray-25 dark:bg-gray-800 text-gray-800 text-xs`}>
              {t("admin.partyManagement.retry")}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loadingParties && !partiesError && parties.length === 0 && (
          <div className="text-center py-24 border-[3px] border-dashed border-game-outline/30 dark:border-brand-300/30 rounded-[28px] bg-gray-25 dark:bg-gray-800">
            <div className="text-5xl mb-4">🏕️</div>
            <p className="font-black text-gray-700 text-xl">{t("admin.partyManagement.noParties")}</p>
            <p className="text-gray-500 text-sm mt-1 font-medium">
              {t("admin.partyManagement.noPartiesHint")}
            </p>
          </div>
        )}

        {/* Quest-board roster — a divided list, not identical nested cards */}
        {!loadingParties && !partiesError && parties.length > 0 && (
          <div className={`bg-gray-25 dark:bg-gray-800 border-[3px] ${inkBorder} rounded-[28px] ${shadowMd} divide-y-[3px] divide-game-outline/15 dark:divide-brand-300/15 overflow-hidden`}>
            {parties.map((party, i) => (
              <button
                key={party.partyId}
                onClick={() => navigate(`/mentor/parties/${party.partyId}`)}
                style={{ animationDelay: `${i * 45}ms` }}
                className={`quest-row-in group w-full flex items-center gap-4 sm:gap-6 text-left px-5 sm:px-7 py-5 sm:py-6 hover:bg-brand-50/50 dark:hover:bg-brand-500/10 transition-colors duration-150 ${i % 2 === 1 ? "bg-brand-50/20 dark:bg-brand-500/5" : ""}`}
              >
                <span className="text-2xl sm:text-3xl font-black text-gray-200 dark:text-gray-700 group-hover:text-brand-300 transition-colors w-9 sm:w-11 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 truncate">{party.name}</h3>
                    <JoinPolicyBadge policy={party.joinPolicy} />
                  </div>
                  <p className="text-sm text-gray-500 font-medium truncate mt-0.5">
                    {party.description || t("admin.partyManagement.noDescription")}
                  </p>
                </div>
                <div className="hidden sm:block w-32 shrink-0">
                  <CapacityMeter current={party.memberCount ?? 0} max={party.maxMembers || 1} />
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600 group-hover:text-brand-500 group-hover:translate-x-1 transition-all shrink-0">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════ MODAL: CREATE PARTY ══════════════════════ */}
      {showCreate && (
        <GameModal title={t("admin.partyManagement.form.createTitle")} onClose={resetCreateModal}>
          <form onSubmit={handleCreateParty} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                {t("admin.partyManagement.form.nameLabel")}
              </label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t("admin.partyManagement.form.namePlaceholder")}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                {t("admin.partyManagement.form.descLabel")}
              </label>
              <textarea
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t("admin.partyManagement.form.descPlaceholder")}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-2">
                {t("admin.partyManagement.form.policyLabel")}
              </label>
              <div className="flex flex-col gap-2">
                {JOIN_POLICIES.map((policy) => {
                  const s = POLICY_STYLES[policy];
                  const checked = createForm.joinPolicy === policy;
                  const policyLabel = t(POLICY_LABEL_KEYS[policy]);
                  return (
                    <label
                      key={policy}
                      className={`flex items-center gap-3 px-4 py-3 border-2 rounded-2xl cursor-pointer transition-all duration-150 ${checked
                          ? `${s.bg} ${s.border} shadow-[2px_2px_0_0_var(--color-game-outline)] dark:shadow-[2px_2px_0_0_var(--color-brand-300)]`
                          : "border-gray-200 bg-gray-25 dark:bg-gray-800 hover:border-gray-400"
                        }`}
                    >
                      <input
                        type="radio"
                        name="joinPolicy"
                        value={policy}
                        checked={checked}
                        onChange={() => setCreateForm((p) => ({ ...p, joinPolicy: policy }))}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${checked ? `${s.border} ${s.bg}` : "border-gray-400 bg-gray-25 dark:bg-gray-800"
                          }`}
                      >
                        {checked && <span className="w-2 h-2 rounded-full bg-game-outline dark:bg-brand-300" />}
                      </span>
                      <span className={`text-sm font-black ${checked ? s.text : "text-gray-600"}`}>
                        {policyLabel}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {createError && (
              <p className="text-xs font-bold text-error-600 dark:text-error-300 bg-error-50 dark:bg-error-500/15 border-2 border-error-300 rounded-xl px-3 py-2">
                {createError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={resetCreateModal}
                className={`${btnBase} flex-1 justify-center bg-gray-25 dark:bg-gray-800 text-gray-700`}
              >
                {t("admin.partyManagement.form.cancel")}
              </button>
              <button
                type="submit"
                disabled={creating}
                className={`${btnBase} flex-1 justify-center bg-orange-300 text-game-outline`}
              >
                {creating ? (
                  <><Spinner size={13} /> {t("admin.partyManagement.form.creating")}</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t("admin.partyManagement.form.createParty")}
                  </>
                )}
              </button>
            </div>
          </form>
        </GameModal>
      )}
    </>
  );
}
