import postModel from "../../../db/models/post.model.js";
import { asyncHandler } from "../../../helpers/globleErrorHandling.js";
import { AppError } from "../../../helpers/classError.js";
import userModel from "../../../db/models/user.model.js";
import { ApiFeatures } from "../../../helpers/ApiFeatures.js";
import notificationModel from "../../../db/models/notification.model.js";
import cloudinary from '../../../helpers/cloudinary.js';
import { createPostForUser, deletePostForUser } from './post.service.js';


export const createPost = asyncHandler(async (req, res, next) => {
  const { description, tags, location } = req.body;
  const userId = req.user._id;

  const newPost = await createPostForUser({
    userId,
    description,
    tags,
    location,
    uploadedImage: req.uploadedImage,
  });

  res.status(201).json({
    message: "Post created successfully",
    post: newPost,
  });
});



//**** Update Post ****//
export const updatePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { description, location, tags } = req.body;

  const post = await postModel.findById(id);
  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  if (description) post.description = description;
  if (location) post.location = location;
  if (tags) post.tags = tags.split(",").map((tag) => tag.trim());

  if (req.uploadedImage) {
    try {
      if (post.image?.public_id) {
        await cloudinary.uploader.destroy(post.image.public_id);
      }

      const { secure_url, public_id } = req.uploadedImage;
      post.image = { secure_url, public_id };
    } catch (error) {
      return next(new AppError(`Error updating image: ${error.message}`, 500));
    }
  }

  const updatedPost = await post.save();
  if (!updatedPost) {
    return next(new AppError("Failed to update post", 500));
  }

  res.status(200).json({
    message: "Post updated successfully",
    post: updatedPost,
  });
});






// post's search, filter, sort, pagination, and select
export const getRecentPosts = asyncHandler(async (req, res, next) => {
  let mongooseQuery = postModel.find().populate({
    path: "userId",
    select: "firstName lastName profileImage",
  });

  const apiFeatures = new ApiFeatures(mongooseQuery, req.query)
    .sort("-createdAt")
    .pagination()
    .search()
    .filter(["userId", "tags", "location", "likes", "createdAt"])
    .select();

  const posts = await apiFeatures.mongooseQuery;
  const hasNextPage = posts.length > apiFeatures.limit;
  if (hasNextPage) posts.pop();

  res.status(200).json({
    message: "Posts fetched successfully",
    documents: posts,
    hasNextPage,
  });
});



//**** Get Most-Used Tags Across Posts ****//
export const getPopularTags = asyncHandler(async (req, res) => {
  const tags = await postModel.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
    { $project: { _id: 0, tag: "$_id", count: 1 } },
  ]);

  res.status(200).json({ tags });
});

//**** Get Specific Post by ID ****//
export const getSpecificPost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const post = await postModel.findById(id).populate({
    path: "userId",
    select: "firstName lastName profileImage",
  });

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  res.status(200).json({
    message: "Post fetched successfully",
    post: post,
  });
});

/** Like or unlike a post **/
export const likePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await postModel
    .findById(id)
    .populate("userId", "firstName lastName");

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  const isLiked = post.likes.includes(userId);

  if (isLiked) {
    post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
  } else {
    post.likes.push(userId);

    if (post.userId._id.toString() !== userId.toString()) {
      const existingNotification = await notificationModel.findOne({
        receiver: post.userId._id,
        sender: userId,
        type: "like",
        post: post._id,
      });

      if (!existingNotification) {
        await notificationModel.create({
          receiver: post.userId._id,
          sender: userId,
          type: "like",
          post: post._id,
          content: `liked your post.`,
        });
      }
    }
  }

  await post.save();

  res.status(200).json({
    message: isLiked ? "Post unliked" : "Post liked",
    likesCount: post.likes.length,
  });
});

