// src/webhooks/teams-channels.webhook.js
import axios from "axios";
import User from "../../database/model/user.js";
import Subscription from "../../database/model/subscription.js";
import { ensureValidToken } from "../utils/refreshToken.js";
import Message from "../../database/model/message.js";

export default async (req, res) => {
    try {
        // Validation
        if (req.query && req.query.validationToken) {
            console.log("✅ Teams channels webhook validation received");
            res.set("Content-Type", "text/plain");
            return res.status(200).send(req.query.validationToken);
        }

        const notifications = req.body.value;

        if (!notifications || notifications.length === 0) {
            return res.status(202).send();
        }

        console.log(`📩 Received ${notifications.length} Teams channel notification(s)`);

        for (const notification of notifications) {
            if (notification.clientState !== "secureTeamsChannelsValue") {
                console.warn("⚠️ Invalid clientState");
                continue;
            }

            try {
                await processChannelNotification(notification);
            } catch (error) {
                console.error("❌ Error processing channel notification:", error.message);
            }
        }

        return res.status(202).send();
    } catch (error) {
        console.error("❌ Teams channels webhook error:", error);
        return res.status(202).send();
    }
};

async function processChannelNotification(notification) {
    const subscription = await Subscription.findOne({
        subscriptionId: notification.subscriptionId,
    });

    if (!subscription) return;

    const user = await User.findById(subscription.userId);
    if (!user) return;

    const accessToken = await ensureValidToken(user);

    // Resource format: "Teams('teamId')/Channels('channelId')/Messages('messageId')"
    const resourceMatch = notification.resource.match(
        /Teams\('([^']+)'\)\/Channels\('([^']+)'\)\/Messages\('([^']+)'\)/i
    );

    if (!resourceMatch) {
        console.error("❌ Could not parse channel resource:", notification.resource);
        return;
    }

    const [, teamId, channelId, messageId] = resourceMatch;

    try {
        const messageResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages/${messageId}`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        const message = messageResponse.data;
        console.log("✅ Fetched Teams channel message:", {
            messageId: message.id,
            from: message.from?.user?.displayName,
        });

        await Message.create({
            userId: user._id,
            platform: "teams-channel",
            teamId,
            channelId,
            messageId: message.id,
            from: message.from?.user?.displayName || "Unknown",
            fromEmail: message.from?.user?.userPrincipalName,
            content: message.body?.content,
            contentType: message.body?.contentType,
            createdDateTime: message.createdDateTime,
            raw: message,
        });

        console.log("✅ Teams channel message stored");
    } catch (error) {
        console.error("❌ Error fetching channel message:", error.response?.data || error.message);
    }
}
