import React, { useState } from 'react';
import { Send, User, ChevronRight, Calculator, HelpCircle } from 'lucide-react';

interface TransferFormProps {
  idToken: string;
  onTransferSuccess: (newBalance: number) => void;
}

export default function TransferForm({ idToken, onTransferSuccess }: TransferFormProps) {
  const [toEmail, setToEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Initial validations
    if (!toEmail.trim()) {
      setError('يرجى تحديد بريد إلكتروني صالح للمستلم');
      return;
    }
    const coinAmt = parseInt(amount, 10);
    if (isNaN(coinAmt) || coinAmt <= 0) {
      setError('يرجى إدخال مبلغ تحويل صحيح موجب');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          toEmail: toEmail.trim(),
          amount: coinAmt,
          reason: reason.trim() || undefined
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess('تمّت العملية بنجاح! تم تحرير وإرسال العملات إلى الحساب المحدد.');
        onTransferSuccess(data.newBalance);
        // Clear form
        setToEmail('');
        setAmount('');
        setReason('');
      } else {
        setError(data.error || 'فشلت عملية التحويل البريدي');
      }
    } catch (err) {
      console.error(err);
      setError('خطأ في الاتصال بالشبكة أو انتهاء صلاحية جلستكم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="transfer-coin-card" className="bg-[#18181b] border border-stone-800 rounded-2xl p-6 shadow-xl relative backdrop-blur-md">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
          <Send size={20} className="-rotate-12" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white leading-tight">إرسال وتحويل AlphaCoin</h3>
          <p className="text-xs text-stone-400">حوّل العملات إلى حساب آخر فورياً وبدون أي رسوم غاز</p>
        </div>
      </div>

      <form onSubmit={handleTransfer} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-100 rounded-xl text-xs leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-green-500/15 border border-green-500/20 text-green-200 rounded-xl text-xs leading-relaxed">
            {success}
          </div>
        )}

        {/* Recipient Email */}
        <div className="space-y-1.5">
          <label className="text-xs text-stone-400 block font-medium">البريد الإلكتروني للمستلم</label>
          <div className="relative flex items-center bg-black/40 rounded-xl border border-stone-800 focus-within:border-amber-500/50 transition">
            <span className="p-3 text-stone-500">
              <User size={16} />
            </span>
            <input
              type="email"
              required
              placeholder="example@gmail.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="bg-transparent border-none text-white text-sm w-full py-3 pe-4 focus:outline-none focus:ring-0 placeholder:text-stone-600 font-sans"
            />
          </div>
          <p className="text-[10px] text-stone-500">ملاحظة: يجب أن يمتلك المستلم حساباً مسجلاً في موقع المنصة.</p>
        </div>

        {/* Amount & Quick values */}
        <div className="space-y-1.5">
          <label className="text-xs text-stone-400 block font-medium">القيمة المراد تحويلها (AlphaCoin)</label>
          <div className="relative flex items-center bg-black/40 rounded-xl border border-stone-800 focus-within:border-amber-500/50 transition">
            <span className="p-3 text-stone-500">
              <Calculator size={16} />
            </span>
            <input
              type="number"
              required
              min="1"
              step="1"
              placeholder="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent border-none text-white text-sm w-full py-3 pe-4 focus:outline-none focus:ring-0 placeholder:text-stone-600 font-mono"
            />
          </div>
          
          {/* Quick choices */}
          <div className="flex items-center gap-1 text-[11px] text-stone-500 flex-wrap">
            <span>تحديد سريع:</span>
            {[5, 10, 25, 50, 100].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 hover:border-amber-500 text-stone-300 font-mono hover:text-white transition"
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-xs text-stone-400 block font-medium">سبب التحويل (اختياري)</label>
          <div className="relative flex items-center bg-black/40 rounded-xl border border-stone-800 focus-within:border-amber-500/50 transition">
            <span className="p-3 text-stone-500">
              <HelpCircle size={16} />
            </span>
            <input
              type="text"
              placeholder="شراء أدوات، مكافأة، هدية ممتعة..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-transparent border-none text-white text-sm w-full py-3 pe-4 focus:outline-none focus:ring-0 placeholder:text-stone-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-500 to-[#d4af37] text-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 text-sm font-sans"
        >
          {loading ? 'جاري التحويل بشكل آمن...' : 'إرسال العملات الآن'}
          <ChevronRight size={16} />
        </button>
      </form>
    </div>
  );
}
