"use client";

import type {
  ApplicationBoardStage,
  ApplicationBoardTicketResponse,
} from "@repo/contracts";
import { useDroppable } from "@dnd-kit/core";

import {
  doesTicketMatchSearch,
  getBoardStageLabel,
  sortBoardTickets,
  type BoardColumnSortMode,
} from "@/lib/application-board";
import { BoardCard } from "./board-card";
import styles from "./applications-board.module.css";

type BoardColumnProps = {
  onOpenTicket: (ticketId: string) => void;
  searchQuery: string;
  sortMode: BoardColumnSortMode;
  stage: ApplicationBoardStage;
  tickets: ApplicationBoardTicketResponse[];
  transitioningTicketSet: Set<string>;
};

export function BoardColumn({
  onOpenTicket,
  searchQuery,
  sortMode,
  stage,
  tickets,
  transitioningTicketSet,
}: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage,
  });
  const sortedTickets = sortBoardTickets(tickets, searchQuery, sortMode);

  return (
    <section
      ref={setNodeRef}
      data-board-stage={stage}
      className={`${styles.columnShell} ${isOver ? styles.columnShellActive : ""}`}
    >
      <header className={styles.columnHeader}>
        <div>
          <p className={styles.columnEyebrow}>{tickets.length} card(s)</p>
          <h2 className={styles.columnTitle}>{getBoardStageLabel(stage)}</h2>
        </div>
      </header>

      <div className={styles.cardStack}>
        {sortedTickets.map((ticket) => (
          <BoardCard
            key={ticket.ticketId}
            ticket={ticket}
            isSearchDimmed={
              Boolean(searchQuery) &&
              !doesTicketMatchSearch(ticket, searchQuery)
            }
            isBusy={transitioningTicketSet.has(ticket.ticketId)}
            onOpen={() => onOpenTicket(ticket.ticketId)}
          />
        ))}

        {sortedTickets.length === 0 ? (
          <div className={styles.emptyColumnState}>
            <p>No cards in this column yet.</p>
            <p>Drag an application here or keep moving through the pipeline.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
