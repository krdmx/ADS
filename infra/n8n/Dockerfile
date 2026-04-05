FROM docker.n8n.io/n8nio/n8n:2.11.4

USER root

RUN mkdir -p /seed /home/node/.n8n/nodes \
    && npm install --omit=dev --prefix /home/node/.n8n/nodes @tavily/n8n-nodes-tavily \
    && chown -R node:node /home/node/.n8n

COPY infra/n8n/scripts/bootstrap.sh /bootstrap.sh
COPY infra/n8n/workflows/workflow.seed.json /seed/workflow.json

RUN chmod +x /bootstrap.sh && chown -R node:node /bootstrap.sh /seed

USER node

ENTRYPOINT ["/bootstrap.sh"]
