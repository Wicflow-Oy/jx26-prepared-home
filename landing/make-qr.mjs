// Writes landing/qr.svg for the public app URL. Run again if the hostname changes:
//   npm run qr -- https://<host>/app/
import { writeFile } from "node:fs/promises";
import QRCode from "qrcode";

const url = process.argv[2] ?? "https://preparedhome.demo.wicflow.com/app/";
const svg = await QRCode.toString(url, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 2,
  color: { dark: "#331E11", light: "#FFFFFF" },
});
await writeFile(new URL("./qr.svg", import.meta.url), svg);
console.log(`landing/qr.svg -> ${url}`);
