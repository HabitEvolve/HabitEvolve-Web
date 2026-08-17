import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight, Plus, Tent } from "lucide-react";
import { useAlert } from "../../context/AlertContext";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageHeader from "../../components/common/PageHeader";
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
        <PageHeader
          className="mb-7"
          icon={<Tent className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
          tone="deep"
          eyebrow={t("admin.partyManagement.hub.kicker")}
          title={t("admin.partyManagement.pageTitle")}
          description={t("admin.partyManagement.hub.heroLede")}
        />

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
            <Plus className="w-6 h-6 text-sky-deep" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-xl sm:text-2xl font-semibold text-white leading-tight tracking-tight">
              {t("admin.partyManagement.hub.createCta")}
            </p>
            <p className="text-sm text-white/80 font-medium mt-0.5">
              {t("admin.partyManagement.hub.createSub")}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto shrink-0 hidden sm:block text-white transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
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
          <div className="relative overflow-hidden rounded-sky-card sky-glass px-6 py-5 flex items-center justify-between gap-4">
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" aria-hidden="true" />
            <span className="relative inline-flex items-center gap-2 text-sm font-semibold text-sky-rose-deep">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> {partiesError}
            </span>
            <SkyButton type="button" variant="secondary" size="sm" onClick={fetchParties} className="relative shrink-0">
              {t("admin.partyManagement.retry")}
            </SkyButton>
          </div>
        )}

        {/* Empty state */}
        {!loadingParties && !partiesError && parties.length === 0 && (
          <div className="text-center py-24 rounded-sky-card bg-white/45 ring-1 ring-white/70">
            <span className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-sky-ink/6 ring-1 ring-sky-ink/12 text-sky-ink-3">
              <Tent className="w-6 h-6" aria-hidden="true" />
            </span>
            <p className="font-display text-xl font-semibold text-sky-ink">{t("admin.partyManagement.noParties")}</p>
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
                <span className="font-display text-2xl sm:text-3xl font-semibold text-sky-ink/12 group-hover:text-sky-deep/40 transition-colors w-9 sm:w-11 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-sky-ink truncate">{party.name}</h3>
                    <JoinPolicyBadge policy={party.joinPolicy} />
                  </div>
                  <p className="text-sm text-sky-ink-2 font-medium truncate mt-0.5">
                    {party.description || t("admin.partyManagement.noDescription")}
                  </p>
                </div>
                <div className="hidden sm:block w-44 shrink-0">
                  <CapacityMeter current={party.memberCount ?? 0} max={party.maxMembers || 1} />
                </div>
                <ArrowRight className="w-5 h-5 shrink-0 text-sky-ink-3 transition-all duration-150 group-hover:text-sky-deep group-hover:translate-x-1" aria-hidden="true" />
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
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3 mb-1.5">
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
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3 mb-1.5">
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
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3 mb-2">
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
                          : "ring-1 ring-white/75 bg-white/45 hover:ring-sky-deep/30"
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
              <p className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-sky-chip bg-sky-rose/10 ring-1 ring-sky-rose/26 px-3 py-2 text-xs font-semibold text-sky-rose-deep">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {createError}
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
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
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
