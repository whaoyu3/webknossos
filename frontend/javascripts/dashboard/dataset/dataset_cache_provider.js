// @flow
import React, { createContext, useState, type Node } from "react";

import type { DatasetFilteringMode } from "dashboard/dataset_view";
import type { APIMaybeUnimportedDataset } from "admin/api_flow_types";
import { getDatastores, triggerDatasetCheck, getDatasets } from "admin/admin_rest_api";
import { handleGenericError } from "libs/error_handling";
import UserLocalStorage from "libs/user_local_storage";
import * as Utils from "libs/utils";

type Context = {
  datasets: Array<APIMaybeUnimportedDataset>,
  isLoading: boolean,
  checkDatasets: () => Promise<void>,
  fetchDatasets: (datasetFilteringMode?: DatasetFilteringMode) => Promise<void>,
};

const wkDatasetsCacheKey = "wk.datasets";
export const datasetCache = {
  set(datasets: APIMaybeUnimportedDataset[]): void {
    UserLocalStorage.setItem(wkDatasetsCacheKey, JSON.stringify(datasets));
  },
  get(): APIMaybeUnimportedDataset[] {
    return Utils.parseAsMaybe(UserLocalStorage.getItem(wkDatasetsCacheKey)).getOrElse([]);
  },
  clear(): void {
    UserLocalStorage.removeItem(wkDatasetsCacheKey);
  },
};

export const DatasetCacheContext = createContext<Context>({
  datasets: [],
  isLoading: false,
  fetchDatasets: async () => {},
  checkDatasets: async () => {},
});

export default function DatasetCacheProvider({ children }: { children: Node }) {
  const [datasets, setDatasets] = useState(datasetCache.get());
  const [isLoading, setIsLoading] = useState(false);
  async function fetchDatasets(
    datasetFilteringMode?: DatasetFilteringMode = "onlyShowReported",
  ): Promise<void> {
    try {
      setIsLoading(true);
      const mapFilterModeToUnreportedParameter = {
        showAllDatasets: null,
        onlyShowReported: false,
        onlyShowUnreported: true,
      };
      const newDatasets = await getDatasets(
        mapFilterModeToUnreportedParameter[datasetFilteringMode],
      );
      datasetCache.set(newDatasets);
      setDatasets(newDatasets);
    } catch (error) {
      handleGenericError(error);
    } finally {
      setIsLoading(false);
    }
  }
  async function checkDatasets() {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const datastores = await getDatastores();
      await Promise.all(
        datastores.filter(ds => !ds.isForeign).map(datastore => triggerDatasetCheck(datastore.url)),
      );
      await fetchDatasets();
    } catch (error) {
      handleGenericError(error);
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <DatasetCacheContext.Provider value={{ datasets, isLoading, checkDatasets, fetchDatasets }}>
      {children}
    </DatasetCacheContext.Provider>
  );
}