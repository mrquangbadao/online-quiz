# Checklist trien khai anti-spam theo codebase hien tai

Ngay cap nhat: 2026-05-20

## 1. Hien trang codebase

### Backend
- Public register hien tai:
  - `POST /api/contestant/register`
  - File: `backend/src/main/java/com/quiz/controller/ContestantController.java`
- Logic register hien tai:
  - `backend/src/main/java/com/quiz/service/impl/ContestantServiceImpl.java`
  - Dang chan trung theo `phone + phaseId`
- DTO register hien tai:
  - `backend/src/main/java/com/quiz/dto/request/ContestantRegisterRequest.java`
  - Co field `email` nhung frontend dang gui rong
- Persistence hien tai:
  - `backend/src/main/java/com/quiz/entity/Contestant.java`
  - `backend/src/main/java/com/quiz/repository/ContestantRepository.java`
  - Chua co `normalizedEmail`, chua co OTP table, chua co abuse log table, chua co banlist table
- Security/rate limit hien tai:
  - Login da co limiter rieng o `AuthController` va `LoginRateLimiter`
  - Nguong hien tai dang la `10 lan / 15 phut`, chua khop plan `5 lan / 10 phut`

### Frontend
- Flow public hien tai:
  - `Landing.tsx` -> vao `/quiz`
  - Form register nam trong `frontend/src/app/pages/Quiz.tsx`
- Form hien tai chi co:
  - `fullName`
  - `unit`
  - `phone`
- Frontend register hien tai:
  - `frontend/src/api/examApi.ts`
  - `examApi.register(...)` goi `/contestant/register`
- Chua co:
  - field email bat buoc
  - CAPTCHA UI
  - OTP request/verify UI
  - step gate giua "dang ky" va "vao thi"

## 2. Mismatch giua plan moi va code hien tai
- He thong hien tai dang xem `phone` la khoa chong duplicate chinh, trong khi rule da chot can chan theo ca `email + phase` va `phone + phase`.
- Frontend chua thu thap email, nen OTP flow chua the bat dau.
- Backend chua co identity model cho email verification theo `examId`/`phaseId`.
- Chua co abstraction chung cho rate limit tren cac endpoint ngoai login.
- Chua co bang log abuse, banlist, va OTP persistence.
- Chua co gate o `start exam` de dam bao contestant da verify email.
- `POST /api/exams/start` hien dang public va chi nhan `contestantId`, nen neu khong doi flow nay thi OTP verification van co the bi bypass bang request truc tiep.
- `ExamServiceImpl.startExam(...)` hien chi check contestant ton tai, active phase, va exam da submit hay chua; no khong rang buoc request hien tai voi mot session verify hop le.

## 2.1 Findings can sua ngay trong checklist
- `phaseId` moi la khoa nghiep vu dung hon `examId` cho anti-spam registration trong codebase nay.
- Khong nen coi `register contestant -> start exam` la 2 buoc doc lap ve bao mat. Hai buoc nay hien tao thanh mot chain public.
- Neu van giu `POST /api/exams/start` public, can them co che rang buoc nhu:
  - registration token ngan han da ky
  - hoac verification session id duoc backend cap sau OTP
  - hoac start exam trong cung transaction/flow sau khi register hop le
- Checklist cu chua neu ro cach dong duong bypass qua `contestantId`.

## 3. Dinh huong trien khai de xuat
- Rule nghiep vu da chot:
  - moi `email` chi duoc thi 1 lan trong moi `phase`
  - moi `so dien thoai` chi duoc thi 1 lan trong moi `phase`
- Them lop moi cho email verification va anti-spam, khong nen sua plan theo code cu.
- Chuyen flow public tu:
  - `nhap thong tin -> register contestant -> start exam`
- Thanh:
  - `nhap thong tin + email -> request OTP -> verify OTP -> register contestant -> start exam`
- Tuy nhien, de an toan hon voi codebase nay, can doi them trust boundary:
  - `verify OTP -> backend cap registration token/session ngan han`
  - `register contestant` chi chap nhan request kem token/session hop le
  - `start exam` chi chap nhan contestant vua duoc tao tu registration hop le, hoac nhan token/session thay vi tin raw `contestantId`

## 4. Quyet dinh nghiep vu da chot
- Duplicate rule:
  - chan theo `normalizedEmail + phaseId`
  - chan theo `phone + phaseId`
- Mapping `phase` va `exam`:
  - hien tai code dang register theo `active phase`
  - plan can chot unique theo `phaseId` hay theo `examId`
- Cho phep tao contestant truoc hay sau khi verify OTP:
  - Khuyen nghi: chi tao contestant sau khi verify OTP thanh cong
- OTP verify xong co hieu luc bao lau de hoan tat register:
  - khuyen nghi 10-15 phut session verification
- CAPTCHA bat ngay cho moi request OTP hay bat adaptive:
  - khuyen nghi bat tren request OTP ngay tu phase dau

## 5. Thiet ke ky thuat de xuat cho repo nay

