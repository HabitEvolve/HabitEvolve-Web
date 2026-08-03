import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { useAlert } from "../../../context/AlertContext";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import partyMentorApi from "../../../api/mentorPartyApi";
import TabBar from "./TabBar";
import SkyButton from "../../../components/ui/button/SkyButton";
import {
  inputCls, Spinner,
  JoinPolicyBadge, CapacityMeter, SkyModal,
  POLICY_STYLES, JOIN_POLICIES, POLICY_LABEL_KEYS,
} from "./sharedSky";
import type { PartyItem, UpdatePartyPayload } from "../../../types/api.types";

export interface PartyWorkspaceContext {
  party: PartyItem;
  partyId: number;
  onPartyUpdated: (patch: Partial<PartyItem>) => void;
}

export default function PartyWorkspace() {
  const { partyId: partyIdParam } = useParams<{ partyId: string }>();
  const partyId = Number(partyIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const notify = useAlert();

  const [party, setParty] = useState<PartyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParty = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await partyMentorApi.getPartyById(partyId);
      if (res.success && res.data) setParty(res.data);
      else setError(res.message ?? t("admin.partyManagement.flashCreateFailed"));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t("admin.partyManagement.flashCreateFailed"));
    } finally {
      setLoading(false);
    }
  }, [partyId, t]);

  useEffect(() => {
    if (Number.isFinite(partyId)) fetchParty();
  }, [partyId, fetchParty]);

  const handlePartyUpdated = (patch: Partial<PartyItem>) => {
    setParty((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  // ── EDIT PARTY (party-wide, lives in the workspace shell, not a tab) ────────
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<UpdatePartyPayload>({ name: "", description: "", joinPolicy: "PUBLIC" });
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = () => {
    if (!party) return;
    setEditForm({ name: party.name, description: party.description, joinPolicy: party.joinPolicy });
    setEditError(null);
    setShowEdit(true);
  };

  const resetEditModal = () => {
    setShowEdit(false);
    setEditError(null);
  };

  const handleUpdateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!party) return;
    setUpdating(true);
    setEditError(null);
    try {
      const res = await partyMentorApi.updateParty(party.partyId, editForm);
      if (res.success) {
        handlePartyUpdated(editForm);
        resetEditModal();
        notify.success(t("admin.partyManagement.flashUpdated"));
      } else {
        setEditError(res.message ?? t("admin.partyManagement.flashUpdateFailed"));
      }
    } catch (err) {
      setEditError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? t("admin.partyManagement.flashUpdateFailed")
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={40} />
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="p-6 bg-error-50 border border-error-400 rounded-sky-card shadow-sky-tint flex items-center justify-between gap-4">
        <span className="font-semibold text-error-800 text-sm">{error ?? t("admin.partyManagement.flashCreateFailed")}</span>
        <SkyButton type="button" variant="secondary" onClick={() => navigate("/mentor/parties")}>
          {t("admin.partyManagement.backToList")}
        </SkyButton>
      </div>
    );
  }

  return (
    <>
      <PageMeta title={`${party.name} — HabitEvolve`} description={party.description || "Party workspace"} />
      <PageBreadcrumb pageTitle={party.name} />

      <div className="space-y-6">
        <SkyButton type="button" variant="secondary" onClick={() => navigate("/mentor/parties")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t("admin.partyManagement.backToList")}
        </SkyButton>

        {/* Huge party name + meta, distinct hierarchy */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="min-w-0">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.16em] text-sky-deep mb-2">
              {t("admin.partyManagement.hub.commandKicker")}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-sky-ink tracking-tight leading-[0.95] wrap-break-word">
              {party.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <JoinPolicyBadge policy={party.joinPolicy} />
              <CapacityMeter current={party.memberCount ?? 0} max={party.maxMembers || 1} />
              {party.description && (
                <span className="text-sm text-sky-ink-2 font-medium truncate max-w-[40ch]">
                  {party.description}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <SkyButton type="button" variant="secondary" onClick={openEditModal}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {t("admin.partyManagement.editParty")}
            </SkyButton>
          </div>
        </div>

        <TabBar />

        {/* Tab content — keyed by pathname so the crossfade replays on every switch */}
        <div key={location.pathname} className="tab-panel-in">
          <Outlet context={{ party, partyId, onPartyUpdated: handlePartyUpdated } satisfies PartyWorkspaceContext} />
        </div>
      </div>

      {showEdit && (
        <SkyModal title={t("admin.partyManagement.form.editTitle")} onClose={resetEditModal}>
          <form onSubmit={handleUpdateParty} className="space-y-5">
            <div>
              <label className="block text-sky-small font-semibold text-sky-ink-2 uppercase tracking-wide mb-1.5">
                {t("admin.partyManagement.form.nameLabel")}
              </label>
              <input
                type="text"
                required
                value={editForm.name ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
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
                value={editForm.description ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
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
                  const checked = editForm.joinPolicy === policy;
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
                        name="editJoinPolicy"
                        value={policy}
                        checked={checked}
                        onChange={() => setEditForm((p) => ({ ...p, joinPolicy: policy }))}
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

            {editError && (
              <p className="text-xs font-semibold text-error-600 bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">
                {editError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <SkyButton type="button" variant="secondary" onClick={resetEditModal} className="flex-1">
                {t("admin.partyManagement.form.cancel")}
              </SkyButton>
              <SkyButton type="submit" variant="primary" disabled={updating} className="flex-1">
                {updating ? (
                  <><Spinner size={13} /> {t("admin.partyManagement.form.saving")}</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    {t("admin.partyManagement.form.saveChanges")}
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
