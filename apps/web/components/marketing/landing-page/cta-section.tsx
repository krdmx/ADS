import styles from "../landing-page.module.css";
import { WhitelistForm } from "../whitelist-form";
import { FinalScene, SectionReveal } from "./shared";

export function LandingPageCtaSection() {
  return (
    <SectionReveal className={styles.ctaSection} id="whitelist">
      <div className={styles.ctaContent}>
        <span className={styles.sectionPill}>Early access</span>
        <h2 className={styles.ctaTitle}>Join the next Fitev release wave.</h2>
        <p className={styles.ctaCopy}>
          Get early access to the workspace built for tailored resumes and
          cleaner tracking.
        </p>

        <div className={styles.ctaStats}>
          <article className={styles.ctaStat}>
            <span className={styles.ctaStatLabel}>Tailored output</span>
            <strong className={styles.ctaStatValue}>Resume + role fit</strong>
          </article>
          <article className={styles.ctaStat}>
            <span className={styles.ctaStatLabel}>Pipeline memory</span>
            <strong className={styles.ctaStatValue}>One board timeline</strong>
          </article>
        </div>

        <div className={styles.formShell}>
          <div className={styles.formHeader}>
            <div>
              <p className={styles.formEyebrow}>Public signup</p>
              <h3 className={styles.formTitle}>Save your spot</h3>
            </div>
            <span className={styles.formStateBadge}>Standalone list</span>
          </div>

          <WhitelistForm />
        </div>
      </div>

      <FinalScene />
    </SectionReveal>
  );
}
