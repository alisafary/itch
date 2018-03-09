import { fileSize } from "../format/filesize";

import platformData from "../constants/platform-data";

import { ILocalizedString, IModalButtonTag } from "../types";
import { Upload } from "../buse/messages";

interface IUploadButton {
  label: ILocalizedString;
  tags: IModalButtonTag[];
  icon: string;
  timeAgo: {
    date: Date;
  };
}

interface IMakeUploadButtonOpts {
  /** Whether to show the size of uploads (default: true) */
  showSize?: boolean;
}

export default function makeUploadButton(
  upload: Upload,
  opts = { showSize: true } as IMakeUploadButtonOpts
): IUploadButton {
  let label = `${upload.displayName || upload.filename}`;
  let tags: IModalButtonTag[] = [];

  if (upload.size > 0 && opts.showSize) {
    tags.push({
      label: `${fileSize(upload.size)}`,
    });
  }

  if (upload.demo) {
    tags.push({
      label: ["pick_update_upload.tags.demo"],
    });
  }

  if (upload.type === "html") {
    tags.push({
      icon: "html5",
    });
  }

  if (upload.type === "soundtrack") {
    tags.push({
      icon: "html5",
    });
  }

  for (const prop of Object.keys(platformData)) {
    if ((upload as any)[prop]) {
      tags.push({
        icon: platformData[prop].icon,
      });
    }
  }

  const timeAgo = {
    date: upload.updatedAt,
  };

  const icon = "download";

  return { label, tags, icon, timeAgo };
}
