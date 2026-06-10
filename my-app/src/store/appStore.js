import { create } from 'zustand'

const useAppStore = create((set) => ({
  currentYear: 2000,
  splitScreenActive: false,
  overlayActive: false,
  focusedCountryLeft: null,
  focusedCountryRight: null,
  selectedDimension: null,
  datasetCache: {},

  setCurrentYear: (year) => set({ currentYear: year }),
  setSplitScreenActive: (active) =>
    set((s) => ({
      splitScreenActive: active,
      overlayActive: active ? s.overlayActive : false,
    })),
  setOverlayActive: (active) => set({ overlayActive: active }),
  setFocusedCountryLeft: (country) => set({ focusedCountryLeft: country }),
  setFocusedCountryRight: (country) => set({ focusedCountryRight: country }),
  setSelectedDimension: (dim) => set({ selectedDimension: dim }),
  cacheDataset: (metricName, data) =>
    set((s) => ({ datasetCache: { ...s.datasetCache, [metricName]: data } })),
}))

export default useAppStore
