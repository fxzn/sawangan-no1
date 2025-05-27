import { ResponseError } from "../error/response-error.js";


export const checkAvatarExists = (req, res, next) => {
  if (!req.file) {
    throw new ResponseError(400, 'Avatar file is required');
  }
  next();
};
