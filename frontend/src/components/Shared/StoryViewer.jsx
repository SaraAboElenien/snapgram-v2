import { useContext, useEffect, useRef, useState } from 'react';
import { X, Eye } from 'lucide-react';
import api from '@/api/axios';
import { UserContext } from '@/Context/UserContext';
import { multiFormatDateString, getOptimizedImageUrl } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import Loader from '@/components/Shared/Loader';

const STORY_DURATION_MS = 5000;

const StoryViewer = ({ feed, startGroupIndex, currentUserId, onClose, onStoryDeleted }) => {
  const { userToken } = useContext(UserContext);
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [isViewersLoading, setIsViewersLoading] = useState(false);
  const activeBarRef = useRef(null);

  const group = feed[groupIndex];
  const story = group?.stories[storyIndex];
  const isOwnStory = group?.user._id === currentUserId;

  // Keep group/story indices valid as `feed` shrinks (e.g. after a delete).
  useEffect(() => {
    if (!group) {
      onClose();
      return;
    }
    if (storyIndex >= group.stories.length) {
      if (group.stories.length === 0) {
        if (groupIndex < feed.length - 1) {
          setGroupIndex(groupIndex + 1);
          setStoryIndex(0);
        } else {
          onClose();
        }
      } else {
        setStoryIndex(group.stories.length - 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);

  const goNext = () => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < feed.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setStoryIndex(feed[groupIndex - 1].stories.length - 1);
      setGroupIndex(groupIndex - 1);
    }
  };

  // Record the view (skip for your own story) whenever the active story changes.
  useEffect(() => {
    if (!story || isOwnStory) return;
    api
      .put(`/api/v1/auth/story/${story._id}/view`, null, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?._id]);

  // Close the "seen by" sheet whenever the active story changes.
  useEffect(() => {
    setViewersOpen(false);
  }, [groupIndex, storyIndex]);

  // Auto-advance progress bar; paused while the "seen by" sheet is open.
  useEffect(() => {
    if (viewersOpen) return;
    const bar = activeBarRef.current;
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    const raf = requestAnimationFrame(() => {
      bar.style.transition = `width ${STORY_DURATION_MS}ms linear`;
      bar.style.width = '100%';
    });
    return () => cancelAnimationFrame(raf);
  }, [groupIndex, storyIndex, viewersOpen]);

  const openViewers = async () => {
    setViewersOpen(true);
    setIsViewersLoading(true);
    try {
      const response = await api.get(`/api/v1/auth/story/${story._id}/viewers`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setViewers(response.data.viewers || []);
    } catch (err) {
      toast.error('Failed to load viewers.');
    } finally {
      setIsViewersLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/v1/auth/story/${story._id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      toast.success('Story deleted.');
      onStoryDeleted(group.user._id, story._id);
    } catch (err) {
      toast.error('Failed to delete story.');
    }
  };

  if (!group || !story) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full sm:max-w-[420px] sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-dark-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
          {group.stories.map((s, idx) => (
            <div key={s._id} className="flex-1 h-1 bg-white/30 rounded overflow-hidden">
              <div
                ref={idx === storyIndex ? activeBarRef : null}
                className="h-full bg-white"
                style={{ width: idx < storyIndex ? '100%' : '0%' }}
                onTransitionEnd={idx === storyIndex ? goNext : undefined}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-6 left-3 right-3 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <img
              src={getOptimizedImageUrl(group.user.profileImage?.secure_url, 'avatar') || '/assets/images/profile-placeholder.svg'}
              alt={`${group.user.firstName}'s avatar`}
              className="w-9 h-9 rounded-full object-cover"
            />
            <div>
              <p className="small-semibold text-white">
                {group.user.firstName} {group.user.lastName}
              </p>
              <p className="tiny-medium text-light-3">{multiFormatDateString(story.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isOwnStory && (
              <button type="button" onClick={handleDelete} aria-label="Delete story">
                <img src="/assets/images/delete.svg" alt="Delete" width={20} height={20} />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close">
              <X size={24} className="text-white" />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="absolute inset-y-0 left-0 w-1/2 z-10"
          onClick={goPrev}
          aria-label="Previous story"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 w-1/2 z-10"
          onClick={goNext}
          aria-label="Next story"
        />

        <img
          src={getOptimizedImageUrl(story.image.secure_url, 'full')}
          alt="Story"
          className="w-full h-full object-contain"
        />

        {isOwnStory && (
          <button
            type="button"
            onClick={openViewers}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 text-white small-medium bg-black/40 px-4 py-2 rounded-full"
          >
            <Eye size={16} /> {story.viewers?.length || 0} views
          </button>
        )}

        {viewersOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/70 flex items-end"
            onClick={() => setViewersOpen(false)}
          >
            <div
              className="bg-dark-2 w-full rounded-t-2xl max-h-[60%] overflow-y-auto p-5 custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="base-semibold text-white mb-3">Seen by</p>
              {isViewersLoading ? (
                <Loader />
              ) : viewers.length === 0 ? (
                <p className="text-light-3 small-regular">No views yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {viewers.map((v) => (
                    <li key={v.userId?._id} className="flex items-center gap-3">
                      <img
                        src={getOptimizedImageUrl(v.userId?.profileImage?.secure_url, 'avatar') || '/assets/images/profile-placeholder.svg'}
                        alt={`${v.userId?.firstName}'s avatar`}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <p className="small-regular text-white">
                        {v.userId?.firstName} {v.userId?.lastName}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryViewer;
