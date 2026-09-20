import 'dotenv/config';
import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRouter from "./routes/auth";
import llmRouter from "./routes/llm"

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ health: "zy el fol" });
});

app.use("/auth", authRouter);
app.use("/llm", llmRouter)

app.listen(PORT, () => {
  console.log(`Listening at port ${PORT}`);
});
