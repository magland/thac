import { FunctionComponent } from "react";
import { Box, Typography } from "@mui/material";
import { AIContext } from "../../pages/HomePage/HomePage";
import Markdown from "react-markdown";

type ContextViewProps = {
  context: AIContext | undefined;
  height: number;
};

const ContextView: FunctionComponent<ContextViewProps> = ({
  context,
  height,
}) => {
  if (!context) {
    return (
      <Box sx={{ p: 2, height }}>
        <Typography color="text.secondary">No context available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height, overflowY: "auto" }}>
      <Typography variant="h6" gutterBottom>
        {context.title}
      </Typography>
      {context.components.map((component) => (
        <Box key={component.id} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Component: {component.id}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <Markdown>{component.context}</Markdown>
          </Typography>
          {component.callbacks && component.callbacks.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Available Actions:
              </Typography>
              {component.callbacks.map((callback) => (
                <Box key={callback.id} sx={{ ml: 2, mb: 1 }}>
                  <Typography variant="body2">
                    • {callback.description}
                  </Typography>
                </Box>
              ))}
            </>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default ContextView;
