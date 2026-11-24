import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Layers,
  Building,
  QrCode,
  ArrowRight,
  Search,
  X,
  Check,
  Edit,
  Receipt
} from '@/components/ui/hugeicons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CommissionRule,
  MOCK_COMMISSION_RULES
} from '../data/mock-commissions';
import { useLanguage } from '@/features/landing/context/language-context';

interface CommissionRulesTableProps {
  onSelectRule?: (rule: CommissionRule) => void;
  selectedRuleId?: string;
  isConfigurationMode?: boolean; // When true (in rules page), row click selects for slide-over drawer
}

export function CommissionRulesTable({
  onSelectRule,
  selectedRuleId,
  isConfigurationMode = false
}: CommissionRulesTableProps) {
  const { language } = useLanguage();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredRules = useMemo(() => {
    return MOCK_COMMISSION_RULES.filter((rule) => {
      // 1. Tab Scope filter
      if (filterType !== 'all' && rule.scopeType !== filterType) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = rule.name.toLowerCase().includes(query) || (rule.nameVi && rule.nameVi.toLowerCase().includes(query));
        const matchCode = rule.ruleCode.toLowerCase().includes(query);
        const matchScope = rule.scope.toLowerCase().includes(query) || (rule.scopeVi && rule.scopeVi.toLowerCase().includes(query));
        const matchDesc = rule.description.toLowerCase().includes(query) || (rule.descriptionVi && rule.descriptionVi.toLowerCase().includes(query));
        return matchName || matchCode || matchScope || matchDesc;
      }

      return true;
    });
  }, [filterType, searchQuery]);

  // Counts for tabs
  const marketplaceCount = MOCK_COMMISSION_RULES.filter((r) => r.scopeType === 'marketplace').length;
  const enterpriseCount = MOCK_COMMISSION_RULES.filter((r) => r.scopeType === 'enterprise').length;
  const gatewayCount = MOCK_COMMISSION_RULES.filter((r) => r.scopeType === 'gateway').length;

  return (
    <div className='bg-card text-card-foreground rounded-xl border border-border/70 shadow-2xs overflow-hidden'>
      {/* Table Header Toolbar */}
      <div className='p-4 sm:p-5 border-b border-border/70 flex flex-col gap-3.5'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='p-1 rounded-md bg-primary/10 text-primary'>
                <Receipt className='size-4' />
              </div>
              <h2 className='text-sm sm:text-base font-semibold text-foreground tracking-tight'>
                {language === 'vi'
                  ? 'Sổ cái Quy tắc Biểu phí đang có Hiệu lực'
                  : 'Currently Effective Fee Rules Ledger'}
              </h2>
            </div>
            <p className='text-xs text-muted-foreground mt-0.5 ml-7'>
              {language === 'vi'
                ? 'Các quy tắc phí vận hành được bộ phân phối tự động áp dụng khi quyết toán thanh toán.'
                : 'Active operational rules applied by the platform fee distribution engine during settlement.'}
            </p>
          </div>

          {!isConfigurationMode && (
            <Link to='/dashboard/admin/commissions/rules' className='self-start sm:self-auto'>
              <Button size='sm' variant='outline' className='text-xs font-semibold gap-1.5 h-8'>
                <span>{language === 'vi' ? 'Quản lý toàn bộ quy tắc' : 'Open Rules Console'}</span>
                <ArrowRight className='size-3.5 text-primary' />
              </Button>
            </Link>
          )}
        </div>

        {/* Filter Controls Row: Search Bar + Filter Pills */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1'>
          {/* Search Input */}
          <div className='relative w-full sm:w-80'>
            <Search className='size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Tìm theo tên, mã quy tắc, phạm vi...'
                  : 'Search by rule name, code, scope...'
              }
              className='w-full text-xs bg-muted/40 border border-input rounded-lg pl-8.5 pr-8 py-1.5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary transition-all'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                aria-label='Clear search'
                className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer'
              >
                <X className='size-3.5' />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className='inline-flex items-center p-0.5 bg-muted/60 rounded-lg border border-border/50 text-xs self-start sm:self-auto overflow-x-auto max-w-full'>
            <button
              type='button'
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-all whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-card text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {language === 'vi' ? 'Tất cả' : 'All Active'} ({MOCK_COMMISSION_RULES.length})
            </button>
            <button
              type='button'
              onClick={() => setFilterType('marketplace')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-all whitespace-nowrap ${
                filterType === 'marketplace'
                  ? 'bg-card text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Marketplace ({marketplaceCount})
            </button>
            <button
              type='button'
              onClick={() => setFilterType('enterprise')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-all whitespace-nowrap ${
                filterType === 'enterprise'
                  ? 'bg-card text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {language === 'vi' ? 'Doanh nghiệp' : 'Enterprise'} ({enterpriseCount})
            </button>
            <button
              type='button'
              onClick={() => setFilterType('gateway')}
              className={`px-3 py-1 rounded-md font-medium text-xs transition-all whitespace-nowrap ${
                filterType === 'gateway'
                  ? 'bg-card text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {language === 'vi' ? 'Cổng thanh toán' : 'Gateway Rails'} ({gatewayCount})
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Table Grid with Frozen (Sticky) Action Column */}
      <div className='overflow-x-auto'>
        <table className='w-full text-left border-collapse text-xs min-w-[850px]'>
          <thead>
            <tr className='bg-muted/40 border-b border-border/70 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]'>
              <th scope='col' className='py-3 px-4 sm:px-5'>
                {language === 'vi' ? 'Tên quy tắc & Mã định danh' : 'Rule Label & Code'}
              </th>
              <th scope='col' className='py-3 px-4'>
                {language === 'vi' ? 'Phạm vi áp dụng' : 'Scope / Applicability'}
              </th>
              <th scope='col' className='py-3 px-4 text-right'>
                {language === 'vi' ? 'Tỷ lệ phí áp dụng' : 'Effective Rate'}
              </th>
              <th scope='col' className='py-3 px-4'>
                {language === 'vi' ? 'Thời gian hiệu lực' : 'Effective Period'}
              </th>
              <th scope='col' className='py-3 px-4 text-center'>
                {language === 'vi' ? 'Trạng thái' : 'Status'}
              </th>
              {/* Sticky Action Column Header with Left Shadow Line */}
              <th
                scope='col'
                className='py-3 px-4 text-right sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)] min-w-[125px]'
              >
                {language === 'vi' ? 'Thao tác' : 'Action'}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border/60 font-medium'>
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={6} className='py-12 text-center text-muted-foreground text-xs'>
                  <div className='flex flex-col items-center justify-center gap-2'>
                    <Receipt className='size-8 text-muted-foreground/40' />
                    <span>
                      {language === 'vi'
                        ? 'Không tìm thấy quy tắc biểu phí nào khớp với bộ lọc hiện tại.'
                        : 'No fee rules match your filter criteria.'}
                    </span>
                    {(searchQuery || filterType !== 'all') && (
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => {
                          setSearchQuery('');
                          setFilterType('all');
                        }}
                        className='text-xs mt-1 h-7'
                      >
                        {language === 'vi' ? 'Đặt lại bộ lọc' : 'Reset Filters'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => {
                const isSelected = selectedRuleId === rule.id;
                const ruleName = language === 'vi' ? (rule.nameVi || rule.name) : rule.name;
                const ruleScope = language === 'vi' ? (rule.scopeVi || rule.scope) : rule.scope;

                return (
                  <tr
                    key={rule.id}
                    onClick={() => isConfigurationMode && onSelectRule?.(rule)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    {/* Rule Label & Code */}
                    <td className='py-3.5 px-4 sm:px-5' aria-label={ruleName}>
                      <div className='flex items-center gap-3'>
                        <div
                          className={`size-8 rounded-lg border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-primary/10 border-primary/20 text-primary'
                          }`}
                        >
                          {rule.scopeType === 'enterprise' ? (
                            <Building className='size-4' />
                          ) : rule.scopeType === 'gateway' ? (
                            <QrCode className='size-4' />
                          ) : (
                            <Layers className='size-4' />
                          )}
                        </div>
                        <div className='min-w-0'>
                          <div className='font-bold text-foreground text-xs truncate max-w-[240px]'>
                            {ruleName}
                          </div>
                          <div className='font-mono text-[11px] text-muted-foreground flex items-center gap-1.5'>
                            <span>#{rule.ruleCode}</span>
                            <span className='size-1 rounded-full bg-muted-foreground/50'></span>
                            <span className='text-[10px] uppercase text-primary/80 font-semibold'>
                              {rule.version}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Scope */}
                    <td className='py-3.5 px-4 text-muted-foreground text-xs'>
                      <span className='font-medium text-foreground'>{ruleScope}</span>
                    </td>

                    {/* Effective Rate */}
                    <td className='py-3.5 px-4 text-right font-mono font-bold text-foreground text-xs whitespace-nowrap'>
                      <span className='text-sm text-primary'>{rule.effectiveRate}%</span>
                      {rule.fixedFeeVnd ? (
                        <span className='text-[11px] text-muted-foreground font-normal block sm:inline sm:ml-1'>
                          + {rule.fixedFeeVnd.toLocaleString('vi-VN')} ₫
                        </span>
                      ) : null}
                    </td>

                    {/* Effective Period */}
                    <td className='py-3.5 px-4 text-muted-foreground font-mono text-[11px] whitespace-nowrap'>
                      <span>{rule.effectiveFrom}</span>
                      <span className='mx-1'>—</span>
                      <span className='text-foreground'>{rule.effectiveTo}</span>
                    </td>

                    {/* Status */}
                    <td aria-label={`Trạng thái: ${rule.status}`} className='py-3.5 px-4 text-center whitespace-nowrap'>
                      <Badge
                        variant='outline'
                        className={`text-[10px] font-bold px-2 py-0.5 inline-flex items-center gap-1 ${
                          rule.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20'
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            rule.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-zinc-500'
                          }`}
                        />
                        <span>
                          {language === 'vi'
                            ? rule.status === 'ACTIVE'
                              ? 'HIỆU LỰC'
                              : 'TẠM DỪNG'
                            : rule.status}
                        </span>
                      </Badge>
                    </td>

                    {/* Sticky Action Column Body with Left Border Shadow */}
                    <td className='py-3.5 px-4 text-right sticky right-0 z-10 bg-card/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)] group-hover:bg-muted/90 transition-colors whitespace-nowrap'>
                      {isConfigurationMode ? (
                        <Button
                          size='sm'
                          variant={isSelected ? 'default' : 'outline'}
                          className={`h-7 text-xs font-semibold px-2.5 gap-1 shadow-2xs transition-all ${
                            isSelected ? 'bg-primary text-primary-foreground font-bold' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRule?.(rule);
                          }}
                        >
                          {isSelected ? (
                            <>
                              <Check className='size-3.5' />
                              <span>{language === 'vi' ? 'Đang chọn' : 'Selected'}</span>
                            </>
                          ) : (
                            <>
                              <Edit className='size-3.5' />
                              <span>{language === 'vi' ? 'Chỉnh sửa' : 'Edit / Details'}</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <Link
                          to='/dashboard/admin/commissions/rules'
                          className='inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold text-xs transition-colors'
                        >
                          <span>{language === 'vi' ? 'Xem cấu hình' : 'Configure'}</span>
                          <ArrowRight className='size-3.5' />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className='px-4 sm:px-5 py-3 bg-muted/30 border-t border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-muted-foreground gap-2'>
        <span>
          {language === 'vi'
            ? `Hiển thị ${filteredRules.length} / ${MOCK_COMMISSION_RULES.length} quy tắc biểu phí đang có hiệu lực`
            : `Showing ${filteredRules.length} of ${MOCK_COMMISSION_RULES.length} active fee rules`}
        </span>
        <span className='font-mono text-[10px] text-muted-foreground/80'>
          Ledger Block: #8,421,902 • SHA-256 Verified
        </span>
      </div>
    </div>
  );
}
