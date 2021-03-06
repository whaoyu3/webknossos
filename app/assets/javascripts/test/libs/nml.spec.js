// @flow

import test from "ava";
import _ from "lodash";
import mock from "mock-require";
import { defaultState } from "oxalis/store";
import update from "immutability-helper";
import DiffableMap from "libs/diffable_map";
import EdgeCollection from "oxalis/model/edge_collection";
import type { NodeType } from "oxalis/store";

const TIMESTAMP = 123456789;
const DateMock = {
  now: () => TIMESTAMP,
};
const buildInfo = {
  webknossos: {
    commitHash: "fc0ea6432ec7107e8f9b5b308ee0e90eae0e7b17",
  },
};
mock("libs/date", DateMock);
const { serializeToNml, getNmlName, parseNml } = mock.reRequire("oxalis/model/helpers/nml_helpers");
const SkeletonTracingReducer = mock.reRequire("oxalis/model/reducers/skeletontracing_reducer")
  .default;
const SkeletonTracingActions = mock.reRequire("oxalis/model/actions/skeletontracing_actions");

const createDummyNode = (id: number): NodeType => ({
  bitDepth: 8,
  id,
  position: [id, id, id],
  radius: id,
  resolution: 10,
  rotation: [id, id, id],
  timestamp: id,
  viewport: 1,
  interpolation: id % 2 === 0,
});

const tracing = {
  type: "skeleton",
  trees: {
    "1": {
      treeId: 1,
      name: "TestTree-0",
      nodes: new DiffableMap([
        [0, createDummyNode(0)],
        [1, createDummyNode(1)],
        [2, createDummyNode(2)],
        [7, createDummyNode(7)],
      ]),
      timestamp: TIMESTAMP,
      branchPoints: [{ nodeId: 1, timestamp: 0 }, { nodeId: 7, timestamp: 0 }],
      edges: EdgeCollection.loadFromArray([
        { source: 0, target: 1 },
        { source: 2, target: 1 },
        { source: 1, target: 7 },
      ]),
      comments: [{ content: "comment", nodeId: 0 }],
      color: [23, 23, 23],
      isVisible: true,
      groupId: null,
    },
    "2": {
      treeId: 2,
      name: "TestTree-1",
      nodes: new DiffableMap([
        [4, createDummyNode(4)],
        [5, createDummyNode(5)],
        [6, createDummyNode(6)],
      ]),
      timestamp: TIMESTAMP,
      branchPoints: [],
      edges: EdgeCollection.loadFromArray([{ source: 4, target: 5 }, { source: 5, target: 6 }]),
      comments: [],
      color: [30, 30, 30],
      isVisible: true,
      groupId: 1,
    },
  },
  tracingType: "Explorational",
  treeGroups: [
    {
      groupId: 1,
      name: "Axon 1",
      children: [
        {
          groupId: 3,
          name: "Blah",
          children: [],
        },
        {
          groupId: 4,
          name: "Blah 2",
          children: [],
        },
      ],
    },
    {
      groupId: 2,
      name: "Axon 2",
      children: [],
    },
  ],
  name: "",
  activeTreeId: 1,
  activeNodeId: 1,
  annotationId: "annotationId",
  cachedMaxNodeId: 7,
  restrictions: {
    branchPointsAllowed: true,
    allowUpdate: true,
    allowFinish: true,
    allowAccess: true,
    allowDownload: true,
  },
  boundingBox: {
    min: [0, 0, 0],
    max: [500, 500, 500],
  },
  userBoundingBox: {
    min: [5, 5, 5],
    max: [250, 250, 250],
  },
};

const initialState = _.extend({}, defaultState, {
  tracing,
  activeUser: { firstName: "SCM", lastName: "Boy" },
  task: {
    id: 1,
  },
});

async function testThatParserThrowsWithState(t, invalidState, key) {
  // Serialize the NML using the invalidState, then parse it again, which should throw an NMLParseError
  const nmlWithInvalidContent = serializeToNml(invalidState, invalidState.tracing, buildInfo);
  await throwsAsyncParseError(t, () => parseNml(nmlWithInvalidContent), key);
}

