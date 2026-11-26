import { getPaymentOptionsForContest } from '@/features/contests/queries/get-payment-options';
import { formatPrizeAmount } from '@/features/contests/utils';
import { pledgeLabel, pledgeTotal, sumMoney } from '@/features/contests/utils/pledges';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import type { Tables } from '@/libs/supabase/types';
import { getCurrentISOString } from '@/utils/date-formatters';
import { getURL } from '@/utils/get-url';
import { logger } from '@/utils/logger';

import { organizerTotalsEmail } from './templates/organizer-totals-email';
import {
  pledgePaidEmail,
  type PledgePaymentOption,
  pledgeReceivedEmail,
  pledgeTotalEmail,
  pledgeZeroHitsEmail,
} from './templates/pledge-emails';
import {
  type EmailContent,
  getAccountEmail,
  type QueuedEmail,
  RATE_LIMIT_WAIT_MS,
  send,
  SEND_GAP_MS,
  setStatus,
  STUCK_AFTER_MS,
  throwIfError,
  wait,
} from './email-queue';
import { sendEmailBatch } from './send-email';

import 'server-only';

/**
 * Hit-a-thon emails, through the same queue as the squares ones (email_logs: one row per email, unique
 * (contest_id, dedupe_key), each row claimed before it's sent, only definite refusals retried, anything unclear
 * "unconfirmed" and never sent again). Their own types and drain, so the squares drain is unchanged. Sent with
 * Resend's batch (up to 100 an API call), since "Lock and Send Totals" can queue hundreds.
 *
 * Keys, so nothing goes out twice:
 *   pledge:<id>:received               when the pledge is made
 *   pledge:<id>:total                  at the lock (per-hit pledges, unpaid flat gifts)
 *   pledge:<id>:reminder:<YYYY-MM-DD>  "Email Unpaid Supporters", once a day (Pacific)
 *   pledge:<id>:paid:<paid_at>         marked paid
 *   organizer:totals                   to the organizer, after the lock's total rows
 */

/** Sent in this order. */
const TYPES = ['pledge_received', 'pledge_total', 'pledge_reminder', 'pledge_paid', 'organizer_totals'] as const;
type HitAThonEmailType = (typeof TYPES)[number];

const BATCH_SIZE = 100;
const BATCH_TIMEOUT_MS = 30 * 1000;
const PAGE = 1000;

/** How long a drain started from the lock, the reminder or a dashboard load keeps starting batches. Those pages
 * set maxDuration = 300; whatever is left stays queued for the next drain. */
export const LONG_DRAIN_MS = 200 * 1000;
/** For a drain after one pledge or one payment, on pages with the platform's default time limit. */
export const SHORT_DRAIN_MS = 10 * 1000;

const KEY = /^pledge:([0-9a-f-]{36}):(received|total|reminder:\d{4}-\d{2}-\d{2}|paid:.+)$/;

type EmailRow = Pick<QueuedEmail, 'contest_id' | 'recipient_email' | 'email_type' | 'dedupe_key'>;

/** Does nothing for a key the contest already has. */
async function enqueueAll(rows: EmailRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += PAGE) {
    const { error } = await supabaseAdminClient.from('email_logs').upsert(
      rows.slice(i, i + PAGE).map((row) => ({ ...row, status: 'queued' })),
      { onConflict: 'contest_id,dedupe_key', ignoreDuplicates: true }
    );
    throwIfError(error);
  }
}

type PledgeRow = Pick<
  Tables<'pledges'>,
  'id' | 'player_id' | 'kind' | 'amount' | 'cap' | 'amount_owed' | 'status' | 'paid_at'
>;
type ContactRow = Pick<Tables<'pledge_contacts'>, 'pledge_id' | 'first_name' | 'email'>;
const PLEDGE_COLUMNS = 'id, player_id, kind, amount, cap, amount_owed, status, paid_at';

/** Every row of a query, a page at a time (the API returns at most 1000). */
async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code: string; message: string } | null }>
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    throwIfError(error);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) return all;
  }
}

