# Real-Time Gmail Push Notification Webhook

This is a real-time, PUSH-based webhook server built with Node.js, TypeScript, and Google Cloud. It provides an immediate, event-driven way to process incoming emails, solving the inherent inefficiencies and timeout issues of traditional IMAP polling.

## The Problem: The Inefficiency of Polling

Automating actions based on incoming emails often relies on IMAP polling. This traditional method involves a server repeatedly connecting to a Gmail account and asking, "Is there anything new?" every few seconds. This approach has significant drawbacks:

- **High Latency:** Actions are delayed by the polling interval.
- **Resource Intensive:** Constant connections consume unnecessary server and network resources.
- **Fragile:** Long-lived IMAP `IDLE` connections are prone to network drops and server timeouts, making them unreliable for long-running services.

## Proof of Concept: True PUSH vs. Polling

- **Server is Idle:** When you run `npm run dev`, the server starts and then does nothing. It consumes negligible CPU resources because it's not in a loop, not holding connections, and not polling.
- **Instant Notification:** The moment an email matching the criteria arrives in your Gmail, Google Cloud Pub/Sub pushes a message to this server's webhook endpoint. You will see the "🔔 PUSH RECEIVED" log appear almost instantly.
- **Measured Latency:** The console output calculates and displays the latency between the email's arrival at Google's servers (`internalDate`) and the moment the webhook processes it. This is typically only a few seconds.
- **No IMAP Timeouts:** Since there are no persistent connections to maintain, this architecture is immune to network drops or IMAP server timeouts that plague long-running polling scripts.

---

## The Solution: A True PUSH Architecture

This project implements a modern, event-driven architecture. Instead of pulling for data, the server remains completely idle until Google **pushes** a notification that a new email has arrived.

The flow is simple and highly efficient:
**Gmail → Google Cloud Pub/Sub → Express Webhook Server**

This model is exceptionally low-latency, scalable, and resilient, as the server only expends resources when there is actual work to be done.

---

## Key Features

- **Express Webhook Server:** A lightweight server with a dedicated endpoint to receive push notifications.
- **Google Pub/Sub Integration:** Properly acknowledges and processes messages from a Pub/Sub topic.
- **Real-Time Processing:** Decodes and acts on email data the moment it's received.
- **Gmail API Integration:** Uses the Gmail API with OAuth2 to securely fetch full email details.
- **Robust Filtering:** Filters incoming emails by sender and uses regex to validate and parse subject lines.
- **Data Extraction:** Extracts specific data points (like access codes and links) from the email subject and body.
- **Full Setup & Teardown:** Includes scripts to both initialize the Gmail `watch` and to clean up the watch and Pub/Sub subscription.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Language:** TypeScript
- **Google Cloud Platform:**
  - Gmail API
  - Google Cloud Pub/Sub
  - Google OAuth 2.0
- **Tooling:** `ts-node-dev` for live reloading, `ngrok` for local development.

---

## Setup & Installation

#### **1. Prerequisites**

- Node.js (v18+)
- Google Cloud Account (with billing enabled)
- `gcloud` CLI authenticated
- `ngrok` installed

#### **2. GCP Configuration**

1.  **Enable APIs:** In your GCP project, enable the **Gmail API** and the **Cloud Pub/Sub API**.
2.  **Create Credentials:** Create an **OAuth 2.0 Client ID** for a **Desktop app** and download the `credentials.json` file to the project root.
3.  **Create Pub/Sub Topic:** Create a Pub/Sub topic (e.g., `gmail-push-topic`).
4.  **Set IAM Permissions:** Grant the Gmail service account permission to publish to your topic:
    ```bash
    gcloud pubsub topics add-iam-policy-binding [YOUR_TOPIC_ID] \
      --member="serviceAccount:service-gmail-api-push@system.gserviceaccount.com" \
      --role="roles/pubsub.publisher"
    ```

#### **3. Local Setup**

1.  **Clone & Install:**
    ```bash
    git clone <repository_url>
    cd <repository_name>
    npm install
    ```
2.  **Configure Environment:** Copy `.env.example` to `.env` and fill in your GCP project ID and topic/subscription names.

---

## Running the Application

1.  **Expose Local Server:** Start `ngrok` to create a public URL for your local server.
    ```bash
    ngrok http 4000
    ```
2.  **Create Pub/Sub Subscription:** Link your topic to your `ngrok` webhook endpoint.
    ```bash
    gcloud pubsub subscriptions create [YOUR_SUBSCRIPTION_NAME] \
      --topic=[YOUR_TOPIC_ID] \
      --push-endpoint="[YOUR_NGROK_URL]/webhook/gmail-push"
    ```
3.  **Authorize & Start Watch:** Run the one-time setup script and follow the OAuth consent flow in your browser.
    ```bash
    npm run setup:watch
    ```
4.  **Start the Server:**
    ```bash
    npm run dev
    ```

The server is now live and waiting for push notifications.

---

## Key Learnings & Challenges: Navigating Real-World API Behavior

A significant challenge during development was the unreliability of the `gmail.users.history.list` API endpoint. While the webhook notifications were arriving instantly, the associated `historyId` would consistently return an empty list of changes, even after accounting for potential race conditions with multi-client email interactions.

**Investigation & Pivot:**

- Initial hypotheses centered on race conditions (e.g., a "read" event notification arriving before the "message added" event). This was disproven by isolating the environment and turning off all other email clients.
- Further debugging involved adding strategic delays (up to 5 seconds) to account for API propagation latency. This also proved ineffective.
- A breakthrough occurred when I temporarily modified the code to bypass the history mechanism and instead fetch the latest message directly using `gmail.users.messages.list`. **This worked perfectly**, proving the email data was available but the history endpoint was the point of failure.

**Final Solution:**
The final, robust solution was to re-architect the service to permanently use the `messages.list` endpoint. To prevent reprocessing the same message on every "noise" notification, I implemented an in-memory `Set` to cache the IDs of already-processed messages. This pivot from the documented "best practice" (`history.list`) to a more resilient, direct-fetch method was a powerful lesson in the difference between API documentation and real-world performance, highlighting the need for adaptive coding strategies.
