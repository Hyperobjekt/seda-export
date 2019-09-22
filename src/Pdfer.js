const Fs = require('fs');
const Path = require('path')
const Puppeteer = require('puppeteer')
const Handlebars = require('handlebars')

// These arrays contain collections of strings
// to be used when values fall within the given ranges.
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
const formatPercentDiff = (v, from = 1, decimals = 0) => {
  if (!v && v !== 0) { return 'N/A' }
  return formatPercent(v - from, decimals);
}

const vars = {};
vars.barMax = 66;
vars.barHide = 24;

const _ranges = {
  county: {
    "range_avg": [ -4.5, 2.5 ],
    "range_grd": [ 0.4, 1.6 ],
    "range_coh": [ -0.5, 0.5 ],
    "range_ses": [-4, 3],
  },
  district: {
    "range_avg": [ -4.5, 4.5 ],
    "range_grd": [ 0.4, 1.6 ],
    "range_coh": [ -0.5, 0.5 ],
    "range_ses": [ -5, 4 ],
  },
  school: {
    "range_avg": [ -8, 7 ],
    "range_grd": [ -0.2, 2.6 ],
    "range_coh": [-1, 1],
    "range_frl": [ 0, 1 ],
  }
}

const DEV = true; // TODO: For live implementation change this to false.

class Pdfer {

