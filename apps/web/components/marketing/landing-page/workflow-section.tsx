import styles from "../landing-page.module.css";
import { SectionReveal, WorkflowScene } from "./shared";

export function LandingPageWorkflowSection() {
  return (
    <SectionReveal className={styles.workflowSection} id="workflow">
      <div className={styles.sectionIntro}>
        <span className={styles.sectionPill}>Workflow story</span>
        <h2 className={styles.sectionTitle}>
          From role brief to follow-up, the story stays connected.
        </h2>
        <p className={styles.sectionCopy}>
          Resume tailoring, stage updates, and interview memory move through
          one live workspace.
        </p>

        <div className={styles.workflowList}>
          <span className={styles.workflowListItem}>
            Source context stays reusable.
          </span>
          <span className={styles.workflowListItem}>
            Tracking stays readable.
          </span>
          <span className={styles.workflowListItem}>
            Interview notes stay attached.
          </span>
        </div>
      </div>

      <WorkflowScene />
    </SectionReveal>
  );
}
