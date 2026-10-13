#!/bin/sh
set -eu
cd "$(dirname "$0")"
# Use clang with a wasm linker or set CC to a compatible wrapper (for example zig cc).
${CC:-clang} --target=wasm32-freestanding -O3 -nostdlib -fno-builtin schedule_core.c -Wl,--no-entry -Wl,--export=buffer -Wl,--export=capacity -Wl,--export=api_version -Wl,--export=statistics -Wl,--export=deltas -Wl,--export=forward_pass -Wl,--export-memory -Wl,--strip-all -o schedule_core.wasm
