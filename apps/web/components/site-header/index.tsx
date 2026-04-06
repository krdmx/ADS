import Link from "next/link";

import { AppLogo } from "@/assets";
import { SiteHeaderNav, type SiteNavigationItem } from "./site-header-nav";
import styles from "./site-header.module.css";

const navigationItems: SiteNavigationItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: "dashboard",
  },
  {
    href: "/applications",
    label: "Tickets",
    icon: "tickets",
  },
  {
    href: "/applications/board",
    label: "Board",
    icon: "board",
  },
  {
    href: "/profile",
    label: "Profile",
    icon: "profile",
  },
  {
    href: "/status",
    label: "Status",
    icon: "status",
  },
];

export function SiteHeader() {
  return (
    <header className={styles.headerShell}>
      <Link className={styles.brandMark} href="/">
        <span className={styles.brandIcon}>
          <AppLogo className={styles.brandIconGraphic} height={30} width={30} />
        </span>
        <span className={styles.brandCopy}>
          <strong className={styles.brandTitle}>Fitev</strong>
        </span>
      </Link>

      <SiteHeaderNav navigationItems={navigationItems} />
    </header>
  );
}
