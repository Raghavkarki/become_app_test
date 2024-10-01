
const {hypertensionDangerSigns, diabetesDangerSigns, babyDangerSigns, motherDangerSigns } = require('./form-constants.js');
const today = getDateMS(Date.now());
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS_IN_PREGNANCY = 42 * 7;  // 42 weeks = 294 days
const cervicalForms = ['cervical_cancer_screening'];
const pregnancyForms = ['pregnancy'];
const deliveryForms = ['delivery'];
const antenatalForms = ['pregnancy_home_visit'];
const allANCForms = ['pregnancy', 'pregnancy_home_visit', 'pregnancy_danger_sign', 'delivery'];
const dangerSignsBaby = require('./form_contents/pnc_danger_sign_baby.json');
const dangerSignsMother = require('./form_contents/pnc_danger_sign_mother.json');


function isAlive(contact) {
  return contact && contact.contact && !contact.contact.date_of_death;
}

const getField = (report, fieldPath) => ['fields', ...(fieldPath || '').split('.')]
  .reduce((prev, fieldName) => {
    if (prev === undefined) { return undefined; }
    return prev[fieldName];
  }, report);

function isFormArraySubmittedInWindow(reports, formArray, start, end, count) {
  let found = false;
  let reportCount = 0;
  reports.forEach(function (report) {
    if (formArray.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end) {
        found = true;
        if (count) {
          reportCount++;
        }
      }
    }
  });

  if (count) { return reportCount >= count; }
  return found;
}


function isFormArraySubmittedInWindowExcludingThisReport(reports, formArray, start, end, exReport, count) {
  let found = false;
  let reportCount = 0;
  reports.forEach(function (report) {
    if (formArray.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end && report._id !== exReport._id) {
        found = true;
        if (count) {
          reportCount++;
        }
      }
    }
  });
  if (count) { return reportCount >= count; }
  else { return found; }
}


function getMostRecentReport(reports, form) {
  let result;
  reports.forEach(function (report) {
    if (form.includes(report.form) &&
      !report.deleted &&
      (!result || report.reported_date > result.reported_date)) {
      result = report;
    }
  });
  return result;
}

function getNewestPregnancyTimestamp(contact) {
  if (!contact.contact) { return; }
  const newestPregnancy = getMostRecentReport(contact.reports, 'pregnancy');
  return newestPregnancy ? newestPregnancy.reported_date : 0;
}

function getNewestDeliveryTimestamp(contact) {
  if (!contact.contact) { return; }
  const newestDelivery = getMostRecentReport(contact.reports, 'delivery');
  return newestDelivery ? newestDelivery.reported_date : 0;
}

function isFacilityDelivery(contact, report) {
  if (!contact) {
    return false;
  }
  if (arguments.length === 1) { report = contact; }
  return getField(report, 'facility_delivery') === 'yes';
}

function countReportsSubmittedInWindow(reports, form, start, end, condition) {
  let reportsFound = 0;
  reports.forEach(function (report) {
    if (form.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end) {
        if (!condition || condition(report)) {
          reportsFound++;
        }
      }
    }
  });
  return reportsFound;
}

function getReportsSubmittedInWindow(reports, form, start, end, condition) {
  const reportsFound = [];
  reports.forEach(function (report) {
    if (form.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end) {
        if (!condition || condition(report)) {
          reportsFound.push(report);
        }
      }
    }
  });
  return reportsFound;
}

function getDateISOLocal(s) {
  if (!s) { return new Date(); }
  const b = s.split(/\D/);
  const d = new Date(b[0], b[1] - 1, b[2]);
  if (isValidDate(d)) { return d; }
  return new Date();
}

