import { afterAll, describe, expect, it } from 'vitest'
import {
  installScanMetrics,
  otlpMetricsUrl,
  queryScanMetrics,
  recordScanDeferred,
  recordScanFailed,
  requireScanMetrics,
  shutdownScanMetrics,
} from './otel-contract.js'

describe('scan metric contract', () => {
  afterAll(async () => {
    await shutdownScanMetrics()
  })

  it('does not invent an exporter destination', () => {
    expect(otlpMetricsUrl({})).toBeNull()
    expect(otlpMetricsUrl({ OTEL_EXPORTER_OTLP_ENDPOINT: '   ' })).toBeNull()
    expect(otlpMetricsUrl({ OTEL_EXPORTER_OTLP_ENDPOINT: 'https://collector.invalid' })).toBe(
      'https://collector.invalid/v1/metrics',
    )
    expect(otlpMetricsUrl({ OTEL_EXPORTER_OTLP_ENDPOINT: 'https://collector.invalid/v1/metrics/' })).toBe(
      'https://collector.invalid/v1/metrics',
    )
  })

  it('rejects a query that omits either scan count', () => {
    expect(() => requireScanMetrics(['scan_failed_count'])).toThrow('scan_deferred_count is hidden')
    expect(() => requireScanMetrics(['scan_deferred_count'])).toThrow('scan_failed_count is hidden')
    expect(() => requireScanMetrics(['scan_deferred_count', 'scan_failed_count'])).not.toThrow()
  })

  it('shows both counts at zero, then after a later record', async () => {
    installScanMetrics({})
    expect(await queryScanMetrics()).toEqual({
      scan_deferred_count: 0,
      scan_failed_count: 0,
    })
    recordScanDeferred()
    recordScanFailed()
    recordScanDeferred()
    expect(await queryScanMetrics()).toEqual({
      scan_deferred_count: 2,
      scan_failed_count: 1,
    })
  })
})
