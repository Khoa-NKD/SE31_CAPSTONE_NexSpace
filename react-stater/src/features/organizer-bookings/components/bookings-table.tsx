import React from 'react';
import {
  Laptop,
  Users,
  Presentation,
  PhoneCall,
  QrCode,
  CreditCard,
  Wallet,
  MoreVertical,
  Check,
  CheckCircle2,
  LockOpen,
  Send,
  SlidersHorizontal,
  Clock
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { BookingItem } from '../types';

interface BookingsTableProps {
  bookings: BookingItem[];
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectRow: (id: string) => void;
  onViewDetails: (booking: BookingItem) => void;
  onSendReminder: (booking: BookingItem) => void;
  onCancelBooking: (id: string) => void;
}

function getResourceIcon(category: string) {
  switch (category) {
    case 'HOT_DESK':
      return <Laptop className="w-3.5 h-3.5 text-primary" />;
    case 'DEDICATED_DESK':
      return <Users className="w-3.5 h-3.5 text-amber-500" />;
    case 'MEETING_ROOM':
      return <Presentation className="w-3.5 h-3.5 text-purple-500" />;
    case 'BOOTH':
      return <PhoneCall className="w-3.5 h-3.5 text-blue-500" />;
    default:
      return <Laptop className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function getGatewayIcon(gateway: string) {
  switch (gateway) {
    case 'PAYOS_QR':
      return <QrCode className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
    case 'PAYOS_CARD':
      return <CreditCard className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />;
    case 'PAYOS_MOMO':
      return <Wallet className="w-3 h-3 text-pink-600 dark:text-pink-400" />;
    default:
      return <CreditCard className="w-3 h-3 text-muted-foreground" />;
  }
}

export function BookingsTable({
  bookings,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
  onViewDetails,
  onSendReminder,
  onCancelBooking
}: BookingsTableProps) {
  const isAllSelected = bookings.length > 0 && selectedIds.length === bookings.length;

  return (
    <section className="bg-card border border-border rounded-xl shadow-2xs overflow-hidden select-none">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
              <TableHead className="w-12 text-center pl-4 pr-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Select all rows"
                />
              </TableHead>
              <TableHead className="w-28">Booking ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Resource & Zone</TableHead>
              <TableHead>Reserved Time Window</TableHead>
              <TableHead>Amount & Gateway</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-in State</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  No reservations found matching the current criteria.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((row) => {
                const isSelected = selectedIds.includes(row.id);

                return (
                  <TableRow
                    key={row.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      isSelected ? 'bg-primary/[0.03]' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <TableCell className="text-center pl-4 pr-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelectRow(row.id)}
                        aria-label={`Select reservation ${row.bookingCode}`}
                      />
                    </TableCell>

                    {/* Booking ID */}
                    <TableCell className="font-mono">
                      <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs border border-primary/20 inline-block">
                        {row.bookingCode}
                      </span>
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border border-border/60 ${
                            row.customerAvatarColor || 'bg-muted text-foreground'
                          }`}
                        >
                          {row.customerInitials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate">
                            {row.customerName}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono truncate">
                            {row.customerEmail}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Resource & Zone */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                          {getResourceIcon(row.resourceCategory)}
                          <span>{row.resourceCode}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[190px]">
                          {row.resourceZone}
                        </span>
                      </div>
                    </TableCell>

                    {/* Reserved Window */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{row.reservedDate}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {row.reservedTimeWindow}
                        </span>
                      </div>
                    </TableCell>

                    {/* Amount & Gateway */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span
                          className={`font-semibold tabular-nums font-mono ${
                            row.status === 'CANCELLED'
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          }`}
                        >
                          ${row.amount.toFixed(2)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border w-fit">
                          {getGatewayIcon(row.paymentGateway)}
                          <span>{row.paymentGatewayLabel}</span>
                        </span>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {row.status === 'CONFIRMED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Confirmed</span>
                        </span>
                      )}

                      {row.status === 'PENDING_PAYMENT' && (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Pending Payment</span>
                          </span>
                          {row.pendingTimeRemaining && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{row.pendingTimeRemaining}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {row.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>Completed</span>
                        </span>
                      )}

                      {row.status === 'CANCELLED' && (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Cancelled</span>
                          </span>
                          {row.statusReason && (
                            <span className="text-[10px] text-muted-foreground">
                              {row.statusReason}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Check-in State */}
                    <TableCell>
                      {row.checkInState === 'CHECKED_IN' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Checked In • {row.checkInTime || '09:05 AM'}</span>
                        </span>
                      )}

                      {row.checkInState === 'UPCOMING' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border">
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                          <span>Upcoming • Turnstile Active</span>
                        </span>
                      )}

                      {row.checkInState === 'AWAITING_PAYMENT' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Awaiting Payment</span>
                        </span>
                      )}

                      {row.checkInState === 'CHECKED_OUT' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                          <Check className="w-3 h-3 text-muted-foreground" />
                          <span>Completed & Checked Out</span>
                        </span>
                      )}

                      {row.checkInState === 'RELEASED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
                          <LockOpen className="w-3 h-3 text-muted-foreground" />
                          <span>Released</span>
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.status === 'PENDING_PAYMENT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSendReminder(row)}
                            className="h-7 px-2.5 text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Remind</span>
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetails(row)}
                          className="h-7 px-2.5 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          View Details
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              aria-label={`More options for ${row.bookingCode}`}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => onViewDetails(row)}
                              className="text-xs cursor-pointer gap-2"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span>View Full Log</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onSendReminder(row)}
                              className="text-xs cursor-pointer gap-2"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Resend Confirmation</span>
                            </DropdownMenuItem>
                            {row.status !== 'CANCELLED' && (
                              <DropdownMenuItem
                                onClick={() => onCancelBooking(row.id)}
                                className="text-xs cursor-pointer text-rose-500 focus:text-rose-500 gap-2"
                              >
                                <LockOpen className="w-3.5 h-3.5" />
                                <span>Cancel & Release</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

