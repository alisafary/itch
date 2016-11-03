
export type GameType = "default" | "html" | "download";

/**
 * Contains information about a game, retrieved via the itch.io API,
 * and saved to the local database.
 */
export interface IGameRecord {
    /** itch.io-generated unique identifier */
    id: number;

    /** unique identifier of the developer this game belongs to */
    userId: number;

    /** human-friendly title (may contain any character) */
    title: string;

    /** human-friendly short description */
    shortText: string;

    /** non-GIF cover url */
    stillCoverUrl?: string;

    /** cover url (might be a GIF) */
    coverUrl: string;

    /** downloadable game, html game, etc. */
    type: GameType;

    /** Only present for HTML5 games, otherwise null */
    embed?: IGameEmbedInfo;

    /** True if the game has a demo that can be downloaded for free */
    hasDemo?: boolean;
}

/**
 * Presentation information for HTML5 games
 */
export interface IGameEmbedInfo {
    width: number;
    height: number;

    // for itch.io website, whether or not a fullscreen button should be shown
    fullscreen: boolean;
}

export interface IUserRecord {
    /** itch.io-generated unique identifier */
    id: number;

    /** human-friendly account name (may contain any character) */
    displayName: string;

    /** used for login, may be changed */
    username: string;

    /** avatar URL, may be gif */
    coverUrl: string;

    /** non-GIF avatar */
    stillCoverUrl?: string;
}

export interface ICollectionRecord {
    /** itch.io-generated unique identifier */
    id: number;

    /** human-friendly title, may contain any character */
    title: string;

    /** total number of games in collection */
    gamesCount: number;

    /** identifiers of the games in this collection */
    gameIds: Array<number>;
}

export interface IInstallLocationRecord {
    /** UUID or 'default' */
    id: string;

    /** path on disk, null for 'default' (since it's computed) */
    path?: string;
}

export interface ITabDataSet {
    [key: string]: ITabData;
}

export interface IGameRecordSet {
    [id: number]: IGameRecord;
}

export interface ITabData {
    /** path of tab, something like `collections/:id`, etc. */
    path?: string;

    /** title of web page displayed by tab, if any */
    webTitle?: string;

    /** name of tab as shown in sidebar */
    label: string;

    /** subtitle shown under label when tab is shown */
    subtitle?: string;

    /** used for game tabs or collection tabs */
    games?: IGameRecordSet;

    /** image to show before label when tab is shown */
    image?: string;

    /** do we have enough duplicate image properties already? */
    iconImage?: string;

    /** special CSS class applied to image shown in tab */
    imageClass?: string;
}

export interface ICaveRecordLocation {
    /* unique GUID generated locally */
    id?: string;

    /** name of the install location: 'default' or a GUID */
    installLocation?: string;

    /** name of the install folder in the install location, derived from the game's title */
    installFolder?: string;

    /** scheme used for computing paths: see util/pathmaker */
    pathScheme: number;
}

/** Describes an installed item, that can be launched or opened */
export interface ICaveRecord extends ICaveRecordLocation {
    /* unique GUID generated locally */
    id: string;
}

export interface IUploadRecord {
    /** numeric identifier generated by itch.io */
    id: number;

    /** name of the uploaded file - null for external uploads */
    filename?: string;

    /** if this is a wharf-enabled upload, identifier of the latest build */
    buildId: number;

    /** set to 'html' for HTML5 games */
    type: string;
}

/**
 * MarketDB is a lightweight disk-based JSON object store.
 * Tables have string indices, and they contain objects with string indices.
 */
export interface IMarket {
    saveEntity: (table: string, id: string, payload: any) => void;
    getEntities: (table: string) => IEntityMap;
}

export interface IEntityMap {
  [entityId: string]: any;
}

export interface ITableMap {
  [table: string]: IEntityMap;
}

/**
 * Refers to a bunch of records, for example:
 * { 'apples': ['gala', 'cripps', 'golden'], 'pears': ['anjou'] }
 */
export interface IEntityRefs {
  [table: string]: string[];
}

// see https://itch.io/docs/itch/integrating/manifest.html
export interface IManifestAction {
    name: string;
    path: string;
    icon: string;
    args: Array<string>;
    sandbox: boolean;
    scope: string;
}

export interface IManifest {
    actions: Array<IManifestAction>;
}