async function readContacts(contestId: string, pledgeIds?: string[]): Promise<Map<string, ContactRow>> {
  const rows = await readAll<ContactRow>((from, to) => {
    let query = supabaseAdminClient
      .from('pledge_contacts')
      .select('pledge_id, first_name, email')
      .eq('contest_id', contestId);
    if (pledgeIds) query = query.in('pledge_id', pledgeIds);
    return query.order('pledge_id').range(from, to);
  });
  return new Map(rows.map((row) => [row.pledge_id, row]));
}

/** Queues "pledge received". Never throws: the pledge is already made. */
export async function enqueuePledgeReceived(contestId: string, pledgeId: string, email: string): Promise<void> {
  try {
    await enqueueAll([
      {
        contest_id: contestId,
        recipient_email: email,
        email_type: 'pledge_received',
        dedupe_key: `pledge:${pledgeId}:received`,
      },
    ]);
  } catch (error) {
    logger.error('enqueuePledgeReceived', error, { contestId });
  }
}

/** Queues "payment confirmed" for this payment. Never throws: the pledge is already marked paid. */
export async function enqueuePledgePaid(contestId: string, pledgeId: string, paidAt: string): Promise<void> {
  try {
    const contact = (await readContacts(contestId, [pledgeId])).get(pledgeId);
    if (!contact) return;
    await enqueueAll([
      {
        contest_id: contestId,
        recipient_email: contact.email,
        email_type: 'pledge_paid',
        dedupe_key: `pledge:${pledgeId}:paid:${paidAt}`,
      },
    ]);
  } catch (error) {
    logger.error('enqueuePledgePaid', error, { contestId });
  }
}

/**
 * Queues the total emails, then the organizer's. Run after the lock; safe to run again (the keys). The organizer's
 * row goes last, so it being there means the lock's emails are all queued.
 */
export async function enqueueLockEmails(contestId: string, ownerId: string): Promise<void> {
  const pledges = await readAll<Pick<PledgeRow, 'id'>>((from, to) =>
    supabaseAdminClient
      .from('pledges')
      .select('id')
      .eq('contest_id', contestId)
      .or('and(kind.eq.per_hit,status.in.(pending,nothing_owed)),and(kind.eq.flat,status.eq.pending)')
      .order('id')
      .range(from, to)
  );
  const contacts = await readContacts(contestId);

  await enqueueAll(
    pledges.flatMap(({ id }) => {
      const contact = contacts.get(id);
      return contact
        ? [
            {
              contest_id: contestId,
              recipient_email: contact.email,
              email_type: 'pledge_total',
              dedupe_key: `pledge:${id}:total`,
            },
          ]
        : [];
    })
  );
  await enqueueAll([
    {
      contest_id: contestId,
      recipient_email: await getAccountEmail(ownerId),
      email_type: 'organizer_totals',
      dedupe_key: 'organizer:totals',
    },
  ]);
}

/**
 * Queues the lock's emails only if queueing them didn't finish (the organizer's row, queued last, is missing). So a
 * pledge whose status changed since the lock isn't sent a total it wasn't due then.
 */
export async function enqueueMissingLockEmails(contestId: string, ownerId: string): Promise<void> {
  const { count, error } = await supabaseAdminClient
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('contest_id', contestId)
    .eq('dedupe_key', 'organizer:totals');
  throwIfError(error);
  if (!count) await enqueueLockEmails(contestId, ownerId);
}

/** Queues a reminder for every pledge still owed, at most one a pledge a day. Returns how many are owed. */
export async function enqueueReminders(contestId: string): Promise<number> {
  const pledges = await readAll<Pick<PledgeRow, 'id'>>((from, to) =>
    supabaseAdminClient
      .from('pledges')
      .select('id')
      .eq('contest_id', contestId)
      .eq('status', 'pending')
      .order('id')
      .range(from, to)
  );
  const contacts = await readContacts(contestId);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

  await enqueueAll(
    pledges.flatMap(({ id }) => {
      const contact = contacts.get(id);
      return contact
        ? [
            {
              contest_id: contestId,
              recipient_email: contact.email,
              email_type: 'pledge_reminder',
              dedupe_key: `pledge:${id}:reminder:${day}`,
            },
          ]
        : [];
    })
  );
  return pledges.length;
}

