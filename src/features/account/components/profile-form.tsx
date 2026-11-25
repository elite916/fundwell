'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { BusyButton } from '@/components/studio/setup/busy-button';
import { TextField } from '@/components/studio/text-field';
import { useToast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';

import { updateProfile } from '../actions/update-profile';
import { UpdateProfileFormData, updateProfileSchema } from '../validation/profile-schema';

import css from '@/components/studio/setup/setup.module.css';

interface ProfileFormProps {
  defaultName: string | null;
}

export function ProfileForm({ defaultName }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: defaultName || '',
    },
  });

  const onSubmit = (data: UpdateProfileFormData) => {
    startTransition(async () => {
      try {
        const result = await updateProfile(data);

        if (result?.error) {
          toast({
            variant: 'destructive',
            title: 'Error updating profile',
            description: result.error.message || 'Something went wrong. Please try again.',
          });
          return;
        }

        toast({
          title: 'Profile updated',
          description: 'Your profile has been updated successfully.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextField
        id='fullName'
        label='Full Name *'
        placeholder='John Doe'
        error={errors.fullName?.message}
        {...register('fullName')}
        disabled={isPending}
      />

      <div className={css.save}>
        <BusyButton busy={isPending} type='submit'>
          {isPending ? 'Saving...' : 'Save Changes'}
        </BusyButton>
      </div>
    </form>
  );
}
