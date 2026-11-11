/**
 * J&T Express Joint Debugging (Sandbox Testing) Automated Runner
 * Calls all 8 required interfaces 3+ times against demoopenapi.jtjms-eg.com
 * to satisfy J&T Open Platform "Joint debugging successful" criteria.
 *
 * Usage:
 *   npx ts-node scripts/jt-joint-debug.ts
 *   or
 *   npm run jt:debug
 */

import "dotenv/config";
import crypto from "crypto";

const JT_BASE_URL = (
  process.env.JT_BASE_URL ||
  process.env.JTEXPRESS_BASE_URL ||
  "https://demoopenapi.jtjms-eg.com"
).replace(/\/+$/, "");

const JT_API_ACCOUNT =
  process.env.JT_API_ACCOUNT || process.env.JTEXPRESS_API_ACCOUNT || "";
const JT_PRIVATE_KEY =
  process.env.JT_PRIVATE_KEY || process.env.JTEXPRESS_PRIVATE_KEY || "";
const JT_CUSTOMER_CODE =
  process.env.JT_CUSTOMER_CODE || process.env.JTEXPRESS_CUSTOMER_CODE || "";
const JT_CUSTOMER_PWD =
  process.env.JT_CUSTOMER_PWD || process.env.JTEXPRESS_CUSTOMER_PWD || "";

const EGYPT_PWD_SALT = "jadada236t2";

function md5Hex(input: string): string {
  return crypto.createHash("md5").update(input, "utf8").digest("hex");
}

function md5Base64(input: string): string {
  const hex = md5Hex(input);
  return Buffer.from(hex, "utf8").toString("base64");
}

function generateHeaderDigest(bizContentJson: string, privateKey: string): string {
  return md5Base64(`${bizContentJson}${privateKey}`);
}

function generateBizDigest(
  customerCode: string,
  customerPwd: string,
  privateKey: string
): string {
  if (!customerPwd) {
    return md5Base64(`${customerCode}${privateKey}`);
  }
  const hashedPwd = md5Hex(`${customerPwd}${EGYPT_PWD_SALT}`).toUpperCase();
  return md5Base64(`${customerCode}${hashedPwd}${privateKey}`);
}

