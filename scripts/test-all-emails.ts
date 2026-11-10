import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

// Enable live sending through Resend
process.env.FORCE_SEND_EMAIL = "true";

import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendArtisanApprovalEmail,
  sendOrderNotification,
  sendBuyerOrderReceiptEmail,
  sendOrderStatusUpdateEmail,
  sendProductStatusUpdateEmail,
  sendPayoutApprovedEmail,
  sendPayoutDeclinedEmail,
  sendMessageNotification,
  sendInquiryNotification,
  sendArtisanOutreachEmail,
  SUPPORT_INBOX
} from "../src/lib/mail";

async function main() {
  const targetEmail = process.argv[2] || "hazemyasserprg@gmail.com";
  console.log(`\n🚀 Starting email suite test sending to: ${targetEmail} ...\n`);

  try {
    console.log("1. Sending Welcome Email...");
    await sendWelcomeEmail(targetEmail, "Hazem", "en");

    console.log("2. Sending Verification Email...");
    await sendVerificationEmail(targetEmail, "test-verification-token-xyz", "en");

    console.log("3. Sending Password Reset Email...");
    await sendPasswordResetEmail(targetEmail, "test-reset-token-xyz", "en");

    console.log("4. Sending Artisan Approval Email (English)...");
    await sendArtisanApprovalEmail(targetEmail, "Hazem Workshop", "en");

    console.log("5. Sending Artisan New Sale Notification...");
    await sendOrderNotification(targetEmail, "Hazem Studio", "ord_test_88219482", 1850, "en");

    console.log("6. Sending Buyer Order Receipt...");
    await sendBuyerOrderReceiptEmail(
      targetEmail,
      "Hazem (Collector)",
      "ord_test_88219482",
      1850,
      [
        { name: "Handcrafted Alabaster Vase", quantity: 1, price: 1200 },
        { name: "Nubian Clay Incense Burner", quantity: 1, price: 650 }
      ],
      "Cairo, New Cairo",
      "en"
    );

    console.log("7. Sending Order Status Update (Shipped with Tracking)...");
    await sendOrderStatusUpdateEmail(
      targetEmail,
      "Hazem",
      "ord_test_88219482",
      "SHIPPED",
      "Handcrafted Alabaster Vase",
      "handcrafted-alabaster-vase",
      "JEG000578454257",
      "J&T Express",
      "en"
    );

    console.log("8. Sending Order Status Update (Delivered & Review Request)...");
    await sendOrderStatusUpdateEmail(
      targetEmail,
      "Hazem",
      "ord_test_88219482",
      "DELIVERED",
      "Handcrafted Alabaster Vase",
      "handcrafted-alabaster-vase",
      undefined,
      undefined,
      "en"
    );

    console.log("9. Sending Product Approval Notification...");
    await sendProductStatusUpdateEmail(targetEmail, "Hazem", "Handmade Brass Lantern", "APPROVED", undefined, "en");

    console.log("10. Sending Payout Approved Notification...");
    await sendPayoutApprovedEmail(targetEmail, "Hazem", 4500, "INSTAPAY", "hazem@instapay", "en");

    console.log("11. Sending Direct Message Notification...");
    await sendMessageNotification(targetEmail, "Hazem", "Sarah Curator", "en");

    console.log("\n🎉 ALL TEST EMAILS SENT SUCCESSFULLY via Resend!\nCheck your inbox at: " + targetEmail + "\n");
  } catch (error) {
    console.error("❌ Error while sending test emails:", error);
  }
}

main();
