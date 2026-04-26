import { useState } from 'react'
import { Settings as SettingsIcon, Shield, Bell, User, Globe, Moon, CreditCard, ChevronRight } from 'lucide-react'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')

  const menuItems = [
    { id: 'profile', name: 'Profile Information', icon: User, desc: 'Manage your public name and avatar.' },
    { id: 'security', name: 'Security & Password', icon: Shield, desc: 'Update your password and login methods.' },
    { id: 'notifications', name: 'Notifications', icon: Bell, desc: 'Configure how you receive alerts.' },
    { id: 'preferences', name: 'Preferences', icon: Globe, desc: 'Language, timezone and theme settings.' },
    { id: 'billing', name: 'Plan & Billing', icon: CreditCard, desc: 'Manage your subscription and invoices.' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">System Settings</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Personalize your CRM experience and manage account security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
         {/* Navigation */}
         <div className="lg:col-span-4 space-y-2">
            {menuItems.map((item) => (
               <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-3xl text-left border-2 transition-all duration-300 group ${
                     activeTab === item.id 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' 
                        : 'bg-white border-transparent hover:border-gray-100 text-gray-500 hover:bg-gray-50'
                  }`}
               >
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-colors ${
                     activeTab === item.id ? 'bg-white/10 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-white'
                  }`}>
                     <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="font-bold text-sm tracking-tight">{item.name}</p>
                     <p className={`text-[10px] font-medium mt-0.5 line-clamp-1 ${activeTab === item.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {item.desc}
                     </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === item.id ? 'opacity-100' : ''}`} />
               </button>
            ))}
         </div>

         {/* Content */}
         <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 min-h-[500px]">
            <div className="flex items-center gap-6 mb-10">
               <div className="h-20 w-20 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 group cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <User className="h-8 w-8 group-hover:text-indigo-500" />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Profile Details</h3>
                  <p className="text-sm text-gray-500 font-medium">Upload a professional avatar for your team.</p>
               </div>
            </div>

            <form className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                     <input 
                        type="text" 
                        className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100/50 transition-all"
                        placeholder="John Doe"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                     <input 
                        type="email" 
                        disabled
                        className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-400 cursor-not-allowed"
                        placeholder="john@example.com"
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">About / Bio</label>
                  <textarea 
                     className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100/50 transition-all min-h-[120px] resize-none"
                     placeholder="Tell your team about yourself..."
                  />
               </div>

               <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Moon className="h-5 w-5" />
                     </div>
                     <span className="text-sm font-bold text-gray-700">Auto Dark Mode</span>
                  </div>
                  <button type="button" className="px-8 py-3 bg-indigo-600 text-white font-black text-xs rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                     SAVE CHANGES
                  </button>
               </div>
            </form>
         </div>
      </div>
    </div>
  )
}
