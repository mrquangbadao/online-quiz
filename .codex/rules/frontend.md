# Frontend Rules

## Structure
- Reuse existing route, page, API client, and store structure before adding new folders.
- Keep API calls in `frontend/src/api` instead of embedding them in components.
- Prefer small targeted UI changes over broad redesign unless the task explicitly asks for redesign.

## State and Data
- Reuse Zustand stores and React Query patterns already present in the repo.
- Keep server communication centralized through `axiosClient` and typed API wrappers.

## UI
- Preserve the existing visual language unless the task explicitly asks for a new direction.
- Avoid introducing a second pattern for the same interaction if one already exists nearby.

## Verification
- For frontend-only changes, prefer a build check first.
- Call out any behavior that should still be smoke-tested manually in the browser.
