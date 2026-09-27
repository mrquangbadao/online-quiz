# Ke hoach chong spam account va xac thuc email OTP

Ngay cap nhat: 2026-05-20

## 1. Muc tieu
- Giam dang ky tai khoan va dang ky thi tu dong.
- Bat buoc xac thuc email truoc khi vao thi.
- Gioi han moi dot thi chi 1 email hop le duoc tham gia.
- Gioi han moi dot thi chi 1 so dien thoai hop le duoc tham gia.
- Phat hien, han che, va xu ly abuse theo nhieu lop thay vi chi dua vao 1 co che.

## 2. Pham vi bao ve
- Dang nhap.
- Dang ky tai khoan contestant.
- Dang ky thi.
- Gui lai OTP.
- Xac thuc OTP.
- Reset mat khau neu co.
- Cac endpoint admin lien quan den mo khoa, reset, hoac override.

## 3. Threat model
### 3.1 Tinh huong can phong ve
- Bot tao nhieu account tu dong.
- 1 nguoi dung dung lai email hoac so dien thoai de dang ky lap lai cho cung 1 dot thi.
- Spam OTP de gay ton tai nguyen hoac tan cong mailbox.
- Doan OTP bang brute force.
- Lua dao bang email tam thoi hoac domain chat luong thap.
- Vuot rate limit bang cach doi IP, doi User-Agent, hoac doi deviceId.

### 3.2 Nguyen tac
- Phong ve theo lop: rate limit + CAPTCHA + OTP + rang buoc DB + logging + review.
- Dat hard invariant o tang du lieu khi co the.
- Khong tin duy nhat vao thong tin client gui len.
- Uu tien fail closed cho flow nhay cam: verify that bai thi reject.
- He thong phai co quan sat duoc hanh vi bat thuong, khong chi reject im lang.

## 4. Yeu cau da chot
1. CAPTCHA: uu tien Cloudflare Turnstile, thay the hCaptcha.
2. Rate limit mac dinh: 5 lan / 10 phut cho cac endpoint nhay cam.
3. Bat buoc xac thuc email OTP truoc khi vao thi.
4. Moi dot thi chi 1 email hop le va 1 so dien thoai hop le duoc tham gia 1 lan.

## 5. Khuyen nghi best practices can them vao plan
### 5.1 Chuan hoa identity va dau vet
- Log va danh gia theo nhieu key:
  - IP
  - email
  - examId
  - User-Agent
  - deviceId neu co
  - requestId / traceId
- Chuan hoa email truoc khi so sanh:
  - trim
  - lowercase
  - can nhac chuan hoa Unicode
- Khong dua hoan toan vao deviceId do client tu gui.

### 5.2 OTP
- Khong luu OTP plain text, chi luu hash OTP.
- OTP ngan han: TTL 5 phut la mac dinh hop ly.
- OTP chi dung 1 lan.
- Gioi han so lan verify tren 1 OTP, vi du 5 lan.
- Gioi han so lan request OTP theo:
  - IP
  - email
  - examId
- Ap dung cooldown cho resend, vi du 60 giay.
- Khong tiet lo qua nhieu trong response, tranh cho attacker biet email ton tai hay khong neu flow cho phep.

### 5.3 CAPTCHA
- CAPTCHA khong nhat thiet bat 100 phan tram request ngay tu dau.
- Uu tien adaptive:
  - risk thap: cho qua
  - risk trung binh: bat CAPTCHA
  - risk cao: reject hoac yeu cau CAPTCHA + OTP
- Verify token o backend, khong tin frontend.
- Token CAPTCHA phai gan voi action cu the, khong dung lai cho flow khac neu dich vu ho tro.

### 5.4 Rate limit
- Tach rate limit theo endpoint va theo muc do nhay cam.
- Can nhac cac bucket rieng:
  - login theo IP
  - request OTP theo IP
  - request OTP theo email
  - verify OTP theo email hoac otpId
  - register theo IP
- Rate limit nen co TTL ro rang va thong diep loi nhat quan.
- Redis la lua chon uu tien; fallback in-memory chi dung cho local dev, khong nen la co che chinh khi production.

