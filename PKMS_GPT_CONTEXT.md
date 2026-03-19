1️⃣ 프로젝트 개요

SUBLENS는 SaaS 기반 개념(Concept) 관리 플랫폼이다.
사용자가 컨셉을 생성하고 버전 관리하며 태그 기반으로 관리하는 시스템이다.

멀티 사용자 환경을 전제로 하며, 확장 가능한 구조를 목표로 한다.

2️⃣ 기술 스택
Backend

Spring Boot 3.x

Spring Security

JWT 기반 인증

JPA (Hibernate)

PostgreSQL

Frontend

React

Mantis Template 사용

Axios 기반 API 통신

Database

PostgreSQL

추후 멀티테넌시 확장 고려

3️⃣ 인증 구조

JWT 기반 인증

Access Token: 24시간

Refresh Token: 6~24시간 (조정 가능)

향후 OAuth 도입 고려

Keycloak 도입은 보류 상태 (자체 JWT 우선)

4️⃣ 핵심 테이블 구조
User

id

email

password

name

phoneNumber

role (USER)

OAuth 확장 고려

Concept

id

title

description

user_id (작성자)

ConceptVersion

id

concept_id

version

content

created_at

Tag

id

name

ConceptTag (N:M 매핑)

concept_id

tag_id

5️⃣ 현재 완료된 것

회원가입 구현

PasswordEncoder 적용

JWT 기본 구조 설계

기본 테이블 설계 완료

HttpOnly Cookie

6️⃣ 진행 중

Refresh Token 전략 구체화

SaaS 멀티테넌시 구조 설계

권한 확장 구조 고민

OAuth 연동 전략 고민

7️⃣ 설계 철학

확장 가능성 우선

구조 이해를 기반으로 구현

SaaS 확장 고려

장기적으로 실 서비스 가능한 수준 목표

8️⃣ 앞으로 남은 큰 과제

멀티테넌시 전략 확정

권한(Role) 확장

API 응답 표준화

예외 처리 체계 정리

테스트 코드 작성
