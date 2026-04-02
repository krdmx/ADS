"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BriefcaseBusiness,
  FileSearch,
  FolderKanban,
  ScanSearch,
  Workflow,
} from "lucide-react";

import styles from "../landing-page.module.css";
import { SectionReveal } from "./shared";

const featureTiles = [
  {
    icon: FileSearch,
    title: "Tailor every application",
    copy: "Shape each resume from one saved source layer.",
  },
  {
    icon: FolderKanban,
    title: "Track every stage",
    copy: "See role movement, follow-ups, and next actions in one flow.",
  },
  {
    icon: Workflow,
    title: "Keep interview context attached",
    copy: "Questions, recruiter notes, and timing stay with the same role.",
  },
  {
    icon: ScanSearch,
    title: "Stay ATS-readable",
    copy: "Lead with cleaner relevance, sharper wording, and easier scans.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Move faster with one workspace",
    copy: "Resume tailoring and pipeline memory stop drifting apart.",
    accent: true,
  },
];

export function LandingPageFeaturesSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <SectionReveal className={styles.featuresSection} id="features">
      <div className={styles.featuresIntro}>
        <span className={styles.sectionPill}>Core features</span>
        <h2 className={styles.sectionTitle}>
          Built for cleaner, faster application operations.
        </h2>
        <p className={styles.sectionCopy}>
          Each tile removes one source of drag from the search process.
        </p>
      </div>

      <div className={styles.featureGrid}>
        {featureTiles.map((tile, index) => {
          const Icon = tile.icon;

          return (
            <motion.article
              key={tile.title}
              className={`${styles.featureTile} ${
                tile.accent ? styles.featureTileAccent : ""
              }`}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              transition={{
                delay: index * 0.08,
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              viewport={{ amount: 0.3, once: true }}
              whileInView={
                shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
              }
            >
              <span className={styles.featureIcon}>
                <Icon size={18} />
              </span>
              <h3 className={styles.featureTitle}>{tile.title}</h3>
              <p className={styles.featureCopy}>{tile.copy}</p>
            </motion.article>
          );
        })}
      </div>
    </SectionReveal>
  );
}
