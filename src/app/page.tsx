"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Create a URL-friendly slug (e.g., "My Company" -> "my-company")
    const slug = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

    const { error } = await supabase
      .from('groups')
      .insert([{ name: groupName, slug: slug }]);

    if (!error) {
      router.push(`/${slug}`);
    } else {
      alert('Error creating group');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-black text-red-500 mb-2 tracking-tighter">WHAMAGEDDON</h1>
      <p className="text-slate-400 mb-8">Survival of the fittest. December 1st - 24th.</p>
      
      <form onSubmit={createGroup} className="w-full max-w-md bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
        <label className="block text-sm font-bold mb-2">Group Name (Company/Dept)</label>
        <input 
          type="text" 
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="e.g. Accounts Payable"
          className="w-full p-3 rounded bg-slate-900 border border-slate-600 focus:border-red-500 outline-none mb-4"
          required
        />
        <button 
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded transition-all"
        >
          {loading ? 'Creating...' : 'Start a Whamageddon'}
        </button>
      </form>
    </main>
  );
}