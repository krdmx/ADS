"use client";

import type {
  AccountPlan,
  CreateBillingSessionResponse,
} from "@repo/contracts";
import { useState } from "react";
import { signOut } from "next-auth/react";

import { api, getErrorMessage } from "@/lib/api";
import { buildMarketingUrl } from "@/lib/app-urls";
import styles from "./site-header.module.css";

export function SiteHeaderActions({
  plan,
  hasCustomerPortal,
}: {
  plan: AccountPlan;
  hasCustomerPortal: boolean;
}) {
  const [isBusy, setIsBusy] = useState(false);

  async function redirectToBilling(
    pathname:
      | "/api/v1/billing/checkout-session"
      | "/api/v1/billing/portal-session"
  ) {
    setIsBusy(true);

    try {
      const { data } = await api.post<CreateBillingSessionResponse>(pathname);
      window.location.assign(data.url);
    } catch (error) {
      console.error(getErrorMessage(error));
      setIsBusy(false);
    }
  }

  return (
    <>
      {plan === "free" ? (
        <button
          className={styles.metaButtonAccent}
          type="button"
          onClick={() =>
            void redirectToBilling("/api/v1/billing/checkout-session")
          }
          disabled={isBusy}
        >
          Upgrade
        </button>
      ) : null}

      {hasCustomerPortal ? (
        <button
          className={styles.metaButton}
          type="button"
          onClick={() =>
            void redirectToBilling("/api/v1/billing/portal-session")
          }
          disabled={isBusy}
        >
          Manage subscription
        </button>
      ) : null}

      <button
        className={`${styles.metaButton} ${styles.signOutButton}`}
        disabled={isBusy}
        onClick={() =>
          void signOut({
            callbackUrl: buildMarketingUrl("/"),
          })
        }
      >
        Sign out
      </button>
    </>
  );
}
