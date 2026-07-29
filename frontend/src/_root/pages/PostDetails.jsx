import { useCallback, useContext, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Shared/Loader";
import { multiFormatDateString, getOptimizedImageUrl } from "@/lib/utils";
import { UserContext } from "@/Context/UserContext";
import GridPostList from "@/components/Shared/GridPostList";
import PostStats from "@/components/Shared/PostStats";
import { toast } from "react-hot-toast";
import api from "@/api/axios";



const PostDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData, userToken } = useContext(UserContext);

  const [post, setPost] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserPostLoading, setIsUserPostLoading] = useState(true);

  const fetchUserPosts = useCallback(async (userId) => {
    if (!userToken || !userId) return;
    try {
      const response = await api.get(
        `/api/v1/auth/post/user-post/${userId}`,
        {
          params: { limit: 4 },
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      if (response.data.documents) {
        setUserPosts(response.data.documents.filter((p) => p._id !== id));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching user posts");
    } finally {
      setIsUserPostLoading(false);
    }
  }, [userToken, id]);

  const fetchPost = useCallback(async () => {
    if (!userToken) return;
    try {
      const response = await api.get(
        `/api/v1/auth/post/${id}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      if (response.data.post) {
        setPost(response.data.post);
        fetchUserPosts(response.data.post.userId._id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching post");
    } finally {
      setIsLoading(false);
    }
  }, [id, userToken, fetchUserPosts]);

  useEffect(() => {
    if (id && userToken) {
      fetchPost();
    }
  }, [id, userToken, fetchPost]);

  const handleDeletePost = async () => {
    try {
      await api.delete(`/api/v1/auth/post/${id}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      toast.success("Post deleted successfully");
      navigate(-1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete post");
    }
  };

  if (isLoading || !post) return <Loader />;

  return (
    <div className="post_details-container">
      <div className="hidden md:flex max-w-5xl w-full">
        <Button onClick={() => navigate(-1)} variant="ghost" className="shad-button_ghost">
          <img src="/assets/images/back.svg" alt="back" width={24} height={24} />
          <p className="small-medium lg:base-medium">Back</p>
        </Button>
      </div>

      <div className="post_details-card">
        <img src={getOptimizedImageUrl(post.image.secure_url, 'full')}
          alt="post" className="post_details-img" />
        <div className="post_details-info">
          <div className="flex-between w-full">
            <Link to={`/profile/${post.userId._id}`} className="flex items-center gap-3">
              <img
                src={getOptimizedImageUrl(post.userId.profileImage.secure_url, 'avatar')}
                alt="creator"
                className="w-8 h-8 lg:w-12 lg:h-12 rounded-full"
                onError={(e) => {
                  e.target.src = "/assets/icons/profile-placeholder.svg";
                }}
              />
              <div className="flex gap-1 flex-col">
                <p className="base-medium lg:body-bold text-light-1">
                  {post.userId.firstName} {post.userId.lastName}
                </p>
                <div className="flex-center gap-2 text-light-3">
                  <p className="subtle-semibold lg:small-regular">{multiFormatDateString(post.createdAt)}</p>
                  {post.location && (
                    <>
                      •
                      <p className="subtle-semibold lg:small-regular">{post.location}</p>
                    </>
                  )}
                </div>
              </div>
            </Link>

            <div className="flex-center gap-4">
              {userData?._id === post.userId._id && (
                <>
                  <Link to={`/update-post/${post._id}`}>
                    <img src="/assets/images/edit.svg" alt="edit" width={24} height={24} />
                  </Link>
                  <Button onClick={handleDeletePost} variant="ghost" className="post_details-delete_btn">
                    <img src="/assets/images/delete.svg" alt="delete" width={24} height={24} />
                  </Button>
                </>
              )}
            </div>
          </div>

          <hr className="border w-full border-dark-4/80" />

          <div className="flex flex-col flex-1 w-full small-medium lg:base-regular">
            <p>{post.description}</p>
            <ul className="flex gap-1 mt-2">
              {post.tags.map((tag, index) => (
                <li key={`${tag}${index}`} className="text-light-3 small-regular">#{tag}</li>
              ))}
            </ul>
          </div>

          <div className="w-full">
            <PostStats post={post} userId={userData?._id} />
          </div>
        </div>
      </div>

      {userPosts.length > 0 && (
        <div className="w-full max-w-5xl">
          <hr className="border w-full border-dark-4/80" />
          <h3 className="body-bold md:h3-bold w-full my-10">More Related Posts</h3>
          {isUserPostLoading ? <Loader /> : <GridPostList posts={userPosts} />}
        </div>
      )}
    </div>
  );
};

export default PostDetails;
