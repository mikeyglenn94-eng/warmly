import "dotenv/config";
import express from "express";
import { WidgetConfigSchema } from "@warmly/api-spec";
import { schema } from "@warmly/db";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = Number(process.env["PORT"] ?? 3000);
app.listen(port, () => {
  // Workspace wiring sanity print: confirms shared libs resolve at runtime.
  console.log(`warmly api-server listening on :${port}`);
  console.log(
    `  workspace ok — db tables: [${Object.keys(schema).join(", ")}], api-spec: ${WidgetConfigSchema.constructor.name}`,
  );
});
