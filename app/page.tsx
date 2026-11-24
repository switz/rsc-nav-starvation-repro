import Link from 'next/link';
export default function Home() {
  return <div><h1 id="home">home</h1>
    <Link id="to-heavy" href="/heavy">heavy</Link>{' '}
    <Link id="to-heavy-loading" href="/heavy-loading">heavy with loading.tsx</Link></div>;
}
