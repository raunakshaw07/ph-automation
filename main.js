require('dotenv').config();
const express = require('express');
const chrome = require('selenium-webdriver/chrome');
const { Builder, By, Key, until } = require('selenium-webdriver');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

let options = new chrome.Options();
options.addArguments('--headless');
options.addArguments('--disable-gpu');
options.addArguments('--no-sandbox');
options.addArguments('--disable-dev-shm-usage');
options.addArguments('--disable-notifications');
options.setUserPreferences({ credential_enable_service: false });

const googleEmail = process.env.GOOGLE_EMAIL;
const googlePassword = process.env.GOOGLE_PASSWORD;
const senderEmail = process.env.SENDER_EMAIL;
const appPassword = process.env.APP_PASSWORD;
const port = process.env.PORT;


async function automateProductHunt() {
    const driver = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    try {
        await driver.get('https://www.producthunt.com/');

        await driver.get('https://www.producthunt.com/login');

        const signInDiv = await driver.findElement(By.css('div[data-test="header-nav-link-sign-in"]'));
        const signInButton = await signInDiv.findElement(By.tagName('button'));
        await signInButton.click();

        const googleSignInButton = await driver.findElement(By.css('button[data-test="login-with-google"]'));
        await googleSignInButton.click();

        await driver.findElement(By.id('identifierId')).sendKeys(googleEmail, Key.RETURN);

        await driver.wait(until.elementLocated(By.name('Passwd')), 10000);
        await driver.findElement(By.name('Passwd')).sendKeys(googlePassword, Key.RETURN);

        await driver.wait(until.urlContains('https://www.producthunt.com/?bc=1'), 10000);

        const firstProduct = await driver.findElement(By.css('div[data-test="homepage-section-0"] > div:nth-child(3)'));
        const linkTag = await firstProduct.findElement(By.tagName('a'));
        const productLink = await linkTag.getAttribute('href');
        const productName = await linkTag.getAttribute('aria-label');
        const voteButton = await firstProduct.findElement(By.css('button[data-test="vote-button"]'));
        await voteButton.click();

        console.log({ productLink, productName });
        await sendEmail(productName, productLink);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await driver.quit();
    }
}

async function sendEmail(productName, productLink) {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    let mailOptions = {
        from: senderEmail,
        to: googleEmail,
        subject: 'Product Upvoted on Product Hunt',
        html: `<p><strong>Product Name:</strong> ${productName}</p>
              <p><strong>Product Link:</strong> <a href="${productLink}">${productLink}</a></p>`
    };

    let info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
}

app.get('/', (req, res) => {
  res.json({ msg: "ProductHunt automation" });
});

app.get('/automate', async (req, res) => {
  try {
    await automateProductHunt();
    return res.json({ msg: "Product voted!!" })
  } catch (err) {
    return res.json(err);
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`))


// Reference for app password -  https://support.google.com/mail/answer/185833?hl=en#:~:text=Create%20and%20manage%20your%20app,up%20only%20for%20security%20keys.