import { describe, it, expect, vi } from 'vitest';

vi.mock('../../helpers/cloudinary.js', () => ({
  default: {
    uploader: {
      destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));

const { createPostForUser, deletePostForUser } = await import('../../src/modules/post/post.service.js');
const { default: userModel } = await import('../../db/models/user.model.js');
const { default: postModel } = await import('../../db/models/post.model.js');
const { default: notificationModel } = await import('../../db/models/notification.model.js');

const makeUser = async (overrides = {}) =>
  userModel.create({
    firstName: 'Test',
    lastName: 'User',
    email: `test.${Date.now()}.${Math.random()}@example.com`,
    password: 'hashed-not-real',
    confirmed: true,
    ...overrides,
  });

describe('post.service', () => {
  describe('createPostForUser', () => {
    it('rejects a missing description', async () => {
      const user = await makeUser();
      await expect(
        createPostForUser({
          userId: user._id,
          description: '',
          uploadedImage: { secure_url: 'https://example.com/a.png', public_id: 'pub-a' },
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects a missing uploaded image', async () => {
      const user = await makeUser();
      await expect(
        createPostForUser({ userId: user._id, description: 'hello', uploadedImage: null })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('creates a post and fans out a newPost notification to followers', async () => {
      const author = await makeUser();
      const follower = await makeUser();
      follower.following.push(author._id);
      await follower.save();
      author.followers.push(follower._id);
      await author.save();

      const post = await createPostForUser({
        userId: author._id,
        description: 'hello world',
        tags: 'a, b',
        location: 'here',
        uploadedImage: { secure_url: 'https://example.com/a.png', public_id: 'pub-a' },
      });

      expect(post.description).toBe('hello world');
      expect(post.tags).toEqual(['a', 'b']);

      // notification insertMany is fire-and-forget in the service; give it a tick
      await new Promise((resolve) => setTimeout(resolve, 50));
      const notif = await notificationModel.findOne({ receiver: follower._id, sender: author._id, type: 'newPost' });
      expect(notif).not.toBeNull();
      expect(String(notif.post)).toBe(String(post._id));
    });
  });

  describe('deletePostForUser', () => {
    it('rejects deletion by a non-owner', async () => {
      const owner = await makeUser();
      const other = await makeUser();
      const post = await postModel.create({
        userId: owner._id,
        description: 'mine',
        image: { secure_url: 'https://example.com/a.png', public_id: 'pub-a' },
      });

      await expect(
        deletePostForUser({ postId: post._id, requesterId: other._id })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('deletes the post when the owner requests it', async () => {
      const owner = await makeUser();
      const post = await postModel.create({
        userId: owner._id,
        description: 'mine',
        image: { secure_url: 'https://example.com/a.png', public_id: 'pub-a' },
      });

      const deleted = await deletePostForUser({ postId: post._id, requesterId: owner._id });
      expect(String(deleted._id)).toBe(String(post._id));
      expect(await postModel.findById(post._id)).toBeNull();
    });
  });
});
