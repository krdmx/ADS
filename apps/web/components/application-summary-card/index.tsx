import type {
  ApplicationCombinedSummaryResponse,
  ApplicationVacancySummarySeniority,
} from "@repo/contracts";
import type { ReactNode } from "react";

import styles from "./application-summary-card.module.css";

type ApplicationSummaryCardProps = {
  summary: ApplicationCombinedSummaryResponse;
};

type DetailRow = {
  label: string;
  value: string;
};

const COMPANY_TYPE_LABELS: Record<string, string> = {
  startup: "Startup",
  scaleup: "Scale-up",
  enterprise: "Enterprise",
  agency: "Agency",
  other: "Other",
};

const FUNDING_STAGE_LABELS: Record<string, string> = {
  bootstrapped: "Bootstrapped",
  "pre-seed": "Pre-seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  public: "Public",
  unknown: "Unknown",
};

const BUSINESS_MODEL_LABELS: Record<string, string> = {
  B2B: "B2B",
  B2C: "B2C",
  B2B2C: "B2B2C",
  marketplace: "Marketplace",
  other: "Other",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  SaaS: "SaaS",
  "mobile app": "Mobile app",
  platform: "Platform",
  service: "Service",
  hardware: "Hardware",
  other: "Other",
};

const WORK_STYLE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  office: "Office",
};

const SENIORITY_LABELS: Record<string, string> = {
  intern: "Intern",
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
  lead: "Lead",
  principal: "Principal",
  unknown: "Unknown",
};

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function ApplicationSummaryCard({
  summary,
}: ApplicationSummaryCardProps) {
  return (
    <div className={styles.summaryStack}>
      <CompanySummaryCard summary={summary} />
      <VacancySummaryCard summary={summary} />
      <ScreeningPrepCard summary={summary} />
    </div>
  );
}

