import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { UserContext } from "@/Context/UserContext";
import { Button } from "@/components/ui/button";
import GridPostList from "@/components/Shared/GridPostList";
import Loader from "@/components/Shared/Loader";
import { toast } from "react-hot-toast";
import api from "@/api/axios";
import { getUserHandle, getOptimizedImageUrl } from "@/lib/utils";

const POSTS_PER_PAGE = 10;

const StatBlock = ({ value, label }) => (
  <div className="flex-center gap-2">
    <p className="small-semibold lg:body-bold text-primary-400">{value}</p>
    <p className="small-medium lg:base-medium text-light-2">{label}</p>
  </div>
);

const Profile = () => {
  const { id } = useParams();
  const { userData, userToken } = useContext(UserContext);
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userPostsHasNextPage, setUserPostsHasNextPage] = useState(true);
  const [userPostsTotalCount, setUserPostsTotalCount] = useState(0);
  const [likedPosts, setLikedPosts] = useState([]);
  const [likedPostsHasNextPage, setLikedPostsHasNextPage] = useState(true);
  const [likedPostsTotalCount, setLikedPostsTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [inView, setInView] = useState(false);
  const [sentinelNode, setSentinelNode] = useState(null);
  const [showLikedPosts, setShowLikedPosts] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const userPostsPageRef = useRef(1);
  const likedPostsPageRef = useRef(1);
  // Callback ref, not document.getElementById — the sentinel <div> only mounts
  // once loading finishes, so a plain mount-time effect would miss it. Shared
  // across both tabs since only one grid is ever rendered at a time. See
  // Explore.jsx/Home.jsx for the same pattern (ADR-020).
  const sentinelRef = useCallback((node) => setSentinelNode(node), []);

  useEffect(() => {
    if (id) {
      const fetchUserProfile = async () => {
        try {
          const response = await api.get(
            `/api/v1/auth/user/userByID/${id}`,
            {
              headers: { Authorization: `Bearer ${userToken}` },
            }
          );
          setCurrentUser(response.data);
          setFollowersCount(response.data.followers.length);
          setIsFollowing(
            userData ? response.data.followers.some((followerId) => String(followerId) === String(userData._id)) : false
          );
        } catch (error) {
          toast.error(error.response?.data?.message || "Error fetching user profile");
        } finally {
          setLoading(false);
        }
      };

      fetchUserProfile();
    }
  }, [id, userToken, userData]);

  const handleToggleFollow = async () => {
    const action = isFollowing ? "unfollow" : "follow";
    setIsFollowSubmitting(true);
    try {
      const response = await api.put(
        `/api/v1/auth/user/${currentUser._id}/follow`,
        { action },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setIsFollowing(!isFollowing);
      setFollowersCount(response.data.followersCount);
      toast.success(response.data.message || `Successfully ${action === "follow" ? "followed" : "unfollowed"} the user!`);
    } catch (err) {
      toast.error(err.response?.data?.message || `Error trying to ${action} user. Please try again.`);
    } finally {
      setIsFollowSubmitting(false);
    }
  };

  const fetchUserPosts = useCallback(async (pageToFetch, { append = false } = {}) => {
    const response = await api.get(`/api/v1/auth/post/user-post/${id}`, {
      params: { page: pageToFetch, limit: POSTS_PER_PAGE },
      headers: { Authorization: `Bearer ${userToken}` },
    });
    setUserPosts((prev) =>
      append ? [...prev, ...(response.data.documents || [])] : (response.data.documents || [])
    );
    setUserPostsHasNextPage(response.data.hasNextPage);
    setUserPostsTotalCount(response.data.totalCount);
  }, [id, userToken]);

  const fetchLikedPosts = useCallback(async (pageToFetch, { append = false } = {}) => {
    const response = await api.get(`/api/v1/auth/post/user/${id}/liked`, {
      params: { page: pageToFetch, limit: POSTS_PER_PAGE },
      headers: { Authorization: `Bearer ${userToken}` },
    });
    setLikedPosts((prev) =>
      append ? [...prev, ...(response.data.documents || [])] : (response.data.documents || [])
    );
    setLikedPostsHasNextPage(response.data.hasNextPage);
    setLikedPostsTotalCount(response.data.totalCount);
  }, [id, userToken]);

  useEffect(() => {
    if (!id) return;
    setPostsLoading(true);
    userPostsPageRef.current = 1;
    likedPostsPageRef.current = 1;
    Promise.all([fetchUserPosts(1), fetchLikedPosts(1)])
      .catch((error) => console.error("Error fetching posts:", error))
      .finally(() => setPostsLoading(false));
  }, [id, fetchUserPosts, fetchLikedPosts]);

  const activeHasNextPage = showLikedPosts ? likedPostsHasNextPage : userPostsHasNextPage;

  useEffect(() => {
    if (!sentinelNode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(entries[0].isIntersecting && activeHasNextPage);
      },
      { rootMargin: "100px" }
    );

    observer.observe(sentinelNode);

    return () => {
      observer.unobserve(sentinelNode);
    };
  }, [sentinelNode, activeHasNextPage]);

  useEffect(() => {
    if (!inView || !activeHasNextPage || isFetchingMore) return;

    setIsFetchingMore(true);
    let loadMore;
    if (showLikedPosts) {
      likedPostsPageRef.current += 1;
      loadMore = fetchLikedPosts(likedPostsPageRef.current, { append: true });
    } else {
      userPostsPageRef.current += 1;
      loadMore = fetchUserPosts(userPostsPageRef.current, { append: true });
    }

    loadMore
      .catch((error) => console.error("Error fetching more posts:", error))
      .finally(() => setIsFetchingMore(false));
  }, [inView, activeHasNextPage, isFetchingMore, showLikedPosts, fetchLikedPosts, fetchUserPosts]);

  if (loading)
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );

  if (!currentUser) return <p>User not found</p>;

  const isCurrentUser = userData?._id === currentUser._id;
  const isMutualFollow =
    isFollowing &&
    userData &&
    currentUser.following.some((followingId) => String(followingId) === String(userData._id));

  const postsToDisplay = showLikedPosts ? likedPosts : userPosts;

  return (
    <div className="profile-container">
      <div className="profile-inner_container">
        <div className="flex xl:flex-row flex-col max-xl:items-center flex-1 gap-7">
          <img
            src={getOptimizedImageUrl(currentUser.profileImage.secure_url, 'avatarLarge')}
            alt="profile"
            className="w-28 h-28 lg:h-36 lg:w-36 rounded-full"
          />
          <div className="flex flex-col flex-1 justify-between md:mt-2">
            <div className="flex flex-col w-full">
              <h1 className="text-center xl:text-left h3-bold md:h1-semibold w-full">
                {`${currentUser.firstName} ${currentUser.lastName}`}
              </h1>
              <p className="small-regular md:body-medium text-light-3 text-center xl:text-left">
                @{getUserHandle(currentUser)}
              </p>
            </div>

            <div className="flex gap-8 mt-10 items-center justify-center xl:justify-start flex-wrap z-20">
              <StatBlock value={userPostsTotalCount} label="Posts" />
              <StatBlock value={likedPostsTotalCount} label="Liked Posts" />
              <StatBlock value={followersCount} label="Followers" />
              <StatBlock value={currentUser.following.length} label="Following" />
            </div>

            <p className="small-medium md:base-medium text-center xl:text-left mt-7 max-w-screen-sm">
              {currentUser.bio || "No bio available"}
            </p>
          </div>

          <div className="flex justify-center gap-4">
            {isCurrentUser ? (
              <Link
                to={`/update-profile/${currentUser._id}`}
                className="h-12 bg-dark-4 px-5 text-light-1 flex-center gap-2 rounded-lg"
              >
                <img
                  src={"/assets/images/edit.svg"}
                  alt="edit"
                  width={20}
                  height={20}
                />
                <p className="flex whitespace-nowrap small-medium">
                  Edit Profile
                </p>
              </Link>
            ) : (
              <>
                <Button
                  type="button"
                  className={isFollowing ? "shad-button_dark_4 px-8" : "shad-button_primary px-8"}
                  onClick={handleToggleFollow}
                  disabled={isFollowSubmitting}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                {isMutualFollow && (
                  <Button
                    type="button"
                    className="shad-button_dark_4 px-8"
                    onClick={() => navigate(`/chats?userId=${currentUser._id}`)}
                  >
                    Message
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex max-w-5xl w-full">
        <button
          onClick={() => setShowLikedPosts(false)}
          className={`profile-tab rounded-l-lg ${!showLikedPosts && "!bg-dark-3"}`}
        >
          <img src={"/assets/images/posts.svg"} alt="posts" width={20} height={20} />
          Posts
        </button>
        <button
          onClick={() => setShowLikedPosts(true)}
          className={`profile-tab rounded-r-lg ${showLikedPosts && "!bg-dark-3"}`}
        >
          <img src={"/assets/images/like.svg"} alt="like" width={20} height={20} />
          Liked Posts
        </button>
      </div>

      {postsLoading ? (
        <Loader />
      ) : (
        <>
          <GridPostList posts={postsToDisplay} showUser={false} />
          {activeHasNextPage && (
            <div id="profile-load-more" ref={sentinelRef} className="mt-10">
              <Loader />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Profile;