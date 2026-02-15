// src/webhooks/teams.webhook.js
import axios from "axios";
import User from "../../database/model/user.js";
import { ensureValidToken } from "../utils/refreshToken.js";
import Message from "../../database/model/message.js";
import Subscription from "../../database/model/subscription.js";

export default async (req, res) => {
  try {
    // 1. Handle validation request from Microsoft
    if (req.query && req.query.validationToken) {
      console.log("✅ Teams webhook validation received");
      res.set("Content-Type", "text/plain");
      return res.status(200).send(req.query.validationToken);
    }

    // 2. Process change notifications
    const notifications = req.body.value;

    if (!notifications || notifications.length === 0) {
      return res.status(202).send(); // Accepted
    }

    console.log(`📩 Received ${notifications.length} Teams notification(s)`);

    // 3. Process each notification
    for (const notification of notifications) {
      // Validate clientState for security
      if (notification.clientState !== "secureChatsValue") {
        console.warn("⚠️ Invalid clientState, skipping notification");
        continue;
      }

      try {
        await processTeamsNotification(notification);
      } catch (error) {
        console.error("❌ Error processing notification:", error.message);
        // Continue processing other notifications
      }
    }

    // 4. Always return 202 within 3 seconds
    return res.status(202).send();
  } catch (error) {
    console.error("❌ Teams webhook error:", error);
    return res.status(202).send(); // Still return 202 to avoid retries
  }
};

async function processTeamsNotification(notification) {
  console.log("Processing Teams notification:", {
    subscriptionId: notification.subscriptionId,
    changeType: notification.changeType,
    resource: notification.resource,
  });

  // Find the user associated with this subscription
  const subscription = await Subscription.findOne({
    subscriptionId: notification.subscriptionId,
  });

  if (!subscription) {
    console.error("❌ Subscription not found:", notification.subscriptionId);
    return;
  }

  const user = await User.findById(subscription.userId);
  if (!user) {
    console.error("❌ User not found for subscription");
    return;
  }

  // Get valid access token
  const accessToken = await ensureValidToken(user);

  // Extract chat ID and message ID from resource
  // Resource format: "chats('19:xxx')/messages('1234567890')"
  // Or users('id')/chats('id')/messages('id')
  // We need to be careful with regex.
  // The notification resource is usually relative to the user or root.
  // The example resource was "me/chats/getAllMessages" for subscription, but notification.resource comes as "Users('id')/chats('id')/messages('id')" often.

  // Let's print the resource to debug if needed, but we should handle standard format.
  // Typical resource in notification: "Users/{id}/Chats/{id}/Messages/{id}"

  // Regex to extract chat and message ID
  const resourceMatch = notification.resource.match(/Chats\('([^']+)'\)\/Messages\('([^']+)'\)/i);

  if (!resourceMatch) {
    console.error("❌ Could not parse resource:", notification.resource);
    return;
  }

  const [, chatId, messageId] = resourceMatch;

  // Fetch the full message details
  try {
    const messageResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/chats/${chatId}/messages/${messageId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const message = messageResponse.data;
    console.log("✅ Fetched Teams message:", {
      messageId: message.id,
      from: message.from?.user?.displayName,
      preview: message.body?.content?.substring(0, 50),
    });

    // Store message in database
    await Message.create({
      userId: user._id,
      platform: "teams",
      chatId,
      messageId: message.id,
      from: message.from?.user?.displayName || "Unknown",
      fromEmail: message.from?.user?.userPrincipalName,
      content: message.body?.content,
      contentType: message.body?.contentType,
      createdDateTime: message.createdDateTime,
      chatType: message.chatId ? "chat" : "channel",
      raw: message, // Store full message for reference
    });

    console.log("✅ Teams message stored in database");
  } catch (error) {
    // If 404, message might be deleted or not accessible
    console.error("❌ Error fetching/storing Teams message:", error.response?.data || error.message);
  }
}
