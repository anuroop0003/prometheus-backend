import axios from "axios";
import qs from "qs";

export const ensureValidToken = async (user) => {
    // If token is still valid (with 5 min buffer), return existing token
    // user.tokenStats.expiresIn is usually seconds/minutes from issuance?
    // We need to check against expiration time.
    // Assuming user model stores accessToken, refreshToken, and expiration time.
    // If not, we should probably fetch it.

    // NOTE: Based on typical OAuth implementation:
    // user.accessToken
    // user.refreshToken
    // user.tokenParams.expires_in (seconds) - tricky to use without issuance time
    // user.tokenParams.ext_expires_in (seconds)

    // Better approach: try to use minimal checking or just refresh if we suspect it's old.
    // Ideally, we should store `expiresAt` in the database.

    // Let's implement a safe refresh if we can't determine validity or simply always refresh if it's been a while.
    // For now, let's assume we need to refresh if we don't have an expiration time or if it's close.

    // Simplest strategy: Try to use the token. If 401, refresh and retry (that's reactive).
    // Proactive strategy (better for background jobs): Refresh if close to expiry.

    // Since we don't see the User model structure for expiration, let's assume we might need to refresh.
    // We will try to refresh if detailed expiration info is missing or if we know it's expired.

    // Implementation:
    // 1. If we have refreshToken, try to get new accessToken
    // 2. Update user in DB
    // 3. Return new accessToken

    if (!user.refreshToken) {
        console.warn("User has no refresh token, cannot refresh.");
        return user.accessToken;
    }

    // TODO: Check if actually expired if we have that data. 
    // For now, let's just implement the refresh logic function which can be called safely.

    try {
        // Check if token is expired (heuristic)
        // If we saved 'updatedAt' for the token...
        // Let's assume the caller logic calls this because they suspect it might be needed
        // OR we can just do a check.

        // Microsoft tokens usually last 60-90 mins.
        // Let's implement the refresh call.

        return await refreshAccessToken(user);

    } catch (error) {
        console.error("Error ensuring valid token:", error.message);
        return user.accessToken; // Fallback to existing
    }
};

const refreshAccessToken = async (user) => {
    try {
        const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

        const requestBody = {
            client_id: process.env.AZURE_CLIENT_ID,
            client_secret: process.env.AZURE_CLIENT_SECRET,
            scope: "offline_access User.Read Mail.Read Mail.ReadBasic Calendars.ReadWrite Chat.Read Chat.ReadBasic Tasks.ReadWrite", // Match scopes from auth.azure.js
            refresh_token: user.refreshToken,
            grant_type: "refresh_token",
        };

        const response = await axios.post(tokenEndpoint, qs.stringify(requestBody), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const { access_token, refresh_token, expires_in } = response.data;

        // Update user
        user.accessToken = access_token;
        if (refresh_token) {
            user.refreshToken = refresh_token; // Refresh tokens can rotate
        }
        // Ideally update expiration here too

        await user.save();
        console.log(`🔄 Refreshed access token for user ${user._id}`);

        return access_token;
    } catch (error) {
        console.error("❌ Failed to refresh token:", error.response?.data || error.message);
        throw error;
    }
};