/** Total emails queued at the lock and not dropped as out of date: "Totals sent to {n} supporters." */
export async function countTotalsSent(contestId: string): Promise<number> {
  const { count, error } = await supabaseAdminClient
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('contest_id', contestId)
    .eq('email_type', 'pledge_total')
    .neq('status', 'skipped');
  throwIfError(error);
  return count ?? 0;
}

/**
 * On a dashboard load: queues the lock's emails if the lock went through but queueing didn't (the organizer's row
 * is missing), then sends whatever is still queued. Never throws.
 */
export async function resumeHitAThonEmails(
  contest: Pick<Tables<'contests'>, 'id' | 'owner_id' | 'hits_locked_at'>
): Promise<void> {
  try {
    if (contest.hits_locked_at) await enqueueMissingLockEmails(contest.id, contest.owner_id);
  } catch (error) {
    logger.error('resumeHitAThonEmails', error, { contestId: contest.id });
  }
  await drainHitAThonEmails(contest.id, LONG_DRAIN_MS);
}

type Context = {
  contest: Pick<Tables<'contests'>, 'id' | 'name' | 'slug' | 'hits_locked_at' | 'pitches_per_player'>;
  players: Map<string, Pick<Tables<'hit_players'>, 'id' | 'first_name' | 'number' | 'slug' | 'hits'>>;
  paymentOptions: PledgePaymentOption[];
};

async function loadContext(contestId: string): Promise<Context> {
  const { data: contest, error } = await supabaseAdminClient
    .from('contests')
    .select('id, name, slug, hits_locked_at, pitches_per_player')
    .eq('id', contestId)
    .single();
  throwIfError(error);
  if (!contest) throw new Error('No contest for the email');

  const { data: players, error: playersError } = await supabaseAdminClient
    .from('hit_players')
    .select('id, first_name, number, slug, hits')
    .eq('contest_id', contestId);
  throwIfError(playersError);

  const options = await getPaymentOptionsForContest(contestId, supabaseAdminClient);

  return {
    contest,
    players: new Map((players ?? []).map((p) => [p.id, p])),
    // Same as the squares claim email
    paymentOptions: options.map((opt) => ({
      type: opt.type,
      handle: opt.handle_or_link,
      link: opt.handle_or_link.startsWith('http') ? opt.handle_or_link : undefined,
    })),
  };
}

/** Writes one email from current data. Null means it's out of date and must not go out. */
async function build(
  email: QueuedEmail,
  ctx: Context,
  pledges: Map<string, PledgeRow>,
  contacts: Map<string, ContactRow>
): Promise<EmailContent | null> {
  const { contest } = ctx;
  const type = email.email_type as HitAThonEmailType;

  if (type === 'organizer_totals') {
    if (!contest.hits_locked_at) return null;
    const owed = await readAll<Pick<PledgeRow, 'amount_owed'>>((from, to) =>
      supabaseAdminClient
        .from('pledges')
        .select('amount_owed')
        .eq('contest_id', contest.id)
        .eq('status', 'pending')
        .order('id')
        .range(from, to)
    );
    return organizerTotalsEmail({
      contestName: contest.name,
      supporters: await countTotalsSent(contest.id),
      totalOwed: formatPrizeAmount(sumMoney(owed.map((p) => Number(p.amount_owed ?? 0)))),
      contestUrl: `${getURL()}/dashboard/${contest.id}`,
    });
  }

  const [, pledgeId, what] = email.dedupe_key?.match(KEY) ?? [];
  const pledge = pledgeId ? pledges.get(pledgeId) : undefined;
  const contact = pledgeId ? contacts.get(pledgeId) : undefined;
  const player = pledge ? ctx.players.get(pledge.player_id) : undefined;
  if (!pledge || !contact || !player || pledge.status === 'cancelled') return null;

  const base = {
    firstName: contact.first_name,
    contestName: contest.name,
    playerName: player.first_name,
    playerNumber: player.number,
    pledgeText: pledge.kind === 'flat' ? formatPrizeAmount(Number(pledge.amount)) : pledgeLabel(pledge),
    fundraiserUrl: `${getURL()}/contest/${contest.slug}?ref=${player.slug}`,
  };

  if (type === 'pledge_received' && what === 'received') {
    return pledge.kind === 'per_hit'
      ? pledgeReceivedEmail({
          ...base,
          kind: 'per_hit',
          // The most they'd pay: per hit × pitches, or the cap if lower
          mostYoudPay: formatPrizeAmount(
            pledgeTotal({ ...pledge, amount_owed: null }, null, contest.pitches_per_player ?? 0)
          ),
        })
      : pledgeReceivedEmail({
          ...base,
          kind: 'flat',
          amountDue: formatPrizeAmount(Number(pledge.amount)),
          paymentOptions: ctx.paymentOptions,
        });
  }

  if (!contest.hits_locked_at || player.hits === null) return null;

  if ((type === 'pledge_total' && what === 'total') || (type === 'pledge_reminder' && what.startsWith('reminder:'))) {
    const isReminder = type === 'pledge_reminder';
    if (!isReminder && pledge.status === 'nothing_owed') return pledgeZeroHitsEmail(base);
    if (pledge.status !== 'pending') return null;
    return pledgeTotalEmail({
      ...base,
      kind: pledge.kind,
      hits: player.hits,
      amountDue: formatPrizeAmount(Number(pledge.amount_owed ?? 0)),
      paymentOptions: ctx.paymentOptions,
      isReminder,
    });
  }

  if (type === 'pledge_paid' && what === `paid:${pledge.paid_at}` && pledge.status === 'paid') {
    return pledgePaidEmail(base);
  }

  return null;
}

