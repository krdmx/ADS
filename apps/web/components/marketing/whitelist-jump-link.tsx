"use client";

import { ArrowDownRight } from "lucide-react";

import styles from "./landing-page.module.css";

export function WhitelistJumpLink() {
  return (
    <a
      className={styles.primaryLink}
      href="#whitelist"
      onClick={(event) => {
        const whitelistSection = document.getElementById("whitelist");

        if (!whitelistSection) {
          return;
        }

        event.preventDefault();

        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        whitelistSection.scrollIntoView({
          block: "start",
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      }}
    >
      Join the whitelist
      <ArrowDownRight size={18} />
    </a>
  );
}
