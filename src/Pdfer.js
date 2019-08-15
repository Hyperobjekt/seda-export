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

const vars = {};
vars.barMax = 64;
vars.avgBarHide = 48;
vars.avgMax = 3;
vars.avgGapMax = 6;
vars.cohBarHide = 24;
vars.cohMax = 0.33;
vars.cohGapMax = 0.33;
vars.grdBarHide = 48;
vars.grdMin = -0.5;
vars.grdMax = 1.5;
vars.grdGapMax = 0.4;
vars.verticalRatio = 0.64;
vars.horizontalRatio = 0.64;

class Pdfer {

  async getPercentDiffBoilerplate(v, from = 1) {
    // console.log('getPercentDiffBoilerplate()');
    if (!v && v !== 0) { return 'N/A' }
    const percent = formatPercent(v - from);
    // console.log(percent);
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

  async constructGrdBar(val, valMin, valMax) {
    console.log('constructBar()');
    const obj = {};
    obj.num = {};
    obj.bar = {};
    obj.bar.neg = {};
    obj.bar.pos = {};
    const barWidth = (val/valMax)*vars.barMax;
    switch (true) {
      case (val > 1):
        obj.num.neg = '';
        obj.num.pos = '+' + formatNumber(val, 2);
        obj.bar.pos.width = 'width:' + barWidth + 'px;';
        obj.bar.neg.width = '';
        if (barWidth >= vars.barHide) {
          obj.bar.pos.hide = 'visibility:hidden;';
        }
        // console.log(obj);
        return obj;
      case (val < 1):
        obj.num.pos = '';
        obj.num.neg = formatNumber(val, 2);
        obj.bar.neg.width = 'width:' + barWidth*-1 + 'px;';
        obj.bar.pos.width = '';
        if (barWidth*-1 >= vars.barHide) {
          obj.bar.neg.hide = 'visibility:hidden;';
        }
        // console.log(obj);
        return obj;
      default:
        break;
    }
  }

  /**
   * Returns object with left and top values for chart dot position
   * @param  {[type]}  x            x axis value for dot
   * @param  {[type]}  y            y axis value for dot
   * @param  {Array}   xRange       Range of chart, lowest first
   * @param  {[type]}  yRange       Range of chart, lowest first
   * @param  {[type]}  width        Width of chart (at 96dip, multiply by vars.*Ratio if necessary)
   * @param  {[type]}  height       Height of chart (at 96dip, multiply by vars.*Ratio if necessary)
   * @param  {[type]}  xPadding     Width of chart space occupied for x axis and tick labels of chart
   * @param  {[type]}  yPadding     Width of chart space occupied for y axis and tick labels of chart
   * @return {Promise}              Return object with left and top values
   */
  async getChartCoords(x, y, xRange = [-3, 3], yRange, width, height, xPadding, yPadding) {
    // console.log('getChartCoords()');
    const obj = {};
    const revisedWidth = width - xPadding;
    const revisedHeight = height - yPadding;
    // console.log('revisedHeight = ' + revisedHeight);
    obj.left = Math.round(((xRange[0] - x) * revisedWidth)/(xRange[0] - xRange[1]));
    obj.top = Math.round(((yRange[1] - y) * revisedHeight)/(yRange[1] - yRange[0]));
    // console.log(obj);
    return obj;
  }

  /**
   * [constructBar description]
   * @param  {Number}  val              Value passed in, may be diff than value displayed
   * @param  {Number}  valMax           Maximum of range
   * @param  {Number}  valMin           Minimum of range
   * @param  {Number}  barHide          Bar width beyond which underlying range label is hidden
   * @param  {Number}  median           Median value, 0 or 1
   * @param  {String}  format           'number' or 'percent'
   * @return {Promise}                  [description]
   */
  async constructBar(val, valMax, valMin, barHide, median = 0, format = 'number') {
    // console.log('constructBar()');
    const obj = {};
    obj.num = {};
    obj.bar = {};
    obj.bar.neg = {};
    obj.bar.pos = {};
    // console.log('format = ' + format);
    switch (true) {
      case (val > median):
        obj.num.neg = '';
        let barWidth;
        if (format === 'number') {
          barWidth = (val/valMax) * vars.barMax;
          obj.num.pos = '+' + formatNumber(val, 2);
        } else {
          barWidth = ((val - median)/(valMax - median)) * vars.barMax;
          obj.num.pos = '+' + formatPercentDiff(val) + '%';
        }
        // console.log('barWidth = ' + barWidth);
        obj.bar.pos.width = 'width:' + barWidth + 'px;';
        obj.bar.neg.width = '';
        if (barWidth >= barHide) {
          obj.bar.pos.hide = 'visibility:hidden;';
        }
        // console.log(obj);
        return obj;
      case (val < median):
        obj.num.pos = '';
        let negBarWidth;
        if (format === 'number') {
          negBarWidth = (val/valMin) * vars.barMax;
          obj.num.neg = formatNumber(val, 2);
        } else {
          negBarWidth = ((1 - val)/(1 - valMin)) * vars.barMax;
          obj.num.neg = formatPercentDiff(val) + '%';
        }
        // const negBarWidth = (val/valMin) * vars.barMax;
        // console.log('negBarWidth = ' + negBarWidth);
        obj.bar.neg.width = 'width:' + negBarWidth + 'px;';
        obj.bar.pos.width = '';
        if (negBarWidth >= barHide) {
          obj.bar.neg.hide = 'visibility:hidden;';
        }
        // console.log(obj);
        return obj;
      default:
        break;
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
      const _avg = {}; // JSON object for average bar charts & conditionals
      _avg.minmax = vars.avgMax;
      _avg.gapminmax = vars.avgGapMax;
      _avg.all = await this.constructBar(jsonparse.location.all_avg, vars.avgMax, -vars.avgMax, vars.avgBarHide);
      _avg.w = await this.constructBar(jsonparse.location.w_avg, vars.avgMax, -vars.avgMax, vars.avgBarHide);
      _avg.m = await this.constructBar(jsonparse.location.m_avg, vars.avgMax, -vars.avgMax, vars.avgBarHide);
      _avg.f = await this.constructBar(jsonparse.location.f_avg, vars.avgMax, -vars.avgMax, vars.avgBarHide);
      _avg.b = await this.constructBar(jsonparse.location.b_avg, vars.avgMax, -vars.avgMax, vars.avgBarHide);
      _avg.p = await this.constructBar(jsonparse.location.p_avg, vars.avgMax, -vars.avgMax, vars.avgBarHide);
      _avg.np = await this.constructBar(jsonparse.location.np_avg, vars.avgMax, -vars.avgMax, vars.avgBarHide);
      _avg.h = await this.constructBar(jsonparse.location.h_avg, vars.avgMax, -vars.avgMax, vars.avgBarHide);
      _avg.a = await this.constructBar(jsonparse.location.a_avg, vars.avgMax, -vars.avgMax, vars.avgBarHide);
      _avg.wb = await this.constructBar(jsonparse.location.wb_avg, vars.avgGapMax, -vars.avgGapMax, vars.avgBarHide);
      _avg.wa = await this.constructBar(jsonparse.location.wa_avg, vars.avgGapMax, -vars.avgGapMax, vars.avgBarHide);
      _avg.wh = await this.constructBar(jsonparse.location.wh_avg, vars.avgGapMax, -vars.avgGapMax, vars.avgBarHide);
      _avg.pn = await this.constructBar(jsonparse.location.pn_avg, vars.avgGapMax, -vars.avgGapMax, vars.avgBarHide);
      _avg.chart = await this.getChartCoords(jsonparse.location.all_ses, jsonparse.location.all_avg, jsonparse.location.range_ses, jsonparse.location.range_avg, (1017*0.64), (624*0.64), (123*0.64), (66*0.64));
      jsonparse.avg = _avg;
      const _coh = {}; // JSON object for coh bar charts & conditionals
      _coh.minmax = vars.cohMax;
      _coh.gapminmax = vars.cohGapMax;
      _coh.all = await this.constructBar(jsonparse.location.all_coh, vars.cohMax, -vars.cohMax, vars.cohBarHide);
      _coh.w = await this.constructBar(jsonparse.location.w_coh, vars.cohMax, -vars.cohMax, vars.cohBarHide);
      _coh.m = await this.constructBar(jsonparse.location.m_coh, vars.cohMax, -vars.cohMax, vars.cohBarHide);
      _coh.f = await this.constructBar(jsonparse.location.f_coh, vars.cohMax, -vars.cohMax, vars.cohBarHide);
      _coh.b = await this.constructBar(jsonparse.location.b_coh, vars.cohMax, -vars.cohMax, vars.cohBarHide);
      _coh.p = await this.constructBar(jsonparse.location.p_coh, vars.cohMax, -vars.cohMax, vars.cohBarHide);
      _coh.np = await this.constructBar(jsonparse.location.np_coh, vars.cohMax, -vars.cohMax, vars.cohBarHide);
      _coh.h = await this.constructBar(jsonparse.location.h_coh, vars.cohMax, -vars.cohMax, vars.cohBarHide);
      _coh.a = await this.constructBar(jsonparse.location.a_coh, vars.cohMax, -vars.cohMax, vars.cohBarHide);
      _coh.wb = await this.constructBar(jsonparse.location.wb_coh, vars.cohGapMax, -vars.cohGapMax, vars.cohBarHide);
      _coh.wa = await this.constructBar(jsonparse.location.wa_coh, vars.cohGapMax, -vars.cohGapMax, vars.cohBarHide);
      _coh.wh = await this.constructBar(jsonparse.location.wh_coh, vars.cohGapMax, -vars.cohGapMax, vars.cohBarHide);
      _coh.pn = await this.constructBar(jsonparse.location.pn_coh, vars.cohGapMax, -vars.cohGapMax, vars.cohBarHide);
      _coh.chart = await this.getChartCoords(jsonparse.location.all_ses, jsonparse.location.all_coh, jsonparse.location.range_ses, jsonparse.location.range_coh, (1017*0.64), (624*0.64), (123*0.64), (66*0.64));
      jsonparse.coh = _coh;
      const _grd = {}; // JSON object for grd bar charts & conditionals
      _grd.min = vars.grdMin;
      _grd.max = vars.grdMax;
      _grd.grdBarHide = vars.grdBarHide;
      _grd.gapminmax = vars.grdGapMax;
      _grd.all = await this.constructBar(jsonparse.location.all_grd, vars.grdMax, vars.grdMin, vars.grdBarHide, 1, 'percent');
      _grd.w = await this.constructBar(jsonparse.location.w_grd, vars.grdMax, vars.grdMin, vars.grdBarHide, 1, 'percent');
      _grd.m = await this.constructBar(jsonparse.location.m_grd, vars.grdMax, vars.grdMin, vars.grdBarHide, 1, 'percent');
      _grd.f = await this.constructBar(jsonparse.location.f_grd, vars.grdMax,  vars.grdMin, vars.grdBarHide, 1, 'percent');
      _grd.b = await this.constructBar(jsonparse.location.b_grd, vars.grdMax,  vars.grdMin, vars.grdBarHide, 1, 'percent');
      _grd.p = await this.constructBar(jsonparse.location.p_grd, vars.grdMax,  vars.grdMin, vars.grdBarHide, 1, 'percent');
      _grd.np = await this.constructBar(jsonparse.location.np_grd, vars.grdMax,  vars.grdMin, vars.grdBarHide, 1, 'percent');
      _grd.h = await this.constructBar(jsonparse.location.h_grd, vars.grdMax,  vars.grdMin, vars.grdBarHide, 1, 'percent');
      _grd.a = await this.constructBar(jsonparse.location.a_grd, vars.grdMax,  vars.grdMin, vars.grdBarHide, 1, 'percent');
      _grd.wb = await this.constructBar(jsonparse.location.wb_grd, vars.grdGapMax, -vars.grdGapMax, vars.grdBarHide);
      _grd.wa = await this.constructBar(jsonparse.location.wa_grd, vars.grdGapMax, -vars.grdGapMax, vars.grdBarHide);
      _grd.wh = await this.constructBar(jsonparse.location.wh_grd, vars.grdGapMax, -vars.grdGapMax, vars.grdBarHide);
      _grd.pn = await this.constructBar(jsonparse.location.pn_grd, vars.grdGapMax, -vars.grdGapMax, vars.grdBarHide);
      _grd.chart = await this.getChartCoords(jsonparse.location.all_ses, jsonparse.location.all_grd, jsonparse.location.range_ses, jsonparse.location.range_grd, (1017*0.64), (624*0.64), (123*0.64), (66*0.64));
      jsonparse.grd = _grd;
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
