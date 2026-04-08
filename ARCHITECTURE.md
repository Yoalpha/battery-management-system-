# Battery Management System Architecture

## Overview

This project has three runtime layers:

1. Arduino firmware reads the physical sensors and emits telemetry as JSON over USB serial.
2. Electron main process receives that serial data, validates it, updates live telemetry, detects discharge cycles, stores cycle data in SQLite, and sends live state to the UI.
3. React renderer displays the live battery dashboard and the saved discharge history.

The overall data flow is:

1. Sensors are read on the Arduino.
2. Arduino serializes one telemetry sample as JSON.
3. Electron reads one JSON line from serial.
4. Electron normalizes and validates the sample.
5. Electron updates in-memory live telemetry.
6. Electron evaluates discharge-cycle state and alerts.
7. If a discharge cycle is active, Electron writes the sample to SQLite.
8. Electron sends the updated live telemetry to the React UI over IPC.
9. React renders live pages.
10. React can later query SQLite-backed discharge history through IPC.

## Repository Structure

- `arduino_firmware/`: Arduino Mega firmware for current, voltage, and temperature acquisition.
- `desktop_app/src/electron/`: Electron main-process code, preload bridge, serial parsing, discharge logic, and SQLite storage.
- `desktop_app/src/shared/`: shared TypeScript types used by both Electron and React.
- `desktop_app/src/ui/`: React renderer, dashboard pages, charts, and history UI.
- `test/`: experimental/test code paths not part of the main runtime.

## 1. Arduino Firmware

### Entry Point

The firmware entry point is [arduino_firmware.ino](/Users/yoalpha/projects/battery-management-system/arduino_firmware/arduino_firmware.ino).

On startup it:

- opens serial at `115200`
- initializes temperature sensors
- calibrates the current sensor offset

### Configuration

Hardware constants live in [config.h](/Users/yoalpha/projects/battery-management-system/arduino_firmware/config.h):

- current sensor pin and calibration constants
- voltage sensor pin groups
- voltage divider constants
- OneWire pin and max temperature sensor count

### Per-Loop Sensor Read Flow

