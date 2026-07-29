import mongoose, { Schema } from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true },
    tags: [{ type: String }],
    location: { type: String },
    image:
    {
      secure_url: String,
      public_id: String,
    },
    customId: String,
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }]
  },
  { timestamps: true }
);

postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likes: 1 });

const postModel = mongoose.model("Post", postSchema);

export default postModel;
