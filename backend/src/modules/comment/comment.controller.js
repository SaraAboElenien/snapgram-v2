import commentModel from '../../../db/models/comment.model.js'; 
import { asyncHandler } from '../../../helpers/globleErrorHandling.js'; 
import { AppError } from '../../../helpers/classError.js';
import postModel from '../../../db/models/post.model.js';
import notificationModel from '../../../db/models/notification.model.js';


// Add a Comment //
export const createComment = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const { comment } = req.body;
  const userId = req.user._id;

  if (!comment) {
    return next(new AppError("Comment content is required", 400));
  }

  const post = await postModel.findById(postId).populate("userId", "firstName lastName profileImage");
  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  const newComment = await commentModel.create({
    comment,
    postId,
    userId,
  });

  post.comments.push(newComment._id);
  await post.save();

  if (post.userId._id.toString() !== userId.toString()) {
    await notificationModel.create({
      receiver: post.userId._id,
      sender: userId,
      type: "comment",
      post: post._id,
      content: ` commented on your post.`,
    });
  }

  res.status(201).json({
    message: "Comment added successfully",
    comment: newComment,
  });
});




  // Edit Comment // 
  export const updateComment = asyncHandler(async (req, res, next) => {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    if (!content) {
      return next(new AppError("Comment content is required", 400));
    }
  
    const comment = await commentModel.findById(commentId);
    if (!comment) {
      return next(new AppError("Comment not found", 404));
    }
    if (comment.userId.toString() !== req.user._id.toString()) {
      return next(new AppError("You are not authorized to update this comment", 403));
    }
    comment.comment = content;
    await comment.save();
  
    res.status(200).json({
      message: "Comment updated successfully",
      comment,
    });
  });
    

// Delete Comment
export const deleteComment = asyncHandler(async (req, res, next) => {
  const { postId, commentId } = req.params;

  const comment = await commentModel.findById(commentId);
  if (!comment) {
    return next(new AppError("Comment not found", 404));
  }

  if (comment.userId.toString() !== req.user._id.toString()) {
    return next(new AppError("You are not authorized to delete this comment", 403));
  }
  await comment.deleteOne();
  const post = await postModel.findById(postId);
  if (post) {
    post.comments.pull(commentId);
    await post.save();
  }

  res.status(200).json({
    message: "Comment deleted successfully",
  });
});



// Get Comments For A Post
export const getComments = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;

  const post = await postModel.findById(postId)
    .populate({
      path: 'comments',
      populate: {
        path: 'userId',
        select: 'firstName lastName profileImage',
      },
    });

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  const commentCount = post.comments.length;

  res.status(200).json({
    message: "Comments fetched successfully",
    comments: post.comments,
    commentCount,
  });
});
  




// Reply to a Comment
export const replyToComment = asyncHandler(async (req, res, next) => {
  const { postId, commentId } = req.params;
  const { comment } = req.body;
  const userId = req.user._id;

  const existingComment = await commentModel.findOne({ _id: commentId, postId });
  if (!existingComment) {
    return next(new AppError("Comment not found", 404));
  }

  const reply = {
    userId,
    comment,
  };

  existingComment.replies.push(reply);
  await existingComment.save();

  res.status(201).json({
    message: "Reply added successfully",
    reply,
  });
});






// Like or Unlike a Comment
export const likeComment = asyncHandler(async (req, res, next) => {
  const { postId, commentId } = req.params;
  const userId = req.user._id;

  const comment = await commentModel.findOne({ _id: commentId, postId });
  if (!comment) {
    return next(new AppError("Comment not found", 404));
  }

  const hasLiked = comment.likes.includes(userId);

  if (hasLiked) {
    comment.likes = comment.likes.filter((id) => id.toString() !== userId.toString());
    await comment.save();

    return res.status(200).json({
      message: "Comment unliked successfully",
      likesCount: comment.likes.length,
    });
  } else {
    comment.likes.push(userId);
    await comment.save();

    return res.status(200).json({
      message: "Comment liked successfully",
      likesCount: comment.likes.length,
    });
  }
});   
