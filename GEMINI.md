# GlobalSell AI - Project Charter

## 1. Goal
"글로벌 이커머스 셀러를 위한 AI 자동 리스팅 생성 서비스 (B2B SaaS)"
- 사진 한 장으로 아마존, 이베이, 쇼피파이용 고품질 SEO 콘텐츠 생성.
- 결제와 구독 기반의 수익형 프로덕트로 해커톤 본선 진출 및 실제 사업화 목표.

## 2. Core Constraints (GlobalSell AI Specialized)
- **Identity:** 모든 UI와 텍스트는 "스타일/패션"이 아닌 "이커머스/글로벌 셀링"에 초점을 맞춥니다.
- **Form Structure:**
    - `gender`: 상품 카테고리로 매핑.
    - `height`: 타겟 마켓(Amazon US, eBay 등)으로 매핑.
    - `weight`: 타겟 가격(USD)으로 매핑.
- **AI Logic:**
    - **Vision:** 상품 사진에서 브랜드, 재질, 색상, 모델명, 상태를 정밀하게 추출합니다.
    - **Listing:** 플랫폼별 SEO 알고리즘(제목 200자, 불렛포인트 5개 등)을 엄격히 준수하여 리스팅 보고서를 생성합니다.
- **Trend Insight:** 매일 아침 글로벌 이커머스 시장의 트렌드 키워드와 소싱 아이디어를 DB에 저장하고 사용자에게 제공합니다.

## 3. Technology Stack & Integration
- **Framework:** Vite + React + TypeScript.
- **Hosting:** Cloudflare Pages (Deploy Branch: globalsellai).
- **Backend:** Cloudflare Pages Functions (OpenAI Vision API).
- **Database:** Supabase (User Profiles, Listing History, Daily Trends).
- **Payment:** Polar (Seller Pro Plan - $19/mo).
- **Email:** Resend (Professional Product Listing Reports).

## 4. Operational Mandates
- 모든 코드 수정 후 반드시 `globalsellai` 브랜치에 푸시하여 실시간 배포 상태를 확인합니다.
- 디자인은 "Professional & Growth" 테마를 유지하며, 신뢰감을 주는 다크 테마와 에메랄드/골드 포인트를 사용합니다.
- 해커톤 심사 기준인 "실제 작동 여부"와 "수익성"을 증명하기 위해 결제 흐름과 이메일 전송을 완벽하게 유지합니다.
