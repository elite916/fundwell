'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';

import { DashButton, IconButton } from '@/components/studio/dashboard/dash-button';
import { Select } from '@/components/studio/select';
import { SetupSection } from '@/components/studio/setup/section';
import { TextField } from '@/components/studio/text-field';
import { srOnly } from '@/components/studio/theme';
import { useToast } from '@/components/ui/use-toast';
import { updatePaymentOptions } from '@/features/contests/actions/update-payment-options';
import { deletePaymentQr, uploadPaymentQr } from '@/features/contests/actions/upload-payment-qr';
import { Database } from '@/libs/supabase/types';
import { logger } from '@/utils/logger';

import css from '@/components/studio/setup/setup.module.css';

type PaymentOption = Database['public']['Tables']['payment_options']['Row'];
type PaymentOptionType = Database['public']['Enums']['payment_option_type'];

const PAYMENT_TYPES: { value: PaymentOptionType; label: string }[] = [
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'zelle', label: 'Zelle' },
];

const PAYMENT_FIELD_CONFIG: Record<
  PaymentOptionType,
  {
    label: string;
    placeholder: string;
    helpText: string;
    hasLast4: boolean;
  }
> = {
  venmo: {
    label: 'Username',
    placeholder: '@username',
    helpText: 'Participants will verify the last 4 digits when paying',
    hasLast4: true,
  },
  paypal: {
    label: 'Username',
    placeholder: 'yourname',
    helpText: 'Your PayPal.Me username',
    hasLast4: false,
  },
  cashapp: {
    label: '$Cashtag',
    placeholder: '$YourName',
    helpText: 'Make sure it starts with $',
    hasLast4: false,
  },
  zelle: {
    label: 'Email or Phone',
    placeholder: 'email@example.com or 555-555-5555',
    helpText: 'Use the email/phone enrolled with your bank',
    hasLast4: false,
  },
};

interface LocalPaymentOption {
  id: string;
  type: PaymentOptionType;
  handle_or_link: string;
  display_name: string;
  instructions: string;
  account_last_4_digits: string;
  qr_code_url: string;
}

interface PaymentOptionsSectionProps {
  contest: { id: string };
  paymentOptions: PaymentOption[];
}

