import { runPaymentAutomation } from "./paymentLifecycle.js";

let schedulerTimer = null;
const DEFAULT_INTERVAL_MS = Number.parseInt(process.env.PAYMENT_SWEEP_INTERVAL_MS || "300000", 10);

export const startPaymentScheduler = () => {
  if (schedulerTimer) {
    return;
  }

  schedulerTimer = setInterval(async () => {
    try {
      await runPaymentAutomation();
    } catch (error) {
      console.error("Payment scheduler failed:", error.message);
    }
  }, DEFAULT_INTERVAL_MS);

  runPaymentAutomation().catch((error) => {
    console.error("Initial payment automation run failed:", error.message);
  });

  console.log(`Payment scheduler started. Interval: ${DEFAULT_INTERVAL_MS}ms`);
};