### 5.1 Rate limit component chung
- Tao abstraction moi de dung lai cho:
  - login
  - request OTP
  - verify OTP
  - contestant register
- Khuyen nghi:
  - khong tiep tuc de `LoginRateLimiter` chi phuc vu 1 endpoint
  - tao component tong quat kieu `RequestRateLimiter` hoac `AbuseProtectionService`
- Key can ho tro:
  - theo IP
  - theo email
  - theo endpoint
  - theo phaseId

### 5.2 OTP model
- Tao bang moi, khong nhoi vao `contestants`
- Bang de xuat:
  - `email_otp`
  - `email_verification_sessions` nen co de tach ro session verify thanh cong
- Toi thieu can co:
  - email
  - normalizedEmail
  - phaseId
  - otpHash
  - expiresAt
  - attempts
  - usedAt
  - createdAt
  - lastSentAt

Khuyen nghi them cho `email_verification_sessions`:
- `id`
- `normalizedEmail`
- `phaseId`
- `verifiedAt`
- `expiresAt`
- `consumedAt`
- `issuedTokenHash` neu dung token ky/gui ve frontend

### 5.3 Register gate
- `ContestantServiceImpl.register(...)` phai doi tu:
  - check active phase
  - check phone duplicate
  - save contestant
- Thanh:
  - check active phase
  - check email da verify cho phase nay chua
  - check duplicate theo email/phase
  - check duplicate theo phone/phase
  - save contestant
  - invalidate verification session neu can
- `ExamServiceImpl.startExam(...)` cung phai doi:
  - khong tin moi `contestantId` public nhu hien tai
  - rang buoc contestant duoc tao tu verification session hop le
  - neu giu endpoint start rieng, them registration token/session check truoc khi tao exam

### 5.4 Frontend flow
- `Quiz.tsx` can tach thanh it nhat 2 step:
  - Step 1: thong tin contestant + email + CAPTCHA
  - Step 2: nhap OTP va verify
  - Step 3: sau verify moi goi register va start exam
- Khong nen de user vao exam ngay sau submit form nhu hien tai

## 6. Checklist implementation theo phase

### Phase A - Chot architecture va rule
- [x] Chot duplicate rule: email + phone
- [ ] Chot `phaseId` la key nghiep vu thay cho `examId` trong flow register
- [ ] Chot OTP TTL va resend cooldown
- [ ] Chot CAPTCHA provider: Turnstile
- [ ] Chot danh sach endpoint can bao ve

### Phase B - Backend foundation
- [ ] Tao service resolve client IP dung sau proxy
- [ ] Tao rate limiter dung chung, su dung Redis la chinh
- [ ] Doi login limit tu `10/15` ve `5/10` neu dung theo plan moi
- [ ] Tao model va migration cho `abuse_logs`
- [ ] Tao helper logging cho action allow/reject
- [ ] Chot cach xu ly `X-Forwarded-For` de tranh tin nham header tu client khi chua qua trusted proxy

File kha nang se sua:
- `backend/src/main/java/com/quiz/controller/AuthController.java`
- `backend/src/main/java/com/quiz/security/LoginRateLimiter.java`
- `backend/src/main/resources/db/migration/*`

### Phase C - CAPTCHA
- [ ] Tao DTO field nhan CAPTCHA token cho request OTP
- [ ] Tich hop backend verify Turnstile token
- [ ] Tao config env cho secret key
- [ ] Log success/failure cua verify CAPTCHA

File kha nang se them/sua:
- `backend/src/main/resources/application*.yml`
- service moi cho CAPTCHA verification
- DTO request OTP

### Phase D - OTP backend
- [ ] Tao migration cho bang `email_otp`
- [ ] Tao migration cho `email_verification_sessions`
- [ ] Tao entity/repository/service cho OTP
- [ ] Tao endpoint `POST /api/auth/request-otp`
- [ ] Tao endpoint `POST /api/auth/verify-otp`
- [ ] Hash OTP truoc khi luu
- [ ] TTL 5 phut
- [ ] Max 5 lan thu
- [ ] Resend cooldown 60 giay
- [ ] Rate limit theo IP va email
- [ ] Sau verify thanh cong, cap verification session/token ngan han cho buoc register/start exam

File kha nang se them/sua:
- controller auth moi hoac mo rong `AuthController`
- DTO request/response moi
- service OTP moi
- migration Flyway moi

### Phase E - Contestant register rewrite
- [ ] Cap nhat `ContestantRegisterRequest` de email la bat buoc
- [ ] Chuan hoa email o backend
- [ ] Them `normalizedEmail` vao persistence neu can
- [ ] Check verification session truoc khi register
- [ ] Check unique `(normalizedEmail, phaseId)`
- [ ] Giu va enforce unique `(phone, phaseId)` theo rule da chot
- [ ] Dam bao transaction an toan khi race condition xay ra
- [ ] Khong de `contestantId` tro thanh bypass path sau khi register

