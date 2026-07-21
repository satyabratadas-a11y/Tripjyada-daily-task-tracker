import ProfileForm from '@/components/ProfileForm';

export default function ProfilePage() {
  return (
    <div className="max-w-sm">
      <h1 className="mb-4 text-lg font-semibold dark:text-gray-100">My profile</h1>
      <ProfileForm />
    </div>
  );
}
