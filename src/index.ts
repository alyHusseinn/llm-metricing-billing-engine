import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import express from "express"
import cookieParser from "cookie-parser"
import morgan from "morgan"

const db = drizzle(process.env.DATABASE_URL!);

const app = express();
const PORT = 3000;


app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (req, res) => {
    res.json({"health": "zy el fol"})
})

app.listen(PORT, () => {
    console.log("Listening at port 3000")
})

