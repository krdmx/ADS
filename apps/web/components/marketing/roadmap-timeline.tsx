"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { RoadmapTimelineEvent } from "./roadmap-events";
import styles from "./roadmap-timeline.module.css";

type TimelinePoint = {
  x: number;
  y: number;
};

type TimelinePathState = {
  width: number;
  height: number;
  path: string;
  pointCount: number;
};

type TimelineRowItem = {
  columnIndex: number;
  event: RoadmapTimelineEvent;
  orderIndex: number;
};

function getTimelineColumns(width: number) {
  if (width <= 640) {
    return 1;
  }

  if (width <= 920) {
    return 2;
  }

  if (width <= 1260) {
    return 3;
  }

  if (width <= 1480) {
    return 4;
  }

  if (width <= 1680) {
    return 5;
  }

  return 6;
}

function sortTimelineEvents(events: RoadmapTimelineEvent[]) {
  return events
    .map((event, index) => ({
      event,
      index,
    }))
    .sort(
      (left, right) =>
        left.event.year - right.event.year ||
        left.event.quarter - right.event.quarter ||
        left.index - right.index
    )
    .map(({ event }) => event);
}

function buildSnakeRows(events: RoadmapTimelineEvent[], columns: number) {
  const rows: TimelineRowItem[][] = [];

  for (let index = 0; index < events.length; index += columns) {
    const rowEvents = events.slice(index, index + columns);
    const rowIndex = rows.length;

    rows.push(
      rowEvents.map((event, localIndex) => ({
        columnIndex:
          rowIndex % 2 === 0 ? localIndex : Math.max(columns - 1 - localIndex, 0),
        event,
        orderIndex: index + localIndex,
      }))
    );
  }

  return rows;
}

