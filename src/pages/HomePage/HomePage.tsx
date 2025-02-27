/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TabPanel from "../../components/chat/TabPanel";
import HorizontalSplitter from "../../components/HorizontalSplitter";
import IframeApp, { IframeAppHandle } from "../../components/IframeApp";
import { AIRegisteredComponent } from "./types";

type HomePageProps = {
  width: number;
  height: number;
};

export type AIContext = {
  title: string;
  components: AIRegisteredComponent[];
};

const globalData: {
  aiContext: AIContext | undefined;
} = {
  aiContext: undefined,
};
export const getGlobalAIContext = () => globalData.aiContext;

const HomePage: FunctionComponent<HomePageProps> = ({ width, height }) => {
  const [searchParams] = useSearchParams();
  const iframeAppRef = useRef<IframeAppHandle>(null);
  const appUrl = searchParams.get("app");
  const navigate = useNavigate();

  const handleSendMessageToApp = useCallback((message: any) => {
    iframeAppRef.current?.sendMessage(message);
  }, []);

  const [, setRefreshCode] = useState(0);

  const handleIframeMessage = useCallback(
    (message: any) => {
      if (message.type === "aiContextUpdate") {
        globalData.aiContext = {
          title: message.title || "Untitled",
          components: message.components,
        };
        setRefreshCode((prev) => prev + 1);
        window.document.title = globalData.aiContext.title;
        console.info({ aiContext: globalData.aiContext });
      } else if (message.type === "aiUrlUpdate") {
        if (typeof message.url !== "string") return;
        let appUrl = message.url;
        // Update the URL in the browser, without encoding the URL
        // except do encode "&" as "%26" to avoid breaking the query string
        appUrl = appUrl.replace(/&/g, "%26");

        navigate(`?app=${appUrl}`, { replace: true });
      }
    },
    [navigate],
  );

  const [initialAppUrl, setInitialAppUrl] = useState<string | undefined>();
  useEffect(() => {
    if (initialAppUrl) return;
    if (!appUrl) return;
    setInitialAppUrl(appUrl);
  }, [appUrl, initialAppUrl]);

  if (!appUrl) {
    // If no app URL is provided, show chat interface in full width
    return (
      <TabPanel width={width} height={height} context={getGlobalAIContext()} />
    );
  }

  if (!initialAppUrl) {
    // If app URL is provided but not yet loaded, show loading message
    return <div>Loading...</div>;
  }

  return (
    <HorizontalSplitter
      width={width}
      height={height}
      initialSplitterPosition={Math.max(400, Math.min(250, width * 0.3))}
      children={[
        <TabPanel
          key="chat"
          width={0} // HorizontalSplitter will set the actual width
          height={height}
      context={getGlobalAIContext()}
      onSendMessageToApp={handleSendMessageToApp}
      onNeurosiftUrlUpdate={(url: string) => {
        const appUrl = url.replace(/&/g, "%26");
        navigate(`?app=${appUrl}`, { replace: true });
        // force an update to the iframe
        setInitialAppUrl(url);
      }}
        />,
        <IframeApp
          key="app"
          ref={iframeAppRef}
          width={0} // HorizontalSplitter will set the actual width
          height={height}
          url={initialAppUrl}
          onMessage={handleIframeMessage}
        />,
      ]}
    />
  );
};

export default HomePage;
