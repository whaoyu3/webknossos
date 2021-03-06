/* eslint-disable import/prefer-default-export */

/**
 * settings_actions.js
 * @flow
 */
import type {
  UserConfigurationType,
  DatasetConfigurationType,
  DatasetLayerConfigurationType,
  TemporaryConfigurationType,
  MappingType,
} from "oxalis/store";
import type { APIDatasetType } from "admin/api_flow_types";
import type { ModeType, ControlModeType } from "oxalis/constants";

type UpdateUserSettingActionType = {
  type: "UPDATE_USER_SETTING",
  propertyName: $Keys<UserConfigurationType>,
  value: any,
};
type UpdateDatasetSettingActionType = {
  type: "UPDATE_DATASET_SETTING",
  propertyName: $Keys<DatasetConfigurationType>,
  value: any,
};
type UpdateTemporarySettingActionType = {
  type: "UPDATE_TEMPORARY_SETTING",
  propertyName: $Keys<TemporaryConfigurationType>,
  value: any,
};
export type ToggleTemporarySettingActionType = {
  type: "TOGGLE_TEMPORARY_SETTING",
  propertyName: $Keys<TemporaryConfigurationType>,
};
type UpdateLayerSettingActionType = {
  type: "UPDATE_LAYER_SETTING",
  layerName: string,
  propertyName: $Keys<DatasetLayerConfigurationType>,
  value: any,
};
export type InitializeSettingsAction = {
  type: "INITIALIZE_SETTINGS",
  initialUserSettings: UserConfigurationType,
  initialDatasetSettings: DatasetConfigurationType,
};
type SetDatasetAction = { type: "SET_DATASET", dataset: APIDatasetType };
type SetViewModeActionType = { type: "SET_VIEW_MODE", viewMode: ModeType };
type SetFlightmodeRecordingActionType = { type: "SET_FLIGHTMODE_RECORDING", value: boolean };
type SetControlModeActionType = { type: "SET_CONTROL_MODE", controlMode: ControlModeType };
type SetMappingEnabledActionType = { type: "SET_MAPPING_ENABLED", isMappingEnabled: boolean };
type SetMappingActionType = { type: "SET_MAPPING", mapping: ?MappingType };
export type SettingActionType =
  | UpdateUserSettingActionType
  | UpdateDatasetSettingActionType
  | UpdateTemporarySettingActionType
  | ToggleTemporarySettingActionType
  | InitializeSettingsAction
  | UpdateLayerSettingActionType
  | SetDatasetAction
  | SetViewModeActionType
  | SetFlightmodeRecordingActionType
  | SetControlModeActionType
  | SetMappingEnabledActionType
  | SetMappingActionType;

export const updateUserSettingAction = (
  propertyName: $Keys<UserConfigurationType>,
  value: any,
): UpdateUserSettingActionType => ({
  type: "UPDATE_USER_SETTING",
  propertyName,
  value,
});

export const updateDatasetSettingAction = (
  propertyName: $Keys<DatasetConfigurationType>,
  value: any,
): UpdateDatasetSettingActionType => ({
  type: "UPDATE_DATASET_SETTING",
  propertyName,
  value,
});

export const updateTemporarySettingAction = (
  propertyName: $Keys<TemporaryConfigurationType>,
  value: any,
): UpdateTemporarySettingActionType => ({
  type: "UPDATE_TEMPORARY_SETTING",
  propertyName,
  value,
});

export const toggleTemporarySettingAction = (
  propertyName: $Keys<TemporaryConfigurationType>,
): ToggleTemporarySettingActionType => ({
  type: "TOGGLE_TEMPORARY_SETTING",
  propertyName,
});

export const updateLayerSettingAction = (
  layerName: string,
  propertyName: $Keys<DatasetLayerConfigurationType>,
  value: any,
): UpdateLayerSettingActionType => ({
  type: "UPDATE_LAYER_SETTING",
  layerName,
  propertyName,
  value,
});

export const setDatasetAction = (dataset: APIDatasetType): SetDatasetAction => ({
  type: "SET_DATASET",
  dataset,
});

export const initializeSettingsAction = (
  initialUserSettings: Object,
  initialDatasetSettings: Object,
): InitializeSettingsAction => ({
  type: "INITIALIZE_SETTINGS",
  initialUserSettings,
  initialDatasetSettings,
});

export const setViewModeAction = (viewMode: ModeType): SetViewModeActionType => ({
  type: "SET_VIEW_MODE",
  viewMode,
});

export const setFlightmodeRecordingAction = (value: boolean): SetFlightmodeRecordingActionType => ({
  type: "SET_FLIGHTMODE_RECORDING",
  value,
});

export const setControlModeAction = (controlMode: ControlModeType): SetControlModeActionType => ({
  type: "SET_CONTROL_MODE",
  controlMode,
});

export const setMappingEnabledAction = (
  isMappingEnabled: boolean,
): SetMappingEnabledActionType => ({
  type: "SET_MAPPING_ENABLED",
  isMappingEnabled,
});

export const setMappingAction = (mapping: ?MappingType): SetMappingActionType => ({
  type: "SET_MAPPING",
  mapping,
});
