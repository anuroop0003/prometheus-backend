// src/webhooks/outlook.webhook.js
import axios from "axios";
import User from "../../database/model/user.js";
import Subscription from "../../database/model/subscription.js";
import { ensureValidToken } from "../utils/refreshToken.js";
import Message from "../../database/model/message.js";

export default async (req, res) => {
  try {
    // Validation
    if (req.query && req.query.validationToken) {
      console.log("✅ Outlook webhook validation received");
      res.set("Content-Type", "text/plain");
      return res.status(200).send(req.query.validationToken);
    }

    const notifications = req.body.value;

    if (!notifications || notifications.length === 0) {
      return res.status(202).send();
    }

    console.log(`📧 Received ${notifications.length} Outlook notification(s)`);

    for (const notification of notifications) {
      if (notification.clientState !== "secureOutlookValue") {
        console.warn("⚠️ Invalid clientState");
        continue;
      }

      try {
        await processOutlookNotification(notification);
      } catch (error) {
        console.error("❌ Error processing Outlook notification:", error.message);
      }
    }

    return res.status(202).send();
  } catch (error) {
    console.error("❌ Outlook webhook error:", error);
    return res.status(202).send();
  }
};

async function processOutlookNotification(notification) {
  const subscription = await Subscription.findOne({
    subscriptionId: notification.subscriptionId,
  });

  if (!subscription) return;

  const user = await User.findById(subscription.userId);
  if (!user) return;

  const accessToken = await ensureValidToken(user);

  // Resource format: "Users/{userId}/Messages/{messageId}"
  const messageId = notification.resourceData?.id;

  // Note: notification.resource might be just "Users/id/Messages/id"
  // but resourceData usually contains the ID directly.

  if (!messageId) {
    console.error("❌ No message ID in notification resourceData");
    // Fallback?
    // Regex on resource: Users/id/Messages/id
    return;
  }

  try {
    const messageResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          $select: "subject,from,toRecipients,ccRecipients,bodyPreview,body,receivedDateTime,hasAttachments,importance",
        },
      }
    );

    const message = messageResponse.data;
    console.log("✅ Fetched Outlook message:", {
      messageId: message.id,
      subject: message.subject,
      from: message.from?.emailAddress?.address,
    });

    await Message.create({
      userId: user._id,
      platform: "outlook",
      messageId: message.id,
      subject: message.subject,
      from: message.from?.emailAddress?.name,
      fromEmail: message.from?.emailAddress?.address,
      to: message.toRecipients?.map(r => r.emailAddress.address),
      cc: message.ccRecipients?.map(r => r.emailAddress.address),
      content: message.body?.content,
      contentType: message.body?.contentType,
      bodyPreview: message.bodyPreview,
      receivedDateTime: message.receivedDateTime,
      hasAttachments: message.hasAttachments,
      importance: message.importance,
      raw: message,
    });

    console.log("✅ Outlook message stored");
  } catch (error) {
    console.error("❌ Error fetching Outlook message:", error.response?.data || error.message);
  }
}
