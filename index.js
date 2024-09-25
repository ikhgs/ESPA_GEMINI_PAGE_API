const express = require('express');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Route to upload image and start the conversation
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const path = req.file.path;
    const mimeType = req.file.mimetype;

    // Example: You would send the file to Google API here using axios
    const response = await axios.post('https://api.google.com/gemini/v1/upload', {
      filePath: path,
      mimeType: mimeType,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      }
    });

    const fileUri = response.data.fileUri;

    // Example: Start the chat session
    const chatResponse = await axios.post('https://api.google.com/gemini/v1/chat', {
      fileUri: fileUri,
      mimeType: mimeType,
      prompt: "Décrivez cette photo",
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      }
    });

    res.json({ description: chatResponse.data.description });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error during upload or processing' });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
