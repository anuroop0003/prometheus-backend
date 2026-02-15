import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
    {
        subscriptionId: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        resource: String,
        teamId: String,
        teamName: String,
        changeType: String,
        clientState: String,
        expirationDateTime: Date,
    },
    {
        timestamps: true,
    }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
