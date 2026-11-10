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
  deliveryType?: string; // "03": Home delivery, "04": Station pickup
  payType?: string; // "PP_PM" (Monthly), "PP_CASH" (Cash), "CC_CASH" (Collect)
  goodsType?: string; // "ITN1" or "bm000006"
  weight?: number; // Weight in KG
  cod?: number; // Cash on Delivery amount in EGP (0 for prepaid)
  receiver: JtParty;
  dropOffAddress: JtAddress;
  sender?: JtParty;
  pickupAddress?: JtAddress;
  notes?: string;
  itemsCount?: number;
  description?: string;
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

function assertJtConfigured() {
  if (!JT_API_ACCOUNT || !JT_PRIVATE_KEY || !JT_CUSTOMER_CODE) {
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

  const response = await fetch(`${JT_BASE_URL}${endpointPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      apiAccount: JT_API_ACCOUNT,
      digest: headerDigest,
      timestamp,
    },
    body: body.toString(),
  });

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
  const totalQuantity = Math.max(1, Number(params.itemsCount || 1));
  const itemDesc =
    (params.description || "Giftisan Handmade Items").slice(0, 100);

  const itemsList =
    params.items && params.items.length > 0
      ? params.items.map((i) => ({
          itemName: i.itemName.slice(0, 80),
          number: i.number,
          itemType: i.itemType || "ITN1",
          priceCurrency: i.priceCurrency || "EGP",
          itemValue: String(i.itemValue ?? 0),
          desc: (i.desc || i.itemName).slice(0, 100),
        }))
      : [
          {
            itemName: itemDesc,
            number: totalQuantity,
            itemType: "ITN1",
            priceCurrency: "EGP",
            itemValue: String(codAmount),
            desc: itemDesc,
          },
        ];

  const bizPayload: Record<string, any> = {
    operateType: 1,
    txlogisticId: params.txlogisticId,
    expressType: params.expressType || "EZ",
    orderType: params.orderType || "2",
    serviceType: params.serviceType || "01",
    deliveryType: params.deliveryType || "04",
    payType: params.payType || "PP_PM",
    goodsType: params.goodsType || "ITN1",
    weight: Number(params.weight || 0.5),
    totalQuantity,
    priceCurrency: "EGP",
    itemsValue: codAmount,
    remark: (params.notes || "").slice(0, 200),
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
 */
export async function cancelJtOrder(
  txlogisticId: string,
  reason: string = "Customer cancelled order",
  orderType: string = "2"
) {
  return postJtRequest("/webopenplatformapi/api/order/cancelOrder", {
    orderType,
    txlogisticId,
    reason,
  });
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
  return (
    s === "delivered" ||
    s.includes("deliver") ||
    s.includes("sign") ||
    s === "100" ||
    s.includes("تم التوصيل") ||
    s.includes("تم التسليم")
  );
}

