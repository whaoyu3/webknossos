/* eslint import/no-extraneous-dependencies: ["error", {"peerDependencies": true}] */
import test from "ava";
import _ from "lodash";
import mockRequire from "mock-require";
import sinon from "sinon";
import Base64 from "base64-js";
import datasetServerObject from "test/fixtures/dataset_server_object";
import { getBitDepth } from "oxalis/model/accessors/dataset_accessor";

mockRequire.stopAll();

const RequestMock = {
  always: (promise, func) => promise.then(func, func),
  sendJSONReceiveArraybuffer: sinon.stub(),
  receiveJSON: sinon.stub(),
};
const { dataSource } = datasetServerObject;
let _fourBit = false;

function setFourBit(bool) {
  _fourBit = bool;
}

const StoreMock = {
  getState: () => ({
    dataset: {
      name: "dataSet",
      dataStore: {
        typ: "webknossos-store",
        url: "url",
      },
      dataSource,
    },
    datasetConfiguration: { fourBit: _fourBit },
  }),
  dispatch: sinon.stub(),
};

mockRequire("libs/request", RequestMock);
mockRequire("oxalis/store", StoreMock);

const { DataBucket } = mockRequire.reRequire("oxalis/model/bucket_data_handling/bucket");
const { requestFromStore, sendToStore } = mockRequire.reRequire(
  "oxalis/model/bucket_data_handling/wkstore_adapter",
);

const tokenResponse = { token: "token" };

test.beforeEach(t => {
  RequestMock.receiveJSON = sinon.stub();
  RequestMock.receiveJSON.returns(Promise.resolve(tokenResponse));

  t.context.layer = dataSource.dataLayers[0];
  t.context.segmentationLayer = dataSource.dataLayers[1];
});

test.serial("Initialization should set the attributes correctly", t => {
  const { layer } = t.context;
  t.is(layer.name, "color");
  t.is(layer.category, "color");
  t.is(getBitDepth(layer), 8);
});

function prepare() {
  const batch = [[0, 0, 0, 0], [1, 1, 1, 1]];
  const bucketData1 = _.range(0, 32 * 32 * 32).map(i => i % 256);
  const bucketData2 = _.range(0, 32 * 32 * 32).map(i => (2 * i) % 256);
  const responseBuffer = new Uint8Array(bucketData1.concat(bucketData2));

  RequestMock.sendJSONReceiveArraybuffer = sinon.stub();
  RequestMock.sendJSONReceiveArraybuffer.returns(Promise.resolve(responseBuffer));
  return { batch, responseBuffer };
}

test.serial("requestFromStore: Token Handling should re-request a token when it's invalid", t => {
  const { layer } = t.context;
  const { batch, responseBuffer } = prepare();
  RequestMock.sendJSONReceiveArraybuffer = sinon.stub();
  RequestMock.sendJSONReceiveArraybuffer
    .onFirstCall()
    // eslint-disable-next-line prefer-promise-reject-errors
    .returns(Promise.reject({ status: 403 }))
    .onSecondCall()
    .returns(Promise.resolve(responseBuffer));

  RequestMock.receiveJSON = sinon.stub();
  RequestMock.receiveJSON
    .onFirstCall()
    .returns(Promise.resolve(tokenResponse))
    .onSecondCall()
    .returns(Promise.resolve({ token: "token2" }));

  return requestFromStore(layer, batch).then(result => {
    t.deepEqual(result, responseBuffer);

    t.is(RequestMock.sendJSONReceiveArraybuffer.callCount, 2);

    const url = RequestMock.sendJSONReceiveArraybuffer.getCall(0).args[0];
    t.is(url, "url/data/datasets/dataSet/layers/color/data?token=token");

    const url2 = RequestMock.sendJSONReceiveArraybuffer.getCall(1).args[0];
    t.is(url2, "url/data/datasets/dataSet/layers/color/data?token=token2");
  });
});

function createExpectedOptions(fourBit: boolean = false) {
  return {
    data: [
      { position: [0, 0, 0], zoomStep: 0, cubeSize: 32, fourBit },
      { position: [64, 64, 64], zoomStep: 1, cubeSize: 32, fourBit },
    ],
    timeout: 30000,
  };
}

test.serial("requestFromStore: Request Handling: should pass the correct request parameters", t => {
  const { layer } = t.context;
  const { batch } = prepare();

  const expectedUrl = "url/data/datasets/dataSet/layers/color/data?token=token2";
  const expectedOptions = createExpectedOptions();

  return requestFromStore(layer, batch).then(() => {
    t.is(RequestMock.sendJSONReceiveArraybuffer.callCount, 1);

    const [url, options] = RequestMock.sendJSONReceiveArraybuffer.getCall(0).args;
    t.is(url, expectedUrl);
    t.deepEqual(options, expectedOptions);
  });
});

test.serial(
  "requestFromStore: Request Handling: four bit mode should be respected for color layers",
  async t => {
    setFourBit(true);
    // test four bit color and 8 bit seg
    const { layer } = t.context;
    const { batch } = prepare();

    const expectedUrl = "url/data/datasets/dataSet/layers/color/data?token=token2";
    const expectedOptions = createExpectedOptions(true);

    await requestFromStore(layer, batch).then(() => {
      t.is(RequestMock.sendJSONReceiveArraybuffer.callCount, 1);

      const [url, options] = RequestMock.sendJSONReceiveArraybuffer.getCall(0).args;
      t.is(url, expectedUrl);
      t.deepEqual(options, expectedOptions);
    });

    setFourBit(false);
  },
);

test.serial(
  "requestFromStore: Request Handling: four bit mode should not be respected for segmentation layers",
  async t => {
    setFourBit(true);
    const { segmentationLayer } = t.context;

    const { batch } = prepare();
    const expectedUrl = "url/data/datasets/dataSet/layers/segmentation/data?token=token2";
    const expectedOptions = createExpectedOptions(false);

    await requestFromStore(segmentationLayer, batch).then(() => {
      t.is(RequestMock.sendJSONReceiveArraybuffer.callCount, 1);

      const [url, options] = RequestMock.sendJSONReceiveArraybuffer.getCall(0).args;
      t.is(url, expectedUrl);
      t.deepEqual(options, expectedOptions);
    });
    setFourBit(false);
  },
);

test.serial("sendToStore: Request Handling should send the correct request parameters", t => {
  const data = new Uint8Array(2);
  const bucket1 = new DataBucket(8, [0, 0, 0, 0], null);
  bucket1.data = data;
  const bucket2 = new DataBucket(8, [1, 1, 1, 1], null);
  bucket2.data = data;
  const batch = [bucket1, bucket2];

  const getBucketData = sinon.stub();
  getBucketData.returns(data);

  const expectedSaveQueueItems = {
    type: "PUSH_SAVE_QUEUE",
    items: [
      {
        name: "updateBucket",
        value: {
          position: [0, 0, 0],
          zoomStep: 0,
          cubeSize: 32,
          base64Data: Base64.fromByteArray(data),
        },
      },
      {
        name: "updateBucket",
        value: {
          position: [64, 64, 64],
          zoomStep: 1,
          cubeSize: 32,
          base64Data: Base64.fromByteArray(data),
        },
      },
    ],
  };

  return sendToStore(batch).then(() => {
    t.is(StoreMock.dispatch.callCount, 1);

    const [saveQueueItems] = StoreMock.dispatch.getCall(0).args;
    t.deepEqual(saveQueueItems, expectedSaveQueueItems);
  });
});
