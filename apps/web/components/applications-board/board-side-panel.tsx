"use client";

import type {
  ApplicationBoardStage,
  ApplicationBoardStageRecordResponse,
  ApplicationBoardTicketResponse,
  ApplicationCompensationCurrency,
  ApplicationCompensationPeriod,
  ApplicationJobSitePreset,
  GetApplicationSummaryResponse,
  GetBaseCvResponse,
  GetApplicationTicketResponse,
  UpdateApplicationBoardStageRequest,
} from "@repo/contracts";
import {
  APPLICATION_COMPENSATION_CURRENCIES,
  APPLICATION_COMPENSATION_PERIODS,
} from "@repo/contracts";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ApplicationStatusBadge } from "@/components/application-status-badge";
import { ApplicationSummaryCard } from "@/components/application-summary-card";
import { MarkdownSheet } from "@/components/markdown-sheet";
import { api, getErrorMessage } from "@/lib/api";
import {
  formatBoardCompensation,
  formatBoardDate,
  getBoardStageIndex,
  getBoardStageLabel,
  getBoardStageRecord,
  getBoardSavedStageRecords,
  summarizeStageRecord,
} from "@/lib/application-board";
import { buildResumeMarkdownForPreview } from "@/lib/legacy-resume-export";
import styles from "./applications-board.module.css";
import {
  buildStageRequest,
  createDraftFromStage,
  createSyntheticStageRecord,
  type SaveState,
  type StageDraft,
  type StageDraftQuestion,
} from "./shared";

type BoardSidePanelProps = {
  enableSummaryTestActions: boolean;
  jobSiteOptions: readonly ApplicationJobSitePreset[];
  normalizedCurrency: string;
  onClose: () => void;
  onSaveStage: (
    ticketId: string,
    stage: ApplicationBoardStage,
    request: UpdateApplicationBoardStageRequest
  ) => Promise<void>;
  ticket: ApplicationBoardTicketResponse;
};

type PreviewTab = "summary" | "resume";

const APPLICATION_GENERATION_POLL_INTERVAL_MS = 3_000;

function shouldPollTicketResult(
  ticket: GetApplicationTicketResponse | null | undefined
) {
  return Boolean(ticket && ticket.status === "processing" && !ticket.result);
}