File chac chan bi anh huong:
- `backend/src/main/java/com/quiz/dto/request/ContestantRegisterRequest.java`
- `backend/src/main/java/com/quiz/entity/Contestant.java`
- `backend/src/main/java/com/quiz/repository/ContestantRepository.java`
- `backend/src/main/java/com/quiz/service/impl/ContestantServiceImpl.java`
- migration Flyway cho unique/index moi

### Phase F - Frontend OTP flow
- [ ] Them field email vao form `Quiz.tsx`
- [ ] Them UI CAPTCHA
- [ ] Them UI request OTP
- [ ] Them UI verify OTP
- [ ] Chi goi `examApi.register` sau khi verify thanh cong
- [ ] Truyen verification token/session backend cap cho request register neu chon huong nay
- [ ] Xu ly loading, resend cooldown, error states
- [ ] Cap nhat `ContestantRegisterRequest` type neu can
- [ ] Them API client cho:
  - `requestOtp`
  - `verifyOtp`

File chac chan bi anh huong:
- `frontend/src/app/pages/Quiz.tsx`
- `frontend/src/api/examApi.ts` hoac tach `authApi.ts`
- `frontend/src/types/index.ts`

### Phase G - Hardening
- [ ] Tao bang `banlist`
- [ ] Banlist theo IP/email/domain neu can
- [ ] Auto-flag abuse pattern co expiry
- [ ] Them admin endpoint view/unblock

## 7. Thu tu implement an toan nhat
1. Backend rate limit + logging foundation
2. CAPTCHA backend verification
3. OTP backend
4. Verification session/token + register gate + start exam gate
5. Frontend OTP/CAPTCHA flow
6. Constraint DB email/phase + banlist va heuristics

Ly do:
- Neu frontend doi truoc khi backend co gate that su thi user van co the bypass bang request truc tiep.
- Constraint DB va verification gate phai ton tai truoc khi coi flow da an toan.
- Rieng voi repo nay, `start exam` la public endpoint nen phai duoc dua vao anti-spam scope ngay tu dau, khong de lai sau.

## 8. Definition of done cho tung nhom

### Backend foundation done
- Co rate limit dung nguong tren endpoint da chot
- Co abuse log co cau truc toi thieu
- Co cach resolve client IP sau proxy

### OTP done
- OTP khong luu plain text
- OTP chi dung 1 lan
- OTP het han dung TTL
- OTP khong verify duoc neu sai qua so lan

### Register done
- User khong the register neu chua verify email
- Duplicate email cung phase bi chan o service va DB
- Duplicate phone cung phase bi chan o service va DB
- Race condition khong tao duplicate record
- Khong the dung `contestantId` hop le cu de bat dau bai thi neu khong co trust signal hop le cua flow moi

### Frontend done
- User co the request OTP, nhap OTP, verify, va tiep tuc vao thi
- UI xu ly loi ro rang
- Khong co duong di UI nao bypass verify

## 9. Risk can canh bao khi bat dau code
- Can chot message loi va thu tu uu tien neu request trung ca email va phone, hoac chi trung 1 trong 2.
- Neu tiep tuc tao contestant truoc verify, du lieu rac va cleanup se phuc tap.
- Neu chi dua vao in-memory limiter khi production gap Redis issue, anti-spam se yeu.
- `Quiz.tsx` dang la file lon, kha nang can tach component nho khi them OTP step.
- `SecurityConfig` hien permit public cho `/api/contestant/register` va `/api/exams/start`; anti-spam scope phai tinh ca 2 duong nay.
- `CorsConfiguration` hien mo rong qua muc voi `setAllowedOriginPatterns(List.of("*"))` ket hop `allowCredentials(true)`; day khong phai anti-spam truc tiep nhung la mot diem can xem lai khi hardening.

## 10. Prompt de xuat de giao viec cho Codex

### Prompt 1 - Checklist review
```md
Read `AGENTS.md` first, then follow `.codex/workflows/plan-from-doc.md`.

Objective:
- Review `docs/anti-spam-plan.md` against the current codebase and validate the implementation checklist.

Scope:
- Full stack analysis only, no code changes.

Context:
- Use `docs/anti-spam-plan.md` and `docs/anti-spam-implementation-checklist.md`.

Constraints:
- Map requirements to current backend and frontend files.
- Flag mismatches and missing constraints.

Done Criteria:
- Return any corrections needed in the checklist before implementation starts.
```

### Prompt 2 - Phase 1 backend
```md
Read `AGENTS.md` first, then follow `.codex/rules/backend.md` and `.codex/rules/security.md`.

Objective:
- Implement backend foundation for anti-spam Phase 1.

Scope:
- Backend only.

Context:
- Follow `docs/anti-spam-plan.md` and `docs/anti-spam-implementation-checklist.md`.

Constraints:
- Reuse existing Spring patterns.
- Use Flyway for new tables.
- Do not implement OTP or frontend yet.

Done Criteria:
- Sensitive endpoints are rate-limited with the agreed thresholds.
- Abuse logging foundation exists.
- Backend verification is run if possible.
```
