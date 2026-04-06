"use client";

import type {
  CreateApplicationRequest,
  CreateApplicationResponse,
} from "@repo/contracts";
import { ArrowRight, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { api, getErrorMessage } from "@/lib/api";
import styles from "./application-form.module.css";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; payload: CreateApplicationResponse }
  | { kind: "error"; message: string };

export function ApplicationForm() {
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [vacancyDescription, setVacancyDescription] = useState("");
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });

  function resetState() {
    setState((current) =>
      current.kind === "idle" ? current : { kind: "idle" }
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextCompanyName = companyName.trim();
    const nextCompanyWebsite = companyWebsite.trim();
    const nextPositionTitle = positionTitle.trim();
    const nextJdUrl = jdUrl.trim();
    const nextVacancyDescription = vacancyDescription.trim();

    if (
      !nextCompanyName ||
      !nextPositionTitle ||
      !nextJdUrl ||
      !nextVacancyDescription
    ) {
      setState({
        kind: "error",
        message:
          "Company name, position title, JD URL, and role brief are required.",
      });
      return;
    }

    setState({ kind: "submitting" });

    try {
      const requestBody: CreateApplicationRequest = {
        companyName: nextCompanyName,
        positionTitle: nextPositionTitle,
        jdUrl: nextJdUrl,
        vacancyDescription: nextVacancyDescription,
        ...(nextCompanyWebsite ? { companyWebsite: nextCompanyWebsite } : {}),
      };
      const { data: payload } = await api.post<CreateApplicationResponse>(
        "/api/v1/applications",
        requestBody
      );

      setState({ kind: "success", payload });
    } catch (error) {
      setState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  return (
    <div className={styles.formStack}>
      <div className={styles.heroCopy}>
        <h1 className={styles.title}>Ticket Composer</h1>
      </div>

      <form className={styles.composerForm} onSubmit={handleSubmit}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="companyName">
            Company name *
          </label>
          <input
            className={styles.textInput}
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            placeholder="OpenAI"
            value={companyName}
            onChange={(event) => {
              resetState();
              setCompanyName(event.target.value);
            }}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="companyWebsite">
            Company website
          </label>
          <input
            className={styles.textInput}
            id="companyWebsite"
            name="companyWebsite"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://company.com"
            value={companyWebsite}
            onChange={(event) => {
              resetState();
              setCompanyWebsite(event.target.value);
            }}
            disabled={state.kind === "submitting"}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="positionTitle">
            Position title *
          </label>
          <input
            className={styles.textInput}
            id="positionTitle"
            name="positionTitle"
            type="text"
            placeholder="Senior Frontend Engineer"
            value={positionTitle}
            onChange={(event) => {
              resetState();
              setPositionTitle(event.target.value);
            }}
            disabled={state.kind === "submitting"}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="jdUrl">
            JD URL *
          </label>
          <input
            className={styles.textInput}
            id="jdUrl"
            name="jdUrl"
            type="url"
            inputMode="url"
            placeholder="https://company.com/careers/frontend-engineer"
            value={jdUrl}
            onChange={(event) => {
              resetState();
              setJdUrl(event.target.value);
            }}
            disabled={state.kind === "submitting"}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="vacancyDescription">
            Role brief *
          </label>
          <textarea
            className={styles.textArea}
            id="vacancyDescription"
            name="vacancyDescription"
            placeholder="Paste the job description or hiring brief here."
            value={vacancyDescription}
            onChange={(event) => {
              resetState();
              setVacancyDescription(event.target.value);
            }}
            disabled={state.kind === "submitting"}
            required
          />
        </div>

        <div className={styles.formActions}>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={state.kind === "submitting"}
          >
            <FilePlus2 size={18} />
            <span>
              {state.kind === "submitting" ? "Creating..." : "Create Ticket"}
            </span>
          </button>
        </div>
      </form>

      {state.kind === "success" ? (
        <div
          className={`${styles.feedbackPanel} ${styles.feedbackSuccess}`}
          aria-live="polite"
        >
          <div className={styles.feedbackContent}>
            <div className={styles.feedbackHeader}>
              <div>
                <p className={styles.statusLabel}>Ticket created</p>
                <h3 className={styles.feedbackTitle}>
                  {state.payload.ticketId}
                </h3>
              </div>
              <span className={styles.statusPill}>{state.payload.status}</span>
            </div>
            <p className={styles.feedbackText}>
              Created at: {new Date(state.payload.createdAt).toLocaleString()}
            </p>
            <p className={styles.feedbackText}>
              CV and company/vacancy summary are now generating in parallel.
            </p>
            <div className={styles.feedbackLinks}>
              <Link
                className={`${styles.textLink} ${styles.textLinkInline}`}
                href={`/applications/${state.payload.ticketId}`}
              >
                <span>Open ticket workspace</span>
                <ArrowRight size={16} />
              </Link>
              <Link className={styles.textLink} href="/applications">
                View all tickets
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div
          className={`${styles.feedbackPanel} ${styles.feedbackError}`}
          aria-live="polite"
        >
          <div className={styles.feedbackContent}>
            <p className={styles.statusLabel}>Submission failed</p>
            <h3 className={styles.feedbackTitle}>
              Backend rejected the ticket.
            </h3>
            <p className={styles.feedbackText}>{state.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
