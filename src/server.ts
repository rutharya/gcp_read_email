import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { config } from "dotenv";

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Gmail Push Webhook Server is running.");
});

app.listen(port, () => {
  console.log("===========================================================");
  console.log(`🚀 Server listening on port ${port}`);
  console.log("===========================================================");
});
