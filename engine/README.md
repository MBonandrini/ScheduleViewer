# Schedule numeric engine — WebAssembly ABI 1

This folder contains the C source, compiled `schedule_core.wasm` and build script. The website's browser and risk worker can use it without users installing software. The standalone Excel add-in is native VBA and does not depend on this engine.

## JavaScript API

```js
import {ScheduleWasmEngine} from './src/wasm-engine.js';
const engine = await ScheduleWasmEngine.load();
engine.summarize([10, 12, 15]);
// {min, max, mean, standardDeviation, p10, p50, p80, p90, p95}
engine.dateDeltas([100, 200], [103, 198]); // [3, -2], same units as input
engine.forwardPass([4, 3], [
  {predecessor: 0, successor: 1, type: 'FS', lag: 2}
]); // starts [0, 6], finishes [4, 9], duration 9
```

Use one instance per worker/caller. Calls are synchronous and share a fixed internal buffer; the wrapper copies returned values. Inputs must be finite numbers. Statistics require a nonempty sample; durations must be nonnegative. Relationships use zero-based task indices and FS/SS/FF/SF, with signed lag in the same units as durations. Invalid relationships, cycles and capacity overflow throw errors. Forward-pass start times are bounded below by zero.

Statistics use population standard deviation and rounded-rank percentiles matching the existing risk engine convention. The 4,000,000-double workspace holds input, output and scratch arrays: statistics requires `n+9` slots, deltas `3n`, network `7n+5m`. This is approximately 32 MB per instance.

The C exports are `api_version`, `buffer`, `capacity`, `statistics`, `deltas`, `forward_pass`, and `memory`. Prefer the validated JS API. See C for the exact buffer layout and error codes before writing another language binding.

## Build

Use a WebAssembly-capable clang/wasm linker, or Zig, on the developer/build machine:

```sh
sh engine/build.sh
# or
CC='zig cc' sh engine/build.sh
```

The supplied binary is already compiled. Consumers do not need a compiler or Node.js. Serve the website over HTTPS or localhost; opening modules from a `file://` URL is not supported.

## Scope and protection

These are selected numeric kernels, not a conversion of the entire application. The risk worker uses the compiled sample summary when loading succeeds and retains its JavaScript fallback. Deltas and the elapsed-time network pass are exposed programmatically; the main calendar-aware CPM editor remains JavaScript. This simple network API does **not** model working calendars, actual progress, constraints or resource levelling.

The Pages build publishes the WASM binary and runtime JS, not this C source or build script. Publishing this source repository publicly still exposes its contents. WebAssembly makes the compiled implementation less convenient to inspect; it is not encryption or a guarantee of confidentiality. No native Windows DLL is included. There is no hosted API, central AI key or server requirement.
