import storyModel from "../../../db/models/story.model.js";
import { asyncHandler } from "../../../helpers/globleErrorHandling.js";
import { AppError } from "../../../helpers/classError.js";
import cloudinary from "../../../helpers/cloudinary.js";
import { getStoryFeedForUser } from './story.service.js';


//**** Create Story ****//
export const createStory = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  if (!req.uploadedImage) {
    return next(new AppError("Image upload failed", 400));
  }

  const { secure_url, public_id } = req.uploadedImage;

  const newStory = await storyModel.create({
    userId,
    image: { secure_url, public_id },
  });

  res.status(201).json({
    message: "Story created successfully",
    story: newStory,
  });
});


//**** Get Story Feed (own + followed users, grouped by author) ****//
export const getStoryFeed = asyncHandler(async (req, res, next) => {
  const feed = await getStoryFeedForUser(req.user);

  res.status(200).json({
    message: "Story feed fetched successfully",
    documents: feed,
  });
});


//**** Record a Story View ****//
export const viewStory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const story = await storyModel.findById(id).select("userId");
  if (!story) {
    return next(new AppError("Story not found", 404));
  }

  if (story.userId.toString() === userId.toString()) {
    return res.status(200).json({ message: "Own story, view not recorded" });
  }

  // Atomic: the $push only applies when the filter (no existing viewer with this
  // userId) matches, so two concurrent requests for the same story can't both
  // pass a separate "already viewed?" check and each push a duplicate entry.
  await storyModel.updateOne(
    { _id: id, "viewers.userId": { $ne: userId } },
    { $push: { viewers: { userId } } }
  );

  res.status(200).json({ message: "Story view recorded" });
});


//**** Get Story Viewers (owner-only) ****//
export const getStoryViewers = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const story = await storyModel.findById(id).populate({
    path: "viewers.userId",
    select: "firstName lastName profileImage",
  });

  if (!story) {
    return next(new AppError("Story not found", 404));
  }

  if (story.userId.toString() !== userId.toString()) {
    return next(new AppError("You are not authorized to view this story's viewers", 403));
  }

  res.status(200).json({
    message: "Story viewers fetched successfully",
    viewers: story.viewers,
  });
});


//**** Delete Story (owner-only, early delete before natural expiry) ****//
export const deleteStory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const story = await storyModel.findById(id);
  if (!story) {
    return next(new AppError("Story not found", 404));
  }

  if (story.userId.toString() !== userId.toString()) {
    return next(new AppError("You are not authorized to delete this story", 403));
  }

  // Guard against destroying the shared default placeholder image, same as
  // the profile-image cleanup (see ADR-002's original incident and ADR-020).
  if (story.image?.public_id && story.image.public_id !== process.env.defaultpuplicPic) {
    await cloudinary.uploader.destroy(story.image.public_id).catch((error) => {
      console.error("Error deleting story image from Cloudinary:", error.message);
    });
  }

  await storyModel.deleteOne({ _id: id });

  res.status(200).json({
    message: "Story deleted successfully",
    storyId: story._id,
  });
});
