import { Watcher } from "./watcher";

import { createSelector } from "reselect";

import env from "../env";

import { darkMineShaft } from "../constants/colors";
import { app, BrowserWindow } from "electron";
import config from "../util/config";
import { getImagePath } from "../os/resources";
import * as os from "../os";
import * as invariant from "invariant";
import { debounce } from "underscore";

import rootLogger from "../logger";
const logger = rootLogger.child({ name: "main-window" });

import { actions } from "../actions";

let createLock = false;
let firstWindow = true;

type AppCommand = "browser-backward" | "browser-forward";

const BOUNDS_CONFIG_KEY = "main_window_bounds";
const MAXIMIZED_CONFIG_KEY = "main_window_maximized";

const macOs = os.platform() === "darwin";

import { IRootState, IStore } from "../types";
import { Space } from "../helpers/space";
import { openAppDevTools } from "./open-app-devtools";
import { t } from "../format/t";

async function createWindow(store: IStore, hidden: boolean) {
  if (createLock) {
    return;
  }
  createLock = true;

  const userBounds = config.get(BOUNDS_CONFIG_KEY) || {};
  const bounds = {
    x: -1,
    y: -1,
    width: 1250,
    height: 720,
    ...userBounds,
  };
  const { width, height } = bounds;
  const center = bounds.x === -1 && bounds.y === -1;
  let iconName = "icon";
  if (process.platform === "win32") {
    iconName = "icon-32";
  }

  const iconPath = getImagePath(
    "window/" + env.appName + "/" + iconName + ".png"
  );

  let opts: Electron.BrowserWindowConstructorOptions = {
    title: app.getName(),
    icon: iconPath,
    width,
    height,
    center,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: darkMineShaft,
    titleBarStyle: "hidden",
    frame: false,
    webPreferences: {
      blinkFeatures: "ResizeObserver",
    },
  };
  const window = new BrowserWindow(opts);

  if (os.platform() === "darwin") {
    try {
      app.dock.setIcon(iconPath);
    } catch (err) {
      logger.warn(`Could not set dock icon: ${err.stack}`);
    }
  }

  if (!center) {
    window.setPosition(bounds.x, bounds.y);
  }
  ensureWindowInsideDisplay(window);

  window.on("close", (e: any) => {
    const prefs = store.getState().preferences || { closeToTray: true };

    let { closeToTray } = prefs;
    if (env.name === "test") {
      // always let app close in testing
      closeToTray = false;
    }

    if (closeToTray) {
      logger.debug("Close to tray enabled");
    } else {
      logger.debug("Close to tray disabled, quitting!");
      process.nextTick(() => {
        store.dispatch(actions.quit({}));
      });
      return;
    }

    if (!window.isVisible()) {
      logger.info("Main window hidden, letting it close");
      // timeout elapsed and still not shown - it's a closin'!
      return;
    }

    if (!prefs.gotMinimizeNotification) {
      store.dispatch(
        actions.updatePreferences({
          gotMinimizeNotification: true,
        })
      );

      const i18n = store.getState().i18n;
      store.dispatch(
        actions.notify({
          title: t(i18n, ["notification.see_you_soon.title"]),
          body: t(i18n, ["notification.see_you_soon.message"]),
        })
      );
    }

    // hide, never destroy
    e.preventDefault();
    logger.info("Hiding main window");
    window.hide();
  });

  window.on("focus", (e: any) => {
    store.dispatch(actions.windowFocusChanged({ focused: true }));
  });

  window.on("blur", (e: any) => {
    store.dispatch(actions.windowFocusChanged({ focused: false }));
  });

  window.on("enter-full-screen", (e: any) => {
    if (!store.getState().ui.mainWindow.fullscreen) {
      store.dispatch(actions.windowFullscreenChanged({ fullscreen: true }));
    }
  });

  window.on("leave-full-screen", (e: any) => {
    if (store.getState().ui.mainWindow.fullscreen) {
      store.dispatch(actions.windowFullscreenChanged({ fullscreen: false }));
    }
  });

  window.on("maximize", (e: any) => {
    if (!store.getState().ui.mainWindow.maximized) {
      store.dispatch(actions.windowMaximizedChanged({ maximized: true }));
    }
  });

  window.on("unmaximize", (e: any) => {
    if (store.getState().ui.mainWindow.maximized) {
      store.dispatch(actions.windowMaximizedChanged({ maximized: false }));
    }
  });

  window.on("app-command", (e: any, cmd: AppCommand) => {
    switch (cmd) {
      case "browser-backward":
        store.dispatch(actions.commandGoBack({}));
        break;
      case "browser-forward":
        store.dispatch(actions.commandGoForward({}));
        break;
      default:
      // ignore unknown app commands
    }
  });

  const debouncedBounds = debounce(() => {
    if (window.isDestroyed()) {
      return;
    }
    const windowBounds = window.getBounds();
    store.dispatch(actions.windowBoundsChanged({ bounds: windowBounds }));
  }, 2000);

  window.on("move", (e: any) => {
    debouncedBounds();
  });

  window.on("resize", (e: any) => {
    debouncedBounds();
  });

  window.on("maximize", (e: any) => {
    config.set(MAXIMIZED_CONFIG_KEY, true);
  });

  window.on("unmaximize", (e: any) => {
    config.set(MAXIMIZED_CONFIG_KEY, false);
  });

  window.on("ready-to-show", async (e: any) => {
    createLock = false;
    if (firstWindow) {
      firstWindow = false;
      store.dispatch(actions.firstWindowReady({}));
    }

    store.dispatch(actions.windowReady({ id: window.id }));

    if (hidden) {
      store.dispatch(actions.bounce({}));
    } else {
      showWindow(window);
    }
  });

  let uri = `file:///${__dirname}/index.html`;
  if (
    process.env.NODE_ENV !== "test" &&
    process.env.NODE_ENV !== "production"
  ) {
    uri = `http://localhost:1234/dist/index.html`;
  }
  if (process.env.ITCH_REACT_PERF === "1") {
    logger.info(`Enabling react perf`);
    uri += `?react_perf`;
  }
  window.loadURL(uri);
  if (env.name === "development") {
    window.emit("ready-to-show", {});
  }

  if (parseInt(process.env.DEVTOOLS, 10) > 0) {
    await openAppDevTools(window);
  }
}

