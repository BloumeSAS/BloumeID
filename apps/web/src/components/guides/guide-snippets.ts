export interface SnippetGroup {
  tsNext: string;
  nodeExpress: string;
  htmlCdn: string;
  curl: string;
}

export const INSTALL_SNIPPETS: SnippetGroup = {
  tsNext: `// Install in your app workspace
// pnpm add @bloume/id   (or npm install @bloume/id)

import { BloumeID } from "@bloume/id";

export async function identifySession() {
  const client = await BloumeID.load({
    apiKey: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_KEY!, // bid_pub_...
    endpoint: "https://id.bloume.fr",
  });

  const result = await client.get({ tag: "checkout_gate" });
  return result.requestId; // Send ONLY requestId to your backend
}`,
  nodeExpress: `// Install SDK on backend for Zero-Trust verification
// npm install @bloume/id

import { BloumeIDServer } from "@bloume/id/server";

export const bloumeServer = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!, // bid_sec_...
  endpoint: "https://id.bloume.fr",
});`,
  htmlCdn: `<!-- Self-hosted UMD script served directly by your BloumeID instance -->
<script src="https://id.bloume.fr/sdk/v1/bloumeid.js" defer></script>
<script>
  window.addEventListener("DOMContentLoaded", async () => {
    const client = await window.BloumeID.load({
      apiKey: "bid_pub_your_site_key",
      endpoint: "https://id.bloume.fr",
    });
    const { requestId } = await client.get({ tag: "signup_page" });
    document.getElementById("bloume-req-id").value = requestId;
  });
</script>`,
  curl: `# Verify UMD bundle availability on your BloumeID instance
curl -fsSI https://id.bloume.fr/sdk/v1/bloumeid.js

# Public health probe (no auth required)
curl -fsS https://id.bloume.fr/api/health`,
};

export const THUMBMARK_SNIPPETS: SnippetGroup = {
  tsNext: `import { BloumeID } from "@bloume/id";

const client = await BloumeID.load({
  apiKey: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_KEY,
  endpoint: "https://id.bloume.fr",
  options: { exclude: ["audio"], timeout: 2500 },
});

// 1. Drop-in deterministic hash (compatible with @thumbmarkjs/thumbmarkjs)
const hash = await client.getFingerprint();

// 2. Full telemetry + server requestId & visitorId
const result = await client.get({ tag: "thumbmark_mode" });
console.log(result.thumbmark, result.requestId, result.visitorId);`,
  nodeExpress: `import { BloumeIDServer } from "@bloume/id/server";

const bloume = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!,
  endpoint: "https://id.bloume.fr",
});

// Verify the requestId produced by client.get()
const verification = await bloume.verifyRequest(req.body.requestId);`,
  htmlCdn: `<script src="https://id.bloume.fr/sdk/v1/bloumeid.js"></script>
<script>
  (async () => {
    const client = await window.BloumeID.load({
      apiKey: "bid_pub_your_site_key",
      endpoint: "https://id.bloume.fr",
      options: { exclude: ["fonts"] },
    });
    const res = await client.get();
    console.log("Thumbmark:", res.thumbmark, "Req:", res.requestId);
  })();
</script>`,
  curl: `# ThumbmarkJS drop-in collects browser signals client-side and posts to /api/v1/fingerprint
curl -X POST https://id.bloume.fr/api/v1/fingerprint \\
  -H "Content-Type: application/json" \\
  -H "X-BloumeID-Key: bid_pub_your_site_key" \\
  -H "Origin: https://app.example.com" \\
  -d '{"apiKey":"bid_pub_your_site_key","tag":"thumbmark_mode","components":{}}'`,
};

export const FP_PRO_SNIPPETS: SnippetGroup = {
  tsNext: `import BloumeID from "@bloume/id";

const fpPromise = BloumeID.load({
  apiKey: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_KEY!, // bid_pub_...
  endpoint: "https://id.bloume.fr",
});

export async function runIdentification(userId?: string) {
  const fp = await fpPromise;
  const result = await fp.get({
    linkedId: userId,
    tag: "login_attempt",
    extendedResult: true,
  });

  // Never trust visitorId from the browser: pass result.requestId to backend
  return result.requestId;
}`,
  nodeExpress: `// Backend route receiving requestId from Fingerprint.com Pro drop-in mode
app.post("/api/auth/login", async (req, res) => {
  const { requestId } = req.body;
  const event = await bloumeServer.verifyRequest(requestId);
  if (event.action === "block" || event.flags.isBot) {
    return res.status(403).json({ error: "Automated request blocked" });
  }
  return res.json({ ok: true, visitorId: event.visitorId });
});`,
  htmlCdn: `<script src="https://id.bloume.fr/sdk/v1/bloumeid.js"></script>
<script>
  window.BloumeID.load({
    apiKey: "bid_pub_your_site_key",
    endpoint: "https://id.bloume.fr"
  })
  .then((fp) => fp.get({ linkedId: "acct_123", tag: "checkout" }))
  .then((res) => console.log("requestId:", res.requestId));
</script>`,
  curl: `# Retrieve verified server telemetry for a Fingerprint-compatible event
curl -fsS https://id.bloume.fr/api/v1/events/req_01JXYZ... \\
  -H "Authorization: Bearer bid_sec_your_secret_key"`,
};

