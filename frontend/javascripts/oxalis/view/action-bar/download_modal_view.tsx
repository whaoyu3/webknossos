import { Divider, Modal, Checkbox, Row, Col, Tabs, Typography, Button, Radio, Alert } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import React, { useState } from "react";
import { makeComponentLazy, useFetch } from "libs/react_helpers";
import type { APIDataLayer, APIDataset } from "types/api_flow_types";
import Toast from "libs/toast";
import messages from "messages";
import { Model } from "oxalis/singletons";
import features from "features";
import {
  doWithToken,
  downloadAnnotation,
  downloadWithFilename,
  getAuthToken,
  startExportTiffJob,
} from "admin/admin_rest_api";
import { CheckboxValueType } from "antd/lib/checkbox/Group";
import {
  LayerSelection,
  BoundingBoxSelection,
  getReadableNameOfVolumeLayer,
  MagSlider,
} from "oxalis/view/right-border-tabs/starting_job_modals";
import { getUserBoundingBoxesFromState } from "oxalis/model/accessors/tracing_accessor";
import {
  getVolumeTracingById,
  hasVolumeTracings,
} from "oxalis/model/accessors/volumetracing_accessor";
import {
  getByteCountFromLayer,
  getDataLayers,
  getLayerByName,
  getResolutionInfo,
} from "oxalis/model/accessors/dataset_accessor";
import { useSelector } from "react-redux";
import type { HybridTracing, OxalisState, UserBoundingBox } from "oxalis/store";
import {
  computeArrayFromBoundingBox,
  computeBoundingBoxFromBoundingBoxObject,
  computeShapeFromBoundingBox,
} from "libs/utils";
import { formatBytes, formatScale } from "libs/format_utils";
import { BoundingBoxType, Vector3 } from "oxalis/constants";
import { useStartAndPollJob } from "admin/job/job_hooks";
const CheckboxGroup = Checkbox.Group;
const { TabPane } = Tabs;
const { Paragraph, Text } = Typography;

type TabKeys = "download" | "export" | "python";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabKeys;
  initialBoundingBoxId?: number;
};

type ExportLayerInfos = {
  displayName: string;
  layerName: string | null;
  tracingId: string | null;
  annotationId: string | null;
};

enum ExportFormat {
  OME_TIFF = "OME_TIFF",
  TIFF_STACK = "TIFF_STACK",
}

const EXPECTED_DOWNSAMPLING_FILE_SIZE_FACTOR = 1.33;

const exportKey = (layerInfos: ExportLayerInfos, mag: Vector3) =>
  `${layerInfos.layerName || ""}__${layerInfos.tracingId || ""}__${mag.join("-")}`;

function getExportLayerInfos(
  layer: APIDataLayer,
  tracing: HybridTracing | null | undefined,
): ExportLayerInfos {
  const annotationId = tracing != null ? tracing.annotationId : null;

  if (layer.category === "color" || !layer.tracingId) {
    return {
      displayName: layer.name,
      layerName: layer.name,
      tracingId: null,
      annotationId: null,
    };
  }

  // The layer is a volume tracing layer, since tracingId exists. Therefore, a tracing
  // must exist.
  if (tracing == null) {
    // Satisfy TS.
    throw new Error("Tracing is null, but layer.tracingId is defined.");
  }
  const readableVolumeLayerName = getReadableNameOfVolumeLayer(layer, tracing) || "Volume";
  const volumeTracing = getVolumeTracingById(tracing, layer.tracingId);

  return {
    displayName: readableVolumeLayerName,
    layerName: layer.fallbackLayerInfo?.name ?? null,
    tracingId: volumeTracing.tracingId,
    annotationId,
  };
}

