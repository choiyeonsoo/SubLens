# SubLens 변경사항 정리

## 변경된 파일 목록

### 수정 (modified)
- `.claude/settings.local.json`
- `.vscode/settings.json`
- `CLAUDE.md`
- `PKMS_GPT_CONTEXT.md`
- `backend/build.gradle`
- `backend/src/main/resources/application.yaml`
- `docker-compose.yml`
- `docker-README.md`
- `frontend/app/(app)/layout.tsx`
- `frontend/app/(app)/alert/page.tsx`
- `frontend/app/(app)/analytics/page.tsx`
- `frontend/app/(app)/dashboard/page.tsx`
- `frontend/app/(app)/recommend/page.tsx`
- `frontend/app/(app)/subscriptions/page.tsx`
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/reset-password/page.tsx`
- `frontend/app/(auth)/signup/page.tsx`
- `frontend/app/layout.tsx`
- `frontend/components/layout/Sidebar.tsx`
- `frontend/components/layout/Topbar.tsx`
- `frontend/features/auth/api.ts`
- `frontend/features/auth/hooks.ts`
- `frontend/features/subscription/api.ts`
- `frontend/features/subscription/hooks.ts`
- `frontend/features/subscription/types.ts`
- `frontend/lib/axios.ts`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/providers/ReactQueryProvider.tsx`
- `frontend/providers/ThemeProvider.tsx`
- `frontend/views/dashboard/DashBoard.tsx`
- `frontend/views/login/Login.tsx`
- `frontend/views/login/InvalidStep.tsx`
- `frontend/views/login/RequestStep.tsx`
- `frontend/views/login/ResetPassword.tsx`
- `frontend/views/login/ResetStep.tsx`
- `frontend/views/login/SentStep.tsx`
- `frontend/views/login/SuccessStep.tsx`
- `frontend/views/login/signup.tsx`
- `frontend/views/subscription/SubscriptionCard.tsx`
- `frontend/views/subscription/SubscriptionFormModal.tsx`
- `frontend/views/subscription/SubscriptionListPage.tsx`

### 삭제 (deleted)
- `backend/src/main/java/com/pkms/backend/` (전체 — BackendApplication, auth, category, config, global, mail, security, subscription, user 패키지)
- `backend/src/test/java/com/pkms/backend/BackendApplicationTests.java`
- `docs/PKMS_AUTH_SPEC.html`

### 추가 (untracked)
- `backend/src/main/java/com/sublens/` (신규 패키지)
- `backend/src/test/java/com/sublens/`
- `frontend/components/ServiceSelectField.tsx`
- `frontend/components/ui/` (공통 UI 컴포넌트)
- `frontend/lib/type.ts`
- `frontend/providers/AuthProvider.tsx`
- `frontend/public/docs/`
- `frontend/store/`
- `.gitignore`

---

## 변경 내용 상세

### 1. 프로젝트 리네임 (PKMS → SUBLENS)
- **변경 파일:** `CLAUDE.md`, `PKMS_GPT_CONTEXT.md`, `backend/build.gradle`, `docker-compose.yml`
- **변경 내용:**
  - 프로젝트명 PKMS → SUBLENS 전체 교체
  - `group = 'com.pkms'` → `group = 'com.sublens'` (build.gradle)
  - Docker 컨테이너명 `pkms-*` → `sublens-*`
  - 문서 내 프로젝트 설명 텍스트 업데이트
- **커밋 메시지 제안:** `chore: 프로젝트명 PKMS → SUBLENS 리네임`

---

### 2. 백엔드 패키지 변경 (com.pkms → com.sublens)
- **변경 파일:** `backend/src/main/java/com/pkms/` (전체 삭제) → `backend/src/main/java/com/sublens/` (신규)
- **변경 내용:**
  - 전체 Java 패키지 경로를 `com.pkms.backend` → `com.sublens.backend`로 변경
  - BackendApplication, auth, category, config, global/exception, mail, security, subscription, user 패키지 전부 재구성
- **커밋 메시지 제안:** `refactor: 백엔드 패키지 com.pkms → com.sublens 변경`

---

### 3. DB 비밀번호 및 인프라 설정 변경
- **변경 파일:** `docker-compose.yml`, `backend/src/main/resources/application.yaml`
- **변경 내용:**
  - DB 비밀번호 `sublens123` → `sublens0223`
  - `application.yaml` fallback 비밀번호 동기화
- **커밋 메시지 제안:** `chore: DB 비밀번호 변경 및 docker-compose 설정 업데이트`

---

### 4. 공통 UI 컴포넌트 추가
- **변경 파일:** `frontend/components/ui/` (신규), `frontend/components/ServiceSelectField.tsx` (신규), `frontend/lib/type.ts` (신규)
- **변경 내용:**
  - 공통 `Select` 컴포넌트 추가 (`<select>` 래퍼)
  - `ServiceSelectField`: 구독 서비스 선택 + 검색 기능이 포함된 입력 필드
  - `lib/type.ts`: `ApiResponse<T>` 공통 응답 타입 정의
- **커밋 메시지 제안:** `feat: 공통 UI 컴포넌트 추가 (Select, ServiceSelectField)`

---

