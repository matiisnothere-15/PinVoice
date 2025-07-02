import * as functions from "firebase-functions";
import * as admin from "firebase-admin"; // For some potential future use, not strictly needed for proxy
import axios from "axios";
import * as Busboy from "busboy";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

admin.initializeApp();

const OPENAI_API_KEY = functions.config().openai?.key;
const OPENAI_BASE_URL = "https://api.openai.com/v1";

if (!OPENAI_API_KEY) {
  console.error(
    "OpenAI API key is not configured. " +
    "Run 'firebase functions:config:set openai.key=\"YOUR_KEY\"' " +
    "and deploy again."
  );
}

/**
 * Proxies audio transcription requests to OpenAI Whisper API.
 * Expects a multipart/form-data request with 'file' (audio) and 'model'.
 */
export const proxyTranscribeAudio = functions
  .runWith({
    // Adjust memory and timeout as needed for audio files
    memory: "1GB",
    timeoutSeconds: 120,
  })
  .https.onRequest(async (request, response) => {
    if (!OPENAI_API_KEY) {
      response.status(500).send("Server configuration error: Missing API key.");
      return;
    }
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    // CORS handling - adjust origin for production
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "POST");
    response.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization" // Authorization might not be needed if not validating app requests to CF
    );

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    const busboy = Busboy({ headers: request.headers });
    const tmpdir = os.tmpdir();
    const fields: { [key: string]: string } = {};
    const fileWrites: Promise<any>[] = [];
    let fileToUploadPath: string | null = null;
    let originalFileName = "audio.m4a"; // Default

    busboy.on("field", (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on("file", (fieldname, file, filenameInfo) => {
      // Use filenameInfo.filename for the original file name if available
      originalFileName = filenameInfo.filename || originalFileName;
      const filepath = path.join(tmpdir, originalFileName);
      fileToUploadPath = filepath;

      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);

      const promise = new Promise((resolve, reject) => {
        file.on("end", () => {
          writeStream.end();
        });
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
      fileWrites.push(promise);
    });

    busboy.on("finish", async () => {
      try {
        await Promise.all(fileWrites);

        if (!fileToUploadPath) {
          response.status(400).send("No file uploaded.");
          return;
        }

        const formData = new FormData();
        const stats = fs.statSync(fileToUploadPath);
        const fileSizeInBytes = stats.size;
        const fileStream = fs.createReadStream(fileToUploadPath);

        // Create a Blob-like object for FormData
        // Axios FormData might not directly support streams like node-fetch's FormData
        // A common workaround is to use 'form-data' library if direct stream is an issue
        // or ensure the environment supports File/Blob for FormData.
        // For simplicity, let's assume the environment or a polyfill handles it,
        // or we might need the 'form-data' package.
        // For now, this might be problematic with standard 'FormData' in Node for streams.
        // A more robust way is using the 'form-data' package.
        // Let's try with a Blob-like approach first.
        const fileBuffer = fs.readFileSync(fileToUploadPath);
        const blob = new Blob([fileBuffer], {type: fields.type || "audio/m4a"});

        formData.append("file", blob, originalFileName);
        formData.append("model", fields.model || "whisper-1");

        const openaiResponse = await axios.post(
          `${OPENAI_BASE_URL}/audio/transcriptions`,
          formData,
          {
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              // Axios sets Content-Type for FormData automatically
            },
          }
        );
        response.status(200).send(openaiResponse.data);
      } catch (error: any) {
        console.error("Error during OpenAI call:", error.response?.data || error.message);
        response.status(error.response?.status || 500).send(error.response?.data || "Error processing audio.");
      } finally {
        if (fileToUploadPath) {
          fs.unlinkSync(fileToUploadPath); // Clean up temp file
        }
      }
    });

    // Pipe request to Busboy
    // For Express-like environments, request.pipe(busboy) is common.
    // For Cloud Functions, you might need to end the busboy instance manually if not using express.
    if (request.rawBody) {
        busboy.end(request.rawBody);
    } else {
        request.pipe(busboy);
    }
  });


/**
 * Proxies chat completion requests to OpenAI API.
 * Expects a JSON body with 'model', 'messages', etc.
 */
export const proxyOpenAIChatCompletion = functions
  .runWith({
      memory: "256MB",
      timeoutSeconds: 60,
  })
  .https.onRequest(async (request, response) => {
    if (!OPENAI_API_KEY) {
      response.status(500).send("Server configuration error: Missing API key.");
      return;
    }
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    // CORS handling
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (request.method === "OPTIONS") {
        response.status(204).send("");
        return;
    }

    try {
      const { model, messages, temperature } = request.body;

      if (!model || !messages) {
        response.status(400).send("Missing model or messages in request body.");
        return;
      }

      const openaiResponse = await axios.post(
        `${OPENAI_BASE_URL}/chat/completions`,
        {
          model,
          messages,
          temperature, // Optional
        },
        {
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      response.status(200).send(openaiResponse.data);
    } catch (error: any) {
      console.error("Error during OpenAI chat call:", error.response?.data || error.message);
      response.status(error.response?.status || 500).send(error.response?.data || "Error processing chat completion.");
    }
  });
