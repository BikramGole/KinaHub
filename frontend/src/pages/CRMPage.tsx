import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/LocaleContext';

interface Ticket {
  id: number;
  customer_email: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

function getTicketStatusLabel(status: string, t: (key: string, options?: Record<string, string | number> & { defaultValue?: string }) => string) {
  const labels: Record<string, string> = {
    open: t('dashboard.ticketOpen', { defaultValue: 'Open' }),
    pending: t('dashboard.ticketPending', { defaultValue: 'Pending' }),
    resolved: t('dashboard.ticketResolved', { defaultValue: 'Resolved' }),
  };

  return labels[status] || status;
}

function getTicketPriorityLabel(priority: string, t: (key: string, options?: Record<string, string | number> & { defaultValue?: string }) => string) {
  const labels: Record<string, string> = {
    low: t('dashboard.priorityLow', { defaultValue: 'Low' }),
    medium: t('dashboard.priorityMedium', { defaultValue: 'Medium' }),
    high: t('dashboard.priorityHigh', { defaultValue: 'High' }),
  };

  return labels[priority] || priority;
}

const DEMO_TICKETS: Ticket[] = [
  { id: 501, customer_email: 'ram.shah@gmail.com', subject: 'Delivery delay on order #1001', status: 'open', priority: 'high', created_at: new Date().toISOString() },
  { id: 502, customer_email: 'sita.rai@outlook.com', subject: 'Refund request for cancelled order', status: 'pending', priority: 'medium', created_at: new Date().toISOString() },
  { id: 503, customer_email: 'anjali.pokharel@gmail.com', subject: 'How do I sell on KinaHub?', status: 'resolved', priority: 'low', created_at: new Date().toISOString() },
];

export default function CRMPage() {
  const { token, isDemo } = useAuth();
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (isDemo) {
      setTickets(DEMO_TICKETS);
      return;
    }
    apiRequest<Ticket[]>('/crm/tickets/', { token })
      .then(setTickets)
      .catch(() => setTickets([]));
  }, [token, isDemo]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h1 className="text-2xl font-black tracking-tight">{t('dashboard.crmWorkspace', { defaultValue: 'CRM workspace' })}</h1>
        <p className="mt-2 text-secondary">{t('dashboard.trackCrm', { defaultValue: 'Track customer records, seller records, leads, tickets, messages, notifications, and activity logs in one place.' })}</p>
        {isDemo && (
          <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
            {t('dashboard.demoNotice', { defaultValue: 'Demo mode: sample data shown, nothing is saved. Everything resets on refresh.' })}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-bold">{t('dashboard.supportTickets', { defaultValue: 'Support tickets' })}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-secondary">
              <tr>
                <th className="py-2">{t('dashboard.subject', { defaultValue: 'Subject' })}</th>
                <th className="py-2">{t('dashboard.customer', { defaultValue: 'Customer' })}</th>
                <th className="py-2">{t('dashboard.priority', { defaultValue: 'Priority' })}</th>
                <th className="py-2">{t('dashboard.status', { defaultValue: 'Status' })}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-border">
                  <td className="py-3 font-semibold">{ticket.subject}</td>
                  <td className="py-3">{ticket.customer_email}</td>
                  <td className="py-3 capitalize">{getTicketPriorityLabel(ticket.priority, t)}</td>
                  <td className="py-3 capitalize">{getTicketStatusLabel(ticket.status, t)}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr className="border-t border-border">
                  <td className="py-4 text-secondary" colSpan={4}>{t('common.noTickets', { defaultValue: 'No tickets yet.' })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
