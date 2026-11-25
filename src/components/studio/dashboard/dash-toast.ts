'use client';

import { toast } from '@/components/ui/use-toast';

/** A short message after something worked: "Square marked as paid" */
export function say(message: string) {
  toast({ description: message });
}

/** A short message after something didn't. Read out right away. */
export function sayProblem(message: string) {
  toast({ variant: 'destructive', description: message });
}
