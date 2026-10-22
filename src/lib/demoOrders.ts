/**
 * Demo-mode order store (browser localStorage) so checkout, the admin Orders tab
 * and the WhatsApp Center can be tried end-to-end without the backend.
 */
import type { Order, StoreSettings } from '../types';
import { DEFAULT_TEMPLATES } from './whatsapp';

const ORDERS_KEY = 'bfs_demo_orders';
const SETTINGS_KEY = 'bfs_demo_settings';

interface DemoCatalog {
  products: { _id: string; name: string; slug: string; brand: string; sku: string; mainImage: string; price: number; salePrice: number | null; stock: number }[];
  baseSettings: StoreSettings;
}

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — demo state just won't persist
  }
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function seedOrders(cat: DemoCatalog): Order[] {
  const p = cat.products;
  const mk = (
    n: number,
    name: string,
    phone: string,
    city: string,
    prodIdx: number,
    status: Order['fulfillmentStatus'],
    extra: Partial<Order> = {}
  ): Order => {
    const prod = p[prodIdx];
    const unit = prod.salePrice ?? prod.price;
    return {
      _id: `demo-order-${n}`,
      orderNumber: `MS-${String(n).padStart(3, "0")}`,
      isGuest: true,
      items: [{ product: prod._id, name: prod.name, slug: prod.slug, brand: prod.brand, sku: prod.sku, image: prod.mainImage, unitPrice: unit, quantity: 1, subtotal: unit }],
      shippingAddress: { fullName: name, email: 'customer@example.com', phone, streetAddress: 'House 12, Street 4', city, province: 'Punjab', postalCode: '54000', country: 'Pakistan' },
      shippingMethod: 'standard',
      subtotal: unit,
      discountAmount: 0,
      shippingCost: 0,
      taxAmount: 0,
      totalAmount: unit,
      currency: 'PKR',
      paymentMethod: 'cod',
      paymentStatus: status === 'delivered' ? 'paid' : 'pending',
      fulfillmentStatus: status,
      inventoryRestored: false,
      orderSource: 'website',
      whatsappLog: [],
      statusHistory: [{ status: 'pending', note: 'Order placed.', timestamp: daysAgo(n) }],
      createdAt: daysAgo(n * 0.5),
      ...extra,
    };
  };
  return [
    mk(1, 'Ahmed Raza', '0300 1234567', 'Lahore', 0, 'pending', { orderSource: 'whatsapp' }),
    mk(2, 'Sana Khan', '0321 7654321', 'Karachi', 2, 'pending'),
    mk(3, 'Bilal Hussain', '0333 1112223', 'Islamabad', 4, 'shipped', { courierName: 'TCS', trackingNumber: 'TCS77812345' }),
    mk(4, 'Hira Malik', '0345 9876543', 'Faisalabad', 1, 'delivered'),
    mk(5, 'Usman Tariq', '0312 4455667', 'Multan', 5, 'confirmed', { paymentMethod: 'bank_transfer' }),
  ];
}

export function getDemoOrders(cat: DemoCatalog): Order[] {
  const existing = read<Order[] | null>(ORDERS_KEY, null);
  if (existing) return existing;
  const seeded = seedOrders(cat);
  write(ORDERS_KEY, seeded);
  return seeded;
}

const saveOrders = (orders: Order[]) => write(ORDERS_KEY, orders);

export function getDemoSettings(cat: DemoCatalog): StoreSettings {
  return {
    ...cat.baseSettings,
    whatsappOrderingEnabled: true,
    whatsappTemplates: DEFAULT_TEMPLATES,
    ...read<Partial<StoreSettings>>(SETTINGS_KEY, {}),
  };
}

const notSent = (o: Order, t: string) => !(o.whatsappLog || []).some((l) => l.template === t);

