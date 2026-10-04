import { ValueType } from '@opentelemetry/api'
import { ExportResultCode, type ExportResult } from '@opentelemetry/core'
import { resourceFromAttributes } from '@opentelemetry/resources'
import {
  AggregationTemporality,
  MeterProvider,
  PeriodicExportingMetricReader,
  type PushMetricExporter,
  type ResourceMetrics,
} from '@opentelemetry/sdk-metrics'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'

export const SCAN_DEFERRED_COUNT = 'scan_deferred_count'
export const SCAN_FAILED_COUNT = 'scan_failed_count'

const REQUIRED_METRICS = [SCAN_DEFERRED_COUNT, SCAN_FAILED_COUNT] as const

export type ScanMetricCounts = {
  scan_deferred_count: number
  scan_failed_count: number
}

const totals: ScanMetricCounts = {
  scan_deferred_count: 0,
  scan_failed_count: 0,
}

class LatestMetricsExporter implements PushMetricExporter {
  private snapshot: ResourceMetrics | null = null

  export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void {
    this.snapshot = metrics
    resultCallback({ code: ExportResultCode.SUCCESS })
  }

  latest(): ResourceMetrics | null {
    return this.snapshot
  }

  forceFlush(): Promise<void> {
    return Promise.resolve()
  }

  shutdown(): Promise<void> {
    return Promise.resolve()
  }

  selectAggregationTemporality(): AggregationTemporality {
    return AggregationTemporality.CUMULATIVE
  }
}

let provider: MeterProvider | null = null
let reader: PeriodicExportingMetricReader | null = null
let snapshot: LatestMetricsExporter | null = null

export function otlpMetricsUrl(env: NodeJS.ProcessEnv): string | null {
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() ?? ''
  if (endpoint === '') {
    return null
  }
  const base = endpoint.replace(/\/$/, '')
  if (base.endsWith('/v1/metrics')) {
    return base
  }
  return `${base}/v1/metrics`
}

export function requireScanMetrics(names: readonly string[]): void {
  for (const name of REQUIRED_METRICS) {
    if (!names.includes(name)) {
      throw new Error(`${name} is hidden`)
    }
  }
}

function countsFromExport(metrics: ResourceMetrics | null): ScanMetricCounts {
  const values = new Map<string, number>()
  for (const scope of metrics?.scopeMetrics ?? []) {
    for (const metric of scope.metrics) {
      const point = metric.dataPoints[0]
      const value = point?.value
      if (typeof value === 'number') {
        values.set(metric.descriptor.name, value)
      }
    }
  }
  requireScanMetrics([...values.keys()])
  return {
    scan_deferred_count: values.get(SCAN_DEFERRED_COUNT) ?? 0,
    scan_failed_count: values.get(SCAN_FAILED_COUNT) ?? 0,
  }
}

export function installScanMetrics(env: NodeJS.ProcessEnv): void {
  if (provider !== null) {
    return
  }
  const latest = new LatestMetricsExporter()
  const localReader = new PeriodicExportingMetricReader({
    exporter: latest,
    exportIntervalMillis: 60_000,
  })
  const readers = [localReader]
  const url = otlpMetricsUrl(env)
  if (url !== null) {
    readers.push(
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url }),
        exportIntervalMillis: 60_000,
      }),
    )
  }
  const role = env.PROCESS_ROLE === 'worker' ? 'worker' : 'api'
  const meterProvider = new MeterProvider({
    resource: resourceFromAttributes({
      'service.name': 'ankanu',
      'service.instance.id': role,
    }),
    readers,
  })
  const meter = meterProvider.getMeter('ankanu')
  const deferred = meter.createObservableCounter(SCAN_DEFERRED_COUNT, {
    description: 'Scan-deferred events. Never hidden.',
    valueType: ValueType.INT,
  })
  const failed = meter.createObservableCounter(SCAN_FAILED_COUNT, {
    description: 'Scan-failed events. Never hidden.',
    valueType: ValueType.INT,
  })
  deferred.addCallback((result) => {
    result.observe(totals.scan_deferred_count)
  })
  failed.addCallback((result) => {
    result.observe(totals.scan_failed_count)
  })
  provider = meterProvider
  reader = localReader
  snapshot = latest
}

export function recordScanDeferred(): void {
  totals.scan_deferred_count += 1
}

export function recordScanFailed(): void {
  totals.scan_failed_count += 1
}

export async function queryScanMetrics(): Promise<ScanMetricCounts> {
  if (reader === null || snapshot === null) {
    throw new Error('scan metrics are not installed')
  }
  await reader.forceFlush()
  return countsFromExport(snapshot.latest())
}

export async function shutdownScanMetrics(): Promise<void> {
  const current = provider
  provider = null
  reader = null
  snapshot = null
  if (current !== null) {
    await current.shutdown()
  }
  totals.scan_deferred_count = 0
  totals.scan_failed_count = 0
}
