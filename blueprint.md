# GlobalSell AI - Blueprint

## 1. Project Overview
**GlobalSell AI** is an AI-powered global e-commerce assistant designed to help sellers list their products on international platforms (Amazon, eBay, Shopify, etc.) with ease. By simply uploading a product photo, the AI analyzes the item and generates SEO-optimized titles, descriptions, and keywords in multiple languages.

## 2. Core Capabilities & Design
### 2.1 Project Goal
- Transition from a personal color analysis tool to a B2B SaaS for e-commerce sellers.
- Provide immediate business value by automating the time-consuming process of product listing.
- Target global markets with multilingual support and SEO optimization.

### 2.2 Aesthetic & UI/UX
- **Visual Style:** Professional, data-driven, and trustworthy. Uses a "Professional Dark" theme with vibrant accent colors (Emerald for growth, Gold for success).
- **Interactivity:** Fast, responsive, and mobile-friendly for sellers who take photos on the go.
- **Workflow:** Capture/Upload -> AI Analysis -> Review & Edit -> Export (Email/CSV).

### 2.3 Key Features
- **AI Product Vision:** Identifies brand, material, color, and condition from a single photo.
- **Global SEO Engine:** Generates optimized listings for Amazon, eBay, and Shopify.
- **Multilingual Support:** Auto-translates listings to English, Japanese, Chinese, etc.
- **Trend Insight:** Daily updates on trending e-commerce keywords and sourcing ideas.
- **Premium Export:** Send formatted listings directly to email or export as CSV.

## 3. Implementation Plan

### Phase 1: Identity & UI Pivot
- [ ] Update `App.tsx` text and translations (GlobalSell AI branding).
- [ ] Redesign input form (Remove height/weight, add category/target market).
- [ ] Update landing page hero and CTA sections.

### Phase 2: AI Logic Redefinition
- [ ] `analyze-color.ts`: Update Vision prompt to extract product attributes.
- [ ] `consult.ts`: Update GPT prompt to generate SEO listings (Title, Bullets, Tags).
- [ ] `daily-recommendation.ts`: Pivot from style tips to e-commerce market trends.

### Phase 3: Output & Integration
- [ ] `send-email.ts`: Redesign email template to look like a professional product report.
- [ ] `profile.ts`: Update to store seller-specific information.

## 4. Current Status
- **Pivot Decided:** February 19, 2026.
- **Target Branch:** globalsellai
