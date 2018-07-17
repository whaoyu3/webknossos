/**
 * url_manager.js
 * @flow
 */

import _ from "lodash";
import Utils from "libs/utils";
import { V3 } from "libs/mjs";
import Store from "oxalis/store";
import type { Vector3, ModeType } from "oxalis/constants";
import constants, { ModeValues } from "oxalis/constants";
import { getRotation, getPosition } from "oxalis/model/accessors/flycam_accessor";
import { getActiveNode } from "oxalis/model/accessors/skeletontracing_accessor";
import { applyState } from "oxalis/model_initialization";
import window, { location } from "libs/window";
import type { TracingType } from "oxalis/store";

const MAX_UPDATE_INTERVAL = 1000;

export type UrlManagerState = {
  position?: Vector3,
  mode?: ModeType,
  zoomStep?: number,
  activeNode?: number,
  rotation?: Vector3,
};

class UrlManager {
  baseUrl: string;
  initialState: UrlManagerState;

  initialize() {
    this.baseUrl = document.location.pathname + document.location.search;
    this.initialState = this.parseUrl();
  }

  reset(): void {
    // don't use document.location.hash = ""; since it refreshes the page
    window.history.replaceState({}, null, document.location.pathname + document.location.search);
    this.initialize();
  }

  update = _.throttle(() => this.updateUnthrottled(), MAX_UPDATE_INTERVAL);

  updateUnthrottled() {
    const url = this.buildUrl();
    window.history.replaceState({}, null, url);
  }

  onHashChange() {
    const stateString = location.hash.slice(1);
    if (stateString) {
      const [key, value] = stateString.split("=");
      applyState({ [key]: Number(value) });
    }
  }

  parseUrl(): UrlManagerState {
    // State string format:
    // x,y,z,mode,zoomStep[,rotX,rotY,rotZ][,activeNode]

    const stateString = location.hash.slice(1);
    const state: UrlManagerState = {};

    if (stateString) {
      const stateArray = stateString.split(",").map(item => Number(item));
      if (stateArray.length >= 5) {
        state.position = Utils.numberArrayToVector3(stateArray.slice(0, 3));

        const modeString = ModeValues[stateArray[3]];
        if (modeString) {
          state.mode = modeString;
        } else {
          // Let's default to MODE_PLANE_TRACING
          state.mode = constants.MODE_PLANE_TRACING;
        }
        state.zoomStep = stateArray[4];

        if (stateArray.length >= 8) {
          state.rotation = Utils.numberArrayToVector3(stateArray.slice(5, 8));

          if (stateArray[8] != null) {
            state.activeNode = stateArray[8];
          }
        } else if (stateArray[5] != null) {
          state.activeNode = stateArray[5];
        }
      }
    }

    return state;
  }

  startUrlUpdater(): void {
    Store.subscribe(() => this.update());
    window.onhashchange = () => this.onHashChange();
  }

  buildHash(tracing: TracingType, options?: $Shape<UrlManagerState> = {}) {
    const position =
      options.position != null ? options.position : V3.floor(getPosition(Store.getState().flycam));
    const { viewMode } = Store.getState().temporaryConfiguration;
    const viewModeIndex = ModeValues.indexOf(viewMode);
    const zoomStep = Store.getState().flycam.zoomStep.toFixed(2);
    const rotation = constants.MODES_ARBITRARY.includes(viewMode)
      ? getRotation(Store.getState().flycam).map(e => e.toFixed(2))
      : [];

    const activeNodeId = [];
    getActiveNode(tracing).map(node => activeNodeId.push(node.id));

    return [...position, viewModeIndex, zoomStep, ...rotation, ...activeNodeId].join(",");
  }

  buildUrl(): string {
    const { tracing } = Store.getState();

    const hash = this.buildHash(tracing);
    const newBaseUrl = updateTypeAndId(this.baseUrl, tracing.tracingType, tracing.annotationId);
    return `${newBaseUrl}#${hash}`;
  }
}

export function updateTypeAndId(
  baseUrl: string,
  tracingType: string,
  annotationId: string,
): string {
  // Update the baseUrl with a potentially new annotation id and or tracing type.
  // There are two possible routes (/annotations or /datasets), but the annotation id
  // will only ever be updated for the annotations route as the other route is for
  // dataset viewing only
  return baseUrl.replace(
    /^(.*\/annotations)\/(.*?)\/([^/]*)(\/?.*)$/,
    (all, base, type, id, rest) => `${base}/${tracingType}/${annotationId}${rest}`,
  );
}

export default new UrlManager();
