/**
 * tracing_view.js
 * @flow
 */

import * as React from "react";
import classnames from "classnames";
import { connect } from "react-redux";
import { Switch } from "antd";
import Constants from "oxalis/constants";
import { setFlightmodeRecordingAction } from "oxalis/model/actions/settings_actions";
import InputCatchers from "oxalis/view/input_catchers";
import { isVolumeTracingDisallowed } from "oxalis/model/accessors/volumetracing_accessor";
import type { OxalisState } from "oxalis/store";
import type { ModeType } from "oxalis/constants";
import type { Dispatch } from "redux";
import Toast from "libs/toast";
import messages from "messages";

type Props = {
  flightmodeRecording: boolean,
  onChangeFlightmodeRecording: ?Function,
  viewMode: ModeType,
  scale: number,
  isVolumeTracingDisallowed: boolean,
};

const registerWebGlCrashHandler = canvas => {
  if (!canvas) {
    return;
  }
  canvas.addEventListener(
    "webglcontextlost",
    e => {
      Toast.error(messages["webgl.context_loss"], { sticky: true });
      console.error("Webgl context lost", e);
    },
    false,
  );
};

class TracingView extends React.PureComponent<Props> {
  handleContextMenu(event: SyntheticInputEvent<>) {
    // hide contextmenu, while rightclicking a canvas
    event.preventDefault();
  }

  getRecordingSwitch = () => (
    <Switch
      id="flightmode-switch"
      checkedChildren="Recording"
      unCheckedChildren="Watching"
      checked={this.props.flightmodeRecording}
      onChange={this.props.onChangeFlightmodeRecording}
    />
  );

  render() {
    const isArbitraryMode = Constants.MODES_ARBITRARY.includes(this.props.viewMode);
    const inputCatchers = !isArbitraryMode ? <InputCatchers /> : null;
    const flightModeRecordingSwitch = isArbitraryMode ? this.getRecordingSwitch() : null;
    const divClassName = classnames({ "zoomstep-warning": this.props.isVolumeTracingDisallowed });

    const canvasWidth = isArbitraryMode
      ? Math.round(this.props.scale * Constants.VIEWPORT_WIDTH)
      : Math.round(this.props.scale * Constants.VIEWPORT_WIDTH) * 2 + Constants.VIEWPORT_GAP_WIDTH;
    const canvasStyle = {
      width: canvasWidth,
      height: canvasWidth,
    };

    return (
      <div id="tracing" className={divClassName} onContextMenu={this.handleContextMenu}>
        {inputCatchers}
        {flightModeRecordingSwitch}
        <canvas ref={registerWebGlCrashHandler} id="render-canvas" style={canvasStyle} />
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: Dispatch<*>) => ({
  onChangeFlightmodeRecording(value) {
    dispatch(setFlightmodeRecordingAction(value));
  },
});

const mapStateToProps = (state: OxalisState) => ({
  viewMode: state.temporaryConfiguration.viewMode,
  flightmodeRecording: state.temporaryConfiguration.flightmodeRecording,
  scale: state.userConfiguration.scale,
  isVolumeTracingDisallowed: state.tracing.type === "volume" && isVolumeTracingDisallowed(state),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TracingView);
