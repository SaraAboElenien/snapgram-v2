import { Button } from "../ui/button";
import { useContext, useState } from "react";
import { UserContext } from "@/Context/UserContext";
import { toast } from "react-hot-toast";
import api from "@/api/axios";
import { Link } from "react-router";
import { getUserHandle, getOptimizedImageUrl } from "@/lib/utils";
const UserCard = ({ user }) => {
  const { userToken } = useContext(UserContext);
  const [isFollowing, setIsFollowing] = useState(!!user.isFollowing);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleFollow = async () => {
    if (!userToken) {
      toast.error("You need to be logged in to follow a user.");
      return;
    }
    const action = isFollowing ? "unfollow" : "follow";
    setIsSubmitting(true);
    try {
      const response = await api.put(
        `/api/v1/auth/user/${user._id}/follow`,
        { action },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      setIsFollowing(!isFollowing);
      toast.success(response.data.message || `Successfully ${action === "follow" ? "followed" : "unfollowed"} the user!`);
    } catch (err) {
      toast.error(`Error trying to ${action} user. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="user-card">
      <Link to={`/profile/${user._id}`} className="flex-center flex-col gap-2">
        <img
          src={getOptimizedImageUrl(user.profileImage.secure_url, 'avatar') || '/assets/images/profile-placeholder.svg'}
          alt={`${user.firstName}'s Profile`}
          className="rounded-full w-14 h-14"
        />
        <div className="flex-center flex-col gap-1">
          <p className="base-medium text-light-1 text-center line-clamp-1">
            {user.firstName} {user.lastName}
          </p>
          <p className="small-regular text-light-3 text-center line-clamp-1">
            @{getUserHandle(user)}
          </p>
        </div>
      </Link>
      <Button
        type="button"
        size="sm"
        className={isFollowing ? "shad-button_dark_4 px-5" : "shad-button_primary px-5"}
        onClick={handleToggleFollow}
        disabled={isSubmitting}
      >
        {isFollowing ? "Following" : "Follow"}
      </Button>
    </div>
  );
};

export default UserCard;
