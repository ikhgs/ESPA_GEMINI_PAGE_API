const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI, GoogleAIFileManager } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Multer configuration for file uploads
const upload = multer({ dest: 'uploads/' });

// Store session information in memory for simplicity
const sessions = {};

// Function to create a new chat session
async function createChatSession(fileUri, mimeType) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };

  return model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [
          {
            fileData: {
              mimeType: mimeType,
              fileUri: fileUri,
            },
          },
          { text: "Décrivez cette photo" },
        ],
      },
    ],
  });
}

// Route to upload image and start the conversation
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const path = req.file.path;
    const mimeType = req.file.mimetype;

    // Upload the image to Gemini
    const uploadResult = await fileManager.uploadFile(path, { mimeType });
    const file = uploadResult.file;

    // Start a new chat session
    const chatSession = await createChatSession(file.uri, file.mimeType);
    
    // Store the session ID for future interactions
    const sessionId = Date.now().toString(); // Generate a simple session ID
    sessions[sessionId] = chatSession;

    // Send the first description response
    const result = await chatSession.sendMessage("Décrivez cette photo");
    res.json({ sessionId, description: result.response.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error during upload or processing' });
  }
});

// Route to continue the conversation
app.post('/continue', async (req, res) => {
  try {
    const { sessionId, userMessage } = req.body;

    // Retrieve the chat session from the stored sessions
    const chatSession = sessions[sessionId];
    if (!chatSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Continue the conversation with the user's message
    const result = await chatSession.sendMessage(userMessage);
    res.json({ reply: result.response.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error during conversation' });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
