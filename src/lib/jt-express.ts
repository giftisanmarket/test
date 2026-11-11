/**
 * J&T Express Egypt Open Platform Integration Service
 * Official J&T Express API integration for Giftisan
 * Docs: https://open.jtjms-eg.com/#/apiDoc/index
 */

import crypto from "crypto";

const JT_BASE_URL = (
  process.env.JT_BASE_URL ||
  process.env.JTEXPRESS_BASE_URL ||
  "https://openapi.jtjms-eg.com"
).replace(/\/+$/, "");

const JT_API_ACCOUNT =
  process.env.JT_API_ACCOUNT || process.env.JTEXPRESS_API_ACCOUNT || "";
const JT_PRIVATE_KEY =
  process.env.JT_PRIVATE_KEY || process.env.JTEXPRESS_PRIVATE_KEY || "";
const JT_CUSTOMER_CODE =
  process.env.JT_CUSTOMER_CODE || process.env.JTEXPRESS_CUSTOMER_CODE || "";
const JT_CUSTOMER_PWD =
  process.env.JT_CUSTOMER_PWD || process.env.JTEXPRESS_CUSTOMER_PWD || "";

const JT_DEFAULT_SENDER_NAME = process.env.JT_SENDER_NAME || "Giftisan";
const JT_DEFAULT_SENDER_PHONE = process.env.JT_SENDER_PHONE || "01000000000";
const JT_DEFAULT_SENDER_PROV = process.env.JT_SENDER_PROV || "Cairo";
const JT_DEFAULT_SENDER_CITY = process.env.JT_SENDER_CITY || "Cairo";
const JT_DEFAULT_SENDER_AREA = process.env.JT_SENDER_AREA || "Cairo";
const JT_DEFAULT_SENDER_ADDRESS =
  process.env.JT_SENDER_ADDRESS || "Cairo, Egypt";

const EGYPT_PWD_SALT = "jadada236t2";

export interface JtAddress {
  firstLine: string;
  prov?: string;
  city?: string;
  district?: string;
  area?: string;
  buildingNumber?: string;
  floor?: string;
  apartment?: string;
}

export interface JtParty {
  firstName: string;
  lastName?: string;
  name?: string;
  phone: string;
  email?: string;
}

export interface JtOrderItem {
  itemName: string;
  number: number;
  itemType?: string;
  itemValue?: number;
  priceCurrency?: string;
  desc?: string;
}

export interface CreateJtDeliveryParams {
  txlogisticId: string; // Giftisan Order ID or Item Reference
  expressType?: string; // "EZ": Standard, "DR": Return, "EX": Exchange
  orderType?: string; // "1" or "2"
  serviceType?: string; // "01": Door-to-door pickup, "02": Drop-off
  deliveryType?: string; // "04": Standard delivery ("01"/"02"/"04" per J&T Egypt contract)
  payType?: string; // "PP_PM" (Monthly), "PP_CASH" (Cash), "CC_CASH" (Collect)
  goodsType?: string; // "ITN1" or "bm000006"
  weight?: number; // Weight in KG
  cod?: number; // Cash on Delivery amount in EGP (0 for prepaid)
  receiver: JtParty;
  dropOffAddress: JtAddress;
  sender?: JtParty;
  pickupAddress?: JtAddress;
  notes?: string;
  parcelCount?: number; // Number of physical parcels/boxes per waybill (default 1)
  itemsCount?: number;
  description?: string;
  exdrDescription?: string; // Required by J&T addOrder when expressType is "DR" (Return) or "EX" (Exchange)
  items?: JtOrderItem[];
}

function md5Hex(input: string): string {
  return crypto.createHash("md5").update(input, "utf8").digest("hex");
}

function md5Base64(input: string): string {
  return crypto.createHash("md5").update(input, "utf8").digest("base64");
}

/**
 * Generates the header signature `digest` for J&T Open Platform requests:
 * base64(md5(bizContentJson + privateKey))
 */
export function generateHeaderDigest(
  bizContentJson: string,
  privateKey: string = JT_PRIVATE_KEY
): string {
  return md5Base64(`${bizContentJson}${privateKey}`);
}

