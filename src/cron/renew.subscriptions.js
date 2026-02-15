// src/cron/renew.subscriptions.js
import cron from "node-cron";
import axios from "axios";
import Subscription from "../../database/model/subscription.js";
import { getAppOnlyToken } from "../utils/getAppToken.js";

// Run every 30 minutes
cron.schedule("*/30 * * * *", async () => {
    console.log("🔄 Checking subscriptions for renewal...");

    try {
        // Renew anything expiring in the next 45 minutes
        const checkTime = new Date(Date.now() + 45 * 60 * 1000);

        const expiringSubscriptions = await Subscription.find({
            expirationDateTime: {
                $lte: checkTime,
            },
        });

        if (expiringSubscriptions.length === 0) {
            return;
        }

        console.log(`Found ${expiringSubscriptions.length} subscription(s) to renew`);

        // Get app-only token for renewal
        const appToken = await getAppOnlyToken();

        for (const sub of expiringSubscriptions) {
            try {
                // Calculate new expiration
                const isEmail = sub.resource.includes("messages") && !sub.resource.includes("chats");

                // Expiration: 1 hour (55 min buffer) for chats, 3 days for emails
                const duration = isEmail ? 4230 : 55; // minutes

                const newExpiration = new Date(
                    Date.now() + duration * 60 * 1000
                ).toISOString();

                console.log(`Renewing ${sub.subscriptionId} (${sub.resource}) until ${newExpiration}`);

                // Renew subscription
                const response = await axios.patch(
                    `https://graph.microsoft.com/v1.0/subscriptions/${sub.subscriptionId}`,
                    {
                        expirationDateTime: newExpiration,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${appToken}`, // ✅ Use app token
                            "Content-Type": "application/json",
                        },
                    }
                );

                // Update in database
                sub.expirationDateTime = response.data.expirationDateTime;
                await sub.save();

                console.log(`✅ Renewed subscription: ${sub.subscriptionId}`);
            } catch (error) {
                console.error(`❌ Failed to renew ${sub.subscriptionId}:`, error.response?.data || error.message);

                if (error.response?.status === 404) {
                    await sub.deleteOne();
                    console.log(`🗑️ Deleted invalid local subscription: ${sub.subscriptionId}`);
                }
            }
        }
    } catch (error) {
        console.error("❌ Subscription renewal error:", error);
    }
});

export default cron;
