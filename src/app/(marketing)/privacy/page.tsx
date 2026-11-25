import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { TextLink } from '@/components/studio/text-link';
import { Soft } from '@/components/studio/type';

import { TextPage, TextSection } from '../_text/text-page';

export const metadata: Metadata = {
  title: 'Privacy Policy - Fundwell',
  description:
    'Your privacy is important to us. This policy explains how we collect, use, and protect your information.',
};

export default function PrivacyPage(): ReactElement {
  return (
    <TextPage
      title='Privacy Policy'
      intro={
        <>
          <Soft>
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </Soft>
          <Soft small>Last updated: December 27, 2025</Soft>
        </>
      }
    >
      <TextSection title='Information We Collect'>
        <Soft>
          When you create an account, we collect your email address and basic profile information through our
          authentication provider, Supabase. When you create contests, we store contest details including the contest
          name, settings, and branding you provide.
        </Soft>
        <Soft>
          For participants who claim squares on your contests, we collect their name and email address so you can track
          who has claimed each square and communicate with them about the fundraiser.
        </Soft>
      </TextSection>
      <TextSection title='How We Use Your Information'>
        <Soft>
          We use your information to provide and improve Fundwell&apos;s services. This includes displaying your
          contests, sending email notifications through Resend when numbers are revealed or winners are announced, and
          helping you manage your fundraisers.
        </Soft>
        <Soft>
          We do not sell your personal information to third parties. We only share data with service providers necessary
          to operate Fundwell, such as our database provider and email service.
        </Soft>
      </TextSection>
      <TextSection title='Data Storage & Security'>
        <Soft>
          Your data is stored securely using Supabase, which provides enterprise-grade security including encryption at
          rest and in transit. We implement row-level security policies to ensure users can only access their own data.
        </Soft>
        <Soft>
          Fundwell does not process payments directly. When participants pay for squares, they do so through your own
          Venmo, PayPal, or other payment methods. We only track whether a square has been marked as paid—we never
          handle actual payment transactions for squares.
        </Soft>
        <Soft>
          For subscription billing, we use Stripe. Stripe handles all payment processing and stores payment information
          securely. We do not store your credit card details on our servers.
        </Soft>
      </TextSection>
      <TextSection title='Your Rights'>
        <Soft>
          You have the right to access, update, or delete your personal information at any time. You can update your
          account information through your account settings. If you wish to delete your account and all associated data,
          please contact us through our support page.
        </Soft>
        <Soft>
          Contest managers can delete their contests at any time, which will remove all associated square and
          participant data.
        </Soft>
      </TextSection>
      <TextSection title='Cookies & Analytics'>
        <Soft>
          We use essential cookies to maintain your session and keep you logged in. We may use analytics tools to
          understand how people use Fundwell so we can improve the service. These tools collect anonymized usage data
          and do not track you across other websites.
        </Soft>
      </TextSection>
      <TextSection title='Contact Us'>
        <Soft>
          If you have any questions about this privacy policy or how we handle your data, please reach out through our{' '}
          <TextLink href='/support' className='min-h-0'>
            support page
          </TextLink>
          . We&apos;re happy to help.
        </Soft>
      </TextSection>
    </TextPage>
  );
}
