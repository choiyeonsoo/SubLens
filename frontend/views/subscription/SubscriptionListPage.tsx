'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useSubscriptions } from '@/features/subscription/hooks';
import type { SubscriptionListRequest, SubscriptionResponse } from '@/features/subscription/types';
import SubscriptionCard from './SubscriptionCard';
import SubscriptionFormModal from './SubscriptionFormModal';

type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED';
type SortOption = SubscriptionListRequest['sort'];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'PAUSED', label: '일시정지' },
  { value: 'CANCELLED', label: '해지' },
];

const SORT_OPTIONS: { value: NonNullable<SortOption>; label: string }[] = [
  { value: 'created_at', label: '최근 등록순' },
  { value: 'next_billing_date', label: '갱신일순' },
  { value: 'amount', label: '금액 높은순' },
];

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-5 w-14 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export default function SubscriptionListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sort, setSort] = useState<NonNullable<SortOption>>('created_at');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubscriptionResponse | null>(null);

  const queryReq: SubscriptionListRequest = {
    status: statusFilter,
    sort,
  };
  const { data: subscriptions = [], isLoading, isError } = useSubscriptions(queryReq);

  const filtered = search.trim()
    ? subscriptions.filter((s) =>
        s.serviceName.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : subscriptions;

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (sub: SubscriptionResponse) => {
    setEditTarget(sub);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">구독 목록</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
            등록된 구독 서비스를 관리하세요
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          구독 추가
        </button>
      </div>

      {/* 필터바 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 검색 */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="서비스명 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* 상태 필터 칩 */}
          <div className="flex gap-1">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === value
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 정렬 */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NonNullable<SortOption>)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none transition-colors focus:ring-2 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 콘텐츠 */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
          <p className="text-sm text-gray-400">데이터를 불러오는 중 오류가 발생했어요.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {search ? `'${search}'에 해당하는 구독이 없어요` : '등록된 구독이 없어요'}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              첫 구독 추가하기
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* 등록/수정 모달 */}
      <SubscriptionFormModal open={modalOpen} onClose={closeModal} initial={editTarget} />
    </div>
  );
}
