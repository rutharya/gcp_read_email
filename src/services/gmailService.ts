// src/services/gmailService.ts
import { google } from "googleapis";
import { authorize } from "../auth/googleAuth";

const SENDER_EMAIL = "ruthvik.arya91@gmail.com";
const SUBJECT_PATTERN = /remote-client access \[(\w+)\]/;
const LINK_PATTERN = /(https?:\/\/[^\s]+)/;

/**
 * Processes a Gmail push notification by fetching the new history records.
 * @param historyId The starting history ID from the notification.
 */
export async function processGmailNotification(
  historyId: string,
  emailAddress: string
) {
  try {
    const auth = await authorize();
    const gmail = google.gmail({ version: "v1", auth });

    // Get the history of changes since the last notification
    const historyResponse = await gmail.users.history.list({
      userId: emailAddress,
      startHistoryId: historyId,
      historyTypes: ["messageAdded"],
    });

    const history = historyResponse.data.history;
    if (!history || !history.length) {
      console.log("No new messages found for this notification.");
      return;
    }

    // Process each new message from the history
    for (const record of history) {
      if (!record.messagesAdded) continue;

      for (const messageAdded of record.messagesAdded) {
        if (!messageAdded.message?.id) continue;

        const messageId = messageAdded.message.id;
        const messageDetails = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });

        const headers = messageDetails.data.payload?.headers;
        if (!headers) continue;

        const fromHeader = headers.find((h) => h.name === "From")?.value || "";
        const subjectHeader =
          headers.find((h) => h.name === "Subject")?.value || "";
        const emailReceivedDate = new Date(
          parseInt(messageDetails.data.internalDate!, 10)
        );

        // 1. Filter by sender
        if (!fromHeader.includes(SENDER_EMAIL)) {
          continue;
        }

        // 2. Validate subject pattern
        const subjectMatch = subjectHeader.match(SUBJECT_PATTERN);
        if (!subjectMatch) {
          continue;
        }

        // 3. Extract data
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

        const notificationReceivedDate = new Date();
        const latency =
          (notificationReceivedDate.getTime() - emailReceivedDate.getTime()) /
          1000;

        // 4. Real-time console output
        console.log(
          "==========================================================="
        );
        console.log(`✅ MATCH FOUND & PROCESSED`);
        console.log(
          `   - Latency: ${latency.toFixed(
            3
          )} seconds (Email Delivered -> Webhook Processed)`
        );
        console.log(`   - Sender:    ${fromHeader}`);
        console.log(`   - Subject:   "${subjectHeader}"`);
        console.log(`   - Code:      ${accessCode}`);
        console.log(`   - Link:      ${extractedLink}`);
        console.log(
          "==========================================================="
        );
        console.log("\nServer is idle, waiting for PUSH notification... 💤");
      }
    }
  } catch (error) {
    console.error("Error processing Gmail notification:", error);
  }
}
