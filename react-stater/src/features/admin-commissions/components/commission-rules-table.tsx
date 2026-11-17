import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Layers,
  Building,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CommissionRule,
  MOCK_COMMISSION_RULES
} from '../data/mock-commissions';

interface CommissionRulesTableProps {
  onSelectRule?: (rule: CommissionRule) => void;
  selectedRuleId?: string;
  isConfigurationMode?: boolean; // When true (in A14), row click selects for slide-over drawer
}

export function CommissionRulesTable({
  onSelectRule,
  selectedRuleId,
  isConfigurationMode = false
}: CommissionRulesTableProps) {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredRules = MOCK_COMMISSION_RULES.filter((rule) => {
    if (filterType === 'all') return true;
    return rule.scopeType === filterType;
  });

  return (
    <div className='bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden'>
      {/* Table Header Toolbar */}
      <div className='p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h2 className='text-base font-semibold text-foreground tracking-tight'>
            Currently Effective Fee Rules Ledger
          </h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Active operational rules applied by the platform fee distribution engine during settlement.
          </p>
        </div>

        {/* Filter Pills */}
        <div className='flex items-center gap-1.5 bg-muted p-1 rounded-lg border border-border text-xs'>
          <button
            type='button'
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              filterType === 'all'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Active ({MOCK_COMMISSION_RULES.length})
          </button>
          <button
            type='button'
            onClick={() => setFilterType('marketplace')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              filterType === 'marketplace'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Marketplace
          </button>
          <button
            type='button'
            onClick={() => setFilterType('enterprise')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              filterType === 'enterprise'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Enterprise
          </button>
          <button
            type='button'
            onClick={() => setFilterType('gateway')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              filterType === 'gateway'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Gateway Rails
          </button>
        </div>
      </div>

      {/* Responsive Table Grid */}
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse text-xs'>
          <thead>
            <tr className='bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]'>
              <th scope='col' className='py-3 px-5'>
                Rule Label &amp; Code
              </th>
              <th scope='col' className='py-3 px-5'>
                Scope / Applicability
              </th>
              <th scope='col' className='py-3 px-5 text-right'>
                Effective Rate
              </th>
              <th scope='col' className='py-3 px-5'>
                Effective Period
              </th>
              <th scope='col' className='py-3 px-5 text-center'>
                Status
              </th>
              <th scope='col' className='py-3 px-5 text-right'>
                Action
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border font-medium'>
            {filteredRules.map((rule) => {
              const isSelected = selectedRuleId === rule.id;

              return (
                <tr
                  key={rule.id}
                  onClick={() => isConfigurationMode && onSelectRule?.(rule)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border-l-4 border-primary'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  {/* Rule Label & Code */}
                  <td className='py-3.5 px-5' aria-label={rule.name}>
                    <div className='flex items-center gap-3'>
                      <div className='size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0'>
                        {rule.scopeType === 'enterprise' ? (
                          <Building className='size-4' />
                        ) : rule.scopeType === 'gateway' ? (
                          <QrCode className='size-4' />
                        ) : (
                          <Layers className='size-4' />
                        )}
                      </div>
                      <div>
                        <div className='font-bold text-foreground text-xs'>
                          {rule.name}
                        </div>
                        <div className='font-mono text-[11px] text-muted-foreground'>
                          #{rule.ruleCode}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Scope */}
                  <td className='py-3.5 px-5 text-muted-foreground'>
                    {rule.scope}
                  </td>

                  {/* Effective Rate */}
                  <td className='py-3.5 px-5 text-right font-mono font-bold text-foreground text-xs'>
                    {rule.effectiveRate}%
                    {rule.fixedFeeVnd ? ` + ${rule.fixedFeeVnd.toLocaleString('vi-VN')} VND` : ''}
                  </td>

                  {/* Effective Period */}
                  <td className='py-3.5 px-5 text-muted-foreground font-mono text-[11px]'>
                    {rule.effectiveFrom} — {rule.effectiveTo}
                  </td>

                  {/* Status */}
                  <td className='py-3.5 px-5 text-center'>
                    <Badge
                      variant='outline'
                      className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-bold px-2 py-0.5'
                    >
                      <span className='size-1.5 rounded-full bg-emerald-500 mr-1.5' />
                      {rule.status}
                    </Badge>
                  </td>

                  {/* Action */}
                  <td className='py-3.5 px-5 text-right'>
                    {isConfigurationMode ? (
                      <Button
                        size='sm'
                        variant={isSelected ? 'default' : 'outline'}
                        className='h-7 text-xs font-semibold px-2.5'
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRule?.(rule);
                        }}
                      >
                        {isSelected ? 'Selected' : 'Edit / Details'}
                      </Button>
                    ) : (
                      <Link
                        to='/dashboard/admin/commissions/rules'
                        className='inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold text-xs transition-colors'
                      >
                        <span>View in A14</span>
                        <ArrowRight className='size-3.5' />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className='px-5 py-3 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground'>
        <span>Showing {filteredRules.length} of {MOCK_COMMISSION_RULES.length} active rules</span>
        <span className='font-mono text-[11px]'>Ledger Block: #8,421,902</span>
      </div>
    </div>
  );
}
