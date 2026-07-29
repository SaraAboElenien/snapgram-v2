import conversationModel from "../../../db/models/conversation.model.js";
import messageModel from "../../../db/models/message.model.js";
import userModel from "../../../db/models/user.model.js";
import { asyncHandler } from "../../../helpers/globleErrorHandling.js";
import { AppError } from "../../../helpers/classError.js";
import { assertParticipant, sendMessageInConversation } from './chat.service.js';

const buildParticipantsKey = (idA, idB) => [idA, idB].map(String).sort().join("_");


//**** Start or Get an Existing Conversation (mutual-follows only) ****//
export const startConversation = asyncHandler(async (req, res, next) => {
  const currentUser = req.user;
  const currentUserId = currentUser._id;
  const { userId: otherUserId } = req.body;

  if (otherUserId === currentUserId.toString()) {
    return next(new AppError("You cannot start a conversation with yourself", 400));
  }

  const otherUser = await userModel.findById(otherUserId).select("following");
  if (!otherUser) {
    return next(new AppError("User not found", 404));
  }

  const isMutualFollow =
    currentUser.following.some((id) => id.toString() === otherUserId) &&
    otherUser.following.some((id) => id.toString() === currentUserId.toString());

  if (!isMutualFollow) {
    return next(new AppError("You can only message users you mutually follow", 403));
  }

  const participantsKey = buildParticipantsKey(currentUserId, otherUserId);

  let conversation = await conversationModel.findOne({ participantsKey });
  if (!conversation) {
    conversation = await conversationModel.create({
      participants: [currentUserId, otherUserId],
      participantsKey,
    });
  }

  await conversation.populate({
    path: "participants",
    select: "firstName lastName profileImage",
  });

  // Shape matches getConversations' per-conversation shape (otherParticipant,
  // unreadCount) so the frontend can treat a conversation object the same way
  // regardless of whether it came from this endpoint or the list endpoint.
  const otherParticipant = conversation.participants.find(
    (p) => p._id.toString() !== currentUserId.toString()
  );
  const unreadCount = await messageModel.countDocuments({
    conversationId: conversation._id,
    readBy: { $ne: currentUserId },
  });

  res.status(200).json({
    message: "Conversation ready",
    conversation: {
      _id: conversation._id,
      otherParticipant,
      lastMessage: conversation.lastMessage,
      unreadCount,
      updatedAt: conversation.updatedAt,
    },
  });
});


//**** List Current User's Conversations ****//
export const getConversations = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const conversations = await conversationModel
    .find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate({ path: "participants", select: "firstName lastName profileImage" });

  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conversation) => {
      const unreadCount = await messageModel.countDocuments({
        conversationId: conversation._id,
        readBy: { $ne: userId },
      });
      const otherParticipant = conversation.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      return {
        _id: conversation._id,
        otherParticipant,
        lastMessage: conversation.lastMessage,
        unreadCount,
        updatedAt: conversation.updatedAt,
      };
    })
  );

  res.status(200).json({
    message: "Conversations fetched successfully",
    conversations: conversationsWithUnread,
  });
});


//**** Get Messages for a Conversation (participants only) ****//
export const getMessages = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const conversation = await conversationModel.findById(id);
  if (!conversation) {
    return next(new AppError("Conversation not found", 404));
  }
  if (!assertParticipant(conversation, userId)) {
    return next(new AppError("You are not a participant in this conversation", 403));
  }

  const messages = await messageModel.find({ conversationId: id }).sort({ createdAt: 1 });

  res.status(200).json({
    message: "Messages fetched successfully",
    documents: messages,
  });
});


//**** Send a Message ****//
export const sendMessage = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  const newMessage = await sendMessageInConversation({ conversationId: id, senderId: userId, text });

  res.status(201).json({
    message: "Message sent successfully",
    document: newMessage,
  });
});


//**** Mark a Conversation's Messages as Read ****//
export const markConversationRead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const conversation = await conversationModel.findById(id);
  if (!conversation) {
    return next(new AppError("Conversation not found", 404));
  }
  if (!assertParticipant(conversation, userId)) {
    return next(new AppError("You are not a participant in this conversation", 403));
  }

  await messageModel.updateMany({ conversationId: id }, { $addToSet: { readBy: userId } });

  res.status(200).json({ message: "Conversation marked as read" });
});


//**** Get Mutual-Follow Contacts (for the "new chat" picker) ****//
export const getContacts = asyncHandler(async (req, res, next) => {
  const currentUser = req.user;

  const contacts = await userModel
    .find({
      _id: { $in: currentUser.following },
      following: currentUser._id,
    })
    .select("firstName lastName profileImage");

  res.status(200).json({
    message: "Contacts fetched successfully",
    contacts,
  });
});