export function BoardSidePanel({
  enableSummaryTestActions,
  jobSiteOptions,
  normalizedCurrency,
  onClose,
  onSaveStage,
  ticket,
}: BoardSidePanelProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [ticketDetails, setTicketDetails] =
    useState<GetApplicationTicketResponse | null>(null);
  const [summaryPayload, setSummaryPayload] =
    useState<GetApplicationSummaryResponse | null>(null);
  const [baseCv, setBaseCv] = useState("");
  const [ticketDetailsError, setTicketDetailsError] = useState<string | null>(
    null
  );
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryActionMessage, setSummaryActionMessage] = useState<
    string | null
  >(null);
  const [isTicketDetailsLoading, setIsTicketDetailsLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSummaryGenerationLoading, setIsSummaryGenerationLoading] =
    useState(false);
  const [isSummaryPolling, setIsSummaryPolling] = useState(false);
  const [isResumePolling, setIsResumePolling] = useState(false);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [activePreviewTab, setActivePreviewTab] =
    useState<PreviewTab>("summary");
  const [openStages, setOpenStages] = useState<ApplicationBoardStage[]>([
    ticket.currentStage,
  ]);
  const currentStageRecord =
    getBoardStageRecord(ticket, ticket.currentStage) ??
    createSyntheticStageRecord(ticket);
  const [draft, setDraft] = useState<StageDraft>(() =>
    createDraftFromStage(ticket.currentStage, currentStageRecord)
  );
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const savedStages = getBoardSavedStageRecords(ticket);
  const stageRecords = savedStages.some(
    (stageRecord) => stageRecord.stage === ticket.currentStage
  )
    ? savedStages
    : [...savedStages, createSyntheticStageRecord(ticket)].sort(
        (left, right) =>
          getBoardStageIndex(left.stage) - getBoardStageIndex(right.stage)
      );
  const hasEditableFields =
    ticket.currentStage !== "passed" && ticket.currentStage !== "ignored";

  useEffect(() => {
    const nextPortalRoot = document.body;
    const previousOverflow = nextPortalRoot.style.overflow;

    setPortalRoot(nextPortalRoot);
    nextPortalRoot.style.overflow = "hidden";

    return () => {
      nextPortalRoot.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    setTicketDetails(null);
    setBaseCv("");
    setTicketDetailsError(null);
  }, [ticket.ticketId]);

  useEffect(() => {
    setOpenStages([ticket.currentStage]);
    setDraft(createDraftFromStage(ticket.currentStage, currentStageRecord));
    setSaveState({ kind: "idle" });
    setActivePreviewTab("summary");
    setSummaryPayload(null);
    setSummaryError(null);
    setSummaryActionMessage(null);
    setIsSummaryLoading(false);
    setIsSummaryGenerationLoading(false);
    setIsSummaryPolling(false);
    setIsResumePolling(false);
    setSummaryRefreshKey(0);
  }, [ticket.currentStage, ticket.ticketId, currentStageRecord.updatedAt]);

  useEffect(() => {
    let active = true;
    let timeoutId: number | undefined;

    async function loadTicketDetails(background = false) {
      if (!background) {
        setIsTicketDetailsLoading(true);
        setTicketDetailsError(null);
      }

      try {
        const { data } = await api.get<GetApplicationTicketResponse>(
          `/api/v1/applications/${ticket.ticketId}`,
          {
            fetchOptions: {
              cache: "no-store",
            },
          }
        );

        if (!active) {
          return;
        }

        setTicketDetails(data);

        if (shouldPollTicketResult(data)) {
          setIsResumePolling(true);
          timeoutId = window.setTimeout(() => {
            void loadTicketDetails(true);
          }, APPLICATION_GENERATION_POLL_INTERVAL_MS);
          return;
        }

        setIsResumePolling(false);
      } catch (error) {
        if (active) {
          setIsResumePolling(false);
          setTicketDetailsError(getErrorMessage(error));
        }
      } finally {
        if (active && !background) {
          setIsTicketDetailsLoading(false);
        }
      }
    }

    void loadTicketDetails();

    return () => {
      active = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [ticket.ticketId]);

  useEffect(() => {
    let active = true;

    async function loadBaseCv() {
      try {
        const { data } = await api.get<GetBaseCvResponse>(
          "/api/v1/applications/baseCv",
          {
            fetchOptions: {
              cache: "no-store",
            },
          }
        );

        if (active) {
          setBaseCv(data.baseCv);
        }
      } catch {
        if (active) {
          setBaseCv("");
        }
      }
    }

    void loadBaseCv();

    return () => {
      active = false;
    };
  }, [ticket.ticketId]);

  useEffect(() => {
    let active = true;
    let timeoutId: number | undefined;

    async function loadSummary(background = false) {
      if (!background) {
        setIsSummaryLoading(true);
      }

      setSummaryError(null);

      try {
        const { data } = await api.get<GetApplicationSummaryResponse>(
          `/api/v1/applications/${ticket.ticketId}/summary`,
          {
            fetchOptions: {
              cache: "no-store",
            },
          }
        );

        if (!active) {
          return;
        }

        setSummaryPayload(data);

        if (data.status === "available") {
          setIsSummaryPolling(false);
          return;
        }

        setIsSummaryPolling(true);
        timeoutId = window.setTimeout(() => {
          void loadSummary(true);
        }, APPLICATION_GENERATION_POLL_INTERVAL_MS);
      } catch (error) {
        if (active) {
          setSummaryPayload(null);
          setSummaryError(getErrorMessage(error));
          setIsSummaryPolling(false);
        }
      } finally {
        if (active && !background) {
          setIsSummaryLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      active = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [summaryRefreshKey, ticket.ticketId]);

  async function handleSummaryGeneration() {
    setIsSummaryGenerationLoading(true);
    setSummaryError(null);
    setSummaryActionMessage(null);

    try {
      await api.post<void>(
        `/api/v1/applications/${ticket.ticketId}/summary/generate`,
        undefined,
        {
          fetchOptions: {
            cache: "no-store",
          },
        }
      );

      setSummaryActionMessage(
        "Summary generation requested again. Auto-checking every 3 seconds."
      );
      setSummaryRefreshKey((current) => current + 1);
    } catch (error) {
      setSummaryError(getErrorMessage(error));
    } finally {
      setIsSummaryGenerationLoading(false);
    }
  }

  async function handleSave() {
    if (ticket.currentStage === "failed" && !draft.failureReason.trim()) {
      setSaveState({
        kind: "error",
        message: "Failed stage requires a reason before saving.",
      });
      return;
    }

    setSaveState({ kind: "saving" });

    try {
      await onSaveStage(
        ticket.ticketId,
        ticket.currentStage,
        buildStageRequest(ticket.currentStage, draft)
      );
      setSaveState({
        kind: "success",
        message: "Stage updated successfully.",
      });
    } catch (error) {
      setSaveState({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Could not save this stage.",
      });
    }
  }

  function toggleStage(stage: ApplicationBoardStage) {
    setOpenStages((current) =>
      current.includes(stage)
        ? current.filter((currentStage) => currentStage !== stage)
        : [...current, stage]
    );
  }

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div
      className={styles.panelBackdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className={styles.panelShell}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Application Tracker</p>
            <h2 className={styles.panelTitle}>{ticket.companyName}</h2>
          </div>

          <div className={styles.panelHeaderActions}>
            <Link
              className={styles.linkButton}
              href={`/applications/${ticket.ticketId}`}
            >
              <ExternalLink size={16} />
              <span>Open ticket</span>
            </Link>
            <button
              className={styles.iconButton}
              type="button"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className={styles.panelSummaryGrid}>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Current stage</p>
            <strong>{getBoardStageLabel(ticket.currentStage)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Offer range</p>
            <strong>{formatBoardCompensation(ticket.offerCompensation)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Pipeline status</p>
            <ApplicationStatusBadge
              status={ticketDetails?.status ?? ticket.pipelineStatus}
            />
          </div>
        </div>

        <div className={styles.panelBody}>
          <div className={styles.panelBodyStack}>
            <section className={styles.subPanel}>
              <div className={styles.subPanelHeader}>
                <div>
                  <p className={styles.summaryLabel}>Preview</p>
                  <h4>
                    {activePreviewTab === "summary"
                      ? "Summary JSON"
                      : "Tailored CV"}
                  </h4>
                </div>
                {activePreviewTab === "resume" ? (
                  <Link
                    className={styles.linkButton}
                    href={`/applications/${ticket.ticketId}`}
                  >
                    <ExternalLink size={16} />
                    <span>Open workspace</span>
                  </Link>
                ) : null}
              </div>

              <div className={styles.previewTabs} role="tablist">
                <button
                  className={`${styles.previewTabButton} ${
                    activePreviewTab === "summary"
                      ? styles.previewTabButtonActive
                      : ""
                  }`}
                  type="button"
                  role="tab"
                  aria-selected={activePreviewTab === "summary"}
                  onClick={() => setActivePreviewTab("summary")}
                >
                  Summary JSON
                </button>
                <button
                  className={`${styles.previewTabButton} ${
                    activePreviewTab === "resume"
                      ? styles.previewTabButtonActive
                      : ""
                  }`}
                  type="button"
                  role="tab"
                  aria-selected={activePreviewTab === "resume"}
                  onClick={() => setActivePreviewTab("resume")}
                >
                  Tailored CV
                </button>
              </div>

              {activePreviewTab === "summary" ? (
                <>
                  <p className={styles.sectionDescription}>
                    Summary status is checked automatically every 3 seconds
                    until the backend callback saves it.
                  </p>
                  {enableSummaryTestActions ? (
                    <div className={styles.summaryActionRow}>
                      <button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={() => void handleSummaryGeneration()}
                        disabled={isSummaryGenerationLoading}
                      >
                        {isSummaryGenerationLoading
                          ? "Retrying..."
                          : "Retry summary generation"}
                      </button>
                    </div>
                  ) : null}
                  {summaryActionMessage ? (
                    <p className={styles.inlineStatus}>{summaryActionMessage}</p>
                  ) : null}
                  <SummaryPreview
                    errorMessage={summaryError}
                    isLoading={isSummaryLoading}
                    isPolling={isSummaryPolling}
                    payload={summaryPayload}
                  />
                </>
              ) : (
                <>
                  <p className={styles.sectionDescription}>
                    Resume status is checked automatically every 3 seconds while
                    generation is still running.
                  </p>
                  <TailoredResumePreview
                    baseCv={baseCv}
                    emptyMessage="No generated resume is attached to this ticket yet."
                    isLoading={isTicketDetailsLoading}
                    isPolling={isResumePolling}
                    markdown={ticketDetails?.result?.cvMarkdown ?? null}
                    ticketDetailsError={ticketDetailsError}
                  />
                </>
              )}
            </section>

            <div className={styles.stageSectionList}>
              <p className={styles.summaryLabel}>Stages</p>
              {stageRecords.map((stageRecord) => {
                const isCurrentStage =
                  stageRecord.stage === ticket.currentStage;
                const isOpen = openStages.includes(stageRecord.stage);

                return (
                  <section
                    key={stageRecord.stage}
                    className={styles.stageSection}
                  >
                    <button
                      className={styles.stageHeader}
                      type="button"
                      onClick={() => toggleStage(stageRecord.stage)}
                    >
                      <div>
                        <div className={styles.stageHeadingRow}>
                          <h3 className={styles.stageTitle}>
                            {getBoardStageLabel(stageRecord.stage)}
                          </h3>
                          {isCurrentStage ? (
                            <span className={styles.currentStageBadge}>
                              Current
                            </span>
                          ) : null}
                        </div>
                        <p className={styles.stageSubtitle}>
                          {summarizeStageRecord(stageRecord)}
                        </p>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`${styles.stageChevron} ${
                          isOpen ? styles.stageChevronOpen : ""
                        }`}
                      />
                    </button>

                    {isOpen ? (
                      <div className={styles.stageBody}>
                        {isCurrentStage ? (
                          <StageEditor
                            stage={stageRecord.stage}
                            draft={draft}
                            setDraft={setDraft}
                            jobSiteOptions={jobSiteOptions}
                            normalizedCurrency={normalizedCurrency}
                          />
                        ) : (
                          <StageReadOnly stageRecord={stageRecord} />
                        )}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        {hasEditableFields ? (
          <footer className={styles.panelFooter}>
            {saveState.kind === "error" ? (
              <p className={styles.footerError}>{saveState.message}</p>
            ) : null}
            {saveState.kind === "success" ? (
              <p className={styles.footerSuccess}>{saveState.message}</p>
            ) : null}
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => void handleSave()}
              disabled={saveState.kind === "saving"}
            >
              {saveState.kind === "saving" ? "Saving..." : "Save current stage"}
            </button>
          </footer>
        ) : (
          <footer className={styles.panelFooter}>
            <p className={styles.footerHint}>
              This stage has no editable fields yet. Drag the card again if the
              process changes.
            </p>
          </footer>
        )}
      </aside>
    </div>,
    portalRoot
  );
}

function StageEditor({
  stage,
  draft,
  setDraft,
  jobSiteOptions,
  normalizedCurrency,
}: {
  stage: ApplicationBoardStage;
  draft: StageDraft;
  setDraft: Dispatch<SetStateAction<StageDraft>>;
  jobSiteOptions: readonly ApplicationJobSitePreset[];
  normalizedCurrency: string;
}) {
  if (stage === "resume_sent") {
    return (
      <div className={styles.formGrid}>
        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Application date</span>
          <input
            className={styles.textInput}
            type="date"
            value={draft.submittedAt}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                submittedAt: event.target.value,
              }))
            }
          />
        </label>

        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Website</span>
          <select
            className={styles.selectInput}
            value={draft.jobSite}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                jobSite: event.target.value as ApplicationJobSitePreset | "",
                jobSiteOther:
                  event.target.value === "Other" ? current.jobSiteOther : "",
              }))
            }
          >
            <option value="">Select a source</option>
            {jobSiteOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {draft.jobSite === "Other" ? (
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Other website</span>
            <input
              className={styles.textInput}
              type="text"
              value={draft.jobSiteOther}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  jobSiteOther: event.target.value,
                }))
              }
              placeholder="Career page, referral portal, forum..."
            />
          </label>
        ) : null}
      </div>
    );
  }

  if (stage === "hr_screening") {
    return (
      <div className={styles.stageStack}>
        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>HR comments</span>
          <textarea
            className={styles.textArea}
            rows={5}
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            placeholder="Notes from the recruiter call, concerns, next steps..."
          />
        </label>

        <section className={styles.subPanel}>
          <div className={styles.subPanelHeader}>
            <h4>Offer range</h4>
            <p>
              Normalized to {normalizedCurrency} on the backend for sorting.
            </p>
          </div>
          <div className={styles.compensationGrid}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Min</span>
              <input
                className={styles.textInput}
                type="number"
                inputMode="decimal"
                value={draft.compensation.minAmount}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    compensation: {
                      ...current.compensation,
                      minAmount: event.target.value,
                    },
                  }))
                }
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Max</span>
              <input
                className={styles.textInput}
                type="number"
                inputMode="decimal"
                value={draft.compensation.maxAmount}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    compensation: {
                      ...current.compensation,
                      maxAmount: event.target.value,
                    },
                  }))
                }
              />
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Currency</span>
              <select
                className={styles.selectInput}
                value={draft.compensation.currency}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    compensation: {
                      ...current.compensation,
                      currency: event.target.value as
                        | ApplicationCompensationCurrency
                        | "",
                    },
                  }))
                }
              >
                <option value="">Select currency</option>
                {APPLICATION_COMPENSATION_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Period</span>
              <select
                className={styles.selectInput}
                value={draft.compensation.period}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    compensation: {
                      ...current.compensation,
                      period: event.target.value as
                        | ApplicationCompensationPeriod
                        | "",
                    },
                  }))
                }
              >
                <option value="">Select period</option>
                {APPLICATION_COMPENSATION_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </div>
    );
  }

  if (
    stage === "technical_interview" ||
    stage === "system_design" ||
    stage === "algorithm_session"
  ) {
    return (
      <div className={styles.stageStack}>
        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Interview round</span>
          <input
            className={styles.textInput}
            type="number"
            min={1}
            value={draft.roundNumber}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                roundNumber: event.target.value,
              }))
            }
            placeholder="1"
          />
        </label>

        <QuestionEditor
          title="Questions asked"
          includeAnswers={false}
          questions={draft.questions}
          onChange={(questions) =>
            setDraft((current) => ({
              ...current,
              questions,
            }))
          }
        />
      </div>
    );
  }

  if (stage === "custom_status") {
    return (
      <div className={styles.stageStack}>
        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Status label</span>
          <input
            className={styles.textInput}
            type="text"
            value={draft.customStatusLabel}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                customStatusLabel: event.target.value,
              }))
            }
            placeholder="Team meeting, founder chat, CTO sync..."
          />
        </label>

        <QuestionEditor
          title="Questions and my answers"
          includeAnswers
          questions={draft.questions}
          onChange={(questions) =>
            setDraft((current) => ({
              ...current,
              questions,
            }))
          }
        />
      </div>
    );
  }

  if (stage === "failed") {
    return (
      <label className={styles.fieldGroup}>
        <span className={styles.fieldLabel}>Failure reason</span>
        <textarea
          className={styles.textArea}
          rows={5}
          value={draft.failureReason}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              failureReason: event.target.value,
            }))
          }
          placeholder="Rejected after onsite, role frozen, compensation mismatch..."
        />
      </label>
    );
  }

  if (stage === "passed") {
    return (
      <p className={styles.placeholderNote}>
        This is a final stage. Keep the card here once the process is
        successful.
      </p>
    );
  }

  return (
    <p className={styles.placeholderNote}>
      This is a terminal stage used for applications that never got a reply.
    </p>
  );
}

