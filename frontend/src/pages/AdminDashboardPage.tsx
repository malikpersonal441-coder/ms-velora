import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { InstallAppButton } from '../components/AppActions';
import {
  LayoutDashboard,
  Gem,
  Boxes,
  ShoppingBag,
  Users,
  Layers,
  Image as ImageIcon,
  Ticket,
  BarChart3,
  Settings,
  ShieldAlert,
  Plus,
  Search,
  Edit3,
  Trash2,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Upload,
  X,
  ArrowUpRight,
  MessageCircle,
  KeyRound,
  Menu,
  Megaphone,
  Printer,
  LogOut,
} from 'lucide-react';
import { WhatsAppCenter } from '../components/admin/WhatsAppCenter';
import { ChangePasswordPanel } from '../components/admin/ChangePasswordPanel';
import { NewOrderNotifier } from '../components/admin/NewOrderNotifier';
import { AdminLoginPage } from './AdminLoginPage';
import { WhatsAppComposer } from '../components/admin/WhatsAppComposer';
import { suggestedTemplate } from '../lib/whatsapp';
import { compressImage, formatBytes, type CompressResult } from '../lib/compressImage';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatPrice, formatDateTime } from '../lib/api';
import { Product, Order, Coupon, Category, Collection } from '../types';

// Order list display helpers
const ORDER_STATUS_STYLE: Record<string, { label: string; chip: string; dot: string }> = {
  pending: { label: 'New', chip: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', chip: 'bg-sky-50 text-sky-800', dot: 'bg-sky-500' },
  processing: { label: 'Preparing', chip: 'bg-violet-50 text-violet-800', dot: 'bg-violet-500' },
  shipped: { label: 'Shipped', chip: 'bg-indigo-50 text-indigo-800', dot: 'bg-indigo-500' },
  delivered: { label: 'Delivered', chip: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', chip: 'bg-neutral-100 text-neutral-600', dot: 'bg-neutral-400' },
  refunded: { label: 'Refunded', chip: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  online_card: 'Card',
  online: 'Online (JazzCash / EasyPaisa)',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
};

type AdminTab =
  | 'overview'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'whatsapp'
  | 'security'
  | 'customers'
  | 'catalog'
  | 'homepage'
  | 'coupons'
  | 'reports_settings';

export const AdminDashboardPage: React.FC = () => {
  const { user, authLoading, addToast, refreshStorefront, settings: publicSettings, logout } = useStore();
  const [waOrder, setWaOrder] = useState<Order | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [slipIds, setSlipIds] = useState<string[]>([]);
  const openSlips = (ids: string[]) => ids.length && window.open(`/admin/slips?ids=${ids.join(',')}`, '_blank');
  const [compressPhotos, setCompressPhotos] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<{
    phase: 'compressing' | 'uploading' | 'done';
    result?: CompressResult;
  } | null>(null);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);

  // Overview state
  const [overview, setOverview] = useState<any>(null);

  // Products state
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Inventory state
  const [inventoryList, setInventoryList] = useState<Product[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'addition' | 'reduction' | 'set_exact'>('addition');
  const [adjustQty, setAdjustQty] = useState(5);
  const [adjustReason, setAdjustReason] = useState('');

  // Orders state
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderNextFulfillment, setOrderNextFulfillment] = useState('');
  const [orderNextPayment, setOrderNextPayment] = useState('');
  const [orderCourier, setOrderCourier] = useState('');
  const [orderTracking, setOrderTracking] = useState('');
  const [orderNote, setOrderNote] = useState('');

  // Customers state
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Categories & Collections state
  const [adminCategories, setAdminCategories] = useState<Category[]>([]);
  const [adminCollections, setAdminCollections] = useState<Collection[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newColName, setNewColName] = useState('');
  const [newColSubtitle, setNewColSubtitle] = useState('');
  const [newColImage, setNewColImage] = useState('');

  // Homepage CMS state
  const [cmsHomepage, setCmsHomepage] = useState<any>(null);

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState(20000);
  const [newCouponExpiry, setNewCouponExpiry] = useState('2027-12-31');

  // Reports, Settings & Audit Logs state
  const [reportsData, setReportsData] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    document.title = 'Admin Executive Console';
  }, []);

  const loadTabContent = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    try {
      setLoading(true);
      if (activeTab === 'overview') {
        const res = await apiRequest('/api/admin/overview');
        if (res.success) setOverview(res);
      } else if (activeTab === 'products') {
        const [prodRes, catRes, colRes] = await Promise.all([
          apiRequest(
            `/api/admin/products?q=${encodeURIComponent(productSearch)}&status=${productStatusFilter}&limit=50`
          ),
          apiRequest('/api/admin/categories'),
          apiRequest('/api/admin/collections'),
        ]);
        if (prodRes.success) setAdminProducts(prodRes.products || []);
        if (catRes.success) setAdminCategories(catRes.categories || []);
        if (colRes.success) setAdminCollections(colRes.collections || []);
      } else if (activeTab === 'inventory') {
        const res = await apiRequest(`/api/admin/inventory?status=${inventoryFilter}`);
        if (res.success) {
          setInventoryList(res.inventory || []);
          setStockMovements(res.movements || []);
        }
      } else if (activeTab === 'orders') {
        const res = await apiRequest(
          `/api/admin/orders?q=${encodeURIComponent(orderSearch)}&fulfillmentStatus=${orderStatusFilter}&limit=50`
        );
        if (res.success) setAdminOrders(res.orders || []);
      } else if (activeTab === 'customers') {
        const res = await apiRequest(
          `/api/admin/customers?q=${encodeURIComponent(customerSearch)}`
        );
        if (res.success) setCustomers(res.customers || []);
      } else if (activeTab === 'catalog') {
        const [catRes, colRes] = await Promise.all([
          apiRequest('/api/admin/categories'),
          apiRequest('/api/admin/collections'),
        ]);
        if (catRes.success) setAdminCategories(catRes.categories || []);
        if (colRes.success) setAdminCollections(colRes.collections || []);
      } else if (activeTab === 'homepage') {
        const res = await apiRequest('/api/admin/homepage');
        if (res.success) setCmsHomepage(res.homepage);
      } else if (activeTab === 'coupons') {
        const res = await apiRequest('/api/admin/coupons');
        if (res.success) setCoupons(res.coupons || []);
      } else if (activeTab === 'reports_settings') {
        const [repRes, setRes, logRes] = await Promise.all([
          apiRequest('/api/admin/reports'),
          apiRequest('/api/admin/settings'),
          apiRequest('/api/admin/audit-logs'),
        ]);
        if (repRes.success) setReportsData(repRes);
        if (setRes.success) setStoreSettings(setRes.settings);
        if (logRes.success) setAuditLogs(logRes.logs || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load admin data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    user,
    activeTab,
    productSearch,
    productStatusFilter,
    inventoryFilter,
    orderSearch,
    orderStatusFilter,
    customerSearch,
    addToast,
  ]);

  useEffect(() => {
    loadTabContent();
  }, [loadTabContent]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-[#FAF8F5] flex items-center justify-center text-xs uppercase tracking-widest">
        Verifying Administrator Credentials...
      </div>
    );
  }

  // /admin is the single entry point: signed-out visitors see the sign-in form here
  if (!user || user.role !== 'admin') {
    return <AdminLoginPage />;
  }

  // Handlers
  const openCreateProductModal = () => {
    setEditingProduct({
      name: '',
      brand: 'MS Velora',
      model: '',
      sku: '',
      gender: 'Women',
      price: 0,
      salePrice: null,
      costPrice: 0,
      stock: 10,
      lowStockThreshold: 5,
      shortDescription: '',
      description: '',
      mainImage:
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85',
      status: 'published',
      featured: false,
      bestSeller: false,
      newArrival: true,
      specifications: {
        movement: 'Necklace',
        caseMaterial: 'Gold Plated Brass',
        caseDiameter: 'Adjustable',
        caseThickness: 'Lightweight',
        strapMaterial: 'High Polish',
        strapWidth: 'Lobster Clasp',
        dialColor: 'Gold',
        crystal: 'Cubic Zirconia',
        waterResistance: 'Keep away from water & perfume',
        warranty: 'Plating Warranty',
        origin: 'Pakistan',
      },
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const isEdit = Boolean(editingProduct._id);
      const endpoint = isEdit
        ? `/api/admin/products/${editingProduct._id}`
        : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...editingProduct,
        price: Number(editingProduct.price),
        salePrice:
          editingProduct.salePrice !== null &&
          editingProduct.salePrice !== undefined &&
          Number(editingProduct.salePrice) > 0
            ? Number(editingProduct.salePrice)
            : null,
        costPrice: Number(editingProduct.costPrice || 0),
        stock: Number(editingProduct.stock || 0),
        lowStockThreshold: Number(editingProduct.lowStockThreshold || 5),
        category:
          typeof editingProduct.category === 'object' && editingProduct.category
            ? (editingProduct.category as Category)._id
            : editingProduct.category || null,
      };

      const res = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      if (res.success) {
        addToast(res.message, 'success');
        setIsProductModalOpen(false);
        setEditingProduct(null);
        await loadTabContent();
        await refreshStorefront();
      }
    } catch (err: any) {
      addToast(err.message || 'Could not save product.', 'error');
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!original) return;
    setUploadStatus({ phase: 'compressing' });
    try {
      // Compress in the browser first: faster uploads, lighter pages, EXIF/GPS stripped
      const result = compressPhotos
        ? await compressImage(original, { maxDimension: 1600, quality: 0.82 })
        : { file: original, originalBytes: original.size, compressedBytes: original.size, width: 0, height: 0, compressed: false };

      if (result.file.size > 5 * 1024 * 1024) {
        throw new Error(`Image is ${formatBytes(result.file.size)} — the limit is 5 MB. Turn on compression or choose a smaller photo.`);
      }

      setUploadStatus({ phase: 'uploading', result });
      const formData = new FormData();
      formData.append('image', result.file);
      const res = await apiRequest('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.success && res.url) {
        setEditingProduct((prev) => (prev ? { ...prev, mainImage: res.url } : prev));
        setUploadStatus({ phase: 'done', result });
        addToast(
          result.compressed
            ? `Photo compressed ${formatBytes(result.originalBytes)} → ${formatBytes(result.compressedBytes)} and uploaded.`
            : 'Image uploaded successfully.',
          'success'
        );
      }
    } catch (err: any) {
      setUploadStatus(null);
      addToast(err.message || 'Image upload failed.', 'error');
    }
  };

  const handleBulkAction = async (action: 'publish' | 'draft' | 'archive' | 'delete') => {
    if (selectedProductIds.length === 0) return;
    try {
      const res = await apiRequest('/api/admin/products/bulk', {
        method: 'POST',
        body: JSON.stringify({ productIds: selectedProductIds, action }),
      });
      if (res.success) {
        addToast(res.message, 'success');
        setSelectedProductIds([]);
        await loadTabContent();
        await refreshStorefront();
      }
    } catch (err: any) {
      addToast(err.message || 'Bulk action failed.', 'error');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;
    try {
      const res = await apiRequest('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: adjustModalProduct._id,
          adjustmentType: adjustType,
          quantity: Number(adjustQty),
          reason: adjustReason.trim(),
        }),
      });
      if (res.success) {
        addToast(res.message, 'success');
        setAdjustModalProduct(null);
        setAdjustReason('');
        await loadTabContent();
        await refreshStorefront();
      }
    } catch (err: any) {
      addToast(err.message || 'Stock adjustment failed.', 'error');
    }
  };

  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const res = await apiRequest(`/api/admin/orders/${selectedOrder._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          fulfillmentStatus: orderNextFulfillment,
          paymentStatus: orderNextPayment,
          courierName: orderCourier || 'Leopards',
          trackingNumber: orderTracking,
          note: orderNote || undefined,
        }),
      });
      if (res.success) {
        addToast(res.message, 'success');
        setSelectedOrder(res.order);
        setOrderNote('');
        await loadTabContent();
        // Status changed: offer the matching customer message right away
        if (
          res.order.fulfillmentStatus !== selectedOrder.fulfillmentStatus ||
          (res.order.paymentStatus === 'paid' && selectedOrder.paymentStatus !== 'paid')
        ) {
          setWaOrder(res.order);
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Could not update order.', 'error');
    }
  };

  const handleToggleCustomerStatus = async (customerId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await apiRequest(`/api/admin/customers/${customerId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.success) {
        addToast(res.message, 'info');
        await loadTabContent();
      }
    } catch (err: any) {
      addToast(err.message || 'Could not update customer status.', 'error');
    }
  };

  const handleSaveHomepageCms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/admin/homepage', {
        method: 'PUT',
        body: JSON.stringify(cmsHomepage),
      });
      if (res.success) {
        addToast(res.message, 'success');
        await refreshStorefront();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to update homepage.', 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: newCouponCode,
          discountType: newCouponType,
          discountValue: Number(newCouponValue),
          minOrderAmount: Number(newCouponMinOrder),
          expiryDate: newCouponExpiry,
          isActive: true,
        }),
      });
      if (res.success) {
        addToast(res.message, 'success');
        setNewCouponCode('');
        await loadTabContent();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to create coupon.', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(storeSettings),
      });
      if (res.success) {
        addToast(res.message, 'success');
        await refreshStorefront();
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to save settings.', 'error');
    }
  };

  const NAV_ITEMS: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Gem },
    { id: 'inventory', label: 'Stock', icon: Boxes },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'security', label: 'Change Password', icon: KeyRound },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'catalog', label: 'Categories', icon: Layers },
    { id: 'homepage', label: 'Homepage', icon: ImageIcon },
    { id: 'coupons', label: 'Discount Codes', icon: Ticket },
    { id: 'reports_settings', label: 'Reports & Settings', icon: BarChart3 },
  ];

  const NAV_GROUPS: { label: string; ids: AdminTab[] }[] = [
    { label: 'Dashboard', ids: ['overview'] },
    { label: 'Catalogue', ids: ['products', 'inventory', 'catalog'] },
    { label: 'Sales', ids: ['orders', 'whatsapp', 'customers', 'coupons'] },
    { label: 'Store', ids: ['homepage', 'reports_settings', 'security'] },
  ];

  const activeItem = NAV_ITEMS.find((i) => i.id === activeTab);
  const initials = user.name
    .replace(/\(.*\)/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const goTo = (id: AdminTab) => {
    setActiveTab(id);
    if (id === 'orders') setNewOrderCount(0);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="admin-ui min-h-screen bg-[#F5F3EE] text-[#0D0D0D] lg:flex">
      {/* Mobile drawer backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          mobileNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden
      />

      {/* Sidebar: off-canvas drawer on mobile, sticky rail on desktop */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[272px] shrink-0 bg-[#0B0B0D] text-[#FAF8F5] flex flex-col border-r border-white/5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Admin navigation"
      >
        <div className="h-[72px] px-5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/brand/logo.jpg" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="font-serif-luxury text-lg font-semibold truncate">MS Velora</p>
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#C5A059]">Admin Console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.22em] text-white/30 font-semibold">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.ids.map((id) => {
                  const item = NAV_ITEMS.find((n) => n.id === id)!;
                  const Icon = item.icon;
                  const active = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => goTo(id)}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                        active
                          ? 'bg-gradient-to-r from-[#C5A059]/20 to-transparent text-[#F4DFA8]'
                          : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[#C5A059] transition-all duration-300 ${
                          active ? 'h-6 opacity-100' : 'h-0 opacity-0'
                        }`}
                      />
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#C5A059]' : 'text-white/45 group-hover:text-white/80'}`} />
                      <span className="truncate">{item.label}</span>
                      {id === 'orders' && newOrderCount > 0 && (
                        <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-[#C5A059] text-[#0D0D0D] text-[10px] font-bold flex items-center justify-center badge-pop">
                          {newOrderCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
          <InstallAppButton
            label="Install Admin App"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-[#DFBD78] hover:text-[#F4DFA8] hover:bg-[#C5A059]/10 transition-colors"
          />
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <ExternalLink className="w-[18px] h-[18px] text-white/45" />
            View Storefront
          </Link>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03]">
            <span className="w-9 h-9 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#DFBD78] text-xs font-bold flex items-center justify-center shrink-0">
              {initials}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[13px] font-semibold truncate">{user.name.replace(/\s*\(.*\)/, '')}</p>
              <p className="text-[11px] text-white/40 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/admin', { replace: true });
              }}
              className="p-2 rounded-lg text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky glass top bar */}
        <header className="sticky top-0 z-30 h-[72px] bg-[#F5F3EE]/85 backdrop-blur-xl border-b border-black/[0.06]">
          <div className="h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden -ml-1 p-2 rounded-lg hover:bg-black/5"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="hidden sm:block text-[11px] text-neutral-500">
                Admin <span className="mx-1 text-neutral-300">/</span>{' '}
                <span className="text-neutral-700">{activeItem?.label}</span>
              </p>
              <h1 className="font-serif-luxury text-xl sm:text-2xl font-semibold truncate leading-tight">
                {activeItem?.label}
              </h1>
            </div>
            <NewOrderNotifier
              onNewCount={setNewOrderCount}
              onOpenOrder={(o) => {
                setNewOrderCount(0);
                setActiveTab('orders');
                setSelectedOrder(o);
                setOrderNextFulfillment(o.fulfillmentStatus);
                setOrderNextPayment(o.paymentStatus);
                setOrderCourier(o.courierName || 'Leopards');
                setOrderTracking(o.trackingNumber || '');
                setOrderNote('');
              }}
            />
            <button
              type="button"
              onClick={loadTabContent}
              className="inline-flex items-center gap-2 h-10 px-3 sm:px-4 rounded-lg bg-white border border-black/10 hover:border-[#C5A059] hover:text-[#9E7B36] text-xs font-semibold transition-colors shadow-sm"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <span
              className="hidden sm:flex w-10 h-10 rounded-full bg-[#0D0D0D] text-[#DFBD78] text-xs font-bold items-center justify-center"
              title={user.email}
            >
              {initials}
            </span>
          </div>
        </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* ======================================= */}
        {/* 1. OVERVIEW TAB */}
        {/* ======================================= */}
        {activeTab === 'overview' && overview && (() => {
          const m = overview.metrics || {};
          const sc = overview.statusCounts || {};
          const rs = (n: number) => formatPrice(n || 0);
          const hour = new Date().getHours();
          const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
          const ownerName = user.name.replace(/\s*\(.*\)/, '');
          const pipeline = [
            { key: 'pending', label: 'New', color: 'bg-amber-500' },
            { key: 'confirmed', label: 'Confirmed', color: 'bg-sky-500' },
            { key: 'processing', label: 'Preparing', color: 'bg-violet-500' },
            { key: 'shipped', label: 'Shipped', color: 'bg-indigo-500' },
            { key: 'delivered', label: 'Delivered', color: 'bg-emerald-500' },
            { key: 'cancelled', label: 'Cancelled', color: 'bg-neutral-400' },
          ];
          const pipelineTotal = pipeline.reduce((n, p) => n + (sc[p.key] || 0), 0) || 1;
          const go = (tab: AdminTab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          };
          return (
            <div className="space-y-6">
              {/* Welcome banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFFDF8] via-[#FAF5EA] to-[#F3EBDA] text-[#0D0D0D] p-6 sm:p-8 border border-[#C5A059]/25">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,rgba(197,160,89,0.16),transparent_55%)]" />
                <div className="absolute inset-3 border border-[#C5A059]/25 rounded-xl pointer-events-none" />
                <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-[#9E7B36] font-semibold">
                      {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <h2 className="mt-2 font-serif-luxury text-3xl sm:text-4xl">
                      {greeting}, <span className="italic text-[#9E7B36]">{ownerName}</span>
                    </h2>
                    <p className="mt-1 text-sm text-neutral-600">
                      {(sc.pending || 0) > 0
                        ? `${sc.pending} new order${sc.pending > 1 ? 's are' : ' is'} waiting for your approval.`
                        : 'All orders are up to date.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-[#C5A059]/20 rounded-xl overflow-hidden min-w-[280px] shadow-[0_8px_24px_-14px_rgba(158,123,54,0.45)]">
                    <div className="bg-white p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-semibold">Today</p>
                      <p className="mt-1 font-serif-luxury text-2xl font-semibold text-[#0D0D0D] tabular-nums">{rs(m.todaySales)}</p>
                      <p className="text-[11px] text-neutral-500">{m.todayOrders || 0} order{m.todayOrders === 1 ? '' : 's'}</p>
                    </div>
                    <div className="bg-white p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-semibold">This month</p>
                      <p className="mt-1 font-serif-luxury text-2xl font-semibold text-[#0D0D0D] tabular-nums">{rs(m.monthSales)}</p>
                      <p className="text-[11px] text-neutral-500">{m.monthOrders || 0} order{m.monthOrders === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key numbers */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Orders', value: m.totalOrders ?? 0, sub: `${m.whatsappOrders || 0} via WhatsApp`, icon: ShoppingBag, tab: 'orders' as AdminTab },
                  { label: 'Money Received', value: rs(m.paidRevenue), sub: `Not paid yet: ${rs(m.pendingRevenue)}`, icon: BarChart3, tab: 'reports_settings' as AdminTab },
                  { label: 'Average Order', value: rs(m.averageOrderValue), sub: `${m.unitsSold || 0} pieces sold`, icon: Gem, tab: 'orders' as AdminTab },
                  { label: 'Customers', value: m.totalCustomers ?? 0, sub: `${m.pushSubscribers || 0} get new-arrival alerts`, icon: Users, tab: 'customers' as AdminTab },
                  { label: 'Waiting Approval', value: sc.pending || 0, sub: 'New orders to confirm', icon: CheckCircle2, tab: 'orders' as AdminTab, accent: (sc.pending || 0) > 0 },
                  { label: 'To Ship', value: (sc.confirmed || 0) + (sc.processing || 0), sub: 'Confirmed & preparing', icon: Boxes, tab: 'orders' as AdminTab },
                  { label: 'Jewellery in Store', value: m.totalProducts ?? 0, sub: 'Published & drafts', icon: Layers, tab: 'products' as AdminTab },
                  { label: 'Stock Warnings', value: `${m.lowStockCount || 0} / ${m.outOfStockCount || 0}`, sub: 'Running low / sold out', icon: AlertTriangle, tab: 'inventory' as AdminTab, warn: (m.lowStockCount || 0) + (m.outOfStockCount || 0) > 0 },
                ].map((k) => {
                  const Icon = k.icon;
                  return (
                    <button
                      key={k.label}
                      type="button"
                      onClick={() => go(k.tab)}
                      className={`group text-left bg-white rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(13,13,13,0.35)] ${
                        k.accent ? 'border-amber-300' : k.warn ? 'border-red-200' : 'border-black/[0.06] hover:border-[#C5A059]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-neutral-500">{k.label}</p>
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.warn ? 'bg-red-50 text-red-600' : k.accent ? 'bg-amber-50 text-amber-700' : 'bg-[#F5F0E4] text-[#9E7B36]'}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                      </div>
                      <p className="mt-2 font-serif-luxury text-[28px] leading-none font-semibold text-[#0D0D0D] tabular-nums">{k.value}</p>
                      <p className="mt-2 text-[11px] text-neutral-500">{k.sub}</p>
                    </button>
                  );
                })}
              </div>

              {/* Order pipeline */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif-luxury text-2xl font-semibold">Orders at a glance</h3>
                  <button type="button" onClick={() => go('orders')} className="link-underline text-[11px] uppercase tracking-[0.2em] font-semibold text-[#9E7B36]">
                    All orders →
                  </button>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-neutral-100">
                  {pipeline.map((p) =>
                    (sc[p.key] || 0) > 0 ? (
                      <span key={p.key} className={p.color} style={{ width: `${((sc[p.key] || 0) / pipelineTotal) * 100}%` }} title={`${p.label}: ${sc[p.key]}`} />
                    ) : null
                  )}
                </div>
                <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {pipeline.map((p) => (
                    <div key={p.key} className="rounded-xl bg-[#FAF8F5] border border-black/[0.04] p-3">
                      <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                        <span className={`w-2 h-2 rounded-full ${p.color}`} /> {p.label}
                      </p>
                      <p className="mt-1 font-serif-luxury text-2xl font-semibold tabular-nums">{sc[p.key] || 0}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Recent orders */}
                <div className="xl:col-span-3 bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between px-6 pt-6 pb-3">
                    <h3 className="font-serif-luxury text-2xl font-semibold">Latest Orders</h3>
                    <button type="button" onClick={() => go('orders')} className="link-underline text-[11px] uppercase tracking-[0.2em] font-semibold text-[#9E7B36]">
                      View all →
                    </button>
                  </div>
                  {(overview.recentOrders || []).length === 0 ? (
                    <p className="px-6 pb-8 text-sm text-neutral-500">No orders yet.</p>
                  ) : (
                    <ul className="divide-y divide-black/5">
                      {(overview.recentOrders || []).slice(0, 6).map((o: Order) => {
                        const st = ORDER_STATUS_STYLE[o.fulfillmentStatus] || ORDER_STATUS_STYLE.pending;
                        return (
                          <li key={o._id}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('orders');
                                setSelectedOrder(o);
                                setOrderNextFulfillment(o.fulfillmentStatus);
                                setOrderNextPayment(o.paymentStatus);
                                setOrderCourier(o.courierName || 'Leopards');
                                setOrderTracking(o.trackingNumber || '');
                                setOrderNote('');
                              }}
                              className="w-full text-left flex items-center gap-3 px-6 py-3 hover:bg-[#FAF8F5] transition-colors"
                            >
                              <span className="w-9 h-9 shrink-0 rounded-full bg-[#F3EFE6] text-[#9E7B36] text-[11px] font-bold flex items-center justify-center">
                                {o.shippingAddress.fullName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-semibold truncate">{o.shippingAddress.fullName}</span>
                                <span className="block text-[11px] text-neutral-500 truncate">
                                  {o.orderNumber} • {o.shippingAddress.city} • {new Date(o.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                </span>
                              </span>
                              <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.chip}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {st.label}
                              </span>
                              <span className="w-24 text-right text-[13px] font-semibold tabular-nums">{rs(o.totalAmount)}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Right column: quick actions + best sellers + stock */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
                    <h3 className="font-serif-luxury text-2xl font-semibold mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { label: 'Add Jewellery', icon: Plus, onClick: () => { go('products'); openCreateProductModal(); } },
                        { label: 'Approve Orders', icon: CheckCircle2, onClick: () => go('orders') },
                        { label: 'WhatsApp', icon: MessageCircle, onClick: () => go('whatsapp') },
                        { label: 'Discount Code', icon: Ticket, onClick: () => go('coupons') },
                      ].map((a) => {
                        const Icon = a.icon;
                        return (
                          <button
                            key={a.label}
                            type="button"
                            onClick={a.onClick}
                            className="flex items-center gap-2.5 p-3 rounded-xl border border-black/[0.06] bg-[#FAF8F5] hover:border-[#C5A059] hover:bg-[#C5A059]/5 text-[13px] font-semibold transition-colors"
                          >
                            <Icon className="w-4 h-4 text-[#9E7B36]" /> {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
                    <h3 className="font-serif-luxury text-2xl font-semibold mb-4">Best-Selling Jewellery</h3>
                    <ol className="space-y-3">
                      {(overview.bestSellingProducts || []).slice(0, 5).map((p: Product, i: number) => (
                        <li key={p._id} className="flex items-center gap-3">
                          <span className="w-5 text-center font-serif-luxury text-lg text-[#C5A059]">{i + 1}</span>
                          <img src={p.mainImage} alt="" className="w-10 h-10 rounded-lg object-cover bg-[#F3EFE6]" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold truncate">{p.name}</span>
                            <span className="block text-[11px] text-neutral-500">{p.soldCount || 0} sold • {p.stock} in stock</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {((overview.inventoryAlerts?.lowStock || []).length + (overview.inventoryAlerts?.outOfStock || []).length) > 0 && (
                    <div className="bg-white rounded-2xl border border-red-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-serif-luxury text-2xl font-semibold flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600" /> Running Low or Sold Out
                        </h3>
                      </div>
                      <ul className="space-y-2.5">
                        {[...(overview.inventoryAlerts?.outOfStock || []), ...(overview.inventoryAlerts?.lowStock || [])].slice(0, 6).map((p: Product) => (
                          <li key={p._id} className="flex items-center gap-3">
                            <img src={p.mainImage} alt="" className="w-9 h-9 rounded-lg object-cover bg-[#F3EFE6]" />
                            <span className="min-w-0 flex-1 text-[13px] font-medium truncate">{p.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${p.stock === 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                              {p.stock === 0 ? 'Sold out' : `${p.stock} left`}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <button type="button" onClick={() => go('inventory')} className="mt-4 w-full py-2.5 rounded-xl border border-black/10 hover:border-[#0D0D0D] text-[12px] font-semibold transition-colors">
                        Update Stock
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ======================================= */}
        {/* 2. PRODUCTS MANAGEMENT TAB */}
        {/* ======================================= */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-black/8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search name or brand..."
                    className="pl-9 pr-4 py-2 text-xs border border-neutral-300 rounded-lg w-64"
                  />
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                <select
                  value={productStatusFilter}
                  onChange={(e) => setProductStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>

                {selectedProductIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkAction('publish')}
                      className="px-3 py-1.5 bg-emerald-700 text-white text-xs rounded font-semibold"
                    >
                      Publish ({selectedProductIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('draft')}
                      className="px-3 py-1.5 bg-neutral-700 text-white text-xs rounded font-semibold"
                    >
                      Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('archive')}
                      className="px-3 py-1.5 bg-amber-700 text-white text-xs rounded font-semibold"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={openCreateProductModal}
                className="px-5 py-2.5 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-wider font-bold rounded-lg inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Jewellery</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-black/8 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0D0D0D] text-[#FAF8F5] uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">
                      <input
                        type="checkbox"
                        checked={
                          adminProducts.length > 0 &&
                          selectedProductIds.length === adminProducts.length
                        }
                        onChange={(e) =>
                          setSelectedProductIds(
                            e.target.checked ? adminProducts.map((p) => p._id) : []
                          )
                        }
                      />
                    </th>
                    <th className="p-3.5">Item</th>
                    <th className="p-3.5">Code / Brand</th>
                    <th className="p-3.5">Price / Sale</th>
                    <th className="p-3.5">Stock</th>
                    <th className="p-3.5">Status & Badges</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {adminProducts.map((prod) => (
                    <tr key={prod._id} className="hover:bg-[#FAF8F5]">
                      <td className="p-3.5">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(prod._id)}
                          onChange={(e) =>
                            setSelectedProductIds((prev) =>
                              e.target.checked
                                ? [...prev, prod._id]
                                : prev.filter((id) => id !== prod._id)
                            )
                          }
                        />
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.mainImage}
                            alt={prod.name}
                            className="w-12 h-12 rounded object-cover bg-[#F3EFE6]"
                          />
                          <div>
                            <p className="font-serif-luxury text-base font-bold text-[#0D0D0D]">
                              {prod.name}
                            </p>
                            <p className="text-neutral-400">
                              {prod.specifications?.movement} • {prod.specifications?.caseMaterial}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono-code">
                        <span className="font-bold block text-[#0D0D0D]">{prod.sku}</span>
                        <span className="text-neutral-500">{prod.brand}</span>
                      </td>
                      <td className="p-3.5 font-mono-code">
                        <span className="font-bold block">{formatPrice(prod.price)}</span>
                        {prod.salePrice && (
                          <span className="text-emerald-700 font-semibold">
                            Sale: {formatPrice(prod.salePrice)}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono-code">
                        <span
                          className={`inline-flex whitespace-nowrap px-2.5 py-1 rounded-full font-semibold ${
                            prod.stock === 0
                              ? 'bg-red-100 text-red-800'
                              : prod.stock <= prod.lowStockThreshold
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {prod.stock} units
                        </span>
                      </td>
                      <td className="p-3.5 space-x-1">
                        <span
                          className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold ${
                            prod.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : prod.status === 'draft'
                              ? 'bg-neutral-200 text-neutral-700'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {prod.status}
                        </span>
                        {prod.bestSeller && (
                          <span className="px-2 py-0.5 rounded bg-[#0D0D0D] text-[#C5A059] text-[10px]">
                            Best Seller
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <Link
                          to={`/product/${prod.slug}`}
                          target="_blank"
                          className="inline-flex p-1.5 text-neutral-500 hover:text-[#0D0D0D]"
                          title="Preview on Storefront"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(prod);
                            setIsProductModalOpen(true);
                          }}
                          className="inline-flex p-1.5 text-neutral-600 hover:text-[#9E7B36]"
                          title="Edit item"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {prod.status === 'published' && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Send a "New arrival: ${prod.name}" notification to all subscribed customers?`)) return;
                              try {
                                const res = await apiRequest(`/api/admin/push/new-arrival/${prod._id}`, { method: 'POST' });
                                addToast(res.sent ? `Announced to ${res.sent} customer device(s).` : 'No customers have turned on notifications yet.', res.sent ? 'success' : 'info');
                              } catch (err: any) {
                                addToast(err.message || 'Could not send the announcement.', 'error');
                              }
                            }}
                            className="inline-flex p-1.5 text-neutral-600 hover:text-[#9E7B36]"
                            title="Announce to customers (push notification)"
                          >
                            <Megaphone className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await apiRequest(`/api/admin/products/${prod._id}`, {
                              method: 'DELETE',
                            });
                            addToast('Product archived.', 'info');
                            loadTabContent();
                          }}
                          className="inline-flex p-1.5 text-neutral-400 hover:text-red-600"
                          title="Archive item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* 3. INVENTORY & STOCK MOVEMENTS TAB */}
        {/* ======================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-black/8">
              <div className="flex items-center gap-2">
                {['all', 'low_stock', 'out_of_stock', 'in_stock'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setInventoryFilter(st)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider ${
                      inventoryFilter === st
                        ? 'bg-[#0D0D0D] text-[#C5A059]'
                        : 'bg-[#FAF8F5] text-neutral-600'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <a
                href="/api/admin/reports/export/inventory"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold rounded-lg"
              >
                <Download className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Export Inventory CSV</span>
              </a>
            </div>

            <div className="bg-white rounded-xl border border-black/8 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0D0D0D] text-[#FAF8F5] uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5">Item</th>
                    <th className="p-3.5">Available Stock</th>
                    <th className="p-3.5">Low-Stock Threshold</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Manual Adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {inventoryList.map((item) => (
                    <tr key={item._id} className="hover:bg-[#FAF8F5]">
                      <td className="p-3.5 font-mono-code font-bold">{item.sku}</td>
                      <td className="p-3.5 font-medium text-[#0D0D0D]">{item.name}</td>
                      <td className="p-3.5 font-mono-code font-bold text-sm">{item.stock}</td>
                      <td className="p-3.5 font-mono-code text-neutral-500">
                        {item.lowStockThreshold}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                            item.stock === 0
                              ? 'bg-red-100 text-red-800'
                              : item.stock <= item.lowStockThreshold
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.stock === 0
                            ? 'Out of Stock'
                            : item.stock <= item.lowStockThreshold
                            ? 'Low Stock'
                            : 'In Stock'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustModalProduct(item);
                            setAdjustType('addition');
                            setAdjustQty(5);
                            setAdjustReason('');
                          }}
                          className="px-3.5 py-1.5 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs font-semibold rounded transition-colors"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Auditable Stock Movement History */}
            <div className="bg-white p-6 rounded-xl border border-black/8 space-y-4">
              <h3 className="font-serif-luxury text-2xl font-semibold">
                Auditable Stock Movement History
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 uppercase">
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Change</th>
                      <th className="py-2.5 px-3">Stock Balance</th>
                      <th className="py-2.5 px-3">Reason / Reference</th>
                      <th className="py-2.5 px-3">Actor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {stockMovements.map((m) => (
                      <tr key={m._id}>
                        <td className="py-2.5 px-3 text-neutral-500">
                          {formatDateTime(m.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 font-mono-code font-semibold">{m.sku}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-bold">
                          {m.type.replace(/_/g, ' ')}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-mono-code font-bold ${
                            m.quantityChange >= 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {m.quantityChange >= 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </td>
                        <td className="py-2.5 px-3 font-mono-code">
                          {m.previousStock} → <strong>{m.newStock}</strong>
                        </td>
                        <td className="py-2.5 px-3 text-neutral-700">{m.reason}</td>
                        <td className="py-2.5 px-3 text-neutral-500">{m.performedByName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* 4. ORDERS MANAGEMENT TAB */}
        {/* ======================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-black/8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by order no., name or phone…"
                  className="px-3.5 py-2 text-xs border border-neutral-300 rounded-lg w-64"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3.5 py-2 text-xs border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={slipIds.length === 0}
                onClick={() => openSlips(slipIds)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/15 hover:border-[#0D0D0D] text-xs font-semibold disabled:opacity-40 transition-colors"
                title={slipIds.length ? '' : 'Tick orders in the list first'}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print slips{slipIds.length ? ` (${slipIds.length})` : ''}</span>
              </button>
              <a
                href="/api/admin/reports/export/orders"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold rounded-lg"
              >
                <Download className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Download Orders (Excel)</span>
              </a>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-black/8 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 pl-5 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all orders"
                        checked={adminOrders.length > 0 && slipIds.length === adminOrders.length}
                        onChange={(e) => setSlipIds(e.target.checked ? adminOrders.map((o) => o._id) : [])}
                      />
                    </th>
                    <th className="p-3.5">Order</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5 text-right">Total</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-sm text-neutral-500">
                        No orders found.
                      </td>
                    </tr>
                  )}
                  {adminOrders.map((o) => {
                    const openOrder = () => {
                      setSelectedOrder(o);
                      setOrderNextFulfillment(o.fulfillmentStatus);
                      setOrderNextPayment(o.paymentStatus);
                      setOrderCourier(o.courierName || 'Leopards');
                      setOrderTracking(o.trackingNumber || '');
                      setOrderNote('');
                    };
                    const created = new Date(o.createdAt);
                    const status = ORDER_STATUS_STYLE[o.fulfillmentStatus] || ORDER_STATUS_STYLE.pending;
                    const paid = o.paymentStatus === 'paid';
                    return (
                      <tr key={o._id} onClick={openOrder} className={`cursor-pointer ${slipIds.includes(o._id) ? 'bg-[#C5A059]/[0.06]' : ''}`}>
                        <td className="p-3.5 pl-5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${o.orderNumber}`}
                            checked={slipIds.includes(o._id)}
                            onChange={(e) =>
                              setSlipIds((ids) => (e.target.checked ? [...ids, o._id] : ids.filter((x) => x !== o._id)))
                            }
                          />
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#0D0D0D] text-[13px]">{o.orderNumber}</span>
                            {o.orderSource === 'whatsapp' && (
                              <span title="Ordered via WhatsApp" className="inline-flex w-5 h-5 rounded-full bg-[#25D366]/15 text-[#128C7E] items-center justify-center">
                                <MessageCircle className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {created.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            <span className="mx-1 text-neutral-300">•</span>
                            {created.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 shrink-0 rounded-full bg-[#F3EFE6] text-[#9E7B36] text-[11px] font-bold flex items-center justify-center">
                              {o.shippingAddress.fullName
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((w) => w[0])
                                .join('')
                                .toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#0D0D0D] text-[13px] truncate">{o.shippingAddress.fullName}</p>
                              <p className="text-[11px] text-neutral-500 whitespace-nowrap">
                                {o.shippingAddress.city} <span className="mx-1 text-neutral-300">•</span> {o.shippingAddress.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <span className="font-semibold text-[13px] text-[#0D0D0D] tabular-nums">{formatPrice(o.totalAmount)}</span>
                          <p className="text-[11px] text-neutral-500">
                            {o.items.length} item{o.items.length > 1 ? 's' : ''}
                          </p>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              paid
                                ? 'bg-emerald-50 text-emerald-700'
                                : o.paymentStatus === 'refunded'
                                ? 'bg-red-50 text-red-700'
                                : o.paymentStatus === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${paid ? 'bg-emerald-500' : o.paymentStatus === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
                            {paid ? 'Paid' : o.paymentStatus === 'pending' ? 'Unpaid' : o.paymentStatus === 'refunded' ? 'Refunded' : 'Failed'}
                          </span>
                          <p className="text-[11px] text-neutral-500 mt-1 pl-1">
                            {PAYMENT_METHOD_LABEL[o.paymentMethod] || o.paymentMethod}
                          </p>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setWaOrder(o)}
                              aria-label={`WhatsApp ${o.shippingAddress.fullName}`}
                              title={`Message ${o.shippingAddress.fullName} on WhatsApp`}
                              className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366] hover:text-[#0D0D0D] hover:border-[#25D366] transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              {(o.whatsappLog?.length || 0) > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#075E54] text-white text-[9px] font-bold flex items-center justify-center">
                                  {o.whatsappLog!.length}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openSlips([o._id])}
                              aria-label={`Print shipping slip for ${o.orderNumber}`}
                              title="Print shipping slip"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-black/15 text-neutral-600 hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={openOrder}
                              className="h-9 px-4 rounded-lg border border-black/15 hover:border-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-[#FAF8F5] text-[12px] font-semibold transition-colors"
                            >
                              Open
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* 5. CUSTOMERS TAB */}
        {/* ======================================= */}
        {activeTab === 'whatsapp' && <WhatsAppCenter addToast={addToast} />}
        {activeTab === 'security' && <ChangePasswordPanel addToast={addToast} />}

        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-black/8">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customer by name, email, or phone..."
                className="px-4 py-2 text-xs border border-neutral-300 rounded-lg w-80"
              />
            </div>

            <div className="bg-white rounded-xl border border-black/8 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0D0D0D] text-[#FAF8F5] uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Name & Role</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Orders</th>
                    <th className="p-3.5">Total Spend</th>
                    <th className="p-3.5">Account Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {customers.map((c) => (
                    <tr key={c._id} className="hover:bg-[#FAF8F5]">
                      <td className="p-3.5">
                        <span className="font-bold text-[#0D0D0D] block">{c.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-[#9E7B36] font-semibold">
                          {c.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="block">{c.email}</span>
                        <span className="text-neutral-400">{c.phone || '—'}</span>
                      </td>
                      <td className="p-3.5 font-mono-code font-bold">{c.orderCount}</td>
                      <td className="p-3.5 font-mono-code font-bold">
                        {formatPrice(c.totalSpend)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold ${
                            c.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {c.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleCustomerStatus(c._id, c.status)}
                            className="px-3 py-1 border border-neutral-300 hover:border-[#0D0D0D] rounded text-xs font-semibold"
                          >
                            {c.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* 6. CATEGORIES & COLLECTIONS TAB */}
        {/* ======================================= */}
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Categories */}
            <div className="bg-white p-6 rounded-xl border border-black/8 space-y-5">
              <h2 className="font-serif-luxury text-2xl font-semibold">Jewellery Categories</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiRequest('/api/admin/categories', {
                    method: 'POST',
                    body: JSON.stringify({ name: newCatName, description: newCatDesc }),
                  });
                  setNewCatName('');
                  setNewCatDesc('');
                  addToast('Category created.', 'success');
                  loadTabContent();
                  refreshStorefront();
                }}
                className="space-y-3 bg-[#FAF8F5] p-4 rounded-lg border border-black/5"
              >
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New Category Name (e.g. Bridal Sets)"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded"
                />
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Category Description"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold rounded"
                >
                  Create Category
                </button>
              </form>

              <div className="divide-y divide-neutral-100 text-xs">
                {adminCategories.map((cat) => (
                  <div key={cat._id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#0D0D0D]">{cat.name}</p>
                      <p className="text-neutral-500">/{cat.slug}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiRequest(`/api/admin/categories/${cat._id}`, {
                          method: 'DELETE',
                        });
                        loadTabContent();
                        refreshStorefront();
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Collections */}
            <div className="bg-white p-6 rounded-xl border border-black/8 space-y-5">
              <h2 className="font-serif-luxury text-2xl font-semibold">Curated Collections</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiRequest('/api/admin/collections', {
                    method: 'POST',
                    body: JSON.stringify({
                      name: newColName,
                      subtitle: newColSubtitle,
                      image:
                        newColImage ||
                        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85',
                    }),
                  });
                  setNewColName('');
                  setNewColSubtitle('');
                  setNewColImage('');
                  addToast('Collection created.', 'success');
                  loadTabContent();
                  refreshStorefront();
                }}
                className="space-y-3 bg-[#FAF8F5] p-4 rounded-lg border border-black/5"
              >
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Collection Name (e.g. Bridal Couture)"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded"
                />
                <input
                  type="text"
                  value={newColSubtitle}
                  onChange={(e) => setNewColSubtitle(e.target.value)}
                  placeholder="Subtitle"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded"
                />
                <input
                  type="url"
                  value={newColImage}
                  onChange={(e) => setNewColImage(e.target.value)}
                  placeholder="Cover Image URL"
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold rounded"
                >
                  Create Collection
                </button>
              </form>

              <div className="divide-y divide-neutral-100 text-xs">
                {adminCollections.map((col) => (
                  <div key={col._id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={col.image}
                        alt={col.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div>
                        <p className="font-bold text-[#0D0D0D]">{col.name}</p>
                        <p className="text-neutral-500">{col.subtitle}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiRequest(`/api/admin/collections/${col._id}`, {
                          method: 'DELETE',
                        });
                        loadTabContent();
                        refreshStorefront();
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* 7. HOMEPAGE & CAROUSEL CMS TAB */}
        {/* ======================================= */}
        {activeTab === 'homepage' && cmsHomepage && (
          <form onSubmit={handleSaveHomepageCms} className="space-y-8">
            {/* Section visibility — hide a section without deleting its content */}
            <div className="bg-white p-6 rounded-xl border border-black/8 space-y-4">
              <div>
                <h2 className="font-serif-luxury text-2xl font-semibold">Homepage Sections</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Switch sections on or off. Hidden sections keep their content, so you can show them again any time.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(
                  [
                    ['heroCarousel', 'Hero Slideshow'],
                    ['featuredCollections', 'Collections'],
                    ['bestSellers', 'Best Sellers'],
                    ['promoBanner', 'Promo Banner'],
                    ['newArrivals', 'New Arrivals'],
                    ['brandStory', 'Brand Story'],
                    ['customerReviews', 'Customer Testimonials'],
                    ['newsletter', 'Newsletter'],
                  ] as const
                ).map(([key, label]) => {
                  const on = cmsHomepage.sectionVisibility?.[key] ?? true;
                  return (
                    <label
                      key={key}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer text-xs font-semibold transition-colors ${
                        on ? 'border-[#C5A059]/50 bg-[#C5A059]/5' : 'border-neutral-200 text-neutral-400'
                      }`}
                    >
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          setCmsHomepage({
                            ...cmsHomepage,
                            sectionVisibility: { ...cmsHomepage.sectionVisibility, [key]: e.target.checked },
                          })
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Announcement Bar */}
            <div className="bg-white p-6 rounded-xl border border-black/8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif-luxury text-2xl font-semibold">
                  Announcement Bar Messages
                </h2>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={cmsHomepage.announcementBar?.isEnabled ?? true}
                    onChange={(e) =>
                      setCmsHomepage({
                        ...cmsHomepage,
                        announcementBar: {
                          ...cmsHomepage.announcementBar,
                          isEnabled: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>Enable Announcement Bar</span>
                </label>
              </div>

              <div className="space-y-2.5">
                {cmsHomepage.announcementBar?.messages?.map((msg: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={msg.text}
                      onChange={(e) => {
                        const updated = [...cmsHomepage.announcementBar.messages];
                        updated[idx] = { ...updated[idx], text: e.target.value };
                        setCmsHomepage({
                          ...cmsHomepage,
                          announcementBar: {
                            ...cmsHomepage.announcementBar,
                            messages: updated,
                          },
                        });
                      }}
                      className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded"
                    />
                    <input
                      type="text"
                      value={msg.link || ''}
                      onChange={(e) => {
                        const updated = [...cmsHomepage.announcementBar.messages];
                        updated[idx] = { ...updated[idx], link: e.target.value };
                        setCmsHomepage({
                          ...cmsHomepage,
                          announcementBar: {
                            ...cmsHomepage.announcementBar,
                            messages: updated,
                          },
                        });
                      }}
                      placeholder="/shop"
                      className="w-40 px-3 py-2 text-xs border border-neutral-300 rounded"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Carousel Slides */}
            <div className="bg-white p-6 rounded-xl border border-black/8 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-serif-luxury text-2xl font-semibold">
                  Hero Carousel Slides ({cmsHomepage.heroSlides?.length || 0})
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setCmsHomepage({
                      ...cmsHomepage,
                      heroSlides: [
                        ...(cmsHomepage.heroSlides || []),
                        {
                          badgeText: 'LIMITED ATELIER RELEASE',
                          title: 'New Collection',
                          subtitle: 'Fresh designs for the modern woman.',
                          desktopImage:
                            'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1920&q=85',
                          mobileImage:
                            'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85',
                          primaryCtaText: 'Shop Collection',
                          primaryCtaLink: '/shop',
                          secondaryCtaText: 'Discover the Collection',
                          secondaryCtaLink: '/collections',
                          displayOrder: (cmsHomepage.heroSlides?.length || 0) + 1,
                          isActive: true,
                        },
                      ],
                    })
                  }
                  className="px-4 py-2 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold rounded"
                >
                  + Add Slide
                </button>
              </div>

              <div className="space-y-4">
                {cmsHomepage.heroSlides?.map((slide: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#FAF8F5] border border-black/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#9E7B36]">
                        Slide #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = cmsHomepage.heroSlides.filter(
                            (_: any, i: number) => i !== idx
                          );
                          setCmsHomepage({ ...cmsHomepage, heroSlides: next });
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove Slide
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={slide.badgeText}
                        onChange={(e) => {
                          const next = [...cmsHomepage.heroSlides];
                          next[idx] = { ...next[idx], badgeText: e.target.value };
                          setCmsHomepage({ ...cmsHomepage, heroSlides: next });
                        }}
                        placeholder="Badge Eyebrow Text"
                        className="px-3 py-2 text-xs bg-white border border-neutral-300 rounded"
                      />
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) => {
                          const next = [...cmsHomepage.heroSlides];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setCmsHomepage({ ...cmsHomepage, heroSlides: next });
                        }}
                        placeholder="Headline Title"
                        className="px-3 py-2 text-xs bg-white border border-neutral-300 rounded font-semibold"
                      />
                      <input
                        type="text"
                        value={slide.subtitle}
                        onChange={(e) => {
                          const next = [...cmsHomepage.heroSlides];
                          next[idx] = { ...next[idx], subtitle: e.target.value };
                          setCmsHomepage({ ...cmsHomepage, heroSlides: next });
                        }}
                        placeholder="Supporting Subtitle"
                        className="sm:col-span-2 px-3 py-2 text-xs bg-white border border-neutral-300 rounded"
                      />
                      <input
                        type="url"
                        value={slide.desktopImage}
                        onChange={(e) => {
                          const next = [...cmsHomepage.heroSlides];
                          next[idx] = { ...next[idx], desktopImage: e.target.value };
                          setCmsHomepage({ ...cmsHomepage, heroSlides: next });
                        }}
                        placeholder="Desktop Image URL"
                        className="px-3 py-2 text-xs bg-white border border-neutral-300 rounded"
                      />
                      <input
                        type="url"
                        value={slide.mobileImage}
                        onChange={(e) => {
                          const next = [...cmsHomepage.heroSlides];
                          next[idx] = { ...next[idx], mobileImage: e.target.value };
                          setCmsHomepage({ ...cmsHomepage, heroSlides: next });
                        }}
                        placeholder="Mobile Image URL"
                        className="px-3 py-2 text-xs bg-white border border-neutral-300 rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Promotional Banner */}
            <div className="bg-white p-6 rounded-xl border border-black/8 space-y-4">
              <h2 className="font-serif-luxury text-2xl font-semibold">Promotional Banner</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={cmsHomepage.promoBanner?.title || ''}
                  onChange={(e) =>
                    setCmsHomepage({
                      ...cmsHomepage,
                      promoBanner: { ...cmsHomepage.promoBanner, title: e.target.value },
                    })
                  }
                  placeholder="Banner Title"
                  className="px-3 py-2 text-xs border border-neutral-300 rounded"
                />
                <input
                  type="text"
                  value={cmsHomepage.promoBanner?.couponHighlight || ''}
                  onChange={(e) =>
                    setCmsHomepage({
                      ...cmsHomepage,
                      promoBanner: {
                        ...cmsHomepage.promoBanner,
                        couponHighlight: e.target.value,
                      },
                    })
                  }
                  placeholder="Featured Coupon Code"
                  className="px-3 py-2 text-xs border border-neutral-300 rounded font-mono-code"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-8 py-4 bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] text-xs uppercase tracking-[0.2em] font-bold rounded-lg shadow-md"
            >
              Publish Homepage Changes Live
            </button>
          </form>
        )}

        {/* ======================================= */}
        {/* 8. COUPONS & PROMOTIONS TAB */}
        {/* ======================================= */}
        {activeTab === 'coupons' && (
          <div className="space-y-8">
            <form
              onSubmit={handleCreateCoupon}
              className="bg-white p-6 rounded-xl border border-black/8 space-y-4"
            >
              <h2 className="font-serif-luxury text-2xl font-semibold">
                Create Promotional Coupon
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <input
                  type="text"
                  required
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  placeholder="CODE (e.g. EID20)"
                  className="px-3.5 py-2.5 text-xs border border-neutral-300 rounded font-mono-code uppercase"
                />
                <select
                  value={newCouponType}
                  onChange={(e) => setNewCouponType(e.target.value as any)}
                  className="px-3.5 py-2.5 text-xs border border-neutral-300 rounded bg-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed PKR (Rs.)</option>
                </select>
                <input
                  type="number"
                  required
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(Number(e.target.value))}
                  placeholder="Discount Value"
                  className="px-3.5 py-2.5 text-xs border border-neutral-300 rounded"
                />
                <input
                  type="number"
                  value={newCouponMinOrder}
                  onChange={(e) => setNewCouponMinOrder(Number(e.target.value))}
                  placeholder="Min Order (PKR)"
                  className="px-3.5 py-2.5 text-xs border border-neutral-300 rounded"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-wider font-bold rounded transition-colors"
                >
                  Create Coupon
                </button>
              </div>
            </form>

            <div className="bg-white rounded-xl border border-black/8 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0D0D0D] text-[#FAF8F5] uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Discount</th>
                    <th className="p-3.5">Min Subtotal</th>
                    <th className="p-3.5">Redemptions</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {coupons.map((c) => (
                    <tr key={c._id}>
                      <td className="p-3.5 font-mono-code font-bold text-sm">{c.code}</td>
                      <td className="p-3.5 font-semibold">
                        {c.discountType === 'percentage'
                          ? `${c.discountValue}% OFF`
                          : `Rs. ${c.discountValue.toLocaleString()} OFF`}
                      </td>
                      <td className="p-3.5 font-mono-code">{formatPrice(c.minOrderAmount)}</td>
                      <td className="p-3.5 font-mono-code">
                        {c.usedCount} / {c.usageLimit || '∞'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold ${
                            c.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-3">
                        <button
                          type="button"
                          onClick={async () => {
                            await apiRequest(`/api/admin/coupons/${c._id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ isActive: !c.isActive }),
                            });
                            loadTabContent();
                          }}
                          className="text-[#9E7B36] font-semibold hover:underline"
                        >
                          {c.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiRequest(`/api/admin/coupons/${c._id}`, {
                              method: 'DELETE',
                            });
                            loadTabContent();
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* 9. REPORTS, CSV EXPORTS, SETTINGS & AUDIT LOGS */}
        {/* ======================================= */}
        {activeTab === 'reports_settings' && (
          <div className="space-y-8">
            {/* Reports & CSV Downloads */}
            {reportsData && (
              <div className="bg-white p-6 rounded-xl border border-black/8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-serif-luxury text-2xl font-semibold">
                    Financial & Inventory Valuation Reports
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="/api/admin/reports/export/orders"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D0D0D] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Download Orders CSV</span>
                    </a>
                    <a
                      href="/api/admin/reports/export/inventory"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-[#0D0D0D] text-[#0D0D0D] text-xs uppercase tracking-wider font-semibold rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Inventory Valuation CSV</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-black/8">
                    <span className="text-xs text-neutral-500 block">
                      Total Vault Cost Valuation
                    </span>
                    <span className="font-mono-code text-xl font-bold text-[#0D0D0D]">
                      {formatPrice(reportsData.inventoryValuation.totalInventoryCostValuation)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-black/8">
                    <span className="text-xs text-neutral-500 block">
                      Total Vault Retail Valuation
                    </span>
                    <span className="font-mono-code text-xl font-bold text-[#0D0D0D]">
                      {formatPrice(reportsData.inventoryValuation.totalInventoryRetailValuation)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-black/8">
                    <span className="text-xs text-neutral-500 block">
                      Projected Gross Margin
                    </span>
                    <span className="font-mono-code text-xl font-bold text-emerald-700">
                      {formatPrice(reportsData.inventoryValuation.projectedGrossMargin)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Store Settings */}
            {storeSettings && (
              <form
                onSubmit={handleSaveSettings}
                className="bg-white p-6 rounded-xl border border-black/8 space-y-5"
              >
                <h2 className="font-serif-luxury text-2xl font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#C5A059]" />
                  Store Configuration & Shipping Rules
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Store Name</label>
                    <input
                      type="text"
                      value={storeSettings.storeName}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, storeName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Standard Shipping Fee (PKR)
                    </label>
                    <input
                      type="number"
                      value={storeSettings.standardShippingFee}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          standardShippingFee: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">
                      Free Shipping Threshold (PKR)
                    </label>
                    <input
                      type="number"
                      value={storeSettings.freeShippingThreshold}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          freeShippingThreshold: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={storeSettings.contactEmail}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, contactEmail: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={storeSettings.contactPhone}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, contactPhone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-300 rounded"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 text-xs pt-2">
                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={storeSettings.allowGuestCheckout}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          allowGuestCheckout: e.target.checked,
                        })
                      }
                    />
                    <span>Allow Guest Checkout</span>
                  </label>
                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={storeSettings.enableCod}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, enableCod: e.target.checked })
                      }
                    />
                    <span>Enable Cash on Delivery (COD)</span>
                  </label>
                </div>

                {/* JazzCash / EasyPaisa accounts */}
                <div className="space-y-3 pt-2">
                  <div>
                    <h3 className="font-serif-luxury text-xl font-semibold">JazzCash & EasyPaisa</h3>
                    <p className="text-[11px] text-neutral-500">
                      Customers see these details after ordering and send the payment screenshot on WhatsApp.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['jazzcash', 'easypaisa'] as const).map((w) => {
                      const acc = storeSettings.mobileWallets?.[w] || { enabled: true, accountTitle: '', accountNumber: '' };
                      const setAcc = (patch: Record<string, unknown>) =>
                        setStoreSettings({
                          ...storeSettings,
                          mobileWallets: { ...(storeSettings.mobileWallets || {}), [w]: { ...acc, ...patch } },
                        });
                      return (
                        <div key={w} className={`p-4 rounded-xl border space-y-3 ${acc.enabled ? 'border-[#C5A059]/50 bg-[#C5A059]/5' : 'border-neutral-200'}`}>
                          <label className="flex items-center justify-between gap-2 font-semibold">
                            <span className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-md text-white text-[10px] font-bold flex items-center justify-center ${w === 'jazzcash' ? 'bg-[#C8102E]' : 'bg-[#1BA548]'}`}>
                                {w === 'jazzcash' ? 'JC' : 'EP'}
                              </span>
                              {w === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}
                            </span>
                            <span className="flex items-center gap-2 text-[11px] font-normal text-neutral-500">
                              {acc.enabled ? 'Shown at checkout' : 'Hidden'}
                              <input type="checkbox" checked={acc.enabled} onChange={(e) => setAcc({ enabled: e.target.checked })} />
                            </span>
                          </label>
                          <label className="block text-xs">
                            <span className="font-semibold">Account number</span>
                            <input
                              value={acc.accountNumber}
                              onChange={(e) => setAcc({ accountNumber: e.target.value })}
                              placeholder="03xx xxxxxxx"
                              className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                            />
                          </label>
                          <label className="block text-xs">
                            <span className="font-semibold">Account title (name)</span>
                            <input
                              value={acc.accountTitle}
                              onChange={(e) => setAcc({ accountTitle: e.target.value })}
                              className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <label className="block text-xs">
                    <span className="font-semibold">Payment instructions (shown to customers)</span>
                    <textarea
                      rows={2}
                      value={storeSettings.mobileWallets?.instructions || ''}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          mobileWallets: { ...(storeSettings.mobileWallets || {}), instructions: e.target.value },
                        })
                      }
                      className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] text-xs uppercase tracking-widest font-bold rounded transition-colors"
                >
                  Save Store Settings
                </button>
              </form>
            )}

            {/* Security Audit Logs */}
            <div className="bg-white p-6 rounded-xl border border-black/8 space-y-4">
              <h2 className="font-serif-luxury text-2xl font-semibold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#C5A059]" />
                Administrative Security Audit Trail
              </h2>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 uppercase">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Administrator</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td className="py-2.5 px-3 text-neutral-500">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 font-medium">{log.actorEmail}</td>
                        <td className="py-2.5 px-3 font-mono-code font-bold text-[#9E7B36]">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-700">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* ======================================= */}
      {/* PRODUCT CREATE / EDIT MODAL */}
      {/* ======================================= */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <h2 className="font-serif-luxury text-2xl font-bold">
                {editingProduct._id ? 'Edit Jewellery' : 'Add Jewellery'}
              </h2>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-neutral-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-bold block mb-1">Jewellery Title *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.brand || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, brand: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Product Code (auto if blank)</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded font-mono-code"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Gender</label>
                  <select
                    value={editingProduct.gender || 'Women'}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, gender: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  >
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Unisex">Unisex</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Price (PKR) — 0 = Price on request</label>
                  <input
                    type="number"
                    min={0}
                    value={editingProduct.price || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded font-mono-code"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Sale Price (PKR, optional)</label>
                  <input
                    type="number"
                    value={editingProduct.salePrice ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        salePrice: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded font-mono-code"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingProduct.stock ?? 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded font-mono-code"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Status</label>
                  <select
                    value={editingProduct.status || 'published'}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, status: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Image URL + Upload */}
              <div className="space-y-2">
                <label className="font-bold block">Primary Photo (URL or Upload) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={editingProduct.mainImage || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, mainImage: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded"
                  />
                  <label
                    className={`px-4 py-2 bg-[#1A1A1E] text-[#FAF8F5] rounded cursor-pointer inline-flex items-center gap-1.5 font-semibold ${
                      uploadStatus?.phase === 'compressing' || uploadStatus?.phase === 'uploading' ? 'opacity-60 pointer-events-none' : ''
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadStatus?.phase === 'compressing'
                        ? 'Compressing…'
                        : uploadStatus?.phase === 'uploading'
                        ? 'Uploading…'
                        : 'Upload File'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-[11px] text-neutral-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compressPhotos}
                      onChange={(e) => setCompressPhotos(e.target.checked)}
                    />
                    Compress photo before upload (recommended — max 1600px, WebP)
                  </label>
                  {uploadStatus?.result && uploadStatus.phase === 'done' && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                      {uploadStatus.result.compressed
                        ? `${formatBytes(uploadStatus.result.originalBytes)} → ${formatBytes(uploadStatus.result.compressedBytes)} (−${Math.round(
                            (1 - uploadStatus.result.compressedBytes / uploadStatus.result.originalBytes) * 100
                          )}%) · ${uploadStatus.result.width}×${uploadStatus.result.height}`
                        : 'Already optimised — uploaded as is'}
                    </span>
                  )}
                </div>
                {editingProduct.mainImage && (
                  <img
                    src={editingProduct.mainImage}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg border border-black/10"
                  />
                )}
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#FAF8F5] border border-black/5">
                <div>
                  <label className="font-semibold block mb-1">Type</label>
                  <input
                    type="text"
                    value={editingProduct.specifications?.movement || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        specifications: {
                          ...(editingProduct.specifications as any),
                          movement: e.target.value,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Metal</label>
                  <input
                    type="text"
                    value={editingProduct.specifications?.caseMaterial || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        specifications: {
                          ...(editingProduct.specifications as any),
                          caseMaterial: e.target.value,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Stones</label>
                  <input
                    type="text"
                    value={editingProduct.specifications?.crystal || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        specifications: {
                          ...(editingProduct.specifications as any),
                          crystal: e.target.value,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Full Description *</label>
                <textarea
                  rows={3}
                  required
                  value={editingProduct.description || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded"
                />
              </div>

              <div className="flex flex-wrap gap-6 pt-1">
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.featured)}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, featured: e.target.checked })
                    }
                  />
                  <span>Featured</span>
                </label>
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.bestSeller)}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, bestSeller: e.target.checked })
                    }
                  />
                  <span>Best Seller</span>
                </label>
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.newArrival)}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, newArrival: e.target.checked })
                    }
                  />
                  <span>New Arrival</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-5 py-2.5 border border-neutral-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] rounded-lg font-bold uppercase tracking-wider"
                >
                  Save Jewellery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* INVENTORY ADJUSTMENT MODAL */}
      {/* ======================================= */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="font-serif-luxury text-2xl font-bold">
                Adjust Stock: {adjustModalProduct.sku}
              </h3>
              <button
                type="button"
                onClick={() => setAdjustModalProduct(null)}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4 text-xs">
              <p className="text-neutral-600">
                Current Vault Stock for <strong>{adjustModalProduct.name}</strong>:{' '}
                <strong className="font-mono-code">{adjustModalProduct.stock} units</strong>
              </p>

              <div>
                <label className="font-bold block mb-1">Adjustment Operation</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                >
                  <option value="addition">Stock Addition (+ Restock)</option>
                  <option value="reduction">Remove Stock (damaged / lost)</option>
                  <option value="set_exact">Set Exact Physical Audit Count</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Quantity *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded font-mono-code"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">
                  Mandatory Audit Reason *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Geneva shipment batch #402 received"
                  className="w-full px-3 py-2 border border-neutral-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="px-4 py-2 border border-neutral-300 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0D0D0D] text-[#FAF8F5] rounded font-bold uppercase tracking-wider"
                >
                  Record Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* ORDER INSPECTOR & STATUS TRANSITION MODAL */}
      {/* ======================================= */}
      {waOrder && (
        <WhatsAppComposer
          order={waOrder}
          settings={publicSettings}
          initialTemplate={suggestedTemplate(waOrder)}
          onClose={() => setWaOrder(null)}
          onSent={(updated) => {
            addToast('WhatsApp message logged on the order.', 'success');
            setWaOrder(null);
            setAdminOrders((list) => list.map((x) => (x._id === updated._id ? updated : x)));
            setSelectedOrder((cur) => (cur && cur._id === updated._id ? updated : cur));
          }}
          onError={(msg) => addToast(msg, 'error')}
        />
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#9E7B36] font-bold">
                  Order Fulfillment Management
                </span>
                <h3 className="font-mono-code text-2xl font-bold text-[#0D0D0D]">
                  {selectedOrder.orderNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/order-confirmation/${selectedOrder.orderNumber}`}
                  target="_blank"
                  className="px-3 py-1.5 border border-neutral-300 rounded text-xs font-semibold"
                >
                  Printable Invoice ↗
                </Link>
                <button
                  type="button"
                  onClick={() => setWaOrder(selectedOrder)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#25D366] hover:bg-[#1EBE5A] text-[#0D0D0D] text-xs font-bold"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => openSlips([selectedOrder._id])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-300 hover:border-[#0D0D0D] text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Slip
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-neutral-400 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateOrderStatus} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold block mb-1">Fulfillment Status</label>
                  <select
                    value={orderNextFulfillment}
                    onChange={(e) => setOrderNextFulfillment(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled (Auto-Restores Stock)</option>
                    <option value="refunded">Refunded (Auto-Restores Stock)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Payment Status</label>
                  <select
                    value={orderNextPayment}
                    onChange={(e) => setOrderNextPayment(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Courier Partner</label>
                  <select
                    value={orderCourier || 'Leopards'}
                    onChange={(e) => setOrderCourier(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"
                  >
                    <option value="Leopards">Leopards Courier</option>
                    <option value="TCS">TCS</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Tracking Number</label>
                  <input
                    type="text"
                    value={orderTracking}
                    onChange={(e) => setOrderTracking(e.target.value)}
                    placeholder="TCS-88990011"
                    className="w-full px-3 py-2 border border-neutral-300 rounded font-mono-code"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold block mb-1">Status Update Note</label>
                  <input
                    type="text"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Optional note recorded in chronological order history..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded"
                  />
                </div>
              </div>

              {selectedOrder.inventoryRestored && (
                <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Inventory for this cancelled/refunded order has already been restored to the vault (Protected against duplicate restoration).
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] font-bold uppercase tracking-widest rounded-lg transition-colors"
              >
                Update Order & Record History
              </button>
            </form>

            {/* Chronological History */}
            <div className="space-y-2 pt-3 border-t border-neutral-200 text-xs">
              <h4 className="font-bold uppercase tracking-wider">Order Status History</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedOrder.statusHistory.map((h, i) => (
                  <div key={i} className="p-2.5 rounded bg-[#FAF8F5] border border-black/5">
                    <span className="font-bold uppercase">{h.status}</span> •{' '}
                    <span className="text-neutral-500">{formatDateTime(h.timestamp)}</span>
                    <p className="text-neutral-700 mt-0.5">{h.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
