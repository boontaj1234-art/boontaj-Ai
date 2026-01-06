
import React, { useState } from 'react';
import { SCHOOLS } from '../constants';
import { Lock, School, ArrowRight, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLogin: (schoolId: string, schoolName: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [selectedSchool, setSelectedSchool] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedSchool) {
      setError('กรุณาเลือกโรงเรียน');
      return;
    }

    if (!password) {
      setError('กรุณากรอกรหัสผ่าน');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const school = SCHOOLS.find(s => s.id === selectedSchool);
      if (school) {
        onLogin(school.id, school.name);
      }
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="max-w-md mx-auto mt-10 md:mt-20">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-blue-600 p-10 text-center text-white">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <School size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">เข้าสู่ระบบ</h2>
          <p className="text-blue-100 text-sm">สำหรับครูพลศึกษาและผู้ดูแลระบบโรงเรียน</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <School size={16} className="text-blue-600" />
              สังกัดโรงเรียน
            </label>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">-- เลือกโรงเรียน --</option>
              {SCHOOLS.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Lock size={16} className="text-blue-600" />
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2 group disabled:opacity-70"
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

      <p className="mt-8 text-center text-slate-400 text-xs">
        หากพบปัญหาการเข้าสู่ระบบ กรุณาติดต่อฝ่ายจัดการแข่งขันกีฬากลุ่มโรงเรียน
      </p>
    </div>
  );
};

export default LoginPage;
