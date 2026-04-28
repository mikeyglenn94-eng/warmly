import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import widgetsRouter from "./routes/widgets";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(authRouter);
app.use(widgetsRouter);

const port = Number(process.env["PORT"] ?? 3000);
app.listen(port, () => {
  console.log(`warmly api-server listening on :${port}`);
});
