const express = require('express');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

let conversationHistory = [];

// Route to upload image and start the conversation
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const path = req.file.path;
    const mimeType = req.file.mimetype;

    // Upload the file and get the URI
    const response = await axios.post('https://api.google.com/gemini/v1/upload', {
      filePath: path,
      mimeType: mimeType,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      }
    });

    const fileUri = response.data.fileUri;

    // Start the chat session and get the initial response
    const chatResponse = await axios.post('https://api.google.com/gemini/v1/chat', {
      fileUri: fileUri,
      mimeType: mimeType,
      prompt: "Décrivez cette photo",
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      }
    });

    const description = chatResponse.data.description;

    // Store the conversation history
    conversationHistory.push({
      role: "model",
      text: description,
    });

    res.json({ description: description });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error during upload or processing' });
  }
});

// Route to continue the conversation
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;

    // Add user's message to the conversation history
    conversationHistory.push({
      role: "user",
      text: userMessage,
    });

    // Continue the chat session using the stored conversation history
    const chatResponse = await axios.post('https://api.google.com/gemini/v1/chat', {
      history: conversationHistory,
      prompt: userMessage,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      }
    });

    const responseMessage = chatResponse.data.text;

    // Add the model's response to the conversation history
    conversationHistory.push({
      role: "model",
      text: responseMessage,
    });

    res.json({ response: responseMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error during chat' });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
