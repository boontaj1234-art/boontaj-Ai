
import React, { useState, useEffect } from 'react';
import { SCRIPT_URL } from '../constants';
import { Lock, School, ArrowRight, Loader2, ShieldCheck, User, ChevronDown } from 'lucide-react';

interface LoginPageProps {
  onLogin: (schoolId: string, schoolName: string, isAdmin?: boolean) => void;
}

interface AccountData {
  id: string;
  name: string;
  username: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [loginType, setLoginType] = useState<'school' | 'admin'>('school');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingList, setIsFetchingList] = useState(false);
  const [availableSchools, setAvailableSchools] = useState<AccountData[]>([]);
  const [error, setError] = useState('');

  const fetchSchoolList = async () => {
    setIsFetchingList(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getAccounts`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      // ดึง Username จากคอลัมน์ C (ใน JSON Object จะได้ Key 'username')
      const list: AccountData[] = Object.keys(data).map(id => ({
        id: id,
        name: data[id].name || `โรงเรียน ID ${id}`,
        username: (data[id].username || '').toString().trim()
      })).filter(acc => acc.username !== ''); 

      setAvailableSchools(list);
    } catch (err) {
      console.error('Fetch list error:', err);
    } finally {
      setIsFetchingList(false);
    }
  };

  useEffect(() => {
    fetchSchoolList();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const inputUser = username.trim();
    const inputPass = password.trim();

    try {
      if (loginType === 'admin') {
        if (inputUser === 'admin' && inputPass === 'admin') {
          onLogin('admin', 'ผู้ดูแลระบบกลาง', true);
        } else {
          setError('Username หรือ Password แอดมินไม่ถูกต้อง');
        }
      } else {
        const response = await fetch(`${SCRIPT_URL}?action=getAccounts`);
        const credsMap = await response.json();
        
        let foundId: string | null = null;
        let foundSchoolName: string | null = null;

        for (const [id, creds] of Object.entries(credsMap as any)) {
          const c = creds as any;
          if (c.username.toString().trim() === inputUser && c.password.toString().trim() === inputPass) {
            foundId = id;
            foundSchoolName = c.name || inputUser;
            break;
          }
        }

        if (foundId) {
          onLogin(foundId, foundSchoolName!, false);
        } else {
          setError('รหัสผ่านไม่ถูกต้อง');
        }
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 md:mt-20 px-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-500">
        <div className={`p-10 text-center text-white transition-colors duration-500 ${loginType === 'admin' ? 'bg-slate-800' : 'bg-blue-600'}`}>
          <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            {loginType === 'admin' ? <ShieldCheck size={40} /> : <School size={40} />}
          </div>
          <h2 className="text-3xl font-black mb-1">
            {loginType === 'admin' ? 'Admin Login' : 'ระบบลงทะเบียน'}
          </h2>
          <p className="text-white/70 text-sm font-medium">กลุ่มโรงเรียนตะเคียน-ลมศักดิ์</p>
        </div>

        <div className="flex bg-slate-50 border-b">
          <button onClick={() => setLoginType('school')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest ${loginType === 'school' ? 'bg-white text-blue-600' : 'text-slate-400'}`}>โรงเรียน</button>
          <button onClick={() => setLoginType('admin')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest ${loginType === 'admin' ? 'bg-white text-slate-800' : 'text-slate-400'}`}>แอดมิน</button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1 tracking-widest">Username</label>
            {loginType === 'school' ? (
              <div className="relative">
                <select
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer font-bold text-slate-700"
                  required
                >
                  <option value="" disabled>{isFetchingList ? 'กำลังโหลด...' : '--- เลือกชื่อผู้ใช้งาน ---'}</option>
                  {availableSchools.map(s => <option key={s.id} value={s.username}>{s.username}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
              </div>
            ) : (
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-800/10 font-bold" required />
            )}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1 tracking-widest">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-mono" required />
          </div>

          {error && <div className="p-4 bg-red-50 text-red-600 text-xs rounded-2xl border border-red-100 text-center font-black">{error}</div>}

          <button type="submit" disabled={isLoading} className={`w-full py-5 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${loginType === 'admin' ? 'bg-slate-800 shadow-slate-200' : 'bg-blue-600 shadow-blue-200'} disabled:opacity-50`}>
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : <>เข้าสู่ระบบ <ArrowRight size={22} /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
