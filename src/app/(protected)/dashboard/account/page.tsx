import { redirect } from 'next/navigation';

import { DashPage, PageHead } from '@/components/studio/dashboard/dash-page';
import { SetupSection } from '@/components/studio/setup/section';
import { TextField } from '@/components/studio/text-field';
import { AvatarUpload } from '@/features/account/components/avatar-upload';
import { ProfileForm } from '@/features/account/components/profile-form';
import { getUser } from '@/features/account/controllers/get-user';
import { getUserProfile } from '@/features/account/controllers/get-user-profile';

import css from '@/components/studio/setup/setup.module.css';

export default async function AccountPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const userProfile = await getUserProfile();
  const userEmail = user.email ?? '';

  // Determine auth method from app_metadata
  const authProvider = user.app_metadata?.provider || 'email';
  const signInMethod = authProvider === 'google' ? 'Google' : 'Email (Magic Link)';

  return (
    <DashPage className={css.scale}>
      <div className={css.noBack}>
        <PageHead title='Account Settings' sub={['Manage your account information and preferences.']} />
      </div>

      {/* Settings Sections */}
      <SetupSection id='avatar' title='Avatar' description='Update your profile picture.'>
        <AvatarUpload currentAvatarUrl={userProfile?.avatar_url ?? null} userEmail={userEmail} />
      </SetupSection>

      <SetupSection id='profile' title='Profile' description='Update your full name.'>
        <ProfileForm defaultName={userProfile?.full_name ?? null} />
      </SetupSection>

      <SetupSection id='email-address' title='Email' description='Your email address cannot be changed.'>
        <TextField id='email' label='Email Address' type='email' value={userEmail} readOnly />
      </SetupSection>

      <SetupSection id='sign-in-method' title='Sign-in Method' description='Your current authentication method.'>
        <TextField id='signInMethod' label='Authentication Provider' value={signInMethod} readOnly />
      </SetupSection>
    </DashPage>
  );
}
