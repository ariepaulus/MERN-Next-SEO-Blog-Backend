const sgMail = require('@sendgrid/mail');
require('dotenv').config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.contactForm = (req, res) => {
  const { email, name, message } = req.body;

  const emailData = {
    to: process.env.EMAIL_TO, //* Administrator of blog
    from: process.env.EMAIL_FROM, //* Verified sender for my SendGrid account
    subject: `Contact form - ${process.env.APP_NAME}`,
    text: `Email received, via contact form, from \n Sender name: ${name} \n Sender email: ${email} \n Sender message: ${message}`,
    html: `
      <h4>Email received, via contact form, from:</h4>
      <p>Sender name: ${name}</p>
      <p>Sender email: ${email}</p>
      <p>Sender message: ${message}</p>
      <hr />
      <p>This email may contain sensitive information</p>
      <p>https://seoblog.com</p>
    `,
  };

  try {
    sgMail.send(emailData).then(sent => {
      return res.status(200).json({
        success: true,
      });
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

exports.contactBlogAuthorForm = (req, res) => {
  const { authorEmail, email, name, message } = req.body;

  // let maillist = [authorEmail, process.env.EMAIL_TO];

  const emailData = {
    to: authorEmail,
    from: process.env.EMAIL_FROM,
    subject: `Someone sent you a message from ${process.env.APP_NAME}`,
    text: `Email received from \n Sender name: ${name} \n Sender email: ${email} \n Sender message: ${message}`,
    html: `
      <h4>Message received from:</h4>
      <p>Sender name: ${name}</p>
      <p>Sender email: ${email}</p>
      <p>Sender message: ${message}</p>
      <hr />
      <p>This email may contain sensitive information</p>
      <p>https://seoblog.com</p>
    `,
  };

  sgMail.send(emailData).then(sent => {
    return res.status(200).json({
      success: true,
    });
  });
};