async function throwsAsyncParseError(t, fn, key) {
  try {
    await fn.call();
    t.fail(`Test did not throw, calling the function with the following key: ${key}`);
  } catch (e) {
    if (e.name === "NmlParseError") {
      t.true(true);
    } else {
      throw e;
    }
  }
}

test("NML serializing and parsing should yield the same state", async t => {
  const serializedNml = serializeToNml(initialState, initialState.tracing, buildInfo);
  const { trees, treeGroups } = await parseNml(serializedNml);

  t.deepEqual(initialState.tracing.trees, trees);
  t.deepEqual(initialState.tracing.treeGroups, treeGroups);
});

test("NML Serializer should only serialize visible trees", async t => {
  const state = update(initialState, {
    tracing: { trees: { "1": { isVisible: { $set: false } } } },
  });
  const serializedNml = serializeToNml(state, state.tracing, buildInfo);
  const { trees } = await parseNml(serializedNml);

  // Tree 1 should not be exported as it is not visible
  delete state.tracing.trees["1"];
  t.deepEqual(Object.keys(state.tracing.trees), Object.keys(trees));
  t.deepEqual(state.tracing.trees, trees);
});

test("NML serializer should produce correct NMLs", t => {
  const serializedNml = serializeToNml(initialState, initialState.tracing, buildInfo);

  t.snapshot(serializedNml, { id: "nml" });
});

test("Serialized nml should be correctly named", async t => {
  t.is(getNmlName(initialState), "Test Dataset__1__sboy__tionId.nml");
  const stateWithoutTask = _.omit(initialState, "task");
  t.is(getNmlName(stateWithoutTask), "Test Dataset__explorational__sboy__tionId.nml");
});

test("NML Parser should throw errors for invalid nmls", async t => {
  const invalidCommentState = update(initialState, {
    tracing: { trees: { "2": { comments: { $set: [{ content: "test", nodeId: 99 }] } } } },
  });
  const invalidBranchPointState = update(initialState, {
    tracing: { trees: { "2": { branchPoints: { $set: [{ timestamp: 0, nodeId: 99 }] } } } },
  });
  const invalidEdgeState = update(initialState, {
    tracing: {
      trees: {
        "2": { edges: { $set: EdgeCollection.loadFromArray([{ source: 99, target: 5 }]) } },
      },
    },
  });
  const invalidSelfEdgeState = update(initialState, {
    tracing: {
      trees: {
        "2": {
          edges: {
            $set: EdgeCollection.loadFromArray([
              { source: 4, target: 5 },
              { source: 5, target: 6 },
              { source: 6, target: 6 },
            ]),
          },
        },
      },
    },
  });
  const duplicateEdgeState = update(initialState, {
    tracing: {
      trees: {
        "2": {
          edges: {
            $set: EdgeCollection.loadFromArray([
              { source: 4, target: 5 },
              { source: 4, target: 5 },
              { source: 5, target: 6 },
            ]),
          },
        },
      },
    },
  });
  const duplicateNodeState = update(initialState, {
    tracing: {
      trees: {
        "1": {
          nodes: {
            $set: new DiffableMap([
              [0, createDummyNode(0)],
              [1, createDummyNode(1)],
              [2, createDummyNode(2)],
              [4, createDummyNode(4)],
              [7, createDummyNode(7)],
            ]),
          },
        },
        "2": {
          nodes: {
            $set: new DiffableMap([
              [4, createDummyNode(4)],
              [5, createDummyNode(5)],
              [6, createDummyNode(6)],
            ]),
          },
        },
      },
    },
  });
  const duplicateTreeState = update(initialState, {
    tracing: {
      trees: {
        "2": {
          treeId: {
            $set: 1,
          },
        },
      },
    },
  });
  const disconnectedTreeState = update(initialState, {
    tracing: {
      trees: { "2": { edges: { $set: EdgeCollection.loadFromArray([{ source: 4, target: 5 }]) } } },
    },
  });
  const missingGroupIdState = update(initialState, {
    tracing: {
      trees: {
        "2": {
          groupId: { $set: 9999 },
        },
      },
    },
  });
  const duplicateGroupIdState = update(initialState, {
    tracing: {
      treeGroups: {
        $push: [
          {
            groupId: 3,
            name: "Group",
            children: [],
          },
        ],
      },
    },
  });

  await testThatParserThrowsWithState(t, invalidCommentState, "invalidComment");
  await testThatParserThrowsWithState(t, invalidBranchPointState, "invalidBranchPoint");
  await testThatParserThrowsWithState(t, invalidEdgeState, "invalidEdge");
  await testThatParserThrowsWithState(t, invalidSelfEdgeState, "invalidSelfEdge");
  await testThatParserThrowsWithState(t, duplicateEdgeState, "duplicateEdge");
  await testThatParserThrowsWithState(t, duplicateNodeState, "duplicateNode");
  await testThatParserThrowsWithState(t, duplicateTreeState, "duplicateTree");
  await testThatParserThrowsWithState(t, disconnectedTreeState, "disconnectedTree");
  await testThatParserThrowsWithState(t, missingGroupIdState, "missingGroupId");
  await testThatParserThrowsWithState(t, duplicateGroupIdState, "duplicateGroupId");
});

