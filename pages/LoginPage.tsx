
import React, { useState } from 'react';
import { SCHOOLS } from '../constants';
import { Lock, School, ArrowRight, Loader2, ShieldCheck, User } from 'lucide-react';

interface LoginPageProps {
  onLogin: (schoolId: string, schoolName: string, isAdmin?: boolean) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [loginType, setLoginType] = useState<'school' | 'admin'>('school');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [username, setUsername] = useState(''); // Used for Admin login
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (loginType === 'admin') {
        if (username === 'admin' && password === 'admin12345') {
          onLogin('admin', 'ผู้ดูแลระบบกลาง', true);
        } else {
          setError('Username หรือ Password ของ Admin ไม่ถูกต้อง');
        }
      } else {
        // School Login Logic
        if (!selectedSchool) {
          setError('กรุณาเลือกโรงเรียน');
        } else if (!password) {
          setError('กรุณากรอกรหัสผ่าน');
        } else {
          // Check against managed credentials in localStorage
          const credsMap = JSON.parse(localStorage.getItem('managed_school_accounts') || '{}');
          const managedCreds = credsMap[selectedSchool];
          
          const school = SCHOOLS.find(s => s.id === selectedSchool);
          if (!school) {
            setError('ไม่พบข้อมูลโรงเรียน');
            setIsLoading(false);
            return;
          }

          // Use school name as default username if not custom defined
          const expectedUser = managedCreds?.username || school.name;
          const expectedPass = managedCreds?.password || `pass${selectedSchool}`;

          if (password === expectedPass) {
            onLogin(school.id, school.name, false);
          } else {
            setError('รหัสผ่านไม่ถูกต้อง');
          }
        }
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto mt-10 md:mt-20">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className={`p-8 text-center text-white transition-colors duration-500 ${loginType === 'admin' ? 'bg-slate-800' : 'bg-blue-600'}`}>
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {loginType === 'admin' ? <ShieldCheck size={32} /> : <School size={32} />}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {loginType === 'admin' ? 'Admin Portal' : 'เข้าสู่ระบบโรงเรียน'}
          </h2>
          <p className="text-white/70 text-sm">
            {loginType === 'admin' ? 'ระบบจัดการข้อมูลกลุ่มโรงเรียน' : 'สำหรับครูพลศึกษาและผู้ดูแลระบบโรงเรียน'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button 
            onClick={() => { setLoginType('school'); setError(''); setUsername(''); setPassword(''); }}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${loginType === 'school' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            โรงเรียน
          </button>
          <button 
            onClick={() => { setLoginType('admin'); setError(''); setUsername(''); setPassword(''); }}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${loginType === 'admin' ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
          >
            ผู้ดูแลระบบ
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {loginType === 'school' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <School size={16} className="text-blue-600" />
                เลือกสังกัดโรงเรียน
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">-- เลือกโรงเรียน --</option>
                {SCHOOLS.map((school) => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <User size={16} className="text-slate-600" />
                ชื่อผู้ใช้งาน (Admin Username)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้งานแอดมิน"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Lock size={16} className={loginType === 'admin' ? 'text-slate-600' : 'text-blue-600'} />
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 transition-all ${loginType === 'admin' ? 'focus:ring-slate-800' : 'focus:ring-blue-500'}`}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-70 ${
              loginType === 'admin' ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                เข้าสู่ระบบ
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