function getTimeForMidnight(d) {
  const date = new Date(d);
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function getDateMS(d) {
  if (typeof d === 'string') {
    if (d === '') { return null; }
    d = getDateISOLocal(d);
  }
  return getTimeForMidnight(d).getTime();
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

function addDays(date, days) {
  const result = getTimeForMidnight(new Date(date));
  result.setDate(result.getDate() + days);
  return result;
}

function isPregnancyForm(report) {
  return pregnancyForms.includes(report.form);
}

function isPregnancyFollowUpForm(report) {
  return antenatalForms.includes(report.form);
}

function isDeliveryForm(report) {
  return deliveryForms.includes(report.form);
}

const getNewestReport = function (reports, forms) {
  let result;
  reports.forEach(function (report) {
    if (!forms.includes(report.form)) { return; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
};

const getLMPDateFromPregnancy = function (report) {
  return isPregnancyForm(report) &&
    getDateMS(getField(report, 'lmp_date_8601'));
};

const getLMPDateFromPregnancyFollowUp = function (report) {
  return isPregnancyFollowUpForm(report) &&
    getDateMS(getField(report, 'lmp_date_8601'));
};

function getSubsequentPregnancies(contact, refReport) {
  return contact.reports.filter(function (report) {
    return isPregnancyForm(report) && report.reported_date > refReport.reported_date;
  });
}

function getSubsequentPregnancyFollowUps(contact, report) {
  const subsequentVisits = contact.reports.filter(function (visit) {
    let lmpDate = getLMPDateFromPregnancy(report);
    if (!lmpDate) { //LMP Date is not available, use reported date
      lmpDate = report.reported_date;
    }

    return isPregnancyFollowUpForm(visit) &&
      visit.reported_date > report.reported_date &&
      visit.reported_date < addDays(lmpDate, MAX_DAYS_IN_PREGNANCY);
  });
  return subsequentVisits;
}

function getSubsequentDeliveries(contact, refReport, withinLastXDays) {
  return contact.reports.filter(function (deliveryReport) {
    return (deliveryReport.form === 'delivery') &&
      deliveryReport.reported_date > refReport.reported_date &&
      (!withinLastXDays || refReport.reported_date >= (today - withinLastXDays * MS_IN_DAY));
  });
}

function getMostRecentLMPDateForPregnancy(contact, report) {
  let mostRecentLMP = getLMPDateFromPregnancy(report);
  let mostRecentReportDate = report.reported_date;
  getSubsequentPregnancyFollowUps(contact, report).forEach(function (v) {
    const lmpFromPregnancyFollowUp = getLMPDateFromPregnancyFollowUp(v);
    if (v.reported_date > mostRecentReportDate && lmpFromPregnancyFollowUp !== '' && lmpFromPregnancyFollowUp !== mostRecentLMP) {
      mostRecentReportDate = v.reported_date;
      mostRecentLMP = lmpFromPregnancyFollowUp;
    }
  });
  return mostRecentLMP;
}


function isPregnancyTerminatedByAbortion(contact, report) {
  const followUps = getSubsequentPregnancyFollowUps(contact, report);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  return latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === 'abortion';
}

function isPregnancyTerminatedByMiscarriage(contact, report) {
  const followUps = getSubsequentPregnancyFollowUps(contact, report);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  return latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === 'miscarriage';
}

function isActivePregnancy(contact, report) {
  if (!isPregnancyForm(report)) { return false; }
  const lmpDate = getMostRecentLMPDateForPregnancy(contact, report) || report.reported_date;
  const isPregnancyRegisteredWithin9Months = lmpDate > today - MAX_DAYS_IN_PREGNANCY * MS_IN_DAY;
  const isPregnancyTerminatedByDeliveryInLast6Weeks = getSubsequentDeliveries(contact, report, 6 * 7).length > 0;
  const isPregnancyTerminatedByAnotherPregnancyReport = getSubsequentPregnancies(contact, report).length > 0;
  return isPregnancyRegisteredWithin9Months &&
    !isPregnancyTerminatedByDeliveryInLast6Weeks &&
    !isPregnancyTerminatedByAnotherPregnancyReport &&
    !isPregnancyTerminatedByAbortion(contact, report) &&
    !isPregnancyTerminatedByMiscarriage(contact, report);
}

function countANCFacilityVisits(contact, pregnancyReport) {
  let ancHFVisits = 0;
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(contact, pregnancyReport);
  if (getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past') && !isNaN(getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count'))) {
    ancHFVisits += parseInt(getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count'));
  }
  ancHFVisits += pregnancyFollowUps.reduce(function (sum, report) {
    const pastANCHFVisits = getField(report, 'anc_visits_hf.anc_visits_hf_past');
    if (!pastANCHFVisits) { return 0; }
    sum += pastANCHFVisits.last_visit_attended === 'yes' && 1;
    if (isNaN(pastANCHFVisits.visited_hf_count)) { return sum; }
    return sum += pastANCHFVisits.report_other_visits === 'yes' && parseInt(pastANCHFVisits.visited_hf_count);
  }, 0);
  return ancHFVisits;
}

function getRecentANCVisitWithEvent(contact, report, event) {
  //event should be one among miscarriage, abortion, refused, migrated
  const followUps = getSubsequentPregnancyFollowUps(contact, report);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  if (latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === event) {
    return latestFollowup;
  }
}

function isPregnancyTaskMuted(contact) {
  const latestVisit = getNewestReport(contact.reports, allANCForms);
  return latestVisit && isPregnancyFollowUpForm(latestVisit) &&
    getField(latestVisit, 'pregnancy_ended.clear_option') === 'clear_all';
}

function isDangerSignPresentMother(report) {
  if (getField(report, 'mother_info.pnc_danger_sign_check')) {
    return getField(report, 'mother_info.pnc_danger_sign_check.r_pnc_danger_sign_present') === 'yes';
  } else {
    return getField(report, 'danger_signs.r_danger_sign_present') === 'yes';
  }
}

function getBabyFields(contact) {
  const reports = contact.reports.filter((report) => report.form === 'pnc_danger_sign_follow_up_baby');
  return (reports && reports[reports.length - 1] && reports[reports.length - 1].fields) || contact.contact;
}

function getActiveDangerSignsMother(report) {
  const dangerSignDictionaryNepali = dangerSignsMother.dangerSignDictionaryNepali;
  const dangerSignDictionaryEnglish = dangerSignsMother.dangerSignDictionaryEnglish;
  const getActiveDangerSignNote = (dictionary) => {
    const allDangerSignsMother = getField(report, 'mother_info.pnc_danger_sign_check') || getField(report, 'danger_signs');
    let activeDangerSignsMother = '';

    Object.entries(allDangerSignsMother).filter(([key,]) => Object.keys(dictionary).includes(key)).forEach(([key, value]) => {
      if (value.toLowerCase() === 'yes') {
        const sign = dictionary[key];
        activeDangerSignsMother = `${sign}, ${activeDangerSignsMother}`;
      }
    });

    return activeDangerSignsMother.slice(null, -2);
  };

  return {
    'en': getActiveDangerSignNote(dangerSignDictionaryEnglish),
    'ne': getActiveDangerSignNote(dangerSignDictionaryNepali)
  };
}

function getActiveDangerSignsBaby(contact) {
  const dangerSignDictionaryNepali = dangerSignsBaby.dangerSignDictionaryNepali;
  const dangerSignDictionaryEnglish = dangerSignsBaby.dangerSignDictionaryEnglish;
  const getActiveDangerSignNote = (dictionary) => {
    const allDangerSignsBaby = getBabyFields(contact).danger_signs;
    let activeDangerSignsBaby = '';

    Object.entries(allDangerSignsBaby).filter(([key,]) => Object.keys(dictionary).includes(key)).forEach(([key, value]) => {
      if (value.toLowerCase() === 'yes') {
        const sign = dictionary[key];
        activeDangerSignsBaby = `${sign}, ${activeDangerSignsBaby}`;
      }
    });

    return activeDangerSignsBaby.slice(null, -2);
  };

  return {
    'en': getActiveDangerSignNote(dangerSignDictionaryEnglish),
    'ne': getActiveDangerSignNote(dangerSignDictionaryNepali)
  };
}

function getActiveDangerSignsChild(report) {
  const assignCtx = (keys) => {
    const store = {};

    keys.forEach((key) => {
      store[`${key.slice(key.lastIndexOf('.') + 1)}_ctx`] = getField(report, key);
    });

    return store;
  };

  if (report.form === 'child_referral_followup') {
    return assignCtx([
      'child_age_months',
      'child_referral_followup_form.unable_to_drink_milk',
      'child_referral_followup_form.vomit_everything',
      'child_referral_followup_form.convulsions',
      'child_referral_followup_form.lethargic_or_unconscious',
      'child_referral_followup_form.convulsions_now',
      'child_referral_followup_form.any_other_danger'
    ]);
  }

  const dangerSignCtx = assignCtx([
    'child_age_months',
    'fiftynine_days.suck_breast',
    'fiftynine_days.convulsions_59_days',
    'fiftynine_days.severe_chest_indrawing',
    'fiftynine_days.nasal_flaring',
    'fiftynine_days.bulging_fontanelle',
    'fiftynine_days.redness_spread',
    'fiftynine_days.umbilical_red_pus',
    'fiftynine_days.lethargic_unconscious',
    'fiftynine_days.skin_blisters',
    'fiftynine_days.pus_discharge_from_eye',
    'fiftynine_days.jaundice',
    'fiftynine_days.jaundice_spread',
    'fiftynine_days.watery_stool_59days',
    'fiftynine_days.lethargic_unconscious_59_days',
    'fiftynine_days.sunken_eyes',
    'fiftynine_days.irritable_restless',
    'fiftynine_days.abdominal_skin_pull_slow',
    'fiftynine_days.child_temperature_59days',
    'fiftynine_days.respiration_rate_59_days',
    'twomonths_fiveyears.unable_to_suck_drink',
    'twomonths_fiveyears.vomit_everything',
    'twomonths_fiveyears.convulsions_2months_5years',
    'twomonths_fiveyears.lethargic_unconscious_2months_5years',
    'twomonths_fiveyears.convulsions_now',
    'twomonths_fiveyears.chest_indrawing',
    'twomonths_fiveyears.stridor',
    'twomonths_fiveyears.stiff_neck',
    'twomonths_fiveyears.had_measles.red_rashes',
    'twomonths_fiveyears.had_measles.cough_runnynose_redeyes',
    'twomonths_fiveyears.had_measles.wound_in_mouth',
    'twomonths_fiveyears.had_measles.blurred_cornea',
    'twomonths_fiveyears.had_measles.pus_discharge_eye',
    'twomonths_fiveyears.swelling_behind_ear',
    'twomonths_fiveyears.pus_discharge',
    'twomonths_fiveyears.muac',
    'twomonths_fiveyears.child_temperature_2months_5years',
    'twomonths_fiveyears.respiration_rate_2months_5years',
    'twomonths_fiveyears.cough_difficulty_breathing',
    'twomonths_fiveyears.wheeze',
    'twomonths_fiveyears.watery_stool_2months_5years',
    'twomonths_fiveyears.ear_pain',
    'twomonths_fiveyears.whiteness_on_palms'
  ]);

  // Signs and symptoms
  const symptomsSign = 'twomonths_fiveyears.signs_symptoms';
  const symptoms = getField(report, symptomsSign);
  if (symptoms && symptoms !== 'none') {
    const dangerSymptoms = [
      'lethargic',
      'sunken_eyes',
      'cannot_drink',
      'drinks_eagerly',
      'abdomen_skin_2sec',
      'restless',
      'abdomen_skin_slow',
      'blood_in_stool'
    ];

    let symptomCount = 0;
    const activeSymptoms = symptoms.split(' ');
    activeSymptoms.forEach((symptom) => {
      if (dangerSymptoms.includes(symptom)) {
        symptomCount += 1;
      }
    });

    if (symptomCount > 1) {
      const signsEn = {
        'lethargic': 'Lethargic or unconscious',
        'sunken_eyes': 'Sunken eyes',
        'cannot_drink': 'Cannot drink or drinks very slowly',
        'drinks_eagerly': 'Drinks eagerly',
        'abdomen_skin_2sec': 'Abdomen skin returns very slowly when pulled (taking more than 2 seconds to return to normal)',
        'restless': 'Irritable or restless',
        'abdomen_skin_slow': 'Abdomen skin returns slowly when pulled',
        'blood_in_stool': 'There is blood in the stool'
      };

      const signsNe = {
        'lethargic': 'सुस्त वा बेहोस छ',
        'sunken_eyes': 'आँखा गडेको छ',
        'cannot_drink': 'पिउन नसक्ने वा धेरै बिस्तारै पिउने',
        'drinks_eagerly': 'खूब तिर्खाए झैँ गरि पिउँछ',
        'abdomen_skin_2sec': 'पेटको छाला औलाले तानेर छोडदा धेरै बिस्तारै फर्किन्छ (२ सेकेण्ड भन्दा बढी समय लगाएर)',
        'restless': 'छटपटिने/झिंजिने छ',
        'abdomen_skin_slow': 'पेटको छाला औलाले तानेर छोडदा बिस्तारै फर्किन्छ',
        'blood_in_stool': 'दिसामा रगत छ'
      };

      dangerSignCtx.signs_ne_ctx = '';
      dangerSignCtx.signs_en_ctx = '';

      activeSymptoms.forEach((symptom) => {
        dangerSignCtx.signs_en_ctx += `${signsEn[symptom]}, `;
        dangerSignCtx.signs_ne_ctx += `${signsNe[symptom]}, `;
      });

      dangerSignCtx.signs_en_ctx = dangerSignCtx.signs_en_ctx.slice(null, -2);
      dangerSignCtx.signs_ne_ctx = dangerSignCtx.signs_ne_ctx.slice(null, -2);
    }
  }

  return dangerSignCtx;
}

function getRiskContextNCD(report, type = 'hypertension') {
  const dangerSigns = {
    hypertension: hypertensionDangerSigns,
    diabetes: diabetesDangerSigns
  };

  const context = { danger_sign_code: getField(report, 'danger_sign_code') };

  context[`${type}DangerSigns`] = dangerSigns[type]
    .filter(dangerCode => getField(report, `danger_signs.${dangerCode}`) === 'yes')
    .join(', ');

  return context;
}
function ncdExtractFields(report, useCase) {
  const diabetesFields = {
    bmical_show_ctx_diabetes: report.fields.bmical_show_ctx_diabetes,
    bmi_result_ctx_diabetes: report.fields.bmi_result_ctx_diabetes,
    glucometer_ctx: report.fields.glucometer_ctx,
    dt_pps_rbs_ctx: report.fields.dt_pps_rbs_ctx,
    dt_fbs_ctx: report.fields.dt_fbs_ctx
  };

  const hypertensionFields = {
    bmical_show_ctx: report.fields.bmical_show_ctx,
    bmi_result_ctx: report.fields.bmi_result_ctx,
    systolic_result: report.fields.systolic_result,
    diastolic_result: report.fields.diastolic_result,
    avg_result: report.fields.avg_result
  };

  return useCase === 'diabetes' ? diabetesFields : hypertensionFields;
}

function daysSinceDeliveryInDeliveryForm(report) {
  const deliveryDate = getField(report, 'preg_info.delivery_date');
  const reportedDate = report.reported_date;

  return (reportedDate && deliveryDate) ?
    Math.floor((new Date(reportedDate) - new Date(deliveryDate)) / (24 * 60 * 60 * 1000)) :
    null;
}

// function getDueDateForPNCService(report, daysToAdd) {
//   const daysSinceDelivery = daysSinceDeliveryInDeliveryForm(report);
//   const deliveryDate = getField(report, 'preg_info.delivery_date');
//   const numberOfVisit = getField(report, 'pnccheck.pnc_check_no');
//   return (deliveryDate && daysSinceDelivery <= daysToAdd && 
//     ((numberOfVisit === '0' && daysToAdd >= 2) || 
//     (numberOfVisit === '1' && daysToAdd >= 13) || 
//     (numberOfVisit === '2' && daysToAdd >= 41))) 
//     ? addDays(deliveryDate, daysToAdd) 
//     : null;
// }
function getDueDateForPNCService(report, daysToAdd) {
  const daysSinceDelivery = daysSinceDeliveryInDeliveryForm(report);
  const deliveryDate = getField(report, 'preg_info.delivery_date');
  const numberOfVisit = getField(report, 'pnccheck.pnc_check_no');

  if (!deliveryDate || daysSinceDelivery > daysToAdd) {
    return null;
  }

  const visitConditions = {
    '0': daysToAdd >= 2,
    '1': daysToAdd >= 13,
    '2': daysToAdd >= 41
  };

  return visitConditions[numberOfVisit] ? addDays(deliveryDate, daysToAdd) : null;
}


function getPncServiceDangerSigns(report) {
  const assignSigns = (signType) => {
    const allSigns = new Set();

    const dangerSigns = signType === 'baby' ? babyDangerSigns : motherDangerSigns;

    for (let childNumber = 1; childNumber <= 4; childNumber++) {
      dangerSigns.forEach(sign => {
        const value = getField(report, signType === 'baby' ? `pnc_services_for_newborns_${childNumber}.${sign}_${childNumber}` : `pnc_service_for_mother.${sign}`);
        if (value === 'yes') {
          allSigns.add(`${sign}_${childNumber}`);
        }
      });
    }

    return Array.from(allSigns).join(', ');
  };

  return {
    babyDangerSigns: assignSigns('baby'),
    motherDangerSigns: assignSigns('mother')
  };
}

function getPNCServiceDangerSignReferral(report) {
  const dangerSignCodes = {};
  const keys = ['danger_sign_mother', 'danger_sign_child'];

  keys.forEach(key => {
    const shortKey = key.slice(key.lastIndexOf('.') + 1);
    dangerSignCodes[shortKey] = getField(report, key);
  });

  return dangerSignCodes;
}


module.exports = {
  today,
  MS_IN_DAY,
  MAX_DAYS_IN_PREGNANCY,
  getPncServiceDangerSigns,
  getPNCServiceDangerSignReferral,
  getDueDateForPNCService,
  addDays,
  isAlive,
  isDangerSignPresentMother,
  getRiskContextNCD,
  ncdExtractFields,
  getActiveDangerSignsMother,
  getActiveDangerSignsChild,
  getBabyFields,
  getActiveDangerSignsBaby,
  getTimeForMidnight,
  isFormArraySubmittedInWindow,
  isFormArraySubmittedInWindowExcludingThisReport,
  getDateMS,
  getDateISOLocal,
  isDeliveryForm,
  getMostRecentReport,
  getNewestPregnancyTimestamp,
  getNewestDeliveryTimestamp,
  getReportsSubmittedInWindow,
  countReportsSubmittedInWindow,
  countANCFacilityVisits,
  isFacilityDelivery,
  getMostRecentLMPDateForPregnancy,
  getNewestReport,
  getSubsequentPregnancyFollowUps,
  isActivePregnancy,
  getRecentANCVisitWithEvent,
  isPregnancyTaskMuted,
  getField,
  cervicalForms
};
