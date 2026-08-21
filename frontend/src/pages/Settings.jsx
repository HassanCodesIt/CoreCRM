import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Shield, Bell, User, Globe, Moon, CreditCard, ChevronRight, Plus, Trash2, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { emailRoleMappingsApi } from '../api/emailRoleMappings'
import { authApi } from '../api/auth'
import toast from 'react-hot-toast'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, updateUser } = useAuthStore()

  // Profile fields state
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [bio, setBio] = useState(user?.bio || '')

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setBio(user.bio || '')
    }
  }, [user])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      const res = await authApi.updateMe({ full_name: fullName, bio: bio })
      updateUser(res.data)
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to update profile')
    }
  }

  // Pre-mapped roles states
  const [mappings, setMappings] = useState([])
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('rep')
  const [loadingMappings, setLoadingMappings] = useState(false)

  const menuItems = [
    { id: 'profile', name: 'Profile Information', icon: User, desc: 'Manage your public name and avatar.' },
    { id: 'security', name: 'Security & Password', icon: Shield, desc: 'Update your password and login methods.' },
    { id: 'notifications', name: 'Notifications', icon: Bell, desc: 'Configure how you receive alerts.' },
    { id: 'preferences', name: 'Preferences', icon: Globe, desc: 'Language, timezone and theme settings.' },
    ...(user?.role === 'admin' || user?.role === 'manager' ? [
      { id: 'team_access', name: 'Team Access Roles', icon: Shield, desc: 'Pre-assign user roles by email address.' }
    ] : []),
    { id: 'billing', name: 'Plan & Billing', icon: CreditCard, desc: 'Manage your subscription and invoices.' },
  ]

  const fetchMappings = async () => {
    setLoadingMappings(true)
    try {
      const res = await emailRoleMappingsApi.getAll()
      setMappings(res.data?.items || [])
    } catch {
      toast.error('Failed to load role mappings')
    } finally {
      setLoadingMappings(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'team_access') {
      fetchMappings()
    }
  }, [activeTab])

  const handleAddMapping = async (e) => {
    e.preventDefault()
    if (!newEmail) return
    try {
      await emailRoleMappingsApi.create({ email: newEmail, role: newRole })
      setNewEmail('')
      setNewRole('rep')
      toast.success('Access role mapped successfully')
      fetchMappings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to map role')
    }
  }

  const handleDeleteMapping = async (mappingId) => {
    try {
      await emailRoleMappingsApi.delete(mappingId)
      toast.success('Mapping removed')
      fetchMappings()
    } catch {
      toast.error('Failed to remove mapping')
    }
  }

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
            {activeTab === 'profile' && (
               <>
                  <div className="flex items-center gap-6 mb-10">
                     <div className="h-20 w-20 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 group cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                        <User className="h-8 w-8 group-hover:text-indigo-500" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Profile Details</h3>
                        <p className="text-sm text-gray-500 font-medium">Upload a professional avatar for your team.</p>
                     </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                           <input 
                              type="text" 
                              className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100/50 transition-all"
                              placeholder="John Doe"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              required
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                           <input 
                              type="email" 
                              disabled
                              className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-400 cursor-not-allowed"
                              placeholder="john@example.com"
                              defaultValue={user?.email}
                           />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">About / Bio</label>
                        <textarea 
                           className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100/50 transition-all min-h-[120px] resize-none"
                           placeholder="Tell your team about yourself..."
                           value={bio}
                           onChange={(e) => setBio(e.target.value)}
                        />
                     </div>

                     <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                              <Moon className="h-5 w-5" />
                           </div>
                           <span className="text-sm font-bold text-gray-700">Auto Dark Mode</span>
                        </div>
                        <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-black text-xs rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                           SAVE CHANGES
                        </button>
                     </div>
                  </form>
               </>
            )}

            {activeTab === 'team_access' && (
               <div className="space-y-8 animate-fade-in">
                  <div>
                     <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Shield className="h-6 w-6 text-indigo-600" />
                        Team Access Roles
                     </h3>
                     <p className="text-sm text-gray-500 font-medium mt-1">Pre-assign roles to team members. When they register with the specified email, they will automatically join your tenant with the assigned role.</p>
                  </div>

                  {/* Add Mapping Form */}
                  <form onSubmit={handleAddMapping} className="p-6 bg-gray-50/50 border border-gray-100 rounded-3xl space-y-4">
                     <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">Add Pre-mapped Role</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                           <input
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              placeholder="colleague@company.com"
                              required
                              className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100/50 transition-all"
                           />
                        </div>
                        <div>
                           <select
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100/50 transition-all capitalize"
                           >
                              <option value="rep">Representative (Rep)</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Administrator</option>
                           </select>
                        </div>
                     </div>
                     <div className="flex justify-end">
                        <button
                           type="submit"
                           className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-100 transition-all"
                        >
                           <Plus className="h-3.5 w-3.5" />
                           Map Access Email
                        </button>
                     </div>
                  </form>

                  {/* Mappings Table */}
                  <div className="space-y-3">
                     <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">Designated Mappings</h4>
                     {loadingMappings ? (
                        <div className="space-y-2">
                           {[1, 2].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
                        </div>
                     ) : mappings.length > 0 ? (
                        <div className="overflow-x-auto border border-gray-50 rounded-2xl">
                           <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                 <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Designated Email</th>
                                    <th className="p-4 font-bold text-gray-500 uppercase tracking-widest text-[9px]">Assigned Role</th>
                                    <th className="p-4 font-bold text-gray-500 uppercase tracking-widest text-[9px] text-right">Actions</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                 {mappings.map((mapping) => (
                                    <tr key={mapping.id} className="hover:bg-gray-50/50">
                                       <td className="p-4 font-bold text-gray-900">{mapping.email}</td>
                                       <td className="p-4">
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                             mapping.role === 'admin' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                             mapping.role === 'manager' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                             'bg-blue-50 text-blue-700 border border-blue-100'
                                          }`}>
                                             {mapping.role}
                                          </span>
                                       </td>
                                       <td className="p-4 text-right">
                                          <button
                                             onClick={() => handleDeleteMapping(mapping.id)}
                                             className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                             title="Delete Mapping"
                                          >
                                             <Trash2 className="h-4 w-4" />
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="p-8 border border-dashed border-gray-200 rounded-3xl text-center bg-gray-50/30">
                           <ShieldAlert className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                           <p className="text-xs text-gray-500 font-medium">No pre-assigned access roles configured yet.</p>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {activeTab !== 'profile' && activeTab !== 'team_access' && (
               <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <Globe className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-bold text-gray-900">Settings Section Configured</h3>
                  <p className="text-sm text-gray-500 max-w-sm mt-1">This section ({activeTab}) is pre-configured on the server and runs in cloud-synced mode.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  )
}
