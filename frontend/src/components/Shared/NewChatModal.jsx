import { useContext, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '@/api/axios';
import { UserContext } from '@/Context/UserContext';
import { toast } from 'react-hot-toast';
import { getUserHandle, getOptimizedImageUrl } from '@/lib/utils';
import Loader from '@/components/Shared/Loader';

const NewChatModal = ({ onClose, onSelect }) => {
  const { userToken } = useContext(UserContext);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/v1/auth/chat/contacts', {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      .then((response) => setContacts(response.data.contacts || []))
      .catch(() => toast.error('Failed to load contacts.'))
      .finally(() => setIsLoading(false));
  }, [userToken]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-dark-2 rounded-2xl w-full max-w-md p-6 relative max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-light-2"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h3 className="h3-bold text-light-1 mb-5">New Message</h3>

        <div className="overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <Loader />
          ) : contacts.length === 0 ? (
            <p className="text-light-3 small-regular">
              You can only message people you follow who also follow you back.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {contacts.map((contact) => (
                <li key={contact._id}>
                  <button
                    type="button"
                    onClick={() => onSelect(contact)}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-dark-3 text-left"
                  >
                    <img
                      src={getOptimizedImageUrl(contact.profileImage?.secure_url, 'avatar') || '/assets/images/profile-placeholder.svg'}
                      alt={`${contact.firstName}'s avatar`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="base-medium text-light-1">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="small-regular text-light-3">@{getUserHandle(contact)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
