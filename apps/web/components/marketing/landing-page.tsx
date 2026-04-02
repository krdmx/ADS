import { LandingPageCtaSection } from "./landing-page/cta-section";
import { LandingPageFeaturesSection } from "./landing-page/features-section";
import { LandingPageFooter } from "./landing-page/footer";
import { LandingPageHeader } from "./landing-page/header";
import { LandingPageHeroSection } from "./landing-page/hero-section";
import { LandingPageValueStripSection } from "./landing-page/value-strip-section";
import { LandingPageWorkflowSection } from "./landing-page/workflow-section";
import styles from "./landing-page.module.css";

export function MarketingLandingPage() {
  return (
    <main className={styles.pageShell}>
      <div className={styles.canvas}>
        <LandingPageHeader />
        <LandingPageHeroSection />
        <LandingPageValueStripSection />
        <LandingPageWorkflowSection />
        <LandingPageFeaturesSection />
        <LandingPageCtaSection />
        <LandingPageFooter />
      </div>
    </main>
  );
}
