import { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Link2, Copy, Check, RefreshCw, Users, UserPlus, X,
  Trash2, AlertTriangle, ShieldAlert,
} from "lucide-react";
import { useAlert } from "../../../context/AlertContext";
import { useWindowFocusRefetch } from "../../../hooks/useWindowFocusRefetch";
import partyMentorApi from "../../../api/mentorPartyApi";
import SkyButton from "../../../components/ui/button/SkyButton";
import {
  inputCls, eyebrow, fieldLabel, Spinner,
  Panel, SkyModal, CountBadge,
} from "./sharedSky";
import type { PartyWorkspaceContext } from "./PartyWorkspace";
import type { PartyMember, JoinRequestItem } from "../../../types/api.types";

// Avatar tints are derived from the name, so a member keeps the same colour on
// every visit and a roster never reads as one flat block of identical circles.
// Teal is deliberately absent: these tiles are decoration, and teal is spoken
// for by success/approved state (§4).
const AVATAR_TINTS = [
  "from-sky-deep-lo to-sky-deep",
  "from-sky-violet to-sky-violet-deep",
  "from-sky-peach to-sky-peach-deep",
  "from-sky-rose to-sky-rose-deep",
  "from-sky-1 to-sky-deep-lo",
];
const tintFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 31) % 997;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
};

