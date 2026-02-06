import { getClientIp, rateLimit } from \'./_antibot\';

interface Env {
  OPENAI_API_KEY: string;
}

// 1. 메인 함수: 요청을 처리하고 AI 분석을 수행
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // IP 기반 요청 제한으로 악용 방지
  const ip = getClientIp(request);
  const limiter = rateLimit(`analyze-color:${ip}`, 5, 60_000);
  if (!limiter.allowed) {
    return new Response(JSON.stringify({ error: \'Too many requests\' }), { status: 429 });
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get(\'image\');
    const lang = formData.get(\'lang\') as string || \'en\';

    if (!(imageFile instanceof File)) {
      return new Response(JSON.stringify({ error: \'Image not provided\' }), { status: 400 });
    }

    const imageBase64 = await convertImageToBase64(imageFile);

    // 2. OpenAI API 호출
    const response = await fetch(\'https://api.openai.com/v1/chat/completions\', {
      method: \'POST\',
      headers: {
        \'Content-Type\': \'application/json\',
        \'Authorization\': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: \'gpt-4-vision-preview\',
        messages: [
          {
            role: \'user\',
            content: [
              {
                type: \'text\',
                text: createPrompt(lang), // 3. 상세한 프롬프트 생성
              },
              {
                type: \'image_url\',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: \'high\',
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.choices || !data.choices[0].message.content) {
      console.error(\'OpenAI API Error:\', data);
      return new Response(JSON.stringify({ error: \'Failed to analyze image.\' }), { status: 500 });
    }

    const analysisResult = data.choices[0].message.content;

    return new Response(analysisResult, {
      headers: { \'Content-Type\': \'application/json; charset=utf-8\' },
    });

  } catch (error) {
    console.error(\'Error in analyze-color function:\', error);
    return new Response(JSON.stringify({ error: \'Internal server error.\' }), { status: 500 });
  }
};

// 헬퍼 함수: 이미지를 Base64로 변환
async function convertImageToBase64(image: File): Promise<string> {
  const arrayBuffer = await image.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString(\'base64\');
}

// 3. 프롬프트 생성 함수
function createPrompt(lang: string): string {
  if (lang === \'ko\') {
    return `
      당신은 전문 퍼스널 컬러 컨설턴트입니다.
      주어진 얼굴 사진을 정밀하게 분석하여 다음 형식에 맞춰 결과를 JSON으로 제공해주세요.

      {
        \"personal_color\": \"(예: 봄 웜톤)\",
        \"analysis\": {
          \"skin_tone\": \"피부 톤 분석 결과...\",
          \"eye_color\": \"눈동자 색 분석 결과...\",
          \"hair_color\": \"머리카락 색 분석 결과...\"
        },
        \"recommendations\": {
          \"best_palette\": [\"#RRGGBB\", \"#RRGGBB\", ...],
          \"second_best_palette\": [\"#RRGGBB\", \"#RRGGBB\", ...],
          \"makeup_colors\": \"추천 메이크업 컬러 설명...\",
          \"hair_colors\": \"추천 헤어 컬러 설명...\"
        }
      }

      - \"personal_color\": 봄 웜톤, 여름 쿨톤, 가을 웜톤, 겨울 쿨톤 중 하나로 진단합니다.
      - \"analysis\": 피부, 눈, 머리카락의 색상과 톤을 구체적으로 분석하여 진단의 근거를 제시합니다.
      - \"best_palette\": 진단 결과에 가장 잘 어울리는 베스트 색상 5개를 HEX 코드로 추천합니다.
      - \"second_best_palette\": 차선으로 잘 어울리는 색상 5개를 HEX 코드로 추천합니다.
      - 전체적인 설명은 친절하고 상세하게 작성해주세요.
    `;
  } else {
    return `
      You are a professional personal color consultant.
      Analyze the provided facial photo and provide the results in the following JSON format.

      {
        \"personal_color\": \"(e.g., Spring Warm)\",
        \"analysis\": {
          \"skin_tone\": \"Analysis of skin tone...\",
          \"eye_color\": \"Analysis of eye color...\",
          \"hair_color\": \"Analysis of hair color...\"
        },
        \"recommendations\": {
          \"best_palette\": [\"#RRGGBB\", \"#RRGGBB\", ...],
          \"second_best_palette\": [\"#RRGGBB\", \"#RRGGBB\", ...],
          \"makeup_colors\": \"Recommended makeup color description...\",
          \"hair_colors\": \"Recommended hair color description...\"
        }
      }

      - \"personal_color\": Diagnose as one of Spring Warm, Summer Cool, Autumn Warm, or Winter Cool.
      - \"analysis\": Provide the basis for the diagnosis by specifically analyzing the color and tone of the skin, eyes, and hair.
      - \"best_palette\": Recommend 5 best colors that match the diagnosis as HEX codes.
      - \"second_best_palette\": Recommend 5 second-best colors as HEX codes.
      - Please write the overall description in a friendly and detailed manner.
    `;
  }
}
