import { useContext } from 'react';
import { Link } from 'react-router';
import { UserContext } from '@/Context/UserContext';
import PostStats from '@/components/Shared/PostStats';
import { multiFormatDateString, getOptimizedImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

const PostCard = ({ post }) => {
  const { userToken, userData } = useContext(UserContext);

  if (!post.userId) return null;

  const handleEditClick = () => {
    toast.success('Navigating to edit post.');
  };

  return (
    <div className='post-card'>
      <div className='flex-between'>
        <div className='flex items-center gap-3'>
          <Link to={`/profile/${post.userId._id}`}>
            <img
              src={getOptimizedImageUrl(post.userId.profileImage.secure_url, 'avatar')}
              alt={`${post.userId.firstName}'s Profile`}
              className='w-12 lg:h-12 rounded-full'
              onError={(e) => {
                e.target.src = "/assets/images/profile-placeholder.svg";
              }}
            />
          </Link>
          <div className='flex flex-col'>
            <p className='base-medium lg:body-bold text-light-1'>
              {post.userId.firstName} {post.userId.lastName}
            </p>
            <div className='flex-center gap-2 text-light-3'>
              <p className='subtle-semibold lg:small-regular'>
                {multiFormatDateString(post.createdAt)}
              </p>
              {post.location && (
                <>
                  •
                  <p className='subtle-semibold lg:small-regular'>
                    {post.location}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
        {userToken && userData?._id === post.userId._id && (
          <Link to={`/update-post/${post._id}`} onClick={handleEditClick}>
            <img src={"/assets/images/edit.svg"} alt='Edit Post' width={20} height={20} />
          </Link>
        )}
      </div>

      <Link to={`/posts/${post._id}`}>
        <div className='small-medium lg:base-medium py-5'>
          <p>{post.description}</p>
          {post.tags && post.tags.length > 0 && (
            <ul className='flex gap-1 mt-2'>
              {post.tags.map((tag, index) => (
                <li
                  key={`${tag}-${index}`}
                  className='text-light-3 small-regular'
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {post.image && (
          <img
          src={getOptimizedImageUrl(post.image.secure_url, 'full')}
            alt='Post'
            className='post-card_img'
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
      </Link>

      <PostStats post={post} userId={userData ? userData._id : null} />
    </div>
  );
};

export default PostCard;
