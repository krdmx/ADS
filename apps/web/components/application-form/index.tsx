"use client";

import type {
  CreateBillingSessionResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  GetAccountResponse,
  QuotaExceededErrorResponse,
} from "@repo/contracts";
import { ArrowRight, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AlertPopup } from "@/components/alert-popup";
import { api, getErrorMessage } from "@/lib/api";
import { getQuotaExceededError } from "@/lib/api-response";
import styles from "./application-form.module.css";

const LOCKED_MOCK_VACANCY_DESCRIPTION =
  "Mock mode is enabled. The saved base CV is returned without vacancy-specific tailoring.";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; payload: CreateApplicationResponse }
  | { kind: "error"; message: string };

export function ApplicationForm({
  initialAccount,
  isMockPipelineEnabled = false,
}: {
  initialAccount?: GetAccountResponse;
  isMockPipelineEnabled?: boolean;
}) {
  const [companyName, setCompanyName] = useState("");
  const [vacancyDescription, setVacancyDescription] = useState(() =>
    isMockPipelineEnabled ? LOCKED_MOCK_VACANCY_DESCRIPTION : ""
  );
  const [account, setAccount] = useState<GetAccountResponse | null>(
    initialAccount ?? null
  );
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });
  const [quotaError, setQuotaError] =
    useState<QuotaExceededErrorResponse | null>(null);
  const [isBillingBusy, setIsBillingBusy] = useState(false);

  function resetState() {
    setState((current) =>
      current.kind === "idle" ? current : { kind: "idle" }
    );
  }

  function syncAccountQuota(
    nextQuota: Pick<
      GetAccountResponse,
      | "plan"
      | "subscriptionStatus"
      | "usedThisMonth"
      | "monthlyLimit"
      | "remainingThisMonth"
      | "currentPeriodStart"
      | "currentPeriodEnd"
    >
  ) {
    setAccount((current) =>
      current
        ? {
            ...current,
            ...nextQuota,
            canCreateApplications:
              current.plan === "exclusive" ||
              nextQuota.plan === "exclusive" ||
              current.quotaBypassed ||
              nextQuota.remainingThisMonth > 0,
          }
        : current
    );
  }

  async function startBillingFlow(
    pathname:
      | "/api/v1/billing/checkout-session"
      | "/api/v1/billing/portal-session"
  ) {
    setIsBillingBusy(true);

    try {
      const { data } = await api.post<CreateBillingSessionResponse>(pathname);
      window.location.assign(data.url);
    } catch (error) {
      setState({ kind: "error", message: getErrorMessage(error) });
      setIsBillingBusy(false);
    }
  }

  function openQuotaPopup(nextQuotaError: QuotaExceededErrorResponse) {
    setQuotaError(nextQuotaError);
    syncAccountQuota(nextQuotaError);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextCompanyName = String(formData.get("companyName") ?? "").trim();
    const nextVacancyDescription = isMockPipelineEnabled
      ? LOCKED_MOCK_VACANCY_DESCRIPTION
      : String(formData.get("vacancyDescription") ?? "").trim();

    setCompanyName(nextCompanyName);
    setVacancyDescription(nextVacancyDescription);

    if (!nextCompanyName || !nextVacancyDescription) {
      setState({
        kind: "error",
        message: "Company name and role brief are required.",
      });
      return;
    }

    if (
      account &&
      account.plan !== "exclusive" &&
      !account.quotaBypassed &&
      account.remainingThisMonth <= 0
    ) {
      openQuotaPopup({
        code: "quota_exceeded",
        message:
          account.plan === "free"
            ? "Your free monthly generation limit has been reached."
            : "Your monthly generation limit has been reached.",
        plan: account.plan,
        subscriptionStatus: account.subscriptionStatus,
        usedThisMonth: account.usedThisMonth,
        monthlyLimit: account.monthlyLimit,
        remainingThisMonth: account.remainingThisMonth,
        currentPeriodStart: account.currentPeriodStart,
        currentPeriodEnd: account.currentPeriodEnd,
      });
      return;
    }

    setState({ kind: "submitting" });

    try {
      const { data: payload } = await api.post<CreateApplicationResponse>(
        "/api/v1/applications",
        {
          companyName: nextCompanyName,
          vacancyDescription: nextVacancyDescription,
        } satisfies CreateApplicationRequest
      );

      setState({ kind: "success", payload });
      setAccount((current) =>
        current
          ? current.plan === "exclusive" || current.quotaBypassed
            ? current
            : {
                ...current,
                usedThisMonth: current.usedThisMonth + 1,
                remainingThisMonth: Math.max(0, current.remainingThisMonth - 1),
                canCreateApplications: current.remainingThisMonth - 1 > 0,
              }
          : current
      );
    } catch (error) {
      const nextQuotaError = getQuotaExceededError(error);

      if (nextQuotaError) {
        openQuotaPopup(nextQuotaError);
        setState({ kind: "idle" });
        return;
      }

      setState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  const isExclusivePlan = account?.plan === "exclusive";
  const hasLocalQuotaBypass = Boolean(account?.quotaBypassed);
  const quotaSummary = account
    ? isExclusivePlan
      ? "Unlimited access"
      : hasLocalQuotaBypass
        ? "Unlimited locally"
        : `${account.usedThisMonth}/${account.monthlyLimit} used this month`
    : null;
  const quotaLabel = account
    ? isExclusivePlan
      ? "Exclusive plan"
      : hasLocalQuotaBypass
        ? "Local development quota"
        : account.plan === "paid"
          ? "Paid monthly limit"
          : "Free monthly limit"
    : null;
  const quotaResetLabel = quotaError
    ? new Date(quotaError.currentPeriodEnd).toLocaleDateString()
    : account
      ? new Date(account.currentPeriodEnd).toLocaleDateString()
      : null;
  const quotaHint = account
    ? isExclusivePlan
      ? "Your account has unlimited CV generation and full feature access."
      : hasLocalQuotaBypass
        ? "This Google account bypasses monthly generation caps while the app runs outside production."
        : account.remainingThisMonth > 0
          ? `${account.remainingThisMonth} generations remaining before ${new Date(
              account.currentPeriodEnd
            ).toLocaleDateString()}.`
          : `No generations remaining until ${new Date(
              account.currentPeriodEnd
            ).toLocaleDateString()}.`
    : null;
  const surfacedPlan = quotaError?.plan ?? account?.plan;
  const isPaidPlan = surfacedPlan === "paid";
  const canManageSubscription = isPaidPlan && account?.hasCustomerPortal;

  return (
    <div className={styles.formStack}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Ticket Composer</p>
        <h1 className={styles.title}>
          Turn each request into an editable markdown workspace.
        </h1>
        {account ? (
          <div className={styles.quotaPanel}>
            <div>
              <p className={styles.quotaLabel}>{quotaLabel}</p>
              <strong className={styles.quotaValue}>{quotaSummary}</strong>
            </div>
            <p className={styles.quotaHint}>{quotaHint}</p>
          </div>
        ) : null}
      </div>

      <form className={styles.composerForm} onSubmit={handleSubmit}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="companyName">
            Company name
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
          <label className={styles.fieldLabel} htmlFor="vacancyDescription">
            Role brief
          </label>
          <textarea
            className={styles.textArea}
            id="vacancyDescription"
            name="vacancyDescription"
            placeholder={
              isMockPipelineEnabled
                ? "Mock mode locks the role brief."
                : "Paste the job description or hiring brief here."
            }
            value={vacancyDescription}
            onChange={(event) => {
              resetState();
              setVacancyDescription(event.target.value);
            }}
            disabled={isMockPipelineEnabled || state.kind === "submitting"}
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

      <AlertPopup
        open={quotaError !== null}
        eyebrow={isPaidPlan ? "Monthly limit reached" : "Free limit reached"}
        title={
          isPaidPlan
            ? "This plan has reached its monthly generation cap."
            : "Your free monthly generation limit has been reached."
        }
        description={
          quotaError
            ? isPaidPlan
              ? `You have already used ${quotaError.usedThisMonth} of ${quotaError.monthlyLimit} generations this month. The counter resets on ${quotaResetLabel}.`
              : `You have already used ${quotaError.usedThisMonth} of ${quotaError.monthlyLimit} free generations this month. The counter resets on ${quotaResetLabel}. Upgrade to keep creating new tickets right away.`
            : ""
        }
        confirmLabel={
          isPaidPlan
            ? canManageSubscription
              ? "Manage subscription"
              : "Okay"
            : "Upgrade now"
        }
        cancelLabel="Maybe later"
        isBusy={isBillingBusy}
        tone="default"
        onCancel={() => {
          if (isBillingBusy) {
            return;
          }

          setQuotaError(null);
        }}
        onConfirm={async () => {
          if (!quotaError) {
            return;
          }

          if (isPaidPlan) {
            if (!canManageSubscription) {
              setQuotaError(null);
              return;
            }

            await startBillingFlow("/api/v1/billing/portal-session");
            return;
          }

          await startBillingFlow("/api/v1/billing/checkout-session");
        }}
      />
    </div>
  );
}
