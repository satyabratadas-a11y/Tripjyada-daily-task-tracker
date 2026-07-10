import ChangePasswordForm from '@/components/ChangePasswordForm';

export default function AdminChangePasswordPage() {
  return (
    <div className="max-w-sm">
      <h1 className="mb-4 text-lg font-semibold dark:text-gray-100">Change password</h1>
      <ChangePasswordForm />
    </div>
  );
}
