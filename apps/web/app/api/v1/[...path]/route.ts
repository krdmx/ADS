import { buildApiUrl } from "@/lib/api-config";
import { getErrorMessage } from "@/lib/api-response";
import { createApiClient } from "@/lib/axios-client";
import { lookupWithLocalhostFallback } from "@/lib/localhost-lookup";

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);
const backendProxyApi = createApiClient({
  adapter: "http",
  baseURL: buildApiUrl("/api/v1"),
  lookup: lookupWithLocalhostFallback,
  noStoreGetRequests: true,
});

async function proxyRequest(
  request: Request,
  pathSegments: string[]
): Promise<Response> {
  const pathname = `/${pathSegments.join("/")}`;
  const requestUrl = new URL(request.url);

  if (pathname.startsWith("/internal/")) {
    return new Response("Not Found", {
      status: 404,
    });
  }

  const proxiedHeaders = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  if (contentType) {
    proxiedHeaders.set("content-type", contentType);
  }

  if (accept) {
    proxiedHeaders.set("accept", accept);
  }

  try {
    const backendResponse = await backendProxyApi.request({
      url: `${pathname}${requestUrl.search}`,
      method: request.method,
      headers: Object.fromEntries(proxiedHeaders.entries()),
      data: BODYLESS_METHODS.has(request.method)
        ? undefined
        : Buffer.from(await request.arrayBuffer()),
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    const responseHeaders = new Headers();

    for (const headerName of ["content-type", "content-disposition"]) {
      const headerValue = backendResponse.headers[headerName];

      if (typeof headerValue === "string" && headerValue) {
        responseHeaders.set(headerName, headerValue);
      }
    }

    const responseBody =
      request.method === "HEAD" ||
      backendResponse.status === 204 ||
      backendResponse.status === 304
        ? null
        : backendResponse.data;

    return new Response(responseBody, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json(
      {
        message: getErrorMessage(error),
      },
      {
        status: 503,
      }
    );
  }
}

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
