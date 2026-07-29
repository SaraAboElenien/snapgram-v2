import { useParams } from "react-router";
import PostForm from "@/components/Forms/PostForm";
import { useState, useEffect, useContext } from "react";
import { UserContext } from "@/Context/UserContext";
import Loader from "@/components/Shared/Loader";
import { toast } from "react-hot-toast";
import api from "@/api/axios";
const EditPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userToken } = useContext(UserContext);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await api.get(`/api/v1/auth/post/${id}`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });

        setPost(response.data.post);
      } catch (error) {
        setError(error.response?.data?.message || "Failed to fetch post");
        toast.error("Failed to fetch post!");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id, userToken]);

  if (isLoading) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-center w-full h-full">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="common-container">
        <div className="flex-start gap-3 justify-start w-full max-w-5xl">
          <img
            src="/assets/images/edit.svg"
            width={36}
            height={36}
            alt="edit"
            className="invert-white"
          />
          <h2 className="h3-bold md:h2-bold text-left w-full">Edit Post</h2>
        </div>

        <PostForm action="Update" post={post} /> 
      </div>
    </div>
  );
};

export default EditPost;