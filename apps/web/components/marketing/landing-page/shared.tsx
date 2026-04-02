"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

import styles from "../landing-page.module.css";

const workflowChips = ["Tailored CV", "Live board state", "Interview notes"];

type SectionRevealProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

type SceneFrameProps = {
  children: ReactNode;
  className?: string;
};

type SceneStyle = CSSProperties & {
  "--scene-rotate-x"?: string;
  "--scene-rotate-y"?: string;
  "--scene-shift-x"?: string;
  "--scene-shift-y"?: string;
};

export function SectionReveal({
  children,
  className,
  id,
}: SectionRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      className={className}
      id={id}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 32 }}
      transition={{
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      viewport={{ amount: 0.2, once: true }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
    >
      {children}
    </motion.section>
  );
}

function SceneFrame({ children, className }: SceneFrameProps) {
  const shouldReduceMotion = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (shouldReduceMotion) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const nextY = (event.clientY - bounds.top) / bounds.height - 0.5;

    setOffset({
      x: nextX,
      y: nextY,
    });
  }

  function resetPointer() {
    setOffset({
      x: 0,
      y: 0,
    });
  }

  const style: SceneStyle = shouldReduceMotion
    ? {}
    : {
        "--scene-rotate-x": `${offset.y * -7}deg`,
        "--scene-rotate-y": `${offset.x * 8}deg`,
        "--scene-shift-x": `${offset.x * 18}px`,
        "--scene-shift-y": `${offset.y * 18}px`,
      };

  return (
    <motion.div
      aria-hidden="true"
      className={`${styles.sceneFrame} ${className ?? ""}`}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
      onPointerLeave={resetPointer}
      onPointerMove={handlePointerMove}
      style={style}
      transition={{
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      viewport={{ amount: 0.35, once: true }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, scale: 1 }}
    >
      <div className={styles.sceneGlow} />
      <div className={styles.sceneGrid} />
      <div className={styles.sceneWorld}>{children}</div>
    </motion.div>
  );
}

export function HeroScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <SceneFrame className={styles.heroScene}>
      <div className={styles.sceneDeck} />
      <div className={`${styles.scenePlate} ${styles.scenePlateLarge}`} />
      <div className={styles.sceneGate} />
      <motion.div
        animate={shouldReduceMotion ? undefined : { y: [0, -16, 0] }}
        className={styles.heroOrbital}
        transition={{
          duration: 5.4,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <div className={styles.sceneOrb} />
        <div className={styles.sceneRing} />
      </motion.div>

      <motion.div
        animate={shouldReduceMotion ? undefined : { y: [0, -18, 0] }}
        className={styles.heroCubeCluster}
        transition={{
          duration: 6.2,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <span className={styles.sceneCube} />
        <span className={styles.sceneCube} />
        <span className={`${styles.sceneCube} ${styles.sceneCubeAccent}`} />
      </motion.div>

      <motion.div
        animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
        className={styles.sceneTag}
        transition={{
          duration: 4.6,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <span className={styles.sceneTagPill}>Role fit</span>
        <strong className={styles.sceneTagValue}>Sharper signal</strong>
      </motion.div>

      <div className={styles.sceneResumeCard}>
        <span className={styles.sceneCardLabel}>Tailored CV</span>
        <strong className={styles.sceneCardValue}>
          Resume adapts to the role.
        </strong>
        <div className={styles.sceneLineStack}>
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className={styles.sceneBoardCard}>
        <div className={styles.sceneBoardHead}>
          <span className={styles.sceneCardLabel}>Live board</span>
          <span className={styles.sceneStatusDot} />
        </div>
        <div className={styles.sceneBoardColumns}>
          <span />
          <span className={styles.sceneBoardColumnAccent} />
          <span />
        </div>
      </div>

      <div className={styles.sceneChipRow}>
        <span className={styles.sceneChip}>Resume ready</span>
        <span className={styles.sceneChip}>Tracking synced</span>
      </div>
    </SceneFrame>
  );
}

export function WorkflowScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <SceneFrame className={styles.workflowScene}>
      <div className={`${styles.scenePlate} ${styles.scenePlateWide}`} />
      <div className={styles.workflowBridge} />

      <motion.div
        animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
        className={styles.workflowBeacon}
        transition={{
          duration: 5,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <div className={styles.sceneHalo} />
        <div className={styles.sceneCoreBadge}>Workspace</div>
      </motion.div>

      <div className={styles.workflowResumePanel}>
        <span className={styles.sceneCardLabel}>Source profile</span>
        <div className={styles.sceneLineStack}>
          <span />
          <span />
          <span />
        </div>
        <span className={styles.scenePanelPill}>Role brief</span>
      </div>

      <div className={styles.workflowBoardPanel}>
        <span className={styles.sceneCardLabel}>Tracking</span>
        <div className={styles.sceneMiniColumns}>
          <span />
          <span className={styles.sceneMiniColumnsAccent} />
          <span />
        </div>
      </div>

      <div className={styles.workflowNotesPanel}>
        <span className={styles.sceneCardLabel}>Interview notes</span>
        <div className={styles.sceneListStack}>
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className={styles.workflowTagRow}>
        {workflowChips.map((chip) => (
          <span key={chip} className={styles.sceneChip}>
            {chip}
          </span>
        ))}
      </div>
    </SceneFrame>
  );
}

export function FinalScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <SceneFrame className={`${styles.ctaScene} ${styles.sceneMirrored}`}>
      <div className={`${styles.scenePlate} ${styles.scenePlateTall}`} />
      <div className={styles.sceneGate} />

      <motion.div
        animate={shouldReduceMotion ? undefined : { y: [0, -14, 0] }}
        className={styles.ctaBeacon}
        transition={{
          duration: 6,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <div className={styles.sceneOrb} />
        <div className={styles.sceneRing} />
      </motion.div>

      <div className={styles.ctaBoardPreview}>
        <span className={styles.sceneCardLabel}>Next release</span>
        <strong className={styles.sceneCardValue}>
          Early access opens in waves.
        </strong>
        <div className={styles.sceneMiniColumns}>
          <span />
          <span className={styles.sceneMiniColumnsAccent} />
          <span />
        </div>
      </div>

      <div className={styles.ctaSignalCard}>
        <span className={styles.sceneCardLabel}>Fitev</span>
        <div className={styles.sceneLineStack}>
          <span />
          <span />
        </div>
      </div>
    </SceneFrame>
  );
}
