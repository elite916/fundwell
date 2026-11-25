'use client';

import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { DashButton, IconButton } from '@/components/studio/dashboard/dash-button';
import { DashDialog, DashDialogFoot } from '@/components/studio/dashboard/dash-dialog';
import { cn } from '@/utils/cn';

import css from '@/components/studio/setup/setup.module.css';

type ImageType = 'hero' | 'logo';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  imageType: ImageType;
  isUploading: boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUploadModal({ isOpen, onClose, onUpload, imageType, isUploading }: ImageUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const title = imageType === 'hero' ? 'Upload Hero Image' : 'Upload Logo';
  const description =
    imageType === 'hero'
      ? 'This image will be displayed at the top of your contest page.'
      : 'This image will be displayed alongside your contest name.';

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please use JPEG, PNG, WebP, or GIF.';
    }
    if (file.size > MAX_SIZE) {
      return 'File too large. Maximum size is 5MB.';
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    },
    [validateFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile);
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setError(null);
      setIsDragOver(false);
      onClose();
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <DashDialog open={isOpen} onClose={handleClose} title={title} description={description}>
      <div className={css.scale}>
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(css.drop, isDragOver && css.dropOver)}
        >
          {selectedFile ? (
            <>
              <div className={css.dropFile}>
                <span>{selectedFile.name}</span>
                <IconButton label={`Remove ${selectedFile.name}`} onClick={clearSelectedFile} disabled={isUploading}>
                  <X aria-hidden='true' />
                </IconButton>
              </div>
              <p className={css.small}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </>
          ) : (
            <>
              <p>Drag and drop an image here</p>
              <p className={css.soft}>or</p>
              <DashButton look='quiet' onClick={handleBrowseClick}>
                Browse Files
              </DashButton>
            </>
          )}

          {/* File Type Hint */}
          <p className={css.small}>Accepted formats: JPEG, PNG, WebP, GIF. Max size: 5MB</p>
        </div>

        {/* Hidden File Input */}
        <input ref={fileInputRef} type='file' accept={ACCEPTED_TYPES.join(',')} onChange={handleInputChange} hidden />

        {/* Error Message */}
        <p role='alert' className={css.error}>
          {error}
        </p>
      </div>

      <DashDialogFoot>
        <DashButton look='quiet' onClick={handleClose} disabled={isUploading}>
          Cancel
        </DashButton>
        <DashButton onClick={handleUpload} disabled={!selectedFile || isUploading} aria-busy={isUploading}>
          Upload
        </DashButton>
      </DashDialogFoot>
    </DashDialog>
  );
}
