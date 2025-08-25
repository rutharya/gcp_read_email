// src/services/gmailService.ts

import { google } from "googleapis";
import { authorize } from "../auth/googleAuth";

// const SENDER_EMAIL = "ruthvik.arya91@gmail.com";
const SENDER_EMAIL = "remotex.advisor1@gmail.com";
const SUBJECT_PATTERN = /Invitation to NUCLeUS Live session*/;
const LINK_PATTERN = /(https?:\/\/[^\s]+)/;

/**
 * A simple in-memory cache to store the IDs of messages that have already been processed.
 * For a scalable production app, you would replace this with a persistent store like Redis or a database.
 */
const processedMessageIds = new Set<string>();

/**
 * Processes a Gmail push notification by fetching the latest messages directly
 * and checking them against a list of already-processed messages.
 * @param emailAddress The user's email address.
 */
export async function processGmailNotification(emailAddress: string) {
  try {
    const auth = await authorize();
    const gmail = google.gmail({ version: "v1", auth });

    // Fetch the 5 most recent messages.
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 5,
    });

    const messages = listResponse.data.messages;
    if (!messages || messages.length === 0) {
      console.log("No messages found in the inbox.");
      return;
    }

    // Process messages in reverse order (oldest of the batch first)
    for (const message of messages.reverse()) {
      if (!message.id || processedMessageIds.has(message.id)) {
        // Skip if message has no ID or has already been processed.
        continue;
      }

      // Mark this message as processed immediately to prevent race conditions.
      processedMessageIds.add(message.id);

      // Fetch the full message details.
      const messageDetails = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
      });
      const headers = messageDetails.data.payload?.headers;
      if (!headers) continue;

      const fromHeader = headers.find((h) => h.name === "From")?.value || "";
      const subjectHeader =
        headers.find((h) => h.name === "Subject")?.value || "";

      // Check if the message matches our filters.
      if (!fromHeader.includes(SENDER_EMAIL)) continue;
      const subjectMatch = subjectHeader.match(SUBJECT_PATTERN);
      if (!subjectMatch) continue;

      // If we get here, it's a valid, new, matching message.
      console.log(
        "==========================================================="
      );
      console.log(`✅ NEW MATCH FOUND & PROCESSED (ID: ${message.id})`);

      const accessCode = subjectMatch[1];
      let bodyData = "";
      if (messageDetails.data.payload?.parts) {
        const textPart = messageDetails.data.payload.parts.find(
          (p) => p.mimeType === "text/plain"
        );
        if (textPart && textPart.body?.data) {
          bodyData = Buffer.from(textPart.body.data, "base64url").toString(
            "utf8"
          );
        }
      } else if (messageDetails.data.payload?.body?.data) {
        bodyData = Buffer.from(
          messageDetails.data.payload.body.data,
          "base64url"
        ).toString("utf8");
      }

      const linkMatch = bodyData.match(LINK_PATTERN);
      const extractedLink = linkMatch ? linkMatch[0] : "No link found";

      console.log(`   - Sender:    ${fromHeader}`);
      console.log(`   - Subject:   "${subjectHeader}"`);
      console.log(`   - Code:      ${accessCode}`);
      console.log(`   - Link:      ${extractedLink}`);
      console.log(
        "==========================================================="
      );
    }
  } catch (error) {
    console.error("Error processing Gmail notification:", error);
  }
}
