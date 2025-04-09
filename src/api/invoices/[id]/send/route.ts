import { sendInvoiceEmail } from "@/app/actions/email"
import { withPrisma } from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";

export const runtime = 'edge'

export async function POST(
    request: NextRequest
) {
    try {
        const id = request.nextUrl.pathname.split('/')[3];
        
        if (!id) {
            return NextResponse.json({ error: "Invoice ID not provided" }, { status: 400 });
        }
        
        const emailResult = await sendInvoiceEmail(id);

        if (!emailResult.success) {
            return NextResponse.json({ 
                error: "Failed to send invoice email" 
            }, { status: 500 });
        }

        const updatedInvoice = await withPrisma(async (prisma) => {
            return await prisma.invoices.update({
                where: {
                    invoiceid: parseInt(id)
                },
                data: {
                    status: 'Sent'
                },
                select: {
                    status: true
                }
            });
        });

        return NextResponse.json({ 
            message: "Successfully sent invoice", 
            status: updatedInvoice.status 
        }, { status: 200 });
    }
    catch (error) {
        console.error("Error sending invoice:", error);
        
        if (error instanceof Error) {
            return NextResponse.json({
                error: error.message || "An unexpected error occurred while sending the invoice"
            }, { status: 500 });
        }

        return NextResponse.json({
            error: "An unexpected error occurred while sending the invoice"
        }, { status: 500 });
    }
}