/** Save a post **/
export const savePost = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await postModel.findById(postId);

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  const user = await userModel.findById(userId);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const isSaved = user.savedPosts.includes(postId);

  if (isSaved) {
    return next(new AppError("Post is already saved", 400));
  }

  user.savedPosts.push(postId);
  await user.save();

  if (post.userId.toString() !== userId.toString()) {
    const existingNotification = await notificationModel.findOne({
      receiver: post.userId,
      sender: userId,
      type: "save",
      post: post._id,
    });

    if (!existingNotification) {
      await notificationModel.create({
        receiver: post.userId,
        sender: userId,
        type: "save",
        post: post._id,
        content: `saved your post.`,
      });
    }
  }

  res.status(200).json({
    message: "Post saved successfully",
  });
});

/** Delete a saved post **/
export const deleteSavedPost = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const user = await userModel.findById(userId);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const isSaved = user.savedPosts.includes(postId);

  if (!isSaved) {
    return next(new AppError("Post is not saved", 400));
  }

  user.savedPosts = user.savedPosts.filter(
    (id) => id.toString() !== postId.toString()
  );
  await user.save();

  res.status(200).json({
    message: "Saved post deleted successfully",
  });
});

/** Get Saved Posts (paginated; ordered by post creation date — savedPosts has no
 * per-save timestamp to order by true save-order, see ADR-021) **/
export const getSavedPosts = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const user = await userModel.findById(userId).select("savedPosts");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const mongooseQuery = postModel
    .find({ _id: { $in: user.savedPosts } })
    .sort({ createdAt: -1 })
    .select("description image likes");

  const apiFeatures = new ApiFeatures(mongooseQuery, req.query).pagination();
  const savedPosts = await apiFeatures.mongooseQuery;
  const hasNextPage = savedPosts.length > apiFeatures.limit;
  if (hasNextPage) savedPosts.pop();

  res.status(200).json({
    message: "Saved posts fetched successfully",
    documents: savedPosts,
    hasNextPage,
  });
});

/** Check whether the current user has a given post saved — a dedicated cheap
 * existence check, so per-post-card UI doesn't need to fetch the whole saved
 * list just to answer one boolean (see ADR-021). **/
export const isPostSaved = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const exists = await userModel.exists({ _id: userId, savedPosts: id });

  res.status(200).json({
    message: "Save status fetched successfully",
    isSaved: !!exists,
  });
});

//**Posts by a Specific User (paginated)**//
export const getUserPosts = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError("User ID is required", 400));
  }

  const mongooseQuery = postModel
    .find({ userId })
    .sort({ createdAt: -1 })
    .populate({
      path: "userId",
      select: "firstName lastName profileImage",
    });

  const apiFeatures = new ApiFeatures(mongooseQuery, req.query).pagination();
  const posts = await apiFeatures.mongooseQuery;
  const hasNextPage = posts.length > apiFeatures.limit;
  if (hasNextPage) posts.pop();

  const totalCount = await postModel.countDocuments({ userId });

  res.status(200).json({
    message: "User posts fetched successfully",
    documents: posts,
    hasNextPage,
    totalCount,
  });
});

//** Get Liked Posts (paginated; now sorted newest-first — previously had no sort at all) **//
export const getLikedPosts = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const mongooseQuery = postModel.find({ likes: id }).select("-updatedAt").sort({ createdAt: -1 });

  const apiFeatures = new ApiFeatures(mongooseQuery, req.query).pagination();
  const likedPosts = await apiFeatures.mongooseQuery;
  const hasNextPage = likedPosts.length > apiFeatures.limit;
  if (hasNextPage) likedPosts.pop();

  const totalCount = await postModel.countDocuments({ likes: id });

  res.status(200).json({
    message: "Liked posts retrieved successfully",
    documents: likedPosts,
    hasNextPage,
    totalCount,
  });
});




//*** Delete a post***/
export const deletePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const post = await deletePostForUser({ postId: id, requesterId: req.user._id });

  res.status(200).json({
    message: "Post deleted successfully",
    postId: post._id,
  });
});