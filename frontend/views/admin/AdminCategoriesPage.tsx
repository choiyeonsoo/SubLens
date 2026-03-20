"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  useAdminCategories,
  useCreateAdminCategory,
  useDeleteAdminCategory,
  useUpdateAdminCategory,
} from "@/features/admin/hooks";
import type { AdminServiceCategory, AdminServiceCategoryRequest } from "@/features/admin/types";

interface ModalState {
  open: boolean;
  editing: AdminServiceCategory | null;
}

const EMPTY_FORM: AdminServiceCategoryRequest = { name: "", displayOrder: 0 };

export default function AdminCategoriesPage() {
  const { data: categories = [], isLoading } = useAdminCategories();
  const createMutation = useCreateAdminCategory();
  const updateMutation = useUpdateAdminCategory();
  const deleteMutation = useDeleteAdminCategory();

  const [modal, setModal] = useState<ModalState>({ open: false, editing: null });
  const [form, setForm] = useState<AdminServiceCategoryRequest>(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, editing: null });
  };

  const openEdit = (cat: AdminServiceCategory) => {
    setForm({ name: cat.name, displayOrder: cat.displayOrder });
    setModal({ open: true, editing: cat });
  };

  const closeModal = () => setModal({ open: false, editing: null });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.editing) {
      updateMutation.mutate(
        { id: modal.editing.id, req: form },
        { onSuccess: closeModal },
      );
    } else {
      createMutation.mutate(form, { onSuccess: closeModal });
    }
  };

  const handleDelete = (cat: AdminServiceCategory) => {
    if (!confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(cat.id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">카테고리 관리</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            서비스 카테고리를 추가·수정·삭제합니다.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          카테고리 추가
        </Button>
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            불러오는 중…
          </div>
        ) : categories.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            등록된 카테고리가 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  이름
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  정렬 순서
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{cat.displayOrder}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(cat)}
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
        )}
      </div>

      {/* 모달 */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              {modal.editing ? "카테고리 수정" : "카테고리 추가"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  이름
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="카테고리 이름"
                  required
                />
              </div>
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
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                  취소
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
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
