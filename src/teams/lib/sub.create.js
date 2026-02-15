// src/teams/lib/sub.create.js
import axios from "axios";
import Subscription from "../../../database/model/subscription.js";
import { getAppOnlyToken } from "../../utils/getAppToken.js";

export default async (accessToken, userId) => {
  try {
    let webhookUrl = process.env.WEBHOOK_PUBLIC_URL;
    if (!webhookUrl) {
      throw new Error("WEBHOOK_PUBLIC_URL environment variable is not set");
    }
    // Remove trailing slash if present to prevent 308 redirects which fail validation
    webhookUrl = webhookUrl.replace(/\/$/, "");

    const subscriptions = [];

    // Get app-only token for creating subscriptions
    const appToken = await getAppOnlyToken();
    console.log("✅ Got app-only token for subscriptions", appToken);

    // Get user's profile to get UPN (needed for app-only subscription resource)
    const userProfile = await axios.get(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const userPrincipalName = userProfile.data.userPrincipalName;
    console.log(`👤 Creating subscriptions for user: ${userPrincipalName}`);

    // 1. Teams Chats
    try {
      // Expiration must be < 1 hour. Use 55 minutes to be safe from clock skew/network latency.
      const chatExpiration = new Date(Date.now() + 55 * 60 * 1000).toISOString();
      console.log(`🔗 Using Webhook URL for Teams: "${webhookUrl}/webhook/teams"`);

      const chatsSub = await axios.post(
        "https://graph.microsoft.com/v1.0/subscriptions",
        {
          changeType: "created,updated",
          notificationUrl: `${webhookUrl}/webhook/teams`,
          resource: `users/${userPrincipalName}/chats/getAllMessages`,
          expirationDateTime: chatExpiration,
          clientState: `secureChatsValue-${userId}`, // Include userId for easier routing in webhook
          includeResourceData: false,
        },
        {
          headers: {
            Authorization: `Bearer ${appToken}`, // ✅ Use app token
            "Content-Type": "application/json",
          },
        }
      );

      await Subscription.create({
        subscriptionId: chatsSub.data.id,
        userId,
        resource: `users/${userPrincipalName}/chats/getAllMessages`,
        changeType: "created,updated",
        clientState: `secureChatsValue-${userId}`,
        expirationDateTime: chatsSub.data.expirationDateTime,
      });

      subscriptions.push({ type: "teams-chat", data: chatsSub.data });
      console.log("✅ Teams chat subscription created");
    } catch (error) {
      console.error("❌ Teams chat subscription failed detail:", JSON.stringify(error.response?.data || error.message, null, 2));
    }

    // 2. Outlook Emails
    try {
      const emailExpiration = new Date(Date.now() + 4230 * 60 * 1000).toISOString();

      const outlookSub = await axios.post(
        "https://graph.microsoft.com/v1.0/subscriptions",
        {
          changeType: "created,updated",
          notificationUrl: `${webhookUrl}/webhook/outlook`,
          resource: `users/${userPrincipalName}/messages`,
          expirationDateTime: emailExpiration,
          clientState: `secureOutlookValue-${userId}`,
          includeResourceData: false,
        },
        {
          headers: {
            Authorization: `Bearer ${appToken}`, // ✅ Use app token
            "Content-Type": "application/json",
          },
        }
      );

      await Subscription.create({
        subscriptionId: outlookSub.data.id,
        userId,
        resource: `users/${userPrincipalName}/messages`,
        changeType: "created,updated",
        clientState: `secureOutlookValue-${userId}`,
        expirationDateTime: outlookSub.data.expirationDateTime,
      });

      subscriptions.push({ type: "outlook", data: outlookSub.data });
      console.log("✅ Outlook subscription created");
    } catch (error) {
      console.error("❌ Outlook subscription failed detail:", JSON.stringify(error.response?.data || error.message, null, 2));
    }

    // 3. Teams Channels (Individual per Team)
    try {
      console.log(`📡 Fetching joined teams for user (using user-delegated token)...`);

      // Decode JWT simply to log scopes (MVP)
      try {
        const payload = accessToken.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        console.log("🔑 User Token Scopes:", decoded.scp || decoded.roles);
      } catch (e) {
        console.log("Could not decode token scopes");
      }

      const teamsResponse = await axios.get(
        "https://graph.microsoft.com/v1.0/me/joinedTeams",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log(`📡 Found ${teamsResponse.data.value.length} team(s) for user`);

      for (const team of teamsResponse.data.value) {
        try {
          const teamsExpiration = new Date(Date.now() + 55 * 60 * 1000).toISOString();

          const teamSub = await axios.post(
            "https://graph.microsoft.com/v1.0/subscriptions",
            {
              changeType: "created,updated",
              notificationUrl: `${webhookUrl}/webhook/teams-channels`,
              resource: `teams/${team.id}/channels/getAllMessages`,
              expirationDateTime: teamsExpiration,
              clientState: `secureTeamsChannelsValue-${userId}-${team.id}`,
              includeResourceData: false,
            },
            {
              headers: {
                Authorization: `Bearer ${appToken}`, // ✅ Use app token
                "Content-Type": "application/json",
              },
            }
          );

          await Subscription.create({
            subscriptionId: teamSub.data.id,
            userId,
            teamId: team.id,
            teamName: team.displayName,
            resource: `teams/${team.id}/channels/getAllMessages`,
            changeType: "created,updated",
            clientState: `secureTeamsChannelsValue-${userId}-${team.id}`,
            expirationDateTime: teamSub.data.expirationDateTime,
          });

          subscriptions.push({
            type: "teams-channel",
            teamName: team.displayName,
            data: teamSub.data
          });

          console.log(`✅ Subscribed to team channel messages: ${team.displayName}`);
        } catch (teamError) {
          console.error(`❌ Failed to subscribe to team ${team.displayName}:`,
            teamError.response?.data || teamError.message);
        }
      }
    } catch (error) {
      // Handle known 401 Unauthorized for Guests who cannot enumerate teams
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn("⚠️ User cannot list joined teams (likely Guest or missing admin consent). Skipping channel subscriptions.");
      } else {
        console.error("❌ Failed to process joined teams:", error.response?.data || error.message);
      }
    }

    return {
      message: `${subscriptions.length} subscription(s) created successfully`,
      subscriptions,
    };
  } catch (error) {
    console.error("Fatal subscription error:", error);
    throw error;
  }
};
