'use client';

import { useState } from 'react';

import { Button } from '@/components/studio/button';
import { Sheet } from '@/components/studio/sheet';
import { TextField } from '@/components/studio/text-field';

import css from './preview.module.css';

export function SheetSamples() {
  const [open, setOpen] = useState<'side' | 'center' | 'locked' | null>(null);
  const close = () => setOpen(null);

  return (
    <p className={css.row}>
      <Button look='link' onClick={() => setOpen('side')}>
        Side sheet
      </Button>
      <Button look='link' onClick={() => setOpen('center')}>
        Dialog
      </Button>
      <Button look='link' onClick={() => setOpen('locked')}>
        Dialog that has to be answered
      </Button>
      <Sheet
        open={open === 'side'}
        onOpenChange={close}
        title='Share'
        description='Send this link to anyone who might help.'
        footer={<Button onClick={close}>Done</Button>}
      />
      <Sheet
        open={open === 'center'}
        onOpenChange={close}
        placement='center'
        title='Lock contest'
        description='Lock the contest when you’re done selling squares.'
        footer={<Button onClick={close}>Lock contest</Button>}
      />
      <Sheet
        open={open === 'locked'}
        onOpenChange={close}
        placement='center'
        dismissible={false}
        title='Enter the PIN'
        footer={<Button onClick={close}>Continue</Button>}
      >
        <TextField label='PIN' />
      </Sheet>
    </p>
  );
}
