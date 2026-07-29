import express from "express";
import * as ChatC from "./chat.controller.js";
import * as ChatV from "./chat.validation.js";
import { validation } from "../../../middlewares/validation.js";
import { auth } from "../../../middlewares/auth.js";
import { systemRoles } from "../../../helpers/systemRoles.js";

const router = express.Router();

// mutual-follow contacts, for the "new chat" picker
router.get("/contacts", auth(systemRoles.user), ChatC.getContacts);

// start or get-existing conversation with another user
router.post(
  "/conversations",
  auth(systemRoles.user),
  validation(ChatV.startConversationValidationSchema),
  ChatC.startConversation
);

// list current user's conversations
router.get("/conversations", auth(systemRoles.user), ChatC.getConversations);

// message history for a conversation
router.get(
  "/conversations/:id/messages",
  auth(systemRoles.user),
  validation(ChatV.getMessagesValidationSchema),
  ChatC.getMessages
);

// send a message
router.post(
  "/conversations/:id/messages",
  auth(systemRoles.user),
  validation(ChatV.sendMessageValidationSchema),
  ChatC.sendMessage
);

// mark a conversation's messages as read
router.put(
  "/conversations/:id/read",
  auth(systemRoles.user),
  validation(ChatV.markReadValidationSchema),
  ChatC.markConversationRead
);

export default router;
