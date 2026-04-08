import { mkdirSync } from 'fs'
import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import type {
  DischargeCycleDetail,
  DischargeCycleSummary,
  TrendPoint,
} from '../shared/battery.js'
import { createDemoCycleData } from '../shared/demoCycle.js'

export type PersistedTelemetrySample = {
  cycleId: number
  recordedAtMs: number
  packVoltage: number
  current: number
  averageTemperature: number
  highestTemperature: number
  lowestTemperature: number
  cellVoltages: number[]
  sensorTemperatures: number[]
}

export type CycleEndStatus = 'completed' | 'aborted'
export type CycleEndReason = 'auto_end' | 'voltage_limit' | 'manual' | 'aborted'

type CycleRow = {
  id: number
  started_at_ms: number
  ended_at_ms: number | null
  status: string
  trigger_current: number
  start_pack_voltage: number
  end_pack_voltage: number | null
  sample_count: number
}

type SampleRow = {
  recorded_at_ms: number
  pack_voltage: number
  current: number
  average_temperature: number
}

export class TelemetryStore {
  private readonly database: DatabaseSync

  // Open the SQLite database and ensure schema plus optional demo data exist before runtime use.
  constructor(databaseDirectory: string) {
    mkdirSync(databaseDirectory, { recursive: true })
    const databasePath = path.join(databaseDirectory, 'telemetry.sqlite')
    this.database = new DatabaseSync(databasePath)
    this.database.exec('PRAGMA journal_mode = WAL')
    this.database.exec('PRAGMA foreign_keys = ON')
    this.initialize()
    this.seedDemoCycleIfEmpty()
  }