Each loop iteration in [arduino_firmware.ino](/Users/yoalpha/projects/battery-management-system/arduino_firmware/arduino_firmware.ino#L15) does the following:

1. Reads the number of connected temperature sensors.
2. Requests one temperature conversion for the whole sensor bus.
3. Reads each temperature sensor into a `temperatures` array.
4. Reads the high-voltage analog channels.
5. Reads the low-voltage analog channels.
6. Merges both sets into one `voltage_readings` array.
7. Reads pack current from the current sensor.
8. Prints one JSON payload over serial.
9. Waits `1000 ms`.

### Current Measurement

Current logic lives in [sensors.cpp](/Users/yoalpha/projects/battery-management-system/arduino_firmware/sensors.cpp).

Startup calibration:

- `initCurrentSensor()` samples the ADC repeatedly with no load current.
- It computes the zero-current voltage offset.
- That offset replaces the static config offset for runtime use.

Per-sample current reading:

1. Average several ADC samples.
2. Convert ADC counts to voltage.
3. Subtract zero-current offset.
4. Divide by sensor sensitivity.
5. Apply calibration gain.
6. Apply low-pass filtering.

### Voltage Measurement

Voltage reading also lives in [sensors.cpp](/Users/yoalpha/projects/battery-management-system/arduino_firmware/sensors.cpp#L58).

There are two read paths:

- `readVoltageLow()`
- `readVoltageHigh()`

Each path:

1. reads the analog pin
2. converts ADC counts to voltage
3. applies the divider ratio
4. applies a calibration factor

The firmware combines both groups into a single `voltages` array before serializing.

### Temperature Measurement

Temperature logic lives in [tempSensor.cpp](/Users/yoalpha/projects/battery-management-system/arduino_firmware/tempSensor.cpp).

Startup:

- initialize the OneWire bus
- discover connected sensors
- cache their addresses

Per loop:

- `requestTemperatureReadings()` triggers one conversion for all sensors
- `getTemperatureC(index)` reads each sensor value from the cached address

This was intentionally structured so all temperature values come from the same sampling instant.

### Serial Payload Format

JSON serialization is handled in [create_json.cpp](/Users/yoalpha/projects/battery-management-system/arduino_firmware/create_json.cpp).

The emitted payload shape is:

```json
{
  "temps": [28.1, 28.5, 28.7, 28.3],
  "voltages": [4.18, 4.17, 4.19, 4.18, 4.16, 4.17, 4.18, 4.17, 4.15, 4.16, 4.17, 4.18],
  "current": -12.4
}
```

`temps` only includes the actual number of connected temperature sensors.

## 2. Serial Ingestion in Electron

### Port Discovery

Port discovery lives in [IdentifyArduino.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/SerialParse/IdentifyArduino.ts).

It scans available serial ports and picks the first path that looks like an Arduino or USB serial device.

### Serial Reader

The serial reader lives in [SerialReader.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/SerialParse/SerialReader.ts).

It:

- opens the detected serial port at `115200`
- uses `ReadlineParser` to split incoming data on newline boundaries
- trims each line
- forwards each full line to the JSON parser
- listens for serial errors and close events

### JSON Parse and Normalization

Payload parsing lives in [ParseSerialJSON.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/SerialParse/ParseSerialJSON.ts).

For each serial line:

1. attempt `JSON.parse`
2. validate that `temps` and `voltages` are arrays
3. normalize `current` to a number
4. filter invalid numeric values
5. reject malformed payloads
6. emit a normalized sample upstream

Normalized shape:

```ts
{
  temps: number[]
  voltages: number[]
  current: number
}
```

The parser also contains reconnect behavior:

- if no Arduino is found, it retries
- if the port closes, it retries
- if the port errors, it retries

## 3. Electron Main Process

The core runtime lives in [main.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/main.ts).

This file is responsible for:

- live telemetry state
- alert state
- rolling chart history
- discharge-cycle detection
- safety cutoff logic
- database storage
- IPC handlers for the UI

## 4. Shared Telemetry Model

Shared types live in [battery.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/shared/battery.ts).

Important shared types:

- `BatteryTelemetry`
- `TrendPoint`
- `DischargeCycleSummary`
- `DischargeCycleDetail`
- `PageId`

`TrendPoint` includes:

- `time`: display label
- `timestampMs`: real timestamp used for chart layout
- `value`: y-axis value

## 5. Live Telemetry Update Flow

When a valid serial payload reaches Electron main:

1. `computeTelemetryMetrics()` calculates:
   - total pack voltage
   - average cell voltage
   - average temperature
   - highest temperature
   - lowest temperature
2. `updateTelemetryFromSerial()` updates the shared in-memory `batteryTelemetry` object.
3. New `TrendPoint` values are appended to the voltage, current, and temperature histories.
4. Points older than 10 minutes are removed from those histories.
5. The updated telemetry object is broadcast to the renderer.

Relevant code:

- [main.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/main.ts#L151)
- [main.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/main.ts#L161)

### In-Memory Telemetry Structure

The main process keeps one mutable `batteryTelemetry` object with:

- `alerts`
- `homeMetrics`
- `batteryState`
- `voltagePage`
- `currentPage`
- `temperaturePage`

This object is the source of truth for the live dashboard.

## 6. Rolling 10-Minute Chart Window

The live dashboard pages show only the most recent 10 minutes.

This is implemented by:

- appending a timestamped point on every live update
- dropping points older than `historyWindowMs = 10 * 60 * 1000`

Code:

- [main.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/main.ts#L119)

The UI chart component in [TrendChart.tsx](/Users/yoalpha/projects/battery-management-system/desktop_app/src/ui/components/TrendChart.tsx) uses `timestampMs` for x-positioning, so the x-axis is based on real time rather than point index.

## 7. Alerts and Safety States

Alert strings are maintained in `batteryTelemetry.alerts` in [main.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/main.ts#L98).

Current alert conditions include:

- no Arduino serial connection
- discharge detected, awaiting confirmation
- discharge recording in progress
- pack voltage reached `35 V`, polling stopped

Those alerts are displayed on the Home page in [HomePage.tsx](/Users/yoalpha/projects/battery-management-system/desktop_app/src/ui/pages/HomePage.tsx).

## 8. Discharge Cycle Detection

Discharge detection is implemented in [main.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/main.ts#L318).

This is a small state machine with the states:

- `idle`
- `candidate_discharge`
- `awaiting_confirmation`
- `discharging`
- `candidate_end`

### Start Conditions

A discharge start is detected when:

- current stays below `-1 A`
- for at least `5 seconds`

Then the user is prompted to confirm the discharge start with an Electron dialog.

If the user confirms:

- a new cycle row is created in SQLite
- recording begins
- a recording alert is shown

### End Conditions

A discharge ends automatically when:

- current rises above `-0.2 A`
- for at least `20 seconds`

At that point:

- the active cycle is marked completed
- recording alert is removed

### Voltage Safety Cutoff

If pack voltage reaches or falls below `35 V`:

- polling is stopped
- the active cycle is closed
- a low-voltage alert is shown
- a dialog warns the user that data polling has stopped

This logic is in [main.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/main.ts#L276).

## 9. SQLite Persistence

SQLite logic lives in [telemetryStore.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/telemetryStore.ts).

The database file is created inside Electron user data storage as:

- `telemetry.sqlite`

### Tables

#### `cycles`

Stores one row per discharge cycle with:

- `started_at_ms`
- `ended_at_ms`
- `status`
- `start_reason`
- `end_reason`
- `trigger_current`
- `start_pack_voltage`
- `end_pack_voltage`

#### `telemetry_samples`

Stores one row per recorded sample during an active discharge cycle with:

- `cycle_id`
- `recorded_at_ms`
- `pack_voltage`
- `current`
- `average_temperature`
- `highest_temperature`
- `lowest_temperature`
- `cell_voltages_json`
- `sensor_temperatures_json`

### Persistence Flow

When a discharge is confirmed:

1. `startCycle()` inserts into `cycles`.
2. The first confirmed sample is inserted immediately.
3. Every subsequent live update during the active cycle calls `insertSample()`.
4. When the cycle ends, `endCycle()` updates the cycle row.

This means the stored history covers the entire recorded discharge window from confirmation until completion or cutoff.

## 10. Coulomb Counting: Drained Charge

The discharged amount shown on the History page is calculated using coulomb counting in [telemetryStore.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/telemetryStore.ts#L250).

For each pair of consecutive stored current samples:

1. compute elapsed time in hours
2. compute average current across the interval
3. convert only negative current into positive discharged current
4. integrate amp-hours
5. convert amp-hours to mAh

Formula:

```ts
elapsedHours = (t2 - t1) / 3_600_000
averageCurrent = (i1 + i2) / 2
dischargeCurrent = Math.max(-averageCurrent, 0)
drainedAmpHours += dischargeCurrent * elapsedHours
drainedMah = drainedAmpHours * 1000
```

Important implication:

- current sensor offset error will accumulate over time and directly affect the mAh estimate

## 11. IPC Boundary

The renderer does not access serial ports or SQLite directly.

Electron preload exposes a safe bridge in [preload.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/preload.ts).

Available UI-facing API methods:

- `getBatteryTelemetry()`
- `subscribeToBatteryTelemetry(listener)`
- `getDischargeCycles()`
- `getDischargeCycleDetail(cycleId)`

Main-process handlers are registered in [main.ts](/Users/yoalpha/projects/battery-management-system/desktop_app/src/electron/main.ts#L409).

This separation keeps hardware access and DB access isolated to Electron main.

## 12. React Renderer

The renderer entry points are:

- [main.tsx](/Users/yoalpha/projects/battery-management-system/desktop_app/src/ui/main.tsx)
- [App.tsx](/Users/yoalpha/projects/battery-management-system/desktop_app/src/ui/App.tsx)

The renderer is responsible for:

- page selection
- live telemetry rendering
- history list rendering
- expanded discharge cycle rendering
- chart display

Pages:

- Home
- Voltage
- Current
- Temperature
- History

### Live Dashboard Flow

On mount, `App.tsx`:

1. subscribes to `battery:telemetry`
2. fetches the initial telemetry snapshot
3. stores the latest telemetry in React state

That telemetry then flows into:

- [HomePage.tsx](/Users/yoalpha/projects/battery-management-system/desktop_app/src/ui/pages/HomePage.tsx)
- [VoltagePage.tsx](/Users/yoalpha/projects/battery-management-system/desktop_app/src/ui/pages/VoltagePage.tsx)
- [CurrentPage.tsx](/Users/yoalpha/projects/battery-management-system/desktop_app/src/ui/pages/CurrentPage.tsx)
- [TemperaturePage.tsx](/Users/yoalpha/projects/battery-management-system/desktop_app/src/ui/pages/TemperaturePage.tsx)

### Chart Rendering

Charts are rendered by [TrendChart.tsx](/Users/yoalpha/projects/battery-management-system/desktop_app/src/ui/components/TrendChart.tsx).

It supports two modes:

- live mode: fixed rolling 10-minute window
- history mode: full-cycle span

The chart:

- sorts points by timestamp
- computes x-position from elapsed time
- computes y-position from value range
- draws an SVG line, area fill, and timestamp labels

## 13. History Page Flow

The history UI lives in [HistoryPage.tsx](/Users/yoalpha/projects/battery-management-system/desktop_app/src/ui/pages/HistoryPage.tsx).

When the user opens `History`:

1. `App.tsx` calls `getDischargeCycles()`
2. Electron main queries SQLite summaries
3. React stores the returned cycle list
4. Each cycle is rendered as an expandable card

When the user clicks one cycle:

1. `App.tsx` calls `getDischargeCycleDetail(cycleId)`
2. Electron main queries all stored samples for that cycle
3. SQLite-backed samples are converted into three trend series:
   - full pack voltage trend
   - full current trend
   - full average temperature trend
4. React renders:
   - drained `mAh`
   - start voltage
   - end voltage
   - the three full-discharge graphs

## 14. Demo History Fallback

Because the project needed a visible history UI before real data existed, `App.tsx` also contains a demo fallback cycle.

If the history query returns no cycles or the preload API is unavailable, the UI falls back to one demo discharge cycle so the layout is still visible.

This is UI-only fallback data and not part of the real runtime recording path.

## 15. End-to-End Example

One real telemetry sample moves through the system like this:

1. Arduino reads:
   - 4 temperature sensors
   - 12 voltage channels
   - current sensor
2. Arduino emits:

```json
{
  "temps": [28.1, 28.5, 28.7, 28.3],
  "voltages": [4.18, 4.17, 4.19, 4.18, 4.16, 4.17, 4.18, 4.17, 4.15, 4.16, 4.17, 4.18],
  "current": -12.4
}
```

3. Electron serial reader receives one full line.
4. Parser validates and normalizes the payload.
5. Main process computes:
   - pack voltage
   - average cell voltage
   - average temperature
   - high/low temperature
6. Main process updates live in-memory telemetry.
7. Main process appends live chart points.
8. Main process evaluates discharge-cycle state.
9. If a cycle is active, the sample is written to SQLite.
10. Main process sends updated telemetry to the renderer.
11. React updates the visible dashboard page.
12. Later, the History page can query the saved cycle and display full-cycle graphs plus drained `mAh`.

## 16. Responsibilities by Layer

### Arduino

- low-level hardware access
- sensor calibration
- raw telemetry production
- serial transmission

### Electron Main

- serial transport
- payload validation
- live telemetry state
- discharge detection
- alerts and safety cutoff
- database storage
- IPC handlers

### React Renderer

- visual presentation
- live dashboard pages
- history list/detail UI
- chart rendering

## 17. Current Limitations and Follow-Up Areas

Current areas that may need improvement later:

- port identification is still heuristic rather than VID/PID-based
- current integration accuracy depends on sensor calibration quality
- `batteryState` fields are still placeholders
- history currently stores summary temperature plus raw arrays, but not per-cell/per-sensor trend tables
- demo history fallback should probably be removed once real history flow is stable

## 18. Summary

This system is designed so that:

- Arduino is only responsible for acquiring and emitting sensor data
- Electron main is the control plane and source of truth
- React is only responsible for display and interaction

That separation keeps the hardware logic, business logic, persistence logic, and UI concerns cleanly separated.
