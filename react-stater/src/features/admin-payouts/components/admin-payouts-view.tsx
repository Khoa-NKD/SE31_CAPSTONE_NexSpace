import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminPayoutQueries } from '../api/queries';
import { PendingRequestsTable } from './pending-requests-table';
import { GlobalPayoutLedgerTable } from './global-payout-ledger-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Clock, FileText } from 'lucide-react';

export const AdminPayoutsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'ledger'>('requests');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: requests, isLoading: isRequestsLoading } = useQuery(
    adminPayoutQueries.requests(1, 20)
  );

  const { data: ledger, isLoading: isLedgerLoading } = useQuery(
    adminPayoutQueries.ledger({
      page: 1,
      size: 20,
      status: statusFilter,
      payoutType: typeFilter
    })
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Link to="/dashboard/overview" className="hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Quản trị Admin
          </Link>
          <span>/</span>
          <span>Tài chính & Chi trả</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Quản lý Chi trả & Sổ cái Payout
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Phê duyệt các yêu cầu bật/hủy Auto Payout của Organizer và giám sát toàn bộ các lệnh chi tiền qua cổng PayOS.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'requests' | 'ledger')}>
        <TabsList className="grid w-full max-w-[420px] grid-cols-2">
          <TabsTrigger value="requests" className="text-xs font-semibold gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Yêu cầu Auto Payout
            {requests && (requests.totalRecords > 0 || (requests.listObjects && requests.listObjects.length > 0)) && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {requests.totalRecords || requests.listObjects?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs font-semibold gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Sổ cái Chi tiền Toàn sàn
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="pt-4">
          <PendingRequestsTable requests={requests} isLoading={isRequestsLoading} />
        </TabsContent>

        <TabsContent value="ledger" className="pt-4">
          <GlobalPayoutLedgerTable
            ledger={ledger}
            isLoading={isLedgerLoading}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
