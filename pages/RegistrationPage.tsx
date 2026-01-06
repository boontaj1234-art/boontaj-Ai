
import React, { useState } from 'react';
import { SPORTS, ICON_MAP } from '../constants';
import { ArrowLeft, CheckCircle2, ChevronRight, Search, Filter } from 'lucide-react';

interface RegistrationPageProps {
  onBack: () => void;
  schoolName: string;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ onBack, schoolName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [registeredSports, setRegisteredSports] = useState<string[]>(['fb11', 'vb']);

  const filteredSports = SPORTS.filter(sport => 
    sport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sport.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRegister = (id: string) => {
    setRegisteredSports(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header with Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-2 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            กลับหน้าแรก
          </button>
          <h2 className="text-3xl font-bold text-slate-900">ลงทะเบียนแข่งขันกีฬา</h2>
          <p className="text-slate-500 mt-1">ประจำปีการศึกษา 2567 — {schoolName}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหากีฬา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 transition-all"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Grid of Sports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSports.length > 0 ? (
          filteredSports.map((sport) => (
            <div 
              key={sport.id} 
              className={`bg-white rounded-3xl p-6 shadow-sm border-2 transition-all relative overflow-hidden group ${
                registeredSports.includes(sport.id) 
                  ? 'border-blue-600 bg-blue-50/30' 
                  : 'border-transparent hover:border-slate-200 hover:shadow-lg'
              }`}
            >
              {registeredSports.includes(sport.id) && (
                <div className="absolute top-4 right-4 text-blue-600">
                  <CheckCircle2 size={24} />
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:scale-110 ${
                registeredSports.includes(sport.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {ICON_MAP[sport.icon]}
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">{sport.name}</h3>
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium mb-4">
                {sport.category}
              </span>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                {sport.description}
              </p>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => toggleRegister(sport.id)}
                  className={`flex-grow py-3 rounded-xl font-bold text-sm transition-all ${
                    registeredSports.includes(sport.id)
                      ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                  }`}
                >
                  {registeredSports.includes(sport.id) ? 'ยกเลิกการลงทะเบียน' : 'ลงทะเบียน'}
                </button>
                <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Search size={40} />
            </div>
            <h4 className="text-xl font-bold text-slate-400">ไม่พบรายการกีฬาที่ค้นหา</h4>
            <p className="text-slate-400">ลองใช้คำค้นหาอื่นๆ เช่น "ฟุตบอล" หรือ "เปตอง"</p>
          </div>
        )}
      </div>

      {/* Quick Summary Sticky */}
      {registeredSports.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 z-40 animate-in slide-in-from-bottom-10 backdrop-blur-md bg-opacity-90">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
              {registeredSports.length}
            </div>
            <span className="text-sm font-medium whitespace-nowrap">รายการที่ลงทะเบียนแล้ว</span>
          </div>
          <div className="w-px h-8 bg-slate-700 hidden sm:block" />
          <button className="text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors whitespace-nowrap">
            บันทึกและส่งข้อมูล
          </button>
        </div>
      )}
    </div>
  );
};

export default RegistrationPage;
