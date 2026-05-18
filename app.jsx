import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-backend-js'; // Sesuaikan dengan library yang kamu pakai, umumya @supabase/supabase-js

// Inisialisasi Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  // State Kalender & Data
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  
  // State Admin (Fitur Rahasia)
  const [clickCount, setClickCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // State Modals / Forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    nama_masjid: '', alamat_masjid: '', nama_takmir: '', no_wa_takmir: '', jadwal_dibersihkan: '', status_selesai: false
  });

  // Fetch data dari Supabase saat bulan berubah
  useEffect(() => {
    fetchSchedules();
  }, [currentDate]);

  const fetchSchedules = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('masjid_schedules')
      .select('*')
      .gte('jadwal_dibersihkan', firstDay)
      .lte('jadwal_dibersihkan', lastDay);

    if (!error && data) setSchedules(data);
  };

  // Logika 5x Klik Judul untuk Mode Admin
  const handleHeaderClick = () => {
    if (isAdmin) return;
    setClickCount((prev) => {
      const newCount = prev + 1;
      if (newCount === 5) {
        setIsAdmin(true);
        alert('🔓 Mode Administrator Aktif!');
        return 0;
      }
      setTimeout(() => setClickCount(0), 3000); // Reset jika jeda terlalu lama
      return newCount;
    });
  };

  // Navigasi Bulan (iOS Style)
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Helper Pembuat Grid Kalender
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Padding untuk hari kosong di awal bulan (iOS start Sunday/Monday)
    const startDay = date.getDay(); 
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  // Handle Input / Submit Form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (editingSchedule) {
      // Update
      const { error } = await supabase.from('masjid_schedules').update(formData).eq('id', editingSchedule.id);
      if (!error) alert('Jadwal berhasil diperbarui!');
    } else {
      // Insert
      const { error } = await supabase.from('masjid_schedules').insert([formData]);
      if (!error) alert('Jadwal baru berhasil ditambahkan!');
    }
    resetForm();
    fetchSchedules();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
      const { error } = await supabase.from('masjid_schedules').delete().eq('id', id);
      if (!error) {
        alert('Jadwal terhapus');
        resetForm();
        fetchSchedules();
      }
    }
  };

  const resetForm = () => {
    setFormData({ nama_masjid: '', alamat_masjid: '', nama_takmir: '', no_wa_takmir: '', jadwal_dibersihkan: '', status_selesai: false });
    setShowAddForm(false);
    setEditingSchedule(null);
  };

  // Filter jadwal berdasarkan tanggal yang dipilih atau "Next Agenda"
  const formattedSelectedDate = selectedDateStr;
  const activeSchedules = schedules.filter(s => s.jadwal_dibersihkan === formattedSelectedDate);
  
  const nextAgendas = schedules
    .filter(s => new Date(s.jadwal_dibersihkan) >= new Date().setHours(0,0,0,0))
    .sort((a,b) => new Date(a.jadwal_dibersihkan) - new Date(b.jadwal_dibersihkan))
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans antialiased pb-12">
      
      {/* HEADER BAR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
        <h1 
          onClick={handleHeaderClick} 
          className="text-xl font-bold select-none cursor-pointer tracking-tight text-slate-800 active:opacity-60 transition"
        >
          🕌 Jadwal Korrem Masjid {isAdmin && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-1 font-semibold">Admin</span>}
        </h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button 
              onClick={() => { resetForm(); setShowAddForm(true); }} 
              className="bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow-sm transition"
            >
              +
            </button>
            <button onClick={() => setIsAdmin(false)} className="text-xs text-gray-400 hover:text-gray-600">Keluar Admin</button>
          </div>
        )}
      </header>

      <div className="max-w-md mx-auto px-4 mt-4 space-y-4">
        
        {/* IOS STYLE CALENDAR CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-4 text-blue-600 font-semibold">
              <button onClick={prevMonth} className="p-1 px-3 bg-gray-50 rounded-lg active:bg-gray-200">＆#10094;</button>
              <button onClick={nextMonth} className="p-1 px-3 bg-gray-50 rounded-lg active:bg-gray-200">＆#10095;</button>
            </div>
          </div>

          {/* Nama Hari */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-2">
            <div>Min</div><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div>
          </div>

          {/* Grid Tanggal */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {getDaysInMonth().map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;
              
              const dateStr = date.toISOString().split('T')[0];
              const hasSchedule = schedules.some(s => s.jadwal_dibersihkan === dateStr);
              const isSelected = selectedDateStr === dateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDateStr(isSelected ? null : dateStr)}
                  className={`relative py-2 text-sm font-medium rounded-xl flex flex-col items-center justify-center transition active:scale-95
                    ${isSelected ? 'bg-blue-600 text-white font-bold shadow-sm' : 'hover:bg-gray-50 text-slate-700'}
                    ${isToday && !isSelected ? 'text-blue-600 font-bold border border-blue-200 bg-blue-50' : ''}
                  `}
                >
                  {date.getDate()}
                  {/* Dot Marking */}
                  {hasSchedule && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* DETAIL MASJID SAAT KLIK TANGGAL */}
        {selectedDateStr && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-3 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-gray-500 text-xs tracking-wider uppercase">Jadwal Tanggal: {new Date(selectedDateStr).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</h3>
              <button onClick={() => setSelectedDateStr(null)} className="text-xs text-gray-400">Tutup</button>
            </div>
            
            {activeSchedules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Tidak ada jadwal pembersihan hari ini.</p>
            ) : (
              activeSchedules.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg text-slate-800">{item.nama_masjid}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status_selesai ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {item.status_selesai ? 'Selesai' : 'Rencana'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">📍 {item.alamat_masjid}</p>
                  <div className="text-xs text-gray-500 pt-1 border-t border-dashed flex justify-between items-center">
                    <div>
                      <p className="font-medium">Takmir: {item.nama_takmir}</p>
                    </div>
                    <a 
                      href={`https://wa.me/${item.no_wa_takmir.replace(/[^0-9]/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="bg-emerald-500 text-white px-3 py-1 rounded-full font-semibold hover:bg-emerald-600 transition"
                    >
                      💬 WhatsApp
                    </a>
                  </div>

                  {/* Opsi Admin (Edit/Delete) */}
                  {isAdmin && (
                    <div className="flex gap-2 pt-2 border-t mt-2">
                      <button 
                        onClick={() => { setEditingSchedule(item); setFormData(item); setShowAddForm(true); }}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-slate-700 text-xs py-1.5 font-medium rounded-lg text-center"
                      >
                        Edit Jadwal
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs py-1.5 font-medium rounded-lg text-center"
                      >
                        Hapus Jadwal
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* NEXT AGENDA (TAMPILAN AWAL SEBELUM / SESUDAH KLIK) */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs text-gray-400 tracking-wider uppercase pl-1">Agenda Mendatang (Next Agenda)</h3>
          <div className="space-y-2.5">
            {nextAgendas.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-gray-400 border border-gray-200 text-sm">Belum ada agenda terdekat.</div>
            ) : (
              nextAgendas.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-slate-800 text-base truncate">{item.nama_masjid}</h4>
                    <p className="text-xs text-gray-400 truncate">{item.alamat_masjid}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                      {new Date(item.jadwal_dibersihkan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* FORM INPUT MODAL (ADMIN ONLY) */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingSchedule ? 'Edit Jadwal Masjid' : 'Tambah Jadwal Korrem'}</h3>
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nama Masjid</label>
                <input required type="text" name="nama_masjid" value={formData.nama_masjid} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Alamat Masjid</label>
                <textarea required name="alamat_masjid" value={formData.alamat_masjid} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500" rows="2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nama Takmir</label>
                  <input required type="text" name="nama_takmir" value={formData.nama_takmir} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">No WA Takmir (628...)</label>
                  <input required type="text" name="no_wa_takmir" value={formData.no_wa_takmir} onChange={handleInputChange} placeholder="6281234..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tanggal Dibersihkan</label>
                <input required type="date" name="jadwal_dibersihkan" value={formData.jadwal_dibersihkan} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-center gap-2 py-1">
                <input type="checkbox" id="status_selesai" name="status_selesai" checked={formData.status_selesai} onChange={handleInputChange} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                <label htmlFor="status_selesai" className="text-sm font-medium text-slate-700">Sudah dibersihkan oleh Korrem</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition">Batal</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition shadow-md">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}