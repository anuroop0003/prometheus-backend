import axios from "axios";

let appTokenCache = null;
let tokenExpiry = null;

export async function getAppOnlyToken() {
    // Return cached token if still valid
    if (appTokenCache && tokenExpiry && new Date() < tokenExpiry) {
        return appTokenCache;
    }

    try {
        const params = new URLSearchParams({
            client_id: process.env.AZURE_CLIENT_ID,
            client_secret: process.env.AZURE_CLIENT_SECRET,
            scope: "https://graph.microsoft.com/.default",
            grant_type: "client_credentials",
        });

        const tokenResponse = await axios.post(
            `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
            params.toString(),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );

        appTokenCache = tokenResponse.data.access_token;
        // Cache for duration minus 5 minutes buffer
        tokenExpiry = new Date(Date.now() + (tokenResponse.data.expires_in - 300) * 1000);

        return appTokenCache;
    } catch (error) {
        console.error("❌ Failed to get app-only token:", error.response?.data || error.message);
        throw error;
    }
}
