// @flow
import * as React from "react";
import { Alert, List, Input, Form, InputNumber, Col, Row, Switch, Tooltip } from "antd";
import { Vector3Input, BoundingBoxInput } from "libs/vector_input";
import { getBitDepth } from "oxalis/model/accessors/dataset_accessor";
import {
  Hideable,
  FormItemWithInfo,
  RetryingErrorBoundary,
  jsonEditStyle,
} from "./helper_components";
import { validateDatasourceJSON, isValidJSON } from "./validation";

const FormItem = Form.Item;

const syncValidator = (validateValueFn, errMessage) => (rule, value, callback) =>
  validateValueFn(value) ? callback() : callback(new Error(errMessage));

export default function SimpleAdvancedDataForm({
  form,
  activeDataSourceEditMode,
  onChange,
}: {
  form: Object,
  activeDataSourceEditMode: "simple" | "advanced",
  onChange: ("simple" | "advanced") => void,
}) {
  const { getFieldDecorator } = form;
  const dataSource =
    form.getFieldValue("dataSourceJson") && isValidJSON(form.getFieldValue("dataSourceJson"))
      ? JSON.parse(form.getFieldValue("dataSourceJson"))
      : null;

  const isJSONInvalid = dataSource == null;

  return (
    <div>
      <div style={{ textAlign: "right" }}>
        <Tooltip
          title={
            isJSONInvalid
              ? "Please ensure that the supplied config JSON is valid."
              : "Switch between simple and advanced mode"
          }
        >
          <Switch
            checkedChildren="Advanced"
            unCheckedChildren="Simple"
            checked={activeDataSourceEditMode === "advanced"}
            disabled={isJSONInvalid}
            style={{ marginBottom: 6 }}
            onChange={bool => {
              const key = bool ? "advanced" : "simple";
              onChange(key);
            }}
          />
        </Tooltip>
      </div>

      <Alert
        message="Please review the following properties. If you want to adjust the configuration described by
          &ldquo;datasource-properties.json&rdquo;, please enable the &ldquo;Advanced&rdquo; mode in the top-right corner."
        type="info"
        showIcon
      />

      <Hideable hide={activeDataSourceEditMode !== "simple"}>
        <RetryingErrorBoundary>
          <SimpleDatasetForm form={form} dataSource={dataSource} />
        </RetryingErrorBoundary>
      </Hideable>

      <Hideable hide={activeDataSourceEditMode !== "advanced"}>
        <FormItem label="Dataset Configuration" hasFeedback>
          {getFieldDecorator("dataSourceJson", {
            rules: [
              {
                required: true,
                message: "Please provide a dataset configuration.",
              },
              {
                validator: validateDatasourceJSON,
              },
            ],
          })(<Input.TextArea rows={20} style={jsonEditStyle} />)}
        </FormItem>
      </Hideable>
    </div>
  );
}

function SimpleDatasetForm({ form, dataSource }) {
  const { getFieldDecorator } = form;
  return (
    <div>
      <List header={<div style={{ fontWeight: "bold" }}>Dataset</div>}>
        <List.Item>
          <FormItemWithInfo
            label="Scale"
            info="The scale defines the extent (for x, y, z) of one voxel in nanometer."
          >
            {getFieldDecorator("dataSource.scale", {
              rules: [
                {
                  required: true,
                  message: "Please provide a scale for the dataset.",
                },
                {
                  validator: syncValidator(
                    value => value && value.every(el => el > 0),
                    "Each component of the scale must be larger than 0",
                  ),
                },
              ],
            })(<Vector3Input style={{ width: 400 }} />)}
          </FormItemWithInfo>
        </List.Item>
      </List>

      <List header={<div style={{ fontWeight: "bold" }}>Layers</div>}>
        {(dataSource || { dataLayers: [] }).dataLayers.map((layer, idx) => (
          <List.Item key={`layer-${layer.name}`}>
            <SimpleLayerForm layer={layer} index={idx} form={form} />
          </List.Item>
        ))}
      </List>
    </div>
  );
}

function SimpleLayerForm({ layer, index, form }) {
  const { getFieldDecorator } = form;
  const isSegmentation = layer.category === "segmentation";
  const bitDepth = getBitDepth(layer);
  return (
    <Row gutter={48} style={{ width: "100%" }}>
      <Col span={5}>
        <div style={{ paddingTop: 9, color: "rgba(0, 0, 0, 0.85)" }}>
          {index + 1}. Layer &ldquo;{layer.name}&rdquo;:
        </div>
      </Col>
      <Col span={17}>
        <FormItemWithInfo
          label="Bounding box"
          style={{ marginBottom: 2 }}
          info="The bounding box defines the extent of the data in the format x, y, z, width, height, depth (in voxel coordinates)."
        >
          {getFieldDecorator(
            layer.dataFormat === "knossos"
              ? `dataSource.dataLayers[${index}].sections[0].boundingBox`
              : `dataSource.dataLayers[${index}].boundingBox`,
            {
              rules: [
                {
                  required: true,
                  message: "Please define a valid bounding box.",
                },
                {
                  validator: syncValidator(
                    value => value.width !== 0 && value.height !== 0 && value.depth !== 0,
                    "Width, height and depth must not be zero",
                  ),
                },
              ],
            },
          )(<BoundingBoxInput style={{ width: 200 }} />)}
        </FormItemWithInfo>

        {isSegmentation ? (
          <FormItemWithInfo
            label="Largest segment ID"
            info="The largest segment ID specifies the highest id which exists in this segmentation layer. When user's extend this segmentation, new IDs will be assigned starting from that value."
          >
            {getFieldDecorator(`dataSource.dataLayers[${index}].largestSegmentId`, {
              rules: [
                {
                  required: true,
                  message: "Please provide a largest segment ID for the segmentation layer",
                },
                {
                  validator: (rule, value, callback) =>
                    value > 0 && value < 2 ** bitDepth
                      ? callback()
                      : callback(
                          new Error(
                            `The largest segmentation ID must be larger than 0 and smaller than 2^${bitDepth}`,
                          ),
                        ),
                },
              ],
            })(<InputNumber />)}
          </FormItemWithInfo>
        ) : null}
      </Col>
    </Row>
  );
}
