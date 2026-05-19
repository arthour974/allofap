import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function verifyShopifyWebhook(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: "SHOPIFY_WEBHOOK_SECRET is not configured" });
    return;
  }

  const hmacHeader = req.headers["x-shopify-hmac-sha256"];
  const hmacSign = Array.isArray(hmacHeader) ? hmacHeader[0] : hmacHeader;
  if (!hmacSign) {
    res.status(401).json({ error: "Missing Shopify HMAC signature" });
    return;
  }

  const rawBody = req.rawBody;
  if (!rawBody?.length) {
    res.status(400).json({ error: "Missing request body" });
    return;
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(hmacSign, "utf8");

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  next();
}
