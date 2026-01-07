
import React, { useState, useEffect } from 'react';
import { SCHOOLS } from '../constants';
import { School } from '../types';
import { 
  Users, 
  ClipboardList, 
  ShieldCheck, 
  Search, 
  Key, 
  CheckCircle, 
  RefreshCw,
  X,
  Save,
  User as UserIcon
} from 'lucide-react';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz39C9mFI9PgknFO-Kn8UkbaZu-ea6XUne7iVHdM5as6kmDXE95uPcPlf_Y7ffaMovQ/exec';

// Declare Swal globally
declare var Swal: any;

const AdminPage: React.FC = () => {
  const [schools, setSchools] = useState<School[]>(SCHOOLS);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync data from Google Sheets
  const syncFromSheets = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getAccounts`);
      const data = await response.json();
      
      if (data && typeof data === 'object') {
        const updatedSchools = SCHOOLS.map(s => ({
          ...s,
          username: data[s.id]?.username || s.name, // default username is school name
          password: data[s.id]?.password || `pass${s.id}`
        }));
        setSchools(updatedSchools);
        localStorage.setItem('managed_school_accounts', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to sync:', error);
      const saved = localStorage.getItem('managed_school_accounts');
      if (saved) {
        const credsMap = JSON.parse(saved);
        setSchools(SCHOOLS.map(s => ({
          ...s,
          username: credsMap[s.id]?.username || s.name,
          password: credsMap[s.id]?.password || `pass${s.id}`
        })));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncFromSheets();
  }, []);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;

    Swal.fire({
      title: 'กำลังบันทึกข้อมูล...',
      text: 'ระบบกำลังส่งข้อมูลไปยัง Google Sheets',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // Use URLSearchParams as requested
      const params = new URLSearchParams();
      params.append('action', 'updateAccount');
      params.append('id', editingSchool.id); // Column A: id (Automatic from school ID)
      params.append('username', editingSchool.username || editingSchool.name); // Column B: username (School Name)
      params.append('password', editingSchool.password || ''); // Column C: password

      const response = await fetch(`${SCRIPT_URL}?${params.toString()}`, {
        method: 'GET',
        mode: 'cors'
      });

      const result = await response.json();

      if (result.status === 'success') {
        setSchools(schools.map(s => s.id === editingSchool.id ? editingSchool : s));
        
        // Update Local Storage for persistence
        const credsMap = JSON.parse(localStorage.getItem('managed_school_accounts') || '{}');
        credsMap[editingSchool.id] = {
          username: editingSchool.username,
          password: editingSchool.password
        };
        localStorage.setItem('managed_school_accounts', JSON.stringify(credsMap));

        Swal.fire({
          icon: 'success',
          title: 'บันทึกข้อมูลถาวรสำเร็จ',
          text: 'ข้อมูลถูกบันทึกลง Google Sheets เรียบร้อยแล้ว',
          timer: 2000,
          showConfirmButton: false
        });
        setEditingSchool(null);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'การบันทึกล้มเหลว',
        text: 'ไม่สามารถเชื่อมต่อ Google Sheets ได้ในขณะนี้ ข้อมูลจะถูกเก็บในเครื่องชั่วคราว'
      });
      // Update locally even if cloud fails
      setSchools(schools.map(s => s.id === editingSchool.id ? editingSchool : s));
    }
  };

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <ShieldCheck className="text-slate-800" size={32} />
            แผงควบคุมผู้ดูแลระบบ
          </h2>
          <div className="flex items-center gap-2 text-slate-500">
            <p>จัดการบัญชีรายโรงเรียน (ฐานข้อมูล Google Sheets)</p>
            <button 
              onClick={syncFromSheets} 
              className={`p-1 hover:bg-slate-100 rounded-full transition-all ${isSyncing ? 'animate-spin text-blue-500' : ''}`}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard title="โรงเรียนในระบบ" value={SCHOOLS.length.toString()} icon={<Users />} color="bg-blue-500" />
        <SummaryCard title="ระบบจัดเก็บข้อมูล" value="Google Sheets" icon={<CheckCircle />} color="bg-emerald-500" />
        <SummaryCard title="Sheet Name" value="user" icon={<ClipboardList />} color="bg-indigo-500" />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Key size={20} className="text-blue-600" />
            ตารางจัดการ Username & Password
          </h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหาโรงเรียน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 w-full text-sm outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">ID (Auto)</th>
                <th className="px-6 py-4 font-bold">Username (โรงเรียน)</th>
                <th className="px-6 py-4 font-bold">Password</th>
                <th className="px-6 py-4 font-bold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchools.map((school) => (
                <tr key={school.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-400 text-sm font-mono">{school.id}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-700">{school.username || school.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="bg-slate-100 px-2 py-1 rounded text-slate-500 text-sm">••••••••</code>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setEditingSchool({...school, username: school.username || school.name})}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-all inline-flex items-center gap-2"
                    >
                      <Key size={14} /> แก้ไขข้อมูล
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingSchool && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-lg">ตั้งค่าบัญชีโรงเรียน</h4>
                <p className="text-blue-100 text-xs">บันทึกไปยัง Sheet: user</p>
              </div>
              <button onClick={() => setEditingSchool(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCredentials} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <UserIcon size={16} className="text-blue-600" />
                  Username (ชื่อโรงเรียน)
                </label>
                <input
                  type="text"
                  required
                  value={editingSchool.username || ''}
                  onChange={(e) => setEditingSchool({...editingSchool, username: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Key size={16} className="text-blue-600" />
                  Password
                </label>
                <input
                  type="text"
                  required
                  value={editingSchool.password || ''}
                  onChange={(e) => setEditingSchool({...editingSchool, password: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingSchool(null)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">
                  ยกเลิก
                </button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                  <Save size={18} /> บันทึกถาวร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-sm mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
    </div>
    <div className={`${color} p-3 rounded-2xl text-white`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
  </div>
);

export default AdminPage;
