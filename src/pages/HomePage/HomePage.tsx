/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useRef, useCallback, useState } from "react";
import ChatInterface from "../../components/chat/ChatInterface";
import HorizontalSplitter from "../../components/HorizontalSplitter";
import IframeApp, { IframeAppHandle } from "../../components/IframeApp";
import { useSearchParams } from "react-router-dom";
import { AIContext } from "./AIContext";

type HomePageProps = {
  width: number;
  height: number;
};

const HomePage: FunctionComponent<HomePageProps> = ({ width, height }) => {
  const [searchParams] = useSearchParams();
  const iframeAppRef = useRef<IframeAppHandle>(null);
  const appUrl = searchParams.get("app");
  const [aiContext, setAIContext] = useState<AIContext>();

  const handleSendMessageToApp = useCallback((message: any) => {
    iframeAppRef.current?.sendMessage(message);
  }, []);

  const handleIframeMessage = useCallback((message: any) => {
    if (message.type === "aiContextUpdate") {
      setAIContext({
        components: message.components,
      });
    }
  }, []);

  if (!appUrl) {
    // If no app URL is provided, show chat interface in full width
    return (
      <ChatInterface width={width} height={height} aiContext={undefined} />
    );
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
          aiContext={aiContext}
        />,
        <IframeApp
          key="app"
          ref={iframeAppRef}
          width={0} // HorizontalSplitter will set the actual width
          height={height}
          url={appUrl}
          onMessage={handleIframeMessage}
        />,
      ]}
    />
  );
};

export default HomePage;
