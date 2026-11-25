'use client';

import { toast } from '@/components/ui/use-toast';
import { cn } from '@/utils/cn';

import { studioTheme } from '../theme';

import css from './dash-toast.module.css';

/** A short message after something worked: "Square marked as paid" */
export function say(message: string) {
  toast({ description: message, className: cn(studioTheme, css.toast) });
}

/** A short message after something didn't. Read out right away. */
export function sayProblem(message: string) {
  toast({ description: message, className: cn(studioTheme, css.toast, css.bad) });
}
