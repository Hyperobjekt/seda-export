const Fs = require('fs');
const Path = require('path')
const Puppeteer = require('puppeteer')
const Handlebars = require('handlebars')

const _ats_hrl = [
  {
    range: [Number.NEGATIVE_INFINITY, -0.249999],
    text: 'lower than'
  },
  {
    range: [-0.25, 0.25],
    text: 'roughly'
  },
  {
    range: [0.2500001, Number.POSITIVE_INFINITY],
    text: 'higher than'
  }
];

const _coh_dri = [
  {
    range: [Number.NEGATIVE_INFINITY, -0.0249999],
    text: 'declining'
  },
  {
    range: [-0.025, 0.025],
    text: 'relatively stable'
  },
  {
    range: [0.02500001, Number.POSITIVE_INFINITY],
    text: 'improving'
  }
];

const _ats_ab = [
  {
    range: [Number.NEGATIVE_INFINITY, -0.0000001],
    text: 'below'
  },
  {
    range: [0, Number.POSITIVE_INFINITY],
    text: 'above'
  }
];

const _ats_diff_hl = [
  {
    range: [Number.NEGATIVE_INFINITY, -0.0000001],
    text: 'lower'
  },
  {
    range: [0, Number.POSITIVE_INFINITY],
    text: 'higher'
  }
];

const _coh_diff_id = [
  {
    range: [Number.NEGATIVE_INFINITY, -0.0000001],
    text: 'decreased'
  },
  {
    range: [0, Number.POSITIVE_INFINITY],
    text: 'increased'
  }
];

const _coh_diff_ml = [
  {
    range: [Number.NEGATIVE_INFINITY, -0.0000001],
    text: 'less'
  },
  {
    range: [0, Number.POSITIVE_INFINITY],
    text: 'more'
  }
];

const _coh_id = [
  {
    range: [Number.NEGATIVE_INFINITY, -0.0000001],
    text: 'decreased'
  },
  {
    range: [0, Number.POSITIVE_INFINITY],
    text: 'increased'
  }
];

const _ats_vfb = [
  {
    range: [Number.NEGATIVE_INFINITY, -2.4999999],
    text: 'very far below'
  },
  {
    range: [-2.5, -1.4999999],
    text: 'far below'
  },
  {
    range: [-1.5, -0.4999999],
    text: 'below'
  },
  {
    range: [-0.5, 0.5],
    text: 'at roughly'
  },
  {
    range: [0.50000001, 1.5],
    text: 'above'
  },
  {
    range: [1.50000001, 2.5],
    text: 'far above'
  },
  {
    range: [2.5000001, Number.POSITIVE_INFINITY],
    text: 'very far above'
  }
];

const _grd_hrl = [
  {
    range: [Number.NEGATIVE_INFINITY, 0.649999],
    text: 'lower than'
  },
  {
    range: [0.65, 1.35],
    text: 'roughly'
  },
  {
    range: [1.350001, Number.POSITIVE_INFINITY],
    text: 'higher than'
  }
];

const _grd_lsm = [
  {
    range: [Number.NEGATIVE_INFINITY, -0.000001],
    text: 'less each grade than'
  },
  {
    range: [0, 0],
    text: 'about the same each grade as'
  },
  {
    range: [0.000001, Number.POSITIVE_INFINITY],
    text: 'more each grade than'
  }
];

/**
 * Returns the value rounded to the provided number of decimal
 * places.
 */
const formatNumber = (val, decimals = 2) => {
  if (!val && val !== 0) { return 'N/A' }
  const factor = Math.pow(10, decimals);
  return Math.round(val*factor)/factor;
}
/**
 * Returns a percent string from the provided value
 * @param {number} v
 */
const formatPercent = (v, decimals = 0) => {
  if (!v && v !== 0) { return 'N/A' }
  return formatNumber(v * 100, decimals)
}
/**
 * Returns a percent string of how far the provided value
 * is from the provided `from` value. (used for learning rates)
 * @param {number} v the value to format
 * @param {number} from the point of reference to determine what the % diff is
 */
const formatPercentDiff = (v, from = 1) => {
  if (!v && v !== 0) { return 'N/A' }
  return formatPercent(v - from);
}

class Pdfer {

  async getPercentDiffBoilerplate(v, from = 1) {
    console.log('getPercentDiffBoilerplate()');
    if (!v && v !== 0) { return 'N/A' }
    const percent = formatPercent(v - from);
    console.log(percent);
    switch (true) {
      case (percent < 0):
        return (percent * -1) + '% less each grade than';
      case (percent === 0):
        return 'about the same each grade as';
      case (percent > 0):
        return percent + '% more each grade than';
      default:
        return 'about the same each grade as';
    }
  }

  async getFixed(value, decimals) {
    return value.toFixed(decimals);
  }

  async getPos(value) {
    if (value < 0) {
      return value * -1;
    } else {
      return value;
    }
  }

  async getBoilerplate(value, arr) {
    // console.log('getBoilerplate');
    let str = null;
    arr.some((el) => {
      // console.log(el);
      if (value >= el.range[0] && value <= el.range[1]) {
        // console.log('value is in range');
        str = el.text;
        return true;
      } else {
        return false;
      }
    })
    return str;
  }

  async getPlural(entity) {
    // console.log('getPlural');
    switch (entity) {
      case 'county':
        return 'counties';
      default:
        return String(entity + 's');
    }
  }