export const SERVER_VERIFY_SNIPPETS: SnippetGroup = {
  tsNext: `// app/api/checkout/route.ts (Next.js App Router - Server Only)
import { NextResponse } from "next/server";
import { BloumeIDServer } from "@bloume/id/server";

const bloume = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!, // bid_sec_...
  endpoint: process.env.BLOUMEID_ENDPOINT || "https://id.bloume.fr",
  timeoutMs: 2500,
});

export async function POST(req: Request) {
  const { requestId } = (await req.json()) as { requestId: string };

  const verified = await bloume.verifyRequest(requestId);
  if (verified.action === "block" || verified.flags.isSpoofed) {
    return NextResponse.json({ error: "Security policy denied" }, { status: 403 });
  }

  // Optional: query full cross-browser visitor history
  const profile = await bloume.getVisitor(verified.visitorId);
  return NextResponse.json({ visitorId: profile.visitorId, dangerLevel: verified.dangerLevel });
}`,
  nodeExpress: `import express from "express";
import { BloumeIDServer } from "@bloume/id/server";

const app = express();
app.use(express.json());

const bloume = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!,
  endpoint: "https://id.bloume.fr",
  timeoutMs: 2500,
});

app.post("/api/checkout", async (req, res) => {
  const verified = await bloume.verifyRequest(String(req.body.requestId || ""));
  if (verified.action === "block") {
    return res.status(403).json({ error: "Blocked by BloumeID rule engine" });
  }
  return res.json({ visitorId: verified.visitorId, flags: verified.flags });
});`,
  htmlCdn: `// IMPORTANT: Never embed bid_sec_ keys in HTML or browser JavaScript!
// Send ONLY the opaque requestId from the browser to your own backend:
await fetch("/api/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ requestId }),
});`,
  curl: `# Server-to-Server request verification with secret key (bid_sec_)
curl -fsS https://id.bloume.fr/api/v1/events/req_01JXYZ... \\
  -H "Authorization: Bearer bid_sec_your_secret_key"

# Inspect cross-browser visitor profile server-to-server
curl -fsS https://id.bloume.fr/api/v1/visitors/vis_01JXYZ... \\
  -H "Authorization: Bearer bid_sec_your_secret_key"`,
};

export const WEBHOOK_HMAC_SNIPPETS: SnippetGroup = {
  tsNext: `// app/api/webhooks/bloumeid/route.ts
import crypto from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-bloumeid-signature") ?? "";
  const secret = process.env.BLOUMEID_WEBHOOK_SECRET ?? "";

  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  console.log("Verified BloumeID webhook:", event.requestId, event.ruleAction);
  return NextResponse.json({ received: true });
}`,
  nodeExpress: `import crypto from "node:crypto";
import express from "express";

// Use express.raw() on webhook route so HMAC uses exact raw request bytes
app.post("/api/webhooks/bloumeid", express.raw({ type: "application/json" }), (req, res) => {
  const signature = String(req.headers["x-bloumeid-signature"] || "");
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", process.env.BLOUMEID_WEBHOOK_SECRET!).update(req.body).digest("hex");

  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).send("Invalid signature");
  }
  const payload = JSON.parse(req.body.toString("utf8"));
  return res.status(200).json({ ok: true, requestId: payload.requestId });
});`,
  htmlCdn: `// Webhooks are server-to-server HTTP POST requests dispatched by BloumeID.
// Header format sent by BloumeID:
//   X-BloumeID-Signature: sha256=<64-char lowercase HMAC-SHA256 hex digest>`,
  curl: `# Simulate signed webhook delivery against your local receiver
PAYLOAD='{"event":"rule.triggered","requestId":"req_test","ruleAction":"BLOCK"}'
SIG="sha256=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$BLOUMEID_WEBHOOK_SECRET" -hex | awk '{print $NF}')"

curl -X POST http://localhost:3000/api/webhooks/bloumeid \\
  -H "Content-Type: application/json" \\
  -H "X-BloumeID-Signature: $SIG" \\
  -d "$PAYLOAD"`,
};

export const FAILSAFE_SNIPPETS: SnippetGroup = {
  tsNext: `import { BloumeID } from "@bloume/id";

export async function safeGetRequestId(): Promise<string | null> {
  try {
    const client = await BloumeID.load({
      apiKey: process.env.NEXT_PUBLIC_BLOUMEID_PUBLIC_KEY!,
      endpoint: "https://id.bloume.fr",
      options: { timeout: 2500 },
    });
    const res = await client.get({ tag: "safe_login" });
    return res.requestId;
  } catch (err) {
    // Graceful degradation if client ad-blocker or transient 503 occurs
    console.warn("[BloumeID] Fallback triggered:", err);
    return null;
  }
}`,
  nodeExpress: `export async function verifyOrStepUp(bloume: BloumeIDServer, requestId: string | null) {
  if (!requestId) return { status: "step_up_challenge" as const };
  try {
    const res = await bloume.verifyRequest(requestId);
    return { status: res.action ?? "allow", visitorId: res.visitorId };
  } catch {
    // Never deadlock checkout during temporary upstream latency
    return { status: "step_up_challenge" as const };
  }
}`,
  htmlCdn: `<script>
  async function submitFormSafely(form) {
    let requestId = "";
    try {
      const fp = await window.BloumeID.load({
        apiKey: "bid_pub_key",
        options: { timeout: 2500 },
      });
      requestId = (await fp.get()).requestId;
    } catch (_) {
      requestId = ""; // Fail-open / server step-up fallback
    }
    form.elements.requestId.value = requestId;
    form.submit();
  }
</script>`,
  curl: `# Test timeout-bounded verification request
curl --max-time 2.5 -fsS https://id.bloume.fr/api/v1/events/req_01JXYZ... \\
  -H "Authorization: Bearer bid_sec_your_secret_key"`,
};
