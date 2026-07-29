import { describe, it, expect } from 'vitest';
import { sendMessageInConversation } from '../../src/modules/chat/chat.service.js';
import userModel from '../../db/models/user.model.js';
import conversationModel from '../../db/models/conversation.model.js';
import messageModel from '../../db/models/message.model.js';

const makeUser = async (overrides = {}) =>
  userModel.create({
    firstName: 'Test',
    lastName: 'User',
    email: `test.${Date.now()}.${Math.random()}@example.com`,
    password: 'hashed-not-real',
    confirmed: true,
    ...overrides,
  });

describe('chat.service', () => {
  describe('sendMessageInConversation', () => {
    it('rejects a non-participant', async () => {
      const a = await makeUser();
      const b = await makeUser();
      const stranger = await makeUser();
      const conversation = await conversationModel.create({
        participants: [a._id, b._id],
        participantsKey: [a._id, b._id].map(String).sort().join('_'),
      });

      await expect(
        sendMessageInConversation({ conversationId: conversation._id, senderId: stranger._id, text: 'hi' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('creates the message and updates the conversation lastMessage', async () => {
      const a = await makeUser();
      const b = await makeUser();
      const conversation = await conversationModel.create({
        participants: [a._id, b._id],
        participantsKey: [a._id, b._id].map(String).sort().join('_'),
      });

      const message = await sendMessageInConversation({
        conversationId: conversation._id,
        senderId: a._id,
        text: 'hello there',
      });

      expect(message.text).toBe('hello there');
      expect(message.readBy.map(String)).toEqual([String(a._id)]);

      const refreshed = await conversationModel.findById(conversation._id);
      expect(refreshed.lastMessage.text).toBe('hello there');

      const stored = await messageModel.findById(message._id);
      expect(stored).not.toBeNull();
    });
  });
});
