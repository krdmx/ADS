"use client";

import type {
  ApplicationBoardStage,
  ApplicationBoardStageRecordResponse,
  ApplicationBoardTicketResponse,
  ApplicationCompensationCurrency,
  ApplicationCompensationPeriod,
  ApplicationJobSitePreset,
  GetApplicationBoardResponse,
  UpdateApplicationBoardStageRequest,
} from "@repo/contracts";
import { APPLICATION_BOARD_STAGE_ORDER } from "@repo/contracts";

import type { BoardColumnSortMode } from "@/lib/application-board";

export const HIDDEN_COLUMNS_STORAGE_KEY = "pep.applications-board.hidden-columns";

export const SORT_OPTIONS: Array<{
  value: BoardColumnSortMode;
  label: string;
}> = [
  { value: "recent", label: "Recent" },
  { value: "offer_desc", label: "Offer high" },
  { value: "offer_asc", label: "Offer low" },
];

export type StageDraftQuestion = {
  prompt: string;
  answer: string;
};

export type StageDraft = {
  submittedAt: string;
  jobSite: ApplicationJobSitePreset | "";
  jobSiteOther: string;
  notes: string;
  roundNumber: string;
  customStatusLabel: string;
  failureReason: string;
  compensation: {
    minAmount: string;
    maxAmount: string;
    currency: ApplicationCompensationCurrency | "";
    period: ApplicationCompensationPeriod | "";
  };
  questions: StageDraftQuestion[];
};

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export type OptimisticBoardTransitionAction = {
  kind: "transition_ticket";
  ticketId: string;
  toStage: ApplicationBoardStage;
  transitionedAt: string;
};

export function createSortModes(): Record<ApplicationBoardStage, BoardColumnSortMode> {
  return APPLICATION_BOARD_STAGE_ORDER.reduce(
    (accumulator, stage) => {
      accumulator[stage] = "recent";
      return accumulator;
    },
    {} as Record<ApplicationBoardStage, BoardColumnSortMode>
  );
}

export function isBoardStage(value: string): value is ApplicationBoardStage {
  return APPLICATION_BOARD_STAGE_ORDER.includes(value as ApplicationBoardStage);
}

function coerceNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createDraftFromStage(
  stage: ApplicationBoardStage,
  stageRecord: ApplicationBoardStageRecordResponse | null
): StageDraft {
  return {
    submittedAt: stageRecord?.submittedAt?.slice(0, 10) ?? "",
    jobSite:
      stage === "resume_sent"
        ? ((stageRecord?.jobSite as ApplicationJobSitePreset | null) ?? "")
        : "",
    jobSiteOther: stageRecord?.jobSiteOther ?? "",
    notes: stageRecord?.notes ?? "",
    roundNumber: stageRecord?.roundNumber?.toString() ?? "",
    customStatusLabel: stageRecord?.customStatusLabel ?? "",
    failureReason: stageRecord?.failureReason ?? "",
    compensation: {
      minAmount: stageRecord?.compensation?.minAmount?.toString() ?? "",
      maxAmount: stageRecord?.compensation?.maxAmount?.toString() ?? "",
      currency: stageRecord?.compensation?.currency ?? "",
      period: stageRecord?.compensation?.period ?? "",
    },
    questions:
      stageRecord?.questions.map((question) => ({
        prompt: question.prompt,
        answer: question.answer ?? "",
      })) ?? [],
  };
}

export function createSyntheticStageRecord(
  ticket: ApplicationBoardTicketResponse
): ApplicationBoardStageRecordResponse {
  return createSyntheticStageRecordForStage(ticket.currentStage, ticket.updatedAt);
}

export function createSyntheticStageRecordForStage(
  stage: ApplicationBoardStage,
  timestamp: string
): ApplicationBoardStageRecordResponse {
  return {
    stage,
    createdAt: timestamp,
    updatedAt: timestamp,
    submittedAt: null,
    jobSite: null,
    jobSiteOther: null,
    notes: null,
    roundNumber: null,
    customStatusLabel: null,
    failureReason: null,
    compensation: null,
    questions: [],
  };
}

export function applyOptimisticBoardTransition(
  current: ApplicationBoardTicketResponse[],
  action: OptimisticBoardTransitionAction
) {
  return current.map((ticket) => {
    if (ticket.ticketId !== action.ticketId) {
      return ticket;
    }

    if (ticket.currentStage === action.toStage) {
      return ticket;
    }

    const hasTargetStageRecord = ticket.stages.some(
      (stageRecord) => stageRecord.stage === action.toStage
    );

    return {
      ...ticket,
      currentStage: action.toStage,
      lastTransitionAt: action.transitionedAt,
      stages: hasTargetStageRecord
        ? ticket.stages
        : [
            ...ticket.stages,
            createSyntheticStageRecordForStage(
              action.toStage,
              action.transitionedAt
            ),
          ],
    };
  });
}

export function buildStageRequest(
  stage: ApplicationBoardStage,
  draft: StageDraft
): UpdateApplicationBoardStageRequest {
  if (stage === "resume_sent") {
    return {
      submittedAt: draft.submittedAt || null,
      jobSite: draft.jobSite || null,
      jobSiteOther: draft.jobSite === "Other" ? draft.jobSiteOther || null : null,
    };
  }

  if (stage === "hr_screening") {
    return {
      notes: draft.notes || null,
      compensation: {
        minAmount: coerceNumber(draft.compensation.minAmount),
        maxAmount: coerceNumber(draft.compensation.maxAmount),
        currency: draft.compensation.currency || null,
        period: draft.compensation.period || null,
      },
    };
  }

  if (
    stage === "technical_interview" ||
    stage === "system_design" ||
    stage === "algorithm_session"
  ) {
    return {
      roundNumber: draft.roundNumber ? Number(draft.roundNumber) : null,
      questions: draft.questions.map((question, index) => ({
        prompt: question.prompt,
        sortOrder: index + 1,
      })),
    };
  }

  if (stage === "custom_status") {
    return {
      customStatusLabel: draft.customStatusLabel || null,
      questions: draft.questions.map((question, index) => ({
        prompt: question.prompt,
        answer: question.answer || null,
        sortOrder: index + 1,
      })),
    };
  }

  if (stage === "failed") {
    return {
      failureReason: draft.failureReason || null,
    };
  }

  return {};
}

export function replaceBoardTicket(
  current: GetApplicationBoardResponse | null,
  updatedTicket: ApplicationBoardTicketResponse
) {
  if (!current) {
    return current;
  }

  return {
    ...current,
    applications: current.applications.map((ticket) =>
      ticket.ticketId === updatedTicket.ticketId ? updatedTicket : ticket
    ),
  };
}