/**
 * Sends a hit-a-thon's queued emails, a batch at a time, and retries the refused ones. Safe to run twice at once:
 * each row is claimed before it's sent. Stops starting batches after `budgetMs`, and on a rate limit; what's left
 * stays queued for the next drain (the next action or dashboard load). Never throws.
 */
export async function drainHitAThonEmails(contestId: string, budgetMs = SHORT_DRAIN_MS): Promise<void> {
  const deadline = Date.now() + budgetMs;
  const seen = new Set<string>();
  let ctx: Context | null = null;
  let hasSent = false;

  try {
    const { error: stuckError } = await supabaseAdminClient
      .from('email_logs')
      .update({ status: 'unconfirmed' })
      .eq('contest_id', contestId)
      .eq('status', 'sending')
      .in('email_type', [...TYPES])
      .lt('sent_at', new Date(Date.now() - STUCK_AFTER_MS).toISOString());
    throwIfError(stuckError);

    while (Date.now() < deadline) {
      const { data, error } = await supabaseAdminClient
        .from('email_logs')
        .select('id, contest_id, square_id, recipient_email, email_type, status, dedupe_key')
        .eq('contest_id', contestId)
        .in('status', ['queued', 'failed'])
        .in('email_type', [...TYPES])
        .not('dedupe_key', 'is', null)
        .order('sent_at')
        .limit(PAGE);
      throwIfError(error);

      // A row refused again in this drain waits for the next one
      const emails = (data ?? []).filter((email) => !seen.has(email.id));
      if (emails.length === 0) return;
      emails.forEach((email) => seen.add(email.id));
      emails.sort(
        (a, b) => TYPES.indexOf(a.email_type as HitAThonEmailType) - TYPES.indexOf(b.email_type as HitAThonEmailType)
      );

      // One type a batch, so the organizer's is written after the totals before it have gone out or been dropped
      const chunks: QueuedEmail[][] = [];
      for (const email of emails) {
        const last = chunks.at(-1);
        if (last && last.length < BATCH_SIZE && last[0].email_type === email.email_type) last.push(email);
        else chunks.push([email]);
      }

      for (const chunk of chunks) {
        if (Date.now() >= deadline) return;

        const claimed = await claimAll(chunk);
        if (claimed.length === 0) continue;

        ctx ??= await loadContext(contestId);
        const ids = claimed.flatMap((email) => email.dedupe_key?.match(KEY)?.[1] ?? []);
        const pledges = ids.length
          ? new Map(
              (
                await readAll<PledgeRow>((from, to) =>
                  supabaseAdminClient.from('pledges').select(PLEDGE_COLUMNS).in('id', ids).order('id').range(from, to)
                )
              ).map((p) => [p.id, p])
            )
          : new Map<string, PledgeRow>();
        const contacts = ids.length ? await readContacts(contestId, ids) : new Map<string, ContactRow>();

        const ready: { email: QueuedEmail; content: EmailContent }[] = [];
        for (const email of claimed) {
          let content: EmailContent | null;
          try {
            content = await build(email, ctx, pledges, contacts);
          } catch (error) {
            // Nothing went out, so a later drain can try again
            logger.error('drainHitAThonEmails', error, { contestId, emailType: email.email_type });
            await setStatus(email, { status: 'queued' });
            continue;
          }
          if (content) ready.push({ email, content });
          else await setStatus(email, { status: 'skipped' });
        }
        if (ready.length === 0) continue;

        if (hasSent) await wait(SEND_GAP_MS);
        hasSent = true;
        if ((await sendChunk(ready)) === 'rate_limited') return;
      }
    }
  } catch (error) {
    logger.error('drainHitAThonEmails', error, { contestId });
  }
}

