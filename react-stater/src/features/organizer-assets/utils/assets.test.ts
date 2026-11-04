import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { WorkspaceAssetDto } from '../../workspaces/api/types';
import {
  calculateAssetMetrics,
  filterAssets,
  paginateAssets,
  deriveNextAssetStatusOnMaintenance
} from './assets.ts';

describe('Workspace Assets & Maintenance Business Logic', () => {
  const mockAssets: WorkspaceAssetDto[] = [
    {
      id: 1,
      workspaceId: 1,
      assetCode: 'PRJ-001',
      name: 'Máy chiếu Epson EB-X06',
      quantity: 1,
      status: 'IN_USE',
      purchasePrice: 12000000
    },
    {
      id: 2,
      workspaceId: 1,
      assetCode: 'AIR-001',
      name: 'Điều hòa Daikin Inverter 2HP',
      quantity: 2,
      status: 'UNDER_MAINTENANCE',
      purchasePrice: 18000000
    },
    {
      id: 3,
      workspaceId: 1,
      assetCode: 'MIC-001',
      name: 'Micro không dây Shure',
      quantity: 2,
      status: 'BROKEN',
      purchasePrice: 4500000
    },
    {
      id: 4,
      workspaceId: 1,
      assetCode: 'CHAIR-OLD',
      name: 'Ghế xoay văn phòng cũ',
      quantity: 10,
      status: 'RETIRED',
      purchasePrice: 1500000
    }
  ];

  test('calculates asset metrics correctly', () => {
    const metrics = calculateAssetMetrics(mockAssets);
    assert.equal(metrics.total, 4);
    assert.equal(metrics.inUse, 1);
    assert.equal(metrics.underMaintenance, 1);
    assert.equal(metrics.broken, 1);
    assert.equal(metrics.retired, 1);
  });

  test('filters assets by status accurately', () => {
    const inUse = filterAssets(mockAssets, 'IN_USE');
    assert.equal(inUse.length, 1);
    assert.equal(inUse[0].assetCode, 'PRJ-001');

    const underMaintenance = filterAssets(mockAssets, 'UNDER_MAINTENANCE');
    assert.equal(underMaintenance.length, 1);
    assert.equal(underMaintenance[0].assetCode, 'AIR-001');

    const all = filterAssets(mockAssets, 'ALL');
    assert.equal(all.length, 4);
  });

  test('searches assets by name, code or note', () => {
    const byCode = filterAssets(mockAssets, undefined, 'prj');
    assert.equal(byCode.length, 1);
    assert.equal(byCode[0].assetCode, 'PRJ-001');

    const byName = filterAssets(mockAssets, undefined, 'Điều hòa');
    assert.equal(byName.length, 1);
    assert.equal(byName[0].assetCode, 'AIR-001');

    const noMatch = filterAssets(mockAssets, undefined, 'nonexistent');
    assert.equal(noMatch.length, 0);
  });

  test('paginates assets properly', () => {
    const page1 = paginateAssets(mockAssets, 1, 2);
    assert.equal(page1.totalPages, 2);
    assert.equal(page1.currentPage, 1);
    assert.equal(page1.paginatedList.length, 2);
    assert.equal(page1.paginatedList[0].id, 1);
    assert.equal(page1.paginatedList[1].id, 2);
    assert.equal(page1.startIndex, 0);
    assert.equal(page1.endIndex, 2);

    const page2 = paginateAssets(mockAssets, 2, 2);
    assert.equal(page2.currentPage, 2);
    assert.equal(page2.paginatedList.length, 2);
    assert.equal(page2.paginatedList[0].id, 3);
    assert.equal(page2.paginatedList[1].id, 4);

    // Out of bounds page clamps safely
    const pageOver = paginateAssets(mockAssets, 99, 2);
    assert.equal(pageOver.currentPage, 2);
    assert.equal(pageOver.paginatedList.length, 2);
  });

  test('derives next asset status according to maintenance lifecycle', () => {
    assert.equal(
      deriveNextAssetStatusOnMaintenance('IN_USE', 'IN_PROGRESS'),
      'UNDER_MAINTENANCE'
    );
    assert.equal(
      deriveNextAssetStatusOnMaintenance('BROKEN', 'IN_PROGRESS'),
      'UNDER_MAINTENANCE'
    );
    assert.equal(
      deriveNextAssetStatusOnMaintenance('UNDER_MAINTENANCE', 'COMPLETED'),
      'IN_USE'
    );
    assert.equal(
      deriveNextAssetStatusOnMaintenance('UNDER_MAINTENANCE', 'CANCELLED'),
      'IN_USE'
    );
    assert.equal(
      deriveNextAssetStatusOnMaintenance('BROKEN', 'SCHEDULED'),
      'BROKEN'
    );
  });
});