function StageReadOnly({
  stageRecord,
}: {
  stageRecord: ApplicationBoardStageRecordResponse;
}) {
  if (stageRecord.stage === "resume_sent") {
    return (
      <div className={styles.readOnlyGrid}>
        <ReadOnlyField
          label="Application date"
          value={formatBoardDate(stageRecord.submittedAt)}
        />
        <ReadOnlyField
          label="Website"
          value={
            stageRecord.jobSite === "Other"
              ? (stageRecord.jobSiteOther ?? "Other")
              : (stageRecord.jobSite ?? "Not set")
          }
        />
      </div>
    );
  }

  if (stageRecord.stage === "hr_screening") {
    return (
      <div className={styles.stageStack}>
        <ReadOnlyField
          label="HR comments"
          value={stageRecord.notes ?? "No notes"}
        />
        <ReadOnlyField
          label="Offer range"
          value={formatBoardCompensation(stageRecord.compensation)}
        />
      </div>
    );
  }

  if (
    stageRecord.stage === "technical_interview" ||
    stageRecord.stage === "system_design" ||
    stageRecord.stage === "algorithm_session"
  ) {
    return (
      <div className={styles.stageStack}>
        <ReadOnlyField
          label="Round"
          value={
            stageRecord.roundNumber
              ? `Round ${stageRecord.roundNumber}`
              : "Not set"
          }
        />
        <QuestionList
          questions={stageRecord.questions.map((question) => ({
            prompt: question.prompt,
            answer: question.answer ?? "",
          }))}
          includeAnswers={false}
        />
      </div>
    );
  }

  if (stageRecord.stage === "custom_status") {
    return (
      <div className={styles.stageStack}>
        <ReadOnlyField
          label="Custom label"
          value={stageRecord.customStatusLabel ?? "Not set"}
        />
        <QuestionList
          questions={stageRecord.questions.map((question) => ({
            prompt: question.prompt,
            answer: question.answer ?? "",
          }))}
          includeAnswers
        />
      </div>
    );
  }

  if (stageRecord.stage === "failed") {
    return (
      <ReadOnlyField
        label="Failure reason"
        value={stageRecord.failureReason ?? "No reason saved"}
      />
    );
  }

  return (
    <p className={styles.placeholderNote}>
      No additional fields were captured for this stage.
    </p>
  );
}

