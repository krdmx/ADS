"use client";

import type {
  JoinWhitelistRequest,
  JoinWhitelistResponse,
} from "@repo/contracts";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { api, getErrorMessage } from "@/lib/api";
import styles from "./landing-page.module.css";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; payload: JoinWhitelistResponse }
  | { kind: "error"; message: string };

export function WhitelistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setState({ kind: "error", message: "Email is required." });
      return;
    }

    setState({ kind: "submitting" });

    try {
      const { data } = await api.post<JoinWhitelistResponse>(
        "/api/v1/whitelist",
        {
          email: normalizedEmail,
        } satisfies JoinWhitelistRequest
      );

      setEmail(data.email);
      setState({ kind: "success", payload: data });
    } catch (error) {
      setState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  const isSubmitting = state.kind === "submitting";
  const isSuccess = state.kind === "success";
  const successMessage =
    isSuccess && state.payload.alreadyListed
      ? "This email is already on the whitelist. We will use the saved entry when access opens."
      : "You are on the list. We will reach out when the next access batch opens.";

  return (
    <form className={styles.whitelistForm} onSubmit={handleSubmit}>
      <div className={styles.whitelistFieldGroup}>
        <label className={styles.fieldLabel} htmlFor="whitelist-email">
          Work email
        </label>
        <input
          className={styles.whitelistInput}
          id="whitelist-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="alex@company.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setState((current) =>
              current.kind === "idle" ? current : { kind: "idle" }
            );
          }}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className={styles.whitelistActions}>
        <p className={styles.whitelistHint}>
          Early access and release updates.
        </p>
        <button
          className={styles.whitelistButton}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Join the whitelist"}
          {isSubmitting ? null : <ArrowRight size={16} />}
        </button>
      </div>

      {isSuccess ? (
        <p className={styles.successMessage} role="status">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </p>
      ) : null}

      {state.kind === "error" ? (
        <p className={styles.errorMessage} role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
