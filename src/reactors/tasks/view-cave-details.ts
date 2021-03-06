import { Watcher } from "../watcher";
import { actions } from "../../actions";

import rootLogger from "../../logger";
const logger = rootLogger.child({ name: "queue-cave-reinstall" });

import { modalWidgets } from "../../components/modal-widgets/index";
import { withButlerClient, messages } from "../../buse";

export default function(watcher: Watcher) {
  watcher.on(actions.viewCaveDetails, async (store, action) => {
    const { caveId } = action.payload;

    const { cave } = await withButlerClient(logger, async client => {
      return await client.call(messages.FetchCave({ caveId }));
    });

    store.dispatch(
      actions.openModal(
        modalWidgets.exploreJson.make({
          title: `Cave details for ${cave.game ? cave.game.title : "?"}`,
          message: "Local cave data:",
          widgetParams: {
            data: cave,
          },
          buttons: [
            {
              label: ["prompt.action.ok"],
            },
          ],
        })
      )
    );
  });
}
