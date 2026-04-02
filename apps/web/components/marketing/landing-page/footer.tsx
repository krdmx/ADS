import { ArrowUpRight, CircleDashed } from "lucide-react";

import { buildAppUrl } from "@/lib/app-urls";

import styles from "../landing-page.module.css";

const signInUrl = buildAppUrl("/auth/sign-in");

export function LandingPageFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <span className={styles.footerLogo}>
          <CircleDashed size={16} />
        </span>
        <span>Fitev keeps every application move in view.</span>
      </div>

      <a className={styles.footerLink} href={signInUrl}>
        Enter the workspace
        <ArrowUpRight size={16} />
      </a>
    </footer>
  );
}
