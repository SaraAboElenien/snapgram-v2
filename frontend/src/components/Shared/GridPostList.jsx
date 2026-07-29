import { useContext } from 'react';
import { Link } from 'react-router'
import PostStats from './PostStats'
import { UserContext } from '@/Context/UserContext'
import { getOptimizedImageUrl } from '@/lib/utils'

const GridPostList = ({ posts, showUser = true, showStats = true }) => {
  const { userData } = useContext(UserContext)

  return (
    <ul className='grid-container'>
      {posts.map(post => {

        
        return (
          <li key={post._id} className='relative min-w-72 h-80'>
            <Link to={`/posts/${post._id}`} className='grid-post_link'>
              <img
                src={getOptimizedImageUrl(post.image.secure_url, 'thumbnail')}
                alt='Post'
                className='h-full w-full object-cover'
                onError={e => {
                  e.target.src = '/assets/images/profile-placeholder.svg'
                }}
              />
            </Link>

            <div className='grid-post_user'>
              {showUser && post.userId && (
                <div className='flex items-center justify-start gap-2 flex-1'>
                  <img
                    src={
                      getOptimizedImageUrl(post.userId?.profileImage.secure_url, 'avatar') || ''}
                    alt={`${post.userId?.firstName || 'User'}'s Profile`}
                    className='w-8 h-8 rounded-full'
                    onError={e => {
                      e.target.src = '/assets/images/profile-placeholder.svg'
                    }}
                  />
                  <p className='line-clamp-1 text-light-1'>
                    {`${post.userId?.firstName || 'Unknown'} ${
                      post.userId?.lastName || ''
                    }`}
                  </p>
                </div>
              )}
              {showStats && <PostStats post={post} userId={userData?._id} />}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default GridPostList