export interface IOwnUserRecord extends IUserRecord {
    
}

export interface IDownloadKey {
  id: string;
}

export interface ICredentials {
    key: string;
    me: IOwnUserRecord;
}

/**
 * The entire application state, following the redux philosophy
 */
export interface IState {
    history: IHistoryState;
    modals: IModalsState;
    globalMarket: IMarketState;
    market: IMarketState;
    system: ISystemState;
    setup: ISetupState;
    rememberedSessions: IRememberedSessionsState;
    session: ISessionState;
    i18n: II18nState;
    ui: IUIState;
    selfUpdate: ISelfUpdateState;
    preferences: IPreferencesState;
    tasks: ITasksState;
    downloads: IDownloadsState;
    status: IStatusState;
}

export interface IHistoryItem {
    /** generated identifier */
    id: string;
    /** localized message */
    label: any[];
    /** Date at which the history item occured */
    date: number;
    /** counts as unread? */
    active: boolean;
}

export interface IHistoryState {
    items: {
        [id: string]: IHistoryItem;
    };
}

export interface IModal {
    /** generated identifier for this modal */
    id: string;
}

export type IModalsState = IModal[];

export interface IMarketState {
    [tableName: string]: {
        [id: string]: any;
    };
}

export interface IUserMarketState extends IMarketState {
    
}

export interface IGlobalMarketState extends IMarketState {
    caves: {
        [id: string]: ICaveRecord;
    };
}

export interface ISystemState {

}

export interface ISetupOperation {
    message: ILocalizedString;
    icon: string;
}

export interface ISetupState {
    done: boolean;
    errors: string[];
    blockingOperation: ISetupOperation;
}

export interface IRememberedSession {
    /** API key */
    key: string;

    /** user info */
    me: IOwnUserRecord;

    /** date the user was last active in the app (this install) */
    lastConnected: number;
}

export interface IRememberedSessionsState {
    [id: string]: IRememberedSession;
}

export interface ISessionState {

}

export interface II18nResources {
    [lang: string]: {
        [key: string]: string;
    };
}

export interface II18nState {
    strings: II18nResources;
    queued: {
        [lang: string]: boolean;
    };
    downloading: {
        [lang: string]: boolean;
    };
}

export interface IUIState {

}

export interface ISelfUpdate {

}

export interface ISelfUpdateState {
    available?: ISelfUpdate;
    downloading?: ISelfUpdate;
    downloaded?: ISelfUpdate;

    checking: boolean;
    uptodate: boolean;
    error?: string;
}

export interface IInstallLocation {

}

export interface IPreferencesState {
  /** is the app allowed to check for updates to itself? */
  downloadSelfUpdates: boolean;
  /** do not make any network requests */
  offlineMode: boolean;
  installLocations: {
      [key: string]: IInstallLocation;
  };
  /** where to install games (doesn't change already-installed games) */
  defaultInstallLocation: string;
  sidebarWidth: number;
  /** use sandbox */
  isolateApps: boolean;
  /** when closing window, keep running in tray */
  closeToTray: boolean;
  /** show the advanced section of settings */
  showAdvanced: boolean;
}

export interface ITasksState {

}

/**
 * A download in progress for the app. Always linked to a game,
 * sometimes for first install, sometimes for update.
 */
export interface IDownloadItem {
    /** unique generated id for this download */
    id: string;
    
    /** download progress in a [0, 1] interval */
    progress: number;

    /** set when download has been completed */
    finished?: boolean;

    /** id of the game we're downloading */
    gameId: number;

    /**
     * game record at the time the download started - in case we're downloading
     * something that's not cached locally.
     */
    game: IGameRecord;

    /** order in the download list: can be negative, for reordering */
    order: number;
}

export interface IDownloadsState {
    /** All the downloads we know about, indexed by their own id */
    downloads: {
        [id: string]: IDownloadItem;
    };

    /** All the downloads we know about, indexed by the id of the game they're associated to */
    downloadsByGameId: {
        [gameId: string]: IDownloadItem;
    };

    /** The download currently being downloaded (if they're not paused) */
    activeDownload: IDownloadItem;

    /** Download speeds, in bps, each item represents one second */
    speeds: {bps: number}[];
}

export interface IStatusState {

}

export type ILocalizedString = any[];
