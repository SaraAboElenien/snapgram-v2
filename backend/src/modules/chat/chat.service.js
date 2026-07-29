import conversationModel from "../../../db/models/conversation.model.js";
import messageModel from "../../../db/models/message.model.js";
import { AppError } from "../../../helpers/classError.js";
import { emitToUser } from "../../socket.js";

export const assertParticipant = (conversation, userId) => {
  return conversation.participants.some((p) => p.toString() === userId.toString());
};

export const sendMessageInConversation = async ({ conversationId, senderId, text }) => {
  const conversation = await conversationModel.findById(conversationId);
  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }
  if (!assertParticipant(conversation, senderId)) {
    throw new AppError("You are not a participant in this conversation", 403);
  }

  const newMessage = await messageModel.create({
    conversationId,
    senderId,
    text,
    readBy: [senderId],
  });

  conversation.lastMessage = { text, senderId, createdAt: newMessage.createdAt };
  await conversation.save();

  const recipientId = conversation.participants.find(
    (p) => p.toString() !== senderId.toString()
  );
  emitToUser(recipientId, "message:new", {
    conversationId,
    message: newMessage,
  });

  return newMessage;
};
