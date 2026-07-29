import mongoose, { Types } from "mongoose";
import { systemRoles } from "../../helpers/systemRoles.js";
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "firstName is required"],
    },
    lastName: {
      type: String,
      required: [true, "lastName is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImage: {
      secure_url: {
        type: String,
        default:
          process.env.defaultProfilePic,


      },
      public_id: {
        type: String,
        default: process.env.defaultpuplicPic, 
      },
    },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    recoveryEmail: { type: String },
    role: {
      type: String,
      enum: Object.values(systemRoles),
      default: systemRoles.user,
    },
    confirmed: {
      type: Boolean,
      default: false,
    }, 
    bio: {
      type: String,
      default: `🌟 Dreamer | Creator | Doer
📍 Living life one adventure at a time
💡 Turning ideas into reality | Lover of tech, coffee, and great conversations ☕💻
✨ Sharing moments, insights, and a sprinkle of humor 😄
📩 Let’s connect & grow together`,
    },
    loggedIn: {
      type: Boolean,
      default: false,
    },
    updated: { type: Date },
    code: { type: String },
    codeExpiresAt: Date,
    passwordChangedAt: Date,
    // Bumped on logout (see logout controller) — every JWT carries the
    // sessionVersion it was issued under, so auth.js can reject a token
    // whose version no longer matches, the same way passwordChangedAt
    // already invalidates every token issued before a password reset.
    sessionVersion: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const userModel = mongoose.model("User", userSchema);

export default userModel;