  getPercentDiffBoilerplate(v, from = 1) {
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

  getFixed(value, decimals) {
    if (!this.isValid(value)) { return null; }
    return value.toFixed(decimals);
  }

  getPos(value) {
    if (value < 0) {
      return value * -1;
    } else {
      return value;
    }
  }

  getBoilerplate(value, arr) {
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

  getPlural(entity) {
    // console.log('getPlural');
    switch (entity) {
      case 'county':
        return 'counties';
      default:
        return String(entity + 's');
    }
  }

  getMin(range) {
    return Math.min(...range);
  }

  getMax(range) {
    return Math.max(...range);
  }

  /**
   * getMinMax Get array of minimum and maximum values from array of passed values
   * @param  {Array}  range             Array of numerical values
   * @param  {Boolean} [isPercent=false] isPercent, true if the result is based on percent diff from 1
   * @return {Promise}                   Two-item array of numerical values, lowest first
   */
  getMinMax(range, isPercent = false) {
    // console.log('getMinMax()');
    let max = null;
    if (!isPercent) {
      max = Math.max(...range.filter(v => this.isValid(v)).map(a => Math.abs(a)));
    } else {
      max = Math.max(...range.filter(v => this.isValid(v)).map(a => Math.abs(formatPercentDiff(a, 1, 0))));
    }
    const arr = [(max * -1), max];
    // console.log(arr);
    return arr;
  }

  /**
   * Returns object with left and top values for chart dot position
   * @param  {[type]}  x            x axis value for dot
   * @param  {[type]}  y            y axis value for dot
   * @param  {Array}   xRange       Range of chart, lowest first
   * @param  {[type]}  yRange       Range of chart, lowest first
   * @return {Promise}              Return object with left and top values
   */
  getChartCoords(data, chartType) {
    // console.log('getChartCoords()');
    const obj = { visible: true};
    const region = data.region;
    let x = null;
    let y = null;
    let xRange = {};
    let yRange = {};
    let _left = null;
    switch (region) {
      case 'school':
        // console.log('it\'s a school');
        // Set x and y value
        x = data.location['all_frl'];
        y = data.location['all_' + chartType];
        if (!this.isValid(x) || !this.isValid(y)) {
          return { visible: false };
        }
        console.log('y = ' + y);
        // Establish ranges
        xRange =  data.ranges['range_frl'];
        yRange = data.ranges['range_' + chartType];
        // Set obj values
        // frl is different, because the axis goes from high (1) to low (0)
        obj.left = String((Math.abs(xRange[1] - x)/Math.abs(xRange[1] - xRange[0]))*100) + '%';
        obj.displayX = formatPercentDiff(x, 0) + '%';
        obj.top = String((Math.abs(yRange[1] - y)/Math.abs(yRange[1] - yRange[0]))*100) + '%';
        obj.displayY = chartType === 'grd' ?
          formatPercentDiff(y, 1) + '%' :
          this.getFixed(y, 2);
        break;
      default:
        // console.log('it\'s a county or district, not a school');
        // Set x and y value
        x = data.location['all_ses'];
        y = data.location['all_' + chartType];
        if (!this.isValid(x) || !this.isValid(y)) {
          return { visible: false };
        }
        // Establish ranges
        xRange =  data.ranges['range_ses'];
        yRange = data.ranges['range_' + chartType];
        // Set obj values
        _left = (Math.abs(xRange[0] - x)/Math.abs(xRange[1] - xRange[0]))*100;
        obj.left = String(_left) + '%';
        // (Length from top to dot divided by length from top to bottom) * 100
        obj.top = String((Math.abs(yRange[1] - y)/Math.abs(yRange[1] - yRange[0]))*100) + '%';
        obj.displayX = this.getFixed(x, 2);
        obj.displayY = chartType === 'grd' ?
          formatPercentDiff(y, 1) + '%' :
          this.getFixed(y, 2);
        break;
    }
    // console.log(obj);
    return obj;
  }

  /**
   * constructBar  Constructs the object of values for an individual bar chart.
   * @param  {Number}  val                    Original value
   * @param  {Array}  range                   Array of the format [min, max]
   * @param  {Number}  [barDecimals=0]        Number of decimals
   * @param  {Number}  [median=0]             Median value from which to calculate bar width (1 for percent diff, for *_grd values)
   * @param  {String}  [format='number']      Format of bar value display, "number" or "percent"
   * @param  {Number}  [barHide=vars.barHide] Width at which to hide the bar min or max value
   * @return {Promise}                        Returns object
   */
  constructBar(val, range, barDecimals = 0, median = 0, format = 'number', barHide = vars.barHide) {
    // console.log('constructBar()');
    const obj = {};
    obj.num = {};
    obj.bar = {};
    obj.bar.neg = {};
    obj.bar.pos = {};
    // console.log('format = ' + format)
    switch (true) {
      case (val >= median):
        obj.num.neg = '';
        let barWidth;
        if (format === 'number') {
          barWidth = (val/(range[1] - median)) * vars.barMax;
          obj.num.pos = '+' + formatNumber(val, 2);
        } else {
          barWidth = (((val - median)/(range[1] - median)) * vars.barMax) * 100;
          obj.num.pos = '+' + formatPercentDiff(val) + '%';
        }
        obj.bar.pos.width = 'width:' + barWidth + 'px;';
        obj.bar.neg.width = '';
        if (barWidth >= barHide) {
          obj.bar.pos.hide = 'visibility:hidden;';
        }
        break;
      // case (val < median):
      default:
        obj.num.pos = '';
        let negBarWidth;
        if (val === -999 || (!val && val !== 0)) {
          // no value
          negBarWidth = ((median)/(median - range[0])) * vars.barMax;
          obj.bar.neg.hide = '';
          obj.bar.neg.width = 'width:0px;visibility:hidden;';
          obj.num.neg = 'UNAVAILABLE';
          obj.bar.pos.width = '';
        } else {
          if (format === 'number') {
            negBarWidth = ((median - val)/(median - range[0])) * vars.barMax;
            obj.num.neg = formatNumber(val, 2);
          } else {
            negBarWidth = (((1 - val)/(1 - range[0])) * vars.barMax) * 100;
            obj.num.neg = formatPercentDiff(val, 1) + '%';
          }
          obj.bar.neg.width = 'width:' + negBarWidth + 'px;';
          obj.bar.pos.width = '';
          if (negBarWidth >= barHide) {
            obj.bar.neg.hide = 'visibility:hidden;';
          }
        }
        break;
      // default:
      //   break;
    }
    // Bar labels for min and max
    if (val === -999 || (!val && val !== 0)) {
      // no value, no label
      obj.bar.min = '-';
      obj.bar.max = '+';
    } else if (format === 'number') {
      // console.log('formatting minmax for ranges');
      obj.bar.min = formatNumber(range[0], barDecimals);
      obj.bar.max = '+' + formatNumber(range[1], barDecimals);
    } else {
      // Percent formats for bar min and max labels
      // console.log('formatting percentdiff for ranges');
      obj.bar.min = range[0] + '%';
      obj.bar.max = '+' + range[1] + '%';
    }
    // console.log(obj);
    return obj;
  }

  isValid(value) {
    return (value || value === 0) && value !== -999;
  }

  getStateAbbrev(state) {
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

  html(data, templates) {
    // console.log('html()');
    try {
      let json;
      let jsonparse;

      // data is a path to json file, so fetch and parse
      if (typeof data === 'string') {
        const dataPath = Path.resolve(data)
        try {
          json = Fs.readFileSync(dataPath, { encoding: 'utf8' });
        } catch (err) {
          // An error occurred fetching template file
          console.error(err);
        }
        jsonparse = JSON.parse(json)

      // data is json
      } else {
        jsonparse = data
      }
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
      // Set up necessary ranges if in dev and not being passed a live JSON object
      if (!!DEV) {
        jsonparse.ranges = _ranges[jsonparse.region];
      }
      const _verbiage = {}; // JSON object for addl strings needed by template
      _verbiage.type_plural = this.getPlural(jsonparse.region);
      _verbiage.state_abbrev = this.getStateAbbrev(jsonparse.location.state_name);

      if (jsonparse.region === 'school') {
        _verbiage.xLabel = 'Free and Reduced Lunch';
      } else {
        _verbiage.xLabel = 'Socioeconomic Status';
      }

      if (this.isValid(jsonparse.location.all_frl)) {
        _verbiage.all_frl = formatPercentDiff(jsonparse.location.all_frl, 0);
      } else {
        _verbiage.all_frl = false;
      }

      if (this.isValid(jsonparse.location.all_ses)) {
        _verbiage.all_ses = jsonparse.location.all_ses;
        _verbiage.ats_vfb = this.getBoilerplate(jsonparse.location.all_ses, _ats_vfb);
      } else {
        _verbiage.all_ses = false;
      }

      // Only generate overview data if all_avg is available.
      if (this.isValid(jsonparse.location.all_avg)) {
        _verbiage.ats_avg_fixed = this.getPos(
          this.getFixed(jsonparse.location.all_avg, 2)
        );
        _verbiage.ats_hrl = this.getBoilerplate(jsonparse.location.all_avg, _ats_hrl);
        _verbiage.ats_ab = this.getBoilerplate(jsonparse.location.all_avg, _ats_ab);
        _verbiage.avg_overall_performance = jsonparse.location.name + ', ' + jsonparse.location.state_name + ' provides ' + _verbiage.ats_hrl +
        ' average educational opportunities. Average test scores are ' +
        _verbiage.ats_avg_fixed + ' grade level(s) ' + _verbiage.ats_ab +
        ' the national average.';
      } else {
        // Data not available. No need to determine verbiage.
        _verbiage.avg_overall_performance = 'Average test scores for ' + jsonparse.location.name + ', ' + jsonparse.location.state_name + ' are unavailable.'
      }

      if (this.isValid(jsonparse.location.all_avg) && this.isValid(jsonparse.location.diff_avg)) {
        // console.log('diff_avg is valid');
        _verbiage.diff_avg = jsonparse.location.diff_avg;
        _verbiage.ats_diff_fixed = this.getPos(
          this.getFixed(jsonparse.location.diff_avg, 2)
        );
        _verbiage.ats_diff_hl = this.getBoilerplate(jsonparse.location.diff_avg, _ats_diff_hl);
      } else {
        _verbiage.diff_avg = false;
        _verbiage.ats_diff_fixed = false;
        _verbiage.ats_diff_hl = false;
      }

      // Only generate overview data if all_grd is available.
      if (this.isValid(jsonparse.location.all_grd)) {
        _verbiage.grd_hrl = this.getBoilerplate(jsonparse.location.all_grd, _grd_hrl);
        _verbiage.grd_pct = this.getPercentDiffBoilerplate(jsonparse.location.all_grd, 1);
        _verbiage.grd_overall_performance = jsonparse.location.name + ', ' + jsonparse.location.state_name + ' provides ' + _verbiage.grd_hrl +
        ' average educational opportunities while children are in school. Students learn ' + _verbiage.grd_pct + ' the U.S. average.';
      } else {
        // Data not available. No need to determine verbiage.
        _verbiage.grd_overall_performance = 'Learning rates for ' + jsonparse.location.name + ', ' + jsonparse.location.state_name + ' are unavailable.'
      }

      if (this.isValid(jsonparse.location.all_grd) && this.isValid(jsonparse.location.diff_grd)) {
        // console.log('diff_grd is valid');
        _verbiage.diff_grd = jsonparse.location.diff_grd;
        _verbiage.grd_diff_fixed = this.getPos(
          this.getFixed(jsonparse.location.diff_grd, 2)
        );
        _verbiage.grd_diff_hl = this.getBoilerplate(jsonparse.location.diff_grd, _ats_diff_hl);
      } else {
        // console.log('diff_grd not valid');
        _verbiage.diff_grd = false;
        _verbiage.grd_diff_fixed = false;
        _verbiage.grd_diff_hl = false;
      }

      // Only generate overview data if all_grd is available.
      if (this.isValid(jsonparse.location.all_coh)) {
        _verbiage.coh_dri = this.getBoilerplate(jsonparse.location.all_coh, _coh_dri);
        _verbiage.coh_id = this.getBoilerplate(jsonparse.location.all_coh, _coh_id);
        _verbiage.coh_grd = this.getPos(
          this.getFixed(jsonparse.location.all_coh, 2)
        );
        _verbiage.coh_overall_performance = jsonparse.location.name + ', ' + jsonparse.location.state_name + ' shows ' + _verbiage.coh_dri +
        ' educational opportunity. Test scores ' + _verbiage.coh_id +
        ' an average of ' + _verbiage.coh_grd + ' grade levels each year from 2009-2016.';
      } else {
        // Data not available. No need to determine verbiage.
        _verbiage.coh_overall_performance = 'Trends in test scores for ' + jsonparse.location.name + ', ' + jsonparse.location.state_name + ' are unavailable.'
      }

      if (this.isValid(jsonparse.location.all_coh) && this.isValid(jsonparse.location.diff_coh)) {
        _verbiage.diff_coh = jsonparse.location.diff_coh;
        _verbiage.coh_diff_fixed = this.getPos(
          this.getFixed(jsonparse.location.diff_coh, 2)
        );
        _verbiage.coh_diff_id = this.getBoilerplate(jsonparse.location.diff_coh, _coh_diff_id);
        _verbiage.coh_diff_ml = this.getBoilerplate(jsonparse.location.diff_coh, _coh_diff_ml);
      } else {
        _verbiage.diff_coh = false;
        _verbiage.coh_diff_fixed = false;
        _verbiage.coh_diff_id = false;
        _verbiage.coh_diff_ml = false;
      }
      jsonparse.verbiage = _verbiage;
      const _avg = {}; // JSON object for average bar charts & conditionals
      const avgSeries = [
        jsonparse.location.all_avg,
        jsonparse.location.w_avg,
        jsonparse.location.m_avg,
        jsonparse.location.f_avg,
        jsonparse.location.b_avg,
        jsonparse.location.p_avg,
        jsonparse.location.np_avg,
        jsonparse.location.h_avg,
        jsonparse.location.a_avg
      ];
      const avgGapSeries = [
        jsonparse.location.wb_avg,
        jsonparse.location.wa_avg,
        jsonparse.location.wh_avg,
        jsonparse.location.pn_avg
      ];
      const avgRange = this.getMinMax(avgSeries);
      const avgGapRange = this.getMinMax(avgGapSeries);
      _avg.all = this.constructBar(jsonparse.location.all_avg, avgRange, 2);
      _avg.w = this.constructBar(jsonparse.location.w_avg, avgRange, 2);
      _avg.m = this.constructBar(jsonparse.location.m_avg, avgRange, 2);
      _avg.f = this.constructBar(jsonparse.location.f_avg, avgRange, 2);
      _avg.b = this.constructBar(jsonparse.location.b_avg, avgRange, 2);
      _avg.p = this.constructBar(jsonparse.location.p_avg, avgRange, 2);
      _avg.np = this.constructBar(jsonparse.location.np_avg, avgRange, 2);
      _avg.h = this.constructBar(jsonparse.location.h_avg, avgRange, 2);
      _avg.a = this.constructBar(jsonparse.location.a_avg, avgRange, 2);
      _avg.wb = this.constructBar(jsonparse.location.wb_avg, avgGapRange, 2);
      _avg.wa = this.constructBar(jsonparse.location.wa_avg, avgGapRange, 2);
      _avg.wh = this.constructBar(jsonparse.location.wh_avg, avgGapRange, 2);
      _avg.pn = this.constructBar(jsonparse.location.pn_avg, avgGapRange, 2);
      _avg.chart = this.getChartCoords(jsonparse, 'avg');
      jsonparse.avg = _avg;
      const _coh = {}; // JSON object for coh bar charts & conditionals
      const cohSeries = [
        jsonparse.location.all_coh,
        jsonparse.location.w_coh,
        jsonparse.location.m_coh,
        jsonparse.location.f_coh,
        jsonparse.location.b_coh,
        jsonparse.location.p_coh,
        jsonparse.location.np_coh,
        jsonparse.location.h_coh,
        jsonparse.location.a_coh
      ];
      const cohGapSeries = [
        jsonparse.location.wb_coh,
        jsonparse.location.wa_coh,
        jsonparse.location.wh_coh,
        jsonparse.location.pn_coh
      ];
      const cohRange = this.getMinMax(cohSeries);
      const cohGapRange = this.getMinMax(cohGapSeries);
      _coh.all = this.constructBar(jsonparse.location.all_coh, cohRange, 2);
      _coh.w = this.constructBar(jsonparse.location.w_coh, cohRange, 2);
      _coh.m = this.constructBar(jsonparse.location.m_coh, cohRange, 2);
      _coh.f = this.constructBar(jsonparse.location.f_coh, cohRange, 2);
      _coh.b = this.constructBar(jsonparse.location.b_coh, cohRange, 2);
      _coh.p = this.constructBar(jsonparse.location.p_coh, cohRange, 2);
      _coh.np = this.constructBar(jsonparse.location.np_coh, cohRange, 2);
      _coh.h = this.constructBar(jsonparse.location.h_coh, cohRange, 2);
      _coh.a = this.constructBar(jsonparse.location.a_coh, cohRange, 2);
      _coh.wb = this.constructBar(jsonparse.location.wb_coh, cohGapRange, 2);
      _coh.wa = this.constructBar(jsonparse.location.wa_coh, cohGapRange, 2);
      _coh.wh = this.constructBar(jsonparse.location.wh_coh, cohGapRange, 2);
      _coh.pn = this.constructBar(jsonparse.location.pn_coh, cohGapRange, 2);
      _coh.chart = this.getChartCoords(jsonparse, 'coh');
      jsonparse.coh = _coh;
      const _grd = {}; // JSON object for grd bar charts & conditionals
      const grdSeries = [
        jsonparse.location.all_grd,
        jsonparse.location.w_grd,
        jsonparse.location.m_grd,
        jsonparse.location.f_grd,
        jsonparse.location.b_grd,
        jsonparse.location.p_grd,
        jsonparse.location.np_grd,
        jsonparse.location.h_grd,
        jsonparse.location.a_grd
      ];
      const grdGapSeries = [
        jsonparse.location.wb_grd,
        jsonparse.location.wa_grd,
        jsonparse.location.wh_grd,
        jsonparse.location.pn_grd
      ];
      const grdRange = this.getMinMax(grdSeries, true);
      const grdGapRange = this.getMinMax(grdGapSeries, false);
      const grdBarHide = 42;
      _grd.all = this.constructBar(jsonparse.location.all_grd, grdRange, 2, 1, 'percent', grdBarHide);
      _grd.w = this.constructBar(jsonparse.location.w_grd, grdRange, 2, 1, 'percent', grdBarHide);
      _grd.m = this.constructBar(jsonparse.location.m_grd, grdRange, 2, 1, 'percent', grdBarHide);
      _grd.f = this.constructBar(jsonparse.location.f_grd, grdRange, 2, 1, 'percent', grdBarHide);
      _grd.b = this.constructBar(jsonparse.location.b_grd, grdRange, 2, 1, 'percent', grdBarHide);
      _grd.p = this.constructBar(jsonparse.location.p_grd, grdRange, 2, 1, 'percent', grdBarHide);
      _grd.np = this.constructBar(jsonparse.location.np_grd, grdRange, 2, 1, 'percent', grdBarHide);
      _grd.h = this.constructBar(jsonparse.location.h_grd, grdRange, 2, 1, 'percent', grdBarHide);
      _grd.a = this.constructBar(jsonparse.location.a_grd, grdRange, 2, 1, 'percent', grdBarHide);
      _grd.wb = this.constructBar(jsonparse.location.wb_grd, grdGapRange, 2);
      _grd.wa = this.constructBar(jsonparse.location.wa_grd, grdGapRange, 2);
      _grd.wh = this.constructBar(jsonparse.location.wh_grd, grdGapRange, 2);
      _grd.pn = this.constructBar(jsonparse.location.pn_grd, grdGapRange, 2);
      _grd.chart = this.getChartCoords(jsonparse, 'grd');
      jsonparse.grd = _grd;
      // console.log(jsonparse);
      // Fetch the template.
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
    const html = this.html(data, templates)
    // console.log(html)
    const browser = await Puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
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

    return await browser.close();
  }
}

module.exports = Pdfer;
