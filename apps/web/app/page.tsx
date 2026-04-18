import { redirect } from 'next/navigation';

// Redirects bare "/" to the default locale login page
export default function RootPage() {
  redirect('/pt/login');
}
