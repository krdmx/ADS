"use client";

import type { ApplicationBoardStage } from "@repo/contracts";
import { APPLICATION_BOARD_STAGE_ORDER } from "@repo/contracts";
import {
  ChevronDown,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getBoardStageLabel } from "@/lib/application-board";
import styles from "./applications-board.module.css";

type BoardToolbarProps = {
  hiddenColumns: ApplicationBoardStage[];
  isLoading: boolean;
  searchQuery: string;
  visibleColumnCount: number;
  onRefresh: () => void;
  onSearchQueryChange: (value: string) => void;
  onToggleColumn: (stage: ApplicationBoardStage) => void;
};

export function BoardToolbar({
  hiddenColumns,
  isLoading,
  searchQuery,
  visibleColumnCount,
  onRefresh,
  onSearchQueryChange,
  onToggleColumn,
}: BoardToolbarProps) {
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [columnManagerMenuStyle, setColumnManagerMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const columnManagerRef = useRef<HTMLDivElement | null>(null);
  const columnManagerButtonRef = useRef<HTMLButtonElement | null>(null);
  const columnManagerMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!isColumnManagerOpen) {
      setColumnManagerMenuStyle(null);
      return;
    }

    function updateColumnManagerPosition() {
      const triggerRect =
        columnManagerButtonRef.current?.getBoundingClientRect();

      if (!triggerRect) {
        return;
      }

      const maxMenuWidth = Math.max(280, Math.min(400, window.innerWidth - 32));
      const nextWidth = Math.max(
        Math.min(triggerRect.width, maxMenuWidth),
        Math.min(320, maxMenuWidth)
      );
      const nextLeft = Math.min(
        Math.max(16, triggerRect.right - nextWidth),
        window.innerWidth - nextWidth - 16
      );

      setColumnManagerMenuStyle({
        top: triggerRect.bottom + 12,
        left: nextLeft,
        width: nextWidth,
      });
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        columnManagerRef.current &&
        !columnManagerRef.current.contains(event.target as Node) &&
        !columnManagerMenuRef.current?.contains(event.target as Node)
      ) {
        setIsColumnManagerOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsColumnManagerOpen(false);
      }
    }

    updateColumnManagerPosition();
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateColumnManagerPosition);
    window.addEventListener("scroll", updateColumnManagerPosition, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateColumnManagerPosition);
      window.removeEventListener("scroll", updateColumnManagerPosition, true);
    };
  }, [isColumnManagerOpen]);

  const columnManagerMenu =
    isColumnManagerOpen && portalRoot && columnManagerMenuStyle
      ? createPortal(
          <div
            ref={columnManagerMenuRef}
            className={styles.columnManagerMenuPortal}
            style={{
              top: `${columnManagerMenuStyle.top}px`,
              left: `${columnManagerMenuStyle.left}px`,
              width: `${columnManagerMenuStyle.width}px`,
            }}
          >
            <div
              className={styles.columnManagerMenu}
              id="board-columns-menu"
              role="listbox"
              aria-multiselectable="true"
            >
              <div className={styles.columnOptionList}>
                {APPLICATION_BOARD_STAGE_ORDER.map((stage) => {
                  const isVisible = !hiddenColumns.includes(stage);

                  return (
                    <label key={stage} className={styles.columnOption}>
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => onToggleColumn(stage)}
                      />
                      <span>
                        <span className={styles.columnOptionLabel}>
                          {getBoardStageLabel(stage)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>,
          portalRoot
        )
      : null;
  const columnManagerValue = `${visibleColumnCount} of ${APPLICATION_BOARD_STAGE_ORDER.length} visible`;

  return (
    <>
      <section className={styles.toolbarPanel}>
        <div className={styles.toolbarGroup}>
          <label className={styles.searchField} htmlFor="board-search">
            <Search size={16} />
            <input
              id="board-search"
              type="search"
              placeholder="Search by company name"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </label>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCcw size={16} />
            <span>{isLoading ? "Refreshing..." : "Refresh board"}</span>
          </button>
        </div>

        <section
          ref={columnManagerRef}
          className={styles.columnManager}
          aria-labelledby="board-columns"
        >
          <button
            ref={columnManagerButtonRef}
            className={styles.columnManagerButton}
            type="button"
            aria-expanded={isColumnManagerOpen}
            aria-controls="board-columns-menu"
            onClick={() => setIsColumnManagerOpen((current) => !current)}
          >
            <span className={styles.columnManagerButtonCopy}>
              <span className={styles.panelEyebrow} id="board-columns">
                Column Controls
              </span>
              <span className={styles.columnManagerValue}>{columnManagerValue}</span>
            </span>
            <span className={styles.columnManagerButtonMeta}>
              <SlidersHorizontal size={16} />
              <ChevronDown
                size={16}
                className={`${styles.columnManagerChevron} ${
                  isColumnManagerOpen ? styles.columnManagerChevronOpen : ""
                }`}
              />
            </span>
          </button>
        </section>
      </section>

      {columnManagerMenu}
    </>
  );
}
