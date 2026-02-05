import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

type Page = 'landing' | 'form' | 'result' | 'payment-success' | 'terms' | 'privacy' | 'refund' | 'login' | 'signup' | 'mypage' | 'forgot-password' | 'reset-password' | 'subscription' | 'subscription-success' | 'partnership' | 'animal-test' | 'about' | 'faq'
type Language = 'en' | 'ko'

const pageRoutes: Record<Page, string> = {
  landing: '/',
  form: '/form',
  result: '/result',
  'payment-success': '/payment-success',
  terms: '/terms',
  privacy: '/privacy',
  refund: '/refund',
  login: '/login',
  signup: '/signup',
  mypage: '/mypage',
  'forgot-password': '/forgot-password',
  'reset-password': '/reset-password',
  subscription: '/subscription',
  'subscription-success': '/subscription-success',
  partnership: '/partnership',
  'animal-test': '/animal-test',
  about: '/about',
  faq: '/faq',
}

const routeToPage: Record<string, Page> = Object.entries(pageRoutes).reduce((acc, [page, path]) => {
  acc[path] = page as Page
  return acc
}, {} as Record<string, Page>)

const translations = {
  en: {
    nav: {
      home: 'Home',
      browse: 'Browse',
      saved: 'Saved',
      settings: 'Settings',
    },
    hero: {
      tagline: 'The Future of Fashion',
      title1: 'Your AI',
      title2: 'Fashion Expert',
      description: 'Precision body analysis and curated fashion recommendations tailored to your unique silhouette.',
      cta: 'Start My Styling',
    },
    social: {
      poweredBy: 'Powered by OpenAI GPT-4',
    },
    features: {
      title: 'Tailored to You',
      description: 'Experience the future of personal styling with our advanced AI technology designed for the modern wardrobe.',
      bodyAnalysis: 'Body Analysis',
      bodyAnalysisDesc: 'Our AI measures proportions with precision for the ultimate silhouette mapping.',
      personalizedFits: 'Personalized Fits',
      personalizedFitsDesc: 'Never guess your size again. Curated pieces that fit your body perfectly.',
      styleDiscovery: 'Style Discovery',
      styleDiscoveryDesc: 'Stay ahead of trends with outfits matched specifically to your aesthetic.',
    },
    process: {
      title: "The Stylist's Process",
      step1: 'Capture Silhouette',
      step1Desc: 'Securely upload a full-body photo for our vision engine to process.',
      step2: 'Neural Analysis',
      step2Desc: 'Our AI analyzes your unique shape, skin tone, and existing style patterns.',
      step3: 'Get Curated',
      step3Desc: 'Receive a personalized digital lookbook with direct shopping links.',
    },
    cta: {
      title: 'Elevate Your Look',
      description: 'Discover your perfect style with AI-powered fashion recommendations.',
      button: 'Get Started Free',
      note: 'No credit card required',
      premiumButton: 'Get Premium Analysis',
      premiumNote: 'Detailed report with personalized recommendations',
    },
    footer: {
      copyright: '© 2024 STYLEAI. ALL RIGHTS RESERVED.',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      refund: 'Refund Policy',
      partnership: 'Partnership',
      about: 'About',
      faq: 'FAQ',
    },
    partnership: {
      title: 'Partnership Inquiry',
      description: 'Interested in partnering with StyleAI? Fill out the form below and we\'ll get back to you.',
      companyName: 'Company Name',
      contactName: 'Contact Name',
      email: 'Email',
      phone: 'Phone Number',
      message: 'Message',
      messagePlaceholder: 'Tell us about your partnership idea...',
      submit: 'Submit Inquiry',
      submitting: 'Submitting...',
      success: 'Thank you! Your inquiry has been submitted successfully.',
      error: 'Failed to submit. Please try again.',
    },
    about: {
      title: 'About StyleAI',
      subtitle: 'Your Personal AI Fashion Expert',
      mission: 'Our Mission',
      missionText: 'StyleAI is revolutionizing personal fashion with cutting-edge artificial intelligence. We believe everyone deserves access to expert styling advice, and our AI-powered platform makes personalized fashion recommendations accessible to all.',
      howItWorks: 'How It Works',
      howItWorksText: 'Using advanced computer vision and machine learning algorithms, StyleAI analyzes your body proportions, skin tone, and personal preferences to deliver tailored fashion recommendations. Our technology has been trained on millions of fashion data points to understand what styles work best for different body types.',
      team: 'Our Team',
      teamText: 'StyleAI was founded by a team of fashion enthusiasts and AI engineers who share a passion for making style accessible. We combine deep expertise in machine learning with a genuine love for fashion to create a tool that truly helps people look and feel their best.',
      values: 'Our Values',
      value1Title: 'Inclusivity',
      value1Text: 'Fashion advice for every body type, gender, and style preference.',
      value2Title: 'Privacy First',
      value2Text: 'Your photos are processed in real-time and never stored on our servers.',
      value3Title: 'Continuous Improvement',
      value3Text: 'Our AI learns and improves constantly to provide better recommendations.',
      contact: 'Contact Us',
      contactText: 'Have questions or feedback? We\'d love to hear from you.',
      contactEmail: 'support@styleai.com',
    },
    faq: {
      title: 'Frequently Asked Questions',
      subtitle: 'Find answers to common questions about StyleAI',
      q1: 'What is StyleAI?',
      a1: 'StyleAI is an AI-powered personal styling platform that analyzes your body type, proportions, and preferences to provide personalized fashion recommendations. Our advanced algorithms help you discover styles that flatter your unique figure.',
      q2: 'How does the body analysis work?',
      a2: 'Simply upload a full-body photo, and our AI will analyze your proportions, body shape, and other factors. The analysis is done in real-time using advanced computer vision technology, and your photos are not stored on our servers.',
      q3: 'Is my data safe?',
      a3: 'Absolutely. We take privacy seriously. Your photos are processed in real-time and are not permanently stored. We use industry-standard encryption and follow strict data protection guidelines. Read our Privacy Policy for more details.',
      q4: 'What is included in the free analysis?',
      a4: 'The free analysis includes basic body type identification and general style recommendations. For detailed reports with specific product recommendations, color analysis, and hairstyle suggestions, check out our Premium plan.',
      q5: 'How accurate are the recommendations?',
      a5: 'Our AI has been trained on millions of fashion data points and continuously learns from user feedback. While individual preferences may vary, our recommendations are based on established fashion principles and body type science.',
      q6: 'Can I use StyleAI on mobile?',
      a6: 'Yes! StyleAI is fully responsive and works great on smartphones, tablets, and desktop computers. You can take a photo directly with your phone camera and get instant recommendations.',
      q7: 'How do I get a refund?',
      a7: 'If you\'re not satisfied with our Premium service, you can request a refund within 24 hours of purchase if you haven\'t used the service. Please refer to our Refund Policy for complete details.',
      q8: 'How can I contact support?',
      a8: 'You can reach our support team at support@styleai.com or use the Partnership Inquiry form on our website. We typically respond within 24-48 hours.',
      stillHaveQuestions: 'Still have questions?',
      contactUs: 'Contact our support team',
    },
    animalTest: {
      title: 'Animal Face Test',
      description: 'Which animal do you resemble? Take a fun test with AI!',
      uploadPhoto: 'Upload your photo',
      takePhoto: 'Or take a photo',
      analyzing: 'Analyzing...',
      result: 'Your Animal Type',
      dog: 'Dog',
      cat: 'Cat',
      dogDesc: 'You have a friendly, loyal, and warm impression! Like a puppy, you give trustworthy vibes.',
      catDesc: 'You have a mysterious, independent, and elegant charm! Like a cat, you have a captivating aura.',
      confidence: 'Confidence',
      tryAgain: 'Try Again',
      backToResult: 'Back to Results',
    },
    terms: {
      title: 'Terms of Service',
      lastUpdated: 'Last Updated: February 5, 2026',
      content: `
1. Acceptance of Terms
By accessing and using StyleAI ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.

2. Description of Service
StyleAI provides AI-powered personal styling recommendations based on user-provided photos and body measurements. Our Service uses artificial intelligence to analyze your information and generate personalized fashion advice.

3. User Responsibilities
- You must provide accurate information when using our Service
- You are responsible for maintaining the confidentiality of your account
- You agree not to use the Service for any unlawful purpose
- You must be at least 18 years old to use our Service

4. Intellectual Property
All content generated by StyleAI, including but not limited to style reports and recommendations, is provided for your personal use only. You may not redistribute or commercialize this content without our written permission.

5. Limitation of Liability
StyleAI provides recommendations for informational purposes only. We are not responsible for any decisions you make based on our recommendations. Our Service is provided "as is" without warranties of any kind.

6. Payment Terms
Premium services are billed through our payment processor Polar. All sales are final except as described in our Refund Policy.

7. Third-Party Services and Tracking
We use third-party services to provide core functionality, analytics, comments, and advertising. These services may collect data as described in our Privacy Policy, including OpenAI, Supabase, Resend, Disqus, Google Analytics, Microsoft Clarity, Google AdSense, Formspree, Polar, and Cloudflare.

8. Changes to Terms
We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.

9. Contact
For questions about these Terms, please contact us at support@styleai.com.
      `,
    },
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: 'Last Updated: February 5, 2026',
      content: `
1. Information We Collect
- Personal information: gender, height, weight
- Photos you upload for style analysis
- Payment information (processed securely by Polar)
- Usage data and analytics

2. How We Use Your Information
- To provide personalized style recommendations
- To process your payments
- To improve our AI algorithms and Service
- To communicate with you about your account

3. Data Storage and Security
- Your photos are processed in real-time and are not permanently stored on our servers
- We use industry-standard encryption to protect your data
- Payment information is handled securely by our payment processor

4. Third-Party Services
We use the following third-party services:
- OpenAI: For AI-powered style analysis
- Supabase: For authentication and user management
- Resend: For transactional email delivery
- Disqus: For comments and community feedback
- Google Analytics: For usage analytics
- Microsoft Clarity: For session insights
- Google AdSense: For advertising
- Formspree: For partnership inquiry submissions
- Polar: For payment processing
- Cloudflare: For hosting and security

5. Your Rights
You have the right to:
- Access your personal data
- Request deletion of your data
- Opt-out of marketing communications
- Request a copy of your data

6. Cookies
We use essential cookies to provide our Service. By using our Service, you consent to our use of cookies.

7. Children's Privacy
Our Service is not intended for users under 18 years of age. We do not knowingly collect information from children.

8. Contact
For privacy-related inquiries, please contact us at privacy@styleai.com.
      `,
    },
    refund: {
      title: 'Refund Policy',
      lastUpdated: 'Last Updated: February 5, 2026',
      content: `
1. Digital Product Nature
StyleAI provides digital services that are delivered immediately upon purchase. Due to the instant delivery nature of our AI-generated reports, we have a limited refund policy.

2. Refund Eligibility
You may be eligible for a refund if:
- Technical issues prevented you from receiving your style report
- The service was significantly different from what was described
- You request a refund within 24 hours of purchase and have not used the service

3. Non-Refundable Cases
Refunds will not be provided if:
- You have already received and viewed your style report
- More than 24 hours have passed since purchase
- You simply changed your mind after using the service

4. How to Request a Refund
To request a refund:
1. Email us at refunds@styleai.com
2. Include your order ID and reason for the refund request
3. We will review your request within 3 business days

5. Refund Processing
Approved refunds will be processed within 5-10 business days and will be credited to your original payment method.

6. Contact
For refund-related questions, please contact refunds@styleai.com.
      `,
    },
    form: {
      title: "Let's Style You",
      description: 'Upload your photo and enter your details for personalized recommendations.',
      uploadPhoto: 'Upload your photo',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      height: 'Height (cm)',
      weight: 'Weight (kg)',
      submit: 'Get My Style Report',
      analyzing: 'Analyzing...',
      aiAnalyzing: 'AI is analyzing your style...',
      generatingHairstyle: 'Generating hairstyle recommendations...',
    },
    result: {
      title: 'Your Style Report',
      description: 'Personalized recommendations based on your profile.',
      hairstyles: 'Recommended Hairstyles',
      tryAgain: 'Try Again',
      backHome: 'Back to Home',
      download: 'Download',
      share: 'Share',
      copied: 'Link copied!',
      shareTitle: 'My Style Report from StyleAI',
      shareText: 'Check out my personalized style recommendations!',
      email: 'Email',
      emailModalTitle: 'Send Report via Email',
      emailPlaceholder: 'Enter your email address',
      emailSend: 'Send',
      emailSending: 'Sending...',
      emailSuccess: 'Email sent successfully!',
      emailError: 'Failed to send email. Please try again.',
      emailInvalid: 'Please enter a valid email address.',
    },
    emailTest: {
      title: 'Test Email Feature',
      description: 'Enter your email to receive a test message',
      button: 'Send Test Email',
      success: 'Test email sent! Check your inbox.',
      error: 'Failed to send test email.',
    },
    errors: {
      fillAll: 'Please fill in gender, height, and weight.',
      apiError: 'An error occurred: ',
      connectionFailed: 'Failed to connect to server.',
    },
    paymentSuccess: {
      title: 'Payment Successful!',
      description: 'Thank you for your purchase. You now have access to premium style consulting.',
      button: 'Start Premium Consulting',
    },
    auth: {
      login: 'Login',
      signup: 'Sign Up',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      loginTitle: 'Welcome Back',
      loginDescription: 'Sign in to access your style profile',
      signupTitle: 'Create Account',
      signupDescription: 'Join StyleAI for personalized fashion recommendations',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      forgotPassword: 'Forgot password?',
      orContinueWith: 'Or continue with',
      google: 'Google',
      loginSuccess: 'Successfully logged in!',
      signupSuccess: 'Account created! Please check your email to verify.',
      logoutSuccess: 'Successfully logged out!',
      errorEmailRequired: 'Email is required',
      errorPasswordRequired: 'Password is required',
      errorPasswordMismatch: 'Passwords do not match',
      errorPasswordLength: 'Password must be at least 6 characters',
      errorInvalidEmail: 'Invalid email address',
      forgotPasswordTitle: 'Forgot Password',
      forgotPasswordDesc: 'Enter your email and we will send you a reset link.',
      sendResetLink: 'Send Reset Link',
      resetLinkSent: 'Password reset link sent! Check your email.',
      resetPasswordTitle: 'Reset Password',
      resetPasswordDesc: 'Enter your new password.',
      resetPassword: 'Reset Password',
      passwordResetSuccess: 'Password reset successfully! You can now login.',
      backToLogin: 'Back to Login',
    },
    mypage: {
      title: 'My Page',
      accountInfo: 'Account Information',
      email: 'Email',
      createdAt: 'Member Since',
      provider: 'Login Method',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmNewPassword: 'Confirm New Password',
      updatePassword: 'Update Password',
      passwordUpdated: 'Password updated successfully!',
      deleteAccount: 'Delete Account',
      deleteWarning: 'This action cannot be undone. All your data will be permanently deleted.',
      deleteConfirm: 'Are you sure you want to delete your account?',
      typeToConfirm: 'Type "DELETE" to confirm',
      delete: 'Delete My Account',
      accountDeleted: 'Account deleted successfully.',
      errorCurrentPassword: 'Current password is required',
      errorDeleteConfirm: 'Please type DELETE to confirm',
    },
    subscription: {
      title: 'StyleAI Daily Premium',
      subtitle: 'Your Personal AI Stylist, Every Morning',
      description: 'Wake up to personalized fashion recommendations tailored just for you!',
      features: {
        daily: 'Daily Style Recommendations',
        dailyDesc: 'Personalized outfit suggestions based on your body type and today\'s weather',
        weather: 'Weather-Smart Fashion',
        weatherDesc: 'Real-time weather integration for your location',
        personalized: 'Personalized to You',
        personalizedDesc: 'Recommendations based on your unique profile',
      },
      pricing: {
        price: '$9.99',
        period: '/month',
        trial: '7-day free trial',
        trialDesc: 'Try free for 7 days, cancel anytime',
        perDay: 'Less than $0.33/day',
      },
      cta: 'Start Free Trial',
      ctaLoggedOut: 'Login to Subscribe',
      benefits: {
        cancel: 'Cancel anytime',
        noCharge: 'No charge during trial',
        refund: '100% satisfaction guarantee',
      },
      success: {
        title: 'Welcome to Premium!',
        description: 'Your 7-day free trial has started. Enjoy personalized style recommendations every morning!',
        button: 'Set Up My Profile',
      },
    },
  },
  ko: {
    nav: {
      home: '홈',
      browse: '둘러보기',
      saved: '저장됨',
      settings: '설정',
    },
    hero: {
      tagline: '패션의 미래',
      title1: 'AI 패션',
      title2: '전문가',
      description: '정밀한 체형 분석과 당신만의 실루엣에 맞춘 맞춤형 패션 추천을 경험하세요.',
      cta: '스타일링 시작하기',
    },
    social: {
      poweredBy: 'OpenAI GPT-4 기반',
    },
    features: {
      title: '맞춤형 스타일링',
      description: '현대적인 옷장을 위해 설계된 고급 AI 기술로 퍼스널 스타일링의 미래를 경험하세요.',
      bodyAnalysis: '체형 분석',
      bodyAnalysisDesc: 'AI가 정밀하게 체형 비율을 측정하여 최적의 실루엣을 매핑합니다.',
      personalizedFits: '맞춤 핏',
      personalizedFitsDesc: '더 이상 사이즈를 고민하지 마세요. 완벽하게 맞는 옷을 추천해 드립니다.',
      styleDiscovery: '스타일 발견',
      styleDiscoveryDesc: '당신의 취향에 맞춘 트렌드 아이템으로 한 발 앞서가세요.',
    },
    process: {
      title: '스타일리스트 프로세스',
      step1: '실루엣 촬영',
      step1Desc: '전신 사진을 안전하게 업로드하면 비전 엔진이 분석합니다.',
      step2: '신경망 분석',
      step2Desc: 'AI가 체형, 피부톤, 기존 스타일 패턴을 분석합니다.',
      step3: '큐레이션 받기',
      step3Desc: '쇼핑 링크가 포함된 맞춤형 디지털 룩북을 받아보세요.',
    },
    cta: {
      title: '룩을 업그레이드하세요',
      description: 'AI 기반 패션 추천으로 나만의 완벽한 스타일을 발견하세요.',
      button: '무료로 시작하기',
      note: '신용카드 불필요',
      premiumButton: '프리미엄 분석 받기',
      premiumNote: '상세 리포트와 맞춤형 추천 포함',
    },
    footer: {
      copyright: '© 2024 STYLEAI. 모든 권리 보유.',
      terms: '이용약관',
      privacy: '개인정보처리방침',
      refund: '환불정책',
      partnership: '제휴문의',
      about: '소개',
      faq: 'FAQ',
    },
    partnership: {
      title: '제휴문의',
      description: 'StyleAI와 파트너십에 관심이 있으신가요? 아래 양식을 작성해 주시면 연락드리겠습니다.',
      companyName: '회사명',
      contactName: '담당자명',
      email: '이메일',
      phone: '연락처',
      message: '문의내용',
      messagePlaceholder: '제휴 아이디어에 대해 알려주세요...',
      submit: '문의하기',
      submitting: '제출 중...',
      success: '감사합니다! 문의가 성공적으로 제출되었습니다.',
      error: '제출에 실패했습니다. 다시 시도해 주세요.',
    },
    about: {
      title: 'StyleAI 소개',
      subtitle: '당신만을 위한 AI 패션 전문가',
      mission: '우리의 미션',
      missionText: 'StyleAI는 최첨단 인공지능으로 개인 패션을 혁신하고 있습니다. 모든 사람이 전문적인 스타일링 조언을 받을 자격이 있다고 믿으며, AI 기반 플랫폼을 통해 맞춤형 패션 추천을 누구나 이용할 수 있도록 합니다.',
      howItWorks: '작동 원리',
      howItWorksText: '고급 컴퓨터 비전과 머신러닝 알고리즘을 사용하여 StyleAI는 체형, 피부톤, 개인 취향을 분석해 맞춤형 패션 추천을 제공합니다. 수백만 개의 패션 데이터로 학습된 기술이 각 체형에 가장 잘 어울리는 스타일을 파악합니다.',
      team: '우리 팀',
      teamText: 'StyleAI는 패션 애호가와 AI 엔지니어로 구성된 팀이 설립했습니다. 머신러닝 전문 지식과 패션에 대한 열정을 결합하여 사람들이 최고의 모습을 찾을 수 있도록 돕는 도구를 만듭니다.',
      values: '핵심 가치',
      value1Title: '포용성',
      value1Text: '모든 체형, 성별, 스타일 취향을 위한 패션 조언을 제공합니다.',
      value2Title: '개인정보 보호',
      value2Text: '사진은 실시간으로 처리되며 서버에 저장되지 않습니다.',
      value3Title: '지속적 개선',
      value3Text: 'AI가 지속적으로 학습하여 더 나은 추천을 제공합니다.',
      contact: '문의하기',
      contactText: '질문이나 피드백이 있으신가요? 언제든지 연락해 주세요.',
      contactEmail: 'support@styleai.com',
    },
    faq: {
      title: '자주 묻는 질문',
      subtitle: 'StyleAI에 대한 궁금한 점을 해결하세요',
      q1: 'StyleAI란 무엇인가요?',
      a1: 'StyleAI는 체형, 비율, 취향을 분석하여 맞춤형 패션 추천을 제공하는 AI 기반 스타일링 플랫폼입니다. 고급 알고리즘이 당신만의 독특한 체형에 어울리는 스타일을 찾아드립니다.',
      q2: '체형 분석은 어떻게 작동하나요?',
      a2: '전신 사진을 업로드하면 AI가 비율, 체형 등을 분석합니다. 고급 컴퓨터 비전 기술로 실시간 분석이 이루어지며, 사진은 서버에 저장되지 않습니다.',
      q3: '내 데이터는 안전한가요?',
      a3: '물론입니다. 개인정보 보호를 최우선으로 합니다. 사진은 실시간 처리 후 저장되지 않으며, 업계 표준 암호화와 엄격한 데이터 보호 지침을 따릅니다. 자세한 내용은 개인정보처리방침을 확인하세요.',
      q4: '무료 분석에는 무엇이 포함되나요?',
      a4: '무료 분석에는 기본 체형 식별과 일반적인 스타일 추천이 포함됩니다. 상세 리포트, 제품 추천, 컬러 분석, 헤어스타일 제안은 프리미엄 플랜을 확인하세요.',
      q5: '추천의 정확도는 어떤가요?',
      a5: 'AI는 수백만 개의 패션 데이터로 학습되었으며 사용자 피드백을 통해 지속적으로 발전합니다. 개인 취향은 다를 수 있지만, 추천은 검증된 패션 원칙과 체형 과학에 기반합니다.',
      q6: '모바일에서도 사용할 수 있나요?',
      a6: '네! StyleAI는 완전 반응형이며 스마트폰, 태블릿, 데스크톱에서 모두 잘 작동합니다. 휴대폰 카메라로 직접 사진을 찍고 즉시 추천을 받을 수 있습니다.',
      q7: '환불은 어떻게 받나요?',
      a7: '프리미엄 서비스에 만족하지 않으시면 구매 후 24시간 이내, 서비스 사용 전에 환불을 요청할 수 있습니다. 자세한 내용은 환불정책을 확인하세요.',
      q8: '고객지원에 어떻게 연락하나요?',
      a8: 'support@styleai.com으로 이메일을 보내거나 웹사이트의 제휴문의 양식을 이용하세요. 보통 24-48시간 이내에 답변드립니다.',
      stillHaveQuestions: '아직 궁금한 점이 있으신가요?',
      contactUs: '고객지원팀에 문의하기',
    },
    animalTest: {
      title: '동물상 테스트',
      description: '나는 어떤 동물을 닮았을까? AI로 재미있게 테스트해보세요!',
      uploadPhoto: '사진 업로드',
      takePhoto: '또는 사진 촬영',
      analyzing: '분석 중...',
      result: '당신의 동물상',
      dog: '강아지상',
      cat: '고양이상',
      dogDesc: '친근하고 충성스러우며 따뜻한 인상을 가지고 있어요! 강아지처럼 믿음직스러운 느낌을 줍니다.',
      catDesc: '신비롭고 독립적이며 우아한 매력을 가지고 있어요! 고양이처럼 사람을 끌어당기는 아우라가 있습니다.',
      confidence: '확률',
      tryAgain: '다시 테스트',
      backToResult: '결과로 돌아가기',
    },
    terms: {
      title: '이용약관',
      lastUpdated: '최종 수정일: 2026년 2월 5일',
      content: `
1. 약관의 동의
StyleAI("서비스")에 접속하고 이용함으로써 귀하는 본 이용약관에 동의하게 됩니다. 본 약관에 동의하지 않으시면 서비스를 이용하지 마십시오.

2. 서비스 설명
StyleAI는 사용자가 제공한 사진과 신체 정보를 기반으로 AI 기반 퍼스널 스타일링 추천을 제공합니다. 저희 서비스는 인공지능을 사용하여 귀하의 정보를 분석하고 맞춤형 패션 조언을 생성합니다.

3. 이용자의 책임
- 서비스 이용 시 정확한 정보를 제공해야 합니다
- 계정의 기밀성을 유지할 책임이 있습니다
- 불법적인 목적으로 서비스를 사용하지 않기로 동의합니다
- 서비스를 이용하려면 18세 이상이어야 합니다

4. 지적재산권
StyleAI가 생성한 모든 콘텐츠(스타일 리포트 및 추천 포함)는 개인적인 용도로만 제공됩니다. 당사의 서면 허가 없이 이 콘텐츠를 재배포하거나 상업화할 수 없습니다.

5. 책임의 제한
StyleAI는 정보 제공 목적으로만 추천을 제공합니다. 당사의 추천에 기반한 귀하의 결정에 대해 책임지지 않습니다. 서비스는 어떠한 종류의 보증 없이 "있는 그대로" 제공됩니다.

6. 결제 조건
프리미엄 서비스는 결제 처리업체 Polar를 통해 청구됩니다. 환불 정책에 설명된 경우를 제외하고 모든 판매는 최종적입니다.

7. 제3자 서비스 및 추적
서비스 제공을 위해 제3자 서비스를 사용합니다. OpenAI, Supabase, Resend, Disqus, Google Analytics, Microsoft Clarity, Google AdSense, Formspree, Polar, Cloudflare 등이 포함되며, 자세한 내용은 개인정보처리방침을 참고하세요.

8. 약관 변경
당사는 언제든지 본 약관을 수정할 권리를 보유합니다. 변경 후 서비스를 계속 이용하면 새로운 약관에 동의한 것으로 간주됩니다.

9. 문의
본 약관에 관한 질문은 support@styleai.com으로 문의해 주세요.
      `,
    },
    privacy: {
      title: '개인정보처리방침',
      lastUpdated: '최종 수정일: 2026년 2월 5일',
      content: `
1. 수집하는 정보
- 개인정보: 성별, 키, 몸무게
- 스타일 분석을 위해 업로드하는 사진
- 결제 정보 (Polar에서 안전하게 처리)
- 이용 데이터 및 분석 정보

2. 정보 이용 방법
- 맞춤형 스타일 추천 제공
- 결제 처리
- AI 알고리즘 및 서비스 개선
- 계정 관련 커뮤니케이션

3. 데이터 저장 및 보안
- 귀하의 사진은 실시간으로 처리되며 서버에 영구 저장되지 않습니다
- 업계 표준 암호화를 사용하여 데이터를 보호합니다
- 결제 정보는 결제 처리업체에서 안전하게 처리합니다

4. 제3자 서비스
다음 제3자 서비스를 사용합니다:
- OpenAI: AI 기반 스타일 분석
- Supabase: 인증 및 사용자 관리
- Resend: 트랜잭션 이메일 전송
- Disqus: 댓글 및 커뮤니티 피드백
- Google Analytics: 사용 분석
- Microsoft Clarity: 세션 인사이트
- Google AdSense: 광고
- Formspree: 제휴 문의 접수
- Polar: 결제 처리
- Cloudflare: 호스팅 및 보안

5. 귀하의 권리
귀하는 다음 권리를 갖습니다:
- 개인 데이터 접근
- 데이터 삭제 요청
- 마케팅 커뮤니케이션 수신 거부
- 데이터 사본 요청

6. 쿠키
서비스 제공을 위해 필수 쿠키를 사용합니다. 서비스를 이용함으로써 쿠키 사용에 동의하게 됩니다.

7. 아동 개인정보
저희 서비스는 18세 미만 사용자를 대상으로 하지 않습니다. 아동으로부터 의도적으로 정보를 수집하지 않습니다.

8. 문의
개인정보 관련 문의는 privacy@styleai.com으로 연락해 주세요.
      `,
    },
    refund: {
      title: '환불정책',
      lastUpdated: '최종 수정일: 2026년 2월 5일',
      content: `
1. 디지털 상품의 특성
StyleAI는 구매 즉시 제공되는 디지털 서비스입니다. AI가 생성한 리포트의 즉시 제공 특성으로 인해 제한된 환불 정책을 운영합니다.

2. 환불 대상
다음의 경우 환불 대상이 될 수 있습니다:
- 기술적 문제로 스타일 리포트를 받지 못한 경우
- 서비스가 설명된 내용과 현저히 다른 경우
- 구매 후 24시간 이내에 환불을 요청하고 서비스를 이용하지 않은 경우

3. 환불 불가 사유
다음의 경우 환불이 제공되지 않습니다:
- 이미 스타일 리포트를 받아 확인한 경우
- 구매 후 24시간이 경과한 경우
- 서비스 이용 후 단순 변심인 경우

4. 환불 요청 방법
환불을 요청하려면:
1. refunds@styleai.com으로 이메일 보내기
2. 주문 ID와 환불 요청 사유 포함
3. 영업일 기준 3일 이내에 검토

5. 환불 처리
승인된 환불은 영업일 기준 5-10일 이내에 처리되며 원래 결제 수단으로 환불됩니다.

6. 문의
환불 관련 질문은 refunds@styleai.com으로 연락해 주세요.
      `,
    },
    form: {
      title: '스타일링을 시작해요',
      description: '사진을 업로드하고 정보를 입력하면 맞춤 추천을 받을 수 있어요.',
      uploadPhoto: '사진 업로드',
      gender: '성별',
      male: '남성',
      female: '여성',
      height: '키 (cm)',
      weight: '몸무게 (kg)',
      submit: '스타일 리포트 받기',
      analyzing: '분석 중...',
      aiAnalyzing: 'AI가 스타일을 분석하고 있습니다...',
      generatingHairstyle: '헤어스타일 추천을 생성하고 있습니다...',
    },
    result: {
      title: '스타일 리포트',
      description: '프로필을 기반으로 한 맞춤형 추천입니다.',
      hairstyles: '추천 헤어스타일',
      tryAgain: '다시 분석하기',
      backHome: '홈으로 돌아가기',
      download: '다운로드',
      share: '공유하기',
      copied: '링크가 복사되었습니다!',
      shareTitle: 'StyleAI 스타일 리포트',
      shareText: '나만의 맞춤 스타일 추천을 확인해보세요!',
      email: '이메일',
      emailModalTitle: '이메일로 리포트 받기',
      emailPlaceholder: '이메일 주소를 입력하세요',
      emailSend: '전송',
      emailSending: '전송 중...',
      emailSuccess: '이메일이 전송되었습니다!',
      emailError: '이메일 전송에 실패했습니다. 다시 시도해주세요.',
      emailInvalid: '유효한 이메일 주소를 입력해주세요.',
    },
    emailTest: {
      title: '이메일 기능 테스트',
      description: '테스트 메일을 받을 이메일 주소를 입력하세요',
      button: '테스트 이메일 전송',
      success: '테스트 이메일이 전송되었습니다! 받은 편지함을 확인하세요.',
      error: '테스트 이메일 전송에 실패했습니다.',
    },
    errors: {
      fillAll: '성별, 키, 몸무게를 모두 입력해주세요.',
      apiError: '오류가 발생했습니다: ',
      connectionFailed: '서버 연결에 실패했습니다.',
    },
    paymentSuccess: {
      title: '결제가 완료되었습니다!',
      description: '구매해 주셔서 감사합니다. 이제 프리미엄 스타일 컨설팅을 이용하실 수 있습니다.',
      button: '프리미엄 컨설팅 시작하기',
    },
    auth: {
      login: '로그인',
      signup: '회원가입',
      logout: '로그아웃',
      email: '이메일',
      password: '비밀번호',
      confirmPassword: '비밀번호 확인',
      loginTitle: '다시 오신 것을 환영합니다',
      loginDescription: '스타일 프로필에 접근하려면 로그인하세요',
      signupTitle: '계정 만들기',
      signupDescription: 'StyleAI에 가입하고 맞춤형 패션 추천을 받아보세요',
      noAccount: '계정이 없으신가요?',
      hasAccount: '이미 계정이 있으신가요?',
      forgotPassword: '비밀번호를 잊으셨나요?',
      orContinueWith: '또는 다음으로 계속',
      google: 'Google',
      loginSuccess: '로그인되었습니다!',
      signupSuccess: '계정이 생성되었습니다! 이메일을 확인해주세요.',
      logoutSuccess: '로그아웃되었습니다!',
      errorEmailRequired: '이메일을 입력해주세요',
      errorPasswordRequired: '비밀번호를 입력해주세요',
      errorPasswordMismatch: '비밀번호가 일치하지 않습니다',
      errorPasswordLength: '비밀번호는 최소 6자 이상이어야 합니다',
      errorInvalidEmail: '유효하지 않은 이메일 주소입니다',
      forgotPasswordTitle: '비밀번호 찾기',
      forgotPasswordDesc: '이메일을 입력하시면 재설정 링크를 보내드립니다.',
      sendResetLink: '재설정 링크 보내기',
      resetLinkSent: '비밀번호 재설정 링크가 전송되었습니다! 이메일을 확인해주세요.',
      resetPasswordTitle: '비밀번호 재설정',
      resetPasswordDesc: '새 비밀번호를 입력하세요.',
      resetPassword: '비밀번호 재설정',
      passwordResetSuccess: '비밀번호가 재설정되었습니다! 이제 로그인할 수 있습니다.',
      backToLogin: '로그인으로 돌아가기',
    },
    mypage: {
      title: '마이페이지',
      accountInfo: '계정 정보',
      email: '이메일',
      createdAt: '가입일',
      provider: '로그인 방식',
      changePassword: '비밀번호 변경',
      currentPassword: '현재 비밀번호',
      newPassword: '새 비밀번호',
      confirmNewPassword: '새 비밀번호 확인',
      updatePassword: '비밀번호 변경',
      passwordUpdated: '비밀번호가 변경되었습니다!',
      deleteAccount: '회원 탈퇴',
      deleteWarning: '이 작업은 취소할 수 없습니다. 모든 데이터가 영구적으로 삭제됩니다.',
      deleteConfirm: '정말로 계정을 삭제하시겠습니까?',
      typeToConfirm: '확인을 위해 "삭제"를 입력하세요',
      delete: '계정 삭제',
      accountDeleted: '계정이 삭제되었습니다.',
      errorCurrentPassword: '현재 비밀번호를 입력해주세요',
      errorDeleteConfirm: '확인을 위해 삭제를 입력해주세요',
    },
    subscription: {
      title: 'StyleAI Daily 프리미엄',
      subtitle: '매일 아침, 당신만을 위한 AI 스타일리스트',
      description: '당신만을 위한 맞춤형 패션 추천으로 매일 아침을 시작하세요!',
      features: {
        daily: '매일 스타일 추천',
        dailyDesc: '체형과 오늘 날씨를 고려한 맞춤형 코디 제안',
        weather: '날씨 기반 패션',
        weatherDesc: '실시간 날씨 정보를 반영한 스타일링',
        personalized: '나만의 맞춤형',
        personalizedDesc: '당신의 프로필 기반 개인화 추천',
      },
      pricing: {
        price: '₩9,900',
        period: '/월',
        trial: '7일 무료 체험',
        trialDesc: '7일간 무료로 체험하고, 언제든 취소 가능',
        perDay: '하루 ₩330 미만',
      },
      cta: '무료 체험 시작하기',
      ctaLoggedOut: '로그인하고 구독하기',
      benefits: {
        cancel: '언제든 취소 가능',
        noCharge: '체험 기간 중 결제 없음',
        refund: '100% 만족 보장',
      },
      success: {
        title: '프리미엄에 오신 것을 환영합니다!',
        description: '7일 무료 체험이 시작되었습니다. 매일 아침 맞춤형 스타일 추천을 받아보세요!',
        button: '프로필 설정하기',
      },
    },
  },
}

