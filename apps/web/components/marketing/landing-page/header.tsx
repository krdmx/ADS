import { AppLogo } from "@/assets";
import { buildAppUrl } from "@/lib/app-urls";

import styles from "../landing-page.module.css";

const navigationItems = [
  { href: "#workflow", label: "Workflow" },
  { href: "#features", label: "Features" },
  { href: "#whitelist", label: "Access" },
];

const signInUrl = buildAppUrl("/auth/sign-in");

export function LandingPageHeader() {
  return (
    <header className={styles.header}>
      <a className={styles.brand} href="#">
        <span className={styles.brandMark}>
          <AppLogo
            className={styles.brandMarkGraphic}
            height={28}
            priority
            width={28}
          />
        </span>
        <span className={styles.brandText}>
          <strong>Fitev</strong>
          <span>Application Workspace</span>
        </span>
      </a>

      <nav aria-label="Landing sections" className={styles.nav}>
        {navigationItems.map((item) => (
          <a key={item.href} className={styles.navLink} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className={styles.headerActions}>
        <a className={styles.headerButton} href="#whitelist">
          Join whitelist
        </a>
        <a className={styles.secondaryLink} href={signInUrl}>
          Sign in
        </a>
      </div>
    </header>
  );
}