/** Takes the rows no other drain has, in one update. */
async function claimAll(emails: QueuedEmail[]): Promise<QueuedEmail[]> {
  const { data, error } = await supabaseAdminClient
    .from('email_logs')
    .update({ status: 'sending', sent_at: getCurrentISOString() })
    .in(
      'id',
      emails.map((email) => email.id)
    )
    .in('status', ['queued', 'failed'])
    .select('id');
  throwIfError(error);
  const taken = new Set((data ?? []).map((row) => row.id));
  return emails.filter((email) => taken.has(email.id));
}

/**
 * One batch. A rate limit: wait, try once more, then put them back. Any other refusal (nothing went out): one at a
 * time, so one bad address doesn't hold up the rest. Anything unclear: all unconfirmed, never sent again.
 */
async function sendChunk(ready: { email: QueuedEmail; content: EmailContent }[]): Promise<'done' | 'rate_limited'> {
  const sendOnce = () =>
    Promise.race([
      sendEmailBatch(ready.map(({ email, content }) => ({ to: email.recipient_email, ...content }))),
      wait(BATCH_TIMEOUT_MS),
    ]);

  let result = await sendOnce();
  if (result && !result.success && result.statusCode === 429) {
    await wait(RATE_LIMIT_WAIT_MS);
    result = await sendOnce();
  }

  if (result?.success) {
    const sentAt = getCurrentISOString();
    await inParallel(ready, ({ email }, i) =>
      setStatus(email, { status: 'sent', resend_id: result.ids[i], sent_at: sentAt })
    );
    return 'done';
  }

  const statusCode = result?.statusCode ?? 0;
  if (statusCode === 429) {
    await inParallel(ready, ({ email }) => setStatus(email, { status: 'queued' }));
    return 'rate_limited';
  }
  if (!(statusCode >= 400 && statusCode < 500)) {
    await inParallel(ready, ({ email }) => setStatus(email, { status: 'unconfirmed' }));
    return 'done';
  }

  for (const [i, { email, content }] of ready.entries()) {
    await wait(SEND_GAP_MS);
    let { outcome, resendId } = await send(email, content);
    if (outcome === 'rate_limited') {
      await wait(RATE_LIMIT_WAIT_MS);
      ({ outcome, resendId } = await send(email, content));
    }
    if (outcome === 'rate_limited') {
      await inParallel(ready.slice(i), (item) => setStatus(item.email, { status: 'queued' }));
      return 'rate_limited';
    }
    await setStatus(
      email,
      outcome === 'sent'
        ? { status: outcome, resend_id: resendId, sent_at: getCurrentISOString() }
        : { status: outcome }
    );
  }
  return 'done';
}

/** Ten at a time. */
async function inParallel<T>(items: T[], fn: (item: T, index: number) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += 10) {
    await Promise.all(items.slice(i, i + 10).map((item, j) => fn(item, i + j)));
  }
}
