"use client";
import { useState } from 'react';

export default function DeepResearchApp() {
  const [file, setFile] = useState<File | null>(null);
  const [topic, setTopic] = useState('');
  const [authorFamily, setAuthorFamily] = useState('');
  const [year, setYear] = useState('');
  const [fullReference, setFullReference] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !topic || !authorFamily || !year || !fullReference) {
      setError('يرجى تعبئة جميع الحقول وإرفاق ملف المصدر.');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('topic', topic);
    formData.append('author_family', authorFamily);
    formData.append('year', year);
    formData.append('full_reference', fullReference);

    try {
      // الاتصال بالـ API الداخلي في مشروع Next.js
      const res = await fetch('/api/research', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
      }
    } catch (err) {
      setError('حدث خطأ أثناء معالجة الطلب.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-right font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        <div className="bg-blue-900 p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">أداة البحث الأكاديمي والتوثيق الدقيق</h1>
          <p className="text-blue-200">استخراج المعلومات من الملفات بصيغة أكاديمية موثقة</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-5 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3">1. المرفق وبياناته الوصفية</h3>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">ملف المصدر (PDF / Word):</label>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم عائلة المؤلف:</label>
                  <input type="text" placeholder="مثال: النظيري" value={authorFamily} onChange={(e) => setAuthorFamily(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">سنة النشر:</label>
                  <input type="text" placeholder="مثال: 2021" value={year} onChange={(e) => setYear(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div className="space-y-5 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3">2. تفاصيل البحث</h3>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">الموضوع المطلوب كتابته:</label>
                  <textarea rows={4} placeholder="اكتب هنا ما تريد استخراجه من الملف..." value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المرجع كاملاً (لقائمة المراجع):</label>
                  <textarea rows={2} placeholder="مثال: النظيري، محمد. عنوان الدراسة..." value={fullReference} onChange={(e) => setFullReference(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"></textarea>
                </div>
              </div>
            </div>

            {error && <div className="text-red-700 bg-red-100 p-4 rounded-lg font-semibold text-center">{error}</div>}

            <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 transition-colors shadow-lg text-lg flex justify-center items-center gap-3">
              {loading ? 'جاري المعالجة والصياغة الأكاديمية...' : 'بدء الصياغة'}
            </button>
          </form>

          {result && (
            <div className="mt-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 border-r-4 border-blue-600 pr-4">النتيجة البحثية:</h2>
              <div className="p-8 bg-white border-2 border-slate-100 shadow-sm rounded-xl whitespace-pre-wrap text-slate-800 leading-loose text-lg font-medium">
                {result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