  async getStateAbbrev(state) {
    // console.log('getStateAbbrev');
    switch (state) {
      case 'District of Columbia':
        return 'DC';
      case 'Alaska':
        return 'AK';
      case 'Alabama':
        return 'AL';
      case 'Arkansas':
        return 'AR';
      case 'Arizona':
        return 'AZ';
      case 'California':
        return 'CA';
      case 'Colorado':
        return 'CO';
      case 'Connecticut':
        return 'CT';
      case 'Delaware':
        return 'DE';
      case 'Florida':
        return 'FL';
      case 'Georgia':
        return 'GA';
      case 'Hawaii':
        return 'HI';
      case 'Iowa':
        return 'IA';
      case 'Idaho':
        return 'ID';
      case 'Illinois':
        return 'IL';
      case 'Indiana':
        return 'IN';
      case 'Kansas':
        return 'KS';
      case 'Kentucky':
        return 'KY';
      case 'Louisiana':
        return 'LA';
      case 'Massachusetts':
        return 'MA';
      case 'Maryland':
        return 'MD';
      case 'Maine':
        return 'ME';
      case 'Michigan':
        return 'MI';
      case 'Minnesota':
        return 'MN';
      case 'Missouri':
        return 'MO';
      case 'Mississippi':
        return 'MS';
      case 'Montana':
        return 'MT';
      case 'North Carolina':
        return 'NC';
      case 'North Dakota':
        return 'ND';
      case 'Nebraska':
        return 'NE';
      case 'New Hampshire':
        return 'NH';
      case 'New Jersey':
        return 'NJ';
      case 'New Mexico':
        return 'NM';
      case 'Nevada':
        return 'NV';
      case 'New York':
        return 'NY';
      case 'Ohio':
        return 'OH';
      case 'Oklahoma':
        return 'OK';
      case 'Oregon':
        return 'OR';
      case 'Pennsylvania':
        return 'PA';
      case 'Rhode Island':
        return 'RI';
      case 'South Carolina':
        return 'SC';
      case 'South Dakota':
        return 'SD';
      case 'Tennessee':
        return 'TN';
      case 'Texas':
        return 'TX';
      case 'Utah':
        return 'UT';
      case 'Virginia':
        return 'VA';
      case 'Vermont':
        return 'VT';
      case 'Washington':
        return 'WA';
      case 'Wisconsin':
        return 'WI';
      case 'West Virginia':
        return 'WV';
      case 'Wyoming':
        return 'WY';
      default:
        return 'AK';
    }
  }

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
      if (jsonparse.region === 'county' || jsonparse.region === 'district') {
        jsonparse.showbarcharts = true;
      } else {
        jsonparse.showbarcharts = false;
      }
      const _verbiage = {}; // JSON object for addl strings needed by template
      _verbiage.type_plural = await this.getPlural(jsonparse.region);
      _verbiage.state_abbrev = await this.getStateAbbrev(jsonparse.location.state_name);
      _verbiage.ats_avg_fixed = await this.getPos(
        await this.getFixed(jsonparse.location.all_avg, 2)
      );
      _verbiage.ats_hrl = await this.getBoilerplate(jsonparse.location.all_avg, _ats_hrl);
      _verbiage.ats_ab = await this.getBoilerplate(jsonparse.location.all_avg, _ats_ab);
      if (!!jsonparse.location.all_ses) {
        _verbiage.ats_vfb = await this.getBoilerplate(jsonparse.location.all_ses, _ats_vfb);
      }
      if (!!jsonparse.location.diff_avg) {
        _verbiage.ats_diff_fixed = await this.getPos(
          await this.getFixed(jsonparse.location.diff_avg, 2)
        );
        _verbiage.ats_diff_hl = await this.getBoilerplate(jsonparse.location.diff_avg, _ats_diff_hl);
      }
      _verbiage.grd_hrl = await this.getBoilerplate(jsonparse.location.all_grd, _grd_hrl);
      _verbiage.grd_pct = await this.getPercentDiffBoilerplate(jsonparse.location.all_grd, 1);
      if (!!jsonparse.location.diff_grd) {
        _verbiage.grd_diff_fixed = await this.getPos(
          await this.getFixed(jsonparse.location.diff_grd, 2)
        );
        _verbiage.grd_diff_hl = await this.getBoilerplate(jsonparse.location.diff_grd, _ats_diff_hl);
      }
      _verbiage.coh_dri = await this.getBoilerplate(jsonparse.location.all_coh, _coh_dri);
      _verbiage.coh_id = await this.getBoilerplate(jsonparse.location.all_coh, _coh_id);
      _verbiage.coh_grd = await this.getPos(
        await this.getFixed(jsonparse.location.all_coh, 2)
      );
      if (!!jsonparse.location.diff_coh) {
        _verbiage.coh_diff_fixed = await this.getPos(
          await this.getFixed(jsonparse.location.diff_coh, 2)
        );
        _verbiage.coh_diff_id = await this.getBoilerplate(jsonparse.location.diff_coh, _coh_diff_id);
        _verbiage.coh_diff_ml = await this.getBoilerplate(jsonparse.location.diff_coh, _coh_diff_ml);
      }
      jsonparse.verbiage = _verbiage;
      const _css = {}; // JSON object for CSS attribs needed by template
      _css.avg_left = '100px';
      _css.avg_top = '100px';
      _css.grd_left = '100px';
      _css.grd_top = '100px';
      _css.coh_left = '100px';
      _css.coh_top = '100px';
      jsonparse.css = _css;
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
      console.log(error);
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
