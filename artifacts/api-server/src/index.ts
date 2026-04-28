import "dotenv/config";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type Request } from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import widgetsRouter from "./routes/widgets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(authRouter);
app.use(widgetsRouter);

// ── Serve the built dashboard ──────────────────────────────────────────────
// In production (after `pnpm --filter @warmly/api-server run build`) the
// dashboard's static bundle lives in artifacts/api-server/public. Serving
// from one origin avoids any CORS configuration on Replit.
//
// In API-only dev mode (no build run) public/ doesn't exist; both blocks
// below skip cleanly and the Vite dev server on :5173 stays the dashboard
// surface for local work.
const publicDir = path.resolve(__dirname, "..", "public");
const indexHtml = path.join(publicDir, "index.html");

// Top-level paths reserved for the API. Anything outside this list falls
// through to the SPA so React Router can handle the route client-side.
// Add new top-level API prefixes here when they appear.
function isApiPath(reqPath: Request["path"]): boolean {
  return (
    reqPath === "/health" ||
    reqPath === "/auth" ||
    reqPath.startsWith("/auth/") ||
    reqPath === "/widgets" ||
    reqPath.startsWith("/widgets/")
  );
}

if (existsSync(indexHtml)) {
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (isApiPath(req.path)) return next();
    res.sendFile(indexHtml);
  });
}

const port = Number(process.env["PORT"] ?? 3000);
app.listen(port, () => {
  console.log(`warmly api-server listening on :${port}`);
  if (existsSync(indexHtml)) {
    console.log(`  serving dashboard from ${publicDir}`);
  } else {
    console.log(`  dashboard not built; API-only mode`);
  }
});