test("addTreesAndGroups reducer should assign new node and tree ids", t => {
  const action = SkeletonTracingActions.addTreesAndGroupsAction(initialState.tracing.trees, []);
  const newState = SkeletonTracingReducer(initialState, action);

  t.not(newState, initialState);

  // This should be unchanged / sanity check
  t.is(newState.tracing.name, initialState.tracing.name);
  t.is(newState.tracing.activeTreeId, initialState.tracing.activeTreeId);

  // New node and tree ids should have been assigned
  t.is(_.size(newState.tracing.trees), 4);
  t.is(newState.tracing.trees[3].treeId, 3);
  t.is(newState.tracing.trees[4].treeId, 4);
  t.is(newState.tracing.trees[3].nodes.size(), 4);
  t.is(newState.tracing.trees[3].nodes.get(8).id, 8);
  t.is(newState.tracing.trees[3].nodes.get(9).id, 9);
  t.is(newState.tracing.trees[4].nodes.size(), 3);
  t.is(newState.tracing.trees[4].nodes.get(12).id, 12);

  const getSortedEdges = edges => _.sortBy(edges.asArray(), "source");

  // And node ids in edges, branchpoints and comments should have been replaced
  t.deepEqual(getSortedEdges(newState.tracing.trees[3].edges), [
    { source: 8, target: 9 },
    { source: 9, target: 11 },
    { source: 10, target: 9 },
  ]);
  t.deepEqual(newState.tracing.trees[3].branchPoints, [
    { nodeId: 9, timestamp: 0 },
    { nodeId: 11, timestamp: 0 },
  ]);
  t.deepEqual(newState.tracing.trees[3].comments, [{ content: "comment", nodeId: 8 }]);
  t.deepEqual(getSortedEdges(newState.tracing.trees[4].edges), [
    { source: 12, target: 13 },
    { source: 13, target: 14 },
  ]);
  // The cachedMaxNodeId should be correct afterwards as well
  t.is(newState.tracing.cachedMaxNodeId, 14);
});

test("addTreesAndGroups reducer should assign new group ids", t => {
  const action = SkeletonTracingActions.addTreesAndGroupsAction(
    initialState.tracing.trees,
    _.cloneDeep(initialState.tracing.treeGroups),
  );
  const newState = SkeletonTracingReducer(initialState, action);

  t.not(newState, initialState);

  // This should be unchanged / sanity check
  t.is(newState.tracing.name, initialState.tracing.name);
  t.is(newState.tracing.activeTreeId, initialState.tracing.activeTreeId);

  // New node and tree ids should have been assigned
  t.is(_.size(newState.tracing.treeGroups), 4);
  t.not(newState.tracing.treeGroups[2].groupId, newState.tracing.treeGroups[0].groupId);
  t.not(newState.tracing.treeGroups[3].groupId, newState.tracing.treeGroups[1].groupId);
  t.is(newState.tracing.trees[3].groupId, null);
  t.is(newState.tracing.trees[4].groupId, newState.tracing.treeGroups[2].groupId);
});
