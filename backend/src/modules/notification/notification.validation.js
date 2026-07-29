import joi from 'joi';
import { generalField } from "../../../helpers/generalFields.js"


export const getNotificationsValidationSchema = {
  headers: generalField.headers.required(),
};


export const markAsReadValidationSchema = {
  params: joi.object({
    id: generalField.id.required(),
  }),
  headers: generalField.headers.required(),
};
