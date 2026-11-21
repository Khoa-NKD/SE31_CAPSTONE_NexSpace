import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminPayoutQueries } from '../api/queries';
import { PendingRequestsTable } from './pending-requests-table';
import { GlobalPayoutLedgerTable } from './global-payout-ledger-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Clock, FileText } from 'lucide-react';
import { useLanguage } from '@/features/landing/context/language-context';

export const AdminPayoutsView: React.FC = () => {
  const { language } = useLanguage();
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Link to="/dashboard/overview" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-3 w-3" /> {language === 'vi' ? 'Quản trị Admin' : 'Admin Console'}
          </Link>
          <span>/</span>
          <span>{language === 'vi' ? 'Tài chính & Chi trả' : 'Finance & Payouts'}</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {language === 'vi' ? 'Quản lý Chi trả & Sổ cái Payout' : 'Payout Management & Global Ledger'}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {language === 'vi'
            ? 'Phê duyệt các yêu cầu bật/hủy Auto Payout của Organizer và giám sát toàn bộ các lệnh chi tiền qua cổng PayOS.'
            : 'Review Organizer Auto Payout configuration requests and monitor all disbursement records via PayOS.'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'requests' | 'ledger')}>
        <TabsList className="grid w-full max-w-[420px] grid-cols-2">
          <TabsTrigger value="requests" className="text-xs font-semibold gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {language === 'vi' ? 'Yêu cầu Auto Payout' : 'Auto Payout Requests'}
            {requests && (requests.totalRecords > 0 || (requests.listObjects && requests.listObjects.length > 0)) && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {requests.totalRecords || requests.listObjects?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs font-semibold gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {language === 'vi' ? 'Sổ cái Chi tiền Toàn sàn' : 'Platform Disbursement Ledger'}
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
