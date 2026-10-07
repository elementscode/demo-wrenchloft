import { Request, Response, ForbiddenError, session } from "@elements/app";
import { requireRole } from "#app/shared/services/auth";
import { photoBytes, isImageType } from "#app/shared/services/work-orders";

export default function servePhoto(req: Request, res: Response) {
  let { role, userId } = requireRole();
  let photo = photoBytes(req.params.id);

  if (role === "requester" && photo.requestedBy !== userId) {
    throw new ForbiddenError();
  }

  if (isImageType(photo.contentType)) {
    res.setHeader("Content-Type", photo.contentType);
  } else {
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment");
  }

  res.setHeader("Cache-Control", "private, max-age=86400, immutable");

  return photo.data;
}
