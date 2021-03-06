import "electron";

interface WebViewProps {
  is?: boolean;
  src?: string;
  preload?: string;
  plugins?: string;
  partition?: string;
  sandbox?: boolean;
  ref?: (wv: Electron.WebviewTag) => void;
  style?: React.CSSProperties;
  autosize?: boolean;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: WebViewProps;
    }
  }
  interface NodeModule {
    hot?: {
      accept: (cb: () => void) => void;
      dispose: (cb: () => void) => void;
    };
  }
}
