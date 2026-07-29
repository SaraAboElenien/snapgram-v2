import { createTransport } from "nodemailer";



export const sendEmail = async (to, subject, html, attachments = [] ) => {
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