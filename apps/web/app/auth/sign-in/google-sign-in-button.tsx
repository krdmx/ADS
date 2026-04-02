"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import styles from "./page.module.css";

export function GoogleSignInButton({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      className={styles.primaryButton}
      type="button"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        await signIn("google", {
          callbackUrl,
        });
      }}
    >
      {isPending ? "Redirecting..." : "Continue with Google"}
    </button>
  );
}
