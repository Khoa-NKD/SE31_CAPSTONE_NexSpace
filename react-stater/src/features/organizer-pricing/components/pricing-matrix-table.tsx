import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { PricingResourceRow, ResourceTypeCategory } from '../types';

interface PricingMatrixTableProps {
  resources: PricingResourceRow[];
  onConfigureResource: (resource: PricingResourceRow) => void;
  onResetResource: (resourceId: string) => void;
}

export function PricingMatrixTable({
  resources,
  onConfigureResource,
  onResetResource
}: PricingMatrixTableProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ResourceTypeCategory>('ALL');

  const filtered = useMemo(() => {
    return resources.filter((res) => {
      const matchSearch =
        res.code.toLowerCase().includes(search.toLowerCase()) ||
        res.name.toLowerCase().includes(search.toLowerCase()) ||
        res.appliedRuleName.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        categoryFilter === 'ALL' || res.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [resources, search, categoryFilter]);

  const categoryTabs: { key: 'ALL' | ResourceTypeCategory; label: string }[] = [
    { key: 'ALL', label: 'All Resources' },
    { key: 'HOT_DESK', label: 'Hot Desks' },
    { key: 'MEETING_ROOM', label: 'Meeting Rooms' },
    { key: 'BOOTH', label: 'Phone Booths' }
  ];

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                categoryFilter === tab.key
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or room..."
            className="h-8 pl-8 text-xs bg-card"
          />
        </div>
      </div>

      {/* Pricing Matrix Table Card */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 text-[11px] uppercase tracking-wider font-semibold">
              <TableHead className="w-[120px]">Resource ID</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Base Hourly</TableHead>
              <TableHead className="text-right">Daily Pass (8h)</TableHead>
              <TableHead className="text-right">Monthly Pass</TableHead>
              <TableHead>Applied Rule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No pricing resources matching filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                  {/* Code */}
                  <TableCell className="font-mono font-bold text-foreground">
                    {row.code}
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <div>
                      <span className="font-medium text-foreground">{row.categoryLabel}</span>
                      <p className="text-[11px] text-muted-foreground truncate">{row.name}</p>
                    </div>
                  </TableCell>

                  {/* Base Hourly */}
                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    ${row.baseHourly.toFixed(2)}
                  </TableCell>

                  {/* Daily Pass */}
                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    ${row.dailyPass.toFixed(2)}
                  </TableCell>

                  {/* Monthly Pass */}
                  <TableCell className="text-right font-mono font-semibold text-foreground">
                    ${row.monthlyPass.toFixed(0)}.00
                  </TableCell>

                  {/* Applied Rule */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground truncate max-w-[150px]">
                        {row.appliedRuleName}
                      </span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {row.hasCustomOverwrite ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit"
                      >
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>Custom Overwrite</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Tier Standard</span>
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.hasCustomOverwrite && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onResetResource(row.id)}
                          aria-label={`Reset ${row.code} to tier standard`}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onConfigureResource(row)}
                        className="h-7 px-2.5 text-xs font-medium gap-1"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Edit</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