const softCard = "rounded-sky-chip bg-white/68 ring-1 ring-white/78";

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

  // Party Chat's SignalR socket doesn't cover this tab's plain REST-loaded state
  // (members, join requests) — refetch on tab focus so a mentor coming back from
  // another tab sees who actually joined/left instead of a stale roster.
  useWindowFocusRefetch(() => {
    fetchMembers();
    if (party.joinPolicy === "APPROVAL_REQUIRED") fetchJoinRequests();
  });

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

  // The code is shown as discrete character tiles — a redeem-code, not a line of
  // body text. Purely presentational: the value itself is untouched, and the
  // Copy button remains the reliable way to lift it.
  const codeChars = (inviteCode || "————").split("");

  return (
    <div className="space-y-6 sky-stagger">
      {/* ── SECRET KEY — inverted-ink panel; the one deliberately dark surface ── */}
      <div className="relative overflow-hidden bg-sky-ink rounded-sky-card shadow-sky-glass p-6 sm:p-7">
        {/* A single cool bloom so the dark panel is lit rather than merely filled. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-sky-deep/40 blur-3xl"
        />
        <div className="relative flex items-center gap-2 mb-4">
          <span className="grid place-items-center w-8 h-8 rounded-sky-chip bg-white/10 ring-1 ring-inset ring-white/20 text-sky-3">
            <Link2 size={15} strokeWidth={2.4} />
          </span>
          <h2 className="text-sky-small font-semibold uppercase tracking-[0.14em] text-sky-3">
            {t("admin.partyManagement.hub.secretKeyLabel")}
          </h2>
        </div>
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div
            className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0 select-all"
            aria-label={inviteCode || undefined}
          >
            {codeChars.map((ch, i) => (
              <span
                key={i}
                className="grid place-items-center min-w-9 h-13 px-2 rounded-sky-chip bg-white/10 ring-1 ring-inset ring-white/20 font-display text-2xl font-semibold text-white tabular-nums"
              >
                {ch}
              </span>
            ))}
          </div>
          <div className="flex gap-2 shrink-0">
            <SkyButton type="button" variant="secondary" size="sm" onClick={handleCopyCode} disabled={!inviteCode}>
              {codeCopied ? (
                <><Check size={13} strokeWidth={2.6} /> {t("admin.partyManagement.copied")}</>
              ) : (
                <><Copy size={13} strokeWidth={2.4} /> {t("admin.partyManagement.copy")}</>
              )}
            </SkyButton>
            <SkyButton type="button" variant="primary" size="sm" onClick={handleGenerateCode} disabled={generatingCode}>
              {generatingCode ? (
                <><Spinner size={13} /> {t("admin.partyManagement.regenerating")}</>
              ) : (
                <><RefreshCw size={13} strokeWidth={2.4} /> {t("admin.partyManagement.regenerate")}</>
              )}
            </SkyButton>
          </div>
        </div>
        <p className="relative text-xs text-sky-3/80 font-medium mt-4">
          {t("admin.partyManagement.hub.secretKeyHint")}
        </p>
      </div>

      {/* ── ACTIVE MEMBERS — equal-height roster tiles, not a table ───────────── */}
      <Panel
        title={t("admin.partyManagement.activeMembers")}
        tint="mint"
        icon={<Users size={17} strokeWidth={2.4} />}
        // A roster size is a quantity, not a verdict — so it stays on the cool
        // operational hue rather than borrowing the success tint.
        badge={<CountBadge count={members.length} />}
      >
        {loadingMembers ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${softCard} h-40 animate-pulse`} aria-hidden="true" />
            ))}
            <span className="sr-only">{t("admin.partyManagement.loadingMembers")}</span>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-10 rounded-sky-chip bg-white/40 border border-dashed border-sky-ink/16">
            <p className="text-sm font-semibold text-sky-ink-3">{t("admin.partyManagement.noMembers")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => (
              <div
                key={m.userId}
                className={`group relative h-full flex flex-col items-center justify-between gap-2.5 ${softCard} px-4 py-5 transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-sky-chip`}
              >
                <span
                  className={`grid place-items-center w-13 h-13 rounded-full bg-linear-to-br ${tintFor(m.username)} font-display text-lg font-semibold text-white shadow-sky-chip`}
                  aria-hidden="true"
                >
                  {m.username.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-sky-ink truncate max-w-full">{m.username}</span>
                {m.role ? (
                  <span className="px-2 py-0.5 rounded-full bg-sky-ink/8 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-ink-2">
                    {m.role}
                  </span>
                ) : (
                  <span className="h-4" aria-hidden="true" />
                )}
                <SkyButton
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => setMemberToKick(m)}
                  aria-label={t("admin.partyManagement.hub.kickAria", { username: m.username })}
                  className="absolute -top-2.5 -right-2.5 rounded-full w-9 h-9 opacity-0 motion-safe:scale-90 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 focus-visible:opacity-100 focus-visible:scale-100"
                >
                  <X size={13} strokeWidth={3} />
                </SkyButton>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── PENDING REQUESTS — rapid accept / reject ──────────────────── */}
      {party.joinPolicy === "APPROVAL_REQUIRED" && (
        <Panel
          title={t("admin.partyManagement.pendingRequests")}
          tint="peach"
          icon={<UserPlus size={17} strokeWidth={2.4} />}
          badge={
            joinRequests.length > 0 ? (
              <CountBadge count={joinRequests.length} color="bg-sky-peach/22 text-sky-peach-deep" />
            ) : undefined
          }
        >
          {loadingRequests ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className={`${softCard} h-20 animate-pulse`} aria-hidden="true" />
              ))}
              <span className="sr-only">{t("admin.partyManagement.loadingRequests")}</span>
            </div>
          ) : joinRequests.length === 0 ? (
            <div className="text-center py-10 rounded-sky-chip bg-white/40 border border-dashed border-sky-peach/45">
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
                  className={`relative overflow-hidden flex flex-col sm:flex-row items-stretch sm:items-center gap-4 ${softCard} px-5 py-4`}
                >
                  {/* Peach rail: waiting on the mentor, not an error. */}
                  <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-peach" />
                  <div className="flex items-center gap-3 flex-1 min-w-0 pl-1.5">
                    <span
                      className={`grid place-items-center w-11 h-11 rounded-full bg-linear-to-br ${tintFor(req.username)} font-display text-sm font-semibold text-white shrink-0`}
                      aria-hidden="true"
                    >
                      {req.username.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-sky-ink truncate">{req.username}</p>
                      {req.message && (
                        <p className="mt-1 pl-2.5 border-l-2 border-sky-peach/45 text-xs text-sky-ink-2 font-medium italic truncate">
                          {req.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2.5 shrink-0">
                    <SkyButton
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReject(req.requestId)}
                      disabled={processingReqId === req.requestId}
                      aria-label={t("admin.partyManagement.reject")}
                    >
                      {processingReqId === req.requestId
                        ? <Spinner size={14} />
                        : <X size={14} strokeWidth={2.8} />}
                      <span className="hidden sm:inline">{t("admin.partyManagement.reject")}</span>
                    </SkyButton>
                    <SkyButton
                      type="button"
                      variant="success"
                      size="sm"
                      onClick={() => handleApprove(req.requestId)}
                      disabled={processingReqId === req.requestId}
                      aria-label={t("admin.partyManagement.approve")}
                    >
                      {processingReqId === req.requestId
                        ? <Spinner size={14} />
                        : <Check size={14} strokeWidth={2.8} />}
                      <span className="hidden sm:inline">{t("admin.partyManagement.approve")}</span>
                    </SkyButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ── DANGER ZONE — hazard rail, deliberate confirmation ────────── */}
      <div className="relative overflow-hidden rounded-sky-card bg-sky-rose/8 ring-1 ring-sky-rose/25 shadow-sky-tint p-6 sm:p-7">
        {/* A caution stripe rather than a fully red panel: the page keeps its
            calm, and the warning still reads as "stop and think". */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-1.5 bg-[repeating-linear-gradient(135deg,var(--color-sky-rose)_0_7px,var(--color-sky-rose-deep)_7px_14px)]"
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pl-1.5">
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid place-items-center w-11 h-11 rounded-sky-chip bg-sky-rose/14 ring-1 ring-sky-rose/30 text-sky-rose-deep shrink-0">
              <ShieldAlert size={19} strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <span className={`inline-block mb-1 ${eyebrow} text-sky-rose-deep/70`}>
                {t("admin.partyManagement.hub.hazardEyebrow")}
              </span>
              <h3 className="font-display text-sky-h3 font-semibold text-sky-rose-deep leading-tight">
                {t("admin.partyManagement.dangerZone")}
              </h3>
              <p className="text-sm text-sky-ink-2 font-medium mt-1">
                {t("admin.partyManagement.disbandWarning")}
              </p>
            </div>
          </div>
          <SkyButton type="button" variant="destructive" onClick={openDisbandModal} className="shrink-0">
            <Trash2 size={14} strokeWidth={2.4} />
            {t("admin.partyManagement.disbandParty")}
          </SkyButton>
        </div>
      </div>

      {/* ══════════════════ MODAL: CONFIRM DISBAND (type-to-confirm) ═══════════════════ */}
      {showDisband && (
        <SkyModal title={t("admin.partyManagement.disbandModal.title")} onClose={closeDisbandModal}>
          <div className="space-y-5">
            <div className="flex items-center justify-center">
              <span className="grid place-items-center w-16 h-16 rounded-full bg-sky-rose/14 ring-1 ring-sky-rose/32 text-sky-rose-deep shadow-sky-chip">
                <AlertTriangle size={27} strokeWidth={2.4} />
              </span>
            </div>
            <div className="text-center">
              <p className="font-display text-sky-h3 font-semibold text-sky-ink">
                {t("admin.partyManagement.disbandModal.disbandVerb")}{" "}
                <span className="text-sky-rose-deep">{party.name}</span>?
              </p>
              <p className="relative text-sm text-sky-ink-2 font-medium mt-3 leading-relaxed text-left rounded-sky-chip bg-sky-rose/8 ring-1 ring-sky-rose/22 px-4 py-3 pl-5 overflow-hidden">
                <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                {t("admin.partyManagement.disbandModal.message")}
              </p>
            </div>
            <div>
              <label className={fieldLabel}>
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
              {/* The gate state is spelled out, never colour-only. */}
              <p className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-sky-ink-3">
                {disbandGateOpen
                  ? <><Check size={12} strokeWidth={3} className="text-sky-teal" /> {party.name}</>
                  : <><AlertTriangle size={12} strokeWidth={2.6} className="text-sky-ink-3" /> {party.name}</>}
              </p>
            </div>
            <div className="flex gap-3">
              <SkyButton type="button" variant="secondary" onClick={closeDisbandModal} disabled={disbanding} className="flex-1">
                {t("admin.partyManagement.disbandModal.cancel")}
              </SkyButton>
              <SkyButton type="button" variant="destructive" onClick={handleDisbandConfirm} disabled={disbanding || !disbandGateOpen} className="flex-1">
                {disbanding ? (
                  <><Spinner size={13} /> {t("admin.partyManagement.disbandModal.disbanding")}</>
                ) : (
                  <><Trash2 size={14} strokeWidth={2.4} /> {t("admin.partyManagement.disbandModal.confirm")}</>
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
              <span className={`grid place-items-center w-16 h-16 rounded-full bg-linear-to-br ${tintFor(memberToKick.username)} font-display text-xl font-semibold text-white shadow-sky-chip`}>
                {memberToKick.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-display text-sky-h3 font-semibold text-sky-ink">
                {t("admin.partyManagement.kickModal.removeVerb")}{" "}
                <span className="text-sky-rose-deep">{memberToKick.username}</span>?
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
                  <><Trash2 size={14} strokeWidth={2.4} /> {t("admin.partyManagement.kickModal.confirm")}</>
                )}
              </SkyButton>
            </div>
          </div>
        </SkyModal>
      )}
    </div>
  );
}
