import { Modal } from "antd";
import React from "react";
import type { ServerSkeletonTracing } from "types/api_flow_types";
import type { Vector3 } from "oxalis/constants";
import {
  enforceSkeletonTracing,
  getActiveNode,
  getTree,
} from "oxalis/model/accessors/skeletontracing_accessor";
import RemoveTreeModal from "oxalis/view/remove_tree_modal";
import type { OxalisState, SkeletonTracing, TreeGroup, MutableTreeMap } from "oxalis/store";
import Store from "oxalis/store";
import messages from "messages";
import renderIndependently from "libs/render_independently";
import { AllUserBoundingBoxActions } from "oxalis/model/actions/annotation_actions";
export type InitializeSkeletonTracingAction = {
  type: "INITIALIZE_SKELETONTRACING";
  tracing: ServerSkeletonTracing;
};
export type CreateNodeAction = {
  type: "CREATE_NODE";
  position: Vector3;
  rotation: Vector3;
  viewport: number;
  resolution: number;
  timestamp: number;
  treeId?: number | null | undefined;
  dontActivate?: boolean;
};
type DeleteNodeAction = {
  type: "DELETE_NODE";
  nodeId?: number;
  treeId?: number;
  timestamp: number;
};
export type DeleteEdgeAction = {
  type: "DELETE_EDGE";
  sourceNodeId: number;
  targetNodeId: number;
  timestamp: number;
};
type SetActiveNodeAction = {
  type: "SET_ACTIVE_NODE";
  nodeId: number;
  suppressAnimation: boolean;
};
type CenterActiveNodeAction = {
  type: "CENTER_ACTIVE_NODE";
  suppressAnimation: boolean;
};
type SetNodeRadiusAction = {
  type: "SET_NODE_RADIUS";
  radius: number;
  nodeId: number | null | undefined;
  treeId: number | null | undefined;
};
type SetNodePositionAction = {
  type: "SET_NODE_POSITION";
  position: Vector3;
  nodeId: number | null | undefined;
  treeId: number | null | undefined;
};
type CreateBranchPointAction = {
  type: "CREATE_BRANCHPOINT";
  nodeId?: number;
  treeId?: number;
  timestamp: number;
};
type DeleteBranchPointAction = {
  type: "DELETE_BRANCHPOINT";
};
type DeleteBranchpointByIdAction = {
  type: "DELETE_BRANCHPOINT_BY_ID";
  nodeId: number;
  treeId: number;
};
type ToggleTreeAction = {
  type: "TOGGLE_TREE";
  treeId: number | null | undefined;
  timestamp: number;
};
type SetTreeVisibilityAction = {
  type: "SET_TREE_VISIBILITY";
  treeId: number | null | undefined;
  isVisible: boolean;
};
type ToggleAllTreesAction = {
  type: "TOGGLE_ALL_TREES";
  timestamp: number;
};
type ToggleInactiveTreesAction = {
  type: "TOGGLE_INACTIVE_TREES";
  timestamp: number;
};
type ToggleTreeGroupAction = {
  type: "TOGGLE_TREE_GROUP";
  groupId: number;
};
type RequestDeleteBranchPointAction = {
  type: "REQUEST_DELETE_BRANCHPOINT";
};
type CreateTreeAction = {
  type: "CREATE_TREE";
  timestamp: number;
};
type AddTreesAndGroupsAction = {
  type: "ADD_TREES_AND_GROUPS";
  trees: MutableTreeMap;
  treeGroups: Array<TreeGroup>;
};
type DeleteTreeAction = {
  type: "DELETE_TREE";
  treeId?: number;
};
type ResetSkeletonTracingAction = {
  type: "RESET_SKELETON_TRACING";
};
type SetActiveTreeAction = {
  type: "SET_ACTIVE_TREE";
  treeId: number;
};
type SetActiveTreeByNameAction = {
  type: "SET_ACTIVE_TREE_BY_NAME";
  treeName: string;
};
type DeselectActiveTreeAction = {
  type: "DESELECT_ACTIVE_TREE";
};
type SetActiveGroupAction = {
  type: "SET_ACTIVE_GROUP";
  groupId: number;
};
type DeselectActiveGroupAction = {
  type: "DESELECT_ACTIVE_GROUP";
};
export type MergeTreesAction = {
  type: "MERGE_TREES";
  sourceNodeId: number;
  targetNodeId: number;
};
type SetTreeNameAction = {
  type: "SET_TREE_NAME";
  name: string | null | undefined;
  treeId: number | null | undefined;
};
type SelectNextTreeAction = {
  type: "SELECT_NEXT_TREE";
  forward: boolean | null | undefined;
};
type SetTreeColorIndexAction = {
  type: "SET_TREE_COLOR_INDEX";
  treeId: number | null | undefined;
  colorIndex: number;
};
type ShuffleTreeColorAction = {
  type: "SHUFFLE_TREE_COLOR";
  treeId?: number;
};
type SetTreeColorAction = {
  type: "SET_TREE_COLOR";
  treeId: number;
  color: Vector3;
};
type ShuffleAllTreeColorsAction = {
  type: "SHUFFLE_ALL_TREE_COLORS";
  treeId?: number;
};
type CreateCommentAction = {
  type: "CREATE_COMMENT";
  commentText: string;
  nodeId: number | null | undefined;
  treeId: number | null | undefined;
};
type DeleteCommentAction = {
  type: "DELETE_COMMENT";
  nodeId: number | null | undefined;
  treeId?: number;
};
type SetTracingAction = {
  type: "SET_TRACING";
  tracing: SkeletonTracing;
};
type SetTreeGroupsAction = {
  type: "SET_TREE_GROUPS";
  treeGroups: Array<TreeGroup>;
};
type SetTreeGroupAction = {
  type: "SET_TREE_GROUP";
  groupId: number | null | undefined;
  treeId?: number;
};
type SetShowSkeletonsAction = {
  type: "SET_SHOW_SKELETONS";
  showSkeletons: boolean;
};
type SetMergerModeEnabledAction = {
  type: "SET_MERGER_MODE_ENABLED";
  active: boolean;
};
type UpdateNavigationListAction = {
  type: "UPDATE_NAVIGATION_LIST";
  list: Array<number>;
  activeIndex: number;
};
export type LoadAgglomerateSkeletonAction = {
  type: "LOAD_AGGLOMERATE_SKELETON";
  layerName: string;
  mappingName: string;
  agglomerateId: number;
};
export type RemoveAgglomerateSkeletonAction = {
  type: "REMOVE_AGGLOMERATE_SKELETON";
  layerName: string;
  mappingName: string;
  agglomerateId: number;
};
type NoAction = {
  type: "NONE";
};
export type SkeletonTracingAction =
  | InitializeSkeletonTracingAction
  | CreateNodeAction
  | DeleteNodeAction
  | DeleteEdgeAction
  | SetActiveNodeAction
  | CenterActiveNodeAction
  | SetActiveGroupAction
  | DeselectActiveGroupAction
  | SetNodeRadiusAction
  | SetNodePositionAction
  | CreateBranchPointAction
  | DeleteBranchPointAction
  | DeleteBranchpointByIdAction
  | RequestDeleteBranchPointAction
  | CreateTreeAction
  | AddTreesAndGroupsAction
  | DeleteTreeAction
  | ResetSkeletonTracingAction
  | SetActiveTreeAction
  | SetActiveTreeByNameAction
  | DeselectActiveTreeAction
  | MergeTreesAction
  | SetTreeNameAction
  | SelectNextTreeAction
  | SetTreeColorAction
  | ShuffleTreeColorAction
  | ShuffleAllTreeColorsAction
  | SetTreeColorIndexAction
  | CreateCommentAction
  | DeleteCommentAction
  | ToggleTreeAction
  | ToggleAllTreesAction
  | SetTreeVisibilityAction
  | ToggleInactiveTreesAction
  | ToggleTreeGroupAction
  | NoAction
  | SetTracingAction
  | SetTreeGroupsAction
  | SetTreeGroupAction
  | SetShowSkeletonsAction
  | SetMergerModeEnabledAction
  | UpdateNavigationListAction
  | LoadAgglomerateSkeletonAction
  | RemoveAgglomerateSkeletonAction;
