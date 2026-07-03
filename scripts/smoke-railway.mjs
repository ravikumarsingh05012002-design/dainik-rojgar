const defaultApiUrl = "https://dainik-rojgar-production.up.railway.app/api";

function normalizeApiBase(url) {
  return url.replace(/\/+$/, "");
}

function deriveHealthUrl() {
  const explicit = process.env.RAILWAY_HEALTH_URL;
  if (explicit && explicit.trim()) {
    return explicit.trim();
  }

  const apiBase = normalizeApiBase(process.env.RAILWAY_API_URL || defaultApiUrl);
  if (apiBase.endsWith("/api")) {
    return `${apiBase}/health`;
  }
  return `${apiBase}/api/health`;
}

async function run() {
  const healthUrl = deriveHealthUrl();
  const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 15000);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`Running Railway smoke test: ${healthUrl}`);

    const response = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      console.error(`Smoke test failed with status ${response.status}`);
      console.error("Response:", payload);
      process.exit(1);
    }

    if (!isJson || typeof payload !== "object" || payload === null) {
      console.error("Smoke test failed: expected JSON health response");
      console.error("Response:", payload);
      process.exit(1);
    }

    console.log("Smoke test passed.");
    console.log("Status:", response.status);
    console.log("Health payload:", payload);
  } catch (error) {
    console.error("Smoke test error:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

run();
