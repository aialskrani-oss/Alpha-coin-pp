import { Coins, Sparkles, TrendingUp } from 'lucide-react';

interface BalanceDisplayProps {
  amount: number;
}

export default function BalanceDisplay({ amount }: BalanceDisplayProps) {
  return (
    <div id="balance-display-card" className="relative group bg-gradient-to-br from-[#1b170d] to-[#121214] border-2 border-[#d4af37]/40 rounded-2xl p-6 lg:p-8 shadow-2xl overflow-hidden shadow-[#d4af37]/5">
      {/* Decorative Golden Ambient Gradients */}
      <div className="absolute top-0 right-1/4 w-40 h-40 bg-[#d4af37]/15 rounded-full blur-3xl group-hover:bg-[#d4af37]/20 transition-all duration-700" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#ffd700]/10 rounded-full blur-2xl" />

      {/* Decorative Top Line Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-[#ffd700] to-amber-500" />

      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-widest text-[#d4af37] font-sans font-bold flex items-center gap-1.5">
            <Sparkles size={12} className="animate-pulse" />
            الرصيد الكلي المتاح
          </span>
          <h2 className="text-sm text-stone-400">محفظة AlphaCoin الداخلية</h2>
        </div>
        
        <div className="p-3 bg-[#d4af37]/15 rounded-full border border-[#d4af37]/30 text-[#d4af37] animate-bounce duration-1000">
          <Coins size={24} />
        </div>
      </div>

      <div className="flex items-baseline gap-2.5 my-3 relative">
        <span className="text-5xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#ffd700] via-[#eed171] to-[#e6c152] font-mono select-all">
          {amount.toLocaleString('ar-EG')}
        </span>
        <span className="text-lg lg:text-xl font-bold text-[#ffd700] font-sans">AlphaCoin</span>
      </div>

      <div className="mt-5 flex items-center justify-between p-3 bg-black/40 rounded-xl border border-stone-800/80">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <TrendingUp size={14} className="text-green-400" />
          <span>هدايا ومكافآت مجانية نشطة</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-[#ffd700] font-mono">
          +100 AC ترحيبية
        </span>
      </div>
    </div>
  );
}
