from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import docx
import requests
import tempfile
import os

app = FastAPI(title="محرك البحث الأكاديمي")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DEEPSEEK_API_KEY = "ضع_مفتاح_deepseek_هنا"
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

def extract_pdf_pages(file_path, author, year):
    pages_data = []
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text and len(text.strip()) > 20:
                pages_data.append(f"[المؤلف: {author} | السنة: {year} | الصفحة: {i+1}]\n{text.strip()}")
    return pages_data

def extract_word_pages(file_path, author, year):
    doc = docx.Document(file_path)
    pages_data = []
    current_text = ""
    page_num = 1
    for para in doc.paragraphs:
        if para.text.strip():
            current_text += para.text + "\n"
            if len(current_text.split()) > 400: # افتراض 400 كلمة لكل صفحة
                pages_data.append(f"[المؤلف: {author} | السنة: {year} | الصفحة: {page_num}]\n{current_text.strip()}")
                current_text = ""
                page_num += 1
    if current_text:
        pages_data.append(f"[المؤلف: {author} | السنة: {year} | الصفحة: {page_num}]\n{current_text.strip()}")
    return pages_data

@app.post("/api/research")
async def process_document(
    file: UploadFile = File(...),
    topic: str = Form(...),
    author_family: str = Form(...),
    year: str = Form(...),
    full_reference: str = Form(...)
):
    ext = os.path.splitext(file.filename)[1].lower()
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
        temp_file.write(await file.read())
        temp_path = temp_file.name

    try:
        if ext == '.pdf':
            pages = extract_pdf_pages(temp_path, author_family, year)
        elif ext in ['.doc', '.docx']:
            pages = extract_word_pages(temp_path, author_family, year)
        else:
            return {"error": "يرجى رفع ملف PDF أو Word فقط"}

        # دمج كل النصوص مع أرقام صفحاتها كقاعدة بيانات للنموذج
        full_context = "\n\n---\n\n".join(pages)

        system_prompt = """أنت باحث أكاديمي خبير. القواعد الصارمة:
1. استخرج المعلومات من النص المرفق فقط ولا تضف أي معلومات خارجية.
2. التوثيق في المتن إجباري لكل معلومة بين قوسين بهذه الصيغة: (اسم عائلة المؤلف، السنة: رقم الصفحة).
3. استخرج رقم الصفحة الدقيق من الميتا داتا المرفقة مع كل نص.
4. في نهاية الإجابة، اكتب عنوان "قائمة المراجع:" وضع تحتها المرجع الكامل كما وردك."""

        user_prompt = f"النصوص المستخرجة من الملف:\n{full_context}\n\nالمرجع الكامل: {full_reference}\n\nالمطلوب: اكتب فقرة أكاديمية عن [{topic}] بناءً على النصوص المرفقة حصراً."

        headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1
        }
        
        response = requests.post(DEEPSEEK_URL, headers=headers, json=payload)
        if response.status_code == 200:
            return {"result": response.json()['choices'][0]['message']['content']}
        else:
            return {"error": f"خطأ من واجهة DeepSeek: {response.text}"}

    finally:
        os.remove(temp_path)

