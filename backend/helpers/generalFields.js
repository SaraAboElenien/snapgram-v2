import joi from 'joi';
import { Types } from 'mongoose';

const validationObjectId = (value, helper) => {
    return Types.ObjectId.isValid(value) ? true : helper.message(" Invalid object_id ")
}

export const generalField = {
    email: joi.string().email({ tlds: { allow: ["com", 'net'] } }).required(),
    password: joi.string().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')).required(),
    rePassword: joi.string().valid(joi.ref('password')).required(),
    id: joi.string().custom(validationObjectId).required(),
    file: joi.object({
        size: joi.number().positive().required(),
        path: joi.string().required(),
        filename: joi.string().required(),
        destination: joi.string().required(),
        mimetype: joi.string().required(),
        encoding: joi.string().required(),
        originalname: joi.string().required(),
        fieldname: joi.string().required(),
    }),
    // Node/Express always lowercases incoming header names in req.headers,
    // and a real request carries many headers beyond this small known set
    // (accept-language, origin, sec-fetch-*, cookie, x-forwarded-*, etc.) —
    // .unknown(true) lets those through instead of rejecting every request.
    headers: joi.object({
        "cashe-control": joi.string(),
        'postman-token': joi.string(),
        'content-type': joi.string(),
        'content-length': joi.string(),
        host: joi.string(),
        'user-agent': joi.string(),
        accept: joi.string(),
        'accept-encoding': joi.string(),
        connection: joi.string(),
        authorization: joi.string().required()
    }).unknown(true),
}