function PartnershipForm({ t }: { t: typeof translations.en }) {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormStatus('submitting')

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch('https://formspree.io/f/mgozzbvp', {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.ok) {
        setFormStatus('success')
        form.reset()
      } else {
        setFormStatus('error')
      }
    } catch {
      setFormStatus('error')
    }
  }

  if (formStatus === 'success') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-green-500 text-[32px]">check_circle</span>
        </div>
        <p className="text-white/80 text-lg">{t.partnership.success}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-white/60 text-sm mb-2">{t.partnership.companyName}</label>
        <input
          type="text"
          name="company"
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2">{t.partnership.contactName}</label>
        <input
          type="text"
          name="name"
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2">{t.partnership.email}</label>
        <input
          type="email"
          name="email"
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2">{t.partnership.phone}</label>
        <input
          type="tel"
          name="phone"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2">{t.partnership.message}</label>
        <textarea
          name="message"
          required
          rows={5}
          placeholder={t.partnership.messagePlaceholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors resize-none"
        />
      </div>

      {formStatus === 'error' && (
        <p className="text-red-400 text-sm">{t.partnership.error}</p>
      )}

      <button
        type="submit"
        disabled={formStatus === 'submitting'}
        className="w-full flex items-center justify-center rounded-xl h-14 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {formStatus === 'submitting' ? t.partnership.submitting : t.partnership.submit}
      </button>
    </form>
  )
}

