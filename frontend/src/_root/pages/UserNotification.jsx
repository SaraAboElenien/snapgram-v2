import { useState, useEffect, useContext } from "react";
import { UserContext } from "@/Context/UserContext";
import { Link } from "react-router";
import { toast } from "react-hot-toast";
import api from "@/api/axios";
import { multiFormatDateString, getOptimizedImageUrl } from "@/lib/utils";

const NOTIFICATION_ICONS = {
  like: "/assets/images/liked.svg",
  comment: "/assets/images/chat.svg",
  follow: "/assets/images/people.svg",
  newPost: "/assets/images/gallery-add.svg",
  save: "/assets/images/saved.svg",
};

const getPostSnippet = (notification) => {
  const description = notification.post?.description;
  if (!description) return "";
  const trimmed =
    description.length > 20 ? `${description.slice(0, 20)}...` : description;
  return ` "${trimmed}"`;
};

const getNotificationText = (notification) => {
  const senderName = `${notification.sender.firstName} ${notification.sender.lastName}`;

  switch (notification.type) {
    case "like":
      return `${senderName} liked your post${getPostSnippet(notification)}`;
    case "comment":
      return `${senderName} commented on your post${getPostSnippet(notification)}`;
    case "follow":
      return `${senderName} followed you`;
    case "save":
      return `${senderName} saved your post${getPostSnippet(notification)}`;
    case "newPost":
      return `${senderName} ${notification.content || "posted something new"}`;
    default:
      return notification.content;
  }
};

const Notifications = () => {
  const { userToken, userData } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [followedBack, setFollowedBack] = useState(new Set());

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/v1/auth/notification/", {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        setNotifications(response.data.notifications);
      } catch {
        setError("Failed to fetch notifications.");
        toast.error("Error fetching notifications.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [userToken]);

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/api/v1/auth/notification/${notificationId}/read`, null, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch {
      toast.error("Failed to mark notification as read.");
    }
  };

  const handleFollowBack = async (e, senderId) => {
    e.stopPropagation();
    try {
      await api.put(
        `/api/v1/auth/user/${senderId}/follow`,
        { action: "follow" },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setFollowedBack((prev) => new Set(prev).add(senderId));
      toast.success("Followed back.");
    } catch {
      toast.error("Failed to follow back.");
    }
  };

  const isFollowingBack = (senderId) =>
    followedBack.has(senderId) || userData?.following?.includes(senderId);

  return (
    <div className="flex flex-1">
      <div className="common-container">
        {/* Header */}
        <div className="flex items-center gap-3 w-full max-w-5xl mb-8">
          <img
            src="/assets/images/notification-alert.svg"
            width={28}
            height={28}
            alt="Notifications"
            className="invert-white"
          />
          <h1 className="h3-bold md:h2-bold text-light-1">Notifications</h1>
          <div className="ml-auto flex items-center gap-2 bg-dark-3 rounded-[14px] px-4 py-3 cursor-pointer">
            <span className="text-light-2 small-medium">All</span>
            <img src="/assets/images/filter.svg" width={16} height={16} alt="Filter" />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex-center py-8">
            <div className="flex items-center gap-2">
              <img
                src="/assets/images/loader.svg"
                alt="Loading..."
                width={20}
                height={20}
                className="animate-spin"
              />
              <p className="text-light-2">Loading notifications...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex-center py-8">
            <p className="text-red">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && notifications.length === 0 && (
          <div className="flex-center py-8">
            <p className="text-light-3">No notifications yet.</p>
          </div>
        )}

        {/* Notifications List */}
        <div className="w-full max-w-3xl">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className="flex items-center gap-4 py-5 border-b border-dark-4 last:border-b-0 hover:bg-dark-4 rounded-lg transition-colors cursor-pointer"
              onClick={() => markAsRead(notification._id)}
            >
              {/* Type icon badge */}
              <div className="flex-center shrink-0 size-9 rounded-full bg-dark-3">
                <img
                  src={NOTIFICATION_ICONS[notification.type] || "/assets/images/notification-alert.svg"}
                  alt={notification.type}
                  width={18}
                  height={18}
                />
              </div>

              {/* Profile Image */}
              <Link
                to={`/profile/${notification.sender._id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0"
              >
                <img
                  src={getOptimizedImageUrl(notification.sender.profileImage?.secure_url, 'avatar') || "/assets/images/profile-placeholder.svg"}
                  alt={`${notification.sender.firstName}'s profile`}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    if (e.target instanceof HTMLImageElement) {
                      e.target.src = "/assets/images/profile-placeholder.svg";
                    }
                  }}
                />
              </Link>

              {/* Notification Content */}
              <div className="flex-1 min-w-0">
                <p className="text-light-1 small-semibold leading-relaxed">
                  {getNotificationText(notification)}
                </p>
                <p className="text-light-3 text-xs mt-1">
                  {multiFormatDateString(notification.createdAt)}
                </p>
              </div>

              {/* Right side: follow-back button or unread dot */}
              <div className="flex items-center gap-3 shrink-0">
                {notification.type === "follow" && !isFollowingBack(notification.sender._id) && (
                  <button
                    className="px-4 py-2 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600 transition-colors"
                    onClick={(e) => handleFollowBack(e, notification.sender._id)}
                  >
                    Follow back
                  </button>
                )}

                {!notification.isRead && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
