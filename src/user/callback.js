import axios from "axios";
import User from "../../database/model/user.js";

export default async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send("Authorization code missing");
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await axios.post(
            `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: process.env.AZURE_CLIENT_ID,
                scope: [
                    "openid",
                    "profile",
                    "email",
                    "offline_access",
                    "User.Read",
                    "Mail.Read",
                    "Mail.ReadBasic",
                    "Calendars.ReadWrite",
                    "Chat.Read",
                    "Chat.ReadBasic",
                    "Tasks.ReadWrite",

                ].join(" "),
                code,
                redirect_uri: process.env.REDIRECT_URI,
                grant_type: "authorization_code",
                client_secret: process.env.AZURE_CLIENT_SECRET,
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            },
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // Get user profile
        const profileResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const { id, displayName, mail, userPrincipalName } = profileResponse.data;
        const email = mail

        // Update or create user
        let user = await User.findOne({ azureId: id });
        if (!user) {
            user = await User.findOne({ email }); // Fallback to email match
        }

        if (user) {
            user.azureId = id;
            user.accessToken = access_token;
            user.refreshToken = refresh_token;
            user.expiry = new Date(Date.now() + expires_in * 1000);
            await user.save();
        } else {
            user = await User.create({
                name: displayName,
                email,
                azureId: id,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiry: new Date(Date.now() + expires_in * 1000),
            });
        }

        // In a real app, you would create a session or JWT for your own app here
        res.send(`Login successful! Welcome ${user.name}`);
    } catch (error) {
        console.error("Auth callback error:", error.response?.data || error.message);
        res.status(500).send("Authentication failed");
    }
};
