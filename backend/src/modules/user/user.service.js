import mongoose from 'mongoose';
import userModel from '../../../db/models/user.model.js';
import postModel from '../../../db/models/post.model.js';
import commentModel from '../../../db/models/comment.model.js';
import notificationModel from '../../../db/models/notification.model.js';
import storyModel from '../../../db/models/story.model.js';
import conversationModel from '../../../db/models/conversation.model.js';
import messageModel from '../../../db/models/message.model.js';
import cloudinary from '../../../helpers/cloudinary.js';
import { AppError } from '../../../helpers/classError.js';

export const deleteUserAccount = async (user) => {
    const ownPosts = await postModel.find({ userId: user._id });
    const ownPostIds = ownPosts.map((post) => post._id);

    // Comments this user left on posts they don't own must be pulled from
    // those posts' `comments` arrays before the comments themselves are deleted.
    const commentsOnOtherPosts = await commentModel.find({
        userId: user._id,
        postId: { $nin: ownPostIds },
    });

    if (commentsOnOtherPosts.length) {
        await postModel.updateMany(
            { _id: { $in: commentsOnOtherPosts.map((comment) => comment.postId) } },
            { $pull: { comments: { $in: commentsOnOtherPosts.map((comment) => comment._id) } } }
        );
    }

    await commentModel.deleteMany({
        $or: [{ postId: { $in: ownPostIds } }, { userId: user._id }],
    });

    // Guard against destroying the shared default placeholder image, same as
    // the profileImage cleanup below — a real post should never legitimately
    // reference it, but this makes that assumption unnecessary to rely on
    // (see ADR-002's original incident and ADR-020).
    await Promise.all(
        ownPosts
            .filter((post) => post.image?.public_id && post.image.public_id !== process.env.defaultpuplicPic)
            .map((post) =>
                cloudinary.uploader.destroy(post.image.public_id).catch((error) => {
                    console.error("Error deleting post image from Cloudinary:", error.message);
                })
            )
    );

    await postModel.deleteMany({ userId: user._id });

    if (user.profileImage?.public_id && user.profileImage.public_id !== process.env.defaultpuplicPic) {
        await cloudinary.uploader.destroy(user.profileImage.public_id).catch((error) => {
            console.error("Error deleting profile image from Cloudinary:", error.message);
        });
    }

    await notificationModel.deleteMany({
        $or: [{ receiver: user._id }, { sender: user._id }],
    });

    const ownStories = await storyModel.find({ userId: user._id });
    await Promise.all(
        ownStories
            .filter((story) => story.image?.public_id && story.image.public_id !== process.env.defaultpuplicPic)
            .map((story) =>
                cloudinary.uploader.destroy(story.image.public_id).catch((error) => {
                    console.error("Error deleting story image from Cloudinary:", error.message);
                })
            )
    );
    await storyModel.deleteMany({ userId: user._id });
    await storyModel.updateMany(
        { "viewers.userId": user._id },
        { $pull: { viewers: { userId: user._id } } }
    );

    const ownConversations = await conversationModel.find({ participants: user._id });
    const ownConversationIds = ownConversations.map((conversation) => conversation._id);
    await messageModel.deleteMany({ conversationId: { $in: ownConversationIds } });
    await conversationModel.deleteMany({ _id: { $in: ownConversationIds } });

    await userModel.updateMany(
        { $or: [{ followers: user._id }, { following: user._id }, { savedPosts: { $in: ownPostIds } }] },
        { $pull: { followers: user._id, following: user._id, savedPosts: { $in: ownPostIds } } }
    );

    const deletedUser = await userModel.findByIdAndDelete(user._id);
    if (!deletedUser) {
        throw new AppError("User not found!", 404);
    }
};

export const followOrUnfollowUser = async ({ userId, targetId, action }) => {
    if (targetId === userId) {
        throw new AppError("You cannot follow/unfollow yourself.", 400);
    }

    const session = await mongoose.startSession();

    try {
        let responsePayload;

        await session.withTransaction(async () => {
            const currentUser = await userModel.findById(userId).session(session);
            const targetUser = await userModel.findById(targetId).session(session);

            if (!currentUser || !targetUser) {
                throw new AppError("One or both users not found", 404);
            }

            if (action === "follow") {
                if (currentUser.following.includes(targetId)) {
                    throw new AppError("Already following this user.", 400);
                }
                currentUser.following.push(targetId);
                targetUser.followers.push(userId);

                await notificationModel.create([{
                    receiver: targetId,
                    sender: userId,
                    type: "follow",
                    content: `started following you.`,
                }], { session });
            } else if (action === "unfollow") {
                if (!currentUser.following.includes(targetId)) {
                    throw new AppError("You are not following this user.", 400);
                }
                currentUser.following.pull(targetId);
                targetUser.followers.pull(userId);
            } else {
                throw new AppError("Invalid action specified", 400);
            }

            await currentUser.save({ session });
            await targetUser.save({ session });

            responsePayload = {
                message: `User successfully ${action === "follow" ? "followed" : "unfollowed"}!`,
                followersCount: targetUser.followers.length,
            };
        });

        return responsePayload;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error("Error updating follow status:", error);
        throw new AppError("Error updating follow status", 500);
    } finally {
        await session.endSession();
    }
};
