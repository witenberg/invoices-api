import { NextResponse, NextRequest } from 'next/server';
import { jsPDF } from 'jspdf';
import { withPrisma } from '@/lib/db';

export const runtime = 'edge'

export async function GET(
  request: NextRequest
) {
    try {
        const id = request.nextUrl.pathname.split('/')[3];
        
        if (!id) {
            return new NextResponse('Invoice ID not provided', { status: 400 });
        }
        
        const invoice = await withPrisma(async (prisma) => {
            return await prisma.invoices.findUnique({
                where: {
                    invoiceid: parseInt(id)
                },
                include: {
                    users: {
                        select: {
                            username: true
                        }
                    },
                    clients: {
                        select: {
                            name: true
                        }
                    }
                }
            });
        });

        if (!invoice) {
            return new NextResponse('Invoice not found', { status: 404 });
        }

        const { invoiceid, date, currency, products, users, clients } = invoice;
        const username = users.username;
        const client_name = clients.name;

        const total = (products as any[])
            .reduce((sum, product) => {
                const price = parseFloat(product.amount) || 0;
                const quantity = product.quantity || 1;
                return sum + price * quantity;
            }, 0)
            .toFixed(2);

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFont('times', 'normal');

    doc.setFontSize(20);
    doc.text(username, 20, 20);

    doc.setFontSize(10);
    doc.text('INVOICE TO', 20, 40);
    doc.setFontSize(12);
    doc.text(client_name, 20, 45);

    doc.setFontSize(10);
    doc.text('DATE', 150, 20);
    doc.setFontSize(12);
    doc.text(formattedDate, 150, 25);
    doc.setFontSize(10);
    // doc.text(`ID ${invoiceid}`, 150, 30);

    doc.setFontSize(12);
    doc.text('DESCRIPTION', 20, 60);
    doc.text(`AMOUNT (${currency})`, 150, 60);
    doc.setLineWidth(0.5);
    doc.line(20, 62, 190, 62);

    let yPosition = 70;
    (products as any[]).forEach((product) => {
      doc.setFontSize(10);
      doc.text(product.name, 20, yPosition);
      doc.text(`${product.quantity} x ${parseFloat(product.amount).toFixed(2)}`, 80, yPosition, { align: 'center' });
      doc.text(`${(parseFloat(product.amount) * product.quantity).toFixed(2)}`, 150, yPosition);
      yPosition += 10;
    });

    doc.line(20, yPosition, 190, yPosition);
    doc.setFontSize(12);
    doc.text('TOTAL', 20, yPosition + 5);
    doc.text(total, 150, yPosition + 5);

    doc.setFontSize(12);
    doc.text(`AMOUNT DUE`, 20, yPosition + 15);
    doc.setFontSize(16);
    doc.text(`${currency} ${total}`, 150, yPosition + 15);

    doc.setFontSize(8);
    doc.text('Powered by Invoices App', 105, 270, { align: 'center' });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${username}-invoice-${invoiceid}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new NextResponse('Error generating PDF', { status: 500 });
  }
}