/**
 * Make sure the window isn't outside the bounds of the screen,
 * cf. https://github.com/itchio/itch/issues/1051
 */
function ensureWindowInsideDisplay(window: Electron.BrowserWindow) {
  const originalBounds = window.getBounds();
  logger.debug(
    `Ensuring ${JSON.stringify(originalBounds)} is inside a display`
  );

  const { screen } = require("electron");
  const display = screen.getDisplayMatching(originalBounds);
  if (!display) {
    logger.warn(`No display found matching ${JSON.stringify(originalBounds)}`);
    return;
  }

  const displayBounds = display.bounds;
  logger.debug(`Display bounds: ${JSON.stringify(displayBounds)}`);

  let bounds = originalBounds;

  const displayLeft = displayBounds.x;
  if (bounds.x < displayLeft) {
    bounds = { ...bounds, x: displayLeft };
  }

  const displayTop = displayBounds.y;
  if (bounds.y < displayTop) {
    bounds = { ...bounds, y: displayTop };
  }

  const displayRight = displayBounds.width + displayBounds.x;
  if (bounds.x + bounds.width > displayRight) {
    bounds = { ...bounds, x: displayRight - bounds.width };
  }

  const displayBottom = displayBounds.height + displayBounds.y;
  if (bounds.y + bounds.height > displayBottom) {
    bounds = { ...bounds, y: displayBottom - bounds.height };
  }

  if (bounds !== originalBounds) {
    logger.debug(`New bounds: ${JSON.stringify(bounds)}`);
    window.setBounds(bounds);
  }

  if (env.name === "test") {
    logger.info(
      `Main window is ${bounds.width}x${bounds.height}, at (${bounds.x}, ${
        bounds.y
      })`
    );
  }
}

async function hideWindow() {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.close();
  }
}

async function minimizeWindow() {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.minimize();
  }
}

async function toggleMaximizeWindow() {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  }
}

