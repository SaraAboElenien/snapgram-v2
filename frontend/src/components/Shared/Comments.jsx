import { useState, useEffect, useContext, useCallback } from "react";
import { UserContext } from "@/Context/UserContext";
import { Link } from "react-router";
import { multiFormatDateString, getOptimizedImageUrl } from "@/lib/utils";
import { toast } from "react-hot-toast";
import api from '@/api/axios';

const Comments = ({ postId, onCommentCountChange, initialCommentCount }) => {
  const { userToken, userData } = useContext(UserContext);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isLoading, setIsLoading] = useState(true);

  const updateCommentCount = useCallback((newCount) => {
    setCommentCount(newCount);
    onCommentCountChange(newCount);
  }, [onCommentCountChange]);

  const fetchComments = useCallback(async () => {
    try {
      const response = await api.get(
        `/api/v1/auth/post/${postId}/comment`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      setComments(response.data.comments);
      updateCommentCount(response.data.commentCount);
    } catch {
      toast.error("Error fetching comments.");
    } finally {
      setIsLoading(false);
    }
  }, [postId, userToken, updateCommentCount]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async () => {
    if (newComment.trim() === "") return;

    try {
      const response = await api.post(
        `/api/v1/auth/post/${postId}/comment/add`,
        { comment: newComment },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.data && response.data.comment) {
        const newCommentWithUser = {
          ...response.data.comment,
          userId: {
            _id: userData._id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImage: userData.profileImage
          }
        };
        setComments([...comments, newCommentWithUser]);
        updateCommentCount(commentCount + 1);
        setNewComment("");
        toast.success("Comment added.");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Error adding comment.");
    }
  };

  const handleEditComment = async (commentId) => {
    try {
      const response = await api.put(
        `/api/v1/auth/post/${postId}/comment/edit/${commentId}`,
        { content: editedCommentText },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      
      setComments(
        comments.map((comment) =>
          comment._id === commentId ? {
            ...response.data.comment,
            userId: comment.userId
          } : comment
        )
      );
      setEditingCommentId(null);
      setEditedCommentText("");
      toast.success("Comment edited.");
    } catch {
      toast.error("Error editing comment.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(
        `/api/v1/auth/post/${postId}/comment/${commentId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      setComments(comments.filter((comment) => comment._id !== commentId));
      updateCommentCount(commentCount - 1);
      toast.success("Comment deleted.");
    } catch {
      toast.error("Error deleting comment.");
    }
  };

  const handleLikeComment = async (commentId, e) => {
    e.stopPropagation();
    const updatedComments = [...comments];
    const commentIndex = updatedComments.findIndex(
      (comment) => comment._id === commentId
    );
    const comment = updatedComments[commentIndex];
    const isLiked = comment.likes.includes(userData._id);

    try {
      await api.patch(
        `/api/v1/auth/post/${postId}/comment/${commentId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      if (isLiked) {
        comment.likes = comment.likes.filter((id) => id !== userData._id);
      } else {
        comment.likes.push(userData._id);
      }
      setComments(updatedComments);
      toast.success(isLiked ? "Comment unliked." : "Comment liked.");
    } catch {
      toast.error("Error liking/unliking comment.");
    }
  };

  return (
    <div className="post-comments mt-20">
      {isLoading && <p>Loading comments...</p>}
      {!isLoading && comments.length === 0 && <p>No comments yet.</p>}
      {comments.map((comment) =>
        comment && (
          <div key={comment._id} className="flex flex-col gap-3 mb-4 post-card">
            <div className="flex items-start gap-3">
              <Link to={`/profile/${comment?.userId?._id}`}>
                <img
                  src={getOptimizedImageUrl(comment?.userId?.profileImage?.secure_url, 'avatar') || "/assets/images/default-user.png"}
                  alt="User"
                  className="w-12 lg:h-12 rounded-full"
                  onError={(e) => (e.target.src = "/assets/images/default-user.png")}
                />
              </Link>
              <div className="flex flex-col flex-grow">
                <p className="base-medium lg:body-bold text-light-1">
                  {comment?.userId?.firstName || "Unknown"} {comment?.userId?.lastName || "User"}
                </p>
                <p className="subtle-semibold lg:small-regular text-light-3">
                  {multiFormatDateString(comment?.createdAt)}
                </p>
              </div>
              {userToken && userData?._id === comment.userId._id && (
                <div className="flex gap-2">
                  <img
                    src={"/assets/images/edit.svg"}
                    alt="Edit Comment"
                    width={20}
                    height={20}
                    className="cursor-pointer"
                    onClick={() => {
                      setEditingCommentId(comment._id);
                      setEditedCommentText(comment.comment);
                    }}
                  />
                  <img
                    src="/assets/images/delete.svg"
                    alt="Delete Comment"
                    width={20}
                    height={20}
                    className="cursor-pointer"
                    onClick={() => handleDeleteComment(comment._id)}
                  />
                </div>
              )}
            </div>
            {editingCommentId === comment._id ? (
              <div className="flex flex-between">
                <input
                  type="text"
                  value={editedCommentText}
                  onChange={(e) => setEditedCommentText(e.target.value)}
                  placeholder="Edit your comment"
                  className="post-card"
                />
                <img
                  src="/assets/images/chat.svg"
                  width={35}
                  height={35}
                  className="cursor-pointer"
                  onClick={() => handleEditComment(comment._id)}
                />
              </div>
            ) : (
              <div className="flex flex-between">
                <p>{comment.comment}</p>
                <div className="flex gap-2 mr-5">
                  <img
                    src={
                      comment.likes.includes(userData._id)
                        ? "/assets/images/liked.svg"
                        : "/assets/images/like.svg"
                    }
                    alt="like"
                    width={20}
                    height={20}
                    onClick={(e) => handleLikeComment(comment._id, e)}
                    className="cursor-pointer"
                  />
                  <p className="small-medium lg:base-medium">
                    {comment.likes.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      {editingCommentId === null && (
        <div className="add-comment flex flex-between">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="post-card"
          />
          <img
            src="/assets/images/postcomment.webp"
            width={35}
            height={35}
            className="cursor-pointer"
            onClick={handleAddComment}
          />
        </div>
      )}
    </div>
  );
};

export default Comments;