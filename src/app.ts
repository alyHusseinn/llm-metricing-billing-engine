import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRouter from "./routes/auth";
import llmRouter from "./routes/llm";
import subscripeRouter from "./routes/subscripe";
import webhookRouter from "./routes/webhook";
import usageRouter from "./routes/usage";

const app = express();

app.use("/webhook", webhookRouter);

app.use(morgan('dev'));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ health: "zy el fol" });
});

app.use("/auth", authRouter);
app.use("/llm", llmRouter);
app.use("/subscription", subscripeRouter);
app.use("/usage", usageRouter)

export default app;

