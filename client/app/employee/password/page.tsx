import { redirect } from 'next/navigation';

export default function ChangePasswordPage() {
  redirect('/employee/profile#security');
}
