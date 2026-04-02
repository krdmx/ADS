import { FileSearch, FolderKanban, Sparkles } from "lucide-react";

import styles from "../landing-page.module.css";
import { SectionReveal } from "./shared";

const promiseItems = [
  {
    icon: FileSearch,
    title: "Tailor with signal",
  },
  {
    icon: FolderKanban,
    title: "Track every stage",
  },
  {
    icon: Sparkles,
    title: "Keep context attached",
  },
];

export function LandingPageValueStripSection() {
  return (
    <SectionReveal className={styles.valueStrip}>
      {promiseItems.map((item) => {
        const Icon = item.icon;

        return (
          <article key={item.title} className={styles.promiseCard}>
            <span className={styles.promiseIcon}>
              <Icon size={18} />
            </span>
            <strong className={styles.promiseTitle}>{item.title}</strong>
          </article>
        );
      })}
    </SectionReveal>
  );
}
