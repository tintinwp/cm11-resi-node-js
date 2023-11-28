require('dotenv').config();
const http = require('http');
const puppeteer = require('puppeteer');

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET') {
      return res.end('Success');
    }
    if (req.method === 'POST') {
      let requestBody = '';

      req.on('data', (chunk) => {
        requestBody += chunk;
      });

      req.on('end', async () => {
        const data = JSON.parse(requestBody);

        const baseUrl = process.env.FRONTEND_URL || ''; // Replace with your base URL

        // Launch a headless browser
        const browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox'],
        });

        // Create a new page
        const page = await browser.newPage();

        // Make items delimited with ':'
        if (data.items) {
          data.items = data.items.join(':');
        }

        const targetUrl = new URL(baseUrl + '/');
        for (const key in data) {
          targetUrl.searchParams.set(key, data[key]);
        }
        console.log(targetUrl.toString());

        // Navigate to the target URL
        await page.goto(targetUrl.toString());

        // Wait for the element with id '#biteshipResi' to appear
        await page.waitForSelector('#biteshipResi');

        // Get the bounding box of the element
        const elementHandle = await page.$('#biteshipResi');
        if (!elementHandle) return;

        const boundingBox = await elementHandle.boundingBox();
        if (!boundingBox) return;

        // Generate a PDF with the specific element
        const pdfBuffer = await page.pdf({
          format: 'a4', // PDF format
          margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }, // Page margins
          printBackground: true, // Include background colors and images
          width: `${boundingBox.width}px`, // Match the element's width
          height: `${boundingBox.height}px`, // Match the element's height
          pageRanges: '1', // Only capture the current page
        });

        // Close the browser
        await browser.close();

        // Set the response headers for the PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="Resi - ${data.orderId}.pdf"`
        );

        // Send the PDF buffer as the response
        res.writeHead(200);
        res.end(pdfBuffer);
      });
    } else {
      res.writeHead(400);
      res.end('Bad Request');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000; // Replace with your desired port number
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
