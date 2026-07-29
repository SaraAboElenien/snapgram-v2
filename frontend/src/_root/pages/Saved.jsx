import { useCallback, useEffect, useRef, useState, useContext } from 'react';
import Loader from '@/components/Shared/Loader';
import { UserContext } from '@/Context/UserContext';
import GridPostList from '@/components/Shared/GridPostList';
import { toast } from 'react-hot-toast';
import api from '@/api/axios';

const POSTS_PER_PAGE = 10;

const Saved = () => {
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [inView, setInView] = useState(false);
  const [sentinelNode, setSentinelNode] = useState(null);
  const { userToken } = useContext(UserContext);
  const pageRef = useRef(1);
  // Callback ref, not document.getElementById — the sentinel <div> only mounts
  // once loading finishes, so a plain mount-time effect would miss it. See
  // Explore.jsx/Home.jsx for the same pattern (ADR-020).
  const sentinelRef = useCallback((node) => setSentinelNode(node), []);

  const fetchSavedPosts = useCallback(async (pageToFetch, { append = false } = {}) => {
    try {
      const response = await api.get('/api/v1/auth/post/saved-posts', {
        params: { page: pageToFetch, limit: POSTS_PER_PAGE },
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setSavedPosts((prev) =>
        append ? [...prev, ...(response.data.documents || [])] : (response.data.documents || [])
      );
      setHasNextPage(response.data.hasNextPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load saved posts.');
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, [userToken]);

  useEffect(() => {
    pageRef.current = 1;
    fetchSavedPosts(1);
  }, [fetchSavedPosts]);

  useEffect(() => {
    if (!sentinelNode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(entries[0].isIntersecting && hasNextPage);
      },
      { rootMargin: '100px' }
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
      fetchSavedPosts(pageRef.current, { append: true });
    }
  }, [inView, hasNextPage, isFetchingMore, fetchSavedPosts]);

  if (loading) return <Loader />;

  return (
    <div className="saved-container">
      <div className="flex gap-2 w-full max-w-5xl">
        <img
          src="/assets/images/saved.svg"
          width={36}
          height={36}
          alt="Saved Icon"
          className="invert-white"
        />
        <h2 className="h3-bold md:h2-bold text-left w-full">Saved Posts</h2>
      </div>

      {savedPosts.length === 0 ? (
        <p className="text-light-4">No available posts</p>
      ) : (
        <>
          <ul className="w-full flex justify-center max-w-5xl gap-9">
            <GridPostList posts={savedPosts} showStats={false} />
          </ul>
          {hasNextPage && (
            <div id="saved-load-more" ref={sentinelRef} className="mt-10">
              <Loader />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Saved;
