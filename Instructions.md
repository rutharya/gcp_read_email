# Gmail True PUSH Webhook Server

This project is a complete Node.js TypeScript implementation of a PUSH-based webhook server for receiving real-time Gmail notifications. It avoids the inefficiencies and timeout issues associated with traditional IMAP polling or IDLE connections.

## Prerequisites

1.  **Node.js:** v18 or later.
2.  **Google Cloud Account:** With billing enabled.
3.  **`gcloud` CLI:** Authenticated with your account.
4.  **`ngrok`:** To expose your local server to the internet. [Download ngrok](https://ngrok.com/download).

---

## Setup Instructions

### Step 1: Google Cloud Project Setup

1.  **Create a Project:** Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project. Note your **Project ID**.

2.  **Enable APIs:** In your new project, enable the **Gmail API** and the **Cloud Pub/Sub API**.

3.  **Create OAuth 2.0 Credentials:**

    - Go to "APIs & Services" -> "Credentials".
    - Click "Create Credentials" -> "OAuth client ID".
    - Select "Desktop app" as the application type.
    - Download the JSON file. **Rename it to `credentials.json`** and place it in the root of this project directory.

4.  **Create a Pub/Sub Topic:**

    - Go to "Pub/Sub" -> "Topics".
    - Click "Create Topic".
    - Give it a **Topic ID** (e.g., `gmail-push-topic`).

5.  **Grant Gmail Permission to Publish to the Topic:**
    - The Gmail API service account (`service-gmail-api-push@system.gserviceaccount.com`) needs permission to publish messages to your topic.
    - Run this command in your terminal, replacing `[YOUR_TOPIC_ID]` with the ID from the previous step:
      ```bash
      gcloud pubsub topics add-iam-policy-binding [YOUR_TOPIC_ID] \
        --member="serviceAccount:service-gmail-api-push@system.gserviceaccount.com" \
        --role="roles/pubsub.publisher"
      ```

### Step 2: Project Configuration

1.  **Clone & Install:**

    ```bash
    git clone <repository_url>
    cd gmail-push-webhook
    npm install
    ```

2.  **Configure Environment Variables:**
    - Rename `.env.example` to `.env`.
    - Fill in your `GCLOUD_PROJECT_ID` and `GMAIL_PUBSUB_TOPIC_ID`.

### Step 3: Local Server and `ngrok`

1.  **Start `ngrok`:** Open a new terminal window and run the following command to expose your local port 3000.

    ```bash
    ngrok http 3000
    ```

    `ngrok` will give you a public `https` Forwarding URL (e.g., `https://random-string.ngrok-free.app`). **Copy this URL.**

2.  **Create Pub/Sub Subscription:**
    - You now need to tell Pub/Sub where to send messages. Run this command, replacing `[YOUR_SUBSCRIPTION_ID]` with a name (e.g., `gmail-sub`) and `[YOUR_NGROK_URL]` with the URL from `ngrok`.
      ```bash
      gcloud pubsub subscriptions create [YOUR_SUBSCRIPTION_ID] \
        --topic=[YOUR_TOPIC_ID] \
        --push-endpoint="[YOUR_NGROK_URL]/webhook/gmail-push"
      ```
    - **Note:** If ngrok disconnects, you'll get a new URL and will need to update the subscription's push endpoint.

### Step 4: Authorize and Start the Gmail Watch

1.  **Run the Setup Script:** In your project terminal, run the one-time setup script. This will ask you to authorize the application to read your Gmail.
    ```bash
    npm run setup:watch
    ```
    - A URL will appear in your console. Open it in a browser.
    - Log in with the Google account you want to monitor.
    - Grant the permissions.
    - You will be redirected to a `localhost` page (it may show an error, which is fine). Copy the full URL you were redirected to and paste it back into the terminal.
    - On success, a `token.json` file will be created, and you'll see a confirmation that the watch is active for 7 days.

### Step 5: Run the Server

1.  **Start the Webhook Server:**
    ```bash
    npm run dev
    ```
    The server is now running and waiting for notifications.

---

## Testing

1.  From a different email account, send an email **TO** the account you are monitoring.
2.  The email **must** come **FROM**: `ruthvik.arya91@gmail.com`.
3.  The email **must** have a **SUBJECT** that matches the pattern: `remote-client access [CODE]`, for example: `remote-client access [XF88B2]`.
4.  The email **BODY** should contain at least one link, e.g., `Please visit https://example.com/verify to complete the process.`.

When the email arrives, you will see a detailed log in your server's console instantly.
