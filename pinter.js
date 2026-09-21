import { getPrinters } from "pdf-to-printer";

const printers = await getPrinters();
console.log(printers);