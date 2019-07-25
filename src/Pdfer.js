const Fs = require('fs');
const Path = require('path')
const Puppeteer = require('puppeteer')
const Handlebars = require('handlebars')

class Pdfer {
  async html(data, template) {
    // console.log('html()');
    try {
      // Fetch and parse the JSON.
      let json;
      const dataPath = Path.resolve(data)
      try {
         json = Fs.readFileSync(dataPath, { encoding: 'utf8' });
      } catch (err) {
        // An error occurred fetching template file
        console.error(err);
      }
      const jsonparse = JSON.parse(json);
      // Fetch the template.
      const templatePath = Path.resolve(template)
      let content;
      try {
         content = Fs.readFileSync(templatePath, { encoding: 'utf8' })
      } catch (err) {
        // An error occurred fetching template file
        console.error(err);
      }
      // compile and render the template with handlebars
      const handlebars = Handlebars.compile(content);
      // Return the handlebars template rendered with data
      return handlebars(jsonparse)
    } catch (error) {
      throw new Error('Cannot create invoice HTML template.')
    }
  }

  async pdf(data, template, output) {
    // console.log('pdf()');
    const html = await this.html(data, template)
    // console.log(html)
    const browser = await Puppeteer.launch()
    const page = await browser.newPage()
    await page.setContent(html)
    await page.pdf({
      path: output,
      format: 'A4',
      printBackground: true
    })
    process.exit()
  }
}

module.exports = Pdfer;
