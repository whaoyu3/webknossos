import * as React from "react";
import type { Rect, Viewport } from "oxalis/constants";
import { ArbitraryViewport } from "oxalis/constants";
import { setInputCatcherRects } from "oxalis/model/actions/view_mode_actions";
import Scalebar from "oxalis/view/scalebar";
import ViewportStatusIndicator from "oxalis/view/viewport_status_indicator";
import type { BusyBlockingInfo, OxalisState } from "oxalis/store";
import Store from "oxalis/store";
import makeRectRelativeToCanvas from "oxalis/view/layouting/layout_canvas_adapter";
import { waitForCondition } from "libs/utils";
import { useKeyPress } from "libs/react_hooks";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { adaptActiveToolToShortcuts } from "oxalis/model/accessors/tool_accessor";

const emptyViewportRect = {
  top: 0,
  left: 0,
  width: 0,
  height: 0,
};

function ignoreContextMenu(event: React.MouseEvent) {
  // hide contextmenu, while rightclicking a canvas
  event.preventDefault();
}

// Is able to make the input catcher a square (if makeQuadratic is true)
// and returns its position within the document relative to the rendering canvas
function adaptInputCatcher(inputCatcherDOM: HTMLElement, makeQuadratic: boolean): Rect {
  const noneOverflowWrapper = inputCatcherDOM.closest(".flexlayout-dont-overflow");

  if (!noneOverflowWrapper) {
    return {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    };
  }

  // If the inputcatcher does not need to be quadratic, the extent is handled by css automatically.
  if (makeQuadratic) {
    const getQuadraticExtent = () => {
      let { width, height } = noneOverflowWrapper.getBoundingClientRect();
      // These values should be floored, so that the rendered area does not overlap
      // with the containers.
      width = Math.floor(width);
      height = Math.floor(height);
      const extent = Math.min(width, height);
      return [extent, extent];
    };

    const [width, height] = getQuadraticExtent();
    inputCatcherDOM.style.width = `${width}px`;
    inputCatcherDOM.style.height = `${height}px`;
  }

  return makeRectRelativeToCanvas(inputCatcherDOM.getBoundingClientRect());
}

const renderedInputCatchers = new Map();
export async function initializeInputCatcherSizes() {
  // In an interval of 100 ms we check whether the input catchers can be initialized
  const pollInterval = 100;
  await waitForCondition(() => renderedInputCatchers.size > 0, pollInterval);
  recalculateInputCatcherSizes();
}
export function recalculateInputCatcherSizes() {
  const viewportRects: Record<string, any> = {
    PLANE_XY: emptyViewportRect,
    PLANE_YZ: emptyViewportRect,
    PLANE_XZ: emptyViewportRect,
    TDView: emptyViewportRect,
  };

  for (const [viewportID, inputCatcher] of renderedInputCatchers.entries()) {
    const makeQuadratic = viewportID === ArbitraryViewport;
    const rect = adaptInputCatcher(inputCatcher, makeQuadratic);
    viewportRects[viewportID] = rect;
  }

  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Record<string, any>' is not assi... Remove this comment to see the full error message
  Store.dispatch(setInputCatcherRects(viewportRects));
}

const cursorForTool = {
  MOVE: "move",
  SKELETON: "crosshair",
  BRUSH: "url(/assets/images/paint-brush-solid-border.svg) 0 10,auto",
  ERASE_BRUSH: "url(/assets/images/eraser-solid-border.svg) 0 8,auto",
  TRACE: "url(/assets/images/lasso-pointed-solid-border.svg) 0 14,auto",
  ERASE_TRACE: "url(/assets/images/eraser-pointed-solid-border.svg) 0 16,auto",
  FILL_CELL: "url(/assets/images/fill-pointed-solid-border.svg) 0 16,auto",
  PICK_CELL: "url(/assets/images/eye-dropper-solid-border.svg) 0 12,auto",
  BOUNDING_BOX: "move",
  PROOFREAD: "crosshair",
};

function InputCatcher({
  viewportID,
  children,
  displayScalebars,
  busyBlockingInfo,
}: {
  viewportID: Viewport;
  children?: React.ReactNode;
  displayScalebars?: boolean;
  busyBlockingInfo: BusyBlockingInfo;
}) {
  const domElementRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (domElementRef.current) {
      renderedInputCatchers.set(viewportID, domElementRef.current);
    }
    return () => {
      if (domElementRef.current) {
        renderedInputCatchers.delete(viewportID);
      }
    };
  }, []);

  const activeTool = useSelector((state: OxalisState) => state.uiInformation.activeTool);

  const isShiftPressed = useKeyPress("Shift");
  const isControlPressed = useKeyPress("Control");
  const isAltPressed = useKeyPress("Alt");

  const adaptedTool = adaptActiveToolToShortcuts(
    activeTool,
    isShiftPressed,
    isControlPressed,
    isAltPressed,
  );

  return (
    <div className="flexlayout-dont-overflow">
      <div
        id={`inputcatcher_${viewportID}`}
        ref={(domElement) => {
          domElementRef.current = domElement;
        }}
        onContextMenu={ignoreContextMenu}
        data-value={viewportID}
        className={`inputcatcher ${viewportID}`}
        style={{
          position: "relative",
          cursor: busyBlockingInfo.isBusy ? "wait" : cursorForTool[adaptedTool],
        }}
      >
        <ViewportStatusIndicator />
        {displayScalebars && viewportID !== "arbitraryViewport" ? (
          <Scalebar viewportID={viewportID} />
        ) : null}
        {children}
      </div>
    </div>
  );
}

export default InputCatcher;
