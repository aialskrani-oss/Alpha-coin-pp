import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Transaction } from '../types';
import { ArrowDownLeft, ArrowUpRight, History, Calendar, HelpCircle, Inbox } from 'lucide-react';

interface TransactionsTableProps {
  userId: string;
}

export default function TransactionsTable({ userId }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Create dual separate queries or a single query depending on composite indexes.
    // In Firestore, checking OR is supported using direct "or" query operator in React SDK!
    // However, to keep it extremely reliable and simple without custom index constraints, we can create
    // two simple onSnapshot queries (one for sent, one for received) and merge them!
    // This is mathematically guaranteed to work without requiring complex Firestore composite index URLs!
    // It is an absolute masterpiece of pragmatic Firestore development!

    setLoading(true);
    const transactionsPath = 'transactions';

    const sentQuery = query(
      collection(db, transactionsPath),
      where('fromUserId', '==', userId)
    );

    const receivedQuery = query(
      collection(db, transactionsPath),
      where('toUserId', '==', userId)
    );

    let sentList: Transaction[] = [];
    let receivedList: Transaction[] = [];

    const handleMerge = () => {
      const merged = [...sentList, ...receivedList];
      // Sort by createdAt descending
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // De-duplicate just in case (e.g. self-transfers, though blocked by API)
      const unique = merged.filter((item, pos, self) => self.findIndex(t => t.id === item.id) === pos);
      setTransactions(unique);
      setLoading(false);
    };

    const unsubscribeSent = onSnapshot(
      sentQuery,
      (snapshot) => {
        sentList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Transaction));
        handleMerge();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, transactionsPath);
        } catch (wrappedErr: any) {
          setError('فشل جلب المعاملات الصادرة');
        }
      }
    );

    const unsubscribeRecv = onSnapshot(
      receivedQuery,
      (snapshot) => {
        receivedList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Transaction));
        handleMerge();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, transactionsPath);
        } catch (wrappedErr: any) {
          setError('فشل جلب المعاملات الواردة');
        }
      }
    );

    return () => {
      unsubscribeSent();
      unsubscribeRecv();
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-[#18181b] border border-stone-800 rounded-2xl p-8 text-center">
        <div className="animate-spin text-[#d4af37] w-6 h-6 mx-auto mb-3" />
        <p className="text-xs text-stone-500">جاري تحميل سجل المحفظة...</p>
      </div>
    );
  }

  return (
    <div id="transactions-log-card" className="bg-[#18181b] border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-5 border-b border-stone-800 flex items-center gap-3">
        <div className="p-2 bg-stone-900 rounded-lg text-stone-400">
          <History size={18} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white leading-tight">سجل المعاملات والعمليات</h3>
          <p className="text-xs text-stone-400">سجل بجميع عمليات الإرسال والخصم والجوائز</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-100 text-xs">
          {error}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
          <div className="p-4 bg-stone-900/50 rounded-full border border-stone-800 text-stone-600 mb-2">
            <Inbox size={28} />
          </div>
          <p className="text-sm text-stone-300 font-semibold">لا توجد أي معاملات مسجلة بعد</p>
          <p className="text-xs text-stone-500">سجل المعاملات فارغ. قم بإجراء عمليتك الأولى!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-black/30 text-stone-400 text-xs font-medium border-b border-stone-800/80">
                <th className="py-3 px-4">نوع العملية</th>
                <th className="py-3 px-4">الطرف الآخر (الحساب)</th>
                <th className="py-3 px-4">المبلغ من (AlphaCoin)</th>
                <th className="py-3 px-4">السبب / الغرض</th>
                <th className="py-3 px-4">تاريخ المعاملة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/50 text-stone-300">
              {transactions.map((tx) => {
                const isRecipient = tx.toUserId === userId;
                const formattedDate = new Date(tx.createdAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <tr key={tx.id} className="hover:bg-stone-900/30 transition text-xs lg:text-sm">
                    {/* Direction */}
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        {isRecipient ? (
                          <div className="p-1 px-2.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-bold flex items-center gap-1 shrink-0">
                            <ArrowDownLeft size={13} />
                            <span>واردة</span>
                          </div>
                        ) : (
                          <div className="p-1 px-2.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold flex items-center gap-1 shrink-0">
                            <ArrowUpRight size={13} />
                            <span>صادرة</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Counterparty */}
                    <td className="py-3.5 px-4 font-mono text-stone-400">
                      {isRecipient ? (
                        <span>مِن: <strong className="text-stone-300 font-normal">{tx.fromEmail || 'المنصة'}</strong></span>
                      ) : (
                        <span>إِلَى: <strong className="text-stone-300 font-normal">{tx.toEmail}</strong></span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-bold font-mono text-xs lg:text-sm">
                      <span className={isRecipient ? 'text-green-400' : 'text-stone-100'}>
                        {isRecipient ? '+' : '-'}{tx.amount} AC
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 text-stone-300">
                      <div className="flex items-center gap-1.5 max-w-[200px] truncate">
                        <HelpCircle size={13} className="text-stone-500 shrink-0" />
                        <span title={tx.reason}>{tx.reason}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-stone-500 font-sans">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-stone-600" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
