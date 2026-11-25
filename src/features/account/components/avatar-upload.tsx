'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { useToast } from '@/components/ui/use-toast';

import { uploadAvatar } from '../actions/upload-avatar';

import css from '@/components/studio/setup/setup.module.css';

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  userEmail: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export function AvatarUpload({ currentAvatarUrl, userEmail }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please use JPEG, PNG, or WebP.',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum size is 2MB.',
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const result = await uploadAvatar(formData);

        if (result?.error) {
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: result.error.message || 'Something went wrong. Please try again.',
          });
          return;
        }

        toast({
          title: 'Avatar updated',
          description: 'Your avatar has been updated successfully.',
        });

        // Clear preview and selected file
        setPreviewUrl(null);
        setSelectedFile(null);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    });
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;
  const showFallback = !displayUrl;

  return (
    <>
      {/* Avatar Display */}
      <div className={css.qr}>
        <button
          type='button'
          aria-label='Upload profile picture'
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className={css.avatar}
        >
          {showFallback ? (
            userEmail.charAt(0)
          ) : (
            <Image src={displayUrl} alt='Avatar' fill className='object-cover' sizes='64px' />
          )}
        </button>

        <div>
          <p className={css.strong}>Profile Picture</p>
          <p className={css.small}>JPEG, PNG, or WebP. Max 2MB.</p>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp'
        onChange={handleInputChange}
        hidden
        disabled={isPending}
      />

      {/* Preview and Actions */}
      {selectedFile && (
        <div className={css.chosen}>
          <div className={css.chosenFile}>
            <div className={css.chosenImage}>
              {previewUrl && <Image src={previewUrl} alt='Preview' fill className='object-cover' sizes='48px' />}
            </div>
            <div className={css.grow}>
              <p className={css.strong}>{selectedFile.name}</p>
              <p className={css.small}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          <div className={css.row}>
            <DashButton onClick={handleUpload} disabled={isPending} aria-busy={isPending}>
              {isPending ? 'Uploading...' : 'Upload'}
            </DashButton>
            <DashButton look='quiet' onClick={handleCancel} disabled={isPending}>
              Cancel
            </DashButton>
          </div>
        </div>
      )}
    </>
  );
}
