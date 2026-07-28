import { redirect } from 'next/navigation';

export default function AdminChangePasswordPage() {
  redirect('/admin/profile#security');
}
