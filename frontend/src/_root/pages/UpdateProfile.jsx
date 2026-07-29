import { useState, useContext } from "react";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { useNavigate, useParams } from "react-router";
import Loader from "@/components/Shared/Loader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ProfileUploader from "@/components/Shared/ProfileUploader";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "react-hot-toast";
import api from "@/api/axios";
import { UserContext } from "@/Context/UserContext";
import { getOptimizedImageUrl } from "@/lib/utils";

const schema = yup.object().shape({
  firstName: yup.string().required("First Name is required"),
  lastName: yup.string().required("Last Name is required"),
  bio: yup.string().nullable(),
});

const UpdateProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData, userToken, setUserData } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    getOptimizedImageUrl(userData?.profileImage?.secure_url, 'avatarLarge') || null
  );

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      bio: userData?.bio || "",
    },
  });

  if (!userData) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      
      formData.append("firstName", data.firstName);
      formData.append("lastName", data.lastName);
      formData.append("bio", data.bio || "");
  
      if (profileImage?.[0]) {
        formData.append("profileImage", profileImage[0]);
      }
  
      // Debug logs
      console.log('Form Data Content:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }
  
      const response = await api.patch(
        "/api/v1/auth/user/updateProfile",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${userToken}`,
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log('Upload Progress:', percentCompleted + '%');
          },
        }
      );
  
      if (response.data?.user) {
        setUserData((prevData) => ({
          ...prevData,
          firstName: data.firstName,
          lastName: data.lastName,
          bio: data.bio || "",
          profileImage: response.data.user.profileImage || prevData.profileImage,
        }));
        
        toast.success("Profile updated successfully!");
        navigate(`/profile/${id}`);
      }
    } catch (error) {
      console.error('Profile Update Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method
      });
      
      let errorMessage = "Failed to update profile. Please try again.";
      
      if (error.response?.status === 500) {
        errorMessage = `Server error (500): ${error.response?.data?.message || 'Unknown server error'}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message === "Network Error") {
        errorMessage = "Network error. Please check your connection.";
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const handleImageChange = (files) => {
    setProfileImage(files);
    if (files?.[0]) {
      const preview = URL.createObjectURL(files[0]);
      setImagePreview(preview);
    }
  };

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
          <h2 className="h3-bold md:h2-bold text-left w-full">Edit Profile</h2>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-7 w-full mt-4 max-w-5xl"
        >
          <div className="flex">
            <Controller
              name="file"
              control={control}
              render={() => (
                <ProfileUploader
                  fieldChange={handleImageChange}
                  mediaUrl={imagePreview}
                />
              )}
            />
          </div>

          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <div>
                <label className="shad-form_label">First Name</label>
                <Input
                  type="text"
                  className="shad-input"
                  placeholder="Enter your first name"
                  {...field}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                )}
              </div>
            )}
          />

          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <div>
                <label className="shad-form_label">Last Name</label>
                <Input
                  type="text"
                  className="shad-input"
                  placeholder="Enter your last name"
                  {...field}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                )}
              </div>
            )}
          />

          <div>
            <label className="shad-form_label" htmlFor="profile-email-readonly">Email</label>
            <Input
              id="profile-email-readonly"
              type="email"
              className="shad-input opacity-60 cursor-not-allowed"
              value={userData?.email || ""}
              disabled
              readOnly
            />
          </div>

          <Controller
            name="bio"
            control={control}
            render={({ field }) => (
              <div>
                <label className="shad-form_label">Bio</label>
                <Textarea
                  className="shad-textarea custom-scrollbar"
                  placeholder="Tell people a bit about yourself..."
                  {...field}
                />
                {errors.bio && (
                  <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>
                )}
              </div>
            )}
          />

          <div className="flex gap-4 items-center justify-end">
            <Button
              type="button"
              className="shad-button_dark_4"
              onClick={() => navigate(-1)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="shad-button_primary whitespace-nowrap"
              disabled={isLoading}
            >
              {isLoading ? <Loader /> : "Update Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateProfile;