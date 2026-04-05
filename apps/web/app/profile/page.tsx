import type {
  GetBaseCvResponse,
  GetFullNameResponse,
  GetWorkTasksResponse,
} from "@repo/contracts";
import { connection } from "next/server";

import { ProfileEditor } from "@/components/profile-editor";
import { SiteHeader } from "@/components/site-header";
import { getErrorMessage } from "@/lib/api-response";
import { getAuthenticatedServerApi } from "@/lib/server-api";
import styles from "./page.module.css";

export default async function ProfilePage() {
  await connection();
  const api = await getAuthenticatedServerApi();

  const [fullNameResult, baseCvResult, workTasksResult] =
    await Promise.allSettled([
      api.get<GetFullNameResponse>("/api/v1/applications/fullName"),
      api.get<GetBaseCvResponse>("/api/v1/applications/baseCv"),
      api.get<GetWorkTasksResponse>("/api/v1/applications/workTasks"),
    ]);
  const fullNamePayload =
    fullNameResult.status === "fulfilled" ? fullNameResult.value.data : null;
  const fullNameErrorMessage =
    fullNameResult.status === "rejected"
      ? getErrorMessage(fullNameResult.reason)
      : null;
  const baseCvPayload =
    baseCvResult.status === "fulfilled" ? baseCvResult.value.data : null;
  const baseCvErrorMessage =
    baseCvResult.status === "rejected"
      ? getErrorMessage(baseCvResult.reason)
      : null;
  const workTasksPayload =
    workTasksResult.status === "fulfilled" ? workTasksResult.value.data : null;
  const workTasksErrorMessage =
    workTasksResult.status === "rejected"
      ? getErrorMessage(workTasksResult.reason)
      : null;

  return (
    <main className={styles.pageShell}>
      <SiteHeader />

      <section className={styles.introPanel}>
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>Profile Editor</p>
          <h1 className={styles.title}>
            Manage the source context used to generate each ticket.
          </h1>
        </div>
      </section>

      <section className={styles.listPanel}>
        <ProfileEditor
          initialFullName={fullNamePayload?.fullName}
          initialFullNameErrorMessage={fullNameErrorMessage}
          initialBaseCv={baseCvPayload?.baseCv}
          initialBaseCvErrorMessage={baseCvErrorMessage}
          initialWorkTasks={workTasksPayload?.workTasks}
          initialWorkTasksErrorMessage={workTasksErrorMessage}
        />
      </section>
    </main>
  );
}
