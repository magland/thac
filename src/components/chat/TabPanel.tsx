import { FunctionComponent, useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import ChatInterface from "./ChatInterface";
import ContextView from "./ContextView";
import { AIContext } from "../../pages/HomePage/HomePage";
import { AICallbackMessage } from "../../pages/HomePage/types";
import { useJupyterConnectivity } from "../../jupyter/JupyterConnectivity";
import JupyterView from "../../jupyter/JupyterView";

interface TabPanelWrapperProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanelWrapper(props: TabPanelWrapperProps) {
  const { children, value, index } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      sx={{ flex: 1, overflow: "hidden" }}
    >
      {children}
    </Box>
  );
}

type TabPanelProps = {
  width: number;
  height: number;
  context: AIContext | undefined;
  onSendMessageToApp?: (message: AICallbackMessage) => void;
  onNeurosiftUrlUpdate?: (url: string) => void;
};

const TabPanel: FunctionComponent<TabPanelProps> = ({
  width,
  height,
  context,
  onSendMessageToApp,
  onNeurosiftUrlUpdate,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Subtract tab height from content height
  const contentHeight = height - 48; // 48px is the height of the tab bar

  const jupyterConnectivityState = useJupyterConnectivity();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width, height }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Chat" id="tab-0" aria-controls="tabpanel-0" />
        <Tab label="Context" id="tab-1" aria-controls="tabpanel-1" />
        <Tab
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              Jupyter
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor:
                    jupyterConnectivityState.jupyterServerIsAvailable
                      ? "#4caf50"
                      : "#ddd",
                }}
              />
            </Box>
          }
          id="tab-2"
          aria-controls="tabpanel-2"
        />
      </Tabs>
      <TabPanelWrapper value={activeTab} index={0}>
        <ChatInterface
          width={width}
          height={contentHeight}
          onSendMessageToApp={onSendMessageToApp}
          onNeurosiftUrlUpdate={onNeurosiftUrlUpdate}
        />
      </TabPanelWrapper>
      <TabPanelWrapper value={activeTab} index={1}>
        <ContextView context={context} height={contentHeight} />
      </TabPanelWrapper>
      <TabPanelWrapper value={activeTab} index={2}>
        <JupyterView width={width} height={contentHeight} />
      </TabPanelWrapper>
    </Box>
  );
};

export default TabPanel;
