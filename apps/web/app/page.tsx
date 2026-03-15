import { StatusCard } from "@/components/status-card";

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://api.localhost";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Self-hosted stack</p>
          <h1>Frontend, backend and automation in one monorepo.</h1>
          <p className="lede">
            This workspace bundles Next.js, Nest.js, PostgreSQL, n8n and
            Caddy into one reproducible Docker-driven setup.
          </p>
        </div>
        <div className="hero-grid">
          <div className="pill">app.localhost</div>
          <div className="pill">api.localhost</div>
          <div className="pill">n8n.localhost</div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-title">API handshake</p>
            <h2>Frontend status check</h2>
          </div>
          <code>{publicApiUrl}</code>
        </div>
        <StatusCard />
      </section>
    </main>
  );
}
