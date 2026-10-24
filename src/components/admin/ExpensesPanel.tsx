import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  Download,
  Calendar,
  Wallet,
  TrendingDown,
  DollarSign,
  AlertCircle,
  X,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { apiRequest, formatPrice, formatDateTime } from '../../lib/api';
import type { Expense } from '../../types';

interface ExpensesPanelProps {
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface ExpenseSummary {
  totalAmount: number;
  todayAmount: number;
  monthAmount: number;
  totalCount: number;
  categoryTotals?: Record<string, number>;
}

const CATEGORY_META: Record<
  string,
  { label: string; chip: string; dot: string }
> = {
  courier_shipping: {
    label: 'Courier & Delivery',
    chip: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  packaging: {
    label: 'Packaging & Boxes',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  marketing_ads: {
    label: 'Marketing & Ads',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  inventory_materials: {
    label: 'Materials & Plating',
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  rent_utilities: {
    label: 'Rent & Utilities',
    chip: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    dot: 'bg-cyan-500',
  },
  salaries: {
    label: 'Salaries & Staff',
    chip: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  repairs_maintenance: {
    label: 'Repairs & Tools',
    chip: 'bg-orange-50 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  miscellaneous: {
    label: 'Miscellaneous',
    chip: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    dot: 'bg-neutral-500',
  },
};

const PAYMENT_METHOD_META: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  easypaisa: 'EasyPaisa',
  jazzcash: 'JazzCash',
  credit_card: 'Credit / Debit Card',
};

export const ExpensesPanel: React.FC<ExpensesPanelProps> = ({ addToast }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalAmount: 0,
    todayAmount: 0,
    monthAmount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'courier_shipping',
    paymentMethod: 'cash',
    date: new Date().toISOString().slice(0, 10),
    referenceNumber: '',
    notes: '',
  });

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('limit', '100');

      const res = await apiRequest(`/api/admin/expenses?${params.toString()}`);
      if (res.success) {
        setExpenses(res.expenses || []);
        if (res.summary) {
          setSummary(res.summary);
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load expenses.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, addToast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleOpenModal = () => {
    setFormData({
      title: '',
      amount: '',
      category: 'courier_shipping',
      paymentMethod: 'cash',
      date: new Date().toISOString().slice(0, 10),
      referenceNumber: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      addToast('Please enter an expense title/description.', 'error');
      return;
    }
    const numAmount = Number(formData.amount);
    if (!numAmount || numAmount <= 0) {
      addToast('Please enter a valid amount greater than 0.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/api/admin/expenses', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title.trim(),
          amount: numAmount,
          category: formData.category,
          paymentMethod: formData.paymentMethod,
          date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
          referenceNumber: formData.referenceNumber.trim(),
          notes: formData.notes.trim(),
        }),
      });

      if (res.success && res.expense) {
        addToast(res.message || 'Expense recorded successfully!', 'success');
        // INSTANT STATE UPDATE (Zero Latency - immediately prepends to table)
        setExpenses((prev) => [res.expense, ...prev.filter((x) => x._id !== res.expense._id)]);
        setSummary((prev) => ({
          ...prev,
          totalAmount: prev.totalAmount + numAmount,
          todayAmount: prev.todayAmount + numAmount,
          monthAmount: prev.monthAmount + numAmount,
          totalCount: prev.totalCount + 1,
        }));
        setIsModalOpen(false);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to record expense.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const target = expenses.find((x) => x._id === id);
      const res = await apiRequest(`/api/admin/expenses/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        addToast(res.message || 'Expense deleted successfully.', 'success');
        // INSTANT STATE UPDATE
        setExpenses((prev) => prev.filter((x) => x._id !== id));
        if (target) {
          setSummary((prev) => ({
            ...prev,
            totalAmount: Math.max(0, prev.totalAmount - (target.amount || 0)),
            totalCount: Math.max(0, prev.totalCount - 1),
          }));
        }
        setDeleteConfirmId(null);
      }
    } catch (err: any) {
      addToast(err.message || 'Could not delete expense.', 'error');
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      addToast('No expense records to export.', 'info');
      return;
    }

    const headers = ['Date', 'Title', 'Category', 'Amount (PKR)', 'Payment Method', 'Reference #', 'Notes', 'Logged By'];
    const rows = expenses.map((exp) => [
      new Date(exp.date).toISOString().slice(0, 10),
      `"${(exp.title || '').replace(/"/g, '""')}"`,
      CATEGORY_META[exp.category]?.label || exp.category,
      exp.amount,
      PAYMENT_METHOD_META[exp.paymentMethod] || exp.paymentMethod,
      `"${(exp.referenceNumber || '').replace(/"/g, '""')}"`,
      `"${(exp.notes || '').replace(/"/g, '""')}"`,
      `"${(exp.loggedByName || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ms-velora-expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Expenses exported to CSV successfully.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Expense */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">Today's Expenses</p>
            <p className="text-2xl font-bold font-serif-luxury text-[#0D0D0D] mt-1">
              {formatPrice(summary.todayAmount || 0)}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Recorded for today</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-[#C5A059] flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* This Month's Expense */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">This Month</p>
            <p className="text-2xl font-bold font-serif-luxury text-[#0D0D0D] mt-1">
              {formatPrice(summary.monthAmount || 0)}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Current month total</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Total Recorded Outflow */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">All-Time Total</p>
            <p className="text-2xl font-bold font-serif-luxury text-[#0D0D0D] mt-1">
              {formatPrice(summary.totalAmount || 0)}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">{summary.totalCount || 0} total entries</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Total Entries Count */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">Total Records</p>
            <p className="text-2xl font-bold font-serif-luxury text-[#0D0D0D] mt-1">
              {summary.totalCount || 0}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Audited & Logged</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/[0.06] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, tracking #, note..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-[#C5A059]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400 hidden sm:block" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-[#C5A059]"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 border border-neutral-300 hover:border-black/30 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            className="px-5 py-2.5 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-wider font-bold rounded-lg inline-flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Expense</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0D0D0D] text-[#FAF8F5] uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Description & Reference</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Recorded By</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading && expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Receipt className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                    <p className="font-semibold text-neutral-700 text-sm">No expenses found</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {search || categoryFilter !== 'all'
                        ? 'No expenses match your search or filter.'
                        : 'Record your first business expense (Courier, Packaging, Ads, Materials).'}
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenModal}
                      className="mt-4 px-4 py-2 bg-[#0D0D0D] hover:bg-[#C5A059] text-white hover:text-[#0D0D0D] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Record Expense
                    </button>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const meta = CATEGORY_META[exp.category] || CATEGORY_META.miscellaneous;
                  return (
                    <tr key={exp._id} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Date */}
                      <td className="p-3.5 whitespace-nowrap font-mono-code text-neutral-600">
                        {new Date(exp.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Title & Ref */}
                      <td className="p-3.5">
                        <p className="font-semibold text-[#0D0D0D]">{exp.title}</p>
                        {exp.referenceNumber && (
                          <p className="text-[11px] font-mono-code text-neutral-500 mt-0.5">
                            Ref: {exp.referenceNumber}
                          </p>
                        )}
                        {exp.notes && (
                          <p className="text-[11px] text-neutral-400 italic mt-0.5 line-clamp-1">
                            {exp.notes}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${meta.chip}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 bg-neutral-100 rounded text-[11px] font-medium text-neutral-700">
                          {PAYMENT_METHOD_META[exp.paymentMethod] || exp.paymentMethod}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="p-3.5 whitespace-nowrap font-mono-code">
                        <span className="font-bold text-sm text-[#0D0D0D]">{formatPrice(exp.amount)}</span>
                      </td>

                      {/* Recorded By */}
                      <td className="p-3.5 whitespace-nowrap text-neutral-500">
                        {exp.loggedByName || 'Admin'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(exp._id)}
                          className="p-1.5 hover:bg-rose-50 rounded text-neutral-400 hover:text-rose-600 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0D0D0D] text-[#FAF8F5] p-5 flex items-center justify-between border-b border-[#C5A059]/30">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-[#C5A059]" />
                <h3 className="font-serif-luxury text-lg font-semibold">Record Business Expense</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TCS Courier Delivery, Velvet Jewellery Boxes, Instagram Ads"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Amount (PKR Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="2500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono-code focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:border-[#C5A059]"
                  >
                    {Object.entries(CATEGORY_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:border-[#C5A059]"
                  >
                    {Object.entries(PAYMENT_METHOD_META).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              {/* Reference # */}
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Reference # / Courier Tracking / Receipt (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TCS-892102 or INV-991"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono-code focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Notes / Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any additional notes or invoice details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 hover:bg-neutral-50 rounded-lg text-neutral-700 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#0D0D0D] hover:bg-[#C5A059] text-white hover:text-[#0D0D0D] font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-serif-luxury text-lg font-bold text-[#0D0D0D]">Delete Expense?</h4>
              <p className="text-xs text-neutral-500">
                Are you sure you want to permanently delete this expense? This action will be audited.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-50 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteExpense(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
