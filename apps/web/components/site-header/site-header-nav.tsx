"use client";

import {
  Activity,
  FolderKanban,
  House,
  LayoutGrid,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import styles from "./site-header.module.css";

type NavigationIconKey =
  | "dashboard"
  | "tickets"
  | "board"
  | "profile"
  | "status";

export type SiteNavigationItem = {
  href: string;
  icon: NavigationIconKey;
  label: string;
};

const navigationIcons = {
  dashboard: House,
  tickets: FolderKanban,
  board: LayoutGrid,
  profile: UserRound,
  status: Activity,
} satisfies Record<
  NavigationIconKey,
  ComponentType<{ size?: number; strokeWidth?: number }>
>;

function isNavigationItemActive(item: SiteNavigationItem, pathname: string) {
  if (item.href === "/") {
    return pathname === "/";
  }

  if (item.href === "/applications") {
    return (
      pathname === "/applications" ||
      (pathname.startsWith("/applications/") &&
        !pathname.startsWith("/applications/board"))
    );
  }

  return pathname.startsWith(item.href);
}

export function SiteHeaderNav({
  navigationItems,
}: {
  navigationItems: readonly SiteNavigationItem[];
}) {
  const pathname = usePathname();

  return (
    <nav className={styles.siteNav} aria-label="Primary navigation">
      {navigationItems
        .filter((el) => el.label !== "Status")
        .map((item) => {
          const Icon = navigationIcons[item.icon];
          const isActive = isNavigationItemActive(item, pathname);

          return (
            <Link
              key={item.href}
              className={`${styles.navLink} ${
                isActive ? styles.navLinkActive : ""
              }`}
              href={item.href}
            >
              <Icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}
