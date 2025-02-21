import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface IframeAppHandle {
  sendMessage: (message: IframeMessage) => void;
}

type IframeAppProps = {
  width: number;
  height: number;
  url: string;
  onMessage?: (message: unknown) => void;
};

type IframeMessage = {
  type: string;
  payload?: unknown;
};

const IframeApp = forwardRef<IframeAppHandle, IframeAppProps>(
  ({ width, height, url, onMessage }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
      // Set up message listener
      const handleMessage = (event: MessageEvent) => {
        // Only accept messages from the embedded app's origin
        try {
          const embeddedAppOrigin = new URL(url).origin;
          if (event.origin !== embeddedAppOrigin) return;
        } catch {
          return; // Invalid URL
        }

        // Process messages from the embedded app
        if (onMessage) {
          onMessage(event.data);
        }
      };

      window.addEventListener("message", handleMessage);
      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }, [url, onMessage]);

    // Function to send messages to the iframe that we'll expose through the ref
    const sendMessage = (message: IframeMessage) => {
      if (!iframeRef.current) return;
      try {
        const targetOrigin = new URL(url).origin;
        iframeRef.current.contentWindow?.postMessage(message, targetOrigin);
      } catch {
        console.error("Invalid URL or unable to send message to iframe");
      }
    };

    useImperativeHandle(ref, () => ({
      sendMessage,
    }));

    return (
      <div style={{ width, height }}>
        <iframe
          ref={iframeRef}
          src={url}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          title="Embedded Application"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  },
);

export default IframeApp;
