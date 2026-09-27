# Execution plan cho task lon 1: Anti-spam

Ngay cap nhat: 2026-05-20

## 1. Muc tieu cua task lon
- Chan dang ky thi lap lai theo `email + phase` va `phone + phase`.
- Bat buoc xac thuc email OTP truoc khi contestant duoc vao thi.
- Giam spam va abuse tren cac endpoint public.
- Loai bo duong bypass hien tai qua `contestantId` va `/api/exams/start`.

## 2. Ket qua cuoi cung can dat
- User public phai di qua flow:
  - nhap thong tin + email
  - request OTP
  - verify OTP
  - register contestant hop le
  - start exam hop le
- Moi `email` chi duoc tham gia 1 lan / `phase`.
- Moi `phone` chi duoc tham gia 1 lan / `phase`.
- Cac endpoint public nhay cam co rate limit va abuse logging.
- He thong co DB constraints de chan duplicate va co backend gate de chan bypass.

## 3. Nguyen tac trien khai
- Lam theo phase nho, khong full rewrite mot luc.
- Uu tien backend guardrail truoc frontend UX.
- Dat hard invariant o DB neu rule la bat buoc.
- Khong coi frontend la lop bao mat.
- Moi phase phai pass post-code quality checklist truoc khi move sang phase tiep theo.

## 4. Scope chinh

### Backend
- `AuthController`
- `ContestantController`
- `ExamController`
- `ContestantServiceImpl`
- `ExamServiceImpl`
- rate limiter / abuse protection service
- Flyway migrations
- OTP persistence
- verification session/token persistence

### Frontend
- `frontend/src/app/pages/Quiz.tsx`
- `frontend/src/api/examApi.ts`
- `frontend/src/api/authApi.ts` neu can tach API OTP
- `frontend/src/types/index.ts`

### Docs
- `docs/anti-spam-plan.md`
- `docs/anti-spam-implementation-checklist.md`
- file nay la execution plan

## 5. Cac quyet dinh da chot
- Duplicate rule:
  - unique theo `normalizedEmail + phaseId`
  - unique theo `phone + phaseId`
- Email OTP la mandatory truoc khi thi.
- `phaseId` la khoa nghiep vu dung cho registration anti-spam.
- Can co backend gate cho `register` va `start exam`.
- Comment code bang English cho logic non-trivial.

## 6. Cac quyet dinh can chot truoc khi code phase implementation
- OTP TTL:
  - de xuat: 5 phut
- OTP resend cooldown:
  - de xuat: 60 giay
- OTP max attempts:
  - de xuat: 5 lan
- Request OTP email limit:
  - de xuat: 3 lan / 10 phut / email / phase
- CAPTCHA rollout:
  - de xuat: bat sau khi co backend foundation
- Verification session TTL sau khi OTP verify thanh cong:
  - de xuat: 10 phut

## 7. Phan ra thanh milestones

### Milestone 0 - Architecture lock
Muc tieu:
- Chot design backend flow va trust boundary truoc khi sua code.

Deliverables:
- Chot flow:
  - request OTP
  - verify OTP
  - backend cap verification session/token
  - register contestant consume verification session/token
  - start exam chi cho contestant hop le trong flow moi
- Chot naming migration/entity/service
- Chot error messages chinh

Definition of done:
- Khong con ambiguity ve:
  - duplicate rule
  - phase key
  - start exam gate
  - OTP lifecycle

### Milestone 1 - Backend abuse foundation
Muc tieu:
- Tao nen tang anti-spam truoc khi OTP/CAPTCHA di vao flow.

Cong viec:
- Tao service resolve client IP dung cach sau proxy
- Generalize rate limiting thay vi chi co `LoginRateLimiter`
- Doi login threshold ve rule moi neu dung choan
- Add abuse log model + migration
- Add helper/service de ghi abuse event
- Xac dinh endpoint public can protect:
  - `/api/auth/login`
  - `/api/auth/request-otp`
  - `/api/auth/verify-otp`
  - `/api/contestant/register`
  - `/api/exams/start`

Definition of done:
- Co reusable rate-limit component
- Co logging structure cho allow/reject
- Co baseline verification backend

Rui ro:
- Neu Redis unavailable ma production fallback sang in-memory thi protection yeu

### Milestone 2 - OTP backend core
Muc tieu:
- Co flow OTP backend hoan chinh, chua can frontend.

Cong viec:
- Tao migration `email_otp`
- Tao migration `email_verification_sessions`
- Tao entity/repository/service OTP
- Tao endpoint:
  - `POST /api/auth/request-otp`
  - `POST /api/auth/verify-otp`
- OTP hash, expiry, attempts, resend cooldown
- Issue verification session/token sau verify thanh cong
- Rate limit request/verify OTP

Definition of done:
- Co test hoac verification cho:
  - OTP expired
  - OTP wrong
  - OTP too many attempts
  - OTP reused
  - resend cooldown

Rui ro:
- Neu token/session model thiet ke yeu, register va start exam van bi bypass

