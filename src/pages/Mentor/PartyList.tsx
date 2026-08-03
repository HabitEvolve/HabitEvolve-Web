import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAlert } from "../../context/AlertContext";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import partyMentorApi from "../../api/mentorPartyApi";
import SkyCard from "../../components/ui/card/SkyCard";
import SkyButton from "../../components/ui/button/SkyButton";
import {
  getMentorId, Spinner, easeExpo, inputCls,
  JoinPolicyBadge, CapacityMeter, SkyModal,
  POLICY_STYLES, JOIN_POLICIES, POLICY_LABEL_KEYS,
} from "./PartyWorkspace/sharedSky";
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
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.16em] text-sky-deep mb-2">
            {t("admin.partyManagement.hub.kicker")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-sky-ink tracking-tight leading-[1.05]">
            {t("admin.partyManagement.pageTitle")}
          </h1>
          <p className="text-sm sm:text-base text-sky-ink-2 font-medium mt-2">
            {t("admin.partyManagement.hub.heroLede")}
          </p>
        </div>

        {/* Massive "Create New Party" tile — a rich icon+title+subtitle+arrow
            layout that doesn't fit SkyButton's centered single-line shape, so
            it stays a custom button, styled with the same primary gradient/
            shadow tokens SkyButton's primary variant uses for visual parity. */}
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={`group w-full flex items-center gap-5 sm:gap-6 text-left bg-linear-to-br from-sky-deep-lo to-sky-deep text-white rounded-sky-card shadow-sky-fill hover:scale-[1.01] transition-transform duration-150 ${easeExpo} px-6 sm:px-8 py-6 sm:py-7 mb-8`}
        >
          <span className={`sky-glass-chip flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 shrink-0 group-hover:rotate-90 transition-transform duration-300 ${easeExpo}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-sky-deep">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
              {t("admin.partyManagement.hub.createCta")}
            </p>
            <p className="text-sm text-white/80 font-medium mt-0.5">
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
          <div className="flex items-center justify-center gap-3 py-20 text-sky-ink-3">
            <Spinner size={24} />
            <span className="font-semibold text-sm">{t("admin.partyManagement.loading")}</span>
          </div>
        )}

        {/* Error state */}
        {!loadingParties && partiesError && (
          <div className="bg-error-50 border border-error-400 rounded-sky-card shadow-sky-tint px-6 py-5 flex items-center justify-between gap-4">
            <span className="font-semibold text-error-800 text-sm">{partiesError}</span>
            <SkyButton type="button" variant="secondary" size="sm" onClick={fetchParties}>
              {t("admin.partyManagement.retry")}
            </SkyButton>
          </div>
        )}

        {/* Empty state */}
        {!loadingParties && !partiesError && parties.length === 0 && (
          <div className="text-center py-24 border border-dashed border-sky-ink/15 rounded-sky-card bg-white/40">
            <div className="text-5xl mb-4">🏕️</div>
            <p className="font-bold text-sky-ink text-xl">{t("admin.partyManagement.noParties")}</p>
            <p className="text-sky-ink-2 text-sm mt-1 font-medium">
              {t("admin.partyManagement.noPartiesHint")}
            </p>
          </div>
        )}

        {/* Quest-board roster — a divided list, not identical nested cards */}
        {!loadingParties && !partiesError && parties.length > 0 && (
          <SkyCard variant="mentor" className="p-0 overflow-hidden divide-y divide-sky-surf-border">
            {parties.map((party, i) => (
              <button
                type="button"
                key={party.partyId}
                onClick={() => navigate(`/mentor/parties/${party.partyId}`)}
                style={{ animationDelay: `${i * 45}ms` }}
                className={`quest-row-in group w-full flex items-center gap-4 sm:gap-6 text-left px-5 sm:px-7 py-5 sm:py-6 hover:bg-sky-3/20 transition-colors duration-150 ${i % 2 === 1 ? "bg-sky-3/10" : ""}`}
              >
                <span className="text-2xl sm:text-3xl font-bold text-sky-ink/10 group-hover:text-sky-deep/40 transition-colors w-9 sm:w-11 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-bold text-sky-ink truncate">{party.name}</h3>
                    <JoinPolicyBadge policy={party.joinPolicy} />
                  </div>
                  <p className="text-sm text-sky-ink-2 font-medium truncate mt-0.5">
                    {party.description || t("admin.partyManagement.noDescription")}
                  </p>
                </div>
                <div className="hidden sm:block w-32 shrink-0">
                  <CapacityMeter current={party.memberCount ?? 0} max={party.maxMembers || 1} />
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-ink-3 group-hover:text-sky-deep group-hover:translate-x-1 transition-all shrink-0">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            ))}
          </SkyCard>
        )}
      </div>

      {/* ══════════════════ MODAL: CREATE PARTY ══════════════════════ */}
      {showCreate && (
        <SkyModal title={t("admin.partyManagement.form.createTitle")} onClose={resetCreateModal}>
          <form onSubmit={handleCreateParty} className="space-y-5">
            <div>
              <label className="block text-sky-small font-semibold text-sky-ink-2 uppercase tracking-wide mb-1.5">
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
              <label className="block text-sky-small font-semibold text-sky-ink-2 uppercase tracking-wide mb-1.5">
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
              <label className="block text-sky-small font-semibold text-sky-ink-2 uppercase tracking-wide mb-2">
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-sky-chip cursor-pointer transition-all duration-150 ${checked
                          ? `${s.bg} ring-2 ${s.ring}`
                          : "border border-sky-surf-border bg-white/40 hover:border-sky-deep/30"
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
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${checked ? "border-sky-deep bg-white" : "border-sky-ink/20 bg-white/40"
                          }`}
                      >
                        {checked && <span className="w-2 h-2 rounded-full bg-sky-deep" />}
                      </span>
                      <span className={`text-sm font-semibold ${checked ? s.text : "text-sky-ink-2"}`}>
                        {policyLabel}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {createError && (
              <p className="text-xs font-semibold text-error-600 bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">
                {createError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <SkyButton type="button" variant="secondary" onClick={resetCreateModal} className="flex-1">
                {t("admin.partyManagement.form.cancel")}
              </SkyButton>
              <SkyButton type="submit" variant="primary" disabled={creating} className="flex-1">
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
              </SkyButton>
            </div>
          </form>
        </SkyModal>
      )}
    </>
  );
}