async function exitFullScreen() {
  const window = BrowserWindow.getFocusedWindow();
  if (window && window.isFullScreen()) {
    window.setFullScreen(false);
  }
}

function showWindow(window: Electron.BrowserWindow) {
  window.show();
  const maximized = config.get(MAXIMIZED_CONFIG_KEY) || false;
  if (maximized && !macOs) {
    window.maximize();
  }

  if (!maximized) {
    ensureWindowInsideDisplay(window);
  }
}

function ensureMainWindowInsideDisplay(store: IStore) {
  const id = store.getState().ui.mainWindow.id;
  if (!id) {
    return;
  }

  const window = BrowserWindow.fromId(id);
  if (!window) {
    return;
  }

  if (!window.isVisible()) {
    return;
  }

  ensureWindowInsideDisplay(window);
}

function updateTitle(store: IStore, title: string) {
  const id = store.getState().ui.mainWindow.id;
  if (!id) {
    return;
  }

  const window = BrowserWindow.fromId(id);
  if (!window) {
    return;
  }

  window.setTitle(title);
}

export default function(watcher: Watcher) {
  watcher.onStateChange({
    makeSelector: (store, schedule) => {
      const getI18n = (rs: IRootState) => rs.i18n;
      const getID = (rs: IRootState) => rs.profile.navigation.tab;
      const getTabInstance = (rs: IRootState) => rs.profile.tabInstances;

      const getSpace = createSelector(getID, getTabInstance, (id, tabData) =>
        Space.fromInstance(tabData[id])
      );

      return createSelector(getI18n, getSpace, (i18n, sp) => {
        updateTitle(store, t(i18n, sp.label()) + " - itch");
      });
    },
  });

  watcher.on(actions.preferencesLoaded, async (store, action) => {
    const hidden = action.payload.openAsHidden;
    store.dispatch(actions.focusWindow({ hidden }));

    const { screen } = require("electron");
    screen.on("display-added", () => ensureMainWindowInsideDisplay(store));
    screen.on("display-removed", () => ensureMainWindowInsideDisplay(store));
    screen.on("display-metrics-changed", () =>
      ensureMainWindowInsideDisplay(store)
    );
  });

  watcher.on(actions.focusWindow, async (store, action) => {
    const id = store.getState().ui.mainWindow.id;
    const options = action.payload || {};

    if (id) {
      const window = BrowserWindow.fromId(id);
      invariant(window, "window still exists");
      if (options.toggle && window.isVisible()) {
        window.hide();
      } else {
        showWindow(window);
      }
    } else {
      await createWindow(store, action.payload.hidden);
    }
  });

  watcher.on(actions.hideWindow, async (store, action) => {
    hideWindow();
  });

  watcher.on(actions.minimizeWindow, async (store, action) => {
    minimizeWindow();
  });

  watcher.on(actions.toggleMaximizeWindow, async (store, action) => {
    toggleMaximizeWindow();
  });

  watcher.on(actions.commandBack, async (store, action) => {
    exitFullScreen();
  });

  watcher.on(actions.windowBoundsChanged, async (store, action) => {
    const { bounds } = action.payload;
    config.set(BOUNDS_CONFIG_KEY, bounds);
  });

  watcher.on(actions.closeTabOrAuxWindow, async (store, action) => {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused) {
      const id = store.getState().ui.mainWindow.id;
      if (focused.id === id) {
        store.dispatch(actions.closeCurrentTab({}));
      } else {
        focused.close();
      }
    }
  });

  watcher.on(actions.quitWhenMain, async (store, action) => {
    const mainId = store.getState().ui.mainWindow.id;
    const focused = BrowserWindow.getFocusedWindow();

    if (focused) {
      if (focused.id === mainId) {
        store.dispatch(actions.quit({}));
      } else {
        focused.close();
      }
    }
  });

  watcher.on(actions.quit, async (store, action) => {
    app.exit(0);
  });

  watcher.on(actions.quitAndInstall, async (store, action) => {
    logger.info("Handing off to Squirrel for self-update");
    require("electron").autoUpdater.quitAndInstall();
  });
}
