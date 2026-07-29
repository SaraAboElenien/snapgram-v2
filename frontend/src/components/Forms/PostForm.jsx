// @ts-nocheck
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { yupResolver } from '@hookform/resolvers/yup';
import { UserContext } from '@/Context/UserContext';
import * as yup from 'yup';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useContext, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast'; 
import { useDropzone } from 'react-dropzone';
import api from '@/api/axios';
import { getOptimizedImageUrl } from '@/lib/utils';
const API_BASE_URL = "/api/v1/auth/post";

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; 

const postSchema = yup.object({
  description: yup
    .string()
    .required("Description is required")
    .max(500, "Description must be under 500 characters"),
  location: yup.string().optional(),
  tags: yup.string().optional(),
});

export default function PostForm({ post, action }) {
  const navigate = useNavigate();
  const { userToken } = useContext(UserContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (post?.image?.secure_url) {
      setPreviewUrl(getOptimizedImageUrl(post.image.secure_url, 'full'));
    }
  }, [post]);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const form = useForm({
    resolver: yupResolver(postSchema),
    defaultValues: {
      description: post?.description || "",
      location: post?.location || "",
      tags: post?.tags?.join(", ") || "",
    },
  });

  const validateFile = (file) => {
    if (!file) return "Please select an image";
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Only JPEG, JPG and PNG files are allowed";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 5MB";
    }
    return null;
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const error = validateFile(file);
      
      if (error) {
        setImageError(error);
        setSelectedImage(null);
        setPreviewUrl(null);
      } else {
        setImageError("");
        setSelectedImage(file);
        // Clean up previous preview URL before creating new one
        if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  }, [previewUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE
  });

  const handleSubmit = async (data) => {
    if (!selectedImage && !post?.image?.secure_url) {
      setImageError("Please select an image");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("description", data.description);
      if (data.location) formData.append("location", data.location);
      if (data.tags) formData.append("tags", data.tags);
      
      if (selectedImage) formData.append("postImage", selectedImage);

      const config = {
        method: action === "Update" ? "put" : "post",
        url: action === "Update" && post
          ? `${API_BASE_URL}/${post._id}`
          : `${API_BASE_URL}/create-post`,
        headers: {
          Authorization: `Bearer ${userToken}`,
        },

        data: formData,
      };
      await api(config);

      toast.success(`Post ${action === "Update" ? "updated" : "created"} successfully!`);
      navigate("/");

    } catch (error) {
      toast.error(
        error.response?.data?.message || 
        "An error occurred while processing the post"
      );  
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Write your post description..." 
                    className="min-h-[120px] bg-dark-3 border-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Image</FormLabel>
            <div
              {...getRootProps()}
              className={`flex flex-center flex-col bg-dark-3 rounded-xl cursor-pointer 
                ${isDragActive ? ' bg-primary-500' : 'border-gray-300'}
                ${previewUrl ? 'bg-dark-3' : 'bg-dark-3'}`}
            >
              <input {...getInputProps()} aria-label="Upload photo" />
              
              {previewUrl ? (
                <div className="flex flex-col justify-center w-full p-5 lg:p-10">
                  <img
                    src={previewUrl} 
                    alt="Preview"
                    className="file_uploader-img"
                  />
                  <p className="text-sm text-light-3 text-center mt-2">
                    Click or drag to replace image
                  </p>
                </div>
              ) : (
                <div className="file_uploader-box">
                  <img
                    src={"/assets/images/file-upload.svg"}
                    width={96}
                    height={77}
                    alt="file upload"
                  />
                  <p className="base-medium text-light-2 mb-2 mt-6">
                    Drop your image here
                  </p>
                  <p className="text-sm text-light-3 mb-4">
                    JPG, JPEG, PNG (max 5MB)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shad-button_dark_4 border-none"
                  >
                    Select from computer
                  </Button>
                </div>
              )}
            </div>
            {imageError && (
              <p className="text-sm text-red-500 mt-1">{imageError}</p>
            )}
          </FormItem>

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Add location" className="bg-dark-3 border-none" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Add tags (comma separated)" className="bg-dark-3 border-none"/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="text-dark-1 border-dark-1 bg-light-2"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || (!post?.image?.secure_url && !selectedImage)}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              {isSubmitting ? "Submitting..." : `${action} Post`}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}