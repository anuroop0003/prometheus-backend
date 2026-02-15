import crypto from "crypto";

export default (req, res) => {
  // Define scopes cleanly as an array
  const scopes = [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    // Mail permissions
    "Mail.Read",
    "Mail.ReadBasic",
    // Calendar permissions
    "Calendars.Read",
    "Calendars.ReadWrite",
    // Chat permissions - THESE ARE CRITICAL
    "Chat.Read",
    "Chat.ReadWrite", // ✅ Add this
    "ChatMessage.Read", // ✅ Add this - REQUIRED for subscriptions
    // Teams channel permissions
    "ChannelMessage.Read.All", // ✅ Add this for Teams channels
    // Tasks
    "Tasks.ReadWrite",
  ];

  // Generate a random state for security (CSRF protection)
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.REDIRECT_URI,
    response_mode: "query",
    scope: scopes.join(" "),
    state: state,
    // prompt: "consent" // ✅ Force re-consent to get new permissions
  });

  const authUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;

  res.redirect(authUrl);
};
