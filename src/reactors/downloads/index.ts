import { Watcher } from "../watcher";

import showDownloadError from "./show-download-error";
import downloadEnded from "./download-ended";
import driver from "./driver";
import operations from "./operations";

export default function(watcher: Watcher) {
  showDownloadError(watcher);
  downloadEnded(watcher);
  driver(watcher);
  operations(watcher);
}