function isBoundingBoxExportable(boundingBox: BoundingBoxType, mag: Vector3) {
  const shape = computeShapeFromBoundingBox(boundingBox);
  const volume =
    Math.ceil(shape[0] / mag[0]) * Math.ceil(shape[1] / mag[1]) * Math.ceil(shape[2] / mag[2]);
  const volumeExceeded = volume > features().exportTiffMaxVolumeMVx * 1024 * 1024;
  const edgeLengthExceeded = shape.some(
    (length, index) => length / mag[index] > features().exportTiffMaxEdgeLengthVx,
  );

  const alerts = (
    <>
      {volumeExceeded && (
        <Alert
          type="error"
          message={`The volume of the selected bounding box (${volume} vx) is too large. Tiff export is only supported for up to ${
            features().exportTiffMaxVolumeMVx
          } Megavoxels.`}
        />
      )}
      {edgeLengthExceeded && (
        <Alert
          type="error"
          message={`An edge length of the selected bounding box (${shape.join(
            ", ",
          )}) is too large. Tiff export is only supported for boxes with no edge length over ${
            features().exportTiffMaxEdgeLengthVx
          } vx.`}
        />
      )}
    </>
  );

  return {
    isExportable: !volumeExceeded && !edgeLengthExceeded,
    alerts,
  };
}

function estimateFileSize(
  selectedLayer: APIDataLayer,
  mag: Vector3,
  boundingBox: BoundingBoxType,
  exportFormat: ExportFormat,
) {
  const shape = computeShapeFromBoundingBox(boundingBox);
  const volume =
    Math.ceil(shape[0] / mag[0]) * Math.ceil(shape[1] / mag[1]) * Math.ceil(shape[2] / mag[2]);
  return formatBytes(
    volume *
      getByteCountFromLayer(selectedLayer) *
      (exportFormat === ExportFormat.OME_TIFF ? EXPECTED_DOWNSAMPLING_FILE_SIZE_FACTOR : 1),
  );
}

function formatSelectedScale(dataset: APIDataset, mag: Vector3) {
  const scale = dataset.dataSource.scale;
  return formatScale([scale[0] * mag[0], scale[1] * mag[1], scale[2] * mag[2]]);
}

export function Hint({
  children,
  style,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
}) {
  return (
    <div style={{ ...style, fontSize: 12, color: "var(--ant-text-secondary)" }}>{children}</div>
  );
}

async function copyToClipboard(code: string) {
  await navigator.clipboard.writeText(code);
  Toast.success("Snippet copied to clipboard.");
}

export function MoreInfoHint() {
  return (
    <Hint
      style={{
        margin: "0px 12px 0px 12px",
      }}
    >
      For more information on how to work with annotation files visit the{" "}
      <a
        href="https://docs.webknossos.org/webknossos/tooling.html"
        target="_blank"
        rel="noreferrer"
      >
        user documentation
      </a>
      .
    </Hint>
  );
}

export function CopyableCodeSnippet({ code, onCopy }: { code: string; onCopy?: () => void }) {
  return (
    <pre>
      <Button
        style={{
          float: "right",
          border: "none",
          width: "18px",
          height: "16px",
          background: "transparent",
        }}
        onClick={() => {
          copyToClipboard(code);
          if (onCopy) {
            onCopy();
          }
        }}
        icon={<CopyOutlined />}
      />
      {code}
    </pre>
  );
}

const okTextForTab = new Map<TabKeys, string | null>([
  ["download", "Download"],
  ["export", "Export"],
  ["python", null],
]);

