"use client";

import type { ApplicationBoardTicketResponse } from "@repo/contracts";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

import {
  formatBoardCompensation,
  getBoardCompletedStageRecords,
  getBoardStageLabel,
  getBoardStageRecord,
  summarizeStageRecord,
} from "@/lib/application-board";
import styles from "./applications-board.module.css";

type BoardCardProps = {
  isBusy: boolean;
  isSearchDimmed: boolean;
  onOpen: () => void;
  ticket: ApplicationBoardTicketResponse;
};

type BoardCardOverlayProps = {
  ticket: ApplicationBoardTicketResponse;
  width: number | null;
};

export function BoardCard({
  isBusy,
  isSearchDimmed,
  onOpen,
  ticket,
}: BoardCardProps) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: ticket.ticketId,
    disabled: isBusy,
  });

  return (
    <div
      ref={setNodeRef}
      data-board-card-id={ticket.ticketId}
      className={`${styles.cardShell} ${isDragging ? styles.cardShellDragging : ""} ${
        isSearchDimmed ? styles.cardShellDimmed : ""
      } ${isBusy ? styles.cardShellBusy : ""}`}
    >
      <div className={styles.cardActions}>
        <button
          className={styles.dragHandle}
          type="button"
          aria-label={`Drag ${ticket.companyName}`}
          disabled={isBusy}
          {...listeners}
          {...attributes}
        >
          <GripVertical size={18} />
        </button>
        {/* <ApplicationStatusBadge status={ticket.pipelineStatus} /> */}
      </div>

      <button className={styles.cardContent} type="button" onClick={onOpen}>
        <BoardCardBody ticket={ticket} isSearchDimmed={isSearchDimmed} />
      </button>
    </div>
  );
}

export function BoardCardOverlay({ ticket, width }: BoardCardOverlayProps) {
  return (
    <article
      className={`${styles.cardShell} ${styles.dragOverlayCard}`}
      style={width != null ? { width: `${width}px` } : undefined}
    >
      <div className={styles.cardActions}>
        <div className={styles.dragHandle} aria-hidden="true">
          <GripVertical size={16} />
        </div>
        {/* <ApplicationStatusBadge status={ticket.pipelineStatus} /> */}
      </div>

      <div className={styles.cardContentPreview}>
        <BoardCardBody ticket={ticket} isSearchDimmed={false} />
      </div>
    </article>
  );
}

function BoardCardBody({
  ticket,
  isSearchDimmed,
}: {
  ticket: ApplicationBoardTicketResponse;
  isSearchDimmed: boolean;
}) {
  const currentStageRecord = getBoardStageRecord(ticket, ticket.currentStage);
  const completedStages = getBoardCompletedStageRecords(ticket);

  return (
    <>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardEyebrow}>
            Ticket {ticket.ticketId.slice(0, 4)}...{ticket.ticketId.slice(-4)}
          </p>
          <h3 className={styles.cardTitle}>{ticket.companyName}</h3>
        </div>
        <p className={styles.cardDate}>
          {new Date(ticket.lastTransitionAt).toLocaleDateString()}
        </p>
      </div>

      <p className={styles.cardSummary}>
        {summarizeStageRecord(currentStageRecord)}
      </p>

      <div className={styles.cardMetaRow}>
        <span className={styles.metaChipLabel}>
          {formatBoardCompensation(ticket.offerCompensation)}
        </span>
        <span className={styles.metaChipLabel}>
          {ticket.assets.hasGeneratedCv ? "CV ready" : "CV pending"}
        </span>
      </div>

      {completedStages.length > 0 ? (
        <div className={styles.progressStrip} aria-hidden={isSearchDimmed}>
          {completedStages.map((stageRecord) => (
            <span key={stageRecord.stage} className={styles.progressChip}>
              {getBoardStageLabel(stageRecord.stage)}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
