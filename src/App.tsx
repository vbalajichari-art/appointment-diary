/**
 * @license
 * All rights reserved
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  FileText, 
  Image as ImageIcon, 
  Mic, 
  Trash2, 
  Edit2, 
  Download, 
  ChevronLeft,
  MoreVertical,
  Filter,
  X,
  FileDown,
  Repeat
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addWeeks, addMonths, addYears, addDays, isBefore, parseISO, format } from 'date-fns';
import { db } from './db';
import { Category, Activity, QueryFilters, Attachment } from './types';
import { cn, formatDate, formatTime } from './lib/utils';

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) => {
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
    secondary: 'bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    ghost: 'hover:bg-zinc-100 text-zinc-600',
  };

  return (
    <button 
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }) => (
  <div className="space-y-1">
    {label && <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>}
    <input 
      className={cn(
        "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all",
        error && "border-red-500"
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const TextArea = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => (
  <div className="space-y-1">
    {label && <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>}
    <textarea 
      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all min-h-[100px]"
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: { value: string, label: string }[] }) => (
  <div className="space-y-1">
    {label && <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>}
    <select 
      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// --- Main App ---

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [view, setView] = useState<'list' | 'form' | 'search'>('list');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [filters, setFilters] = useState<QueryFilters>({});
  const [profile, setProfile] = useState<{ name: string; title: string; avatar?: Blob }>({
    name: 'Academic User',
    title: 'Associate Professor'
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const cats = await db.getCategories();
      setCategories(cats);
      
      const lastCat = localStorage.getItem('lastSelectedCategory');
      if (lastCat && cats.find(c => c.id === lastCat)) {
        setSelectedCategoryId(lastCat);
      } else if (cats.length > 0) {
        setSelectedCategoryId(cats[0].id);
      }

      const savedProfile = await db.getProfile();
      if (savedProfile) {
        setProfile(savedProfile);
        if (savedProfile.avatar) {
          setAvatarUrl(URL.createObjectURL(savedProfile.avatar));
        }
      }
    };
    loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const title = formData.get('title') as string;
    const avatarFile = (formData.get('avatar') as File).size > 0 ? formData.get('avatar') as File : profile.avatar;

    const newProfile = { name, title, avatar: avatarFile };
    await db.saveProfile(newProfile);
    setProfile(newProfile);
    if (avatarFile instanceof Blob) {
      setAvatarUrl(URL.createObjectURL(avatarFile));
    }
    setIsProfileModalOpen(false);
  };

  // Load activities when category changes or view changes to search
  useEffect(() => {
    const loadActivities = async () => {
      if (view === 'search') {
        const acts = await db.getActivities();
        setActivities(acts.sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        }));
      } else if (selectedCategoryId) {
        const acts = await db.getActivities(selectedCategoryId);
        setActivities(acts.sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        }));
        localStorage.setItem('lastSelectedCategory', selectedCategoryId);
      } else {
        setActivities([]);
      }
    };
    loadActivities();
  }, [selectedCategoryId, view]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = { id: uuidv4(), name: newCategoryName.trim() };
    await db.saveCategory(newCat);
    setCategories([...categories, newCat]);
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
    setSelectedCategoryId(newCat.id);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Delete this category and all its activities?')) {
      await db.deleteCategory(id);
      const updated = categories.filter(c => c.id !== id);
      setCategories(updated);
      if (selectedCategoryId === id) {
        setSelectedCategoryId(updated[0]?.id || null);
      }
    }
  };

  const handleViewAttachment = (att: Attachment) => {
    const url = URL.createObjectURL(att.blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
    } else {
      alert('Please allow popups to view attachments');
    }
  };

  const handleSaveActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const frequency = formData.get('frequency') as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    const interval = parseInt(formData.get('interval') as string) || 1;
    const endDate = formData.get('endDate') as string;
    const startDateStr = formData.get('date') as string;
    const targetCategoryId = formData.get('categoryId') as string;
    const seriesId = editingActivity?.recurrence?.seriesId || (frequency !== 'none' ? uuidv4() : undefined);

    const baseActivity: Omit<Activity, 'id' | 'date'> = {
      categoryId: targetCategoryId || selectedCategoryId!,
      title: formData.get('title') as string,
      time: formData.get('time') as string,
      venue: formData.get('venue') as string,
      contactPerson: formData.get('contactPerson') as string,
      contactInfo: formData.get('contactInfo') as string,
      notes: formData.get('notes') as string,
      attachments: editingActivity?.attachments || [],
      recurrence: frequency !== 'none' ? { frequency, endDate, seriesId, interval } : undefined,
    };

    if (frequency === 'none' || editingActivity?.id) {
      // Simple save or update single instance
      const activity: Activity = {
        ...baseActivity,
        id: editingActivity?.id || uuidv4(),
        date: startDateStr,
      };
      await db.saveActivity(activity);
    } else {
      // Generate series
      let currentDate = parseISO(startDateStr);
      const endLimit = parseISO(endDate);
      
      while (!isBefore(endLimit, currentDate)) {
        const activity: Activity = {
          ...baseActivity,
          id: uuidv4(),
          date: format(currentDate, 'yyyy-MM-dd'),
        };
        await db.saveActivity(activity);
        
        if (frequency === 'daily') currentDate = addDays(currentDate, 1);
        else if (frequency === 'weekly') currentDate = addWeeks(currentDate, 1);
        else if (frequency === 'monthly') currentDate = addMonths(currentDate, 1);
        else if (frequency === 'yearly') currentDate = addYears(currentDate, 1);
        else if (frequency === 'custom') currentDate = addDays(currentDate, interval);
        else break;
      }
    }
    
    // Refresh list
    const updated = await db.getActivities(selectedCategoryId!);
    setActivities(updated.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
    setView('list');
    setEditingActivity(null);
  };

  const handleDeleteActivity = async (id: string) => {
    if (confirm('Delete this activity?')) {
      await db.deleteActivity(id);
      setActivities(activities.filter(a => a.id !== id));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !editingActivity) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let type: Attachment['type'] = 'pdf';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('audio/')) type = 'audio';
      else if (file.type !== 'application/pdf') continue;

      newAttachments.push({
        id: uuidv4(),
        name: file.name,
        type,
        blob: file,
      });
    }

    const updatedActivity = {
      ...editingActivity,
      attachments: [...editingActivity.attachments, ...newAttachments],
    };
    setEditingActivity(updatedActivity);
  };

  const removeAttachment = (id: string) => {
    if (!editingActivity) return;
    setEditingActivity({
      ...editingActivity,
      attachments: editingActivity.attachments.filter(a => a.id !== id),
    });
  };

  const exportToPDF = (data: Activity[]) => {
    const doc = new jsPDF();
    const categoryName = view === 'search' ? 'Global Search' : (categories.find(c => c.id === selectedCategoryId)?.name || 'Diary');
    
    doc.setFontSize(18);
    doc.text(`${categoryName} - Appointment Export`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = data.map(a => [
      categories.find(c => c.id === a.categoryId)?.name || 'Unknown',
      a.date,
      a.time,
      a.title,
      a.venue || '-',
      a.contactPerson || '-',
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Category', 'Date', 'Time', 'Title', 'Venue', 'Contact']],
      body: tableData,
      headStyles: { fillColor: [20, 20, 20] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`diary_export_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`);
  };

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      if (filters.categoryId && a.categoryId !== filters.categoryId) return false;
      if (filters.title && !a.title.toLowerCase().includes(filters.title.toLowerCase())) return false;
      if (filters.venue && !a.venue?.toLowerCase().includes(filters.venue.toLowerCase())) return false;
      if (filters.contactPerson && !a.contactPerson?.toLowerCase().includes(filters.contactPerson.toLowerCase())) return false;
      if (filters.dateFrom && a.date < filters.dateFrom) return false;
      if (filters.dateTo && a.date > filters.dateTo) return false;
      return true;
    });
  }, [activities, filters]);

  const uniqueActivityTitles = useMemo(() => {
    const titles = Array.from(new Set(activities.map(a => a.title))).sort();
    return [{ value: '', label: 'All Activities' }, ...titles.map(t => ({ value: t, label: t }))];
  }, [activities]);

  const categoryOptions = useMemo(() => {
    return [{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))];
  }, [categories]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col md:flex-row overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar / Category List */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-zinc-200 flex flex-col h-screen z-50 transition-transform duration-300 md:translate-x-0 md:sticky md:top-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Diary
            </h1>
            <p className="text-xs text-zinc-500 mt-1 font-medium uppercase tracking-widest">Appointments</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Categories</span>
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="p-1 hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <p className="text-sm text-zinc-400 italic">No categories yet.</p>
              <Button 
                variant="secondary" 
                className="mt-4 w-full text-xs"
                onClick={() => setIsCategoryModalOpen(true)}
              >
                Create First Category
              </Button>
            </div>
          ) : (
            categories.map(cat => (
              <div 
                key={cat.id}
                className={cn(
                  "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all",
                  selectedCategoryId === cat.id ? "bg-zinc-900 text-white shadow-lg" : "hover:bg-zinc-100 text-zinc-600"
                )}
                onClick={() => {
                  setSelectedCategoryId(cat.id);
                  setView('list');
                }}
              >
                <span className="text-sm font-medium truncate">{cat.name}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(cat.id);
                  }}
                  className={cn(
                    "p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-md",
                    selectedCategoryId === cat.id ? "hover:bg-white/20 text-white" : "hover:bg-zinc-200 text-zinc-400"
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 px-2 w-full text-left hover:bg-zinc-100 py-2 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden border border-zinc-300">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-zinc-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate group-hover:text-zinc-900">{profile.name}</p>
              <p className="text-[10px] text-zinc-500 truncate uppercase tracking-wider">{profile.title}</p>
            </div>
          </button>
          
          <div className="mt-4 px-2 space-y-1">
            <p className="text-[9px] text-zinc-400 font-medium">
              Copyright © 2026 Balaji Venkatachary
            </p>
            <p className="text-[9px] text-zinc-400 font-medium">
              All rights reserved
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-zinc-200 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 md:hidden"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {view !== 'list' && (
              <button 
                onClick={() => {
                  setView('list');
                  setEditingActivity(null);
                }}
                className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {view === 'form' ? (editingActivity?.id ? 'Edit Activity' : 'New Activity') : 
                 view === 'search' ? 'Search & Filter' : 
                 selectedCategory?.name || 'Select a Category'}
              </h2>
              {view === 'list' && selectedCategory && (
                <p className="text-xs text-zinc-500">{activities.length} activities found</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {view === 'list' && selectedCategory && (
              <>
                <Button variant="ghost" className="p-2" onClick={() => setView('search')}>
                  <Search className="w-5 h-5" />
                </Button>
                <Button variant="ghost" className="p-2" onClick={() => exportToPDF(filteredActivities)}>
                  <FileDown className="w-5 h-5" />
                </Button>
                <Button 
                  onClick={() => {
                    setEditingActivity({
                      id: '',
                      categoryId: selectedCategoryId!,
                      title: '',
                      date: new Date().toISOString().split('T')[0],
                      time: '09:00',
                      attachments: [],
                    });
                    setView('form');
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Activity</span>
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {view === 'list' && (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {activities.length === 0 ? (
                  <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-zinc-300" />
                    </div>
                    <h3 className="text-lg font-semibold">No activities yet</h3>
                    <p className="text-sm text-zinc-500 mt-1 max-w-xs mx-auto">
                      Start tracking your academic appointments by adding your first activity to this category.
                    </p>
                    <Button 
                      className="mt-6 mx-auto"
                      onClick={() => {
                        setEditingActivity({
                          id: '',
                          categoryId: selectedCategoryId!,
                          title: '',
                          date: new Date().toISOString().split('T')[0],
                          time: '09:00',
                          attachments: [],
                        });
                        setView('form');
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add First Activity
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activities.map(activity => (
                      <div 
                        key={activity.id}
                        className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                {formatDate(activity.date)} • {formatTime(activity.time)}
                              </span>
                              {activity.recurrence && activity.recurrence.frequency !== 'none' && (
                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  <Repeat className="w-2.5 h-2.5" />
                                  {activity.recurrence.frequency}
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold leading-tight">{activity.title}</h3>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingActivity(activity);
                                setView('form');
                              }}
                              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-600 mb-4">
                          {activity.venue && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-zinc-400" />
                              <span>{activity.venue}</span>
                            </div>
                          )}
                          {activity.contactPerson && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-zinc-400" />
                              <span>{activity.contactPerson}</span>
                            </div>
                          )}
                        </div>

                        {activity.notes && (
                          <p className="text-sm text-zinc-500 line-clamp-2 mb-4 italic">
                            "{activity.notes}"
                          </p>
                        )}

                        {activity.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-100">
                            {activity.attachments.map(att => (
                              <button 
                                key={att.id}
                                onClick={() => handleViewAttachment(att)}
                                className="flex items-center gap-2 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-[10px] font-medium text-zinc-600 hover:bg-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer group/att"
                                title="Click to view attachment"
                              >
                                {att.type === 'image' ? <ImageIcon className="w-3 h-3" /> : 
                                 att.type === 'audio' ? <Mic className="w-3 h-3" /> : 
                                 <FileText className="w-3 h-3" />}
                                <span className="truncate max-w-[100px]">{att.name}</span>
                                <Download className="w-2.5 h-2.5 opacity-0 group-hover/att:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {view === 'form' && (
              <motion.div 
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm"
              >
                <form onSubmit={handleSaveActivity} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Select 
                        label="Category"
                        name="categoryId"
                        defaultValue={editingActivity?.categoryId || selectedCategoryId!}
                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input 
                        label="Activity Title" 
                        name="title" 
                        required 
                        defaultValue={editingActivity?.title}
                        placeholder="e.g., Proctor Meeting with Research Group"
                      />
                    </div>
                    <Input 
                      label="Date" 
                      name="date" 
                      type="date" 
                      required 
                      defaultValue={editingActivity?.date}
                    />
                    <Input 
                      label="Time" 
                      name="time" 
                      type="time" 
                      required 
                      defaultValue={editingActivity?.time}
                    />
                    <Input 
                      label="Venue" 
                      name="venue" 
                      defaultValue={editingActivity?.venue}
                      placeholder="e.g., Room 402, Academic Block"
                    />
                    <Input 
                      label="Contact Person" 
                      name="contactPerson" 
                      defaultValue={editingActivity?.contactPerson}
                      placeholder="e.g., Dr. Smith"
                    />
                    <div className="md:col-span-2">
                      <Input 
                        label="Contact Information" 
                        name="contactInfo" 
                        defaultValue={editingActivity?.contactInfo}
                        placeholder="e.g., smith@university.edu"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <TextArea 
                        label="Notes" 
                        name="notes" 
                        defaultValue={editingActivity?.notes}
                        placeholder="Add any additional details or agenda items..."
                      />
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-zinc-100">
                      <div className="flex items-center gap-2 mb-4">
                        <Repeat className="w-4 h-4 text-zinc-400" />
                        <h4 className="text-sm font-bold">Recurrence Settings</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select 
                          label="Repeat Frequency"
                          name="frequency"
                          defaultValue={editingActivity?.recurrence?.frequency || 'none'}
                          options={[
                            { value: 'none', label: 'Does not repeat' },
                            { value: 'daily', label: 'Daily' },
                            { value: 'weekly', label: 'Weekly' },
                            { value: 'monthly', label: 'Monthly' },
                            { value: 'yearly', label: 'Yearly' },
                            { value: 'custom', label: 'Custom (Every X Days)' },
                          ]}
                        />
                        <Input 
                          label="Repeat Every X Days (Custom)"
                          name="interval"
                          type="number"
                          min="1"
                          defaultValue={editingActivity?.recurrence?.interval || 1}
                        />
                        <Input 
                          label="Repeat Until"
                          name="endDate"
                          type="date"
                          defaultValue={editingActivity?.recurrence?.endDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-2 italic">
                        * Repeating activities will be generated as individual instances up to the end date.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Attachments</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {editingActivity?.attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200 flex-shrink-0">
                              {att.type === 'image' ? <ImageIcon className="w-4 h-4 text-blue-500" /> : 
                               att.type === 'audio' ? <Mic className="w-4 h-4 text-emerald-500" /> : 
                               <FileText className="w-4 h-4 text-red-500" />}
                            </div>
                            <span className="text-xs font-medium truncate">{att.name}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-200 rounded-xl hover:border-zinc-400 hover:bg-zinc-50 transition-all cursor-pointer group">
                        <Plus className="w-6 h-6 text-zinc-300 group-hover:text-zinc-500 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-500">Add Files</span>
                        <input 
                          type="file" 
                          multiple 
                          className="hidden" 
                          onChange={handleFileUpload}
                          accept="image/*,audio/*,application/pdf"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-100 flex items-center justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => {
                        setView('list');
                        setEditingActivity(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingActivity?.id ? 'Update Activity' : 'Save Activity'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {view === 'search' && (
              <motion.div 
                key="search"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Select 
                      label="Category"
                      options={categoryOptions}
                      value={filters.categoryId || ''}
                      onChange={e => setFilters({...filters, categoryId: e.target.value})}
                    />
                    <Select 
                      label="Activity Title (Dropdown)"
                      options={uniqueActivityTitles}
                      value={filters.title || ''}
                      onChange={e => setFilters({...filters, title: e.target.value})}
                    />
                    <Input 
                      label="Title (Search)" 
                      placeholder="Search by title..." 
                      value={filters.title || ''}
                      onChange={e => setFilters({...filters, title: e.target.value})}
                    />
                    <Input 
                      label="Venue" 
                      placeholder="Search by venue..." 
                      value={filters.venue || ''}
                      onChange={e => setFilters({...filters, venue: e.target.value})}
                    />
                    <Input 
                      label="Contact" 
                      placeholder="Search by contact..." 
                      value={filters.contactPerson || ''}
                      onChange={e => setFilters({...filters, contactPerson: e.target.value})}
                    />
                    <Input 
                      label="From Date" 
                      type="date" 
                      value={filters.dateFrom || ''}
                      onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                    />
                    <Input 
                      label="To Date" 
                      type="date" 
                      value={filters.dateTo || ''}
                      onChange={e => setFilters({...filters, dateTo: e.target.value})}
                    />
                    <div className="flex items-end">
                      <Button 
                        variant="secondary" 
                        className="w-full"
                        onClick={() => setFilters({})}
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                          <th className="px-6 py-3 font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Category</th>
                          <th className="px-6 py-3 font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Date & Time</th>
                          <th className="px-6 py-3 font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Title</th>
                          <th className="px-6 py-3 font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Venue</th>
                          <th className="px-6 py-3 font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Contact</th>
                          <th className="px-6 py-3 font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Files</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filteredActivities.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic">
                              No results matching your filters.
                            </td>
                          </tr>
                        ) : (
                          filteredActivities.map(a => (
                            <tr key={a.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold uppercase text-zinc-500">
                                  {categories.find(c => c.id === a.categoryId)?.name || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-medium">
                                {formatDate(a.date)}<br/>
                                <span className="text-xs text-zinc-400">{formatTime(a.time)}</span>
                              </td>
                              <td className="px-6 py-4 font-semibold">
                                <div className="flex items-center gap-2">
                                  {a.title}
                                  {a.recurrence && a.recurrence.frequency !== 'none' && (
                                    <Repeat className="w-3 h-3 text-emerald-600" title={`Repeats ${a.recurrence.frequency}`} />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-zinc-500">{a.venue || '-'}</td>
                              <td className="px-6 py-4 text-zinc-500">{a.contactPerson || '-'}</td>
                              <td className="px-6 py-4">
                                <div className="flex gap-1">
                                  {a.attachments.map(att => (
                                    <button 
                                      key={att.id}
                                      onClick={() => handleViewAttachment(att)}
                                      className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 transition-colors"
                                      title={att.name}
                                    >
                                      {att.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : 
                                       att.type === 'audio' ? <Mic className="w-3.5 h-3.5" /> : 
                                       <FileText className="w-3.5 h-3.5" />}
                                    </button>
                                  ))}
                                  {a.attachments.length === 0 && <span className="text-zinc-300">-</span>}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {filteredActivities.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => exportToPDF(filteredActivities)}>
                      <Download className="w-4 h-4" />
                      Export Results to PDF
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
              onClick={() => setIsCategoryModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-2">Create New Category</h3>
              <p className="text-sm text-zinc-500 mb-6">Organize your appointments by grouping them into categories like Classes, Meetings, or Research.</p>
              
              <div className="space-y-4">
                <Input 
                  label="Category Name" 
                  autoFocus
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  placeholder="e.g., Research Discussion"
                />
                
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddCategory}>Create Category</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
              onClick={() => setIsProfileModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-2">Edit Profile</h3>
              <p className="text-sm text-zinc-500 mb-6">Personalize your diary with your name, title, and profile picture.</p>
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <Input 
                  label="Full Name" 
                  name="name"
                  defaultValue={profile.name}
                  required
                />
                <Input 
                  label="Title" 
                  name="title"
                  defaultValue={profile.title}
                  required
                />
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Profile Picture</label>
                  <input 
                    type="file" 
                    name="avatar"
                    accept="image/*"
                    className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-50 file:text-zinc-700 hover:file:bg-zinc-100"
                  />
                </div>
                
                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setIsProfileModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