export const SkeletonTracingSaveRelevantActions = [
  "INITIALIZE_SKELETONTRACING",
  "CREATE_NODE",
  "DELETE_NODE",
  "DELETE_EDGE",
  "SET_ACTIVE_NODE",
  "SET_NODE_RADIUS",
  "SET_NODE_POSITION",
  "CREATE_BRANCHPOINT",
  "DELETE_BRANCHPOINT_BY_ID",
  "DELETE_BRANCHPOINT",
  "CREATE_TREE",
  "ADD_TREES_AND_GROUPS",
  "DELETE_TREE",
  "SET_ACTIVE_TREE",
  "SET_ACTIVE_TREE_BY_NAME",
  "SET_TREE_NAME",
  "MERGE_TREES",
  "SELECT_NEXT_TREE",
  "SHUFFLE_TREE_COLOR",
  "SHUFFLE_ALL_TREE_COLORS",
  "CREATE_COMMENT",
  "DELETE_COMMENT",
  "SET_TREE_GROUPS",
  "SET_TREE_GROUP",
  "SET_MERGER_MODE_ENABLED",
  "TOGGLE_TREE",
  "TOGGLE_TREE_GROUP",
  "TOGGLE_ALL_TREES",
  "TOGGLE_INACTIVE_TREES",
  "SET_TREE_COLOR", // Composited actions, only dispatched using `batchActions`
  "DELETE_GROUP_AND_TREES",
  ...AllUserBoundingBoxActions,
];

