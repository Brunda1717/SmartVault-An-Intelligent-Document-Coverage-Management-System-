// frontend/src/utils/readDocument.js
//
// Turns an uploaded photo / scan / PDF into plain text, entirely inside the browser.
//   - Photos: shrunk (or enlarged) to a good OCR size, contrast-boosted, read by Tesseract.js
//   - Digital PDFs: text is taken straight from the PDF (fast and exact)
//   - Scanned PDFs: first 2 pages are drawn to an image and read by Tesseract.js
//
// Returns { text, attachment, preview, kind, warning }
//   attachment = the file to store with the coverage (photos are compressed under the 5 MB limit)

const MAX_ATTACH_BYTES = 5 * 1024 * 1024;

/* ---------------- images ---------------- */

async function loadImage(file) {
    if (window.createImageBitmap) {
        try {
            return await createImageBitmap(file, { imageOrientation: "from-image" });
        } catch {
            /* fall back to <img> below */
        }
    }
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not open this image"));
        img.src = url;
    });
}

// Scale to a size OCR likes: not huge (slow), not tiny (unreadable)
function toCanvas(src) {
    const longest = Math.max(src.width, src.height);
    let scale = 1;
    if (longest > 2200) scale = 2200 / longest;
    else if (longest < 1200) scale = Math.min(2.5, 1600 / longest);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(src.width * scale);
    canvas.height = Math.round(src.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    return canvas;
}

// Grayscale + stretch contrast so faint / unevenly lit photos read better
function enhanceForOcr(src) {
    const canvas = document.createElement("canvas");
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(src, 0, 0);

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    const hist = new Uint32Array(256);

    for (let i = 0; i < d.length; i += 4) {
        const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        d[i] = d[i + 1] = d[i + 2] = g;
        hist[g]++;
    }

    const total = d.length / 4;
    let lo = 0, hi = 255, acc = 0;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > total * 0.01) { lo = i; break; } }
    acc = 0;
    for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > total * 0.01) { hi = i; break; } }
    const range = Math.max(1, hi - lo);

    for (let i = 0; i < d.length; i += 4) {
        const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / range));
        d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

const canvasToJpegFile = (canvas, name) =>
    new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) => (blob ? resolve(new File([blob], name, { type: "image/jpeg" })) : reject(new Error("Could not compress image"))),
            "image/jpeg",
            0.88
        )
    );

/* ---------------- OCR ---------------- */

const STATUS_TEXT = {
    "loading tesseract core": "Starting the reader…",
    "initializing tesseract": "Starting the reader…",
    "loading language traineddata": "Downloading language data (first time only)…",
    "loaded language traineddata": "Getting ready…",
    "initializing api": "Getting ready…",
};

async function ocr(canvases, onProgress) {
    const { createWorker } = await import("tesseract.js");
    let pageIndex = 0;

    const worker = await createWorker("eng", 1, {
        logger: (m) => {
            if (m.status === "recognizing text") {
                const done = (pageIndex + m.progress) / canvases.length;
                onProgress({ percent: Math.round(25 + done * 75), message: "Reading your document…" });
            } else if (STATUS_TEXT[m.status]) {
                onProgress({ percent: Math.round(5 + (m.progress || 0) * 20), message: STATUS_TEXT[m.status] });
            }
        },
    });

    try {
        let text = "";
        for (pageIndex = 0; pageIndex < canvases.length; pageIndex++) {
            const { data } = await worker.recognize(canvases[pageIndex]);
            text += (data.text || "") + "\n";
        }
        return text;
    } finally {
        await worker.terminate();
    }
}

async function readImage(file, onProgress) {
    onProgress({ percent: 2, message: "Preparing the image…" });
    const src = await loadImage(file);
    const canvas = toCanvas(src);
    const attachment = await canvasToJpegFile(canvas, file.name.replace(/\.[^.]+$/, "") + ".jpg");
    const text = await ocr([enhanceForOcr(canvas)], onProgress);

    return {
        text,
        attachment,
        preview: URL.createObjectURL(attachment),
        kind: "image",
        warning: attachment.size > MAX_ATTACH_BYTES ? "The photo is larger than 5 MB, so it could not be attached." : "",
    };
}

/* ---------------- PDF ---------------- */

// Rebuild readable lines from pdf.js text items
export function pdfItemsToText(items) {
    let out = "";
    let lastY = null;
    for (const it of items) {
        if (!("str" in it)) continue;
        const y = it.transform ? it.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 3 && !out.endsWith("\n")) out += "\n";
        out += it.str + (it.hasEOL ? "\n" : " ");
        if (y !== null) lastY = y;
    }
    return out;
}

async function readPdf(file, onProgress) {
    onProgress({ percent: 3, message: "Opening the PDF…" });
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;

    // 1) digital PDF: read the text layer directly
    let text = "";
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += pdfItemsToText(content.items) + "\n";
    }

    // 2) scanned PDF (no text layer): draw the first 2 pages and OCR them
    if (text.replace(/\s/g, "").length < 60) {
        const canvases = [];
        for (let i = 1; i <= Math.min(pdf.numPages, 2); i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext("2d"), canvas, viewport }).promise;
            canvases.push(enhanceForOcr(canvas));
        }
        text = await ocr(canvases, onProgress);
    }

    const tooBig = file.size > MAX_ATTACH_BYTES;
    return {
        text,
        attachment: tooBig ? null : file,
        preview: null,
        kind: "pdf",
        warning: tooBig ? "This PDF is larger than 5 MB, so it could not be attached. The details were still read." : "",
    };
}

/* ---------------- public ---------------- */

export async function readDocument(file, onProgress = () => {}) {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    return isPdf ? readPdf(file, onProgress) : readImage(file, onProgress);
}