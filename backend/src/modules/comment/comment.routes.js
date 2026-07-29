import express from 'express'
import * as CC from './comment.controller.js'
import * as CV from './comment.validation.js'
import { validation } from '../../../middlewares/validation.js'
import { auth } from '../../../middlewares/auth.js'
import { systemRoles } from '../../../helpers/systemRoles.js'
const router = express.Router({ mergeParams: true })


// create Comment
router.post(
  '/add',
  auth(systemRoles.user),
  validation(CV.createCommentValidationSchema),
  CC.createComment
)

// Eidt Comment
router.put(
  '/edit/:commentId',
  auth(systemRoles.user),
  validation(CV.editCommentValidationSchema),
  CC.updateComment
)

// delete Comment 
router.delete(
  '/:commentId',
  auth(systemRoles.user),
  validation(CV.deleteCommentValidationSchema),
  CC.deleteComment
);


// Get Comments for a Post
router.get(
  '/',
  auth(systemRoles.user), 
  validation(CV.getCommentsValidationSchema), 
  CC.getComments
);

// Reply to a Comment
router.post(
  "/:commentId/reply",
  auth(systemRoles.user),
  validation(CV.replyToCommentValidationSchema),
  CC.replyToComment
);


// Like or Unlike a Comment
router.patch(
  "/:commentId/like",
  auth(systemRoles.user),
  validation(CV.likeCommentValidationSchema),
  CC.likeComment
);


  


export default router
