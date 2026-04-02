import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { appUrl } from "@/lib/app-urls";
import styles from "./page.module.css";
import { GoogleSignInButton } from "./google-sign-in-button";

type SignInPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getServerSession(authOptions);
  const { callbackUrl } = await searchParams;
  const normalizedCallbackUrl =
    typeof callbackUrl === "string" && callbackUrl.trim()
      ? callbackUrl
      : `${appUrl}/`;

  if (session?.user?.id) {
    redirect(normalizedCallbackUrl);
  }

  return (
    <main className={styles.pageShell}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Fitev Access</p>
        <h1 className={styles.title}>Sign in to open your workspace.</h1>
        <p className={styles.lede}>
          Use your Google account to access the app, track your monthly quota,
          and manage your subscription.
        </p>

        <div className={styles.form}>
          <GoogleSignInButton callbackUrl={normalizedCallbackUrl} />
        </div>
      </section>
    </main>
  );
}
