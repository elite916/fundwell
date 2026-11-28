import type { Metadata } from 'next';
import type React from 'react';

import { Button } from '@/components/studio/button';
import { Soft } from '@/components/studio/type';

import { TextPage, TextSection } from '../_text/text-page';

export const metadata: Metadata = {
  title: 'Support - Fundwell',
  description: 'Find answers to common questions or get in touch with our team',
};

const FAQS = [
  {
    question: 'How do I create a contest?',
    answer:
      'Sign up for an account, then click “Create Contest” from your dashboard. Give your contest a name, choose your sport, set the price per square, and add your payment options. Your contest will be ready to share in minutes.',
  },
  {
    question: 'How do participants claim squares?',
    answer:
      'Share your unique contest link with friends, family, or your organization. They can visit the link, pick an available square, enter their name and email, and claim it. No account needed for participants.',
  },
  {
    question: 'How do I track payments?',
    answer:
      'Fundwell lets you mark squares as paid once you receive payment through your preferred method (Venmo, PayPal, cash, etc.). You can see at a glance which squares are claimed, paid, or still available from your dashboard.',
  },
  {
    question: 'How are winners determined?',
    answer:
      'You’ll assign numbers to each row and column. During the game, enter the scores for each quarter. Fundwell automatically highlights the winning squares based on the last digit of each team’s score.',
  },
  {
    question: 'Can I customize my contest?',
    answer:
      'Yes! You can add your team logos, customize colors, set your own payout structure, and configure how many squares each person can claim. Make it yours.',
  },
  {
    question: 'What’s included in the free plan?',
    answer:
      'The free plan lets you run one contest at a time with all core features included. Upgrade to run multiple contests simultaneously.',
  },
];

export default function SupportPage(): React.ReactElement {
  return (
    <TextPage
      title='How can we help?'
      intro={<Soft>Find answers to common questions or get in touch with our team</Soft>}
    >
      {FAQS.map((faq) => (
        <TextSection key={faq.question} title={faq.question}>
          <Soft>{faq.answer}</Soft>
        </TextSection>
      ))}
      <TextSection title='Still need help?'>
        <Soft>Send us a message and we’ll get back to you as soon as possible.</Soft>
        <p>
          Email us at{' '}
          <Button asChild look='link'>
            <a href='mailto:hello@elite916.com'>hello@elite916.com</a>
          </Button>
        </p>
      </TextSection>
    </TextPage>
  );
}
