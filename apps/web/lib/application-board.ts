import {
  APPLICATION_BOARD_STAGE_ORDER,
  type ApplicationBoardCompensationResponse,
  type ApplicationBoardStage,
  type ApplicationBoardStageRecordResponse,
  type ApplicationBoardTicketResponse,
} from "@repo/contracts";

export type BoardColumnSortMode = "recent" | "offer_desc" | "offer_asc";

export const APPLICATION_BOARD_STAGE_LABELS: Record<
  ApplicationBoardStage,
  string
> = {
  resume_sent: "Resume Sent",
  hr_screening: "HR Screening",
  technical_interview: "Technical Interview",
  system_design: "System Design",
  algorithm_session: "Algorithm Session",
  custom_status: "Custom Status",
  passed: "Passed",
  failed: "Failed",
  ignored: "Ignored",
};

export const APPLICATION_BOARD_STAGE_DESCRIPTIONS: Record<
  ApplicationBoardStage,
  string
> = {
  resume_sent: "Track when and where you applied.",
  hr_screening: "Capture HR notes and compensation range.",
  technical_interview: "Round-by-round interview questions.",
  system_design: "Design rounds and follow-up prompts.",
  algorithm_session: "Coding and algorithm questions.",
  custom_status: "Flexible meetings, loops, or syncs.",
  passed: "Offer accepted or process completed successfully.",
  failed: "Rejected applications with a reason.",
  ignored: "Applications that never received a response.",
};

const STAGE_INDEX_MAP = APPLICATION_BOARD_STAGE_ORDER.reduce(
  (accumulator, stage, index) => {
    accumulator[stage] = index;
    return accumulator;
  },
  {} as Record<ApplicationBoardStage, number>
);

export function getBoardStageLabel(stage: ApplicationBoardStage) {
  return APPLICATION_BOARD_STAGE_LABELS[stage];
}

export function getBoardStageDescription(stage: ApplicationBoardStage) {
  return APPLICATION_BOARD_STAGE_DESCRIPTIONS[stage];
}

export function getBoardStageIndex(stage: ApplicationBoardStage) {
  return STAGE_INDEX_MAP[stage];
}

export function formatBoardDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString();
}

export function getBoardCompensationMidpoint(
  compensation: ApplicationBoardCompensationResponse | null
) {
  if (!compensation) {
    return null;
  }

  const amounts = [
    compensation.normalizedMinAmount,
    compensation.normalizedMaxAmount,
  ].filter((amount): amount is number => typeof amount === "number");

  if (amounts.length === 0) {
    return null;
  }

  if (amounts.length === 1) {
    return amounts[0];
  }

  const [minAmount, maxAmount] = amounts;

  if (minAmount == null || maxAmount == null) {
    return null;
  }

  return (minAmount + maxAmount) / 2;
}

export function formatBoardCompensation(
  compensation: ApplicationBoardCompensationResponse | null
) {
  if (!compensation) {
    return "Offer not set";
  }

  const formatter = compensation.currency
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: compensation.currency,
        maximumFractionDigits: 0,
      })
    : null;
  const minLabel =
    compensation.minAmount != null && formatter
      ? formatter.format(compensation.minAmount)
      : compensation.minAmount != null
        ? `${compensation.minAmount}`
        : null;
  const maxLabel =
    compensation.maxAmount != null && formatter
      ? formatter.format(compensation.maxAmount)
      : compensation.maxAmount != null
        ? `${compensation.maxAmount}`
        : null;

  if (minLabel && maxLabel) {
    return `${minLabel} - ${maxLabel}${compensation.period ? ` / ${compensation.period}` : ""}`;
  }

  if (minLabel) {
    return `${minLabel}${compensation.period ? ` / ${compensation.period}` : ""}`;
  }

  if (maxLabel) {
    return `${maxLabel}${compensation.period ? ` / ${compensation.period}` : ""}`;
  }

  return "Offer not set";
}

export function getBoardStageRecord(
  ticket: ApplicationBoardTicketResponse,
  stage: ApplicationBoardStage
) {
  return ticket.stages.find((stageRecord) => stageRecord.stage === stage) ?? null;
}

