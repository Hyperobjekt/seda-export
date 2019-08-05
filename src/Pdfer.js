const Fs = require('fs');
const Path = require('path')
const Puppeteer = require('puppeteer')
const Handlebars = require('handlebars')

class Pdfer {
  async html(data, templates) {
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
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      const yy = today.getYear() - 100;
      const datestring = mm + '/' + dd + '/' + yy;
      jsonparse.today = datestring;
      jsonparse.infourl = 'EDOPPORTUNITY.ORG';
      console.log(jsonparse);
      // Fetch the template.
      // console.log('template string');
      // console.log(templates);
      let t = templates + '/template.hbs';
      const templatePath = Path.resolve(t);
      let content;
      try {
         content = Fs.readFileSync(templatePath, { encoding: 'utf8' })
      } catch (err) {
        // An error occurred fetching template file
        console.error(err);
      }
      // Register partials
      // let fontsPartial = Fs.readFileSync(templates + '/fonts.hbs', 'utf8');
      // Handlebars.registerPartial('fonts', fontsPartial);
      let stylesPartial = Fs.readFileSync(templates + '/styles.hbs', 'utf8');
      // console.log(stylesPartial);
      Handlebars.registerPartial('styles', stylesPartial);
      // console.log('partials:');
      // console.log(Handlebars.partials);
      // compile and render the template with handlebars
      let handlebars;
      try {
        handlebars = Handlebars.compile(content);
      } catch (e) {
        throw new Error(e)
      }
      // Return the handlebars template rendered with data
      return handlebars(jsonparse)
    } catch (error) {
      throw new Error('Cannot create HTML template.')
    }
  }

  async pdf(data, templates, output) {
    // console.log('pdf()');
    const html = await this.html(data, templates)
    // console.log(html)
    const browser = await Puppeteer.launch()
    const page = await browser.newPage()
    await page.emulateMedia('print')
    // await page.setViewport({
    //   width: 1275,
    //   height: 1650,
    //   deviceScaleFactor: 2 // 1.5625
    // })
    await page.emulate({
      viewport: {
        width: 1632, // 1275,
        height: 2112, // 1650,
        deviceScaleFactor: 2 // 1.5625
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36'
    });
    await page.setContent(html);
    // await page.waitForNavigation();
    await page.pdf({
      path: output,
      format: 'Letter',
      printBackground: true
    })
    process.exit()
  }
}

module.exports = Pdfer;
