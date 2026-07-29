import { useCallback, useEffect, useRef, useState, useContext } from "react";
import { Input } from "@/components/ui/input";
import GridPostList from "@/components/Shared/GridPostList";
import Loader from "@/components/Shared/Loader";
import useDebounce from "@/hooks/useDebounce";
import { UserContext } from '@/Context/UserContext';
import { toast } from 'react-hot-toast';
import api from "@/api/axios";

const POSTS_PER_PAGE = 10;



const SearchResults = ({ isSearchFetching, searchedPosts }) => {
  if (isSearchFetching) {
    return <Loader />;
  } else if (searchedPosts && searchedPosts.documents.length > 0) {
    return <GridPostList posts={searchedPosts.documents} />;
  } else {
    return (
      <p className="text-light-4 mt-10 text-center w-full">No results found</p>
    );
  }
};

const Explore = () => {
  const [posts, setPosts] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [searchedPosts, setSearchedPosts] = useState(null);
  const [isSearchFetching, setIsSearchFetching] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [inView, setInView] = useState(false);
  const [popularTags, setPopularTags] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [sentinelNode, setSentinelNode] = useState(null);
  const { userToken } = useContext(UserContext);
  const debouncedSearch = useDebounce(searchValue, 500);
  const pageRef = useRef(1);
  // A callback ref (not document.getElementById) — the sentinel <div> only
  // mounts once loading finishes, and a plain useEffect on mount would run
  // before it exists in the DOM. Storing the node in state means the observer
  // effect below correctly re-runs the moment the real node appears.
  const sentinelRef = useCallback((node) => setSentinelNode(node), []);


  const fetchPosts = useCallback(async (pageToFetch, { append = false } = {}) => {
    try {
      const response = await api.get("/api/v1/auth/post/recent-post", {
        params: { page: pageToFetch, limit: POSTS_PER_PAGE },
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      setPosts((prev) =>
        append ? [...prev, ...(response.data.documents || [])] : (response.data.documents || [])
      );
      setHasNextPage(response.data.hasNextPage);
    } catch (error) {
      toast.error("Error fetching posts.");
    } finally {
      setIsLoadingPosts(false);
      setIsFetchingMore(false);
    }
  }, [userToken]);


  const searchPosts = useCallback(async (searchQuery) => {
    if (!searchQuery) return;
    setIsSearchFetching(true);
    try {
      const response = await api.get(`/api/v1/auth/post/recent-post?search=${searchQuery}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      setSearchedPosts(response.data);
    } catch (error) {
      toast.error("Error fetching search results.");
    } finally {
      setIsSearchFetching(false);
    }
  }, [userToken]);

  useEffect(() => {
    pageRef.current = 1;
    fetchPosts(1);

    const fetchPopularTags = async () => {
      try {
        const response = await api.get("/api/v1/auth/post/popular-tags", {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        setPopularTags(response.data.tags || []);
      } catch (error) {
        // Non-critical: the page works fine without tag suggestions.
      }
    };
    fetchPopularTags();
  }, [fetchPosts, userToken]);

  useEffect(() => {
    if (debouncedSearch) {
      searchPosts(debouncedSearch);
    } else {
      setSearchedPosts(null);
    }
  }, [debouncedSearch, searchPosts]);

  useEffect(() => {
    if (!sentinelNode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(entries[0].isIntersecting && !searchValue && hasNextPage);
      },
      {
        rootMargin: "100px",
      }
    );

    observer.observe(sentinelNode);

    return () => {
      observer.unobserve(sentinelNode);
    };
  }, [sentinelNode, searchValue, hasNextPage]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingMore) {
      setIsFetchingMore(true);
      pageRef.current += 1;
      fetchPosts(pageRef.current, { append: true });
    }
  }, [inView, hasNextPage, isFetchingMore, fetchPosts]);

  if (isLoadingPosts && !isSearchFetching) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  const shouldShowSearchResults = searchValue !== "";
  const shouldShowPosts = !shouldShowSearchResults && posts.length > 0;

  return (
    <div className="explore-container">
      <div className="explore-inner_container">
        <h2 className="h2-bold md:h1-bold w-full text-center">Search Posts</h2>
        <div className="flex gap-1 px-4 w-full rounded-lg bg-dark-4">
          <img
            src="/assets/images/search.svg"
            width={24}
            height={24}
            alt="search"
          />
          <Input
            type="text"
            placeholder="Search by keyword or #tag"
            className="explore-search"
            value={searchValue}
            onChange={(e) => {
              const { value } = e.target;
              setSearchValue(value);
            }}
          />
        </div>

        {popularTags.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center">
            {popularTags.map(({ tag }) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchValue(tag)}
                className="bg-dark-2 border border-dark-4 rounded-full px-4 py-2.5 subtle-semibold text-light-4 hover:text-light-2 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-between w-full max-w-5xl mt-16 mb-7">
        <h3 className="h3-bold md:h2-bold">Popular Today</h3>

        <div className="flex-center gap-3 bg-dark-3 rounded-xl px-4 py-2 cursor-pointer">
          <p className="small-medium md:base-medium text-light-2">All</p>
          <img
            src="/assets/images/filter.svg"
            width={20}
            height={20}
            alt="filter"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-9 w-full max-w-5xl">
        {shouldShowSearchResults ? (
          <SearchResults
            isSearchFetching={isSearchFetching}
            searchedPosts={searchedPosts}
          />
        ) : shouldShowPosts ? (
          <GridPostList posts={posts} />
        ) : (
          <p className="text-light-4 mt-10 text-center w-full">No posts available</p>
        )}
      </div>

      {hasNextPage && !searchValue && (
        <div id="load-more" ref={sentinelRef} className="mt-10">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default Explore;