function DisqusComments({ pageIdentifier, pageUrl }: { pageIdentifier: string; pageUrl?: string }) {
  useEffect(() => {
    const disqusScript = document.getElementById('disqus-script')
    if (disqusScript) {
      disqusScript.remove()
    }

    const disqusThread = document.getElementById('disqus_thread')
    if (disqusThread) {
      disqusThread.innerHTML = ''
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).disqus_config = function (this: any) {
      this.page = this.page || {}
      this.page.url = pageUrl || window.location.href
      this.page.identifier = pageIdentifier
    }

    const script = document.createElement('script')
    script.id = 'disqus-script'
    script.src = 'https://jpersonalstylist.disqus.com/embed.js'
    script.setAttribute('data-timestamp', String(+new Date()))
    script.async = true
    document.body.appendChild(script)

    return () => {
      const scriptToRemove = document.getElementById('disqus-script')
      if (scriptToRemove) {
        scriptToRemove.remove()
      }
    }
  }, [pageIdentifier, pageUrl])

  return (
    <div className="bg-white/5 rounded-2xl p-6 lg:p-8">
      <div id="disqus_thread" />
      <noscript>
        Please enable JavaScript to view the{' '}
        <a href="https://disqus.com/?ref_noscript" className="text-primary hover:underline">
          comments powered by Disqus.
        </a>
      </noscript>
    </div>
  )
}

