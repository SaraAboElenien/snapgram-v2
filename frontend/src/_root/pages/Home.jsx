import { useEffect, useRef, useState, useContext, useCallback } from 'react';
import api from '@/api/axios';
import Loader from '@/components/Shared/Loader';
import PostCard from '@/components/Shared/PostCard';
import UserCard from '@/components/Shared/UserCard';
import StoriesBar from '@/components/Shared/StoriesBar';
import { UserContext } from '@/Context/UserContext';
import { toast } from 'react-hot-toast';

const POSTS_PER_PAGE = 10;

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [creators, setCreators] = useState([]);
  const [isPostLoading, setIsPostLoading] = useState(true);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isErrorPosts, setIsErrorPosts] = useState(false);
  const [isErrorCreators, setIsErrorCreators] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [inView, setInView] = useState(false);
  const [sentinelNode, setSentinelNode] = useState(null);
  const { userToken } = useContext(UserContext);
  const pageRef = useRef(1);
  // A callback ref (not document.getElementById) — the sentinel <div> only
  // mounts once loading finishes, and a plain useEffect on mount would run
  // before it exists in the DOM. Storing the node in state means the observer
  // effect below correctly re-runs the moment the real node appears.
  const sentinelRef = useCallback((node) => setSentinelNode(node), []);

  const fetchPosts = useCallback(async (pageToFetch, { append = false } = {}) => {
    try {
      const response = await api.get('/api/v1/auth/post/recent-post', {
        params: { page: pageToFetch, limit: POSTS_PER_PAGE },
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      setPosts((prev) =>
        append ? [...prev, ...(response.data.documents || [])] : (response.data.documents || [])
      );
      setHasNextPage(response.data.hasNextPage);
    } catch {
      toast.error('Error fetching posts.');
      setIsErrorPosts(true);
    } finally {
      setIsPostLoading(false);
      setIsFetchingMore(false);
    }
  }, [userToken]);

  useEffect(() => {
    pageRef.current = 1;
    fetchPosts(1);

    api
      .get('/api/v1/auth/user/list', {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      })
      .then((response) => {
        setCreators(response.data.users);
        setIsUserLoading(false);
      })
      .catch(() => {
        toast.error('Error fetching users.');
        setIsErrorCreators(true);
        setIsUserLoading(false);
      });
  }, [fetchPosts, userToken]);

  useEffect(() => {
    if (!sentinelNode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(entries[0].isIntersecting && hasNextPage);
      },
      {
        rootMargin: '100px',
      }
    );

    observer.observe(sentinelNode);

    return () => {
      observer.unobserve(sentinelNode);
    };
  }, [sentinelNode, hasNextPage]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingMore) {
      setIsFetchingMore(true);
      pageRef.current += 1;
      fetchPosts(pageRef.current, { append: true });
    }
  }, [inView, hasNextPage, isFetchingMore, fetchPosts]);

  return (
    <div className="flex flex-1">
      <div className="home-container">
      <StoriesBar />
      <div className="flex gap-2 w-full max-w-5xl">
        <img
          src='/assets/images/home.svg'
          width={36}
          height={36}
          alt="Saved Icon"
          className="invert-white"
        />
        <h2 className="h3-bold md:h2-bold text-left w-full">Home Feed</h2>
      </div>
          {isPostLoading ? (
            <Loader />
          ) : isErrorPosts ? (
            <p>Error loading posts.</p>
          ) : posts.length === 0 ? (
            <p className="text-light-4 text-center w-full mt-10">No posts yet. Follow some people or create your first post!</p>
          ) : (
            <>
              <ul className="flex flex-col flex-1 gap-1 w-full">
                {posts?.map((post) => (
                  <li key={post._id} className="flex  justify-center mb-4 w-full">
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
              {hasNextPage && (
                <div id="home-load-more" ref={sentinelRef} className="w-full">
                  <Loader />
                </div>
              )}
            </>
          )}
        </div>



      <div className="home-creators">
        <h3 className="h3-bold text-light-1">Top Creators</h3>
        {isUserLoading ? (
          <Loader />
        ) : isErrorCreators ? (
          <p>Error loading creators.</p>
        ) : (
          <ul className="grid 2xl:grid-cols-2 gap-6">
            {creators?.map((creator) => (
              <li key={creator._id}>
                <UserCard user={creator} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Home;