### 5.5 Rang buoc du lieu
- Dat unique constraint cho `(normalized_email, phase_id)` va `(phone, phase_id)`.
- Neu co flow tao contestant truoc khi verify OTP, can co trang thai ro:
  - `PENDING_VERIFICATION`
  - `VERIFIED`
  - `CANCELLED` hoac `EXPIRED`
- Khong de logic "1 email / 1 so dien thoai / 1 dot thi" chi nam o service ma khong co DB constraint.

### 5.6 Banlist va review
- Banlist nen co:
  - `type`
  - `value`
  - `reason`
  - `source` manual/automatic
  - `expiresAt`
  - `createdBy`
- Tu dong block chi nen la tam thoi luc dau, tranh false positive.
- Moi rule auto-block can co log va co cach admin review/mo khoa.

## 6. Chinh sach de xuat
### 6.1 Login
- Rate limit theo IP.
- Neu that bai nhieu lan trong cua so ngan, yeu cau CAPTCHA bo sung neu can.

### 6.2 Request OTP
- Rate limit: 5 lan / 10 phut theo IP.
- Them rate limit theo email, vi du 3 lan / 10 phut / email / exam.
- Cooldown resend: 60 giay.
- CAPTCHA bat buoc neu request dau vao co risk cao hoac vuot nguong canh bao.

### 6.3 Verify OTP
- Rate limit theo email hoac otp record.
- Toi da 5 lan thu / OTP.
- OTP het han sau 5 phut.
- OTP dung thanh cong thi danh dau `usedAt`, khong cho dung lai.

### 6.4 Register Exam
- Chi cho dang ky neu email da verify OTP cho dung `examId`.
- Dat unique constraint `(normalized_email, phase_id)` va `(phone, phase_id)`.
- Neu dang ky lan 2 cung dot thi bang cung email hoac cung so dien thoai -> reject ro rang, khong tao duplicate record.

## 7. Architecture de xuat
### 7.1 Kien truc bao ve theo lop
1. Edge validation: validate payload, examId, email format.
2. Rate limit va abuse checks.
3. CAPTCHA verification khi rule yeu cau.
4. OTP request / verify flow.
5. Database constraint va transaction boundary.
6. Logging, metrics, audit.

### 7.2 Redis va persistence
- Redis:
  - rate limit counters
  - cooldown resend OTP
  - temporary abuse counters
- PostgreSQL:
  - OTP records
  - exam registrations
  - abuse logs
  - banlist

## 8. Data model de xuat
### 8.1 email_otp
- `id`
- `email`
- `normalizedEmail`
- `examId`
- `otpHash`
- `expiresAt`
- `attempts`
- `maxAttempts`
- `usedAt`
- `lastSentAt`
- `createdAt`

Index/goi y:
- index `(normalizedEmail, examId, createdAt desc)`
- index `expiresAt`

### 8.2 exam_registrations
- `id`
- `email`
- `normalizedEmail`
- `phone`
- `examId`
- `status`
- `verifiedAt`
- `createdAt`

Constraint/goi y:
- unique `(normalizedEmail, examId)`
- unique `(phone, examId)`

### 8.3 abuse_logs
- `id`
- `requestId`
- `ip`
- `ua`
- `deviceId`
- `email`
- `examId`
- `endpoint`
- `action`
- `result`
- `reason`
- `createdAt`

### 8.4 banlist
- `id`
- `type` (`ip`, `deviceId`, `email`, `domain`)
- `value`
- `reason`
- `source`
- `expiresAt`
- `createdBy`
- `createdAt`

## 9. API de xuat
- `POST /auth/request-otp`
- `POST /auth/verify-otp`
- `POST /exam/register`
- `POST /auth/login`
- `POST /admin/banlist`
- `GET /admin/banlist`
- `DELETE /admin/banlist/{id}` hoac endpoint unban tuong duong

## 10. Logging va observability
### 10.1 Can log gi
- request duoc allow hay reject
- ly do reject
- counter rate limit
- verify CAPTCHA success/fail
- request OTP / resend OTP
- verify OTP success/fail/expired/too-many-attempts
- duplicate email hoac phone theo exam

### 10.2 Metrics can co
- so request OTP / gio
- ti le verify OTP thanh cong
- ti le CAPTCHA fail
- so request bi rate limit
- so case duplicate email/exam
- so case duplicate phone/exam
- so case auto-block va manual unblock

