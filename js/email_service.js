// js/email_service.js
// EmailJS API keys
const EMAILJS_SERVICE_ID = "service_pc0wik8"; 
const EMAILJS_TEMPLATE_ID = "template_dyktt1n";
const EMAILJS_PUBLIC_KEY = "q_wxiNeP44pfj6vO9";

export async function sendWelcomeEmail(email, name, rollNo, password, cardNo) {
    const templateParams = {
        to_email: email,
        student_name: name,
        roll_no: rollNo,
        password: password,
        card_no: cardNo
    };

    const payload = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: templateParams
    };

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`Welcome email sent to ${email}`);
            return true;
        } else {
            console.error("EmailJS Failed:", await response.text());
            return false;
        }
    } catch (error) {
        console.error("Network Error sending email:", error);
        return false;
    }
}