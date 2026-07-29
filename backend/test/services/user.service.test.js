import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../helpers/cloudinary.js', () => ({
  default: {
    uploader: {
      destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));

const { deleteUserAccount, followOrUnfollowUser } = await import('../../src/modules/user/user.service.js');
const { default: userModel } = await import('../../db/models/user.model.js');
const { default: postModel } = await import('../../db/models/post.model.js');
const { default: commentModel } = await import('../../db/models/comment.model.js');
const { default: notificationModel } = await import('../../db/models/notification.model.js');
const { default: storyModel } = await import('../../db/models/story.model.js');
const { default: conversationModel } = await import('../../db/models/conversation.model.js');
const { default: messageModel } = await import('../../db/models/message.model.js');

const makeUser = async (overrides = {}) =>
  userModel.create({
    firstName: 'Test',
    lastName: 'User',
    email: `test.${Date.now()}.${Math.random()}@example.com`,
    password: 'hashed-not-real',
    confirmed: true,
    ...overrides,
  });

describe('user.service', () => {
  describe('deleteUserAccount', () => {
    it('cascades: own posts, comments (own + left elsewhere), notifications, stories, conversations/messages, and array references in other users', async () => {
      const owner = await makeUser();
      const other = await makeUser();

      const ownPost = await postModel.create({
        userId: owner._id,
        description: 'own post',
        image: { secure_url: 'https://example.com/a.png', public_id: 'pub-a' },
      });
      const otherPost = await postModel.create({
        userId: other._id,
        description: 'other post',
        image: { secure_url: 'https://example.com/b.png', public_id: 'pub-b' },
      });

      // owner comments on someone else's post
      const commentOnOther = await commentModel.create({
        userId: owner._id,
        postId: otherPost._id,
        comment: 'nice post',
      });
      otherPost.comments.push(commentOnOther._id);
      await otherPost.save();

      await notificationModel.create({
        receiver: other._id,
        sender: owner._id,
        type: 'like',
        post: ownPost._id,
        content: 'liked',
      });

      const story = await storyModel.create({
        userId: owner._id,
        image: { secure_url: 'https://example.com/s.png', public_id: 'pub-s' },
      });

      other.following.push(owner._id);
      owner.followers.push(other._id);
      other.savedPosts.push(ownPost._id);
      await other.save();
      await owner.save();

      const conversation = await conversationModel.create({
        participants: [owner._id, other._id],
        participantsKey: [owner._id, other._id].map(String).sort().join('_'),
      });
      await messageModel.create({
        conversationId: conversation._id,
        senderId: owner._id,
        text: 'hi',
        readBy: [owner._id],
      });

      await deleteUserAccount(owner);

      expect(await userModel.findById(owner._id)).toBeNull();
      expect(await postModel.findById(ownPost._id)).toBeNull();
      expect(await commentModel.findById(commentOnOther._id)).toBeNull();
      expect(await notificationModel.countDocuments({ sender: owner._id })).toBe(0);
      expect(await storyModel.findById(story._id)).toBeNull();
      expect(await conversationModel.findById(conversation._id)).toBeNull();
      expect(await messageModel.countDocuments({ conversationId: conversation._id })).toBe(0);

      const refreshedOther = await userModel.findById(other._id);
      expect(refreshedOther.following.map(String)).not.toContain(String(owner._id));
      expect(refreshedOther.savedPosts.map(String)).not.toContain(String(ownPost._id));

      const refreshedOtherPost = await postModel.findById(otherPost._id);
      expect(refreshedOtherPost.comments.map(String)).not.toContain(String(commentOnOther._id));
    });
  });

  describe('followOrUnfollowUser', () => {
    it('rejects following yourself', async () => {
      const user = await makeUser();
      await expect(
        followOrUnfollowUser({ userId: String(user._id), targetId: String(user._id), action: 'follow' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('follow then unfollow keeps arrays symmetric, rejects duplicates', async () => {
      const a = await makeUser();
      const b = await makeUser();

      const followResult = await followOrUnfollowUser({
        userId: String(a._id),
        targetId: String(b._id),
        action: 'follow',
      });
      expect(followResult.followersCount).toBe(1);

      const refreshedA = await userModel.findById(a._id);
      const refreshedB = await userModel.findById(b._id);
      expect(refreshedA.following.map(String)).toContain(String(b._id));
      expect(refreshedB.followers.map(String)).toContain(String(a._id));

      const notif = await notificationModel.findOne({ receiver: b._id, sender: a._id, type: 'follow' });
      expect(notif).not.toBeNull();

      await expect(
        followOrUnfollowUser({ userId: String(a._id), targetId: String(b._id), action: 'follow' })
      ).rejects.toMatchObject({ statusCode: 400 });

      const unfollowResult = await followOrUnfollowUser({
        userId: String(a._id),
        targetId: String(b._id),
        action: 'unfollow',
      });
      expect(unfollowResult.followersCount).toBe(0);

      const afterA = await userModel.findById(a._id);
      const afterB = await userModel.findById(b._id);
      expect(afterA.following.map(String)).not.toContain(String(b._id));
      expect(afterB.followers.map(String)).not.toContain(String(a._id));

      await expect(
        followOrUnfollowUser({ userId: String(a._id), targetId: String(b._id), action: 'unfollow' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects an invalid action', async () => {
      const a = await makeUser();
      const b = await makeUser();
      await expect(
        followOrUnfollowUser({ userId: String(a._id), targetId: String(b._id), action: 'nonsense' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
