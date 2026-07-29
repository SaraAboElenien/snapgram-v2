import joi from 'joi';
import { generalField } from "../../../helpers/generalFields.js"


export const startConversationValidationSchema = {
  body: joi.object({
    userId: generalField.id.required(),
  }),
  headers: generalField.headers.required(),
};


export const getMessagesValidationSchema = {
  params: joi.object({
    id: generalField.id.required(),
  }),
  headers: generalField.headers.required(),
};


export const sendMessageValidationSchema = {
  params: joi.object({
    id: generalField.id.required(),
  }),
  body: joi.object({
    text: joi.string().min(1).max(2000).required().messages({
      'string.empty': 'Message text is required',
      'string.max': 'Message should not exceed 2000 characters',
    }),
  }),
  headers: generalField.headers.required(),
};


export const markReadValidationSchema = {
  params: joi.object({
    id: generalField.id.required(),
  }),
  headers: generalField.headers.required(),
};
