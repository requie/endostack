# Control-adapter contract

issue-loop knows nothing about your application. It drives the app through a control skill you supply: a skill that can start your app in a test environment and operate it as a user would, through a browser, a desktop automation layer, or a terminal. This file states what that skill must provide. If the skill, the feature map, or any required capability is missing, reproduction and fixing fail closed and triage continues alone.

The config names the skill (`control.skill`) and the feature map path (`control.feature_map_path`). The feature map is your own copy, outside the pack.

## Required capabilities

Each capability lists what the reproduce run passes in and what the adapter must return.

### 1. Bring up

Start a given revision of the repository in a given test environment.

- **Inputs:** which repository and which revision to run; whether to build first or start an existing build; the workspace, test account, fixtures, and feature flags the scenario needs; where to write artifacts; where the feature map lives.
- **Returns:** a session ID; how it confirmed this is the right app in the right environment; stable app markers to check later (a build hash in an about panel, a test-environment banner, a known element); process, port, or window details for later calls; any capability it lacks.
- **Must:** tell the target apart from look-alike windows, other shells, and production instances. Run inside the configured container or disposable VM, and report the environment name it actually connected to so the run can compare it to `control.environment`. Refuse to start against a host on the production list.

### 2. Drive the UI

Act as a user would, using the app's own controls: clicking, typing text, pressing keys, scrolling, dragging, resizing, and moving between screens.

- Find elements by their role, their accessible name, or a selector that stays the same across builds. Screen coordinates are acceptable only right after a new screenshot was taken.
- For every action, report what was done and what changed on screen as a result.
- **Forbidden:** setting internal state, calling hidden app methods, writing to storage directly, injecting DOM changes, or anything else that produces the symptom without a user action.
- **Typed text:** when the run types text taken from a report (a reproduction input like a filename or a search string), the adapter types it into the app as literal characters. It never passes that text to a shell, an `eval`, or a URL it fetches itself.

### 3. Operate the features and states the map describes

- Start by reading the feature-map section that covers the feature.
- Navigate to each mapped feature by its user-visible path and invoke the adapter actions the map lists for it.
- Put the feature through whichever states apply to it. The usual set covers interaction (default, hover, focus-visible, active, disabled), data (loading, empty, error), and selection (selected, open, expanded), plus anything the map lists for that feature.
- Arrange preconditions through safe fixtures, test-account permissions, feature flags, mocked service responses, or supported test controls. Arranging a precondition never permits injecting the symptom itself.
- Reset to a fresh state so a second attempt is independent.
- Capture screenshot and video, and read the names in the map back from the UI read-only as a cross-check.
- **Selectors:** rely on semantic hooks (an element's role and accessible name, ARIA links between elements, component markers that do not change, and `data-` attributes whose names say what they are for). Avoid generated CSS class names, hashed names, child indexes, and position in the DOM. Those differ from one build to the next, so the baseline run and the patched run could end up pointing at different elements.

### 4. Inspect state, read-only

Look without touching: the accessibility tree, the DOM or native view tree, the state of the app's processes, logs written locally, whether network requests succeeded, and any debug state the app exposes. A query that changes state belongs under Drive the UI and must correspond to a real user action.

### 5. Screenshot

Save to a requested path. Return the path, capture time, the app marker or window title, and what should be visible. Include enough app chrome to prove which app and environment this is.

### 6. Record

Start and stop around the full reproduction path. Return the path, start and stop times, the window or region captured, and whether audio and sensitive overlays (password managers, notifications, other windows) were excluded. The recording must run through to the discriminating final state; a recording that ends on setup or a loading screen does not count.

### 7. Clean up

Stop processes and sessions the adapter created. Remove disposable profiles, temporary workspaces, test accounts and fixtures it created, debug ports, tunnels, and captures past retention. Return what was stopped, removed, kept, or left for a person. Never delete user work.

## General behavior

- Report capabilities before reproduction begins, and say which feature-map sections are drivable and which are blocked.
- Give the baseline build and the patched build exactly the same environment inputs.
- When the app fails to start, report a failure. An empty window does not count as a running app.
- Put a limit on how many times any step is retried.
- Logs, screenshots, recordings, and anything returned to the run must contain no secrets. Take test credentials from the environment the runner sets up, and never print them.
- Write captures to a location outside the repository.
- Be able to return the app to a clean state before each new attempt.
- Make no change outside the test environment unless a safe test action was explicitly configured.
- Limit network egress from the sandbox to the test environment and the package registries the build needs.

## Environment translation

Sometimes a report names an environment you do not have: a particular browser, a specific keyboard shortcut, a remote host. Before you call the run blocked, describe the defect again in terms that name no particular platform, then decide whether this sandbox can safely exercise that same behavior. "Fails in Firefox" might really mean "fails in any browser that does not support this API". "Cmd+K does nothing" might mean "the configured command-palette shortcut does nothing". "Slow on the Frankfurt server" might mean "slow when the backend has 300 ms latency", which the sandbox can simulate.

Use a translated attempt only if it tests the same behavior. Label it as translated evidence in every report. If the environment you lack is itself part of what goes wrong, the attempt is not an exact reproduction and must never be described as one. Translated reproductions do not pass the fix gate.

Genuine blocks include hardware prompts, OS permission dialogs, device-only APIs, account states the test environment cannot create, and anything that would require production access.

## Setup check

Setup runs these nine steps against the configured sandbox before reproduce is enabled. Nothing is posted to the intake during the check. All nine must pass.

1. Start the app.
2. Check one stable app marker and the name of the environment it reports.
3. Pick a section of the feature map and load it.
4. Reach that feature the way a user would, following the path in the section.
5. Using only actions the section lists, move the feature into one state you can throw away afterwards.
6. Look at the resulting state without changing it.
7. Take a screenshot.
8. Make a short recording.
9. Clean up, and confirm nothing the adapter created is still running.

## What you need

A UI control skill for your target platform: browser automation for web apps, a desktop automation layer for native apps, or a terminal or PTY driver for CLI and TUI apps. The skill and its runtime must be installable inside the runner's container.
