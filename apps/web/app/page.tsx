import type { GetAccountResponse, GetApplicationsResponse } from "@repo/contracts";
import { headers } from "next/headers";
import { connection } from "next/server";

import { ApplicationForm } from "@/components/application-form";
import { HomeInsights } from "@/components/home-insights";
import { MarketingLandingPage } from "@/components/marketing/landing-page";
import { SiteHeader } from "@/components/site-header";
import { isAppHost } from "@/lib/app-urls";
import { getErrorMessage } from "@/lib/api-response";
import { getAuthenticatedServerApi } from "@/lib/server-api";
import { getWebFeatures } from "@/lib/web-features";
import styles from "./page.module.css";

export default async function HomePage() {
  await connection();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const { mockPipelineEnabled } = getWebFeatures();

  if (!isAppHost(host)) {
    return <MarketingLandingPage />;
  }

  let applicationsPayload: GetApplicationsResponse | null = null;
  let applicationsErrorMessage: string | null = null;
  let accountPayload: GetAccountResponse | null = null;

  try {
    const api = await getAuthenticatedServerApi();
    const [applicationsResponse, accountResponse] = await Promise.all([
      api.get<GetApplicationsResponse>("/api/v1/applications"),
      api.get<GetAccountResponse>("/api/v1/account"),
    ]);

    applicationsPayload = applicationsResponse.data;
    accountPayload = accountResponse.data;
  } catch (error) {
    applicationsErrorMessage = getErrorMessage(error);
  }

  return (
    <main className={styles.pageShell}>
      <SiteHeader />

      <section className={styles.dashboardGrid}>
        <section className={styles.heroPanel}>
          <ApplicationForm
            initialAccount={accountPayload ?? undefined}
            isMockPipelineEnabled={mockPipelineEnabled}
          />
        </section>

        <HomeInsights
          payload={applicationsPayload}
          errorMessage={applicationsErrorMessage}
        />
      </section>
    </main>
  );
}