### Milestone 3 - Register gate rewrite
Muc tieu:
- Register contestant chi thanh cong neu verification session hop le.

Cong viec:
- Update `ContestantRegisterRequest` de email bat buoc
- Normalize email server-side
- Add DB support cho `normalizedEmail`
- Add unique constraint:
  - `(normalizedEmail, phaseId)`
  - `(phone, phaseId)`
- Update `ContestantServiceImpl.register(...)`
- Handle duplicate errors ro rang
- Invalidate verification session sau khi consume

Definition of done:
- Khong register duoc neu chua verify
- Khong register duoc neu trung email
- Khong register duoc neu trung phone
- DB va service deu enforce rule

Rui ro:
- Migration du lieu cu co the can backfill `normalizedEmail`

### Milestone 4 - Start exam gate rewrite
Muc tieu:
- Dong duong bypass qua `/api/exams/start`.

Cong viec:
- Xac dinh trust signal cho start exam:
  - contestant moi duoc tao trong flow verify hop le
  - hoac start exam consume registration token/session
- Update `ExamStartRequest` neu can
- Update `ExamServiceImpl.startExam(...)`
- Dam bao khong chi dua vao `contestantId` public

Definition of done:
- Khong the goi truc tiep `/api/exams/start` voi `contestantId` cu de vao thi
- Start exam chi hop le sau registration flow moi

Rui ro:
- Neu UX va backend contract khong dong bo, frontend co the bi break

### Milestone 5 - Frontend integration
Muc tieu:
- Noi UI vao backend flow moi.

Cong viec:
- Them field email vao `Quiz.tsx`
- Them step request OTP
- Them step verify OTP
- Them resend cooldown UI
- Them error/loading states
- Chi register/start exam sau khi verify thanh cong
- Update API client/types

Definition of done:
- User flow public hoat dong end-to-end
- Build frontend pass
- Smoke test duoc mo ta ro

Rui ro:
- `Quiz.tsx` dang to, co the can tach component de de review hon

### Milestone 6 - CAPTCHA
Muc tieu:
- Add human verification layer cho flow public.

Cong viec:
- Integrate Turnstile o backend va frontend
- Verify token o backend
- Bat tren request OTP va/hoac register
- Log verify result

Definition of done:
- Invalid token bi reject
- Frontend va backend dong bo contract

### Milestone 7 - Hardening va ops
Muc tieu:
- Dua feature tu “co chay” sang “co the van hanh”.

Cong viec:
- Banlist model + admin endpoints neu can
- Metrics va audit signals
- Review CORS va trusted proxy config
- Review message loi va observability
- Add missing tests

Definition of done:
- Team co du cach debug, theo doi, va unblock false positive

## 8. Thu tu implementation de xuat
1. Milestone 0
2. Milestone 1
3. Milestone 2
4. Milestone 3
5. Milestone 4
6. Milestone 5
7. Milestone 6
8. Milestone 7

Ly do:
- Backend gate phai ton tai truoc frontend.
- Start exam gate phai duoc xu ly truoc khi coi OTP da an toan.
- CAPTCHA nen di sau backend foundation de contract on dinh hon.

## 9. Definition of done cho task lon
- Rule duplicate email/phone theo phase da enforce o DB va backend
- OTP flow hoat dong end-to-end
- Start exam khong con bypass path don gian
- Public endpoints co rate limit va abuse logs
- Frontend flow moi hoat dong tren UX chinh
- Build/test/verification phu hop da duoc chay
- Post-code quality checklist da pass cho tung milestone

## 10. Prompt de xuat cho task tiep theo

### Neu anh muon bat dau bang implementation
```md
Read `AGENTS.md` first.
Run `.codex/checklists/pre-code-senior-checklist.md`.
Follow `.codex/workflows/implement-feature.md`.

Objective:
- Implement Milestone 1 of `docs/anti-spam-execution-plan.md`.

Scope:
- Backend only.

Context:
- Follow `docs/anti-spam-plan.md`, `docs/anti-spam-implementation-checklist.md`, and `docs/anti-spam-execution-plan.md`.

Constraints:
- Keep existing Spring patterns.
- Add English comments for non-trivial logic.
- Use Flyway for schema changes.
- Do not implement OTP UI yet.

Done Criteria:
- Reusable rate-limit foundation exists for public sensitive endpoints.
- Abuse logging foundation exists.
- Run `.codex/checklists/post-code-quality-checklist.md` before finishing.
- Run backend verification if possible.
```

### Neu anh muon bat dau bang review architecture
```md
Read `AGENTS.md` first.
Run `.codex/checklists/pre-code-senior-checklist.md`.
Follow `.codex/workflows/review-change.md`.

Review Target:
- Review `docs/anti-spam-execution-plan.md` against the current codebase.

Review Context:
- Focus on backend trust boundaries, duplicate constraints, and start-exam bypass.

Instructions:
- Findings first.
- Include missing invariants, risky assumptions, and rollout risks.
```
