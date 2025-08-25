// src/cleanup.ts
import { google } from "googleapis";
import { PubSub } from "@google-cloud/pubsub";
import { authorize } from "./auth/googleAuth";
import { config } from "dotenv";

// Load environment variables from .env file
config();

async function cleanup() {
  console.log("🚀 Starting cleanup process...");

  // Step 1: Stop the Gmail Watch
  try {
    console.log("\nStep 1: Attempting to stop the Gmail watch...");
    const auth = await authorize();
    const gmail = google.gmail({ version: "v1", auth });

    // To stop watching, you tell the user's mailbox to stop.
    await gmail.users.stop({ userId: "me" });

    console.log("✅ Gmail watch successfully stopped.");
  } catch (error: any) {
    // It's common for this to fail if the watch has already expired or was stopped.
    if (error.code === 404) {
      console.warn(
        "⚠️  Could not stop Gmail watch: No active watch found (this is often normal)."
      );
    } else {
      console.error("❌ Error stopping Gmail watch:", error.message || error);
    }
  }

  // Step 2: Delete the Pub/Sub Subscription
  const subscriptionId = process.env.GMAIL_PUBSUB_SUBSCRIPTION_ID;
  if (!subscriptionId) {
    console.log(
      "\nStep 2: Skipped. No GMAIL_PUBSUB_SUBSCRIPTION_ID found in .env file."
    );
    console.log("\n✨ Cleanup finished.");
    return;
  }

  try {
    console.log(
      `\nStep 2: Attempting to delete Pub/Sub subscription '${subscriptionId}'...`
    );
    const pubsub = new PubSub({
      projectId: process.env.GCLOUD_PROJECT_ID,
    });

    await pubsub.subscription(subscriptionId).delete();

    console.log(
      `✅ Pub/Sub subscription '${subscriptionId}' successfully deleted.`
    );
  } catch (error: any) {
    // Code 5 is NOT_FOUND, which is okay if the subscription is already gone.
    if (error.code === 5) {
      console.warn(
        `⚠️  Could not delete subscription: Subscription '${subscriptionId}' not found (it may have already been deleted).`
      );
    } else {
      console.error(
        `❌ Error deleting Pub/Sub subscription '${subscriptionId}':`,
        error.message || error
      );
    }
  }

  console.log("\n✨ Cleanup finished.");
}

cleanup();