const noAction = (): NoAction => ({
  type: "NONE",
});

export const initializeSkeletonTracingAction = (
  tracing: ServerSkeletonTracing,
): InitializeSkeletonTracingAction => ({
  type: "INITIALIZE_SKELETONTRACING",
  tracing,
});
export const createNodeAction = (
  position: Vector3,
  rotation: Vector3,
  viewport: number,
  resolution: number,
  treeId?: number | null | undefined,
  dontActivate: boolean = false,
  timestamp: number = Date.now(),
): CreateNodeAction => ({
  type: "CREATE_NODE",
  position,
  rotation,
  viewport,
  resolution,
  treeId,
  dontActivate,
  timestamp,
});
export const deleteNodeAction = (
  nodeId?: number,
  treeId?: number,
  timestamp: number = Date.now(),
): DeleteNodeAction => ({
  type: "DELETE_NODE",
  nodeId,
  treeId,
  timestamp,
});
export const deleteEdgeAction = (
  sourceNodeId: number,
  targetNodeId: number,
  timestamp: number = Date.now(),
): DeleteEdgeAction => ({
  type: "DELETE_EDGE",
  sourceNodeId,
  targetNodeId,
  timestamp,
});
export const setActiveNodeAction = (
  nodeId: number,
  suppressAnimation: boolean = false,
): SetActiveNodeAction => ({
  type: "SET_ACTIVE_NODE",
  nodeId,
  suppressAnimation,
});
export const centerActiveNodeAction = (
  suppressAnimation: boolean = false,
): CenterActiveNodeAction => ({
  type: "CENTER_ACTIVE_NODE",
  suppressAnimation,
});
export const setNodeRadiusAction = (
  radius: number,
  nodeId?: number,
  treeId?: number,
): SetNodeRadiusAction => ({
  type: "SET_NODE_RADIUS",
  radius,
  nodeId,
  treeId,
});
export const setNodePositionAction = (
  position: Vector3,
  nodeId?: number,
  treeId?: number,
): SetNodePositionAction => ({
  type: "SET_NODE_POSITION",
  position,
  nodeId,
  treeId,
});
export const createBranchPointAction = (
  nodeId?: number,
  treeId?: number,
  timestamp: number = Date.now(),
): CreateBranchPointAction => ({
  type: "CREATE_BRANCHPOINT",
  nodeId,
  treeId,
  timestamp,
});
export const deleteBranchPointAction = (): DeleteBranchPointAction => ({
  type: "DELETE_BRANCHPOINT",
});
export const deleteBranchpointByIdAction = (
  nodeId: number,
  treeId: number,
): DeleteBranchpointByIdAction => ({
  type: "DELETE_BRANCHPOINT_BY_ID",
  nodeId,
  treeId,
});
export const requestDeleteBranchPointAction = (): RequestDeleteBranchPointAction => ({
  type: "REQUEST_DELETE_BRANCHPOINT",
});
export const createTreeAction = (timestamp: number = Date.now()): CreateTreeAction => ({
  type: "CREATE_TREE",
  timestamp,
});
export const addTreesAndGroupsAction = (
  trees: MutableTreeMap,
  treeGroups: Array<TreeGroup> | null | undefined,
): AddTreesAndGroupsAction => ({
  type: "ADD_TREES_AND_GROUPS",
  trees,
  treeGroups: treeGroups || [],
});
export const deleteTreeAction = (treeId?: number): DeleteTreeAction => ({
  type: "DELETE_TREE",
  treeId,
});
export const resetSkeletonTracingAction = (): ResetSkeletonTracingAction => ({
  type: "RESET_SKELETON_TRACING",
});
export const toggleTreeAction = (
  treeId: number | null | undefined,
  timestamp: number = Date.now(),
): ToggleTreeAction => ({
  type: "TOGGLE_TREE",
  treeId,
  timestamp,
});
export const setTreeVisibilityAction = (
  treeId: number | null | undefined,
  isVisible: boolean,
): SetTreeVisibilityAction => ({
  type: "SET_TREE_VISIBILITY",
  treeId,
  isVisible,
});
export const toggleAllTreesAction = (timestamp: number = Date.now()): ToggleAllTreesAction => ({
  type: "TOGGLE_ALL_TREES",
  timestamp,
});
export const toggleInactiveTreesAction = (
  timestamp: number = Date.now(),
): ToggleInactiveTreesAction => ({
  type: "TOGGLE_INACTIVE_TREES",
  timestamp,
});
export const toggleTreeGroupAction = (groupId: number): ToggleTreeGroupAction => ({
  type: "TOGGLE_TREE_GROUP",
  groupId,
});
export const setActiveTreeAction = (treeId: number): SetActiveTreeAction => ({
  type: "SET_ACTIVE_TREE",
  treeId,
});
export const setActiveTreeByNameAction = (treeName: string): SetActiveTreeByNameAction => ({
  type: "SET_ACTIVE_TREE_BY_NAME",
  treeName,
});
export const deselectActiveTreeAction = (): DeselectActiveTreeAction => ({
  type: "DESELECT_ACTIVE_TREE",
});
export const setActiveGroupAction = (groupId: number): SetActiveGroupAction => ({
  type: "SET_ACTIVE_GROUP",
  groupId,
});
export const deselectActiveGroupAction = (): DeselectActiveGroupAction => ({
  type: "DESELECT_ACTIVE_GROUP",
});
export const mergeTreesAction = (sourceNodeId: number, targetNodeId: number): MergeTreesAction => ({
  type: "MERGE_TREES",
  sourceNodeId,
  targetNodeId,
});
export const setTreeNameAction = (
  name: string | undefined | null = null,
  treeId?: number | null | undefined,
): SetTreeNameAction => ({
  type: "SET_TREE_NAME",
  name,
  treeId,
});
export const selectNextTreeAction = (
  forward: boolean | null | undefined = true,
): SelectNextTreeAction => ({
  type: "SELECT_NEXT_TREE",
  forward,
});
export const setTreeColorIndexAction = (
  treeId: number | null | undefined,
  colorIndex: number,
): SetTreeColorIndexAction => ({
  type: "SET_TREE_COLOR_INDEX",
  treeId,
  colorIndex,
});
export const shuffleTreeColorAction = (treeId: number): ShuffleTreeColorAction => ({
  type: "SHUFFLE_TREE_COLOR",
  treeId,
});
export const setTreeColorAction = (treeId: number, color: Vector3): SetTreeColorAction => ({
  type: "SET_TREE_COLOR",
  treeId,
  color,
});
export const shuffleAllTreeColorsAction = (): ShuffleAllTreeColorsAction => ({
  type: "SHUFFLE_ALL_TREE_COLORS",
});
export const createCommentAction = (
  commentText: string,
  nodeId?: number,
  treeId?: number,
): CreateCommentAction => ({
  type: "CREATE_COMMENT",
  commentText,
  nodeId,
  treeId,
});
export const deleteCommentAction = (nodeId?: number, treeId?: number): DeleteCommentAction => ({
  type: "DELETE_COMMENT",
  nodeId,
  treeId,
});
export const setTracingAction = (tracing: SkeletonTracing): SetTracingAction => ({
  type: "SET_TRACING",
  tracing,
});
export const setTreeGroupsAction = (treeGroups: Array<TreeGroup>): SetTreeGroupsAction => ({
  type: "SET_TREE_GROUPS",
  treeGroups,
});
export const setTreeGroupAction = (
  groupId: number | null | undefined,
  treeId?: number,
): SetTreeGroupAction => ({
  type: "SET_TREE_GROUP",
  groupId,
  treeId,
});
export const setShowSkeletonsAction = (showSkeletons: boolean): SetShowSkeletonsAction => ({
  type: "SET_SHOW_SKELETONS",
  showSkeletons,
});
export const setMergerModeEnabledAction = (active: boolean): SetMergerModeEnabledAction => ({
  type: "SET_MERGER_MODE_ENABLED",
  active,
});
// The following actions have the prefix "AsUser" which means that they
// offer some additional logic which is sensible from a user-centered point of view.
// For example, the deleteActiveNodeAsUserAction also initiates the deletion of a tree,
// when the current tree is empty.
export const deleteActiveNodeAsUserAction = (
  state: OxalisState,
): DeleteNodeAction | NoAction | DeleteTreeAction => {
  const skeletonTracing = enforceSkeletonTracing(state.tracing);
  return getActiveNode(skeletonTracing)
    .map((activeNode): DeleteNodeAction | NoAction | DeleteTreeAction => {
      const nodeId = activeNode.id;

      if (state.task != null && nodeId === 1) {
        // Let the user confirm the deletion of the initial node (node with id 1) of a task
        Modal.confirm({
          title: messages["tracing.delete_initial_node"],
          onOk: () => {
            Store.dispatch(deleteNodeAction(nodeId));
          },
        });
        // As Modal.confirm is async, return noAction() and the modal will dispatch the real action
        // if the user confirms
        return noAction();
      }

      return deleteNodeAction(nodeId);
    }) // If the tree is empty, it will be deleted
    .getOrElse(deleteTreeAction());
};

