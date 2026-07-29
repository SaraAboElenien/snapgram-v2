import { describe, it, expect } from 'vitest';
import { getStoryFeedForUser } from '../../src/modules/story/story.service.js';
import userModel from '../../db/models/user.model.js';
import storyModel from '../../db/models/story.model.js';

const makeUser = async (overrides = {}) =>
  userModel.create({
    firstName: 'Test',
    lastName: 'User',
    email: `test.${Date.now()}.${Math.random()}@example.com`,
    password: 'hashed-not-real',
    confirmed: true,
    ...overrides,
  });

describe('story.service', () => {
  describe('getStoryFeedForUser', () => {
    it('groups stories by author, self-first, unseen-before-seen, excludes expired', async () => {
      const viewer = await makeUser();
      const followedUnseen = await makeUser();
      const followedSeen = await makeUser();
      const notFollowed = await makeUser();

      viewer.following.push(followedUnseen._id, followedSeen._id);
      await viewer.save();

      await storyModel.create({
        userId: viewer._id,
        image: { secure_url: 'https://example.com/own.png', public_id: 'own' },
      });

      await storyModel.create({
        userId: followedUnseen._id,
        image: { secure_url: 'https://example.com/u.png', public_id: 'u' },
      });

      await storyModel.create({
        userId: followedSeen._id,
        image: { secure_url: 'https://example.com/s.png', public_id: 's' },
        viewers: [{ userId: viewer._id }],
      });

      await storyModel.create({
        userId: notFollowed._id,
        image: { secure_url: 'https://example.com/n.png', public_id: 'n' },
      });

      await storyModel.create({
        userId: followedUnseen._id,
        image: { secure_url: 'https://example.com/expired.png', public_id: 'expired' },
        expiresAt: new Date(Date.now() - 1000),
      });

      const feed = await getStoryFeedForUser(viewer);

      expect(feed).toHaveLength(3); // self, followedUnseen, followedSeen — not notFollowed
      expect(String(feed[0].user._id)).toBe(String(viewer._id));
      expect(feed[0].hasUnseen).toBe(false); // own story never counts as unseen

      const unseenGroup = feed.find((g) => String(g.user._id) === String(followedUnseen._id));
      expect(unseenGroup.hasUnseen).toBe(true);
      expect(unseenGroup.stories).toHaveLength(1); // the expired one is excluded

      const seenGroup = feed.find((g) => String(g.user._id) === String(followedSeen._id));
      expect(seenGroup.hasUnseen).toBe(false);

      const notFollowedGroup = feed.find((g) => String(g.user._id) === String(notFollowed._id));
      expect(notFollowedGroup).toBeUndefined();
    });
  });
});
