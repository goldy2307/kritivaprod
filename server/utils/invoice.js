const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generates a premium black/gold invoice PDF, saves to /server/uploads/invoices, returns file path.
function generateInvoicePDF(booking) {
  return new Promise((resolve, reject) => {
    const invoiceNumber = booking.invoiceNumber || `KP-INV-${Date.now()}`;
    const filename = `${invoiceNumber}.pdf`;
    const outPath = path.join(__dirname, '..', 'uploads', 'invoices', filename);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    const gold = '#8b6914';
    const dark = '#0a0705';

    // Header bar
    doc.rect(0, 0, doc.page.width, 90).fill(dark);
    doc.fillColor(gold).fontSize(22).font('Helvetica-Bold').text('KRITIVA PRODUCTIONS', 50, 30);
    doc.fillColor('#cfc6b3').fontSize(10).font('Helvetica-Oblique').text('Where We Celebrate', 50, 58);

    doc.fillColor('#000');
    doc.moveDown(4);
    doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', 50, 110);
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text(`Invoice No: ${invoiceNumber}`, 50, 135);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 50, 150);
    doc.text(`Event: Royal Garba Nights 2026 (17-18-19 Oct, Blue Lotus, Indore)`, 50, 165);

    doc.text(`Billed To: ${booking.name}`, 350, 135);
    doc.text(`Phone: ${booking.phone}`, 350, 150);
    if (booking.email) doc.text(`Email: ${booking.email}`, 350, 165);

    // Table header
    let y = 210;
    doc.rect(50, y, 495, 24).fill(gold);
    doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 60, y + 7);
    doc.text('Passes', 320, y + 7);
    doc.text('Day', 400, y + 7);
    doc.text('Amount (INR)', 460, y + 7);

    y += 24;
    doc.fillColor('#000').font('Helvetica').fontSize(10);
    doc.rect(50, y, 495, 26).stroke('#ddd');
    doc.text(booking.planType, 60, y + 8);
    doc.text(String(booking.passes || 1), 320, y + 8);
    doc.text(booking.day || 'All 3 Days', 400, y + 8);
    doc.text(`Rs. ${Number(booking.amount || 0).toLocaleString('en-IN')}`, 460, y + 8);

    y += 50;
    doc.font('Helvetica-Bold').fontSize(12).text(`Total: Rs. ${Number(booking.amount || 0).toLocaleString('en-IN')}`, 400, y);

    // Footer
    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text('Kritiva Productions | 615, 6th Floor, Shekhar Central, Palasia, Indore, MP | +91 92325 32246 | kritivaproductions@gmail.com',
        50, doc.page.height - 70, { width: 495, align: 'center' });

    doc.end();
    stream.on('finish', () => resolve({ filePath: outPath, filename, invoiceNumber }));
    stream.on('error', reject);
  });
}

module.exports = { generateInvoicePDF };