function SummaryPreview({
  errorMessage,
  isLoading,
  isPolling,
  payload,
}: {
  errorMessage: string | null;
  isLoading: boolean;
  isPolling: boolean;
  payload: GetApplicationSummaryResponse | null;
}) {
  if (isLoading) {
    return <p className={styles.inlineStatus}>Checking summary status...</p>;
  }

  if (errorMessage) {
    return <p className={styles.inlineError}>{errorMessage}</p>;
  }

  if (!payload) {
    return (
      <p className={styles.placeholderNote}>
        {isPolling
          ? "Summary generation is still running. Checking again in a few seconds."
          : "Summary is not available yet."}
      </p>
    );
  }

  if (payload.status === "unavailable") {
    return (
      <p className={styles.placeholderNote}>
        {isPolling
          ? "Summary generation is still running. Checking again in a few seconds."
          : payload.message}
      </p>
    );
  }

  return <ApplicationSummaryCard summary={payload.summary} />;
}

function QuestionEditor({
  title,
  includeAnswers,
  questions,
  onChange,
}: {
  title: string;
  includeAnswers: boolean;
  questions: StageDraftQuestion[];
  onChange: (questions: StageDraftQuestion[]) => void;
}) {
  return (
    <section className={styles.subPanel}>
      <div className={styles.subPanelHeader}>
        <h4>{title}</h4>
        <button
          className={styles.ghostButton}
          type="button"
          onClick={() => onChange([...questions, { prompt: "", answer: "" }])}
        >
          Add row
        </button>
      </div>

      {questions.length === 0 ? (
        <p className={styles.inlineStatus}>No questions added yet.</p>
      ) : (
        <div className={styles.questionStack}>
          {questions.map((question, index) => (
            <div key={`${title}-${index}`} className={styles.questionRow}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Question {index + 1}</span>
                <textarea
                  className={styles.textArea}
                  rows={3}
                  value={question.prompt}
                  onChange={(event) =>
                    onChange(
                      questions.map((currentQuestion, questionIndex) =>
                        questionIndex === index
                          ? {
                              ...currentQuestion,
                              prompt: event.target.value,
                            }
                          : currentQuestion
                      )
                    )
                  }
                />
              </label>

              {includeAnswers ? (
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>My answer</span>
                  <textarea
                    className={styles.textArea}
                    rows={3}
                    value={question.answer}
                    onChange={(event) =>
                      onChange(
                        questions.map((currentQuestion, questionIndex) =>
                          questionIndex === index
                            ? {
                                ...currentQuestion,
                                answer: event.target.value,
                              }
                            : currentQuestion
                        )
                      )
                    }
                  />
                </label>
              ) : null}

              <button
                className={styles.ghostButton}
                type="button"
                onClick={() =>
                  onChange(
                    questions.filter(
                      (_, questionIndex) => questionIndex !== index
                    )
                  )
                }
              >
                Remove row
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TailoredResumePreview({
  baseCv,
  emptyMessage,
  isLoading,
  isPolling,
  markdown,
  ticketDetailsError,
}: {
  baseCv: string;
  emptyMessage: string;
  isLoading: boolean;
  isPolling: boolean;
  markdown: string | null;
  ticketDetailsError: string | null;
}) {
  if (isLoading) {
    return <p className={styles.inlineStatus}>Checking resume status...</p>;
  }

  if (ticketDetailsError) {
    return <p className={styles.inlineError}>{ticketDetailsError}</p>;
  }

  if (!markdown) {
    return (
      <p className={styles.inlineStatus}>
        {isPolling
          ? "Resume generation is still running. Checking again in a few seconds."
          : emptyMessage}
      </p>
    );
  }

  return (
    <div className={styles.previewCanvas}>
      <div className={styles.previewSheetWrap}>
        <div className={styles.previewSheetFrame}>
          <MarkdownSheet
            markdown={buildResumeMarkdownForPreview(markdown, baseCv)}
            variant="resume"
          />
        </div>
      </div>
    </div>
  );
}

function QuestionList({
  questions,
  includeAnswers,
}: {
  questions: StageDraftQuestion[];
  includeAnswers: boolean;
}) {
  if (questions.length === 0) {
    return <p className={styles.inlineStatus}>No questions were saved.</p>;
  }

  return (
    <div className={styles.questionList}>
      {questions.map((question, index) => (
        <article
          key={`${question.prompt}-${index}`}
          className={styles.questionCard}
        >
          <p className={styles.questionPrompt}>
            {index + 1}. {question.prompt}
          </p>
          {includeAnswers ? (
            <p className={styles.questionAnswer}>
              {question.answer || "Answer not captured"}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.readOnlyField}>
      <span className={styles.readOnlyLabel}>{label}</span>
      <p className={styles.readOnlyValue}>{value}</p>
    </div>
  );
}
