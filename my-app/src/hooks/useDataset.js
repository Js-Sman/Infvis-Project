import { useState, useEffect } from 'react'
import useAppStore from '../store/appStore.js'
import { loadDataset } from '../utils/dataService.js'

export function useDataset(metricName) {
  const datasetCache = useAppStore((s) => s.datasetCache)
  const cacheDataset = useAppStore((s) => s.cacheDataset)
  const [loading, setLoading] = useState(!datasetCache[metricName])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!metricName) return
    if (datasetCache[metricName]) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    loadDataset(metricName, cacheDataset, datasetCache)
      .then(() => setLoading(false))
      .catch((err) => {
        console.error(`Failed to load dataset "${metricName}":`, err)
        setError(err)
        setLoading(false)
      })
  }, [metricName])

  return {
    data: datasetCache[metricName] || null,
    loading,
    error,
  }
}