### 5. 전역 인증 상태 관리 도입 (AuthProvider + Zustand store)
- **변경 파일:** `frontend/providers/AuthProvider.tsx` (신규), `frontend/store/` (신규), `frontend/app/layout.tsx`
- **변경 내용:**
  - Zustand 기반 `useAuthStore` 추가 — `user`, `isLoading`, `setUser` 상태 관리
  - `AuthProvider`: 앱 진입 시 `/api/auth/me`로 인증 상태 초기화
  - `app/layout.tsx`에 `<AuthProvider>` 추가
  - `app/(app)/layout.tsx`: 기존 직접 API 호출 → `useAuthStore` 사용으로 교체
- **커밋 메시지 제안:** `feat: AuthProvider 및 전역 인증 store 추가`

---

### 6. Sidebar 기능 확장
- **변경 파일:** `frontend/components/layout/Sidebar.tsx`
- **변경 내용:**
  - `userName`, `subscriptionCount` props 제거 → `useAuthStore`에서 직접 조회
  - 유저 버튼 클릭 시 팝업 메뉴 표시 (다크/라이트 모드 전환, 로그아웃)
  - ADMIN 역할일 경우 DB 명세서·기술명세서·기획서 문서 링크 노출
  - 로그아웃 시 `setUser(null)` 후 `/login` 리다이렉트
- **커밋 메시지 제안:** `feat: Sidebar에 유저 팝업 메뉴 및 테마 전환 기능 추가`

---

### 7. 로그인 뷰 개선
- **변경 파일:** `frontend/views/login/Login.tsx`, `frontend/app/(auth)/reset-password/page.tsx`
- **변경 내용:**
  - 로그인 성공 후 `/api/auth/me` 호출하여 `useAuthStore`에 사용자 정보 저장
  - 이미 로그인 상태일 경우 `/dashboard`로 자동 리다이렉트
  - `reset-password` 페이지에 `<Suspense>` 래퍼 추가 (useSearchParams 대응)
- **커밋 메시지 제안:** `fix: 로그인 후 인증 상태 동기화 및 중복 로그인 방지`

---

### 8. 구독 폼 UI 개선
- **변경 파일:** `frontend/views/subscription/SubscriptionFormModal.tsx`, `frontend/views/subscription/SubscriptionCard.tsx`
- **변경 내용:**
  - `SubscriptionFormModal`에서 `<select>` → 공통 `<Select>` 컴포넌트로 교체
  - 서비스명 입력 → `ServiceSelectField`로 교체 (서비스 검색 지원)
  - `SubscriptionCard`에서 `subscription.color` prop 제거, 고정 색상 사용
  - 코드 스타일 통일 (single quote → double quote)
- **커밋 메시지 제안:** `refactor: 구독 폼에 공통 UI 컴포넌트 적용 및 코드 정리`

---

### 9. 구독 서비스 API 추가
- **변경 파일:** `frontend/features/subscription/hooks.ts`, `frontend/features/subscription/types.ts`, `frontend/lib/axios.ts`
- **변경 내용:**
  - `useSubscriptionServices` 훅 추가 — `/api/subscription-services` 조회 (1시간 캐시)
  - `SubscriptionServiceItem` 타입 추가
  - `SubscriptionResponse`에서 `logoUrl`, `color` 필드 제거
  - `plainApi` export 추가
- **커밋 메시지 제안:** `feat: 구독 서비스 목록 조회 훅 및 타입 추가`

---

## 추천 커밋 순서

1. `chore: 프로젝트명 PKMS → SUBLENS 리네임` → `CLAUDE.md`, `PKMS_GPT_CONTEXT.md`, `backend/build.gradle`, `docker-compose.yml`
2. `refactor: 백엔드 패키지 com.pkms → com.sublens 변경` → `backend/src/`
3. `chore: DB 비밀번호 변경 및 docker-compose 설정 업데이트` → `docker-compose.yml`, `backend/src/main/resources/application.yaml`
4. `feat: 공통 UI 컴포넌트 추가 (Select, ServiceSelectField)` → `frontend/components/ui/`, `frontend/components/ServiceSelectField.tsx`, `frontend/lib/type.ts`
5. `feat: AuthProvider 및 전역 인증 store 추가` → `frontend/providers/AuthProvider.tsx`, `frontend/store/`, `frontend/app/layout.tsx`
6. `feat: Sidebar에 유저 팝업 메뉴 및 테마 전환 기능 추가` → `frontend/components/layout/Sidebar.tsx`
7. `fix: 로그인 후 인증 상태 동기화 및 중복 로그인 방지` → `frontend/views/login/Login.tsx`, `frontend/app/(auth)/reset-password/page.tsx`, `frontend/app/(app)/layout.tsx`
8. `feat: 구독 서비스 목록 조회 훅 및 타입 추가` → `frontend/features/subscription/hooks.ts`, `frontend/features/subscription/types.ts`, `frontend/lib/axios.ts`
9. `refactor: 구독 폼에 공통 UI 컴포넌트 적용 및 코드 정리` → `frontend/views/subscription/SubscriptionFormModal.tsx`, `frontend/views/subscription/SubscriptionCard.tsx`, 나머지 frontend 파일들