interface AnimalTestPageProps {
  t: typeof translations.en
  lang: Language
  navigateTo: (page: Page) => void
  LanguageSelector: () => React.ReactNode
}

function AnimalTestPage({ t, lang, navigateTo, LanguageSelector }: AnimalTestPageProps) {
  const [testPhoto, setTestPhoto] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<{ className: string; probability: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null)

  const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/VYFZTB2fH/'

  useEffect(() => {
    // Load TensorFlow.js and Teachable Machine library
    const loadScripts = async () => {
      try {
        // Check if already loaded
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).tmImage) {
          setScriptsLoaded(true)
          return
        }

        if (!document.getElementById('tf-script')) {
          const tfScript = document.createElement('script')
          tfScript.id = 'tf-script'
          tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js'
          document.head.appendChild(tfScript)
          await new Promise((resolve, reject) => {
            tfScript.onload = resolve
            tfScript.onerror = reject
          })
        }

        if (!document.getElementById('tm-script')) {
          const tmScript = document.createElement('script')
          tmScript.id = 'tm-script'
          tmScript.src = 'https://cdn.jsdelivr.net/npm/@teachablemachine/image@latest/dist/teachablemachine-image.min.js'
          document.head.appendChild(tmScript)
          await new Promise((resolve, reject) => {
            tmScript.onload = resolve
            tmScript.onerror = reject
          })
        }

        setScriptsLoaded(true)
      } catch (err) {
        console.error('Failed to load scripts:', err)
        setError(lang === 'ko' ? 'AI 라이브러리 로딩에 실패했습니다.' : 'Failed to load AI library.')
      }
    }

    loadScripts()
  }, [lang])

  const loadModel = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tmImage = (window as any).tmImage
    if (!tmImage) {
      throw new Error('Teachable Machine library not loaded')
    }

    const modelURL = MODEL_URL + 'model.json'
    const metadataURL = MODEL_URL + 'metadata.json'

    const model = await tmImage.load(modelURL, metadataURL)
    return model
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setError(null)
      setImageLoaded(false)
      const reader = new FileReader()
      reader.onloadend = () => {
        setTestPhoto(reader.result as string)
        setResult(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const analyzeImage = async () => {
    if (!testPhoto || !imageRef.current || !imageLoaded) return

    setAnalyzing(true)
    setError(null)
    try {
      if (!modelRef.current) {
        modelRef.current = await loadModel()
      }

      if (!modelRef.current) {
        throw new Error('Failed to load model')
      }

      const predictions = await modelRef.current.predict(imageRef.current)

      // Find the highest probability prediction
      const topPrediction = predictions.reduce((prev: { probability: number }, curr: { probability: number }) =>
        prev.probability > curr.probability ? prev : curr
      )

      setResult({
        className: topPrediction.className,
        probability: topPrediction.probability
      })
    } catch (err) {
      console.error('Analysis failed:', err)
      setError(lang === 'ko' ? '분석에 실패했습니다. 다시 시도해주세요.' : 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setTestPhoto(null)
    setResult(null)
  }

  const getAnimalEmoji = (className: string) => {
    const lower = className.toLowerCase()
    if (lower.includes('dog') || lower.includes('강아지')) return '🐶'
    if (lower.includes('cat') || lower.includes('고양이')) return '🐱'
    return '🐾'
  }

  const getAnimalName = (className: string) => {
    const lower = className.toLowerCase()
    if (lower.includes('dog') || lower.includes('강아지')) return t.animalTest.dog
    if (lower.includes('cat') || lower.includes('고양이')) return t.animalTest.cat
    return className
  }

  const getAnimalDesc = (className: string) => {
    const lower = className.toLowerCase()
    if (lower.includes('dog') || lower.includes('강아지')) return t.animalTest.dogDesc
    if (lower.includes('cat') || lower.includes('고양이')) return t.animalTest.catDesc
    return ''
  }

  return (
    <div className="bg-background-dark text-white font-display min-h-screen">
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
        <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
          <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h2 className="text-white text-xl font-extrabold tracking-tight">
            Style<span className="text-primary text-2xl">AI</span>
          </h2>
          <LanguageSelector />
        </div>
      </nav>

      <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-5xl">🐶</span>
            <span className="text-5xl">🐱</span>
          </div>
          <h1 className="text-white text-3xl lg:text-4xl font-bold mb-2">{t.animalTest.title}</h1>
          <p className="text-white/60 lg:text-lg">{t.animalTest.description}</p>
        </div>

        {!result ? (
          <div className="space-y-6">
            {/* Photo Upload */}
            <div
              className="relative w-full h-72 lg:h-96 border-2 border-dashed border-amber-500/50 rounded-2xl cursor-pointer overflow-hidden hover:border-amber-500 transition-colors bg-gradient-to-br from-amber-500/5 to-orange-500/5"
              onClick={() => fileInputRef.current?.click()}
            >
              {testPhoto ? (
                <img
                  ref={imageRef}
                  src={testPhoto}
                  alt="Test"
                  className="w-full h-full object-cover"
                  onLoad={handleImageLoad}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-white/50">
                  <span className="material-symbols-outlined text-[64px] text-amber-500">add_a_photo</span>
                  <span className="text-lg">{t.animalTest.uploadPhoto}</span>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                hidden
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Loading Status */}
            {!scriptsLoaded && (
              <div className="text-center text-white/60 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                  {lang === 'ko' ? 'AI 모델 로딩 중...' : 'Loading AI model...'}
                </div>
              </div>
            )}

            {/* Analyze Button */}
            {testPhoto && (
              <button
                onClick={analyzeImage}
                disabled={analyzing || !scriptsLoaded || !imageLoaded}
                className="w-full flex items-center justify-center rounded-xl h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.animalTest.analyzing}
                  </div>
                ) : !imageLoaded ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {lang === 'ko' ? '이미지 로딩 중...' : 'Loading image...'}
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined mr-2">pets</span>
                    {lang === 'ko' ? '분석하기' : 'Analyze'}
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Result Card */}
            <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-8 text-center">
              <div className="text-8xl mb-4">{getAnimalEmoji(result.className)}</div>
              <p className="text-white/60 text-sm mb-2">{t.animalTest.result}</p>
              <h2 className="text-white text-3xl lg:text-4xl font-bold mb-4">{getAnimalName(result.className)}</h2>
              <p className="text-white/70 mb-6">{getAnimalDesc(result.className)}</p>

              {/* Confidence Bar */}
              <div className="max-w-xs mx-auto">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">{t.animalTest.confidence}</span>
                  <span className="text-amber-400 font-bold">{Math.round(result.probability * 100)}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${result.probability * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Photo Preview */}
            {testPhoto && (
              <div className="rounded-2xl overflow-hidden">
                <img src={testPhoto} alt="Your photo" className="w-full h-64 object-cover" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center rounded-xl h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold tracking-tight hover:brightness-110 transition-all"
              >
                <span className="material-symbols-outlined mr-2">refresh</span>
                {t.animalTest.tryAgain}
              </button>
              <button
                onClick={() => navigateTo('landing')}
                className="flex-1 flex items-center justify-center rounded-xl h-14 bg-white/5 border border-white/10 text-white text-lg font-medium tracking-tight hover:bg-white/10 transition-all"
              >
                {t.animalTest.backToResult}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/'
  const page = routeToPage[normalizedPath] || 'landing'

  const navigateTo = (nextPage: Page, replace = false) => {
    const path = pageRoutes[nextPage]
    navigate(path, { replace })
  }

  const [lang, setLang] = useState<Language>('ko')
  const [photo, setPhoto] = useState<string | null>(null)
  const [gender, setGender] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [report, setReport] = useState('')
  const [hairstyleImage, setHairstyleImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showCopied, setShowCopied] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isTestEmail, setIsTestEmail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  // Auth states
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Mypage states
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [mypageError, setMypageError] = useState('')
  const [mypageSuccess, setMypageSuccess] = useState('')
  const antiBotTokenRef = useRef<{ token: string; expiresAt: number } | null>(null)

  const t = translations[lang]

  useEffect(() => {
    if (!routeToPage[normalizedPath]) {
      navigateTo('landing', true)
    }
  }, [normalizedPath])

  // Check auth state on load
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // Handle password recovery
      if (event === 'PASSWORD_RECOVERY') {
        navigateTo('reset-password')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check for payment/subscription success on load
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const legacyPage = params.get('page') as Page | null
    if (legacyPage && pageRoutes[legacyPage]) {
      navigateTo(legacyPage, true)
      return
    }
    if (params.get('payment') === 'success') {
      navigateTo('payment-success', true)
    }
    if (params.get('subscription') === 'success') {
      navigateTo('subscription-success', true)
    }
  }, [location.search])

  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'ko' : 'en')
    setShowLangMenu(false)
  }

  const getAntiBotToken = async () => {
    const cached = antiBotTokenRef.current
    if (cached && cached.expiresAt > Date.now() + 30_000) {
      return cached.token
    }

    try {
      const response = await fetch('/api/request-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (!response.ok) {
        return null
      }
      if (data?.disabled) {
        antiBotTokenRef.current = { token: '', expiresAt: Date.now() + 5 * 60_000 }
        return ''
      }
      if (!data?.token || !data?.expiresAt) {
        return null
      }
      antiBotTokenRef.current = { token: data.token, expiresAt: data.expiresAt }
      return data.token as string
    } catch {
      return null
    }
  }

  // Auth handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')

    if (!authEmail) {
      setAuthError(t.auth.errorEmailRequired)
      return
    }
    if (!authPassword) {
      setAuthError(t.auth.errorPasswordRequired)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })

    if (error) {
      setAuthError(error.message)
    } else {
      setAuthEmail('')
      setAuthPassword('')
      navigateTo('landing')
    }
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')

    if (!authEmail) {
      setAuthError(t.auth.errorEmailRequired)
      return
    }
    if (!authPassword) {
      setAuthError(t.auth.errorPasswordRequired)
      return
    }
    if (authPassword.length < 6) {
      setAuthError(t.auth.errorPasswordLength)
      return
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError(t.auth.errorPasswordMismatch)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    })

    if (error) {
      setAuthError(error.message)
    } else {
      alert(t.auth.signupSuccess)
      setAuthEmail('')
      setAuthPassword('')
      setAuthConfirmPassword('')
      navigateTo('login')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowUserMenu(false)
    navigateTo('landing')
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      setAuthError(error.message)
    }
  }

  // Forgot password handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')

    if (!authEmail) {
      setAuthError(t.auth.errorEmailRequired)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: `${window.location.origin}`,
    })

    if (error) {
      setAuthError(error.message)
    } else {
      alert(t.auth.resetLinkSent)
      setAuthEmail('')
      navigateTo('login')
    }
    setLoading(false)
  }

  // Reset password handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')

    if (!authPassword) {
      setAuthError(t.auth.errorPasswordRequired)
      return
    }
    if (authPassword.length < 6) {
      setAuthError(t.auth.errorPasswordLength)
      return
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError(t.auth.errorPasswordMismatch)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: authPassword,
    })

    if (error) {
      setAuthError(error.message)
    } else {
      alert(t.auth.passwordResetSuccess)
      setAuthPassword('')
      setAuthConfirmPassword('')
      navigateTo('landing')
    }
    setLoading(false)
  }

  // Mypage handlers
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMypageError('')
    setMypageSuccess('')

    if (!newPassword) {
      setMypageError(t.auth.errorPasswordRequired)
      return
    }
    if (newPassword.length < 6) {
      setMypageError(t.auth.errorPasswordLength)
      return
    }
    if (newPassword !== confirmNewPassword) {
      setMypageError(t.auth.errorPasswordMismatch)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setMypageError(error.message)
    } else {
      setMypageSuccess(t.mypage.passwordUpdated)
      setNewPassword('')
      setConfirmNewPassword('')
    }
    setLoading(false)
  }

  const handleDeleteAccount = async () => {
    const confirmText = lang === 'ko' ? '삭제' : 'DELETE'
    if (deleteConfirmText !== confirmText) {
      setMypageError(t.mypage.errorDeleteConfirm)
      return
    }

    setLoading(true)
    setMypageError('')

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setMypageError('Session expired. Please login again.')
        setLoading(false)
        return
      }

      // Call delete account API
      const antiBotToken = await getAntiBotToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }
      if (antiBotToken) {
        headers['X-AntiBot-Token'] = antiBotToken
      }
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        setMypageError(data.error || 'Failed to delete account')
        setLoading(false)
        return
      }

      // Sign out after successful deletion
      await supabase.auth.signOut()
      alert(t.mypage.accountDeleted)
      navigateTo('landing')
    } catch (err) {
      setMypageError('An error occurred while deleting account')
    }
    setLoading(false)
  }

  // Subscription handler
  const handleSubscribe = async () => {
    if (!user) {
      navigateTo('login')
      return
    }

    setLoading(true)
    try {
      const antiBotToken = await getAntiBotToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (antiBotToken) {
        headers['X-AntiBot-Token'] = antiBotToken
      }
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          origin: window.location.origin,
          userId: user.id,
          email: user.email,
        }),
      })

      const data = await response.json()

      if (data.error) {
        alert(lang === 'ko' ? '구독 오류: ' + data.error : 'Subscription error: ' + data.error)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      alert(lang === 'ko' ? '서버 연결에 실패했습니다.' : 'Failed to connect to server.')
    } finally {
      setLoading(false)
    }
  }

  const goToMypage = () => {
    setShowUserMenu(false)
    setMypageError('')
    setMypageSuccess('')
    setNewPassword('')
    setConfirmNewPassword('')
    setDeleteConfirmText('')
    navigateTo('mypage')
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhoto(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!gender || !height || !weight) {
      alert(t.errors.fillAll)
      return
    }

    setLoading(true)
    setReport('')
    setHairstyleImage(null)

    try {
      const antiBotToken = await getAntiBotToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (antiBotToken) {
        headers['X-AntiBot-Token'] = antiBotToken
      }
      const response = await fetch('/api/consult', {
        method: 'POST',
        headers,
        body: JSON.stringify({ photo, gender, height, weight }),
      })

      const data = await response.json()

      if (data.error) {
        alert(t.errors.apiError + data.error)
      } else {
        setReport(data.report)
        if (data.hairstyleImage) {
          setHairstyleImage(data.hairstyleImage)
        }
        navigateTo('result')
      }
    } catch {
      alert(t.errors.connectionFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setReport('')
    setHairstyleImage(null)
    navigateTo('form')
  }

  const handleDownload = async () => {
    if (!resultRef.current) return

    try {
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
      })

      const link = document.createElement('a')
      link.download = `style-report-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: t.result.shareTitle,
      text: t.result.shareText,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        // User cancelled or share failed, fallback to copy
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailAddress || !emailRegex.test(emailAddress)) {
      setEmailStatus('error')
      return
    }

    setEmailSending(true)
    setEmailStatus('idle')

    try {
      const antiBotToken = await getAntiBotToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (antiBotToken) {
        headers['X-AntiBot-Token'] = antiBotToken
      }
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: emailAddress,
          report: report,
          hairstyleImage: hairstyleImage,
          lang: lang,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setEmailStatus('success')
        setTimeout(() => {
          setShowEmailModal(false)
          setEmailAddress('')
          setEmailStatus('idle')
        }, 2000)
      } else {
        setEmailStatus('error')
      }
    } catch (error) {
      console.error('Email send failed:', error)
      setEmailStatus('error')
    } finally {
      setEmailSending(false)
    }
  }

  const handleSendTestEmail = async () => {
    // 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailAddress || !emailRegex.test(emailAddress)) {
      setEmailStatus('error')
      return
    }

    setEmailSending(true)
    setEmailStatus('idle')

    const testReport = lang === 'ko'
      ? `**테스트 이메일입니다**

이 이메일은 StyleAI의 이메일 기능 테스트를 위해 전송되었습니다.

**이메일 기능이 정상적으로 동작합니다!**

- 스타일 분석 결과를 이메일로 받을 수 있습니다
- 분석 후 결과 페이지에서 이메일 버튼을 클릭하세요
- 이메일 주소를 입력하면 스타일 리포트가 전송됩니다

StyleAI를 이용해 주셔서 감사합니다!`
      : `**This is a test email**

This email was sent to test StyleAI's email functionality.

**Email feature is working correctly!**

- You can receive style analysis results via email
- Click the email button on the results page after analysis
- Enter your email address to receive your style report

Thank you for using StyleAI!`

    try {
      const antiBotToken = await getAntiBotToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (antiBotToken) {
        headers['X-AntiBot-Token'] = antiBotToken
      }
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: emailAddress,
          report: testReport,
          hairstyleImage: null,
          lang: lang,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setEmailStatus('success')
        setTimeout(() => {
          setShowEmailModal(false)
          setEmailAddress('')
          setEmailStatus('idle')
        }, 3000)
      } else {
        setEmailStatus('error')
      }
    } catch (error) {
      console.error('Test email send failed:', error)
      setEmailStatus('error')
    } finally {
      setEmailSending(false)
    }
  }

  // Language Selector Component
  const LanguageSelector = () => (
    <div className="relative">
      <button
        onClick={() => setShowLangMenu(!showLangMenu)}
        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
      >
        <span className="material-symbols-outlined text-[18px]">language</span>
        <span className="hidden sm:inline">{lang === 'en' ? 'EN' : '한국어'}</span>
      </button>
      {showLangMenu && (
        <div className="absolute right-0 top-12 bg-background-dark border border-white/10 rounded-lg overflow-hidden shadow-xl z-50">
          <button
            onClick={() => { setLang('en'); setShowLangMenu(false) }}
            className={`w-full px-4 py-2 text-left hover:bg-white/10 ${lang === 'en' ? 'text-primary' : 'text-white'}`}
          >
            English
          </button>
          <button
            onClick={() => { setLang('ko'); setShowLangMenu(false) }}
            className={`w-full px-4 py-2 text-left hover:bg-white/10 ${lang === 'ko' ? 'text-primary' : 'text-white'}`}
          >
            한국어
          </button>
        </div>
      )}
    </div>
  )

  // Landing Page
  if (page === 'landing') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen relative overflow-hidden">
        {/* Subtle Gradient Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 tech-grid" />
          <div className="absolute top-0 left-0 w-[520px] h-[520px] rounded-full bg-primary/12 blur-[160px]" />
          <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-secondary/12 blur-[140px]" />
        </div>
        {/* Top Navigation */}
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="material-symbols-outlined text-primary text-[28px]">menu</span>
            </div>
            <div className="hidden lg:flex items-center gap-8">
              <a href="#" className="text-white/60 hover:text-white transition-colors">{t.nav.home}</a>
              <a href="#" className="text-white/60 hover:text-white transition-colors">{t.nav.browse}</a>
              <a href="#" className="text-white/60 hover:text-white transition-colors">{t.nav.saved}</a>
            </div>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              {authLoading ? (
                <div className="w-10 h-10 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center justify-center rounded-full h-10 w-10 bg-primary/20 hover:bg-primary/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-primary text-[24px]">person</span>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-12 bg-background-dark border border-white/10 rounded-lg overflow-hidden shadow-xl z-50 min-w-[200px]">
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-white/60 text-xs">{t.auth.email}</p>
                        <p className="text-white text-sm truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={goToMypage}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[20px]">person</span>
                        {t.mypage.title}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-left text-red-400 hover:bg-white/10 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        {t.auth.logout}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => navigateTo('login')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors text-primary font-medium text-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span className="hidden sm:inline">{t.auth.login}</span>
                </button>
              )}
            </div>
          </div>
        </nav>

        <main className="relative z-10 pt-16 max-w-6xl mx-auto pb-24 lg:pb-12">
          {/* Hero Section */}
          <section className="relative min-h-[80vh] lg:min-h-[90vh] flex flex-col lg:flex-row lg:items-center px-6">
            {/* Content */}
            <div className="relative z-10 flex flex-col gap-4 lg:w-1/2 lg:pr-8 py-12 lg:py-20">
              <span className="text-primary font-bold tracking-widest text-xs uppercase">{t.hero.tagline}</span>
              <h1 className="text-white text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight tracking-[-0.03em]">
                {t.hero.title1} <br />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {t.hero.title2}
                </span>
              </h1>
              <p className="text-white/80 text-lg lg:text-xl font-light leading-relaxed max-w-[400px]">
                {t.hero.description}
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigateTo('form')}
                  className="flex items-center justify-center rounded-xl h-14 px-8 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  {t.hero.cta}
                </button>
              </div>
            </div>

            {/* Hero Image */}
            <div className="lg:w-1/2 flex justify-center items-center py-8 lg:py-0">
              <img
                src="/hero-image.png"
                alt="AI Personal Stylist"
                className="w-full max-w-[500px] lg:max-w-none lg:w-full h-auto rounded-2xl shadow-2xl shadow-primary/10"
              />
            </div>
          </section>

          {/* Powered By */}
          <div className="px-6 py-6 border-y border-white/5 bg-background-dark/50 flex justify-center items-center gap-4">
            <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
            <span className="text-sm font-medium text-white/60">{t.social.poweredBy}</span>
          </div>

          {/* Features Section */}
          <section className="px-6 py-16 lg:py-24 flex flex-col gap-12">
            <div className="flex flex-col gap-4 max-w-2xl mx-auto text-center lg:text-left lg:mx-0">
              <h2 className="text-white text-3xl lg:text-4xl font-bold leading-tight tracking-tight">{t.features.title}</h2>
              <p className="text-white/60 text-base lg:text-lg font-normal leading-relaxed">
                {t.features.description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="flex gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/[0.08] transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <span className="material-symbols-outlined text-[28px]">body_system</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-white text-lg font-bold">{t.features.bodyAnalysis}</h3>
                  <p className="text-white/50 text-sm leading-normal">{t.features.bodyAnalysisDesc}</p>
                </div>
              </div>
              <div className="flex gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/[0.08] transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <span className="material-symbols-outlined text-[28px]">apparel</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-white text-lg font-bold">{t.features.personalizedFits}</h3>
                  <p className="text-white/50 text-sm leading-normal">{t.features.personalizedFitsDesc}</p>
                </div>
              </div>
              <div className="flex gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/[0.08] transition-colors md:col-span-2 lg:col-span-1">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-white text-lg font-bold">{t.features.styleDiscovery}</h3>
                  <p className="text-white/50 text-sm leading-normal">{t.features.styleDiscoveryDesc}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Timeline Section */}
          <section className="bg-white/[0.02] py-16 lg:py-24 border-y border-white/5">
            <h2 className="text-white text-3xl lg:text-4xl font-bold tracking-tight px-6 pb-12 text-center">{t.process.title}</h2>
            <div className="grid grid-cols-[60px_1fr] lg:grid-cols-3 gap-x-2 lg:gap-8 px-8 max-w-4xl mx-auto">
              {/* Step 1 */}
              <div className="flex flex-col items-center gap-1 lg:items-center">
                <div className="flex h-10 w-10 lg:h-16 lg:w-16 items-center justify-center rounded-full bg-primary text-background-dark">
                  <span className="material-symbols-outlined text-[20px] lg:text-[28px] font-bold">photo_camera</span>
                </div>
                <div className="w-[2px] bg-primary/30 h-16 grow lg:hidden" />
              </div>
              <div className="flex flex-1 flex-col pt-1 pb-10 lg:text-center lg:pb-0">
                <p className="text-white text-lg font-bold leading-none mb-2">{t.process.step1}</p>
                <p className="text-white/50 text-sm leading-relaxed">{t.process.step1Desc}</p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center gap-1 lg:items-center">
                <div className="flex h-10 w-10 lg:h-16 lg:w-16 items-center justify-center rounded-full bg-primary text-background-dark">
                  <span className="material-symbols-outlined text-[20px] lg:text-[28px] font-bold">memory</span>
                </div>
                <div className="w-[2px] bg-primary/30 h-16 grow lg:hidden" />
              </div>
              <div className="flex flex-1 flex-col pt-1 pb-10 lg:text-center lg:pb-0">
                <p className="text-white text-lg font-bold leading-none mb-2">{t.process.step2}</p>
                <p className="text-white/50 text-sm leading-relaxed">{t.process.step2Desc}</p>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center gap-1 lg:items-center">
                <div className="flex h-10 w-10 lg:h-16 lg:w-16 items-center justify-center rounded-full bg-primary text-background-dark">
                  <span className="material-symbols-outlined text-[20px] lg:text-[28px] font-bold">check_circle</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col pt-1 lg:text-center">
                <p className="text-white text-lg font-bold leading-none mb-2">{t.process.step3}</p>
                <p className="text-white/50 text-sm leading-relaxed">{t.process.step3Desc}</p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-6 py-20 lg:py-32 text-center flex flex-col gap-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-white text-3xl lg:text-5xl font-black">{t.cta.title}</h2>
              <p className="text-white/60 lg:text-lg">{t.cta.description}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={() => navigateTo('form')}
                  className="w-full sm:w-auto flex items-center justify-center rounded-xl h-14 px-12 bg-white/10 border border-white/20 text-white text-lg font-bold tracking-tight hover:bg-white/20 transition-all"
                >
                  {t.cta.button}
                </button>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{t.cta.note}</p>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={() => navigateTo('subscription')}
                  className="w-full sm:w-auto flex items-center justify-center rounded-xl h-14 px-12 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined mr-2">workspace_premium</span>
                  {t.cta.premiumButton}
                </button>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{t.subscription.pricing.trial}</p>
              </div>
            </div>
          </section>

          {/* Email Test Section */}
          <section className="px-6 py-16 max-w-md mx-auto">
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-6 text-center">
              <span className="material-symbols-outlined text-primary text-4xl mb-4">mail</span>
              <h3 className="text-white text-xl font-bold mb-2">{t.emailTest.title}</h3>
              <p className="text-white/60 text-sm mb-4">{t.emailTest.description}</p>
              <button
                onClick={() => {
                  setIsTestEmail(true)
                  setShowEmailModal(true)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-primary text-background-dark font-bold hover:brightness-110 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
                {t.emailTest.button}
              </button>
            </div>
          </section>

          {/* Comments Section */}
          <section className="px-6 py-16 max-w-4xl mx-auto">
            <h2 className="text-white text-2xl lg:text-3xl font-extrabold tracking-tight text-center mb-8">
              {lang === 'ko' ? '댓글' : 'Comments'}
            </h2>
            <DisqusComments pageIdentifier="landing" />
          </section>

          {/* Footer */}
          <footer className="p-10 border-t border-white/5 text-center">
            <div className="flex justify-center gap-6 mb-6 text-white/40">
              <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors">share</span>
              <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors">language</span>
              <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors">mail</span>
            </div>
            <div className="flex justify-center gap-6 mb-6 text-sm flex-wrap">
              <button onClick={() => navigateTo('about')} className="text-white/40 hover:text-white transition-colors">{t.footer.about}</button>
              <button onClick={() => navigateTo('faq')} className="text-white/40 hover:text-white transition-colors">{t.footer.faq}</button>
              <button onClick={() => navigateTo('terms')} className="text-white/40 hover:text-white transition-colors">{t.footer.terms}</button>
              <button onClick={() => navigateTo('privacy')} className="text-white/40 hover:text-white transition-colors">{t.footer.privacy}</button>
              <button onClick={() => navigateTo('refund')} className="text-white/40 hover:text-white transition-colors">{t.footer.refund}</button>
              <button onClick={() => navigateTo('partnership')} className="text-white/40 hover:text-white transition-colors">{t.footer.partnership}</button>
            </div>
            <p className="text-white/20 text-xs tracking-wider">{t.footer.copyright}</p>
          </footer>
        </main>

        {/* Bottom Tab Bar - Mobile Only */}
        <div className="fixed bottom-0 w-full glass border-t border-white/10 pb-8 pt-3 px-6 z-50 lg:hidden">
          <div className="flex justify-between items-center max-w-lg mx-auto">
            <div className="flex flex-col items-center text-primary">
              <span className="material-symbols-outlined">home</span>
              <span className="text-[10px] font-bold mt-1 uppercase">{t.nav.home}</span>
            </div>
            <div className="flex flex-col items-center text-white/40">
              <span className="material-symbols-outlined">search</span>
              <span className="text-[10px] font-bold mt-1 uppercase">{t.nav.browse}</span>
            </div>
            <div className="flex flex-col items-center text-white/40">
              <span className="material-symbols-outlined">bookmark</span>
              <span className="text-[10px] font-bold mt-1 uppercase">{t.nav.saved}</span>
            </div>
            <div className="flex flex-col items-center text-white/40" onClick={toggleLanguage}>
              <span className="material-symbols-outlined">language</span>
              <span className="text-[10px] font-bold mt-1 uppercase">{lang === 'en' ? 'EN' : '한국어'}</span>
            </div>
          </div>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-background-dark border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-xl font-bold">
                  {isTestEmail ? t.emailTest.title : t.result.emailModalTitle}
                </h3>
                <button
                  onClick={() => {
                    setShowEmailModal(false)
                    setEmailAddress('')
                    setEmailStatus('idle')
                    setIsTestEmail(false)
                  }}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => {
                    setEmailAddress(e.target.value)
                    setEmailStatus('idle')
                  }}
                  placeholder={t.result.emailPlaceholder}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary/50 transition-colors"
                  disabled={emailSending}
                />

                {emailStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {isTestEmail ? t.emailTest.success : t.result.emailSuccess}
                  </div>
                )}

                {emailStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)
                      ? t.result.emailInvalid
                      : (isTestEmail ? t.emailTest.error : t.result.emailError)}
                  </div>
                )}

                <button
                  onClick={isTestEmail ? handleSendTestEmail : handleSendEmail}
                  disabled={emailSending || !emailAddress}
                  className="w-full py-3 rounded-xl bg-primary text-background-dark font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {emailSending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      {t.result.emailSending}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">send</span>
                      {t.result.emailSend}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Form Page
  if (page === 'form') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        {/* Top Navigation */}
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-white text-3xl lg:text-4xl font-bold mb-2">{t.form.title}</h1>
            <p className="text-white/60 lg:text-lg">{t.form.description}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
            {/* Photo Upload */}
            <div className="lg:w-1/2">
              <div
                className="relative w-full h-64 lg:h-80 border-2 border-dashed border-primary/50 rounded-2xl cursor-pointer overflow-hidden hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {photo ? (
                  <img src={photo} alt="Uploaded" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-white/50">
                    <span className="material-symbols-outlined text-[48px] lg:text-[64px] text-primary">add_a_photo</span>
                    <span className="text-sm lg:text-base">{t.form.uploadPhoto}</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  hidden
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="lg:w-1/2 flex flex-col gap-6">
              {/* Gender Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.form.gender}</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      gender === 'male'
                        ? 'bg-primary text-background-dark'
                        : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {t.form.male}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      gender === 'female'
                        ? 'bg-primary text-background-dark'
                        : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {t.form.female}
                  </button>
                </div>
              </div>

              {/* Height */}
              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.form.height}</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="170"
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Weight */}
              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.form.weight}</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="65"
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl h-14 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                    {t.form.analyzing}
                  </div>
                ) : (
                  t.form.submit
                )}
              </button>

              {loading && (
                <div className="text-center">
                  <p className="text-white/60 text-sm">{t.form.aiAnalyzing}</p>
                  {photo && <p className="text-white/40 text-xs mt-2">{t.form.generatingHairstyle}</p>}
                </div>
              )}
            </div>
          </form>
        </main>
      </div>
    )
  }

  // Policy Page Component
  const PolicyPage = ({ title, lastUpdated, content }: { title: string; lastUpdated: string; content: string }) => (
    <div className="bg-background-dark text-white font-display min-h-screen">
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
        <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
          <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h2 className="text-white text-xl font-extrabold tracking-tight">
            Style<span className="text-primary text-2xl">AI</span>
          </h2>
          <LanguageSelector />
        </div>
      </nav>

      <main className="pt-24 pb-12 px-6 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-white text-3xl lg:text-4xl font-bold mb-2">{title}</h1>
          <p className="text-white/40 text-sm">{lastUpdated}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <div className="prose prose-invert max-w-none">
            {content.trim().split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-white/70 text-sm leading-relaxed mb-4 whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigateTo('landing')}
            className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white font-medium"
          >
            {t.result.backHome}
          </button>
        </div>
      </main>
    </div>
  )

  // Terms of Service Page
  if (page === 'terms') {
    return <PolicyPage title={t.terms.title} lastUpdated={t.terms.lastUpdated} content={t.terms.content} />
  }

  // Privacy Policy Page
  if (page === 'privacy') {
    return <PolicyPage title={t.privacy.title} lastUpdated={t.privacy.lastUpdated} content={t.privacy.content} />
  }

  // Refund Policy Page
  if (page === 'refund') {
    return <PolicyPage title={t.refund.title} lastUpdated={t.refund.lastUpdated} content={t.refund.content} />
  }

  // Partnership Page
  if (page === 'partnership') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto">
          <h1 className="text-white text-3xl lg:text-4xl font-bold mb-4">{t.partnership.title}</h1>
          <p className="text-white/60 lg:text-lg mb-8">{t.partnership.description}</p>

          <PartnershipForm t={t} />
        </main>
      </div>
    )
  }

  // About Page
  if (page === 'about') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-white text-4xl lg:text-5xl font-bold mb-4">{t.about.title}</h1>
            <p className="text-primary text-xl">{t.about.subtitle}</p>
          </div>

          {/* Mission Section */}
          <section className="mb-16">
            <h2 className="text-white text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">flag</span>
              {t.about.mission}
            </h2>
            <p className="text-white/70 leading-relaxed text-lg">{t.about.missionText}</p>
          </section>

          {/* How It Works Section */}
          <section className="mb-16 bg-white/5 border border-white/10 rounded-2xl p-8">
            <h2 className="text-white text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">psychology</span>
              {t.about.howItWorks}
            </h2>
            <p className="text-white/70 leading-relaxed">{t.about.howItWorksText}</p>
          </section>

          {/* Values Section */}
          <section className="mb-16">
            <h2 className="text-white text-2xl font-bold mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">favorite</span>
              {t.about.values}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary">diversity_3</span>
                </div>
                <h3 className="text-white text-lg font-bold mb-2">{t.about.value1Title}</h3>
                <p className="text-white/60 text-sm">{t.about.value1Text}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary">shield</span>
                </div>
                <h3 className="text-white text-lg font-bold mb-2">{t.about.value2Title}</h3>
                <p className="text-white/60 text-sm">{t.about.value2Text}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary">trending_up</span>
                </div>
                <h3 className="text-white text-lg font-bold mb-2">{t.about.value3Title}</h3>
                <p className="text-white/60 text-sm">{t.about.value3Text}</p>
              </div>
            </div>
          </section>

          {/* Team Section */}
          <section className="mb-16">
            <h2 className="text-white text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">groups</span>
              {t.about.team}
            </h2>
            <p className="text-white/70 leading-relaxed">{t.about.teamText}</p>
          </section>

          {/* Contact Section */}
          <section className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-8 text-center">
            <h2 className="text-white text-2xl font-bold mb-2">{t.about.contact}</h2>
            <p className="text-white/70 mb-4">{t.about.contactText}</p>
            <a href={`mailto:${t.about.contactEmail}`} className="text-primary hover:underline font-medium">{t.about.contactEmail}</a>
          </section>
        </main>
      </div>
    )
  }

  // FAQ Page
  if (page === 'faq') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-white text-4xl lg:text-5xl font-bold mb-4">{t.faq.title}</h1>
            <p className="text-white/60 text-lg">{t.faq.subtitle}</p>
          </div>

          <div className="space-y-4">
            {[
              { q: t.faq.q1, a: t.faq.a1 },
              { q: t.faq.q2, a: t.faq.a2 },
              { q: t.faq.q3, a: t.faq.a3 },
              { q: t.faq.q4, a: t.faq.a4 },
              { q: t.faq.q5, a: t.faq.a5 },
              { q: t.faq.q6, a: t.faq.a6 },
              { q: t.faq.q7, a: t.faq.a7 },
              { q: t.faq.q8, a: t.faq.a8 },
            ].map((item, index) => (
              <details key={index} className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="text-white font-medium pr-4">{item.q}</span>
                  <span className="material-symbols-outlined text-primary group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <div className="px-6 pb-6 text-white/70 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>

          {/* Still Have Questions */}
          <div className="mt-12 bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-8 text-center">
            <h3 className="text-white text-xl font-bold mb-2">{t.faq.stillHaveQuestions}</h3>
            <button
              onClick={() => navigateTo('partnership')}
              className="text-primary hover:underline font-medium"
            >
              {t.faq.contactUs} →
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Animal Test Page
  if (page === 'animal-test') {
    return <AnimalTestPage t={t} lang={lang} navigateTo={navigateTo} LanguageSelector={LanguageSelector} />
  }

  // Payment Success Page
  if (page === 'payment-success') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        {/* Top Navigation */}
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <div className="text-center">
            {/* Success Icon */}
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-green-500 text-[48px]">check_circle</span>
            </div>

            <h1 className="text-white text-3xl lg:text-4xl font-bold mb-4">{t.paymentSuccess.title}</h1>
            <p className="text-white/60 lg:text-lg mb-8 max-w-md">{t.paymentSuccess.description}</p>

            <button
              onClick={() => navigateTo('form')}
              className="flex items-center justify-center rounded-xl h-14 px-12 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 mx-auto"
            >
              <span className="material-symbols-outlined mr-2">auto_awesome</span>
              {t.paymentSuccess.button}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Login Page
  if (page === 'login') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <div className="w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-[32px]">login</span>
              </div>
              <h1 className="text-white text-2xl lg:text-3xl font-bold mb-2">{t.auth.loginTitle}</h1>
              <p className="text-white/60">{t.auth.loginDescription}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {authError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
                  {authError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.auth.email}</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.auth.password}</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => { navigateTo('forgot-password'); setAuthError('') }}
                  className="text-primary text-sm hover:underline text-right mt-1"
                >
                  {t.auth.forgotPassword}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl h-14 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                ) : (
                  t.auth.login
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/40 text-sm">{t.auth.orContinueWith}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-xl h-14 bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t.auth.google}
            </button>

            <p className="text-center mt-6 text-white/60">
              {t.auth.noAccount}{' '}
              <button
                onClick={() => { navigateTo('signup'); setAuthError('') }}
                className="text-primary hover:underline font-medium"
              >
                {t.auth.signup}
              </button>
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Signup Page
  if (page === 'signup') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <div className="w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-[32px]">person_add</span>
              </div>
              <h1 className="text-white text-2xl lg:text-3xl font-bold mb-2">{t.auth.signupTitle}</h1>
              <p className="text-white/60">{t.auth.signupDescription}</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              {authError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
                  {authError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.auth.email}</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.auth.password}</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.auth.confirmPassword}</label>
                <input
                  type="password"
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl h-14 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                ) : (
                  t.auth.signup
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/40 text-sm">{t.auth.orContinueWith}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-xl h-14 bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t.auth.google}
            </button>

            <p className="text-center mt-6 text-white/60">
              {t.auth.hasAccount}{' '}
              <button
                onClick={() => { navigateTo('login'); setAuthError('') }}
                className="text-primary hover:underline font-medium"
              >
                {t.auth.login}
              </button>
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Forgot Password Page
  if (page === 'forgot-password') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <button onClick={() => navigateTo('login')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <div className="w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-[32px]">lock_reset</span>
              </div>
              <h1 className="text-white text-2xl lg:text-3xl font-bold mb-2">{t.auth.forgotPasswordTitle}</h1>
              <p className="text-white/60">{t.auth.forgotPasswordDesc}</p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              {authError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
                  {authError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.auth.email}</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl h-14 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                ) : (
                  t.auth.sendResetLink
                )}
              </button>
            </form>

            <p className="text-center mt-6 text-white/60">
              <button
                onClick={() => { navigateTo('login'); setAuthError('') }}
                className="text-primary hover:underline font-medium"
              >
                {t.auth.backToLogin}
              </button>
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Reset Password Page
  if (page === 'reset-password') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <div className="w-10" />
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <div className="w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-[32px]">key</span>
              </div>
              <h1 className="text-white text-2xl lg:text-3xl font-bold mb-2">{t.auth.resetPasswordTitle}</h1>
              <p className="text-white/60">{t.auth.resetPasswordDesc}</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              {authError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
                  {authError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.auth.password}</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">{t.auth.confirmPassword}</label>
                <input
                  type="password"
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl h-14 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                ) : (
                  t.auth.resetPassword
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  // Subscription Page
  if (page === 'subscription') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium mb-4">
              {t.subscription.pricing.trial}
            </span>
            <h1 className="text-white text-3xl lg:text-5xl font-black mb-4">{t.subscription.title}</h1>
            <p className="text-white/60 text-lg lg:text-xl max-w-2xl mx-auto">{t.subscription.subtitle}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Features */}
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">calendar_today</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{t.subscription.features.daily}</h3>
                    <p className="text-white/60 text-sm mt-1">{t.subscription.features.dailyDesc}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">cloud</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{t.subscription.features.weather}</h3>
                    <p className="text-white/60 text-sm mt-1">{t.subscription.features.weatherDesc}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{t.subscription.features.personalized}</h3>
                    <p className="text-white/60 text-sm mt-1">{t.subscription.features.personalizedDesc}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-white text-5xl font-black">{t.subscription.pricing.price}</span>
                  <span className="text-white/60 text-lg">{t.subscription.pricing.period}</span>
                </div>
                <p className="text-primary font-medium mt-2">{t.subscription.pricing.perDay}</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-400">verified</span>
                  <div>
                    <p className="text-white font-medium">{t.subscription.pricing.trial}</p>
                    <p className="text-white/60 text-sm">{t.subscription.pricing.trialDesc}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={user ? handleSubscribe : () => navigateTo('login')}
                disabled={loading}
                className="w-full flex items-center justify-center rounded-xl h-14 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined mr-2">rocket_launch</span>
                    {user ? t.subscription.cta : t.subscription.ctaLoggedOut}
                  </>
                )}
              </button>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                  {t.subscription.benefits.cancel}
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                  {t.subscription.benefits.noCharge}
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                  {t.subscription.benefits.refund}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Subscription Success Page
  if (page === 'subscription-success') {
    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <div className="w-10" />
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-primary text-[48px]">celebration</span>
            </div>

            <h1 className="text-white text-3xl lg:text-4xl font-bold mb-4">{t.subscription.success.title}</h1>
            <p className="text-white/60 lg:text-lg mb-8 max-w-md">{t.subscription.success.description}</p>

            <button
              onClick={() => navigateTo('form')}
              className="flex items-center justify-center rounded-xl h-14 px-12 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 mx-auto"
            >
              <span className="material-symbols-outlined mr-2">tune</span>
              {t.subscription.success.button}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // My Page
  if (page === 'mypage') {
    const getProvider = () => {
      if (!user) return '-'
      const provider = user.app_metadata?.provider
      if (provider === 'google') return 'Google'
      if (provider === 'email') return 'Email'
      return provider || 'Email'
    }

    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    const isOAuthUser = user?.app_metadata?.provider === 'google'

    return (
      <div className="bg-background-dark text-white font-display min-h-screen">
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
          <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
            <button onClick={() => navigateTo('landing')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h2 className="text-white text-xl font-extrabold tracking-tight">
              Style<span className="text-primary text-2xl">AI</span>
            </h2>
            <LanguageSelector />
          </div>
        </nav>

        <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary text-[40px]">person</span>
            </div>
            <h1 className="text-white text-2xl lg:text-3xl font-bold">{t.mypage.title}</h1>
          </div>

          {/* Account Info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_circle</span>
              {t.mypage.accountInfo}
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/60">{t.mypage.email}</span>
                <span className="text-white">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/60">{t.mypage.provider}</span>
                <span className="text-white flex items-center gap-2">
                  {getProvider() === 'Google' && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {getProvider()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white/60">{t.mypage.createdAt}</span>
                <span className="text-white">{formatDate(user?.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Change Password - Only for email users */}
          {!isOAuthUser && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">lock</span>
                {t.mypage.changePassword}
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {mypageError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
                    {mypageError}
                  </div>
                )}
                {mypageSuccess && (
                  <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-green-400 text-sm">
                    {mypageSuccess}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-white/80 text-sm font-medium">{t.mypage.newPassword}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-white/80 text-sm font-medium">{t.mypage.confirmNewPassword}</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center rounded-xl h-12 bg-primary text-background-dark font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                  ) : (
                    t.mypage.updatePassword
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Delete Account */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
            <h2 className="text-red-400 text-lg font-bold mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined">warning</span>
              {t.mypage.deleteAccount}
            </h2>
            <p className="text-white/60 text-sm mb-4">{t.mypage.deleteWarning}</p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-white/80 text-sm font-medium">
                  {t.mypage.typeToConfirm} ({lang === 'ko' ? '삭제' : 'DELETE'})
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={lang === 'ko' ? '삭제' : 'DELETE'}
                  className="w-full py-3 px-4 rounded-xl bg-white/5 border border-red-500/30 text-white placeholder-white/30 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <button
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmText !== (lang === 'ko' ? '삭제' : 'DELETE')}
                className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-red-500/20 border border-red-500/50 text-red-400 font-bold hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                    {t.mypage.delete}
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Result Page
  return (
    <div className="bg-background-dark text-white font-display min-h-screen">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
        <div className="flex items-center p-4 justify-between max-w-6xl mx-auto">
          <button onClick={handleReset} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h2 className="text-white text-xl font-extrabold tracking-tight">
            Style<span className="text-primary text-2xl">AI</span>
          </h2>
          <LanguageSelector />
        </div>
      </nav>

      <main className="pt-24 pb-12 px-6 max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-center lg:text-left">
            <h1 className="text-white text-3xl lg:text-4xl font-bold mb-2">{t.result.title}</h1>
            <p className="text-white/60 lg:text-lg">{t.result.description}</p>
          </div>
          <div className="flex gap-2 justify-center sm:justify-end">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              {t.result.download}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium relative"
            >
              <span className="material-symbols-outlined text-[20px]">share</span>
              {t.result.share}
              {showCopied && (
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap">
                  {t.result.copied}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setIsTestEmail(false)
                setShowEmailModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 transition-colors text-primary text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[20px]">mail</span>
              {t.result.email}
            </button>
          </div>
        </div>

        <div ref={resultRef} className="grid lg:grid-cols-2 gap-8 bg-background-dark p-4 rounded-2xl">
          {/* Report Content */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="prose prose-invert max-w-none">
              {report.split('\n').map((line, index) => (
                <p key={index} className="text-white/80 text-sm leading-relaxed my-2">
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* Hairstyle Image */}
          {hairstyleImage && (
            <div>
              <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">face</span>
                {t.result.hairstyles}
              </h2>
              <img
                src={hairstyleImage}
                alt="Recommended hairstyles"
                className="w-full rounded-2xl shadow-lg"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8 max-w-md mx-auto lg:mx-0">
          <button
            onClick={handleReset}
            className="flex-1 flex items-center justify-center rounded-xl h-14 bg-primary text-background-dark text-lg font-bold tracking-tight hover:brightness-110 transition-all"
          >
            {t.result.tryAgain}
          </button>
          <button
            onClick={() => navigateTo('landing')}
            className="flex-1 flex items-center justify-center rounded-xl h-14 bg-white/5 border border-white/10 text-white text-lg font-medium tracking-tight hover:bg-white/10 transition-all"
          >
            {t.result.backHome}
          </button>
        </div>

        {/* Animal Test Banner */}
        <div className="mt-12 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl">🐶</span>
            <span className="text-3xl">🐱</span>
          </div>
          <h3 className="text-white text-xl font-bold mb-2">{t.animalTest.title}</h3>
          <p className="text-white/60 text-sm mb-4">{t.animalTest.description}</p>
          <button
            onClick={() => navigateTo('animal-test')}
            className="inline-flex items-center justify-center rounded-xl h-12 px-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold tracking-tight hover:brightness-110 transition-all shadow-lg"
          >
            <span className="material-symbols-outlined mr-2">pets</span>
            {lang === 'ko' ? '테스트 하러가기' : 'Take the Test'}
          </button>
        </div>
      </main>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-background-dark border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-bold">
                {isTestEmail ? t.emailTest.title : t.result.emailModalTitle}
              </h3>
              <button
                onClick={() => {
                  setShowEmailModal(false)
                  setEmailAddress('')
                  setEmailStatus('idle')
                  setIsTestEmail(false)
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => {
                  setEmailAddress(e.target.value)
                  setEmailStatus('idle')
                }}
                placeholder={t.result.emailPlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary/50 transition-colors"
                disabled={emailSending}
              />

              {emailStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {isTestEmail ? t.emailTest.success : t.result.emailSuccess}
                </div>
              )}

              {emailStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)
                    ? t.result.emailInvalid
                    : (isTestEmail ? t.emailTest.error : t.result.emailError)}
                </div>
              )}

              <button
                onClick={isTestEmail ? handleSendTestEmail : handleSendEmail}
                disabled={emailSending || !emailAddress}
                className="w-full py-3 rounded-xl bg-primary text-background-dark font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {emailSending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    {t.result.emailSending}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    {t.result.emailSend}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