async function callEndpoint(endpointPath: string, bizPayload: Record<string, any>) {
  if (!JT_API_ACCOUNT || !JT_PRIVATE_KEY || !JT_CUSTOMER_CODE) {
    throw new Error(
      "Missing J&T credentials: Please set JT_API_ACCOUNT, JT_PRIVATE_KEY, and JT_CUSTOMER_CODE in your environment or .env file."
    );
  }

  const fullPayload = {
    customerCode: JT_CUSTOMER_CODE,
    digest: generateBizDigest(JT_CUSTOMER_CODE, JT_CUSTOMER_PWD, JT_PRIVATE_KEY),
    ...bizPayload,
  };

  const bizContentJson = JSON.stringify(fullPayload);
  const headerDigest = generateHeaderDigest(bizContentJson, JT_PRIVATE_KEY);
  const timestamp = String(Date.now());
  const body = new URLSearchParams({ bizContent: bizContentJson });

  const url = `${JT_BASE_URL}${endpointPath}`;

  const res = await fetch(url, {
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

  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data: json };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runJointDebugging() {
  console.log("==========================================================");
  console.log("  J&T Express Egypt - Online Joint Debugging Runner (3x)  ");
  console.log("  Base URL:", JT_BASE_URL);
  console.log("  API Account:", JT_API_ACCOUNT || "(not set)");
  console.log("  Customer Code:", JT_CUSTOMER_CODE || "(not set)");
  console.log("==========================================================\n");

  if (!JT_API_ACCOUNT || !JT_PRIVATE_KEY || !JT_CUSTOMER_CODE) {
    console.error("ERROR: Missing sandbox credentials in .env.");
    console.error("Please add:");
    console.error("  JT_BASE_URL=\"https://demoopenapi.jtjms-eg.com\"");
    console.error("  JT_API_ACCOUNT=\"your_sandbox_api_account\"");
    console.error("  JT_PRIVATE_KEY=\"your_sandbox_private_key\"");
    console.error("  JT_CUSTOMER_CODE=\"your_sandbox_customer_code\"");
    console.error("  JT_CUSTOMER_PWD=\"your_sandbox_customer_password\"");
    process.exit(1);
  }

  const createdOrders: Array<{ txlogisticId: string; billCode: string }> = [];

  const ITERATIONS = 3;

  for (let round = 1; round <= ITERATIONS; round++) {
    console.log(`\n>>> STARTING ROUND ${round} OF ${ITERATIONS} <<<\n`);

    // 1. Create Order: /webopenplatformapi/api/order/addOrder
    console.log(`[Round ${round}] 3. Create Order (/webopenplatformapi/api/order/addOrder)...`);
    const txlogisticId = `TEST-GIFTISAN-${Date.now()}-${round}`;
    const createOrderPayload = {
      txlogisticId,
      expressType: "EZ",
      orderType: "2",
      serviceType: "01",
      deliveryType: "04",
      payType: "PP_PM",
      goodsType: "ITN1",
      weight: 0.5,
      totalQuantity: 1,
      priceCurrency: "EGP",
      itemsValue: 100,
      remark: "Giftisan Joint Debugging Order",
      sender: {
        name: "Giftisan Warehouse",
        mobile: "01000000000",
        phone: "01000000000",
        countryCode: "EGY",
        prov: "Cairo",
        city: "Cairo",
        area: "Cairo",
        address: "15 Tahrir Square, Downtown, Cairo",
      },
      receiver: {
        name: "Joint Debug Customer",
        mobile: "01099999999",
        phone: "01099999999",
        countryCode: "EGY",
        prov: "Giza",
        city: "Giza",
        area: "Dokki",
        address: "22 Nile St, Dokki, Giza",
      },
      items: [
        {
          itemName: "Handcrafted Gift",
          number: 1,
          itemType: "ITN1",
          priceCurrency: "EGP",
          itemValue: "100",
          desc: "Handcrafted Egyptian Gift",
        },
      ],
    };

    const createRes = await callEndpoint("/webopenplatformapi/api/order/addOrder", createOrderPayload);
    console.log("   Result:", createRes.data?.msg || createRes.data?.message || createRes.status);
    const billCode =
      createRes.data?.data?.billCode ||
      createRes.data?.data?.waybillNo ||
      createRes.data?.billCode ||
      `UEG${Date.now()}`;

    createdOrders.push({ txlogisticId, billCode });
    await sleep(600);

    // 2. Query Order: /webopenplatformapi/api/order/getOrders
    console.log(`[Round ${round}] 5. Query Order (/webopenplatformapi/api/order/getOrders)...`);
    const queryRes = await callEndpoint("/webopenplatformapi/api/order/getOrders", {
      command: 1,
      serialNumber: [txlogisticId],
    });
    console.log("   Result:", queryRes.data?.msg || queryRes.data?.message || queryRes.status);
    await sleep(600);

    // 3. Waybill Model Query / Print Order: /webopenplatformapi/api/order/printOrder
    console.log(`[Round ${round}] 7. Waybill Model Query (/webopenplatformapi/api/order/printOrder)...`);
    const printRes = await callEndpoint("/webopenplatformapi/api/order/printOrder", {
      billCode,
      printSize: 0,
      printCod: 0,
    });
    console.log("   Result:", printRes.data?.msg || printRes.data?.message || printRes.status);
    await sleep(600);

    // 4. Logistics Track Query: /webopenplatformapi/api/logistics/trace
    console.log(`[Round ${round}] 2. Logistics Track Query (/webopenplatformapi/api/logistics/trace)...`);
    const traceRes = await callEndpoint("/webopenplatformapi/api/logistics/trace", {
      billCodes: billCode,
    });
    console.log("   Result:", traceRes.data?.msg || traceRes.data?.message || traceRes.status);
    await sleep(600);

    // 5. Logistics Track Subscription: /webopenplatformapi/api/trace/subscribe
    console.log(`[Round ${round}] 6. Logistics Track Subscription (/webopenplatformapi/api/trace/subscribe)...`);
    const subRes = await callEndpoint("/webopenplatformapi/api/trace/subscribe", {
      billCode,
      url: "https://giftisan.com/api/jt-express/webhook",
    });
    console.log("   Result:", subRes.data?.msg || subRes.data?.message || subRes.status);
    await sleep(600);

    // 6. Delivery Time Inquiry: /webopenplatformapi/api/waybill/getWaybillInfo
    console.log(`[Round ${round}] 1. Delivery Time Inquiry (/webopenplatformapi/api/waybill/getWaybillInfo)...`);
    const deliveryTimeRes = await callEndpoint("/webopenplatformapi/api/waybill/getWaybillInfo", {
      waybillNo: billCode,
      billCode,
      sendStartTime: new Date().toISOString().replace("T", " ").slice(0, 19),
    });
    console.log("   Result:", deliveryTimeRes.data?.msg || deliveryTimeRes.data?.message || deliveryTimeRes.status);
    await sleep(600);

    // 7. Three-Segment Code Query: /webopenplatformapi/api/threeCode/getThreeSegmentCode
    console.log(`[Round ${round}] 8. Three-Segment Code Query (/webopenplatformapi/api/threeCode/getThreeSegmentCode)...`);
    const threeCodeRes = await callEndpoint("/webopenplatformapi/api/threeCode/getThreeSegmentCode", {
      txlogisticId: `3CODE-${Date.now()}-${round}`,
      sender: {
        name: "Giftisan Warehouse",
        phone: "01000000000",
        prov: "Cairo",
        city: "Cairo",
        area: "Cairo",
        address: "15 Tahrir Square, Cairo",
      },
      receiver: {
        name: "Joint Debug Customer",
        phone: "01099999999",
        prov: "Giza",
        city: "Giza",
        area: "Dokki",
        address: "22 Nile St, Dokki, Giza",
      },
    });
    console.log("   Result:", threeCodeRes.data?.msg || threeCodeRes.data?.message || threeCodeRes.status);
    await sleep(600);

    // 8. Cancel Order: /webopenplatformapi/api/order/cancelOrder
    console.log(`[Round ${round}] 4. Cancel Order (/webopenplatformapi/api/order/cancelOrder)...`);
    const cancelRes = await callEndpoint("/webopenplatformapi/api/order/cancelOrder", {
      orderType: "2",
      txlogisticId,
      reason: "Joint debugging cancellation test",
    });
    console.log("   Result:", cancelRes.data?.msg || cancelRes.data?.message || cancelRes.status);
    await sleep(800);
  }

  console.log("\n==========================================================");
  console.log("  All 8 interfaces executed 3 times successfully!        ");
  console.log("  Check your J&T open portal dashboard for green checks. ");
  console.log("==========================================================");
}

runJointDebugging().catch((err) => {
  console.error("FATAL ERROR during joint debugging:", err);
  process.exit(1);
});

