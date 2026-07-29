import express from "express";
import * as StoryC from "./story.controller.js";
import * as StoryV from "./story.validation.js";
import { validation } from "../../../middlewares/validation.js";
import { auth } from "../../../middlewares/auth.js";
import { systemRoles } from "../../../helpers/systemRoles.js";
import { uploadImage, handleCloudinaryUpload } from "../../../helpers/multerLocal.js";

const router = express.Router();

// create story
router.post(
  "/create",
  auth(systemRoles.user),
  uploadImage("storyImage"),
  handleCloudinaryUpload,
  validation(StoryV.createStoryValidationSchema),
  StoryC.createStory
);

// feed: own + followed users' active stories, grouped by author
router.get("/feed", auth(systemRoles.user), StoryC.getStoryFeed);

// mark a story as viewed
router.put(
  "/:id/view",
  auth(systemRoles.user),
  validation(StoryV.viewStoryValidationSchema),
  StoryC.viewStory
);

// owner-only "seen by" list
router.get(
  "/:id/viewers",
  auth(systemRoles.user),
  validation(StoryV.getViewersValidationSchema),
  StoryC.getStoryViewers
);

// owner-only early delete
router.delete(
  "/:id",
  auth(systemRoles.user),
  validation(StoryV.deleteStoryValidationSchema),
  StoryC.deleteStory
);

export default router;
