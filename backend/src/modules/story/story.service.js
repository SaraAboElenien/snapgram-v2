import storyModel from "../../../db/models/story.model.js";

export const getStoryFeedForUser = async (currentUser) => {
  const authorIds = [currentUser._id, ...currentUser.following];

  const stories = await storyModel
    .find({ userId: { $in: authorIds }, expiresAt: { $gt: new Date() } })
    .sort({ createdAt: 1 })
    .populate({ path: "userId", select: "firstName lastName profileImage" });

  const groupedByAuthor = new Map();

  for (const story of stories) {
    const authorId = story.userId._id.toString();

    if (!groupedByAuthor.has(authorId)) {
      groupedByAuthor.set(authorId, {
        user: story.userId,
        stories: [],
        hasUnseen: false,
      });
    }

    const group = groupedByAuthor.get(authorId);
    const isOwnStory = authorId === currentUser._id.toString();
    const isSeen = story.viewers.some(
      (viewer) => viewer.userId.toString() === currentUser._id.toString()
    );

    if (!isOwnStory && !isSeen) {
      group.hasUnseen = true;
    }

    group.stories.push(story);
  }

  return Array.from(groupedByAuthor.values()).sort((a, b) => {
    const aIsSelf = a.user._id.toString() === currentUser._id.toString();
    const bIsSelf = b.user._id.toString() === currentUser._id.toString();
    if (aIsSelf !== bIsSelf) return aIsSelf ? -1 : 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return 0;
  });
};
