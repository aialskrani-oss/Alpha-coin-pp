import { useState } from 'react';
import { Key, Eye, EyeOff, Copy, RotateCw, Check } from 'lucide-react';

interface APIKeyCardProps {
  apiKey: string;
  idToken: string;
  onKeyRegenerated: (newKey: string) => void;
}

export default function APIKeyCard({ apiKey, idToken, onKeyRegenerated }: APIKeyCardProps) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إعادة توليد مفتاح API جديد؟ جميع البوتات والمواقع الحالية التي تعتمد على المفتاح القديم ستتوقف عن العمل فوراً.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/regenerate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      const data = await response.json();
      if (response.ok && data.apiKey) {
        onKeyRegenerated(data.apiKey);
        alert('تمت إعادة توليد مفتاح الـ API بنجاح! يرجى تحديث التطبيقات والبوتات الخاصة بك.');
      } else {
        alert(data.error || 'فشلت عملية إعادة التوليد');
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="apikey-management-card" className="bg-[#18181b] border border-[#d4af37]/25 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-[#d4af37]/10 rounded-xl text-[#d4af37] border border-[#d4af37]/20">
          <Key size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white leading-tight">مفتاح الربط البرمجي (API Key)</h3>
          <p className="text-xs text-stone-400">مفتاح المبرمجين للتحقق والخصم من الرصيد</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-stone-400">المفتاح البرمجي النشط الخاص بك</label>
          <div className="flex items-center gap-2 bg-black/60 rounded-xl p-3 border border-stone-800 font-mono text-sm">
            <input
              type={showKey ? 'text' : 'password'}
              readOnly
              value={apiKey || 'AV-loadingkeys...'}
              className="bg-transparent border-none text-yellow-100 flex-1 focus:ring-0 focus:outline-none tracking-wider text-xs lg:text-sm select-all"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-stone-400 hover:text-white transition p-1 rounded hover:bg-stone-800"
              title={showKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={handleCopy}
              disabled={!apiKey}
              className="text-stone-400 hover:text-[#d4af37] transition p-1 rounded hover:bg-stone-800"
              title="نسخ إلى الحافظة"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-800/60">
          <span className="text-xs text-stone-500">حالة المفتاح: <strong className="text-green-400 font-semibold font-sans">ACTIVE</strong></span>
          <button
            onClick={handleRegenerate}
            disabled={loading || !apiKey}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition py-1.5 px-3 rounded hover:bg-red-500/10 border border-transparent hover:border-red-500/20 active:scale-95 disabled:opacity-50"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            إعادة توليد المفتاح
          </button>
        </div>
      </div>
    </div>
  );
}
