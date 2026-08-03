import { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAlert } from "../../../context/AlertContext";
import partyMentorApi from "../../../api/mentorPartyApi";
import SkyButton from "../../../components/ui/button/SkyButton";
import {
  inputCls, Spinner,
  Panel, SkyModal, CountBadge,
} from "./sharedSky";
import type { PartyWorkspaceContext } from "./PartyWorkspace";
import type { PartyMember, JoinRequestItem } from "../../../types/api.types";

export default function OverviewTab() {
  const { party, partyId } = useOutletContext<PartyWorkspaceContext>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const notify = useAlert();

  // ── INVITE CODE ─────────────────────────────────────────────────────────────
  const [inviteCode, setInviteCode] = useState(party.inviteCode ?? "");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await partyMentorApi.generateInviteCode(partyId);
      if (res.success && res.data) {
        setInviteCode(res.data);
        notify.success(t("admin.partyManagement.flashCodeGenerated"));
      } else {
        notify.error(res.message ?? t("admin.partyManagement.flashCodeFailed"));
      }
    } catch (err: any) {
      notify.error(err?.response?.data?.message ?? t("admin.partyManagement.flashCodeFailed"));
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      notify.error(t("admin.partyManagement.flashCopyFailed"));
    }
  };

  // ── MEMBERS ─────────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberToKick, setMemberToKick] = useState<PartyMember | null>(null);
  const [kicking, setKicking] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await partyMentorApi.getPartyMembers(partyId);
      if (res.success && res.data) setMembers(res.data);
    } catch {
      // silent — member list just stays empty
    } finally {
      setLoadingMembers(false);
    }
  }, [partyId]);

  const handleKickConfirm = async () => {
    if (!memberToKick) return;
    setKicking(true);
    try {
      const res = await partyMentorApi.removePlayerFromParty(partyId, memberToKick.userId);
      if (res.success) {
        notify.success(t("admin.partyManagement.flashKicked", { username: memberToKick.username }));
        fetchMembers();
      } else {
        notify.error(res.message ?? t("admin.partyManagement.flashKickFailed"));
      }
    } catch (err: any) {
      notify.error(err?.response?.data?.message ?? t("admin.partyManagement.flashKickFailed"));
    } finally {
      setKicking(false);
      setMemberToKick(null);
    }
  };

  // ── JOIN REQUESTS ───────────────────────────────────────────────────────────
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingReqId, setProcessingReqId] = useState<number | null>(null);

  const fetchJoinRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await partyMentorApi.getJoinRequests(partyId);
      if (res.success && res.data) setJoinRequests(res.data);
    } catch {
      // silent
    } finally {
      setLoadingRequests(false);
    }
  }, [partyId]);

  const handleApprove = async (requestId: number) => {
    setProcessingReqId(requestId);
    try {
      const res = await partyMentorApi.approveJoinRequest(partyId, requestId);
      if (res.success) {
        notify.success(t("admin.partyManagement.flashApproved"));
        fetchJoinRequests();
        fetchMembers();
      } else {
        notify.error(res.message ?? t("admin.partyManagement.flashApproveFailed"));
      }
    } catch (err: any) {
      notify.error(err?.response?.data?.message ?? t("admin.partyManagement.flashApproveFailed"));
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setProcessingReqId(requestId);
    try {
      const res = await partyMentorApi.rejectJoinRequest(partyId, requestId);
      if (res.success) {
        notify.success(t("admin.partyManagement.flashRejected"));
        fetchJoinRequests();
      } else {
        notify.error(res.message ?? t("admin.partyManagement.flashRejectFailed"));
      }
    } catch (err: any) {
      notify.error(err?.response?.data?.message ?? t("admin.partyManagement.flashRejectFailed"));
    } finally {
      setProcessingReqId(null);
    }
  };

  useEffect(() => {
    fetchMembers();
    if (party.joinPolicy === "APPROVAL_REQUIRED") {
      fetchJoinRequests();
    } else {
      setJoinRequests([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]);

  // ── DISBAND PARTY ───────────────────────────────────────────────────────────
  const [showDisband, setShowDisband] = useState(false);
  const [disbanding, setDisbanding] = useState(false);
  const [disbandConfirmInput, setDisbandConfirmInput] = useState("");

  const openDisbandModal = () => {
    setDisbandConfirmInput("");
    setShowDisband(true);
  };

  const closeDisbandModal = () => {
    setShowDisband(false);
    setDisbandConfirmInput("");
  };

  const handleDisbandConfirm = async () => {
    setDisbanding(true);
    try {
      const res = await partyMentorApi.deleteParty(partyId);
      if (res.success) {
        notify.success(t("admin.partyManagement.flashDisbanded", { name: party.name }));
        navigate("/mentor/parties");
      } else {
        notify.error(res.message ?? t("admin.partyManagement.flashDisbandFailed"));
        setShowDisband(false);
      }
    } catch (err) {
      notify.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? t("admin.partyManagement.flashDisbandFailed")
      );
      setShowDisband(false);
    } finally {
      setDisbanding(false);
    }
  };

  const disbandGateOpen = disbandConfirmInput.trim() === party.name;

  return (
    <div className="space-y-6">
      {/* ── SECRET KEY — premium, inverted-ink panel (always dark by design) ── */}
      <div className="bg-sky-ink rounded-sky-card shadow-sky-glass p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-3">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-3">
            {t("admin.partyManagement.hub.secretKeyLabel")}
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 flex items-center bg-white/8 border border-white/15 rounded-sky-chip px-5 py-4 min-w-0">
            <code className="flex-1 text-2xl sm:text-3xl font-bold tracking-[0.2em] text-white select-all truncate font-mono">
              {inviteCode || "————"}
            </code>
          </div>
          <div className="flex gap-2 shrink-0">
            <SkyButton type="button" variant="secondary" size="sm" onClick={handleCopyCode} disabled={!inviteCode}>
              {codeCopied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t("admin.partyManagement.copied")}
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {t("admin.partyManagement.copy")}
                </>
              )}
            </SkyButton>
            <SkyButton type="button" variant="primary" size="sm" onClick={handleGenerateCode} disabled={generatingCode}>
              {generatingCode ? (
                <><Spinner size={13} /> {t("admin.partyManagement.regenerating")}</>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  {t("admin.partyManagement.regenerate")}
                </>
              )}
            </SkyButton>
          </div>
        </div>
        <p className="text-xs text-sky-3/80 font-medium mt-3">
          {t("admin.partyManagement.hub.secretKeyHint")}
        </p>
      </div>

      {/* ── ACTIVE MEMBERS — equal-height grid, not a table ───────────── */}
      <Panel
        title={t("admin.partyManagement.activeMembers")}
        tint="mint"
        icon={
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
        badge={<CountBadge count={members.length} color="bg-success-100 text-success-800" />}
      >
        {loadingMembers ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sky-ink-3">
            <Spinner size={20} />
            <span className="text-sm font-semibold">{t("admin.partyManagement.loadingMembers")}</span>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-success-300 rounded-sky-chip bg-white/40">
            <p className="text-sm font-semibold text-sky-ink-3">{t("admin.partyManagement.noMembers")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => (
              <div
                key={m.userId}
                className="group relative h-full flex flex-col items-center justify-between gap-2 bg-white/70 border border-sky-surf-border rounded-sky-chip px-4 py-5 hover:shadow-sky-chip transition-shadow duration-150"
              >
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-br from-purple-200 to-sky-3 text-base font-bold text-sky-ink">
                  {m.username.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-sky-ink truncate max-w-full">{m.username}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-ink-3 min-h-3.5">
                  {m.role ?? ""}
                </span>
                <SkyButton
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => setMemberToKick(m)}
                  aria-label={t("admin.partyManagement.hub.kickAria", { username: m.username })}
                  className="absolute -top-2.5 -right-2.5 rounded-full w-9 h-9 opacity-70 hover:opacity-100 focus-visible:opacity-100 hover:scale-110 focus-visible:scale-110"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </SkyButton>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── PENDING REQUESTS — Tinder-style rapid accept/reject ───────── */}
      {party.joinPolicy === "APPROVAL_REQUIRED" && (
        <Panel
          title={t("admin.partyManagement.pendingRequests")}
          tint="peach"
          icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          }
          badge={
            joinRequests.length > 0 ? (
              <CountBadge count={joinRequests.length} color="bg-sky-peach/20 text-sky-peach-deep" />
            ) : undefined
          }
        >
          {loadingRequests ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sky-ink-3">
              <Spinner size={20} />
              <span className="text-sm font-semibold">{t("admin.partyManagement.loadingRequests")}</span>
            </div>
          ) : joinRequests.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-sky-peach/40 rounded-sky-chip bg-white/40">
              <p className="text-sm font-semibold text-sky-ink-3">{t("admin.partyManagement.noRequests")}</p>
              <p className="text-xs text-sky-ink-3 font-medium mt-1">
                {t("admin.partyManagement.hub.requestsEmptyHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {joinRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white/70 border border-sky-surf-border rounded-sky-chip px-5 py-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="flex items-center justify-center w-11 h-11 rounded-full bg-linear-to-br from-sky-peach/40 to-warning-200 text-sm font-bold text-sky-ink shrink-0">
                      {req.username.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-sky-ink truncate">{req.username}</p>
                      {req.message && (
                        <p className="text-xs text-sky-ink-2 font-medium truncate italic">
                          "{req.message}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3 shrink-0">
                    <SkyButton
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => handleReject(req.requestId)}
                      disabled={processingReqId === req.requestId}
                      aria-label={t("admin.partyManagement.reject")}
                      className="rounded-full w-12 h-12"
                    >
                      {processingReqId === req.requestId ? (
                        <Spinner size={16} />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </SkyButton>
                    <SkyButton
                      type="button"
                      variant="success"
                      size="icon"
                      onClick={() => handleApprove(req.requestId)}
                      disabled={processingReqId === req.requestId}
                      aria-label={t("admin.partyManagement.approve")}
                      className="rounded-full w-12 h-12"
                    >
                      {processingReqId === req.requestId ? (
                        <Spinner size={16} />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </SkyButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ── DANGER ZONE — hazard, requires deliberate confirmation ────── */}
      <div className="bg-error-50 border border-error-400 rounded-sky-card shadow-sky-tint p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex items-center justify-center w-11 h-11 rounded-sky-chip border border-error-400 bg-white shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f04438" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <div className="min-w-0">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-error-600 mb-1">
                {t("admin.partyManagement.hub.hazardEyebrow")}
              </span>
              <h3 className="font-bold text-error-800 text-lg leading-tight">
                {t("admin.partyManagement.dangerZone")}
              </h3>
              <p className="text-sm text-error-700 font-medium mt-0.5">
                {t("admin.partyManagement.disbandWarning")}
              </p>
            </div>
          </div>
          <SkyButton type="button" variant="destructive" onClick={openDisbandModal} className="shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            {t("admin.partyManagement.disbandParty")}
          </SkyButton>
        </div>
      </div>

      {/* ══════════════════ MODAL: CONFIRM DISBAND (type-to-confirm) ═══════════════════ */}
      {showDisband && (
        <SkyModal title={t("admin.partyManagement.disbandModal.title")} onClose={closeDisbandModal}>
          <div className="space-y-5">
            <div className="flex items-center justify-center">
              <span className="flex items-center justify-center w-16 h-16 rounded-full border border-error-400 bg-error-50 shadow-sky-chip">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f04438" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
            </div>
            <div className="text-center">
              <p className="font-bold text-sky-ink text-lg">
                {t("admin.partyManagement.disbandModal.disbandVerb")}{" "}
                <span className="text-error-600">{party.name}</span>?
              </p>
              <p className="text-sm text-sky-ink-2 font-medium mt-2 leading-relaxed bg-error-50 border border-error-200 rounded-sky-chip px-4 py-3">
                {t("admin.partyManagement.disbandModal.message")}
              </p>
            </div>
            <div>
              <label className="block text-sky-small font-semibold text-sky-ink-2 uppercase tracking-wide mb-1.5">
                {t("admin.partyManagement.disbandModal.typeToConfirm", { name: party.name })}
              </label>
              <input
                type="text"
                value={disbandConfirmInput}
                onChange={(e) => setDisbandConfirmInput(e.target.value)}
                placeholder={t("admin.partyManagement.disbandModal.typeToConfirmPlaceholder")}
                autoComplete="off"
                className={inputCls}
              />
            </div>
            <div className="flex gap-3">
              <SkyButton type="button" variant="secondary" onClick={closeDisbandModal} disabled={disbanding} className="flex-1">
                {t("admin.partyManagement.disbandModal.cancel")}
              </SkyButton>
              <SkyButton type="button" variant="destructive" onClick={handleDisbandConfirm} disabled={disbanding || !disbandGateOpen} className="flex-1">
                {disbanding ? (
                  <><Spinner size={13} /> {t("admin.partyManagement.disbandModal.disbanding")}</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                    {t("admin.partyManagement.disbandModal.confirm")}
                  </>
                )}
              </SkyButton>
            </div>
          </div>
        </SkyModal>
      )}

      {/* ══════════════════ MODAL: CONFIRM KICK ══════════════════════ */}
      {memberToKick && (
        <SkyModal title={t("admin.partyManagement.kickModal.title")} onClose={() => setMemberToKick(null)}>
          <div className="text-center space-y-5">
            <div className="flex items-center justify-center">
              <span className="flex items-center justify-center w-16 h-16 rounded-full border border-error-400 bg-error-50 shadow-sky-chip">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f04438" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </span>
            </div>
            <div>
              <p className="font-bold text-sky-ink text-lg">
                {t("admin.partyManagement.kickModal.removeVerb")}{" "}
                <span className="text-error-600 font-bold">{memberToKick.username}</span>?
              </p>
              <p className="text-sm text-sky-ink-2 font-medium mt-1.5">
                {t("admin.partyManagement.kickModal.message")}
              </p>
            </div>
            <div className="flex gap-3">
              <SkyButton type="button" variant="secondary" onClick={() => setMemberToKick(null)} disabled={kicking} className="flex-1">
                {t("admin.partyManagement.kickModal.cancel")}
              </SkyButton>
              <SkyButton type="button" variant="destructive" onClick={handleKickConfirm} disabled={kicking} className="flex-1">
                {kicking ? (
                  <><Spinner size={13} /> {t("admin.partyManagement.kickModal.removing")}</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                    {t("admin.partyManagement.kickModal.confirm")}
                  </>
                )}
              </SkyButton>
            </div>
          </div>
        </SkyModal>
      )}
    </div>
  );
}
