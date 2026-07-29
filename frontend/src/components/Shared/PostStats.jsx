import { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router';
import { UserContext } from '@/Context/UserContext';
import Comments from './Comments';
import toast from 'react-hot-toast';
import api from '@/api/axios';

const PostStats = ({ post, userId }) => {
  const location = useLocation();
  const likesList = post.likes || [];
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState(likesList);
  const [isSaved, setIsSaved] = useState(false);
  const { userToken } = useContext(UserContext);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    const fetchSaveStatusAndCommentCount = async () => {
      try {
        // Use Promise.all to make parallel API calls for better performance
        const [savedResponse, commentResponse] = await Promise.all([
          api.get(`/api/v1/auth/post/${post._id}/is-saved`, {
            headers: { Authorization: `Bearer ${userToken}` },
          }),
          api.get(`/api/v1/auth/post/${post._id}/comment`, {
            headers: { Authorization: `Bearer ${userToken}` },
          })
        ]);

        setIsSaved(savedResponse.data.isSaved);

        // Process comment count response
        setCommentCount(commentResponse.data.commentCount);
      } catch (err) {
        toast.error('Error fetching post details.');
      }
    };

    fetchSaveStatusAndCommentCount();
  }, [post._id, userToken]);

  const handleLikePost = async (e) => {
    e.stopPropagation();
    const isLiked = likes.includes(userId);

    try {
      await api.put(
        `/api/v1/auth/post/${post._id}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      setLikes(isLiked ? likes.filter((id) => id !== userId) : [...likes, userId]);
      toast.success(isLiked ? 'Post unliked.' : 'Post liked.');
    } catch (err) {
      toast.error('Error liking/unliking post.');
    }
  };

  const handleSavePost = async (e) => {
    e.stopPropagation();

    try {
      if (isSaved) {
        await api.delete(
          `/api/v1/auth/post/${post._id}/save`,
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          }
        );
        setIsSaved(false);
        toast.success('Post unsaved.');
      } else {
        await api.put(
          `/api/v1/auth/post/${post._id}/save`,
          {},
          {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
          }
        );
        setIsSaved(true);
        toast.success('Post saved.');
      }
    } catch (err) {
      toast.error('Error saving/unsaving post.');
    }
  };

  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  const handleCommentCountUpdate = (newCount) => {
    setCommentCount(newCount);
  };

  const containerStyles = location.pathname.startsWith('/profile') ? 'w-full' : '';

  return (
    <>
      <div className={`flex justify-between items-center z-20 ${containerStyles}`}>
        <div className='flex justify-between items-center'>
          <div className='flex gap-2 mr-5'>
            <img
              src={
                likes.includes(userId)
                  ? '/assets/images/liked.svg'
                  : '/assets/images/like.svg'
              }
              alt='like'
              width={20}
              height={20}
              onClick={handleLikePost}
              className='cursor-pointer'
            />
            <p className='small-medium lg:base-medium'>{likes.length}</p>
          </div>

          <div className='flex gap-2 mr-5'>
            <img
              src='/assets/images/chat.svg'
              alt='comment'
              width={21}
              height={21}
              className='cursor-pointer'
              onClick={handleToggleComments}
            />
            <p className="small-medium lg:base-medium">{commentCount}</p>
          </div>
        </div>

        <div className='flex gap-2'>
          <img
            src={isSaved ? '/assets/images/saved.svg' : '/assets/images/save.svg'}
            alt='save'
            width={20}
            height={20}
            className='cursor-pointer'
            onClick={handleSavePost}
          />
        </div>
      </div>

      <div className='mt-4'>
        {showComments && (
          <Comments 
            postId={post._id} 
            onCommentCountChange={handleCommentCountUpdate}
            initialCommentCount={commentCount}
          />
        )}
      </div>
    </>
  );
};

export default PostStats;