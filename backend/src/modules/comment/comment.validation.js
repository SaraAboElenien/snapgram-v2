import joi from 'joi';
import { generalField } from "../../../helpers/generalFields.js"




export const createCommentValidationSchema = {
    body: joi.object({
      comment: joi.string().min(1).max(500).required().messages({
        'string.empty': 'Comment text is required'
      })
    }),
      params: joi.object({
       postId : generalField.id.required()
    }),
    headers: generalField.headers.required(),
  };


  export const editCommentValidationSchema = {
    body: joi.object({
      content: joi.string().min(1).max(500).required().messages({
        'string.empty': 'Comment content is required',
        'string.min': 'Comment content must be at least 1 character long',
        'string.max': 'Comment content must not exceed 500 characters',
      }),
    }),
    params: joi.object({
      postId: generalField.id.required(),
      commentId: generalField.id.required(),
    }),
    headers: generalField.headers.required(),
  };
  

  export const deleteCommentValidationSchema = {
    params: joi.object({
      postId: generalField.id.required().messages({
        'any.required': 'Post ID is required',
        'string.pattern.name': 'Post ID must be a valid ObjectId',
      }),
      commentId: generalField.id.required().messages({
        'any.required': 'Comment ID is required',
        'string.pattern.name': 'Comment ID must be a valid ObjectId',
      }),
    }),
    headers: generalField.headers.required(),
  };



  export const getCommentsValidationSchema = {
    params: joi.object({
      postId: generalField.id.required(),
    }),
    headers: generalField.headers.required(),
  };
  
  

  export const replyToCommentValidationSchema = {
    body: joi.object({
      comment: joi
        .string()
        .min(1)
        .max(500)
        .required()
        .messages({
          "string.empty": "Reply content is required",
          "string.min": "Reply should be at least 1 character long",
          "string.max": "Reply should not exceed 500 characters",
        }),
    }),
    params: joi.object({
      postId: generalField.id.required(),
      commentId: generalField.id.required(),
    }),
    headers: generalField.headers.required(),
  };





  export const likeCommentValidationSchema = {
    params: joi.object({
      postId: generalField.id.required(),
      commentId: generalField.id.required(),
    }),
    headers: generalField.headers.required(),
  };    