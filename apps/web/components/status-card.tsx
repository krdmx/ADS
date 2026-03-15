"use client";

import type { ApiStatusResponse } from "@repo/contracts";
import { useEffect, useState } from "react";

type StatusState =
  | { kind: "loading" }
  | { kind: "success"; payload: ApiStatusResponse }
  | { kind: "error"; message: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://api.localhost";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export function StatusCard() {
  const [state, setState] = useState<StatusState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const response = await fetch(`${apiUrl}/api/v1/status`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Status request failed with HTTP ${response.status}`);
        }

        const payload = (await response.json()) as ApiStatusResponse;

        if (active) {
          setState({ kind: "success", payload });
        }
      } catch (error) {
        if (active) {
          setState({ kind: "error", message: getErrorMessage(error) });
        }
      }
    }

    void loadStatus();

    return () => {
      active = false;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="status-card status-card-loading">
        <p className="status-label">Connecting</p>
        <h3>Waiting for the backend status endpoint...</h3>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="status-card status-card-error">
        <p className="status-label">Unavailable</p>
        <h3>Backend is not reachable from the browser.</h3>
        <p>{state.message}</p>
      </div>
    );
  }

  const { payload } = state;

  return (
    <div className="status-card">
      <div className="status-row">
        <div>
          <p className="status-label">Service</p>
          <h3>{payload.service}</h3>
        </div>
        <span
          className={`badge ${
            payload.status === "ok" ? "badge-ok" : "badge-degraded"
          }`}
        >
          {payload.status}
        </span>
      </div>
      <dl className="status-grid">
        <div>
          <dt>Environment</dt>
          <dd>{payload.environment}</dd>
        </div>
        <div>
          <dt>Database</dt>
          <dd>{payload.database}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{payload.version}</dd>
        </div>
        <div>
          <dt>Timestamp</dt>
          <dd>{new Date(payload.timestamp).toLocaleString()}</dd>
        </div>
      </dl>
    </div>
  );
}
