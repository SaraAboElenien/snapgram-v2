import { useCallback, useContext, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X } from 'lucide-react';
import api from '@/api/axios';
import { UserContext } from '@/Context/UserContext';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CreateStoryModal = ({ onClose, onCreated }) => {
  const { userToken } = useContext(UserContext);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Only JPEG, JPG and PNG files are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setImageError('File size must be less than 5MB');
      return;
    }
    setImageError('');
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  const handleSubmit = async () => {
    if (!selectedImage) {
      setImageError('Please select an image');
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('storyImage', selectedImage);
      await api.post('/api/v1/auth/story/create', formData, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      toast.success('Story shared!');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share story.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-dark-2 rounded-2xl w-full max-w-md p-6 relative"
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
        <h3 className="h3-bold text-light-1 mb-5">Add to Your Story</h3>

        <div
          {...getRootProps()}
          className={`flex flex-center flex-col bg-dark-3 rounded-xl cursor-pointer p-7 h-64 ${
            isDragActive ? 'bg-primary-500' : ''
          }`}
        >
          <input {...getInputProps()} aria-label="Upload story image" />
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="h-full w-full object-contain rounded-xl"
            />
          ) : (
            <>
              <img
                src="/assets/images/gallery-add.svg"
                width={64}
                height={64}
                alt="upload"
              />
              <p className="base-medium text-light-2 mb-2 mt-4">
                Drop your image here
              </p>
              <p className="text-sm text-light-4">JPG, JPEG, PNG (max 5MB)</p>
            </>
          )}
        </div>
        {imageError && <p className="text-sm text-red mt-1">{imageError}</p>}

        <div className="flex justify-end gap-4 mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-dark-1 border-dark-1 bg-light-2"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedImage}
            className="bg-primary-500 hover:bg-primary-600 text-white"
          >
            {isSubmitting ? 'Sharing...' : 'Share to Story'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryModal;