/**
 * Generates the inner business `digest` for J&T Egypt customer authentication:
 * hashedPwd = UPPERCASE(md5(customerPwd + "jadada236t2"))
 * bizDigest = base64(md5(customerCode + hashedPwd + privateKey))
 */
export function generateBizDigest(
  customerCode: string = JT_CUSTOMER_CODE,
  customerPwd: string = JT_CUSTOMER_PWD,
  privateKey: string = JT_PRIVATE_KEY
): string {
  if (!customerPwd) {
    return md5Base64(`${customerCode}${privateKey}`);
  }
  const hashedPwd = md5Hex(`${customerPwd}${EGYPT_PWD_SALT}`).toUpperCase();
  return md5Base64(`${customerCode}${hashedPwd}${privateKey}`);
}

export function isJtConfigured(): boolean {
  return Boolean(JT_API_ACCOUNT && JT_PRIVATE_KEY && JT_CUSTOMER_CODE);
}

function assertJtConfigured() {
  if (!isJtConfigured()) {
    throw new Error(
      "J&T Express credentials (JT_API_ACCOUNT, JT_PRIVATE_KEY, JT_CUSTOMER_CODE) are not configured in environment variables."
    );
  }
}

export async function postJtRequest(endpointPath: string, bizPayload: Record<string, any>) {
  assertJtConfigured();

  const fullPayload = {
    customerCode: JT_CUSTOMER_CODE,
    digest: generateBizDigest(),
    ...bizPayload,
  };

  const bizContentJson = JSON.stringify(fullPayload);
  const headerDigest = generateHeaderDigest(bizContentJson);
  const timestamp = String(Date.now());

  const body = new URLSearchParams({ bizContent: bizContentJson });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(`${JT_BASE_URL}${endpointPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        apiAccount: JT_API_ACCOUNT,
        digest: headerDigest,
        timestamp,
      },
      body: body.toString(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || (String(data.code) !== "1" && data.code !== 200)) {
    console.error(`[J&T Express API Error - ${endpointPath}]:`, data);
    throw new Error(
      data?.msg ||
      data?.message ||
      data?.error ||
      `J&T Express API error (${response.status})`
    );
  }

  return data;
}

/**
 * 1. Create Order (`orderserve/create`)
 * Endpoint: POST /webopenplatformapi/api/order/addOrder
 */
export async function createJtOrder(params: CreateJtDeliveryParams) {
  const receiverFullName =
    params.receiver.name ||
    [params.receiver.firstName, params.receiver.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Customer";

  const senderFullName =
    params.sender?.name ||
    [params.sender?.firstName, params.sender?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    JT_DEFAULT_SENDER_NAME;

  const senderPhone = params.sender?.phone || JT_DEFAULT_SENDER_PHONE;
  const senderProv =
    params.pickupAddress?.prov ||
    params.pickupAddress?.city ||
    JT_DEFAULT_SENDER_PROV;
  const senderCity = params.pickupAddress?.city || JT_DEFAULT_SENDER_CITY;
  const senderArea =
    params.pickupAddress?.area ||
    params.pickupAddress?.district ||
    senderCity ||
    JT_DEFAULT_SENDER_AREA;
  const senderAddress =
    params.pickupAddress?.firstLine || JT_DEFAULT_SENDER_ADDRESS;

  const receiverProv =
    params.dropOffAddress.prov || params.dropOffAddress.city || "Cairo";
  const receiverCity = params.dropOffAddress.city || receiverProv;
  const receiverArea =
    params.dropOffAddress.area ||
    params.dropOffAddress.district ||
    receiverCity;

  const fullReceiverAddress = [
    params.dropOffAddress.firstLine,
    params.dropOffAddress.buildingNumber
      ? `Bldg ${params.dropOffAddress.buildingNumber}`
      : "",
    params.dropOffAddress.floor ? `Floor ${params.dropOffAddress.floor}` : "",
    params.dropOffAddress.apartment
      ? `Apt ${params.dropOffAddress.apartment}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");

  const codAmount = Math.max(0, Number(params.cod || 0));
  // J&T addOrder expects totalQuantity to be the physical parcel/box count per waybill (1 parcel per booking),
  // whereas retail unit counts for each product live in items[].number.
  const totalQuantity = Math.max(1, Math.floor(Number(params.parcelCount || 1)));
  const fallbackItemCount = Math.max(1, Math.floor(Number(params.itemsCount || 1)));
  const itemDesc =
    (params.description || "Giftisan Handmade Items").slice(0, 100);

  const itemsList =
    params.items && params.items.length > 0
      ? params.items.map((i) => ({
        itemName: i.itemName.slice(0, 80),
        number: Math.max(1, Math.floor(Number(i.number || 1))),
        itemType: i.itemType || "ITN1",
        priceCurrency: i.priceCurrency || "EGP",
        itemValue: String(i.itemValue ?? 0),
        desc: (i.desc || i.itemName).slice(0, 100),
      }))
      : [
        {
          itemName: itemDesc,
          number: fallbackItemCount,
          itemType: "ITN1",
          priceCurrency: "EGP",
          itemValue: String(codAmount),
          desc: itemDesc,
        },
      ];

  const expressType = params.expressType || "EZ";
  const resolvedExdrDescription = (
    params.exdrDescription ||
    params.description ||
    itemDesc ||
    "Giftisan Return/Exchange"
  )
    .trim()
    .slice(0, 500);

  const bizPayload: Record<string, any> = {
    operateType: 1,
    txlogisticId: params.txlogisticId,
    expressType,
    orderType: params.orderType || "2",
    serviceType: params.serviceType || "01",
    deliveryType: params.deliveryType || process.env.JT_DELIVERY_TYPE || "04",
    payType: params.payType || (codAmount > 0 ? "CC_CASH" : "PP_PM"),
    goodsType: params.goodsType || "ITN1",
    weight: Number(params.weight || 0.5),
    totalQuantity,
    priceCurrency: "EGP",
    itemsValue: codAmount,
    remark: (params.notes || "").slice(0, 200),
    ...(params.exdrDescription || expressType === "DR" || expressType === "EX"
      ? { exdrDescription: resolvedExdrDescription || "Giftisan Return/Exchange" }
      : {}),
    sender: {
      name: senderFullName,
      mobile: senderPhone,
      phone: senderPhone,
      countryCode: "EGY",
      prov: senderProv,
      city: senderCity,
      area: senderArea,
      street: senderAddress || senderArea || senderCity,
      address: senderAddress,
    },
    receiver: {
      name: receiverFullName,
      mobile: params.receiver.phone,
      phone: params.receiver.phone,
      countryCode: "EGY",
      prov: receiverProv,
      city: receiverCity,
      area: receiverArea,
      street: fullReceiverAddress || receiverArea || receiverCity,
      address: fullReceiverAddress,
    },
    items: itemsList,
  };

  const data = await postJtRequest(
    "/webopenplatformapi/api/order/addOrder",
    bizPayload
  );

  const billCode =
    data.data?.billCode ||
    data.data?.waybillNo ||
    data.billCode ||
    "";

  return {
    deliveryId: data.data?.txlogisticId || params.txlogisticId,
    trackingNumber: billCode,
    sortingCode: data.data?.sortingCode || "",
    state: "Created",
    raw: data,
  };
}

/**
 * 2. Order Query (`orderserve/query`)
 * Endpoint: POST /webopenplatformapi/api/order/getOrders
 */
export async function queryJtOrders(
  serialNumbers: string | string[],
  command: number = 1
) {
  const list = Array.isArray(serialNumbers) ? serialNumbers : [serialNumbers];
  return postJtRequest("/webopenplatformapi/api/order/getOrders", {
    command,
    serialNumber: list,
  });
}

/**
 * 3. Cancel Order (`orderserve/cancel`)
 * Endpoint: POST /webopenplatformapi/api/order/cancelOrder
 * Note: orderType: 1 means cancel by customer order number (txlogisticId).
 */
export async function cancelJtOrder(
  txlogisticId: string,
  reason: string = "Customer cancelled order",
  orderType: number = 1,
  billCode?: string
) {
  const payload: Record<string, any> = {
    orderType,
    txlogisticId,
    reason,
  };
  if (billCode) {
    payload.billCode = billCode;
  }
  return postJtRequest("/webopenplatformapi/api/order/cancelOrder", payload);
}

/**
 * 4. Express / Trajectory Query (`orderserve/expressquery`)
 * Endpoint: POST /webopenplatformapi/api/logistics/trace
 */
export async function getJtTracking(billCodes: string | string[]) {
  const codesStr = Array.isArray(billCodes) ? billCodes.join(",") : billCodes;
  return postJtRequest("/webopenplatformapi/api/logistics/trace", {
    billCodes: codesStr,
  });
}

/**
 * 5. Waybill Model Query / Print Order (`orderserve/waybillInformation`)
 * Endpoint: POST /webopenplatformapi/api/order/printOrder
 */
export async function getJtWaybill(
  billCode: string,
  printSize: number = 0,
  printCod: number = 0
) {
  return postJtRequest("/webopenplatformapi/api/order/printOrder", {
    billCode,
    printSize,
    printCod,
  });
}

/**
 * 6. Delivery Time / Waybill Aging Inquiry
 * Endpoint: POST /webopenplatformapi/api/waybill/getWaybillInfo
 */
export async function getJtWaybillInfo(params: {
  waybillNo?: string;
  billCode?: string;
  sendStartTime?: string;
  [key: string]: any;
}) {
  return postJtRequest("/webopenplatformapi/api/waybill/getWaybillInfo", params);
}

/**
 * 7. Logistics Track Subscription
 * Endpoint: POST /webopenplatformapi/api/trace/subscribe
 */
export async function subscribeJtTracking(params: {
  billCode?: string;
  trackingNumber?: string;
  url?: string;
  callBackUrl?: string;
  [key: string]: any;
}) {
  return postJtRequest("/webopenplatformapi/api/trace/subscribe", params);
}

/**
 * 8. Three-Segment Code / Routing Code Query
 * Endpoint: POST /webopenplatformapi/api/threeCode/getThreeSegmentCode
 */
export async function getJtThreeSegmentCode(params: {
  txlogisticId?: string;
  sender?: Record<string, any>;
  receiver?: Record<string, any>;
  [key: string]: any;
}) {
  return postJtRequest(
    "/webopenplatformapi/api/threeCode/getThreeSegmentCode",
    params
  );
}

/**
 * Helper to check if a J&T scan status or trace response indicates package delivery
 */
export function isJtStatusDelivered(statusOrScanType: any): boolean {
  if (!statusOrScanType) return false;
  const s = String(statusOrScanType).toLowerCase().trim();
  if (!s) return false;

  // Exclude in-transit, out-for-delivery, and failed/undelivered scan descriptions
  // before checking delivery terms so "Out for delivery" never marks an order DELIVERED.
  if (
    s.includes("out for delivery") ||
    s.includes("not delivered") ||
    s.includes("undelivered") ||
    s.includes("un-delivered") ||
    s.includes("unable to deliver") ||
    s.includes("delivery attempt") ||
    s.includes("delivery failed") ||
    s.includes("failed delivery") ||
    s.includes("delivery station") ||
    s.includes("delivery center") ||
    s.includes("delivery hub") ||
    s.includes("delivery branch") ||
    s.includes("ready for delivery") ||
    s.includes("to be delivered") ||
    s.includes("خرج للتوصيل") ||
    s.includes("جاري التوصيل") ||
    s.includes("لم يتم التوصيل") ||
    s.includes("فشل التوصيل") ||
    s.includes("تعذر التوصيل")
  ) {
    return false;
  }

  return (
    s === "delivered" ||
    s === "100" ||
    /\bdelivered\b/.test(s) ||
    /(?:^|\b)(?:signed|sign)(?:\b|$)/.test(s) ||
    s.includes("签收") ||
    s.includes("تم التوصيل") ||
    s.includes("تم التسليم")
  );
}

/**
 * Helper to check if a J&T scan status or trace response indicates out-for-delivery
 */
export function isJtStatusOutForDelivery(statusOrScanType: any): boolean {
  if (!statusOrScanType || isJtStatusDelivered(statusOrScanType)) return false;
  const s = String(statusOrScanType).toLowerCase().trim();
  return (
    s.includes("dispatch") ||
    s.includes("out for delivery") ||
    s.includes("خرج للتوصيل") ||
    s.includes("جاري التوصيل") ||
    s.includes("مع المندوب") ||
    s.includes("派件")
  );
}

export interface JtTraceEvent {
  time: string;
  scanType: string;
  desc: string;
  location: string;
}

export interface JtParcelTrace {
  billCode: string;
  status: "DELIVERED" | "OUT_FOR_DELIVERY" | "SHIPPED";
  delivered: boolean;
  outForDelivery: boolean;
  latestScanType: string;
  latestDesc: string;
  latestTime: string;
  events: JtTraceEvent[];
}

export function normalizeJtTraceResponse(billCode: string, traceRes: any): JtParcelTrace {
  const traceData = Array.isArray(traceRes?.data)
    ? traceRes.data.find((entry: any) => entry?.billCode === billCode) || traceRes.data[0]
    : traceRes?.data;
  const rawDetails: any[] = Array.isArray(traceData?.details)
    ? traceData.details
    : Array.isArray(traceRes?.details)
      ? traceRes.details
      : [];

  const events: JtTraceEvent[] = rawDetails.map((detail: any) => ({
    time: String(detail?.scanTime || detail?.time || ""),
    scanType: String(detail?.scanType || detail?.scanTypeName || detail?.status || ""),
    desc: String(detail?.desc || detail?.scandesc || detail?.scanTypeName || detail?.scanType || ""),
    location: [detail?.scanNetworkCity, detail?.scanNetworkProvince, detail?.scanNetworkName]
      .map((part: any) => (typeof part === "string" ? part.trim() : ""))
      .filter((part: string, idx: number, arr: string[]) => part.length > 0 && arr.indexOf(part) === idx)
      .join(" - "),
  }));

  if (events.length > 1) {
    const firstMs = Date.parse(events[0].time);
    const lastMs = Date.parse(events[events.length - 1].time);
    if (!Number.isNaN(firstMs) && !Number.isNaN(lastMs) && firstMs < lastMs) {
      events.reverse();
    }
  }

  const latest = events[0];
  const delivered =
    rawDetails.some((detail: any) =>
      [detail?.scanType, detail?.status, detail?.desc, detail?.scandesc, detail?.scanTypeName].some(isJtStatusDelivered)
    );
  const outForDelivery =
    !delivered &&
    Boolean(
      latest && [latest.scanType, latest.desc].some(isJtStatusOutForDelivery)
    );

  return {
    billCode,
    status: delivered ? "DELIVERED" : outForDelivery ? "OUT_FOR_DELIVERY" : "SHIPPED",
    delivered,
    outForDelivery,
    latestScanType: latest?.scanType || "",
    latestDesc: latest?.desc || "",
    latestTime: latest?.time || "",
    events,
  };
}

export async function getJtParcelTraces(billCodes: string[]): Promise<JtParcelTrace[]> {
  const uniqueCodes = Array.from(new Set(billCodes.map((code) => code.trim()).filter(Boolean)));
  if (uniqueCodes.length === 0 || !isJtConfigured()) {
    return [];
  }

  const settled = await Promise.allSettled(
    uniqueCodes.map(async (billCode) => {
      const traceRes = await getJtTracking(billCode);
      return normalizeJtTraceResponse(billCode, traceRes);
    })
  );

  return settled.map((result, idx) =>
    result.status === "fulfilled"
      ? result.value
      : {
          billCode: uniqueCodes[idx],
          status: "SHIPPED" as const,
          delivered: false,
          outForDelivery: false,
          latestScanType: "",
          latestDesc: "",
          latestTime: "",
          events: [],
        }
  );
}

