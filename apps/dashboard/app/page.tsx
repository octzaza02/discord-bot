import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);
  return (
    <main className="max-w-2xl mx-auto px-6 py-24 text-center">
      <h1 className="text-4xl font-bold mb-4">Discord Bot Dashboard</h1>
      <p className="text-neutral-400 mb-8">
        จัดการข้อความต้อนรับและปุ่มรับยศของบอทในเซิร์ฟเวอร์ของคุณ
      </p>
      {session ? (
        <Link
          href="/servers"
          className="inline-block px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium"
        >
          เลือกเซิร์ฟเวอร์ →
        </Link>
      ) : (
        <Link
          href="/api/auth/signin/discord"
          className="inline-block px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium"
        >
          Login with Discord
        </Link>
      )}
    </main>
  );
}
