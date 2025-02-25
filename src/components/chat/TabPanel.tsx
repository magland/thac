import { FunctionComponent, useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import ChatInterface from "./ChatInterface";
import ContextView from "./ContextView";
import { AIContext } from "../../pages/HomePage/HomePage";
import { AICallbackMessage } from "../../pages/HomePage/types";

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
      {value === index && children}
    </Box>
  );
}

type TabPanelProps = {
  width: number;
  height: number;
  context: AIContext | undefined;
  onSendMessageToApp?: (message: AICallbackMessage) => void;
};

const TabPanel: FunctionComponent<TabPanelProps> = ({
  width,
  height,
  context,
  onSendMessageToApp,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Subtract tab height from content height
  const contentHeight = height - 48; // 48px is the height of the tab bar

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width, height }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Chat" id="tab-0" aria-controls="tabpanel-0" />
        <Tab label="Context" id="tab-1" aria-controls="tabpanel-1" />
      </Tabs>
      <TabPanelWrapper value={activeTab} index={0}>
        <ChatInterface
          width={width}
          height={contentHeight}
          onSendMessageToApp={onSendMessageToApp}
        />
      </TabPanelWrapper>
      <TabPanelWrapper value={activeTab} index={1}>
        <ContextView context={context} height={contentHeight} />
      </TabPanelWrapper>
    </Box>
  );
};

export default TabPanel;
