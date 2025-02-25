/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import ChatInterface from "../../components/chat/ChatInterface";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const iframeAppRef = useRef<IframeAppHandle>(null);
  const appUrl = searchParams.get("app");

  const handleSendMessageToApp = useCallback((message: any) => {
    iframeAppRef.current?.sendMessage(message);
  }, []);

  const handleIframeMessage = useCallback(
    (message: any) => {
      if (message.type === "aiContextUpdate") {
        globalData.aiContext = {
          title: message.title || "Untitled",
          components: message.components,
        };
        window.document.title = globalData.aiContext.title;
        console.info({ aiContext: globalData.aiContext });
      } else if (message.type === "aiUrlUpdate") {
        const appUrl = message.url;
        setSearchParams({ app: appUrl });
      }
    },
    [setSearchParams],
  );

  const initialAppUrl = useRef<string | null>();
  useEffect(() => {
    if (initialAppUrl.current) {
      return;
    }
    initialAppUrl.current = appUrl;
  }, [appUrl]);

  if (!initialAppUrl.current) {
    // If no app URL is provided, show chat interface in full width
    return <ChatInterface width={width} height={height} />;
  }

  return (
    <HorizontalSplitter
      width={width}
      height={height}
      initialSplitterPosition={width * 0.4} // 40% width for chat
      children={[
        <ChatInterface
          key="chat"
          width={0} // HorizontalSplitter will set the actual width
          height={height}
          onSendMessageToApp={handleSendMessageToApp}
        />,
        <IframeApp
          key="app"
          ref={iframeAppRef}
          width={0} // HorizontalSplitter will set the actual width
          height={height}
          url={initialAppUrl.current}
          onMessage={handleIframeMessage}
        />,
      ]}
    />
  );
};

export default HomePage;
