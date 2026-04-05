#!/bin/sh
set -eu

N8N_DATA_DIR="${N8N_USER_FOLDER:-/home/node/.n8n}"
WORKFLOW_MARKER_FILE="$N8N_DATA_DIR/.project-seed-imported.sha256"
CREDS_MARKER_FILE="$N8N_DATA_DIR/.project-credentials-imported.sha256"
WORKFLOW_FILE="/seed/workflow.json"
RENDERED_WORKFLOW_FILE="/tmp/n8n-rendered-workflow.json"
CREDENTIALS_FILE="/tmp/n8n-generated-credentials.json"
LOCAL_CALLBACK_SECRET="change-me-backend-secret"

mkdir -p "$N8N_DATA_DIR"

file_hash() {
  sha256sum "$1" | awk '{ print $1 }'
}

import_if_changed() {
  target_file="$1"
  marker_file="$2"
  import_cmd="$3"

  current_hash="$(file_hash "$target_file")"
  previous_hash=""

  if [ -f "$marker_file" ]; then
    previous_hash="$(cat "$marker_file")"
  fi

  if [ "$current_hash" != "$previous_hash" ]; then
    echo "Importing $(basename "$target_file") into n8n..."
    sh -c "$import_cmd"
    printf '%s' "$current_hash" > "$marker_file"
  fi
}

render_workflow_file() {
  WORKFLOW_FILE_PATH="$WORKFLOW_FILE" \
  RENDERED_WORKFLOW_FILE_PATH="$RENDERED_WORKFLOW_FILE" \
  LOCAL_CALLBACK_SECRET_VALUE="$LOCAL_CALLBACK_SECRET" \
  node <<'EOF_NODE'
const fs = require('fs');

const sourcePath = process.env.WORKFLOW_FILE_PATH;
const targetPath = process.env.RENDERED_WORKFLOW_FILE_PATH;
const localCallbackSecret = process.env.LOCAL_CALLBACK_SECRET_VALUE;

const workflow = fs.readFileSync(sourcePath, 'utf8');

fs.writeFileSync(
  targetPath,
  workflow.replace(/__BACKEND_APP_SECRET__/g, localCallbackSecret),
);
EOF_NODE
}

if [ "${N8N_IMPORT_CREDENTIALS:-true}" = "true" ]; then
  node <<'EOF_NODE'
const fs = require('fs');

const credentials = [];

if (process.env.GOOGLE_GEMINI_API_KEY) {
  credentials.push({
    id: 'Mj9DKEcV4Is3LYzI',
    name: 'Google Gemini(PaLM) Api account',
    type: 'googlePalmApi',
    data: {
      host: 'https://generativelanguage.googleapis.com',
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
    },
  });
}

if (process.env.TAVILY_API_KEY) {
  credentials.push({
    id: 'JXz9tUX9GQioJBtH',
    name: 'Tavily account',
    type: 'tavilyApi',
    data: {
      apiKey: process.env.TAVILY_API_KEY,
    },
  });
}

if (credentials.length > 0) {
  fs.writeFileSync(
    '/tmp/n8n-generated-credentials.json',
    JSON.stringify(credentials, null, 2)
  );
}
EOF_NODE

  if [ -f "$CREDENTIALS_FILE" ]; then
    import_if_changed \
      "$CREDENTIALS_FILE" \
      "$CREDS_MARKER_FILE" \
      "n8n import:credentials --input=\"$CREDENTIALS_FILE\""
  fi
fi

if [ "${N8N_IMPORT_SEED:-true}" = "true" ] && [ -f "$WORKFLOW_FILE" ]; then
  render_workflow_file

  import_if_changed \
    "$RENDERED_WORKFLOW_FILE" \
    "$WORKFLOW_MARKER_FILE" \
    "n8n import:workflow --input=\"$RENDERED_WORKFLOW_FILE\""

  seed_workflow_id="$(
    RENDERED_WORKFLOW_FILE_PATH="$RENDERED_WORKFLOW_FILE" node <<'EOF_NODE'
const fs = require('fs');

const workflow = JSON.parse(
  fs.readFileSync(process.env.RENDERED_WORKFLOW_FILE_PATH, 'utf8')
);

process.stdout.write(typeof workflow.id === 'string' ? workflow.id : '');
EOF_NODE
  )"

  if [ -n "$seed_workflow_id" ]; then
    echo "Publishing seed workflow $seed_workflow_id..."
    n8n unpublish:workflow --all >/dev/null 2>&1 || true

    if ! n8n publish:workflow --id="$seed_workflow_id" >/dev/null 2>&1; then
      echo "Unable to publish seed workflow $seed_workflow_id automatically."
    fi
  fi
fi

exec n8n start
