import * as React from "react";
import { RefreshRounded } from "@mui/icons-material";
import {
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  styled,
  SxProps,
  TextField,
} from "@mui/material";
import useControlledProp from "../utils/useControlledProp";
import invariant from "invariant";
import useMergedRefs from "../utils/useMergedRefs";
import CheckIcon from "@mui/icons-material/Check";

const Iframe = styled("iframe")({
  border: "none",
  flex: 1,
});

export interface BrowerFrameProps {
  sx?: SxProps;
  url?: string;
  onUrlChange?: (url: string) => void;
  defaultUrl?: string;
  frameRef?: React.RefObject<HTMLIFrameElement>;
}

export default function BrowerFrame({
  sx,
  url: urlProp,
  onUrlChange: onUrlChangeProp,
  defaultUrl: defaultUrlProp,
  frameRef: frameRefProp,
}: BrowerFrameProps) {
  const localFrameRef = React.useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = React.useState(false);

  const [url = "", onUrlChange] = useControlledProp(
    "url",
    urlProp,
    onUrlChangeProp,
    defaultUrlProp
  );

  const [urlInput, setUrlInput] = React.useState(url);

  const handleReloadClick = () => {
    invariant(
      localFrameRef.current,
      "frameRef should be attached to an iframe element"
    );
    localFrameRef.current.src += "";
  };

  const frameRef = useMergedRefs(frameRefProp, localFrameRef);

  React.useEffect(() => {
    setLoading(true);
  }, [url]);

  return (
    <Stack direction="column" sx={sx}>
      <Stack direction="row" spacing={1} alignItems="center" my={1}>
        <IconButton onClick={handleReloadClick}>
          <RefreshRounded />
        </IconButton>
        <TextField
          InputProps={{
            sx: {
              borderRadius: 20,
            },
            startAdornment: (
              <InputAdornment position="start">
                {loading ? <CircularProgress size={20} /> : <CheckIcon />}
              </InputAdornment>
            ),
          }}
          variant="outlined"
          size="small"
          placeholder="URL"
          fullWidth
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onUrlChange(urlInput);
            }
          }}
        />
      </Stack>
      <Iframe ref={frameRef} src={url} onLoad={() => setLoading(false)} />
    </Stack>
  );
}