function _DownloadModalView({
  isOpen,
  onClose,
  initialTab,
  initialBoundingBoxId,
}: Props): JSX.Element {
  const activeUser = useSelector((state: OxalisState) => state.activeUser);
  const tracing = useSelector((state: OxalisState) => state.tracing);
  const dataset = useSelector((state: OxalisState) => state.dataset);
  const rawUserBoundingBoxes = useSelector((state: OxalisState) =>
    getUserBoundingBoxesFromState(state),
  );
  const isMergerModeEnabled = useSelector(
    (state: OxalisState) => state.temporaryConfiguration.isMergerModeEnabled,
  );
  const hasVolumeFallback = tracing.volumes.some((volume) => volume.fallbackLayer != null);

  const [activeTabKey, setActiveTabKey] = useState<TabKeys>(initialTab ?? "download");
  const [includeVolumeData, setIncludeVolumeData] = useState(true);
  const [keepWindowOpen, setKeepWindowOpen] = useState(true);
  const [selectedLayerName, setSelectedLayerName] = useState<string>(
    dataset.dataSource.dataLayers[0].name,
  );

  const layers = getDataLayers(dataset);

  const selectedLayer = getLayerByName(dataset, selectedLayerName);
  const selectedLayerInfos = getExportLayerInfos(selectedLayer, tracing);
  const selectedLayerResolutionInfo = getResolutionInfo(selectedLayer.resolutions);

  const userBoundingBoxes = [
    ...rawUserBoundingBoxes,
    {
      id: -1,
      name: "Full layer",
      boundingBox: computeBoundingBoxFromBoundingBoxObject(selectedLayer.boundingBox),
      color: [255, 255, 255],
      isVisible: true,
    } as UserBoundingBox,
  ];

  const [selectedBoundingBoxId, setSelectedBoundingBoxId] = useState(
    initialBoundingBoxId ?? userBoundingBoxes[0].id,
  );
  const [rawMag, setMag] = useState<Vector3>(selectedLayerResolutionInfo.getLowestResolution());
  const mag = selectedLayerResolutionInfo.getClosestExistingResolution(rawMag);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(ExportFormat.OME_TIFF);

  const selectedBoundingBox = userBoundingBoxes.find(
    (bbox) => bbox.id === selectedBoundingBoxId,
  ) as UserBoundingBox;
  const { isExportable, alerts: boundingBoxCompatibilityAlerts } = isBoundingBoxExportable(
    selectedBoundingBox.boundingBox,
    mag,
  );

  const { runningJobs: runningExportJobs, startJob } = useStartAndPollJob({
    async onSuccess(job) {
      if (job.resultLink != null) {
        const token = await doWithToken(async (t) => t);
        downloadWithFilename(`${job.resultLink}?token=${token}`);
      }
    },
    onFailure() {
      Toast.error("Error when exporting data. Please contact us for support.");
    },
  });

  const handleOk = async () => {
    if (activeTabKey === "download") {
      await Model.ensureSavedState();
      downloadAnnotation(
        tracing.annotationId,
        tracing.annotationType,
        hasVolumeFallback,
        {},
        includeVolumeData,
      );
      onClose();
    } else if (activeTabKey === "export" && startJob != null) {
      await Model.ensureSavedState();
      await startJob(async () => {
        const job = await startExportTiffJob(
          dataset.name,
          dataset.owningOrganization,
          computeArrayFromBoundingBox(selectedBoundingBox.boundingBox),
          selectedLayerInfos.layerName,
          mag.join("-"),
          selectedLayerInfos.annotationId,
          selectedLayerInfos.displayName,
          exportFormat === ExportFormat.OME_TIFF,
        );
        return [exportKey(selectedLayerInfos, mag), job.id];
      });

      if (!keepWindowOpen) {
        onClose();
      }
    }
  };

  const maybeShowWarning = () => {
    if (activeTabKey === "download" && hasVolumeFallback) {
      return (
        <Row>
          <Text
            style={{
              margin: "0 6px 12px",
            }}
            type="warning"
          >
            {messages["annotation.no_fallback_data_included"]}
          </Text>
        </Row>
      );
    } else if (activeTabKey === "python") {
      return (
        <Row>
          <Text
            style={{
              margin: "0 6px 12px",
            }}
            type="warning"
          >
            {activeUser != null
              ? messages["annotation.python_do_not_share"]
              : messages["annotation.register_for_token"]}
          </Text>
        </Row>
      );
    }
    return null;
  };

  const handleTabChange = (key: string) => {
    setActiveTabKey(key as TabKeys);
  };

  const handleCheckboxChange = (checkedValues: CheckboxValueType[]) => {
    setIncludeVolumeData(checkedValues.includes("Volume"));
  };

  const handleKeepWindowOpenChecked = (e: any) => {
    setKeepWindowOpen(e.target.checked);
  };

  const workerInfo = (
    <Row>
      <Divider
        style={{
          margin: "18px 0",
        }}
      />
      <Text
        style={{
          margin: "0 6px 12px",
        }}
        type="warning"
      >
        {messages["annotation.export_no_worker"]}
        <a href="mailto:hello@webknossos.org">hello@webknossos.org.</a>
      </Text>
    </Row>
  );

  const checkboxStyle = {
    height: "30px",
    lineHeight: "30px",
  };

  const authToken = useFetch(
    async () => {
      if (activeUser != null) {
        return getAuthToken();
      }
      return null;
    },
    "loading...",
    [activeUser],
  );
  const wkInitSnippet = `import webknossos as wk

with wk.webknossos_context(
    token="${authToken || "<insert token here>"}",
    url="${window.location.origin}"
):
    annotation = wk.Annotation.download("${tracing.annotationId}")
`;

  const alertTokenIsPrivate = () => {
    if (authToken) {
      Toast.warning(
        "The clipboard contains private data. Do not share this information with anyone you do not trust!",
      );
    }
  };

  const hasVolumes = hasVolumeTracings(tracing);
  const hasSkeleton = tracing.skeleton != null;

  const okText = okTextForTab.get(activeTabKey);
  const isCurrentlyRunningExportJob =
    activeTabKey === "export" &&
    runningExportJobs.some(([key]) => key === exportKey(selectedLayerInfos, mag));

  return (
    <Modal
      title="Download this annotation"
      open={isOpen}
      width={600}
      footer={
        okText != null ? (
          <Button
            key="ok"
            type="primary"
            disabled={!isExportable || isCurrentlyRunningExportJob || isMergerModeEnabled}
            onClick={handleOk}
            loading={isCurrentlyRunningExportJob}
          >
            {okText}
          </Button>
        ) : null
      }
      onCancel={onClose}
      style={{ overflow: "visible" }}
    >
      <Tabs activeKey={activeTabKey} onChange={handleTabChange} type="card">
        <TabPane tab="Download" key="download">
          <Row>
            {maybeShowWarning()}
            <Text
              style={{
                margin: "0 6px 12px",
              }}
            >
              {!hasVolumes ? "This is a Skeleton-only annotation. " : ""}
              {!hasSkeleton ? "This is a Volume-only annotation. " : ""}
              {messages["annotation.download"]}
            </Text>
          </Row>
          <Divider
            style={{
              margin: "18px 0",
            }}
          >
            Options
          </Divider>
          <Row>
            <Col
              span={9}
              style={{
                lineHeight: "20px",
                padding: "5px 12px",
              }}
            >
              Select the data you would like to download.
            </Col>
            <Col span={15}>
              <CheckboxGroup onChange={handleCheckboxChange} defaultValue={["Volume", "Skeleton"]}>
                {hasVolumes ? (
                  <div>
                    <Checkbox
                      style={checkboxStyle}
                      value="Volume"
                      // If no skeleton is available, volume is always selected
                      checked={!hasSkeleton ? true : includeVolumeData}
                      disabled={!hasSkeleton}
                    >
                      Volume annotations as WKW
                    </Checkbox>
                    <Hint
                      style={{
                        marginLeft: 24,
                        marginBottom: 12,
                      }}
                    >
                      Download a zip folder containing WKW files.
                    </Hint>
                  </div>
                ) : null}

                <Checkbox style={checkboxStyle} value="Skeleton" checked disabled>
                  {hasSkeleton ? "Skeleton annotations" : "Meta data"} as NML
                </Checkbox>
                <Hint
                  style={{
                    marginLeft: 24,
                    marginBottom: 12,
                  }}
                >
                  An NML file will always be included with any download.
                </Hint>
              </CheckboxGroup>
            </Col>
          </Row>
          <Divider
            style={{
              margin: "18px 0",
            }}
          />
          <MoreInfoHint />
        </TabPane>

        <TabPane tab="TIFF Export" key="export">
          <Row>
            <Text
              style={{
                margin: "0 6px 12px",
              }}
            >
              {messages["annotation.export"]}
            </Text>
          </Row>
          {activeTabKey === "export" && !features().jobsEnabled ? (
            workerInfo
          ) : (
            <div>
              <Divider
                style={{
                  margin: "18px 0",
                }}
              >
                Export format
              </Divider>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Radio.Group
                  value={exportFormat}
                  onChange={(ev) => setExportFormat(ev.target.value)}
                >
                  <Radio.Button value={ExportFormat.OME_TIFF}>OME-TIFF</Radio.Button>
                  <Radio.Button value={ExportFormat.TIFF_STACK}>TIFF stack (as .zip)</Radio.Button>
                </Radio.Group>
              </div>

              <Divider
                style={{
                  margin: "18px 0",
                }}
              >
                Layer
              </Divider>
              <LayerSelection
                layers={layers}
                value={selectedLayerName}
                onChange={setSelectedLayerName}
                tracing={tracing}
                style={{ width: "100%" }}
              />

              <Divider
                style={{
                  margin: "18px 0",
                }}
              >
                Bounding Box
              </Divider>
              <BoundingBoxSelection
                value={selectedBoundingBoxId}
                userBoundingBoxes={userBoundingBoxes}
                setSelectedBoundingBoxId={(boxId: number | null) => {
                  if (boxId != null) {
                    setSelectedBoundingBoxId(boxId);
                  }
                }}
                style={{ width: "100%" }}
              />
              {boundingBoxCompatibilityAlerts}

              <Divider
                style={{
                  margin: "18px 0",
                }}
              >
                Mag
              </Divider>
              <Row>
                <Col span={19}>
                  <MagSlider
                    resolutionInfo={selectedLayerResolutionInfo}
                    value={mag}
                    onChange={setMag}
                  />
                </Col>
                <Col
                  span={5}
                  style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}
                >
                  {mag.join("-")}
                </Col>
              </Row>
              <Text
                style={{
                  margin: "0 6px 12px",
                  display: "block",
                }}
              >
                Estimated file size:{" "}
                {estimateFileSize(
                  selectedLayer,
                  mag,
                  selectedBoundingBox.boundingBox,
                  exportFormat,
                )}
                <br />
                Resolution: {formatSelectedScale(dataset, mag)}
              </Text>

              <Divider />
              <p>
                Go to the{" "}
                <a href="/jobs" target="_blank" rel="noreferrer">
                  Jobs Overview Page
                </a>{" "}
                to see running exports and to download the results.
              </p>
            </div>
          )}
          <Divider
            style={{
              margin: "18px 0",
            }}
          />
          <MoreInfoHint />
          <Checkbox
            style={{ position: "absolute", bottom: -62 }}
            checked={keepWindowOpen}
            onChange={handleKeepWindowOpenChecked}
            disabled={activeTabKey === "export" && !features().jobsEnabled}
          >
            Keep window open
          </Checkbox>
        </TabPane>

        <TabPane tab="Python Client" key="python">
          <Row>
            <Text
              style={{
                margin: "0 6px 12px",
              }}
            >
              The following code snippets are suggestions to get you started quickly with the{" "}
              <a href="https://docs.webknossos.org/webknossos-py/" target="_blank" rel="noreferrer">
                WEBKNOSSOS Python API
              </a>
              . To download and use this annotation in your Python project, simply copy and paste
              the code snippets to your script.
            </Text>
          </Row>
          <Divider
            style={{
              margin: "18px 0",
            }}
          >
            Code Snippets
          </Divider>
          {maybeShowWarning()}
          <Paragraph>
            <CopyableCodeSnippet code="pip install webknossos" />
            <CopyableCodeSnippet code={wkInitSnippet} onCopy={alertTokenIsPrivate} />
          </Paragraph>
          <Divider
            style={{
              margin: "18px 0",
            }}
          />
          <MoreInfoHint />
        </TabPane>
      </Tabs>
    </Modal>
  );
}

const DownloadModalView = makeComponentLazy(_DownloadModalView);
export default DownloadModalView;
