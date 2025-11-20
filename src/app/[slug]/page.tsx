"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';

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

  // 1. Load Group and Players
  useEffect(() => {
    // Check local storage for identity
    const storedId = localStorage.getItem(`wham_player_${slug}`);
    if (storedId) setMyPlayerId(storedId);

    const fetchGroupData = async () => {
      // Get Group Name
      const { data: group } = await supabase.from('groups').select('name').eq('slug', slug).single();
      if (group) setGroupName(group.name);

      // Get Players
      const { data: playerList } = await supabase
        .from('players')
        .select('*')
        .eq('group_slug', slug)
        .order('whammed_at', { ascending: false, nullsFirst: true }); // Dead people at bottom? Or top? Let's keep survivors top.
      
      if (playerList) setPlayers(playerList);
    };

    fetchGroupData();

    // Realtime Subscription (Auto-update when someone dies)
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `group_slug=eq.${slug}` }, 
      (payload) => {
        fetchGroupData(); // Refresh list on change
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  // 2. Join Game Logic
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

  // 3. Report Defeat Logic
  const iGotWhammed = async () => {
    if (!confirm("Are you sure? Once you admit defeat, there is no going back.")) return;

    await supabase
      .from('players')
      .update({ status: 'whammed', whammed_at: new Date() })
      .eq('id', myPlayerId);
      
    // Play a sad sound or show animation here
  };

  // 4. Copy Link Logic
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied! Send it to your colleagues.');
  };

  const survivors = players.filter(p => p.status === 'alive');
  const fallen = players.filter(p => p.status === 'whammed');
  const me = players.find(p => p.id === myPlayerId);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <div>
            <h2 className="text-sm text-red-500 font-bold tracking-widest uppercase">Whamageddon</h2>
            <h1 className="text-3xl font-bold">{groupName || 'Loading...'}</h1>
          </div>
          <button onClick={copyLink} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded">
            Copy Invite Link
          </button>
        </div>

        {/* ACTIVE PLAYER SECTION */}
        {!myPlayerId ? (
          // SIGN UP FORM
          <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-xl mb-8 text-center">
            <h3 className="text-xl font-bold mb-2">Join this group</h3>
            <p className="text-sm text-slate-300 mb-4">Enter your name to start surviving.</p>
            <form onSubmit={joinGame} className="flex gap-2">
              <input 
                className="flex-1 bg-slate-800 border border-slate-600 rounded p-3"
                placeholder="Your Name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <button className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded font-bold">Join</button>
            </form>
          </div>
        ) : (
          // ACTION BUTTON
          me?.status === 'alive' ? (
            <div className="bg-green-900/20 border border-green-500/30 p-8 rounded-xl mb-8 text-center">
              <h3 className="text-2xl font-bold text-green-400 mb-2">You are a Survivor</h3>
              <p className="mb-6 text-slate-400">Stay vigilant. Do not tune in.</p>
              <button 
                onClick={iGotWhammed}
                className="bg-red-600 hover:bg-red-700 text-white text-xl font-black py-4 px-8 rounded-full shadow-lg w-full transition-transform transform hover:scale-105 active:scale-95"
              >
                I HEARD IT! 😭
              </button>
            </div>
          ) : (
            <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-xl mb-8 text-center">
              <h3 className="text-2xl font-bold text-red-500 mb-2">Fallen Soldier</h3>
              <p className="text-slate-400">You were Whammed on {new Date(me?.whammed_at).toLocaleDateString()}. Rest in peace.</p>
            </div>
          )
        )}

        {/* ROSTER */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Survivors Column */}
          <div>
            <h3 className="text-green-400 font-bold border-b border-green-900 pb-2 mb-4 flex justify-between">
              <span>Survivors</span>
              <span>{survivors.length}</span>
            </h3>
            <ul className="space-y-2">
              {survivors.map(p => (
                <li key={p.id} className="bg-slate-800 p-3 rounded flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  {p.name}
                </li>
              ))}
              {survivors.length === 0 && <li className="text-slate-500 italic">No one is safe...</li>}
            </ul>
          </div>

          {/* Fallen Column */}
          <div>
            <h3 className="text-red-500 font-bold border-b border-red-900 pb-2 mb-4 flex justify-between">
              <span>Whamhalla (The Fallen)</span>
              <span>{fallen.length}</span>
            </h3>
            <ul className="space-y-2">
              {fallen.map(p => (
                <li key={p.id} className="bg-red-900/20 p-3 rounded flex items-center justify-between text-slate-400 grayscale">
                  <span>💀 {p.name}</span>
                  <span className="text-xs opacity-50">{new Date(p.whammed_at).toLocaleDateString()}</span>
                </li>
              ))}
              {fallen.length === 0 && <li className="text-slate-500 italic">Everyone is still standing.</li>}
            </ul>
          </div>
        </div>

      </div>
    </main>
  );
}