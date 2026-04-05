import { buildAppUrl } from "@/lib/app-urls";

import styles from "../landing-page.module.css";
import { WhitelistJumpLink } from "../whitelist-jump-link";
import { HeroScene, SectionReveal } from "./shared";

const workspaceUrl = buildAppUrl("/");

export function LandingPageHeroSection() {
  return (
    <SectionReveal className={styles.heroSection}>
      <HeroScene />

      <div className={styles.heroContent}>
        <span className={styles.sectionPill}>Application workspace</span>

        <h1 className={styles.heroTitle}>
          Run every application in one sharper workspace.
        </h1>

        <p className={styles.heroCopy}>
          Fitev keeps role-fit resumes, board movement, and interview context
          on the same clean system.
        </p>

        <div className={styles.heroActions}>
          <WhitelistJumpLink />
          <a className={styles.secondaryLink} href={workspaceUrl}>
            Open the workspace
          </a>
        </div>
      </div>
    </SectionReveal>
  );
}
