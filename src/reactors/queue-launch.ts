import { actions } from "../actions";

import asTask from "./tasks/as-task";
import { Watcher } from "./watcher";

import { promisedModal } from "./modals";
import { modalWidgets } from "../components/modal-widgets/index";

import { performLaunch } from "./launch/perform-launch";
import { getErrorMessage, isInternalError, asRequestError } from "../buse";
import { Code } from "../buse/messages";

export default function(watcher: Watcher) {
  watcher.on(actions.queueLaunch, async (store, action) => {
    const { cave } = action.payload;
    const { game } = cave;

    asTask({
      name: "launch",
      gameId: game.id,
      store,
      work: async (ctx, logger) => {
        await performLaunch(ctx, logger, cave, game);
        store.dispatch(actions.launchEnded({}));
      },
      onError: async (e: any, log) => {
        let title = game ? game.title : "<missing game>";

        const re = asRequestError(e);
        if (re) {
          switch (re.rpcError.code) {
            case Code.OperationAborted:
              // just ignore it
              return;

            case Code.InstallFolderDisappeared:
              // oh we can do something about that.
              store.dispatch(
                actions.openModal(
                  modalWidgets.naked.make({
                    title: ["game.install.could_not_launch", { title }],
                    coverUrl: game.coverUrl,
                    stillCoverUrl: game.stillCoverUrl,
                    message: `The folder where **${title}** was installed doesn't exist anymore.`,
                    detail: `That means we can't open it.`,
                    bigButtons: [
                      {
                        icon: "delete",
                        label: "Remove install entry",
                        tags: [{ label: "Recommended" }],
                        action: actions.queueCaveUninstall({ caveId: cave.id }),
                      },
                      {
                        icon: "folder-open",
                        label: "Open parent folder",
                        className: "secondary",
                        tags: [{ label: "Seeing is believing." }],
                        action: actions.exploreCave({ caveId: cave.id }),
                      },
                    ],
                    buttons: ["nevermind"],
                    widgetParams: null,
                  })
                )
              );
              return;
          }
        }

        await promisedModal(
          store,
          modalWidgets.showError.make({
            title: ["game.install.could_not_launch", { title }],
            coverUrl: game.coverUrl,
            stillCoverUrl: game.stillCoverUrl,
            message: getErrorMessage(e),
            detail: isInternalError(e)
              ? ["game.install.could_not_launch.detail"]
              : null,
            widgetParams: { rawError: e, log },
            buttons: [
              {
                label: ["prompt.action.ok"],
              },
              "cancel",
            ],
          })
        );
      },
    });
  });
}
