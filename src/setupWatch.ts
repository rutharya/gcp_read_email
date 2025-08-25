// src/setupWatch.ts
import { google } from "googleapis";
import { authorize } from "./auth/googleAuth";
import { config } from "dotenv";

// Load environment variables from .env file
config();

async function setupGmailWatch() {
  try {
    console.log("Attempting to authorize...");
    const auth = await authorize();
    console.log("Authorization successful.");

    const gmail = google.gmail({ version: "v1", auth });

    const projectId = process.env.GCLOUD_PROJECT_ID;
    const topicName = process.env.GMAIL_PUBSUB_TOPIC_ID;

    if (!projectId || !topicName) {
      throw new Error(
        "GCLOUD_PROJECT_ID and GMAIL_PUBSUB_TOPIC_ID must be set in .env file."
      );
    }

    const fullTopicName = `projects/${projectId}/topics/${topicName}`;

    console.log(`Setting up watch on topic: ${fullTopicName}`);

    const request = {
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        topicName: fullTopicName,
      },
    };

    const response = await gmail.users.watch(request);

    console.log("✅ Gmail watch setup successfully!");
    console.log("---------------------------------");
    console.log("Response:", response.data);
    const expiryDate = new Date(parseInt(response.data.expiration!, 10));
    console.log(`\nIMPORTANT: This watch is set to expire in 7 days.`);
    console.log(`Expiration Date: ${expiryDate.toUTCString()}`);
    console.log(
      "You will need to re-run this script or set up a cron job to renew it before it expires."
    );
  } catch (error: any) {
    console.error("Error setting up Gmail watch:", error.message || error);
  }
}

setupGmailWatch();
