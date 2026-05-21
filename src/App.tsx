import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { Profile } from './types';
import BalanceDisplay from './components/BalanceDisplay';
import APIKeyCard from './components/APIKeyCard';
import TransferForm from './components/TransferForm';
import TransactionsTable from './components/TransactionsTable';
import AdminHelp from './components/AdminHelp';
import { Shield, Sparkles, LogOut, Coins, Chrome, ArrowLeftRight, Terminal, Globe, Flame } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Subscribe to auth state transitions
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setProfileLoading(true);
        try {
          const token = await currentUser.getIdToken(true);
          setIdToken(token);

          // Force create or fetch profile and welcome parameters from server
          const response = await fetch('/api/verify-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setProfile({
              id: data.id,
              email: data.email,
              name: data.name,
              avatarUrl: data.avatarUrl,
              apiKey: data.apiKey,
              createdAt: data.createdAt
            });
            setBalance(data.balance);
          } else {
            console.error('Failed to align account profile from server');
          }
        } catch (err) {
          console.error('Error fetching auth token or verifying profile', err);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setIdToken('');
        setProfile(null);
        setBalance(0);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      alert('فشل تسجيل الدخول باستخدام حساب Google، يرجى التحقق من الاتصال بالإنترنت.');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('هل تود تسجيل الخروج من Alpha Vault؟')) {
      await logout();
    }
  };

  const handleKeyRegenerated = (newKey: string) => {
    if (profile) {
      setProfile({ ...profile, apiKey: newKey });
    }
  };

  const handleTransferSuccess = (newBalance: number) => {
    setBalance(newBalance);
  };

  if (authLoading) {
    return (
      <div id="loading-screen" className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-white">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
          <Coins size={48} className="text-[#d4af37] animate-spin shrink-0 relative" />
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center px-4">
          <h1 className="text-xl font-bold tracking-tight text-[#d4af37] font-sans">Alpha Vault</h1>
          <p className="text-xs text-stone-500">جاري تحميل خزنة العملة وتأمين الاتصال بالخادم...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // LOGIN SCREEN (UNAUTHENTICATED)
  // ----------------------------------------------------
  if (!user || !profile) {
    return (
      <div id="login-screen" className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden text-right leading-relaxed" dir="rtl">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 animate-pulse duration-5000" />
        
        <div className="w-full max-w-md bg-[#121214] border-2 border-[#d4af37]/20 rounded-2xl p-8 shadow-2xl relative">
          {/* Top aesthetic golden line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-[#ffd700] to-amber-500 rounded-t-xl" />

          <div className="flex flex-col items-center text-center space-y-3 mb-8">
            <div className="p-4 bg-[#d4af37]/10 rounded-full border-2 border-[#d4af37]/35 text-[#d4af37] shadow-lg shadow-[#d4af37]/5">
              <Shield size={36} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Alpha Vault</h1>
            <p className="text-sm text-stone-400 max-w-xs">
              الخزنة المركزية لإدارة وتوزيع عملة <span className="text-[#ffd700] font-bold">AlphaCoin</span> الترفيهية للألعاب والبوتات البرمجية.
            </p>
          </div>

          <div className="space-y-4 mb-6 text-stone-300">
            <div className="flex gap-3 items-start p-3 bg-stone-900/50 rounded-xl border border-stone-800">
              <span className="p-2 bg-amber-500/10 text-[#ffd700] rounded-lg text-xs leading-none mt-0.5 font-bold font-mono">1</span>
              <div>
                <h4 className="text-sm font-bold text-white">رصيد ترفيهي جاهز</h4>
                <p className="text-xs text-stone-400">احصل على 100 AlphaCoin كهدية ترحيبية مجانية فور دخولك.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 bg-stone-900/50 rounded-xl border border-stone-800">
              <span className="p-2 bg-amber-500/10 text-[#ffd700] rounded-lg text-xs leading-none mt-0.5 font-bold font-mono">2</span>
              <div>
                <h4 className="text-sm font-bold text-white">ربط برمجي فوري وبسيط</h4>
                <p className="text-xs text-stone-400">توليد تلقائي لـ API Keys لتكامل محفظتك في ألعاب ومواقع الألفا.</p>
              </div>
            </div>
          </div>

          {profileLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin text-[#ffd700] w-6 h-6 mx-auto mb-2" />
              <p className="text-xs text-stone-400">جاري إعداد محفظتكم الآمنة وتجهيز الرصيد...</p>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="w-full bg-white hover:bg-stone-100 text-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition font-bold font-sans shadow-lg cursor-pointer"
            >
              <Chrome size={20} className="text-red-500 shrink-0" />
              الدخول الحصري عبر حساب Google
            </button>
          )}

          <div className="text-center mt-6 pt-4 border-t border-stone-900 text-[10px] text-stone-500">
            Alpha Vault - منصة داخلية ترفيهية خاضعة لمعايير الأمان والحماية الذكية.
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // APPLICATION DESKTOP (AUTHENTICATED)
  // ----------------------------------------------------
  return (
    <div id="authenticated-app" className="min-h-screen bg-[#09090b] text-white p-4 lg:p-8 text-right leading-relaxed shrink-0 flex flex-col justify-between" dir="rtl">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#d4af37]/3 rounded-full blur-3xl -z-10" />

      <div>
        {/* Navigation / Header */}
        <header id="main-header" className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between p-5 mb-8 bg-[#121214] border border-stone-800 rounded-2xl shadow-xl">
          {/* Right Logo & Branding info */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-[#d4af37] rounded-xl text-black font-extrabold shadow-lg shadow-amber-500/10">
              <Coins size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black text-white tracking-tight">خزنة Alpha Vault</h1>
                <span className="text-[9px] bg-[#d4af37]/20 text-[#ffd700] border border-[#d4af37]/30 font-semibold px-2 py-0.5 rounded-full font-mono">
                  v1.2 - BETA
                </span>
              </div>
              <p className="text-xs text-stone-400">إدارة الأصول والربط البرمجي لعملة AlphaCoin الترفيهية</p>
            </div>
          </div>

          {/* Left User Actions / Status */}
          <div className="flex items-center gap-4">
            {profileLoading ? (
              <span className="text-xs text-stone-500 font-sans">تحديث الرصيد...</span>
            ) : (
              <div className="flex items-center gap-3 border-l border-stone-800 pe-4">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-amber-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-[#ffd700] uppercase">
                    {profile.name[0]}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-stone-200 block truncate max-w-[120px]">{profile.name}</h4>
                  <p className="text-[10px] text-stone-500 font-mono tracking-tight block truncate max-w-[150px]" title={profile.email}>{profile.email}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-2 text-stone-400 hover:text-red-400 hover:bg-red-500/10 border border-stone-800 hover:border-red-500/25 rounded-xl transition cursor-pointer active:scale-95"
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Hero Grid System */}
        <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          
          {/* Main Left Widgets Section (Balances, Keys, Quick stats) */}
          <section className="lg:col-span-5 space-y-6 flex flex-col justify-start">
            {/* 1. Large Balance Viewer */}
            <BalanceDisplay amount={balance} />

            {/* 2. Custom API Key Card */}
            <APIKeyCard
              apiKey={profile.apiKey}
              idToken={idToken}
              onKeyRegenerated={handleKeyRegenerated}
            />
          </section>

          {/* Main Right Actions Section (Transfers, Guidelines) */}
          <section className="lg:col-span-7 space-y-6 flex flex-col justify-start">
            {/* 3. Send/Transfer form widget */}
            <TransferForm
              idToken={idToken}
              onTransferSuccess={handleTransferSuccess}
            />

            {/* 4. API Guide card details */}
            <AdminHelp />
          </section>

          {/* Table Ledger Ledger (Full span on bottom) */}
          <section className="lg:col-span-12">
            <TransactionsTable userId={profile.id} />
          </section>

        </main>
      </div>

      {/* Footer Branding Area */}
      <footer id="global-footer" className="max-w-7xl w-full mx-auto mt-8 pt-6 border-t border-stone-900/80 text-center flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-500">
        <div>
          جميع الحقوق محفوظة منصة وخدمات © {new Date().getFullYear()} <strong className="text-stone-400 font-semibold font-sans">Alpha Platform</strong>
        </div>
        <div className="flex items-center gap-1 text-yellow-100/50">
          <Globe size={13} />
          <span>العملة لأغراض ترفيهية وداخلية ولا تمتلك أي وجود حقيقي على الشبكة</span>
        </div>
      </footer>
    </div>
  );
}
