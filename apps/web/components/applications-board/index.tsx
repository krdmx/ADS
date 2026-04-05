"use client";

import type {
  ApplicationBoardStage,
  ApplicationBoardTicketResponse,
  GetApplicationBoardResponse,
  UpdateApplicationBoardStageRequest,
} from "@repo/contracts";
import { APPLICATION_BOARD_STAGE_ORDER } from "@repo/contracts";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useOptimistic,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { api, getErrorMessage } from "@/lib/api";
import { BoardCardOverlay } from "./board-card";
import { BoardColumn } from "./board-column";
import { BoardSidePanel } from "./board-side-panel";
import { BoardToolbar } from "./board-toolbar";
import {
  applyOptimisticBoardTransition,
  createSortModes,
  HIDDEN_COLUMNS_STORAGE_KEY,
  isBoardStage,
  type OptimisticBoardTransitionAction,
  replaceBoardTicket,
} from "./shared";
import styles from "./applications-board.module.css";

export function ApplicationsBoard({
  enableSummaryTestActions,
  initialPayload,
  initialErrorMessage,
  initialSelectedTicketId,
}: {
  enableSummaryTestActions: boolean;
  initialPayload?: GetApplicationBoardResponse;
  initialErrorMessage?: string | null;
  initialSelectedTicketId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasServerSeed =
    initialPayload !== undefined || initialErrorMessage !== undefined;
  const [payload, setPayload] = useState<GetApplicationBoardResponse | null>(
    initialPayload ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage ?? null
  );
  const [isLoading, setIsLoading] = useState(!hasServerSeed);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialSelectedTicketId ?? null
  );
  const [transitioningTicketIds, setTransitioningTicketIds] = useState<string[]>(
    []
  );
  const [hiddenColumns, setHiddenColumns] = useState<ApplicationBoardStage[]>(
    []
  );
  const [hasLoadedColumnPrefs, setHasLoadedColumnPrefs] = useState(false);
  const [sortModes] = useState(createSortModes);
  const [activeCardWidth, setActiveCardWidth] = useState<number | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const urlTicketId = searchParams.get("ticketId");
  const normalizedUrlTicketId = urlTicketId?.trim() || null;
  const searchParamsString = searchParams.toString();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );
  const applications = payload?.applications ?? [];
  const [optimisticApplications, addOptimisticTransition] = useOptimistic<
    ApplicationBoardTicketResponse[],
    OptimisticBoardTransitionAction
  >(applications, applyOptimisticBoardTransition);

  useEffect(() => {
    let active = true;

    if (refreshKey === 0 && hasServerSeed) {
      return () => {
        active = false;
      };
    }

    async function loadBoard() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const { data } = await api.get<GetApplicationBoardResponse>(
          "/api/v1/applications/board",
          {
            fetchOptions: {
              cache: "no-store",
            },
          }
        );

        if (active) {
          setPayload(data);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadBoard();

    return () => {
      active = false;
    };
  }, [hasServerSeed, refreshKey]);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY);

      if (!rawValue) {
        setHasLoadedColumnPrefs(true);
        return;
      }

      const parsed = JSON.parse(rawValue);

      if (!Array.isArray(parsed)) {
        setHasLoadedColumnPrefs(true);
        return;
      }

      setHiddenColumns(
        parsed.filter((value): value is ApplicationBoardStage =>
          typeof value === "string" ? isBoardStage(value) : false
        )
      );
    } catch {
      // Ignore malformed localStorage state and keep defaults.
    } finally {
      setHasLoadedColumnPrefs(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedColumnPrefs) {
      return;
    }

    window.localStorage.setItem(
      HIDDEN_COLUMNS_STORAGE_KEY,
      JSON.stringify(hiddenColumns)
    );
  }, [hasLoadedColumnPrefs, hiddenColumns]);

  useEffect(() => {
    if (
      payload &&
      selectedTicketId &&
      !optimisticApplications.some((ticket) => ticket.ticketId === selectedTicketId)
    ) {
      setSelectedTicketId(null);
    }
  }, [optimisticApplications, payload, selectedTicketId]);

  useEffect(() => {
    setSelectedTicketId((current) =>
      current === normalizedUrlTicketId ? current : normalizedUrlTicketId
    );
  }, [normalizedUrlTicketId]);

  useEffect(() => {
    const query = new URLSearchParams(searchParamsString);

    if (
      selectedTicketId === normalizedUrlTicketId &&
      (selectedTicketId !== null || urlTicketId === null)
    ) {
      return;
    }

    if (selectedTicketId) {
      query.set("ticketId", selectedTicketId);
    } else {
      query.delete("ticketId");
    }

    const nextQuery = query.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [
    normalizedUrlTicketId,
    pathname,
    router,
    searchParamsString,
    selectedTicketId,
    urlTicketId,
  ]);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const activeTicket =
    activeTicketId != null
      ? optimisticApplications.find((ticket) => ticket.ticketId === activeTicketId) ??
        null
      : null;
  const selectedTicket =
    selectedTicketId != null
      ? optimisticApplications.find(
          (ticket) => ticket.ticketId === selectedTicketId
        ) ?? null
      : null;
  const transitioningTicketSet = new Set(transitioningTicketIds);
  const visibleColumns = APPLICATION_BOARD_STAGE_ORDER.filter(
    (stage) => !hiddenColumns.includes(stage)
  );
  const visibleColumnCount = visibleColumns.length;
  const jobSiteOptions = payload?.jobSiteOptions ?? [];
  const normalizedCurrency = payload?.normalizedCurrency ?? "USD";

  function handleRefresh() {
    setRefreshKey((current) => current + 1);
  }

  function toggleColumn(stage: ApplicationBoardStage) {
    setHiddenColumns((current) =>
      current.includes(stage)
        ? current.filter((currentStage) => currentStage !== stage)
        : [...current, stage]
    );
  }

  function updateTicketInBoard(updatedTicket: ApplicationBoardTicketResponse) {
    startTransition(() => {
      setPayload((current) => replaceBoardTicket(current, updatedTicket));
    });
  }

  async function handleSaveStage(
    ticketId: string,
    stage: ApplicationBoardStage,
    request: UpdateApplicationBoardStageRequest
  ) {
    try {
      const { data } = await api.put<ApplicationBoardTicketResponse>(
        `/api/v1/applications/${ticketId}/tracker/stages/${stage}`,
        request
      );

      setErrorMessage(null);
      updateTicketInBoard(data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  function transitionTicket(ticketId: string, toStage: ApplicationBoardStage) {
    const transitionedAt = new Date().toISOString();

    startTransition(async () => {
      setTransitioningTicketIds((current) =>
        Array.from(new Set([...current, ticketId]))
      );
      setErrorMessage(null);
      addOptimisticTransition({
        kind: "transition_ticket",
        ticketId,
        toStage,
        transitionedAt,
      });

      try {
        const { data } = await api.post<ApplicationBoardTicketResponse>(
          `/api/v1/applications/${ticketId}/tracker/transitions`,
          {
            toStage,
          }
        );

        setPayload((current) => replaceBoardTicket(current, data));
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setTransitioningTicketIds((current) =>
          current.filter((currentTicketId) => currentTicketId !== ticketId)
        );
      }
    });
  }

  function requestTransition(
    ticket: ApplicationBoardTicketResponse,
    toStage: ApplicationBoardStage
  ) {
    if (
      ticket.currentStage === toStage ||
      transitioningTicketSet.has(ticket.ticketId)
    ) {
      return;
    }

    transitionTicket(ticket.ticketId, toStage);
  }

  function handleDragStart(event: DragStartEvent) {
    const activeCardElement = document.querySelector<HTMLElement>(
      `[data-board-card-id="${String(event.active.id)}"]`
    );

    setActiveCardWidth(activeCardElement?.getBoundingClientRect().width ?? null);
    setActiveTicketId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTicketId(null);
    setActiveCardWidth(null);

    if (!event.over) {
      return;
    }

    const overId = String(event.over.id);

    if (!isBoardStage(overId)) {
      return;
    }

    const ticket = optimisticApplications.find(
      (candidate) => candidate.ticketId === String(event.active.id)
    );

    if (!ticket) {
      return;
    }

    requestTransition(ticket, overId);
  }

  function handleDragCancel() {
    setActiveTicketId(null);
    setActiveCardWidth(null);
  }

  const dragOverlay = (
    <DragOverlay>
      {activeTicket ? (
        <BoardCardOverlay ticket={activeTicket} width={activeCardWidth} />
      ) : null}
    </DragOverlay>
  );

  return (
    <>
      <BoardToolbar
        hiddenColumns={hiddenColumns}
        isLoading={isLoading}
        searchQuery={searchQuery}
        visibleColumnCount={visibleColumnCount}
        onRefresh={handleRefresh}
        onSearchQueryChange={setSearchQuery}
        onToggleColumn={toggleColumn}
      />

      {errorMessage ? (
        <section className={`${styles.statusPanel} ${styles.statusPanelError}`}>
          <p className={styles.statusTitle}>Board sync problem</p>
          <p className={styles.statusMessage}>{errorMessage}</p>
        </section>
      ) : null}

      {isLoading && !payload ? (
        <section className={styles.statusPanel}>
          <p className={styles.statusTitle}>Loading board</p>
          <p className={styles.statusMessage}>
            Pulling application tracker data from the API.
          </p>
        </section>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <section className={styles.boardViewport}>
          <div className={styles.boardColumns}>
            {visibleColumns.map((stage) => (
              <BoardColumn
                key={stage}
                stage={stage}
                tickets={optimisticApplications.filter(
                  (ticket) => ticket.currentStage === stage
                )}
                searchQuery={deferredSearchQuery}
                sortMode={sortModes[stage]}
                onOpenTicket={(ticketId) => setSelectedTicketId(ticketId)}
                transitioningTicketSet={transitioningTicketSet}
              />
            ))}
          </div>
        </section>

        {portalRoot ? createPortal(dragOverlay, portalRoot) : dragOverlay}
      </DndContext>

      {selectedTicket ? (
        <BoardSidePanel
          enableSummaryTestActions={enableSummaryTestActions}
          ticket={selectedTicket}
          jobSiteOptions={jobSiteOptions}
          normalizedCurrency={normalizedCurrency}
          onClose={() => setSelectedTicketId(null)}
          onSaveStage={handleSaveStage}
        />
      ) : null}
    </>
  );
}
