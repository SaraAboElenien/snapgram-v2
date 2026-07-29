import { useCallback, useContext, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/api/axios';
import { UserContext } from '@/Context/UserContext';
import { toast } from 'react-hot-toast';
import { getOptimizedImageUrl } from '@/lib/utils';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';

const StoriesBar = () => {
  const { userToken, userData } = useContext(UserContext);
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchFeed = useCallback(() => {
    if (!userToken) return;
    api
      .get('/api/v1/auth/story/feed', {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      .then((response) => {
        setFeed(response.data.documents || []);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error('Error fetching stories.');
        setIsLoading(false);
      });
  }, [userToken]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleCloseViewer = () => {
    setActiveGroupIndex(null);
    fetchFeed();
  };

  const handleStoryDeleted = (groupUserId, storyId) => {
    setFeed((prev) =>
      prev
        .map((group) =>
          group.user._id === groupUserId
            ? { ...group, stories: group.stories.filter((s) => s._id !== storyId) }
            : group
        )
        .filter((g) => g.stories.length > 0)
    );
  };

  if (isLoading || !userData) return null;

  const ownGroup = feed.find((g) => g.user._id === userData._id);
  const otherGroups = feed.filter((g) => g.user._id !== userData._id);

  const handleOwnAvatarClick = () => {
    if (ownGroup) {
      setActiveGroupIndex(feed.indexOf(ownGroup));
    } else {
      setIsCreateOpen(true);
    }
  };

  const ringClass = (group) =>
    group.hasUnseen
      ? 'bg-gradient-to-tr from-secondary-500 to-primary-500'
      : 'bg-dark-4';

  return (
    <div className="flex gap-4 w-full max-w-5xl overflow-x-auto custom-scrollbar pb-2">
      <div className="flex flex-col items-center gap-2 shrink-0">
        {/* Two sibling buttons (avatar, add-story badge) instead of a
            nested button-in-button — screen readers don't handle nested
            interactive controls reliably (WCAG 4.1.2). Positioning moves to
            this wrapping div so the badge still anchors to the same
            bounding box as before. */}
        <div className="relative">
          <button
            type="button"
            data-testid="own-story-avatar"
            onClick={handleOwnAvatarClick}
            className={`rounded-full p-[2px] ${
              // The owner's own group never has hasUnseen: true (you can't "unsee"
              // your own content, see story.service.js) — so the ring here signals
              // "you have an active story right now", not the unseen/seen distinction
              // ringClass() draws for everyone else's avatars below.
              ownGroup
                ? 'bg-gradient-to-tr from-secondary-500 to-primary-500'
                : 'border-2 border-dashed border-light-4'
            }`}
          >
            <img
              src={getOptimizedImageUrl(userData.profileImage?.secure_url, 'avatar') || '/assets/images/profile-placeholder.svg'}
              alt="Your story"
              className="w-14 h-14 rounded-full object-cover border-2 border-dark-2"
            />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="absolute bottom-0 right-0 bg-primary-500 rounded-full p-1 border-2 border-dark-2"
            aria-label="Add to your story"
          >
            <Plus size={12} className="text-white" />
          </button>
        </div>
        <p className="tiny-medium text-light-2 line-clamp-1 w-16 text-center">My Story</p>
      </div>

      {otherGroups.map((group) => (
        <div key={group.user._id} className="flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="other-story-avatar"
            onClick={() => setActiveGroupIndex(feed.indexOf(group))}
            className={`rounded-full p-[2px] ${ringClass(group)}`}
          >
            <img
              src={getOptimizedImageUrl(group.user.profileImage?.secure_url, 'avatar') || '/assets/images/profile-placeholder.svg'}
              alt={`${group.user.firstName}'s story`}
              className="w-14 h-14 rounded-full object-cover border-2 border-dark-2"
            />
          </button>
          <p className="tiny-medium text-light-2 line-clamp-1 w-16 text-center">
            {group.user.firstName}
          </p>
        </div>
      ))}

      {activeGroupIndex !== null && feed[activeGroupIndex] && (
        <StoryViewer
          feed={feed}
          startGroupIndex={activeGroupIndex}
          currentUserId={userData._id}
          onClose={handleCloseViewer}
          onStoryDeleted={handleStoryDeleted}
        />
      )}

      {isCreateOpen && (
        <CreateStoryModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            fetchFeed();
          }}
        />
      )}
    </div>
  );
};

export default StoriesBar;