// Let the user confirm the deletion of the initial node (node with id 1) of a task
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'id' implicitly has an 'any' type.
function confirmDeletingInitialNode(id) {
  Modal.confirm({
    title: messages["tracing.delete_tree_with_initial_node"],
    onOk: () => {
      Store.dispatch(deleteTreeAction(id));
    },
  });
}

export const deleteTreeAsUserAction = (treeId?: number): NoAction => {
  const state = Store.getState();
  const skeletonTracing = enforceSkeletonTracing(state.tracing);
  getTree(skeletonTracing, treeId).map((tree) => {
    if (state.task != null && tree.nodes.has(1)) {
      confirmDeletingInitialNode(treeId);
    } else if (state.userConfiguration.hideTreeRemovalWarning) {
      Store.dispatch(deleteTreeAction(treeId));
    } else {
      renderIndependently((destroy) => (
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
        <RemoveTreeModal onOk={() => Store.dispatch(deleteTreeAction(treeId))} destroy={destroy} />
      ));
    }
  });
  // As Modal.confirm is async, return noAction() and the modal will dispatch the real action
  // if the user confirms
  return noAction();
};
export const updateNavigationListAction = (
  list: Array<number>,
  activeIndex: number,
): UpdateNavigationListAction => ({
  type: "UPDATE_NAVIGATION_LIST",
  list,
  activeIndex,
});
export const loadAgglomerateSkeletonAction = (
  layerName: string,
  mappingName: string,
  agglomerateId: number,
): LoadAgglomerateSkeletonAction => ({
  type: "LOAD_AGGLOMERATE_SKELETON",
  layerName,
  mappingName,
  agglomerateId,
});
export const removeAgglomerateSkeletonAction = (
  layerName: string,
  mappingName: string,
  agglomerateId: number,
): RemoveAgglomerateSkeletonAction => ({
  type: "REMOVE_AGGLOMERATE_SKELETON",
  layerName,
  mappingName,
  agglomerateId,
});
