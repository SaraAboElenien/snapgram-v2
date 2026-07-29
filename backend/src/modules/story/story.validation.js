import joi from 'joi';
import { generalField } from "../../../helpers/generalFields.js"


export const createStoryValidationSchema = {
  headers: generalField.headers.required(),
};


export const viewStoryValidationSchema = {
  params: joi.object({
    id: generalField.id.required(),
  }),
  headers: generalField.headers.required(),
};


export const getViewersValidationSchema = {
  params: joi.object({
    id: generalField.id.required(),
  }),
  headers: generalField.headers.required(),
};


export const deleteStoryValidationSchema = {
  params: joi.object({
    id: generalField.id.required(),
  }),
  headers: generalField.headers.required(),
};
