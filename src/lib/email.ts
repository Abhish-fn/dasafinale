/**
 * Email stubs — all no-ops for now.
 * When ready to send real emails, plug in Resend/SendGrid here.
 * All call sites are already wired up — just uncomment the transport.
 *
 * TODO: Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars
 * TODO: npm install resend (or @sendgrid/mail)
 */

export async function sendOrderConfirmation(orderId: string, userEmail: string): Promise<void> {
  console.log(`[EMAIL STUB] Order confirmation for ${orderId} to ${userEmail}`);
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: 'orders@dasadinusulu.com', to: userEmail, subject: `Order Confirmed: ${orderId}`, html: '...' });
}

export async function sendShippingUpdate(orderId: string, userEmail: string, status: string): Promise<void> {
  console.log(`[EMAIL STUB] Shipping update for ${orderId} to ${userEmail}: ${status}`);
}

export async function sendOrderCancelled(orderId: string, userEmail: string): Promise<void> {
  console.log(`[EMAIL STUB] Order cancelled ${orderId} to ${userEmail}`);
}