export function PaymentOptionsSection({ contest, paymentOptions }: PaymentOptionsSectionProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [options, setOptions] = useState<LocalPaymentOption[]>(() =>
    paymentOptions.map((opt) => ({
      id: opt.id,
      type: opt.type,
      handle_or_link: opt.handle_or_link,
      display_name: opt.display_name ?? '',
      instructions: opt.instructions ?? '',
      account_last_4_digits: opt.account_last_4_digits ?? '',
      qr_code_url: opt.qr_code_url ?? '',
    }))
  );

  const [uploadingQrId, setUploadingQrId] = useState<string | null>(null);
  const [isSavingQr, setIsSavingQr] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [hasChanges, setHasChanges] = useState(false);

  const handleAdd = () => {
    const newOption: LocalPaymentOption = {
      id: `new-${Date.now()}`,
      type: 'venmo',
      handle_or_link: '',
      display_name: '',
      instructions: '',
      account_last_4_digits: '',
      qr_code_url: '',
    };
    setOptions([...options, newOption]);
    setHasChanges(true);
  };

  const handleTypeChange = async (id: string, newType: PaymentOptionType) => {
    const option = options.find((opt) => opt.id === id);

    // If there's an existing QR code on a saved option, delete it first
    if (option?.qr_code_url && !option.id.startsWith('new-')) {
      // Call handleQrDelete which updates DB and deletes file
      await handleQrDelete(id, option.qr_code_url);
    }

    // Update state with new type and cleared fields
    setOptions(
      options.map((opt) =>
        opt.id === id ? { ...opt, type: newType, handle_or_link: '', account_last_4_digits: '', qr_code_url: '' } : opt
      )
    );
    setHasChanges(true);
  };

  const handleQrUpload = async (optionId: string, file: File) => {
    if (isSavingQr) return;

    if (optionId.startsWith('new-')) {
      toast({
        variant: 'destructive',
        title: 'Save required',
        description: 'Please save the payment option before uploading a QR code.',
      });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please use PNG, JPEG, or WebP.',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum size is 2MB.',
      });
      return;
    }

    setUploadingQrId(optionId);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadPaymentQr(contest.id, optionId, formData);

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: result.error.message,
        });
        return;
      }

      if (result?.data?.url) {
        const updatedOptions = options.map((opt) =>
          opt.id === optionId ? { ...opt, qr_code_url: result.data!.url } : opt
        );
        setOptions(updatedOptions);

        // Immediately persist to database
        setIsSavingQr(true);
        const saveResult = await updatePaymentOptions(
          contest.id,
          updatedOptions.map((opt, index) => ({
            type: opt.type,
            handle_or_link: opt.handle_or_link,
            display_name: opt.display_name || null,
            instructions: opt.instructions || null,
            sort_order: index,
            account_last_4_digits: opt.account_last_4_digits || null,
            qr_code_url: opt.qr_code_url || null,
          }))
        );
        setIsSavingQr(false);

        if (saveResult?.error) {
          // Rollback UI change
          setOptions(options);
          // Attempt to delete the uploaded file since save failed
          try {
            await deletePaymentQr(result.data!.url);
          } catch (cleanupError) {
            logger.error('payment-options', cleanupError, { message: 'Failed to cleanup orphaned QR code' });
          }
          toast({
            variant: 'destructive',
            title: 'Save failed',
            description: saveResult.error.message,
          });
          return;
        }

        setHasChanges(false);
        toast({
          title: 'QR code uploaded',
          description: 'Payment options saved.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setUploadingQrId(null);
    }
  };

  const handleQrDelete = async (optionId: string, qrUrl: string) => {
    if (!qrUrl || isSavingQr) return;

    try {
      // First, update the database to clear qr_code_url
      const updatedOptions = options.map((opt) => (opt.id === optionId ? { ...opt, qr_code_url: '' } : opt));

      setIsSavingQr(true);
      const saveResult = await updatePaymentOptions(
        contest.id,
        updatedOptions.map((opt, index) => ({
          type: opt.type,
          handle_or_link: opt.handle_or_link,
          display_name: opt.display_name || null,
          instructions: opt.instructions || null,
          sort_order: index,
          account_last_4_digits: opt.account_last_4_digits || null,
          qr_code_url: opt.qr_code_url || null,
        }))
      );
      setIsSavingQr(false);

      if (saveResult?.error) {
        // DB save failed - don't delete file, don't update UI
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: saveResult.error.message,
        });
        return;
      }

      // DB update succeeded - update UI
      setOptions(updatedOptions);
      setHasChanges(false);

      // Now attempt to delete file from storage
      try {
        const deleteResult = await deletePaymentQr(qrUrl);
        if (deleteResult?.error) {
          logger.error('payment-options', deleteResult.error, { message: 'Failed to delete QR file from storage' });
        }
      } catch (storageError) {
        logger.error('payment-options', storageError, { message: 'Failed to delete QR file from storage' });
      }

      toast({
        title: 'QR code removed',
        description: 'Payment options saved.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: 'An unexpected error occurred.',
      });
    }
  };

  const handleRemove = (id: string) => {
    setOptions(options.filter((opt) => opt.id !== id));
    setHasChanges(true);
  };

  const handleChange = (id: string, field: keyof LocalPaymentOption, value: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt)));
    setHasChanges(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOptions = [...options];
    [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
    setOptions(newOptions);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === options.length - 1) return;
    const newOptions = [...options];
    [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
    setOptions(newOptions);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Validate that all options have handle_or_link
    const invalid = options.find((opt) => !opt.handle_or_link.trim());
    if (invalid) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'All payment options must have a handle or link.',
      });
      return;
    }

    startTransition(async () => {
      const result = await updatePaymentOptions(
        contest.id,
        options.map((opt, index) => ({
          type: opt.type,
          handle_or_link: opt.handle_or_link,
          display_name: opt.display_name || null,
          instructions: opt.instructions || null,
          sort_order: index,
          account_last_4_digits: opt.account_last_4_digits || null,
          qr_code_url: opt.qr_code_url || null,
        }))
      );

      if (result?.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error.message,
        });
        return;
      }

      setHasChanges(false);
      toast({
        title: 'Payment options saved',
        description: 'Your payment options have been updated.',
      });
    });
  };

  const getFieldConfig = (type: PaymentOptionType) => PAYMENT_FIELD_CONFIG[type];

  return (
    <SetupSection
      id='payment-options'
      title='Payment Options'
      description='Add payment methods for participants to pay for their squares.'
    >
      {options.length === 0 && (
        <p className={`${css.soft} ${css.gapBottom}`}>No payment options added yet. Add one below.</p>
      )}

      {options.map((option, index) => (
        <div key={option.id} className={css.option}>
          <header>
            <h3>Payment Option {index + 1}</h3>
            <div className={css.icons}>
              <IconButton
                label={`Move Payment Option ${index + 1} up`}
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
              >
                <ArrowUp aria-hidden='true' />
              </IconButton>
              <IconButton
                label={`Move Payment Option ${index + 1} down`}
                onClick={() => handleMoveDown(index)}
                disabled={index === options.length - 1}
              >
                <ArrowDown aria-hidden='true' />
              </IconButton>
              <IconButton label={`Delete Payment Option ${index + 1}`} onClick={() => handleRemove(option.id)}>
                <Trash2 aria-hidden='true' />
              </IconButton>
            </div>
          </header>

          <div className={css.two}>
            <Select
              look='form'
              id={`type-${option.id}`}
              label='Type'
              value={option.type}
              onChange={(e) => handleTypeChange(option.id, e.target.value as PaymentOptionType)}
            >
              {PAYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>

            {/* Dynamic Handle Field */}
            <TextField
              id={`handle-${option.id}`}
              label={`${getFieldConfig(option.type).label} *`}
              value={option.handle_or_link}
              onChange={(e) => handleChange(option.id, 'handle_or_link', e.target.value)}
              placeholder={getFieldConfig(option.type).placeholder}
              hint={getFieldConfig(option.type).helpText}
              autoComplete='off'
            />

            {/* Last 4 Digits (Venmo only) */}
            {getFieldConfig(option.type).hasLast4 && (
              <TextField
                id={`last4-${option.id}`}
                label='Last 4 Digits of Phone'
                value={option.account_last_4_digits}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  handleChange(option.id, 'account_last_4_digits', val);
                }}
                placeholder='1234'
                maxLength={4}
                inputMode='numeric'
                autoComplete='off'
              />
            )}

            <TextField
              id={`display-${option.id}`}
              label='Display Name'
              value={option.display_name}
              onChange={(e) => handleChange(option.id, 'display_name', e.target.value)}
              placeholder='Optional label shown to participants'
              autoComplete='off'
            />

            <TextField
              id={`instructions-${option.id}`}
              label='Instructions'
              value={option.instructions}
              onChange={(e) => handleChange(option.id, 'instructions', e.target.value)}
              placeholder='Include your name in the note'
              autoComplete='off'
            />
          </div>

          {/* QR Code Upload */}
          <p className={css.label}>QR Code (Optional)</p>
          <div className={css.qr}>
            {option.qr_code_url ? (
              <Image src={option.qr_code_url} alt='Payment QR Code' width={80} height={80} />
            ) : (
              <span aria-hidden='true' className={css.qrEmpty} />
            )}
            <div>
              <input
                ref={(el) => {
                  fileInputRefs.current[option.id] = el;
                }}
                type='file'
                accept='image/png,image/jpeg,image/webp'
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleQrUpload(option.id, file);
                  e.target.value = '';
                }}
                hidden
                disabled={option.id.startsWith('new-')}
              />
              <div className={css.row}>
                <DashButton
                  look='quiet'
                  onClick={() => fileInputRefs.current[option.id]?.click()}
                  disabled={uploadingQrId === option.id || option.id.startsWith('new-')}
                  aria-busy={uploadingQrId === option.id}
                >
                  {uploadingQrId === option.id ? 'Uploading...' : option.qr_code_url ? 'Replace' : 'Upload QR Code'}
                  <span className={srOnly}> for Payment Option {index + 1}</span>
                </DashButton>
                {option.qr_code_url && (
                  <DashButton look='quiet' onClick={() => handleQrDelete(option.id, option.qr_code_url)}>
                    Remove
                    <span className={srOnly}> the QR code for Payment Option {index + 1}</span>
                  </DashButton>
                )}
              </div>
              {option.id.startsWith('new-') ? (
                <p className={css.hintDown}>Save the payment option first</p>
              ) : (
                <p className={css.hintDown}>PNG, JPG, or WebP. Max 2MB.</p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add Button */}
      <DashButton look='quiet' onClick={handleAdd}>
        Add Payment Option
      </DashButton>

      {/* Save Button */}
      <div className={css.save}>
        <DashButton onClick={handleSave} disabled={isPending || !hasChanges} aria-busy={isPending}>
          Save Changes
        </DashButton>
      </div>
    </SetupSection>
  );
}
