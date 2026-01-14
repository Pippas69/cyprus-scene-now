import type jsPDF from "jspdf";
import notoSansUrl from "@/assets/fonts/NotoSans-Regular.ttf";

let cachedBase64Promise: Promise<string> | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
};

const getNotoSansBase64 = async (): Promise<string> => {
  if (!cachedBase64Promise) {
    cachedBase64Promise = fetch(notoSansUrl)
      .then((r) => r.arrayBuffer())
      .then(arrayBufferToBase64);
  }

  return cachedBase64Promise;
};

export const ensureNotoSansFont = async (doc: jsPDF) => {
  const base64 = await getNotoSansBase64();
  // Register font into the document VFS
  doc.addFileToVFS("NotoSans-Regular.ttf", base64);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.setFont("NotoSans", "normal");
};
