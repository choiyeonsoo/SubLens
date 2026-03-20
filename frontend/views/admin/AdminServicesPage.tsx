"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import Select from "@/components/ui/Select";
import ServiceLogo from "@/components/ServiceLogo";
import {
  useAdminCategories,
  useAdminServices,
  useCreateAdminService,
  useDeleteAdminService,
  useUpdateAdminService,
} from "@/features/admin/hooks";
import type {
  AdminSubscriptionService,
  AdminSubscriptionServiceRequest,
} from "@/features/admin/types";

const EMPTY_FORM: AdminSubscriptionServiceRequest = {
  name: "",
  logoDomain: "",
  websiteUrl: "",
  categoryId: "",
  displayOrder: 0,
  isActive: true,
};

interface ModalState {
  open: boolean;
  editing: AdminSubscriptionService | null;
}

export default function AdminServicesPage() {
  const { data: services = [], isLoading } = useAdminServices();
  const { data: categories = [] } = useAdminCategories();
  const createMutation = useCreateAdminService();
  const updateMutation = useUpdateAdminService();
  const deleteMutation = useDeleteAdminService();

  const [modal, setModal] = useState<ModalState>({ open: false, editing: null });
  const [form, setForm] = useState<AdminSubscriptionServiceRequest>(EMPTY_FORM);
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, editing: null });
  };

  const openEdit = (svc: AdminSubscriptionService) => {
    setForm({
      name: svc.name,
      logoDomain: svc.logoDomain,
      websiteUrl: svc.websiteUrl ?? "",
      categoryId: svc.category.id,
      displayOrder: svc.displayOrder,
      isActive: svc.isActive,
    });
    setModal({ open: true, editing: svc });
  };

  const closeModal = () => setModal({ open: false, editing: null });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const req = { ...form, websiteUrl: form.websiteUrl || undefined };
    if (modal.editing) {
      updateMutation.mutate({ id: modal.editing.id, req }, { onSuccess: closeModal });
    } else {
      createMutation.mutate(req, { onSuccess: closeModal });
    }
  };

  const handleDelete = (svc: AdminSubscriptionService) => {
    if (!confirm(`"${svc.name}" 서비스를 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(svc.id);
  };

  const categoryOptions = [
    { value: "", label: "전체 카테고리" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const modalCategoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const filtered =
    filterCategoryId === "" ? services : services.filter((s) => s.category.id === filterCategoryId);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">서비스 관리</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            구독 서비스를 추가·수정·삭제합니다.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          서비스 추가
        </Button>
      </div>

      {/* 필터 */}
      <div className="w-48">
        <Select
          value={filterCategoryId}
          onChange={setFilterCategoryId}
          options={categoryOptions}
          placeholder="전체 카테고리"
        />
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            불러오는 중…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            등록된 서비스가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    로고
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    이름
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    카테고리
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    웹사이트
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    활성
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    순서
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((svc) => (
                  <tr
                    key={svc.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <ServiceLogo name={svc.name} logoDomain={svc.logoDomain} size={32} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {svc.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {svc.category.name}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-gray-600 dark:text-gray-400">
                      {svc.websiteUrl ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          svc.isActive
                            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {svc.isActive ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {svc.displayOrder}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(svc)}>
                          <Pencil className="h-3.5 w-3.5" />
                          수정
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(svc)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 모달 */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              {modal.editing ? "서비스 수정" : "서비스 추가"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">이름</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Netflix"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Logo Domain
                </label>
                <Input
                  value={form.logoDomain}
                  onChange={(e) => setForm((f) => ({ ...f, logoDomain: e.target.value }))}
                  placeholder="netflix.com"
                  required
                />
                {form.logoDomain && (
                  <div className="flex items-center gap-2 pt-1">
                    <ServiceLogo name={form.name || "?"} logoDomain={form.logoDomain} size={32} />
                    <span className="text-xs text-gray-400">로고 미리보기</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  웹사이트 URL
                </label>
                <Input
                  value={form.websiteUrl}
                  onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="https://netflix.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  카테고리
                </label>
                <Select
                  value={form.categoryId}
                  onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                  options={modalCategoryOptions}
                  placeholder="카테고리 선택"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    정렬 순서
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={form.displayOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, displayOrder: Number(e.target.value) }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    활성 여부
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                    className={`flex h-8 w-full items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                      form.isActive
                        ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                        : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {form.isActive ? "활성" : "비활성"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={closeModal}>
                  취소
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={isPending || !form.categoryId}>
                  {isPending ? "저장 중…" : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
