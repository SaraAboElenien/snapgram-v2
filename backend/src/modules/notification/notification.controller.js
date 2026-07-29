import { asyncHandler } from '../../../helpers/globleErrorHandling.js'
import { AppError } from '../../../helpers/classError.js'
import notificationModel from '../../../db/models/notification.model.js'


// Get Notifications
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const notifications = await notificationModel
    .find({ receiver: userId })
    .populate("sender", "firstName lastName profileImage")
    .populate("post", "description image")
    .sort({ createdAt: -1 });

  res.status(200).json({
    notifications,
  });
});

// Mark as Read
export const markAsRead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const notification = await notificationModel.findOneAndUpdate(
    { _id: id, receiver: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new AppError("Notification not found", 404));
  }

  res.status(200).json({
    message: "Notification marked as read",
    notification,
  });
});  
