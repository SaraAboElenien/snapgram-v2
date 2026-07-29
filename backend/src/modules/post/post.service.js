import postModel from "../../../db/models/post.model.js";
import userModel from "../../../db/models/user.model.js";
import commentModel from "../../../db/models/comment.model.js";
import notificationModel from "../../../db/models/notification.model.js";
import { AppError } from "../../../helpers/classError.js";
import { nanoid } from "nanoid";
import cloudinary from '../../../helpers/cloudinary.js';

export const createPostForUser = async ({ userId, description, tags, location, uploadedImage }) => {
  if (!description) {
    throw new AppError("Post description is required", 400);
  }

  if (!uploadedImage) {
    throw new AppError("Image upload failed", 400);
  }

  const { secure_url, public_id } = uploadedImage;
  const customId = nanoid(5);

  try {
    const newPost = await postModel.create({
      userId,
      description,
      image: { secure_url, public_id },
      customId,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      location: location || "",
    });

    if (!newPost) {
      throw new AppError("Failed to create post", 500);
    }

    const user = await userModel.findById(userId).select("followers");
    if (user?.followers?.length > 0) {
      const notifications = user.followers.map((followerId) => ({
        receiver: followerId,
        sender: userId,
        type: "newPost",
        content: `has posted: ${description.slice(0, 30)}...`,
        post: newPost._id,
      }));

      notificationModel.insertMany(notifications).catch((error) => {
        console.error("Error creating notifications:", error.message);
      });
    }

    return newPost;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Error creating post: ${error.message}`, 500);
  }
};

export const deletePostForUser = async ({ postId, requesterId }) => {
  const post = await postModel.findById(postId);
  if (!post) {
    throw new AppError("Post not found", 404);
  }

  if (post.userId.toString() !== requesterId.toString()) {
    throw new AppError("You are not authorized to delete this post", 403);
  }

  await commentModel.deleteMany({ postId });
  await notificationModel.deleteMany({ post: postId });
  await userModel.updateMany({ savedPosts: postId }, { $pull: { savedPosts: postId } });

  // Guard against destroying the shared default placeholder image, same as
  // the profile-image cleanup already does — a real post should never
  // legitimately reference it, but this makes that assumption unnecessary
  // to rely on (see ADR-002's original incident and ADR-020).
  if (post.image?.public_id && post.image.public_id !== process.env.defaultpuplicPic) {
    await cloudinary.uploader.destroy(post.image.public_id).catch((error) => {
      console.error("Error deleting post image from Cloudinary:", error.message);
    });
  }

  await postModel.deleteOne({ _id: postId });

  return post;
};
