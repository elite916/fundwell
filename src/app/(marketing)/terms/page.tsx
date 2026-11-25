import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { TextLink } from '@/components/studio/text-link';
import { Soft } from '@/components/studio/type';

import { TextPage, TextSection } from '../_text/text-page';

export const metadata: Metadata = {
  title: 'Terms of Service - Fundwell',
  description: 'By using Fundwell, you agree to these terms. Please read them carefully.',
};

export default function TermsPage(): ReactElement {
  return (
    <TextPage
      title='Terms of Service'
      intro={
        <>
          <Soft>By using Fundwell, you agree to these terms. Please read them carefully.</Soft>
          <Soft small>Last updated: December 27, 2025</Soft>
        </>
      }
    >
      <TextSection title='Acceptance of Terms'>
        <Soft>
          By accessing or using Fundwell, you agree to be bound by these Terms of Service. If you do not agree to these
          terms, please do not use our service.
        </Soft>
      </TextSection>
      <TextSection title='Service Description'>
        <Soft>
          Fundwell provides a platform for creating and managing game day squares fundraisers. We offer tools to create
          10x10 grids, share them with participants, track square claims and payments, and announce winners based on
          game scores.
        </Soft>
        <Soft>
          Fundwell is a tool for organizing fundraisers. We do not guarantee any specific fundraising outcomes, and
          success depends on your own efforts and community engagement.
        </Soft>
      </TextSection>
      <TextSection title='User Accounts'>
        <Soft>
          You must be at least 18 years old to create an account on Fundwell. You are responsible for maintaining the
          security of your account and for all activities that occur under your account.
        </Soft>
        <Soft>
          You agree to provide accurate information when creating your account and to keep your account information up
          to date.
        </Soft>
      </TextSection>
      <TextSection title='Contest Management'>
        <Soft>
          As a contest manager, you are solely responsible for your contests, including setting rules, collecting
          payments from participants, and distributing prizes. You must ensure your fundraiser complies with all
          applicable local, state, and federal laws.
        </Soft>
        <Soft>
          Fundwell is not responsible for disputes between contest managers and participants. You are responsible for
          communicating contest rules clearly to your participants.
        </Soft>
      </TextSection>
      <TextSection title='Payment & Subscriptions'>
        <Soft>
          Fundwell does not process payments for squares. When participants pay for squares, they do so directly through
          your own payment methods such as Venmo, PayPal, Zelle, or cash. We only provide a way to track whether squares
          have been marked as paid.
        </Soft>
        <Soft>
          For Fundwell subscription plans, we use Stripe to process payments. Subscription fees are billed according to
          the plan you select. You can cancel your subscription at any time through your account settings.
        </Soft>
      </TextSection>
      <TextSection title='Prohibited Uses'>
        <Soft>
          You may not use Fundwell for any illegal purposes or in violation of any applicable laws. You may not use our
          service to run unauthorized gambling operations or to defraud participants.
        </Soft>
        <Soft>
          You may not attempt to access other users&apos; accounts, interfere with the service, or use automated tools
          to scrape or interact with our platform without permission.
        </Soft>
      </TextSection>
      <TextSection title='Termination'>
        <Soft>
          We reserve the right to suspend or terminate your account at any time for violation of these terms or for any
          other reason at our discretion. You may also delete your account at any time by contacting support.
        </Soft>
        <Soft>
          Upon termination, your access to your contests and data will be removed. We recommend exporting any important
          information before closing your account.
        </Soft>
      </TextSection>
      <TextSection title='Limitation of Liability'>
        <Soft>
          Fundwell is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that the service
          will be available at all times or that it will be free of errors.
        </Soft>
        <Soft>
          To the fullest extent permitted by law, Fundwell shall not be liable for any indirect, incidental, special, or
          consequential damages arising from your use of the service.
        </Soft>
      </TextSection>
      <TextSection title='Changes to Terms'>
        <Soft>
          We may update these terms from time to time. If we make significant changes, we will notify you by email or
          through the service. Your continued use of Fundwell after changes are posted constitutes acceptance of the
          updated terms.
        </Soft>
      </TextSection>
      <TextSection title='Contact Us'>
        <Soft>
          If you have questions about these terms, please reach out through our{' '}
          <TextLink href='/support' className='min-h-0'>
            support page
          </TextLink>
          . We&apos;re here to help.
        </Soft>
      </TextSection>
    </TextPage>
  );
}