### 10.3 Canh bao
- Dot bien request OTP theo 1 IP hoac 1 email domain
- Tang dot bien reject vi rate limit
- CAPTCHA fail rate tang bat thuong

## 11. Phased implementation
### Phase 0 - Khao sat va baseline
- Xac dinh cac endpoint can bao ve trong codebase hien tai.
- Do baseline:
  - so luong dang ky/IP/ngay
  - so luong login fail/IP
  - tan suat request OTP
- Chot field log va cach resolve client IP sau proxy.

### Phase 1 - Rate limit va logging
- Ap dung rate limit cho:
  - login
  - request OTP
  - verify OTP
  - register exam
- Dung Redis lam co che chinh.
- Ghi abuse logs co `ip`, `ua`, `deviceId`, `email`, `examId`, `endpoint`, `action`, `result`.
- Tieu chi xong:
  - dung nguong 5/10 phut cho endpoint da chot
  - co metrics/log de review

### Phase 2 - CAPTCHA
- Tich hop Turnstile.
- Bat CAPTCHA cho flow request OTP va register exam.
- Co the bat adaptive theo risk score/heuristics o giai doan sau.
- Tieu chi xong:
  - backend verify token
  - token invalid thi reject
  - log duoc ket qua verify

### Phase 3 - OTP
- Tao bang `email_otp`.
- Flow:
  - request OTP
  - gui email
  - verify OTP
  - danh dau email da verify cho `examId`
- Tieu chi xong:
  - OTP hash, TTL 5 phut, max 5 lan thu
  - resend co cooldown
  - khong cho reuse OTP

### Phase 4 - 1 email + 1 so dien thoai / 1 dot thi
- Tao unique constraint `(normalized_email, phase_id)` va `(phone, phase_id)`.
- Chi cho register khi da verify OTP.
- Admin co endpoint reset/unblock neu nghiep vu can.
- Tieu chi xong:
  - register lan 2 cung dot thi bi reject neu trung email hoac trung so dien thoai o ca service va DB

### Phase 5 - Heuristics va banlist
- Rule ban tam thoi theo IP/deviceId/domain/email.
- Rule canh bao theo pattern bat thuong.
- Admin review va mo khoa duoc.
- Tieu chi xong:
  - auto-block co expiry
  - co audit trail ro rang

## 12. Testing checklist
### 12.1 Functional
- Rate limit dung nguong 5/10 phut.
- CAPTCHA token invalid -> reject.
- OTP het han -> reject.
- OTP qua so lan -> reject.
- OTP da dung -> reject.
- Register khi chua verify -> reject.
- Register lan 2 cung exam -> reject neu trung email hoac trung so dien thoai.

### 12.2 Security va abuse
- Khong bypass duoc OTP bang cach goi truc tiep register endpoint.
- Khong bypass duoc CAPTCHA neu backend dang bat buoc.
- Khong reuse OTP cho exam khac.
- Khong flood resend OTP vuot cooldown.
- Khong tao duplicate record khi race condition xay ra.
- Khong the dang ky 2 lan trong cung dot thi bang email khac nhung cung phone.
- Khong the dang ky 2 lan trong cung dot thi bang phone khac nhung cung email.

### 12.3 Operational
- Redis unavailable thi he thong xu ly the nao can duoc dinh nghia ro.
- Log khong chua OTP plain text.
- Dashboard/metrics co the quan sat duoc reject rate.

## 13. Rollout de xuat
- Buoc 1: bat logging va metrics truoc, chua chan manh.
- Buoc 2: bat rate limit cho login va request OTP.
- Buoc 3: bat CAPTCHA cho request OTP va register exam.
- Buoc 4: bat OTP verification mandatory.
- Buoc 5: bat unique email/exam va banlist rule.

## 14. Quyet dinh can chot truoc khi code
- Chuan hoa email theo muc nao.
- OTP TTL chinh thuc: 5 hay 10 phut.
- Co cho phep resend OTP toi da bao nhieu lan.
- CAPTCHA bat cho moi request hay adaptive.
- Danh sach domain email tam thoi co can chan ngay khong.
- Admin co quyen override nhung gi va audit ra sao.

## 15. Uu tien thuc hien
- Uu tien 1: Phase 1
- Uu tien 2: Phase 2 va 3
- Uu tien 3: Phase 4
- Uu tien 4: Phase 5