function buildTimelinePath(points: TimelinePoint[]) {
  const firstPoint = points[0];

  if (!firstPoint) {
    return "";
  }

  const commands = [`M ${firstPoint.x.toFixed(1)} ${firstPoint.y.toFixed(1)}`];
  let previousPoint = firstPoint;

  for (const point of points.slice(1)) {
    const sameRow = Math.abs(previousPoint.y - point.y) < 1;
    const sameColumn = Math.abs(previousPoint.x - point.x) < 1;

    if (sameRow || sameColumn) {
      commands.push(`L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
    } else {
      commands.push(`L ${point.x.toFixed(1)} ${previousPoint.y.toFixed(1)}`);
      commands.push(`L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
    }

    previousPoint = point;
  }

  return commands.join(" ");
}

export function MarketingRoadmapTimeline({
  events,
}: {
  events: RoadmapTimelineEvent[];
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const gradientId = useId().replace(/:/g, "");
  const shouldReduceMotion = useReducedMotion();
  const isInView = useInView(sectionRef, {
    amount: 0.35,
    once: true,
  });
  const [containerSize, setContainerSize] = useState({
    height: 0,
    width: 1721,
  });
  const [pathState, setPathState] = useState<TimelinePathState>({
    height: 0,
    path: "",
    pointCount: 0,
    width: 0,
  });

  const sortedEvents = sortTimelineEvents(events);
  const columns = getTimelineColumns(containerSize.width);
  const rows = buildSnakeRows(sortedEvents, columns);
  const isSingleColumn = columns === 1;
  const isRevealed = shouldReduceMotion || isInView;
  const lineDuration = shouldReduceMotion ? 0 : 1;

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    let frameId = 0;

    const updateContainerSize = () => {
      const nextSize = {
        height: viewport.scrollHeight,
        width: viewport.clientWidth,
      };

      setContainerSize((currentSize) =>
        currentSize.width === nextSize.width &&
        currentSize.height === nextSize.height
          ? currentSize
          : nextSize
      );
    };

    const scheduleMeasurement = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateContainerSize);
    };

    scheduleMeasurement();

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(frameId);
      };
    }

    const observer = new ResizeObserver(scheduleMeasurement);
    observer.observe(viewport);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const viewportRect = viewport.getBoundingClientRect();
      const points = Array.from(
        viewport.querySelectorAll<HTMLElement>("[data-roadmap-node]")
      )
        .map((node) => {
          const nodeRect = node.getBoundingClientRect();

          if (nodeRect.width === 0 || nodeRect.height === 0) {
            return null;
          }

          return {
            x: nodeRect.left - viewportRect.left + nodeRect.width / 2,
            y: nodeRect.top - viewportRect.top + nodeRect.height / 2,
          } satisfies TimelinePoint;
        })
        .filter((point): point is TimelinePoint => point !== null);

      const nextPathState = {
        height: viewport.scrollHeight,
        path: buildTimelinePath(points),
        pointCount: points.length,
        width: viewport.clientWidth,
      };

      setPathState((currentState) =>
        currentState.width === nextPathState.width &&
        currentState.height === nextPathState.height &&
        currentState.pointCount === nextPathState.pointCount &&
        currentState.path === nextPathState.path
          ? currentState
          : nextPathState
      );
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [columns, containerSize.height, containerSize.width, events]);

  return (
    <div ref={sectionRef} className={styles.timelineShell}>
      <div className={styles.timelineFrame}>
        <motion.header
          animate={
            isRevealed
              ? {
                  opacity: 1,
                  y: 0,
                }
              : {
                  opacity: 0,
                  y: 14,
                }
          }
          className={styles.timelineHeader}
          initial={
            shouldReduceMotion
              ? false
              : {
                  opacity: 0,
                  y: 14,
                }
          }
          transition={{
            duration: shouldReduceMotion ? 0 : 0.45,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <p className={styles.timelineKicker}>Release map</p>
          <h3 className={styles.timelineTitle}>ROADMAP</h3>
        </motion.header>

        <div
          ref={viewportRef}
          className={`${styles.timelineViewport} ${
            isSingleColumn ? styles.timelineViewportSingle : ""
          }`}
        >
          {pathState.pointCount > 1 && pathState.width > 0 && pathState.height > 0 ? (
            <svg
              aria-hidden="true"
              className={styles.timelineCanvas}
              viewBox={`0 0 ${Math.max(pathState.width, 1)} ${Math.max(
                pathState.height,
                1
              )}`}
            >
              <defs>
                <linearGradient
                  id={`roadmap-accent-gradient-${gradientId}`}
                  x1="0%"
                  x2="100%"
                  y1="0%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#20352b" />
                  <stop offset="48%" stopColor="#31ff99" />
                  <stop offset="100%" stopColor="#8cffc9" />
                </linearGradient>
                <filter
                  id={`roadmap-glow-${gradientId}`}
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur result="blur" stdDeviation="2.6" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <path className={styles.timelinePathBase} d={pathState.path} />
              <motion.path
                animate={
                  isRevealed
                    ? {
                        opacity: 1,
                        pathLength: 1,
                      }
                    : {
                        opacity: 0.3,
                        pathLength: 0,
                      }
                }
                className={styles.timelinePathAccent}
                d={pathState.path}
                filter={`url(#roadmap-glow-${gradientId})`}
                initial={
                  shouldReduceMotion
                    ? {
                        opacity: 1,
                        pathLength: 1,
                      }
                    : {
                        opacity: 0.3,
                        pathLength: 0,
                      }
                }
                stroke={`url(#roadmap-accent-gradient-${gradientId})`}
                transition={{
                  duration: lineDuration,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </svg>
          ) : null}

          {rows.map((row, rowIndex) => (
            <div
              key={`roadmap-row-${rowIndex}`}
              className={styles.timelineRow}
              style={
                {
                  "--roadmap-columns": columns,
                } as CSSProperties
              }
            >
              {row.map((item) => {
                const nodeDelay = shouldReduceMotion
                  ? 0
                  : lineDuration + item.orderIndex * 0.1;
                const labelDelay = shouldReduceMotion ? 0 : nodeDelay + 0.07;
                const isMajor = item.event.tier === "major";
                const positionClass = isSingleColumn
                  ? styles.timelineItemInline
                  : item.orderIndex % 2 === 0
                    ? styles.timelineItemBelow
                    : styles.timelineItemAbove;

                return (
                  <article
                    key={item.event.id}
                    className={`${styles.timelineItem} ${positionClass}`}
                    style={
                      {
                        gridColumnStart: item.columnIndex + 1,
                      } as CSSProperties
                    }
                    title={
                      item.event.description
                        ? `${item.event.title}: ${item.event.description}`
                        : item.event.title
                    }
                  >
                    <motion.div
                      animate={
                        isRevealed
                          ? {
                              opacity: 1,
                              y: 0,
                            }
                          : {
                              opacity: 0,
                              y: item.orderIndex % 2 === 0 ? 10 : -10,
                            }
                      }
                      className={styles.timelineEventCopy}
                      initial={
                        shouldReduceMotion
                          ? false
                          : {
                              opacity: 0,
                              y: item.orderIndex % 2 === 0 ? 10 : -10,
                            }
                      }
                      transition={{
                        delay: labelDelay,
                        duration: shouldReduceMotion ? 0 : 0.35,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <p className={styles.timelineEventTitle}>
                        {item.event.title}
                      </p>
                      <p className={styles.timelineEventMeta}>
                        Q{item.event.quarter} {item.event.year} •{" "}
                        {isMajor ? "Major" : "Minor"}
                      </p>
                    </motion.div>

                    <motion.span
                      animate={
                        isRevealed
                          ? {
                              opacity: 1,
                              scale: 1,
                            }
                          : {
                              opacity: 0,
                              scale: 0.6,
                            }
                      }
                      className={styles.timelineNodeAnchor}
                      data-roadmap-node={item.event.id}
                      initial={
                        shouldReduceMotion
                          ? false
                          : {
                              opacity: 0,
                              scale: 0.6,
                            }
                      }
                      transition={{
                        damping: 22,
                        delay: nodeDelay,
                        duration: shouldReduceMotion ? 0 : 0.4,
                        stiffness: 250,
                        type: "spring",
                      }}
                    >
                      <span
                        className={`${styles.timelineNode} ${
                          isMajor
                            ? styles.timelineNodeMajor
                            : styles.timelineNodeMinor
                        }`}
                      />
                    </motion.span>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
