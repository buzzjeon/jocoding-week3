# GlobalSell AI - Blueprint

## 1. Project Overview
**GlobalSell AI**는 사진 한 장으로 글로벌 이커머스(Amazon, eBay, Shopify) 입점을 돕는 AI 기반 B2B SaaS 솔루션입니다. 국내외 셀러들이 겪는 언어 장벽과 SEO 최적화 문제를 해결하여 실질적인 매출 증대를 목표로 합니다.

## 2. Core Value Proposition
- **Efficiency:** 사진 업로드 한 번으로 제목, 불렛포인트, 상세설명 자동 완성.
- **Global Reach:** 영어 및 다국어 리스팅 자동 생성으로 해외 시장 진출 가속화.
- **SEO Optimization:** 각 플랫폼별 알고리즘에 최적화된 키워드 추출.

## 3. Key Features & Implementation Plan

### Phase 1: Identity & UI Pivot
- [ ] **Branding:** "StyleAI"에서 "GlobalSell AI"로 전면 교체.
- [ ] **Form Redesign:** 
    - `gender` -> `Product Category` (Fashion, Electronics, Home, etc.)
    - `height` -> `Target Market` (Amazon US, eBay, Shopify, etc.)
    - `weight` -> `Target Price` (USD)
- [ ] **Landing Page:** 스타일 상담 컨셉에서 글로벌 셀링 파트너 컨셉으로 카피 및 이미지 변경.

### Phase 2: AI Logic Redefinition
- [ ] **`functions/api/consult.ts`**:
    - GPT-4o Vision 프롬프트 수정: 상품 인식 -> SEO 최적화 리스팅 생성 (제목 200자, 불렛포인트 5개, 태그 20개).
- [ ] **`functions/api/daily-recommendation.ts`**:
    - "오늘의 코디" -> "Global Market Trend Insight" (급상승 키워드, 소싱 아이템 추천).

### Phase 3: Business Logic & Integration
- [ ] **Pricing (Polar):** "Pro Seller Plan" ($19/mo)으로 명칭 및 가치 제안 변경.
- [ ] **Email (Resend):** 리스팅 데이터를 엑셀/텍스트 형식으로 깔끔하게 정리하여 이메일 발송.
- [ ] **Database (Supabase):** `profile` 테이블에 셀러 정보(카테고리, 주력 시장) 저장.

## 4. Technical Strategy
- **Frontend:** React (TypeScript) + Tailwind CSS.
- **Backend:** Cloudflare Pages Functions.
- **AI:** OpenAI GPT-4o (Vision) + GPT-4o.
- **Infrastructure:** Supabase (Auth/DB), Polar (Payments), Resend (Email).

## 5. Current Status
- **Current Branch:** globalsellai
- **Pivot Start:** 2026-02-19
