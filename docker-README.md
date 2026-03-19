🐳 Docker 실행 가이드
주요 명령어
docker exec -it sublens-redis-1 redis-cli
docker compose up -d --build
docker compose down
1️⃣ 사전 준비

Docker Desktop 설치

Docker 실행 중인지 확인

docker --version
docker compose version

2️⃣ 환경 변수 설정

루트 디렉토리에 .env 파일 생성

JWT_SECRET=0d5ad301f9af1047ba94371c2f281da7d93ab508c55de822834deae2892fb1b6

⚠️ .env 파일은 Git에 올리지 않습니다.
.env.example 파일을 참고하세요.

3️⃣ 전체 빌드 및 실행

루트 디렉토리에서:

docker compose up --build

backend, frontend, postgres 컨테이너가 함께 실행됩니다.

최초 실행 시 이미지 빌드로 시간이 조금 걸릴 수 있습니다.

4️⃣ 실행 확인
컨테이너 상태 확인
docker ps

다음 컨테이너가 실행 중이어야 합니다:

sublens-postgres

sublens-backend

sublens-frontend

접속 주소

Frontend → http://localhost:3000

Backend → http://localhost:8080

5️⃣ 컨테이너 중지
docker compose down
6️⃣ 완전 초기화 (DB 포함 삭제)
docker compose down -v

컨테이너 삭제

네트워크 삭제

PostgreSQL 데이터 볼륨 삭제 (DB 초기화)

7️⃣ 로그 확인
docker compose logs

특정 서비스 로그만 보기:

docker compose logs backend
docker compose logs frontend
docker compose logs postgres
8️⃣ 재빌드가 필요할 때

코드 수정 후 이미지까지 새로 빌드하려면:

docker compose up --build

강제 재빌드:

docker compose build --no-cache
docker compose up
🔁 개발 모드 vs Docker 모드
로컬 개발
./gradlew bootRun
npm run dev

빠른 개발 및 디버깅용

Docker 실행
docker compose up --build

운영 환경과 동일한 구조 테스트용
