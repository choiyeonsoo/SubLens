-- ============================================================
-- 직접 실행용 마이그레이션 SQL
-- psql -U <user> -d <db> -f V2__add_service_id_to_subscriptions.sql
-- ============================================================

-- 1-1. subscriptions 테이블에 service_id 컬럼 추가
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES subscription_services(id);

-- 1-2. 기존 데이터 마이그레이션: service_name → service_id 매핑
UPDATE subscriptions s
SET service_id = ss.id
FROM subscription_services ss
WHERE LOWER(s.service_name) = LOWER(ss.name);

-- 1-3. 매핑 결과 확인
SELECT
    COUNT(*) FILTER (WHERE service_id IS NOT NULL) AS mapped,
    COUNT(*) FILTER (WHERE service_id IS NULL)     AS unmapped,
    COUNT(*)                                        AS total
FROM subscriptions;

-- 1-4. bundle_catalog 테이블에 service_ids 컬럼 추가
ALTER TABLE bundle_catalog
    ADD COLUMN IF NOT EXISTS service_ids UUID[];

-- 최종 검증 쿼리
SELECT
    s.service_name,
    ss.name AS matched_service,
    s.service_id
FROM subscriptions s
LEFT JOIN subscription_services ss ON ss.id = s.service_id
LIMIT 20;
