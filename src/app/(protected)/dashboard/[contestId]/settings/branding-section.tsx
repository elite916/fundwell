'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { ColorField } from '@/components/studio/setup/fields';
import { SetupSection } from '@/components/studio/setup/section';
import { srOnly } from '@/components/studio/theme';
import { useToast } from '@/components/ui/use-toast';
import { updateContest } from '@/features/contests/actions/update-contest';
import { deleteContestImage, uploadContestImage } from '@/features/contests/actions/upload-contest-image';
import { Database } from '@/libs/supabase/types';
import { zodResolver } from '@hookform/resolvers/zod';

import { ImageUploadModal } from './image-upload-modal';

import css from '@/components/studio/setup/setup.module.css';

type Contest = Database['public']['Tables']['contests']['Row'];

const DEFAULT_PRIMARY_COLOR = '#17603F';
const DEFAULT_SECONDARY_COLOR = '#F2B233';

const colorSchema = z.object({
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
});

type ColorFormData = z.infer<typeof colorSchema>;

interface BrandingSectionProps {
  contest: Contest;
}

export function BrandingSection({ contest }: BrandingSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState(contest.org_image_url);
  const [logoModalOpen, setLogoModalOpen] = useState(false);

  const { toast } = useToast();

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ColorFormData>({
    resolver: zodResolver(colorSchema),
    defaultValues: {
      primary_color: contest.primary_color ?? DEFAULT_PRIMARY_COLOR,
      secondary_color: contest.secondary_color ?? DEFAULT_SECONDARY_COLOR,
    },
  });

  const primaryColor = watch('primary_color');
  const secondaryColor = watch('secondary_color');

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('imageType', 'logo');

      const result = await uploadContestImage(contest.id, formData);

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: result.error.message,
        });
        return;
      }

      if (result?.data?.url) {
        await updateContest(contest.id, { org_image_url: result.data.url });
        setLogoImageUrl(result.data.url);
        setLogoModalOpen(false);
        toast({
          title: 'Image uploaded',
          description: 'Organization logo has been updated.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!logoImageUrl) return;

    setLogoDeleting(true);
    try {
      const deleteResult = await deleteContestImage(logoImageUrl);

      if (deleteResult?.error) {
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: deleteResult.error.message,
        });
        return;
      }

      await updateContest(contest.id, { org_image_url: null });
      setLogoImageUrl(null);
      toast({
        title: 'Image removed',
        description: 'Organization logo has been deleted.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setLogoDeleting(false);
    }
  };

  const onSubmit = (data: ColorFormData) => {
    startTransition(async () => {
      const result = await updateContest(contest.id, {
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
      });

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error.message,
        });
        return;
      }

      toast({
        title: 'Colors saved',
        description: 'Brand colors have been updated.',
      });
    });
  };

  return (
    <SetupSection id='branding' title='Branding' description='Customize the look of your contest page.'>
      {/* Organization Logo. No hero photo: Game day pages don't show one (Brent, 2026-11-27). Stored photos stay. */}
      <p className={css.label}>Organization Logo</p>
      <p className={css.hintUp}>Displayed alongside your contest name.</p>

      {logoImageUrl && (
        <div className={css.logoPreview}>
          <Image src={logoImageUrl} alt='Organization logo' fill className='object-cover' />
        </div>
      )}

      <div className={css.row}>
        <DashButton look='quiet' onClick={() => setLogoModalOpen(true)}>
          {logoImageUrl ? 'Replace' : 'Upload Image'}
          <span className={srOnly}> Organization Logo</span>
        </DashButton>

        {logoImageUrl && (
          <BusyButton busy={logoDeleting} look='quiet' onClick={handleLogoDelete}>
            Remove<span className={srOnly}> Organization Logo</span>
          </BusyButton>
        )}
      </div>

      {/* Colors */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <p className={`${css.label} ${css.gapTop}`}>Brand Colors</p>
        <p className={css.hintUp}>Customize the colors used on your contest page.</p>

        <div className={css.two}>
          <ColorField
            id='primary_color'
            label='Primary Color'
            color={primaryColor}
            onPick={(color) => setValue('primary_color', color, { shouldDirty: true })}
            value={primaryColor}
            onChange={(e) => setValue('primary_color', e.target.value.toUpperCase(), { shouldDirty: true })}
            maxLength={7}
            placeholder='#17603F'
            error={errors.primary_color?.message}
          />
          <ColorField
            id='secondary_color'
            label='Secondary Color'
            color={secondaryColor}
            onPick={(color) => setValue('secondary_color', color, { shouldDirty: true })}
            value={secondaryColor}
            onChange={(e) => setValue('secondary_color', e.target.value.toUpperCase(), { shouldDirty: true })}
            maxLength={7}
            placeholder='#F2B233'
            error={errors.secondary_color?.message}
          />
        </div>

        {/* Submit Button */}
        <div className={css.save}>
          <BusyButton busy={isPending} type='submit' disabled={!isDirty}>
            Save Colors
          </BusyButton>
        </div>
      </form>

      {/* Logo Upload Modal */}
      <ImageUploadModal
        isOpen={logoModalOpen}
        onClose={() => setLogoModalOpen(false)}
        onUpload={handleLogoUpload}
        imageType='logo'
        isUploading={logoUploading}
      />
    </SetupSection>
  );
}