/** Handles order/admin endpoints in demo mode; undefined when the path isn't ours. */
export function demoOrderResponse(path: string, q: URLSearchParams, options: RequestInit, cat: DemoCatalog): unknown {
  const method = (options.method || 'GET').toUpperCase();
  const body = () => JSON.parse(String(options.body || '{}'));
  const orders = () => getDemoOrders(cat);

  if (path === '/api/orders' && method === 'POST') {
    const data = body();
    const items = (data.items || []).flatMap((it: { productId: string; quantity: number }) => {
      const prod = cat.products.find((x) => x._id === it.productId);
      if (!prod) return [];
      const unit = prod.salePrice ?? prod.price;
      return [{ product: prod._id, name: prod.name, slug: prod.slug, brand: prod.brand, sku: prod.sku, image: prod.mainImage, unitPrice: unit, quantity: it.quantity, subtotal: unit * it.quantity }];
    });
    const subtotal = items.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0);
    const list = orders();
    const order: Order = {
      _id: `demo-order-${Date.now()}`,
      orderNumber: `REQ-${String(Date.now()).slice(-6)}`,
      isGuest: true,
      items,
      shippingAddress: data.shippingAddress,
      shippingMethod: data.shippingMethod || 'standard',
      subtotal,
      discountAmount: 0,
      shippingCost: 0,
      taxAmount: 0,
      totalAmount: subtotal,
      currency: 'PKR',
      paymentMethod: data.paymentMethod || 'cod',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      inventoryRestored: false,
      orderSource: data.orderSource === 'whatsapp' ? 'whatsapp' : 'website',
      whatsappLog: [],
      statusHistory: [{ status: 'pending', note: 'Order placed (demo).', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    saveOrders([order, ...list]);
    return { success: true, order };
  }

  const track = path.match(/^\/api\/orders\/track\/([^/]+)$/);
  if (track) {
    const order = orders().find((o) => o.orderNumber === decodeURIComponent(track[1]).toUpperCase());
    if (!order) return undefined;
    const { whatsappLog: _omit, ...publicOrder } = order;
    return { success: true, order: publicOrder };
  }

  if (path === '/api/admin/orders' && method === 'GET') {
    const term = (q.get('q') || '').toLowerCase();
    const status = q.get('fulfillmentStatus');
    const list = orders().filter(
      (o) =>
        (!status || status === 'all' || o.fulfillmentStatus === status) &&
        (!term || `${o.orderNumber} ${o.shippingAddress.fullName} ${o.shippingAddress.phone}`.toLowerCase().includes(term))
    );
    return { success: true, orders: list, pagination: { total: list.length, page: 1, limit: 50, totalPages: 1 } };
  }

  const status = path.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
  if (status && method === 'PUT') {
    const data = body();
    const list = orders();
    const o = list.find((x) => x._id === status[1]);
    if (!o) return undefined;
    Object.assign(o, {
      fulfillmentStatus: data.fulfillmentStatus || o.fulfillmentStatus,
      paymentStatus: data.fulfillmentStatus === 'delivered' ? 'paid' : data.paymentStatus || o.paymentStatus,
      courierName: data.courierName ?? o.courierName,
      trackingNumber: data.trackingNumber ?? o.trackingNumber,
    });
    o.statusHistory.push({ status: o.fulfillmentStatus, note: data.note || `Status set to ${o.fulfillmentStatus} (demo).`, updatedBy: 'Admin', timestamp: new Date().toISOString() });
    saveOrders(list);
    return { success: true, message: `Order ${o.orderNumber} updated.`, order: o };
  }

  const del = path.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (del && method === 'DELETE') {
    const list = orders();
    const idx = list.findIndex((x) => x._id === del[1]);
    if (idx === -1) return undefined;
    const removed = list.splice(idx, 1)[0];
    saveOrders(list);
    return { success: true, message: `Order ${removed.orderNumber} deleted successfully (demo).`, orderId: removed._id, orderNumber: removed.orderNumber };
  }

  const force = path.match(/^\/api\/admin\/orders\/([^/]+)\/force-update$/);
  if (force && (method === 'PATCH' || method === 'PUT')) {
    const data = body();
    const list = orders();
    const o = list.find((x) => x._id === force[1]);
    if (!o) return undefined;

    if (data.orderNumber) o.orderNumber = data.orderNumber.toUpperCase();
    if (data.fulfillmentStatus) o.fulfillmentStatus = data.fulfillmentStatus;
    if (data.paymentStatus) o.paymentStatus = data.paymentStatus;
    if (data.paymentMethod) o.paymentMethod = data.paymentMethod;
    if (data.shippingMethod) o.shippingMethod = data.shippingMethod;
    if (data.courierName !== undefined) o.courierName = data.courierName;
    if (data.trackingNumber !== undefined) o.trackingNumber = data.trackingNumber;
    if (data.customer) {
      Object.assign(o.shippingAddress, data.customer);
    }
    if (data.financials) {
      if (data.financials.subtotal !== undefined) o.subtotal = data.financials.subtotal;
      if (data.financials.discountAmount !== undefined) o.discountAmount = data.financials.discountAmount;
      if (data.financials.shippingCost !== undefined) o.shippingCost = data.financials.shippingCost;
      if (data.financials.totalAmount !== undefined) o.totalAmount = data.financials.totalAmount;
    }
    const note = `Force update by admin (demo)${data.adminReason ? `: ${data.adminReason}` : ''}`;
    o.statusHistory.push({ status: o.fulfillmentStatus, note, updatedBy: 'Admin', timestamp: new Date().toISOString() });
    saveOrders(list);
    return { success: true, message: `Order ${o.orderNumber} updated successfully.`, order: o };
  }

  const log = path.match(/^\/api\/admin\/orders\/([^/]+)\/whatsapp-log$/);
  if (log && method === 'POST') {
    const data = body();
    const list = orders();
    const o = list.find((x) => x._id === log[1]);
    if (!o) return undefined;
    o.whatsappLog = [...(o.whatsappLog || []), { ...data, sentBy: 'Admin (demo)', sentAt: new Date().toISOString() }];
    saveOrders(list);
    return { success: true, order: o };
  }

  if (path === '/api/admin/whatsapp/overview') {
    const list = orders();
    const today = new Date().toDateString();
    const queues = {
      orderPlaced: list.filter((o) => o.fulfillmentStatus === 'pending' && notSent(o, 'orderPlaced')),
      shipped: list.filter((o) => o.fulfillmentStatus === 'shipped' && notSent(o, 'shipped')),
      delivered: list.filter((o) => o.fulfillmentStatus === 'delivered' && notSent(o, 'delivered')),
      paymentReminder: list.filter(
        (o) => o.paymentStatus === 'pending' && o.paymentMethod === 'bank_transfer' && !['cancelled', 'refunded'].includes(o.fulfillmentStatus) && notSent(o, 'paymentReminder')
      ),
    };
    const messages = list
      .flatMap((o) => (o.whatsappLog || []).map((l) => ({ ...l, orderId: o._id, orderNumber: o.orderNumber, customerName: o.shippingAddress.fullName })))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    return {
      success: true,
      stats: {
        sentToday: messages.filter((m) => new Date(m.sentAt).toDateString() === today).length,
        whatsappOrders: list.filter((o) => o.orderSource === 'whatsapp').length,
        totalOrders: list.length,
        pendingActions: Object.values(queues).reduce((s, l) => s + l.length, 0),
      },
      queues,
      recentMessages: messages.slice(0, 30),
    };
  }

  if (path === '/api/admin/settings') {
    if (method === 'PUT') {
      write(SETTINGS_KEY, { ...read<object>(SETTINGS_KEY, {}), ...body() });
      return { success: true, message: 'Store settings saved (demo).', settings: getDemoSettings(cat) };
    }
    return { success: true, settings: getDemoSettings(cat) };
  }

  return undefined;
}
