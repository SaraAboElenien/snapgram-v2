import { convertFileToUrl } from "@/lib/utils";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
const ProfileUploader = ({ fieldChange, mediaUrl }) => {
  const [fileUrl, setFileUrl] = useState(mediaUrl);

  const onDrop = useCallback(
    (acceptedFiles) => {
      fieldChange(acceptedFiles);
      setFileUrl(convertFileToUrl(acceptedFiles[0]));
    },
    [fieldChange]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpeg", ".jpg"],
    },
  });

  return (
    <div {...getRootProps()} className="cursor-pointer">
      <input {...getInputProps()} className="cursor-pointer" aria-label="Upload profile photo" />
      <div className="cursor-pointer flex-center gap-4">
        <img
          src={fileUrl || "/assets/images/profile-placeholder.svg"}
          alt="Profile"
          className="h-24 w-24 rounded-full object-cover object-top"
        />
        <p className="text-primary-400 small-regular md:bbase-semibold">
          Change profile photo
        </p>
      </div>
    </div>
  );
};

export default ProfileUploader;
