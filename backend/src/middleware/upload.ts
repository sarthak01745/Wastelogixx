import multer from "multer";
import { ApiError } from "../utils/api-error";

const storage = multer.memoryStorage();

export const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new ApiError(400, "Only image uploads are allowed"));
      return;
    }

    callback(null, true);
  },
});
