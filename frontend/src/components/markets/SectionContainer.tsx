import { memo, type ReactNode } from 'react';

type SectionContainerProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

function SectionContainerBase({ title, description, action, children }: SectionContainerProps) {
  return (
    <section className="panel p-4 md:p-5">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h2 className="text-lg font-medium text-[var(--text-primary)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)]" title={description}>
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export const SectionContainer = memo(SectionContainerBase);
