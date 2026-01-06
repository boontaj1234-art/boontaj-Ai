
import React from 'react';
import { UserSession } from '../types';
import { ClipboardList, Trophy, Users, Info, ChevronRight, MessageSquareCode } from 'lucide-react';

interface DashboardPageProps {
  session: UserSession;
  onNavigate: (path: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ session, onNavigate }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">ยินดีต้อนรับ</h2>
          <p className="text-xl text-blue-100 font-medium mb-2">{session.schoolName}</p>
          <p className="text-blue-200/80 leading-relaxed">
            ท่านสามารถจัดการการลงทะเบียนนักกีฬา ตรวจสอบตารางการแข่งขัน และติดตามผลการแข่งขันของโรงเรียนได้ที่นี่
          </p>
        </div>
        <Trophy className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/10 rotate-12" />
      </section>

      {/* Statistics Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm">กีฬาที่ลงทะเบียนแล้ว</p>
            <p className="text-2xl font-bold text-slate-800">5 / 9</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm">รางวัลที่ได้รับ</p>
            <p className="text-2xl font-bold text-slate-800">2 เหรียญ</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm">จำนวนนักกีฬาทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-800">42 คน</p>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <div className="w-2 h-6 bg-blue-600 rounded-full" />
          เมนูการจัดการ
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <MenuCard 
            title="ลงทะเบียนกีฬา" 
            desc="เลือกประเภทกีฬาและส่งรายชื่อนักกีฬาเข้าร่วมแข่งขัน"
            icon={<ClipboardList className="w-10 h-10" />}
            color="bg-blue-600"
            onClick={() => onNavigate('register')}
          />
          <MenuCard 
            title="ตรวจสอบรายชื่อ" 
            desc="ดูรายชื่อนักกีฬาที่ส่งเข้าร่วมการแข่งขันแยกตามประเภท"
            icon={<Users className="w-10 h-10" />}
            color="bg-indigo-600"
            onClick={() => {}}
          />
          <MenuCard 
            title="ระเบียบการแข่งขัน" 
            desc="อ่านกติกาและกำหนดการของแต่ละประเภทกีฬา"
            icon={<Info className="w-10 h-10" />}
            color="bg-emerald-600"
            onClick={() => {}}
          />
        </div>
      </div>
      
      {/* AI Assistant Promo */}
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-blue-300 transition-colors">
        <div className="flex items-center gap-5">
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
            <MessageSquareCode size={32} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">AI ผู้ช่วยวางแผนการแข่งขัน</h4>
            <p className="text-sm text-slate-500">สอบถามกติกาหรือให้ AI ช่วยวิเคราะห์ตารางแข่งขันได้ทันที</p>
          </div>
        </div>
        <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg whitespace-nowrap">
          ลองใช้เลย
        </button>
      </div>
    </div>
  );
};

const MenuCard = ({ title, desc, icon, color, onClick }: any) => (
  <button 
    onClick={onClick}
    className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-left group hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full"
  >
    <div className={`${color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-current/20`}>
      {icon}
    </div>
    <h4 className="text-lg font-bold text-slate-800 mb-2">{title}</h4>
    <p className="text-sm text-slate-500 mb-6 flex-grow">{desc}</p>
    <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm group-hover:gap-3 transition-all">
      ดำเนินการต่อ
      <ChevronRight size={16} />
    </div>
  </button>
);

export default DashboardPage;
