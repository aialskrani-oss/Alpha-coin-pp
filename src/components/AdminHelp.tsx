import { useState } from 'react';
import { Terminal, Copy, Check, Info, Code } from 'lucide-react';

export default function AdminHelp() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const currentDevUrl = window.location.origin;

  const curlGetBalance = `curl -X GET "${currentDevUrl}/api/get-balance?api_key=YOUR_API_KEY"`;
  
  const curlDeduct = `curl -X POST "${currentDevUrl}/api/deduct" \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "YOUR_API_KEY",
    "amount": 15,
    "reason": "شراء سيف الألفا في لعبة الحرب ⚔️"
  }'`;

  return (
    <div id="developer-guide-card" className="bg-[#18181b] border border-[#d4af37]/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Golden accent glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/5 rounded-full blur-3xl -z-10" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#d4af37]/10 rounded-xl border border-[#d4af37]/20 text-[#d4af37]">
          <Terminal size={22} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">بوابة المطورين والربط البرمجي</h3>
          <p className="text-xs text-stone-400">إرشادات ربط AlphaCoin مع بوت التليجرام أو موقعك الخاص</p>
        </div>
      </div>

      <div className="space-y-6 text-stone-300 text-sm leading-relaxed">
        <div className="flex gap-3 p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/10 text-yellow-100">
          <Info size={24} className="shrink-0 text-[#d4af37]" />
          <p className="text-xs text-[#eed171] leading-relaxed">
            استخدم الـ <strong>API Key</strong> الفريد الخاص بك المُوضّح أعلاه للاستعلام عن الرصيد أو سحب عملات AlphaCoin من الألعاب والبوتات الخارجية. لا تشارك هذا الرمز مطلقاً.
          </p>
        </div>

        {/* Endpoint 1 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-sm text-[#e6c152]">
              <span className="bg-[#e6c152]/15 text-[#e6c152] text-xs font-bold px-2 py-0.5 rounded border border-[#e6c152]/20">GET</span>
              /api/get-balance
            </span>
            <button
              onClick={() => handleCopy(curlGetBalance, 'get')}
              className="text-stone-400 hover:text-[#d4af37] transition flex items-center gap-1.5 text-xs bg-stone-900 px-2.5 py-1 rounded border border-stone-800"
            >
              {copiedText === 'get' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              {copiedText === 'get' ? 'تم النسخ!' : 'نسخ الطلب'}
            </button>
          </div>
          <p className="text-xs text-stone-400">للاستعلام المباشر عن الرصيد، مرر المفتاح البرمجي في الرابط أو في رأس الطلب (X-API-Key).</p>
          <pre className="font-mono text-xs bg-black p-3.5 rounded-lg overflow-x-auto text-yellow-100/80 border border-stone-800">
            {curlGetBalance}
          </pre>
        </div>

        {/* Endpoint 2 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-sm text-[#d4af37]">
              <span className="bg-[#fbbf24]/20 text-[#fbbf24] text-xs font-bold px-2 py-0.5 rounded border border-[#fbbf24]/30">POST</span>
              /api/deduct
            </span>
            <button
              onClick={() => handleCopy(curlDeduct, 'deduct')}
              className="text-stone-400 hover:text-[#d4af37] transition flex items-center gap-1.5 text-xs bg-stone-900 px-2.5 py-1 rounded border border-stone-800"
            >
              {copiedText === 'deduct' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              {copiedText === 'deduct' ? 'تم النسخ!' : 'نسخ الطلب'}
            </button>
          </div>
          <p className="text-xs text-stone-400">لخصم مبالغ داخل الألعاب عند الشراء أو الدفع. يعيق العملية إذا كان الرصيد غير كافٍ.</p>
          <pre className="font-mono text-xs bg-black p-3.5 rounded-lg overflow-x-auto text-yellow-100/80 border border-stone-800">
            {curlDeduct}
          </pre>
        </div>

        {/* Telegram snippet */}
        <div className="bg-stone-900/60 rounded-xl p-4 border border-stone-800">
          <div className="flex items-center gap-2 mb-2 text-[#fbbf24] font-medium text-xs">
            <Code size={14} />
            <span>مثال الربط مع بوت تليجرام باستخدام JavaScript (NodeJS):</span>
          </div>
          <pre className="font-mono text-[11px] bg-black/50 p-3 rounded text-stone-400 overflow-x-auto leading-relaxed">
{`const response = await fetch('${currentDevUrl}/api/deduct', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: 'AV-your-secret-api-key',
    amount: 10,
    reason: 'سحب مالي عبر بوت التليجرام'
  })
});

const data = await response.json();
if (data.success) {
  console.log('تم الخصم! الرصيد الجديد:', data.newBalance);
} else {
  console.error('فشل الخصم:', data.error);
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