export function getBoardSavedStageRecords(
  ticket: ApplicationBoardTicketResponse
) {
  return [...ticket.stages].sort(
    (left, right) =>
      getBoardStageIndex(left.stage) - getBoardStageIndex(right.stage)
  );
}

export function getBoardVisibleStageRecords(
  ticket: ApplicationBoardTicketResponse
) {
  return getBoardSavedStageRecords(ticket).filter(
    (stageRecord) =>
      getBoardStageIndex(stageRecord.stage) <=
      getBoardStageIndex(ticket.currentStage)
  );
}

export function getBoardCompletedStageRecords(
  ticket: ApplicationBoardTicketResponse
) {
  return getBoardVisibleStageRecords(ticket).filter(
    (stageRecord) => stageRecord.stage !== ticket.currentStage
  );
}

export function sortBoardTickets(
  tickets: ApplicationBoardTicketResponse[],
  searchQuery: string,
  sortMode: BoardColumnSortMode
) {
  return [...tickets].sort((left, right) => {
    const leftMatches = doesTicketMatchSearch(left, searchQuery);
    const rightMatches = doesTicketMatchSearch(right, searchQuery);

    if (leftMatches !== rightMatches) {
      return leftMatches ? -1 : 1;
    }

    if (sortMode !== "recent") {
      const leftOffer = getBoardCompensationMidpoint(left.offerCompensation);
      const rightOffer = getBoardCompensationMidpoint(right.offerCompensation);

      if (leftOffer != null || rightOffer != null) {
        if (leftOffer == null) {
          return 1;
        }

        if (rightOffer == null) {
          return -1;
        }

        if (leftOffer !== rightOffer) {
          return sortMode === "offer_desc"
            ? rightOffer - leftOffer
            : leftOffer - rightOffer;
        }
      }
    }

    return (
      new Date(right.lastTransitionAt).getTime() -
      new Date(left.lastTransitionAt).getTime()
    );
  });
}

export function doesTicketMatchSearch(
  ticket: ApplicationBoardTicketResponse,
  searchQuery: string
) {
  if (!searchQuery) {
    return true;
  }

  return ticket.companyName.toLowerCase().includes(searchQuery.toLowerCase());
}

export function summarizeStageRecord(
  stageRecord: ApplicationBoardStageRecordResponse | null
) {
  if (!stageRecord) {
    return "Stage data not started yet.";
  }

  if (stageRecord.stage === "resume_sent") {
    const siteLabel =
      stageRecord.jobSite === "Other"
        ? stageRecord.jobSiteOther ?? "Other"
        : stageRecord.jobSite;

    if (siteLabel || stageRecord.submittedAt) {
      return `${formatBoardDate(stageRecord.submittedAt)}${siteLabel ? ` at ${siteLabel}` : ""}`;
    }

    return "Waiting for application details.";
  }

  if (stageRecord.stage === "hr_screening") {
    return (
      stageRecord.notes ??
      formatBoardCompensation(stageRecord.compensation) ??
      "Waiting for HR notes."
    );
  }

  if (
    stageRecord.stage === "technical_interview" ||
    stageRecord.stage === "system_design" ||
    stageRecord.stage === "algorithm_session"
  ) {
    return [
      stageRecord.roundNumber ? `Round ${stageRecord.roundNumber}` : null,
      stageRecord.questions.length > 0
        ? `${stageRecord.questions.length} question${
            stageRecord.questions.length === 1 ? "" : "s"
          }`
        : null,
    ]
      .filter(Boolean)
      .join(" • ");
  }

  if (stageRecord.stage === "custom_status") {
    return (
      stageRecord.customStatusLabel ??
      (stageRecord.questions.length > 0
        ? `${stageRecord.questions.length} question${
            stageRecord.questions.length === 1 ? "" : "s"
          }`
        : "Custom checkpoint")
    );
  }

  if (stageRecord.stage === "failed") {
    return stageRecord.failureReason ?? "Reason not captured yet.";
  }

  if (stageRecord.stage === "passed") {
    return "Process completed successfully.";
  }

  return "Still waiting for a response.";
}
