# Feature map (example)

The feature map tells the reproduce run how a user reaches each feature, how the control adapter drives and resets it, which selectors are stable, which states exist, what preconditions apply, what evidence proves a result, and where the known traps are. It describes the app from the user's side. Leave out code paths and component file names: the run discovers those at runtime, and a frozen copy goes stale with the first refactor.

Make your own copy somewhere outside the pack, such as `.issue-loop/feature-map.md`, and point the config's `control.feature_map_path` key at it. Refreshing the pack leaves that copy alone.

## Section template

Each feature gets one section with these parts:

- **Purpose**: one line on what the user gets from it.
- **User path**: the clicks through screens, menus, tabs, panels, and controls; the keyboard shortcut, or "none".
- **Adapter actions**: the control-skill actions with their inputs and the visible result; how to reset to a fresh state.
- **Selectors**: role plus accessible name, ARIA relationships, component markers, or purpose-named data attributes. Never generated class names, hashes, child indexes, or DOM position.
- **States**: interaction (default, hover, focus-visible, active, disabled), data (loading, empty, error), selection (selected, open, expanded), plus feature-specific ones. Mark states that do not apply as n/a.
- **Preconditions**: test account and role, fixture data, feature flags, required services.
- **Evidence**: what the screenshot must show (app identity, the feature, the discriminating state), what the video must cover (entry path, interaction, final state), and a value to cross-check read-only.
- **Traps**: surfaces that look right but are wrong, dead ends, and safe environment translations.

## Worked example: "Fieldbook", a field-research notes app

Fieldbook is a fictional web app where researchers record site visits, attach photos, and export reports. The sandbox runs it at `https://fieldbook.test.internal` with seeded data.

### Site visits list

- **Purpose:** browse and filter recorded site visits.
- **User path:** sign in, then the "Visits" tab in the left navigation. No shortcut.
- **Adapter actions:** `open_tab(name="Visits")` shows the list with a heading "Site visits". `set_filter(field="Region", value="North")` narrows the list. Reset: `clear_filters()` and reload the tab.
- **Selectors:** `role=tab name="Visits"`; `role=table name="Site visits"`; filter control `role=combobox name="Region"`; rows carry `data-visit-id`.
- **States:** default, loading (skeleton rows), empty ("No visits match these filters"), error (banner "Could not load visits"), selected row, hover on row, focus-visible on row. Disabled: n/a.
- **Preconditions:** test account `researcher-a` with the Researcher role; fixture set `visits-basic` (12 visits across 3 regions).
- **Evidence:** screenshot shows the Fieldbook header with the "TEST" environment badge, the Visits tab active, and the filtered rows. Video covers opening the tab, applying the filter, and the final list. Cross-check: the row count read from the table equals the count in the "Showing N visits" caption.
- **Traps:** the dashboard's "Recent visits" card looks like this list but uses a separate query; reports about the list are not reproduced on the card. A report saying "on mobile" translates to a 390-pixel-wide viewport in the sandbox browser.

### Visit editor

- **Purpose:** create or edit a visit with notes, coordinates, and photos.
- **User path:** Visits tab, then "New visit" button, or a row's "Edit" action. Shortcut: `N` on the Visits tab opens a new visit.
- **Adapter actions:** `open_new_visit()` shows an empty form titled "New site visit". `fill_field(label, value)`, `attach_photo(fixture_name)`, `press_save()`. Reset: `discard_draft()` then confirm, and reload.
- **Selectors:** `role=dialog name="New site visit"`; fields by label ("Site name", "Latitude", "Longitude", "Notes"); `role=button name="Save visit"`; upload zone `data-dropzone="photos"`.
- **States:** default, focus-visible per field, dirty (unsaved-changes dot on the title), validating (inline spinner beside Latitude), validation error ("Latitude must be between -90 and 90"), saving (button disabled with "Saving..."), saved (toast "Visit saved"), upload in progress, upload failed.
- **Preconditions:** Researcher role; photo fixtures `jpeg-small`, `heic-large` in the sandbox fixture store; feature flag `photo-upload-v2` set as the report requires.
- **Evidence:** screenshot shows the dialog title, the field values, and the error or saved state. Video covers opening the editor, each input, pressing save, and the final state. Cross-check: after save, the visit's `updatedAt` from the read-only API inspector matches the toast time within a minute.
- **Traps:** the browser's own "leave page?" prompt is expected when closing a dirty form and is not a bug. Reports that a specific phone camera's photos fail translate to the `heic-large` fixture.

### Report export

- **Purpose:** export selected visits as a PDF report.
- **User path:** Visits tab, select rows, "Export" menu, "PDF report". No shortcut.
- **Adapter actions:** `select_rows(ids)`, `open_menu("Export")`, `choose("PDF report")`; the result is a download named `fieldbook-report-<date>.pdf`. Reset: delete the downloaded file and clear the selection.
- **Selectors:** `role=button name="Export"`; `role=menuitem name="PDF report"`; progress `role=progressbar name="Preparing report"`.
- **States:** default, disabled (no rows selected), open menu, loading (progress bar), error ("Export failed, try again"), success (download appears).
- **Preconditions:** Researcher role; fixture `visits-basic`; the sandbox PDF service running.
- **Evidence:** screenshot of the progress or error state with the selection visible. Video covers selection through download or error. Cross-check: the downloaded PDF's page count equals the number of selected visits plus one cover page.
- **Traps:** the "Print" item in the same menu uses the browser print dialog, which the adapter cannot drive; reports about printing are blocked, not translated.

### Account settings

- **Purpose:** change display name, units, and notification preferences.
- **User path:** avatar menu in the top right, then "Settings". No shortcut.
- **Adapter actions:** `open_avatar_menu()`, `choose("Settings")`, `set_toggle(label, on|off)`, `set_select("Units", "Metric"|"Imperial")`, `press("Save settings")`. Reset: restore the account from fixture `researcher-a-defaults`.
- **Selectors:** `role=button name="Account menu"`; `role=switch` by label; `role=combobox name="Units"`.
- **States:** default, focus-visible, toggled on and off, saving, saved, error.
- **Preconditions:** Researcher role. Never use the shared admin account, because changes would affect other sandbox users.
- **Evidence:** screenshot shows the settings page with the changed value. Cross-check: the units shown on a visit's coordinates after save.
- **Traps:** the organization settings page under "Admin" has similar toggles and is a different feature.

## Completeness checklist

- Every user-facing feature a report might name has a section.
- Every section says how a user gets to the feature, which adapter actions operate it, and how to put it back to a clean state.
- Selectors use only stable semantic hooks.
- Relevant states are listed, with non-applicable ones marked n/a.
- Each section names the test accounts, fixture data, permission levels, feature flags, and backing services it depends on, and every one of them exists only in the test environment.
- Each section states what the screenshot must show, what the video must cover, and which value gets checked read-only.
- Look-alike screens, paths that go nowhere, and the environment translations that are safe to use are written down.
- No code paths or implementation details are frozen in the map.
