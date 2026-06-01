import { Link } from 'react-router-dom';
import { Bot, Sparkles } from 'lucide-react';
import type { AiInsight } from '../lib/ai';

interface AiInsightPanelProps {
  eyebrow?: string;
  title: string;
  insights: AiInsight[];
  compact?: boolean;
}

export default function AiInsightPanel({ eyebrow = 'KinaHub AI', title, insights, compact = false }: AiInsightPanelProps) {
  return (
    <section className="rounded-lg border border-accent/30 bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-background">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-accent">{eyebrow}</p>
          <h2 className={`${compact ? 'text-base' : 'text-lg sm:text-xl'} font-black tracking-tight text-primary`}>{title}</h2>
        </div>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
        {insights.map((insight) => (
          <article key={insight.title} className="rounded-md border border-border bg-background p-3">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-bold text-primary">{insight.title}</h3>
            </div>
            <p className="text-sm leading-6 text-secondary">{insight.body}</p>
            {insight.href && insight.action && (
              <Link to={insight.href} className="mt-3 inline-flex text-sm font-semibold text-accent hover:underline">
                {insight.action}
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
