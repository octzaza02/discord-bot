import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);
  return (
    <main className="max-w-2xl mx-auto px-6 py-24 text-center">
      <h1 className="text-4xl font-bold mb-4 text-amber-heading">Discord Bot Dashboard</h1>
      <p className="text-amber-sub mb-8">
        จัดการข้อความต้อนรับ ปุ่มรับยศ และระบบเลเวลของบอทในเซิร์ฟเวอร์ของคุณ
      </p>
      {session ? (
        <Link
          href="/servers"
          className="inline-block px-6 py-3 rounded-lg bg-amber-primary text-white hover:bg-amber-link font-medium shadow-sm"
        >
          เลือกเซิร์ฟเวอร์ →
        </Link>
      ) : (
        <Link
          href="/api/auth/signin/discord"
          className="inline-block px-6 py-3 rounded-lg bg-amber-primary text-white hover:bg-amber-link font-medium shadow-sm"
        >
          Login with Discord
        </Link>
      )}
    </main>
  );
}
