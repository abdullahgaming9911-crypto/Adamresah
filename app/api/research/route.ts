import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const topic = formData.get('topic') as string;
    const authorFamily = formData.get('author_family') as string;
    const year = formData.get('year') as string;
    const fullReference = formData.get('full_reference') as string;

    if (!file) return NextResponse.json({ error: "لم يتم رفع أي ملف." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase();
    let text = "";

    // قراءة محتوى الملفات
    if (ext === 'pdf') {
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (ext === 'doc' || ext === 'docx') {
      const data = await mammoth.extractRawText({ buffer });
      text = data.value;
    } else {
      return NextResponse.json({ error: "صيغة الملف غير مدعومة. يرجى رفع PDF أو Word." }, { status: 400 });
    }

    // تقطيع النص المستخرج إلى فقرات (صفحات تقديرية لتسهيل التوثيق الدقيق)
    const words = text.split(/\s+/);
    const chunks = [];
    let currentChunk = [];
    let virtualPage = 1;

    for (let i = 0; i < words.length; i++) {
      currentChunk.push(words[i]);
      if (currentChunk.length >= 350) { // تقسيم كل 350 كلمة كصفحة لتحديد موضع الاقتباس
        chunks.push(`[المؤلف: ${authorFamily} | السنة: ${year} | الصفحة: ${virtualPage}]\n${currentChunk.join(" ")}`);
        currentChunk = [];
        virtualPage++;
      }
    }
    if (currentChunk.length > 0) {
        chunks.push(`[المؤلف: ${authorFamily} | السنة: ${year} | الصفحة: ${virtualPage}]\n${currentChunk.join(" ")}`);
    }

    // تجهيز السياق للنموذج
    const fullContext = chunks.join("\n\n---\n\n");
    const DEEPSEEK_API_KEY = "ضع_مفتاح_deepseek_الخاص_بك_هنا"; // <--- ضع المفتاح هنا

    const systemPrompt = `أنت باحث أكاديمي خبير. القواعد الصارمة جداً:
    1. استخرج المعلومات من النص المرفق فقط ولا تضف أي معلومات خارجية إطلاقاً.
    2. التوثيق في المتن إجباري لكل معلومة، وثق فوراً بين قوسين بهذه الصيغة: (اسم عائلة المؤلف، السنة: رقم الصفحة).
    3. استخرج رقم الصفحة حصراً من الميتا داتا المرفقة أعلى كل فقرة نصية. لا تقم بالتقريب أو التخمين.
    4. في نهاية الإجابة، اكتب عنوان "قائمة المراجع:" وضع تحتها المرجع الكامل.`;

    const userPrompt = `النصوص المستخرجة والمتاحة:\n${fullContext}\n\nالمرجع الكامل: ${fullReference}\n\nالمطلوب الآن: اكتب فقرة بحثية أكاديمية دقيقة عن [${topic}] بناءً على النصوص أعلاه فقط.`;

    // الاتصال بواجهة DeepSeek
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1 // درجة حرارة منخفضة جداً لمنع الهلوسة
      })
    });

    const aiData = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ error: aiData.error?.message || "حدث خطأ في الاتصال بالنموذج" }, { status: 500 });
    }

    return NextResponse.json({ result: aiData.choices[0].message.content });

  } catch (error: any) {
    return NextResponse.json({ error: "حدث خطأ أثناء معالجة الملف: " + error.message }, { status: 500 });
  }
}

