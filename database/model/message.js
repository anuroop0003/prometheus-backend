import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    platform: {
        type: String,
        enum: ["teams", "teams-channel", "outlook"],
        required: true,
    },
    // Teams specific
    chatId: String,
    teamId: String,
    channelId: String,

    // Common fields
    messageId: {
        type: String,
        required: true,
        index: true,
        unique: true, // Ensure uniqueness
    },
    subject: String, // For emails
    from: String,
    fromEmail: String,
    to: [String], // For emails
    cc: [String], // For emails
    content: String,
    contentType: String,
    bodyPreview: String,

    // Metadata
    createdDateTime: Date,
    receivedDateTime: Date,
    hasAttachments: Boolean,
    importance: String,
    chatType: String, // "chat" or "channel" for Teams

    // Store full raw message
    raw: mongoose.Schema.Types.Mixed,

    // Processing status
    processed: {
        type: Boolean,
        default: false,
    },
    processedAt: Date,
}, {
    timestamps: true,
});

// Compound index for efficient queries
messageSchema.index({ userId: 1, platform: 1, createdDateTime: -1 });

export default mongoose.model("Message", messageSchema);
