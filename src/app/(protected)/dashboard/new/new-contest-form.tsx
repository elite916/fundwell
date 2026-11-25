'use client';

import { useState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { FormProvider, useForm } from 'react-hook-form';

import { DashButton } from '@/components/studio/dashboard/dash-button';
import { BackLink, DashPage, PageHead, Panel } from '@/components/studio/dashboard/dash-page';
import { BusyButton } from '@/components/studio/setup/busy-button';
import { srOnly } from '@/components/studio/theme';
import { useToast } from '@/components/ui/use-toast';
import { createContest } from '@/features/contests/actions/create-contest';
import type { CreateContestInput } from '@/features/contests/models/contest';
import { createContestSchema, defaultContestValues } from '@/features/contests/models/contest';
import { cn } from '@/utils/cn';
import { zodResolver } from '@hookform/resolvers/zod';

import { BasicInfoStep } from './steps/basic-info-step';
import { BrandingStep } from './steps/branding-step';
import { SettingsStep } from './steps/settings-step';

import css from '@/components/studio/setup/setup.module.css';

const STEPS = [
  { id: 1, name: 'Basic Info', description: 'Contest name and teams' },
  { id: 2, name: 'Settings', description: 'Pricing and payouts' },
  { id: 3, name: 'Branding', description: 'Choose your colors' },
] as const;

// Fields to validate per step
const STEP_FIELDS: Record<number, string[]> = {
  1: ['sportType', 'name', 'description', 'rowTeamName', 'colTeamName'],
  2: [
    'squarePrice',
    'maxSquaresPerPerson',
    'prizeType',
    // Football payouts
    'payoutQ1Percent',
    'payoutQ2Percent',
    'payoutQ3Percent',
    'payoutFinalPercent',
    // Baseball payouts
    'payoutGame1Percent',
    'payoutGame2Percent',
    'payoutGame3Percent',
    'payoutGame4Percent',
    'payoutGame5Percent',
    'payoutGame6Percent',
    'payoutGame7Percent',
    // Custom prizes
    'prizeQ1Text',
    'prizeQ2Text',
    'prizeQ3Text',
    'prizeFinalText',
  ],
  3: ['primaryColor', 'secondaryColor'],
};

export function NewContestForm({ isSuperBowlOpen }: { isSuperBowlOpen: boolean }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const methods = useForm({
    resolver: zodResolver(createContestSchema),
    defaultValues: defaultContestValues,
    mode: 'onTouched',
  });

  const { handleSubmit, trigger, getFieldState, getValues, setValue } = methods;

  async function validateCurrentStep(): Promise<boolean> {
    const fields = STEP_FIELDS[currentStep] as (keyof CreateContestInput)[];
    const isValid = await trigger(fields);
    // As if the person had been in the fields with an error: each one checks again while they type, so its message goes
    // away then. Going away on blur moved Next from under the pointer mid-click.
    for (const field of fields) {
      if (getFieldState(field).invalid) setValue(field, getValues(field), { shouldTouch: true });
    }
    return isValid;
  }

  async function handleNext(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  async function onSubmit(data: CreateContestInput) {
    setIsSubmitting(true);
    try {
      const response = await createContest(data);
      if (response?.error) {
        toast({
          variant: 'destructive',
          title: 'Error creating contest',
          description: response.error.message || 'Something went wrong. Please try again.',
        });
      }
      // If successful, the server action redirects to the contest page
    } catch (error) {
      // A Next.js redirect: the router has already shown the new page from the action's response.
      // Rethrowing would make Next navigate there a second time and show "Loading contest..." again.
      if (isRedirectError(error)) {
        return;
      }

      // Only show toast for actual errors
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashPage className={css.scale}>
      <div className={css.narrow}>
        <BackLink href='/dashboard'>Back to Dashboard</BackLink>
        <PageHead title='Create New Contest' sub={['Set up your game day squares fundraiser in a few easy steps.']} />

        {/* Step Indicator */}
        <nav aria-label='Progress'>
          <ol className={css.steps}>
            {STEPS.map((step) => (
              <li key={step.id} aria-current={step.id === currentStep ? 'step' : undefined}>
                <button
                  type='button'
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={cn(
                    css.step,
                    step.id < currentStep && css.stepDone,
                    step.id === currentStep && css.stepNow
                  )}
                >
                  <i aria-hidden='true'>{step.id < currentStep ? '' : step.id}</i>
                  <b>
                    {step.name}
                    {step.id < currentStep && <span className={srOnly}> done</span>}
                  </b>
                  <span>{step.description}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Panel>
              <div className={css.panelHead}>
                <h2>{STEPS[currentStep - 1].name}</h2>
                <p>{STEPS[currentStep - 1].description}</p>
              </div>

              {/* Step Content */}
              {currentStep === 1 && <BasicInfoStep isSuperBowlOpen={isSuperBowlOpen} />}
              {currentStep === 2 && <SettingsStep />}
              {currentStep === 3 && <BrandingStep />}
            </Panel>

            {/* Navigation Buttons */}
            <div className={cn(css.bottom, currentStep === 1 && css.bottomEnd)}>
              {currentStep > 1 && (
                <DashButton look='quiet' onClick={handleBack}>
                  Back
                </DashButton>
              )}

              {currentStep < STEPS.length ? (
                // The keys keep React from turning this into the submit button mid-click
                <DashButton key='next' onClick={handleNext}>
                  Next
                </DashButton>
              ) : (
                <BusyButton busy={isSubmitting} key='create' type='submit'>
                  {isSubmitting ? 'Creating...' : 'Create Contest'}
                </BusyButton>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </DashPage>
  );
}
