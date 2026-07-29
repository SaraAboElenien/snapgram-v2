import { createTransport } from "nodemailer";



export const sendEmail = async (to, subject, html, attachments = [] ) => {
    // Automated tests (Vitest and the E2E Playwright suite, both of which
    // run the backend with NODE_ENV=test — see db/connection.js for the
    // same pattern) never send a real email: Gmail SMTP is a real external
    // dependency that has no place being required for a test run to pass,
    // and Gmail itself sometimes blocks App Password logins from unfamiliar
    // cloud/CI IPs as suspicious regardless of whether the credentials are
    // correct. The backend's own Vitest suite already stubs this via
    // vi.mock(); this covers the E2E path, which spawns a real child
    // process and can't use that mechanism.
    if (process.env.NODE_ENV === 'test') {
        return true;
    }

    const transporter = createTransport({
        service: "gmail",
        auth: {
            user: process.env.sendEmail,
            pass: process.env.emailPassword,
        },
    });

    const info = await transporter.sendMail({
        from: `"welcome 👻" <${process.env.sendEmail}>`,
        to: to? to:"" ,
        subject:subject? subject: "HelloHelloHello",
        html: html? html: "HelloHelloHello",
        attachments
    });
    console.log(info);
    if (info.accepted.length) {
        return true;
    } else {
        return false;
    }

}   