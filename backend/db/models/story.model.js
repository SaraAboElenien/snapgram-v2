import mongoose, { Schema } from "mongoose";

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

const storySchema = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    image: {
      secure_url: String,
      public_id: String,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + STORY_LIFETIME_MS),
    },
    viewers: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

storySchema.index({ userId: 1, createdAt: -1 });
// TTL index: MongoDB's background task removes a document once expiresAt is in the past.
// This does not run application code, so the Cloudinary asset is not deleted here —
// see CURRENT_STATUS.md / ADR for the accepted v1 tradeoff (orphaned Cloudinary storage).
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const storyModel = mongoose.model("Story", storySchema);

export default storyModel;
