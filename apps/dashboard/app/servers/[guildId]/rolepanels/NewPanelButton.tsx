'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function NewPanelButton({ guildId }: { guildId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    const title = prompt('ชื่อ panel:');
    if (!title) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/rolepanels`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, description: '' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/servers/${guildId}/rolepanels/${json._id}`);
    } catch (e: any) {
      alert('❌ ' + (e?.message ?? 'error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={create}
      disabled={loading}
      className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm disabled:opacity-50"
    >
      {loading ? '...' : '+ สร้างใหม่'}
    </button>
  );
}
