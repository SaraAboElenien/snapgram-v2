// utils/cn.js
export function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}


export const convertFileToUrl = (file: File) => URL.createObjectURL(file);
export function formatDateString(dateString: string) {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString("en-US", options);

  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formattedDate} at ${time}`;
}

// 
export const multiFormatDateString = (timestamp: string = ""): string => {
  const timestampNum = Math.round(new Date(timestamp).getTime() / 1000);
  const date: Date = new Date(timestampNum * 1000);
  const now: Date = new Date();

  const diff: number = now.getTime() - date.getTime();
  const diffInSeconds: number = diff / 1000;
  const diffInMinutes: number = diffInSeconds / 60;
  const diffInHours: number = diffInMinutes / 60;
  const diffInDays: number = diffInHours / 24;

  switch (true) {
    case Math.floor(diffInDays) >= 30:
      return formatDateString(timestamp);
    case Math.floor(diffInDays) === 1:
      return `${Math.floor(diffInDays)} day ago`;
    case Math.floor(diffInDays) > 1 && diffInDays < 30:
      return `${Math.floor(diffInDays)} days ago`;
    case Math.floor(diffInHours) >= 1:
      return `${Math.floor(diffInHours)} hours ago`;
    case Math.floor(diffInMinutes) >= 1:
      return `${Math.floor(diffInMinutes)} minutes ago`;
    default:
      return "Just now";
  }
};

export const checkIsLiked = (likeList: string[], userId: string) => {
  return likeList.includes(userId);
};

export const getUserHandle = (user: { firstName?: string; lastName?: string } = {}) => {
  return `${user.firstName || ""}${user.lastName || ""}`.toLowerCase();
};

// Every image in this app is uploaded through Cloudinary, which supports
// on-the-fly resizing/compression via URL segments — no re-upload or backend
// change needed to serve a smaller/lighter variant for a given context.
// Avatars and grid thumbnails are rendered at a tiny display size everywhere
// in the app but were serving the exact original upload; this asks Cloudinary
// for an appropriately-sized, auto-format (WebP/AVIF where supported),
// auto-quality variant instead.
type ImagePreset = "avatar" | "avatarLarge" | "thumbnail" | "full";

const IMAGE_PRESETS: Record<ImagePreset, string> = {
  avatar: "w_150,h_150,c_fill,g_face,q_auto,f_auto", // small circular avatars (nav, lists, story rings)
  avatarLarge: "w_300,h_300,c_fill,g_face,q_auto,f_auto", // profile page's own larger avatar
  thumbnail: "w_400,h_400,c_fill,q_auto,f_auto", // square grid tiles (Explore/Saved/Profile)
  full: "w_1200,c_limit,q_auto,f_auto", // full post/story view — capped, not cropped
};

export const getOptimizedImageUrl = (
  url?: string | null,
  preset: ImagePreset = "full"
): string | undefined => {
  if (!url || !url.includes("/upload/")) return url ?? undefined;
  return url.replace("/upload/", `/upload/${IMAGE_PRESETS[preset]}/`);
};