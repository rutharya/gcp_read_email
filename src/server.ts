import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { config } from "dotenv";
import { processGmailNotification } from "./services/gmailService";

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

interface PubSubMessage {
  message: {
    data: string;
    messageId: string;
    attributes: { [key: string]: string };
  };
  subscription: string;
}

// The core webhook endpoint
app.post("/webhook/gmail-push", (req: Request, res: Response) => {
  const body = req.body as PubSubMessage;
  const timestamp = new Date().toISOString();

  console.log(`\n🔔 PUSH RECEIVED at ${timestamp}`);

  // 1. Validate Pub/Sub message format
  if (!body || !body.message || !body.message.data) {
    console.error("Invalid Pub/Sub message format");
    return res.status(400).send("Bad Request: Invalid Pub/Sub message format");
  }

  // 2. Acknowledge the message immediately to prevent retries
  //    This is CRITICAL for a reliable webhook.
  res.status(200).send("OK");

  // 3. Decode message data and process asynchronously
  try {
    const data = Buffer.from(body.message.data, "base64").toString("utf-8");
    const { emailAddress, historyId } = JSON.parse(data);

    if (!emailAddress || !historyId) {
      console.error("Missing emailAddress or historyId in message data");
      return;
    }

    console.log(
      `   - Processing notification for: ${emailAddress} | History ID: ${historyId}`
    );

    // Asynchronously process the notification.
    // Do NOT await this, as it would delay the 200 OK acknowledgment.
    processGmailNotification(historyId, emailAddress).catch(console.error);
  } catch (error) {
    console.error("Error decoding or processing Pub/Sub message:", error);
  }
});

app.listen(port, () => {
  console.log("===========================================================");
  console.log(`🚀 Server listening on port ${port}`);
  console.log("===========================================================");
});