  // Create the cycle and sample tables used by the history page and discharge logging pipeline.
  private initialize() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at_ms INTEGER NOT NULL,
        ended_at_ms INTEGER,
        status TEXT NOT NULL,
        start_reason TEXT NOT NULL,
        end_reason TEXT,
        trigger_current REAL NOT NULL,
        start_pack_voltage REAL NOT NULL,
        end_pack_voltage REAL
      );

      CREATE TABLE IF NOT EXISTS telemetry_samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_id INTEGER NOT NULL,
        recorded_at_ms INTEGER NOT NULL,
        pack_voltage REAL NOT NULL,
        current REAL NOT NULL,
        average_temperature REAL NOT NULL,
        highest_temperature REAL NOT NULL,
        lowest_temperature REAL NOT NULL,
        cell_voltages_json TEXT NOT NULL,
        sensor_temperatures_json TEXT NOT NULL,
        FOREIGN KEY(cycle_id) REFERENCES cycles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_cycles_status ON cycles(status);
      CREATE INDEX IF NOT EXISTS idx_samples_cycle_time ON telemetry_samples(cycle_id, recorded_at_ms);
    `)
  }

  // Seed one demo discharge cycle so the history page has content on a fresh database.
  private seedDemoCycleIfEmpty() {
    const row = this.database
      .prepare('SELECT COUNT(*) AS cycle_count FROM cycles')
      .get() as { cycle_count: number }

    if (row.cycle_count > 0) {
      return
    }

    const demoCycle = createDemoCycleData()
    const cycleId = this.startCycle(
      demoCycle.detail.summary.startedAtMs,
      demoCycle.detail.summary.triggerCurrent,
      demoCycle.detail.summary.startPackVoltage
    )

    for (const sample of demoCycle.samples) {
      this.insertSample({
        cycleId,
        recordedAtMs: sample.recordedAtMs,
        packVoltage: sample.packVoltage,
        current: sample.current,
        averageTemperature: sample.averageTemperature,
        highestTemperature: sample.highestTemperature,
        lowestTemperature: sample.lowestTemperature,
        cellVoltages: sample.cellVoltages,
        sensorTemperatures: sample.sensorTemperatures,
      })
    }

    this.endCycle(
      cycleId,
      demoCycle.detail.summary.endedAtMs ?? demoCycle.detail.summary.startedAtMs,
      'completed',
      'voltage_limit',
      demoCycle.detail.summary.endPackVoltage ?? demoCycle.detail.summary.startPackVoltage
    )
  }

  // Insert a new active discharge cycle row and return its generated id.
  startCycle(startedAtMs: number, triggerCurrent: number, startPackVoltage: number): number {
    const result = this.database
      .prepare(`
        INSERT INTO cycles (
          started_at_ms,
          status,
          start_reason,
          trigger_current,
          start_pack_voltage
        ) VALUES (?, 'active', 'auto_discharge_detected', ?, ?)
      `)
      .run(startedAtMs, triggerCurrent, startPackVoltage)

    return Number(result.lastInsertRowid)
  }

  // Persist one discharge-cycle sample with pack metrics plus raw per-cell and temperature arrays.
  insertSample(sample: PersistedTelemetrySample) {
    this.database
      .prepare(`
        INSERT INTO telemetry_samples (
          cycle_id,
          recorded_at_ms,
          pack_voltage,
          current,
          average_temperature,
          highest_temperature,
          lowest_temperature,
          cell_voltages_json,
          sensor_temperatures_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        sample.cycleId,
        sample.recordedAtMs,
        sample.packVoltage,
        sample.current,
        sample.averageTemperature,
        sample.highestTemperature,
        sample.lowestTemperature,
        JSON.stringify(sample.cellVoltages),
        JSON.stringify(sample.sensorTemperatures)
      )
  }

  // Mark an active cycle as completed or aborted once recording stops.
  endCycle(
    cycleId: number,
    endedAtMs: number,
    status: CycleEndStatus,
    endReason: CycleEndReason,
    endPackVoltage: number
  ) {
    this.database
      .prepare(`
        UPDATE cycles
        SET ended_at_ms = ?,
            status = ?,
            end_reason = ?,
            end_pack_voltage = ?
        WHERE id = ?
      `)
      .run(endedAtMs, status, endReason, endPackVoltage, cycleId)
  }

  // Load the compact list of discharge cycles shown on the history page.
  getCycleSummaries(): DischargeCycleSummary[] {
    const rows = this.database
      .prepare(`
        SELECT
          cycles.id,
          cycles.started_at_ms,
          cycles.ended_at_ms,
          cycles.status,
          cycles.trigger_current,
          cycles.start_pack_voltage,
          cycles.end_pack_voltage,
          COUNT(telemetry_samples.id) AS sample_count
        FROM cycles
        LEFT JOIN telemetry_samples ON telemetry_samples.cycle_id = cycles.id
        GROUP BY cycles.id
        ORDER BY cycles.started_at_ms DESC
      `)
      .all() as CycleRow[]

    return rows.map((row) => {
      const samples = this.getSamplesForCycle(row.id)

      return this.mapSummaryRow(row, samples)
    })
  }

  // Load the full trend series and summary metrics for one discharge cycle.
  getCycleDetail(cycleId: number): DischargeCycleDetail | null {
    const row = this.database
      .prepare(`
        SELECT
          cycles.id,
          cycles.started_at_ms,
          cycles.ended_at_ms,
          cycles.status,
          cycles.trigger_current,
          cycles.start_pack_voltage,
          cycles.end_pack_voltage,
          COUNT(telemetry_samples.id) AS sample_count
        FROM cycles
        LEFT JOIN telemetry_samples ON telemetry_samples.cycle_id = cycles.id
        WHERE cycles.id = ?
        GROUP BY cycles.id
      `)
      .get(cycleId) as CycleRow | undefined

    if (row == null) {
      return null
    }

    const samples = this.getSamplesForCycle(cycleId)

    return {
      summary: this.mapSummaryRow(row, samples),
      voltageTrend: samples.map((sample) => this.createTrendPoint(sample.recorded_at_ms, sample.pack_voltage)),
      currentTrend: samples.map((sample) => this.createTrendPoint(sample.recorded_at_ms, sample.current)),
      temperatureTrend: samples.map((sample) => this.createTrendPoint(sample.recorded_at_ms, sample.average_temperature)),
    }
  }

  // Fetch all persisted samples for one cycle in chronological order.
  private getSamplesForCycle(cycleId: number): SampleRow[] {
    return this.database
      .prepare(`
        SELECT
          recorded_at_ms,
          pack_voltage,
          current,
          average_temperature
        FROM telemetry_samples
        WHERE cycle_id = ?
        ORDER BY recorded_at_ms ASC
      `)
      .all(cycleId) as SampleRow[]
  }

  // Convert one SQL row plus its samples into the UI summary shape.
  private mapSummaryRow(row: CycleRow, samples: SampleRow[]): DischargeCycleSummary {
    return {
      id: row.id,
      startedAtMs: row.started_at_ms,
      endedAtMs: row.ended_at_ms,
      status: row.status,
      startPackVoltage: row.start_pack_voltage,
      endPackVoltage: row.end_pack_voltage,
      triggerCurrent: row.trigger_current,
      sampleCount: row.sample_count,
      drainedMah: Number(this.calculateDrainedMah(samples).toFixed(2)),
    }
  }

  // Convert a timestamped numeric value into the chart point shape used by the renderer.
  private createTrendPoint(timestampMs: number, value: number): TrendPoint {
    return {
      time: new Date(timestampMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestampMs,
      value: Number(value.toFixed(2)),
    }
  }

  // Integrate current over time to estimate how much charge was discharged in mAh.
  private calculateDrainedMah(samples: SampleRow[]): number {
    if (samples.length < 2) {
      return 0
    }

    let drainedAmpHours = 0

    for (let index = 1; index < samples.length; index += 1) {
      const previous = samples[index - 1]
      const current = samples[index]
      const elapsedHours = (current.recorded_at_ms - previous.recorded_at_ms) / 3_600_000
      const averageCurrent = (previous.current + current.current) / 2
      const dischargeCurrent = Math.max(-averageCurrent, 0)

      drainedAmpHours += dischargeCurrent * elapsedHours
    }

    return drainedAmpHours * 1000
  }

  // Close the SQLite connection when Electron exits.
  close() {
    this.database.close()
  }
}
