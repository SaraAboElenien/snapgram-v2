import mongoose, { Schema } from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    // Sorted, joined participant ids — lets a unique index enforce at most one
    // conversation between any given pair of users (v1 is 1:1 only).
    participantsKey: { type: String, required: true, unique: true },
    lastMessage: {
      text: String,
      senderId: { type: Schema.Types.ObjectId, ref: "User" },
      createdAt: Date,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

const conversationModel = mongoose.model("Conversation", conversationSchema);

export default conversationModel;
