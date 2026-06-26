# OpenCocodex Custom Modifications

## 1. Real-time Tokens Per Second (TPS) & Cache Hit Rate
* **How it works:**
  * Calculates and displays active speed (Tokens Per Second) and elapsed time while the agent is generating output.
  * Estimates tokens using character length divided by 3.5 (for text, reasoning, and tool inputs) before resolving to the exact token count upon message completion.
  * Calculates the cache hit rate using `cacheRead / (input + cacheRead) * 100`.
* **Locations:**
  * **TUI Sidebar:** [packages/tui/src/feature-plugins/sidebar/context.tsx](./packages/tui/src/feature-plugins/sidebar/context.tsx) (real-time updates via 200ms interval, excluding active tool runtimes; now also displays the session's overall accumulated cache hit rate).
  * **TUI Session View:** [packages/tui/src/routes/session/index.tsx](./packages/tui/src/routes/session/index.tsx) (completed average tps based on active duration; now also displays the request-specific cache hit rate in the message footer).
  * **Web UI Session Tab:** [packages/app/src/components/session/session-context-tab.tsx](./packages/app/src/components/session/session-context-tab.tsx) (completed average speed based on active duration).
  * **CLI Stats Command:** [packages/opencode/src/cli/cmd/stats.ts](./packages/opencode/src/cli/cmd/stats.ts) (accumulated total/per-model tps and cache hit rate).

## 2. Package Renaming & Global Installation Support
* **Modifications:**
  * Renamed the package and binary entry from `opencode` to `opencocodex`.
  * Updated [package.json](./package.json), [packages/opencode/package.json](./packages/opencode/package.json), and workspace dependency in [packages/web/package.json](./packages/web/package.json).
  * The build script [packages/opencode/script/build.ts](./packages/opencode/script/build.ts) dynamically compiles the binary as `opencocodex` and injects `"bin": { "opencocodex": "./bin/opencocodex" }` into the generated platform-specific `package.json`.
  * Allows global installation from the local build folder via Bun:
    ```bash
    bun add -g ./packages/opencode/dist/opencocodex-linux-x64
    ```

## 3. Dynamic Versioning Structure
* **Configured Version:** `1.17.9` (stored in `package.json` to match the upstream baseline version cleanly).
* **Build Version format:** Generated dynamically during compilation to `[base_version]-opencocodex.[suffix]`.
  * **If git working tree has modifications (Dirty):** Suffix is a datetime string in `YYYYMMDDHHmm` format (e.g. `1.17.9-opencocodex.202606231837`).
  * **If git working tree is clean (Clean):** Suffix is the 7-character short commit hash of `HEAD` (e.g. `1.17.9-opencocodex.feda2ff`).
