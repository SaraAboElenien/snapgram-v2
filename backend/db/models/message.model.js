import mongoose, { Schema } from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

const messageModel = mongoose.model("Message", messageSchema);

export default messageModel;