function CompanySummaryCard({
  summary,
}: ApplicationSummaryCardProps) {
  const company = summary.companySummary?.company;
  const culture = summary.companySummary?.culture;
  const flags = summary.companySummary?.flags;
  const companyName = readText(company?.name);
  const headerBadges = [
    formatMappedLabel(company?.funding_stage, FUNDING_STAGE_LABELS),
    formatMappedLabel(company?.type, COMPANY_TYPE_LABELS),
    formatMappedLabel(company?.business_model, BUSINESS_MODEL_LABELS),
    formatMappedLabel(company?.product_type, PRODUCT_TYPE_LABELS),
  ].filter(isPresent);
  const details: DetailRow[] = [
    buildDetailRow("Size", company?.size),
    buildDetailRow("Industry", company?.industry),
    buildDetailRow("Founded", company?.founded),
    buildDetailRow("HQ", company?.hq),
  ].filter(isPresent);
  const workStyle = formatMappedLabel(culture?.work_style, WORK_STYLE_LABELS);
  const engineeringCulture = readText(culture?.engineering_culture);
  const cultureValues = readList(culture?.values);
  const greenFlags = readList(flags?.green);
  const redFlags = readList(flags?.red);
  const hasContent =
    companyName !== null ||
    headerBadges.length > 0 ||
    details.length > 0 ||
    workStyle !== null ||
    engineeringCulture !== null ||
    cultureValues.length > 0 ||
    greenFlags.length > 0 ||
    redFlags.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <p className={styles.cardEyebrow}>Company</p>
        {companyName ? <h2 className={styles.cardTitle}>{companyName}</h2> : null}
        {headerBadges.length > 0 ? (
          <div className={styles.badgeRow}>
            {headerBadges.map((badge, index) => (
              <span key={`${badge}-${index}`} className={styles.badge}>
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <div className={styles.cardBody}>
        {details.length > 0 ? (
          <SummarySection title="Details">
            <DetailGrid rows={details} />
          </SummarySection>
        ) : null}

        {workStyle || engineeringCulture || cultureValues.length > 0 ? (
          <SummarySection title="Culture">
            {workStyle ? (
              <DetailGrid rows={[{ label: "Work style", value: workStyle }]} />
            ) : null}
            {engineeringCulture ? (
              <TextBlock
                label="Engineering culture"
                value={engineeringCulture}
              />
            ) : null}
            {cultureValues.length > 0 ? (
              <div className={styles.blockStack}>
                <p className={styles.subtleLabel}>Values</p>
                <ChipRow items={cultureValues} />
              </div>
            ) : null}
          </SummarySection>
        ) : null}

        {greenFlags.length > 0 || redFlags.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.twoColumnGrid}>
              {greenFlags.length > 0 ? (
                <FlagColumn
                  items={greenFlags}
                  title="Strengths"
                  tone="positive"
                />
              ) : null}
              {redFlags.length > 0 ? (
                <FlagColumn items={redFlags} title="Risks" tone="negative" />
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function VacancySummaryCard({
  summary,
}: ApplicationSummaryCardProps) {
  const vacancy = summary.vacancySummary;
  const position = vacancy?.position;
  const title = readText(position?.title);
  const seniorityValue = readText(position?.seniority);
  const seniorityLabel = formatMappedLabel(seniorityValue, SENIORITY_LABELS);
  const teamContext = readText(position?.team_context);
  const salaryRange = formatSalaryRange(position?.salary_range);
  const keyTasks = readList(position?.key_tasks);
  const requiredStack = readList(position?.required_stack);
  const niceToHaveStack = readList(position?.nice_to_have_stack);
  const interviewProcess = readList(position?.interview_process);
  const growthOpportunities = readText(position?.growth_opportunities);
  const hasContent =
    title !== null ||
    seniorityLabel !== null ||
    teamContext !== null ||
    salaryRange !== null ||
    keyTasks.length > 0 ||
    requiredStack.length > 0 ||
    niceToHaveStack.length > 0 ||
    interviewProcess.length > 0 ||
    growthOpportunities !== null;

  if (!hasContent) {
    return null;
  }

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <p className={styles.cardEyebrow}>Vacancy</p>
        {title || seniorityLabel ? (
          <div className={styles.titleRow}>
            {title ? <h2 className={styles.cardTitle}>{title}</h2> : null}
            {seniorityLabel ? (
              <SeniorityBadge
                label={seniorityLabel}
                seniority={toKnownSeniority(seniorityValue)}
              />
            ) : null}
          </div>
        ) : null}
        {teamContext ? (
          <p className={styles.supportingText}>{teamContext}</p>
        ) : null}
        {salaryRange ? (
          <div className={styles.inlineMeta}>
            <span className={styles.inlineMetaLabel}>Salary range</span>
            <span className={styles.inlineMetaValue}>{salaryRange}</span>
          </div>
        ) : null}
      </header>

      <div className={styles.cardBody}>
        {keyTasks.length > 0 ? (
          <SummarySection title="Key tasks">
            <DividedList items={keyTasks} />
          </SummarySection>
        ) : null}

        {requiredStack.length > 0 ? (
          <SummarySection title="Required stack">
            <ChipRow items={requiredStack} />
          </SummarySection>
        ) : null}

        {niceToHaveStack.length > 0 ? (
          <SummarySection title="Nice to have">
            <ChipRow items={niceToHaveStack} />
          </SummarySection>
        ) : null}

        {interviewProcess.length > 0 ? (
          <SummarySection title="Interview process">
            <BulletList items={interviewProcess} />
          </SummarySection>
        ) : null}

        {growthOpportunities ? (
          <SummarySection title="Growth opportunities">
            <p className={styles.paragraph}>{growthOpportunities}</p>
          </SummarySection>
        ) : null}
      </div>
    </section>
  );
}

function ScreeningPrepCard({
  summary,
}: ApplicationSummaryCardProps) {
  const screeningPrep = summary.vacancySummary?.screening_prep;
  const whyHireMe = readList(screeningPrep?.why_hire_me);
  const hrQuestions = readList(screeningPrep?.smart_questions?.hr);
  const techQuestions = readList(screeningPrep?.smart_questions?.tech);
  const hasContent =
    whyHireMe.length > 0 || hrQuestions.length > 0 || techQuestions.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <p className={styles.cardEyebrow}>Screening</p>
        <h2 className={styles.cardTitle}>Screening prep</h2>
      </header>

      <div className={styles.cardBody}>
        {whyHireMe.length > 0 ? (
          <SummarySection title="Why hire me">
            <BulletList items={whyHireMe} />
          </SummarySection>
        ) : null}

        {hrQuestions.length > 0 || techQuestions.length > 0 ? (
          <SummarySection title="Smart questions">
            <div className={styles.twoColumnGrid}>
              {hrQuestions.length > 0 ? (
                <QuestionColumn items={hrQuestions} title="HR" />
              ) : null}
              {techQuestions.length > 0 ? (
                <QuestionColumn items={techQuestions} title="Tech" />
              ) : null}
            </div>
          </SummarySection>
        ) : null}
      </div>
    </section>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <p className={styles.sectionLabel}>{title}</p>
      <div className={styles.blockStack}>{children}</div>
    </section>
  );
}

function DetailGrid({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className={styles.detailGrid}>
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${row.value}-${index}`}
          className={styles.detailCard}
        >
          <dt className={styles.detailLabel}>{row.label}</dt>
          <dd className={styles.detailValue}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <div className={styles.chipRow}>
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className={styles.chip}>
          {item}
        </span>
      ))}
    </div>
  );
}

function FlagColumn({
  items,
  title,
  tone,
}: {
  items: string[];
  title: string;
  tone: "positive" | "negative";
}) {
  return (
    <div className={styles.columnStack}>
      <p className={styles.sectionLabel}>{title}</p>
      <div className={styles.blockStack}>
        {items.map((item, index) => (
          <div
            key={`${title}-${item}-${index}`}
            className={`${styles.flagCard} ${
              tone === "positive" ? styles.flagPositive : styles.flagNegative
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionColumn({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <div className={styles.columnStack}>
      <p className={styles.sectionLabel}>{title}</p>
      <DividedList items={items} />
    </div>
  );
}

function DividedList({ items }: { items: string[] }) {
  return (
    <ul className={styles.dividedList}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className={styles.dividedListItem}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className={styles.bulletList}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className={styles.bulletListItem}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.blockStack}>
      <p className={styles.subtleLabel}>{label}</p>
      <p className={styles.paragraph}>{value}</p>
    </div>
  );
}

function SeniorityBadge({
  label,
  seniority,
}: {
  label: string;
  seniority: ApplicationVacancySummarySeniority;
}) {
  return (
    <span className={styles.seniorityBadge} data-seniority={seniority}>
      <span className={styles.seniorityDot} data-seniority={seniority} />
      {label}
    </span>
  );
}

function buildDetailRow(
  label: string,
  value: unknown
): DetailRow | null {
  const text = readText(value);

  if (!text) {
    return null;
  }

  return {
    label,
    value: text,
  };
}

function readText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function readList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const item = readText(entry);

    return item ? [item] : [];
  });
}

function formatMappedLabel(
  value: unknown,
  labels: Record<string, string>
): string | null {
  const text = readText(value);

  if (!text) {
    return null;
  }

  return labels[text] ?? humanizeLabel(text);
}

function humanizeLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (/^[A-Z0-9+-]+$/.test(part)) {
        return part;
      }

      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join(" ");
}

function formatSalaryRange(
  salaryRange: {
    min: number | null;
    max: number | null;
    currency: string | null;
  } | null | undefined
): string | null {
  const min =
    typeof salaryRange?.min === "number" ? salaryRange.min : null;
  const max =
    typeof salaryRange?.max === "number" ? salaryRange.max : null;
  const currency = readText(salaryRange?.currency);

  if (min === null && max === null) {
    return null;
  }

  const prefix = currency ? `${currency} ` : "";

  if (min !== null && max !== null) {
    return `${prefix}${formatNumber(min)} - ${formatNumber(max)}`;
  }

  if (min !== null) {
    return `${prefix}${formatNumber(min)}+`;
  }

  if (max !== null) {
    return `Up to ${prefix}${formatNumber(max)}`;
  }

  return null;
}

function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}

function toKnownSeniority(
  value: string | null
): ApplicationVacancySummarySeniority {
  switch (value) {
    case "intern":
    case "junior":
    case "middle":
    case "senior":
    case "lead":
    case "principal":
      return value;
    default:
      return "unknown";
  }
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
