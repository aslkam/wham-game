"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase directly here
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Player = {
  id: string;
  name: string;
  status: 'alive' | 'whammed';
  whammed_at: string;
};

export default function GroupPage() {
  const params = useParams();
  const slug = params.slug;

  const [groupName, setGroupName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const storedId = localStorage.getItem(`wham_player_${slug}`);
    if (storedId) setMyPlayerId(storedId);

    const fetchGroupData = async () => {
      const { data: group } = await supabase.from('groups').select('name').eq('slug', slug).single();
      if (group) setGroupName(group.name);

      const { data: playerList } = await supabase
        .from('players')
        .select('*')
        .eq('group_slug', slug)
        .order('whammed_at', { ascending: false, nullsFirst: true });
      
      if (playerList) setPlayers(playerList);
    };

    fetchGroupData();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `group_slug=eq.${slug}` }, 
      () => fetchGroupData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const { data, error } = await supabase
      .from('players')
      .insert([{ group_slug: slug, name: newName, status: 'alive' }])
      .select()
      .single();

    if (data && !error) {
      localStorage.setItem(`wham_player_${slug}`, data.id);
      setMyPlayerId(data.id);
      setNewName('');
    }
  };

  const iGotWhammed = async () => {
    if (!confirm("Are you sure? Once you admit defeat, there is no going back.")) return;
    await supabase.from('players').update({ status: 'whammed', whammed_at: new Date() }).eq('id', myPlayerId);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied!');
  };

  const survivors = players.filter(p => p.status === 'alive');
  const fallen = players.filter(p => p.status === 'whammed');
  const me = players.find(p => p.id === myPlayerId);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <div>
            <h2 className="text-sm text-red-500 font-bold tracking-widest uppercase">Whamageddon</h2>
            <h1 className="text-3xl font-bold">{groupName || 'Loading...'}</h1>
          </div>
          <button onClick={copyLink} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded">Copy Link</button>
        </div>

        {!myPlayerId ? (
          <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-xl mb-8 text-center">
            <h3 className="text-xl font-bold mb-2">Join this group</h3>
            <form onSubmit={joinGame} className="flex gap-2">
              <input className="flex-1 bg-slate-800 border border-slate-600 rounded p-3" placeholder="Your Name" value={newName} onChange={e => setNewName(e.target.value)} />
              <button className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded font-bold">Join</button>
            </form>
          </div>
        ) : (
          me?.status === 'alive' ? (
            <div className="bg-green-900/20 border border-green-500/30 p-8 rounded-xl mb-8 text-center">
              <h3 className="text-2xl font-bold text-green-400 mb-2">You are a Survivor</h3>
              <button onClick={iGotWhammed} className="bg-red-600 hover:bg-red-700 text-white text-xl font-black py-4 px-8 rounded-full shadow-lg w-full mt-4">I HEARD IT! 😭</button>
            </div>
          ) : (
            <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-xl mb-8 text-center">
              <h3 className="text-2xl font-bold text-red-500 mb-2">Fallen Soldier</h3>
              <p className="text-slate-400">Whammed on {new Date(me?.whammed_at || '').toLocaleDateString()}</p>
            </div>
          )
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-green-400 font-bold mb-4">Survivors ({survivors.length})</h3>
            <ul className="space-y-2">{survivors.map(p => <li key={p.id} className="bg-slate-800 p-3 rounded">{p.name}</li>)}</ul>
          </div>
          <div>
            <h3 className="text-red-500 font-bold mb-4">The Fallen ({fallen.length})</h3>
            <ul className="space-y-2">{fallen.map(p => <li key={p.id} className="bg-red-900/20 p-3 rounded opacity-50">💀 {p.name}</li>)}</ul>
          </div>
        </div>
      </div>
    </main>
  );
}