import express from 'express'
import * as NC from './notification.controller.js'
import * as NV from './notification.validation.js'
import { validation } from '../../../middlewares/validation.js'
import { auth } from '../../../middlewares/auth.js'
import { systemRoles } from '../../../helpers/systemRoles.js'

const router = express.Router()

router.get('/', auth(systemRoles.user), validation(NV.getNotificationsValidationSchema), NC.getNotifications)

router.patch('/:id/read', auth(systemRoles.user), validation(NV.markAsReadValidationSchema), NC.markAsRead)

export default router
  