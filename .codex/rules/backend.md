# Backend Rules

## Architecture
- Preserve the existing controller -> service -> repository layering.
- Keep controllers thin. Parse request, delegate work, return `ApiResponse`.
- Put business rules in services, not controllers.

## Persistence
- Every schema change must use a new Flyway migration in `backend/src/main/resources/db/migration`.
- Do not edit old migrations unless explicitly requested.
- Prefer explicit database constraints for invariants such as uniqueness.

## API and DTOs
- Reuse existing DTO patterns in `dto/request` and `dto/response`.
- Keep response shape consistent with existing endpoints.
- Validate request payloads close to the boundary using Jakarta validation where appropriate.

## Error Handling
- Reuse `BusinessException` and `GlobalExceptionHandler` patterns.
- Keep user-facing error messages clear and aligned with existing API behavior.

## Verification
- For backend-only changes, prefer Maven verification scoped to the backend module.
- If tests do not exist for the touched path, call out the gap explicitly.
