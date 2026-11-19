import { apiClient } from '@/lib/api-client';
import type {
  RefundRequestResponseDto,
  RefundKpisDto,
  ApproveRefundRequestDto,
  RejectRefundRequestDto,
  RefundFilterParams,
  PageResponse
} from './types';

export const adminRefundService = {
  getRefunds: async (params?: RefundFilterParams): Promise<PageResponse<RefundRequestResponseDto>> => {
    return apiClient.get<PageResponse<RefundRequestResponseDto>>('/admin/refunds', {
      params: {
        status: params?.status && params.status !== 'all' ? params.status.toUpperCase() : undefined,
        workspaceId: params?.workspaceId,
        search: params?.search || undefined,
        page: params?.page ?? 1,
        size: params?.size ?? 10,
        sortBy: params?.sortBy,
        sortDir: params?.sortDir
      }
    });
  },

  getKpis: async (): Promise<RefundKpisDto> => {
    return apiClient.get<RefundKpisDto>('/admin/refunds/kpis');
  },

  getRefundDetails: async (id: number): Promise<RefundRequestResponseDto> => {
    return apiClient.get<RefundRequestResponseDto>(`/admin/refunds/${id}`);
  },

  approveRefund: async (id: number, data?: ApproveRefundRequestDto): Promise<RefundRequestResponseDto> => {
    return apiClient.post<RefundRequestResponseDto>(`/admin/refunds/${id}/approve`, data);
  },

  rejectRefund: async (id: number, data: RejectRefundRequestDto): Promise<RefundRequestResponseDto> => {
    return apiClient.post<RefundRequestResponseDto>(`/admin/refunds/${id}/reject`, data);
  }
};
