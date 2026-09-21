import crypto from "node:crypto";
import { Router } from "express";
import Razorpay from "razorpay";
import orderModel from "../models/order.js";
import redisClient from "../config/redis.js";
import printer from "pdf-to-printer";
import fs from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

const router = Router();
const { print, getDefaultPrinter } = printer;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
async function printDoc(file_path, range, copies) {
  try {
    // Implementation for printing document
    console.log(`Printing document: ${file_path}`);
    // Add your actual printing logic here
    const defaultPrinter = await getDefaultPrinter();
    console.log(`Default printer: ${defaultPrinter}`);
    await print(file_path, {
      pages: range,
      copies: copies,
      paperSize: "A4",
    });
    console.log(`Document printed: ${file_path}`);
    await orderModel.updateOne({ file_path }, { print_status: "printed" });
    await redisClient.del(`order:${file_path}`);
  } catch (error) {
    console.error(`Error printing document: ${file_path}`, error);
    await orderModel.updateOne({ file_path }, { print_status: "error" });
  }
}

router.post("/create", async (req, res) => {
  try {
    const { filePath, currency = "INR", receipt, notes } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }

    const dataBuffer = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(dataBuffer);
    const numPages = pdf.getPageCount();
    const amount = numPages * 1000;

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: "PDF must contain at least one page" });
    }

    const paymentOrder = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes,
    });

    res.status(201).json(paymentOrder);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id: paymentOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      file_path: filePath,
      user_id: userId,
      range,
      copies,
      color
    } = req.body;

    if (!paymentOrderId || !paymentId || !signature || !filePath || !userId) {
      return res
        .status(400)
        .json({ error: "payment and print details are required" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${paymentOrderId}|${paymentId}`)
      .digest("hex");

    const receivedSignature = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    const signaturesMatch =
      receivedSignature.length === expectedSignatureBuffer.length &&
      crypto.timingSafeEqual(receivedSignature, expectedSignatureBuffer);

    if (!signaturesMatch) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const dataBuffer = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(dataBuffer);
    const numPages = pdf.getPageCount();
    const amount = numPages * 1000;
    const order = await orderModel.create({
      order_by: userId,
      file_path: filePath,
      pages: numPages,
      range: range || `1-${numPages}`,
      color: color || "black",
      copies: copies || 1,
      print_status: "pending",
      payment_order_id: paymentOrderId,
      payment_id: paymentId,
    });

    await redisClient.set(
      `order:${filePath}`,
      JSON.stringify({ file_path: filePath, user_id: userId }),
      "EX",
      3600,
    );
    
    await printDoc(filePath, range, copies);
    res
      .status(201)
      .json({ message: "Payment verified and print queued", order });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/get/:file_path", async (req, res) => {
  try {
    const { file_path } = req.params;
    const order = await orderModel.findOne({ file_path });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/getall/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const order = await orderModel.find({ user_id });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
